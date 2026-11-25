const liveLeagues=['tur.1','eng.1','eng.2','esp.1','ita.1','ger.1','fra.1','por.1','ned.1','sco.1','ds-tr1','ds-tr2','ds-tr3'];
function projectStandings(groups,matchKeys,events){
 if(!Array.isArray(groups)||!Array.isArray(matchKeys)||!matchKeys.length)return null;
 const ids=new Set(groups.flatMap(g=>g.rows.map(r=>String(r.id))));
 const included=events.filter(e=>ids.has(String(e.h?.id))||ids.has(String(e.a?.id)));
 if(included.some(e=>e.state==='in'&&!matchKeys.includes(e.id)))return null;
 const relevant=included.filter(e=>matchKeys.includes(e.id)&&['in','post'].includes(e.state));
 if(!relevant.length)return null;
 const scores=e=>[e.h.sc,e.a.sc].every(s=>s!==''&&s!=null&&/^\d{1,2}$/.test(String(s)));
 if(relevant.some(e=>!scores(e)||e.state==='post'&&!/^(FT|AET|Final|MS|Full Time|After Extra Time)$/i.test(e.short||'')||!groups.some(g=>g.rows.some(r=>String(r.id)===String(e.h.id))&&g.rows.some(r=>String(r.id)===String(e.a.id)))))return null;
 return groups.map(g=>{const rows=g.rows.map(r=>({...r}));const used=new Set();for(const e of relevant){if(used.has(e.id))continue;const h=rows.find(r=>String(r.id)===String(e.h.id)),a=rows.find(r=>String(r.id)===String(e.a.id));if(!h||!a)continue;used.add(e.id);const x=+e.h.sc,y=+e.a.sc;h.p++;a.p++;h.gd+=x-y;a.gd+=y-x;if(x>y){h.w++;a.l++;h.pts+=3}else if(x<y){a.w++;h.l++;a.pts+=3}else{h.d++;a.d++;h.pts++;a.pts++}h.projected=true;a.projected=true}rows.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||a.rank-b.rank);return {...g,rows}})
}

window.TribunProjection={liveLeagues,projectStandings};
