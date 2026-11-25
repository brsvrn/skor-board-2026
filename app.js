// Tribün — futbol ve basketbol canlı skor uygulaması
{
const LEAGUES=[
 ['tur.1','Süper Lig','#e30a17','soccer'],['uefa.champions','Şampiyonlar Ligi','#0b2a6f','soccer'],['uefa.europa','Avrupa Ligi','#f26522','soccer'],['uefa.europa.conf','Konferans Ligi','#1f9d55','soccer'],
 ['eng.1','Premier Lig','#3d195b','soccer'],['esp.1','La Liga','#ee2523','soccer'],['ita.1','Serie A','#024494','soccer'],['ger.1','Bundesliga','#d20515','soccer'],['fra.1','Ligue 1','#091c3e','soccer'],
 ['por.1','Portekiz Ligi','#006600','soccer'],['ned.1','Eredivisie','#ff6200','soccer'],['bel.1','Belçika Ligi','#c8102e','soccer'],['sco.1','İskoçya Ligi','#005eb8','soccer'],['eng.2','Championship','#1c2a5c','soccer'],
 ['ksa.1','Suudi Pro Lig','#0e7c3a','soccer'],['usa.1','MLS','#001f5b','soccer'],['bra.1','Brezilya Serie A','#009c3b','soccer'],['arg.1','Arjantin Ligi','#2b7bc0','soccer'],['conmebol.libertadores','Libertadores','#b8860b','soccer'],
 ['nba','NBA','#1d428a','basketball'],['as-tr','Türkiye Süper Ligi','#e30a17','basketball','as'],['as-el','EuroLeague','#f05a28','basketball','as'],['as-ec','EuroCup','#0a5ea8','basketball','as'],['as-bcl','Şampiyonlar Ligi','#1b2a5e','basketball','as'],
 ['as-es','İspanya ACB','#c8102e','basketball','as'],['as-it','İtalya Lega A','#0b6e3c','basketball','as'],['as-de','Almanya BBL','#111111','basketball','as'],['as-fr','Fransa LNB','#002395','basketball','as'],['as-gr','Yunanistan Ligi','#0d5eaf','basketball','as'],
 ['mens-college-basketball','NCAA Erkekler','#003087','basketball'],['wnba','WNBA','#fa4d00','basketball'],['ds-tr1','Trendyol 1. Lig','#e30a17','soccer','ds'],['ds-tr2','Nesine 2. Lig','#e30a17','soccer','ds'],['ds-tr3','Nesine 3. Lig','#e30a17','soccer','ds'],['ds-cup','Türkiye Kupası','#e30a17','soccer','ds']];
const LGN=Object.fromEntries(LEAGUES.map((l,i)=>[l[0],{slug:l[0],name:l[1],color:l[2],sport:l[3],src:l[4]||'espn',i}]));
const isDS=lg=>(LGN[lg]||{}).src==='ds';
const isAS=lg=>(LGN[lg]||{}).src==='as';
const SPORTS=[['soccer','Futbol'],['basketball','Basketbol']];
const WC=[['Final','ESP','ARG',1,0,'Uzatmalarda · Ferran Torres 106\''],['Üçüncülük','ENG','FRA',6,4,'Mbappé 2 gol, Altın Ayakkabı'],['Yarı final','FRA','ESP',0,2,'Oyarzabal (P) 22\', Porro 58\''],['Yarı final','ENG','ARG',1,2,'Gordon 55\'; Enzo 85\', Lautaro 90+2\''],['Çeyrek final','FRA','MAR',2,0,''],['Çeyrek final','ESP','BEL',2,1,''],['Çeyrek final','NOR','ENG',1,2,'Uzatmalarda'],['Çeyrek final','ARG','SUI',3,1,'Uzatmalarda']];
const WCN={ESP:'İspanya',ARG:'Arjantin',FRA:'Fransa',ENG:'İngiltere',MAR:'Fas',BEL:'Belçika',NOR:'Norveç',SUI:'İsviçre'};
const SCORERS=[['Kylian Mbappé','Fransa',10],['Lionel Messi','Arjantin',8],['Jude Bellingham','İngiltere',7],['Harry Kane','İngiltere',6],['Ousmane Dembélé','Fransa',6]];
const S=(()=>{try{return JSON.parse(localStorage.getItem('tribun')||localStorage.getItem('mm2')||'null')}catch(e){return null}})()||{};
S.fm=S.fm||[];S.ft=S.ft||[];S.ftl=S.ftl||{};S.fml=S.fml||{};S.bfm=Array.isArray(S.bfm)?S.bfm:[];S.bft=Array.isArray(S.bft)?S.bft:[];S.bftn=S.bftn||{};S.sort=S.sort||'lig';S.sport=S.sport||'soccer';S.slg=S.slg&&LGN[S.slg]?S.slg:'tur.1';S.slgB=S.slgB||'nba';
const NOTICE_OPTIONS=[['goal','Gol'],['start','Maç başlangıcı'],['half','Devre arası'],['end','Maç sonu'],['red','Kırmızı kart'],['reminder','Maçtan 15 dk önce'],['lineup','İlk 11’ler'],['var','VAR olayları'],['cancel','Gol iptali / skor düzeltmesi']];
const noticeEnabled=k=>typeof S.noticePrefs?.[k]==='boolean'?S.noticePrefs[k]:k==='goal';
const basketKey=(lg,id)=>lg+':'+id;
function migrateBasket(){let changed=false;for(const id of [...S.ft])if(LGN[S.ftl[id]]?.sport==='basketball'){const k=basketKey(S.ftl[id],id);if(!S.bft.includes(k))S.bft.push(k);S.bftn[k]=S.ftn?.[id]||id;S.ft=S.ft.filter(x=>x!==id);delete S.ftl[id];if(S.ftn)delete S.ftn[id];changed=true}for(const id of [...S.fm])if(LGN[S.fml[id]]?.sport==='basketball'){const k=basketKey(S.fml[id],id);if(!S.bfm.includes(k))S.bfm.push(k);S.fm=S.fm.filter(x=>x!==id);delete S.fml[id];changed=true}return changed}
const save=()=>{try{localStorage.setItem('tribun',JSON.stringify(S))}catch(e){}window.TribunPush?.sync(S)};
let V={stab:'stand',lcat:0,tab:'home',off:0,filt:'all',match:null,team:null,ttab:'fik',dtab:'ozet',scat:'gen',kside:'home',grp:0,q:'',splash:!S.seen};
const D={lead:{},ev:[],state:'idle',at:null,timer:null,sum:{},stand:{},prev:{},tn:{},tr:new Set(),tm:{}};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const hm=d=>pad(d.getHours())+':'+pad(d.getMinutes());
const dayAt=o=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+o);return d};
const ymd=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
const GUN=['PAZ','PZT','SAL','ÇAR','PER','CUM','CMT'];
const okImg=u=>/^https:\/\/(a\.espncdn\.com|media\.api-sports\.io|media-cdn\.incrowdsports\.com|media-cdn\.cortextech\.io|cdn\.datasportsapi\.com)\//.test(String(u||''));
const crest=(logo,ab)=>`<span class="crest">${ab?`<b>${esc(String(ab).slice(0,3))}</b>`:''}${okImg(logo)?`<img src="${esc(logo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span>`;
const col=h=>{if(!/^[0-9a-f]{6}$/i.test(h||''))return null;const n=parseInt(h,16),l=(.299*(n>>16)+.587*(n>>8&255)+.114*(n&255))/255;return l>.75?null:'#'+h};
const trS=(s,lg)=>{s=String(s||'');let m;const P=lg==='mens-college-basketball'?'Y':'Ç';if(m=s.match(/^(.+) - (\d)(st|nd|rd|th)$/))return m[2]+'. '+P+' '+m[1];if(m=s.match(/^End of (\d)(st|nd|rd|th)/))return m[1]+'. '+P+' sonu';if(m=s.match(/^Q([1-4])$/))return m[1]+'. Ç';if(m=s.match(/^(.+) - (\d?)OT$/))return 'Uzt. '+m[1];return trS0(s)};
const trS0=s=>({FT:'MS',AET:'Uzt. sonu',HT:'İY',Halftime:'Devre arası',Final:'MS','Final/OT':'MS (uzt.)',Postponed:'Ertelendi',Canceled:'İptal',Scheduled:'Başlamadı',OT:'Uzatma',BT:'Ara',AOT:'MS (uzt.)',POST:'Ertelendi',CANC:'İptal',SUSP:'Durduruldu',AWD:'Hükmen',ABD:'Yarıda kaldı',NS:'Başlamadı'}[s]||s);
const RSN={'a bad foul':'sert faul nedeniyle','hand ball':'elle oynama nedeniyle','handball':'elle oynama nedeniyle','a dangerous play':'tehlikeli oyun nedeniyle','violent conduct':'şiddet içeren hareket nedeniyle','simulation':'rol yapma nedeniyle','time wasting':'zaman geçirme nedeniyle','dissent':'itiraz nedeniyle','excessive celebration':'aşırı sevinç nedeniyle','unsporting behaviour':'sportmenlik dışı davranış nedeniyle','a professional foul':'taktik faul nedeniyle','a foul':'faul nedeniyle'};
const rsn=r=>r?(RSN[r.toLowerCase()]||`(${r})`)+' ':'';
const POS=x=>{x=x.toLowerCase();const v=/bottom|low/.test(x)?'alt':/top|high/.test(x)?'üst':'';const h=/left/.test(x)?'sol':/right/.test(x)?'sağ':'';return h?`${h}${v?' '+v:''} köşe`:`kalenin ${v?v+' ':''}ortası`};
const SH=[[/ is saved in the (.+?)(?: corner| of the goal)?(?=\.|$)/,(m,p)=>' — kaleci kurtardı ('+POS(p)+')'],[/ is blocked/,' — savunmaya takıldı'],
 [/ is close, but misses (?:the )?(.+?)(?: corner)?(?=\.|$)/,(m,p)=>/^to the (left|right)$/.test(p)?` — az farkla ${p.endsWith('left')?'soldan':'sağdan'} dışarı`:' — az farkla dışarı ('+POS(p)+')'],
 [/ misses to the left/,' — soldan dışarı'],[/ misses to the right/,' — sağdan dışarı'],[/ is just a bit too high/,' — az farkla üstten dışarı'],[/ is too high/,' — üstten dışarı'],
 [/ is high and wide to the left/,' — soldan ve yüksekten dışarı'],[/ is high and wide to the right/,' — sağdan ve yüksekten dışarı'],
 [/ to the (.+?)(?: corner| of the goal)(?=\.|$)/,(m,p)=>' — '+POS(p).replace('köşe','köşeye').replace('ortası','ortasına')],
 [/right footed shot/g,'sağ ayak vuruşu'],[/left footed shot/g,'sol ayak vuruşu'],[/\bheader\b/g,'kafa vuruşu'],
 [/ from outside the box/,' ceza sahası dışından'],[/ from the centre of the box/,' ceza sahasının ortasından'],[/ from the right side of the box/,' ceza sahasının sağından'],[/ from the left side of the box/,' ceza sahasının solundan'],
 [/ from the right side of the six yard box/,' altı pasın sağından'],[/ from the left side of the six yard box/,' altı pasın solundan'],[/ from the centre of the six yard box/,' altı pasın ortasından'],[/ from very close range/,' çok yakın mesafeden'],
 [/ from a difficult angle on the right/,' sağdan dar açıdan'],[/ from a difficult angle on the left/,' soldan dar açıdan'],[/ from long range on the right/,' sağdan uzak mesafeden'],[/ from long range on the left/,' soldan uzak mesafeden'],[/ from long range/,' uzak mesafeden'],
 [/ from more than (\d+) yards/,(m,n)=>' '+Math.round(n*.9)+' metreyi aşkın mesafeden'],[/ from a direct free kick/,' direkt serbest vuruştan'],[/ from the penalty spot/,' penaltı noktasından'],[/ from a penalty/,' penaltıdan']];
const ASS=r=>{const m=r.match(/^(.*?)\. Assisted by (.+?)(?: with (a cross|a headed pass|a through ball))?(?: following (a corner|a set piece situation|a fast break))?\.?$/);if(!m)return [r,''];
 return [m[1],` Asist: ${m[2]}${m[3]?' ('+{'a cross':'ortayla','a headed pass':'kafa pasıyla','a through ball':'ara pasla'}[m[3]]+')':''}${m[4]?' — '+{'a corner':'kornerin ardından','a set piece situation':'duran top sonrası','a fast break':'hızlı hücumda'}[m[4]]:''}.`]};
function shot(r){let [b,as]=ASS(r.trim());b=b.replace(/\.$/,'');let m;
 if(m=b.match(/^(.+?) hits the (left post|right post|bar)(?: with a (.+))?$/))b=`${m[1]}${m[3]?' '+m[3]:''} — ${{'left post':'sol direğe','right post':'sağ direğe','bar':'üst direğe'}[m[2]]} çarptı`;
 for(const [re,to] of SH)b=b.replace(re,to);
 b=b.replace(/(sağ ayak vuruşu|sol ayak vuruşu|kafa vuruşu)((?: (?:ceza sahası|ceza sahasının|altı pasın|çok yakın|sağdan|soldan|uzak|\d+ metreyi|direkt|penaltı)[^—]*?))(?=\s—|$)/,(x,a,c)=>`${c.trim()} ${a}`);
 return b+'.'+as}
const CT=[[/^Lineups are announced and players are warming up\.?$/,()=>'Kadrolar açıklandı, oyuncular ısınıyor.'],
 [/^(First|Second) Half (Extra Time )?begins\.?,?\s*(.*)$/,(m,a,x,c)=>(x?`Uzatmaların ${a==='First'?'ilk':'ikinci'} yarısı başladı.`:`${a==='First'?'İlk':'İkinci'} yarı başladı.`)+(c?' '+c.replace(/\.$/,'')+'.':'')],
 [/^(First|Second) Half (Extra Time )?ends,?\s*(.*)$/,(m,a,x,c)=>(x?`Uzatmaların ${a==='First'?'ilk':'ikinci'} yarısı sona erdi.`:`${a==='First'?'İlk':'İkinci'} yarı sona erdi.`)+(c?' '+c.replace(/\.$/,'')+'.':'')],
 [/^Match ends,?\s*(.*)$/,(m,c)=>'Maç sona erdi. '+c.replace(/\.$/,'')+'.'],[/^Penalty Shootout begins\.?\s*(.*)$/,(m,c)=>'Penaltı atışları başladı.'+(c?' '+c:'')],[/^Penalty Shootout ends,?\s*(.*)$/,(m,c)=>'Penaltı atışları sona erdi. '+c],
 [/^Foul by (.+?)\.?$/,(m,p)=>`${p} faul yaptı.`],
 [/^(.+?) wins a free kick (in the defensive half|in the attacking half|on the left wing|on the right wing)\.?$/,(m,p,w)=>`${p} ${{'in the defensive half':'kendi yarı sahasında','in the attacking half':'rakip yarı sahada','on the left wing':'sol kanatta','on the right wing':'sağ kanatta'}[w]} serbest vuruş kazandı.`],
 [/^Corner,\s*(.+?)\. Conceded by (.+?)\.?$/,(m,t,p)=>`Korner, ${t}. Topu kornere gönderen: ${p}.`],
 [/^Offside,\s*(.+?)\. (.+?) tries a through ball, but (.+?) is caught offside\.?$/,(m,t,a,b)=>`Ofsayt, ${t}. ${a} ara pas denedi, ${b} ofsayta düştü.`],
 [/^Offside,\s*(.+?)\. (.+?) is caught offside\.?$/,(m,t,a)=>`Ofsayt, ${t}. ${a} ofsayta düştü.`],
 [/^Delay in match for a drinks break\.?$/,()=>'Su molası.'],[/^Delay in match because of an injury (.+?)\.?$/,(m,p)=>`${p} sakatlandı, oyun durdu.`],[/^Delay in match because of a VAR review.*$/i,()=>'VAR incelemesi nedeniyle oyun durdu.'],
 [/^Delay in match\.?$/,()=>'Oyun durdu.'],[/^Delay over\. They are ready to continue\.?$/,()=>'Oyun yeniden başlıyor.'],
 [/^Hand ?ball by (.+?)\.?$/i,(m,p)=>`${p} elle oynadı.`],[/^Dangerous play by (.+?)\.?$/,(m,p)=>`${p} tehlikeli oyun yaptı.`],
 [/^Second yellow card to (.+?)(?: for (.+?))?\.?$/,(m,p,r)=>`${p} ${rsn(r)}ikinci sarı kartı gördü ve oyundan atıldı.`],
 [/^(.+?) is shown the yellow card(?: for (.+?))?\.?$/,(m,p,r)=>`${p} ${rsn(r)}sarı kart gördü.`],[/^(.+?) is shown the red card(?: for (.+?))?\.?$/,(m,p,r)=>`${p} ${rsn(r)}kırmızı kart gördü.`],
 [/^Substitution,\s*(.+?)\. (.+?) replaces (.+?)( because of an injury)?\.?$/,(m,t,a,b,i)=>`Oyuncu değişikliği, ${t}. Giren: ${a}, çıkan: ${b}${i?' (sakatlık)':''}.`],
 [/^Own Goal by (.+?),\s*(.+?)\.\s*(.+?)\.?$/,(m,p,t,c)=>`Kendi kalesine gol! ${p} (${t}). ${c}.`],
 [/^Goal!\s*(.+?\d+,\s*.+?\d+)\.\s*(.+)$/,(m,c,r)=>`GOL! ${c}. ${shot(r)}`],
 [/^Attempt (saved|missed|blocked)\.\s*(.+)$/,(m,k,r)=>`${{saved:'İsabetli şut',missed:'İsabetsiz şut',blocked:'Şut engellendi'}[k]}. ${shot(r)}`],
 [/^(.+? hits the (?:left post|right post|bar).*)$/,(m,all)=>shot(all)],
 [/^Penalty conceded by (.+?) after a foul in the penalty area\.?$/,(m,p)=>`${p} ceza sahasında faul yaptı, penaltı.`],
 [/^Penalty (.+?)\. (.+?) draws a foul in the penalty area\.?$/,(m,t,p)=>`Penaltı, ${t}! ${p} ceza sahasında faul aldı.`],
 [/^Penalty (saved|missed)! (.+?) fails to capitalise on this great opportunity, (.+)$/,(m,k,p,r)=>`Penaltı ${k==='saved'?'kurtarıldı':'kaçtı'}! ${p} fırsatı değerlendiremedi. ${shot(r)}`],
 [/^VAR Decision: (.+?)\.?$/,(m,d)=>'VAR kararı: '+d.replace(/No Goal/i,'Gol yok').replace(/No Penalty/i,'Penaltı yok').replace(/^Goal/i,'Gol').replace(/Penalty/i,'Penaltı').replace(/Red Card/i,'Kırmızı kart').replace(/Yellow Card/i,'Sarı kart')+'.']];
