import {createHash,randomBytes} from 'node:crypto';
import {leagues} from '../lib/goal-push.js';
import {cached,valid} from '../lib/ds-data.js';
const P='tribun:community:v1:'+(process.env.VERCEL_ENV==='production'?'prod:':'preview:');
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
const token=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const code=x=>typeof x==='string'&&/^[a-f0-9]{24}$/.test(x);
const days=30*86400;
const str=x=>typeof x==='string'?x.trim().slice(0,32):'';
const parse=x=>{try{return JSON.parse(x)}catch{return null}};
const validMatch=(lg,id)=>typeof id==='string'&&(leagues.includes(lg)&&/^\d{1,20}$/.test(id)||['ds-tr1','ds-tr2','ds-tr3','ds-cup'].includes(lg)&&/^ds[1-9]\d{0,11}$/.test(id));
export const scorePoints=(h,a,ph,pa)=>h===ph&&a===pa?3:Math.sign(h-a)===Math.sign(ph-pa)?1:0;
export const scoreOK=x=>Number.isInteger(x)&&x>=0&&x<=20;
const verifiedScore=x=>x!==null&&x!==undefined&&/^\d{1,2}$/.test(String(x));
async function kv(...cmd){const r=await fetch(process.env.KV_REST_API_URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.KV_REST_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(5000)});const j=await r.json();if(!r.ok||j.error)throw Error('cache');return j.result}
const get=async k=>parse(await kv('GET',k));
const pairs=x=>Array.isArray(x)?Object.fromEntries(Array.from({length:Math.floor(x.length/2)},(_,i)=>[x[2*i],x[2*i+1]])):x||{};
async function fixture(lg,id,strict=false){
 if(!validMatch(lg,id))throw Error('match');
 const key=P+'fixture:'+lg+':'+id;
 if(!strict){const old=await get(key);if(old)return old;}
 let e;
 if(id.startsWith('ds')){const x=await cached('fixtures/'+id.slice(2),strict?1:900,undefined,{fresh:strict});const k=x.status?.type;const expected={'ds-tr1':[130141],'ds-tr2':[195808],'ds-tr3':[616872,195818,195819,195820],'ds-cup':[285261]};if(!expected[lg]?.includes(Number(x.league?.id)))throw Error('match');e={lg,id,kickoff:Date.parse(x.startTime),home:str(x.home?.name),away:str(x.away?.name),pre:['notstarted','scheduled'].includes(k),final:k==='finished',h:x.homeScore?.current,a:x.awayScore?.current}}
 else{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/'+lg+'/summary?event='+id,{signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('upstream');const j=await r.json(),c=j.header?.competitions?.[0],s=c?.status?.type,h=c?.competitors?.find(t=>t.homeAway==='home'),a=c?.competitors?.find(t=>t.homeAway==='away');if(String(c?.id||j.header?.id)!==id||!h||!a)throw Error('match');e={lg,id,kickoff:Date.parse(c.date),home:str(h.team?.displayName),away:str(a.team?.displayName),pre:s?.state==='pre',final:s?.completed===true&&s?.state==='post'&&!/CANCEL|POSTPON|ABANDON|SUSPEND|FORFEIT/i.test(s?.name||''),h:h.score,a:a.score}}
 if(!Number.isFinite(e.kickoff)||!e.home||!e.away)throw Error('match');
 if(!verifiedScore(e.h)||!verifiedScore(e.a))e.final=false;
 if(e.final){e.h=Number(e.h);e.a=Number(e.a)}
 await kv('SET',key,JSON.stringify(e),'EX',e.final?3600:60);return e;
}
const joinLua="if redis.call('HEXISTS',KEYS[1],ARGV[1])==0 and redis.call('HLEN',KEYS[1])>=40 then return 0 end; redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]);redis.call('EXPIRE',KEYS[1],ARGV[3]);return 1";
const addLua="if redis.call('HEXISTS',KEYS[1],ARGV[1])==0 and redis.call('HLEN',KEYS[1])>=8 then return 0 end;redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]);redis.call('EXPIRE',KEYS[1],ARGV[3]);return 1";
// Index writes before recording user data, so deletion is retryable even after a partial network failure.
async function indexMember(key,value,limit){
 if(!await kv('SISMEMBER',key,value)&&Number(await kv('SCARD',key))>=limit)throw Error('full');
 await kv('SADD',key,value);await kv('EXPIRE',key,days);
}
const voteLua="if redis.call('HEXISTS',KEYS[1],ARGV[1])==0 and redis.call('HLEN',KEYS[1])>=1000 then return 0 end;redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]);redis.call('EXPIRE',KEYS[1],ARGV[3]);return 1";
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 let origin=false;try{const u=new URL(req.headers.origin);origin=u.protocol==='https:'&&u.host===req.headers.host}catch{}
 if(req.method!=='POST'||!origin)return res.status(403).json({error:'origin'});
 let b;try{b=typeof req.body==='string'?JSON.parse(req.body):req.body}catch{}
 if(!b||JSON.stringify(b).length>4000||!token(b.token))return res.status(400).json({error:'request'});
 const member=hash(b.token),ip=hash(String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0]);
 try{
 const memberKey=P+'member:'+member;
 const rate=P+'rate:'+ip+':'+Math.floor(Date.now()/60000);await kv('SET',rate,'0','NX','EX',90);if(Number(await kv('INCR',rate))>30)return res.status(429).json({error:'rate'});
 if(b.action==='delete'){
  const groups=await kv('SMEMBERS',memberKey+':groups')||[],polls=await kv('SMEMBERS',memberKey+':polls')||[];
  for(const mk of polls){if(typeof mk!=='string'||!mk.includes(':'))continue;const [lg,id]=mk.split(':');if(validMatch(lg,id))await kv('HDEL',P+'poll:'+mk,member);}
  for(const gcode of groups){if(!code(gcode))continue;const key=P+'group:'+gcode,g=await get(key);await kv('HDEL',key+':members',member);
   const matches=pairs(await kv('HGETALL',key+':matches'));for(const mk of Object.keys(matches).slice(0,8))await kv('HDEL',key+':pred:'+mk,member);
   if(g?.owner===member){const members=pairs(await kv('HGETALL',key+':members')),next=Object.keys(members)[0];if(next)await kv('SET',key,JSON.stringify({...g,owner:next}),'KEEPTTL');else await kv('DEL',key);}
  }
  await kv('DEL',memberKey+':groups',memberKey+':polls');return res.json({ok:true});
 }
 if(b.action==='poll'){
  if(!validMatch(b.lg,b.id))return res.status(400).json({error:'match'});
  const key=P+'poll:'+b.lg+':'+b.id;
  if(b.choice!==undefined){if(!['home','draw','away'].includes(b.choice))return res.status(400).json({error:'choice'});const e=await fixture(b.lg,b.id,true);if(!e.pre||Date.now()>=e.kickoff)return res.status(409).json({error:'closed'});await indexMember(memberKey+':polls',b.lg+':'+b.id,120);if(!await kv('EVAL',voteLua,1,key,member,b.choice,days))return res.status(409).json({error:'full'});}
  const rows=pairs(await kv('HGETALL',key)),counts={home:0,draw:0,away:0};for(const v of Object.values(rows))if(Object.hasOwn(counts,v))counts[v]++;
  return res.json({counts,choice:rows[member]||null});
 }
 if(b.action==='create'){
  const name=str(b.name),groupName=str(b.groupName);if(!name||!groupName)return res.status(400).json({error:'name'});
  const id=randomBytes(12).toString('hex'),key=P+'group:'+id,group={name:groupName,owner:member,created:Date.now(),ends:Date.now()+7*86400000};
  await indexMember(memberKey+':groups',id,20);await kv('SET',key,JSON.stringify(group),'EX',days);await kv('EVAL',joinLua,1,key+':members',member,name,days);return res.json({code:id,name:groupName,ends:group.ends});
 }
 if(!code(b.code))return res.status(400).json({error:'code'});
 const key=P+'group:'+b.code,g=await get(key);if(!g)return res.status(404).json({error:'not_found'});
 if(b.action==='join'){const name=str(b.name);if(!name||Date.now()>=g.ends)return res.status(400).json({error:'closed'});await indexMember(memberKey+':groups',b.code,20);if(!await kv('EVAL',joinLua,1,key+':members',member,name,days))return res.status(409).json({error:'full'});return res.json({code:b.code,name:g.name,ends:g.ends})}
 const members=pairs(await kv('HGETALL',key+':members'));if(!Object.hasOwn(members,member))return res.status(403).json({error:'membership'});
 if(b.action==='add'||b.action==='predict'){
  if(Date.now()>=g.ends||!validMatch(b.lg,b.id))return res.status(400).json({error:'closed'});
  const mk=b.lg+':'+b.id,e=await fixture(b.lg,b.id,true);
  if(!e.pre||Date.now()>=e.kickoff||e.kickoff>g.ends)return res.status(409).json({error:'closed'});
  if(b.action==='add'){if(g.owner!==member)return res.status(403).json({error:'owner'});if(!await kv('EVAL',addLua,1,key+':matches',mk,JSON.stringify({lg:e.lg,id:e.id,home:e.home,away:e.away,kickoff:e.kickoff}),days))return res.status(409).json({error:'full'});return res.json({ok:true})}
  if(!scoreOK(b.h)||!scoreOK(b.a)||!await kv('HEXISTS',key+':matches',mk))return res.status(400).json({error:'prediction'});
  await indexMember(memberKey+':groups',b.code,20);await kv('HSET',key+':pred:'+mk,member,JSON.stringify({h:b.h,a:b.a}));await kv('EXPIRE',key+':pred:'+mk,days);return res.json({ok:true});
 }
 if(b.action==='board'){
  const matches=Object.entries(pairs(await kv('HGETALL',key+':matches'))).map(([mk,x])=>({mk,...parse(x)})).slice(0,8);
  const board=Object.entries(members).map(([id,name])=>({id,name,points:0,played:0}));
  const rows=await Promise.all(matches.map(async m=>{let e;try{e=await fixture(m.lg,m.id)}catch{}const preds=pairs(await kv('HGETALL',key+':pred:'+m.mk));if(e?.final)for(const row of board){const p=parse(preds[row.id]);if(p&&scoreOK(p.h)&&scoreOK(p.a)){row.points+=scorePoints(e.h,e.a,p.h,p.a);row.played++}}return {...m,final:!!e?.final,score:e?.final?[e.h,e.a]:null,mine:parse(preds[member]),open:!!e?.pre&&Date.now()<e.kickoff&&Date.now()<g.ends}}));
  return res.json({name:g.name,ends:g.ends,owner:g.owner===member,matches:rows,board:board.sort((a,b)=>b.points-a.points||b.played-a.played).map(({id,...row})=>({...row,you:id===member}))});
 }
 return res.status(400).json({error:'action'});
 }catch(e){return res.status(e.message==='full'?409:503).json({error:['budget','restricted','no_data','busy','match','full'].includes(e.message)?e.message:'unavailable'})}
}
