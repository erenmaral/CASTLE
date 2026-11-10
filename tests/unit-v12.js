// v0.12 butunluk testleri (Node, tarayici yok): node tests/unit-v12.js
// Sanat yonu (el yazmasi) paketi: yazi tipleri, service worker onbellek listesi, betik sirasi, ikon seti, Android kaynaklari, magaza gorselleri.
const fs = require('fs'), path = require('path'), assert = require('assert'), cp = require('child_process');
const R = (...p) => path.join(__dirname, '..', ...p), read = (...p) => fs.readFileSync(R(...p), 'utf8'), has = (...p) => fs.existsSync(R(...p));
let n = 0; const ok = (m) => { n++; console.log('  ✓', m); };

// 1) Service worker onbellek listesi: her dosya diskte var (tek eksik dosya tum cevrimdisi kurulumu bozar) ve gerekli yeni dosyalar listede
{ const m = /const ASSETS = (\[[\s\S]*?\]);/.exec(read('www', 'sw.js')); assert(m, 'ASSETS bulunamadi'); const A = eval(m[1]);
  A.forEach(a => { if (a !== './') assert(has('www', a), 'sw.js ASSETS dosyasi yok: ' + a); }); assert.strictEqual(new Set(A).size, A.length, 'ASSETS tekrarli');
  ['css/fonts.css', 'js/art.js', 'js/icons.js', 'js/scenery.js', 'fonts/texturina-latin-700-normal.woff2', 'fonts/eb-garamond-cyrillic-600-normal.woff2'].forEach(f => assert(A.includes(f), 'ASSETS eksik: ' + f));
  assert(!A.some(a => /almendra/i.test(a)), 'Almendra kaldirildi');
  JSON.parse(read('www', 'manifest.webmanifest')).icons.forEach(ic => assert(A.includes(ic.src.replace(/^\.\//, '')) || A.includes(ic.src), 'manifest simgesi ASSETS icinde degil: ' + ic.src));
  assert(/const CACHE = 'seferhan-dev';/.test(read('www', 'sw.js')), 'CI sed icin CACHE satiri');
  ok('sw.js: ' + A.length + ' onbellek dosyasi diskte var, yeni yazi tipleri/art/icons listede, CACHE satiri bozulmadi'); }

// 2) index.html: tum betik/baglantilar var; sira: art.js render.js'den once, icons.js ui.js'den once, main.js sonda
{ const h = read('www', 'index.html'), srcs = [...h.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]), links = [...h.matchAll(/<link [^>]*href="([^"]+)"/g)].map(m => m[1]);
  srcs.concat(links).forEach(f => assert(has('www', f), 'index.html dosyasi yok: ' + f));
  const i = f => srcs.indexOf('js/' + f); assert(i('art.js') > -1 && i('art.js') < i('render.js') && i('icons.js') > -1 && i('icons.js') < i('ui.js') && i('scenery.js') > i('render.js') && i('main.js') === srcs.length - 1, 'betik sirasi');
  assert(links.indexOf('css/fonts.css') > -1 && links.indexOf('css/fonts.css') < links.indexOf('css/style.css') && links.indexOf('css/style.css') < links.indexOf('css/theme.css'), 'css sirasi');
  assert(/<meta name="theme-color" content="#0F1838">/i.test(h), 'theme-color');
  ok('index.html: ' + srcs.length + ' betik + ' + links.length + ' baglanti diskte var, sira dogru'); }

// 3) fonts.css: her url diskte; kullanilan aileler tanimli; eski Almendra yok
{ const css = read('www', 'css', 'fonts.css'); [...css.matchAll(/url\(\.\.\/fonts\/([^)]+)\)/g)].forEach(m => assert(has('www', 'fonts', m[1]), 'font yok: ' + m[1]));
  ['Rub', 'Top', 'Hand'].forEach(f => assert(new RegExp('font-family:' + f + ';').test(css), 'aile: ' + f));
  ['OFL-Texturina.txt', 'OFL-PirataOne.txt', 'OFL-EBGaramond.txt'].forEach(f => assert(has('www', 'fonts', f), 'lisans: ' + f));
  ['css/theme.css', 'css/style.css', 'index.html', 'js/ui.js'].forEach(f => assert(!/almendra/i.test(read('www', f)), 'Almendra kalintisi: ' + f));
  ok('fonts.css: 7 yazi tipi dosyasi + 3 OFL lisansi var, Almendra kalintisi yok'); }

// 4) Ikon seti guncel ve gecerli (kaynak SVG'ler + manifest -> www/js/icons.js)
{ const r = cp.spawnSync(process.execPath, [R('scripts', 'build-icons.js'), '--check'], { encoding: 'utf8' }); assert.strictEqual(r.status, 0, 'ikon --check: ' + (r.stdout + r.stderr).slice(-400));
  const m = JSON.parse(read('art', 'icons', 'manifest.json')); assert(m.icons.length >= 140 && m.map.length >= 60, 'manifest boyutu');
  assert(!has('www', 'icons', 'src') && !has('www', 'icons', 'manifest.json'), 'ikon kaynaklari APK icine girmemeli (art/ altinda)');
  ok('Ikon seti: icons.js guncel, manifest ' + m.icons.length + ' ikon / ' + m.map.length + ' emoji eslemesi, kaynaklar www disinda'); }

// 5) Surum tutarli
{ const v = /Z\.VERSION = '([^']+)'/.exec(read('www', 'js', 'version.js'))[1], p = JSON.parse(read('package.json')).version; assert.strictEqual(v, p, 'version.js ' + v + ' != package.json ' + p); ok('Surum tutarli: ' + v); }

// 6) Android kaynaklari: uyarlanabilir simge ve acilis ekrani dosyalari tamam
{ const res = (...p) => R('android', 'app', 'src', 'main', 'res', ...p), dens = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  dens.forEach(d => ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png', 'ic_launcher_background.png', 'ic_launcher_monochrome.png'].forEach(f => assert(fs.existsSync(res('mipmap-' + d, f)), 'mipmap-' + d + '/' + f)));
  dens.forEach(d => assert(fs.existsSync(res('drawable-' + d, 'splash_emblem.png')), 'splash_emblem ' + d));
  const xml = fs.readFileSync(res('mipmap-anydpi-v26', 'ic_launcher.xml'), 'utf8'); ['background', 'foreground', 'monochrome'].forEach(k => assert(xml.includes('@mipmap/ic_launcher_' + k), 'adaptif xml: ' + k));
  assert(fs.readFileSync(res('drawable', 'splash.xml'), 'utf8').includes('@drawable/splash_emblem'), 'splash.xml');
  assert(!fs.existsSync(res('drawable', 'splash.png')), 'eski splash.png kaldirildi');
  ok('Android: 5 yogunlukta simge katmanlari + acilis amblemi + adaptif simge xml tamam'); }

// 7) Magaza gorselleri: boyutlar (PNG IHDR / JPEG SOF), 6 ekran goruntusu, simge 512
{ const dim = (f) => { const b = fs.readFileSync(f); if (b[0] === 0x89) return [b.readUInt32BE(16), b.readUInt32BE(20)]; let i = 2; while (i < b.length) { if (b[i] !== 0xFF) { i++; continue; } const t = b[i + 1], L = b.readUInt16BE(i + 2); if (t >= 0xC0 && t <= 0xCF && t !== 0xC4 && t !== 0xC8 && t !== 0xCC) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + L; } throw new Error('JPEG boyutu okunamadi ' + f); };
  const root = R('store', 'metadata', 'android'), locs = fs.readdirSync(root); assert(locs.length >= 7, 'yerel sayisi');
  locs.forEach(l => { const im = path.join(root, l, 'images'); const [fw, fh] = dim(path.join(im, 'featureGraphic.jpg')); assert(fw === 1024 && fh === 500, l + ' featureGraphic ' + fw + 'x' + fh);
    const [iw, ih] = dim(path.join(im, 'icon.png')); assert(iw === 512 && ih === 512, l + ' icon'); const shots = fs.readdirSync(path.join(im, 'phoneScreenshots')).filter(f => /\.jpg$/.test(f)); assert(shots.length >= 2 && shots.length <= 8, l + ' ekran goruntusu sayisi ' + shots.length);
    shots.forEach(s => { const [w, h] = dim(path.join(im, 'phoneScreenshots', s)); assert(w === 1080 && (h === 1920 || h === 1919), l + '/' + s + ' ' + w + 'x' + h); }); });
  ok('Magaza gorselleri ' + locs.length + ' yerelde: 1024x500 ozel gorsel, 512 simge, 1080x1920 ekran goruntuleri'); }

// 8) Dil paketlerinde yuzde isareti sayidan SONRA (zh/pt'de "%60" hatasi duzeltildi)
{ ['pt', 'zh', 'en', 'es', 'ru'].forEach(l => { read('www', 'js', 'lang', l + '.js').split('\n').forEach((ln, i) => { const m = /^\s*"(?:[^"\\]|\\.)*":\s*"((?:[^"\\]|\\.)*)",?\s*$/.exec(ln); if (m) assert(!/%\d|%\{/.test(m[1]), l + ' satir ' + (i + 1) + ' yuzde sayidan once: ' + m[1].slice(0, 60)); }); });
  ok('Dil paketleri: yuzde isareti her dilde sayidan sonra'); }
console.log(n + ' test geçti');
