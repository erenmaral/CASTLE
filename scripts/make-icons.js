#!/usr/bin/env node
'use strict';
/*
 * Castle Siege: History - app icon, splash and boot emblem generator (docs/ART_DIRECTION.md section 9).
 *
 *   node scripts/make-icons.js            regenerate every output below
 *   node scripts/make-icons.js --svg      only rewrite store/art/*.svg (no browser needed)
 *
 * Concept: a historiated initial. A burnished gold-leaf Lombardic capital C (thick/thin 3:2, bar-serif hooks) is laid over
 * red bole - the bole peeks out where the leaf is misregistered - and outlined in two passes of iron-gall ink. Its counter is
 * the picture field: an argent tower on vermilion. The ground is the lapis diaper. Everything is drawn here as SVG paths with
 * a seeded hand-wobble (no random numbers, no external images, no fonts), so two runs on the same browser build give byte-identical files.
 *
 * Geometry: one master layer of 1080 units = the 108 dp adaptive-icon layer (1 unit = 0.1 dp). The letter is drawn in a
 * local frame about 600 units across (ink included) and every output is a crop of the master: launcher layers, legacy
 * tiles, the full-bleed store icon, the maskable icon, the boot emblem and the splash emblem. Detail follows the output size
 * (optical sizing): the smaller the letter, the fewer fine details - tooling, burnish marks and the field diaper from 200 px of letter,
 * flecks and the second ink pass from 100 px, mortar from 60 px - and the bolder the background diaper.
 *
 * Writes (only these; everything else in the project is left alone):
 *   store/art/{emblem,icon-bg,icon-fg,icon-mono,emblem-boot}.svg   layered masters (groups bg, counter, bole, leaf-c, tower, ink)
 *   store/art/emblem-boot.png                                      512 px, transparent
 *   android/app/src/main/res/mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher{,_round,_foreground,_background,_monochrome}.png
 *   android/app/src/main/res/drawable-{m,h,xh,xxh,xxxh}dpi/splash_emblem.png   288 dp canvas (Android 12 icon box), letter = 34% of 360 dp
 *   android/app/src/main/res/{mipmap-anydpi-v26/ic_launcher{,_round}.xml, drawable/splash.xml, values-v31/styles.xml, values/ic_launcher_background.xml}
 *   www/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
 * and removes the old drawable*-/splash.png files and the template vectors.
 *
 * Needs Playwright (Chromium) only to rasterise the SVGs. After writing it audits what it drew against the spec numbers.
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const ART = path.join(ROOT, 'store', 'art');
const WEB = path.join(ROOT, 'www', 'icons');

/* ------------------------------------------------------------------ palette (docs/ART_DIRECTION.md s2) */
const K = {
  ink: '#1E1610', ink2: '#4B3B2A', night: '#0F1838', lapis: '#22409A', lapisd: '#14275F', diap: '#1B2F78', lat: '#2F52B0',
  orp: '#E9B62A', leaf: '#D4A02F', bole: '#8C3520', verm: '#D8391F', mad: '#9A2018', mal: '#1F6B4E', ivo: '#F4ECD3',
  arg: '#CDD2DB', argD: '#8B94A8',
};
/* --leaf-art burnish stops */
const LEAF = [[0, '#8A5A10'], [.18, '#D8A530'], [.34, '#FBE9A0'], [.5, '#D4A02F'], [.66, '#A06E18'], [.82, '#E9C25A'], [1, '#8A5A10']];

/* ------------------------------------------------------------------ deterministic helpers */
function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* smooth 2D noise ~unit RMS: a few plane waves with seeded direction, wavelength and phase */
function noise(seed, n = 5, lmin = 70, lmax = 200) {
  const r = rng(seed), w = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, L = lmin + (lmax - lmin) * r();
    w.push({ kx: Math.cos(a) * 2 * Math.PI / L, ky: Math.sin(a) * 2 * Math.PI / L, ph: r() * Math.PI * 2, am: .5 + r() * .5 });
  }
  const nrm = Math.sqrt(w.reduce((s, q) => s + q.am * q.am, 0) / 2);
  return (x, y) => { let s = 0; for (const q of w) s += q.am * Math.sin(q.kx * x + q.ky * y + q.ph); return s / nrm; };
}
const rad = d => d * Math.PI / 180;
const sm = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const f1 = n => { const s = (Math.round(n * 10) / 10).toString(); return s === '-0' ? '0' : s; };

