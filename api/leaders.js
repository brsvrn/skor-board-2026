// ESPN's observed soccer statistics and NBA by-athlete data; fixed allowlist, no open proxy.
const SOCCER=new Set(['tur.1','uefa.champions','uefa.europa','uefa.europa.conf','eng.1','esp.1','ita.1','ger.1','fra.1','por.1','ned.1','bel.1','sco.1','eng.2','ksa.1','usa.1','bra.1','arg.1','conmebol.libertadores']);
const WEB='https://site.web.api.espn.com/apis/';
const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
async function get(url){const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(9000)});if(r.status===404)return null;if(!r.ok)throw Error('upstream');return r.json()}
function soccer(j){
 if(!Array.isArray(j?.stats))return {season:j?.season?.displayName||'',categories:[]};
 const cats=[['goalsLeaders','Gol krallığı','Gol'],['assistsLeaders','Asist krallığı','Asist']];
 return {season:j.season?.displayName||'',categories:cats.map(([key,title,unit])=>{
  const src=j.stats.find(s=>s.name===key);
  const rows=(src?.leaders||[]).map(l=>{const x=l.athlete||{},t=x.team||l.team||{},stats=Object.fromEntries((x.statistics||[]).map(s=>[s.name,s.value]));return {id:String(x.id||''),name:x.displayName||x.shortName||'',team:t.displayName||t.name||'',logo:t.logos?.[0]?.href||'',value:num(l.value),games:num(stats.appearances)}}).filter(r=>r.name&&r.value!==null).sort((a,b)=>b.value-a.value).slice(0,50);
  return {key,title,unit,rows};
 }).filter(x=>x.rows.length)};
}
function metric(entry,defs,name){
 for(const c of defs||[]){const i=(c.names||[]).indexOf(name);if(i<0)continue;const v=(entry.categories||[]).find(x=>x.name===c.name);if(v)return num(v.values?.[i]??v.totals?.[i])}
 return null;
}
async function nba(){
 const u=WEB+'common/v3/sports/basketball/nba/statistics/byathlete?limit=500&sort=offensive.avgPoints:desc&isqualified=true';
 const j=await get(u+'&page=1');
 if(!j||!Array.isArray(j.athletes))return {season:'',categories:[]};
 const count=Number(j.pagination?.pages||1);if(!Number.isInteger(count)||count>10)throw Error('incomplete');
 const rest=await Promise.all(Array.from({length:Math.max(0,count-1)},(_,i)=>get(u+'&page='+(i+2))));
 if(rest.some(x=>!Array.isArray(x?.athletes)))throw Error('incomplete');
 const seen=new Set(),all=[j,...rest].flatMap(x=>x.athletes).filter(x=>{const id=x.athlete?.id;if(!id||seen.has(id))return false;seen.add(id);return true});
 // ESPN may include non-qualified players despite a query option; label these as provider-data leaders, not the official NBA qualification table.
 const defs=j.categories||[];
 const rows=all.map(x=>{const p=x.athlete||{},t=p.teams?.[0]||{};return {id:String(p.id||''),name:p.displayName||'',team:t.displayName||p.teamName||'',logo:t.logos?.[0]?.href||p.teamLogos?.[0]?.href||'',games:metric(x,defs,'gamesPlayed'),value:metric(x,defs,'avgPoints'),total:metric(x,defs,'points')}}).filter(x=>x.name&&x.value!==null).sort((a,b)=>b.value-a.value||(b.games||0)-(a.games||0)).slice(0,50);
 return {season:j.requestedSeason?.displayName||j.currentSeason?.displayName||'',categories:rows.length?[{key:'points',title:'Sayı krallığı',unit:'Sayı/maç',rows}]:[]};
}
export default async function handler(req,res){
 const lg=String(req.query.league||'');
 if(req.method!=='GET')return res.status(405).json({error:'method'});
 if(!SOCCER.has(lg)&&lg!=='nba')return res.status(400).json({error:'unsupported'});
 try{
  const out=lg==='nba'?await nba():soccer(await get(WEB+'site/v2/sports/soccer/'+lg+'/statistics'));
  res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=1800');
  return res.status(200).json(out);
 }catch{res.setHeader('Cache-Control','s-maxage=60');return res.status(502).json({error:'upstream'})}
}