// PWA kontrolu: node tests/pwa-check.js http://localhost:8765/erenmaral/
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:8765/erenmaral/';
(async () => {
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, serviceWorkers: 'allow' });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push(e.message));
  p.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready);
  await p.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
  await p.reload(); await p.waitForFunction(() => globalThis.Z && Z.ready);
  const man = await p.evaluate(async () => { const l = document.querySelector('link[rel=manifest]').href; const r = await fetch(l); return { url: l, j: await r.json() }; });
  const iconsOk = await p.evaluate(async (m) => (await Promise.all(m.j.icons.map(i => fetch(new URL(i.src, m.url)).then(r => r.ok)))).every(Boolean), man);
  const cached = await p.evaluate(async () => (await caches.keys()).length && (await (await caches.open((await caches.keys())[0])).keys()).length);
  await ctx.setOffline(true); await p.reload(); await p.waitForFunction(() => globalThis.Z && Z.ready, null, { timeout: 8000 });
  const title = await p.title();
  console.log(JSON.stringify({ manifestName: man.j.name, iconsOk, cachedEntries: cached, offlineReloadOk: title === 'Zafarion' }));
  console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Hata yok');
  await b.close(); process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
