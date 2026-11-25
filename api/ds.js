import {LEAGUES,valid,teamId,day,cached,num,fixture,fixtures,foreignOfficials} from '../lib/ds-data.js';
async function groups(lg){
 const out=[];
 // Parent league is authoritative when it has a current-season table; fall back to its known group competitions.
 for(const id of LEAGUES[lg]){
  try{
  const s=await cached('leagues/'+id+'/seasons',86400);
  const y=new Date(),year=y.getUTCMonth()>=6?y.getUTCFullYear():y.getUTCFullYear()-1;
  const season=s.find(x=>x.startYear===year&&x.endYear===year+1);
  if(!season||!valid(season.id))continue;
  const raw=await cached('leagues/'+id+'/standings?season='+season.id+'&group=all',21600);
  for(const g of raw){const rows=(g.rows||[]).map(r=>{
   if(!valid(r.team?.id))return null;
   const vals=[r.position,r.played??r.matchesPlayed,r.wins,r.draws??r.ties,r.losses,r.scoreDifference??r.goalDifference??(num(r.scoresFor)!=null&&num(r.scoresAgainst)!=null?num(r.scoresFor)-num(r.scoresAgainst):null),r.points].map(num);
   if(vals.some(x=>x===null))return null;
   const [rank,p,w,d,l,gd,pts]=vals;return {id:teamId(r.team.id),nm:r.team.name,logo:r.team.image,rank,p,w,d,l,gd,pts};
  }).filter(Boolean);if(rows.length)out.push({name:g.name||g.group||'Grup',source:'DataSportsAPI',season:season.year,rows});}
  if(out.length&&id===616872&&out.length>=4)break;
  }catch(e){if(e.message==='budget'&&!out.length)throw e}
 }
 const seen=new Set();return out.filter(g=>{const key=g.rows.map(r=>r.id).sort().join(',');if(seen.has(key))return false;seen.add(key);return true});
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=60');
 if(req.method!=='GET')return res.status(405).end();
 if(!process.env.DATASPORTS_API_KEY)return res.status(503).json({error:'not_configured'});
 const a=String(req.query.action||''),lg=String(req.query.league||''),id=String(req.query.id||'');
 try{
 if(a==='officials'&&valid(id)){return res.json(await foreignOfficials(lg,id))}
 if(a==='day'){
 const d=String(req.query.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||Math.abs(Date.parse(d)-Date.parse(day()))>7*86400000)return res.status(400).json({error:'date'});
 const events=await fixtures(d);return res.json({events:events.filter(e=>e.lg!=='tur.1'),super:events.filter(e=>e.lg==='tur.1'),refreshMinutes:20});
 }
 if(a==='stand'&&Object.hasOwn(LEAGUES,lg)&&lg!=='ds-cup'){return res.json({groups:await groups(lg)})}
 if(a==='match'&&/^ds[1-9]\d{0,11}$/.test(id)){
 const x=await cached('fixtures/'+id.slice(2),3600);const e=fixture(x,true);if(!e)return res.status(404).json({error:'unsupported'});return res.json({event:e});
 }
 if(a==='team'&&/^990000[1-9]\d{0,11}$/.test(id)&&Object.hasOwn(LEAGUES,lg)){
 const n=id.slice(6);const [a,b]=await Promise.all([cached('teams/'+n+'/fixtures?type=recent',21600,x=>x.map(v=>fixture(v)).filter(Boolean)),cached('teams/'+n+'/fixtures?type=upcoming',21600,x=>x.map(v=>fixture(v)).filter(Boolean))]);const ev=[...a,...b],t=ev.flatMap(e=>[e.h,e.a]).find(t=>t.id===id);if(!t)return res.status(404).json({error:'no_data'});return res.json({events:ev,team:t});
 }
 return res.status(400).json({error:'bad_request'});
 }catch(e){return res.status(e.message==='budget'?429:e.message==='restricted'?422:e.message==='no_data'?404:503).json({error:['budget','restricted','no_data','busy'].includes(e.message)?e.message:'upstream'})}
}