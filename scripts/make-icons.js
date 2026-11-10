#!/usr/bin/env node
'use strict';
/*
 * Castle Siege: History - app icon, splash and boot emblem generator (docs/ART_DIRECTION.md section 9).
 *
 *   node scripts/make-icons.js            regenerate every output below (needs Playwright + Chromium to rasterise)
 *   node scripts/make-icons.js --svg      only rewrite store/art/*.svg (no browser needed)
 *
 * Concept: a historiated initial. A burnished gold-leaf Lombardic capital C (broad-nib contrast, bar-serif hooks, a faint Gothic
 * point on the bowl) is laid over red bole - the bole shows where the leaf is misregistered - and outlined in iron-gall ink. Its
 * counter is the picture field: an argent tower on vermilion. The ground is the lapis diaper. Everything is drawn here as SVG paths
 * with a seeded hand-wobble (no random numbers, no external images, no fonts), so two runs on the same browser build give
 * byte-identical files.
 *
 * Geometry: one master layer of 1080 units = the 108 dp adaptive-icon layer (1 unit = 0.1 dp). The letter is drawn in a local frame
 * about 600 units across (ink included) and every output is a crop of the master: launcher layers, legacy tiles, the full-bleed
 * store icon, the maskable icon, the boot emblem and the splash emblem.
 *
 * One drawing at every size. The only optical sizing is the ground (below 100 px of letter the diaper is calm: lattice at 1.3:1,
 * no gold dots, no counterchanged lozenges, and a plain reserve round the letter so the silhouette resolves first) and a slightly
 * lighter ink (84%). The letter, the leaf, the tooling, the field and the tower are the same drawing on every phone.
 *
 * Writes (only these; everything else in the project is left alone):
 *   store/art/{emblem,icon-bg,icon-fg,icon-mono,emblem-boot}.svg   layered masters (groups bg, counter, bole, leaf-c, tower, ink)
 *   store/art/emblem-boot.png                                      512 px, transparent, the C on a lapis roundel
 *   store/art/contact-sheet.png                                    regression sheet: 48/72/96 px, circle + rounded square, light + dark wallpaper, against flat generic tiles
 *   android/app/src/main/res/mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher{,_round,_foreground,_background,_monochrome}.png
 *   android/app/src/main/res/drawable-{m,h,xh,xxh,xxxh}dpi/splash_emblem.png   288 dp canvas (Android 12 icon box), roundel = 34% of a 360 dp phone
 *   android/app/src/main/res/{mipmap-anydpi-v26/ic_launcher{,_round}.xml, drawable/splash.xml, values-v31/styles.xml, values/ic_launcher_background.xml}
 *   www/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
 * and removes the old drawable*-/splash.png files and the template vectors.
 *
 * After writing it audits what it drew against the spec numbers and the art-director acceptance numbers (exit code 1 on a miss).
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const ART = path.join(ROOT, 'store', 'art');
const WEB = path.join(ROOT, 'www', 'icons');

/* ------------------------------------------------------------------ palette (docs/ART_DIRECTION.md s2) */
const K = {
  ink: '#1E1610', ink2: '#4B3B2A', night: '#0F1838', lapis: '#22409A', lapisd: '#14275F', diap: '#1B2F78', lat: '#2F52B0', latS: '#233F92',
  orp: '#E9B62A', leaf: '#D4A02F', bole: '#8C3520', verm: '#D8391F', mad: '#9A2018', mal: '#1F6B4E', vdg: '#3FA58C', ivo: '#F4ECD3',
  arg: '#CDD2DB', argD: '#8B94A8',
};
/* --leaf-art burnish stops (docs s2). The letter cuts them into hard-edged sheets: the extremes (cream, bronze) live on the bowl, the arms and hooks stay between --leaf and --orp */
const FACET_STOPS = {
  bowlUp: [[0, '#D8A530'], [.34, '#E9C25A'], [.5, '#FBE9A0'], [.64, '#E9C25A'], [1, '#D4A02F']],
  bowlLo: [[0, '#D4A02F'], [.3, '#E9C25A'], [.78, '#A06E18'], [1, '#C99A2E']],
  armUp: [[0, '#D4A02F'], [.55, '#E9B62A'], [1, '#E9C25A']],
  armLo: [[0, '#C99A2E'], [.5, '#E9B62A'], [1, '#D4A02F']],
};
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
const lum = h => { const [r, g, b] = hex2rgb(h).map(lin); return .2126 * r + .7152 * g + .0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

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
function noise1(seed, n = 4, lmin = 60, lmax = 180) { // the same along one parameter (pen pressure along a line)
  const r = rng(seed), w = [];
  for (let i = 0; i < n; i++) w.push({ k: 2 * Math.PI / (lmin + (lmax - lmin) * r()), ph: r() * Math.PI * 2, am: .5 + r() * .5 });
  const nrm = Math.sqrt(w.reduce((s, q) => s + q.am * q.am, 0) / 2);
  return s => { let v = 0; for (const q of w) v += q.am * Math.sin(q.k * s + q.ph); return v / nrm; };
}
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
const sm = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const f1 = n => { const s = (Math.round(n * 10) / 10).toString(); return s === '-0' ? '0' : s; };
const adiff = (a, b) => (((a - b + 540) % 360) + 360) % 360 - 180; // signed smallest difference a - b in degrees

/* ------------------------------------------------------------------ polyline toolkit */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function seg(p, q, step) { const n = Math.max(1, Math.ceil(dist(p, q) / step)), o = []; for (let i = 0; i < n; i++) o.push([p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n]); return o; } // excludes the end point
function arc(cx, cy, rf, a0, a1, step) { // rf: number or (angle)->radius; excludes the end point
  const rr = typeof rf === 'function' ? rf : () => rf, R = rr((a0 + a1) / 2), n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * R / step)), o = [];
  for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n, r = rr(a); o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
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
function D(pts, closed = true) { // path data
  let s = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
  for (let i = 1; i < pts.length; i++) s += 'L' + f1(pts[i][0]) + ' ' + f1(pts[i][1]);
  return s + (closed ? 'Z' : '');
}
const area2 = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return s; };
const bboxOf = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }; };
function clipHalf(poly, A, B, C, s) { // Sutherland-Hodgman against s*(A x + B y + C) >= 0
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], fp = s * (A * p[0] + B * p[1] + C), fq = s * (A * q[0] + B * q[1] + C);
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  }
  return out;
}
function mec(pts) { // minimum enclosing circle (Badoiu-Clarkson iteration: good to a fraction of a unit for a few hundred points)
  let c = [(bboxOf(pts).x0 + bboxOf(pts).x1) / 2, (bboxOf(pts).y0 + bboxOf(pts).y1) / 2];
  for (let i = 1; i <= 4000; i++) { let far = pts[0], fd = -1; for (const p of pts) { const d = dist(p, c); if (d > fd) { fd = d; far = p; } } c = [c[0] + (far[0] - c[0]) / (i + 1), c[1] + (far[1] - c[1]) / (i + 1)]; }
  let r = 0; for (const p of pts) r = Math.max(r, dist(p, c));
  return { cx: c[0], cy: c[1], r };
}
function rayCross(poly, ang) { // distances at which the ray from the origin at angle (rad) crosses the polygon, ascending
  const dx = Math.cos(ang), dy = Math.sin(ang), o = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], ex = q[0] - p[0], ey = q[1] - p[1], den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (p[0] * ey - p[1] * ex) / den, u = (p[0] * dy - p[1] * dx) / den; // origin + t*d = p + u*e
    if (t > 0 && u >= 0 && u < 1) o.push(t);
  }
  return o.sort((a, b) => a - b);
}
function vCross(poly, x) { // y values where the vertical line at x crosses the polygon, ascending
  const o = [];
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; if ((p[0] <= x) !== (q[0] <= x)) o.push(p[1] + (x - p[0]) / (q[0] - p[0]) * (q[1] - p[1])); }
  return o.sort((a, b) => a - b);
}
/* fillet sharp vertices of a polyline with a short quadratic curve (broad-nib corners are not razor sharp, and no two are cut alike) */
function roundCorners(pts, rf, minTurn = 28) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[(i + n - 1) % n], c = pts[i], q = pts[(i + 1) % n];
    const ax = c[0] - p[0], ay = c[1] - p[1], bx = q[0] - c[0], by = q[1] - c[1], la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (!la || !lb) { out.push(c); continue; }
    const turn = deg(Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))));
    if (turn < minTurn) { out.push(c); continue; }
    const r = Math.min(rf(i), la * .45, lb * .45), a0 = [c[0] - ax / la * r, c[1] - ay / la * r], a1 = [c[0] + bx / lb * r, c[1] + by / lb * r];
    for (let t = 0; t <= 4; t++) { const u = t / 4, v = 1 - u; out.push([v * v * a0[0] + 2 * u * v * c[0] + u * u * a1[0], v * v * a0[1] + 2 * u * v * c[1] + u * u * a1[1]]); }
  }
  return out;
}
/* a pen line round a closed outline: the band between an outward and an inward offset with mitred corners, whose width follows the
   direction of the edge (heavier on the shade side, lighter towards the light) and a slow pen pressure. */
