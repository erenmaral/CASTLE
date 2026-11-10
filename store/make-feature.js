#!/usr/bin/env node
'use strict';
/*
 * Castle Siege: History - Google Play feature graphic, 1024 x 500, one illuminated folio per locale
 * (docs/ART_DIRECTION.md sections 1, 2, 3 and 9 "Key art and native").
 *
 *   node store/make-feature.js                 every locale: en tr es pt ru zh (es-419 is a copy of es-ES)
 *   node store/make-feature.js en,ru,zh        only the named ones (short codes or store folders: en-US, es-419 ...)
 *   FEATURE_OUT=/some/dir node store/make-feature.js    write <dir>/<locale>.jpg|png, the layers and the sheet there instead of into the repository
 *
 * Needs Playwright + Chromium. About 5 s for all locales: one headless Chromium that is closed at the end. Also exports run(args) for a wrapper.
 * The game page (www/index.html) is loaded live, so every re-run picks up the current sprites, castle, scenery and tiles; nothing is read from old screenshots.
 *
 * Writes (only these):
 *   store/metadata/android/<locale>/images/featureGraphic.jpg    1024 x 500 JPEG q92, no alpha, key content inside x 130-900
 *   store/art/feature-scene.png                                   the language-neutral folio (page, frame and miniature, no type)
 *   store/art/feature-contact.jpg                                 review sheet (full runs only): every locale at 0.5x and at the ~360 px store thumbnail
 * Reads store/art/feature-cjk-serif-700|900.woff2 (+ feature-cjk-serif.txt, its glyph list): the Noto Serif SC subset that sets the Chinese type (store/art/feature-cjk-subset.py).
 *
 * THE PICTURE. A folio of the unfinished Bible. Left page: the lapis diaper (Z.Art 'lapis'), the title in Texturina 700 with a drop-initial that begins it,
 * the swallow-tail banderole and the app's seal hanging from it. Right page: a gilt-barred miniature of the real game: gold-leaf diaper horizon band and hills (scenery.js),
 * the garrison's castle (R.baseSlot), a clearing and lane road (R.Scenery.flat), the host in staggered ranks (R.renderSprite: archers, knight, banner, catapult, mage, spears),
 * a volley of the game's own arrows (R.projShape) and the catapult's stones. Both pages sit in the game's 12u frame (Z.Art.overlay).
 *   - Versal: the emblem's own gold-leaf Lombardic C (store/art/emblem.svg, <g id="initial">) where the title starts with C (en, pt). Where it does not (tr K,
 *     es A, ru O, zh the first character) the true initial is gilded in the same recipe (leaf-art face, bole misregistration, ink contour) on a madder quatrefoil
 *     field, shrunk (PLATE) so that its frame starts on the key-content line x 130: a C in front of "Kale Kusatmasi" would be a misprint.
 *   - Seal: the whole app icon (www/icons/icon-512.png) in a ring of ink | gold leaf | ink on two madder tags tied behind the banderole's right end, in every locale.
 *   - Paint-front (bible section 9; "the picture" = the miniature): it is painted from the right. The left of it is underdrawing: the ink of the finished art thinned to a
 *     centre line (Zhang-Suen), --ink2, on vellum, with drypoint ruling and prick holes; then pigment laid up to the line without the ink (the nearest flat colour is bled
 *     into the ink band); then the finished gouache with its heavy iron-gall ink, complete from 32 % of the miniature = x 717, the bible's 70 % of the banner. Both edges
 *     (PARAMS.front) are hard hand-ruled lines that wander and step in brush bands with a deckle: no feather, no gradient. The volley is drawn into the finished art, so it
 *     crosses the front: drawn arrows on the vellum, then flat arrows, then inked ones. The gilt bar, banderole and frame are finished.
 *   - Taglines are the bible's short "105 real sieges" in each language, set as large as the zone allows (44 px, never under PARAMS.tagMin = 40 px; ~15 px in the 360 px thumbnail).
 *   - Chinese: the type is the embedded Noto Serif SC subset (Black for the title and the plate glyph, Bold for the tagline), so zh is reproducible on every machine; the title's
 *     full-width colon is set centred in its own em cell at the end of its line, so that it is not mistaken for an ASCII colon.
 *   - Sprites come from R.renderSprite (the makeSprite entry, uncached) baked at px 6 and averaged down; the castle from R.baseSlot; the scenery from R.resize / R.Scenery.
 *     render.js keeps CASTLE_H, the slot head room and the ground-tick table private: they are copied below and the castle slot is checked against them.
 * Everything is seeded and runs at 2x then averaged down once: two runs give byte-identical files.
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..'), WWW = path.join(ROOT, 'www'), FONTS = path.join(WWW, 'fonts');
const ART = path.join(__dirname, 'art'), META = path.join(__dirname, 'metadata', 'android');
const OUT = process.env.FEATURE_OUT ? path.resolve(process.env.FEATURE_OUT) : null;
const GAME_URL = 'file://' + path.join(WWW, 'index.html');

/* ---- locales: store folder, title (store/metadata/android/<locale>/title.txt) and the banderole line (the bible's short "105 real sieges", set big: >= PARAMS.tagMin px) ---- */
const LOCALES = {
  en: { dir: 'en-US', title: 'Castle Siege: History', tag: '105 real sieges' },
  tr: { dir: 'tr-TR', title: 'Kale Kuşatması: Tarih', tag: '105 gerçek kuşatma' },
  es: { dir: 'es-ES', title: 'Asedio de Castillos: Historia', tag: '105 asedios reales', copies: ['es-419'] },
  pt: { dir: 'pt-BR', title: 'Cerco de Castelos: História', tag: '105 cercos reais' },
  ru: { dir: 'ru-RU', title: 'Осада замков: История', tag: '105 реальных осад' },
  zh: { dir: 'zh-CN', title: '城堡围攻：历史', tag: '105场真实围攻' },
};
const SHORT = Object.keys(LOCALES);

function pickLocales(args) {
  const want = args.filter(a => !/^--/.test(a)).join(',').split(',').map(s => s.trim()).filter(Boolean);   // flags (a wrapper passes make-screens.js's --strict etc. to both) are not locales
  if (!want.length) return SHORT.slice();
  const out = [];
  want.forEach(w => {
    const k = SHORT.find(s => s === w || LOCALES[s].dir.toLowerCase() === w.toLowerCase() || (LOCALES[s].copies || []).indexOf(w) >= 0 || s === w.split('-')[0].toLowerCase());
    if (!k) throw new Error('unknown locale "' + w + '" (use ' + SHORT.join(', ') + ' or a store folder name)');
    if (out.indexOf(k) < 0) out.push(k);
  });
  return out;
}