/* ------------------------------------------------------------------ polyline toolkit */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function seg(p, q, step) { const n = Math.max(1, Math.ceil(dist(p, q) / step)), o = []; for (let i = 0; i < n; i++) o.push([p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n]); return o; } // excludes the end point
function arc(cx, cy, rf, a0, a1, step) { // rf: number or (angle)->radius; excludes the end point
  const rr = typeof rf === 'function' ? rf : () => rf, R = rr((a0 + a1) / 2), n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * R / step)), o = [];
  for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n, r = rr(a); o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return o;
}
function smoothClosed(pts, k) { // triangular moving average: rounds corners (~k*step), leaves big arcs untouched
  if (!k) return pts;
  const n = pts.length, o = [];
  for (let i = 0; i < n; i++) { let sx = 0, sy = 0, sw = 0; for (let j = -k; j <= k; j++) { const w = k + 1 - Math.abs(j), p = pts[(i + j + n) % n]; sx += p[0] * w; sy += p[1] * w; sw += w; } o.push([sx / sw, sy / sw]); }
  return o;
}
function smoothOpen(pts, k) {
  if (!k) return pts;
  const n = pts.length, o = [];
  for (let i = 0; i < n; i++) { let sx = 0, sy = 0, sw = 0; for (let j = -k; j <= k; j++) { const idx = Math.min(n - 1, Math.max(0, i + j)); const w = k + 1 - Math.abs(j); sx += pts[idx][0] * w; sy += pts[idx][1] * w; sw += w; } o.push([sx / sw, sy / sw]); }
  o[0] = pts[0]; o[n - 1] = pts[n - 1];
  return o;
}
function rdp(pts, eps, closed) { // Ramer-Douglas-Peucker; closed loops are split at the point farthest from the start
  if (pts.length < 4) return pts;
  const dl = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; if (!l) return dist(p, a); const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)); return dist(p, [a[0] + t * dx, a[1] + t * dy]); };
  const run = (a) => { if (a.length < 3) return a; let mi = 0, md = -1; for (let i = 1; i < a.length - 1; i++) { const d = dl(a[i], a[0], a[a.length - 1]); if (d > md) { md = d; mi = i; } } if (md <= eps) return [a[0], a[a.length - 1]]; return run(a.slice(0, mi + 1)).slice(0, -1).concat(run(a.slice(mi))); };
  if (!closed) return run(pts);
  let fi = 0, fd = -1; for (let i = 1; i < pts.length; i++) { const d = dist(pts[i], pts[0]); if (d > fd) { fd = d; fi = i; } }
  const A = pts.slice(0, fi + 1), B = pts.slice(fi).concat([pts[0]]);
  return run(A).slice(0, -1).concat(run(B).slice(0, -1));
}
const warp = (pts, nx, ny, A, ox = 0, oy = 0) => pts.map(([x, y]) => [x + A * nx(x, y) + ox, y + A * ny(x, y) + oy]);
function D(pts, closed = true) { // path data
  let s = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
  for (let i = 1; i < pts.length; i++) s += 'L' + f1(pts[i][0]) + ' ' + f1(pts[i][1]);
  return s + (closed ? 'Z' : '');
}
/* wobble + soften + simplify in one go: the hand-cut version of a dense outline */
function hand(pts, o) {
  const { nx, ny, A = 1.2, k = 2, eps = .15, ox = 0, oy = 0, closed = true } = o;
  const w = warp(pts, nx, ny, A, ox, oy);
  return rdp(closed ? smoothClosed(w, k) : smoothOpen(w, k), eps, closed);
}

