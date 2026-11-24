// Tribün servis çalışanı: önce ağ, bağlantı yoksa son kayıtlı sürüm. Canlı veri (/api/) önbelleğe alınmaz.
const C = 'tribun-v1';
const SHELL = ['/', '/index.html', '/app.js', '/style.css', '/install.js', '/manifest.webmanifest', '/api/icon?s=192'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || (u.pathname.startsWith('/api/') && u.pathname !== '/api/icon')) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('/'))));
});