/* ---- tuning knobs. Lengths are final px of the 1024 x 500 picture unless the name says u (the game's stage unit) ---- */
const PARAMS = {
  // the folio: gilt bar between the pages (left edge x), px per u of the miniature, scenery seed (level 12's: Kenilworth), crop of the stage (u, relative to the castle's left edge / stage top),
  // the castle's damage tier as the game bakes it (0 whole, 1 cracked, 2 burning)
  px0: 556, ks: 1.25, seed: 163, cropX: 194, cropY: 20, clothT: 0.9, tier: 0,
  // paint-front: ink test distance (RGB), looser one for the pen tufts in the meadow, gold ring test, thickest stroke / 2, line half-width, pigment bleed, y of the drypoint rules (below the moat, at the host's feet).
  // The front itself (bible: colour complete by x 717 = 70 % of the banner = a third of the miniature) is two hard hand-ruled edges, no feather: the underdrawing ends at front.ut and the pigment
  // is inked from front.tc (shares of the miniature's width); each edge wanders (wave px), steps in brush bands (band: min..max px tall, step: px of offset) and has a deckle of +-deckle px
  inkD: 50, inkSoft: 76, ringD: 34, rmax: 5, lineR: 3, bleed: 3, rules: [320, 442],
  front: { ut: 0.16, tc: 0.32, wave: 11, step: 7, band: [5, 12], deckle: 1.6 },
  // type: the title block starts at x 130 and may use 408 px; banderole height, gap under the block, how far the banderole runs onto the folio, tagline type (px: wanted size, smallest allowed),
  // the longest the banderole may get, the emblem seal that hangs from its right end (radius)
  titleX: 130, titleW: 408, titleCY: 244, bandH: 72, bandGap: 22, bandOver: 52, tagPx: 44, tagMin: 40, bandMax: 480, sealR: 31,
  // the host: x in the miniature (centre of the figure), y = the line the figure stands on, s = scale against the scenery; the first and last are cut by the frame, the ranks are staggered
  spritePx: 6,
  host: [
    { cls: 'spear', s: 1.2, x: -6, y: 456 }, { cls: 'archer', s: 1.04, x: 46, y: 438 }, { cls: 'archer', s: 0.96, x: 100, y: 414 }, { cls: 'knight', s: 1.14, x: 168, y: 449 }, { cls: 'banner', s: 1.06, x: 246, y: 425 },
    { cls: 'cata', s: 1.08, x: 322, y: 455, st: 'a' }, { cls: 'mage', s: 1.0, x: 406, y: 429 },
  ],
  // the volley: arcs a -> b -> c (quadratic, miniature px), n arrows between t0 and t1, shifted by dx, dy, scale k; and stones (h = height in the arc, 0..1)
  volley: [
    { a: [58, 388], b: [92, 262], c: [206, 218], n: 5, t0: 0.1, t1: 0.92, dx: 0, dy: 0, k: 1 },
    { a: [58, 388], b: [92, 262], c: [206, 218], n: 3, t0: 0.34, t1: 0.86, dx: 30, dy: 22, k: 0.96 },
    { a: [104, 362], b: [130, 262], c: [214, 224], n: 4, t0: 0.12, t1: 0.9, dx: 0, dy: 0, k: 1 },
  ],
  stones: [{ x: 331, y: 398, k: 1, h: 0.5 }, { x: 346, y: 352, k: 0.92, h: 0.95 }, { x: 358, y: 304, k: 0.82, h: 1 }],
};

