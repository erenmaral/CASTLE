// Cizim maliyeti olcumu (yazilim cizimli headless Chromium: gercek telefondan YAVAS, goreli kiyas icindir)
const { chromium } = require('playwright'); const path = require('path');
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, seenVersion: '0.3', cleared: 44, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } })); } catch (e) {} });
  const p = await ctx.newPage(); await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(500);
  const res = await p.evaluate(() => {
    const out = {};
    for (const lvl of [1, 20, 40]) {
      let t0 = performance.now(); Z.Game.startBattle('campaign', lvl); out['bg_kurulum_ms_L' + lvl] = Math.round(performance.now() - t0);
      const bt = Z.Game.battle; bt.ai.think = 1e9; Z.Game.paused = true;
      for (let i = 0; i < 60; i++) { const lane = i % 3, tp = ['spear', 'archer', 'cav', 'knight', 'mage', 'cata', 'healer', 'banner'][i % 8]; const u = bt.spawn(i % 2, tp, lane); u.x = 300 + (i * 13) % 600; u.age = 5; }
      t0 = performance.now(); for (let i = 0; i < 60; i++) Z.Render.frame(1 / 60); out['kare_ms_L' + lvl + '_60birlik'] = +((performance.now() - t0) / 60).toFixed(2);
      Z.Game.toMenu();
    }
    return out;
  });
  console.log(JSON.stringify(res)); await b.close();
})();
