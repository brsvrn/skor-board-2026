// Avrupa basketbol ligleri: API-Basketball (api-sports.io) ücretsiz plan + EuroLeague'in kendi verisi.
// Anahtar Vercel ortam değişkeninde durur (APISPORTS_KEY); tarayıcıya hiç gitmez.
const LEAGUES = {
  'as-tr': { country: 'Turkey', re: /s[uü]per lig/i },
  'as-el': { country: 'Europe', re: /^euroleague$/i },
  'as-ec': { country: 'Europe', re: /^eurocup$/i },
  'as-bcl': { country: 'Europe', re: /^champions league$/i },
  'as-es': { country: 'Spain', re: /acb/i },
  'as-it': { country: 'Italy', re: /lega a|serie a/i },
  'as-de': { country: 'Germany', re: /^bbl$/i },
  'as-fr': { country: 'France', re: /lnb|pro a|elite/i },
  'as-gr': { country: 'Greece', re: /a1|basket league/i },
};
const WOMEN = /women|w$|kad[ıi]n|femen|female/i;
const BASE = 'https://v1.basketball.api-sports.io/';

function slugOf(league, country) {
  const c = (country && country.name) || '';
  const n = (league && league.name) || '';
  if (WOMEN.test(n)) return null;
  for (const [slug, d] of Object.entries(LEAGUES)) if (d.country === c && d.re.test(n)) return slug;
  return null;
}
const STATE = s => (['NS', 'TBD'].includes(s) ? 'pre' : ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'BT', 'HT'].includes(s) ? 'in' : 'post');
const side = (t, sc) => ({
  id: String((t && t.id) || ''), nm: (t && t.name) || '', ab: ((t && t.name) || '').slice(0, 3).toUpperCase(), logo: (t && t.logo) || '',
  sc: sc && sc.total != null ? String(sc.total) : '',
  ls: sc ? [sc.quarter_1, sc.quarter_2, sc.quarter_3, sc.quarter_4, sc.over_time].filter(v => v != null) : [],
});

// EuroLeague ve EuroCup: ligin kendi ücretsiz, anahtarsız verisi (api-live.euroleague.net).
const EL = 'https://api-live.euroleague.net/';
const COMP = { 'as-el': 'E', 'as-ec': 'U' };
const seasonYear = () => { const d = new Date(); return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; };
async function elGet(path) {
  const r = await fetch(EL + path, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('el ' + r.status);
  return r.json();
}
const istDate = ms => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10);
function elGame(g, lg) {
  const t = Date.parse(g.utcDate), now = Date.now();
  const tot = (+((g.local || {}).score) || 0) + (+((g.road || {}).score) || 0);
  const state = g.played ? 'post' : now >= t && now - t < 4 * 3600e3 ? 'in' : now - t >= 4 * 3600e3 && tot > 0 ? 'post' : 'pre';
  const parts = x => { const p = (x && x.partials) || {}; return [p.partials1, p.partials2, p.partials3, p.partials4, ...Object.values(p.extraPeriods || {})].filter(v => v != null); };
  const sd = x => { const c = (x && x.club) || {}; return { id: c.code || '', nm: c.abbreviatedName || c.editorialName || c.name || '', ab: c.tvCode || c.code || '', logo: (c.images || {}).crest || '',
    sc: state === 'pre' ? '' : String((x && x.score) ?? ''), ls: state === 'pre' ? [] : parts(x) }; };
  return { verifiedFinal:g.played===true,verifiedLive:g.played!==true&&now>=t&&tot>0&&now-t<4*3600e3,id: 'el' + String(g.identifier || g.gameCode).replace(/[^a-z0-9]/gi, '').toLowerCase(), lg, date: t, state, clock: '', short: state === 'post' ? 'FT' : state === 'in' ? 'Canlı' : 'NS',
    h: sd(g.local), a: sd(g.road), venue: (g.venue || {}).name || '' };
}
export async function elDay(date) {
  const dateObj=new Date(date+'T12:00:00Z');
  const y=dateObj.getUTCMonth()>=6?dateObj.getUTCFullYear():dateObj.getUTCFullYear()-1, events = [], ok = [];
  await Promise.all(Object.entries(COMP).map(async ([lg, c]) => {
    try {
      const j = await elGet(`v2/competitions/${c}/seasons/${c}${y}/games`);
      ok.push(lg);
      for (const g of j.data || []) if (g.utcDate && istDate(Date.parse(g.utcDate)) === date) events.push(elGame(g, lg));
    } catch (e) {}
  }));
  return { events, ok };
}
async function elStand(slug) {
  const c = COMP[slug], y = seasonYear();
  const rj = await elGet(`v2/competitions/${c}/seasons/${c}${y}/rounds`);
  const now = istDate(Date.now());
  const done = (rj.data || []).filter(r => String(r.minGameStartDate || '').slice(0, 10) <= now).map(r => r.round);
  if (!done.length) return [];
  const sj = await elGet(`v3/competitions/${c}/seasons/${c}${y}/rounds/${Math.max(...done)}/basicstandings`);
  const row = t => { const cl = t.club || {}; const pf = +t.pointsFor || 0, pa = +t.pointsAgainst || 0;
    return { code: cl.code || '', nm: cl.abbreviatedName || cl.editorialName || cl.name || '', logo: (cl.images || {}).crest || '', rank: t.position, w: t.gamesWon || 0, l: t.gamesLost || 0,
      pct: t.winPercentage != null ? String(t.winPercentage) : '', gd: t.pointsDifference != null ? +t.pointsDifference : pf - pa, chg: t.positionChange === 'Up' ? 1 : t.positionChange === 'Down' ? -1 : 0 }; };
  if (Array.isArray(sj.groups) && sj.groups.length) return sj.groups.map(g => ({ name: g.name || g.groupName || '', rows: (g.teams || []).map(row) })).filter(g => g.rows.length);
  const rows = (sj.teams || []).map(row);
  if (!rows.length) return [];
  // EuroCup gibi gruplu sezonlarda tabloyu maçlardaki grup bilgisine göre böl.
  try {
    const gj = await elGet(`v2/competitions/${c}/seasons/${c}${y}/games`);
    const grp = {};
    for (const g of gj.data || []) {
      const n = (g.group || {}).name || '';
      if (!/group [a-z]$/i.test(n)) continue;
      for (const sd of [g.local, g.road]) { const k = ((sd || {}).club || {}).code; if (k) grp[k] = n.replace(/^group/i, 'Grup'); }
    }
    const names = [...new Set(rows.map(r => grp[r.code]).filter(Boolean))].sort();
    if (names.length > 1) return names.map(n => ({ name: n, rows: rows.filter(r => grp[r.code] === n).map((r, i) => Object.assign({}, r, { rank: i + 1 })) }));
  } catch (e) {}
  return [{ name: c === 'E' ? 'EuroLeague' : 'EuroCup', rows }];
}


