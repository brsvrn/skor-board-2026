// DataSportsAPI: fixed paths, shared quota budget and cache; never expose API key.
const LEAGUES={'ds-tr1':[130141],'ds-tr2':[195808],'ds-tr3':[616872,195818,195820,195819],'ds-cup':[285261]};
const slug=id=>Object.keys(LEAGUES).find(k=>LEAGUES[k].includes(Number(id)));
const P='tribun:ds:live:v1:', day=()=>new Date().toISOString().slice(0,10);
const valid=x=>/^[1-9]\d{0,11}$/.test(String(x));
const teamId=x=>'990000'+x;
async function kv(...cmd){const r=await fetch(process.env.KV_REST_API_URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.KV_REST_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(5000)});const j=await r.json();if(!r.ok||j.error)throw Error('cache');return j.result}
const parse=x=>{try{return JSON.parse(x)}catch{return null}};
const lua="local d=tonumber(redis.call('GET',KEYS[1]) or '0'); local m=tonumber(redis.call('GET',KEYS[2]) or '0'); if d>=80 or m>=8 then return 0 end; redis.call('INCR',KEYS[1]);redis.call('EXPIRE',KEYS[1],90000);redis.call('INCR',KEYS[2]);redis.call('EXPIRE',KEYS[2],90);return 1";
async function cached(path,ttl,transform=x=>x){
 const key=P+path,old=parse(await kv('GET',key));
 if(old&&Date.now()-old.at<ttl*1000)return old.data;
 if(!await kv('SET',key+':lock','1','NX','EX',20)){if(old)return old.data;throw Error('busy')}
 try{
 if(!await kv('EVAL',lua,2,P+'daily:'+day(),P+'minute:'+Math.floor(Date.now()/60000)))throw Error('budget');
 const r=await fetch('https://api.datasportsapi.com/v2/'+path,{headers:{Authorization:'Bearer '+process.env.DATASPORTS_API_KEY,accept:'application/json'},signal:AbortSignal.timeout(9000),redirect:'error'});const j=await r.json();
 if(!r.ok||j.data===undefined)throw Error(r.status===429?'budget':r.status===403?'restricted':r.status===404?'no_data':'upstream');
 const data=transform(j.data);await kv('SET',key,JSON.stringify({at:Date.now(),data}),'EX',Math.max(ttl*2,86400));return data;
 }catch(e){if(old)return old.data;throw e}
}
const num=x=>x==null||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const safeTeam=t=>({id:teamId(t.id),nm:String(t.shortName||t.name||''),ab:String(t.code||''),logo:t.image||'',color:null,form:'',rec:'',ls:[],red:0});
const person=x=>typeof x?.name==='string'?x.name:typeof x?.displayName==='string'?x.displayName:null;
function fixture(x,allowSuper=false){
 const lg=slug(x.league?.id)||(allowSuper&&Number(x.league?.id)===172801?'tur.1':null);
 if(!lg||!valid(x.id)||!valid(x.home?.id)||!valid(x.away?.id)||!Number.isFinite(Date.parse(x.startTime)))return null;
 const type=x.status?.type,phase=x.status?.phase,active=type==='inprogress',final=type==='finished',pre=type==='notstarted'||type==='scheduled';
 const state=active?'in':pre?'pre':'post';
 const h={...safeTeam(x.home),sc:x.homeScore?.current??'',red:x.homeScore?.redCards||0},a={...safeTeam(x.away),sc:x.awayScore?.current??'',red:x.awayScore?.redCards||0};
 return {id:'ds'+x.id,rawId:String(x.id),lg,date:x.startTime,state,short:active?phase==='halftime'?'HT':x.status?.description||'Canlı':final?'FT':pre?'Scheduled':x.status?.description||'Durum belirsiz',clock:active?String(x.clock?.display||x.clock?.displayValue||''):'',h,a,venue:x.venue?.name||'',city:x.venue?.city?.name||x.venue?.city||'',det:[],ht:'',referee:person(x.referee),coaches:[{team:h.nm,name:person(x.homeManager)},{team:a.nm,name:person(x.awayManager)}].filter(x=>x.name),attendance:x.attendance??null,season:x.season?.id,group:x.group||x.stage||'',final,rawHome:x.home?.name,rawAway:x.away?.name};
}
async function fixtures(date){return cached('fixtures?sport=football&country=TR&date='+date,date===day()?1200:21600,x=>x.map(v=>fixture(v,true)).filter(Boolean))}
async function groups(lg){
 const out=[];
 // Parent league is authoritative when it has a current-season table; fall back to its known group competitions.
 for(const id of LEAGUES[lg]){
  try{
  const s=await cached('leagues/'+id+'/seasons',86400);
  const y=new Date(),year=y.getUTCMonth()>=6?y.getUTCFullYear():y.getUTCFullYear()-1;
  const season=s.find(x=>x.startYear===year&&x.endYear===year+1);
  if(!season||!valid(season.id))continue;
  const raw=await cached('leagues/'+id+'/standings?season='+season.id+'&group=all',21600);
  for(const g of raw){const rows=(g.rows||[]).map(r=>{
   if(!valid(r.team?.id))return null;
   const vals=[r.position,r.played??r.matchesPlayed,r.wins,r.draws??r.ties,r.losses,r.scoreDifference??r.goalDifference??(num(r.scoresFor)!=null&&num(r.scoresAgainst)!=null?num(r.scoresFor)-num(r.scoresAgainst):null),r.points].map(num);
   if(vals.some(x=>x===null))return null;
   const [rank,p,w,d,l,gd,pts]=vals;return {id:teamId(r.team.id),nm:r.team.name,logo:r.team.image,rank,p,w,d,l,gd,pts};
  }).filter(Boolean);if(rows.length)out.push({name:g.name||g.group||'Grup',source:'DataSportsAPI',season:season.year,rows});}
  if(out.length&&id===616872&&out.length>=4)break;
  }catch(e){if(e.message==='budget'&&!out.length)throw e}
 }
 const seen=new Set();return out.filter(g=>{const key=g.rows.map(r=>r.id).sort().join(',');if(seen.has(key))return false;seen.add(key);return true});
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=60');
 if(req.method!=='GET')return res.status(405).end();
 if(!process.env.DATASPORTS_API_KEY)return res.status(503).json({error:'not_configured'});
 const a=String(req.query.action||''),lg=String(req.query.league||''),id=String(req.query.id||'');
 try{
 if(a==='day'){
 const d=String(req.query.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||Math.abs(Date.parse(d)-Date.parse(day()))>7*86400000)return res.status(400).json({error:'date'});
 const events=await fixtures(d);return res.json({events:events.filter(e=>e.lg!=='tur.1'),super:events.filter(e=>e.lg==='tur.1'),refreshMinutes:20});
 }
 if(a==='stand'&&Object.hasOwn(LEAGUES,lg)&&lg!=='ds-cup'){return res.json({groups:await groups(lg)})}
 if(a==='match'&&/^ds[1-9]\d{0,11}$/.test(id)){
 const x=await cached('fixtures/'+id.slice(2),3600);const e=fixture(x,true);if(!e)return res.status(404).json({error:'unsupported'});return res.json({event:e});
 }
 if(a==='team'&&/^990000[1-9]\d{0,11}$/.test(id)&&Object.hasOwn(LEAGUES,lg)){
 const n=id.slice(6);const [a,b]=await Promise.all([cached('teams/'+n+'/fixtures?type=recent',21600,x=>x.map(v=>fixture(v)).filter(Boolean)),cached('teams/'+n+'/fixtures?type=upcoming',21600,x=>x.map(v=>fixture(v)).filter(Boolean))]);const ev=[...a,...b],t=ev.flatMap(e=>[e.h,e.a]).find(t=>t.id===id);if(!t)return res.status(404).json({error:'no_data'});return res.json({events:ev,team:t});
 }
 return res.status(400).json({error:'bad_request'});
 }catch(e){return res.status(e.message==='budget'?429:e.message==='restricted'?422:e.message==='no_data'?404:503).json({error:['budget','restricted','no_data','busy'].includes(e.message)?e.message:'upstream'})}
}