/* ------------------------------------------------------------------ the initial: geometry (unit = 0.1 dp of the 108 dp layer; C is 600 u across, ink included) */
const CP = { Ro: 280, bump: 8, tmin: 92, tmax: 131, phi0: 58, xr: 236, xl: 124, yb: 64 }; // nominal edges, ink is centred on them (15 u each side)
const INK_W = 30;
const HARM = (() => { // seeded low-order harmonics: the bowl is not quite a circle and its thickness drifts a little, like a pen-cut letter
  const r = rng(7), mk = amp => [2, 3, 5, 8].map((h, i) => ({ h, a: amp * [1, .7, .5, .3][i], p: r() * Math.PI * 2 }));
  return { out: mk(2.6), inn: mk(2.2) };
})();
const angPhi = th => Math.abs(((th + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * 180 / Math.PI; // angular distance from +x, degrees
function harm(set, th) { const w = sm((angPhi(th) - 42) / 40); let s = 0; for (const q of set) s += q.a * Math.sin(q.h * th + q.p); return s * w; }
function outerR(theta, d) { // outer radius: a circle with a faint Gothic point on the thick (left) side
  const e = (180 - angPhi(theta)) / 30;
  return CP.Ro + CP.bump * Math.exp(-e * e) + harm(HARM.out, theta) - d;
}
function innerR(theta, d) { // inner (counter) radius at screen angle theta; d>0 erodes the letter (counter grows)
  const phi = angPhi(theta), e = (180 - phi) / 30, t = CP.tmin + (CP.tmax - CP.tmin) * sm((phi - CP.phi0) / (180 - CP.phi0));
  return CP.Ro - t + CP.bump * Math.exp(-e * e) + harm(HARM.inn, theta) + d;
}
function cLoop(d, step = 4) { // outline of the letter eroded by d (screen coords, centre of the outer circle = origin); returns the pieces and the closed loop
  const Ro = CP.Ro - d, xr = CP.xr - d, xl = CP.xl + d, yb = CP.yb + d, th = Math.acos(xr / Ro);
  let lo = 0, hi = Math.PI / 2; // junction of the inner curve with the hook's inner face x = xl
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (innerR(m, d) * Math.cos(m) > xl) lo = m; else hi = m; }
  const ta = (lo + hi) / 2, yin = innerR(ta, d) * Math.sin(ta), yo = Ro * Math.sin(th);
  const P = {
    outer: arc(0, 0, a => outerR(a, d), -th, -(2 * Math.PI - th), step), // outer arc, counter-clockwise over the top, left, bottom
    lrf: seg([xr, yo], [xr, yb], step),                                // lower hook: outer face up
    lmf: seg([xr, yb], [xl, yb], step),                                // mouth face
    llf: seg([xl, yb], [xl, yin], step),                               // inner face down to the bowl
    inner: arc(0, 0, a => innerR(a, d), ta, 2 * Math.PI - ta, step),   // counter, round the thick left side
    ulf: seg([xl, -yin], [xl, -yb], step),                             // upper hook: inner face
    umf: seg([xl, -yb], [xr, -yb], step),                              // mouth face
    urf: seg([xr, -yb], [xr, -yo], step),                              // outer face up
  };
  const pts = [].concat(P.outer, P.lrf, P.lmf, P.llf, P.inner, P.ulf, P.umf, P.urf);
  return { P, pts, xl, xr, yb, yin, yo, th, ta };
}


/* ------------------------------------------------------------------ the miniature: an argent tower (local coords, origin = centre of the base, y up is negative) */
const TW = { // nominal edges; ink is centred on them
  plinthW: 55, plinthH: 26, shaftW: 47, headW: 62, headY: 166, topY: 232, mH: 40,
};
function towerSilhouette(step = 4, n = 3) {
  const t = TW, hw = t.headW, top = -t.topY, cr = top + t.mH; // cr: bottom of the crenels
  const m = n === 3 ? 32 : 44, g = n === 3 ? (2 * hw - 3 * m) / 2 : 2 * hw - 2 * m; // merlon / crenel width
  const P = [[-t.plinthW, 0], [t.plinthW, 0], [t.plinthW, -t.plinthH], [t.shaftW, -t.plinthH], [t.shaftW, -t.headY], [hw, -t.headY], [hw, top]];
  let x = hw; // walk the top edge from right to left
  for (let i = 0; i < n; i++) { P.push([x, top], [x - m, top]); if (i < n - 1) { P.push([x - m, cr], [x - m - g, cr]); } x -= m + g; }
  P.push([-hw, top], [-hw, -t.headY], [-t.shaftW, -t.headY], [-t.shaftW, -t.plinthH], [-t.plinthW, -t.plinthH]);
  // dedupe consecutive duplicates
  const Q = P.filter((q, i) => i === 0 || dist(q, P[i - 1]) > .01);
  let o = []; for (let i = 0; i < Q.length; i++) o = o.concat(seg(Q[i], Q[(i + 1) % Q.length], step));
  return o;
}
function doorPts(step = 3) { // round-arched door, ink
  const r = 20, cy = -44; let o = [];
  o = o.concat(seg([-r, 0], [-r, cy], step), arc(0, cy, r, Math.PI, 2 * Math.PI, step), seg([r, cy], [r, 0], step));
  return o;
}
function slitPts(step = 3) { return [].concat(seg([-6, -86], [-6, -124], step), seg([-6, -124], [0, -134], step), seg([0, -134], [6, -124], step), seg([6, -124], [6, -86], step), seg([6, -86], [-6, -86], step)); }

/* ------------------------------------------------------------------ the initial, assembled. detail: 0 (<=72 px) .. 3 (>=192 px) */
const towerT = t => `translate(${t.x} ${t.y}) rotate(-.7) scale(${t.s})`;   // the tower leans a hair, as drawn by hand
function leafGradient(id, x1, y1, x2, y2, stops = LEAF) {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
}
function buildInitial(detail = 3, opt = {}) {
  const o = Object.assign({ merlons: 3, towerInk: [14, 17, 19, 20][detail], tower: { x: -2, y: 115, s: 1.06 }, A: 1.0, closeInk: 18, tooling: detail >= 3, surface: detail >= 3, fieldDiaper: detail >= 3, fringe: detail >= 2, flecks: detail >= 2 }, opt);
  const nx = noise(11, 5, 200, 380), ny = noise(23, 5, 200, 380);      // letter wobble (shared by ink, bole and field so they stay registered)
  const gx = noise(37, 4, 120, 260), gy = noise(41, 4, 120, 260);        // leaf edge wobble (independent of the ink)
  const tx = noise(53, 4, 70, 160), ty = noise(59, 4, 70, 160);          // tower wobble
  const k = detail >= 2 ? 3 : 2, A = o.A;
  const c0 = cLoop(0), cb = cLoop(13), cg = cLoop(17);
  const ix = noise(71, 5, 110, 260), iy = noise(73, 5, 110, 260), jx = noise(79, 5, 110, 260), jy = noise(83, 5, 110, 260); // the two ink passes wander independently of the leaf and the bole
  const loop0 = hand(c0.pts, { nx: ix, ny: iy, A: A * 1.15, k });          // core ink pass
  const loop2 = hand(c0.pts, { nx: jx, ny: jy, A: A * 1.15, k });          // second pass (--ink2): peeks out where the pen drifted
  const bole = hand(cb.pts, { nx, ny, A, k });
  const gold = hand(cg.pts, { nx: gx, ny: gy, A: A * 1.8, k, ox: 3.2, oy: 3.6 });
  // field = counter of the letter closed by a vertical line between the hooks
  const field = hand([].concat(c0.P.inner, seg([c0.xl, c0.yin], [c0.xl, -c0.yin], 4)), { nx, ny, A, k });
  const closing = hand(seg([c0.xl, -c0.yb], [c0.xl, c0.yb], 4).concat([[c0.xl, c0.yb]]), { nx, ny, A, k: 1, closed: false });

  // tower, placed in the field
  const tw = { nx: tx, ny: ty, A: .6, k: 1 };
  const sil = hand(towerSilhouette(4, o.merlons), tw), door = hand(doorPts(), tw), slit = hand(slitPts(), tw);
  const T = towerT(o.tower);
  const bbox = { x0: -290, x1: 262, y0: -290, y1: 290 };
  const gl = 112 * Math.PI / 180, dx = Math.sin(gl), dy = -Math.cos(gl), Wb = bbox.x1 - bbox.x0, Hb = bbox.y1 - bbox.y0, L = Math.abs(Wb * dx) + Math.abs(Hb * dy), mx = (bbox.x0 + bbox.x1) / 2, my = (bbox.y0 + bbox.y1) / 2;
  const defs = leafGradient('leaf', mx - dx * L / 2, my - dy * L / 2, mx + dx * L / 2, my + dy * L / 2) + `<clipPath id="tclip"><path d="${D(sil)}"/></clipPath><clipPath id="gclip"><path d="${D(gold)}"/></clipPath><clipPath id="fclip"><path d="${D(field)}"/></clipPath>`;

  const g = {};
  // the miniature's ground: a tone-on-tone quatrefoil diaper in the vermilion (docs --dp-quat), only where it can be seen
  let ground = '';
  if (o.fieldDiaper) {
    const r = rng(404), cell = 66, q = 7.6;
    for (let j = -8; j <= 8; j++) for (let i = -5; i <= 5; i++) {
      const x = i * cell + (j & 1 ? cell / 2 : 0) + (r() - .5) * 2.4 - 18, y = j * cell / 2 + (r() - .5) * 2.4 + 4, rr = q * (.92 + r() * .16);
      ground += `<path d="M${f1(x)} ${f1(y - rr * 1.55)}a${f1(rr)} ${f1(rr)} 0 0 1 ${f1(rr * 1.55)} ${f1(rr * 1.55)}a${f1(rr)} ${f1(rr)} 0 0 1 ${f1(-rr * 1.55)} ${f1(rr * 1.55)}a${f1(rr)} ${f1(rr)} 0 0 1 ${f1(-rr * 1.55)} ${f1(-rr * 1.55)}a${f1(rr)} ${f1(rr)} 0 0 1 ${f1(rr * 1.55)} ${f1(-rr * 1.55)}Z" fill="${K.mad}" fill-opacity=".3"/>`;
    }
    ground = `<g clip-path="url(#fclip)">${ground}</g>`;
  }
  g.counter = `<g id="counter"><path d="${D(field)}" fill="${K.verm}"/>${ground}</g>`;
  g.bole = `<g id="bole"><path d="${D(bole)}" fill="${K.bole}"/></g>`;
  // tooling on the gold: ring-and-dot punches along the thick stroke, a few flecks where leaf flaked off the bole
  let tool = '';
  if (o.tooling) {
    for (let a = 112; a <= 248; a += 17) {
      const th = rad(a), rc = (outerR(th, 0) + innerR(th, 0)) / 2, x = rc * Math.cos(th) + 1.2 * nx(rc * Math.cos(th), rc * Math.sin(th)), y = rc * Math.sin(th) + 1.2 * ny(rc * Math.cos(th), rc * Math.sin(th));
      tool += `<circle cx="${f1(x)}" cy="${f1(y)}" r="10" fill="none" stroke="#8A5A10" stroke-width="3.6" stroke-opacity=".8"/><circle cx="${f1(x + .8)}" cy="${f1(y + .8)}" r="3.4" fill="#FBE9A0"/>`;
    }
  }
  let fleck = '';
  if (o.flecks) {
    const r = rng(99);
    for (let i = 0; i < 6; i++) {
      const th = rad(-200 + r() * 200), rr = outerR(th, 0) - 18.5 - r() * 3, x = rr * Math.cos(th), y = rr * Math.sin(th), q = 3 + r() * 3;
      fleck += `<path d="M${f1(x - q)} ${f1(y)}L${f1(x - q * .3)} ${f1(y - q)}L${f1(x + q)} ${f1(y - q * .2)}L${f1(x + q * .4)} ${f1(y + q)}Z" fill="${K.bole}"/>`;
    }
  }
  let surf = '';
  if (o.surface) {
    const r = rng(314);
    // burnisher streaks: short arcs concentric with the bowl, lighter and darker than the leaf
    for (let i = 0; i < 16; i++) {
      const a0 = 100 + r() * 150, span = 14 + r() * 38, mid = (a0 + span / 2), rc = (outerR(rad(mid), 0) + innerR(rad(mid), 0)) / 2 + (r() - .5) * 64, light = r() < .65;
      surf += `<path d="${D(arc(0, 0, rc, rad(a0), rad(a0 + span), 5).concat([[rc * Math.cos(rad(a0 + span)), rc * Math.sin(rad(a0 + span))]]), false)}" fill="none" stroke="${light ? '#FFF3C4' : '#8A5A10'}" stroke-width="${f1(2 + r() * 2.4)}" stroke-linecap="round" stroke-opacity="${f1((light ? .34 : .22) * 100) / 100}"/>`;
    }
    for (const sd of [[-318, -92, -150, 118], [-150, 296, 214, 238]]) { // leaf joints: a faint dark line with a pale ridge beside it
      surf += `<path d="M${sd[0]} ${sd[1]}L${sd[2]} ${sd[3]}" stroke="#8A5A10" stroke-opacity=".3" stroke-width="2.4" fill="none"/><path d="M${sd[0] + 2.6} ${sd[1] + 1.6}L${sd[2] + 2.6} ${sd[3] + 1.6}" stroke="#FFF3C4" stroke-opacity=".3" stroke-width="2" fill="none"/>`;
    }
    surf = `<g clip-path="url(#gclip)">${surf}</g>`;
  }
  g.leaf = `<g id="leaf-c"><path d="${D(gold)}" fill="url(#leaf)"/>${surf}${tool}${fleck}</g>`;
  const mortar = [];
  { const ys = [-132, -98, -64], xs = [[-12, 22], [-26, 8], [-10, 26]]; ys.forEach((y, i) => { mortar.push([[-70, y], [70, y]]); xs[i].forEach(x => mortar.push([[x, y - 34], [x, y]])); }); }
  g.tower = `<g id="tower" transform="${T}"><path d="${D(sil)}" fill="${K.arg}"/><g clip-path="url(#tclip)"><rect x="24" y="-250" width="70" height="260" fill="${K.argD}"/>` +
    (detail >= 1 ? mortar.map(m => `<path d="${D(hand(seg(m[0], m[1], 4).concat([m[1]]), { nx: tx, ny: ty, A: .5, k: 1, closed: false }), false)}" fill="none" stroke="${K.ink2}" stroke-width="${detail >= 2 ? 6 : 8}" stroke-linecap="round" stroke-opacity=".62"/>`).join('') : '') +
    `</g><rect x="-31" y="-146" width="7" height="40" rx="3.5" fill="${K.ivo}"/></g>`;
  const inkPath = (id, d, w) => `<path id="${id}" d="${d}" fill="none" stroke="${K.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`; // ids: the boot screen can draw these on (stroke-dashoffset)
  g.ink = `<g id="ink">` +
    (o.fringe ? `<g transform="translate(-1.2 -1)" opacity=".6"><path id="ink-c-pass2" d="${D(loop2)}" fill="none" stroke="${K.ink2}" stroke-width="${INK_W + 1}" stroke-linejoin="round"/></g>` : '') +
    inkPath('ink-c', D(loop0), INK_W) + inkPath('ink-frame', D(closing, false), o.closeInk) +
    `<g transform="${T}">` + inkPath('ink-tower', D(sil), o.towerInk) + `<path d="${D(door)}" fill="${K.ink}"/><path d="${D(slit)}" fill="${K.ink}"/></g></g>`;
  return { defs, g, order: ['counter', 'bole', 'leaf', 'tower', 'ink'], geo: { loop0, sil, door, slit, o, field } };
}

function diaper(x0, y0, x1, y1, a, seed, boost = { line: 1, dot: 1 }) { // lapis diaper: lozenges of half-diagonal a with outline, inner lozenge and a gold dot; the lattice is hand-ruled (slowly drifting) and every motif is jittered
  const r = rng(seed), wx = noise(seed + 1, 4, 280, 560), wy = noise(seed + 2, 4, 280, 560), w = 2 * a, ow = 2.5 / 48 * w * boost.line, jit = 1.2 / 48 * w, drift = 2.4 / 48 * w;
  const out = [`<rect x="${f1(x0 - a)}" y="${f1(y0 - a)}" width="${f1(x1 - x0 + 2 * a)}" height="${f1(y1 - y0 + 2 * a)}" fill="${K.diap}"/>`];
  const i0 = Math.floor(x0 / a) - 1, i1 = Math.ceil(x1 / a) + 1, j0 = Math.floor(y0 / a) - 1, j1 = Math.ceil(y1 / a) + 1;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (((i + j) % 2 + 2) % 2) continue;
    const gx = i * a, gy = j * a, cx = gx + drift * wx(gx, gy) + (r() - .5) * 2 * jit, cy = gy + drift * wy(gx, gy) + (r() - .5) * 2 * jit;
    const rot = r() < 1 / 9 ? (r() - .5) * 4.4 : 0, sc = 1 + (r() - .5) * .03, centre = (((i % 6) + 6) % 6 === 3 && ((j % 6) + 6) % 6 === 3);
    const h = (a - ow / 2 - 1) * sc, hi = a * .46 * sc, tr = rot ? ` transform="rotate(${f1(rot)} ${f1(cx)} ${f1(cy)})"` : '', dr = 2.6 / 48 * w * boost.dot * (.9 + r() * .22);
    out.push(`<g${tr}><path d="M${f1(cx)} ${f1(cy - h)}L${f1(cx + h)} ${f1(cy)}L${f1(cx)} ${f1(cy + h)}L${f1(cx - h)} ${f1(cy)}Z" fill="none" stroke="${K.lat}" stroke-width="${f1(ow)}" stroke-linejoin="miter"/>` +
      `<path d="M${f1(cx)} ${f1(cy - hi)}L${f1(cx + hi)} ${f1(cy)}L${f1(cx)} ${f1(cy + hi)}L${f1(cx - hi)} ${f1(cy)}Z" fill="${centre ? K.mad : K.lat}" fill-opacity="${centre ? .55 : .5}"/>` +
      `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(dr)}" fill="${K.orp}"/></g>`);
  }
  return out.join('');
}

function svgWrap(vb, size, inner, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f1).join(' ')}" width="${size}" height="${size}"${extra}>${inner}</svg>`;
}