const EN=/\b(the|is|by|with|from|and|shot|misses|attempt|wins|replaces|caught|corner|half|ends|begins|delay)\b/i;
function trC(t){t=String(t||'').trim();for(const [re,fn] of CT){const m=t.match(re);if(m){const o=fn(...m);if(o&&!EN.test(o.replace(/\([^)]*\)/g,'')))return o;return null}}return EN.test(t)?null:t}
const actL=()=>LEAGUES.filter(l=>l[3]===S.sport).sort((a,b)=>(isDS(a[0])?1:LGN[a[0]].i===0?0:2)-(isDS(b[0])?1:LGN[b[0]].i===0?0:2));
const isB=lg=>(LGN[lg]||{}).sport==='basketball';
async function api(path){
 for(const u of ['/api/espn?p='+encodeURIComponent(path),'https://site.api.espn.com/apis/'+path]){
  try{const r=await fetch(u,{cache:'no-store'});if(r.ok){const j=await r.json();if(j&&!j.error)return j}}catch(e){}
 }return null}
const sp=lg=>LGN[lg].sport;
function mapEv(e,lg){const c=(e.competitions||[])[0]||{};const tm=c.competitors||[];
 const side=k=>{const t=tm.find(x=>x.homeAway===k)||{};const tt=t.team||{};return{id:String(tt.id||''),ab:tt.abbreviation||'',nm:tt.shortDisplayName||tt.displayName||'',logo:tt.logo||'',color:col(tt.color),sc:t.score??'',form:t.form||'',rec:((t.records||[])[0]||{}).summary||'',ls:(t.linescores||[]).map(x=>x.displayValue??x.value),red:0}};
 const st=(e.status||{}).type||{};const h=side('home'),a=side('away');const clock=(e.status||{}).displayClock||'';
 const det=(c.details||[]).map(d=>({t:(d.type||{}).text||'',min:(d.clock||{}).displayValue||'',who:((d.athletesInvolved||[])[0]||{}).displayName||'',team:String((d.team||{}).id||''),red:!!d.redCard,goal:!!d.scoringPlay,og:!!d.ownGoal,so:!!d.shootout}));
 let ht='';
 if(!isB(lg)&&st.state!=='pre'){const mn=x=>parseInt(String(x))||0;const cnt=(flip,only1)=>{let x=0,y=0;for(const d of det){if(!d.goal||d.so||(only1&&mn(d.min)>45))continue;let t=d.team;if(flip&&d.og)t=t===h.id?a.id:h.id;if(t===h.id)x++;else if(t===a.id)y++}return[x,y]};
  const tot=cnt(false,false),fl=(+h.sc===tot[0]&&+a.sc===tot[1])?false:(()=>{const f=cnt(true,false);return +h.sc===f[0]&&+a.sc===f[1]})();
  const second=st.state==='post'||st.shortDetail==='HT'||mn(clock)>45;if(second){const f=cnt(fl,true);ht=f[0]+'-'+f[1]}
  h.red=det.filter(d=>d.red&&d.team===h.id).length;a.red=det.filter(d=>d.red&&d.team===a.id).length}
 for(const t of [h,a])if(lg==='tur.1'&&t.id)D.tr.add(t.id);
 return{id:String(e.id),lg,date:new Date(e.date),state:st.state||'pre',clock,short:st.shortDetail||'',h,a,venue:(c.venue||{}).fullName||'',det,ht}}
async function loadTR(){const j=await api('v2/sports/soccer/tur.1/standings');for(const g of (j&&j.children)||[])for(const en of ((g.standings||{}).entries||[]))if(en.team&&en.team.id)D.tr.add(String(en.team.id));if(V.tab==='home'&&!V.match&&!V.team)refresh()}
const TRRE=/Galatasaray|Fenerbah|Be[sş]ikta[sş]|Trabzon|Ba[sş]ak[sş]ehir|Anadolu Efes|T[uü]rk Telekom|Bah[cç]e[sş]ehir|Kar[sş][iı]yaka|Tofa[sş]|P[iı]nar|Dar[uü][sş][sş]afaka|Merkezefendi|Petkim|B[uü]y[uü]k[cç]ekmece|Samsunspor|Konyaspor|Kas[iı]mpa[sş]a|G[oö]ztepe|Alanyaspor|Antalyaspor|Kayserispor|Rizespor|Ey[uü]pspor|Kocaelispor|Gaziantep|Amed/i;
const isTR=t=>!!t&&(D.tr.has(t.id)||TRRE.test(t.nm||''));
async function loadDay(){
 const key=ymd(dayAt(V.off))+S.sport;D.state=D.ev.length&&D.key===key?'ok':'loading';D.key=key;
 if(D.state==='loading'){D.ev=[];if(V.match==null&&(V.tab==='home'||V.tab==='fav'))render()}
 const jobs=actL().filter(l=>(l[4]||'espn')==='espn').map(([lg])=>api(`site/v2/sports/${sp(lg)}/${lg}/scoreboard?dates=${key.slice(0,8)}`).then(j=>j&&Array.isArray(j.events)?j.events.map(e=>mapEv(e,lg)):null));
 if(S.sport==='basketball')jobs.push(loadAS(key.slice(0,8)));else jobs.push(loadDS(key.slice(0,8)));
 const res=await Promise.all(jobs);
 if(D.key!==key)return;
 if(res.every(r=>r===null)){D.state='off'}else{const ev=res.flat().filter(Boolean);let migrated=false;for(const e of ev)if(S.fm.includes(e.id)&&!S.fml[e.id]){S.fml[e.id]=e.lg;migrated=true}if(migrateBasket()||migrated)save();else window.TribunPush?.sync(S);notifyGoals(ev);D.ev=ev;D.state='ok';D.at=new Date()}
 if(V.match==null&&!V.team)refresh();syncPoll()}
function refresh(){const a=document.activeElement;if(V.tab==='home'&&!V.match&&!V.team&&a&&a.id==='q'&&$('#lst')){$('#lst').innerHTML=listBody()}else render()}

async function dsApi(q){try{const r=await fetch('/api/ds?'+new URLSearchParams(q));const j=await r.json();if(!r.ok)throw Error(j.error||'upstream');return j}catch(e){D.dsOff=e.message;return null}}
function dsEvent(e){return {...e,date:new Date(e.date)}}
async function loadDS(k){
 const d=k.slice(0,4)+'-'+k.slice(4,6)+'-'+k.slice(6,8),j=await dsApi({action:'day',date:d});
 if(!j||!Array.isArray(j.events))return [];
 D.dsOff='';D.dsSuper=j.super||[];D.dsDate=d;
 return j.events.map(dsEvent);
}
function dsSummary(e){
 const cs=[['home',e.h],['away',e.a]].map(([homeAway,t])=>({homeAway,score:t.sc,team:{id:t.id,displayName:t.nm,shortDisplayName:t.nm,abbreviation:t.ab,logos:t.logo?[{href:t.logo}]:[]}}));
 return {ds:true,refereeId:e.refereeId,refereeName:e.referee,header:{competitions:[{date:e.date,status:{type:{state:e.state,shortDetail:e.short},displayClock:e.clock},competitors:cs}]},gameInfo:{venue:{fullName:e.venue,address:{city:typeof e.city==='string'?e.city:''}},attendance:e.attendance,officials:e.referee?[{displayName:e.referee,position:{name:'Referee'}}]:[]},coaches:e.coaches||[]};
}
function matchName(s){return String(s||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]/g,'')}
async function enrichOfficials(j,lg,id){
 if(j.dsOfficialPending||j.dsOfficialDone)return;
 j.dsOfficialPending=true;
 try{const x=await dsApi({action:'officials',league:lg,id});if(!x)return;
 j.dsOfficialDone=true;
 if(x.referee){j.refereeId=x.refereeId;j.refereeName=x.referee;j.gameInfo=j.gameInfo||{};j.gameInfo.officials=[...(j.gameInfo.officials||[]),{displayName:x.referee,position:{name:'Referee'}}]}
 if(x.coaches?.length){j.coaches=x.coaches;j.currentManagers=true}
 }finally{j.dsOfficialPending=false;if(V.match?.id===id)render()}
}

async function loadAS(k){const d=k.slice(0,4)+'-'+k.slice(4,6)+'-'+k.slice(6,8);
 try{const r=await fetch('/api/bball?date='+d);if(r.status===503){D.asOff='nokey';return []}const j=await r.json();if(!r.ok||!Array.isArray(j.events)){D.asOff='err';return []}D.asOff=j.coverage?.otherEuropean||'';
  return j.events.filter(e=>LGN[e.lg]).map(e=>Object.assign(e,{id:String(e.id),date:new Date(e.date),det:[],h:Object.assign({color:null,form:'',rec:''},e.h),a:Object.assign({color:null,form:'',rec:''},e.a)}))}catch(x){D.asOff='err';return []}}
function beep(){try{const C=window.AudioContext||window.webkitAudioContext;D.ac=D.ac||new C();const t=D.ac.currentTime;for(const [f,o] of [[880,0],[1175,.18]]){const os=D.ac.createOscillator(),g=D.ac.createGain();os.frequency.value=f;os.connect(g);g.connect(D.ac.destination);g.gain.setValueAtTime(.25,t+o);g.gain.exponentialRampToValueAtTime(.001,t+o+.35);os.start(t+o);os.stop(t+o+.36)}}catch(x){}}
function notifyGoals(ev){
 for(const e of ev){if(isB(e.lg))continue;const k=e.id,p=D.prev[k],now=(+e.h.sc||0)+(+e.a.sc||0);
  if(p!=null&&e.state==='in'&&now>p&&isFav(e)){const t=`GOL! ${e.h.nm} ${e.h.sc}-${e.a.sc} ${e.a.nm}`;toast('⚽ '+t);if(S.sound)beep();try{navigator.vibrate&&navigator.vibrate([200,80,200])}catch(x){}
   if(S.notif&&noticeEnabled('goal')&&!window.TribunPush?.active()&&'Notification' in window&&Notification.permission==='granted'){try{navigator.serviceWorker?.ready.then(r=>r.showNotification('Tribün',{body:t,icon:'/api/icon?s=192&v=2'})).catch(()=>{})}catch(x){}}}
  D.prev[k]=now}}
async function loadSum(lg,id){
 if(isDS(lg)){const x=await dsApi({action:'match',id});const e=x?.event||D.ev.find(v=>v.id===id);D.sum[id]=e?dsSummary(e):{failed:1};if(V.match?.id===id)render();return}
 if(isAS(lg)){
  if(['as-el','as-ec'].includes(lg)&&/^el[eu]20\d{2}\d{1,4}$/.test(id)){
   try{const r=await fetch('/api/bball?league='+encodeURIComponent(lg)+'&match='+encodeURIComponent(id));const j=await r.json();if(r.ok&&j.header)D.sum[id]=j;else if(!D.sum[id])D.sum[id]={as:1,el:1,failed:1}}catch{if(!D.sum[id])D.sum[id]={as:1,el:1,failed:1}}
  }else D.sum[id]={as:1};
  if(V.match&&V.match.id===id)window.TribunPush?.sync(S,true);
render();return}
 const j=await api(`site/v2/sports/${sp(lg)}/${lg}/summary?event=${id}`);
 if(j){const prev=D.sum[id];if(prev?.dsOfficialDone){j.dsOfficialDone=true;j.currentManagers=prev.currentManagers;if(prev.coaches?.length)j.coaches=prev.coaches;if(prev.gameInfo?.officials?.length){j.gameInfo=j.gameInfo||{};j.gameInfo.officials=[...(j.gameInfo.officials||[]),...prev.gameInfo.officials]}}D.sum[id]=j;if(V.match&&V.match.id===id)render();if(!isB(lg)&&!isDS(lg)&&V.match?.id===id&&V.dtab==='bil')await enrichOfficials(j,lg,id).catch(()=>{})}
 else if(!D.sum[id]){D.sum[id]={failed:1};if(V.match&&V.match.id===id)render()}}
async function loadStand(lg){
 if(isDS(lg)){const j=await dsApi({action:'stand',league:lg});D.stand[lg]=j?.groups?.length?j.groups:'no_data';if(V.tab==='std'||V.team)render();return}
 if(isAS(lg)){try{const r=await fetch('/api/bball?standings='+lg);const j=await r.json();const g=r.ok&&Array.isArray(j.groups)?j.groups.filter(x=>x.rows&&x.rows.length).map(x=>({name:x.name,as:1,source:x.source,season:x.season,week:x.week,rows:x.rows.map(y=>Object.assign({gb:(y.gd>0?'+':'')+y.gd},y,{pct:typeof y.pct==='string'&&y.pct.includes('.')?y.pct:(y.pct?String(y.pct):'')}))})):[];D.stand[lg]=g.length?g:(j.error==='plan_limit'?'plan_limit':r.status===503?'nokey':j.reason==='not_covered'||j.reason==='no_data'?'no_data':'off')}catch(x){D.stand[lg]='off'}if(V.tab==='std'||V.team)render();return}
 const j=await api(`v2/sports/${sp(lg)}/${lg}/standings`);const grp=[];
 const walk=g=>{if(g.standings&&(g.standings.entries||[]).length){const es=g.standings.entries.map(en=>{const st={};for(const x of en.stats||[])st[x.name]=x;const v=n=>st[n]?+st[n].value:0;const t=en.team||{};
   return{id:String(t.id||''),note:en.note?{c:en.note.color,d:en.note.description}:null,chg:v('rankChange'),nm:t.shortDisplayName||t.displayName||'',logo:((t.logos||[])[0]||{}).href||'',rank:v('rank'),p:v('gamesPlayed'),w:v('wins'),d:v('ties'),l:v('losses'),gd:v('pointDifferential'),pts:v('points'),pct:st.winPercent?st.winPercent.displayValue:'',gb:st.gamesBehind?st.gamesBehind.displayValue:''}});
   if(isB(lg))es.sort((a,b)=>(b.w/(b.w+b.l||1))-(a.w/(a.w+a.l||1)));else es.sort((a,b)=>(a.rank&&b.rank)?a.rank-b.rank:b.pts-a.pts||b.gd-a.gd);
   grp.push({name:String(g.name||g.abbreviation||'').replace('Group','Grup').replace('Eastern Conference','Doğu Konferansı').replace('Western Conference','Batı Konferansı'),rows:es})}
  for(const c of g.children||[])walk(c)};
 if(j)walk(j);D.stand[lg]=grp.length?grp:'off';if(V.tab==='std'||V.team)render()}
function syncPoll(){
 clearTimeout(D.timer);if(document.hidden||D.state==='off')return;
 const live=D.ev.some(e=>e.state==='in');
 if(V.match){const e=D.ev.find(x=>x.id===V.match.id);if(e&&e.state==='in')D.timer=setTimeout(()=>{loadSum(V.match.lg,V.match.id);loadDay()},30000);return}
 if(V.tab==='home'||V.tab==='fav')D.timer=setTimeout(loadDay,live?30000:120000)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){window.TribunPush?.sync(S,true);if(D.state!=='off')loadDay()}else syncPoll()});
const followsTeam=(id,lg)=>isB(lg)?S.bft.includes(basketKey(lg,id)):S.ft.includes(id);
const followsMatch=(id,lg)=>isB(lg)?S.bfm.includes(basketKey(lg,id)):S.fm.includes(id)&&(!S.fml[id]||S.fml[id]===lg);
const isFav=e=>followsMatch(e.id,e.lg)||followsTeam(e.h.id,e.lg)||followsTeam(e.a.id,e.lg);

