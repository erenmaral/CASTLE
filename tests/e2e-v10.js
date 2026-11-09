// v0.10.3: gercekci koridor sahnesi (scenery.js): 7 temanin hepsinde ayrintili arka plan kurulur (basit surume dusmez), makul surede, savas calisir.
const { chromium } = require('playwright'); const path = require('path');
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(), errors = [], warns = [];
  const check = (c, msg) => { if (!c) errors.push('KONTROL BASARISIZ: ' + msg); else console.log('  ✓', msg); };
  const ctx = await browser.newContext({ locale: 'tr-TR', viewport: { width: 412, height: 915 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('__i')) { localStorage.setItem('__i', '1'); localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.10', cleared: 100, coins: 3000, gems: 50, stars: {}, stats: { totalStars: 60, wins: 30 }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } })); } } catch (e) {} });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning' && /scenery/.test(m.text())) warns.push(m.text()); });
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(600);
  check(await p.evaluate(() => !!(Z.Render.Scenery && Z.Render.buildBgBasic)), 'scenery.js yüklü, basit yedek mevcut');
  for (const L of [6, 20, 35, 50, 65, 80, 95]) {
    await p.evaluate((L) => { Z.Game.startBattle('campaign', L, { diff: 1, boosters: [] }); }, L); await p.waitForTimeout(900);
    const r = await p.evaluate(() => { const R = Z.Render, t0 = performance.now(); let ok = true; try { R.Scenery.build.call(R); } catch (e) { ok = e.message; } return { ok, ms: performance.now() - t0, theme: R.theme, has: !!R.bg }; });
    check(r.ok === true && r.has && r.ms < 400, 'Seferde ' + L + ' (tema ' + r.theme + '): ayrıntılı sahne kuruldu (' + Math.round(r.ms) + ' ms)' + (r.ok === true ? '' : ' → ' + r.ok));
  }
  for (const L of [8, 23, 38, 53, 68, 83, 98]) {
    await p.evaluate((L) => { Z.Game.startBattle('campaign', L, { diff: 1, boosters: [] }); }, L); await p.waitForTimeout(900);
    const r = await p.evaluate(() => { const R = Z.Render, t0 = performance.now(); let ok = true; try { R.Scenery.field.call(R); } catch (e) { ok = e.message; } return { ok, ms: performance.now() - t0, field: R.field, theme: R.theme }; });
    check(r.field && r.ok === true && r.ms < 400, 'Kale önü (sefer ' + L + ', tema ' + r.theme + '): ayrıntılı arka plan kuruldu (' + Math.round(r.ms) + ' ms)' + (r.ok === true ? '' : ' → ' + r.ok));
  }
  check(warns.length === 0, 'basit sahneye geri dönüş olmadı');
  await p.evaluate(() => { Z.Game.startBattle('campaign', 6, { diff: 1, boosters: [] }); }); await p.waitForTimeout(800);
  await p.evaluate(() => { const b = Z.Game.battle; b.gold = 1000; b.deploy('spear', 1); }); await p.waitForTimeout(2500);
  check(await p.evaluate(() => Z.Game.battle.units.length > 0), 'sahne üstünde savaş çalışıyor');
  await browser.close();
  if (errors.length) { console.log('HATALAR:\n' + errors.join('\n')); process.exit(1); } else console.log('Tüm kontroller geçti');
})();
