// Tarayici duman testi: node tests/e2e-smoke.js [ciktiKlasoru]
// Playwright gerektirir (npm i -D playwright veya global kurulum).
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots');
require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function newPage(w, h) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    return page;
  }
  const shot = (page, n) => page.screenshot({ path: path.join(out, n + '.png') });

  const page = await newPage(915, 412);
  await page.goto(url);
  await page.waitForFunction(() => globalThis.Z && Z.ready);
  await page.waitForTimeout(800);
  await shot(page, '01-welcome');

  await page.click('[data-act="go"]');
  await page.waitForTimeout(500);
  // kartlari surukle: 1. kart -> koridor 0, 2. kart -> koridor 2
  const drag = async (sel, lane) => {
    const box = await page.locator(sel).boundingBox();
    const sc = await page.evaluate(() => Z.Game.stage.scale);
    const oy = await page.evaluate(() => Z.Render.oy);
    const ty = (oy + [265, 370, 475][lane]) * sc;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 40, { steps: 3 });
    await page.mouse.move(300, ty, { steps: 6 });
    await shot(page, 'drag-mid');
    await page.mouse.up();
  };
  await page.waitForTimeout(3500);
  await drag('[data-unit="spear"]', 1);
  await page.waitForTimeout(1500);
  await shot(page, '02-battle-early');

  // botla oyna: hizlandirilmis
  await page.evaluate(() => { Z.Game.speed = 2; });
  for (let i = 0; i < 120; i++) {
    await page.evaluate(() => {
      const b = Z.Game.battle; if (!b || b.over) return;
      if (b.perkOffer) b.pickPerk(b.perkOffer[0]);
      b.gold = Math.max(b.gold, 200);
      const th = [0, 0, 0]; b.units.forEach(u => { if (u.team === 1) th[u.lane] += u.hp; });
      const m = Math.max(...th), lane = m > 0 ? th.indexOf(m) : Math.floor(Math.random() * 3);
      const order = b.deck.slice(); const t = order[Math.floor(Math.random() * order.length)];
      b.cooldown[t] = 0; b.deploy(t, lane);
      if (b.skillReady()) b.useSkill(lane);
    });
    await page.waitForTimeout(300);
    if (i === 14) await shot(page, '03-battle-mid');
    if (await page.evaluate(() => Z.Game.battle && Z.Game.battle.over)) break;
  }
  await page.waitForTimeout(1800);
  await shot(page, '04-result');
  const res = await page.evaluate(() => Z.Game.battle && Z.Game.battle.result);
  console.log('Sonuc:', JSON.stringify(res));
  await page.click('[data-act="chest"]').catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, '05-result-chest');
  await page.click('[data-act="menu"]').catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, '06-hub-map');
  for (const t of ['army', 'vault', 'quests']) {
    await page.click('[data-tab="' + t + '"]'); await page.waitForTimeout(300); await shot(page, '07-tab-' + t);
  }
  await page.click('[data-tab="map"]'); await page.waitForTimeout(300);
  await page.click('.node.cur, .node.done:last-of-type').catch(() => {});
  await page.waitForTimeout(400); await shot(page, '08-level-modal');

  // farkli ekran: genis telefon + tablet
  for (const [w, h, n] of [[1280, 720, 'desktop'], [1024, 768, 'tablet'], [800, 360, 'small']]) {
    const p2 = await newPage(w, h); await p2.goto(url); await p2.waitForFunction(() => Z.ready); await p2.waitForTimeout(700);
    await p2.evaluate(() => { Z.Save.data.tutorialDone = true; Z.Save.data.daily.claimedToday = true; Z.UI.closeModal(); Z.Save.data.cleared = 13; Z.Save.data.unitLvl.spear = 6; });
    await p2.evaluate(() => Z.Game.startBattle('campaign', 14));
    await p2.evaluate(() => { const b = Z.Game.battle; b.gold = 999; ['spear','archer','cav','knight','mage'].forEach((t, i) => { if (b.deck.includes(t)) { b.cooldown[t] = 0; b.deploy(t, i % 3); } }); });
    await p2.waitForTimeout(6000);
    await shot(p2, '09-battle-' + n);
    await p2.context().close();
  }
  await browser.close();
  console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Konsol hatasi yok');
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
