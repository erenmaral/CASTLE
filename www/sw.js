// Seferhan service worker: cevrimdisi calisma. Once ag, olmazsa onbellek (guncellemeler hemen gelir).
// CI, 'seferhan-dev' degerini her derlemede calisma numarasiyla degistirir.
const CACHE = 'seferhan-dev';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/version.js', 'js/data.js', 'js/save.js', 'js/audio.js', 'js/sim.js', 'js/render.js', 'js/ui.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./')))
  );
});
