// Bounded, read-only coverage check. No key, quota or account data is returned.
const key='tribun:football:coverage:v1';
async function kv(...cmd){const u=process.env.KV_REST_API_URL,t=process.env.KV_REST_API_TOKEN;if(!u||!t)throw Error('storage');const r=await fetch(u,{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(5000)});const j=await r.json();if(!r.ok||j.error)throw Error('storage');return j.result}
async function get(path){const r=await fetch('https://v3.football.api-sports.io/'+path,{headers:{'x-apisports-key':process.env.APISPORTS_KEY,accept:'application/json'},signal:AbortSignal.timeout(9000)});const j=await r.json();const errors=Object.values(j.errors||{}).map(String);return {http:r.status,errors:errors.map(x=>/plan|season|subscription/i.test(x)?'plan_or_season':/key|access|auth/i.test(x)?'access':/limit|request/i.test(x)?'quota':'upstream'),response:Array.isArray(j.response)?j.response:[]}}
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=3600');
 if(req.method!=='GET')return res.status(405).end();
 if(process.env.VERCEL_ENV!=='production'||!process.env.APISPORTS_KEY)return res.status(200).json({state:'not_configured'});
 try{
 const saved=await kv('GET',key);if(saved)return res.json(JSON.parse(saved));
 if(!await kv('SET',key+':lock','1','NX','EX',86400))return res.json({state:'check_pending'});
 const now=new Date(),season=now.getUTCMonth()>=6?now.getUTCFullYear():now.getUTCFullYear()-1;
 const l=await get('leagues?country=Turkey&season='+season);
 const leagues=l.response.filter(x=>/^(1\. Lig|2\. Lig|3\. Lig)(?:$|[ -])/i.test(x.league?.name||'')).map(x=>({id:x.league.id,name:x.league.name,coverage:x.seasons?.find(s=>s.year===season)?.coverage}));
 const fixture=await get('fixtures?league=204&season='+season+'&last=2');
 const out={state:fixture.errors.length?'restricted':fixture.http===200&&fixture.response.length?'available':'no_data',season,leagueErrors:l.errors,fixtureErrors:fixture.errors,leagues,fixtureCount:fixture.response.length,refereeAvailable:fixture.response.some(x=>!!x.fixture?.referee),sample:fixture.response.slice(0,2).map(x=>({id:x.fixture?.id,date:x.fixture?.date,home:x.teams?.home?.name,away:x.teams?.away?.name,referee:x.fixture?.referee||null}))};
 await kv('SET',key,JSON.stringify(out),'EX',86400);return res.json(out);
 }catch{return res.status(502).json({state:'unavailable'})}
}