// Opt-in background notifications. Profile names never leave the device.
(()=>{
 const KEY='tribun-push-device',ACTIVE='tribun-push-active';let timer,last='',queue=Promise.resolve();
 const storage={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}},remove:k=>{try{localStorage.removeItem(k)}catch{}}};
 const supported=()=> 'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
 function token(){let t=storage.get(KEY);if(!t){t=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');storage.set(KEY,t)}return t}
 const kinds=['goal','start','half','end','red','reminder','lineup','var','cancel'];
 const prefs=p=>Object.fromEntries(kinds.map(k=>[k,typeof p?.[k]==='boolean'?p[k]:k==='goal']));
 const basketL=['nba','wnba','mens-college-basketball','as-el','as-ec'];
 const allB=lg=>basketL.includes(lg)||String(lg||'').startsWith('as-');
 const bkeys=(ids,ls)=>ids.filter(id=>basketL.includes(ls?.[id])).map(id=>ls[id]+':'+id);
 const values=s=>({fm:(s.fm||[]).filter(id=>!allB(s.fml?.[id])&&!/^el[eu]/.test(id)).map(String),ft:(s.ft||[]).filter(id=>!allB(s.ftl?.[id])).map(String),bfm:bkeys(s.fm||[],s.fml),bft:bkeys(s.ft||[],s.ftl),bprefs:Object.fromEntries(['start','half','end','reminder','period'].map(k=>[k,typeof s.basketPrefs?.[k]==='boolean'?s.basketPrefs[k]:k==='end'])),prefs:prefs(s.noticePrefs),teamPrefs:Object.fromEntries((s.ft||[]).filter(id=>!allB(s.ftl?.[id])&&s.teamNoticePrefs?.[id]).map(id=>[id,prefs(s.teamNoticePrefs[id])]))});
 const key=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),x=>x.charCodeAt(0));
 function serial(f){const n=queue.then(f,f);queue=n.catch(()=>{});return n}
 async function request(a,b){const r=await fetch('/api/push?action='+a,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b),keepalive:a==='test'||a==='subscribe'});if(!r.ok)throw Error('Bildirim sunucusuna ulaşılamadı ('+r.status+').');return r.json()}
 async function enable(s){
  if(!supported())throw Error('Bu tarayıcı arka plan bildirimlerini desteklemiyor. iPhone’da ana ekrandan aç.');
  // Request permission directly within the click event.
  if(await Notification.requestPermission()!=='granted')throw Error('Bildirim izni verilmedi.');
  return serial(async()=>{
   const r=await fetch('/api/push?action=config',{cache:'no-store'}),c=await r.json();
   if(!r.ok||!c.enabled)throw Error('Arka plan bildirim sunucusu henüz hazır değil.');
   await navigator.serviceWorker.register('/sw.js');
   const reg=await navigator.serviceWorker.ready;
   let sub=await reg.pushManager.getSubscription();
   if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key(c.publicKey)});
   const v=values(s);await request('subscribe',{token:token(),subscription:sub.toJSON(),...v});last=JSON.stringify(v);storage.set(ACTIVE,'1');
  });
 }
 function sync(s,force=false){
  if(!storage.get(ACTIVE)||!s.notif||!supported()||Notification.permission!=='granted')return;
  clearTimeout(timer);timer=setTimeout(()=>serial(async()=>{
   if(!storage.get(ACTIVE)||!s.notif)return;
   const v=values(s),sig=JSON.stringify(v);if(!force&&sig===last)return;
   const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
   if(!sub){storage.remove(ACTIVE);return}
   await request('subscribe',{token:token(),subscription:sub.toJSON(),...v});last=sig;
  }).catch(()=>{last=''}),300);
 }
 async function syncNow(s){
  clearTimeout(timer);
  if(!storage.get(ACTIVE)||!s.notif||!supported()||Notification.permission!=='granted')return;
  return serial(async()=>{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(!sub){storage.remove(ACTIVE);throw Error('Bildirimleri yeniden aç.')}const v=values(s);await request('subscribe',{token:token(),subscription:sub.toJSON(),...v});last=JSON.stringify(v)});
 }
 async function disable(){
  clearTimeout(timer);storage.remove(ACTIVE);last='';
  return serial(async()=>{
   const t=storage.get(KEY);
   if(supported()){const reg=await navigator.serviceWorker.getRegistration(),sub=await reg?.pushManager.getSubscription();if(sub)await sub.unsubscribe()}
   if(t)await request('remove',{token:t});
  });
 }
 async function test(){if(!storage.get(ACTIVE))throw Error('Önce bildirimleri aç.');return request('test',{token:token()})}
 window.TribunPush={enable,disable,sync,syncNow,test,active:()=>!!storage.get(ACTIVE)&&supported()&&Notification.permission==='granted'};
})();