function elHeader(e){
 const team=(t,k)=>({homeAway:k,score:t.sc,team:{id:t.id,displayName:t.nm,shortDisplayName:t.nm,abbreviation:t.ab,logos:t.logo?[{href:t.logo}]:[]},linescores:t.ls.map(v=>({value:v,displayValue:String(v)}))});
 return {competitions:[{date:new Date(e.date).toISOString(),status:{type:{state:e.state,shortDetail:e.short}},competitors:[team(e.h,'home'),team(e.a,'away')]}]};
}
const elCols=['MIN','PTS','REB','AST','FG','3PT','FT','STL','BLK','TO','PF','+/-'];
const minutes=v=>Number.isFinite(Number(v))?Math.floor(Number(v)/60)+':'+String(Math.floor(Number(v)%60)).padStart(2,'0'):'';
const shots=(s,m,a)=>s[m]!=null&&s[a]!=null?String(s[m])+'-'+String(s[a]):'';
function elRow(s,total=false){return [total?'':minutes(s.timePlayed),s.points,s.totalRebounds,s.assistances,shots(s,'fieldGoalsMadeTotal','fieldGoalsAttemptedTotal'),shots(s,'fieldGoalsMade3','fieldGoalsAttempted3'),shots(s,'freeThrowsMade','freeThrowsAttempted'),s.steals,s.blocksFavour,s.turnovers,s.foulsCommited,s.plusMinus].map(v=>v??'')}
function elStats(s){
 const ratio=(m,a)=>+s[a]>0?Number(s[m])/Number(s[a]):null;
 const vals={fieldGoalPct:ratio('fieldGoalsMadeTotal','fieldGoalsAttemptedTotal'),threePointFieldGoalPct:ratio('fieldGoalsMade3','fieldGoalsAttempted3'),freeThrowPct:ratio('freeThrowsMade','freeThrowsAttempted'),totalRebounds:s.totalRebounds,offensiveRebounds:s.offensiveRebounds,assists:s.assistances,steals:s.steals,blocks:s.blocksFavour,turnovers:s.turnovers,fouls:s.foulsCommited};
 return Object.entries(vals).filter(([,v])=>v!=null&&Number.isFinite(Number(v))).map(([name,v])=>({name,displayValue:String(v)}));
}
async function elDetail(lg,id){
 const m=/^el([eu])(20\d{2})(\d{1,4})$/i.exec(id),c=COMP[lg];
 if(!m||!c||m[1].toUpperCase()!==c)return null;
 const y=Number(m[2]),n=Number(m[3]);if(y<2000||y>seasonYear()+1||n<1||n>9999)return null;
 const base='v2/competitions/'+c+'/seasons/'+c+y+'/games';
 const list=await elGet(base),g=(list.data||[]).find(x=>elGame(x,lg).id===id);
 if(!g)return null;
 const e=elGame(g,lg),out={as:1,el:1,header:elHeader(e),boxscore:{players:[],teams:[],gameInfo:{venue:{fullName:e.venue}}},coaches:[],statsAvailable:false};
 if(e.state==='pre')return out;
 try{
  const j=await elGet(base+'/'+n+'/stats');
  for(const [k,t,side] of [['local',e.h,'home'],['road',e.a,'away']]){
   const x=j[k]||{},stats=x.total||{};
   const athletes=(x.players||[]).filter(p=>p.player?.person&&p.stats).map(p=>{const s=p.stats,name=p.player.person.name||p.player.person.alias||p.player.person.jerseyName||'';return {athlete:{id:p.player.person.code,displayName:name},starter:!!(s.startFive||s.startFive2),didNotPlay:Number(s.timePlayed)===0,stats:elRow(s)}});
   out.boxscore.players.push({team:{id:t.id},statistics:[{names:elCols,athletes,totals:elRow(stats,true)}]});
   out.boxscore.teams.push({team:{id:t.id},homeAway:side,statistics:elStats(stats)});
   if(x.coach?.name)out.coaches.push({team:t.nm,name:x.coach.name});
   if(athletes.length)out.statsAvailable=true;
  }
 }catch{out.statsUnavailable=true}
 return out;
}

