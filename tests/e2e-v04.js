// v0.4: gunluk sefer, zorluk, pazar, kayit tasima, yeni diyarlar. node tests/e2e-v04.js [ciktiKlasoru]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const shot = (n) => p.screenshot({ path: path.join(out, n + '.png') });
  const check = (c, msg) => { if (!c) errors.push('KONTROL BASARISIZ: ' + msg); else console.log('  ✓', msg); };
  const stars = {}; for (let i = 1; i <= 20; i++) stars[i] = 3;
  await ctx.addInitScript((st) => { try { if (!localStorage.getItem('zafarion.save.v1')) localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, seenVersion: '0.3', cleared: 20, coins: 5000, gems: 100, stars: st, stats: { totalStars: 60, wins: 20 }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } })); } catch (e) {} }, stars);
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(700);

  // Yenilikler penceresi (0.3 kaydi ile)
  check(/Sefer Vakti 0\.6/.test(await p.locator('.modal h1').first().innerText()), 'Yenilikler 0.6 penceresi gösterildi');
  await shot('v04-01-whatsnew'); await p.click('[data-act="ok"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { Z.UI.closeModal(); Z.Save.data.daily.claimedToday = true; Z.UI.renderHub(); }); await p.waitForTimeout(300);
  check(await p.evaluate(() => document.querySelectorAll('.node').length === 105), 'Harita 105 bölümü gösteriyor');
  check(await p.locator('.daily-card[data-act-hub="daily"]').count() === 1, 'Günlük Sefer kartı haritada');
  await p.evaluate(() => { document.getElementById('tab-content').scrollTop = 0; }); await p.waitForTimeout(200); await shot('v04-02-map-daily');

  // Gunluk sefer
  await p.locator('.daily-card').click(); await p.waitForTimeout(400); await shot('v04-03-daily-modal');
  const dtxt = await p.locator('.modal').innerText();
  check(/Günlük Sefer/.test(dtxt) && /Ödül günde bir kez/.test(dtxt), 'Günlük Sefer brifingi (kurallar + ödül) açıldı');
  const di = await p.evaluate(() => Z.Save.dailyInfo());
  await p.click('[data-act="go"]'); await p.waitForTimeout(1500);
  check(await p.evaluate(() => Z.Game.battle.mode === 'daily' && Z.Game.battle.rules.length === 2 && Z.Game.battle.theme >= 0), 'Günlük sefer iki kuralla başladı');
  check(/Günlük Sefer/.test(await p.locator('#info-title').innerText()) && (await p.locator('#rule-chip').innerText()).length > 0, 'HUD: başlık ve kural rozeti');
  await shot('v04-04-daily-battle');
  const g0 = await p.evaluate(() => Z.Save.data.gems), c0 = await p.evaluate(() => Z.Save.data.coins);
  await p.evaluate(() => { const b = Z.Game.battle; if (b.kind) b.kill(b.cmdE); else b.base[1].hp = 0; }); await p.waitForSelector('.modal h1', { timeout: 8000 }); await p.waitForTimeout(800);
  check(/GÜNLÜK SEFER TAMAM/.test(await p.locator('.modal h1').first().innerText()), 'Günlük sefer zafer ekranı');
  check(await p.evaluate(([g, c, di]) => Z.Save.data.dailySefer.won && Z.Save.data.coins - c >= di.rewardCoins && Z.Save.data.gems - g >= 12, [g0, c0, di]), 'Günlük ödül hesaba eklendi');
  await shot('v04-05-daily-result');
  await p.click('[data-act="menu"]'); await p.waitForTimeout(400);
  check(await p.locator('.daily-card.done').count() === 1, 'Kart "Tamam" durumuna geçti');

  // Zorluk kademeleri
  await p.evaluate(() => { document.querySelector('[data-level="7"]').click(); }); await p.waitForTimeout(400);
  check(await p.locator('.diff').count() === 3 && await p.locator('.diff.lock').count() === 1, 'Brifingde 3 kademe, Efsane kilitli');
  await p.click('[data-act="diff1"]'); await p.waitForTimeout(300); await shot('v04-06-diff-hard');
  check(/Zor/.test(await p.locator('.diff.on').innerText()) && /ödül ×2/.test(await p.locator('.modal').innerText()), 'Zor kademe seçildi, ödül ×2 yazıyor');
  await p.click('[data-act="diff2"]'); await p.waitForTimeout(200);
  check(await p.locator('.diff.on').innerText().then(t => /Zor/.test(t)), 'Kilitli Efsane seçilemedi');
  await p.click('[data-act="fight"]'); await p.waitForTimeout(1200);
  check(await p.evaluate(() => Z.Game.battle.diff === 1 && Z.Game.battle.D.name === 'Zor'), 'Savaş Zor kademede başladı');
  check(/🔥/.test(await p.locator('#rule-chip').innerText()), 'HUD\'da zorluk simgesi');
  await p.evaluate(() => Z.Game.battle.base[1].hp = 0); await p.waitForSelector('.modal h1', { timeout: 8000 }); await p.waitForTimeout(700);
  check(await p.evaluate(() => Z.Save.data.hardCleared[7] === 1), 'Zor galibiyeti kaydedildi'); await shot('v04-07-hard-result');
  await p.click('[data-act="menu"]'); await p.waitForTimeout(300);

  // Pazar
  await p.click('[data-tab="vault"]'); await p.waitForTimeout(400);
  check(await p.locator('[data-buy]').count() === 4, 'Pazar: 4 ürün');
  const bc = await p.evaluate(() => [Z.Save.data.coins, Z.Save.data.gems]);
  await p.locator('[data-buy="coins"]').click(); await p.waitForTimeout(300);
  check(await p.evaluate(([c, g]) => Z.Save.data.gems === g - 10 && Z.Save.data.coins > c, bc), 'Altın Kesesi alındı (elmas düştü, altın arttı)');
  await p.evaluate(() => { document.getElementById('tab-content').scrollTop = 400; }); await p.waitForTimeout(200); await shot('v04-08-market');

  // Kayit tasima
  await p.evaluate(() => { Z.Save.data.coins = 12345; Z.Save.save(); }); await p.click('#btn-settings'); await p.waitForTimeout(300);
  await shot('v04-09-settings'); await p.click('[data-act="exp"]'); await p.waitForTimeout(300);
  const code = await p.locator('#save-code').inputValue(); check(code.length > 50, 'Kayıt kodu üretildi');
  await p.click('[data-act="back"]'); await p.waitForTimeout(200);
  await p.evaluate(() => { Z.Save.data.coins = 1; });
  await p.click('[data-act="imp"]'); await p.waitForTimeout(200);
  await p.fill('#save-code', 'gecersiz'); await p.click('[data-act="load"]'); await p.waitForTimeout(200);
  check(await p.locator('#toast').innerText().then(t => /Geçersiz/.test(t)), 'Geçersiz kod reddedildi');
  await p.fill('#save-code', code); await p.click('[data-act="load"]'); await p.waitForTimeout(500);
  check(await p.evaluate(() => Z.Save.data.coins === 12345), 'Kayıt kodu ile ilerleme geri yüklendi');

  // Ust sinirlar (MAKS)
  await p.evaluate(() => { Z.Save.data.castleLvl = Z.MAX_CASTLE_LVL; Z.Save.data.heroLvl.aslan = Z.MAX_HERO_LVL; Z.Save.data.unitLvl.spear = Z.MAX_UNIT_LVL; Z.UI.tab = 'army'; Z.UI.renderHub(); }); await p.waitForTimeout(300);
  check(await p.locator('#tab-content .btn.off:text("MAKS")').count() >= 3, 'Üst sınıra ulaşan yükseltmeler MAKS gösteriyor');

  // Yeni diyarlar
  for (const [lvl, name] of [[50, 'volkan'], [65, 'batak']]) {
    await p.evaluate((l) => { Z.Save.data.cleared = 74; Z.Save.data.deck = ['spear', 'assassin', 'golem', 'flamer', 'healer']; Z.Game.startBattle('campaign', l); }, lvl);
    await p.evaluate(() => { const b = Z.Game.battle; b.gold = 999; ['spear', 'assassin', 'golem', 'flamer', 'healer'].forEach((t, i) => { b.cooldown[t] = 0; b.deploy(t, i % 3); }); });
    await p.waitForTimeout(6000); await shot('v04-10-' + name);
    check(await p.evaluate((l) => Z.Game.battle.theme === Z.realmOf(l) && Z.Game.battle.theme >= 3, lvl), 'Bölüm ' + lvl + ' yeni diyar teması');
    await p.evaluate(() => Z.Game.toMenu());
  }
  await browser.close();
  console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Hata yok'); process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
