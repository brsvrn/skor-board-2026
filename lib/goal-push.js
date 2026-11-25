import {createHash,timingSafeEqual} from 'node:crypto';
export const leagues=['tur.1','uefa.champions','uefa.europa','uefa.europa.conf','eng.1','esp.1','ita.1','ger.1','fra.1','por.1','ned.1','bel.1','sco.1','eng.2','ksa.1','usa.1','bra.1','arg.1','conmebol.libertadores'];
export const hash=s=>createHash('sha256').update(String(s)).digest('hex');
export const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
export const tokenOK=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
export function subscriptionOK(s){
 try{
  if(!s||typeof s.endpoint!=='string'||s.endpoint.length>2000)return false;
  const u=new URL(s.endpoint),h=u.hostname;
  return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&
   (['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(h)||h.endsWith('.push.apple.com')||h.endsWith('.notify.windows.com'))&&
   /^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh)&&/^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth)&&Buffer.from(s.keys.p256dh,'base64url')[0]===4;
 }catch{return false}
}
export const matchIds=a=>[...new Set((Array.isArray(a)?a:[]).filter(x=>typeof x==='string'&&/^(?:\d{1,20}|ds[1-9]\d{0,11})$/.test(x)))].slice(0,200);
export const dsTeam=id=>/^990000[1-9]\d{0,11}$/.test(String(id));
export const ids=a=>[...new Set((Array.isArray(a)?a:[]).filter(x=>typeof x==='string'&&/^\d{1,20}$/.test(x)))].slice(0,200);
export function mapEvent(e,lg){
 const t=e.competitions?.[0]?.competitors||[],h=t.find(x=>x.homeAway==='home'),a=t.find(x=>x.homeAway==='away'),state=e.status?.type?.state;
 if(!h||!a||!/^\d+$/.test(String(e.id))||!['pre','in','post'].includes(state))return null;
 if(state!=='pre'&&(!/^\d+$/.test(String(h.score))||!/^\d+$/.test(String(a.score))))return null;
 const home=state==='pre'?0:Number(h.score),away=state==='pre'?0:Number(a.score);if(home>50||away>50)return null;
 const type=e.status?.type||{},status=String(type.name||'').toUpperCase();
 const half=state==='in'&&(/^(STATUS_HALFTIME|STATUS_HALF_TIME|STATUS_END_OF_FIRST_HALF)$/.test(status)||/^(HT|HALF TIME|HALFTIME)$/i.test(String(type.shortDetail||'').trim()));
 const final=state==='post'&&type.completed===true&&!/CANCEL|POSTPON|ABANDON|SUSPEND|FORFEIT/.test(status);
 const details=e.competitions?.[0]?.details;
 const reds=Array.isArray(details)?[...new Map(details.filter(d=>d.redCard===true||/^(Red Card|Second Yellow Card|Yellow Red Card)$/i.test(d.type?.text||'')).map(d=>{
  const team=String(d.team?.id||''),a=d.athletesInvolved?.[0],player=String(a?.id||''),name=String(a?.displayName||a?.fullName||'').slice(0,100),minute=String(d.clock?.displayValue||'').slice(0,16);
  const key=team+':'+player;
  return [key,{key,team,name,minute,valid:/^\d+$/.test(team)&&/^\d+$/.test(player)}];
 }).filter(([,d])=>d.valid)).values()].slice(0,32):null;
 return {id:String(e.id),lg,state,home,away,half,final,reds,kickoff:Date.parse(e.date||e.competitions?.[0]?.date||''),hid:String(h.team?.id||''),aid:String(a.team?.id||''),hn:String(h.team?.shortDisplayName||h.team?.displayName||'Ev sahibi').slice(0,80),an:String(a.team?.shortDisplayName||a.team?.displayName||'Deplasman').slice(0,80)};
}
export function isGoal(old,e,now){
 return !!old&&Number.isFinite(old.at)&&now-old.at<=900000&&now>=old.at&&['pre','in'].includes(old.state)&&['in','post'].includes(e.state)&&e.home>=old.home&&e.away>=old.away&&(e.home>old.home||e.away>old.away);
}
export const follows=(s,e)=>s.fm.includes(e.id)||s.ft.includes(e.hid)||s.ft.includes(e.aid);