const POS_TR={goalkeeper:'Kaleci',defender:'Defans',midfielder:'Orta saha',forward:'Forvet',guard:'Guard',center:'Pivot'};
const STATUS_TR={out:'Forma giyemiyor',dayToDay:'Günlük takip',doubtful:'Şüpheli',injury:'Sakatlık',suspension:'Ceza',suspended:'Cezalı',other:'Diğer'};
const STAT_TR={minutesPlayed:'Dakika',goals:'Gol',assists:'Asist',shotsOnGoal:'İsabetli şut',passes:'Pas',accuratePasses:'İsabetli pas',tackles:'Top kapma',saves:'Kurtarış',yellowCards:'Sarı kart',redCards:'Kırmızı kart',points:'Sayı',rebounds:'Ribaund'};
const validRemote=id=>/^[1-9]\d{0,11}$/.test(String(id));
const safeExternal=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
const emptyBox=s=>'<div class="card empty"><p class="mut">'+esc(s)+'</p></div>';
const errorLabel=e=>e==='budget'?'Ücretsiz veri kotası doldu. Daha sonra tekrar dene.':e==='busy'?'Veri hazırlanıyor. Tekrar dene.':'Veriye ulaşılamadı. Daha sonra tekrar dene.';
const X={q:'',type:'',results:null,err:'',loading:false,seq:0,dir:{},news:{},transfers:null,detail:{}};
async function explore(q){const r=await fetch('/api/explore?'+new URLSearchParams(q));let j;try{j=await r.json()}catch{}if(!r.ok)throw Error(j?.error||'upstream');return j}
function normSearch(s){return String(s||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]/g,'')}
function localSearch(q){
 const n=normSearch(q);if(!n)return [];
 const result=LEAGUES.filter(l=>normSearch(l[1]).includes(n)).map(l=>({type:'localLeague',name:l[1],league:l[0]}));
 const all=[{id:'990000172700',name:'Bursaspor',league:'ds-tr1'}];
 for(const [lg,groups] of Object.entries(D.stand))if(Array.isArray(groups))for(const g of groups)for(const t of g.rows||[])all.push({id:t.id,name:t.nm,league:lg,image:t.logo});
 for(const e of D.ev)for(const t of [e.h,e.a])all.push({id:t.id,name:t.nm,league:e.lg,image:t.logo});
 for(const [lg,items] of Object.entries(X.dir))for(const t of items)all.push(t);
 for(const id of S.ft)if(S.ftl[id])all.push({id,name:S.ftn?.[id],league:S.ftl[id]});for(const k of S.bft){const i=k.indexOf(':');all.push({id:k.slice(i+1),name:S.bftn[k],league:k.slice(0,i)})}
 const seen=new Set();for(const t of all){if(!t.id||!LGN[t.league]||!normSearch(t.name).includes(n)||seen.has(t.league+':'+t.id))continue;seen.add(t.league+':'+t.id);result.push({...t,type:'localTeam'})}
 return result.slice(0,30);
}
function searchPage(){
 const local=localSearch(X.q),remote=(X.results||[]).filter(t=>!local.some(x=>x.type==='localTeam'&&x.id==='990000'+t.id||x.type==='localLeague'&&normSearch(x.name)===normSearch(t.name)));
 return topBar('Arama')+'<h1>Keşfet</h1><form onsubmit="event.preventDefault();runSearch()" class="search-form"><input id="globalq" value="'+esc(X.q)+'" placeholder="Takım, oyuncu, hakem, lig" maxlength="60" autocomplete="off" oninput="XQuery(this.value)"><button class="pill k" type="submit">Ara</button></form><div class="chips">'+[['','Tümü'],['team','Takımlar'],['player','Oyuncular'],['league','Ligler'],['referee','Hakemler']].map(([k,n])=>'<button class="'+(X.type===k?'on':'')+'" onclick="searchType(\''+k+'\')">'+n+'</button>').join('')+'</div><div id="searchResults">'+searchResults(local,remote)+'</div><p class="mut" style="margin:12px 4px">Yerel ligler ve yüklenmiş takımlar anında bulunur. Ara düğmesi geniş veri kaynağını sorgular.</p>';
}
function searchResults(local=localSearch(X.q),remote=X.results||[]){
 if(X.type)local=local.filter(t=>X.type==='team'?t.type==='localTeam':X.type==='league'?t.type==='localLeague':false);
 const types={localLeague:'Lig',localTeam:'Takım',team:'Takım',player:'Oyuncu',league:'Lig',referee:'Hakem'};
 const rows=[...local,...remote].filter(t=>t.name).map(t=>{
  const action=t.type==='localLeague'?'openLeague(\''+esc(t.league)+'\')':t.type==='localTeam'?'openT(\''+esc(t.league)+'\',\''+esc(t.id)+'\')':validRemote(t.id)?'openEntityProfile(\''+t.type+'\',\''+t.id+'\')':'';
  return action?'<button class="row discover-row" onclick="'+action+'">'+crest(t.image,t.name.slice(0,2))+'<span class="grow"><b>'+esc(t.name)+'</b><small class="mut">'+esc(types[t.type]||'')+(t.league?' · '+esc(LGN[t.league]?.name||t.league):t.team?.name?' · '+esc(t.team.name):'')+'</small></span><span>›</span></button>':'';
 }).join('');
 return (rows?'<div class="card">'+rows+'</div>':'')+(X.loading?emptyBox('Aranıyor…'):X.err?emptyBox(errorLabel(X.err)):!rows&&X.results?emptyBox('Sonuç bulunamadı.'):!rows?emptyBox('Bir isim yaz veya lig seç.'):'' );
}
function XQuery(v){X.q=v;X.seq++;X.results=null;X.err='';X.loading=false;const el=$('#searchResults');if(el)el.innerHTML=searchResults()}
function searchType(k){X.type=k;X.results=null;X.seq++;X.loading=false;render()}
async function runSearch(){
 const q=$('#globalq')?.value.trim()||X.q.trim();if(q.length<2)return toast('En az 2 karakter yaz');
 X.q=q;X.loading=true;X.err='';X.results=null;const seq=++X.seq;render();
 try{const j=await explore({action:'search',q,type:X.type});if(seq===X.seq)X.results=j.items||[]}catch(e){if(seq===X.seq)X.err=e.message}
 finally{if(seq===X.seq){X.loading=false;if(V.tab==='search')render()}}
}
function openLeague(lg){if(!LGN[lg])return;S.sport=sp(lg);setSL(lg);go({tab:'std'})}
function dataRows(rows){return rows.filter(x=>x[1]!==null&&x[1]!==undefined&&x[1]!=='').map(([n,v])=>'<span>'+esc(n)+'</span><b>'+esc(v)+'</b>').join('')}
function playerRows(items){
 return items.length?'<div class="card">'+items.map(p=>'<button class="row discover-row" onclick="openEntityProfile(\'player\',\''+esc(p.id)+'\')">'+crest(p.image,p.jersey||'')+'<span class="grow"><b>'+esc(p.name)+'</b><small class="mut">'+esc(POS_TR[p.position]||p.position||'')+(p.injury?' · '+esc(STATUS_TR[p.injury.status]||p.injury.status):'')+'</small></span><span>›</span></button>').join('')+'</div>':emptyBox('Kadro verisi yok.');
}
function transferRows(items){return items.length?'<div class="card">'+items.map(t=>'<div class="row discover-row">'+crest(t.player?.image,'')+'<span class="grow"><b>'+esc(t.player?.name)+'</b><small class="mut">'+esc(t.from||'—')+' → '+esc(t.to||'—')+'</small><small class="mut">'+esc(t.date||'')+' · '+esc(({transfer:'Transfer',loan:'Kiralık',release:'Serbest',signing:'İmza'})[t.type]||t.type)+(t.fee?' · '+esc(t.fee.amount.toLocaleString('tr-TR')+' '+t.fee.currency):t.free?' · Bedelsiz':'')+'</small></span></div>').join('')+'</div>':emptyBox('Kayıtlı transfer bulunamadı.')}
let entitySeq=0;
async function openEntityProfile(type,id){
 if(!['team','player','referee','league'].includes(type)||!validRemote(id))return;
 const seq=++entitySeq;modal('<div id="entityContent"><h2>Yükleniyor…</h2></div>');
 const action=type==='team'?'teamProfile':type;
 try{const j=await explore({action,id}),x=j.profile;if(seq!==entitySeq||!$('#entityContent'))return;
 let body='<div class="entity-head">'+crest(x.image,'')+'<h1>'+esc(x.name)+'</h1><p class="mut">'+esc(x.country||x.category||'')+'</p></div>';
 if(type==='referee'){
  body+='<div class="metric-grid">'+[['Maç',x.games],['Sarı kart',x.yellow],['Kırmızı kart',x.red],['İkinci sarı',x.secondYellow]].map(([n,v])=>'<div><b>'+esc(v??'—')+'</b><small>'+n+'</small></div>').join('')+'</div><p class="mut" style="margin:8px">Kariyer toplamları · DataSportsAPI</p>';
  if(x.competitions?.length)body+='<div class="card scroll"><table><tr><th>Lig</th><th>Maç</th><th>Sarı</th><th>Kırmızı</th><th>Penaltı</th></tr>'+x.competitions.map(c=>'<tr><td>'+esc(c.name)+'</td>'+[c.games,c.yellow,c.red,c.penalties].map(v=>'<td>'+esc(v??'—')+'</td>').join('')+'</tr>').join('')+'</table></div>';
 }else if(type==='player'){body+='<div class="card info">'+dataRows([['Takım',x.team?.name],['Pozisyon',POS_TR[x.position]||x.position],['Doğum',x.birth],['Boy',x.height?x.height+' cm':null],['Ayak',x.foot],['Sakatlık',x.injury?.description],['Beklenen dönüş',x.injury?.return]])+'</div>'}
 else if(type==='team'){
  const local=localSearch(x.name).find(t=>t.type==='localTeam'&&(t.id==='990000'+id||normSearch(t.name)===normSearch(x.name)));
  body+='<div class="card info">'+dataRows([['Stadyum',x.venue],['Teknik direktör',x.manager],['Kuruluş',x.founded]])+'</div>';
  if(local)body+='<button class="pill k" onclick="closeM();openT(\''+esc(local.league)+'\',\''+esc(local.id)+'\')">Takımın fikstürü ve puan durumu</button>';
  body+='<button class="pill" onclick="entityExtra(\'squad\',\''+id+'\')">Kadro ve sakatlıklar</button><button class="pill" onclick="entityExtra(\'teamTransfers\',\''+id+'\')">Transferler</button><div id="entityExtra"></div>';
 }else{const local=LEAGUES.find(l=>normSearch(l[1])===normSearch(x.name));body+='<div class="card info">'+dataRows([['Kategori',x.category],['Spor',x.sport==='football'?'Futbol':x.sport==='basketball'?'Basketbol':x.sport]])+'</div>';if(local)body+='<button class="pill k" onclick="closeM();openLeague(\''+local[0]+'\')">Puan durumunu aç</button>'}
 $('#entityContent').innerHTML=body+'<button class="pill" onclick="closeM()">Kapat</button>';
 }catch(e){if(seq===entitySeq&&$('#entityContent'))$('#entityContent').innerHTML=emptyBox(errorLabel(e.message))+'<button class="pill" onclick="closeM()">Kapat</button>'}
}
async function entityExtra(action,id){
 if(!['squad','teamTransfers'].includes(action)||!validRemote(id))return;const node=$('#entityExtra');if(!node)return;node.innerHTML=emptyBox('Yükleniyor…');
 try{const j=await explore({action,id});if(node.isConnected)node.innerHTML=action==='squad'?playerRows(j.items||[]):transferRows(j.items||[])}catch(e){if(node.isConnected)node.innerHTML=emptyBox(errorLabel(e.message))}
}
function leagueDirectory(lg){
 if(!LGN[lg]||isAS(lg))return '';
 const groups=D.stand[lg];let items=Array.isArray(groups)?groups.flatMap(g=>g.rows.map(t=>({id:t.id,name:t.nm,image:t.logo}))):X.dir[lg];
 if(!items?.length)return '<button class="pill" onclick="loadDirectory(\''+lg+'\')">Takımları göster</button>';
 return '<details class="card" style="padding:12px;margin:10px 0"><summary>Lig takımları ('+items.length+')</summary>'+items.map(t=>'<button class="row discover-row" onclick="openT(\''+lg+'\',\''+esc(t.id)+'\')">'+crest(t.image,'')+'<span class="grow">'+esc(t.name)+'</span><span>›</span></button>').join('')+'</details>';
}
async function loadDirectory(lg){if(!LGN[lg]||isAS(lg))return;try{if(isDS(lg)){await loadStand(lg);return}const j=await explore({action:'espnTeams',league:lg,sport:sp(lg)});X.dir[lg]=j.items||[];render();if(!X.dir[lg].length)toast('Takım listesi bulunamadı.')}catch(e){toast(errorLabel(e.message))}}
function newsPage(){
 const lg=V.newsLg||'eng.1',sport=sp(lg),data=X.news[lg];if(!data){X.news[lg]={loading:true};setTimeout(()=>loadNews(lg),0)}
 const choices=LEAGUES.filter(l=>!isDS(l[0])&&!isAS(l[0]));
 const rows=data?.items?.map(n=>'<a class="news-item card" href="'+esc(safeExternal(n.url))+'" target="_blank" rel="noopener noreferrer"><small class="mut">'+esc(n.source)+' · '+esc(n.published?new Date(n.published).toLocaleDateString('tr-TR'):'')+'</small><b>'+esc(n.title)+'</b><p>'+esc(n.description)+'</p><small class="mut">Kaynağında oku ↗</small></a>').join('');
 return topBar('Haberler')+'<h1>Spor haberleri</h1><div class="chips">'+[['news','Haberler'],['transfers','Transferler']].map(([k,t])=>'<button class="'+(V.tab===k?'on':'')+'" onclick="go({tab:\''+k+'\'})">'+t+'</button>').join('')+'</div><select aria-label="Lig" onchange="selectNews(this.value)">'+choices.map(l=>'<option value="'+l[0]+'" '+(l[0]===lg?'selected':'')+'>'+esc(l[1])+'</option>').join('')+'</select><button class="pill" onclick="loadNews(\''+lg+'\')">Haberleri yükle / yenile</button><p class="mut" style="margin:8px">ESPN · Başlıklar kaynak dilinde olabilir.</p>'+(data?.error?emptyBox(errorLabel(data.error)):data?.loading||!data?emptyBox('Haberler yükleniyor…'):rows||emptyBox('Haber bulunamadı.'));
}
function selectNews(lg){if(LGN[lg]&&!isAS(lg)&&!isDS(lg)){V.newsLg=lg;render();loadNews(lg)}}
async function loadNews(lg){try{X.news[lg]=await explore({action:'news',league:lg,sport:sp(lg)})}catch(e){X.news[lg]={error:e.message}}if(V.tab==='news')render()}
function transfersPage(){return topBar('Transferler')+'<h1>Transferler</h1><div class="chips"><button onclick="go({tab:\'news\'})">Haberler</button><button class="on" onclick="go({tab:\'transfers\'})">Transferler</button></div><button class="pill" onclick="loadTransfers()">Son transferleri yükle / yenile</button><p class="mut" style="margin:8px">Kaynağın kaydettiği oyuncu hareketleri; söylenti değildir.</p>'+(X.transfers?.error?emptyBox(errorLabel(X.transfers.error)):X.transfers?transferRows(X.transfers.items||[]):emptyBox('Transferleri yüklemek için düğmeye dokun.'))}
async function loadTransfers(){try{X.transfers=await explore({action:'transfers'})}catch(e){X.transfers={error:e.message}}if(V.tab==='transfers')render()}
function lazyData(key,query){if(X.detail[key])return X.detail[key];X.detail[key]={loading:true};explore(query).then(x=>{X.detail[key]=x}).catch(e=>{X.detail[key]={error:e.message}}).finally(()=>{if(V.match||V.team)render()});return X.detail[key]}
function lazyBody(x,fn,key){return x.loading?emptyBox('Yükleniyor…'):x.error?emptyBox(errorLabel(x.error))+'<button class="pill" onclick="retryDetail(\''+esc(key)+'\')">Tekrar dene</button>':fn(x)}
function retryDetail(key){delete X.detail[key];render()}
function dsSquad(id){const k='squad:'+id,x=lazyData(k,{action:'squad',id:id.slice(6)});return lazyBody(x,j=>playerRows(j.items||[]),k)}
function injuriesUI(lg,id){
 const k='injuries:'+lg+':'+id,q=isDS(lg)?{action:'squad',id:id.slice(6)}:{action:'injuries',id,league:lg,sport:sp(lg)},x=lazyData(k,q);
 return lazyBody(x,j=>{const rows=isDS(lg)?(j.items||[]).filter(p=>p.injury).map(p=>({name:p.name,status:p.injury.status,description:p.injury.description,date:p.injury.return})):(j.items||[]);
 return rows.length?'<div class="card">'+rows.map(p=>'<div class="row discover-row"><span class="grow"><b>'+esc(p.name)+'</b><small class="mut">'+esc(STATUS_TR[p.status]||p.status)+' · '+esc(p.description)+'</small><small class="mut">'+esc(p.date||'')+'</small></span></div>').join('')+'</div>':emptyBox('Kaynakta sakatlık kaydı bulunamadı; bu, tüm oyuncuların sağlıklı olduğu anlamına gelmez.')},k)
}
function teamTransfersUI(id){const k='transfers:'+id;return lazyBody(lazyData(k,{action:'teamTransfers',id:id.slice(6)}),j=>transferRows(j.items||[]),k)}
function formUI(d,id){
 const matches=d.ev.filter(e=>e.state==='post'&&e.h.sc!==''&&e.a.sc!==''&&Number.isFinite(Number(e.h.sc))&&Number.isFinite(Number(e.a.sc))).slice(-10);
 if(!matches.length)return emptyBox('Form grafiği için sonuç yok.');
 const points=matches.map(e=>{const own=e.h.id===id?+e.h.sc:+e.a.sc,opp=e.h.id===id?+e.a.sc:+e.h.sc;return own>opp?3:own===opp?1:0});
 return '<div class="card" style="padding:14px;margin:10px 0"><h2 style="text-align:left;margin:0 0 8px">Son '+points.length+' maç</h2><div class="form-chart">'+points.map((p,i)=>'<div title="'+esc(matches[i].date.toLocaleDateString('tr-TR'))+'"><i class="'+(p===3?'win':p===1?'draw':'loss')+'" style="height:'+(p===3?64:p===1?38:16)+'px">'+(p===3?'G':p===1?'B':'M')+'</i><small>'+matches[i].date.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit'})+'</small></div>').join('')+'</div><p class="mut">Galibiyet '+points.filter(x=>x===3).length+' · Beraberlik '+points.filter(x=>x===1).length+' · Mağlubiyet '+points.filter(x=>x===0).length+'</p></div>';
}
function dsLineupsUI(id,tab,H,A){
 const k='lineups:'+id,x=lazyData(k,{action:'lineups',id:id.slice(2)});
 return lazyBody(x,j=>{
 const sides=[['home',H],['away',A]],cur=V.kside==='away'?'away':'home',a=j[cur]||{},list=a.players||[],seg='<div class="seg">'+sides.map(([s,t])=>'<button class="'+(cur===s?'on':'')+'" onclick="go({kside:\''+s+'\'})">'+esc(t.nm)+'</button>').join('')+'</div>';
 if(tab==='eksik'){const m=a.missing||[];return seg+(m.length?'<div class="card">'+m.map(t=>'<div class="row discover-row"><span class="grow"><b>'+esc(t.name)+'</b><small class="mut">'+esc(STATUS_TR[t.reason]||t.reason)+' · '+esc(t.description)+'</small><small>'+esc(t.return||'')+'</small></span></div>').join('')+'</div>':emptyBox('Kaynakta eksik oyuncu kaydı yok.'))}
 if(!list.length)return seg+emptyBox('Bu maç için kadro verisi yayınlanmamış.');
 if(tab==='oyn')return seg+'<div class="card">'+list.filter(p=>p.rating!=null||Object.keys(p.stats||{}).length).map(p=>'<div class="discover-row" style="padding:12px"><button onclick="openEntityProfile(\'player\',\''+esc(p.id)+'\')"><b>'+esc(p.name)+'</b></button> '+(p.rating!=null?'<b class="rating">'+esc(p.rating)+'</b>':'')+'<small class="mut" style="display:block">'+Object.entries(p.stats||{}).map(([k,v])=>esc((STAT_TR[k]||k)+': '+v)).join(' · ')+'</small></div>').join('')+'</div>';
 return seg+'<p class="mut" style="margin:8px">'+(j.confirmed?'Onaylı kadro':'Henüz onaylanmamış kadro')+' · '+esc(a.formation||'')+'</p><div class="card">'+list.map(p=>'<button class="row discover-row" onclick="openEntityProfile(\'player\',\''+esc(p.id)+'\')"><b>'+esc(p.jersey)+'</b><span class="grow">'+esc(p.name)+'<small class="mut">'+esc(POS_TR[p.position]||p.position)+(p.substitute?' · Yedek':'')+'</small></span></button>').join('')+'</div>';
 },k)
}
function broadcastRows(j){
 const items=[...(Array.isArray(j.broadcasts)?j.broadcasts:[]),...(Array.isArray(j.header?.competitions?.[0]?.broadcasts)?j.header.competitions[0].broadcasts:[])];
 const names=[...new Set(items.flatMap(x=>[x.media?.shortName,x.media?.name,x.name,...(Array.isArray(x.names)?x.names:[])].filter(v=>typeof v==='string'&&v)))];
 return names.length?'<span>TV / yayın</span><b>'+esc(names.join(', '))+'<small class="mut" style="display:block">Yayın bölgesi değişebilir; Türkiye yayını garanti değildir.</small></b>':'<span>TV / yayın</span><b>Kaynakta yayın bilgisi yok</b>';
}
function applyTheme(){const theme=['light','dark','system'].includes(S.theme)?S.theme:'system';document.documentElement.dataset.theme=theme;const dark=theme==='dark'||theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#121620':'#ececec')}
function setTheme(v){if(!['light','dark','system'].includes(v))return;S.theme=v;applyTheme();save();render()}
function themeUI(){return '<h2 style="text-align:left">Görünüm</h2><div class="seg">'+[['light','Açık'],['dark','Koyu'],['system','Sistem']].map(([k,n])=>'<button class="'+((S.theme||'system')===k?'on':'')+'" onclick="setTheme(\''+k+'\')">'+n+'</button>').join('')+'</div>'}
function syncUI(){
 return '<button class="back" onclick="go({tab:\'usr\'})">'+svg(ic.back)+' Profil</button><h1>Favori eşitleme</h1><p class="mut" style="margin:12px 0">Favorilerini başka cihaza aktarmak için bu kodu kullan. Kod, kayıt üzerinde tam erişim sağlar; kimseyle paylaşma. Son kayıttan 90 gün sonra silinir. Bildirim izinleri, geçmiş ve profil adı aktarılmaz.</p><div class="card" style="padding:12px"><input id="syncCode" type="password" value="'+esc(S.syncCode||'')+'" placeholder="64 karakterli eşitleme kodu" maxlength="64" autocomplete="off"><button class="pill" onclick="generateSync()">Yeni kod oluştur</button><button class="pill" onclick="copySync()">Kodu kopyala</button><button class="pill k" onclick="syncAction(\'save\')">Bu cihazın favorilerini yükle</button><button class="pill" onclick="syncAction(\'load\')">Kayıttan favorileri getir (birleştir)</button><button class="pill r" onclick="syncAction(\'delete\')">Bulut kaydını sil</button></div><p id="syncStatus" class="mut" role="status" style="margin:12px"></p>';
}
function generateSync(){if(S.syncCode&&!confirm('Mevcut kodu değiştirmek eski bulut kaydını silmez. Devam edilsin mi?'))return;S.syncCode=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');save();render()}
async function copySync(){const code=$('#syncCode')?.value||S.syncCode;if(!/^[a-f0-9]{64}$/.test(code||''))return toast('Önce kod oluştur.');try{await navigator.clipboard.writeText(code);toast('Kod kopyalandı.')}catch{const x=$('#syncCode');if(x){x.type='text';x.select()}toast('Kodu seçip kopyala.')}}
async function syncFavorites(action,explicitCode){
 const code=explicitCode||$('#syncCode')?.value.trim()||S.syncCode;if(!/^[a-f0-9]{64}$/.test(code||''))return toast('Geçerli kod gerekli.');
 if(action==='delete'&&!explicitCode&&!confirm('Bulut kaydı kalıcı olarak silinsin mi?'))return;
 const f={fm:S.fm,ft:S.ft,fml:S.fml||{},ftl:S.ftl,ftn:S.ftn||{},bfm:S.bfm,bft:S.bft,bftn:S.bftn};
 const r=await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,code,favorites:f})});
 if(!r.ok)throw Error(r.status===404?'Kayıt bulunamadı.':'Eşitleme başarısız.');
 const j=await r.json();
 if(action==='load'){const x=j.favorites||{};S.fm=[...new Set([...S.fm,...(x.fm||[])])].slice(0,200);S.ft=[...new Set([...S.ft,...(x.ft||[])])].slice(0,200);for(const k of ['fml','ftl','ftn','bftn'])S[k]={...(x[k]||{}),...(S[k]||{})};for(const k of ['bfm','bft'])S[k]=[...new Set([...S[k],...(x[k]||[])])].slice(0,200);migrateBasket()}
 if(action==='delete')delete S.syncCode;else S.syncCode=code;
 save();if(!explicitCode){render();toast(action==='load'?'Favoriler birleştirildi.':action==='save'?'Bulut kaydı güncellendi.':'Bulut kaydı silindi.')}
}
function syncAction(a){syncFavorites(a).catch(e=>toast(e.message||'Eşitleme başarısız.'))}

