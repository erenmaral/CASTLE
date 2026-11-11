// v0.13: bildirim sistemi (sahte yerel platform + LocalNotifications eklentisi): ayar anahtari, izin akisi, arka planda planlama, geri donunce iptal, nazik soru.
// node tests/e2e-v13.js [ciktiKlasoru]
const { chromium } = require('playwright'), path = require('path'), http = require('http'), fs = require('fs');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); fs.mkdirSync(out, { recursive: true });
const root = path.join(__dirname, '..', 'www'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let f = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith(path.sep) || f === root) f = path.join(f, 'index.html'); if (!f.startsWith(root)) { res.writeHead(403); return res.end(); } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = 'http://localhost:' + server.address().port + '/index.html';
  const browser = await chromium.launch(); const errors = [];
  const check = (c, msg) => { if (!c) errors.push('KONTROL BASARISIZ: ' + msg); else console.log('  ✓', msg); };
  const stars = {}; for (let i = 1; i <= 12; i++) stars[i] = 2;
  const save = (wins) => JSON.stringify({ v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.10', cleared: 12, coins: 3000, gems: 50, stars, stats: { totalStars: 24, wins }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } });
  async function open(opts) {
    const ctx = await browser.newContext({ locale: opts.lang === 'en' ? 'en-US' : 'tr-TR', viewport: { width: 412, height: 915 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
    await ctx.addInitScript(([lang, sv, native, grant]) => {
      try { if (!localStorage.getItem('__init')) { localStorage.setItem('__init', '1'); localStorage.setItem('sefervakti.lang', lang); localStorage.setItem('zafarion.save.v1', sv); } } catch (e) {}
      if (native) { window.__ln = { calls: [], perm: 'prompt', grant, last: null };
        const L = window.__ln; globalThis.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: {
          checkPermissions: async () => ({ display: L.perm }), requestPermissions: async () => { L.calls.push('request'); L.perm = L.grant ? 'granted' : 'denied'; return { display: L.perm }; },
          createChannel: async (o) => { L.calls.push('channel'); }, cancel: async (o) => { L.calls.push('cancel'); }, schedule: async (o) => { L.calls.push('schedule'); L.last = o; }, addListener: () => {} } } }; }
    }, [opts.lang || 'tr', save(opts.wins === undefined ? 5 : opts.wins), !!opts.native, opts.grant !== false]);
    const p = await ctx.newPage(); p.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('console.error:', m.text().slice(0, 160)); } }); p.on('pageerror', e => { errors.push('pageerror: ' + e.message); console.log('pageerror:', e.message.slice(0, 200)); });
    await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(900); return { ctx, p };
  }
  const setHidden = (p, h) => p.evaluate((h) => { Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, h);

  // 1) tarayici: anahtar yok
  { const { ctx, p } = await open({ native: false }); await p.evaluate(() => Z.UI.settingsModal()); await p.waitForTimeout(300);
    check(await p.locator('[data-act="t_notify"]').count() === 0 && !(await p.evaluate(() => Z.Notify.available())), 'Tarayıcıda bildirim anahtarı gösterilmez'); await ctx.close(); }

  // 2) APK (sahte): anahtar, izin reddi, izin verme, planlama, iptal
  { const { ctx, p } = await open({ native: true, grant: false });
    await p.evaluate(() => Z.UI.settingsModal()); await p.waitForTimeout(300);
    check(await p.locator('[data-act="t_notify"]').count() === 1, 'APK: Ayarlar\'da bildirim anahtarı var');
    await p.locator('[data-act="t_notify"]').click(); await p.waitForTimeout(500);
    check(await p.evaluate(() => window.__ln.calls.includes('request') && !Z.Save.data.settings.notify) && !(await p.locator('[data-act="t_notify"] .sw.on').count()), 'İzin reddedilince anahtar kapalı kalır, toast gösterilir');
    await p.evaluate(() => { window.__ln.grant = true; window.__ln.perm = 'prompt'; window.__ln.calls.length = 0; });
    await p.locator('[data-act="t_notify"]').click(); await p.waitForTimeout(500);
    check(await p.evaluate(() => Z.Save.data.settings.notify === true) && await p.locator('[data-act="t_notify"] .sw.on').count() === 1, 'İzin verilince anahtar açılır ve ayar kaydedilir');
    await p.screenshot({ path: path.join(out, 'v13-01-ayar.png') });
    await p.evaluate(() => { Z.UI.closeModal(); window.__ln.calls.length = 0; });
    await setHidden(p, true); await p.waitForTimeout(700);
    const planned = await p.evaluate(() => ({ calls: window.__ln.calls.slice(), n: window.__ln.last && window.__ln.last.notifications.length, exact: window.__ln.last && window.__ln.last.notifications.some(x => x.isExactNotification), t: window.__ln.last && window.__ln.last.notifications[0].title }));
    check(planned.calls.includes('cancel') && planned.calls.includes('schedule') && planned.n >= 4 && planned.exact === false && !!planned.t, 'Arka plana geçince hatırlatıcılar planlanır (' + planned.n + ' adet, tam zamanlı alarm yok): "' + planned.t + '"');
    await p.evaluate(() => { window.__ln.calls.length = 0; }); await setHidden(p, false); await p.waitForTimeout(400);
    check(await p.evaluate(() => window.__ln.calls.includes('cancel') && !window.__ln.calls.includes('schedule')), 'Öne gelince bekleyen hatırlatıcılar iptal edilir');
    await p.locator('#home-settings, #btn-settings').first().click({ force: true }).catch(() => {}); await p.evaluate(() => Z.UI.settingsModal()); await p.waitForTimeout(300);
    await p.locator('[data-act="t_notify"]').click(); await p.waitForTimeout(400);
    check(await p.evaluate(() => Z.Save.data.settings.notify === false), 'Anahtar kapatılınca ayar kapanır'); await p.evaluate(() => { window.__ln.calls.length = 0; }); await setHidden(p, true); await p.waitForTimeout(500);
    check(await p.evaluate(() => !window.__ln.calls.includes('schedule')), 'Kapalıyken arka planda planlama yok'); await ctx.close(); }

  // 3) nazik soru: 3. galibiyetten sonra menüye dönünce bir kez; Evet -> izin + acik
  { const { ctx, p } = await open({ native: true, wins: 3, lang: 'en' });
    await p.evaluate(() => { Z.UI.closeModal(); Z.Game.toMenu(); }); await p.waitForTimeout(2000);
    check(/Turn on reminders\?/.test(await p.locator('.modal h1').first().innerText().catch(() => '')), 'Nazik soru (en) gösterildi');
    await p.screenshot({ path: path.join(out, 'v13-02-soru.png') });
    await p.locator('[data-act="yes"]').click(); await p.waitForTimeout(600);
    check(await p.evaluate(() => Z.Save.data.settings.notify === true && Z.Save.data.settings.notifyAsked === true), 'Evet: izin istendi, bildirim açıldı, bir daha sorulmaz');
    await p.evaluate(() => { Z.Game.toMenu(); }); await p.waitForTimeout(1800); check(!(await p.evaluate(() => Z.UI.modalOpen())), 'İkinci kez sorulmaz'); await ctx.close(); }
  { const { ctx, p } = await open({ native: true, wins: 1 }); await p.evaluate(() => { Z.Game.toMenu(); }); await p.waitForTimeout(1800);
    check(!(await p.evaluate(() => Z.UI.modalOpen())), '3 galibiyetten önce sorulmaz'); await ctx.close(); }

  if (errors.length) { console.log('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('Tüm kontroller geçti');
  await browser.close(); server.close();
})();