export function shouldScan(old,now,changed=0){
 return !old||!Number.isFinite(old.__nextPoll)||!Number.isFinite(old.__scanAt)||old.__scanAt<changed||now>=old.__nextPoll;
}
export function nextPoll(events,subs,now){
 let next=now+10*60000;
 for(const e of events){
  if(!subs.some(s=>follows(s,e)))continue;
  if(e.state==='in'||(e.state==='pre'&&(!Number.isFinite(e.kickoff)||e.kickoff<now+10*60000)))return now+45000;
  if(e.state==='pre')next=Math.min(next,Math.max(now+45000,e.kickoff-16*60000));
  if(e.state==='pre'&&e.kickoff-now<=16*60000&&subs.some(s=>wants(s,e,'reminder')))return now+45000;
  if(e.state==='pre'&&e.kickoff-now<=90*60000&&subs.some(s=>wants(s,e,'lineup')))next=Math.min(next,now+4*60000);
 }
 return next;
}

export const NOTICE_TYPES=['goal','start','half','end','red','reminder','lineup','var','cancel'];
export function noticePrefs(p){
 const safe=p&&typeof p==='object'&&!Array.isArray(p)?p:{};
 return Object.fromEntries(NOTICE_TYPES.map(k=>[k,typeof safe[k]==='boolean'?safe[k]:k==='goal']));
}
export function matchNotices(old,e,now){
 const seen=Array.isArray(old?.redSeen)?old.redSeen:[];
 const known=Array.isArray(e.reds);
 const redSeen=[...new Set([...seen,...(known?e.reds.map(r=>r.key):[])])].slice(0,64);
 const fresh=!!old&&Number.isFinite(old.at)&&now>=old.at&&now-old.at<=900000;
 const start=!!old?.startSeen||e.state!=='pre';
 const half=!!old?.halfSeen||e.half===true;
 const end=!!old?.endSeen||e.final===true;
 const next={home:e.home,away:e.away,state:e.state,at:now,startSeen:start,halfSeen:half,endSeen:end,redSeen,redKnown:known||old?.redKnown===true};
 const notices=[];
 if(!fresh||old.state==='post'||!['pre','in'].includes(old.state))return {next,notices};
 if(old.state==='pre'&&e.state==='in'&&!old.startSeen&&!e.half)notices.push({kind:'start',key:'start'});
 if(isGoal(old,e,now)&&!(e.state==='post'&&!e.final))notices.push({kind:'goal',key:'goal-'+e.home+'-'+e.away});
 if(e.half&&!old.halfSeen)notices.push({kind:'half',key:'half'});
 // Never backfill a historical red card on first observation or after migrating from a score-only record.
 if(known&&(old.redKnown===true||old.state==='pre')&&(e.state==='in'||e.final)){
  for(const r of e.reds)if(!seen.includes(r.key))notices.push({kind:'red',key:'red-'+r.key,card:r});
 }
 if(e.final&&!old.endSeen&&old.state==='in')notices.push({kind:'end',key:'end'});
 return {next,notices};
}
export function noticePayload(e,n){
 const score=e.hn+' '+e.home+' - '+e.away+' '+e.an;
 const titles={goal:'⚽ GOL!',start:'Maç başladı',half:'Devre arası',end:'Maç sona erdi',red:'🟥 Kırmızı kart',reminder:'Maç yaklaşıyor',lineup:'İlk 11’ler açıklandı',var:'VAR olayı',cancel:n.confirmed?'Gol iptal edildi':'Skor düzeltildi'};
 const player=n.card?.name,team=n.card?.team===e.hid?e.hn:n.card?.team===e.aid?e.an:'';
 const extra=n.kind==='red'?[n.card?.minute,player,team].filter(Boolean).join(' · '):n.kind==='reminder'?'Başlamasına yaklaşık '+n.minutes+' dakika':n.kind==='lineup'?'İki takımın ilk 11’i hazır':n.kind==='cancel'&&!n.confirmed?'Skor azaldı; gol iptali veya veri düzeltmesi olabilir.':n.minute||'';
 return {title:titles[n.kind]+' · '+e.hn+' – '+e.an,body:extra?extra+'\n'+score:score,tag:'tribun-'+e.lg+'-'+e.id+'-'+n.key,url:'/#mac-'+(e.lg.startsWith('ds-')?31+['ds-tr1','ds-tr2','ds-tr3','ds-cup'].indexOf(e.lg):leagues.indexOf(e.lg))+'-'+e.id};
}