function hashFor(){if(V.match)return 'mac-'+LGN[V.match.lg].i+'-'+V.match.id;if(V.team)return 'takim-'+LGN[V.team.lg].i+'-'+V.team.id;return{home:'ana',std:'puan',fav:'favori',usr:'profil',set:'ayarlar',wc:'arsiv',hist:'bildirimler',search:'arama',news:'haberler',transfers:'transferler',sync:'esitleme'}[V.tab]}
function readHash(){const h=location.hash.slice(1);let m;
 if((m=h.match(/^mac-(\d+)-([a-z0-9]+)$/))&&LEAGUES[+m[1]])return{match:{lg:LEAGUES[+m[1]][0],id:m[2]},team:null};
 if((m=h.match(/^takim-(\d+)-(\d+)$/))&&LEAGUES[+m[1]])return{team:{lg:LEAGUES[+m[1]][0],id:m[2]},match:null};
 const t={ana:'home',puan:'std',favori:'fav',profil:'usr',ayarlar:'set',arsiv:'wc',bildirimler:'hist',arama:'search',haberler:'news',transferler:'transfers',esitleme:'sync'}[h];return t?{tab:t,match:null,team:null}:null}
function go(o){const nav=('tab' in o)||('match' in o)||('team' in o);if(('tab' in o||o.match)&&!('team' in o))o.team=null;if(o.team&&!('match' in o))o.match=null;Object.assign(V,o);if(nav&&o.match)V.dtab='ozet';if(nav&&o.team)V.ttab='fik';
 if(V.team&&!D.tm[V.team.lg+V.team.id])loadTeam(V.team.lg,V.team.id);
 const h=hashFor();if(!V.splash&&location.hash.slice(1)!==h){try{history.pushState(null,'','#'+h)}catch(e){location.hash=h}}
 if(V.match&&!D.sum[V.match.id])loadSum(V.match.lg,V.match.id);
 render();if(nav&&$('main'))$('main').scrollTop=0;syncPoll()}
function route(){const r=readHash();if(!r)return;closeM();Object.assign(V,{match:null,team:null},r);if(V.team&&!D.tm[V.team.lg+V.team.id])loadTeam(V.team.lg,V.team.id);if(V.match&&!D.sum[V.match.id])loadSum(V.match.lg,V.match.id);render();syncPoll()}
addEventListener('popstate',route);
addEventListener('hashchange',()=>{if(hashFor()!==location.hash.slice(1))route()});
const ic={home:'<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>',std:'<path d="M5 4h14v5a7 7 0 0 1-14 0zM9 20h6M12 16v4"/>',fav:'<path d="M6 3h12v18l-6-4-6 4z"/>',usr:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',menu:'<path d="M4 7h16M4 12h10M4 17h16"/>',bell:'<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',back:'<path d="M15 5l-7 7 7 7"/>',
 soccer:'<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/><path d="M12 3v4M16 10l4.5-1.5M14.5 14.5l2.5 4M9.5 14.5L7 18.5M8 10L3.5 8.5"/>',basketball:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8"/>'};
const svg=(p,f)=>`<svg width="22" height="22" viewBox="0 0 24 24" fill="${f||'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${p}</svg>`;
function toast(t){$('.toast')?.remove();const e=document.createElement('div');e.className='toast';e.textContent=t;$('#app').append(e);setTimeout(()=>e.remove(),2600)}
function modal(h){closeM();const d=document.createElement('div');d.className='modal';d.id='mo';d.onclick=e=>{if(e.target===d)closeM()};d.innerHTML=`<div role="dialog" aria-modal="true">${h}</div>`;$('#app').append(d)}
function closeM(){$('#mo')?.remove()}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeM()});
function statusTxt(e){if(e.state==='in')return `<span class="lvb">${esc(isB(e.lg)?(isAS(e.lg)?trS(e.short)+(e.clock?' '+e.clock+'\'':''):trS(e.short,e.lg)):(e.clock||e.short))}</span>`;if(e.state==='pre')return 'Başlamadı';return esc(trS(e.short,e.lg)||'MS')}
function ball(){const C=100,R=92,pr=21,P=(cx,cy,r,rot)=>[0,1,2,3,4].map(i=>{const a=rot+i*72*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]});
 const poly=pts=>pts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ');
 const c=P(C,C,pr,-Math.PI/2);let s='';
 for(let i=0;i<5;i++){const a=(-90+36+i*72)*Math.PI/180,d=60;const o=P(C+d*Math.cos(a),C+d*Math.sin(a),pr*.95,a+Math.PI);s+=`<polygon points="${poly(o)}" fill="url(#pk)"/>`;
  const v=c[i],va=(-90+i*72)*Math.PI/180,mx=(C+52*Math.cos(va)).toFixed(1),my=(C+52*Math.sin(va)).toFixed(1);
  s+=`<line x1="${v[0].toFixed(1)}" y1="${v[1].toFixed(1)}" x2="${mx}" y2="${my}"/><line x1="${mx}" y1="${my}" x2="${(C+R*Math.cos(va-.22)).toFixed(1)}" y2="${(C+R*Math.sin(va-.22)).toFixed(1)}"/><line x1="${mx}" y1="${my}" x2="${(C+R*Math.cos(va+.22)).toFixed(1)}" y2="${(C+R*Math.sin(va+.22)).toFixed(1)}"/>`}
 return `<svg viewBox="0 0 200 200" role="img" aria-label="Futbol topu"><defs><radialGradient id="bw" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#eceff3"/><stop offset="1" stop-color="#9aa3ad"/></radialGradient><radialGradient id="pk" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#3a3f47"/><stop offset="1" stop-color="#0c0e12"/></radialGradient><clipPath id="bc"><circle cx="100" cy="100" r="${R}"/></clipPath><radialGradient id="gl" cx="35%" cy="28%" r="30%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
 <circle cx="100" cy="100" r="${R}" fill="url(#bw)"/><g clip-path="url(#bc)" stroke="#5d646d" stroke-width="1.6" fill="none">${s}<polygon points="${poly(c)}" fill="url(#pk)" stroke="none"/></g>
 <circle cx="100" cy="100" r="${R}" fill="url(#gl)"/><circle cx="100" cy="100" r="${R-.8}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/></svg>`}
function bball(){return `<svg class="bb" viewBox="0 0 100 100" role="img" aria-label="Basketbol topu"><defs><radialGradient id="bo" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#ffb066"/><stop offset=".55" stop-color="#ee6a1c"/><stop offset="1" stop-color="#8a3108"/></radialGradient><clipPath id="bk"><circle cx="50" cy="50" r="46"/></clipPath></defs><circle cx="50" cy="50" r="46" fill="url(#bo)"/>
 <g clip-path="url(#bk)" stroke="#2a1306" stroke-width="2.4" fill="none"><path d="M4 50h92M50 4v92"/><path d="M20 12c14 14 14 62 0 76M80 12c-14 14-14 62 0 76"/></g><ellipse cx="36" cy="28" rx="14" ry="8" fill="#fff" opacity=".22"/></svg>`}
function posterBg(){const cols=['#1b4fbf','#d6293e','#f2b705','#1f9d55','#0b2a6f','#e8883a','#7a1fa2','#00a3e0'];
 let s='';for(let i=0;i<16;i++){const a1=i*22.5*Math.PI/180,a2=(i+1)*22.5*Math.PI/180;s+=`<path d="M200 260 L${(200+700*Math.cos(a1)).toFixed(0)} ${(260+700*Math.sin(a1)).toFixed(0)} L${(200+700*Math.cos(a2)).toFixed(0)} ${(260+700*Math.sin(a2)).toFixed(0)}Z" fill="${cols[i%8]}"/>`}
 return `<svg class="bgp" viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="vg" cx="50%" cy="46%" r="70%"><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient><linearGradient id="ft" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#0d1b3d" stop-opacity="0"/><stop offset="1" stop-color="#0d1b3d"/></linearGradient></defs>${s}
 <rect width="400" height="560" fill="url(#vg)"/><g stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"><ellipse cx="200" cy="520" rx="210" ry="60"/><line x1="-10" y1="520" x2="410" y2="520"/></g><rect width="400" height="560" fill="url(#ft)"/>
 ${[[40,90],[350,70],[70,330],[330,300],[300,140],[110,190]].map(([x,y],i)=>`<path d="M${x} ${y-8}l2.4 5.6 6 .6-4.6 4 1.4 6-5.2-3.2-5.2 3.2 1.4-6-4.6-4 6-.6z" fill="#fff" opacity="${.5+i*.08}"/>`).join('')}</svg>`}
function splash(){return `<div class="splash"><div class="poster">${posterBg()}<div class="ptxt"><div class="y">CANLI SKOR</div><div class="big">TRİBÜN</div></div><div class="ballw"><div class="sh"></div>${ball()}${bball()}</div></div>
 <div class="slogan"><b>Maç senin.<br>Tribün senin.</b><span>Futbol ve basketbolda canlı skor, istatistik, kadro ve puan durumu.</span></div>
 <button class="pill" onclick="enterApp('fav')">Favorilerimi seç</button><button class="pill k" onclick="enterApp('home')">Canlı skorlara git</button></div>`}
function enterApp(t){S.seen=1;save();V.splash=false;go({tab:t,match:null});loadDay()}
function render(){const a=$('#app');if(V.splash){a.innerHTML=splash();return}
 const body=V.match?detail():V.team?teamV():({home,std,fav:favs,usr:profile,set:settings,wc,hist:historyPage,search:searchPage,news:newsPage,transfers:transfersPage,sync:syncUI}[V.tab]||home)();
 const nv=[['home','Canlı skorlar'],['std','Puan durumu'],['search','Arama'],['fav','Favoriler'],['usr','Profil']];const cur=['set','hist'].includes(V.tab)?'usr':V.tab==='wc'?'std':V.tab;
 a.innerHTML=`<main>${body}</main><nav>${nv.map(([k,l])=>`<button aria-label="${l}" ${!V.match&&!V.team&&cur===k?'aria-current="page" class="on"':''} onclick="go({tab:'${k}',match:null})">${svg(k==='search'?'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>':ic[k])}</button>`).join('')}</nav>`}
function topBar(t){const live=D.ev.some(e=>e.state==='in');
 return `<div class="top"><button class="ib" aria-label="Menü" onclick="menu()">${svg(ic.menu)}</button><span class="an">${t}</span><button class="ib" aria-label="Bildirimler" onclick="openHistory()">${svg(ic.bell)}${live?'<span class="dot"></span>':''}</button></div>`}