// Official federation mobile-app data, read-only and cached.
const TBF='https://miniappapi.tbf.org.tr/webapi-service/api/';
async function tbfGet(route){
 const r=await fetch(TBF+route,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000),redirect:'error'});
 if(!r.ok)throw Error('tbf_http');
 const j=await r.json();if(j.isSuccess!==true||!Array.isArray(j.data))throw Error('tbf_data');
 return j.data;
}
async function tbfStand(){
 const y=seasonYear(),season=y+'-'+(y+1),ls=await tbfGet('League/get-leagues-and-seasons-by-prefix?prefix=bsl');
 const m=ls.filter(x=>x.sezon===season&&x.url==='bsl-'+season);
 if(m.length!==1||!Number.isInteger(+m[0].sezon_ID)||!Number.isInteger(+m[0].faaliyet_ID))throw Error('tbf_season');
 const aid=+m[0].faaliyet_ID,raw=await tbfGet('League/get-standings-table?seasonId='+m[0].sezon_ID+'&leagueId='+aid);
 const groups=raw.map(g=>{
  if(!Array.isArray(g.standings))throw Error('tbf_rows');
  const rows=g.standings.map(s=>{
   const [rank,p,w,l,forPts,againstPts,pts]=['sira','o','g','m','a','y','puan'].map(k=>s[k]==null||s[k]===''?NaN:Number(s[k]));
   if(+s.faaliyetAltAlanId!==aid||typeof s.takimAdi!=='string'||![rank,p,w,l,forPts,againstPts,pts].every(Number.isFinite)||rank<1||p<0||w<0||l<0||w+l!==p)throw Error('tbf_scope');
   const logo=typeof s.teamLogo==='string'&&/^https:\/\/(?:www\.)?tbf\.org\.tr\//i.test(s.teamLogo)?s.teamLogo:'';
   return {id:String(s.takimIslemId),nm:s.takimAdi,logo,rank,p,w,l,pct:p?(100*w/p).toFixed(1)+'%':'-',gd:forPts-againstPts,pts};
  }).sort((a,b)=>a.rank-b.rank);
  return {name:g.grup||'Basketbol Süper Ligi',rows,week:g.standings[0]?.hafta||null,source:'TBF',season};
 }).filter(g=>g.rows.length);
 if(!groups.length)throw Error('tbf_empty');return groups;
}

async function call(path, key) {
  const r = await fetch(BASE + path, { headers: { 'x-apisports-key': key } });
  if (!r.ok) throw new Error('upstream ' + r.status);
  const j = await r.json();
  const er = j && j.errors;
  if (er && (Array.isArray(er) ? er.length : Object.keys(er).length)) {
    const msg=Object.values(er).join(' | '),e=new Error(msg);
    e.code=/free plan|subscription plan|not (?:available|accessible|included) (?:with|in|for|on) (?:your|the) (?:free |current )?plan|upgrade (?:your |the )?plan/i.test(msg)?'plan_limit':'upstream';
    throw e;
  }
  return j;
}

