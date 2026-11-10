// Sefer Vakti service worker: cevrimdisi calisma. Once ag, olmazsa onbellek (guncellemeler hemen gelir).
// CI, 'seferhan-dev' degerini her derlemede calisma numarasiyla degistirir.
const CACHE = 'seferhan-dev';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'css/fonts.css', 'css/style.css', 'css/theme.css',
  // sanat yonu yazi tipleri (SIL OFL): Rub = Texturina 700, Top = Pirata One 400, Hand = EB Garamond (latin, latin-ext, kiril alt kumeleri)
  'fonts/texturina-latin-700-normal.woff2', 'fonts/texturina-latin-ext-700-normal.woff2', 'fonts/pirata-one-latin-400-normal.woff2', 'fonts/pirata-one-latin-ext-400-normal.woff2',
  'fonts/eb-garamond-latin-600-normal.woff2', 'fonts/eb-garamond-latin-ext-600-normal.woff2', 'fonts/eb-garamond-cyrillic-600-normal.woff2',
  'js/version.js', 'js/i18n.js', 'js/lang/en.js', 'js/lang/es.js', 'js/lang/pt.js', 'js/lang/ru.js', 'js/lang/zh.js', 'js/data.js', 'js/save.js', 'js/monetize-config.js', 'js/monetize.js', 'js/monetize-providers.js', 'js/audio.js', 'js/sim.js', 'js/field.js', 'js/art.js', 'js/render.js', 'js/scenery.js', 'js/fieldrender.js', 'js/icons.js', 'js/ui.js', 'js/main.js',
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
