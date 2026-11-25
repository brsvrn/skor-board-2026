// DataSportsAPI: fixed paths, shared quota budget and cache; never expose API key.
export const LEAGUES={'ds-tr1':[130141],'ds-tr2':[195808],'ds-tr3':[616872,195818,195820,195819],'ds-cup':[285261]};
const slug=id=>Object.keys(LEAGUES).find(k=>LEAGUES[k].includes(Number(id)));
const P='tribun:ds:live:v1:';
export const day=()=>new Date().toISOString().slice(0,10);
export const valid=x=>/^[1-9]\d{0,11}$/.test(String(x));
export const teamId=x=>'990000'+x;
async function kv(...cmd){const r=await fetch(process.env.KV_REST_API_URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.KV_REST_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(5000)});const j=await r.json();if(!r.ok||j.error)throw Error('cache');return j.result}
const parse=x=>{try{return JSON.parse(x)}catch{return null}};
const lua="local d=tonumber(redis.call('GET',KEYS[1]) or '0'); local m=tonumber(redis.call('GET',KEYS[2]) or '0'); if d>=80 or m>=8 or (ARGV[1]=='ui' and d>=35) then return 0 end; redis.call('INCR',KEYS[1]);redis.call('EXPIRE',KEYS[1],90000);redis.call('INCR',KEYS[2]);redis.call('EXPIRE',KEYS[2],90);return 1";
export async function cached(path,ttl,transform=x=>x,{priority=false,fresh=false,version=''}={}){
 const key=P+version+path,old=parse(await kv('GET',key));
 if(old&&Date.now()-old.at<ttl*1000)return old.data;
 if(!await kv('SET',key+':lock','1','NX','EX',20)){if(old&&!fresh)return old.data;throw Error('busy')}
 try{
 if(!await kv('EVAL',lua,2,P+'daily:'+day(),P+'minute:'+Math.floor(Date.now()/60000),priority?'push':'ui'))throw Error('budget');
 const r=await fetch('https://api.datasportsapi.com/v2/'+path,{headers:{Authorization:'Bearer '+process.env.DATASPORTS_API_KEY,accept:'application/json'},signal:AbortSignal.timeout(9000),redirect:'error'});const j=await r.json();
 if(!r.ok||j.data===undefined)throw Error(r.status===429?'budget':r.status===403?'restricted':r.status===404?'no_data':'upstream');
 const data=transform(j.data);await kv('SET',key,JSON.stringify({at:Date.now(),data}),'EX',Math.max(ttl*2,86400));return data;
 }catch(e){if(old&&!fresh)return old.data;throw e}
}
export const num=x=>x==null||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const safeTeam=t=>({id:teamId(t.id),nm:String(t.shortName||t.name||''),ab:String(t.code||''),logo:t.image||'',color:null,form:'',rec:'',ls:[],red:0});
export const person=x=>typeof x?.name==='string'?x.name:typeof x?.displayName==='string'?x.displayName:null;
export function fixture(x,allowSuper=false){
 const lg=slug(x.league?.id)||(allowSuper&&Number(x.league?.id)===172801?'tur.1':null);
 if(!lg||!valid(x.id)||!valid(x.home?.id)||!valid(x.away?.id)||!Number.isFinite(Date.parse(x.startTime)))return null;
 const type=x.status?.type,phase=x.status?.phase,active=type==='inprogress',final=type==='finished',pre=type==='notstarted'||type==='scheduled';
 const state=active?'in':pre?'pre':'post';
 const h={...safeTeam(x.home),sc:x.homeScore?.current??'',red:x.homeScore?.redCards??null},a={...safeTeam(x.away),sc:x.awayScore?.current??'',red:x.awayScore?.redCards??null};
 return {id:'ds'+x.id,rawId:String(x.id),lg,date:x.startTime,state,short:active?/half.?time|^break$/i.test(String(phase))?'HT':x.status?.description||'Canlı':final?'FT':pre?'Scheduled':x.status?.description||'Durum belirsiz',clock:active?String(x.clock?.display||x.clock?.displayValue||''):'',h,a,venue:x.venue?.name||'',city:x.venue?.city?.name||x.venue?.city||'',det:[],ht:'',referee:person(x.referee),refereeId:valid(x.referee?.id)?String(x.referee.id):null,coaches:[{team:h.nm,name:person(x.homeManager)},{team:a.nm,name:person(x.awayManager)}].filter(x=>x.name),attendance:x.attendance??null,lineup:x.lineupsConfirmed===true,varActive:x.varCheck!=null&&typeof x.varCheck==='object',finalResultOnly:x.finalResultOnly===true,season:x.season?.id,group:x.group||x.stage||'',final,rawHome:x.home?.name,rawAway:x.away?.name};
}
export async function fixtures(date,ttl,priority=false){return cached('fixtures?sport=football&country=TR&date='+date,ttl??(date===day()?1200:21600),x=>x.map(v=>fixture(v,true)).filter(Boolean),{version:'f2:',priority,fresh:priority})}

