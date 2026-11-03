// v0.3 (dikey format + seferler): brifing, koridor secici, kurallar. node tests/e2e-v03.js [ciktiKlasoru]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const shot = (n) => p.screenshot({ path: path.join(out, n + '.png') });
  const check = (c, msg) => { if (!c) errors.push('KONTROL BASARISIZ: ' + msg); else console.log('  ✓', msg); };
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('zafarion.save.v1')) localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, seenVersion: '0.5', cleared: 13, coins: 900, gems: 30, stars: { 1: 3, 2: 3, 3: 3, 4: 2, 5: 3, 6: 3, 7: 2, 8: 3, 9: 3, 10: 2, 11: 3, 12: 3, 13: 2 }, stats: { totalStars: 35, wins: 13 }, daily: { lastDay: new Date().toISOString().slice(0,10), claimedToday: true, streak: 1 } })); } catch (e) {} });
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(800);
  await p.evaluate(() => { Z.UI.closeModal(); Z.Save.data.daily.claimedToday = true; Z.UI.renderHub(); });
  await p.waitForTimeout(400); await shot('v03-01-map');
  check(await p.evaluate(() => { const c = document.getElementById('tab-content'); return c.scrollTop > 300; }), 'Harita, sıradaki sefere kendiliğinden kayar');

  // sefer brifingi: kurallı bolum (14 = savunma seferi)
  await p.evaluate(() => { document.querySelector('[data-level="14"]').click(); }); await p.waitForTimeout(500); await shot('v03-02-briefing-survive');
  const txt = await p.locator('.modal').innerText();
  check(/Sefer 14/.test(txt) && /Savunma Seferi/.test(txt) && /Mevzii Tut/.test(txt) && /Zehir Nehri/.test(txt), 'Brifingde sefer no, hikâye, kural ve hedef var');
  await p.evaluate(() => { Z.UI.closeModal(); document.querySelector('[data-level="7"]').click(); }); await p.waitForTimeout(400); await shot('v03-03-briefing-heavy');
  check(/Zırhlı Ordu|Ağır/i.test(await p.locator('.modal').innerText()) || (await p.locator('.rule-box').count()) > 0, 'Kural kutusu gösteriliyor');
  await p.locator('[data-act="fight"]').click(); await p.waitForTimeout(1800); await shot('v03-04-battle-start');

  // koridor secici
  check(await p.evaluate(() => Z.Render.selLane === 1), 'Varsayılan koridor ortadaki');
  await p.locator('.lane-btn[data-lane="2"]').click(); await p.waitForTimeout(200);
  check(await p.evaluate(() => Z.Render.selLane === 2) && await p.locator('.lane-btn.on').getAttribute('data-lane') === '2', 'Alttaki 3. düğme koridoru değiştirir');
  const tap = await p.evaluate(() => { const s = Z.Game.stage, R = Z.Render; return { x: R.laneX(0) * s.scale + s.left, y: (R.eY + 300) * s.scale }; });
  await p.mouse.click(tap.x, tap.y); await p.waitForTimeout(200);
  check(await p.evaluate(() => Z.Render.selLane === 0), 'Sahada 1. koridora dokunmak onu seçer');
  // karta dokun: secili koridora birlik gelir
  await p.evaluate(() => { Z.Game.battle.gold = 500; });
  await p.locator('[data-unit="spear"]').click(); await p.waitForTimeout(300);
  check(await p.evaluate(() => Z.Game.battle.units.some(u => u.team === 0 && u.lane === 0)), 'Karta dokununca birlik seçili koridora (1) gelir');
  // kartı baska koridora surukle
  const card = await p.locator('[data-unit="archer"]').boundingBox();
  const to = await p.evaluate(() => { const s = Z.Game.stage, R = Z.Render; return { x: R.laneX(2) * s.scale + s.left, y: (R.eY + (R.pY - R.eY) * 0.5) * s.scale }; });
  await p.evaluate(() => { Z.Game.battle.cooldown.archer = 0; Z.Game.battle.gold = 500; });
  await p.mouse.move(card.x + card.width / 2, card.y + card.height / 2); await p.mouse.down(); await p.mouse.move(to.x, to.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  check(await p.evaluate(() => Z.Game.battle.units.some(u => u.team === 0 && u.type === 'archer' && u.lane === 2)), 'Kartı 3. koridora sürükleyince birlik orada çıkar');
  // dikey geometri: oyuncu birlikleri yukari ilerler
  await p.evaluate(() => { const b = Z.Game.battle; b.units.forEach(u => (u.atkCd = 99)); });
  const y0 = await p.evaluate(() => { const u = Z.Game.battle.units.find(u => u.team === 0); return Z.Render.Y(u.x); });
  await p.waitForTimeout(1500);
  const y1 = await p.evaluate(() => { const u = Z.Game.battle.units.find(u => u.team === 0); return Z.Render.Y(u.x); });
  check(y1 < y0 - 10, 'Birlikler ekranda yukarı (düşman kalesine) doğru ilerler');
  await shot('v03-05-battle-lanes');

  // savunma seferi arayuzu
  await p.evaluate(() => { Z.Game.startBattle('campaign', 16); const b = Z.Game.battle; b.rules = ['survive']; b.rule = 'survive'; Z.UI.hudBuild(b); }); await p.waitForTimeout(1200);
  check(/⏳/.test(await p.locator('#info-title').innerText()) && !(await p.locator('#rule-chip').getAttribute('class') || '').includes('hidden'), 'Savunma seferinde geri sayım ve kural rozeti görünür');
  await p.evaluate(() => { Z.Game.battle.t = Z.Game.battle.info.surviveTime - 0.2; }); await p.waitForTimeout(1800);
  check(await p.evaluate(() => Z.Game.battle.over && Z.Game.battle.result.win), 'Süre dolunca savunma seferi kazanılır');
  await p.waitForSelector('.modal h1', { timeout: 6000 }); await p.waitForTimeout(600); await shot('v03-06-result');
  await browser.close();
  console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Hata yok');
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
