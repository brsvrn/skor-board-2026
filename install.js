// Ana ekrana ekleme: servis çalışanı kaydı, açılış ekranı ve otomatik yükleme uyarısı.
(() => {
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  const boot = document.getElementById('boot');
  if (boot) { if (document.documentElement.classList.contains('pwa')) setTimeout(() => { boot.classList.add('out'); setTimeout(() => boot.remove(), 450); }, 1700); else boot.remove(); }
  const KEY = 'tribun-install';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const later = () => { try { return Date.now() < +localStorage.getItem(KEY); } catch (e) { return false; } };
  const snooze = d => { try { localStorage.setItem(KEY, String(Date.now() + d * 864e5)); } catch (e) {} };
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobile = ios || /android|mobile/i.test(ua);
  if (standalone || later()) return;
  const st = document.createElement('style');
  st.textContent = `.ins{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom,0px));width:calc(100% - 24px);max-width:456px;z-index:20;background:#fff;color:#111;border-radius:20px;box-shadow:0 12px 32px rgba(0,0,0,.22);padding:14px;display:flex;gap:12px;align-items:center;font:13px/1.35 Inter,system-ui,sans-serif;animation:insUp .35s ease-out}
  .ins img{width:48px;height:48px;border-radius:12px;flex:none}.ins b{display:block;font-size:14px;margin-bottom:2px}.ins span{color:#555}
  .ins .ib2{display:flex;flex-direction:column;gap:6px;flex:none}.ins button{font:inherit;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.3px;border:0;border-radius:99px;padding:10px 14px;cursor:pointer;min-height:40px}
  .ins .y{background:#111;color:#fff}.ins .n{background:#eee;color:#555}.ins svg{vertical-align:-3px}
  @keyframes insUp{from{opacity:0;transform:translate(-50%,20px)}}@media(prefers-reduced-motion:reduce){.ins{animation:none}}`;
  document.head.append(st);
  let box = null, evt = null;
  const close = d => { if (box) box.remove(); box = null; if (d) snooze(d); };
  const share = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a7aff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  function show(text, btn) {
    if (box || standalone) return;
    box = document.createElement('div'); box.className = 'ins'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Tribün uygulamasını yükle');
    box.innerHTML = `<img src="/api/icon?s=192&v=2" alt=""><div style="flex:1;min-width:0"><b>Tribün'ü ana ekrana ekle</b><span>${text}</span></div><div class="ib2">${btn ? '<button class="y">Yükle</button>' : ''}<button class="n">${btn ? 'Sonra' : 'Tamam'}</button></div>`;
    document.body.append(box);
    box.querySelector('.n').onclick = () => close(7);
    const y = box.querySelector('.y');
    if (y) y.onclick = async () => { if (!evt) return close(0); evt.prompt(); const r = await evt.userChoice.catch(() => ({})); evt = null; close(r.outcome === 'accepted' ? 365 : 7); };
  }
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); evt = e; setTimeout(() => show('Tek dokunuşla aç, skorları uygulama gibi takip et.', true), 2500); });
  addEventListener('appinstalled', () => { close(365); });
  if (ios) setTimeout(() => show(`Alttaki Paylaş ${share} simgesine, ardından <b style="display:inline;font-size:13px">Ana Ekrana Ekle</b>'ye dokun.`, false), 2500);
  else if (mobile) setTimeout(() => { if (!evt) show('Tarayıcı menüsünden <b style="display:inline;font-size:13px">Ana ekrana ekle</b>\'yi seç.', false); }, 6000);
})();