/* ------------------------------------------------------------------ composition: every output is a crop of one 108 dp (1080 mu) master layer */
const MASTER = 1080, MID = 540, SHIFT_X = 14;            // 1 mu = 0.1 dp; the bowl sits a little right of the layer centre (the open side is light), which also keeps the hooks inside the safe circle
const FG = `translate(${MID + SHIFT_X} ${MID})`;
const BOX = (() => { // ink-inclusive box of the letter in master coordinates (mu): the open side is light, so emblems on plain grounds are centred on this box
  const g = buildInitial(3).geo.loop0, xs = g.map(q => q[0]), ys = g.map(q => q[1]), m = INK_W / 2 + 1.6;
  const x0 = Math.min(...xs) - m + MID + SHIFT_X, x1 = Math.max(...xs) + m + MID + SHIFT_X, y0 = Math.min(...ys) - m + MID, y1 = Math.max(...ys) + m + MID;
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
})();
const detailFor = cPx => cPx < 60 ? 0 : cPx < 100 ? 1 : cPx < 200 ? 2 : 3;   // optical size ladder keyed on the letter's height in px
const boostFor = d => ({ line: [1.9, 1.45, 1.15, 1][d], dot: [1.8, 1.4, 1.12, 1][d] });

function layers(detail) {
  const ini = buildInitial(detail);
  return {
    defs: ini.defs,
    bg: `<g id="bg">${diaper(0, 0, MASTER, MASTER, 60, 5, boostFor(detail))}</g>`,
    fg: `<g id="initial" transform="${FG}">${ini.order.map(k => ini.g[k]).join('')}</g>`,
    geo: ini.geo,
  };
}
function monoLayer(geo) { // C + tower as one flat white silhouette (alpha is what the launcher themes use); door and slit punched out
  const T = towerT(Object.assign({}, geo.o.tower, { s: geo.o.tower.s * .94, y: geo.o.tower.y - 3 })), d = p => D(p); // a hair smaller than in colour so the themed tint keeps a clear gap round the tower
  return `<defs><mask id="mmask" maskUnits="userSpaceOnUse" x="-120" y="-300" width="240" height="320"><rect x="-120" y="-300" width="240" height="320" fill="#fff"/><path d="${d(geo.door)}" fill="#000"/><path d="${d(geo.slit)}" fill="#000"/></mask></defs>` +
    `<g id="mono" transform="${FG}"><path d="${d(geo.loop0)}" fill="#fff" stroke="#fff" stroke-width="${INK_W}" stroke-linejoin="round"/>` +
    `<g transform="${T}"><g mask="url(#mmask)"><path d="${d(geo.sil)}" fill="#fff" stroke="#fff" stroke-width="22" stroke-linejoin="round"/></g></g></g>`;
}
function maskDefs(kind, cx, cy, win) {
  const r = win / 2;
  return kind === 'round' ? `<clipPath id="shape"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/></clipPath>`
    : `<clipPath id="shape"><rect x="${f1(cx - r)}" y="${f1(cy - r)}" width="${f1(win)}" height="${f1(win)}" rx="${f1(win * .16)}"/></clipPath>`;
}
/* one raster: win = width of the master crop in mu, (cx, cy) its centre; kind = 'bg+fg' | 'bg' | 'fg' | 'mono' */
function iconSvg({ px, win, cx = MID, cy = MID, kind = 'bg+fg', shape = null, detail }) {
  if (detail === undefined) detail = detailFor(BOX.h / win * px);
  const L = layers(detail), vb = [cx - win / 2, cy - win / 2, win, win];
  let inner = '';
  if (kind === 'mono') inner = monoLayer(L.geo);
  else inner = (kind.includes('bg') ? L.bg : '') + (kind.includes('fg') ? L.fg : '');
  let defs = kind === 'mono' ? '' : `<defs>${L.defs}</defs>`;
  if (shape) {
    const bw = 1.25 / px * win; // ~1.25 px of ink all round, like the pen line round a miniature
    defs += `<defs>${maskDefs(shape, cx, cy, win)}</defs>`;
    inner = `<g clip-path="url(#shape)">${inner}${shape === 'round' ? `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(win / 2)}" fill="none" stroke="${K.ink}" stroke-width="${f1(2 * bw)}"/>` : `<rect x="${f1(cx - win / 2)}" y="${f1(cy - win / 2)}" width="${f1(win)}" height="${f1(win)}" rx="${f1(win * .16)}" fill="none" stroke="${K.ink}" stroke-width="${f1(2 * bw)}"/>`}</g>`;
  }
  return svgWrap(vb, px, defs + inner);
}