function inkBand(pts, o) {
  const n = pts.length, sg = area2(pts) > 0 ? 1 : -1, nrm = [];
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; nrm.push([sg * dy / l, -sg * dx / l]); }
  const outer = [], inner = [], widths = []; let s = 0;
  for (let i = 0; i < n; i++) {
    const n1 = nrm[(i + n - 1) % n], n2 = nrm[i], bx = n1[0] + n2[0], by = n1[1] + n2[1], bl = Math.hypot(bx, by) || 1, dot = n1[0] * n2[0] + n1[1] * n2[1];
    let m = Math.sqrt(2 / Math.max(1e-6, 1 + dot)); if (!isFinite(m) || m > o.ML) m = o.ML;
    const ux = bx / bl, uy = by / bl, shade = ux * o.S[0] + uy * o.S[1];
    const W = o.W * (1 + o.mod * shade) * (o.press ? 1 + o.press(s) : 1);
    outer.push([pts[i][0] + ux * m * W * o.split, pts[i][1] + uy * m * W * o.split]);
    inner.push([pts[i][0] - ux * m * W * (1 - o.split), pts[i][1] - uy * m * W * (1 - o.split)]);
    widths.push(W); s += dist(pts[i], pts[(i + 1) % n]);
  }
  return { outer, inner, widths };
}