/* width x height of a baseline/progressive JPEG (its SOF marker); the files we write must be exactly 1024 x 500 */
function jpegSize(buf) {
  for (let i = 2; i + 9 < buf.length;) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/* ---- fonts: the game's own OFL woff2 files, embedded as data: URIs (file:// fonts fail on about:blank pages) ---- */
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATEXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const CYR = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
function fontFaces() {
  const b64 = f => fs.readFileSync(path.join(FONTS, f)).toString('base64');
  const faces = [
    ['FGRub', '700', 'texturina-latin-700-normal.woff2', LATIN], ['FGRub', '700', 'texturina-latin-ext-700-normal.woff2', LATEXT],           // Rub: headings
    ['FGTop', '400', 'pirata-one-latin-400-normal.woff2', LATIN], ['FGTop', '400', 'pirata-one-latin-ext-400-normal.woff2', LATEXT],         // Top: versals
    ['FGHand', '400 800', 'eb-garamond-latin-600-normal.woff2', LATIN], ['FGHand', '400 800', 'eb-garamond-latin-ext-600-normal.woff2', LATEXT],
    ['FGHand', '400 800', 'eb-garamond-cyrillic-600-normal.woff2', CYR],                                                                      // Hand: body, digits, Cyrillic
  ].map(a => ({ family: a[0], weight: a[1], range: a[3], b64: b64(a[2]) }));
  // Chinese: the committed Noto Serif SC subset (store/art/feature-cjk-subset.py), so zh no longer depends on the machine's CJK font
  [700, 900].forEach(w => faces.push({ family: 'FGHan', weight: String(w), range: 'U+0-10FFFF', b64: fs.readFileSync(path.join(ART, 'feature-cjk-serif-' + w + '.woff2')).toString('base64') }));
  return faces;
}
/* the glyphs of the Chinese subset: every CJK character of a zh string must be in it (else the system font would silently step in) */
function checkHan(loc) {
  const have = new Set(fs.readFileSync(path.join(ART, 'feature-cjk-serif.txt'), 'utf8').replace(/\s+/g, ''));
  Array.from(loc.title + loc.tag).forEach(ch => { if (/[⺀-鿿＀-￯]/.test(ch) && !have.has(ch)) throw new Error('zh "' + ch + '" is not in store/art/feature-cjk-serif.txt: add it and run store/art/feature-cjk-subset.py'); });
}

/* the emblem's historiated initial (gold-leaf Lombardic C, vermilion field, argent tower) without its diaper: <defs> + <g id="initial"> of store/art/emblem.svg */
function emblemInitial() {
  const s = fs.readFileSync(path.join(ART, 'emblem.svg'), 'utf8').trimEnd(), tail = '</g></svg>';
  const d0 = s.indexOf('<defs>'), d1 = s.indexOf('</defs>') + 7, i0 = s.indexOf('<g id="initial"');
  const wrap = (s.match(/<g transform="([^"]+)"><g id="bg">/) || [])[1], vb = (s.match(/<svg[^>]*viewBox="([^"]+)"/) || [])[1];
  if (d0 < 0 || i0 < 0 || !wrap || !vb || !s.endsWith(tail)) throw new Error('store/art/emblem.svg no longer has the expected <defs> / <g transform><g id="bg"> / <g id="initial"> structure');
  return { defs: s.slice(d0, d1), initial: s.slice(i0, s.length - tail.length), wrap, viewBox: vb };
}

/* ================================================================================================================================
 * BROWSER SIDE. Playwright serialises this function, so it may only use what it receives (A) and what the game page defines (Z.*).
 * Geometry is in final pixels of the 1024 x 500 picture; everything is painted at SS x and averaged down once at the end.
 * ============================================================================================================================== */
async function inPage(A) {
  const Z = globalThis.Z, R = Z.Render, Art = Z.Art, TK = Art.TOK;
  [['Render.resize', R && R.resize], ['Render.baseSlot', R && R.baseSlot], ['Render.baseDyn', R && R.baseDyn], ['Render.renderSprite', R && R.renderSprite], ['Render.Scenery.flat', R && R.Scenery && R.Scenery.flat],
    ['Art.overlay', Art.overlay], ['Art.pattern', Art.pattern], ['Art.leafBox', Art.leafBox], ['Art.rng', Art.rng], ['Art.wob', Art.wob]].forEach(c => { if (!c[1]) throw new Error('the game no longer provides Z.' + c[0] + ' (store/make-feature.js needs it)'); });
  const W = 1024, H = 500, SS = 2, KP = 1.4;                 // picture, supersample, px per u of the page ornaments (the game's 12u frame = 16.8 px)
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const timing = {}, T0 = performance.now(), lap = n => { timing[n] = Math.round(performance.now() - T0); };

  // ---------- geometry ----------
  const F = 12 * KP, BAR = 12 * KP, PX0 = A.px0;              // outer frame band, gilt bar, its left edge
  const PAN = { x: PX0 + BAR, y: F, w: W - F - (PX0 + BAR), h: H - 2 * F };   // the miniature's interior
  const KS = A.ks;                                           // px per u of the miniature

  // ---------- 1. the real game art: scenery, clearing, castle, host ----------
  R.theme = 0; R.seed = A.seed;
  const SW = 1100, SH = 760;                                 // a wide stage, so the castle can be cropped anywhere (pY = SH - 370: the lane roads reach y 456u)
  R.resize(SW, SH, KS * SS);                                 // bakes the realm scenery (gold diaper band, hills, trees, roads) at KS * SS px per u into R.bg
  const rpx = R.px, ox = R.ox, CASTLE_H = 86, MT = 20;       // render.js keeps these private: castle top .. ground line, head room of the castle slot
  lap('scenery');
  const cx0 = (ox + A.cropX) * rpx, cy0 = A.cropY * rpx;
  const colour = mk(PAN.w * SS, PAN.h * SS), cg = colour.getContext('2d');
  cg.drawImage(R.bg, cx0, cy0, PAN.w / KS * rpx, PAN.h / KS * rpx, 0, 0, colour.width, colour.height);
  // a clearing for the host: the scenery's own ground painter (flat realm ground, quiet diaper, ink tufts) and lane road over the forest below the moat
  const FL = R.Scenery.flat, rn = Art.rng(A.seed * 7 + 3), yG = R.eY + 4;              // castle ground line + 4u
  cg.save(); cg.setTransform(rpx, 0, 0, rpx, -cx0, -cy0);
  cg.beginPath(); cg.rect(-50, yG, SW + 100, SH); cg.clip();
  FL.groundLayer(cg, { W: SW, H: SH, x0: ox + A.cropX - 20, x1: ox + A.cropX + PAN.w / KS + 20, y0: yG, y1: SH - 6, cell: 38, keep: 0.62, rnd: rn, kind: 'forest', theme: 0, avoid: function () { return false; } });
  FL.laneRoad(cg, R, 1, rn);
  cg.restore();
  // the garrison's castle (moat, three gatehouses, four towers) as the game bakes it; its cloth and torches drawn at a fixed instant
  const cc0 = R._cc; R._cc = {};
  const slot = R.baseSlot(1, A.tier, true);
  if (Math.abs(slot.by - (R.eY - CASTLE_H - MT)) > 1) throw new Error('the castle slot moved (by ' + slot.by + '): update CASTLE_H / MT in store/make-feature.js');
  const castle = mk(slot.cv.width, slot.cv.height), kg = castle.getContext('2d');
  kg.drawImage(slot.cv, 0, 0); kg.setTransform(rpx, 0, 0, rpx, 0, MT * rpx); R.baseDyn(kg, slot, A.tier, A.clothT);
  R._cc = cc0;
  cg.drawImage(castle, slot.bx * rpx - cx0, slot.by * rpx - cy0);
  lap('castle');
  // the host: the game's own sprites, baked at px = spritePx (the bible's "px=6") and averaged down to the size they are drawn at
  const p0 = R.px, b0 = R._bpx, i0 = R.icoMode, TICK = { def: 22, cav: 39.5, cata: 35, golem: 28 };   // TICK: u from the sprite origin down to the ground ticks (render.js TICKS, private)
  function sprite(cls, st, idx) {
    R.px = A.spritePx; R._bpx = R.px; R.icoMode = false;     // not a portrait: keep the vellum halo and the ink ground ticks
    try { return R.renderSprite(cls, 0, st || 'i', idx || 0); } finally { R.px = p0; R._bpx = b0; R.icoMode = i0; }
  }
  A.host.slice().sort((a, b) => a.y - b.y).forEach(u => {
    const s = sprite(u.cls, u.st, u.i), f = KS * u.s * SS / A.spritePx, gx = u.x * SS, gy = (u.y - (TICK[u.cls] || TICK.def) * KS * u.s * 1.28) * SS;
    cg.imageSmoothingQuality = 'high';
    cg.drawImage(s, gx + (-46 * s.fw / 92 + s.kx) * f, gy + (-74 * s.fh / 120 + s.ky) * f, s.width * f, s.height * f);
  });
  // the volley: the game's own arrow (R.projShape, 'arrow') along quadratic arcs from the archers to the gate; drawn into the finished art, so the paint-front
  // below turns the same arrows from a drawn line (left) through laid pigment into inked gouache (right): the siege crosses the front
  const vr = Art.rng(A.seed * 11 + 5);
  A.volley.forEach(v => {
    for (let k = 0; k < v.n; k++) {
      const t = v.t0 + (v.t1 - v.t0) * (k + (vr() - 0.5) * 0.5) / Math.max(1, v.n - 1), m = 1 - t;
      const px_ = m * m * v.a[0] + 2 * m * t * v.b[0] + t * t * v.c[0] + v.dx, py_ = m * m * v.a[1] + 2 * m * t * v.b[1] + t * t * v.c[1] + v.dy;
      const tx = 2 * m * (v.b[0] - v.a[0]) + 2 * t * (v.c[0] - v.b[0]), ty = 2 * m * (v.b[1] - v.a[1]) + 2 * t * (v.c[1] - v.b[1]);
      cg.save(); cg.translate(px_ * SS, py_ * SS); cg.rotate(Math.atan2(tx, -ty) + (vr() - 0.5) * 0.12); cg.scale(KS * SS * v.k, KS * SS * v.k);
      R.projShape(cg, 'arrow', 0, 0, -1, 0, 1, 0); cg.restore();
    }
  });
  (A.stones || []).forEach(o => { cg.save(); cg.translate(o.x * SS, o.y * SS); cg.scale(KS * SS * o.k, KS * SS * o.k); R.projShape(cg, 'stone', 0, 0, -1, o.h, 1, 0); cg.restore(); });
  lap('host');

  // ---------- 2. paint-front: underdrawing -> pigment laid -> inked gouache ----------
  // The ladder of an unfinished folio (bible section 1): U = bare vellum + iron-gall underdrawing (--ink2, no fill); T = pigment laid up to the line, ink not yet gone over
  // it; C = the finished gouache with its heavy ink. The underdrawing is edge-detected from the finished art itself: its ink mask, thinned to a one-pixel centre line.
  function paintFront(cv, o) {
    const w = cv.width, h = cv.height, N = w * h, ctx = cv.getContext('2d'), d = ctx.getImageData(0, 0, w, h).data;
    const INK = [30, 22, 16], RING = [138, 90, 16], I2 = [75, 59, 42];
    const near = (i, c, r2) => { const a = d[i * 4] - c[0], b = d[i * 4 + 1] - c[1], e = d[i * 4 + 2] - c[2]; return a * a + b * b + e * e < r2; };
    const ink = new Uint8Array(N), ringM = new Uint8Array(N), softFrom = o.softY * w;   // from the meadow down the pen tufts (ink at alpha .66 over the ground) need a looser test
    for (let i = 0; i < N; i++) { const r = i >= softFrom ? o.inkSoft : o.inkD; if (near(i, INK, r * r)) ink[i] = 1; else if (near(i, RING, o.ringD * o.ringD)) ringM[i] = 1; }
    function morph(m, r, grow) { // square-window erosion / dilation, separable
      const t = new Uint8Array(N), q = new Uint8Array(N), out = grow ? 1 : 0, edge = grow ? 0 : 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = edge; for (let k = -r; k <= r; k++) { const xx = x + k, b = xx < 0 || xx >= w ? edge : m[y * w + xx]; if (b === out) { v = out; break; } }
        t[y * w + x] = v;
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = edge; for (let k = -r; k <= r; k++) { const yy = y + k, b = yy < 0 || yy >= h ? edge : t[yy * w + x]; if (b === out) { v = out; break; } }
        q[y * w + x] = v;
      }
      return q;
    }
    // strokes only: a big solid blob (a doorway) keeps its rim, never its fill
    const core = morph(ink, o.rmax, 0), coreD = morph(core, o.rmax - 2, 1), strokes = new Uint8Array(N);
    for (let i = 0; i < N; i++) strokes[i] = (ink[i] && !coreD[i]) || ringM[i] ? 1 : 0;
    // Zhang-Suen thinning -> one-pixel centre lines
    const sk = strokes.slice(), idx = new Int32Array(N);
    for (let again = 1; again;) {
      again = 0;
      for (let pass = 0; pass < 2; pass++) {
        let n = 0;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const i = y * w + x; if (!sk[i]) continue;
          const p2 = sk[i - w], p3 = sk[i - w + 1], p4 = sk[i + 1], p5 = sk[i + w + 1], p6 = sk[i + w], p7 = sk[i + w - 1], p8 = sk[i - 1], p9 = sk[i - w - 1];
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9; if (B < 2 || B > 6) continue;
          const Aa = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2); if (Aa !== 1) continue;
          if (pass === 0) { if (p2 * p4 * p6 || p4 * p6 * p8) continue; } else if (p2 * p4 * p8 || p2 * p6 * p8) continue;
          idx[n++] = i;
        }
        for (let k = 0; k < n; k++) sk[idx[k]] = 0;
        if (n) again = 1;
      }
    }
    const line = morph(sk, o.lineR, 1);
    // T: the pigment bled into the ink band from the nearest clean flat colour, so the shapes meet on the underdrawn line (the band is grown past the anti-aliased fringe)
    const band = morph(strokes, o.bleed, 1), T = new Uint8ClampedArray(d), filled = new Uint8Array(N);
    for (let i = 0; i < N; i++) filled[i] = band[i] ? 0 : 1;
    for (let it = 0; it < o.rmax + o.bleed + 3; it++) {
      const add = [];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x; if (filled[i]) continue;
        let r = 0, g = 0, b = 0, c = 0; const nb = [i - 1, i + 1, i - w, i + w];
        for (let k = 0; k < 4; k++) if (filled[nb[k]]) { r += T[nb[k] * 4]; g += T[nb[k] * 4 + 1]; b += T[nb[k] * 4 + 2]; c++; }
        if (c) add.push(i, Math.round(r / c), Math.round(g / c), Math.round(b / c));
      }
      for (let k = 0; k < add.length; k += 4) { const i = add[k]; T[i * 4] = add[k + 1]; T[i * 4 + 1] = add[k + 2]; T[i * 4 + 2] = add[k + 3]; filled[i] = 1; }
      if (!add.length) break;
    }
    // vellum with its grain, the scribe's drypoint ruling and a column of prick holes in the margin (all of it vanishes under pigment)
    const vc = mk(w, h), vg = vc.getContext('2d'); vg.fillStyle = TK.vel; vg.fillRect(0, 0, w, h);
    const gp = Art.pattern(vg, 'grain', KS * SS); if (gp) { vg.fillStyle = gp; vg.fillRect(0, 0, w, h); }
    vg.save(); vg.strokeStyle = TK.ink2; vg.fillStyle = TK.ink2; vg.lineCap = 'round';
    vg.globalAlpha = 0.42; vg.lineWidth = 1.3 * SS; vg.beginPath(); o.rules.forEach(r => { vg.moveTo(0, r * SS); vg.lineTo(w, r * SS); }); vg.stroke();
    vg.globalAlpha = 0.6; vg.beginPath(); for (let y = 10; y < h / SS - 6; y += 13) { vg.moveTo(9.3 * SS, y * SS); vg.arc(8 * SS, y * SS, 1.3 * SS, 0, TAU); } vg.fill();
    vg.restore();
    const V = vg.getImageData(0, 0, w, h).data, out = ctx.createImageData(w, h), od = out.data;
    // the two hand-ruled edges of the front (hard, no feather): per row, a slow wander + a step of the brush band the row belongs to; the deckle is a +-px jitter of the test per pixel
    const rr = Art.rng(o.seed * 13 + 1), hash = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >> 13)) * 1274126177 | 0; return ((n ^ (n >> 16)) >>> 0) / 4294967296; };
    function edge(base) {
      const ph = [rr() * 6, rr() * 6, rr() * 6], e = new Float32Array(h);
      for (let y = 0, y1 = 0, st = 0; y < h; y++) {
        if (y >= y1) { y1 = y + Math.round((o.band[0] + rr() * (o.band[1] - o.band[0])) * SS); st = (rr() - 0.5) * 2 * o.step * SS; }
        e[y] = base + (Math.sin(y / (58 * SS) + ph[0]) * 0.62 + Math.sin(y / (27 * SS) + ph[1]) * 0.3 + Math.sin(y / (13 * SS) + ph[2]) * 0.08) * o.wave * SS + st;
      }
      return e;
    }
    const eUT = edge(o.ut * w), eTC = edge(o.tc * w), dk = o.deckle * SS;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, q = i * 4, jt = (hash(x, y) - 0.5) * 2 * dk, mT = o.force ? o.force[0] : (x + jt > eUT[y] ? 1 : 0), mC = o.force ? o.force[1] : (x + (hash(y, x) - 0.5) * 2 * dk > eTC[y] ? 1 : 0), L = line[i] ? 1 : 0;
        for (let k = 0; k < 3; k++) {
          const u = L ? V[q + k] * 0.12 + I2[k] * 0.88 : V[q + k], t = L ? T[q + k] * 0.15 + I2[k] * 0.85 : T[q + k];   // U: vellum + ink2 line; T: pigment + ink2 line
          od[q + k] = mC ? d[q + k] : mT ? t : u;                                                                        // C: the finished art
        }
        od[q + 3] = 255;
      }
    }
    if (o.show) { const m = { ink, strokes, core, line, band }[o.show]; for (let i = 0; i < N; i++) { const v = m[i] ? 0 : 255; od[i * 4] = v; od[i * 4 + 1] = v; od[i * 4 + 2] = v; od[i * 4 + 3] = 255; } }
    ctx.putImageData(out, 0, 0);
  }
  const FO = { softY: Math.round((R.eY - A.cropY) * KS * SS), inkSoft: A.inkSoft, bleed: A.bleed, inkD: A.inkD, ringD: A.ringD, rmax: A.rmax, lineR: A.lineR, seed: A.seed, ut: A.front.ut, tc: A.front.tc, wave: A.front.wave, step: A.front.step, band: A.front.band, deckle: A.front.deckle, rules: A.rules };
  const layers = {};                                          // FEATURE_OUT only: the three states and the masks, for review
  if (A.layers) [['U', [0, 0]], ['T', [1, 0]], ['C', [1, 1]], ['ink', [1, 1], 'ink'], ['strokes', [1, 1], 'strokes'], ['line', [1, 1], 'line']].forEach(l => {
    const cp = mk(colour.width, colour.height); cp.getContext('2d').drawImage(colour, 0, 0); paintFront(cp, Object.assign({ force: l[1], show: l[2] }, FO)); layers[l[0]] = cp.toDataURL('image/png');
  });
  paintFront(colour, FO);
  lap('front');

  // ---------- 3. the page: lapis diaper, the miniature, the gilt bar, the game's frame ----------
  const page = mk(W * SS, H * SS), pg = page.getContext('2d'), U = KP * SS;      // U: device px per u of the page ornaments
  pg.fillStyle = TK.diap; pg.fillRect(0, 0, page.width, page.height);
  const lp = Art.pattern(pg, 'lapis', U); if (lp) { pg.save(); pg.translate(F * SS, F * SS); pg.fillStyle = lp; pg.fillRect(-F * SS, -F * SS, page.width, page.height); pg.restore(); }
  pg.drawImage(colour, PAN.x * SS, PAN.y * SS);
  // the gilt bar between the pages: ink 3 | leaf-art 6 | ink 3, the frame's recipe, hand-ruled edges
  (function bar(x0, y0, x1, y1, seed) {
    const w = Art.wob(seed, 0.38 * U), step = 20 * U;
    function side(xa, xb, ya, yb) { pg.beginPath(); pg.moveTo(xa + w(), ya); for (let y = ya + step; y < yb; y += step) pg.lineTo(xa + w(), y); pg.lineTo(xa + w(), yb); pg.lineTo(xb + w(), yb); for (let y = yb - step; y > ya; y -= step) pg.lineTo(xb + w(), y); pg.lineTo(xb + w(), ya); pg.closePath(); }
    side(x0, x1, y0, y1); pg.fillStyle = TK.ink; pg.fill();
    side(x0 + 3 * U, x1 - 3 * U, y0, y1); pg.fillStyle = Art.leafBox(pg, 0, 0, page.width, page.height, true); pg.fill();
  })(PX0 * SS, F * SS, (PX0 + BAR) * SS, (H - F) * SS, 41);
  // orpiment studs where the bar meets the frame (the frame's corner stud: ink ring, bole crescent, pricked ring, quatrefoil heart)
  function stud(x, y) {
    const c = pg, disc = (r, col, dx, dy) => { c.beginPath(); c.arc(x + (dx || 0), y + (dy || 0), r, 0, TAU); c.fillStyle = col; c.fill(); };
    disc(12 * U, TK.ink); disc(9.2 * U, TK.bole);
    c.save(); c.beginPath(); c.arc(x, y, 9.2 * U, 0, TAU); c.clip(); disc(9.2 * U, TK.orp, 1.9 * U, 1.9 * U); c.restore();
    for (let q = 0; q < 8; q++) { c.beginPath(); c.arc(x + Math.cos(q * Math.PI / 4) * 6 * U, y + Math.sin(q * Math.PI / 4) * 6 * U, 0.85 * U, 0, TAU); c.fillStyle = TK.bole; c.fill(); }
    c.beginPath(); for (let k = 0; k < 4; k++) c.arc(x + 0.8 * U + Math.cos(k * Math.PI / 2) * 2.3 * U, y + 0.8 * U + Math.sin(k * Math.PI / 2) * 2.3 * U, 1.9 * U, 0, TAU);
    c.fillStyle = TK.mad; c.fill('nonzero'); c.lineWidth = 0.9 * U; c.strokeStyle = TK.ink; c.stroke();
  }
  // the game's battle frame (ink | leaf-art | ink = 12u, ivy sprigs, corner studs): whole on the lapis page; over the miniature only its bars and corner studs, so no sprig crosses the picture
  const ov = Art.overlay(page.width, page.height, U);
  if (ov) {
    const bw = 12 * U, cs = 24 * U, px0 = PX0 * SS;
    pg.save(); pg.beginPath(); pg.rect(0, 0, px0, page.height); pg.clip(); pg.drawImage(ov, 0, 0); pg.restore();
    pg.save(); pg.beginPath();
    pg.rect(px0, 0, page.width - px0, bw); pg.rect(px0, page.height - bw, page.width - px0, bw); pg.rect(page.width - bw, 0, bw, page.height);
    pg.rect(page.width - cs, 0, cs, cs); pg.rect(page.width - cs, page.height - cs, cs, cs);
    pg.clip(); pg.drawImage(ov, 0, 0); pg.restore();
  }
  stud((PX0 + BAR / 2) * SS, F * SS); stud((PX0 + BAR / 2) * SS, (H - F) * SS);
  lap('page');

  // ---------- 4. type: fonts, the versal, the title, the banderole, the seal ----------
  for (const f of A.fonts) { const ff = new FontFace(f.family, 'url(data:font/woff2;base64,' + f.b64 + ')', { weight: f.weight, unicodeRange: f.range }); document.fonts.add(ff); await ff.load(); }
  const CJK = '"FGHan","Noto Serif CJK SC","Source Han Serif SC","Songti SC","WenQuanYi Zen Hei",serif';   // the bible's CJK stack, led by the embedded Noto Serif SC subset (store/art/feature-cjk-subset.py)
  const fRub = S => '700 ' + S + 'px FGRub,FGHand,' + CJK, fTop = S => '400 ' + S + 'px FGTop,FGHand,' + CJK, fHand = S => '600 ' + S + 'px FGHand,' + CJK, fHan = (S, w) => (w || 900) + ' ' + S + 'px ' + CJK;
  const meas = document.createElement('canvas').getContext('2d');
  const tw = (font, t) => { meas.font = font; return meas.measureText(t).width; };
  const asc = (font, t) => { meas.font = font; return meas.measureText(t).actualBoundingBoxAscent; };
  const disc = (c, x, y, r, col) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); };

  // the emblem's gold-leaf C: <g id="initial"> of store/art/emblem.svg, rendered crisp at any height on a transparent ground
  const VB = A.emblem.viewBox.split(/\s+/).map(Number);
  async function svgImage(box, wPx, hPx) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + box.join(' ') + '" width="' + wPx + '" height="' + hPx + '">' + A.emblem.defs + '<g transform="' + A.emblem.wrap + '">' + A.emblem.initial + '</g></svg>';
    const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); await img.decode(); return img;
  }
  const emblemBox = await (async function () { // alpha bounding box of the initial inside the emblem's square
    const img = await svgImage(VB, VB[2], VB[3]), c = mk(VB[2], VB[3]), g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [VB[0] + x0 - 2, VB[1] + y0 - 2, x1 - x0 + 5, y1 - y0 + 5];
  })();
  async function emblemC(hPx) {
    const k = hPx / emblemBox[3], wPx = Math.round(emblemBox[2] * k), hh = Math.round(hPx), img = await svgImage(emblemBox, wPx, hh);
    const c = mk(wPx, hh); c.getContext('2d').drawImage(img, 0, 0, wPx, hh); return c;
  }
  // the whole app icon (the game's own www/icons/icon-512.png, rendered from the same master): the seal's face
  const iconImg = await (async function () { const im = new Image(); im.src = A.icon; await im.decode(); return im; })();
  // a hand-ruled quadrilateral (unequal corners, like the game's unequal radii): Path2D of the rectangle x, y, w, h
  function jq(x, y, w, h, j) { const p = new Path2D(), c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(q => [q[0] + j(), q[1] + j()]); p.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) p.lineTo(c[i][0], c[i][1]); p.closePath(); return p; }
  // text with the game's ink: hard ink drop shadow (.modal h1), --ink2 pass shifted .6u, --ink core outline, then the pigment; o.bold thickens a light face (Garamond fallback in Cyrillic) toward Texturina
  function inkText(c, t, x, y, font, fill, S, o) {
    o = o || {}; const bold = o.bold || 0, out = (o.out != null ? o.out : S * 0.075) * 2 + bold, sh = o.sh != null ? o.sh : Math.max(2.5, S * 0.055);
    c.save(); c.font = font; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.miterLimit = 2; c.lineCap = 'round';
    c.lineWidth = out; c.strokeStyle = TK.ink; c.fillStyle = TK.ink;
    c.strokeText(t, x, y + sh); c.fillText(t, x, y + sh);
    c.globalAlpha = 0.6; c.strokeStyle = TK.ink2; c.strokeText(t, x + 0.9, y + 0.9); c.globalAlpha = 1;
    c.strokeStyle = TK.ink; c.strokeText(t, x, y);
    c.fillStyle = fill; c.fillText(t, x, y);
    if (bold) { c.lineWidth = bold; c.strokeStyle = fill; c.strokeText(t, x, y); }
    c.restore();
  }
  // a gilded glyph (the emblem's recipe): ink contour, bole under, gold-leaf (leaf-art) laid up-left of it so the bole shows as a crescent on the lower right
  function gildGlyph(c, ch, cx, baseY, font, S) {
    const w = Math.ceil(S * 1.2), h = Math.ceil(S * 1.4), L = mk(w * SS, h * SS), g = L.getContext('2d'); g.scale(SS, SS);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.miterLimit = 2;
    const x = w / 2, y = h * 0.78, d = Math.max(2, S * 0.022), out = S * 0.055;
    g.lineWidth = out * 2; g.strokeStyle = TK.ink; g.globalAlpha = 0.6; g.strokeText(ch, x + 1, y + 1); g.globalAlpha = 1; g.strokeText(ch, x, y);
    g.fillStyle = TK.bole; g.fillText(ch, x, y);
    const G = mk(w * SS, h * SS), gg = G.getContext('2d'); gg.scale(SS, SS); gg.font = font; gg.textAlign = 'center'; gg.textBaseline = 'alphabetic';
    gg.fillStyle = Art.leafBox(gg, x - S * 0.5, y - S * 0.8, S, S, true); gg.fillText(ch, x - d, y - d);
    gg.globalCompositeOperation = 'destination-in'; gg.fillStyle = '#000'; gg.fillText(ch, x, y);
    g.drawImage(G, 0, 0, w, h);
    c.drawImage(L, cx - w / 2, baseY - h * 0.78, w, h);
  }
  // swallow-tail banderole (R.drawBanderole's shape: ink border, notched ends, a folded turn behind each end), hand-ruled corners
  function banderole(c, cx, cy, w, h, text, o) {
    const u = h / 32, n = Math.min(h * 0.4, 24 * u), x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, J = Art.wob(o.seed, 0.7), P = (a, b) => [a + J(), b + J()], sw = 5 * Math.min(u, 1.9);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = TK.ink; c.lineWidth = sw;
    const shape = pts => { c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); };
    const inked = fill => { c.save(); c.translate(0.7, 0.7); c.globalAlpha = 0.6; c.strokeStyle = TK.ink2; c.stroke(); c.restore(); c.stroke(); c.fillStyle = fill; c.fill(); };
    [[x0, -1], [x1, 1]].forEach(e => { const x = e[0], d = e[1]; shape([P(x - d * 3 * u, y0 + h * 0.5), P(x + d * 12 * u, y1 + 9 * u), P(x + d * 12 * u, y1 + 9 * u - h * 0.42), P(x - d * 3 * u, y0 + h * 0.2)]); inked(o.under); });
    shape([P(x0, y0), P(x1, y0), P(x1 - n, cy), P(x1, y1), P(x0, y1), P(x0 + n, cy)]); inked(o.fill);
    c.strokeStyle = o.rule; c.lineWidth = 1.5 * Math.min(u, 1.9); c.globalAlpha = 0.85; c.beginPath(); c.moveTo(x0 + n + 8 * u, y0 + 6.5 * u); c.lineTo(x1 - n - 8 * u, y0 + 6.5 * u); c.moveTo(x0 + n + 8 * u, y1 - 6.5 * u); c.lineTo(x1 - n - 8 * u, y1 - 6.5 * u); c.stroke(); c.globalAlpha = 1;
    c.font = o.font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = o.ink; c.fillText(text, cx, cy + h * 0.035);
    if (o.bold) { c.lineWidth = o.bold; c.strokeStyle = o.ink; c.strokeText(text, cx, cy + h * 0.035); }
    c.restore();
  }
  // the seal that hangs from the banderole (a lead bulla on two madder tags): the app icon in a ring of ink | gold leaf | ink, a hard shadow, the tags tied behind the banderole
  function sealBulla(c, cx, cy, R, topY, J) {
    const tag = (x0, x1) => { const p = [[x0 - 5, topY], [x0 + 5, topY], [x1 + 5, cy - R * 0.5], [x1 - 5, cy - R * 0.5]].map(q => [q[0] + J() * 0.4, q[1] + J() * 0.4]); c.beginPath(); p.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); c.fillStyle = '#621C14'; c.fill(); c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = TK.ink; c.stroke(); };
    c.save();
    tag(cx - 16, cx - 9); tag(cx + 14, cx + 8);
    disc(c, cx + 3, cy + 5, R + 7, TK.ink);                                                  // hard shadow
    disc(c, cx, cy, R + 7, TK.ink);
    c.beginPath(); c.arc(cx, cy, R + 5, 0, TAU); c.arc(cx, cy, R + 1.6, 0, TAU, true); c.fillStyle = Art.leafBox(c, cx - R - 6, cy - R - 6, 2 * R + 12, 2 * R + 12, true); c.fill('evenodd');
    disc(c, cx, cy, R + 1.6, TK.ink);
    c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip(); const k = 2 * R * 1.13; c.imageSmoothingQuality = 'high'; c.drawImage(iconImg, cx - k / 2, cy - k / 2, k, k); c.restore();
    c.restore();
  }

  // a title line; at the end of a Chinese line the full-width colon (U+FF1A) is set centred in its own em cell, so that it cannot be mistaken for an ASCII colon tucked against the last character
  const isZhColon = (ln, zh) => zh && /\uFF1A$/.test(ln);
  const lineW = (f, ln, zh, S) => isZhColon(ln, zh) ? tw(f, ln.slice(0, -1)) + S : tw(f, ln);
  function drawLine(c, ln, x, y, f, S, zh, o) {
    if (!isZhColon(ln, zh)) return inkText(c, ln, x, y, f, TK.ivo, S, o);
    const head = ln.slice(0, -1); inkText(c, head, x, y, f, TK.ivo, S, o);
    meas.font = f; const m = meas.measureText('\uFF1A'), gw = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;
    inkText(c, '\uFF1A', x + tw(f, head) + (S - gw) / 2 + m.actualBoundingBoxLeft, y, f, TK.ivo, S, o);
  }

  // the title: its first letter is the versal, the rest runs in 3 lines (2 in Chinese) beside it; the type scales until block and versal fit the zone (never clipped).
  // A versal that is not the emblem's C sits on a framed madder plate shrunk to PLATE of the block's height, so that its outer frame (FRM per side) starts at the key-content line
  const FRM = (2 * 2.2 + 4.2) * KP, PLATE = 0.92;
  function layout(loc) {
    const t = loc.title, zh = loc.key === 'zh';
    let initial, lines;
    if (zh) { const i = t.indexOf('：'); initial = t[0]; lines = [t.slice(1, i + 1), t.slice(i + 1)]; }
    else {
      const words = t.split(' '), m = []; words.forEach(wd => { if (m.length && wd.length <= 3 && !/[:：]$/.test(m[m.length - 1])) m[m.length - 1] += ' ' + wd; else m.push(wd); });
      initial = m[0][0]; m[0] = m[0].slice(1); lines = m;
    }
    const emblem = initial === 'C', n = lines.length, cyr = /[Ѐ-ӿ]/.test(t), GAP = 14;
    let S = zh ? 76 : 66, best = null;
    for (; S >= 30 && !best; S -= 0.5) {
      const f = zh ? fHan(S) : fRub(S), cap = zh ? S * 0.84 : asc(fRub(S), 'H'), LH = S * (zh ? 1.12 : 1.04), iH = (n - 1) * LH + cap;
      const ph = emblem ? 0 : iH * PLATE, pw = ph * 0.86, iW = emblem ? iH * emblemBox[2] / emblemBox[3] : pw + 2 * FRM;
      const lw = Math.max.apply(null, lines.map(l => lineW(f, l, zh, S)));
      if (iW + GAP + lw <= A.titleW) best = { S, f, cap, LH, iH, iW, ph, pw, lw };
    }
    if (!best) throw new Error('title "' + t + '" does not fit the zone even at 30 px');
    return Object.assign({ initial, lines, emblem, zh, bold: cyr ? best.S * 0.035 : 0 }, best);
  }

  async function typeset(loc) {
    const L = layout(loc), cv = mk(page.width, page.height), c = cv.getContext('2d'), J = Art.wob(loc.key.charCodeAt(0) * 31 + 7, 0.8);
    c.drawImage(page, 0, 0); c.save(); c.scale(SS, SS);
    const bandH = A.bandH, total = L.iH + A.bandGap + bandH, yT = A.titleCY - total / 2, X0 = A.titleX;
    if (L.emblem) { // the emblem's own gold-leaf C, with a hard ink shadow under the leaf
      const cc = await emblemC(L.iH * SS), sil = mk(cc.width, cc.height), sg = sil.getContext('2d');
      sg.drawImage(cc, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = TK.ink; sg.fillRect(0, 0, sil.width, sil.height);
      c.globalAlpha = 0.85; c.drawImage(sil, X0 + 3, yT + 4, cc.width / SS, cc.height / SS); c.globalAlpha = 1;
      c.drawImage(cc, X0, yT, cc.width / SS, cc.height / SS);
    } else { // the true initial, gilded in the emblem's recipe on a madder quatrefoil field in an ink | leaf | ink frame (leaf never a hairline: 4.2u), hand-ruled corners
      const pw = L.pw, ph = L.ph, px = X0 + FRM, py = yT + (L.iH - ph) / 2, a = 2.2 * KP, g = 4.2 * KP;
      c.fillStyle = TK.ink; c.fill(jq(px - a - g - a, py - a - g - a, pw + 2 * (a + g + a), ph + 2 * (a + g + a), J));
      c.fillStyle = Art.leafBox(c, px, py, pw, ph, true); c.fill(jq(px - a - g, py - a - g, pw + 2 * (a + g), ph + 2 * (a + g), J));
      c.fillStyle = TK.ink; c.fill(jq(px - a, py - a, pw + 2 * a, ph + 2 * a, J));
      c.save(); c.clip(jq(px, py, pw, ph, J));
      c.fillStyle = TK.mad; c.fillRect(px, py, pw, ph);
      const qp = Art.pattern(c, 'quat', KP * 1.1); if (qp) { c.translate(px, py); c.fillStyle = qp; c.fillRect(0, 0, pw, ph); }
      c.restore();
      const gs = ph * (L.zh ? 0.78 : 0.92), gf = L.zh ? fHan(gs) : fTop(gs), gby = py + ph * 0.5 + asc(gf, L.initial) / 2 + ph * 0.02;
      gildGlyph(c, L.initial, px + pw / 2, gby, gf, gs);
    }
    const tx = X0 + L.iW + 14, base1 = yT + L.cap;                                            // title lines: ivory on the diaper, ink-outlined
    L.lines.forEach((ln, i) => drawLine(c, ln, tx, base1 + i * L.LH, L.f, L.S, L.zh, { bold: L.bold }));
    // the banderole under the block; it runs across the gilt bar onto the folio, tying the two pages together. Its type is as big as the zone allows (>= tagMin px), the
    // banderole grows to carry it; the left tail tip (and its ink) stays on the key-content line
    const fold = bandH / 32 * 12, nn = bandH * 0.4, pad = 16, blockW = Math.min(L.iW + 14 + L.lw, A.titleW), bx0 = X0 + fold + 8, cyc = yT + L.iH + A.bandGap + bandH / 2;
    const tagFont = q => L.zh ? fHan(q, 700) : fHand(q), tag = loc.tag, need = q => tw(tagFont(q), tag) + 2 * nn + 2 * pad, bwMax = A.bandMax - 2 * fold - 8;
    let ts = A.tagPx; while (need(ts) > bwMax && ts > 14) ts -= 0.5;
    const bw = Math.min(bwMax, Math.max(blockW - 2 * fold + A.bandOver, need(ts)));
    const faceR = bx0 + bw, sR = A.sealR, sx = faceR - 62, sy = cyc + bandH / 2 + sR + 10;
    const banderoleY = cyc;
    banderole(c, bx0 + bw / 2, banderoleY, bw, bandH, tag, { fill: TK.mad, under: '#621C14', ink: TK.ivo, rule: TK.ivo, font: tagFont(ts), seed: loc.key.charCodeAt(1) * 17 + 3, bold: L.zh ? ts * 0.02 : 0 });
    sealBulla(c, sx, sy, sR, banderoleY + bandH / 2 - 10, J);
    c.restore();
    const o = mk(W, H), og = o.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(cv, 0, 0, W, H);
    o.info = { S: Math.round(L.S * 10) / 10, tag: tag, tagPx: Math.round(ts * 10) / 10, left: X0, right: Math.round(X0 + L.iW + 14 + L.lw), bandL: Math.round(X0 + 8 - 2), bandR: Math.round(faceR + 12 * bandH / 32 + 6), initial: L.initial,
      seal: [Math.round(sx), Math.round(sy), sR], bottom: Math.round(sy + sR + 8) };
    return o;
  }

  // ---------- 5. outputs ----------
  const result = { timing, scene: null, locales: {}, layers: layers, contact: null };
  const sceneOut = mk(W, H), so = sceneOut.getContext('2d'); so.imageSmoothingQuality = 'high'; so.drawImage(page, 0, 0, W, H);
  result.scene = sceneOut.toDataURL('image/png');
  const done = [];
  for (const loc of A.locales) { const cv = await typeset(loc); done.push(cv); result.locales[loc.key] = { jpg: cv.toDataURL('image/jpeg', 0.92), png: A.layers ? cv.toDataURL('image/png') : null, info: cv.info }; }
  if (A.contact) { // regression sheet: every locale at half size, then at the ~360 px store thumbnail
    const k = 0.5, cw = W * k, ch = H * k, gap = 10, tw2 = 360, th2 = Math.round(360 * H / W), cols = 2, rows = Math.ceil(done.length / cols);
    const sh = mk(Math.max(cols * cw + (cols + 1) * gap, 3 * tw2 + 4 * gap), rows * (ch + gap) + gap + Math.ceil(done.length / 3) * (th2 + gap)), g = sh.getContext('2d');
    g.fillStyle = TK.ink; g.fillRect(0, 0, sh.width, sh.height); g.imageSmoothingQuality = 'high';
    done.forEach((d, i) => g.drawImage(d, gap + (i % cols) * (cw + gap), gap + Math.floor(i / cols) * (ch + gap), cw, ch));
    const y0 = rows * (ch + gap) + gap; done.forEach((d, i) => g.drawImage(d, gap + (i % 3) * (tw2 + gap), y0 + Math.floor(i / 3) * (th2 + gap), tw2, th2));
    result.contact = sh.toDataURL('image/jpeg', 0.82);
  }
  lap('type');
  return result;
}