export function teamPrefs(raw,ft){
 const out={};for(const id of ft){if(raw&&Object.hasOwn(raw,id)&&raw[id]&&typeof raw[id]==='object'&&!Array.isArray(raw[id]))out[id]=noticePrefs(raw[id]);}return out;
}
export function wants(s,e,kind){
 const global=noticePrefs(s.prefs);
 if(s.fm.includes(e.id)&&global[kind])return true;
 return [e.hid,e.aid].some(id=>s.ft.includes(id)&&(s.teamPrefs?.[id]?noticePrefs(s.teamPrefs[id]):global)[kind]);
}
export function hasNotices(s){
 return Object.values(noticePrefs(s.prefs)).some(Boolean)||Object.values(s.teamPrefs||{}).some(p=>Object.values(noticePrefs(p)).some(Boolean));
}
export function readSummary(j,e){
 const rs=Array.isArray(j?.rosters)?j.rosters:[];
 const lineup=[e.hid,e.aid].every(id=>rs.some(t=>{
  const starters=(Array.isArray(t.roster)?t.roster:[]).filter(r=>r.starter===true).map(r=>String(r.athlete?.id||''));
  return String(t.team?.id)===id&&starters.length===11&&new Set(starters).size===11&&starters.every(x=>/^\d+$/.test(x));
 }));
 const plays=Array.isArray(j?.keyEvents)?j.keyEvents:null;
 const reviews=plays?plays.filter(x=>x.id&&/^(var(?: review| decision| check)?|video assistant referee|goal disallowed|disallowed goal|goal overturned|goal cancelled|goal canceled)$/i.test(String(x.type?.text||'').trim())).map(x=>({
  key:String(x.id).slice(0,80),kind:/disallow|overturn|cancel/i.test(x.type.text)?'cancel':'var',minute:String(x.clock?.displayValue||'').slice(0,16)
 })).slice(0,40):null;
 return {lineup,reviews};
}
export function extraNotices(old,e,now,summary){
 const next={},notices=[];
 const pre=e.state==='pre',until=e.kickoff-now;
 const key=Number.isFinite(e.kickoff)?String(e.kickoff):'';
 next.reminderKey=old?.reminderKey||'';
 if(pre&&key&&until>0&&until<=15*60000&&next.reminderKey!==key){next.reminderKey=key;notices.push({kind:'reminder',key:'reminder-'+key,minutes:Math.max(1,Math.ceil(until/60000))});}
 next.lineupSeen=!!old?.lineupSeen;
 if(pre&&summary?.lineup&&!next.lineupSeen){next.lineupSeen=true;notices.push({kind:'lineup',key:'lineup'});}
 next.summaryAt=summary?now:(old?.summaryAt||0);
 const prev=Array.isArray(old?.reviewSeen)?old.reviewSeen:[];
 const known=Array.isArray(summary?.reviews);
 next.reviewSeen=[...new Set([...prev,...(known?summary.reviews.map(x=>x.key):[])])].slice(0,100);
 next.reviewKnown=known||old?.reviewKnown===true;
 const fresh=old&&Number.isFinite(old.at)&&now>=old.at&&now-old.at<=900000&&old.state==='in'&&(e.state==='in'||e.final);
 const explicit=known&&old?.reviewKnown&&fresh?summary.reviews.filter(x=>!prev.includes(x.key)):[];
 for(const x of explicit)notices.push({kind:x.kind,key:'review-'+x.key,minute:x.minute,confirmed:true});
 if(fresh&&(e.home<old.home||e.away<old.away)&&!explicit.some(x=>x.kind==='cancel')){
  notices.push({kind:'cancel',key:'correction-'+old.home+'-'+old.away+'-'+e.home+'-'+e.away,confirmed:false});
 }
 return {next,notices};
}

export function dsNotices(old,e,now){
 const basic=matchNotices(old,e,now),extra=extraNotices(old,e,now,{lineup:e.lineup,reviews:null});
 const next={...basic.next,...extra.next,varActive:e.varActive,varSequence:old?.varSequence||0};
 const fresh=old&&Number.isFinite(old.at)&&now>=old.at&&now-old.at<=900000;
 let notices=[...basic.notices,...extra.notices];
 if(e.finalResultOnly||old?.state==='pre'&&e.final)notices=notices.filter(n=>['reminder','lineup','end'].includes(n.kind));
 if(old?.state==='pre'&&e.final&&!old.endSeen&&now-old.at<=4*3600000)notices.push({kind:'end',key:'end'});
 if(fresh&&old.state==='in'&&e.state==='in'&&e.varActive&&old.varActive===false){next.varSequence++;notices.push({kind:'var',key:'var-'+next.varSequence});}
 return {next,notices};
}