/* ------------------------------------------------------------------ the initial: geometry (unit = 0.1 dp of the 108 dp layer; the C is about 600 u across, ink included) */
const CP = { // nominal edges (the ink is centred on them). Upper hook taller and reaching further than the lower; heavy stroke at the lower left (broad nib, pen angle ~25 deg)
  Ro: 277, bump: 19, bumpAt: 176, tmin: 92, tmax: 158, phi0: 58, peak: 160, xl: 124, up: { yb: 66, xr: 226 }, lo: { yb: 84, xr: 222 },
};
const INK_W = 28;                                              // mean ink width (3.0 dp); it runs 2.2..3.8 dp with the direction of the edge
const HARM = (() => { // seeded low-order harmonics: the bowl is not quite a circle, like a pen-cut letter
  const r = rng(7), mk = amp => [2, 3, 5, 8].map((h, i) => ({ h, a: amp * [1, .7, .5, .3][i], p: r() * Math.PI * 2 }));
  return { out: mk(3), inn: mk(2.5) };
})();
const angPhi = th => Math.abs(((th + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * 180 / Math.PI; // angular distance from +x, degrees
function harm(set, th) { const w = sm((angPhi(th) - 42) / 40); let s = 0; for (const q of set) s += q.a * Math.sin(q.h * th + q.p); return s * w; }
function point(thDeg) { const e = adiff(thDeg, CP.bumpAt), a = Math.abs(e); return CP.bump * (.68 * Math.exp(-(e / 34) * (e / 34)) + .32 * Math.exp(-a / 12)); } // a faint Gothic point on the left of the bowl (a cusp riding on a swell)
function thick(thDeg) { const phi = 180 - Math.abs(adiff(thDeg, CP.peak)); return CP.tmin + (CP.tmax - CP.tmin) * sm((phi - CP.phi0) / (180 - CP.phi0)); }
function outerR(theta, d) { return CP.Ro + point(deg(theta)) + harm(HARM.out, theta) - d; }
function innerR(theta, d) { return CP.Ro - thick(deg(theta)) + point(deg(theta)) + harm(HARM.inn, theta) + d; } // d>0 erodes the letter (the counter grows)
function cLoop(d, step = 4) { // outline of the letter eroded by d (centre of the outer circle = origin). kinds: 'b' bowl arcs, 'f' straight faces
  const Ro = CP.Ro - d, xl = CP.xl + d, U = { yb: CP.up.yb + d, xr: CP.up.xr - d }, L = { yb: CP.lo.yb + d, xr: CP.lo.xr - d };
  const thU = Math.acos(U.xr / Ro), thL = Math.acos(L.xr / Ro), yoU = Ro * Math.sin(thU), yoL = Ro * Math.sin(thL);
  const jn = sg => { let lo = 0, hi = Math.PI / 2; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (innerR(sg * m, d) * Math.cos(m) > xl) lo = m; else hi = m; } return (lo + hi) / 2; }; // where the counter meets the hook's inner face x = xl
  const taL = jn(1), taU = jn(-1), yinL = innerR(taL, d) * Math.sin(taL), yinU = innerR(-taU, d) * Math.sin(taU);
  const parts = [
    ['b', arc(0, 0, a => outerR(a, d), -thU, thL - 2 * Math.PI, step)],          // outer arc, counter-clockwise over the top, left, bottom
    ['f', seg([L.xr, yoL], [L.xr, L.yb], step)],                                 // lower hook: outer face up
    ['f', seg([L.xr, L.yb], [xl, L.yb], step)],                                  // mouth face
    ['f', seg([xl, L.yb], [xl, yinL], step)],                                    // inner face down to the bowl
    ['b', arc(0, 0, a => innerR(a, d), taL, 2 * Math.PI - taU, step)],           // counter, round the thick left side
    ['f', seg([xl, -yinU], [xl, -U.yb], step)],                                  // upper hook: inner face
    ['f', seg([xl, -U.yb], [U.xr, -U.yb], step)],                                // mouth face
    ['f', seg([U.xr, -U.yb], [U.xr, -yoU], step)],                               // outer face up
  ];
  const pts = [], kinds = []; for (const [k, p] of parts) for (const q of p) { pts.push(q); kinds.push(k); }
  return { parts, pts, kinds, xl, U, L, yinU, yinL, thU, thL, taU, taL };
}
function handLoop(c, N, A, o = {}) { // wobble (and an optional drift) in one go: the hand-cut version of a dense outline. Faces wander more than the bowl
  const w = c.pts.map(([x, y], i) => { const a = c.kinds[i] === 'f' ? A.f : A.b, off = o.off ? o.off(x, y) : [0, 0]; return [x + a * N.nx(x, y) + off[0], y + a * N.ny(x, y) + off[1]]; });
  return rdp(w, o.eps || .2, true);
}

/* ------------------------------------------------------------------ the miniature: an argent tower (local coords, origin = centre of the base, up is negative y) */
const TWS = 1.11; const MOUND_Y = 118;                                            // scale of the tower in the field
function towerOutline() { // 3 merlons of unequal width (28/34/26), two corbel steps, a battered foot; the crenel notches are unequal too (16/14)
  const top = -228, cr = top + 40;
  return [[50, 0], [47, -30], [47, -138], [51.5, -144], [51.5, -153], [56, -159], [56, -167], [59, -171], [59, top], [31, top], [31, cr], [15, cr], [15, top], [-19, top], [-19, cr], [-33, cr], [-33, top], [-59, top], [-59, -171], [-56, -167], [-56, -159], [-51.5, -153], [-51.5, -144], [-47, -138], [-47, -30], [-50, 0]];
}
function densify(poly, step, closed = true) { let o = []; const n = poly.length; for (let i = 0; i < (closed ? n : n - 1); i++) o = o.concat(seg(poly[i], poly[(i + 1) % n], step)); if (!closed) o.push(poly[n - 1]); return o; }
function doorPts(cx, step = 3) { // pointed (lancet) door: two arcs of radius = span, struck from the opposite springing points
  const hw = 19, sp = -34, R = 2 * hw, ax = deg(Math.atan2(-Math.sqrt(R * R - hw * hw), -hw)); let o = seg([cx - hw, 0], [cx - hw, sp], step);
  const aL = arc(cx + hw, sp, R, rad(180), rad(ax < 0 ? ax + 360 : ax), step); o = o.concat(aL);
  const aR = arc(cx - hw, sp, R, rad(360 - (ax < 0 ? ax + 360 : ax) + 180), rad(360), step); // mirror: from the apex down to the right springing point
  o = o.concat(aR, seg([cx + hw, sp], [cx + hw, 0], step));
  return o;
}
function slitPts(cx, step = 3) { return [].concat(seg([cx - 10, -100], [cx - 10, -138], step), seg([cx - 10, -138], [cx, -153], step), seg([cx, -153], [cx + 10, -138], step), seg([cx + 10, -138], [cx + 10, -100], step), seg([cx + 10, -100], [cx - 10, -100], step)); }

/* ------------------------------------------------------------------ the initial, assembled */
function buildInitial(tier) {
  const small = tier === 'small', inkS = small ? .84 : 1, W0 = INK_W * inkS, towerInk = small ? 10 : 12;
  const N = { nx: noise(11, 5, 220, 420), ny: noise(23, 5, 220, 420) };         // letter wobble, shared by ink, bole and field so they stay registered
  const A = { b: 3.4, f: 5.5 };                                                  // 0.34 / 0.55 dp wobble on top of the bowl's own drift: over a pixel at 96 px
  const GN = { nx: noise(37, 4, 140, 300), ny: noise(41, 4, 140, 300) };          // the leaf edge wanders on its own
  const OFF = noise(61, 3, 160, 360), leafOff = (x, y) => { const m = 9.5 + 3 * OFF(x, y); return [m * .62, m * .78]; };   // leaf laid ~1.2 dp down-right of the bole, drifting
  const TN = { nx: noise(53, 4, 170, 360), ny: noise(59, 4, 170, 360) };         // tower wobble
  const c0 = cLoop(0), cb = cLoop(8), cg = cLoop(14);
  const loop0 = handLoop(c0, N, A);                                               // ink centre line
  const bole = handLoop(cb, N, A);
  const gold = handLoop(cg, GN, { b: 5, f: 5 }, { off: leafOff });
  const fieldC = { pts: c0.parts[4][1].concat(seg([c0.xl, -c0.yinU], [c0.xl, c0.yinL], 4)), kinds: [] };
  fieldC.kinds = fieldC.pts.map((p, i) => i < c0.parts[4][1].length ? 'b' : 'f');
  const field = handLoop(fieldC, N, A);
  // ink: a variable-width band with mitred corners, then a fillet of a different radius at each corner
  const press = noise1(91, 4, 90, 260), rc = rng(17);
  const band = inkBand(loop0, { W: W0, mod: .27, S: [.6, .8], split: .5, ML: 2.6, press: s => .09 * press(s) });
  const cornerR = () => 1.2 + rc() * 3.4;
  const inkOuter = roundCorners(band.outer, cornerR), inkInner = roundCorners(band.inner, cornerR);

  // the picture field: pen line between the hooks. A pool of ink where the pen came down, a taper where it lifted
  const fy0 = -c0.U.yb - 6, fy1 = c0.L.yb + 6, fl = [];
  for (let y = fy0; y <= fy1 + .01; y += 4) { const x = c0.xl + A.f * N.nx(c0.xl, y), yy = y + A.f * N.ny(c0.xl, y); fl.push([x, yy]); }
  const frameW = t => (small ? 15 : 18) * (1 + .3 * Math.exp(-Math.pow((t - .13) / .1, 2))) * (1 - .45 * sm((t - .5) / .5));
  const fL = [], fR = [];
  fl.forEach((p, i) => { const q = fl[Math.min(fl.length - 1, i + 1)], pr = fl[Math.max(0, i - 1)], dx = q[0] - pr[0], dy = q[1] - pr[1], l = Math.hypot(dx, dy) || 1, w = frameW(i / (fl.length - 1)) / 2; fL.push([p[0] - dy / l * w, p[1] + dx / l * w]); fR.push([p[0] + dy / l * w, p[1] - dx / l * w]); });
  const frame = fL.concat(fR.reverse());

  // tower, placed in the field (it leans ~2 degrees and its base sits on the lower arm)
  const tw = { x: -10, y: 130, s: TWS, lean: 1.9 }, TT = `translate(${tw.x} ${tw.y}) rotate(${tw.lean}) scale(${tw.s})`;
  const sil = rdp(densify(towerOutline(), 6).map(([x, y]) => [x + 2.2 * TN.nx(x, y), y + 2.2 * TN.ny(x, y)]), .2, true);
  const dw = (p) => p.map(([x, y]) => [x + 1.2 * TN.nx(x, y), y + 1.2 * TN.ny(x, y)]);
  const door = dw(doorPts(5)), slit = dw(slitPts(-14));
  const bbox = { x0: -330, x1: 250, y0: -310, y1: 310 };
  const sheet = (stops, id, ang, region) => { // a linear gradient across one leaf sheet in its own direction
    const b = bboxOf(region), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, dx = Math.cos(rad(ang)), dy = Math.sin(rad(ang)), L = Math.abs(b.w * dx) + Math.abs(b.h * dy);
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(cx - dx * L / 2)}" y1="${f1(cy - dy * L / 2)}" x2="${f1(cx + dx * L / 2)}" y2="${f1(cy + dy * L / 2)}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  };
  // leaf sheets: two long joints (nearly horizontal across the bowl, nearly vertical across the arms) cut the letter into four
  const lineEq = (p, q) => ({ A: -(q[1] - p[1]), B: q[0] - p[0], C: (q[1] - p[1]) * p[0] - (q[0] - p[0]) * p[1], p, q });
  const J1 = lineEq([-350, -55], [0, 25]), J2 = lineEq([-72, -330], [-58, 330]);   // positive side: below J1, left of J2
  const BIG = [[-420, -420], [420, -420], [420, 420], [-420, 420]];
  const cut = (above, left) => { let p = BIG; p = clipHalf(p, J1.A, J1.B, J1.C, above ? -1 : 1); p = clipHalf(p, J2.A, J2.B, J2.C, left ? 1 : -1); return p; };
  const facets = [['f1', cut(true, true), 118, FACET_STOPS.bowlUp], ['f2', cut(false, true), 62, FACET_STOPS.bowlLo], ['f3', cut(true, false), 92, FACET_STOPS.armUp], ['f4', cut(false, false), 74, FACET_STOPS.armLo]];
  let defs = `<clipPath id="tclip"><path d="${D(sil)}"/></clipPath><clipPath id="gclip"><path d="${D(gold)}"/></clipPath><clipPath id="fclip"><path d="${D(field)}"/></clipPath>`;
  for (const [id, poly, ang, stops] of facets) defs += `<clipPath id="c${id}"><path d="${D(poly)}"/></clipPath>` + sheet(stops, 'g' + id, ang, poly);

  const g = {};
  // the miniature's ground: a tone-on-tone quatrefoil diaper in the vermilion (docs --dp-quat)
  { const r = rng(404), cell = 66, q = 7.6; let ground = '';
    for (let j = -8; j <= 8; j++) for (let i = -5; i <= 5; i++) {
      const x = i * cell + (j & 1 ? cell / 2 : 0) + (r() - .5) * 2.4 - 18, y = j * cell / 2 + (r() - .5) * 2.4 + 4, rr = q * (.92 + r() * .16);
      ground += `<path d="M${f1(x)} ${f1(y - rr * 1.55)}a${f1(rr)} ${f1(rr)} 0 0 1 ${f1(rr * 1.55)} ${f1(rr * 1.55)}a${f1(rr)} ${f1(rr)} 0 0 1 ${f1(-rr * 1.55)} ${f1(rr * 1.55)}a${f1(rr)} ${f1(rr)} 0 0 1 ${f1(-rr * 1.55)} ${f1(-rr * 1.55)}a${f1(rr)} ${f1(rr)} 0 0 1 ${f1(rr * 1.55)} ${f1(-rr * 1.55)}Z" fill="${K.mad}" fill-opacity=".32"/>`;
    }
    g.counter = `<g id="counter"><path d="${D(field)}" fill="${K.verm}"/><g clip-path="url(#fclip)">${ground}</g></g>`; }
  g.bole = `<g id="bole"><path d="${D(bole)}" fill="${K.bole}"/></g>`;

  // the leaf: four sheets, joints, burnish marks, a pricked line, a few flaked spots
  const goldAt = (th, rr) => { const x = rr * Math.cos(th), y = rr * Math.sin(th), o = leafOff(x, y); return [x + o[0], y + o[1]]; };
  let leaf = facets.map(([id]) => `<g clip-path="url(#c${id})"><path d="${D(gold)}" fill="url(#g${id})"/></g>`).join('');
  let surf = '';
  { const r = rng(314);
    const bands = [[104, 250], [104, 250], [104, 250], [104, 250], [104, 250], [104, 250], [104, 250], [50, 98], [50, 98], [50, 98], [262, 310], [262, 310]]; // most on the bowl, a few on each arm
    for (let i = 0; i < bands.length; i++) { // burnisher streaks: short arcs concentric with the bowl, lighter and darker than the leaf
      const arm = bands[i][0] !== 104, a0 = bands[i][0] + r() * (bands[i][1] - bands[i][0] - (arm ? 22 : 40)), span = arm ? 14 + r() * 12 : 14 + r() * 36, mid = a0 + span / 2, rc2 = (outerR(rad(mid), 0) + innerR(rad(mid), 0)) / 2 + (r() - .5) * (arm ? 30 : 70), light = arm ? r() < .8 : r() < .66, o = leafOff(0, 0);
      surf += `<path d="${D(arc(o[0], o[1], rc2, rad(a0), rad(a0 + span), 5).concat([[o[0] + rc2 * Math.cos(rad(a0 + span)), o[1] + rc2 * Math.sin(rad(a0 + span))]]), false)}" fill="none" stroke="${light ? '#FFF3C4' : '#8A5A10'}" stroke-width="${f1(8 + r() * 4)}" stroke-linecap="round" stroke-opacity="${light ? .5 : .34}"/>`;
    }
    const jy = x => J1.p[1] + (x - J1.p[0]) * (J1.q[1] - J1.p[1]) / (J1.q[0] - J1.p[0]);
    for (const [x0, y0, x1, y1] of [[-340, jy(-340), -120, jy(-120)], [J2.p[0], J2.p[1], J2.q[0], J2.q[1]]]) { // the two sheet joints: a dark line with a pale ridge beside it
      surf += `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="#7A4E0E" stroke-opacity=".55" stroke-width="9" fill="none"/><path d="M${f1(x0 + 4)} ${f1(y0 + 3)}L${f1(x1 + 4)} ${f1(y1 + 3)}" stroke="#FFF3C4" stroke-opacity=".55" stroke-width="6" fill="none"/>`;
    }
    for (const [ya, yb] of [[c0.L.yb + 24, c0.L.yb + 66], [-c0.U.yb - 74, -c0.U.yb - 24]]) { // a light burnish streak down each serif
      surf += `<path d="M${f1(c0.xl + 46)} ${f1(ya)}L${f1(c0.xl + 46)} ${f1(yb)}" stroke="#FFF3C4" stroke-opacity=".5" stroke-width="8" stroke-linecap="round" fill="none"/>`;
    }
    surf = `<g clip-path="url(#gclip)">${surf}</g>`; }
  let tool = ''; // pricked line: punched dents along the thick stroke, uneven pitch, two sizes
  { const r = rng(272); let a = 114 + r() * 4;
    while (a < 246) {
      const th = rad(a), rcn = (outerR(th, 0) + innerR(th, 0)) / 2 + (r() - .5) * 15, p = goldAt(th, rcn), big = r() < .4, rr = big ? 10 : 6.5;
      tool += `<circle cx="${f1(p[0] + rr * .3)}" cy="${f1(p[1] + rr * .3)}" r="${f1(rr)}" fill="#FFF3C4" fill-opacity=".7"/><circle cx="${f1(p[0] - rr * .12)}" cy="${f1(p[1] - rr * .12)}" r="${f1(rr * .86)}" fill="#7A4E0E" fill-opacity=".72"/>`;
      a += 14 * (.7 + r() * .6);
    } }
  let fleck = ''; // flaked spots: irregular, at random depth, where the leaf lifted off the bole
  { const r = rng(99);
    for (let i = 0; i < 6; i++) {
      const th = rad(-205 + r() * 215), rr = outerR(th, 0) - 24 - r() * 36, p = goldAt(th, rr), q = 3 + r() * 5, v = 5 + Math.floor(r() * 3); let d = '';
      for (let k = 0; k < v; k++) { const an = k / v * 2 * Math.PI + r() * .5, ra = q * (.5 + r() * .7); d += (k ? 'L' : 'M') + f1(p[0] + ra * Math.cos(an)) + ' ' + f1(p[1] + ra * Math.sin(an)); }
      fleck += `<path d="${d}Z" fill="${K.bole}" fill-opacity="${f1(.7 + r() * .3)}"/>`;
    } }
  g.leaf = `<g id="leaf-c">${leaf}${surf}<g clip-path="url(#gclip)">${tool}${fleck}</g></g>`;

  // tower: argent, one flat shade plane on the flank, staggered courses, an ivory tick; contour in the ink group
  const mortar = []; { const hy = [-54, -94, -134], vs = [[-22, 20], [-4, 30], [-36, 4]]; hy.forEach((y, i) => { mortar.push([[-70, y], [70, y]]); vs[i].forEach(x => mortar.push([[x, y - 40], [x, y]])); }); }
  const mw = small ? 7 : 6;
  g.tower = `<g id="tower" transform="${TT}"><path d="${D(sil)}" fill="${K.arg}"/><g clip-path="url(#tclip)"><path d="M24 -240L90 -240L90 12L30 12Z" fill="${K.argD}"/><path d="M24 -240L30 12" stroke="${K.ink2}" stroke-opacity=".55" stroke-width="5" fill="none"/>` +
    mortar.map(m => `<path d="${D(rdp(densify(m, 6, false).map(([x, y]) => [x + 1.2 * TN.nx(x, y), y + 1.2 * TN.ny(x, y)]), .2, false), false)}" fill="none" stroke="${K.ink2}" stroke-width="${mw}" stroke-linecap="round" stroke-opacity=".6"/>`).join('') +
    `</g><rect x="-38" y="-150" width="7" height="42" rx="3.5" fill="${K.ivo}"/></g>`;
  // the hillock the tower stands on: malachite, clipped to the field, drawn over the tower's foot
  const mn = noise1(151, 3, 90, 240), moundTop = x => MOUND_Y + .0034 * (x + 6) * (x + 6) + 3.2 * mn(x);
  { const top = []; for (let x = -200; x <= 200; x += 8) top.push([x, moundTop(x)]);
    const edge = D(top, false), body = `M${f1(top[0][0])} ${f1(top[0][1])}` + top.slice(1).map(p => 'L' + f1(p[0]) + ' ' + f1(p[1])).join('') + 'L200 320L-200 320Z';
    const lite = top.filter(p => p[0] > -96 && p[0] < 18).map(p => [p[0], p[1] + 15]);
    g.mound = `<g id="mound" clip-path="url(#fclip)"><path d="${body}" fill="${K.mal}"/><path d="${D(lite, false)}" fill="none" stroke="${K.vdg}" stroke-opacity=".7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="${edge}" fill="none" stroke="${K.ink}" stroke-width="${f1(10 * inkS)}" stroke-linecap="round" stroke-linejoin="round"/></g>`; }
  const inkP = (id, d) => `<path id="${id}" d="${d}" fill="${K.ink}" fill-rule="evenodd"/>`;
  g.towerInk = `<g id="tower-ink" transform="${TT}"><path id="ink-tower" d="${D(sil)}" fill="none" stroke="${K.ink}" stroke-width="${towerInk}" stroke-linejoin="miter" stroke-miterlimit="2.6"/><path d="${D(door)}" fill="${K.ink}"/><path d="${D(slit)}" fill="${K.ink}"/></g>`;
  g.ink = `<g id="ink">` + inkP('ink-c', D(inkOuter) + D(inkInner)) + inkP('ink-frame', D(frame)) +
    `</g>`;
  return { defs, g, order: ['counter', 'bole', 'leaf', 'tower', 'towerInk', 'mound', 'ink'], geo: { moundTop, c0, loop0, inkOuter, inkInner, field, gold, bole, sil, door, slit, tw, TT, widths: band.widths, tier, W0, towerInk } };
}
const memoI = {}; const initial = tier => memoI[tier] || (memoI[tier] = buildInitial(tier));

/* ------------------------------------------------------------------ the ground: lapis diaper (docs --dp-lapis), hand-ruled */
function diaper(x0, y0, x1, y1, tier, a = 60, seed = 5) { // lozenges of half-diagonal a: continuous ruled diagonals, a jittered lozenge and (large) a gold dot in every cell
  const small = tier === 'small', r = rng(seed), wx = noise(seed + 1, 4, 280, 560), wy = noise(seed + 2, 4, 280, 560), w = 2 * a, ow = 2.5 / 48 * w, jit = 1.0 / 48 * w, drift = 1.7 / 48 * w;
  const lat = small ? K.latS : K.lat;
  const out = [`<rect x="${f1(x0 - a)}" y="${f1(y0 - a)}" width="${f1(x1 - x0 + 2 * a)}" height="${f1(y1 - y0 + 2 * a)}" fill="${K.diap}"/>`];
  // the ruling: every diagonal x+y = (2k+1)a and x-y = (2k+1)a, drawn as one line with its own slow wander and pen weight
  let lines = '';
  for (const fam of [1, -1]) {
    const lo = fam === 1 ? x0 + y0 : x0 - y1, hi = fam === 1 ? x1 + y1 : x1 - y0;
    for (let c = Math.floor(lo / (2 * a)) * 2 * a - a; c <= hi + 2 * a; c += 2 * a) {
      const off = (r() - .5) * 2 * jit, wgt = ow * (.88 + r() * .26), pts = [];
      for (let px = x0 - a; px <= x1 + a + 24; px += 24) { // the line runs along (1,-fam)/sqrt2 and is sampled along x
        const py = fam === 1 ? c - px : px - c;
        pts.push([px + drift * wx(px, py) + off * .7071, py + drift * wy(px, py) + fam * off * .7071]);
      }
      lines += `<path d="${D(pts, false)}" fill="none" stroke="${lat}" stroke-width="${f1(wgt)}" stroke-linejoin="round"/>`;
    }
  }
  out.push(lines);
  const i0 = Math.floor(x0 / a) - 1, i1 = Math.ceil(x1 / a) + 1, j0 = Math.floor(y0 / a) - 1, j1 = Math.ceil(y1 / a) + 1, taken = new Set();
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (((i + j) % 2 + 2) % 2) continue;
    const gx = i * a, gy = j * a, cx = gx + drift * wx(gx, gy) + (r() - .5) * 2 * jit, cy = gy + drift * wy(gx, gy) + (r() - .5) * 2 * jit;
    const rot = r() < 1 / 9 ? (r() - .5) * 6 : 0, sc = 1 + (r() - .5) * .08, hi = a * .46 * sc, tr = rot ? ` transform="rotate(${f1(rot)} ${f1(cx)} ${f1(cy)})"` : '';
    let counter = false; // counterchanged lozenges fall where the painter felt like it: about 1 in 14, never touching
    if (!small && r() < .07 && !taken.has((i - 2) + ',' + j) && !taken.has((i - 1) + ',' + (j - 1)) && !taken.has((i - 1) + ',' + (j + 1)) && !taken.has(i + ',' + (j - 2))) { counter = true; taken.add(i + ',' + j); }
    let s = `<path d="M${f1(cx)} ${f1(cy - hi)}L${f1(cx + hi)} ${f1(cy)}L${f1(cx)} ${f1(cy + hi)}L${f1(cx - hi)} ${f1(cy)}Z" fill="${counter ? K.mad : lat}" fill-opacity="${counter ? .55 : .5}"/>`;
    if (!small && (counter || r() > .09)) s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(2.6 / 48 * w * (.78 + r() * .4))}" fill="${K.orp}"/>`; // the gold dot: bigger and smaller, one cell in eleven left out
    out.push(`<g${tr}>${s}</g>`);
  }
  return out.join('');
}
function reserve(geo) { // a plain strip of ground round the letter (small sizes only), so the silhouette resolves before the diaper does
  return `<path d="${D(geo.loop0)}" fill="${K.diap}" stroke="${K.diap}" stroke-width="${f1(geo.W0 * 1.35 + 36)}" stroke-linejoin="round"/>`;
}

