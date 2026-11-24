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
  return { id: 'el' + String(g.identifier || g.gameCode).replace(/[^a-z0-9]/gi, '').toLowerCase(), lg, date: t, state, clock: '', short: state === 'post' ? 'FT' : state === 'in' ? 'Canlı' : 'NS',
    h: sd(g.local), a: sd(g.road), venue: (g.venue || {}).name || '' };
}
async function elDay(date) {
  const y = seasonYear(), events = [], ok = [];
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
    if (req.query.standings) {
      const slug = String(req.query.standings);
      const d = LEAGUES[slug];
      if (!d) return res.status(400).json({ error: 'bad league' });
      if (COMP[slug]) {
        const groups = await elStand(slug).catch(() => []);
        if (groups.length) { res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600'); return res.status(200).json({ groups }); }
      }
      if (!key) { res.setHeader('Cache-Control', 's-maxage=300'); return res.status(503).json({ error: 'nokey' }); }
      const lj = await call('leagues?country=' + encodeURIComponent(d.country), key);
      const lg = (lj.response || []).find(l => d.re.test(l.name || '') && !WOMEN.test(l.name || ''));
      if (!lg) { res.setHeader('Cache-Control', 's-maxage=43200'); return res.status(200).json({ groups: [] }); }
      const ss = (lg.seasons || []).find(s => s.current) || (lg.seasons || []).slice(-1)[0] || {};
      const sj = await call(`standings?league=${lg.id}&season=${encodeURIComponent(ss.season)}`, key);
      const groups = (sj.response || []).map(g => ({
        name: ((g[0] || {}).group || {}).name || lg.name,
        rows: g.map(r => ({ nm: (r.team || {}).name || '', logo: (r.team || {}).logo || '', rank: r.position, w: ((r.games || {}).win || {}).total || 0, l: ((r.games || {}).lose || {}).total || 0,
          pct: ((r.games || {}).win || {}).percentage || '', gd: ((r.points || {}).for || 0) - ((r.points || {}).against || 0) })),
      }));
      res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=3600');
      return res.status(200).json({ groups });
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
      if (!lg) continue;
      const st = (g.status || {}).short || 'NS';
      events.push({ id: 'as' + g.id, lg, date: (g.timestamp || 0) * 1000, state: STATE(st), clock: (g.status || {}).timer || '', short: st,
        h: side((g.teams || {}).home, (g.scores || {}).home), a: side((g.teams || {}).away, (g.scores || {}).away), venue: '' });
    }
    const have = new Set(events.map(e => e.lg));
    for (const e of el.events) if (!have.has(e.lg)) events.push(e);
    const live = events.some(e => e.state === 'in');
    const ttl = live ? 60 : date === today ? 600 : date < today ? 21600 : 3600;
    res.setHeader('Cache-Control', `s-maxage=${ttl}, stale-while-revalidate=300`);
    return res.status(200).json({ events, coverage:{otherEuropean:!key?'nokey':limited||asError==='plan_limit'?'plan_limit':asError?'upstream':'ok',euroleague:el.ok} });
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=120');
    return res.status(e.code==='plan_limit'?422:502).json({ error: e.code==='plan_limit'?'plan_limit':'upstream' });
  }
}
