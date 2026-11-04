#!/usr/bin/env node
// Sefer Vakti - ceviri araci (bagimliliksiz).
//   node scripts/i18n.js extract [cikti.json]   -> kaynakta $t('...') ile sarili tum Turkce metinleri listeler
//   node scripts/i18n.js check                  -> dil paketlerini denetler (eksik anahtar, yer tutucu, HTML etiketi, bos ceviri)
//   node scripts/i18n.js stale                  -> paketlerde olup kaynakta artik olmayan anahtarlar
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'www', 'js');
const LANGS = ['en', 'es', 'pt', 'ru', 'zh'];
function sourceKeys() {
  const keys = new Map(), re = /\$t\(\s*('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/g;
  fs.readdirSync(root).filter(f => f.endsWith('.js')).forEach(f => {
    const src = fs.readFileSync(path.join(root, f), 'utf8'); let m;
    while ((m = re.exec(src))) {
      const lit = m[1]; let val; try { val = (new Function('return ' + lit))(); } catch (e) { continue; }
      const k = val.trim(); if (!k) continue; if (!keys.has(k)) keys.set(k, []);
      keys.get(k).push(f + ':' + src.slice(0, m.index).split('\n').length);
    }
  });
  // statik HTML: data-i18n metinleri ve data-i18n-title ozellikleri
  const html = fs.readFileSync(path.join(root, '..', 'index.html'), 'utf8'); let h;
  const re2 = /<[a-z0-9]+[^>]*\sdata-i18n(?![-\w])[^>]*>([^<]+)</gi, re3 = /data-i18n-title="([^"]+)"/g;
  while ((h = re2.exec(html))) { const k = h[1].trim(); if (k) { if (!keys.has(k)) keys.set(k, []); keys.get(k).push('index.html'); } }
  while ((h = re3.exec(html))) { const k = h[1].trim(); if (k) { if (!keys.has(k)) keys.set(k, []); keys.get(k).push('index.html'); } }
  return keys;
}
function loadPack(id) {
  const file = path.join(root, 'lang', id + '.js'); if (!fs.existsSync(file)) return null;
  const sandbox = { Z: {} }; sandbox.globalThis = sandbox; (new Function('globalThis', fs.readFileSync(file, 'utf8')))(sandbox);
  return (sandbox.Z.PACK || {})[id] || null;
}
const tags = s => (s.match(/<\/?[a-z]+[^>]*>/gi) || []).map(t => t.toLowerCase().replace(/\s+/g, ' ')).sort().join('');
const vars = s => (s.match(/\{\w+\}/g) || []).sort().join();
const cmd = process.argv[2];
if (cmd === 'extract') {
  const keys = sourceKeys(), out = {}; keys.forEach((v, k) => (out[k] = v[0]));
  const file = process.argv[3]; if (file) fs.writeFileSync(file, JSON.stringify(out, null, 1)); console.log(keys.size + ' anahtar' + (file ? ' -> ' + file : ''));
  if (!file) console.log(JSON.stringify(out, null, 1));
} else if (cmd === 'check') {
  const keys = sourceKeys(); let bad = 0;
  LANGS.forEach(id => {
    const pack = loadPack(id); if (!pack) { console.log(id + ': PAKET YOK'); bad++; return; }
    let miss = 0, tagBad = 0, varBad = 0, empty = 0; const ex = [];
    keys.forEach((_, k) => {
      const t = pack[k];
      if (t === undefined) { miss++; if (ex.length < 4) ex.push('EKSIK: ' + k.slice(0, 50)); return; }
      if (!String(t).trim()) { empty++; return; }
      if (tags(k) !== tags(t)) { tagBad++; if (ex.length < 8) ex.push('ETIKET: ' + k.slice(0, 40) + ' => ' + t.slice(0, 40)); }
      if (vars(k) !== vars(t)) { varBad++; if (ex.length < 8) ex.push('YER TUTUCU: ' + k.slice(0, 40)); }
    });
    console.log(id + ': ' + keys.size + ' anahtar, eksik ' + miss + ', bos ' + empty + ', etiket ' + tagBad + ', yer tutucu ' + varBad); ex.forEach(e => console.log('   ' + e));
    if (miss || empty || tagBad || varBad) bad++;
  });
  process.exit(bad ? 1 : 0);
} else if (cmd === 'build') { // node scripts/i18n.js build <klasor>  : <klasor>/<dil>.json (+ <dil>.*.json eklemeleri) -> www/js/lang/<dil>.js
  const dir = process.argv[3]; const keys = sourceKeys();
  LANGS.forEach(id => {
    const files = fs.readdirSync(dir).filter(f => new RegExp('^' + id + '(\\.[^.]+)?\\.json$').test(f)).sort((a, b) => (a === id + '.json' ? -1 : b === id + '.json' ? 1 : a.localeCompare(b)));
    if (!files.length) { console.log(id + ': dosya yok'); return; }
    const merged = {}; files.forEach(f => Object.assign(merged, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
    const out = {}; keys.forEach((_, k) => { if (merged[k] !== undefined) out[k] = merged[k]; });
    const body = '// Sefer Vakti - ' + id + ' dil paketi (scripts/i18n.js build ile uretilir). Kaynak metin: Turkce.\n(globalThis.Z = globalThis.Z || {}).PACK = Object.assign((globalThis.Z.PACK || {}), { ' + JSON.stringify(id) + ': ' + JSON.stringify(out, null, 1) + ' });\n';
    fs.writeFileSync(path.join(root, 'lang', id + '.js'), body); console.log(id + ': ' + Object.keys(out).length + '/' + keys.size + ' anahtar (' + files.join(', ') + ')');
  });
} else if (cmd === 'stale') {
  const keys = sourceKeys(); LANGS.forEach(id => { const pack = loadPack(id) || {}; const st = Object.keys(pack).filter(k => !keys.has(k)); console.log(id + ': ' + st.length + ' eski anahtar'); st.slice(0, 5).forEach(k => console.log('   ' + k.slice(0, 60))); });
} else console.log('kullanim: node scripts/i18n.js extract|check|stale');