/* ================================================================================================================================
 * NODE SIDE
 * ============================================================================================================================== */
async function run(args) {
  const want = pickLocales(args || []), t0 = Date.now();
  const browser = await chromium.launch();
  const wd = setTimeout(() => { console.error('feature: watchdog (4 min), closing the browser'); browser.close().finally(() => process.exit(3)); }, 240000);
  try {
    const ctx = await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1, locale: 'en-US' });
    await ctx.addInitScript(() => { window.requestAnimationFrame = () => 0; });   // the home demo battle stays frozen: no CPU, no state drift while we bake
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('game page error:', e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('game page console:', m.text()); });
    await page.goto(GAME_URL);
    try { await page.waitForFunction(() => globalThis.Z && Z.ready && Z.Art && Z.Art.ready, null, { timeout: 30000, polling: 100 }); }   // polling: rAF is stubbed
    catch (e) { throw new Error('the game page (www/index.html) did not finish booting (Z.ready / Z.Art.ready): see the page errors above'); }
    if (want.indexOf('zh') >= 0) checkHan(LOCALES.zh);
    const res = await page.evaluate(inPage, Object.assign({ fonts: fontFaces(), icon: 'data:image/png;base64,' + fs.readFileSync(path.join(WWW, 'icons', 'icon-512.png')).toString('base64'), emblem: emblemInitial(), layers: !!OUT, contact: !!OUT || want.length === SHORT.length, locales: want.map(k => Object.assign({ key: k }, LOCALES[k])) }, PARAMS));
    const b64 = u => Buffer.from(u.split(',')[1], 'base64');
    if (OUT) fs.mkdirSync(OUT, { recursive: true });
    want.forEach(k => {
      const L = LOCALES[k], r = res.locales[k], jpg = b64(r.jpg), I = r.info, right = Math.max(I.right, I.bandR), sz = jpegSize(jpg);
      if (!sz || sz.w !== 1024 || sz.h !== 500) throw new Error(k + ': the export is ' + (sz ? sz.w + 'x' + sz.h : 'not a JPEG') + ', Google Play needs 1024x500');
      (OUT ? [null] : [L.dir].concat(L.copies || [])).forEach(dir => {
        const file = OUT ? path.join(OUT, k + '.jpg') : path.join(META, dir, 'images', 'featureGraphic.jpg');
        fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, jpg);
        console.log(path.relative(OUT ? process.cwd() : ROOT, file) + '  ' + (jpg.length / 1024).toFixed(0) + ' KB');
      });
      if (OUT && r.png) fs.writeFileSync(path.join(OUT, k + '.png'), b64(r.png));
      console.log('   ' + k + ': title ' + I.S + ' px (versal ' + I.initial + '), tagline "' + I.tag + '" ' + I.tagPx + ' px, type block x ' + I.bandL + '-' + right + ', seal ' + I.seal.join(',') +
        (I.S < 44 ? '   WARNING: title is small' : '') + (I.tagPx < PARAMS.tagMin ? '   WARNING: tagline under ' + PARAMS.tagMin + ' px' : '') + (I.bandL < 130 || right > 900 ? '   WARNING: outside the 130-900 safe zone' : '') + (I.bottom > 478 ? '   WARNING: the seal touches the frame' : ''));
    });
    fs.writeFileSync(path.join(OUT || ART, OUT ? 'scene-dev.png' : 'feature-scene.png'), b64(res.scene));
    if (OUT) Object.keys(res.layers).forEach(k => fs.writeFileSync(path.join(OUT, 'layer-' + k + '.png'), b64(res.layers[k])));
    if (res.contact) fs.writeFileSync(path.join(OUT || ART, OUT ? 'contact-dev.jpg' : 'feature-contact.jpg'), b64(res.contact));
    console.log('timing (ms, cumulative) ' + JSON.stringify(res.timing));
  } finally { clearTimeout(wd); await browser.close(); }
  console.log('done in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}

module.exports = { run, LOCALES };
if (require.main === module) run(process.argv.slice(2)).catch(e => { console.error(e && e.message ? 'feature: ' + e.message : e); process.exit(1); });
