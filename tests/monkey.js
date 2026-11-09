// Maymun testi: rastgele (ama GERCEK) tiklama/surukleme ile oyunu zorlar; sayfa hatalari ve degismezleri denetler.
//   node tests/monkey.js [saniye=90] [tohum=1] [dil=tr] [genislik=412] [yukseklik=915]
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
const SECS = +process.argv[2] || 90, SEED = +process.argv[3] || 1, LANG = process.argv[4] || 'tr', VW = +process.argv[5] || 412, VH = +process.argv[6] || 915;
let s = SEED * 2654435761 >>> 0; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
(async () => {
  const browser = await chromium.launch(); const problems = []; const counts = {};
  const ctx = await browser.newContext({ locale: LANG === 'tr' ? 'tr-TR' : 'en-US', viewport: { width: VW, height: VH }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const stars = {}; for (let i = 1; i <= 60; i++) stars[i] = 1 + (i % 3);
  await ctx.addInitScript(([lang, st]) => { try { if (!localStorage.getItem('__m')) { localStorage.setItem('__m', '1'); localStorage.setItem('sefervakti.lang', lang); localStorage.setItem('sv.monetize', 'test'); localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.9', cleared: 60, coins: 30000, gems: 400, stars: st, heroOwned: { aslan: true, yildiz: true, buz: true }, stats: { totalStars: 120, wins: 60 }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } })); } } catch (e) {} }, [LANG, stars]);
  const p = await ctx.newPage();
  p.on('pageerror', e => problems.push('pageerror: ' + e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text().slice(0, 200)); });
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(800);
  const SKIP = /^(reset|yes|imp|load|exp|copy|l_|lang)/;
  const targets = () => p.evaluate((skip) => {
    const re = new RegExp(skip), out = [];
    document.querySelectorAll('button, [data-level], [data-act], [data-tab], [data-home], [data-unit], [data-upg], [data-deck], [data-hsel], [data-hup], [data-hbuy], [data-buy], [data-quest], [data-ach], [data-star], [data-ad], [data-iap], [data-shop], [data-spin], [data-collect], [data-castle], [data-tup], [data-daily], .card, .fbtn, .hbtn, .perk, [data-act-hub]').forEach(el => {
      const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
      const x = Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), y = Math.min(innerHeight - 2, Math.max(2, r.top + r.height / 2)), top = document.elementFromPoint(x, y);
      if (!top || !(el === top || el.contains(top) || top.contains(el))) return;
      const act = el.getAttribute('data-act') || ''; if (re.test(act)) return;
      out.push({ x, y, t: (el.getAttribute('data-act') || el.getAttribute('data-home') || el.getAttribute('data-tab') || el.id || el.className || el.tagName).toString().slice(0, 30) });
    }); return out; }, SKIP.source);
  const state = () => p.evaluate(() => {
    const d = Z.Save.data, b = Z.Game.battle, bad = [];
    ['coins', 'gems', 'cleared', 'endlessBest', 'castleLvl'].forEach(k => { if (!Number.isFinite(d[k])) bad.push('kayit.' + k + '=' + d[k]); });
    for (const u in d.unitLvl) if (!Number.isFinite(d.unitLvl[u]) || d.unitLvl[u] < 1) bad.push('birim sv ' + u + '=' + d.unitLvl[u]);
    if (d.coins < 0 || d.gems < 0) bad.push('negatif bakiye ' + d.coins + '/' + d.gems);
    let info = null;
    if (b) {
      if (!Number.isFinite(b.gold) || !Number.isFinite(b.t)) bad.push('savas altin/zaman NaN');
      b.units.forEach(u => { if (!Number.isFinite(u.hp) || !Number.isFinite(u.x) || (u.y !== undefined && !Number.isFinite(u.y))) bad.push('birim NaN ' + u.type); });
      info = { t: b.t, over: b.over, kind: b.kind || 'lane', phase: b.phase, perk: !!b.perkOffer, paused: Z.Game.paused, hold: Z.Game.tutHold, units: b.units.length };
    }
    return { bad, info, modal: Z.UI.modalOpen(), hub: !document.getElementById('hub').classList.contains('hidden'), home: !document.getElementById('home').classList.contains('hidden') };
  });
  let stuckT = 0, lastBT = -1, steps = 0; const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000) {
    steps++; const st = await state(); st.bad.forEach(b => problems.push('degismez: ' + b));
    if (st.info && !st.info.over && !st.info.paused && !st.modal && !st.info.hold && !(st.info.kind === 'field' && st.info.phase === 'prep')) { if (Math.abs(st.info.t - lastBT) < 1e-9) stuckT++; else stuckT = 0; lastBT = st.info.t; if (stuckT > 12) { problems.push('savas takildi (zaman ilerlemiyor) ' + JSON.stringify(st.info)); stuckT = 0; await p.evaluate(() => Z.Game.toMenu()); } } else { stuckT = 0; lastBT = -1; }
    const r = rnd();
    try {
      if (st.info && !st.modal && r < 0.45) { // savasta: kart surukle / dokun
        const cards = await p.evaluate(() => Array.from(document.querySelectorAll('[data-unit]')).map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
        if (cards.length) { const c = pick(cards), tx = 40 + rnd() * (VW - 80), ty = 160 + rnd() * (VH - 480); counts.drag = (counts.drag || 0) + 1; await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move((c.x + tx) / 2, (c.y + ty) / 2, { steps: 3 }); await p.mouse.move(tx, ty, { steps: 3 }); await p.mouse.up(); }
      } else if (st.info && !st.modal && r < 0.55) { counts.tapfield = (counts.tapfield || 0) + 1; await p.mouse.click(30 + rnd() * (VW - 60), 160 + rnd() * (VH - 450)); }
      else {
        const ts = await targets(); if (!ts.length) { await p.evaluate(() => { if (Z.UI.modalOpen()) Z.UI.closeModal(); }); await p.waitForTimeout(120); continue; }
        const heavy = ts.filter(x => /^(fight|go|again|next|play|endless|daily|map|army|shop|quests|vault)$/.test(x.t) || /^node/.test(x.t)); const t = heavy.length && rnd() < 0.6 ? pick(heavy) : pick(ts); counts[t.t] = (counts[t.t] || 0) + 1; await p.mouse.click(t.x, t.y);
      }
      if (rnd() < 0.1 && st.info) await p.evaluate(() => { Z.Game.speed = 3; });
      if (rnd() < 0.04) await p.evaluate(() => { const b = Z.Game.battle; if (b && !b.over && b.kill) { const c = b.cmdE; if (c) b.kill(c); else if (b.base) b.base[1].hp = 0; } }); // bazen savasi bitir (sonuc ekranlarina ulas)
    } catch (e) { problems.push('eylem hatasi: ' + e.message.slice(0, 120)); }
    await p.waitForTimeout(60 + rnd() * 140);
  }
  const uniq = [...new Set(problems)];
  console.log('adim:', steps, '· dil:', LANG, '· tohum:', SEED, '· en cok tiklanan:', Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e.join('=')).join(' '));
  console.log(uniq.length ? 'SORUNLAR (' + uniq.length + '):\n' + uniq.slice(0, 25).join('\n') : 'Sorun bulunamadi');
  await browser.close(); process.exit(uniq.length ? 1 : 0);
})();