/* ------------------------------------------------------------------ PNG codec (just enough to force 32-bit RGBA / 24-bit RGB deterministically) */
const CRCT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRCT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data) { const t = Buffer.from(type, 'latin1'), len = Buffer.alloc(4), crc = Buffer.alloc(4); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
function decodePng(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[12] !== 0) throw new Error('unsupported PNG'); ct = data[9]; } else if (type === 'IDAT') idat.push(data); p += 12 + len; }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw new Error('unsupported PNG colour type ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; out[o] = cur[x * bpp]; out[o + 1] = cur[x * bpp + 1]; out[o + 2] = cur[x * bpp + 2]; out[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    [prev, cur] = [cur, prev];
  }
  return { w, h, rgba: out };
}
function encodePng(w, h, rgba, alpha = true) { // alpha=false writes 24-bit RGB (colour type 2), true writes 32-bit RGBA (colour type 6)
  const bpp = alpha ? 4 : 3, stride = w * bpp, rows = [];
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; cur[x * bpp] = rgba[o]; cur[x * bpp + 1] = rgba[o + 1]; cur[x * bpp + 2] = rgba[o + 2]; if (alpha) cur[x * bpp + 3] = rgba[o + 3]; }
    let best = null, bs = Infinity;
    for (let f = 0; f < 5; f++) {
      const o = Buffer.alloc(stride + 1); o[0] = f; let sum = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let pred = 0;
        if (f === 1) pred = a; else if (f === 2) pred = b; else if (f === 3) pred = (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        const v = (cur[i] - pred) & 255; o[i + 1] = v; sum += v < 128 ? v : 256 - v;
      }
      if (sum < bs) { bs = sum; best = o; }
    }
    rows.push(best); prev = cur;
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}


