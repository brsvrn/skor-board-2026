import {createHash} from 'node:crypto';
const P='tribun:sync:v1:'+(process.env.VERCEL_ENV==='production'?'prod:':'preview:'), hash=x=>createHash('sha256').update(x).digest('hex');
const valid=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const arr=x=>[...new Set((Array.isArray(x)?x:[]).filter(v=>typeof v==='string'&&/^(?:\d{1,20}|ds[1-9]\d{0,11}|el[eu]20\d{2}\d{1,4}|[A-Z]{2,5})$/.test(v)))].slice(0,200);
const league=x=>typeof x==='string'&&/^[a-z0-9._-]{1,40}$/.test(x);
export function clean(x){
 const fm=arr(x?.fm),ft=arr(x?.ft),map=(raw,keys,fn)=>Object.fromEntries(keys.filter(k=>raw&&Object.hasOwn(raw,k)&&fn(raw[k])).map(k=>[k,raw[k]]));
 const scoped=x=>[...new Set((Array.isArray(x)?x:[]).filter(v=>typeof v==='string'&&/^(?:nba|wnba|mens-college-basketball|as-[a-z]{2,4}):[A-Za-z0-9]{1,24}$/.test(v)))].slice(0,200);const bfm=scoped(x?.bfm),bft=scoped(x?.bft);
 return {fm,ft,fml:map(x?.fml,fm,league),ftl:map(x?.ftl,ft,league),ftn:map(x?.ftn,ft,v=>typeof v==='string'&&v.length<=100),bfm,bft,bftn:map(x?.bftn,bft,v=>typeof v==='string'&&v.length<=100)};
}
async function kv(...c){const r=await fetch(process.env.KV_REST_API_URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.KV_REST_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(c),signal:AbortSignal.timeout(5000)});const j=await r.json();if(!r.ok||j.error)throw Error('cache');return j.result}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 let origin=false;try{const u=new URL(req.headers.origin);origin=u.protocol==='https:'&&u.host===req.headers.host}catch{}
 if(req.method!=='POST'||!origin)return res.status(403).json({error:'origin'});
 let b;try{b=typeof req.body==='string'?JSON.parse(req.body):req.body}catch{}
 if(!b||!valid(b.code)||!['save','load','delete'].includes(b.action)||JSON.stringify(b).length>35000)return res.status(400).json({error:'bad_request'});
 try{const id=P+hash(b.code);
 if(b.action==='load'){const v=await kv('GET',id);return v?res.json(JSON.parse(v)):res.status(404).json({error:'not_found'})}
 if(b.action==='delete'){await kv('DEL',id);return res.json({ok:true})}
 const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0],rate=P+'rate:'+hash(ip)+':'+Math.floor(Date.now()/3600000);
 await kv('SET',rate,'0','NX','EX',3700);if(Number(await kv('INCR',rate))>30)return res.status(429).json({error:'rate'});
 const data={favorites:clean(b.favorites),updatedAt:new Date().toISOString()};await kv('SET',id,JSON.stringify(data),'EX',90*86400);return res.json({ok:true,updatedAt:data.updatedAt});
 }catch{return res.status(503).json({error:'unavailable'})}
}