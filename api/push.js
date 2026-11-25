import webpush from 'web-push';
import {groupNoticeTick} from './community.js';
import {leagues,hash,equal,tokenOK,subscriptionOK,ids,matchIds,dsTeam,dsNotices,mapEvent,follows,shouldScan,nextPoll,noticePrefs,matchNotices,noticePayload,teamPrefs,wants,hasNotices,readSummary,extraNotices} from '../lib/goal-push.js';
import {fixtures as dsFixtures,dsPushEvent,dsDelay} from '../lib/ds-data.js';
import {BASKET_LEAGUES,basketPrefs,basketKeys,basketFollows,basketWants,mapBasket,mapEuroBasket,basketballNotices,basketDelay,basketPayload} from '../lib/basket-push.js';
import {elDay} from './bball.js';
const P='tribun:push:v1:'+(process.env.VERCEL_ENV==='production'?'prod:':'preview:'),SUB=P+'subs',STATE=P+'scores',STATUS=P+'scheduler';
const cfg=()=>({url:process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL,token:process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN,pub:process.env.VAPID_PUBLIC_KEY,priv:process.env.VAPID_PRIVATE_KEY,subject:process.env.VAPID_SUBJECT,cron:process.env.CRON_SECRET});
const ready=c=>Object.values(c).every(Boolean);
async function markTick(c,now,state,dsState,basketState){const prior=parse(await redis(c,'GET',STATUS));await redis(c,'SET',STATUS,JSON.stringify({lastTick:new Date(now).toISOString(),state,dsState:dsState==='cached'?(prior?.dsState||'cached'):dsState||prior?.dsState||'idle',basketState:basketState==='cached'?(prior?.basketState||'cached'):basketState||prior?.basketState||'idle'}),'EX',86400);}
async function redis(c,...cmd){
 const r=await fetch(c.url,{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(6000)});
 const j=await r.json();if(!r.ok||j.error)throw Error('redis');return j.result;
}
const parse=s=>{try{return JSON.parse(s)}catch{return null}};
const pairs=a=>Array.isArray(a)?Object.fromEntries(Array.from({length:a.length/2},(_,i)=>[a[2*i],a[2*i+1]])):a||{};
const reply=(res,n,x)=>{res.setHeader('Cache-Control','no-store');return res.status(n).json(x)};
const date=d=>new Date(d).toISOString().slice(0,10).replaceAll('-','');
async function scores(lg,now){
 // ESPN soccer rejects date ranges; query Istanbul today and yesterday separately.
 const local=now+3*3600000,days=[date(local),date(local-86400000)];
 const batches=await Promise.all(days.map(async day=>{
  const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/'+lg+'/scoreboard?dates='+day+'&limit=200',{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('upstream_'+r.status);
  const j=await r.json();if(!Array.isArray(j.events))throw Error('upstream_data');
  return j.events;
 }));
 const events=new Map();for(const e of batches.flat()){const x=mapEvent(e,lg);if(x&&!events.has(x.id))events.set(x.id,x)}
 return [...events.values()];
}
async function basketScores(lg,now){
 const local=now+3*3600000,dates=[date(local),date(local-86400000)];
 const batches=await Promise.all(dates.map(async d=>{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/'+lg+'/scoreboard?dates='+d+'&limit=200',{headers:{accept:'application/json'},signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('basket_upstream');const j=await r.json();if(!Array.isArray(j.events))throw Error('basket_data');return j.events}));
 return [...new Map(batches.flat().map(e=>mapBasket(e,lg)).filter(Boolean).map(e=>[e.id,e])).values()];
}
async function euroScores(now){const local=now+3*3600000,d=new Date(local).toISOString().slice(0,10),y=new Date(local-86400000).toISOString().slice(0,10);const results=await Promise.all([elDay(d),elDay(y)]);if(!results.some(x=>x.ok.length))throw Error('euro_upstream');return {events:[...new Map(results.flatMap(x=>x.events).map(mapEuroBasket).filter(Boolean).map(e=>[e.lg+':'+e.id,e])).values()],ok:[...new Set(results.flatMap(x=>x.ok))]};}
const putLua="if not redis.call('HGET',KEYS[1],ARGV[1]) and redis.call('HLEN',KEYS[1])>=100 then return 0 end; redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]);return 1";
async function tick(c){
 if(!await redis(c,'SET',P+'lock','1','NX','EX',55))return {skipped:true};
 const now=Date.now(),all=pairs(await redis(c,'HGETALL',SUB)),subs=[],expired=[],groupSubs=[];
 for(const [id,v] of Object.entries(all)){const s=parse(v);if(!s||s.seen<now-90*86400000||!subscriptionOK(s.subscription)){expired.push(id);continue}if(s.groupNotices&&s.communityMember)groupSubs.push([id,s]);if(((s.fm.length||s.ft.length)&&hasNotices(s))||((s.bfm?.length||s.bft?.length)&&Object.values(basketPrefs(s.bprefs)).some(Boolean)))subs.push([id,s])}
 if(expired.length)await redis(c,'HDEL',SUB,...expired);
 webpush.setVapidDetails(c.subject,c.pub,c.priv);let groups={sent:0,failed:0,checked:0};try{groups=await groupNoticeTick(groupSubs,(s,payload)=>webpush.sendNotification(s.subscription,JSON.stringify(payload),{TTL:86400,urgency:'normal',timeout:3500}),now)}catch{groups={error:'group_notice_scan'}}
 if(!subs.length){await markTick(c,now,'idle','idle','idle');return {checked:0,sent:groups.sent||0,groups}}
 const previous=pairs(await redis(c,'HGETALL',STATE)),changed=Math.max(...subs.map(([,s])=>Number(s.changed)||0));
 const espnSubs=subs.filter(([,s])=>hasNotices(s)&&(s.fm.some(id=>!id.startsWith('ds'))||s.ft.some(id=>!dsTeam(id))));
 const dsSubs=subs.filter(([,s])=>hasNotices(s)&&(s.fm.some(id=>id.startsWith('ds'))||s.ft.some(dsTeam)));
 const due=espnSubs.length?leagues.filter(l=>shouldScan(parse(previous[l]),now,changed)):[];
 const dsOld=parse(previous['ds-all'])||{},dsDue=dsSubs.length&&process.env.DATASPORTS_API_KEY&&shouldScan(dsOld,now,Math.max(...dsSubs.map(([,s])=>Number(s.changed)||0)));
 const bsubs=subs.filter(([,s])=>(s.bfm?.length||s.bft?.length)&&Object.values(basketPrefs(s.bprefs)).some(Boolean));
 const bDue=BASKET_LEAGUES.filter(l=>bsubs.some(([,s])=>[...(s.bfm||[]),...(s.bft||[])].some(k=>k.startsWith(l+':')))&&shouldScan(parse(previous['basket:'+l]),now,Math.max(...bsubs.map(([,s])=>Number(s.changed)||0))));
 if(!due.length&&!dsDue&&!bDue.length){await markTick(c,now,'ok',dsSubs.length?(process.env.DATASPORTS_API_KEY?'cached':'not_configured'):'idle',bsubs.length?'cached':'idle');return {checked:subs.length,leagues:0,sent:groups.sent||0,groups,adaptive:true}}
 const basketWork=Promise.allSettled(bDue.filter(l=>!l.startsWith('as-')).map(async l=>({lg:l,events:await basketScores(l,now)})));
 const euroWork=bDue.some(l=>l.startsWith('as-'))?euroScores(now).catch(()=>null):Promise.resolve(null);
 const result=await Promise.allSettled(due.map(l=>scores(l,now))),updates=[],out=[];
 const br=await basketWork,er=await euroWork;let basketState=bsubs.length?'cached':'idle',bGood=0;
 for(const lg of bDue){const events=lg.startsWith('as-')?(er?.ok.includes(lg)?er.events.filter(e=>e.lg===lg):null):br.find(x=>x.status==='fulfilled'&&x.value.lg===lg)?.value.events;
  const k='basket:'+lg,old=parse(previous[k])||{};if(!events){updates.push(k,JSON.stringify({...old,__scanAt:now,__nextPoll:now+5*60000}));continue}bGood++;
  const next={__scanAt:now,__nextPoll:now+basketDelay(events,bsubs.map(([,s])=>s),now)};
  for(const e of events.filter(e=>bsubs.some(([,s])=>basketFollows(s,e)))){const before=old[e.id],ob=basketballNotices(before,e,now);next[e.id]=ob.next;for(const n of ob.notices)for(const [id,s] of bsubs)if((n.kind==='reminder'||s.changed<=(before?.at||0))&&basketWants(s,e,n.kind))out.push({id,s,e,n,basket:true});}
  updates.push(k,JSON.stringify(next));}
 if(bDue.length)basketState=bGood===bDue.length?'ok':bGood?'partial':'unavailable';
 let dsState=dsSubs.length?(process.env.DATASPORTS_API_KEY?'cached':'not_configured'):'idle';
 if(dsDue){try{
 const today=new Date(now).toISOString().slice(0,10),yesterday=new Date(now-86400000).toISOString().slice(0,10);
 const dsPeople=dsSubs.map(([,s])=>s),oldEvents=Object.values(dsOld).filter(x=>x&&typeof x==='object'&&x.lg);
 const active=oldEvents.some(e=>e.state==='in'||e.state==='pre'&&e.kickoff-now<=20*60000&&e.kickoff-now>=-30*60000);
 const ttl=active?120:300;
 const data=await dsFixtures(today,ttl,true);
 const prevActive=oldEvents.some(e=>e.state==='in'&&e.kickoff<Date.parse(today));
 if(prevActive&&new Date(now).getUTCHours()<3){const y=await dsFixtures(yesterday,ttl,true);data.push(...y)}
 const ev=[...new Map(data.map(dsPushEvent).filter(Boolean).map(e=>[e.id,e])).values()].filter(e=>dsPeople.some(s=>follows(s,e)));
 const next={__scanAt:now,__nextPoll:now+dsDelay(ev,dsPeople,now,follows)};
 for(const e of ev){const before=dsOld[e.id],ob=dsNotices(before,e,now);next[e.id]={...ob.next,lg:e.lg,kickoff:e.kickoff};for(const n of ob.notices)for(const [id,s] of dsSubs)if((['reminder','lineup'].includes(n.kind)||s.changed<=(before?.at||0))&&follows(s,e)&&wants(s,e,n.kind))out.push({id,s,e,n});}
 updates.push('ds-all',JSON.stringify(next));dsState='ok';
 }catch(e){dsState=e.message==='budget'?'budget':'unavailable';updates.push('ds-all',JSON.stringify({...dsOld,__scanAt:now,__nextPoll:now+10*60000}));}}

 const candidates=[];
 for(let i=0;i<due.length;i++){if(result[i].status!=='fulfilled')continue;const old=parse(previous[due[i]])||{};for(const e of result[i].value){const b=old[e.id],until=e.kickoff-now,people=subs.map(([,s])=>s).filter(s=>follows(s,e));if(e.state==='pre'&&until>0&&until<=90*60000&&!b?.lineupSeen&&people.some(s=>wants(s,e,'lineup'))&&now-(b?.summaryAt||0)>=180000||e.state==='in'&&people.some(s=>wants(s,e,'var')||wants(s,e,'cancel')))candidates.push({e,at:b?.summaryAt||0});}}
 const summaries=new Map();await Promise.all(candidates.sort((a,b)=>a.at-b.at).slice(0,8).map(async({e})=>{try{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/'+e.lg+'/summary?event='+e.id,{headers:{accept:'application/json'},signal:AbortSignal.timeout(5000)});if(r.ok){const j=await r.json();summaries.set(e.lg+':'+e.id,readSummary(j,e));}}catch{}}));
 for(let i=0;i<due.length;i++){
  if(result[i].status!=='fulfilled')continue;
  const lg=due[i],old=parse(previous[lg])||{},next={__scanAt:now,__nextPoll:nextPoll(result[i].value,subs.map(([,s])=>s),now)};
  for(const e of result[i].value){
   const before=old[e.id],observation=matchNotices(before,e,now),extra=extraNotices(before,e,now,summaries.get(e.lg+':'+e.id));next[e.id]={...observation.next,...extra.next};
   for(const n of [...observation.notices,...extra.notices])for(const [id,s] of subs)if((['reminder','lineup'].includes(n.kind)||s.changed<=(before?.at||0))&&follows(s,e)&&wants(s,e,n.kind))out.push({id,s,e,n});
  }
  updates.push(lg,JSON.stringify(next));
 }
 // Claim observed scores before dispatch to avoid repeated notifications on retry.
 if(updates.length)await redis(c,'HSET',STATE,...updates);
 webpush.setVapidDetails(c.subject,c.pub,c.priv);
 let sent=0,failed=0;const stale=new Set();
 for(let i=0;i<Math.min(out.length,100);i+=20)await Promise.all(out.slice(i,Math.min(i+20,100)).map(async({id,s,e,n,basket})=>{
  try{await webpush.sendNotification(s.subscription,JSON.stringify(basket?basketPayload(e,n):noticePayload(e,n)),{TTL:120,urgency:'high',timeout:3500});sent++}
  catch(err){failed++;if(err.statusCode===404||err.statusCode===410)stale.add(id)}
 }));
 if(stale.size)await redis(c,'HDEL',SUB,...stale);
 const good=result.filter(x=>x.status==='fulfilled').length;
 await markTick(c,now,good===due.length?(dsState==='budget'||dsState==='unavailable'||basketState==='partial'||basketState==='unavailable'?'partial':'ok'):good?'partial':'upstream_error',dsState,basketState);
 return {checked:subs.length,leagues:good,dsState,basketState,sent:sent+(groups.sent||0),failed:failed+(groups.failed||0),groups,limited:Math.max(0,out.length-100)};
}
export default async function handler(req,res){
 const c=cfg(),action=String(req.query.action||'config');
 if(action==='config'&&req.method==='GET')return reply(res,200,{enabled:ready(c),publicKey:ready(c)?c.pub:null});
 if(!ready(c))return reply(res,503,{error:'push_not_configured'});
 try{
  if(action==='health'&&req.method==='GET'){
   const pong=await redis(c,'PING');webpush.setVapidDetails(c.subject,c.pub,c.priv);
   return reply(res,200,{redis:pong==='PONG',vapid:true});
  }
  if(action==='status'&&req.method==='GET'){
   const s=parse(await redis(c,'GET',STATUS));
   res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=30');
   return res.status(200).json({lastTick:s?.lastTick||null,state:s?.state||'not_started',dsState:s?.dsState||'idle',dsConfigured:!!process.env.DATASPORTS_API_KEY,basketState:s?.basketState||'idle'});
  }
  if(action==='tick'){
   if(req.method!=='POST')return reply(res,405,{error:'method'});
   if(!equal(req.headers.authorization,'Bearer '+c.cron))return reply(res,401,{error:'unauthorized'});
   const result=await tick(c);return reply(res,200,result);
  }
  let origin=false;try{const u=new URL(req.headers.origin);origin=u.protocol==='https:'&&u.host===req.headers.host}catch{}
  if(req.method!=='POST'||!origin)return reply(res,403,{error:'origin'});
  const b=typeof req.body==='string'?parse(req.body):req.body;
  if(!b||!tokenOK(b.token))return reply(res,400,{error:'invalid_token'});
  const id=hash(b.token);
  if(action==='remove'){await redis(c,'HDEL',SUB,id);return reply(res,200,{ok:true})}
  if(action==='test'){
   const s=parse(await redis(c,'HGET',SUB,id));
   if(!s||!subscriptionOK(s.subscription))return reply(res,404,{error:'not_subscribed'});
   if(!await redis(c,'SET',P+'test:'+id,'1','NX','EX',120))return reply(res,429,{error:'test_rate_limit'});
   await new Promise(resolve=>setTimeout(resolve,8000));
   const current=parse(await redis(c,'HGET',SUB,id));
   if(!current||!subscriptionOK(current.subscription))return reply(res,404,{error:'not_subscribed'});
   webpush.setVapidDetails(c.subject,c.pub,c.priv);
   try{await webpush.sendNotification(current.subscription,JSON.stringify({title:'Tribün · Test bildirimi',body:'Bildirim sistemi çalışıyor. Bu gerçek bir gol değildir.',tag:'tribun-test',url:'/#favori'}),{TTL:120,urgency:'high',timeout:5000});return reply(res,200,{ok:true})}
   catch(e){if(e.statusCode===404||e.statusCode===410)await redis(c,'HDEL',SUB,id);return reply(res,502,{error:'delivery_failed'})}
  }
  if(action!=='subscribe'||!subscriptionOK(b.subscription))return reply(res,400,{error:'invalid_subscription'});
  const old=parse(await redis(c,'HGET',SUB,id));
  if(!old){
   const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0],k=P+'rate:'+hash(ip)+':'+Math.floor(Date.now()/3600000);
   await redis(c,'SET',k,'0','NX','EX',3700);
   if(Number(await redis(c,'INCR',k))>20)return reply(res,429,{error:'rate_limit'});
  }
  const communityMember=tokenOK(b.communityToken)?hash(b.communityToken):null,groupNotices=b.groupNotices===true&&!!communityMember;
  const now=Date.now(),fm=matchIds(b.fm),ft=ids(b.ft),bfm=basketKeys(b.bfm),bft=basketKeys(b.bft),bprefs=basketPrefs(b.bprefs),prefs=noticePrefs(b.prefs),teams=teamPrefs(b.teamPrefs,ft),subscription={endpoint:b.subscription.endpoint,keys:{p256dh:b.subscription.keys.p256dh,auth:b.subscription.keys.auth}};
  const same=old&&JSON.stringify([old.fm,old.ft,old.bfm||[],old.bft||[],basketPrefs(old.bprefs),noticePrefs(old.prefs),teamPrefs(old.teamPrefs,old.ft||[]),old.subscription])===JSON.stringify([fm,ft,bfm,bft,bprefs,prefs,teams,subscription]);
  const ok=await redis(c,'EVAL',putLua,1,SUB,id,JSON.stringify({subscription,fm,ft,bfm,bft,bprefs,prefs,teamPrefs:teams,communityMember,groupNotices,seen:now,changed:same?old.changed:now}));
  return reply(res,ok?200:429,ok?{ok:true}:{error:'capacity'});
 }catch{return reply(res,502,{error:'push_service_unavailable'})}
}
