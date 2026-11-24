// Vercel sunucusuz fonksiyonu: ESPN'in ücretsiz, anahtarsız JSON uçlarına güvenli vekil.
// Yalnızca futbol/basketbol scoreboard, standings, summary ve takım fikstür/kadro yollarına izin verir.
export default async function handler(req, res) {
  const p = String(req.query.p || '');
  const ok = /^(site\/v2|v2)\/sports\/(soccer|basketball)\/[a-z0-9._-]+\/(scoreboard|standings|summary|teams\/\d+\/(?:schedule|roster))(\?[a-z]+=[\w,-]+(&[a-z]+=[\w,-]+)*)?$/.test(p);
  if (!ok) return res.status(400).json({ error: 'bad path' });
  try {
    const r = await fetch('https://site.api.espn.com/apis/' + p, { headers: { accept: 'application/json' } });
    const body = await r.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: 'upstream' });
  }
}