const FOREIGN={
 'tur.1':['Turkey|Türkiye','trendyolsuperlig|superlig'],
 'eng.1':['England','premierleague'],'eng.2':['England','championship|eflchampionship'],
 'esp.1':['Spain','laliga|laligaeasports|primeradivision'],
 'ita.1':['Italy','seriea|serieaenilive'],'ger.1':['Germany','bundesliga'],
 'fra.1':['France','ligue1|ligue1mcdonalds'],'por.1':['Portugal','ligaportugal|ligaportugalbetclic|primeiraliga'],
 'ned.1':['Netherlands','eredivisie|vriendenloterijeredivisie'],'bel.1':['Belgium','proleague|jupilerproleague|firstdivisiona'],
 'sco.1':['Scotland','premiership|scottishpremiership|williamhillpremiership'],
 'ksa.1':['Saudi Arabia','saudiproleague|roshnsaudileague|saudiprofessionalleague'],
 'usa.1':['USA|United States','mls|majorleaguesoccer'],
 'bra.1':['Brazil','brasileiraoseriea|brasileiraobetanoseriea|seriea'],
 'arg.1':['Argentina','ligaprofesional|ligaprofesionaldefutbol|primeradivision|torneobetano'],
 'uefa.champions':['Europe','uefachampionsleague|championsleague'],
 'uefa.europa':['Europe','uefaeuropaleague|europaleague'],
 'uefa.europa.conf':['Europe','uefaconferenceleague|uefaeuropaconferenceleague|conferenceleague'],
 'conmebol.libertadores':['South America','conmebollibertadores|copalibertadores|libertadores']
};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]/g,'');
const aliases=t=>[t?.name,t?.displayName,t?.shortDisplayName,t?.shortName,t?.abbreviation].filter(Boolean).map(norm).filter(x=>x.length>=4);
export function chooseForeign(rows,lg,c){
 const rule=FOREIGN[lg];if(!rule)return null;
 const h=c.competitors?.find(x=>x.homeAway==='home')?.team,a=c.competitors?.find(x=>x.homeAway==='away')?.team;
 const agrees=(a,b)=>aliases(a).some(n=>aliases(b).includes(n));
 const matches=rows.filter(x=>[x.league?.name,x.league?.slug].some(n=>new RegExp('^(?:'+rule[1]+')$').test(norm(n)))&&Math.abs(Date.parse(x.startTime)-Date.parse(c.date))<=1800000&&agrees(h,x.home)&&agrees(a,x.away)&&valid(x.id));
 return matches.length===1?matches[0]:null;
}
export async function foreignOfficials(lg,id){
 if(!Object.hasOwn(FOREIGN,lg)||!valid(id))throw Error('no_data');
 const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/'+lg+'/summary?event='+id,{signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('upstream');const j=await r.json(),c=j.header?.competitions?.[0];if(!c||!Number.isFinite(Date.parse(c.date)))throw Error('no_data');
 const d=new Date(c.date).toISOString().slice(0,10);
 if(Math.abs(Date.parse(d)-Date.parse(day()))>7*86400000)throw Error('no_data');
 let hit=null;
 if(lg==='eng.1'||lg==='uefa.champions'){
  try{hit=chooseForeign(await cached('fixtures?league='+(lg==='eng.1'?195828:195900)+'&date='+d,21600),lg,c)}catch(e){if(e.message==='budget')throw e}
 }
 if(!hit){
  let rows;
  if(lg==='tur.1')rows=await cached('fixtures?sport=football&country=TR&date='+d,21600,undefined,{version:'officials:'});
  else{
   const cats=await cached('categories?sport=football',86400);
   const cat=cats.find(x=>FOREIGN[lg][0].split('|').some(n=>norm(n)===norm(x.name)));
   if(!valid(cat?.id))throw Error('no_data');
   rows=await cached('fixtures?category='+cat.id+'&date='+d,21600);
  }
  hit=chooseForeign(rows,lg,c);
 }
 if(!hit)return {matched:false,referee:null,coaches:[]};
 const x=await cached('fixtures/'+hit.id,3600);
 return {matched:true,referee:person(x.referee),refereeId:valid(x.referee?.id)?String(x.referee.id):null,coaches:[{team:c.competitors.find(y=>y.homeAway==='home')?.team?.displayName||hit.home.name,name:person(x.homeManager)},{team:c.competitors.find(y=>y.homeAway==='away')?.team?.displayName||hit.away.name,name:person(x.awayManager)}].filter(y=>y.name),source:'DataSportsAPI'};
}
export const DS_LEAGUES=['ds-tr1','ds-tr2','ds-tr3','ds-cup'];
export function dsPushEvent(e){
 if(!DS_LEAGUES.includes(e.lg)||!['pre','in','post'].includes(e.state)||e.state==='post'&&!e.final)return null;
 const home=e.state==='pre'?0:num(e.h.sc),away=e.state==='pre'?0:num(e.a.sc);
 if(home===null||away===null||home<0||away<0||home>50||away>50)return null;
 const reds=e.h.red!=null&&e.a.red!=null?['h','a'].flatMap(k=>Array.from({length:Math.min(15,Math.max(0,Number(e[k].red)||0))},(_,i)=>({key:e[k].id+':'+(i+1),team:e[k].id,name:'',minute:''}))):null;
 return {id:e.id,lg:e.lg,state:e.state,home,away,half:e.short==='HT',final:e.final,reds,kickoff:Date.parse(e.date),hid:e.h.id,aid:e.a.id,hn:e.h.nm,an:e.a.nm,lineup:e.lineup===true,varActive:e.varActive===true,finalResultOnly:e.finalResultOnly===true};
}
export function dsDelay(events,subs,now,follows){
 let delay=60*60000;
 for(const e of events){if(!subs.some(s=>follows(s,e)))continue;
 if(e.state==='in'&&!e.finalResultOnly)return 3*60000;
 if(e.state==='pre'){
  const until=e.kickoff-now;
  if(until<=20*60000&&until>=-30*60000)return 3*60000;
  if(until<=90*60000&&until>0)delay=Math.min(delay,10*60000);
  else if(until>0)delay=Math.min(delay,Math.max(3*60000,until-90*60000));
 }
 }return delay;
}