function svgWrap(vb, size, inner, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f1).join(' ')}" width="${size}" height="${size}"${extra}>${inner}</svg>`;
}

/* ------------------------------------------------------------------ composition: every output is a crop of one 108 dp (1080 mu) master layer */
const MASTER = 1080, MID = 540;                          // 1 mu = 0.1 dp
const GEO3 = initial('large').geo;
const INK_BOX = bboxOf(GEO3.inkOuter), ENC = mec(GEO3.inkOuter);          // ink-inclusive box of the letter, and its smallest enclosing circle (local coords)
const SHIFT_X = Math.round(-ENC.cx + 6);                 // the enclosing circle sits on the layer centre (the heavy bowl pulls the eye left, hence a hair to the right), which keeps the hooks inside the safe circle
const FG = `translate(${MID + SHIFT_X} ${MID})`;
const LETTER_H = INK_BOX.h;                              // 'letter height' in mu used for optical sizing
const tierFor = letterPx => letterPx < 100 ? 'small' : 'large';
const ENC_M = { cx: MID + SHIFT_X + ENC.cx, cy: MID + ENC.cy, r: ENC.r };  // enclosing circle in master coordinates
const BOX_CX = ENC_M.cx + .6 * ((MID + SHIFT_X + (INK_BOX.x0 + INK_BOX.x1) / 2) - ENC_M.cx);  // square tiles and full-bleed icons: between the circle's centre and the letter's box centre, so the margins left and right balance