function sportBar(){return `<div class="sport" role="tablist" aria-label="Spor">${SPORTS.map(([k,l])=>`<button role="tab" aria-selected="${S.sport===k}" class="${S.sport===k?'on':''}" onclick="setSport('${k}')">${svg(ic[k])}${l}</button>`).join('')}</div>`}
function setSport(k){if(S.sport===k)return;S.sport=k;save();D.ev=[];D.prev={};D.state='loading';V.grp=0;render();loadDay()}
function menu(){modal(`<h1 style="font-size:30px;margin-bottom:12px">Menü</h1><div class="card">${[['Canlı skorlar',"{tab:'home'}"],['Puan durumu',"{tab:'std'}"],['Favoriler',"{tab:'fav'}"],['Arşiv: Dünya Kupası 2026',"{tab:'wc'}"],['Profil',"{tab:'usr'}"],['Bildirimler ve ayarlar',"{tab:'set'}"],['Bildirim geçmişi',"{tab:'hist'}"],['Arama merkezi',"{tab:'search'}"],['Spor haberleri',"{tab:'news'}"],['Transferler',"{tab:'transfers'}"],['Favori eşitleme',"{tab:'sync'}"]].map(([l,o])=>`<button class="row" onclick="closeM();go(Object.assign(${o},{match:null}))">${l}<span>›</span></button>`).join('')}</div>`)}
function dates(){return `<div class="dates" role="tablist" aria-label="Tarih">${[-2,-1,0,1,2,3,4].map(o=>{const d=dayAt(o);return `<button role="tab" aria-selected="${V.off===o}" class="${V.off===o?'on':''}" onclick="setDay(${o})"><span>${o===0?'BUGÜN':o===-1?'DÜN':o===1?'YARIN':GUN[d.getDay()]}</span><b>${d.getDate()}</b></button>`}).join('')}</div>`}
function setDay(o){V.off=o;D.ev=[];D.prev={};render();loadDay()}
function featured(list){const pr=e=>(e.state==='in'?0:e.state==='pre'?2:3)-(isFav(e)?1.5:0)+LGN[e.lg].i*.02;
 const f=list.slice().sort((a,b)=>pr(a)-pr(b)).slice(0,6);if(!f.length)return'';
 return `<div class="cards">${f.map(e=>{const c1=e.h.color||LGN[e.lg].color,c2=e.a.color||'#111';
  return `<button class="fc" style="background:linear-gradient(150deg,${c1} 0%,${c1} 45%,${c2} 100%)" onclick="openM('${e.lg}','${esc(e.id)}')"><span class="lg">${esc(LGN[e.lg].name)}</span>
  <span class="crs">${crest(e.h.logo,e.h.ab)}${crest(e.a.logo,e.a.ab)}</span>
  <span><span class="sc">${e.state==='pre'?hm(e.date):esc(e.h.sc)+'-'+esc(e.a.sc)}</span><span class="nm" style="display:block">${esc(e.h.nm)}<br>${esc(e.a.nm)}</span><span class="st">${statusTxt(e)}</span></span></button>`}).join('')}</div>`}
const rc=n=>n?`<i class="rc" aria-label="${n} kırmızı kart">${n>1?n:''}</i>`:'';
function mrow(e,showLg){const lv=e.state==='in',fav=followsMatch(e.id,e.lg);
 const mid=e.state==='pre'?`<div class="mid">${hm(e.date)}<small>Başlamadı</small></div>`:`<div class="mid ${lv?'lv':''}">${esc(e.h.sc)} - ${esc(e.a.sc)}<small>${statusTxt(e)}</small>${e.ht?`<small class="ht">İY ${esc(e.ht)}</small>`:''}</div>`;
 const o=`onclick="openM('${e.lg}','${esc(e.id)}')"`;
 return `<div class="mr ${lv?'lv':''}">${showLg?`<span class="ml">${esc(LGN[e.lg].name)}</span>`:''}<button class="tm" ${o}>${crest(e.h.logo,e.h.ab)}<span>${esc(e.h.nm)}${rc(e.h.red)}</span></button><button ${o} aria-label="Maç detayı">${mid}</button><button class="tm" ${o}>${crest(e.a.logo,e.a.ab)}<span>${esc(e.a.nm)}${rc(e.a.red)}</span></button><button class="star ${fav?'on':''}" aria-label="${fav?'Takipten çıkar':'Maçı takip et'}" aria-pressed="${fav}" onclick="togM('${esc(e.id)}','${e.lg}')">${svg(ic.star,fav?'currentColor':'none')}</button></div>`}
function grouped(list){return LEAGUES.map(([lg,n])=>{const ms=list.filter(e=>e.lg===lg);if(!ms.length)return'';
 return `<div class="lgb"><div class="lgh">${n}<span class="mut" style="margin-left:auto;font-weight:600">${ms.length} maç</span></div>${ms.sort((a,b)=>a.date-b.date).map(e=>mrow(e)).join('')}</div>`}).join('')}
function listing(list){
 if(V.q){const q=V.q.toLocaleLowerCase('tr');list=list.filter(e=>(e.h.nm+' '+e.a.nm+' '+LGN[e.lg].name).toLocaleLowerCase('tr').includes(q))}
 if(!list.length)return '';
 if(S.sort==='saat')return `<div class="lgb">${list.slice().sort((a,b)=>a.date-b.date).map(e=>mrow(e,1)).join('')}</div>`;
 const trm=list.filter(e=>!isDS(e.lg)&&!['tur.1','as-tr'].includes(e.lg)&&(isTR(e.h)||isTR(e.a)));const rest=list.filter(e=>!trm.includes(e));
 return (trm.length?`<div class="lgb trb"><div class="lgh"><i class="trdot"></i>Türk takımları<span class="mut" style="margin-left:auto;font-weight:600">${trm.length} maç</span></div>${trm.sort((a,b)=>a.date-b.date).map(e=>mrow(e,1)).join('')}</div>`:'')+grouped(rest)}

// These leagues are external federation links, not yet integrated live data.
const TR_FED=[['Trendyol 1. Lig','142'],['Nesine 2. Lig','976'],['Nesine 3. Lig','971']];
function trFederationLinks(){return '<div class="card" style="margin:12px 0"><div class="lgh">Türkiye alt ligleri · TFF</div><p class="mut" style="padding:8px 12px">Alt lig verisi şu anda alınamadığında resmi kaynağı kullanabilirsin. Resmi fikstür ve puan cetvelini aç:</p>'+TR_FED.map(([n,id])=>'<a class="row" style="color:inherit;text-decoration:none" target="_blank" rel="noopener noreferrer" href="https://www.tff.org/Default.aspx?pageID='+id+'">'+esc(n)+'<span>↗</span></a>').join('')+'</div>'}
function matchOfficials(j){
 const sets=[j.gameInfo?.officials,j.boxscore?.gameInfo?.officials,j.header?.competitions?.[0]?.officials];
 const found=new Map();
 for(const list of sets){if(!Array.isArray(list))continue;for(const o of list){
  const name=String(o.displayName||o.fullName||o.name||o.official?.displayName||o.official?.fullName||'').trim();
  if(!name)continue;
  const role=String(o.position?.name||o.position?.displayName||o.role?.name||(typeof o.role==='string'?o.role:'')||'Hakem');
  const k=name+'|'+role;if(!found.has(k))found.set(k,{name,role});
 }}return [...found.values()];
}
function officialRows(j,lg){
 const os=matchOfficials(j);
 if(os.length)return os.map(o=>'<span>'+esc(ROLE[o.role]||o.role)+'</span><b>'+esc(o.name)+(validRemote(j.refereeId)&&o.name===j.refereeName?'<button class="pill" onclick="openEntityProfile(\'referee\',\''+esc(j.refereeId)+'\')">Hakem profili</button>':'')+'</b>').join('');
 return '<span>Hakem</span><b>'+(j.dsOfficialPending?'Hakem bilgisi sorgulanıyor…':'Veri kaynağında bulunamadı')+(lg==='tur.1'?'<br><a style="font-size:12px;color:inherit;text-decoration:underline" target="_blank" rel="noopener noreferrer" href="https://www.tff.org/default.aspx?pageID=328">TFF hakem ve maç bilgileri ↗</a>':'')+'</b>';
}

function planCard(date){return `<div class="card stat"><i></i><span>${date?'Ücretsiz veri planı nedeniyle diğer Avrupa basketbol ligleri bu tarih için gösterilemiyor. NBA, EuroLeague ve EuroCup verileri varsa gösterilir.':'Bu ligin puan durumu mevcut ücretsiz veri planında sunulmuyor.'}</span></div>`}
function nokeyCard(){return `<div class="card stat"><i></i><span>Diğer Avrupa basketbol ligleri için API-Basketball erişimi henüz yapılandırılmadı. NBA, EuroLeague, EuroCup ve NCAA verileri varsa gösterilir.</span></div>`}
function liveState(){if(D.state==='ok')return `<p class="mut" style="text-align:center;margin:-4px 0 12px">${actL().length} lig · son güncelleme ${hm(D.at)} · ${D.ev.some(e=>e.state==='in')?'30 sn':'2 dk'}da bir yenilenir</p>`;
 if(D.state==='off')return `<div class="card stat"><i></i><span>Canlı veriye ulaşılamadı. Bağlantını kontrol edip yeniden dene.</span></div>`;
 return `<div class="card stat"><i></i><span>Maçlar yükleniyor…</span></div>`}
function filtered(){const all=D.ev;return V.filt==='live'?all.filter(e=>e.state==='in'):V.filt==='fav'?all.filter(isFav):V.filt==='done'?all.filter(e=>e.state==='post'):all}
function listBody(){const L=listing(filtered());
 const empty=D.state==='ok'?`<div class="card empty"><p class="mut">${V.q?'Aramana uyan maç yok.':V.filt==='live'?'Şu an oynanan maç yok.':V.filt==='fav'?'Takip ettiğin maç yok. Maçların yanındaki yıldıza dokun.':'Bu tarihte seçili liglerde maç yok.'}</p></div>`:'';
 return `${liveState()}${S.sport==='basketball'?(D.asOff==='nokey'?nokeyCard():D.asOff==='plan_limit'?planCard(true):['upstream','err'].includes(D.asOff)?'<div class="card stat"><i></i><span>Diğer Avrupa basketbol ligleri şu anda alınamadı. Daha sonra tekrar dene.</span></div>':''):''}${S.sport==='soccer'?`<p class="mut" style="margin:8px 4px">Türkiye alt ligleri: normalde 20 dakikada bir, takipli canlı maçlarda daha sık sorgulanır; kota dolarsa eski veri kalabilir. ${D.dsOff?'Alt lig verisi şu anda alınamadı.':''}</p>`:''}${L||empty}${S.sport==='soccer'&&D.dsOff?trFederationLinks():''}`}
function setQ(v){V.q=v;const l=$('#lst');if(l)l.innerHTML=listBody()}
function setSort(k){S.sort=k;save();render()}
function home(){if(D.state==='idle')setTimeout(loadDay);
 const live=D.ev.filter(e=>e.state==='in');
 return `${topBar('Tribün')}${sportBar()}${dates()}${featured(D.ev)}
 <div class="seg" role="tablist">${[['all','Tümü'],['live',`Canlı${live.length?' ('+live.length+')':''}`],['done','Biten'],['fav','Takip']].map(([k,l])=>`<button role="tab" aria-selected="${V.filt===k}" class="${V.filt===k?'on':''}" onclick="go({filt:'${k}'})">${l}</button>`).join('')}</div>
 <div class="tools"><input id="q" class="srch" type="search" placeholder="Takım veya lig ara" value="${esc(V.q)}" oninput="setQ(this.value)" aria-label="Takım veya lig ara"><div class="sortt" role="group" aria-label="Sıralama">${[['lig','Lig'],['saat','Saat']].map(([k,l])=>`<button class="${S.sort===k?'on':''}" aria-pressed="${S.sort===k}" onclick="setSort('${k}')">${l}</button>`).join('')}</div></div>
 <div id="lst">${listBody()}</div>`}
function openM(lg,id){go({match:{lg,id}})}
function openT(lg,id){if(isAS(lg)){toast('Bu ligin takım profili henüz veri kaynağında bağlı değil.');return;}go({team:{lg,id}})}
async function loadTeam(lg,id){const k=lg+id;D.tm[k]={loading:1};if(isDS(lg)){const j=await dsApi({action:'team',league:lg,id});const fallback=(Array.isArray(D.stand[lg])?D.stand[lg].flatMap(g=>g.rows).find(t=>t.id===id):null)||(id==='990000172700'?{nm:'Bursaspor',logo:'https://cdn.datasportsapi.com/v2/teams/172700/logo'}:null);const t=j?.team||fallback;D.tm[k]=t?{ev:(j?.events||[]).map(e=>({...dsEvent(e),lgSlug:e.lg,lgName:LGN[e.lg]?.name||''})).sort((a,b)=>a.date-b.date),ros:[],info:{nm:t.nm,logo:t.logo},slg:lg}:{failed:1};if(t)D.tn[id]=t.nm;if(D.stand[lg]==null&&lg!=='ds-cup'){D.stand[lg]='loading';loadStand(lg)}if(V.team?.id===id)render();return}const base=`site/v2/sports/${sp(lg)}/${lg}/teams/${id}/`;
 const dom=!isB(lg)&&lg!=='tur.1'&&D.tr.has(String(id))?'tur.1':null;const db=`site/v2/sports/soccer/tur.1/teams/${id}/`;
 const [a,b,r,c2,d2]=await Promise.all([api(base+'schedule'),isB(lg)?null:api(base+'schedule?fixture=true'),api(base+'roster'),dom?api(db+'schedule'):null,dom?api(db+'schedule?fixture=true'):null]);
 const mp=e=>{const c=(e.competitions||[])[0]||{};const cs=c.competitors||[];const s=k=>{const t=cs.find(x=>x.homeAway===k)||{};const tt=t.team||{};return{id:String(tt.id||''),nm:tt.shortDisplayName||tt.displayName||'',logo:((tt.logos||[])[0]||{}).href||tt.logo||'',sc:t.score&&typeof t.score==='object'?(t.score.displayValue??''):(t.score??'')}};
  const stt=(c.status||{}).type||{};return{id:String(e.id),date:new Date(e.date),state:stt.state||'pre',short:stt.shortDetail||'',h:s('home'),a:s('away'),lgName:(e.league||{}).name||'',lgSlug:(e.league||{}).slug||''}};
 const evs=[a,b,c2,d2].flatMap(x=>(x&&x.events)||[]).map(mp);const seen=new Set();const all=evs.filter(e=>!seen.has(e.id)&&seen.add(e.id)).sort((x,y)=>x.date-y.date);
 let ath=(r&&r.athletes)||[];if(ath.length&&ath[0].items)ath=ath.flatMap(g=>g.items||[]);
 const t=(a&&a.team)||(r&&r.team)||{};
 D.tm[k]={ev:all,ros:ath,info:{nm:t.displayName||D.tn[id]||'',logo:t.logo||((t.logos||[])[0]||{}).href||'',color:col(t.color)},slg:dom||lg,failed:!a&&!r};
 if(D.tn&&t.displayName)D.tn[id]=t.shortDisplayName||t.displayName;
 const sl=dom||lg;if(D.stand[sl]==null){D.stand[sl]='loading';loadStand(sl)}
 if(V.team&&V.team.id===id)render()}
