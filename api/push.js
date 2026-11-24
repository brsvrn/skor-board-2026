import webpush from 'web-push';
import {leagues,hash,equal,tokenOK,subscriptionOK,ids,mapEvent,isGoal,follows} from '../lib/goal-push.js';
const P='tribun:push:v1:'+(process.env.VERCEL_ENV==='production'?'prod:':'preview:'),SUB=P+'subs',STATE=P+'scores';
const cfg=()=>({url:process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL,token:process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN,pub:process.env.VAPID_PUBLIC_KEY,priv:process.env.VAPID_PRIVATE_KEY,subject:process.env.VAPID_SUBJECT,cron:process.env.CRON_SECRET});
const ready=c=>Object.values(c).every(Boolean);
async function redis(c,...cmd){
 const r=await fetch(c.url,{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(6000)});
 const j=await r.json();if(!r.ok||j.error)throw Error('redis');return j.result;
}
const parse=s=>{try{return JSON.parse(s)}catch{return null}};
const pairs=a=>Array.isArray(a)?Object.fromEntries(Array.from({length:a.length/2},(_,i)=>[a[2*i],a[2*i+1]])):a||{};
const reply=(res,n,x)=>{res.setHeader('Cache-Control','no-store');return res.status(n).json(x)};
const date=d=>new Date(d).toISOString().slice(0,10).replaceAll('-','');
async function scores(lg,now){
 const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/'+lg+'/scoreboard?dates='+date(now-86400000)+'-'+date(now+86400000)+'&limit=200',{signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('upstream');const j=await r.json();if(!Array.isArray(j.events))throw Error('upstream');
 return j.events.map(e=>mapEvent(e,lg)).filter(Boolean);
}
const putLua="if not redis.call('HGET',KEYS[1],ARGV[1]) and redis.call('HLEN',KEYS[1])>=100 then return 0 end; redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]);return 1";
async function tick(c){
 if(!await redis(c,'SET',P+'lock','1','NX','EX',55))return {skipped:true};
 const now=Date.now(),all=pairs(await redis(c,'HGETALL',SUB)),subs=[],expired=[];
 for(const [id,v] of Object.entries(all)){const s=parse(v);if(!s||s.seen<now-90*86400000||!subscriptionOK(s.subscription)){expired.push(id);continue}if(s.fm.length||s.ft.length)subs.push([id,s])}
 if(expired.length)await redis(c,'HDEL',SUB,...expired);
 if(!subs.length)return {checked:0,sent:0};
 const previous=pairs(await redis(c,'HGETALL',STATE)),result=await Promise.allSettled(leagues.map(l=>scores(l,now))),updates=[],out=[];
 for(let i=0;i<leagues.length;i++){
  if(result[i].status!=='fulfilled')continue;
  const lg=leagues[i],old=parse(previous[lg])||{},next={};
  for(const e of result[i].value){
   const before=old[e.id];next[e.id]={home:e.home,away:e.away,state:e.state,at:now};
   if(isGoal(before,e,now))for(const [id,s] of subs)if(s.changed<=before.at&&follows(s,e))out.push({id,s,e});
  }
  updates.push(lg,JSON.stringify(next));
 }
 // Claim observed scores before dispatch to avoid repeated notifications on retry.
 if(updates.length)await redis(c,'HSET',STATE,...updates);
 webpush.setVapidDetails(c.subject,c.pub,c.priv);
 let sent=0,failed=0;const stale=new Set();
 for(let i=0;i<Math.min(out.length,100);i+=20)await Promise.all(out.slice(i,Math.min(i+20,100)).map(async({id,s,e})=>{
  try{await webpush.sendNotification(s.subscription,JSON.stringify({title:'GOL! '+e.hn+' – '+e.an,body:e.hn+' '+e.home+' - '+e.away+' '+e.an,tag:'goal-'+e.lg+'-'+e.id+'-'+e.home+'-'+e.away,url:'/#mac-'+leagues.indexOf(e.lg)+'-'+e.id}),{TTL:120,urgency:'high',timeout:3500});sent++}
  catch(err){failed++;if(err.statusCode===404||err.statusCode===410)stale.add(id)}
 }));
 if(stale.size)await redis(c,'HDEL',SUB,...stale);
 return {checked:subs.length,leagues:result.filter(x=>x.status==='fulfilled').length,sent,failed,limited:Math.max(0,out.length-100)};
}
export default async function handler(req,res){
 const c=cfg(),action=String(req.query.action||'config');
 if(action==='config'&&req.method==='GET')return reply(res,200,{enabled:ready(c),publicKey:ready(c)?c.pub:null});
 if(!ready(c))return reply(res,503,{error:'push_not_configured'});
 try{
  if(action==='health'&&req.method==='GET'&&process.env.VERCEL_ENV==='preview'){
   const pong=await redis(c,'PING');webpush.setVapidDetails(c.subject,c.pub,c.priv);
   return reply(res,200,{redis:pong==='PONG',vapid:true});
  }
  if(action==='tick'){
   if(req.method!=='POST')return reply(res,405,{error:'method'});
   if(!equal(req.headers.authorization,'Bearer '+c.cron))return reply(res,401,{error:'unauthorized'});
   return reply(res,200,await tick(c));
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
  const now=Date.now(),fm=ids(b.fm),ft=ids(b.ft),subscription={endpoint:b.subscription.endpoint,keys:{p256dh:b.subscription.keys.p256dh,auth:b.subscription.keys.auth}};
  const same=old&&JSON.stringify([old.fm,old.ft,old.subscription])===JSON.stringify([fm,ft,subscription]);
  const ok=await redis(c,'EVAL',putLua,1,SUB,id,JSON.stringify({subscription,fm,ft,seen:now,changed:same?old.changed:now}));
  return reply(res,ok?200:429,ok?{ok:true}:{error:'capacity'});
 }catch{return reply(res,502,{error:'push_service_unavailable'})}
}
