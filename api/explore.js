import {cached,valid} from '../lib/ds-data.js';
import {advanced} from '../lib/advanced.js';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/';
const LEAGUES={soccer:['tur.1','uefa.champions','uefa.europa','uefa.europa.conf','eng.1','esp.1','ita.1','ger.1','fra.1','por.1','ned.1','bel.1','sco.1','eng.2','ksa.1','usa.1','bra.1','arg.1','conmebol.libertadores'],basketball:['nba','wnba','mens-college-basketball']};
const arr=x=>Array.isArray(x)?x:[];
const str=x=>typeof x==='string'?x.slice(0,300):'';
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
const ref=x=>x&&valid(x.id)?{id:String(x.id),name:str(x.name),image:https(x.image)}:null;
const player=x=>({id:String(x.id||''),name:str(x.name),position:str(x.position),jersey:str(String(x.jerseyNumber??'')),image:https(x.image),country:str(x.country?.name),injury:x.injury?{description:str(x.injury.description),status:str(x.injury.status),return:str(x.injury.expectedReturn)}:null});
const transfer=x=>({player:ref(x.player),date:str(x.date),from:str(x.from?.name||x.fromName),to:str(x.to?.name||x.toName),type:str(x.type),fee:x.fee&&Number.isFinite(x.fee.amount)?{amount:x.fee.amount,currency:str(x.fee.currency)}:null,free:x.freeTransfer===true});
const lineups=x=>({confirmed:x?.confirmed===true,...Object.fromEntries(['home','away'].map(k=>[k,{formation:str(x?.[k]?.formation),players:arr(x?.[k]?.players).map(p=>({id:String(p.player?.id||''),name:str(p.player?.name),jersey:str(String(p.jerseyNumber??'')),position:str(p.position),substitute:p.substitute===true,rating:p.rating??null,stats:Object.fromEntries(['minutesPlayed','goals','assists','shotsOnGoal','passes','accuratePasses','tackles','saves','yellowCards','redCards','points','rebounds','assists'].filter(k=>Number.isFinite(p.statistics?.[k])).map(k=>[k,p.statistics[k]]))})),missing:arr(x?.[k]?.missing).map(p=>({id:String(p.player?.id||''),name:str(p.player?.name),reason:str(p.reason),description:str(p.description),return:str(p.expectedReturnAt)}))}]))});
async function espn(sport,league,path){const r=await fetch(ESPN+sport+'/'+league+'/'+path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('upstream');return r.json()}
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=180, stale-while-revalidate=300');if(req.method!=='GET')return res.status(405).end();
 const a=String(req.query.action||''),id=String(req.query.id||''),sport=String(req.query.sport||'soccer'),lg=String(req.query.league||''),okLeague=LEAGUES[sport]?.includes(lg);
 try{
 if(a==='news'&&okLeague){const j=await espn(sport,lg,'news?limit=15');return res.json({items:arr(j.articles).map(x=>({title:str(x.headline),description:str(x.description),published:str(x.published),url:https(x.links?.web?.href),source:'ESPN'})).filter(x=>x.title&&x.url)})}
 if(a==='espnTeams'&&okLeague){const j=await espn(sport,lg,'teams?limit=100');return res.json({items:arr(j.sports).flatMap(s=>arr(s.leagues)).flatMap(l=>arr(l.teams)).map(x=>({id:String(x.team?.id||''),name:str(x.team?.displayName),image:https(x.team?.logos?.[0]?.href),league:lg})).filter(x=>valid(x.id)&&x.name)})}
 if(a==='injuries'&&okLeague&&valid(id)){const j=await espn(sport,lg,'teams/'+id+'/injuries');const groups=arr(j.injuries);return res.json({items:groups.flatMap(x=>Array.isArray(x.injuries)?x.injuries:[x]).map(x=>({name:str(x.athlete?.displayName),status:str(x.status),description:str(x.shortComment||x.longComment),date:str(x.date)})).filter(x=>x.name)})}
 if(!process.env.DATASPORTS_API_KEY)return res.status(503).json({error:'not_configured'});
 if(a==='advanced'&&sport==='soccer'&&(okLeague||['ds-tr1','ds-tr2','ds-tr3','ds-cup'].includes(lg)))return res.json(await advanced(lg,id,String(req.query.kind||''),String(req.query.player||'')));
 if(a==='search'){const q=String(req.query.q||'').trim(),type=String(req.query.type||'');if(q.length<2||q.length>60||/[\x00-\x1f]/.test(q)||!['','team','player','referee','league'].includes(type))return res.status(400).json({error:'query'});
 const data=await cached('search?q='+encodeURIComponent(q.toLowerCase())+(type?'&type='+type:''),86400);
 return res.json({items:arr(data).filter(x=>['team','player','referee','league'].includes(x.type)&&['football','basketball'].includes(x.sport)&&valid(x.id)).slice(0,25).map(x=>({id:String(x.id),name:str(x.name),type:x.type,sport:x.sport,image:https(x.image),team:ref(x.team)}))})}
 if(a==='transfers'){const data=await cached('transfers?sort=latest',1800);return res.json({items:arr(data?.transfers||data).slice(0,40).map(transfer).filter(x=>x.player)})}
 if(!valid(id))return res.status(400).json({error:'id'});
 if(a==='squad'){const data=await cached('teams/'+id+'/squad',86400);return res.json({items:arr(data).map(player).filter(x=>valid(x.id)&&x.name)})}
 if(a==='teamTransfers'){const data=await cached('teams/'+id+'/transfers',86400);return res.json({items:[...arr(data?.arrivals),...arr(data?.departures)].map(transfer).filter(x=>x.player).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,40)})}
 if(a==='teamProfile'){const x=await cached('teams/'+id,86400);return res.json({profile:{id,name:str(x.name),image:https(x.image),sport:str(x.sport),country:str(x.country?.name),venue:str(x.venue?.name),manager:str(x.manager?.name),founded:str(x.foundedOn)}})}
 if(a==='player'){const x=await cached('players/'+id,86400);return res.json({profile:{...player(x),team:ref(x.team),birth:str(x.dateOfBirth),height:x.heightCm??null,foot:str(x.preferredFoot)}})}
 if(a==='referee'){const x=await cached('referees/'+id,86400);return res.json({profile:{id,name:str(x.name),country:str(x.country?.name),image:https(x.image),games:x.games??null,yellow:x.yellowCards??null,red:x.redCards??null,secondYellow:x.yellowRedCards??null,competitions:arr(x.competitions).map(c=>({name:str(c.league?.name),games:c.appearances??null,yellow:c.yellowCards??null,red:c.redCards??null,penalties:c.penalties??null}))}})}
 if(a==='league'){const x=await cached('leagues/'+id,86400);return res.json({profile:{id,name:str(x.name),image:https(x.image),sport:str(x.sport),country:str(x.country?.name),category:str(x.category)}})}
 if(a==='lineups'){const data=await cached('fixtures/'+id+'/lineups',900);return res.json(lineups(data))}
 return res.status(400).json({error:'bad_request'});
 }catch(e){const code=['budget','restricted','no_data','busy'].includes(e.message)?e.message:e.message==='bad_request'?'bad_request':'upstream';return res.status(code==='budget'?429:code==='no_data'?404:code==='bad_request'?400:code==='restricted'?403:503).json({error:code})}
}