const PG={Goalkeeper:'Kaleciler',Defender:'Defans',Midfielder:'Orta saha',Forward:'Forvet',Guard:'Guard',Center:'Pivot'};
function teamV(){const {lg,id}=V.team;const d=D.tm[lg+id]||{loading:1};const B=isB(lg);
 const top=`<button class="back" onclick="history.length>1?history.back():go({tab:'home'})">${svg(ic.back)} Geri</button>`;
 if(d.loading)return top+`<div class="card empty"><p class="mut">Takım yükleniyor…</p></div>`;
 if(d.failed)return top+`<div class="card empty"><p class="mut">Takım verisine ulaşılamadı.</p></div>`;
 const nm=d.info.nm||D.tn[id]||'';const fol=followsTeam(id,lg);
 const hero=`<div class="hero" style="background:linear-gradient(150deg,${d.info.color||LGN[lg].color},#111)"><div class="mut" style="color:rgba(255,255,255,.85);font-weight:800;letter-spacing:.5px;text-transform:uppercase">${esc(LGN[d.slg||lg].name)}</div>
  <div style="margin-top:10px">${crest(d.info.logo,'')}<h1 style="font-size:30px;margin-top:8px">${esc(nm)}</h1></div>
  <button class="pill" style="width:auto;margin:10px auto 0;padding:9px 16px;background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.35);color:#fff;font-size:10px" onclick="togT('${esc(id)}','${lg}')">${fol?'✓ Takip ediliyor':'+ Takip et'}</button></div>`;
 const tabs=[['fik','Fikstür'],['kad','Kadro'],['pd','Puan durumu'],['form','Form'],['inj','Sakatlıklar'],...(isDS(lg)?[['trf','Transferler']]:[])];let body='';
 if(V.ttab==='fik'){const past=d.ev.filter(e=>e.state==='post').slice(-10).reverse(),next=d.ev.filter(e=>e.state!=='post').slice(0,8);
  const res=e=>{const me=e.h.id===id?e.h:e.a,op=e.h.id===id?e.a:e.h;const x=+me.sc,y=+op.sc;return e.state!=='post'||isNaN(x)?'':x>y?'<i class="wl W">G</i>':x<y?'<i class="wl L">M</i>':'<i class="wl D">B</i>'};
  const row=e=>{const ok=LGN[e.lgSlug]?e.lgSlug:lg;return `<button class="fx" onclick="openM('${ok}','${esc(e.id)}')"><span class="fd">${e.date.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit'})}<small>${esc(e.lgName)}</small></span><span class="fh">${esc(e.h.nm)}</span><b>${e.state==='pre'?hm(e.date):esc(e.h.sc)+' - '+esc(e.a.sc)}</b><span class="fa">${esc(e.a.nm)}</span>${res(e)}</button>`};
  body=(next.length?`<h2 style="text-align:left;margin-top:4px">Gelecek maçlar</h2><div class="card">${next.map(row).join('')}</div>`:'')+(past.length?`<h2 style="text-align:left">Son maçlar</h2><div class="card">${past.map(row).join('')}</div>`:'')||`<div class="card empty"><p class="mut">Fikstür bilgisi yok.</p></div>`}
 else if(V.ttab==='form')body=formUI(d,id);
 else if(V.ttab==='inj')body=injuriesUI(lg,id);
 else if(V.ttab==='trf')body=teamTransfersUI(id);
 else if(V.ttab==='kad'&&isDS(lg))body=dsSquad(id);
 else if(V.ttab==='kad'){const grp={};for(const p of d.ros){const pn=(p.position||{}).name||(p.position||{}).displayName||'Diğer';(grp[pn]=grp[pn]||[]).push(p)}
  const order=['Goalkeeper','Defender','Midfielder','Forward'];const keys=Object.keys(grp).sort((a,b)=>(order.indexOf(a)+1||9)-(order.indexOf(b)+1||9));
  body=keys.length?keys.map(k=>`<h2 style="text-align:left;margin-top:6px">${esc(PG[k]||k)}</h2><div class="card">${grp[k].map(p=>`<div class="pl"><b>${esc(p.jersey||'')}</b><span>${esc(p.displayName||p.fullName||'')}</span><em>${p.age?esc(p.age)+' yaş':''}${p.citizenship?' · '+esc(p.citizenship):''}</em></div>`).join('')}</div>`).join(''):`<div class="card empty"><p class="mut">Kadro bilgisi yok.</p></div>`}
 else{const st=D.stand[d.slg||lg];if(!st||st==='loading')body=`<div class="card empty"><p class="mut">Puan durumu yükleniyor…</p></div>`;else if(!Array.isArray(st))body=`<div class="card empty"><p class="mut">Puan durumu yok.</p></div>`;
  else{const g=st.find(x=>x.rows.some(r=>r.id===id))||st[0];body=`<div class="card" style="padding:4px 10px"><table><tr><th>#</th><th>${esc(g.name)}</th>${B?'<th>G</th><th>M</th><th>%</th>':'<th>O</th><th>AV</th><th>P</th>'}</tr>${g.rows.map((r,i)=>`<tr class="${r.id===id?'me':''}"><td>${B&&g.source!=='TBF'?i+1:(r.rank||i+1)}</td><td><span class="tn">${crest(r.logo,'')}${esc(r.nm)}</span></td>${B?`<td>${r.w}</td><td>${r.l}</td><td>${esc(r.pct)}</td>`:`<td>${r.p}</td><td>${r.gd>0?'+':''}${r.gd}</td><td>${r.pts}</td>`}</tr>`).join('')}</table></div>`}}
 return `${top}${hero}${isDS(lg)?'<p class="mut" style="margin:8px 4px">DataSportsAPI · Alt lig bildirimleri veri ve kota durumuna bağlıdır.</p>':''}<div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${V.ttab===k}" class="${V.ttab===k?'on':''}" onclick="go({ttab:'${k}'})">${l}</button>`).join('')}</div>${body}`}
function togM(id,lg){if(isB(lg)){const k=basketKey(lg,id);S.bfm=S.bfm.includes(k)?S.bfm.filter(x=>x!==k):[...S.bfm,k].slice(-200);save();render();return}const i=S.fm.indexOf(id);if(i<0){S.fm.push(id);if(LGN[lg])S.fml[id]=lg;toast('Maç takipte.')}else if(lg&&S.fml[id]&&S.fml[id]!==lg){S.fml[id]=lg;toast('Maç takipte.')}else{S.fm.splice(i,1);delete S.fml[id]}S.fm=S.fm.slice(-200);save();render()}
function togT(id,lg){if(isB(lg)){const k=basketKey(lg,id);if(S.bft.includes(k)){S.bft=S.bft.filter(x=>x!==k);delete S.bftn[k]}else{S.bft=[...S.bft,k].slice(-200);S.bftn[k]=D.tn[id]||id}save();render();return}const nm=D.tn[id]||(S.ftn||{})[id]||'Takım';const i=S.ft.indexOf(id);if(i<0){S.ft.push(id);S.ftn=Object.assign(S.ftn||{},{[id]:nm});if(lg)S.ftl[id]=lg;toast(nm+' takip ediliyor')}else {S.ft.splice(i,1);if(S.teamNoticePrefs)delete S.teamNoticePrefs[id]}save();render()}
const ROLE={'Referee':'Orta hakem','Assistant Referee':'Yardımcı hakem','Linesman':'Yardımcı hakem','Fourth Official':'4. hakem','4th Official':'4. hakem','Video Assistant Referee':'VAR','VAR':'VAR','Assistant VAR':'AVAR','Assistant Video Assistant Referee':'AVAR','Umpire':'Hakem','Crew Chief':'Başhakem'};
const BSTL=[['fieldGoalPct','Saha içi %','%'],['threePointFieldGoalPct','Üçlük %','%'],['freeThrowPct','Serbest atış %','%'],['totalRebounds','Ribaund'],['offensiveRebounds','Hücum ribaundu'],['assists','Asist'],['steals','Top çalma'],['blocks','Blok'],['turnovers','Top kaybı'],['fastBreakPoints','Hızlı hücum sayısı'],['pointsInPaint','Boyalı alan sayısı'],['fouls','Faul'],['largestLead','En büyük fark']];
const LDN={points:'Sayı',rebounds:'Ribaund',assists:'Asist'};
const SCAT=[['gen','Genel',[['possessionPct','Topla oynama','%'],['totalShots','Şut'],['shotsOnTarget','İsabetli şut'],['wonCorners','Korner'],['offsides','Ofsayt'],['saves','Kurtarış']]],
 ['pas','Pas',[['totalPasses','Pas'],['accuratePasses','İsabetli pas'],['passPct','Pas isabeti','%'],['totalCrosses','Orta'],['accurateCrosses','İsabetli orta'],['totalLongBalls','Uzun top'],['accurateLongBalls','İsabetli uzun top']]],
 ['huc','Hücum',[['totalShots','Şut'],['shotsOnTarget','İsabetli şut'],['shotPct','Şut isabeti','%'],['blockedShots','Engellenen şut'],['penaltyKickGoals','Penaltı golü'],['penaltyKickShots','Penaltı atışı'],['wonCorners','Korner'],['offsides','Ofsayt']]],
 ['sav','Savunma',[['totalTackles','Top kapma denemesi'],['effectiveTackles','Başarılı top kapma'],['tacklePct','Top kapma başarısı','%'],['interceptions','Pas arası'],['totalClearance','Uzaklaştırma'],['saves','Kurtarış']]],
 ['dis','Faul ve kart',[['foulsCommitted','Faul'],['yellowCards','Sarı kart'],['redCards','Kırmızı kart']]]];
const BXL={MIN:'Dk',PTS:'Sy',REB:'Rib',AST:'Ast',FG:'Sİ',['3PT']:'3S',FT:'SA',STL:'TÇ',BLK:'Blk',TO:'TK',PF:'Fa','+/-':'+/-'};
function boxTable(j,T,H,A){const tp=((j.boxscore||{}).players||[]);const tt=tp.find(x=>String((x.team||{}).id)===T.id)||tp[V.kside==='away'?1:0];
 const seg=`<div class="seg">${[['home',H],['away',A]].map(([k,t])=>`<button class="${V.kside===k?'on':''}" onclick="go({kside:'${k}'})">${esc(t.nm)}</button>`).join('')}</div>`;
 const st=tt&&(tt.statistics||[])[0];if(!st||!(st.athletes||[]).length)return seg+`<div class="card empty"><p class="mut">Oyuncu istatistikleri maç başlayınca gelir.</p></div>`;
 const names=st.names||st.labels||[];const cols=['MIN','PTS','REB','AST','FG','3PT','FT','STL','BLK','TO','PF','+/-'].map(n=>[n,names.indexOf(n)]).filter(x=>x[1]>=0);
 const ath=st.athletes.slice().sort((a,b)=>(b.starter?1:0)-(a.starter?1:0));
 const row=a=>{const nm=esc((a.athlete||{}).shortName||(a.athlete||{}).displayName||'');if(a.didNotPlay||!(a.stats||[]).length)return `<tr class="dnp"><td>${nm}</td><td colspan="${cols.length}">Oynamadı</td></tr>`;
  return `<tr${a.starter?' class="st5"':''}><td>${nm}</td>${cols.map(([n,i])=>`<td${n==='PTS'?' class="pt"':''}>${esc(a.stats[i]??'')}</td>`).join('')}</tr>`};
 const tot=st.totals||[];
 return seg+`<div class="card scroll"><table class="box"><tr><th>Oyuncu</th>${cols.map(([n])=>`<th>${BXL[n]||n}</th>`).join('')}</tr>${ath.map(row).join('')}${tot.length?`<tr class="tot"><td>Toplam</td>${cols.map(([n,i])=>`<td>${esc(tot[i]??'')}</td>`).join('')}</tr>`:''}</table></div>
 <p class="mut" style="margin-top:8px">Dk: süre · Sy: sayı · Rib: ribaund · Ast: asist · Sİ: saha içi · 3S: üçlük · SA: serbest atış · TÇ: top çalma · Blk: blok · TK: top kaybı · Fa: faul. Kalın satırlar ilk beş.</p>`}
const LINE=ab=>{ab=String(ab||'').toUpperCase();if(ab==='G'||ab==='GK')return 0;if(/^AM/.test(ab))return 4;if(/^DM/.test(ab))return 2;if(/^(CD|CB|LB|RB|SW|LWB|RWB|D)/.test(ab))return 1;if(/^(CM|LM|RM|M)/.test(ab))return 3;if(/^(F|CF|ST|LW|RW|SS|LF|RF|W)/.test(ab))return 5;return 3};
const SIDE=ab=>{ab=String(ab||'').toUpperCase();if(/^(LB|LWB|LM|LW|LF|L)$/.test(ab))return 0;if(/-L$/.test(ab))return 1;if(/^(RB|RWB|RM|RW|RF|R)$/.test(ab))return 4;if(/-R$/.test(ab))return 3;return 2};
const subMin=p=>(((p.plays||[]).find(x=>x.substitution)||{}).clock||{}).displayValue||'';
function pitch(r){const ro=((r||{}).roster||[]).filter(p=>p.starter);if(ro.length<11)return '';
 const rows=[0,1,2,3,4,5].map(l=>ro.filter(p=>LINE((p.position||{}).abbreviation)===l).sort((a,b)=>SIDE((a.position||{}).abbreviation)-SIDE((b.position||{}).abbreviation)||(+a.formationPlace||0)-(+b.formationPlace||0))).filter(x=>x.length).reverse();
 return `<div class="pitch" role="img" aria-label="${esc((r.team||{}).displayName||'')} dizilişi ${esc(r.formation||'')}"><div class="pfx">${esc(r.formation||'')}</div>${rows.map(rw=>`<div class="prow">${rw.map(p=>`<div class="pp"><b>${esc(p.jersey||'')}</b><span>${esc(((p.athlete||{}).shortName||(p.athlete||{}).displayName||'').replace(/^\S+\.\s/,''))}</span>${p.subbedOut?`<em>🔽 ${esc(subMin(p))}</em>`:''}</div>`).join('')}</div>`).join('')}</div>`}
function statBars(j,list,H,A){const bt=((j.boxscore||{}).teams||[]);const g=(t,n)=>{const s=((t||{}).statistics||[]).find(x=>x.name===n);return s?parseFloat(s.displayValue):null};
 const th=bt.find(t=>t.homeAway==='home')||bt[0],ta=bt.find(t=>t.homeAway==='away')||bt[1];
 const rows=list.map(([n,l,u])=>{const a=g(th,n),b=g(ta,n);if(a==null&&b==null)return'';const sum=(a||0)+(b||0)||1;const f=v=>v==null||isNaN(v)?'-':(u?Math.round(v>0&&v<=1&&n!=='possessionPct'?v*100:v)+u:Math.round(v*10)/10);
  return `<div class="sb"><div class="v"><span>${f(a)}</span><span>${l}</span><span>${f(b)}</span></div><div class="bar"><i class="a" style="flex:${(a||0)/sum||.001}"></i><i class="b" style="flex:${(b||0)/sum||.001}"></i></div></div>`}).join('');
 return rows?`<div class="card">${rows}</div><p class="mut" style="margin-top:8px;text-align:center">Siyah: ${esc(H.nm)} · Turuncu: ${esc(A.nm)}</p>`:`<div class="card empty"><p class="mut">İstatistikler maç başlayınca gelir.</p></div>`}
function detail(){const {lg,id}=V.match;const j=D.sum[id];const e=D.ev.find(x=>x.id===id);const B=isB(lg);
 const hc=((j&&j.header||{}).competitions||[])[0]||{};const cs=hc.competitors||[];
 const side=k=>{const c=cs.find(x=>x.homeAway===k)||{};const t=c.team||{};const ev=e?e[k==='home'?'h':'a']:{};
  return{id:String(t.id||ev.id||''),nm:t.shortDisplayName||t.displayName||ev.nm||'',ab:t.abbreviation||ev.ab||'',logo:((t.logos||[])[0]||{}).href||ev.logo||'',sc:c.score??ev.sc??'',color:col(t.color)||ev.color,form:c.form||t.form||'',rec:((c.record||[])[0]||{}).summary||ev.rec||'',ls:(c.linescores||[]).map(x=>x.displayValue??x.value).filter(x=>x!=null).length?(c.linescores||[]).map(x=>x.displayValue??x.value):(ev.ls||[])}};
 const H=side('home'),A=side('away');D.tn[H.id]=H.nm;D.tn[A.id]=A.nm;const stt=(hc.status||{}).type||{};
 const state=stt.state||(e&&e.state)||'pre';const lv=state==='in';
 const subTxt=lv?`<span class="lvb" style="color:#fff">${esc(B?trS(stt.shortDetail||(e&&e.short)||'',lg):((hc.status||{}).displayClock||(e&&e.clock)||''))}</span>`:esc(trS(stt.shortDetail||(e&&e.short)||'',lg));
 const when=hc.date?new Date(hc.date):e&&e.date;
 const top=`<button class="back" onclick="go({match:null})">${svg(ic.back)} Geri</button>`;
 if(!j&&!e)return top+`<div class="card empty"><p class="mut">Maç yükleniyor…</p></div>`;
 if(j&&j.failed&&!e)return top+`<div class="card empty"><p class="mut">Maç verisine ulaşılamadı.</p></div>`;
 const form=f=>f?`<div class="form">${f.slice(-5).split('').map(c=>`<i class="${c}">${{W:'G',D:'B',L:'M'}[c]||c}</i>`).join('')}</div>`:'';
 const extra=t=>B?(t.rec?`<div class="mut" style="color:rgba(255,255,255,.85);margin-top:4px">${esc(t.rec)}</div>`:''):form(t.form);
 const tlink=(t,inner)=>!isAS(lg)&&t.id?`<button class="tl" onclick="openT('${lg}','${esc(t.id)}')" aria-label="${esc(t.nm)} takım sayfası">${inner}</button>`:inner;
 const hero=`<div class="hero" style="background:linear-gradient(150deg,${H.color||LGN[lg].color},${A.color||'#111'})"><div class="mut" style="color:rgba(255,255,255,.85);font-weight:800;letter-spacing:.5px;text-transform:uppercase">${esc(LGN[lg].name)}${when?' · '+when.toLocaleDateString('tr-TR',{day:'numeric',month:'long'}):''}</div>
 <div class="g3"><div>${tlink(H,crest(H.logo,H.ab)+`<div class="tn">${esc(H.nm)}</div>`)}${extra(H)}</div><div><div class="s">${state==='pre'&&when?hm(when):esc(H.sc)+'-'+esc(A.sc)}</div><div style="font-size:12px;font-weight:700;margin-top:4px">${state==='pre'?'Başlamadı':subTxt}</div></div><div>${tlink(A,crest(A.logo,A.ab)+`<div class="tn">${esc(A.nm)}</div>`)}${extra(A)}</div></div>
 <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">${[H,A].map(t=>t.id?`<button class="pill" style="width:auto;margin:0;padding:9px 14px;background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.35);color:#fff;font-size:10px" onclick="togT('${esc(t.id)}','${lg}')">${followsTeam(t.id,lg)?'✓ ':'+ '}${esc(t.nm)}</button>`:'').join('')}</div></div>`;
 const tabs=isDS(lg)?[['bil','Bilgi'],['kad','Kadro'],['oyn','Oyuncu istatistikleri'],['eksik','Eksikler']]:isAS(lg)?(['as-el','as-ec'].includes(lg)&&/^el[eu]20\d{2}\d{1,4}$/.test(id)?[['ozet','Özet'],['oyn','Oyuncular'],['ist','İstatistik'],['bil','Bilgi']]:[['ozet','Özet']]):B?[['ozet','Özet'],['oyn','Oyuncular'],['ist','İstatistik'],['h2h','Karşılaştırma'],['bil','Bilgi']]:[['ozet','Özet'],['ist','İstatistik'],['kad','Kadro'],['anl','Anlatım'],['h2h','Karşılaştırma'],['bil','Bilgi']];
 if(!tabs.some(t=>t[0]===V.dtab))V.dtab=tabs[0][0];
 let body='';
 if(!j)body=`<div class="card empty"><p class="mut">Ayrıntılar yükleniyor…</p></div>`;
 else if(isDS(lg)&&['kad','oyn','eksik'].includes(V.dtab))body=dsLineupsUI(id,V.dtab,H,A);
 else if(V.dtab==='ozet'&&B){const n=Math.max(H.ls.length,A.ls.length);
  const q=n?`<div class="card" style="padding:4px 0;margin-bottom:10px;overflow-x:auto"><table class="qt"><tr><th class="mut">Takım</th>${Array.from({length:n},(_,i)=>`<th class="mut">${lg==='mens-college-basketball'?(i<2?(i+1)+'. Y':'U'+(i-1)):(i<4?(i+1)+'.':'U'+(i-3))}</th>`).join('')}<th>T</th></tr>${[H,A].map(t=>`<tr><td><b>${esc(t.ab||t.nm)}</b></td>${Array.from({length:n},(_,i)=>`<td>${esc(t.ls[i]??'-')}</td>`).join('')}<td><b>${esc(t.sc)}</b></td></tr>`).join('')}</table></div>`:'';
  const ld=j.leaders||[];const lh=ld.find(x=>String((x.team||{}).id)===H.id)||ld[0]||{},la=ld.find(x=>String((x.team||{}).id)===A.id)||ld[1]||{};
  const get=(x,k)=>{const c=(x.leaders||[]).find(y=>y.name===k);const l=c&&(c.leaders||[])[0];return l?{v:l.displayValue||'',n:(l.athlete||{}).shortName||(l.athlete||{}).displayName||''}:null};
  const lrows=Object.keys(LDN).map(k=>{const a=get(lh,k),b=get(la,k);if(!a&&!b)return'';return `<div class="ld"><span><b>${esc(a?a.v:'-')}</b>${esc(a?a.n:'')}</span><span class="c">${LDN[k]}</span><span class="r"><b>${esc(b?b.v:'-')}</b>${esc(b?b.n:'')}</span></div>`}).join('');
  body=q+(lrows?`<h2 style="text-align:left;margin-top:6px">Maçın liderleri</h2><div class="card">${lrows}</div>`:'');
  if(!q&&!lrows)body=`<div class="card empty"><p class="mut">${state==='pre'?'Maç henüz başlamadı.':'Ayrıntı yok.'}</p></div>`}
 else if(V.dtab==='ozet'){const ke=(j.keyEvents||[]).filter(k=>/goal|card|substitution|penalty/i.test((k.type||{}).text||''));
  const evs=ke.length?ke.map(k=>{const ps=(k.participants||[]).map(p=>(p.athlete||{}).displayName||'');return{t:(k.type||{}).text||'',min:(k.clock||{}).displayValue||'',who:ps[0]||'',x:ps[1]||'',team:String((k.team||{}).id||'')}}):(e?e.det:[]);
  const mn=x=>parseInt(String(x))||0;let hx=0,hy=0;for(const d of evs)if(/goal/i.test(d.t)&&mn(d.min)<=45){if(d.team===H.id)hx++;else if(d.team===A.id)hy++}
  const htv=(e&&e.ht)||(hx+'-'+hy);let sep=false;
  const icn=t=>/own goal/i.test(t)?'⚽ (k.k.)':/goal|penalty - scored/i.test(t)?'⚽':/red/i.test(t)?'🟥':/yellow/i.test(t)?'🟨':/substitution/i.test(t)?'🔁':'•';
  body=evs.length?`<div class="card">${evs.map(d=>{const home=d.team===H.id;const sub=/substitution/i.test(d.t);const g=/goal/i.test(d.t)&&!/own/i.test(d.t);
   const txt=sub?`🔼 ${esc(d.who)}${d.x?`<small>🔽 ${esc(d.x)}</small>`:''}`:`${icn(d.t)} ${esc(d.who||d.t)}${g&&d.x?`<small>Asist: ${esc(d.x)}</small>`:''}`;
   let pre='';if(!sep&&mn(d.min)>45&&state!=='pre'){sep=true;pre=`<div class="evs">İlk yarı ${esc(htv)}</div>`}
   return pre+`<div class="ev"><span class="l">${home?txt:''}</span><span class="m">${esc(d.min)}</span><span class="r">${home?'':txt}</span></div>`}).join('')}</div>`:`<div class="card empty"><p class="mut">${state==='pre'?'Maç henüz başlamadı.':'Henüz önemli olay yok.'}</p></div>`}
 else if(V.dtab==='ist')body=B?statBars(j,BSTL,H,A):`<div class="chips">${SCAT.map(([k,l])=>`<button class="${V.scat===k?'on':''}" onclick="go({scat:'${k}'})">${l}</button>`).join('')}</div>${statBars(j,(SCAT.find(x=>x[0]===V.scat)||SCAT[0])[2],H,A)}`;
 else if(V.dtab==='oyn')body=j.statsUnavailable?`<div class="card empty"><p class="mut">Oyuncu verisi şu anda alınamadı. Daha sonra tekrar dene.</p></div>`:boxTable(j,V.kside==='away'?A:H,H,A);
 else if(V.dtab==='kad'){const rs=j.rosters||[];
  const col1=r=>{if(!r)return'<div class="card empty"><p class="mut">Kadro yok</p></div>';const ro=r.roster||[];const st=ro.filter(p=>p.starter).sort((a,b)=>(+a.formationPlace||99)-(+b.formationPlace||99)),sb=ro.filter(p=>!p.starter);
   const pl=p=>`<div class="pl"><b>${esc(p.jersey||'')}</b><span>${esc((p.athlete||{}).shortName||(p.athlete||{}).displayName||'')}${p.subbedIn?` <small class="in">🔼 ${esc(subMin(p))}</small>`:''}${p.subbedOut?` <small class="out">🔽 ${esc(subMin(p))}</small>`:''}</span><em>${esc((p.position||{}).abbreviation||'')}</em></div>`;
   return `<div class="card" style="padding:6px 0"><div class="lgh" style="padding-top:6px">${esc((r.team||{}).abbreviation||'')}${r.formation?' · '+esc(r.formation):''}</div>${st.map(pl).join('')}${sb.length?`<div class="lgh">Yedekler</div>${sb.map(pl).join('')}`:''}</div>`};
  const rsel=rs.find(r=>r.homeAway===V.kside)||rs[0];
  body=rs.length?`<div class="seg">${[['home',H],['away',A]].map(([k,t])=>`<button class="${V.kside===k?'on':''}" onclick="go({kside:'${k}'})">${esc(t.nm)}</button>`).join('')}</div>${pitch(rsel)}<div style="margin-top:10px">${col1(rsel)}</div>`:`<div class="card empty"><p class="mut">Kadrolar genellikle maçtan yaklaşık bir saat önce açıklanır.</p></div>`}
 else if(V.dtab==='anl'){const cm=(j.commentary||[]).slice().reverse().slice(0,80);
  body=cm.length?`<div class="card">${cm.map(c=>{const tr=trC(c.text||'');return `<div class="cm"><b>${esc((c.time||{}).displayValue||'')}</b><span>${tr?esc(tr):`${esc(c.text||'')} <span class="mut">(çevrilemedi)</span>`}</span></div>`}).join('')}</div>`:`<div class="card empty"><p class="mut">Bu maç için anlatım yok.</p></div>`}
 else if(V.dtab==='h2h'){const ss=((j.seasonseries||[]).find(s=>/head|season/i.test(s.type||''))||(j.seasonseries||[])[0]||{}).events||[];const nm=idx=>idx===H.id?H.nm:idx===A.id?A.nm:'';
  let wH=0,wA=0,dr=0;const rows=ss.slice(0,10).map(x=>{const c=x.competitors||[];const c1=c[0]||{},c2=c[1]||{};const s1=+c1.score,s2=+c2.score;const t1=String((c1.team||{}).id||''),t2=String((c2.team||{}).id||'');
   if(c1.score==null||c2.score==null){}else if(s1===s2)dr++;else{const w=s1>s2?t1:t2;if(w===H.id)wH++;else if(w===A.id)wA++}
   return `<div class="cm"><b style="width:44px;color:var(--mut);font-weight:600">${x.date?new Date(x.date).getFullYear():''}</b><span style="flex:1">${esc(nm(t1)||(c1.team||{}).abbreviation||'')} <strong>${esc(c1.score??'')}-${esc(c2.score??'')}</strong> ${esc(nm(t2)||(c2.team||{}).abbreviation||'')}<br><span class="mut">${esc(x.competitionName||x.shortName||'')}</span></span></div>`}).join('');
  body=rows?`<div class="card" style="display:grid;grid-template-columns:repeat(${B?2:3},1fr);text-align:center;padding:14px;margin-bottom:10px"><div><div class="an" style="font-size:28px">${wH}</div><span class="mut">${esc(H.nm)}</span></div>${B?'':`<div><div class="an" style="font-size:28px">${dr}</div><span class="mut">Beraberlik</span></div>`}<div><div class="an" style="font-size:28px">${wA}</div><span class="mut">${esc(A.nm)}</span></div></div><div class="card">${rows}</div>`:`<div class="card empty"><p class="mut">Geçmiş karşılaşma verisi yok.</p></div>`}
 else{if(!B&&!isDS(lg)&&!j.dsOfficialPending&&!j.dsOfficialDone&&!j.dsOfficialAttempted){j.dsOfficialAttempted=true;setTimeout(()=>enrichOfficials(j,lg,id),0)}const gi=(j.boxscore||{}).gameInfo||j.gameInfo||{};const vn=gi.venue||{};
  body=`<div class="card info">${(j.coaches||[]).map(c=>`<span>${esc(c.team)} · ${j.currentManagers||j.ds?'Güncel teknik direktör':'Antrenör'}</span><b>${esc(c.name)}</b>`).join('')}<span>${B?'Salon':'Stadyum'}</span><b>${esc(vn.fullName||(e&&e.venue)||'-')}</b><span>Şehir</span><b>${esc(((vn.address||{}).city)||'-')}</b><span>Seyirci</span><b>${gi.attendance?Number(gi.attendance).toLocaleString('tr-TR'):'-'}</b>${officialRows(j,lg)}${broadcastRows(j)}<span>Başlama</span><b>${when?when.toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}):'-'}</b></div>`}
 return `${top}${hero}<div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${V.dtab===k}" class="${V.dtab===k?'on':''}" onclick="go({dtab:'${k}'})">${l}</button>`).join('')}</div>${body}`}
function hasLeaders(lg){return !isDS(lg)&&(!isB(lg)||lg==='nba')}
async function loadLeaders(lg){
 D.lead[lg]='loading';
 try{const r=await fetch('/api/leaders?league='+encodeURIComponent(lg));const j=await r.json();D.lead[lg]=r.ok&&Array.isArray(j.categories)?j:'off'}catch{D.lead[lg]='off'}
 if(V.tab==='std')render();
}
function leaderBody(lg){
 if(D.lead[lg]==null){D.lead[lg]='loading';setTimeout(()=>loadLeaders(lg))}
 const x=D.lead[lg];
 if(x==='loading')return '<div class="card empty"><p class="mut">Oyuncu sıralamaları yükleniyor…</p></div>';
 if(x==='off')return '<div class="card empty"><p class="mut">Oyuncu sıralamasına ulaşılamadı.</p><button class="pill" onclick="retryLeaders()">Tekrar dene</button></div>';
 if(!x.categories.length)return '<div class="card empty"><p class="mut">ESPN bu lig için sezon liderleri verisi sunmuyor.</p></div>';
 const i=Math.min(V.lcat,x.categories.length-1),c=x.categories[i],nba=lg==='nba';
 const chips=x.categories.length>1?'<div class="seg">'+x.categories.map((t,k)=>'<button class="'+(k===i?'on':'')+'" onclick="go({lcat:'+k+'})">'+esc(t.title)+'</button>').join('')+'</div>':'';
 return chips+'<p class="mut" style="margin:8px 4px">'+esc(x.season)+' · ESPN'+(nba?' · Maç başına sayı':'')+'</p><div class="card" style="padding:4px 10px"><table><tr><th>#</th><th>Oyuncu</th><th>Maç</th><th>'+esc(c.unit)+'</th></tr>'+c.rows.map((r,k)=>'<tr><td>'+(k+1)+'</td><td><span class="tn">'+crest(r.logo,'')+'<span>'+esc(r.name)+'<small class="mut" style="display:block">'+esc(r.team)+'</small></span></span></td><td>'+esc(r.games??'-')+'</td><td><b>'+esc(nba?Number(r.value).toFixed(1):r.value)+'</b></td></tr>').join('')+'</table></div>';
}
function retryLeaders(){loadLeaders(S.sport==='basketball'?S.slgB:S.slg)}
function standNav(lg){
 if(!hasLeaders(lg))return '';
 return '<div class="seg"><button class="'+(V.stab==='stand'?'on':'')+'" onclick="go({stab:\'stand\'})">Puan durumu</button><button class="'+(V.stab==='lead'?'on':'')+'" onclick="go({stab:\'lead\',lcat:0})">'+(isB(lg)?'Sayı krallığı':'Gol krallığı')+'</button></div>';
}

function std(){const B=S.sport==='basketball';const lg=B?S.slgB:S.slg;if(lg==='ds-cup')return topBar('Puan durumu')+sportBar()+'<div class="chips">'+actL().map(([k,n])=>'<button class="'+(lg===k?'on':'')+'" onclick="setSL(\''+k+'\')">'+esc(n)+'</button>').join('')+'</div><div class="card empty">Türkiye Kupası eleme organizasyonudur; lig puan tablosu yok.</div>';if(V.stab==='lead'&&hasLeaders(lg))return `${topBar('Puan durumu')}${sportBar()}<div class="chips">${actL().map(([k,n])=>`<button class="${lg===k?'on':''}" onclick="setSL('${k}')">${n}</button>`).join('')}</div>${standNav(lg)}${leaderBody(lg)}`;if(D.stand[lg]==null){D.stand[lg]='loading';setTimeout(()=>loadStand(lg))}
 const st=D.stand[lg];let body;
 if(st==='loading')body=`<div class="card empty"><p class="mut">Puan durumu yükleniyor…</p></div>`;
 else if(st==='off')body=`<div class="card empty"><p class="mut">Bu lig için puan durumuna ulaşılamadı.</p></div>`;
 else if(st==='nokey')body=nokeyCard();
 else if(st==='plan_limit')body=planCard(false);
 else if(st==='no_data')body=`<div class="card empty"><p class="mut">Bu lig için puan durumu mevcut veri kaynağında bulunmuyor.</p></div>`;
 else{const gi=Math.min(V.grp,st.length-1);const g=st[gi];
  const head=B?(g.source==='TBF'?`<th>O</th><th>G</th><th>M</th><th>AV</th><th>P</th>`:`<th>G</th><th>M</th><th>%</th><th>${g.as?'AV':'FARK'}</th>`):'<th>O</th><th>G</th><th>B</th><th>M</th><th>AV</th><th>P</th>';
  const cells=r=>B?(g.source==='TBF'?`<td>${r.p}</td><td>${r.w}</td><td>${r.l}</td><td>${r.gd>0?'+':''}${r.gd}</td><td><b>${r.pts}</b></td>`:`<td>${r.w}</td><td>${r.l}</td><td>${esc(r.pct)}</td><td>${esc(r.gb||'-')}</td>`):`<td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gd>0?'+':''}${r.gd}</td><td>${r.pts}</td>`;
  const hasN=g.rows.some(r=>r.note);const legend=[...new Map(g.rows.filter(r=>r.note).map(r=>[r.note.d,r.note.c])).entries()];
  body=`${g.source==='DataSportsAPI'?`<p class="mut" style="margin:8px 4px">Kaynak: DataSportsAPI · ${esc(g.season||'')}</p>`:''}${g.source==='TBF'?`<p class="mut" style="margin:8px 4px">Kaynak: TBF · ${esc(g.season||'')}${g.week?' · '+esc(g.week)+'. hafta':''}</p>`:''}${st.length>1?`<div class="chips">${st.map((x,i)=>`<button class="${i===gi?'on':''}" onclick="go({grp:${i}})">${esc(x.name.replace(/^Grup /,''))}</button>`).join('')}</div>`:''}
  <div class="card" style="padding:4px 10px"><table><tr><th>#</th><th>${esc(g.name)}</th>${head}</tr>${g.rows.map((r,i)=>{const cl=hasN?(r.note&&/^#[0-9a-f]{6}$/i.test(r.note.c)?r.note.c:'transparent'):(i<(B?6:st.length>1?2:4)?'var(--ok)':'transparent');const ar=r.chg>0?'<i class="up">▲</i>':r.chg<0?'<i class="dn">▼</i>':'';const cl2=r.id&&!isAS(lg)?` onclick="openT('${lg}','${esc(r.id)}')" class="trc"`:'';
   return `<tr${cl2}><td style="box-shadow:inset 3px 0 ${cl}">${B?i+1:(r.rank||i+1)}${ar}</td><td><span class="tn">${crest(r.logo,'')}${esc(r.nm)}</span></td>${cells(r)}</tr>`}).join('')}</table></div>
  ${legend.length?`<div class="legend">${legend.map(([d,c])=>`<span><i style="background:${/^#[0-9a-f]{6}$/i.test(c)?c:'#ccc'}"></i>${esc(ZONE(d))}</span>`).join('')}</div>`:''}`}
 return `${topBar('Puan durumu')}${sportBar()}<div class="chips">${actL().map(([k,n])=>`<button class="${lg===k?'on':''}" onclick="setSL('${k}')">${n}</button>`).join('')}</div>${standNav(lg)}${leagueDirectory(lg)}${body}${isDS(lg)&&st==='no_data'?trFederationLinks():''}`}
const ZT={'champions league':'Şampiyonlar Ligi','champions league qualifying':'Şampiyonlar Ligi elemeleri','europa league':'Avrupa Ligi','europa league qualifying':'Avrupa Ligi elemeleri','conference league qualifying':'Konferans Ligi elemeleri','europa conference league qualifying':'Konferans Ligi elemeleri','conference league':'Konferans Ligi','relegated':'Küme düşme','relegation':'Küme düşme','relegation playoff':'Küme düşme play-off','relegation play-off':'Küme düşme play-off','promotion':'Üst lige çıkış','promoted':'Üst lige çıkış','promotion playoff':'Play-off (çıkış)','playoffs':'Play-off','play-in':'Play-in','round of 16':'Son 16','knockout round playoffs':'Play-off turu','next round':'Üst tur','copa libertadores':'Libertadores','copa sudamericana':'Sudamericana','eliminated':'Elendi'};
const ZONE=d=>ZT[String(d||'').toLowerCase()]||d;
function setSL(k){if(isB(k))S.slgB=k;else S.slg=k;V.grp=0;V.lcat=0;if(!hasLeaders(k))V.stab='stand';save();render()}
function favs(){if(D.state==='idle')setTimeout(loadDay);const ms=D.ev.filter(isFav);const tn=S.ftn||{};const bTeams=S.bft.map(k=>{const i=k.indexOf(':');return{lg:k.slice(0,i),id:k.slice(i+1),name:S.bftn[k]||k}}).filter(t=>LGN[t.lg]);
 return `${topBar('Favoriler')}${sportBar()}<h2 style="text-align:left;margin-top:4px">Takip ettiğin takımlar</h2>
 ${S.sport==='basketball'?(bTeams.length?`<div class="card">${bTeams.map(t=>`<div class="row"><button style="flex:1;text-align:left" onclick="openT('${t.lg}','${esc(t.id)}')">${esc(t.name)} <small class="mut">${esc(LGN[t.lg].name)}</small></button><button class="mut" onclick="togT('${esc(t.id)}','${t.lg}')">Çıkar</button></div>`).join('')}</div>`:emptyBox('Henüz takip ettiğin basketbol takımı yok.')):S.ft.length?`<div class="card">${S.ft.map(id=>`<div class="row">${S.ftl[id]&&LGN[S.ftl[id]]?`<button style="text-align:left;flex:1;min-height:44px;font-weight:600" onclick="openT('${S.ftl[id]}','${esc(id)}')">${esc(tn[id]||id)} <span class="mut">›</span></button>`:`<span>${esc(tn[id]||id)}</span>`}<button class="mut" style="min-height:44px" onclick="togT('${esc(id)}')">Çıkar</button></div>`).join('')}</div>`:`<div class="card empty"><p class="mut">Henüz takım yok. Bir maçı açıp takım adının yanındaki + düğmesine dokun.</p></div>`}
 <h2 style="text-align:left">${V.off===0?'Bugün':dayAt(V.off).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})} takip ettiğin maçlar</h2>
 ${ms.length?grouped(ms):`<div class="card empty"><p class="mut">Seçili günde takip ettiğin maç yok.</p></div>`}
 ${!(S.notif&&window.TribunPush?.active())?`<button class="pill k" onclick="askNotif()">Maç bildirimlerini aç</button>`:''}`}
async function askNotif(){try{await window.TribunPush.enable(S);S.notif=1;save();toast('Kapalıyken de maç bildirimleri açık.')}catch(e){toast(e.message||'Bildirim izni alınamadı.')}render()}
async function testNotif(){toast('Test bildirimi 8 saniye içinde gönderilecek. Şimdi ana ekrana dönebilirsin.');try{await window.TribunPush.test();toast('Test bildirimi gönderildi.')}catch(e){toast(e.message||'Test bildirimi gönderilemedi.')}}
async function stopNotif(){S.notif=0;save();try{await window.TribunPush.disable();toast('Maç bildirimleri kapalı.')}catch(e){toast('Cihazda kapatıldı; sunucu kaydı silinemedi.')}render()}
function wc(){return `<button class="back" onclick="go({tab:'std'})">${svg(ic.back)} Puan durumu</button><h1 style="margin:4px 0 4px">Dünya Kupası 2026</h1><p class="mut" style="margin-bottom:12px">Arşiv · Şampiyon İspanya · Final 19 Temmuz 2026, MetLife Stadyumu</p>
 <div class="lgb">${WC.map(m=>`<div class="mr" style="grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr)"><span class="tm">${WCN[m[1]]}</span><div class="mid">${m[3]} - ${m[4]}<small>${m[0]}</small></div><span class="tm">${WCN[m[2]]}</span>${m[5]?`<span class="mut" style="grid-column:1/-1;margin-top:4px">${esc(m[5])}</span>`:''}</div>`).join('')}</div>
 <h2 style="text-align:left">Gol krallığı</h2><div class="card">${SCORERS.map((s,i)=>`<div class="row"><span><b style="color:var(--or)">${i+1}.</b> ${s[0]} <span class="mut">· ${s[1]}</span></span><span class="an" style="font-size:22px">${s[2]}</span></div>`).join('')}</div>`}
function profile(){const head=S.user?`<div class="av">${esc(S.user[0].toUpperCase())}</div><h1 style="font-size:32px">${esc(S.user)}</h1><button class="mut" style="text-decoration:underline;min-height:44px" onclick="editName()">Adı düzenle</button>`
 :`<div class="av">?</div><h1 style="font-size:32px">Misafir</h1><p class="mut" style="margin:6px 0 4px">Adını bu cihaza kaydetmek için profil oluştur.</p><button class="pill k" onclick="editName()">Profil oluştur</button>`;
 return `<div style="text-align:center;margin:12px 0 18px">${head}</div><div class="card" style="display:grid;grid-template-columns:1fr 1fr;text-align:center;padding:14px"><div><div class="an" style="font-size:28px">${S.ft.length+S.bft.length}</div><span class="mut">Takım</span></div><div><div class="an" style="font-size:28px">${S.fm.length+S.bfm.length}</div><span class="mut">Takip edilen maç</span></div></div>
 <div class="card" style="margin-top:14px"><button class="row" onclick="go({tab:'fav'})">Favoriler<span>›</span></button><button class="row" onclick="go({tab:'sync'})">Favorileri eşitle<span>›</span></button><button class="row" onclick="go({tab:'search'})">Arama merkezi<span>›</span></button><button class="row" onclick="go({tab:'news'})">Spor haberleri<span>›</span></button><button class="row" onclick="go({tab:'wc'})">Arşiv: Dünya Kupası 2026<span>›</span></button><button class="row" onclick="openHistory()">Bildirim geçmişi<span>›</span></button><button class="row" onclick="go({tab:'set'})">Bildirimler ve ayarlar<span>›</span></button></div>`}
function editName(){modal(`<h1 style="font-size:30px">${S.user?'Adı düzenle':'Profil oluştur'}</h1><form onsubmit="event.preventDefault();const v=$('#nn').value.trim();if(!v)return toast('Bir ad yaz');S.user=v;save();closeM();render()"><input id="nn" value="${esc(S.user||'')}" maxlength="24" placeholder="Adın" autocomplete="nickname"><button class="pill k">Kaydet</button></form><p class="mut" style="margin-top:10px">Bilgiler yalnızca bu cihazda saklanır.</p>`);setTimeout(()=>$('#nn')?.focus(),50)}
const L={g:['Gizlilik politikası','Profil adın yalnızca bu cihazda saklanır. Arka plan bildirimlerini açarsan cihazın Web Push aboneliği ile takip ettiğin maç ve takım kimlikleri ile bildirim tercihleri sunucuda saklanır. İsteğe bağlı favori eşitlemesinde yalnızca takip listesi ve takım adları, gizli kodla erişilen sunucu kaydında 90 gün tutulur. Son 100 alınan bildirim bu cihazda saklanır ve geçmiş ekranından silinebilir. Bildirimleri kapatabilir veya verilerini silebilirsin. Kullanılmayan kayıtlar 90 gün sonra temizlenir. Skor verileri ESPN\'in kamuya açık verisinden alınır.'],s:['Kullanım şartları','Skor ve istatistikler bilgilendirme amaçlıdır; bahis veya ticari amaçla kullanılamaz. Tribün; ESPN, FIFA, UEFA, NBA, EuroLeague ya da herhangi bir lig ile bağlantılı değildir. Takım logoları sahiplerine aittir.']};
function legal(k){modal(`<h1 style="font-size:30px">${L[k][0]}</h1><p style="margin:12px 0;font-size:15px">${L[k][1]}</p><button class="pill" onclick="closeM()">Kapat</button>`)}
let prefBusy=false;
async function toggleNotice(k){
 if(prefBusy||!NOTICE_OPTIONS.some(x=>x[0]===k))return;
 const old=Object.fromEntries(NOTICE_OPTIONS.map(([id])=>[id,noticeEnabled(id)]));
 S.noticePrefs={...old,[k]:!old[k]};prefBusy=true;save();render();
 try{await window.TribunPush?.syncNow(S);toast('Bildirim tercihi kaydedildi.')}
 catch(e){S.noticePrefs=old;save();toast('Tercih sunucuya kaydedilemedi. Tekrar dene.')}
 finally{prefBusy=false;render()}
}

let teamSetting='',historyRows=null,historyError=false,historyLoading=false;
function teamSettingUI(){
 const teams=S.ft.filter(id=>/^\d+$/.test(id)&&!isB(S.ftl[id]));
 if(!teams.length)return '<p class="mut" style="margin:8px 4px">Takım bazlı ayar için önce bir futbol takımını takip et.</p>';
 if(!teams.includes(teamSetting))teamSetting=teams[0];
 const id=teamSetting,custom=S.teamNoticePrefs?.[id];
 return '<h2 style="text-align:left;margin:16px 0 6px">Takım bazlı bildirimler</h2><div class="card"><select aria-label="Takım seç" style="width:100%;min-height:44px;background:var(--card);color:inherit" onchange="selectNoticeTeam(this.value)">'+teams.map(t=>'<option value="'+esc(t)+'" '+(t===id?'selected':'')+'>'+esc(S.ftn?.[t]||D.tn[t]||t)+'</option>').join('')+'</select><button class="sw '+(custom?'on':'')+'" role="switch" aria-checked="'+!!custom+'" onclick="toggleTeamCustom()" '+(prefBusy?'disabled':'')+'>Bu takım için özel tercihler<i></i></button>'+(custom?NOTICE_OPTIONS.map(([k,n])=>'<button class="sw '+(custom[k]?'on':'')+'" role="switch" aria-checked="'+!!custom[k]+'" onclick="toggleTeamNotice(\''+k+'\')" '+(prefBusy?'disabled':'')+'>'+esc(n)+'<i></i></button>').join(''):'<p class="mut" style="padding:8px">Genel bildirim tercihleri kullanılıyor.</p>')+'</div><p class="mut" style="margin:8px 4px">Ayrıca yıldızladığın maçlar genel tercihleri de kullanır. Bir maç iki takipli takımı içeriyorsa her birinin açık olayları birleşir.</p>';
}
function selectNoticeTeam(id){teamSetting=id;render()}
async function changeTeamPrefs(update){
 if(prefBusy||!S.ft.includes(teamSetting))return;
 const old=S.teamNoticePrefs||{},next={...old};update(next,teamSetting);S.teamNoticePrefs=next;prefBusy=true;save();render();
 try{await window.TribunPush?.syncNow(S);toast('Takım tercihi kaydedildi.')}
 catch{S.teamNoticePrefs=old;save();toast('Tercih kaydedilemedi. Tekrar dene.')}
 finally{prefBusy=false;render()}
}
function toggleTeamCustom(){changeTeamPrefs((next,id)=>{if(next[id])delete next[id];else next[id]=Object.fromEntries(NOTICE_OPTIONS.map(([k])=>[k,noticeEnabled(k)]))})}
function toggleTeamNotice(k){if(!NOTICE_OPTIONS.some(x=>x[0]===k))return;changeTeamPrefs((next,id)=>{if(next[id])next[id]={...next[id],[k]:!next[id][k]}})}
async function loadHistory(){
 if(historyLoading)return;historyLoading=true;historyError=false;
 try{historyRows=await window.TribunHistory.list()}catch{historyRows=[];historyError=true}
 finally{historyLoading=false;if(V.tab==='hist')render()}
}
function openHistory(){historyRows=null;go({tab:'hist'});loadHistory()}
async function clearHistory(){try{await window.TribunHistory.clear();historyRows=[];render();toast('Bildirim geçmişi temizlendi.')}catch{toast('Geçmiş temizlenemedi.')}}
function historyPage(){
 if(historyRows===null&&!historyLoading)setTimeout(loadHistory);
 const entries=historyRows||[];
 return '<button class="back" onclick="go({tab:\'usr\'})">'+svg(ic.back)+' Profil</button><h1>Bildirim geçmişi</h1><p class="mut" style="margin:8px 4px">Bu cihazda alınan son 100 push bildirimi. Daha eski bildirimler gösterilmez.</p><div style="display:flex;gap:8px"><button class="pill" onclick="loadHistory()">Yenile</button><button class="pill" onclick="go({tab:\'set\'})">Ayarlar</button>'+(entries.length?'<button class="pill r" onclick="clearHistory()">Temizle</button>':'')+'</div>'+
 (historyError?'<div class="card empty">Geçmişe erişilemedi.</div>':historyRows===null?'<div class="card empty">Yükleniyor…</div>':!entries.length?'<div class="card empty"><p class="mut">Henüz bu cihazda alınan bildirim yok.</p></div>':entries.map(x=>'<div class="card" style="margin:8px 0;padding:12px"><a href="'+esc(x.url||'/#favori')+'" style="color:inherit;text-decoration:none;display:block"><b>'+esc(x.title)+'</b><p style="white-space:pre-line;margin:6px 0">'+esc(x.body)+'</p><small class="mut">'+esc(new Date(x.at).toLocaleString('tr-TR'))+'</small></a></div>').join(''));
}


const BASKET_OPTIONS=[['start','Maç başlangıcı'],['half','Devre arası'],['period','Çeyrek / periyot sonu'],['end','Maç sonucu'],['reminder','Maçtan 15 dk önce']];
const basketEnabled=k=>typeof S.basketPrefs?.[k]==='boolean'?S.basketPrefs[k]:k==='end';
async function toggleBasket(k){
 if(prefBusy||!BASKET_OPTIONS.some(x=>x[0]===k))return;
 const old=Object.fromEntries(BASKET_OPTIONS.map(([id])=>[id,basketEnabled(id)]));S.basketPrefs={...old,[k]:!old[k]};prefBusy=true;save();render();
 try{await window.TribunPush?.syncNow(S);toast('Basketbol tercihi kaydedildi.')}catch{S.basketPrefs=old;save();toast('Tercih kaydedilemedi.')}finally{prefBusy=false;render()}
}
function basketSettings(){
 return '<h2 style="text-align:left">Basketbol bildirimleri</h2><div class="card">'+BASKET_OPTIONS.map(([k,n])=>'<button class="sw '+(basketEnabled(k)?'on':'')+'" role="switch" aria-checked="'+basketEnabled(k)+'" '+(prefBusy?'disabled':'')+' onclick="toggleBasket(\''+k+'\')">'+esc(n)+'<i></i></button>').join('')+'</div><p class="mut" style="margin:8px 4px">NBA, WNBA ve NCAA: kaynakta görülen maç başlangıcı, devre/periyot sonu ve sonuç. EuroLeague / EuroCup: doğrulanabilen başlangıç, sonuç ve hatırlatma. Diğer basketbol liglerinin bildirim verisi henüz bağlı değil.</p>';
}

function settings(){return `<button class="back" onclick="go({tab:'usr'})">${svg(ic.back)} Profil</button><h1 style="margin-bottom:14px">Ayarlar</h1>${themeUI()}
 <div class="card"><button class="sw ${S.notif&&window.TribunPush?.active()?'on':''}" role="switch" aria-checked="${!!(S.notif&&window.TribunPush?.active())}" onclick="${S.notif&&window.TribunPush?.active()?'stopNotif()':'askNotif()'}">Maç bildirimleri (takip edilen karşılaşmalar)<i></i></button></div>
 <h2 style="text-align:left;margin:16px 0 6px">Bildirim türleri</h2>
 <div class="card">${NOTICE_OPTIONS.map(([k,n])=>`<button class="sw ${noticeEnabled(k)?'on':''}" role="switch" aria-checked="${noticeEnabled(k)}" ${prefBusy?'disabled':''} onclick="toggleNotice('${k}')">${n}<i></i></button>`).join('')}</div>
 <p class="mut" style="margin:8px 4px">Seçtiğin olaylar takip ettiğin futbol maçları için gönderilir. Türkiye alt liglerinde ücretsiz kota ve veri kapsamı nedeniyle gecikme veya eksik olay olabilir. VAR yalnızca veri kaynağı açıkça bildirdiğinde; skor düşüşü ise düzeltme olarak gösterilir.</p>
 ${teamSettingUI()}
 ${basketSettings()}
 <button class="pill" onclick="openHistory()">Bildirim geçmişi</button>
 ${S.notif&&window.TribunPush?.active()?`<button class="pill" onclick="testNotif()">Test bildirimi gönder (8 sn)</button>`:''}
 <div class="card" style="margin-top:10px"><button class="sw ${S.sound?'on':''}" role="switch" aria-checked="${!!S.sound}" onclick="S.sound=S.sound?0:1;save();if(S.sound)beep();render()">Uygulama içi gol sesi<i></i></button></div>
 <p class="mut" style="margin:8px 4px 14px">Takip edilen desteklenen futbol ve basketbol maçları için arka plan bildirimlerini aç. İlk kez etkinleştirirken tarayıcı izni gerekir.</p>
 <div class="card"><button class="row" onclick="legal('g')">Gizlilik politikası<span>›</span></button><button class="row" onclick="legal('s')">Kullanım şartları<span>›</span></button></div>
 ${S.user||S.fm.length||S.ft.length||S.bfm.length||S.bft.length?'<button class="pill r" onclick="askDel()">Verilerimi sil</button>':''}`}
function askDel(){modal(`<h1 style="font-size:30px">Veriler silinsin mi?</h1><p style="margin:12px 0">Profil adın, takip ettiğin maç ve takımlar bu cihazdan kalıcı olarak silinir.</p><button class="pill r" onclick="delAll()">Sil</button><button class="pill" onclick="closeM()">Vazgeç</button>`)}
async function delAll(){if(S.syncCode){try{await syncFavorites('delete',S.syncCode)}catch{toast('Bulut kaydı silinemedi.');return}}try{await window.TribunPush?.disable()}catch(e){toast('Sunucu kaydı silinemedi; bağlantını kontrol et.');return}try{await window.TribunHistory?.clear();historyRows=[]}catch{toast('Bildirim geçmişi silinemedi. Tekrar dene.');return}try{localStorage.removeItem('tribun');localStorage.removeItem('mm2')}catch(e){}for(const k of Object.keys(S))delete S[k];Object.assign(S,{fm:[],ft:[],ftl:{},fml:{},bfm:[],bft:[],bftn:{},sort:'lig',sport:'soccer',slg:'tur.1',slgB:'nba',seen:1});applyTheme();save();closeM();go({tab:'usr'})}
Object.assign(window,{toggleBasket,XQuery,searchType,runSearch,openLeague,openEntityProfile,entityExtra,loadDirectory,selectNews,loadNews,loadTransfers,retryDetail,setTheme,generateSync,copySync,syncAction,setQ,setSort,openT,go,menu,closeM,enterApp,setDay,setSport,openM,togM,togT,setSL,retryLeaders,askNotif,stopNotif,testNotif,toggleNotice,selectNoticeTeam,toggleTeamCustom,toggleTeamNotice,openHistory,loadHistory,clearHistory,editName,legal,askDel,delAll,toast,save,render,beep,S,$});
const r0=readHash();if(r0){V.splash=false;Object.assign(V,r0);if(V.match){S.sport=sp(V.match.lg);loadSum(V.match.lg,V.match.id)}if(V.team){S.sport=sp(V.team.lg);loadTeam(V.team.lg,V.team.id)}}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(!S.theme||S.theme==='system')applyTheme()});
if(migrateBasket())save();
loadTR();
window.TribunPush?.sync(S,true);
render();
if(!V.splash){if(!location.hash)history.replaceState(null,'','#'+hashFor());loadDay()}
}
