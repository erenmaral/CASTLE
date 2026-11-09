// v0.7: ayri ana menu, koridor dugmesi yok, etkilesimli ogretici. node tests/e2e-v07.js [ciktiKlasoru]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const ctx = await browser.newContext({ locale: 'tr-TR', viewport: { width: 412, height: 915 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const shot = (n) => p.screenshot({ path: path.join(out, n + '.png') });
  const check = (c, msg) => { if (!c) errors.push('KONTROL BASARISIZ: ' + msg); else console.log('  ✓', msg); };
  // --- ilk kez oynayan: kayit yok ---
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(1500);
  check(await p.evaluate(() => !document.getElementById('home').classList.contains('hidden') && document.getElementById('hub').classList.contains('hidden')), 'Açılışta ayrı ana menü görünür, harita/sefer merkezi gizli');
  check(/Hoş geldin/.test(await p.locator('.modal h1').first().innerText()), 'İlk kez girene doğrudan karşılama penceresi (dil ekranı yok, ana menü arkada)'); await shot('v07-01-welcome');
  await p.click('[data-act="go"]'); await p.waitForTimeout(1500);
  check(await p.evaluate(() => Z.Game.battle && Z.Game.battle.level === 1 && !document.getElementById('lane-pick') && !document.getElementById('tut').classList.contains('hidden') && Z.Game.tutHold === true), 'Öğretici 1. seferde başladı; savaş bekletiliyor; koridor düğmeleri yok');
  await shot('v07-02-tut1');
  await p.click('#tut-ok'); await p.waitForTimeout(400);
  check(/kartını/.test(await p.locator('#tut-text').innerText()) && await p.locator('#tut-ring').isVisible(), 'Adım 2: kart sürükle, kart çerçevelenir'); await shot('v07-03-tut2');
  const s = await p.evaluate(() => { const r = document.querySelector('[data-unit="' + Z.Game.battle.deck[0] + '"]').getBoundingClientRect(), st = Z.Game.stage; return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, tx: st.left + Z.Render.laneX(1) * st.scale, ty: 600 * st.scale }; });
  await p.mouse.move(s.cx, s.cy); await p.mouse.down(); await p.mouse.move(s.tx, s.ty, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
  check(await p.evaluate(() => Z.Game.battle.stats.spawns === 1) && /üstünlüğ/.test(await p.locator('#tut-text').innerText()), 'Birlik çağrılınca adım 3 (üstünlük) açıldı'); await shot('v07-04-tut3');
  await p.click('#tut-ok'); await p.waitForTimeout(500);
  check(await p.evaluate(() => Z.Game.tutHold === false) && /başka bir yola/.test(await p.locator('#tut-text').innerText()), 'Adım 4: oyun akıyor, başka yola birlik çağır');
  await p.evaluate(() => { const b = Z.Game.battle; b.gold = 300; b.cooldown[b.deck[0]] = 0; b.deploy(b.deck[0], 0); }); await p.waitForTimeout(600);
  check(/Madeni/.test(await p.locator('#tut-text').innerText()), 'Adım 5: madeni yükselt');
  await p.click('#btn-mine'); await p.waitForTimeout(500);
  check(/Kahraman/.test(await p.locator('#tut-text').innerText()), 'Adım 6: kahraman yeteneği');
  await p.evaluate(() => Z.Game.battle.useSkill(1)); await p.waitForTimeout(500); await shot('v07-05-tut-last');
  check(/Harika/.test(await p.locator('#tut-text').innerText()), 'Son adım: tebrik');
  await p.click('#tut-ok'); await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById('tut').classList.contains('hidden') && Z.Save.data.tutorialDone2 === true), 'Öğretici bitti ve bir daha gösterilmeyecek');
  // yeniden basla: ogretici cikmaz
  await p.evaluate(() => Z.Game.startBattle('campaign', 1)); await p.waitForTimeout(800);
  check(await p.evaluate(() => document.getElementById('tut').classList.contains('hidden')), 'Tamamlanmış öğretici tekrar çıkmaz');
  // menuye don: ana menu, dugmeler
  await p.evaluate(() => { Z.Game.toMenu(); }); await p.waitForTimeout(500);
  check(await p.evaluate(() => !document.getElementById('hub').classList.contains('hidden')), 'Savaştan çıkınca sefer merkezi açılır');
  await p.click('#btn-home'); await p.waitForTimeout(800); await shot('v07-06-home');
  check(await p.evaluate(() => !document.getElementById('home').classList.contains('hidden') && !!Z.Game.demo && document.querySelectorAll('#home [data-home]').length === 10), 'Geri düğmesi ana menüye döner (10 düğme, canlı savaş)');
  await p.click('[data-home="map"]'); await p.waitForTimeout(400);
  check(await p.evaluate(() => !document.getElementById('hub').classList.contains('hidden') && Z.UI.tab === 'map' && document.querySelectorAll('.node').length === 105), 'Sefer Haritası düğmesi haritayı açar');
  await p.evaluate(() => Z.Game.onBack()); await p.waitForTimeout(300);
  check(await p.evaluate(() => !document.getElementById('home').classList.contains('hidden')), 'Android geri tuşu haritadan ana menüye döner');
  await p.click('[data-home="play"]'); await p.waitForTimeout(400);
  check(/Sefer 2/.test(await p.locator('.modal h1').first().innerText()) || /Sefer \d+/.test(await p.locator('.modal h1').first().innerText()), 'Devam düğmesi sıradaki sefer brifingini açar'); await p.evaluate(() => Z.UI.closeModal());
  await p.click('[data-home="quests"]'); await p.waitForTimeout(300);
  check(await p.evaluate(() => Z.UI.tab === 'quests' && !document.getElementById('hub').classList.contains('hidden')), 'Görevler düğmesi görev sekmesini açar');
  if (errors.length) { console.log('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('Tüm kontroller geçti');
  await browser.close();
})();
