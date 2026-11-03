// Gorsel galeri: tum birlikleri iki takim icin sahneye dizer, yakin plan ekran goruntusu alir.
// node tests/gallery.js [ciktiKlasoru]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await ctx.addInitScript(() => { try { localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, seenVersion: '0.3', cleared: 74, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } })); } catch (e) {} });
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.evaluate(() => Z.UI.showHub('map')); await p.waitForTimeout(600);
  for (const [lvl, name] of [[1, 'orman'], [20, 'col'], [40, 'buz'], [50, 'volkan'], [65, 'batak']]) {
    await p.evaluate((l) => { Z.UI.closeModal(); Z.Save.data.deck = ['spear', 'archer', 'cav', 'knight', 'mage']; Z.Game.startBattle('campaign', l); }, lvl);
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      const b = Z.Game.battle; b.ai.think = 1e9; b.ai.gold = -1e9; b.units.length = 0;
      const row = [['spear', 'archer', 'cav'], ['knight', 'mage', 'cata'], ['healer', 'banner', 'assassin'], ['golem', 'flamer', 'spear']];
      row.forEach((types, i) => types.forEach((t, lane) => {
        const a = b.spawn(0, t, lane); a.x = 270 + i * 110; a.age = 5; if (i === 0 && lane === 0) a.atkAnim = 0.12; if (t === 'flamer') a.atkAnim = 0.1;
        const e = b.spawn(1, t, lane); e.x = 720 + i * 110; e.age = 5; if (i === 3 && lane === 0) e.burnUntil = b.t + 99;
      }));
      b.units.forEach(u => { u.atkCd = 99; });
      b.units[2].hp = b.units[2].max * 0.5; b.units[3].hp = b.units[3].max * 0.6;
      Z.Game.paused = true;
    });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(out, 'gal-' + name + '-full.png') });
    await p.evaluate(() => Z.Game.toMenu());
  }
  // yakin plan: orman temasinda oyuncu ve dusman birlikleri
  await p.evaluate(() => { Z.Save.data.deck = ['spear', 'archer', 'cav', 'knight', 'mage']; Z.Game.startBattle('campaign', 1); });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const b = Z.Game.battle; b.ai.think = 1e9; b.ai.gold = -1e9; b.units.length = 0;
    const row = [['spear', 'archer', 'cav'], ['knight', 'mage', 'cata'], ['healer', 'banner', 'assassin'], ['golem', 'flamer', 'spear']];
    row.forEach((types, i) => types.forEach((t, lane) => { const a = b.spawn(0, t, lane); a.x = 300 + i * 105; a.age = 5; const e = b.spawn(1, t, lane); e.x = 740 + i * 105; e.age = 5; }));
    b.units.forEach(u => { u.atkCd = 99; }); Z.Game.paused = true;
  });
  await p.waitForTimeout(500);
  const g = await p.evaluate(() => { const s = Z.Game.stage, R = Z.Render; return { l: 0, w: 412, sy: R.Y(380) * s.scale, ey: R.Y(790) * s.scale }; });
  await p.screenshot({ path: path.join(out, 'gal-yakin-oyuncu.png'), clip: { x: 0, y: g.sy - 150, width: 412, height: 330 } });
  await p.screenshot({ path: path.join(out, 'gal-yakin-dusman.png'), clip: { x: 0, y: g.ey - 120, width: 412, height: 330 } });
  await browser.close();
  console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Hata yok'); process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
