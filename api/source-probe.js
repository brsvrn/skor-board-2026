// Temporary diagnostics for verified source schemas; preview only, no credentials or arbitrary URLs.
const URLS={
 soccerTR:'https://site.web.api.espn.com/apis/site/v2/sports/soccer/tur.1/statistics',
 soccerEN:'https://site.web.api.espn.com/apis/site/v2/sports/soccer/eng.1/statistics',
 soccerAlt:'https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/statistics',
 nba:'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?limit=5&sort=offensive.avgPoints:desc',
 nbaAlt:'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/leaders',
 euroLeague:'https://live.euroleague.net/api/Boxscore?gamecode=1&seasoncode=E2026',
 euroCup:'https://live.euroleague.net/api/Boxscore?gamecode=1&seasoncode=U2026',
 euroLeagueAlt:'https://api-live.euroleague.net/v2/competitions/E/seasons/E2026/games/1/stats',
 euroCupAlt:'https://api-live.euroleague.net/v2/competitions/U/seasons/U2026/games/1/stats'
};
function shape(o,depth=0){
 if(o==null||typeof o!=='object')return typeof o==='string'?o.slice(0,100):o;
 if(depth>=8)return Array.isArray(o)?{count:o.length}:Object.keys(o).slice(0,40);
 if(Array.isArray(o))return {count:o.length,first:o.length?shape(o[0],depth+1):null,names:o.slice(0,15).map(v=>v&&typeof v==='object'?(v.name||v.displayName||v.abbreviation||v.label||v.key||''):typeof v==='string'?v:'').filter(Boolean)};
 return Object.fromEntries(Object.entries(o).slice(0,45).map(([k,v])=>[k,shape(v,depth+1)]));
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({error:'not_found'});
 const source=String(req.query.source||'');if(!Object.hasOwn(URLS,source))return res.status(400).json({error:'bad_source'});
 try{const r=await fetch(URLS[source],{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});if(!r.ok)return res.status(200).json({source,upstreamStatus:r.status});
 const j=await r.json();return res.status(200).json({source,upstreamStatus:r.status,shape:shape(j)})}catch{return res.status(200).json({source,error:'upstream'})}
}