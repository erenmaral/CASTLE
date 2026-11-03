// v0.2 ozellikleri: eski kayit gocu, temalar, ganimet, cark, basarimlar. node tests/e2e-v02.js [ciktiKlasoru]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
const OLD_SAVE = { v: 1, coins: 842, gems: 31, unitLvl: { spear: 4, archer: 3, cav: 3, knight: 1, mage: 1, cata: 1 }, heroOwned: { aslan: true }, heroLvl: { aslan: 2, yildiz: 1, demir: 1 }, hero: 'aslan',
  deck: ['spear', 'archer', 'cav'], castleLvl: 2, treasuryLvl: 2, treasuryLast: Date.now() - 3 * 3600e3, cleared: 7, stars: { 1: 3, 2: 3, 3: 2, 4: 3, 5: 2, 6: 3, 7: 1 }, endlessBest: 6,
  daily: { lastDay: '', streak: 2, claimedToday: false }, quests: { day: '', list: [] }, stats: { battles: 12, wins: 9, kills: 140, totalStars: 17 }, settings: { sound: true, music: true, vibrate: true }, seenUnlock: {}, tutorialDone: true };

(async () => {
  const browser = await chromium.launch(); const errors = [];
  const shot = (p, n) => p.screenshot({ path: path.join(out, n + '.png') });
  const mk = async (init) => {
    const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(700); return p;
  };
  const check = (c, msg) => { if (!c) { errors.push('KONTROL BASARISIZ: ' + msg); } else console.log('  ✓', msg); };

  // 1) Eski v0.1 kaydi ile acilis
  let p = await mk(`if(!localStorage.getItem('zafarion.save.v1')) localStorage.setItem('zafarion.save.v1', ${JSON.stringify(JSON.stringify(OLD_SAVE))});`);
  await shot(p, 'v02-01-whatsnew');
  check(await p.locator('.modal h1').first().innerText().then(t => /Seferhan 0\.2/.test(t)), 'Yenilikler penceresi gösterildi');
  check(await p.evaluate(() => Z.Save.data.coins === 842 && Z.Save.data.cleared === 7 && Z.Save.data.unitLvl.healer === 1), 'Eski ilerleme korundu (altın 842, 7. bölüm)');
  await p.click('[data-act="ok"]'); await p.waitForTimeout(500);
  check(await p.locator('.modal h1').first().innerText().then(t => /Günlük Ödül/.test(t)), 'Ardından günlük ödül penceresi geldi');
  await p.click('[data-act="claim"]'); await p.waitForTimeout(400);
  check(await p.title() === 'Seferhan' && /SEFERHAN/.test(await p.locator('#hub-top .logo').innerText()), 'Oyun adı Seferhan');
  await shot(p, 'v02-02-map');
  await p.click('[data-tab="vault"]'); await p.waitForTimeout(400); await shot(p, 'v02-03-vault');
  const gemsBefore = await p.evaluate(() => Z.Save.data.gems + Z.Save.data.coins);
  await p.click('[data-spin]'); await p.waitForTimeout(1500); await shot(p, 'v02-04-wheel-spinning'); await p.waitForTimeout(2800);
  check(await p.evaluate((g) => Z.Save.data.gems + Z.Save.data.coins > g && Z.Save.data.wheel.used, gemsBefore), 'Çark çevrildi, ödül hesaba eklendi');
  await p.click('[data-tab="quests"]'); await p.waitForTimeout(400); await shot(p, 'v02-05-quests-ach');
  await p.click('[data-tab="army"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { document.getElementById('tab-content').scrollTop = 99999; }); await p.waitForTimeout(200); await shot(p, 'v02-06-army-heroes');

  // 2) Ganimet secimi (savas icinde)
  await p.evaluate(() => { Z.Save.data.cleared = 12; Z.Save.sanitizeDeck(); });
  await p.evaluate(() => Z.Game.startBattle('campaign', 3)); await p.waitForTimeout(1200);
  await p.evaluate(() => { Z.Game.battle.stats.kills = Z.PERK_KILLS[0]; });
  await p.waitForSelector('.perk', { timeout: 5000 }); await p.waitForTimeout(400); await shot(p, 'v02-07-perk-modal');
  const t0 = await p.evaluate(() => Z.Game.battle.t); await p.waitForTimeout(500);
  check(await p.evaluate((t) => Z.Game.battle.t === t, t0), 'Ganimet seçilirken savaş duruyor');
  await p.locator('.perk').first().click(); await p.waitForTimeout(800);
  check(await p.evaluate(() => Object.keys(Z.Game.battle.perks).length === 1 && !Z.Game.battle.perkOffer) && await p.locator('#perk-row i').count() === 1, 'Ganimet seçildi, HUD\'da simgesi var');
  await p.evaluate(() => Z.Game.toMenu());

  // 3) Diyar temalari + yeni birlikler
  for (const [lvl, name] of [[20, 'col'], [38, 'buz']]) {
    await p.evaluate((l) => { Z.Save.data.cleared = 44; Z.Save.data.unitLvl.healer = 3; Z.Save.data.deck = ['spear', 'healer', 'banner', 'archer', 'cav']; Z.Game.startBattle('campaign', l); }, lvl);
    await p.evaluate(() => { const b = Z.Game.battle; b.gold = 999; ['spear', 'banner', 'healer', 'archer', 'spear'].forEach((t, i) => { b.cooldown[t] = 0; b.deploy(t, i % 3); }); b.cooldown.spear = 0; b.deploy('spear', 1); b.cooldown.spear = 0; b.deploy('banner', 1); });
    await p.waitForTimeout(7000);
    await p.evaluate(() => { const b = Z.Game.battle; b.units.filter(u => u.team === 0 && u.type === 'spear').forEach(u => (u.hp = u.max * 0.4)); });
    await p.waitForTimeout(1200); await shot(p, 'v02-08-tema-' + name);
    check(await p.evaluate((l) => Z.Game.battle.theme === Z.realmOf(l), lvl), 'Bölüm ' + lvl + ' teması doğru');
    await p.evaluate(() => Z.Game.toMenu());
  }
  // Buz Hatun
  await p.evaluate(() => { Z.Save.data.heroOwned.buz = true; Z.Save.data.hero = 'buz'; Z.Game.startBattle('campaign', 36); });
  await p.evaluate(() => { const b = Z.Game.battle; b.heroCd = 0; for (let i = 0; i < 3; i++) b.spawn(1, 'spear', 1); });
  await p.waitForTimeout(800);
  await p.evaluate(() => Z.Game.battle.useSkill(1)); await p.waitForTimeout(500); await shot(p, 'v02-09-buz');
  check(await p.evaluate(() => Z.Game.battle.units.some(u => u.team === 1 && u.stunUntil > Z.Game.battle.t)), 'Buz Hatun düşmanları dondurdu');
  await browser.close();
  console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Hata yok');
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
