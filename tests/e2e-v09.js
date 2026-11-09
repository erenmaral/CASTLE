// v0.9: hazirlik kartlari, brifingte kahraman secimi, yildiz ipucu, onerilen seviye. node tests/e2e-v09.js [ciktiKlasoru]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const ctx = await browser.newContext({ locale: 'tr-TR', viewport: { width: 412, height: 915 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  const check = (c, msg) => { if (!c) errors.push('KONTROL BASARISIZ: ' + msg); else console.log('  ✓', msg); };
  const stars = {}; for (let i = 1; i <= 12; i++) stars[i] = 2;
  await ctx.addInitScript((st) => { try { if (!localStorage.getItem('__i')) { localStorage.setItem('__i', '1'); localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.10', cleared: 12, coins: 4000, gems: 200, stars: st, heroOwned: { aslan: true, yildiz: true }, boost: { gold: 2, skill: 1, shield: 0 }, stats: { totalStars: 24, wins: 12 }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } })); } } catch (e) {} }, stars);
  const p = await ctx.newPage(); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const shot = (n) => p.screenshot({ path: path.join(out, n + '.png') });
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.evaluate(() => Z.UI.showHub('map')); await p.waitForTimeout(600);
  // 1. bolumde kart yok, ilk bolumlerde onerilen seviye makul
  await p.evaluate(() => Z.UI.levelModal(1)); await p.waitForTimeout(300); check(await p.locator('.boost-row').count() === 0, '1. bölüm brifinginde hazırlık kartı satırı yok'); await p.evaluate(() => Z.UI.closeModal());
  // 7. bolum (kale): kartlar + kahraman
  await p.evaluate(() => Z.UI.levelModal(7)); await p.waitForTimeout(300); await shot('v09-01-brifing-kartlar');
  check(await p.locator('.bchip').count() === 3 + 2 && /3 yıldız/.test(await p.locator('.modal').innerText()) && /70/.test(await p.locator('.modal').innerText()), 'Brifingte 3 hazırlık kartı + 2 kahraman düğmesi + 3 yıldız ipucu (kale canı %70)');
  check(await p.locator('[data-act="bst_shield"].none').count() === 1, 'Biten kart soluk gösterilir');
  await p.click('[data-act="bst_shield"]'); await p.waitForTimeout(200); check(await p.locator('[data-act="bst_shield"].on').count() === 0, 'Bitmiş karta basınca seçilmez (uyarı)');
  await p.click('[data-act="bst_gold"]'); await p.waitForTimeout(250); await p.click('[data-act="bst_skill"]'); await p.waitForTimeout(250);
  check(await p.locator('[data-act="bst_gold"].on').count() === 1 && await p.locator('[data-act="bst_skill"].on').count() === 1, 'İki hazırlık kartı seçildi');
  await p.click('[data-act="hero_yildiz"]'); await p.waitForTimeout(250); check(await p.evaluate(() => Z.Save.data.hero === 'yildiz'), 'Brifingte kahraman seçimi kaydedildi'); await shot('v09-02-secili');
  await p.click('[data-act="fight"]'); await p.waitForTimeout(1500);
  check(await p.evaluate(() => { const b = Z.Game.battle; return b.boosters.join() === 'gold,skill' && b.heroId === 'yildiz' && b.heroCd === 0 && b.gold >= 120 + 150 - 1; }), 'Savaş kartlarla başladı: +150 altın, hazır yetenek, seçilen kahraman');
  check(await p.evaluate(() => Z.Save.data.boost.gold === 1 && Z.Save.data.boost.skill === 0), 'Kullanılan kartlar envanterden düşüldü');
  check(await p.evaluate(() => document.getElementById('skill-ico').textContent.length > 0 && /HAZIR|READY/i.test(document.getElementById('skill-state').textContent)), 'HUD: yetenek hazır görünüyor'); await shot('v09-03-savas');
  // pazar: kart satin al
  await p.evaluate(() => { Z.Game.toMenu(); Z.UI.showHub('vault'); }); await p.waitForTimeout(400);
  const g0 = await p.evaluate(() => Z.Save.data.gems); await p.click('[data-buy="b_shield"]'); await p.waitForTimeout(300);
  check(await p.evaluate(([g]) => Z.Save.data.boost.shield === 3 && Z.Save.data.gems === g - Z.MARKET.filter(m => m.id === 'b_shield')[0].gems, [g0]), 'Pazar: Sur Zırhı ×3 satın alındı'); await shot('v09-04-pazar');
  // acik alan briefingi: komutan ipucu
  await p.evaluate(() => { Z.UI.showHub('map'); Z.UI.levelModal(8); }); await p.waitForTimeout(300); check(/65/.test(await p.locator('.modal').innerText()), 'Açık alan brifingi: ordunun %65\'i hayatta kalsın ipucu');
  await p.click('[data-act="bst_shield"]'); await p.click('[data-act="fight"]'); await p.waitForTimeout(1500);
  check(await p.evaluate(() => { const b = Z.Game.battle; return b.kind === 'field' && b.boosters.join() === 'shield' && b.cmdP.max > b.cmdE.max * 0.5 && Z.Save.data.boost.shield === 2; }), 'Açık alanda sur zırhı komutanı güçlendirdi');
  // geri tusu sonuc ekraninda: menuye doner (eskiden olu bir savas ekraninda kaliyordu)
  await p.evaluate(() => { Z.Game.toMenu(); Z.Save.data.boost.gold = 2; Z.Game.startBattle('campaign', 6, { boosters: ['gold'] }); Z.Game.battle.finish(false); }); await p.waitForSelector('.modal h1', { timeout: 8000 }); await p.waitForTimeout(500);
  await p.evaluate(() => Z.Game.onBack()); await p.waitForTimeout(500);
  check(await p.evaluate(() => !Z.UI.modalOpen() && !Z.Game.battle && !document.getElementById('hub').classList.contains('hidden')), 'Geri tuşu sonuç ekranında menüye döner (savaş ekranında takılmaz)');
  // yeniden basla / tekrar: hazirlik kartlari tekrar harcanmaz
  await p.evaluate(() => { Z.Save.data.boost.gold = 2; Z.Game.startBattle('campaign', 6, { boosters: ['gold'] }); }); await p.waitForTimeout(600);
  check(await p.evaluate(() => Z.Save.data.boost.gold === 1), 'Kart savaş başında 1 kez harcandı');
  await p.evaluate(() => Z.Game.pause()); await p.waitForTimeout(300); await p.click('[data-act="restart"]'); await p.waitForTimeout(800);
  check(await p.evaluate(() => Z.Save.data.boost.gold === 1 && !Z.Game.battle.boosters.length), 'Yeniden Başla hazırlık kartını tekrar harcamaz');
  if (errors.length) { console.log('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('Tüm kontroller geçti');
  await browser.close();
})();
