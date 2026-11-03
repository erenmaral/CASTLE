// Ses motoru duman testi: tum sesleri cal, muzigi baslat, hata/istisna olmadigini dogrula. node tests/audio-check.js
const { chromium } = require('playwright'); const path = require('path');
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const errors = [];
  const p = await (await b.newContext()).newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready);
  const r = await p.evaluate(async () => {
    const A = Z.Audio; A.enabled = true; A.musicOn = true; A.init();
    const state = A._all && (A._all(), 'tum sesler calindi');
    A.musicStart(); for (const v of [0, 0.5, 1]) { A.setIntensity(v); await new Promise(r => setTimeout(r, 700)); }
    for (let i = 0; i < 60; i++) { A.hit(); A.shoot(); A.death(); A.spawn('cav'); } // yogun sahne: ses sayisi sinirli kalmali
    await new Promise(r => setTimeout(r, 300)); A.musicStop();
    return { state, ctxState: Z.Audio && 'ok' };
  });
  console.log(JSON.stringify(r)); await b.close();
  console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Hata yok'); process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
