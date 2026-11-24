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
export const ids=a=>[...new Set((Array.isArray(a)?a:[]).filter(x=>typeof x==='string'&&/^\d{1,20}$/.test(x)))].slice(0,200);
export function mapEvent(e,lg){
 const t=e.competitions?.[0]?.competitors||[],h=t.find(x=>x.homeAway==='home'),a=t.find(x=>x.homeAway==='away'),state=e.status?.type?.state;
 if(!h||!a||!/^\d+$/.test(String(e.id))||!/^\d+$/.test(String(h.score))||!/^\d+$/.test(String(a.score))||!['pre','in','post'].includes(state))return null;
 const home=Number(h.score),away=Number(a.score);if(home>50||away>50)return null;
 return {id:String(e.id),lg,state,home,away,hid:String(h.team?.id||''),aid:String(a.team?.id||''),hn:String(h.team?.shortDisplayName||h.team?.displayName||'Ev sahibi').slice(0,80),an:String(a.team?.shortDisplayName||a.team?.displayName||'Deplasman').slice(0,80)};
}
export function isGoal(old,e,now){
 return !!old&&Number.isFinite(old.at)&&now-old.at<=900000&&now>=old.at&&['pre','in'].includes(old.state)&&['in','post'].includes(e.state)&&e.home>=old.home&&e.away>=old.away&&(e.home>old.home||e.away>old.away);
}
export const follows=(s,e)=>s.fm.includes(e.id)||s.ft.includes(e.hid)||s.ft.includes(e.aid);
