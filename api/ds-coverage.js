const K='tribun:ds:probe:20261125';
async function kv(...c){const r=await fetch(process.env.KV_REST_API_URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.KV_REST_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(c),signal:AbortSignal.timeout(5000)});const j=await r.json();if(!r.ok||j.error)throw Error('cache');return j.result}
async function get(p){const r=await fetch('https://api.datasportsapi.com/v2/'+p,{headers:{Authorization:'Bearer '+process.env.DATASPORTS_API_KEY,accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'});const j=await r.json();return {status:r.status,code:j.error?.code||null,data:r.ok?j.data:null}}
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=3600');
 if(req.method!=='GET')return res.status(405).end();
 if(!process.env.DATASPORTS_API_KEY)return res.json({state:'not_configured'});
 try{const v=await kv('GET',K);if(v)return res.json(JSON.parse(v));if(!await kv('SET',K+':lock','1','NX','EX',86400))return res.json({state:'pending'});
 const [l,f]=await Promise.all([get('leagues?sport=football&country=TR'),get('fixtures?sport=football&country=TR&date=2026-11-22')]);
 const rows=Array.isArray(l.data)?l.data:[];
 const matches=Array.isArray(f.data)?f.data:[];
 const relevant=matches.filter(x=>/bursaspor|1\. lig|2\. lig|3\. lig|super lig|süper lig/i.test([x.home?.name,x.away?.name,x.league?.name].join(' ')));
 const chosen=relevant.find(x=>/bursaspor/i.test(x.home?.name+' '+x.away?.name))||relevant[0];
 const detail=chosen?await get('fixtures/'+chosen.id):null;
 const out={state:l.status===200&&f.status===200?'ok':'restricted',directory:{status:l.status,code:l.code,count:rows.length,leagues:rows.filter(x=>/lig|cup|kupa/i.test(x.name||'')).slice(0,80).map(x=>({id:x.id,name:x.name,slug:x.slug,category:x.category}))},fixtures:{status:f.status,code:f.code,count:matches.length,leagues:[...new Map(matches.map(x=>[x.league?.id,{id:x.league?.id,name:x.league?.name,season:x.season}])).values()].slice(0,50),sample:chosen||null},detail:detail?{status:detail.status,code:detail.code,fixture:detail.data}:null};
 await kv('SET',K,JSON.stringify(out),'EX',86400);return res.json(out);
 }catch{return res.status(502).json({state:'unavailable'})}
}