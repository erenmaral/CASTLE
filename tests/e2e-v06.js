// v0.6: canli ana menu, yeni sefer haritasi, 105 bolum / yeni diyarlar, haftalik gorevler, yeni ad. node tests/e2e-v06.js [ciktiKlasoru]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const shot = (n) => p.screenshot({ path: path.join(out, n + '.png') });
  const check = (c, msg) => { if (!c) errors.push('KONTROL BASARISIZ: ' + msg); else console.log('  ✓', msg); };
  const stars = {}; for (let i = 1; i <= 80; i++) stars[i] = (i % 3) + 1;
  await ctx.addInitScript((st) => { try { if (!localStorage.getItem('zafarion.save.v1')) localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, seenVersion: '0.7', cleared: 80, coins: 5000, gems: 100, stars: st, stats: { totalStars: 160, wins: 80 }, fieldTutDone: true, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } })); } catch (e) {} }, stars);
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.mouse.click(200, 300); await p.waitForTimeout(3500);
  check(await p.title() === 'Sefer Vakti' && /SEFER VAKTİ/.test(await p.locator('#hub-top .logo').innerText()), 'Oyun adı: Sefer Vakti');
  check(await p.evaluate(() => !!Z.Game.demo && !document.getElementById('game').classList.contains('hidden') && !document.getElementById('home').classList.contains('hidden') && !document.getElementById('home').classList.contains('opaque')), 'Ana menüde arkada canlı savaş çalışıyor');
  const u0 = await p.evaluate(() => Z.Game.demo.units.length + Z.Game.demo.t); await p.waitForTimeout(2500);
  check(await p.evaluate((u) => Z.Game.demo.units.length + Z.Game.demo.t !== u, u0), 'Menü savaşı ilerliyor (birlikler/zaman değişti)');
  await p.evaluate(() => Z.UI.showHub('map')); await p.waitForTimeout(300);
  check(await p.evaluate(() => !Z.Game.demo) && true, 'Sefer merkezinde canlı savaş durur (pil)');
  check(await p.evaluate(() => document.querySelectorAll('.node').length === 105 && document.querySelectorAll('.rbg').length === 7 && document.querySelectorAll('.realm').length === 7), 'Harita: 105 bölüm, 7 diyar manzarası ve başlığı');
  check(await p.evaluate(() => document.querySelectorAll('.dec').length >= 90 && !!document.querySelector('.flagmark') && document.querySelectorAll('.node.fld').length === 42), 'Harita süsleri, konum bayrağı ve 42 açık alan düğümü');
  await p.evaluate(() => { const t = document.getElementById('tab-content'); t.scrollTop = document.querySelector('.node.cur').offsetTop - 520; }); await p.waitForTimeout(500); await shot('v06-01-map');
  await p.evaluate(() => { const t = document.getElementById('tab-content'); t.scrollTop = document.querySelector('.realm.r6').offsetTop - 220; }); await p.waitForTimeout(400); await shot('v06-02-map-night');
  // gorevler
  await p.evaluate(() => { Z.UI.tab = 'quests'; Z.UI.renderHub(); }); await p.waitForTimeout(300);
  check(await p.evaluate(() => document.querySelectorAll('.quest[data-kind="daily"]').length === 4 && document.querySelectorAll('.quest[data-kind="weekly"]').length === 3), 'Görevler: 4 günlük + 3 haftalık');
  await shot('v06-03-quests');
  // ayar: menu savasini kapat/ac
  await p.evaluate(() => { Z.UI.showHome(); Z.UI.settingsModal(); }); await p.waitForTimeout(300); await p.locator('[data-act="t_menuBattle"]').click(); await p.waitForTimeout(400);
  check(await p.evaluate(() => !Z.Game.demo && document.getElementById('home').classList.contains('opaque') && document.getElementById('game').classList.contains('hidden')), 'Ayar kapatınca menü savaşı durur, menü opak olur');
  await p.locator('[data-act="t_menuBattle"]').click(); await p.waitForTimeout(500);
  check(await p.evaluate(() => !!Z.Game.demo && !document.getElementById('home').classList.contains('opaque')), 'Ayar açılınca menü savaşı geri gelir');
  await p.evaluate(() => Z.UI.closeModal());
  // yeni diyarlar: savas
  for (const [lvl, name] of [[80, 'sonbahar-kale-patron'], [78, 'sonbahar-acik-alan'], [100, 'gece-kale-patron'], [98, 'gece-acik-alan']]) {
    await p.evaluate((l) => Z.Game.startBattle('campaign', l), lvl); await p.waitForTimeout(1300);
    check(await p.evaluate((l) => !Z.Game.demo && Z.Game.battle.level === l && Z.Game.battle.theme === (l > 90 ? 6 : 5), lvl), 'Bölüm ' + lvl + ' doğru diyar teması; menü savaşı durdu');
    await p.evaluate(() => { const b = Z.Game.battle; if (b.kind) { b.autoPlace(); b.startBattle(); } else { b.gold = 999; ['spear', 'archer', 'cav'].forEach((t, i) => { b.cooldown[t] = 0; b.deploy(t, i); }); } });
    await p.waitForTimeout(4500); await shot('v06-04-' + name);
  }
  await p.evaluate(() => { Z.Game.toMenu('map'); Z.UI.showHome(); }); await p.waitForTimeout(700);
  check(await p.evaluate(() => !!Z.Game.demo && !Z.Game.battle), 'Savaştan menüye dönünce canlı savaş yeniden başladı');
  // 105. bolum kazanilinca bitis
  await p.evaluate(() => { Z.Save.data.cleared = 104; Z.Game.startBattle('campaign', 105); const b = Z.Game.battle; if (b.kind) { b.phase = 'battle'; b.kill(b.cmdE); } else b.base[1].hp = 0; });
  await p.waitForSelector('.modal h1', { timeout: 9000 }); await p.waitForTimeout(600);
  check(await p.evaluate(() => Z.Save.data.cleared === 105), '105. bölüm kazanılınca ilerleme 105');
  if (errors.length) { console.log('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('Tüm kontroller geçti');
  await browser.close();
})();