/* ------------------------------------------------------------------ outputs */
const DENS = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];
const W_LEGACY = 760, W_FULL = 840, W_MASKABLE = 920, W_BOOT = 640;    // master crops (mu): legacy 48 dp tile, full-bleed store icon, maskable (letter inside the 80% circle), boot emblem
const SPLASH_C_DP = 34 / 100 * 360;                                     // letter height = 34% of the short side of a 360 dp-wide phone (1080 px at xxhdpi)
const W_SPLASH = 288 * 10 / (SPLASH_C_DP / (BOX.h / 10));                 // 288 dp canvas (Android 12 splash icon box) -> mu of master shown

const w = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const rel = f => path.relative(ROOT, f);

function titled(svg, title, desc) { return svg.replace(/^(<svg[^>]*>)/, `$1<title>${title}</title><desc>${desc}</desc>`); }
function masterSvg(kind, win, outSize, title, desc, cx = MID, cy = MID) { // crop of the master layer, wrapped so the viewBox is 0 0 outSize outSize
  const L = layers(3), s = outSize / win, x0 = cx - win / 2, y0 = cy - win / 2;
  const inner = kind === 'mono' ? monoLayer(L.geo) : (kind.includes('bg') ? L.bg : '') + (kind.includes('fg') ? L.fg : '');
  const body = `<defs>${kind === 'mono' ? '' : L.defs}</defs><g transform="scale(${f1(s * 1000) / 1000}) translate(${f1(-x0)} ${f1(-y0)})">${inner}</g>`;
  return titled(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outSize} ${outSize}" width="${outSize}" height="${outSize}">${body}</svg>`, title, desc).replace('</svg>', '</svg>\n');
}
function writeSvgs() {
  const T = 'Castle Siege: History';
  w(path.join(ART, 'emblem.svg'), masterSvg('bg+fg', W_FULL, 1024, T + ' - emblem', 'Gold-leaf Lombardic capital C over red bole and iron-gall ink, holding an argent tower on a vermilion field; lapis diaper ground. Layers: bg, counter, bole, leaf-c, tower, ink. Generated by scripts/make-icons.js.'));
  w(path.join(ART, 'icon-bg.svg'), masterSvg('bg', MASTER, MASTER, T + ' - adaptive icon background', 'Lapis diaper (108 dp layer, 1080 units).'));
  w(path.join(ART, 'icon-fg.svg'), masterSvg('fg', MASTER, MASTER, T + ' - adaptive icon foreground', 'Gold-leaf C with the argent tower (108 dp layer, 1080 units); letter 60 dp across, inside the 66 dp safe circle.'));
  w(path.join(ART, 'icon-mono.svg'), masterSvg('mono', MASTER, MASTER, T + ' - themed (monochrome) icon', 'Single-colour silhouette of the C and the tower (108 dp layer, 1080 units).'));
  w(path.join(ART, 'emblem-boot.svg'), masterSvg('fg', W_BOOT, 512, T + ' - boot emblem', 'The C and its tower without the ground, for the boot screen. Ink outlines are the stroked paths in group #ink.', BOX.cx, BOX.cy));
}

