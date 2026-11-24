const base='https://miniappapi.tbf.org.tr/webapi-service/api/';
const sources={
 tbfLeague:base+'League/get-leagues-and-seasons-by-prefix?prefix=bsl',
 tbfTable:base+'League/get-standings-table?seasonId=174&leagueId=22214',
 tbfWeeks:base+'League/get-league-weeks?seasonId=174&leagueId=22214',
 espnCoach:'https://sports.core.api.espn.com/v2/sports/soccer/leagues/eng.1/teams/359/coaches',
 espnCoachTR:'https://sports.core.api.espn.com/v2/sports/soccer/leagues/tur.1/teams/432/coaches',
 espnRoster:'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/359/roster',
 espnTeam:'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/359'
};
export default async function handler(req,res){
 if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({error:'not_found'});
 const k=String(req.query.source||'');if(!Object.hasOwn(sources,k))return res.status(400).json({error:'invalid'});
 try{const r=await fetch(sources[k],{headers:{accept:'application/json'},signal:AbortSignal.timeout(9000),redirect:'manual'});const ct=r.headers.get('content-type');if(!r.ok)return res.status(200).json({source:k,status:r.status,type:ct});
 const j=await r.json();let sample;
 if(k==='tbfTable')sample={success:j.isSuccess,groups:j.data?.map(g=>({name:g.grup,weeks:g.weeksByGroup,count:g.standings?.length,first:g.standings?.[0]&&Object.fromEntries(Object.entries(g.standings[0]).filter(([k])=>k!=='tiedRows')),last:g.standings?.at(-1)?.takimAdi}))};
 else if(k==='tbfLeague'||k==='tbfWeeks')sample={success:j.isSuccess,data:j.data?.slice(0,4)};
 else if(k==='espnCoach'||k==='espnCoachTR')sample=j;
 else sample={keys:Object.keys(j),teamKeys:Object.keys(j.team||{}),coach:j.coach||j.team?.coach||j.coaches||j.team?.coaches||null};
 return res.status(200).json({source:k,status:r.status,sample});
 }catch(e){return res.status(200).json({source:k,error:String(e.message).slice(0,100)})}
}