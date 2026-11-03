// v0.5: ACIK ALAN savaslari (yerlestirme, surukle-birak, savas, sonuc). node tests/e2e-v05.js [ciktiKlasoru]
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
  const stars = {}; for (let i = 1; i <= 20; i++) stars[i] = 3;
  await ctx.addInitScript((st) => { try { if (!localStorage.getItem('zafarion.save.v1')) localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, seenVersion: '0.7', cleared: 20, coins: 5000, gems: 100, stars: st, stats: { totalStars: 60, wins: 20 }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } })); } catch (e) {} }, stars);
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.evaluate(() => Z.UI.showHub('map')); await p.waitForTimeout(700);
  // dunya -> tarayici koordinati
  const scr = (wx, wy) => p.evaluate(([x, y]) => { const s = Z.Game.stage, R = Z.Render; return { x: s.left + (R.fox + x) * s.scale, y: (R.foy + y) * s.scale }; }, [wx, wy]);
  const cardPos = async (id) => { const r = await p.locator('[data-unit="' + id + '"]').boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const drag = async (a, b) => { await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await p.mouse.move(b.x, b.y, { steps: 4 }); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(120); };

  // Harita: acik alan isareti + brifing
  await p.evaluate(() => { Z.UI.closeModal(); Z.UI.renderHub(); }); await p.waitForTimeout(300);
  check(await p.evaluate(() => document.querySelectorAll('.node.fld').length === 42), 'Haritada 42 açık alan bölümü işaretli');
  await p.evaluate(() => document.querySelector('.node[data-level="8"]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('.node[data-level="8"]').click()); await p.waitForTimeout(400); await shot('v05-01-briefing');
  const mt = await p.locator('.modal').innerText();
  check(/AÇIK ALAN/.test(mt) && /Bayrakları Ele Geçir/.test(mt) && /komuta puanı/.test(mt), 'Brifing: açık alan rozeti, hedef ve komuta puanı');
  await p.click('[data-act="fight"]'); await p.waitForTimeout(1500);
  check(await p.evaluate(() => Z.Game.battle.kind === 'field' && Z.Game.battle.phase === 'prep'), 'Açık alan savaşı hazırlık aşamasında başladı');
  check(await p.evaluate(() => !document.getElementById('field-bar').classList.contains('hidden') && !document.getElementById('lane-pick')), 'HUD: yerleştirme çubuğu açık, koridor seçici gizli');
  await shot('v05-02-prep-empty');

  // Surukle-birak yerlestirme
  const n0 = await p.evaluate(() => Z.Game.battle.countTeam(0)); const g0 = await p.evaluate(() => Z.Game.battle.gold);
  const deck = await p.evaluate(() => Z.Game.battle.deck);
  await drag(await cardPos(deck[0]), await scr(250, 760)); await p.waitForTimeout(200);
  check(await p.evaluate((n) => Z.Game.battle.countTeam(0) === n + 1, n0), 'Kart sahaya sürüklenince birlik yerleşti');
  check(await p.evaluate((g) => Z.Game.battle.gold < g, g0), 'Komuta puanı düştü');
  // kart sec + dokun
  await p.locator('[data-unit="' + deck[1] + '"]').click(); await p.waitForTimeout(150);
  const tp = await scr(450, 770); await p.mouse.click(tp.x, tp.y); await p.waitForTimeout(150);
  check(await p.evaluate((n) => Z.Game.battle.countTeam(0) === n + 2, n0), 'Kart seç + sahaya dokun: ikinci birlik yerleşti');
  // gecersiz yer (dusman tarafi)
  const tp2 = await scr(300, 300); await p.mouse.click(tp2.x, tp2.y); await p.waitForTimeout(120);
  check(await p.evaluate((n) => Z.Game.battle.countTeam(0) === n + 2, n0), 'Yerleştirme alanı dışına birlik konmaz');
  // birlik tasima
  const un = await p.evaluate(() => { const u = Z.Game.battle.units.filter(x => x.team === 0 && !x.commander)[0]; return { id: u.id, x: u.x, y: u.y }; });
  await drag(await scr(un.x, un.y), await scr(120, 740));
  check(await p.evaluate((u) => { const q = Z.Game.battle.units.find(x => x.id === u.id); return Math.abs(q.x - 120) < 30 && q.y > 700; }, un), 'Hazırlıkta birlik sürüklenerek taşındı');
  // dokununca geri al
  const n1 = await p.evaluate(() => Z.Game.battle.countTeam(0)); const pos = await p.evaluate((u) => { const q = Z.Game.battle.units.find(x => x.id === u.id); return [q.x, q.y]; }, un);
  const tp3 = await scr(pos[0], pos[1]); await p.mouse.click(tp3.x, tp3.y); await p.waitForTimeout(150);
  check(await p.evaluate((n) => Z.Game.battle.countTeam(0) === n - 1, n1), 'Birliğe dokununca geri alındı (iade)');
  // otomatik
  await p.click('#fb-auto'); await p.waitForTimeout(300); await shot('v05-03-prep-auto');
  check(await p.evaluate(() => Z.Game.battle.countTeam(0) >= 8), 'Otomatik diziliş orduyu yerleştirdi');
  // savas
  await p.click('#fb-go'); await p.waitForTimeout(600);
  check(await p.evaluate(() => Z.Game.battle.phase === 'battle') && await p.locator('#fb-stance').isVisible(), 'SAVAŞ: faz değişti, duruş düğmesi göründü');
  await p.waitForTimeout(6000); await shot('v05-04-battle');
  await p.click('#fb-stance'); check(await p.evaluate(() => Z.Game.battle.stance === 'defend'), 'Duruş savunmaya geçti'); await p.click('#fb-stance');
  // takviye: alt seritten
  const gold = await p.evaluate(() => { Z.Game.battle.gold = 400; return Z.Game.battle.countTeam(0); });
  await drag(await cardPos(deck[0]), await scr(360, 800)); check(await p.evaluate((n) => Z.Game.battle.countTeam(0) >= n, gold), 'Savaşta alt şeritten takviye çağrıldı');
  // yetenek: dusmana surukle
  await p.evaluate(() => { Z.Game.battle.heroCd = 0; });
  const es = await p.evaluate(() => { const e = Z.Game.battle.units.filter(u => u.team === 1 && !u.commander)[0]; return e ? { x: e.x, y: e.y } : { x: 360, y: 200 }; });
  const sb = await p.locator('#btn-skill').boundingBox(); await drag({ x: sb.x + sb.width / 2, y: sb.y + sb.height / 2 }, await scr(es.x, es.y));
  check(await p.evaluate(() => Z.Game.battle.heroCd > 0 || Z.Game.battle.stats.skills > 0), 'Kahraman yeteneği sahadaki noktaya kullanıldı');
  await p.waitForTimeout(500); await shot('v05-05-skill');
  // zafer
  await p.evaluate(() => Z.Game.battle.kill(Z.Game.battle.cmdE)); await p.waitForSelector('.modal h1', { timeout: 8000 }); await p.waitForTimeout(800); await shot('v05-06-result');
  check(/ZAFER/.test(await p.locator('.modal h1').first().innerText()) && /Ordu korundu/.test(await p.locator('.modal').innerText()), 'Zafer ekranı (Ordu korundu %)');
  check(await p.evaluate(() => Z.Save.data.stars[8] >= 1), 'Yıldız kaydedildi');
  // yenilgi: komutan olur
  await p.click('[data-act="again"]'); await p.waitForTimeout(1200);
  check(await p.evaluate(() => Z.Game.battle.kind === 'field' && Z.Game.battle.phase === 'prep'), 'Tekrar: yeni hazırlık aşaması');
  await p.click('#fb-go'); await p.waitForTimeout(300); check(await p.evaluate(() => Z.Game.battle.phase === 'prep'), 'Birliksiz savaş başlamaz');
  await p.click('#fb-auto'); await p.click('#fb-go'); await p.waitForTimeout(500);
  await p.evaluate(() => Z.Game.battle.kill(Z.Game.battle.cmdP)); await p.waitForSelector('.modal h1', { timeout: 8000 }); await p.waitForTimeout(600);
  check(/Yenilgi/.test(await p.locator('.modal h1').first().innerText()) && /Komutanın düştü/.test(await p.locator('.modal').innerText()), 'Komutan düşünce yenilgi mesajı');
  await p.click('[data-act="menu"]'); await p.waitForTimeout(400);
  // kale kusatmasi hala calisiyor (bolum 1) + modlar arasi gecis
  await p.evaluate(() => Z.Game.startBattle('campaign', 5)); await p.waitForTimeout(1200);
  check(await p.evaluate(() => !Z.Game.battle.kind && !document.getElementById('lane-pick') && document.getElementById('field-bar').classList.contains('hidden')), 'Kale kuşatmasına dönünce eski HUD geri geldi');
  await shot('v05-07-castle-after');
  if (errors.length) { console.log('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('Tüm kontroller geçti');
  await browser.close();
})();
