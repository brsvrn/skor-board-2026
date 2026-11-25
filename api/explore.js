import {cached,valid} from '../lib/ds-data.js';
import {advanced} from '../lib/advanced.js';
import {aiAnalysis} from '../lib/ai-analysis.js';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/';
const LEAGUES={soccer:['tur.1','uefa.champions','uefa.europa','uefa.europa.conf','eng.1','esp.1','ita.1','ger.1','fra.1','por.1','ned.1','bel.1','sco.1','eng.2','ksa.1','usa.1','bra.1','arg.1','conmebol.libertadores'],basketball:['nba','wnba','mens-college-basketball']};
const arr=x=>Array.isArray(x)?x:[];
const str=x=>typeof x==='string'?x.slice(0,300):'';
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
const ref=x=>x&&valid(x.id)?{id:String(x.id),name:str(x.name),image:https(x.image)}:null;
const player=x=>({id:String(x.id||''),name:str(x.name),position:str(x.position),jersey:str(String(x.jerseyNumber??'')),image:https(x.image),headshot:https(x.headshot?.href||x.headshot),photo:https(x.photo),jerseyImage:https(x.jerseyImage),fullBodyImage:https(x.fullBodyImage||x.images?.fullBody),country:str(x.country?.name),injury:x.injury?{description:str(x.injury.description),status:str(x.injury.status),return:str(x.injury.expectedReturn)}:null});
const transfer=x=>({player:ref(x.player),date:str(x.date),from:str(x.from?.name||x.fromName),to:str(x.to?.name||x.toName),type:str(x.type),fee:x.fee&&Number.isFinite(x.fee.amount)?{amount:x.fee.amount,currency:str(x.fee.currency)}:null,free:x.freeTransfer===true});
const lineups=x=>({confirmed:x?.confirmed===true,...Object.fromEntries(['home','away'].map(k=>[k,{formation:str(x?.[k]?.formation),players:arr(x?.[k]?.players).map(p=>({id:String(p.player?.id||''),name:str(p.player?.name),image:https(p.player?.image),headshot:https(p.player?.headshot?.href||p.player?.headshot),photo:https(p.player?.photo),jerseyImage:https(p.player?.jerseyImage),fullBodyImage:https(p.player?.fullBodyImage||p.player?.images?.fullBody),jersey:str(String(p.jerseyNumber??'')),position:str(p.position),substitute:p.substitute===true,rating:p.rating??null,stats:Object.fromEntries(['minutesPlayed','goals','assists','shotsOnGoal','passes','accuratePasses','tackles','saves','yellowCards','redCards','points','rebounds','assists'].filter(k=>Number.isFinite(p.statistics?.[k])).map(k=>[k,p.statistics[k]]))})),missing:arr(x?.[k]?.missing).map(p=>({id:String(p.player?.id||''),name:str(p.player?.name),reason:str(p.reason),description:str(p.description),return:str(p.expectedReturnAt)}))}]))});
async function espn(sport,league,path){const r=await fetch(ESPN+sport+'/'+league+'/'+path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('upstream');return r.json()}

// Wikimedia lookup is restricted to exact ESPN FC IDs from an actual match.
const photoCache=new Map();
const wikiHeaders={'User-Agent':'TribunSports/1.0 (https://github.com/brsvrn/skor-board-2026)','Accept':'application/json'};
const cleanText=v=>String(v||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').slice(0,300);
async function wikiJson(url){const r=await fetch(url,{headers:wikiHeaders,signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('wiki');return r.json()}
async function licensedMatchPhotos(lg,id){
 const key=lg+':'+id,old=photoCache.get(key);if(old&&Date.now()-old.at<86400000)return old.items;
 const summary=await espn('soccer',lg,'summary?event='+id);
 const ids=[...new Set(arr(summary.rosters).flatMap(r=>arr(r.roster).map(p=>String(p.athlete?.id||''))).filter(valid))].sort().slice(0,64);
 if(!ids.length)return [];
 const sparql='SELECT DISTINCT ?id ?image WHERE { VALUES ?id { '+ids.map(x=>'"'+x+'"').join(' ')+' } ?item wdt:P3681 ?id; wdt:P18 ?image. } LIMIT 120';
 const data=await wikiJson('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(sparql));
 const grouped=new Map();for(const row of arr(data.results?.bindings)){const pid=row.id?.value;if(!ids.includes(pid)||!row.image?.value)continue;let filename;try{const u=new URL(row.image.value);if(u.hostname!=='commons.wikimedia.org')continue;filename=decodeURIComponent(u.pathname.split('/').pop()).replace(/_/g,' ')}catch{continue}if(filename&&!grouped.has(pid))grouped.set(pid,'File:'+filename)}
 const pairs=[...grouped.entries()].slice(0,64),result=[];
 for(let i=0;i<pairs.length;i+=25){const chunk=pairs.slice(i,i+25);const j=await wikiJson('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'300',titles:chunk.map(x=>x[1]).join('|')}));
 for(const page of arr(j.query?.pages)){const info=page.imageinfo?.[0],m=info?.extmetadata||{},license=cleanText(m.LicenseShortName?.value),author=cleanText(m.Artist?.value),url=https(info?.thumburl||info?.url),source=https(info?.descriptionurl),licenseUrl=https(m.LicenseUrl?.value);if(!url||!source||!license||!author||!(/^(CC BY(?:-SA)? [1234]\.\d|CC0|Public domain)$/i.test(license)))continue;
 const pair=chunk.find(x=>x[1].replace(/_/g,' ').toLowerCase()===String(page.title||'').replace(/_/g,' ').toLowerCase());if(pair)result.push({id:pair[0],url,source,author,license,licenseUrl})}}
 if(photoCache.size>=100)photoCache.delete(photoCache.keys().next().value);photoCache.set(key,{at:Date.now(),items:result});return result;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=180, stale-while-revalidate=300');if(req.method!=='GET')return res.status(405).end();
 const a=String(req.query.action||''),id=String(req.query.id||''),sport=String(req.query.sport||'soccer'),lg=String(req.query.league||''),okLeague=LEAGUES[sport]?.includes(lg);
 try{
 if(a==='news'&&okLeague){const j=await espn(sport,lg,'news?limit=15');return res.json({items:arr(j.articles).map(x=>({title:str(x.headline),description:str(x.description),published:str(x.published),url:https(x.links?.web?.href),source:'ESPN'})).filter(x=>x.title&&x.url)})}
 if(a==='espnTeams'&&okLeague){const j=await espn(sport,lg,'teams?limit=100');return res.json({items:arr(j.sports).flatMap(s=>arr(s.leagues)).flatMap(l=>arr(l.teams)).map(x=>({id:String(x.team?.id||''),name:str(x.team?.displayName),image:https(x.team?.logos?.[0]?.href),league:lg})).filter(x=>valid(x.id)&&x.name)})}
 if(a==='injuries'&&okLeague&&valid(id)){const j=await espn(sport,lg,'teams/'+id+'/injuries');const groups=arr(j.injuries);return res.json({items:groups.flatMap(x=>Array.isArray(x.injuries)?x.injuries:[x]).map(x=>({name:str(x.athlete?.displayName),status:str(x.status),description:str(x.shortComment||x.longComment),date:str(x.date)})).filter(x=>x.name)})}
 if(a==='playerPhotos'&&sport==='soccer'&&okLeague&&valid(id)){res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=86400');try{return res.json({items:await licensedMatchPhotos(lg,id)})}catch{return res.status(503).json({error:'photo_source'})}}
 if(a==='espnPlayer'&&sport==='soccer'&&okLeague&&valid(id)){const r=await fetch('https://sports.core.api.espn.com/v2/sports/soccer/leagues/'+lg+'/athletes/'+id,{signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('upstream');const x=await r.json();if(String(x.id)!==id)throw Error('no_data');return res.json({profile:{id,displayName:str(x.displayName||x.fullName),headshot:https(x.headshot?.href),birth:str(x.dateOfBirth).slice(0,10),country:str(x.citizenship||x.country?.name||x.birthPlace?.country),height:Number.isFinite(x.height)?Math.round(x.height*2.54):null}})}
 if(a==='aiAnalysis'&&sport==='soccer'&&okLeague&&valid(id))return res.json(await aiAnalysis(lg,id));
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
 }catch(e){const code=['budget','restricted','no_data','busy','ai_not_configured'].includes(e.message)?e.message:e.message==='bad_request'?'bad_request':'upstream';return res.status(code==='budget'?429:code==='no_data'?404:code==='bad_request'?400:code==='restricted'?403:503).json({error:code})}
}