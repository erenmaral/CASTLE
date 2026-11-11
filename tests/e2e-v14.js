// v0.13.1: hata taramasi duzeltmeleri: elmas yetmeyen dugmeler, sekme kaydirmasi, cark dinlenme acisi, brifing->Ordu, ayar penceresi kaydirmasi, sifirlama sonrasi ses.
// node tests/e2e-v14.js [ciktiKlasoru]
const { chromium } = require('playwright'), path = require('path'), http = require('http'), fs = require('fs');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); fs.mkdirSync(out, { recursive: true });
const root = path.join(__dirname, '..', 'www'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let f = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith(path.sep) || f === root) f = path.join(f, 'index.html'); if (!f.startsWith(root)) { res.writeHead(403); return res.end(); } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = 'http://localhost:' + server.address().port + '/index.html';
  const browser = await chromium.launch(); const errors = [];
  const check = (c, msg) => { if (!c) errors.push('KONTROL BASARISIZ: ' + msg); else console.log('  ✓', msg); };
  const stars = {}; for (let i = 1; i <= 12; i++) stars[i] = 2;
  const save = (gems) => JSON.stringify({ v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.10', cleared: 12, coins: 3000, gems, stars, stats: { totalStars: 24, wins: 12 } });
  async function open(opts) {
    const ctx = await browser.newContext({ locale: 'tr-TR', viewport: { width: 412, height: opts.vh || 915 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
    await ctx.addInitScript(([sv]) => { try { if (!localStorage.getItem('__init')) { localStorage.setItem('__init', '1'); localStorage.setItem('sefervakti.lang', 'tr'); localStorage.setItem('zafarion.save.v1', sv); } } catch (e) {} }, [save(opts.gems === undefined ? 50 : opts.gems)]);
    const p = await ctx.newPage(); p.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('console.error:', m.text().slice(0, 160)); } }); p.on('pageerror', e => { errors.push('pageerror: ' + e.message); console.log('pageerror:', e.message.slice(0, 160)); });
    await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(900); await p.evaluate(() => { if (Z.UI.modalOpen()) Z.UI.closeModal(); }); return { ctx, p };
  }

  // 1) elmas yetmeyen butonlar tiklanabilir (soft): Elmas yetmiyor penceresi acilir
  { const { ctx, p } = await open({ gems: 0 });
    await p.evaluate(() => Z.UI.showHub('vault')); await p.waitForTimeout(400);
    check(await p.locator('[data-buy].soft').count() >= 1 && await p.locator('[data-buy].off').count() === 0, 'Pazar: elmas yetmeyen düğme "soft" (tıklanabilir), "off" değil');
    await p.locator('[data-buy].soft').first().click({ timeout: 2000 }); await p.waitForTimeout(300);
    check(/Elmas yetmiyor/.test(await p.locator('.modal h1').first().innerText()), 'Pazar: elmassız dokunuş "Elmas yetmiyor" penceresini açar');
    await p.evaluate(() => Z.UI.closeModal());
    await p.evaluate(() => Z.UI.showHub('army')); await p.waitForTimeout(400);
    check(await p.locator('[data-hbuy].soft').count() >= 1 && await p.locator('[data-hbuy].off').count() === 0, 'Ordu: elmas yetmeyen kahraman düğmesi tıklanabilir');
    await p.locator('[data-hbuy].soft').first().click({ timeout: 2000 }); await p.waitForTimeout(300);
    check(/Elmas yetmiyor/.test(await p.locator('.modal h1').first().innerText()), 'Kahraman: elmassız dokunuş "Elmas yetmiyor" penceresini açar');
    await ctx.close(); }

  // 2) sekme degisince kaydirma basa alinir
  { const { ctx, p } = await open({ vh: 600 });
    await p.evaluate(() => Z.UI.showHub('vault')); await p.waitForTimeout(400);
    await p.evaluate(() => { document.getElementById('tab-content').scrollTop = 400; });
    const top1 = await p.evaluate(() => document.getElementById('tab-content').scrollTop);
    await p.locator('#tabs [data-tab="shop"]').click(); await p.waitForTimeout(300);
    check(top1 > 100 && await p.evaluate(() => document.getElementById('tab-content').scrollTop) === 0, 'Sekme değişince içerik başa kayar (önceki kaydırma ' + top1 + ' -> 0)');
    await ctx.close(); }

  // 3) cark: durunca dinlenme acisinda kalir (basa sicramaz), etiketler dik; 3 cevirme
  { const { ctx, p } = await open({ gems: 100 });
    await p.evaluate(() => Z.UI.showHub('vault')); await p.waitForTimeout(400);
    let okAll = true, info = [];
    for (let k = 0; k < 3; k++) {
      await p.evaluate(() => document.getElementById('spin-btn').scrollIntoView()); await p.locator('#spin-btn').click(); await p.waitForTimeout(4100);
      const r = await p.evaluate(() => { const w = document.getElementById('wheel'), rest = Z.UI.wheelRest, lab = w.querySelector('span').style.transform; return { rest, tr: w.style.transform, lab, spinning: !!Z.UI.spinning }; });
      info.push(r.rest); if (r.tr !== 'rotate(' + r.rest + 'deg)' || r.spinning || (r.rest && !/rotate\(-?[\d.]*deg\)\s*$/.test(r.lab))) okAll = false;
    }
    check(okAll, 'Çark durunca dinlenme açısında kalır, geri sıçramaz (açılar: ' + info.join(',') + ')');
    await ctx.close(); }

  // 4) brifingteki Ordu dugmesi ana ekrandan da calisir
  { const { ctx, p } = await open({});
    check(await p.evaluate(() => !document.getElementById('home').classList.contains('hidden')), 'Başlangıç: ana ekran açık');
    await p.evaluate(() => Z.UI.levelModal(3)); await p.waitForTimeout(300);
    await p.locator('.modal [data-act="army"]').click(); await p.waitForTimeout(400);
    check(await p.evaluate(() => !document.getElementById('hub').classList.contains('hidden') && document.getElementById('home').classList.contains('hidden') && Z.UI.tab === 'army') && await p.locator('#tabs .tab.active[data-tab="army"]').count() === 1, 'Brifing → Ordu: ana ekrandan Ordu sekmesi açılır');
    await ctx.close(); }

  // 5) ayarlar: ayni pencere yeniden cizilince kaydirma korunur; sifirla ses durumunu esitler
  { const { ctx, p } = await open({ vh: 480 });
    await p.evaluate(() => Z.UI.settingsModal()); await p.waitForTimeout(300);
    const sc = await p.evaluate(() => { const m = document.querySelector('.modal'); m.scrollTop = 9999; return m.scrollTop; });
    await p.locator('[data-act="t_menuBattle"]').click(); await p.waitForTimeout(300);
    const sc2 = await p.evaluate(() => document.querySelector('.modal').scrollTop);
    check(sc > 50 && Math.abs(sc2 - sc) < 3, 'Ayarlar: anahtar değişince pencere kaydırması korunur (' + sc + ' -> ' + sc2 + ')');
    await p.locator('[data-act="t_sound"]').click(); await p.waitForTimeout(200);
    check(await p.evaluate(() => Z.Audio.enabled === false), 'Ses kapatıldı');
    await p.locator('[data-act="reset"]').click(); await p.waitForTimeout(200); await p.locator('.modal [data-act="yes"]').click(); await p.waitForTimeout(500);
    check(await p.evaluate(() => Z.Save.data.settings.sound === true && Z.Audio.enabled === true), 'Kayıt sıfırlanınca ses durumu yeni ayara eşitlenir');
    await ctx.close(); }

  // 6) duraklatilmis savasta cizim 60 fps degil (~10 fps), devam edince tam hiza; alan savasi (volkan/col temasi) hatasiz acilir
  { const { ctx, p } = await open({});
    await p.evaluate(() => Z.Game.startBattle('campaign', 5)); await p.waitForTimeout(1200);
    const count = (ms) => p.evaluate((ms) => new Promise(res => { let n = 0; const f = Z.Render.frame; Z.Render.frame = function () { n++; return f.apply(this, arguments); }; setTimeout(() => { Z.Render.frame = f; res(n); }, ms); }), ms);
    const run = await count(1000); await p.evaluate(() => Z.Game.pause()); await p.waitForTimeout(200); const paused = await count(1000); await p.evaluate(() => Z.Game.resume()); await p.waitForTimeout(200); const run2 = await count(1000);
    check(run > 25 && paused >= 4 && paused <= 16 && run2 > 25, 'Duraklatılmış savaş ~10 fps çizer, devam edince tam hız (çalışırken ' + run + ', duraklatılmış ' + paused + ', devam ' + run2 + ' kare/sn)');
    await ctx.close(); }
  { const { ctx, p } = await open({});
    const lvls = await p.evaluate(() => { const o = []; for (let l = 1; l <= 105 && o.length < 5; l++) if (l > 20 && Z.levelType(l) === 'field' && l % 3 !== 1) o.push(l); return o; });
    for (const lv of lvls) { await p.evaluate((lv) => { Z.Game.toMenu(); Z.Game.startBattle('campaign', lv); }, lv); await p.waitForTimeout(900); }
    check(lvls.length >= 3 && await p.evaluate(() => !!Z.Game.battle && Z.Game.battle.constructor === Z.FieldBattle), 'Alan savaşı seviyeleri (' + lvls.join('/') + ') hatasız açılır');
    await ctx.close(); }

  if (errors.length) { console.log('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('Tüm kontroller geçti');
  await browser.close(); server.close();
})();
