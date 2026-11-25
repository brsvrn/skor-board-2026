// Tribün servis çalışanı: önce ağ, bağlantı yoksa son kayıtlı sürüm. Canlı veri (/api/) önbelleğe alınmaz.
importScripts('/history.js');
const C = 'tribun-v20';
const SHELL = ['/', '/index.html', '/app.js', '/projection.js', '/push.js', '/history.js', '/style.css', '/install.js', '/manifest.webmanifest', '/api/icon?s=192&v=2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tribun-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || (u.pathname.startsWith('/api/') && u.pathname !== '/api/icon')) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('/'))));
});

self.addEventListener('push',event=>event.waitUntil((async()=>{
 let p={};try{p=event.data.json()}catch{}
 await self.registration.showNotification(p.title||'Tribün',{body:p.body||'Takip ettiğin maçta yeni gelişme.',icon:'/api/icon?s=192&v=2',tag:p.tag||'tribun-goal',silent:false,renotify:true,data:{url:p.url||'/#favori'}});
 try{await self.TribunHistory.add(p)}catch{}
})()));
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const u=new URL(event.notification.data?.url||'/#favori',self.location.origin);
  if(u.origin!==self.location.origin)return;
  for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:true}))if(new URL(c.url).origin===u.origin){await c.navigate(u.href);return c.focus()}
  return self.clients.openWindow(u.href);
 })());
});