function layers(tier) {
  const ini = initial(tier);
  return {
    defs: ini.defs,
    bg: `<g id="bg">${diaper(0, 0, MASTER, MASTER, tier)}</g>`,
    fg: `<g id="initial" transform="${FG}">${tier === 'small' ? `<g id="reserve">${reserve(ini.geo)}</g>` : ''}${ini.order.map(k => ini.g[k]).join('')}</g>`,
    geo: ini.geo,
  };
}
function monoLayer(geo) { // C + tower as one flat white silhouette (alpha is what the launcher themes use); door and slit punched out
  const T = `translate(${geo.tw.x} ${geo.tw.y - 3}) rotate(${geo.tw.lean}) scale(${f1(geo.tw.s * .94 * 1000) / 1000})`, d = p => D(p);
  return `<defs><mask id="mmask" maskUnits="userSpaceOnUse" x="-120" y="-300" width="240" height="320"><rect x="-120" y="-300" width="240" height="320" fill="#fff"/><path d="${d(geo.door)}" fill="#000"/><path d="${d(geo.slit)}" fill="#000" stroke="#000" stroke-width="7" stroke-linejoin="round"/></mask></defs>` +
    `<g id="mono" transform="${FG}"><path d="${d(geo.inkOuter)}" fill="#fff"/>` +
    `<g transform="${T}"><g mask="url(#mmask)"><path d="${d(geo.sil)}" fill="#fff" stroke="#fff" stroke-width="22" stroke-linejoin="round"/></g></g></g>`;
}
function maskDefs(kind, cx, cy, win) {
  const r = win / 2;
  return kind === 'round' ? `<clipPath id="shape"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/></clipPath>`
    : `<clipPath id="shape"><rect x="${f1(cx - r)}" y="${f1(cy - r)}" width="${f1(win)}" height="${f1(win)}" rx="${f1(win * .16)}"/></clipPath>`;
}
/* one raster: win = width of the master crop in mu, (cx, cy) its centre; kind = 'bg+fg' | 'bg' | 'fg' | 'mono' */
function iconSvg({ px, win, cx = MID, cy = MID, kind = 'bg+fg', shape = null, tier }) {
  if (!tier) tier = tierFor(LETTER_H / win * px);
  const L = layers(tier), vb = [cx - win / 2, cy - win / 2, win, win];
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
/* the emblem: the C seated on a lapis roundel (for the boot screen and the splash, where it sits on plain night) */
const ROUND_R = Math.round(ENC.r * 1.24);                // roundel radius, local mu, ring included
function roundel(tier) {
  const ini = initial(tier), c = [MID + SHIFT_X + ENC.cx, MID + ENC.cy], Rr = ROUND_R, ringW = 26 * (tier === 'small' ? .84 : 1);
  const hr = noise1(131, 3, 300, 900), pts = []; for (let i = 0; i < 180; i++) { const t = i / 180 * 2 * Math.PI, rr = Rr * (1 + .004 * hr(t * Rr * .7)); pts.push([c[0] + (rr - ringW / 2) * Math.cos(t), c[1] + (rr - ringW / 2) * Math.sin(t)]); }
  const band = inkBand(pts, { W: ringW, mod: .2, S: [.6, .8], split: .5, ML: 2, press: s => .08 * hr(s * .9 + 40) });
  const inside = rdp(band.inner, .2, true);
  return {
    clip: `<clipPath id="rclip"><path d="${D(inside)}"/></clipPath>`,
    bg: `<g id="bg"><g clip-path="url(#rclip)">${diaper(c[0] - Rr, c[1] - Rr, c[0] + Rr, c[1] + Rr, tier)}</g></g>`,
    ring: `<path id="ink-roundel" d="${D(rdp(band.outer, .2, true))}${D(inside)}" fill="${K.ink}" fill-rule="evenodd"/>`,
    fg: `<g id="initial" transform="${FG}">${ini.order.map(k => ini.g[k]).join('')}</g>`,
    c, R: Rr,
  };
}
function emblemSvg({ px, tier, margin = 0, cx, cy, win }) { // the roundel (diameter = px - 2*margin) on a transparent ground
  const ro = roundel(tier), ini = initial(tier);
  const W = win || (2 * ro.R + 2 * margin * 2 * ro.R / (px - 2 * margin)), c = [cx === undefined ? ro.c[0] : cx, cy === undefined ? ro.c[1] : cy];
  return svgWrap([c[0] - W / 2, c[1] - W / 2, W, W], px, `<defs>${ini.defs}${ro.clip}</defs>${ro.bg}${ro.fg}${ro.ring}`);
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
const W_LEGACY = 760, W_FULL = 840;                      // master crops (mu): legacy 48 dp tile, full-bleed store icon
const MASK_R = .4 * 512 * .965;                          // maskable: the whole letter inside the 80% circle (radius 40% of the side), with a hair to spare
const W_MASKABLE = Math.round(2 * ENC.r * 512 / (2 * MASK_R));
const SPLASH_D_DP = 34 / 100 * 360;                      // roundel diameter = 34% of the short side of a 360 dp-wide phone
const W_SPLASH = 288 * 10 / (SPLASH_D_DP / (2 * ROUND_R / 10)); // 288 dp canvas (Android 12 splash icon box) -> mu of master shown

const w = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const rel = f => path.relative(ROOT, f);

function titled(svg, title, desc) { return svg.replace(/^(<svg[^>]*>)/, `$1<title>${title}</title><desc>${desc}</desc>`); }
function masterSvg(kind, win, outSize, title, desc, cx = MID, cy = MID) { // crop of the master layer, wrapped so the viewBox is 0 0 outSize outSize
  const L = layers('large'), s = outSize / win, x0 = cx - win / 2, y0 = cy - win / 2;
  const inner = kind === 'mono' ? monoLayer(L.geo) : (kind.includes('bg') ? L.bg : '') + (kind.includes('fg') ? L.fg : '');
  const body = `<defs>${kind === 'mono' ? '' : L.defs}</defs><g transform="scale(${f1(s * 1000) / 1000}) translate(${f1(-x0)} ${f1(-y0)})">${inner}</g>`;
  return titled(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outSize} ${outSize}" width="${outSize}" height="${outSize}">${body}</svg>`, title, desc).replace('</svg>', '</svg>\n');
}
function bootSvg(outSize, title, desc) { // the roundel emblem plus the centre lines of the ink, for a draw-on animation (mask the ink group with them: stroke-dashoffset on pathLength=1)
  const ro = roundel('large'), ini = initial('large'), geo = ini.geo, W = 2 * ro.R * outSize / (outSize - 8), s = outSize / W, x0 = ro.c[0] - W / 2, y0 = ro.c[1] - W / 2; // same 4 px margin as emblem-boot.png
  const lines = `<g id="ink-lines" fill="none" stroke="none"><path id="ink-c-line" pathLength="1" transform="${FG}" d="${D(geo.loop0)}"/><path id="ink-frame-line" pathLength="1" transform="${FG}" d="M${f1(geo.c0.xl)} ${f1(-geo.c0.U.yb)}L${f1(geo.c0.xl)} ${f1(geo.c0.L.yb)}"/></g>`;
  const body = `<defs>${ini.defs}${ro.clip}</defs><g transform="scale(${f1(s * 1000) / 1000}) translate(${f1(-x0)} ${f1(-y0)})">${ro.bg}${ro.fg}${ro.ring}${lines}</g>`;
  return titled(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outSize} ${outSize}" width="${outSize}" height="${outSize}">${body}</svg>`, title, desc).replace('</svg>', '</svg>\n');
}
function writeSvgs() {
  const T = 'Castle Siege: History';
  w(path.join(ART, 'emblem.svg'), masterSvg('bg+fg', W_FULL, 1024, T + ' - emblem', 'Gold-leaf Lombardic capital C over red bole and iron-gall ink, holding an argent tower on a vermilion field; lapis diaper ground. Layers: bg, counter, bole, leaf-c, tower, ink. Generated by scripts/make-icons.js.', BOX_CX, ENC_M.cy));
  w(path.join(ART, 'icon-bg.svg'), masterSvg('bg', MASTER, MASTER, T + ' - adaptive icon background', 'Lapis diaper (108 dp layer, 1080 units).'));
  w(path.join(ART, 'icon-fg.svg'), masterSvg('fg', MASTER, MASTER, T + ' - adaptive icon foreground', 'Gold-leaf C with the argent tower (108 dp layer, 1080 units); letter ' + (INK_BOX.h / 10).toFixed(0) + ' dp tall, inside the 66 dp safe circle.'));
  w(path.join(ART, 'icon-mono.svg'), masterSvg('mono', MASTER, MASTER, T + ' - themed (monochrome) icon', 'Single-colour silhouette of the C and the tower (108 dp layer, 1080 units).'));
  w(path.join(ART, 'emblem-boot.svg'), bootSvg(512, T + ' - boot emblem', 'The C on a lapis diaper roundel, for the boot screen. Ink is filled shapes in group #ink and #ink-roundel; #ink-c-line and #ink-frame-line are centre lines (pathLength 1) for a draw-on mask.'));
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
     shows the same emblem (values-v31). splash_emblem is drawn per density on a 288 dp canvas; the lapis roundel is 34% of the short side of a 360 dp phone. -->
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

/* ------------------------------------------------------------------ contact sheet: the standing regression image (the squint test the exact-number audit cannot do) */
function genericTiles() { // three flat clip-art tiles to hold the icon against: tower on navy, shield on blue, crown on red
  const tile = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/>${fg}</svg>`;
  return [
    tile('#14214A', '<path d="M30 80V40h8v8h8v-8h8v8h8v-8h8v40h-14V66a8 8 0 0 0-16 0v14z" fill="#F2B922"/>'),
    tile('#2F6FED', '<path d="M50 16 78 26v22c0 18-12 30-28 36C34 78 22 66 22 48V26z" fill="#fff"/><path d="m50 34 4 9 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1z" fill="#2F6FED"/>'),
    tile('#D8362B', '<path d="M24 72 20 36l16 14 14-22 14 22 16-14-4 36z" fill="#F2B922"/><rect x="24" y="74" width="52" height="8" fill="#E3A512"/>'),
  ];
}
async function contactSheet(page, file) {
  const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'), mip = (n, f) => path.join(RES, 'mipmap-' + n, f);
  const bucket = { 48: 'mdpi', 72: 'hdpi', 96: 'xhdpi' };  // the layers a phone of that density would really load
  const gen = genericTiles().map(s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64'));
  const adaptive = (sz, shape) => { const bg = b64(mip(bucket[sz], 'ic_launcher_background.png')), fg = b64(mip(bucket[sz], 'ic_launcher_foreground.png'));
    return `<div class="ic ${shape}" style="width:${sz}px;height:${sz}px"><img src="${bg}" style="width:${sz * 1.5}px;height:${sz * 1.5}px;left:${-sz * .25}px;top:${-sz * .25}px"><img src="${fg}" style="width:${sz * 1.5}px;height:${sz * 1.5}px;left:${-sz * .25}px;top:${-sz * .25}px"></div>`; };
  const flat = (i, sz, shape) => `<div class="ic ${shape}" style="width:${sz}px;height:${sz}px"><img src="${gen[i]}" style="width:${sz}px;height:${sz}px;left:0;top:0"></div>`;
  let html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;font:11px sans-serif}.row{display:flex;align-items:center;gap:14px;padding:10px 14px}.ic{position:relative;overflow:hidden;flex:none}.ic img{position:absolute;image-rendering:auto}.circle{border-radius:50%}.rsq{border-radius:22%}.lab{width:44px}.l{background:#E8E2D0;color:#222}.d{background:#0d0d10;color:#ccc}.sp{width:26px}</style>`;
  for (const [cls, name] of [['l', 'light'], ['d', 'dark']]) for (const sz of [48, 72, 96]) {
    html += `<div class="row ${cls}"><div class="lab">${name}<br>${sz} px</div>`;
    for (const shape of ['circle', 'rsq']) { html += adaptive(sz, shape) + [0, 1, 2].map(i => flat(i, sz, shape)).join('') + '<div class="sp"></div>'; }
    html += '</div>';
  }
  await page.setViewportSize({ width: 1010, height: 6 * 120 });
  await page.setContent(html);
  const h = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewportSize({ width: 1010, height: h });
  const png = forceAlpha(await page.screenshot({ clip: { x: 0, y: 0, width: 1010, height: h }, animations: 'disabled' }), false);
  w(file, png); return png.length;
}

/* ------------------------------------------------------------------ audit: numbers the spec asks for, measured on what was actually drawn */
function alphaStats(png, pxPerDp, cx, cy) { // letter box and farthest opaque pixel from the layer centre, in dp
  const d = decodePng(png); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, far = 0;
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) if (d.rgba[(y * d.w + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); far = Math.max(far, Math.hypot(x + .5 - cx, y + .5 - cy)); }
  return { w: (x1 - x0 + 1) / pxPerDp, h: (y1 - y0 + 1) / pxPerDp, far: far / pxPerDp, d };
}
const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
function geometryAudit() {
  const ini = initial('large'), geo = ini.geo, c0 = geo.c0, o = {};
  // stroke contrast on the drawn polygons: radial thickness of the ink-outer polygon (edge to edge, ink included) and of the visible gold, over the arms and bowl
  const eo = [], eg = [];
  for (let a = 75; a <= 285; a += 1) { const ro = rayCross(geo.inkOuter, rad(a)), ri = rayCross(geo.inkInner, rad(a)); if (ro.length >= 2 && ri.length >= 2) { eo.push(ro[ro.length - 1] - ro[0]); eg.push(ri[ri.length - 1] - ri[0]); } }
  o.edgeMax = Math.max(...eo), o.edgeMin = Math.min(...eo), o.goldMax = Math.max(...eg), o.goldMin = Math.min(...eg);
  o.inkMin = Math.min(...geo.widths), o.inkMax = Math.max(...geo.widths);
  // bowl departure from a perfect circle (least-squares circle on the outer ink edge, left half only)
  { const bowl = geo.inkOuter.filter(p => p[0] < 100 && Math.hypot(p[0], p[1]) > 230); let cx = 0, cy = 0; for (const p of bowl) { cx += p[0]; cy += p[1]; } cx /= bowl.length; cy /= bowl.length;
    for (let it = 0; it < 60; it++) { let gx = 0, gy = 0, rm = 0; for (const p of bowl) rm += dist(p, [cx, cy]); rm /= bowl.length; for (const p of bowl) { const d = dist(p, [cx, cy]) || 1; gx += (p[0] - cx) / d * (d - rm); gy += (p[1] - cy) / d * (d - rm); } cx += gx / bowl.length; cy += gy / bowl.length; }
    let rm = 0; for (const p of bowl) rm += dist(p, [cx, cy]); rm /= bowl.length; let mx = 0, ss = 0; for (const p of bowl) { const e = Math.abs(dist(p, [cx, cy]) - rm); mx = Math.max(mx, e); ss += e * e; } o.circMax = mx; o.circRms = Math.sqrt(ss / bowl.length); }
  // top/bottom mirror symmetry of the ink silhouette (area of the intersection with its mirror image / area of the union), rasterised coarsely
  { let both = 0, any = 0; for (let y = -310; y <= 310; y += 5) for (let x = -330; x <= 260; x += 5) { const a = inPoly(geo.inkOuter, x, y), b = inPoly(geo.inkOuter, x, -y); if (a || b) any++; if (a && b) both++; } o.mirror = both / any; }
  // bole rim: how far the red shows between the ink's inner edge and the leaf edge (u), along the leaf edge where it lies inside the ink's inner loop
  { const rim = [], P = geo.inkInner;
    for (const p of geo.gold) { if (!inPoly(P, p[0], p[1])) continue; let d = 1e9; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0; d = Math.min(d, dist(p, [a[0] + t * dx, a[1] + t * dy])); } rim.push(d); }
    rim.sort((a, b) => a - b); o.rimP90 = rim[Math.floor(rim.length * .9)] || 0; o.rimP50 = rim[Math.floor(rim.length * .5)] || 0; o.rimFrac = rim.filter(v => v > 8).length / Math.max(1, geo.gold.length); }
  // tower against the counter, measured along the vertical through the tower: ink centre line = nominal counter, dilated C = visible vermilion
  { const tw = geo.tw, yi = vCross(geo.loop0, tw.x), yo = vCross(geo.inkOuter, tw.x), top = tw.y - 228 * tw.s - geo.towerInk * tw.s / 2, crest = geo.moundTop(tw.x);
    o.counterNom = yi[2] - yi[1]; o.counterVis = yo[2] - yo[1]; o.towerH = crest - top; o.towerGap = top - yo[1]; }
  o.hookU = (c0.parts[7][1].length) * 4; o.hookL = (c0.parts[1][1].length) * 4;
  return o;
}
function report() {
  const g = geometryAudit(), fmt = (n, k = 1) => n.toFixed(k), log = m => console.log('audit ' + m), warn = m => { console.log('WARN  ' + m); process.exitCode = 1; };
  log(`stroke thick:thin = ${fmt(g.edgeMax / g.edgeMin, 2)} edge to edge incl. ink (${fmt(g.edgeMax / 10)}:${fmt(g.edgeMin / 10)} dp), ${fmt(g.goldMax / g.goldMin, 2)} on the visible gold (${fmt(g.goldMax / 10)}:${fmt(g.goldMin / 10)} dp)  [spec 3:2 = 1.5, thinnest gold >= 5 dp]`);
  if (g.goldMin / 10 < 5) warn('thinnest visible stroke under 5 dp');
  if (g.edgeMax / g.edgeMin < 1.45) warn('thick/thin contrast under the 3:2 the spec asks for');
  log(`ink ${fmt(g.inkMin / 10)}..${fmt(g.inkMax / 10)} dp along the contour (mean ${fmt(INK_W / 10)}), mitred corners with fillets of 0.1..0.5 dp  [was constant 3.0, round joins]`);
  const circPx = g.circMax * 96 / W_LEGACY;
  log(`bowl departs from its best-fit circle by up to ${fmt(g.circMax / 10, 2)} dp (rms ${fmt(g.circRms / 10, 2)}) = ${fmt(circPx, 1)} px on the 96 px legacy icon  [acceptance: >= 1 px; was 0.42 dp max]`);
  if (circPx < 1) warn('bowl is still a circle at 96 px');
  log(`top/bottom mirror symmetry of the silhouette ${fmt(g.mirror * 100, 1)}%  [was 98.2%]`);
  log(`bole rim: median ${fmt(g.rimP50 / 10, 2)} dp, 90th percentile ${fmt(g.rimP90 / 10, 2)} dp, > 0.8 dp along ${fmt(g.rimFrac * 100, 0)}% of the leaf edge  [acceptance: a rim of ~1.0-1.4 dp visible upper-left; was 0.06-0.74]`);
  if (g.rimP90 / 10 < 1) warn('bole rim under 1 dp');
  log(`hooks: upper ${fmt(g.hookU / 10)} dp, lower ${fmt(g.hookL / 10)} dp tall; visible mouth ${fmt((CP.up.yb + CP.lo.yb - INK_W) / 10)} dp  [was 9.8 dp]`);
  log(`tower ${fmt(g.towerH / 10)} dp above the hillock = ${fmt(g.towerH / g.counterNom * 100, 0)}% of the counter (${fmt(g.counterNom / 10)} dp edge to edge) / ${fmt(g.towerH / g.counterVis * 100, 0)}% of the visible vermilion (${fmt(g.counterVis / 10)} dp); ${fmt(g.towerGap / 10)} dp of sky above it  [spec >= 70%]`);
  if (g.towerH / g.counterNom < .7) warn('tower under 70% of the counter height');
  log(`lattice ${K.latS} on ${K.diap} = ${fmt(contrast(K.latS, K.diap), 2)}:1 at small sizes (large ${K.lat}: ${fmt(contrast(K.lat, K.diap), 2)}:1)  [acceptance: <= 1.3 below 100 px]`);
  if (contrast(K.latS, K.diap) > 1.3) warn('calm lattice above 1.3:1');
  for (const name of ['mdpi', 'hdpi', 'xhdpi']) { // the squint test the exact-number audit cannot do: any gold-like pixel in the ground is confetti competing with the C
    const d = decodePng(fs.readFileSync(path.join(RES, 'mipmap-' + name, 'ic_launcher_background.png'))); let gold = 0, lmin = 1e9, lmax = 0;
    for (let i = 0; i < d.rgba.length; i += 4) { const r = d.rgba[i], g2 = d.rgba[i + 1], b = d.rgba[i + 2]; if (r > 150 && g2 > 110 && b < 110) gold++; const L = lum('#' + [r, g2, b].map(v => v.toString(16).padStart(2, '0')).join('')); lmin = Math.min(lmin, L); lmax = Math.max(lmax, L); }
    log(`${name.padEnd(8)} ic_launcher_background.png  ${gold} gold-like pixels, ground luminance contrast ${fmt((lmax + .05) / (lmin + .05), 2)}:1  [small tier (mdpi, hdpi): no gold dots, <= ~1.5:1]`);
    if (name !== 'xhdpi' && gold > 0) warn(name + ' ground has gold confetti');
    if (name !== 'xhdpi' && (lmax + .05) / (lmin + .05) > 1.6) warn(name + ' ground texture too contrasty for a 48 px icon');
  }
  for (const [name, d] of DENS) {
    const px = 108 * d, dir = path.join(RES, 'mipmap-' + name);
    for (const f of ['ic_launcher_foreground.png', 'ic_launcher_monochrome.png']) {
      const a = alphaStats(fs.readFileSync(path.join(dir, f)), d, px / 2, px / 2);
      const what = f.includes('foreground') ? 'letter + reserve' : 'letter';
      if (name === 'xxxhdpi' || a.far > 33 || Math.max(a.w, a.h) > 60) log(`${name.padEnd(8)} ${f.padEnd(28)} ${what} ${fmt(a.w)} x ${fmt(a.h)} dp, farthest opaque pixel ${fmt(a.far)} dp from centre  [safe radius 33 dp]`);
      if (a.far > 33.01) warn(`${name} ${f} leaves the 66 dp safe circle`);
      if (f.includes('monochrome') && Math.max(a.w, a.h) > 60.01) warn(`${name} ${f} is wider than 60 dp`);
    }
  }
  { const far = Math.max(...GEO3.inkOuter.map(p => dist([p[0] + SHIFT_X, p[1]], [0, 0]))) / 10, box = INK_BOX; // the letter itself, from the geometry
    log(`letter ${fmt(box.w / 10)} x ${fmt(box.h / 10)} dp, farthest ink ${fmt(far)} dp from the layer centre  [spec <= 60 dp across, <= 33 dp from centre]`);
    if (Math.max(box.w, box.h) / 10 > 60) warn('letter wider than 60 dp'); if (far > 33) warn('letter leaves the safe circle'); }
  { const rpx = ENC.r * 512 / W_MASKABLE; log(`maskable letter radius ${rpx.toFixed(0)} px of ${(512 * .4).toFixed(0)} px allowed (80% safe circle)  [was 171 px]`); if (rpx > 512 * .4) warn('maskable letter leaves the 80% safe zone'); }
  for (const f of ['icon-512.png', 'icon-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
    const b = fs.readFileSync(path.join(WEB, f)), d = decodePng(b); let amin = 255; for (let i = 3; i < d.rgba.length; i += 4) amin = Math.min(amin, d.rgba[i]);
    log(`${f.padEnd(22)} ${d.w}x${d.h} colour type ${b[25]} (${b[25] === 6 ? '32-bit RGBA' : '24-bit RGB'}) min alpha ${amin} ${(b.length / 1024).toFixed(0)} KB`);
    if (amin < 255) warn(f + ' has transparency');
    if (f === 'icon-512.png' && (b.length > 1024 * 1024 || b[25] !== 6)) warn('icon-512.png breaks the Play Store rules (32-bit, <= 1 MB)');
  }
  { const d = decodePng(fs.readFileSync(path.join(ART, 'emblem-boot.png')));
    const sp = decodePng(fs.readFileSync(path.join(RES, 'drawable-xxhdpi', 'splash_emblem.png'))); let x0 = 1e9, x1 = -1; for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) if (sp.rgba[(y * sp.w + x) * 4 + 3] > 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    log(`emblem-boot.png ${d.w}x${d.h} corner alpha ${d.rgba[3]}; splash roundel ${((x1 - x0 + 1) / 3).toFixed(1)} dp = ${(((x1 - x0 + 1) / 3) / 360 * 100).toFixed(1)}% of a 360 dp phone  [spec 34%]`);
    if (d.rgba[3] !== 0) warn('emblem-boot corners are not transparent'); }
}
async function main() {
  const t0 = Date.now();
  writeSvgs(); console.log('svg  ' + rel(ART) + '/*.svg');
  if (process.argv.includes('--svg')) return;
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is needed to rasterise the SVGs (npm i -D playwright, then npx playwright install chromium). Use --svg to skip the rasters.'); process.exit(2); }
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 64, height: 64 }, deviceScaleFactor: 1 });
  const out = [];
  const emit = async (file, svgOpts, { transparent = true, alpha = true, emblem = false } = {}) => {
    const px = svgOpts.px, png = forceAlpha(await rasterise(page, emblem ? emblemSvg(svgOpts) : iconSvg(svgOpts), px, transparent), alpha);
    w(file, png); out.push({ file, px, bytes: png.length }); return png;
  };
  let sheetBytes = 0;
  try {
    for (const [name, d] of DENS) {
      const dir = path.join(RES, 'mipmap-' + name), p48 = 48 * d, p108 = 108 * d;
      await emit(path.join(dir, 'ic_launcher.png'), { px: p48, win: W_LEGACY, cx: BOX_CX, shape: 'rsq' });
      await emit(path.join(dir, 'ic_launcher_round.png'), { px: p48, win: W_LEGACY, cx: BOX_CX, shape: 'round' });
      await emit(path.join(dir, 'ic_launcher_foreground.png'), { px: p108, win: MASTER, kind: 'fg' });
      await emit(path.join(dir, 'ic_launcher_background.png'), { px: p108, win: MASTER, kind: 'bg' }, { transparent: false, alpha: false });
      await emit(path.join(dir, 'ic_launcher_monochrome.png'), { px: p108, win: MASTER, kind: 'mono' });
      await emit(path.join(RES, 'drawable-' + name, 'splash_emblem.png'), { px: 288 * d, tier: 'large', win: W_SPLASH }, { emblem: true });
    }
    await emit(path.join(WEB, 'icon-512.png'), { px: 512, win: W_FULL, cx: BOX_CX }, { transparent: false });
    await emit(path.join(WEB, 'icon-192.png'), { px: 192, win: W_FULL, cx: BOX_CX }, { transparent: false });
    await emit(path.join(WEB, 'icon-maskable-512.png'), { px: 512, win: W_MASKABLE, cx: ENC_M.cx, cy: ENC_M.cy }, { transparent: false });
    await emit(path.join(WEB, 'apple-touch-icon.png'), { px: 180, win: W_FULL, cx: BOX_CX }, { transparent: false, alpha: false });
    await emit(path.join(ART, 'emblem-boot.png'), { px: 512, tier: 'large', margin: 4 }, { emblem: true });
    sheetBytes = await contactSheet(page, path.join(ART, 'contact-sheet.png'));
  } finally { await browser.close(); }
  writeXml(); cleanObsolete();
  report();
  for (const o of out) console.log('png  ' + rel(o.file).padEnd(70) + String(o.px).padStart(5) + ' px ' + String(o.bytes).padStart(8) + ' B');
  console.log('png  ' + rel(path.join(ART, 'contact-sheet.png')).padEnd(70) + '  1010 px ' + String(sheetBytes).padStart(8) + ' B');
  console.log('done in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

module.exports = { K, buildInitial, initial, layers, iconSvg, emblemSvg, monoLayer, diaper, decodePng, encodePng, geometryAudit, ENC, INK_BOX, SHIFT_X, ROUND_R };