async function rasterise(page, svg, px, transparent) {
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>${svg}`);
  return page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: px, height: px }, animations: 'disabled' });
}
function forceAlpha(png, alpha) { const d = decodePng(png); return encodePng(d.w, d.h, d.rgba, alpha); }

function xml(body) { return '<?xml version="1.0" encoding="utf-8"?>\n' + body; }
function writeXml() {
  const adaptive = xml(`<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`);
  w(path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
  w(path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);
  w(path.join(RES, 'values', 'ic_launcher_background.xml'), xml(`<resources>
    <!-- night: first-frame colour (capacitor.config.json, web manifest, splash). The adaptive icon itself uses the raster @mipmap/ic_launcher_background. -->
    <color name="ic_launcher_background">#0F1838</color>
</resources>
`));
  w(path.join(RES, 'drawable', 'splash.xml'), xml(`<!-- Launch background (theme item android:background): solid night with the emblem centred. On Android 12+ the system splash
     shows the same emblem (values-v31). splash_emblem is drawn per density on a 288 dp canvas; the letter is 34% of the short side of a 360 dp phone. -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape android:shape="rectangle">
            <solid android:color="#0F1838"/>
        </shape>
    </item>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_emblem"/>
    </item>
</layer-list>
`));
  w(path.join(RES, 'values-v31', 'styles.xml'), xml(`<resources>
    <!-- Android 12+ draws the splash window itself. Same theme as values/styles.xml: a qualified style replaces the whole style,
         so the base attribute (android:background) is repeated and the splash attributes are added. -->
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="android:windowSplashScreenBackground">#0F1838</item>
        <item name="android:windowSplashScreenAnimatedIcon">@drawable/splash_emblem</item>
    </style>
</resources>
`));
}

function cleanObsolete() {
  const rm = f => { if (fs.existsSync(f)) { fs.rmSync(f, { recursive: true, force: true }); console.log('  removed ' + rel(f)); } };
  for (const d of fs.existsSync(RES) ? fs.readdirSync(RES) : []) if (/^drawable-(land|port)-/.test(d)) rm(path.join(RES, d, 'splash.png'));
  rm(path.join(RES, 'drawable', 'splash.png'));
  rm(path.join(RES, 'drawable', 'ic_launcher_background.xml'));       // old teal grid vector
  rm(path.join(RES, 'drawable-v24', 'ic_launcher_foreground.xml'));   // old android-robot vector
  for (const d of fs.existsSync(RES) ? fs.readdirSync(RES) : []) { const f = path.join(RES, d); if (/^drawable-(land|port)-|^drawable-v24$/.test(d) && fs.existsSync(f) && !fs.readdirSync(f).length) rm(f); }
}


/* ------------------------------------------------------------------ audit: numbers the spec asks for, measured on what was actually drawn */
function alphaStats(png, pxPerDp, cx, cy) { // letter box and farthest opaque pixel from the layer centre, in dp
  const d = decodePng(png); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, far = 0;
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) if (d.rgba[(y * d.w + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); far = Math.max(far, Math.hypot(x + .5 - cx, y + .5 - cy)); }
  return { w: (x1 - x0 + 1) / pxPerDp, h: (y1 - y0 + 1) / pxPerDp, far: far / pxPerDp, d };
}
function geometryAudit() {
  const ini = buildInitial(3), o = ini.geo.o;
  let tmin = 1e9, tmax = 0; for (let a = 45; a <= 180; a += .5) { const t = outerR(rad(a), 0) - innerR(rad(a), 0); tmin = Math.min(tmin, t); tmax = Math.max(tmax, t); }
  const c0 = cLoop(0), ys = c0.P.inner.map(p => p[1]), counterNom = Math.max(...ys) - Math.min(...ys), counterVis = counterNom - INK_W;
  const towerH = TW.topY * o.tower.s + o.towerInk;
  return { thickNom: tmax / 10, thinNom: tmin / 10, thickVis: (tmax - INK_W) / 10, thinVis: (tmin - INK_W) / 10, ratio: tmax / tmin, counterNom: counterNom / 10, counterVis: counterVis / 10, towerH: towerH / 10, towerVsNom: towerH / counterNom, towerVsVis: towerH / counterVis };
}


function report() {
  const g = geometryAudit(), fmt = (n, k = 1) => n.toFixed(k), log = m => console.log('audit ' + m), warn = m => { console.log('WARN  ' + m); process.exitCode = 1; };
  const visRatio = g.thickVis / g.thinVis;
  log(`stroke thick:thin = ${fmt(g.ratio, 2)} edge to edge (${fmt(g.thickNom)}:${fmt(g.thinNom)} dp), ${fmt(visRatio, 2)} on the visible gold (${fmt(g.thickVis)}:${fmt(g.thinVis)} dp)  [spec 3:2 = 1.5, thinnest >= 5 dp]`);
  if (g.thinVis < 5) warn('thinnest visible stroke under 5 dp');
  if (g.ratio < 1.35 || visRatio > 1.85) warn('thick/thin ratio drifted from 3:2');
  log(`tower ${fmt(g.towerH)} dp tall = ${fmt(g.towerVsNom * 100, 0)}% of the counter (${fmt(g.counterNom)} dp edge to edge) / ${fmt(g.towerVsVis * 100, 0)}% of the visible vermilion (${fmt(g.counterVis)} dp)  [spec >= 70%]`);
  if (g.towerVsNom < .7) warn('tower under 70% of the counter height');
  for (const [name, d] of DENS) {
    const px = 108 * d, dir = path.join(RES, 'mipmap-' + name);
    for (const f of ['ic_launcher_foreground.png', 'ic_launcher_monochrome.png']) {
      const a = alphaStats(fs.readFileSync(path.join(dir, f)), d, px / 2, px / 2);
      if (name === 'xxxhdpi' || a.far > 33 || Math.max(a.w, a.h) > 60) log(`${name.padEnd(8)} ${f.padEnd(28)} letter ${fmt(a.w)} x ${fmt(a.h)} dp, farthest point ${fmt(a.far)} dp from centre  [spec <= 60 dp, safe radius 33 dp]`);
      if (a.far > 33.01) warn(`${name} ${f} leaves the 66 dp safe circle`);
      if (Math.max(a.w, a.h) > 60.01) warn(`${name} ${f} is wider than 60 dp`);
    }
  }
  { // maskable: the letter must sit inside the circle of radius 40% of the side; measured on the transparent foreground at the same scale
    const a = alphaStats(fs.readFileSync(path.join(RES, 'mipmap-xxxhdpi', 'ic_launcher_foreground.png')), 4, 216, 216);
    const rpx = a.far * 10 * 512 / W_MASKABLE; // dp -> mu -> px of the 512 icon
    log(`maskable letter radius ${rpx.toFixed(0)} px of ${(512 * .4).toFixed(0)} px allowed (80% safe circle)`);
    if (rpx > 512 * .4) warn('maskable letter leaves the 80% safe zone');
  }
  for (const f of ['icon-512.png', 'icon-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
    const b = fs.readFileSync(path.join(WEB, f)), d = decodePng(b); let amin = 255; for (let i = 3; i < d.rgba.length; i += 4) amin = Math.min(amin, d.rgba[i]);
    log(`${f.padEnd(22)} ${d.w}x${d.h} colour type ${b[25]} (${b[25] === 6 ? '32-bit RGBA' : '24-bit RGB'}) min alpha ${amin} ${(b.length / 1024).toFixed(0)} KB`);
    if (amin < 255) warn(f + ' has transparency');
    if (f === 'icon-512.png' && (b.length > 1024 * 1024 || b[25] !== 6)) warn('icon-512.png breaks the Play Store rules (32-bit, <= 1 MB)');
  }
}
async function main() {
  const t0 = Date.now();
  writeSvgs(); console.log('svg  ' + rel(ART) + '/*.svg');
  if (process.argv.includes('--svg')) return;
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is needed to rasterise the SVGs (npm i -D playwright, then npx playwright install chromium). Use --svg to skip the rasters.'); process.exit(2); }
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 64, height: 64 }, deviceScaleFactor: 1 });
  const out = [];
  const emit = async (file, svgOpts, { transparent = true, alpha = true } = {}) => {
    const px = svgOpts.px, png = forceAlpha(await rasterise(page, iconSvg(svgOpts), px, transparent), alpha);
    w(file, png); out.push({ file, px, bytes: png.length }); return png;
  };
  try {
    for (const [name, d] of DENS) {
      const dir = path.join(RES, 'mipmap-' + name), p48 = 48 * d, p108 = 108 * d;
      await emit(path.join(dir, 'ic_launcher.png'), { px: p48, win: W_LEGACY, shape: 'rsq' });
      await emit(path.join(dir, 'ic_launcher_round.png'), { px: p48, win: W_LEGACY, shape: 'round' });
      await emit(path.join(dir, 'ic_launcher_foreground.png'), { px: p108, win: MASTER, kind: 'fg' });
      await emit(path.join(dir, 'ic_launcher_background.png'), { px: p108, win: MASTER, kind: 'bg' }, { transparent: false, alpha: false });
      await emit(path.join(dir, 'ic_launcher_monochrome.png'), { px: p108, win: MASTER, kind: 'mono' });
      await emit(path.join(RES, 'drawable-' + name, 'splash_emblem.png'), { px: 288 * d, win: W_SPLASH, cx: BOX.cx, cy: BOX.cy, kind: 'fg' });
    }
    await emit(path.join(WEB, 'icon-512.png'), { px: 512, win: W_FULL }, { transparent: false });
    await emit(path.join(WEB, 'icon-192.png'), { px: 192, win: W_FULL }, { transparent: false });
    await emit(path.join(WEB, 'icon-maskable-512.png'), { px: 512, win: W_MASKABLE }, { transparent: false });
    await emit(path.join(WEB, 'apple-touch-icon.png'), { px: 180, win: W_FULL }, { transparent: false, alpha: false });
    await emit(path.join(ART, 'emblem-boot.png'), { px: 512, win: W_BOOT, cx: BOX.cx, cy: BOX.cy, kind: 'fg' });
  } finally { await browser.close(); }
  writeXml(); cleanObsolete();
  report();
  for (const o of out) console.log('png  ' + rel(o.file).padEnd(70) + String(o.px).padStart(5) + ' px ' + String(o.bytes).padStart(8) + ' B');
  console.log('done in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

module.exports = { K, BOX, buildInitial, layers, iconSvg, monoLayer, diaper, decodePng, encodePng };
