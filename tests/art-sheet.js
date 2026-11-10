// Z.Art contact sheet: node tests/art-sheet.js <out.png> [--dpr=2] [--runs=3] [--strict] [--split=<dir>]
// Loads www/js/art.js into a bare page, runs Z.Art.bake() exactly like the game boot will, and renders every tile (1x tiled 3x3 for the seam
// check, plus a 3x enlargement), the modal 9-slice frame around a sample panel, the battle overlay on dark / light grounds, and the
// realm grounds with sample nodes. Prints the boot-set / total bake timings (cold runs in fresh contexts) and a numeric seam check.
// --split=<dir> also writes one PNG per section (every tile, frames, realms, overlay) for close inspection.
// Exit code 1 on page errors or a failed seam check (and, with --strict, when the median boot set exceeds 25 ms).
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const args = process.argv.slice(2);
const flag = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const out = args.find(a => !a.startsWith('--')) || path.join(os.tmpdir(), 'art-sheet.png');
const DPR = +flag('dpr', 1), RUNS = +flag('runs', 3), STRICT = args.includes('--strict'), SPLIT = flag('split', '');
const ART = path.join(__dirname, '..', 'www', 'js', 'art.js');
const BOOT_BUDGET = 25;

const median = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);

async function loadPage(browser, dpr) {
  const ctx = await browser.newContext({ viewport: { width: 1840, height: 1000 }, deviceScaleFactor: dpr });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  await page.addScriptTag({ path: ART });
  return { ctx, page, errors };
}
const bakeCold = () => new Promise(res => {
  const t0 = performance.now(); let boot = -1, zart = 0, bootVars = null;
  const VARS = ['--dp-lapis', '--dp-quat', '--dp-gold', '--dp-vine', '--dp0', '--dp1', '--dp2', '--dp3', '--dp4', '--dp5', '--dp6', '--grain', '--frame', '--ivy', '--chequy-enemy', '--chequy-host'];
  const cs = getComputedStyle(document.documentElement), len = n => cs.getPropertyValue(n).length;
  document.addEventListener('zart', () => {
    zart++; if (zart > 1) return;
    const A = Z.Art, checks = [], ok = (name, v) => checks.push([name, !!v]);
    ok('boot set synchronous (--dp-lapis --grain --frame --ivy set before done; the rest still the "none" placeholder)', bootVars && ['--dp-lapis', '--grain', '--frame', '--ivy'].every(n => bootVars[n] > 1000) && VARS.filter(n => bootVars[n] <= 1000).length === 12);
    ok('all 16 custom properties are PNG data URLs', VARS.every(n => cs.getPropertyValue(n).indexOf('url("data:image/png;base64,') >= 0));
    ok('Z.Art.ready is true when zart fires', A.ready === true);
    ok('API names', ['tile', 'dataURL', 'bake', 'frame', 'overlay', 'ink', 'wob', 'rng', 'leafGrad', 'diaper', 'pattern'].every(n => typeof A[n] === 'function'));
    ok('TOK has the 21 section-2 tokens as hex', ['ink', 'ink2', 'night', 'lapis', 'lapisd', 'diap', 'azur', 'verm', 'mad', 'mal', 'vdg', 'orp', 'leaf', 'bole', 'pur', 'vel', 'vel2', 'ivo', 'arg', 'bis', 'flesh'].every(k => /^#[0-9A-F]{6}$/i.test(A.TOK[k] || '')));
    ok('LEAF_STOPS / LEAF_ART_STOPS', A.LEAF_STOPS.length === 5 && A.LEAF_ART_STOPS.length === 7 && A.LEAF_ART_STOPS[0][1] === '#8A5A10');
    const names = ['lapis', 'quat', 'gold', 'vine', 'grain', 'ivy', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'chequyEnemy', 'chequyHost'];
    ok('every tile is a canvas at 2 image px per u', names.every(n => { const t = A.tile(n); return t && t.tagName === 'CANVAS' && t.width === A.SIZE[n][0] * 2 && t.height === A.SIZE[n][1] * 2 && A.tile(n) === t; }));
    ok('dataURL is cached and a PNG', names.every(n => A.dataURL(n) === A.dataURL(n) && A.dataURL(n).indexOf('data:image/png;base64,') === 0));
    const f = A.frame('modal'); ok('frame(modal) = 176px canvas, slice 44, width 22', f && f.slice === 44 && f.width === 22 && f.canvas.width === 176 && f.canvas.height === 176);
    const ov = A.overlay(777, 1333, 1.1); ok('overlay is exactly w x h and cached', ov && ov.width === 777 && ov.height === 1333 && A.overlay(777, 1333, 1.1) === ov);
    const g = A.tile('grain'), d = g.getContext('2d').getImageData(0, 0, g.width, g.height).data; let hi = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 24) hi++;
    ok('grain speckle alpha <= .09 except the follicle dots (< 0.6% of pixels)', hi / (d.length / 4) < 0.006);
    let calls = 0; const before = A.stats.bootMs; A.bake(() => calls++); ok('bake() is idempotent (done called once more, nothing re-baked)', calls === 1 && A.stats.bootMs === before);
    const r = A.rng(5), r2 = A.rng(5), seq = [r(), r(), r()], seq2 = [r2(), r2(), r2()]; ok('rng deterministic in [0,1)', seq.join() === seq2.join() && seq.every(v => v >= 0 && v < 1));
    const w = A.wob(3, 0.7); let mx = 0; for (let i = 0; i < 2000; i++) mx = Math.max(mx, Math.abs(w())); ok('wob stays within +-0.7u', mx <= 0.7 && mx > 0.3);
    res({ boot, bootInner: A.stats.bootMs, total: performance.now() - t0, slices: A.stats.slices, tiles: A.stats.tiles, checks });
  });
  Z.Art.bake(() => { boot = performance.now() - t0; bootVars = {}; VARS.forEach(n => { bootVars[n] = len(n); }); });
});

// ---- runs inside the page: builds the sheet -------------------------------------------------------------------
function buildSheet(P) {
  const A = Z.Art, doc = document, el = (t, c, h) => { const e = doc.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
  const css = el('style', '', `
    *{box-sizing:border-box} body{margin:0;padding:18px;background:#26221d;color:#e8e0cc;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;width:1800px}
    h1{font:700 18px ui-monospace,monospace;margin:0 0 4px} h2{font:700 14px ui-monospace,monospace;margin:26px 0 8px;color:#E9B62A;border-bottom:1px solid #554a3a;padding-bottom:3px}
    .grid{display:flex;flex-wrap:wrap;gap:18px 26px;align-items:flex-start} .cell{padding:8px;background:#1a1713;border:1px solid #433b2e}
    .cell h3{margin:0 0 6px;font-size:12px;color:#c9bd9b;font-weight:400} .row{display:flex;gap:14px;align-items:flex-start}
    .lbl{font-size:11px;color:#9a8f76;margin:3px 0 0}
    .modal{position:relative;color:#F4ECD3;background:var(--dp-lapis) 0 0/144px,#1B2F78;border:22px solid transparent;border-image:var(--frame) 44/22px round;padding:14px 16px 16px}
    .modal h1{font:700 40px/1.05 Georgia,serif;margin:0 0 10px;text-shadow:0 3px 0 #1E1610;color:#F4ECD3}
    .story{background:var(--grain) 0 0/96px,#D8D0AB;border:3px solid #1E1610;border-radius:2px 9px 3px 8px;color:#1E1610;font:600 22px/30px Georgia,serif;padding:10px 14px;margin:0 0 12px}
    .btn{display:inline-block;font:700 26px/1 Georgia,serif;padding:15px 24px;margin:0 8px 0 0;border:3px solid #1E1610;border-radius:3px 8px 4px 7px/7px 4px 8px 3px;box-shadow:0 5px 0 #1E1610;background:#22409A;color:#F4ECD3}
    .btn.gold{background:#E9B62A;color:#1E1610;box-shadow:inset 3px 3px 0 #8C3520,0 5px 0 #1E1610}
    .sect{font:400 34px/1 Georgia,serif;color:#E9B62A;display:flex;align-items:center;gap:12px;margin:6px 0 12px}.sect::after{content:"";flex:1;height:36px;background:var(--ivy) left center/72px 36px repeat-x}
    .ground{display:inline-block;vertical-align:top;margin-right:18px;position:relative}
    .node{position:absolute;width:44px;height:48px;border-radius:50%;border:4px solid #1E1610;box-shadow:0 5px 0 #1E1610;color:#F4ECD3;font:700 20px/40px Georgia,serif;text-align:center}
    .chq{height:48px;border:3px solid #1E1610}
    canvas.ov,img.ov{display:block}
    .ph{width:412px;height:880px;position:relative;overflow:hidden;background:#0F1838;border:1px solid #433b2e}
    .phst{position:absolute;left:0;top:0;width:720px;height:1540px;transform-origin:0 0;transform:scale(.572);background:var(--dp-lapis) 0 0/144px,#0F1838;font:600 26px/1.3 Georgia,serif;color:#F4ECD3}
    .phtop{height:96px;background:var(--dp-lapis) 0 0/144px,#0F1838;border-bottom:4px solid #E9B62A;box-shadow:0 3px 0 #1E1610;display:flex;align-items:center;padding:0 20px;gap:16px}
    .phcurr{background:#0F1838;border:3px solid #1E1610;border-radius:3px 9px 3px 9px;box-shadow:0 4px 0 #1E1610;padding:8px 16px;font:800 28px system-ui}
    .phcoin{background:linear-gradient(112deg,#C99A2E,#F3D879 30%,#FBE9A0 42%,#D4A02F 62%,#E9C25A);color:#1E1610;box-shadow:inset 3px 3px 0 #8C3520,0 5px 0 #1E1610}
    .phsect{font:400 36px/1 Georgia,serif;color:#E9B62A;display:flex;align-items:center;gap:14px;margin:24px 20px 12px}.phsect::after{content:"";flex:1;height:36px;background:var(--ivy) left center/72px 36px repeat-x}
    .phcard{margin:0 20px 18px;padding:16px 20px;border:3px solid #1E1610;border-radius:3px 9px 4px 8px/8px 4px 9px 3px;box-shadow:0 5px 0 #1E1610;color:#F4ECD3;display:flex;align-items:center;gap:18px;min-height:76px}
    .phcard b{font:700 30px Georgia,serif}.phcard small{display:block;font:600 24px Georgia,serif}
    .phu{background:var(--dp-lapis) 0 0/144px,#22409A}.phq{background:var(--dp-vine) 0 0/40px,#1F6B4E}.php{background:var(--dp-quat) 0 0/56px,#9A2018}
    .phgem{width:64px;height:72px;border:3px solid #1E1610;border-radius:50% 50% 6px 6px/42% 42% 6px 6px;background:var(--dp-gold) 0 0/24px;flex:none}
    .phstory{margin:6px 20px 16px;background:var(--grain) 0 0/96px,#D8D0AB;border:3px solid #1E1610;border-radius:2px 9px 3px 8px;color:#1E1610;font:600 26px/34px Georgia,serif;padding:14px 18px}
    .phbtn{display:inline-block;font:700 30px/1 Georgia,serif;padding:18px 28px;border:3px solid #1E1610;border-radius:3px 8px 4px 7px/7px 4px 8px 3px;box-shadow:0 5px 0 #1E1610;background:#22409A;color:#F4ECD3;margin-right:12px}
    .phg{background:#E9B62A;color:#1E1610;box-shadow:inset 3px 3px 0 #8C3520,0 5px 0 #1E1610}
    .phmap{position:relative;height:250px;background:var(--dp0) 0 0/144px,#8DAA6B;margin-bottom:0}
    .phnode{position:absolute;width:88px;height:96px}.phnode::before{content:"";position:absolute;inset:8px 0 0;border-radius:50%;background:#22409A;border:4px solid #1E1610;box-shadow:0 5px 0 #1E1610}
    .phnode span{position:relative;display:block;text-align:center;font:700 34px/90px Georgia,serif}
    .phchq{height:64px;margin:0 20px 14px;border:3px solid #1E1610}.phh{background:var(--chequy-host) 0 0/24px}.phe{background:var(--chequy-enemy) 0 0/24px}
    .phmodal{position:absolute;left:60px;top:1160px;width:600px;box-sizing:border-box;background:var(--dp-lapis) 0 0/144px,#1B2F78;border:22px solid transparent;border-image:var(--frame) 44/22px round;padding:14px 18px 20px}
    .phmodal h1{font:700 46px/1.05 Georgia,serif;margin:0 0 10px;text-shadow:0 3px 0 #1E1610}
  `);
  doc.head.appendChild(css);
  const body = doc.body, T = A.stats.tiles;
  body.appendChild(el('h1', '', 'Z.Art contact sheet'));
  body.appendChild(el('div', '', P.header));

  // ---- tiles: 1x tiled 3x3 (seam check) | 3x enlargement ----
  body.appendChild(el('h2', '', 'Tiles - left: 1x (1u = 1 css px) repeated 3x3 through the CSS custom property, right: single tile enlarged 3x'));
  const grid = el('div', 'grid'); body.appendChild(grid);
  const order = ['lapis', 'quat', 'gold', 'vine', 'grain', 'ivy', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'chequyEnemy', 'chequyHost'];
  const vars = { lapis: '--dp-lapis', quat: '--dp-quat', gold: '--dp-gold', vine: '--dp-vine', grain: '--grain', ivy: '--ivy', chequyEnemy: '--chequy-enemy', chequyHost: '--chequy-host' };
  for (let i = 0; i < 7; i++) vars['r' + i] = '--dp' + i;
  order.forEach(n => {
    const [w, h] = A.SIZE[n], t = T[n] || {}, cell = el('div', 'cell'), v = vars[n];
    cell.appendChild(el('h3', '', `${n} &nbsp; ${w}x${h}u &nbsp; ${t.w}x${t.h}px &nbsp; draw ${f1(t.ms || 0)}ms png ${f1(t.pngMs || 0)}ms ${(t.bytes ? Math.round(t.bytes * 0.75 / 1024) : 0)}KB`));
    cell.dataset.sheet = n; const row = el('div', 'row'), a = el('div'), b = el('div');
    const rep = el('div'); rep.style.cssText = `width:${w * (w > 60 ? 3 : 6)}px;height:${h * (w > 60 ? 3 : 6)}px;background:var(${v}) 0 0/${w}px ${h}px;`;
    if (n === 'grain') rep.style.background = `var(${v}) 0 0/${w}px ${h}px,#D8D0AB`;
    if (n === 'ivy') { rep.style.cssText = `width:${w * 3}px;height:${h * 3}px;background:var(${v}) 0 0/${w}px ${h}px repeat-x,#1B2F78`; }
    a.appendChild(rep); a.appendChild(el('div', 'lbl', 'tiled at 1x'));
    const im = new Image(); im.src = A.dataURL(n); const big = el('div'); big.style.cssText = `width:${w * 3}px;height:${h * 3}px;background:${n === 'grain' ? '#D8D0AB' : n === 'ivy' ? '#1B2F78' : '#000'}`;
    im.style.cssText = `width:${w * 3}px;height:${h * 3}px;display:block`; big.appendChild(im);
    b.appendChild(big); b.appendChild(el('div', 'lbl', 'enlarged 3x'));
    if (n === 'ivy') { // also show the ivy bar on night and on vellum
      const night = el('div'); night.style.cssText = `width:${w * 3}px;height:36px;margin-top:8px;background:var(${v}) 0 0/${w}px ${h}px repeat-x,#0F1838`;
      const vel = el('div'); vel.style.cssText = `width:${w * 3}px;height:36px;margin-top:8px;background:var(${v}) 0 0/${w}px ${h}px repeat-x,#D8D0AB`;
      a.appendChild(night); a.appendChild(el('div', 'lbl', 'on --night')); a.appendChild(vel); a.appendChild(el('div', 'lbl', 'on --vel'));
    }
    row.appendChild(a); row.appendChild(b); cell.appendChild(row); grid.appendChild(cell);
  });

  // ---- modal frame ----
  body.appendChild(el('h2', '', 'Modal frame (border-image: var(--frame) 44/22px round) around a sample panel; three sizes to check the round repeat'));
  const mg = el('div', 'grid'); mg.dataset.sheet = 'frames'; body.appendChild(mg);
  [[560, 430], [360, 300], [640, 250]].forEach(([w, h], i) => {
    const m = el('div', 'modal'); m.style.cssText += `;width:${w}px;height:${h}px`;
    m.innerHTML = i === 0
      ? '<h1>Siege of Acre</h1><div class="story">The garrison holds the outer wall. Break the gate before the relief host arrives.</div><span class="btn">Back</span><span class="btn gold">Start</span><div class="sect" style="margin-top:14px">Orders</div>'
      : i === 1 ? '<h1>Victory</h1><div class="story">Three stars.</div><span class="btn gold">Next</span>' : '<h1>Army</h1><span class="btn">Back</span><span class="btn gold">Buy</span>';
    mg.appendChild(m);
  });

  // ---- realm grounds with sample nodes ----
  body.appendChild(el('h2', '', 'Realm grounds r0..r6 at 1x with sample nodes (blazons are added elsewhere)'));
  const rg = el('div', 'grid'); rg.dataset.sheet = 'realms'; body.appendChild(rg);
  const nf = [['#22409A', '#F4ECD3'], ['#E0AE36', '#1E1610'], ['#CDD2DB', '#1E1610'], ['#9A2018', '#F4ECD3'], ['#1F6B4E', '#F4ECD3'], ['#5B2E7A', '#F4ECD3'], ['#1E1610', '#E9B62A']];
  for (let i = 0; i < 7; i++) {
    const g = el('div', 'ground'); g.style.cssText = `width:288px;height:216px;background:var(--dp${i}) 0 0/144px,${A.REALM[i][0]}`;
    [[28, 150], [112, 90], [200, 140], [62, 36], [204, 36]].forEach(([x, y], j) => {
      const n = el('div', 'node', String(j + 1 + i)); n.style.cssText = `left:${x}px;top:${y}px;background:${nf[i][0]};color:${nf[i][1]}`; g.appendChild(n);
    });
    const road = el('div'); road.style.cssText = 'position:absolute;left:50px;top:170px;width:200px;height:0;border-top:5px dotted #4B3B2A;transform:rotate(-22deg);transform-origin:0 0'; g.appendChild(road);
    rg.appendChild(g);
  }
  const ch = el('div', 'grid'); ch.style.marginTop = '14px'; body.appendChild(ch);
  ['--chequy-enemy', '--chequy-host'].forEach(v => { const d = el('div', 'chq'); d.style.cssText = `width:300px;background:var(${v}) 0 0/24px 24px`; ch.appendChild(d); });

  // ---- in context at phone scale ----
  body.appendChild(el('h2', '', 'In context at phone scale (stage scale 0.572; background-size = the tile natural size in u: lapis 144, quat 56, vine 40, gold 24, grain 96, ivy 72x36, chequy 24)'));
  const pg = el('div', 'grid'); body.appendChild(pg);
  const ph = el('div', 'ph'); ph.dataset.sheet = 'phone'; pg.appendChild(ph);
  const st = el('div', 'phst'); ph.appendChild(st);
  st.innerHTML = `
    <div class="phtop"><span class="phcurr">12</span><span class="phcurr phcoin">1,240</span></div>
    <div class="phsect">Campaign</div>
    <div class="phcard phu"><div class="phgem"></div><div><b>Spearman</b><small>Cheap and sturdy front rank.</small></div></div>
    <div class="phcard phq"><div class="phgem"></div><div><b>Take the outer wall</b><small>Reward 120 gold</small></div></div>
    <div class="phcard php"><div class="phgem"></div><div><b>Treasure pack</b><small>3 cards, 1 rare</small></div></div>
    <div class="phstory">Acre fell after a siege of nearly two years. Break the gate before the relief host arrives from the sea.</div>
    <div class="phchq phh"></div><div class="phchq phe"></div>
    <div class="phmap"></div>
    <div class="phmodal"><h1>Siege of Acre</h1><div class="phstory" style="margin:0 0 14px">Three stars await the host.</div><span class="phbtn">Back</span><span class="phbtn phg">Start</span></div>`;
  [[60, 150], [200, 70], [340, 140], [480, 60], [600, 120]].forEach(([x, y], i) => { const n = el('div', 'phnode', `<span>${i + 1}</span>`); n.style.cssText = `left:${x}px;top:${y}px`; st.querySelector('.phmap').appendChild(n); });

  // ---- battle overlay ----
  body.appendChild(el('h2', '', 'Battle overlay Z.Art.overlay(w,h,k): 360x640 css px at 1:1 device px, on night / dark ground / realm-0 ground'));
  const og = el('div', 'grid'); og.dataset.sheet = 'overlay'; body.appendChild(og);
  const ow = Math.round(360 * P.dpr), oh = Math.round(640 * P.dpr), k = 0.5 * P.dpr;
  const t0 = performance.now(); const ov = A.overlay(ow, oh, k); P.ovMs = performance.now() - t0;
  [['#0F1838', ''], ['#2E3B26', ''], ['', '--dp0']].forEach(([bg, v]) => {
    const d = el('div'); d.style.cssText = `width:360px;height:640px;position:relative;background:${bg || '#8DAA6B'};${v ? 'background:var(--dp0) 0 0/72px,#8DAA6B' : ''}`;
    const c2 = el('canvas', 'ov'); c2.width = ow; c2.height = oh; c2.style.cssText = 'width:360px;height:640px;position:absolute;left:0;top:0'; c2.getContext('2d').drawImage(ov, 0, 0); d.appendChild(c2); og.appendChild(d);
  });
  // magnified corner + side of the overlay at 4x
  const mag = el('div', 'cell'); mag.appendChild(el('h3', '', 'overlay corner + top edge, 4x'));
  const mc = el('canvas', 'ov'); mc.width = 420 * 4 / 2 * 1; mc.height = 160 * 4 / 2; mc.style.cssText = `width:${420 * 2}px;height:${160 * 2}px;background:#2E3B26`;
  const mx = mc.getContext('2d'); mx.imageSmoothingEnabled = true; mx.drawImage(ov, 0, 0, 210 * P.dpr, 80 * P.dpr, 0, 0, mc.width, mc.height); mag.appendChild(mc); og.appendChild(mag);

  // ---- numeric seam check ----
  const res = [];
  function diff(d, w, ia, ib) { let s = 0; for (let ch = 0; ch < 4; ch++) s += Math.abs(d[ia + ch] - d[ib + ch]); return s / 4; }
  function seam(cv, axis, x0, y0, x1, y1) { // region [x0,x1)x[y0,y1): compare the wrap-around neighbours with ordinary neighbours
    const w = cv.width, d = cv.getContext('2d').getImageData(0, 0, w, cv.height).data; let a = 0, na = 0, n = 0, nn = 0, x, y;
    if (axis === 'x') { for (y = y0; y < y1; y++) { a += diff(d, w, (y * w + x1 - 1) * 4, (y * w + x0) * 4); na++; for (x = x0; x < x1 - 1; x++) { n += diff(d, w, (y * w + x) * 4, (y * w + x + 1) * 4); nn++; } } }
    else { for (x = x0; x < x1; x++) { a += diff(d, w, ((y1 - 1) * w + x) * 4, (y0 * w + x) * 4); na++; for (y = y0; y < y1 - 1; y++) { n += diff(d, w, (y * w + x) * 4, ((y + 1) * w + x) * 4); nn++; } } }
    return (a / na) / Math.max(0.05, n / nn);
  }
  order.forEach(n => { const cv = A.tile(n); res.push({ name: n, x: seam(cv, 'x', 0, 0, cv.width, cv.height), y: n === 'ivy' ? 0 : seam(cv, 'y', 0, 0, cv.width, cv.height) }); });
  const fr = A.frame('modal').canvas; res.push({ name: 'frame top', x: seam(fr, 'x', 44, 0, 132, 44), y: 0 }); res.push({ name: 'frame left', x: 0, y: seam(fr, 'y', 0, 44, 44, 132) });
  return { seams: res, ovMs: P.ovMs };
}

(async () => {
  const browser = await chromium.launch(); let failed = false; const log = (...a) => console.log(...a);
  try {
    // cold runs in fresh contexts: the boot set (4 tiles, synchronous) and the idle-baked rest
    const boots = [], totals = []; let last = null;
    for (let i = 0; i < RUNS; i++) {
      const { ctx, page, errors } = await loadPage(browser, 2);
      const r = await page.evaluate(bakeCold); boots.push(r.boot); totals.push(r.total); last = r;
      if (i === 0) { r.checks.forEach(([n, v]) => log((v ? '  ok   ' : '  FAIL ') + n)); if (r.checks.some(c => !c[1])) failed = true; }
      if (errors.length) { failed = true; log('ERRORS', errors); }
      await ctx.close();
    }
    log(`boot set (--dp-lapis --grain --frame --ivy), ${RUNS} cold runs: ` + boots.map(f1).join(' / ') + ` ms   median ${f1(median(boots))} ms   (budget ${BOOT_BUDGET} ms)`);
    log(`all tiles baked (boot + ${last.slices} idle slices), cold runs: ` + totals.map(f1).join(' / ') + ` ms   median ${f1(median(totals))} ms`);
    if (median(boots) > BOOT_BUDGET) { log('WARNING: boot set over budget'); if (STRICT) failed = true; }
    log('per tile (last run)    draw ms   png ms   png KB');
    Object.keys(last.tiles).forEach(n => { const t = last.tiles[n]; log('  ' + n.padEnd(14) + f1(t.ms).padStart(8) + f1(t.pngMs || 0).padStart(9) + String(Math.round((t.bytes || 0) * 0.75 / 1024)).padStart(9)); });

    // the sheet
    const { ctx, page, errors } = await loadPage(browser, DPR);
    const header = await page.evaluate(bakeCold).then(r => `boot set ${f1(r.boot)} ms, all tiles ${f1(r.total)} ms (cold, this page) - dpr ${DPR}`);
    const r = await page.evaluate(buildSheet, { dpr: DPR, header });
    await page.waitForTimeout(250);
    await page.screenshot({ path: out, fullPage: true });
    if (SPLIT) { require('fs').mkdirSync(SPLIT, { recursive: true }); for (const h of await page.$$('[data-sheet]')) await h.screenshot({ path: path.join(SPLIT, (await h.getAttribute('data-sheet')) + '.png') }); }
    log('overlay ' + Math.round(360 * DPR) + 'x' + Math.round(640 * DPR) + ' px: ' + f1(r.ovMs) + ' ms (cold)');
    const ov2 = await page.evaluate(() => { const t0 = performance.now(); Z.Art.overlay(1080, 1920, 1.5); const a = performance.now() - t0; const t1 = performance.now(); Z.Art.overlay(1080, 1920, 1.5); const b = performance.now() - t1; const t2 = performance.now(); Z.Art.overlay(1079, 1919, 1.5); return [a, b, performance.now() - t2]; });
    log('overlay 1080x1920 px: ' + f1(ov2[0]) + ' ms, cached ' + f1(ov2[1]) + ' ms, resize to 1079x1919 ' + f1(ov2[2]) + ' ms');
    log('seam ratios (wrap-around column diff / ordinary column diff; ~1 = seamless, fail > 2.5):');
    r.seams.forEach(s => { const bad = s.x > 2.5 || s.y > 2.5; if (bad) failed = true; log('  ' + s.name.padEnd(14) + 'x ' + f1(s.x).padStart(5) + '   y ' + f1(s.y).padStart(5) + (bad ? '   <-- SEAM' : '')); });
    if (errors.length) { failed = true; log('ERRORS', errors); }
    log('sheet: ' + out);
    await ctx.close();
  } finally { await browser.close(); }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