export default async function handler(req, res) {
  const key = process.env.APISPORTS_KEY;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (req.query.status) {
      if (!key) return res.status(503).json({ error: 'nokey' });
      const r = await fetch(BASE + 'status', { headers: { 'x-apisports-key': key } });
      const j = await r.json();
      const rs = j.response || {};
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ errors: j.errors, plan: (rs.subscription || {}).plan, active: (rs.subscription || {}).active, requests: rs.requests });
    }
    if(req.query.match){
      const lg=String(req.query.league||''),id=String(req.query.match||'');
      if(!COMP[lg]||!/^el[eu]20\d{2}\d{1,4}$/.test(id))return res.status(400).json({error:'bad_match'});
      const out=await elDetail(lg,id);
      if(!out)return res.status(404).json({error:'not_found'});
      res.setHeader('Cache-Control',out.header.competitions[0].status.type.state==='post'?'s-maxage=900, stale-while-revalidate=3600':'s-maxage=30, stale-while-revalidate=60');
      return res.status(200).json(out);
    }
    if (req.query.standings) {
      const slug = String(req.query.standings);
      const d = LEAGUES[slug];
      if (!d) return res.status(400).json({ error: 'bad league' });
      if(slug==='as-tr'){
        const groups=await tbfStand().catch(()=>null);
        if(groups){res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');return res.status(200).json({groups,source:'TBF'});}
      }
      if (COMP[slug]) {
        const groups = await elStand(slug).catch(() => []);
        if (groups.length) { res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600'); return res.status(200).json({ groups }); }
      }
      if (!key) { res.setHeader('Cache-Control', 's-maxage=300'); return res.status(503).json({ error: 'nokey' }); }
      const lj = await call('leagues?country=' + encodeURIComponent(d.country), key);
      const lg = (lj.response || []).find(l => d.re.test(l.name || '') && !WOMEN.test(l.name || ''));
      if (!lg) { res.setHeader('Cache-Control', 's-maxage=43200'); return res.status(200).json({ groups: [] }); }
      const ss = (lg.seasons || []).find(s => s.current) || (lg.seasons || []).slice(-1)[0] || {};
      if(ss.coverage?.standings===false)return res.status(200).json({groups:[],reason:'not_covered'});
      const sj = await call(`standings?league=${lg.id}&season=${encodeURIComponent(ss.season)}`, key);
      const groups = (sj.response || []).map(g => ({
        name: ((g[0] || {}).group || {}).name || lg.name,
        rows: g.map(r => ({ nm: (r.team || {}).name || '', logo: (r.team || {}).logo || '', rank: r.position, w: ((r.games || {}).win || {}).total || 0, l: ((r.games || {}).lose || {}).total || 0,
          pct: ((r.games || {}).win || {}).percentage || '', gd: ((r.points || {}).for || 0) - ((r.points || {}).against || 0) })),
      }));
      res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=3600');
      return res.status(200).json({ groups, reason:groups.length?null:'no_data' });
    }
    const date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'bad date' });
    const today = istDate(Date.now());
    const dd = (Date.parse(date) - Date.parse(today)) / 864e5;
    const limited=dd < -1 || dd > 1;
    let asError='';
    const [el, as] = await Promise.all([
      elDay(date),
      key && !limited ? call(`games?date=${date}&timezone=Europe/Istanbul`, key).catch(e => {asError=e.code||'upstream';return null}) : Promise.resolve(null),
    ]);
    if (!key && !el.ok.length) { res.setHeader('Cache-Control', 's-maxage=300'); return res.status(503).json({ error: 'nokey' }); }
    const events = [];
    for (const g of (as && as.response) || []) {
      const lg = slugOf(g.league, g.country);
      if (!lg || (COMP[lg] && el.ok.includes(lg))) continue;
      const st = (g.status || {}).short || 'NS';
      events.push({ id: 'as' + g.id, lg, date: (g.timestamp || 0) * 1000, state: STATE(st), clock: (g.status || {}).timer || '', short: st,
        h: side((g.teams || {}).home, (g.scores || {}).home), a: side((g.teams || {}).away, (g.scores || {}).away), venue: '' });
    }
    const have = new Set(events.map(e => e.lg));
    for (const e of el.events) if (!have.has(e.lg)) events.push(e);
    const live = events.some(e => e.state === 'in');
    const ttl = live ? 60 : date === today ? 600 : date < today ? 21600 : 3600;
    res.setHeader('Cache-Control', `s-maxage=${ttl}, stale-while-revalidate=300`);
    return res.status(200).json({ events, coverage:{otherEuropean:limited||asError==='plan_limit'?'plan_limit':!key?'nokey':asError?'upstream':'ok',euroleague:el.ok} });
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=120');
    return res.status(e.code==='plan_limit'?422:502).json({ error: e.code==='plan_limit'?'plan_limit':'upstream' });
  }
}
