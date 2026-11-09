// "Oyunu oyna": yeni bir oyuncu gibi GERCEK girdilerle (tiklama/surukleme) ilk bolumleri oynar, ekran goruntusu alir.
//   node tests/playthrough.js [ciktiKlasoru] [dil=tr]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); require('fs').mkdirSync(out, { recursive: true });
const LANG = process.argv[3] || 'tr';
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(); const notes = [];
  const ctx = await browser.newContext({ locale: LANG === 'tr' ? 'tr-TR' : 'en-US', viewport: { width: 412, height: 915 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); p.on('pageerror', e => notes.push('HATA: ' + e.message)); p.on('console', m => { if (m.type() === 'error') notes.push('konsol: ' + m.text().slice(0, 150)); });
  const shot = n => p.screenshot({ path: path.join(out, 'play-' + n + '.png') });
  const log = (m) => console.log('•', m);
  const center = async (sel) => { const r = await p.locator(sel).first().boundingBox(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const drag = async (a, b) => { await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await p.mouse.move(b.x, b.y, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(120); };
  const world = (wx, wy) => p.evaluate(([x, y]) => { const s = Z.Game.stage, R = Z.Render; return { x: s.left + (R.fox + x) * s.scale, y: (R.foy + y) * s.scale }; }, [wx, wy]);
  const laneXY = (lane, sy) => p.evaluate(([l, y]) => { const s = Z.Game.stage; return { x: s.left + Z.Render.laneX(l) * s.scale, y: y * s.scale }; }, [lane, sy]);
  const st = () => p.evaluate(() => ({ over: Z.Game.battle && Z.Game.battle.over, kind: Z.Game.battle && (Z.Game.battle.kind || 'lane'), gold: Z.Game.battle && Math.floor(Z.Game.battle.gold), modal: Z.UI.modalOpen(), phase: Z.Game.battle && Z.Game.battle.phase, tut: !document.getElementById('tut').classList.contains('hidden') }));

  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(1500);
  await shot('01-ilk-acilis'); log('ilk açılış: dil penceresi');
  await p.click('[data-act="l_' + LANG + '"]'); await p.waitForTimeout(400); await shot('02-karsilama'); await p.click('[data-act="go"]'); await p.waitForTimeout(1500);

  // ---- ogretici: ekrandaki yonergeleri izle ----
  for (let i = 0; i < 12; i++) {
    const t = await p.evaluate(() => ({ on: !document.getElementById('tut').classList.contains('hidden'), ok: !document.getElementById('tut-ok').classList.contains('hidden'), text: document.getElementById('tut-text').innerText, tgt: document.querySelector('#tut-ring') && !document.getElementById('tut-ring').classList.contains('hidden') }));
    if (!t.on) break; log('öğretici: ' + t.text.replace(/\n/g, ' ').slice(0, 70));
    if (t.ok) { await p.click('#tut-ok'); await p.waitForTimeout(400); continue; }
    if (/kart|card/i.test(t.text) || /Mızrakçı|birlik|unit/i.test(t.text)) { const c = await center('[data-unit]'); const l = await laneXY(i % 3, 560); await drag(c, l); }
    else if (/Madeni|mine/i.test(t.text)) { await p.evaluate(() => { Z.Game.battle.gold = Math.max(Z.Game.battle.gold, 150); }); await p.click('#btn-mine'); }
    else if (/Kahraman|hero|yetenek|skill/i.test(t.text)) { await p.evaluate(() => { Z.Game.battle.heroCd = 0; }); const sb = await center('#btn-skill'); const l = await laneXY(1, 420); await drag(sb, l); }
    else { const c = await center('[data-unit]'); const l = await laneXY(0, 600); await drag(c, l); }
    await p.waitForTimeout(500); if (i === 1) await shot('03-ogretici');
  }
  await shot('04-ilk-savas');
  // ---- 1. bolumu oyna: 3x hiz, periyodik kart surukle ----
  await p.click('#btn-speed'); await p.click('#btn-speed');
  for (let tick = 0; tick < 140; tick++) {
    const s = await st(); if (s.modal) { if (await p.locator('.perk').count()) { await p.locator('.perk').first().click(); notes.push(''); await p.waitForTimeout(300); continue; } break; } if (s.over) break;
    const cards = await p.evaluate(() => Array.from(document.querySelectorAll('[data-unit]:not(.poor)')).map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
    if (cards.length) { const c = cards[tick % cards.length]; await drag(c, await laneXY((tick >> 1) % 3, 520)); }
    const mine = await p.evaluate(() => { const b = Z.Game.battle; return b.mineCost() && b.gold >= b.mineCost() && b.mine < 3; }); if (mine) await p.click('#btn-mine');
    if (tick === 40) await shot('05-savas-ortasi');
    await p.waitForTimeout(350);
  }
  await p.waitForSelector('.modal h1', { timeout: 60000 }).catch(() => notes.push('1. bölüm 60sn içinde bitmedi')); await p.waitForTimeout(900); await shot('06-sonuc-1'); log('1. bölüm sonucu: ' + (await p.locator('.modal h1').first().innerText()));
  const res1 = await p.evaluate(() => ({ cleared: Z.Save.data.cleared, coins: Z.Save.data.coins })); log('kayıt: ' + JSON.stringify(res1));
  // ---- ordu: yukselt ----
  await p.click('[data-act="menu"]'); await p.waitForTimeout(600); await p.evaluate(() => Z.UI.showHub('army')); await p.waitForTimeout(400); await shot('07-ordu');
  const up = await p.locator('[data-upg]').count(); log('yükseltilebilir birim düğmesi: ' + up);
  // ---- 2-4. bolum (3. acik alan) ----
  for (const L of [2, 3]) {
    await p.evaluate((l) => { Z.Save.data.cleared = Math.max(Z.Save.data.cleared, l - 1); Z.UI.showHub('map'); }, L); await p.waitForTimeout(400);
    await p.evaluate((l) => Z.UI.levelModal(l), L); await p.waitForTimeout(400); await shot('08-brifing-' + L); await p.click('[data-act="fight"]'); await p.waitForTimeout(1500);
    const kind = (await st()).kind; log('bölüm ' + L + ' türü: ' + kind);
    if (kind === 'field') {
      await shot('09-acik-alan-hazirlik');
      const deck = await p.evaluate(() => Z.Game.battle.deck);
      for (let k = 0; k < 6; k++) { const c = await center('[data-unit="' + deck[k % deck.length] + '"]'); const w = await world(120 + k * 95, 700 + (k % 2) * 50); await drag(c, w); }
      await shot('10-acik-alan-yerlestirildi'); log('yerleştirilen birim: ' + await p.evaluate(() => Z.Game.battle.countTeam(0)));
      await p.click('#fb-go'); await p.waitForTimeout(500); await p.click('#btn-speed'); await p.click('#btn-speed');
    }
    for (let tick = 0; tick < 160; tick++) {
      const s = await st(); if (s.modal) { if (await p.locator('.perk').count()) { await p.locator('.perk').first().click(); notes.push(''); await p.waitForTimeout(300); continue; } break; } if (s.over) break;
      const cards = await p.evaluate(() => Array.from(document.querySelectorAll('[data-unit]:not(.poor)')).map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
      if (cards.length) { const c = cards[tick % cards.length]; const tgt = kind === 'field' ? await world(80 + (tick * 53) % 560, 810) : await laneXY(tick % 3, 520); await drag(c, tgt); }
      if (tick % 12 === 5) { const sb = await center('#btn-skill'); const tgt = kind === 'field' ? await world(360, 300) : await laneXY(1, 380); await drag(sb, tgt); }
      if (tick === 30) await shot('11-savas-' + L); await p.waitForTimeout(350);
    }
    await p.waitForSelector('.modal h1', { timeout: 60000 }).catch(() => notes.push(L + '. bölüm 60sn içinde bitmedi')); await p.waitForTimeout(900); await shot('12-sonuc-' + L); log(L + '. bölüm: ' + (await p.locator('.modal h1').first().innerText()));
    await p.evaluate(() => { Z.UI.closeModal(); Z.Game.toMenu(); }); await p.waitForTimeout(500);
  }
  // ---- magaza, gorevler, ayarlar ----
  for (const tab of ['shop', 'quests', 'vault']) { await p.evaluate((t) => Z.UI.showHub(t), tab); await p.waitForTimeout(350); await shot('13-sekme-' + tab); }
  console.log(notes.length ? 'NOTLAR:\n' + [...new Set(notes)].join('\n') : 'Not yok');
  await browser.close();
})();
