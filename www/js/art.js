// Castle Siege: History - Z.Art: hand-made illuminated-manuscript textures, drawn once with code (no image assets).
// Spec: docs/ART_DIRECTION.md sections 2, 3 and 7 ("The Unfinished Folio"). u = logical px of the 720-wide stage.
// Every tile is baked at 2 image px per u (Z.Art.S), exported with toDataURL into CSS custom properties by Z.Art.bake(), and can also be
// reused on canvas through Z.Art.tile(name) / Z.Art.pattern(ctx, name). Safe to load in Node (no DOM): everything that needs a canvas
// returns null / '' there and bake() just calls its callback.
//
// CSS: set background-size to the natural size in u (Z.Art.SIZE[name]), never a generic 144px, or the small tiles are upscaled and blur.
//   background: var(--dp-lapis) 0 0/144px, var(--diap);       --dp-lapis, --dp0..--dp6: 144u   --dp-quat: 56u   --dp-vine: 40u   --dp-gold: 24u
//   background: var(--grain) 0 0/96px, var(--vel);            --grain: 96u (192px bitmap), transparent, layered over --vel
//   background: var(--ivy) left center/72px 36px repeat-x;    --ivy: 72u x 36u, repeats horizontally
//   background: var(--chequy-enemy) 0 0/24px;                 --chequy-enemy / --chequy-host: 24u
//   border: 22px solid transparent; border-image: var(--frame) 44/22px round;           --frame: 88u x 88u, slice 44 image px = 22u
// Canvas: Z.Art.tile('r0') + Z.Art.pattern(ctx, 'r0', pxPerU); Z.Art.overlay(canvas.width, canvas.height, R.px) is the battle frame (one
// drawImage per frame); Z.Art.frame('modal') is {canvas, slice: 44, width: 22}. Z.Art.bake(cb) runs at boot (boot set first, rest idle).
(function (Z) {
  'use strict';
  var Art = Z.Art = Z.Art || {};
  var TAU = Math.PI * 2, S = 2, DEG = Math.PI / 180;

  // ---- palette (bible section 2) -----------------------------------------------------------------------------
  var TOK = {
    ink: '#1E1610', ink2: '#4B3B2A', night: '#0F1838', lapis: '#22409A', lapisd: '#14275F', diap: '#1B2F78', azur: '#4474C0',
    verm: '#D8391F', mad: '#9A2018', mal: '#1F6B4E', vdg: '#3FA58C', orp: '#E9B62A', leaf: '#D4A02F', bole: '#8C3520', pur: '#5B2E7A',
    vel: '#D8D0AB', vel2: '#C6B684', ivo: '#F4ECD3', arg: '#CDD2DB', bis: '#7A5230', flesh: '#E7B99C'
  };
  // lattice / highlight shades named by bible section 3 (kept out of TOK, which is exactly the section 2 list)
  var AUX = { diapHi: '#2F52B0', madHi: '#B8382A', malHi: '#2E8764', leafDk: '#8A5A10', leafHi: '#FBE9A0' };
  // burnished gold: --leaf-g (chips, text-safe) and --leaf-art (art only, never under text); both are 112deg in CSS
  var LEAF_STOPS = [[0, '#C99A2E'], [0.30, '#F3D879'], [0.42, '#FBE9A0'], [0.62, '#D4A02F'], [1, '#E9C25A']];
  var LEAF_ART_STOPS = [[0, '#8A5A10'], [0.18, '#D8A530'], [0.34, '#FBE9A0'], [0.50, '#D4A02F'], [0.66, '#A06E18'], [0.82, '#E9C25A'], [1, '#8A5A10']];
  // the seven mid-light realm grounds: ground / lattice (bible section 3); the 46u blazon is added by the map, not baked here
  var REALM = [['#8DAA6B', '#7C9A5B'], ['#D2B070', '#C29E5C'], ['#A9BBD0', '#95AAC4'], ['#8CBBAA', '#79A898'],
    ['#A8B07A', '#979F69'], ['#A99AB5', '#9888A6'], ['#8E9CBF', '#7D8CB0']];

  Art.TOK = TOK; Art.AUX = AUX; Art.LEAF_STOPS = LEAF_STOPS; Art.LEAF_ART_STOPS = LEAF_ART_STOPS; Art.REALM = REALM;
  Art.S = S; Art.ready = false; Art.bootReady = false;
  Art.stats = { bootMs: 0, restMs: 0, totalMs: 0, slices: 0, tiles: {} };

  var now = (typeof performance !== 'undefined' && performance.now) ? function () { return performance.now(); } : function () { return Date.now(); };
  function hasDom() { return typeof document !== 'undefined' && !!document && typeof document.createElement === 'function'; }

  // ---- seeded randomness and hand-made wobble -----------------------------------------------------------------
  function seedOf(s) {
    if (typeof s === 'number') return s | 0;
    s = String(s); var h = 2166136261 | 0, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h | 0;
  }
  // rng(seed) -> function returning a deterministic number in [0,1) (mulberry32)
  function rng(seed) {
    var a = seedOf(seed == null ? 1 : seed) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // wob(seed, amp) -> function returning the next offset in [-amp, amp] (bell shaped, default amp 0.7u); .pt(x, y) wobbles a point
  function wob(seed, amp) {
    var r = rng(seed == null ? 1 : seed), A = amp == null ? 0.7 : amp;
    var f = function () { return (r() + r() - 1) * A; };
    f.amp = A;
    f.pt = function (x, y) { return [x + f(), y + f()]; };
    return f;
  }

  // ---- gold ---------------------------------------------------------------------------------------------------
  function leafGrad(c, x0, y0, x1, y1, art) {
    var g = c.createLinearGradient(x0, y0, x1, y1), st = art ? LEAF_ART_STOPS : LEAF_STOPS, i;
    for (i = 0; i < st.length; i++) g.addColorStop(st[i][0], st[i][1]);
    return g;
  }
  // same gradient with the exact CSS 112deg geometry for the box (x, y, w, h)
  function leafBox(c, x, y, w, h, art) {
    var a = 112 * DEG, dx = Math.sin(a), dy = -Math.cos(a), L = Math.abs(w * dx) + Math.abs(h * dy), cx = x + w / 2, cy = y + h / 2;
    return leafGrad(c, cx - dx * L / 2, cy - dy * L / 2, cx + dx * L / 2, cy + dy * L / 2, art);
  }

  // ---- two-pass iron-gall ink contour ---------------------------------------------------------------------------
  // ink(ctx, drawPathFn, width, opts): drawPathFn(p) only builds a path (moveTo/lineTo/arc/bezierCurveTo/closePath ...) on p, which is a
  // Path2D (or the context itself without Path2D). It runs once, so random wobble inside it is identical in both passes.
  // Pass 1 = the path shifted by 0.6u in --ink2 at alpha .6, pass 2 = the core in --ink. opts: fill, u (device units per u, default 1),
  // off, a2, ink, ink2, cap, join, dash.
  function ink(c, draw, width, opts) {
    opts = opts || {};
    var u = opts.u || 1, off = (opts.off == null ? 0.6 : opts.off) * u, w = width == null ? 2.6 * u : width;
    var path = null, ga = c.globalAlpha;
    if (typeof Path2D !== 'undefined') { path = new Path2D(); draw(path); }
    function build() { if (path) return; c.beginPath(); draw(c); }
    c.save();
    c.lineJoin = opts.join || 'round'; c.lineCap = opts.cap || 'round';
    if (opts.dash && c.setLineDash) c.setLineDash(opts.dash);
    if (opts.fill) { build(); c.fillStyle = opts.fill; if (path) c.fill(path); else c.fill(); }
    c.save(); c.translate(off, off); c.globalAlpha = ga * (opts.a2 == null ? 0.6 : opts.a2); c.strokeStyle = opts.ink2 || TOK.ink2; c.lineWidth = w;
    build(); if (path) c.stroke(path); else c.stroke(); c.restore();
    c.strokeStyle = opts.ink || TOK.ink; c.lineWidth = w;
    build(); if (path) c.stroke(path); else c.stroke();
    c.restore();
  }

  // ---- canvas helpers -----------------------------------------------------------------------------------------
  function mk(wu, hu, k) { // canvas of wu x hu logical units at k image px per u (default S), context scaled so that you draw in u
    k = k || S;
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(wu * k)); cv.height = Math.max(1, Math.round(hu * k));
    var c = cv.getContext('2d');
    c.scale(cv.width / wu, cv.height / hu);
    return { cv: cv, c: c };
  }
  function disc(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }
  function circ(c, x, y, r, w, col) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.lineWidth = w; c.strokeStyle = col; c.stroke(); }
  function tf(x, y, a, sx, sy) { // local -> world: scale, rotate by a, translate
    var cs = Math.cos(a), sn = Math.sin(a); sy = sy == null ? sx : sy;
    return function (lx, ly) { var X = lx * sx, Y = ly * sy; return [x + X * cs - Y * sn, y + X * sn + Y * cs]; };
  }
  function lozPts(cx, cy, hw, hh, rot, J) { // lozenge vertices (top, right, bottom, left), each jittered by J
    var v = [[0, -hh], [hw, 0], [0, hh], [-hw, 0]], cs = Math.cos(rot), sn = Math.sin(rot), out = [], i, x, y;
    for (i = 0; i < 4; i++) { x = v[i][0] + (J ? J() : 0); y = v[i][1] + (J ? J() : 0); out.push([cx + x * cs - y * sn, cy + x * sn + y * cs]); }
    return out;
  }
  // hand-ruled pen stroke from a to b, slightly bowed: penGeom() samples the centre line once (start, middle, end + unit tangents), penAdd()
  // adds a closed tapered polygon (width w0 -> w1, round-ish ends, shifted by ox, oy) as a sub-path. Every stroke has the same winding, so many
  // of them can share one path and one fill (non-zero rule = union) and one geometry serves every pass and every wrap copy.
  function penGeom(a, b, bow) {
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1, qx = (a[0] + b[0]) / 2 - dy / len * bow, qy = (a[1] + b[1]) / 2 + dx / len * bow;
    var d0x = qx - a[0], d0y = qy - a[1], d1x = b[0] - qx, d1y = b[1] - qy, l0 = Math.sqrt(d0x * d0x + d0y * d0y) || 1, l1 = Math.sqrt(d1x * d1x + d1y * d1y) || 1;
    return [a[0], a[1], d0x / l0, d0y / l0, 0.25 * a[0] + 0.5 * qx + 0.25 * b[0], 0.25 * a[1] + 0.5 * qy + 0.25 * b[1], dx / len, dy / len, b[0], b[1], d1x / l1, d1y / l1];
  }
  function penAdd(c, g, w0, w1, ox, oy) {
    var h0 = w0 / 2, h1 = w1 / 2, hm = (h0 + h1) / 2, ax = g[0] + ox, ay = g[1] + oy, bx = g[8] + ox, by = g[9] + oy, S2 = 0.7071;
    var t0x = g[2], t0y = g[3], tmx = g[6], tmy = g[7], t1x = g[10], t1y = g[11];
    c.moveTo(ax - t0y * h0, ay + t0x * h0);
    c.lineTo(g[4] + ox - tmy * hm, g[5] + oy + tmx * hm);
    c.lineTo(bx - t1y * h1, by + t1x * h1);
    c.lineTo(bx + h1 * S2 * (t1x - t1y), by + h1 * S2 * (t1x + t1y)); // end cap around b
    c.lineTo(bx + h1 * S2 * (t1x + t1y), by + h1 * S2 * (t1y - t1x));
    c.lineTo(bx + t1y * h1, by - t1x * h1);
    c.lineTo(g[4] + ox + tmy * hm, g[5] + oy - tmx * hm);
    c.lineTo(ax + t0y * h0, ay - t0x * h0);
    c.lineTo(ax - h0 * S2 * (t0x - t0y), ay - h0 * S2 * (t0x + t0y)); // start cap around a
    c.lineTo(ax - h0 * S2 * (t0x + t0y), ay + h0 * S2 * (t0x - t0y));
    c.closePath();
  }
  function pen(c, a, b, w0, w1, bow, col) { c.beginPath(); penAdd(c, penGeom(a, b, bow), w0, w1, 0, 0); c.fillStyle = col; c.fill(); }
  // draw copies of a motif so that it wraps seamlessly: fn(dx, dy) for every periodic offset whose bbox touches the tile
  function wrap(W, H, x, y, rx, ry, fn) {
    for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) {
      var dx = a * W, dy = b * H;
      if (x + dx + rx < 0 || x + dx - rx > W || y + dy + ry < 0 || y + dy - ry > H) continue;
      fn(dx, dy);
    }
  }
  // quatrefoil outline: four circular lobes (radius r) around (cx,cy) at distance d, rotated by rot; needs r/d > 0.71
  function quatPath(p, cx, cy, d, r, rot) {
    var t = (d + Math.sqrt(Math.max(0, 2 * r * r - d * d))) / 2, a1 = Math.atan2(-t, t - d), a2 = Math.atan2(t, t - d), k, th;
    rot = rot || 0;
    for (k = 0; k < 4; k++) { th = rot + k * Math.PI / 2; p.arc(cx + d * Math.cos(th), cy + d * Math.sin(th), r, a1 + th, a2 + th, false); }
    p.closePath();
  }

  // ---- ivy: 3-lobe leaf and berry (shared by --ivy, the modal frame buds, the vine tile and the battle-frame sprigs) -----------
  var LF = { // upper half of the leaf in unit space (length 1, half width 1): heart-shaped base, two pointed side lobes, long central lobe
    n: [[0.08, 0], [-0.03, 0.30], [0.34, 0.97], [0.55, 0.30], [1, 0]],
    c: [[[0.06, 0.10], [-0.02, 0.18]], [[-0.05, 0.56], [0.12, 0.92]], [[0.45, 0.80], [0.50, 0.50]], [[0.66, 0.46], [0.88, 0.32]]]
  };
  function leafPath(p, T, half) {
    var n = LF.n, c = LF.c, i, a, b, e;
    a = T(n[0][0], n[0][1]); p.moveTo(a[0], a[1]);
    for (i = 0; i < c.length; i++) {
      a = T(c[i][0][0], c[i][0][1]); b = T(c[i][1][0], c[i][1][1]); e = T(n[i + 1][0], n[i + 1][1]);
      p.bezierCurveTo(a[0], a[1], b[0], b[1], e[0], e[1]);
    }
    if (!half) {
      for (i = c.length - 1; i >= 0; i--) {
        a = T(c[i][1][0], -c[i][1][1]); b = T(c[i][0][0], -c[i][0][1]); e = T(n[i][0], -n[i][1]);
        p.bezierCurveTo(a[0], a[1], b[0], b[1], e[0], e[1]);
      }
    }
    p.closePath();
  }
  // malachite leaf at (x,y) pointing along angle a: base --mal, lit half --vdg (light from the upper left), ink veins, two-pass contour
  function drawLeaf(c, x, y, a, L, Wh, o) {
    o = o || {};
    var s = (Math.sin(a) - Math.cos(a)) >= 0 ? 1 : -1, T = tf(x, y, a, L, Wh * s), lw = o.lw || Math.max(1, Math.min(1.5, L / 10)), v, w;
    c.beginPath(); leafPath(c, T, false); c.fillStyle = o.base || TOK.mal; c.fill();
    c.beginPath(); leafPath(c, T, true); c.fillStyle = o.lit || TOK.vdg; c.fill();
    c.strokeStyle = TOK.ink; c.lineCap = 'round'; c.lineWidth = Math.max(0.7, lw * 0.6);
    c.beginPath(); v = T(0.1, 0); c.moveTo(v[0], v[1]); v = T(0.88, 0); c.lineTo(v[0], v[1]);
    if (L >= 12.5) {
      v = T(0.14, 0.02); c.moveTo(v[0], v[1]); w = T(0.34, 0.7); c.lineTo(w[0], w[1]);
      v = T(0.14, -0.02); c.moveTo(v[0], v[1]); w = T(0.34, -0.7); c.lineTo(w[0], w[1]);
    }
    c.stroke();
    ink(c, function (p) { leafPath(p, T, false); }, lw, o.inkOpts);
  }
  // gilt berry: ink contour, --orp face, --bole misregistration crescent on the upper left (the gilt ladder rung)
  function berry(c, x, y, r) {
    var rim = Math.max(0.55, r * 0.3), fr = r - rim * 0.5;
    disc(c, x, y, r + rim * 0.5, TOK.ink);
    disc(c, x, y, fr, TOK.bole);
    c.save(); c.beginPath(); c.arc(x, y, fr, 0, TAU); c.clip(); disc(c, x + fr * 0.28, y + fr * 0.28, fr, TOK.orp); c.restore();
  }

  // ---- diaper: 3x3 super-tile of 48u lozenges (bible section 3) --------------------------------------------------
  // Z.Art.diaper(ground, lattice, dot, seed, opts) -> canvas 144u x 144u. Motifs jittered +-0.8u, one in nine rotated +-1.5 degrees, the centre
  // lozenge counterchanged to --mad at .55. Lines are tapered, bowed pen strokes with a two-pass ink edge; every lozenge gets its own flat
  // pigment tone. Each pass (tones, ink edge, lattice, inner lozenges, dots) is one path and one fill, so it is cheap to bake.
  // opts: edgeA (ink edge alpha, 0 = none), edgeW, lw, counter, counterA, tone, node (pearl colour on the nodes), tick (catch-light on the dots),
  // dotRing (false = flat dot without the ink ring).
  function diaper(ground, lattice, dot, seed, o) { try { return diaperDraw(ground, lattice, dot, seed, o); } catch (e) { return null; } } // null: no DOM / 2d context
  function diaperDraw(ground, lattice, dot, seed, o) {
    if (!hasDom()) return null;
    o = o || {}; seed = seedOf(seed || 0);
    var W = 144, N = 3, CELL = 48, m = mk(W, W), c = m.c;
    var R = rng(seed * 7919 + 17), JM = wob(seed * 131 + 5, 0.8), JV = wob(seed * 71 + 9, 0.42), JS = wob(seed * 31 + 7, 0.5);
    var edgeA = o.edgeA == null ? 0.62 : o.edgeA, edgeW = o.edgeW == null ? 1.7 : o.edgeW, lw = o.lw || 2.5, tone = o.tone == null ? 0.04 : o.tone;
    var counter = o.counter === undefined ? TOK.mad : o.counter, counterA = o.counterA == null ? 0.55 : o.counterA;
    var rotIdx = Math.floor(R() * 8), cells = [], secs = [], inst = [], sinst = [], i, j, k, e, lvl, q, any;
    if (rotIdx >= 4) rotIdx++; // one of the eight outer lozenges is rotated, never the counterchanged centre
    c.fillStyle = ground; c.fillRect(0, 0, W, W);
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      k = j * N + i;
      var rot = k === rotIdx ? (R() < 0.5 ? -1 : 1) * (1 + 0.5 * R()) * DEG : 0, cx = CELL * i + CELL / 2 + JM(), cy = CELL * j + CELL / 2 + JM(), sx = CELL * i + JS(), sy = CELL * j + JS();
      q = { k: k, cx: cx, cy: cy, outer: lozPts(cx, cy, 24, 24, rot, JV), inner: lozPts(cx + JS() * 0.6, cy + JS() * 0.6, 11.4 + JS() * 0.4, 11.4 + JS() * 0.4, rot, JV),
        e: [], ie: [], lvl: Math.round(R() * 6) - 3, dx: JS() * 0.7, dy: JS() * 0.7, rx: 2.6 + JS() * 0.35, ry: 2.6 + JS() * 0.35, rot: R() * Math.PI };
      for (e = 0; e < 4; e++) {
        var w = lw * (0.9 + 0.22 * R()), bow = (R() - 0.5) * 1.1, ibow = (R() - 0.5) * 0.6;
        q.e.push({ w0: w * (0.92 + 0.16 * R()), w1: w * (0.92 + 0.16 * R()), geo: penGeom(q.outer[e], q.outer[(e + 1) % 4], bow), g: R() < 0.35 ? 1 : 0 });
        q.ie.push({ w: 1.45 * (0.9 + 0.2 * R()), geo: penGeom(q.inner[e], q.inner[(e + 1) % 4], ibow) });
      }
      cells.push(q);
      secs.push({ cx: sx, cy: sy, outer: lozPts(sx, sy, 23, 23, 0, JV), lvl: Math.round(R() * 6) - 3 });
    }
    cells.forEach(function (q) { wrap(W, W, q.cx, q.cy, 27, 27, function (dx, dy) { inst.push([q, dx, dy]); }); });
    secs.forEach(function (s) { wrap(W, W, s.cx, s.cy, 26, 26, function (dx, dy) { sinst.push([s, dx, dy]); }); });
    function polySub(pts, ox, oy) { for (var n = 0; n < 4; n++) { if (n) c.lineTo(pts[n][0] + ox, pts[n][1] + oy); else c.moveTo(pts[n][0] + ox, pts[n][1] + oy); } c.closePath(); }
    function penPass(ox, oy, wx, grp) {
      c.beginPath();
      inst.forEach(function (it) {
        var q = it[0];
        for (var n = 0; n < 4; n++) { if (grp != null && q.e[n].g !== grp) continue; penAdd(c, q.e[n].geo, q.e[n].w0 + wx, q.e[n].w1 + wx, it[1] + ox, it[2] + oy); }
      });
    }
    // flat pigment tone per lozenge (primary and secondary): one fill per tone class
    for (lvl = -3; lvl <= 3; lvl++) {
      if (!lvl) continue;
      c.beginPath(); any = false;
      inst.forEach(function (it) { if (it[0].lvl === lvl) { polySub(it[0].outer, it[1], it[2]); any = true; } });
      sinst.forEach(function (it) { if (it[0].lvl === lvl) { polySub(it[0].outer, it[1], it[2]); any = true; } });
      if (any) { c.fillStyle = lvl > 0 ? 'rgba(255,255,255,' + (lvl / 3 * tone).toFixed(3) + ')' : 'rgba(0,0,0,' + (-lvl / 3 * tone).toFixed(3) + ')'; c.fill(); }
    }
    if (counter) { c.beginPath(); polySub(cells[4].outer, 0, 0); c.globalAlpha = counterA; c.fillStyle = counter; c.fill(); c.globalAlpha = 1; }
    if (edgeA > 0) { // two-pass ink edge under the lattice: --ink2 shifted 0.6u, then the --ink core
      penPass(0.6, 0.6, edgeW); c.fillStyle = 'rgba(75,59,42,' + (edgeA * 0.9).toFixed(3) + ')'; c.fill();
      penPass(0, 0, edgeW); c.fillStyle = 'rgba(30,22,16,' + edgeA.toFixed(3) + ')'; c.fill();
    }
    penPass(0, 0, 0, 0); c.fillStyle = lattice; c.fill();
    penPass(0, 0, 0, 1); c.globalAlpha = 0.84; c.fill(); c.globalAlpha = 1;
    c.beginPath(); // the inner lozenges, thin pen
    inst.forEach(function (it) { var q = it[0]; for (var n = 0; n < 4; n++) penAdd(c, q.ie[n].geo, q.ie[n].w, q.ie[n].w * 0.9, it[1], it[2]); });
    c.globalAlpha = 0.9; c.fillStyle = lattice; c.fill(); c.globalAlpha = 1;
    function dots(pick, r) { c.beginPath(); inst.forEach(function (it) { var p = pick(it[0]); c.moveTo(p[0] + it[1] + r, p[1] + it[2]); c.arc(p[0] + it[1], p[1] + it[2], r, 0, TAU); }); }
    if (o.node) { dots(function (q) { return q.outer[1]; }, 1.25); c.fillStyle = o.node; c.fill(); dots(function (q) { return q.outer[2]; }, 1.25); c.fill(); }
    c.beginPath(); // secondary lozenges: a small pricked dot, jittered
    sinst.forEach(function (it) { c.moveTo(it[0].cx + it[1] + 1.5, it[0].cy + it[2]); c.arc(it[0].cx + it[1], it[0].cy + it[2], 1.5, 0, TAU); });
    c.fillStyle = lattice; c.fill();
    // the orpiment dot: slightly oval, off-centre, ink ringed (two-pass) when the diaper has ink edges
    c.beginPath();
    inst.forEach(function (it) {
      var q = it[0], x = q.cx + q.dx + it[1], y = q.cy + q.dy + it[2];
      c.moveTo(x + q.rx * Math.cos(q.rot), y + q.rx * Math.sin(q.rot)); c.ellipse(x, y, q.rx, q.ry, q.rot, 0, TAU);
    });
    c.fillStyle = dot; c.fill();
    if (edgeA > 0 && o.dotRing !== false) {
      c.save(); c.translate(0.6, 0.6); c.globalAlpha = 0.5; c.strokeStyle = TOK.ink2; c.lineWidth = 0.85; c.stroke(); c.restore();
      c.strokeStyle = TOK.ink; c.lineWidth = 0.85; c.stroke();
    }
    if (o.tick) { // burnished catch-light on the upper left of every dot
      c.beginPath();
      inst.forEach(function (it) { var q = it[0], x = q.cx + q.dx + it[1] - q.rx * 0.36, y = q.cy + q.dy + it[2] - q.ry * 0.4; c.moveTo(x + 0.72, y); c.arc(x, y, 0.72, 0, TAU); });
      c.fillStyle = o.tick; c.fill();
    }
    return m.cv;
  }
  Art.diaper = diaper;

  // ---- tile painters -------------------------------------------------------------------------------------------
  function drawLapis() { return diaper(TOK.diap, AUX.diapHi, TOK.orp, 1, { tick: AUX.leafHi }); }
  // mid-light realm grounds stay quiet (the units must read at >= 3:1 on them): faint ink edge, tone-on-tone dots, counterchange in the lattice colour
  function drawRealm(i) { return function () { return diaper(REALM[i][0], REALM[i][1], REALM[i][1], 40 + i, { edgeA: 0.15, edgeW: 1.3, counter: REALM[i][1], counterA: 0.55, dotRing: false, tone: 0.03 }); }; }

  function drawQuat() { // 56u: rubric quatrefoil in a lozenge lattice, orp pearls at the lobes and the nodes
    var W = 56, m = mk(W, W), c = m.c, R = rng(56), JV = wob(5602, 0.34), JM = wob(5601, 0.6), q = { cx: 28 + JM(), cy: 28 + JM() }, lat = AUX.madHi, i, E = [];
    c.fillStyle = TOK.mad; c.fillRect(0, 0, W, W);
    var loz = lozPts(q.cx, q.cy, 28, 28, 0, JV);
    for (i = 0; i < 4; i++) { var w = 2.4 * (0.92 + 0.16 * R()); E.push({ w0: w * (0.94 + 0.12 * R()), w1: w * (0.94 + 0.12 * R()), bow: (R() - 0.5) * 1.0 }); }
    wrap(W, W, q.cx, q.cy, 31, 31, function (dx, dy) {
      c.save(); c.translate(dx, dy);
      c.save(); c.translate(0.6, 0.6); for (i = 0; i < 4; i++) pen(c, loz[i], loz[(i + 1) % 4], E[i].w0 + 1.7, E[i].w1 + 1.7, E[i].bow, 'rgba(75,59,42,.42)'); c.restore();
      for (i = 0; i < 4; i++) pen(c, loz[i], loz[(i + 1) % 4], E[i].w0 + 1.7, E[i].w1 + 1.7, E[i].bow, 'rgba(30,22,16,.5)');
      for (i = 0; i < 4; i++) pen(c, loz[i], loz[(i + 1) % 4], E[i].w0, E[i].w1, E[i].bow, lat);
      // the quatrefoil: lit rubric lobes, ink contour, a smaller counter-turned quatrefoil, an orp heart and four orp lobe pearls
      ink(c, function (p) { quatPath(p, q.cx, q.cy, 9.6, 7.6, 0); }, 1.3, { fill: lat, a2: 0.5 });
      ink(c, function (p) { quatPath(p, q.cx, q.cy, 5.2, 4.1, Math.PI / 4); }, 1, { fill: TOK.mad, a2: 0.4 });
      for (var k = 0; k < 4; k++) disc(c, q.cx + 10.6 * Math.cos(k * Math.PI / 2), q.cy + 10.6 * Math.sin(k * Math.PI / 2), 1.3, TOK.orp);
      berry(c, q.cx, q.cy, 3.1);
      c.restore();
    });
    [[0, 0], [W, 0], [0, W], [W, W]].forEach(function (pt) { // secondary lozenges at the cell corners
      ink(c, function (p) { quatPath(p, pt[0], pt[1], 4.6, 3.7, Math.PI / 4); }, 1, { fill: AUX.madHi, a2: 0.45 });
      disc(c, pt[0], pt[1], 1.5, TOK.orp);
    });
    [[28, 0], [28, W], [0, 28], [W, 28]].forEach(function (pt) { disc(c, pt[0], pt[1], 1.7, TOK.orp); });
    return m.cv;
  }

  function drawGold() { // tooled gold leaf: punched rings with a catch-light on a flat leaf ground (24u)
    var W = 24, m = mk(W, W), c = m.c, J = wob(2401, 0.35), i, p, rings = [[6, 6], [18, 18]];
    c.fillStyle = TOK.leaf; c.fillRect(0, 0, W, W);
    for (i = 0; i < rings.length; i++) {
      p = rings[i];
      circ(c, p[0] + J(), p[1] + J(), 4, 1.3 + 0.25 * J(), AUX.leafDk);
      disc(c, p[0] - 0.7 + J() * 0.5, p[1] - 0.7 + J() * 0.5, 1.25, AUX.leafHi);
    }
    disc(c, 18, 6, 0.9, AUX.leafDk); disc(c, 6, 18, 0.9, AUX.leafDk);
    return m.cv;
  }

  function drawVine() { // 40u malachite vine lozenge: S-curved vine stems, a fruiting fleuron (two leaves and three berries) in every lozenge
    var W = 40, m = mk(W, W), c = m.c, JM = wob(4001, 0.5), JV = wob(4002, 0.3), cx = 20 + JM(), cy = 20 + JM(), i;
    c.fillStyle = TOK.mal; c.fillRect(0, 0, W, W);
    var v = lozPts(cx, cy, 20, 20, 0, JV);
    function curve(p, a, b, sgn) {
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy), nx = -dy / len * sgn * 3.2, ny = dx / len * sgn * 3.2;
      p.moveTo(a[0], a[1]); p.bezierCurveTo(a[0] + dx * 0.28 + nx, a[1] + dy * 0.28 + ny, a[0] + dx * 0.72 - nx, a[1] + dy * 0.72 - ny, b[0], b[1]);
    }
    wrap(W, W, cx, cy, 24, 24, function (ox, oy) {
      c.save(); c.translate(ox, oy); c.lineCap = 'round';
      for (i = 0; i < 4; i++) { c.beginPath(); curve(c, v[i], v[(i + 1) % 4], i % 2 ? 1 : -1); c.lineWidth = 4.1; c.strokeStyle = 'rgba(30,22,16,.55)'; c.stroke(); }
      for (i = 0; i < 4; i++) { c.beginPath(); curve(c, v[i], v[(i + 1) % 4], i % 2 ? 1 : -1); c.lineWidth = 2.4; c.strokeStyle = AUX.malHi; c.stroke(); }
      // fleuron: a stem, two splayed leaves, a cluster of three berries (tone on tone: this ground carries 26u text on quest cards)
      var lf = { lw: 0.9, base: AUX.malHi, lit: 'rgba(63,165,140,.5)', inkOpts: { ink: 'rgba(30,22,16,.72)', a2: 0.4 } };
      ink(c, function (p) { p.moveTo(cx, cy + 11); p.lineTo(cx, cy + 2.2); }, 1.2, { ink: 'rgba(30,22,16,.72)', a2: 0.4 });
      drawLeaf(c, cx - 1.1, cy + 10.6, -146 * DEG, 10.4, 4.3, lf);
      drawLeaf(c, cx + 1.1, cy + 10.6, -34 * DEG, 10.4, 4.3, lf);
      berry(c, cx - 3, cy - 0.2, 1.7); berry(c, cx + 3, cy - 0.2, 1.7); berry(c, cx, cy - 4.2, 1.7);
      c.restore();
    });
    [[20, 0], [20, W], [0, 20], [W, 20]].forEach(function (pt) { berry(c, pt[0], pt[1], 1.5); }); // pearls on the nodes
    [[0, 0], [W, 0], [0, W], [W, W]].forEach(function (pt) { disc(c, pt[0], pt[1], 1.4, TOK.orp); });
    return m.cv;
  }

  function drawGrain() { // 192px vellum grain: transparent sepia speckle (alpha 0-.09) + nine follicle dots; meant to sit over --vel
    var N = 192, m = mk(96, 96), c = m.c, im = c.createImageData(N, N), d = im.data, R = rng(192), i, y, k, s = 0x9E3779B9 | 0;
    var le = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1, lut = new Uint8Array(256), lw = [];
    for (i = 0; i < 256; i++) lut[i] = Math.round(23 * Math.pow(i / 255, 2.6)); // skewed: mostly clear, a few darker grits (alpha 0..23 = 0..0.09)
    if (le) { // fast path: one 32-bit write per pixel, rows cut from a shared random pool with a different offset per row (no seams, no repeats)
      var u32 = new Uint32Array(d.buffer), P = 4096 + N, pool = new Uint32Array(P), o;
      for (i = 0; i < 24; i++) lw.push(((i << 24) | (42 << 16) | (59 << 8) | 75) >>> 0);
      for (i = 0; i < P; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; pool[i] = lw[lut[(s >>> 24) & 255]]; }
      for (y = 0; y < N; y++) { o = (y * 1237 + (y >> 2) * 53) % 4096; u32.set(pool.subarray(o, o + N), y * N); }
    } else {
      for (i = 0; i < N * N; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i * 4] = 75; d[i * 4 + 1] = 59; d[i * 4 + 2] = 42; d[i * 4 + 3] = lut[(s >>> 24) & 255]; }
    }
    c.putImageData(im, 0, 0);
    // follicle dots: small, a touch darker, never perfectly round
    var fx, fy, fr, fa, fq;
    for (k = 0; k < 9; k++) {
      fx = (k % 3 + 0.15 + R() * 0.7) * 32; fy = (Math.floor(k / 3) + 0.15 + R() * 0.7) * 32; fr = 0.5 + R() * 0.42; fa = 0.15 + R() * 0.12; fq = R() * Math.PI;
      (function (fx, fy, fr, fa, fq) {
        wrap(96, 96, fx, fy, 2, 2, function (dx, dy) {
          c.save(); c.translate(fx + dx, fy + dy); c.rotate(fq); c.beginPath(); c.ellipse(0, 0, fr * 1.25, fr * 0.85, 0, 0, TAU);
          c.fillStyle = 'rgba(75,59,42,' + fa.toFixed(3) + ')'; c.fill(); c.restore();
        });
      })(fx, fy, fr, fa, fq);
    }
    return m.cv;
  }

  function drawIvy() { // 36u ivy bar tile: ink stem, malachite 3-lobe leaves, orp berries; repeats horizontally (72u period)
    var W = 72, H = 36, m = mk(W, H), c = m.c, AMP = 3.2;
    function sy(x) { return 18 + AMP * Math.sin(TAU * (x - 6) / W); }
    function umbel(x, side) { // three berries on short stalks, fanning away from the stem
      var y0 = sy(x), k, ang;
      c.strokeStyle = TOK.ink; c.lineWidth = 1.4; c.lineCap = 'round';
      for (k = -1; k <= 1; k++) { ang = side * (-90 * DEG) + k * 33 * DEG; c.beginPath(); c.moveTo(x, y0); c.lineTo(x + Math.cos(ang) * 8, y0 + Math.sin(ang) * 8); c.stroke(); }
      for (k = -1; k <= 1; k++) { ang = side * (-90 * DEG) + k * 33 * DEG; berry(c, x + Math.cos(ang) * 8, y0 + Math.sin(ang) * 8, 2.4); }
    }
    function leaf(x, side) {
      var y0 = sy(x), pa = side * (-62 * DEG), px = x + Math.cos(pa) * 3.8, py = y0 + Math.sin(pa) * 3.8;
      c.strokeStyle = TOK.ink; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y0); c.lineTo(px, py); c.stroke();
      drawLeaf(c, px, py, side * (-50 * DEG), 17, 7.2, { lw: 1.4 });
    }
    function stemPath(p) { for (var x = -8; x <= W + 8; x += 2) { if (x === -8) p.moveTo(x, sy(x)); else p.lineTo(x, sy(x)); } }
    ink(c, stemPath, 2.6); // two-pass ink stem with a lit edge, so it survives on the dark grounds
    c.save(); c.translate(-0.45, -0.45); c.strokeStyle = TOK.vel2; c.globalAlpha = 0.8; c.lineWidth = 0.7; c.beginPath(); stemPath(c); c.stroke(); c.restore();
    leaf(10, 1); umbel(46, 1); leaf(46, -1); umbel(10, -1);
    return m.cv;
  }

  function chequy(a, b, dotA, dotB, seed) { // 24u chequy of 12u squares: hand-ruled thin ink lines, a pricked dot in every square
    var W = 24, m = mk(W, W), c = m.c, J = wob(seed * 3 + 1, 0.45), o1 = [J(), J(), J()], o2 = [J(), J(), J()], R = rng(seed);
    c.fillStyle = a; c.fillRect(0, 0, W, W);
    c.fillStyle = b; c.fillRect(12 + o1[1], 0, 12 - o1[1], 12 + o2[1]); c.fillRect(0, 12 + o2[1], 12 + o1[1], 12 - o2[1]);
    function vline(x, o) { return function (p) { p.moveTo(x + o[0], -1); p.lineTo(x + o[1], 12); p.lineTo(x + o[0], 25); }; }
    function hline(y, o) { return function (p) { p.moveTo(-1, y + o[0]); p.lineTo(12, y + o[1]); p.lineTo(25, y + o[0]); }; }
    ink(c, vline(12, o1), 1.15); ink(c, hline(12, o2), 1.15);
    ink(c, function (p) { p.moveTo(0, -1); p.lineTo(0, 25); }, 1.15); ink(c, function (p) { p.moveTo(W, -1); p.lineTo(W, 25); }, 1.15);
    ink(c, function (p) { p.moveTo(-1, 0); p.lineTo(25, 0); }, 1.15); ink(c, function (p) { p.moveTo(-1, W); p.lineTo(25, W); }, 1.15);
    [[6, 6, dotA], [18, 6, dotB], [6, 18, dotB], [18, 18, dotA]].forEach(function (q) { disc(c, q[0] + o1[1] * 0.3 + (R() - 0.5) * 0.5, q[1] + o2[1] * 0.3 + (R() - 0.5) * 0.5, 1.25, q[2]); });
    return m.cv;
  }
  function drawChequyEnemy() { return chequy(TOK.verm, TOK.ivo, TOK.ivo, TOK.verm, 7); }
  function drawChequyHost() { return chequy(TOK.lapis, TOK.orp, TOK.orp, TOK.lapis, 11); }

  // ---- modal frame: 9-slice border image (bible section 3) ---------------------------------------------------------
  // 88u x 88u canvas, slice 44 image px (22u): corner blocks with a quatrefoil, edge bands of ink 3 | lapis 8 | ink 2 | leaf-art 6 | ink 3
  // with an ivy bud every 44u (one per repeated edge segment), so CSS border-image-slice 44 + round keeps a believable rhythm.
  function drawFrame() {
    var W = 88, m = mk(W, W), c = m.c, side, k;
    function wavy(y0, seed) { // periodic (44u) wobble of a band boundary
      var r = wob(seed, 0.32), o = [r(), r(), r(), r()], pts = [], x, t;
      for (x = -22; x <= W + 22; x += 11) { t = Math.round((((x - 22) % 44) + 44) % 44 / 11) % 4; pts.push([x, y0 + o[t]]); }
      return pts;
    }
    function band(c, top, bot, fill) {
      c.beginPath(); top.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
      for (var i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
      c.closePath(); c.fillStyle = fill; c.fill();
    }
    function bud(c, x, y) { // the ivy bud in the lapis band: two ivy leaves back to back around a gilt berry, along the bar
      drawLeaf(c, x - 1.9, y, Math.PI, 11.2, 4.7, { lw: 1 });
      drawLeaf(c, x + 1.9, y, 0, 11.2, 4.7, { lw: 1 });
      berry(c, x, y, 2.3);
    }
    function edgeBand(c) { // top edge, drawn in local coordinates (outer side at y=0)
      c.fillStyle = TOK.ink; c.fillRect(0, 0, W, 22);
      band(c, wavy(3, 31), wavy(11, 32), TOK.lapis);
      band(c, wavy(13, 33), wavy(19, 34), leafBox(c, 22, 10, 44, 12, true));
      for (var x = 22 + 5.5; x < 66; x += 11) disc(c, x, 16, 0.75, AUX.leafDk); // tooled dots on the gilt bar, pricked rather than a hairline
      bud(c, 44, 7);
    }
    function corner(c) { // top-left corner block, outer sides at x=0 and y=0
      c.fillStyle = TOK.ink; c.fillRect(0, 0, 22, 22);
      c.fillStyle = TOK.mad; c.fillRect(3, 3, 16, 16);
      var T = function (p) { quatPath(p, 11, 11, 4.3, 3.5, 0); };
      c.save(); c.beginPath(); T(c); c.clip(); c.fillStyle = TOK.bole; c.fillRect(0, 0, 22, 22); c.translate(1.1, 1.1); c.beginPath(); T(c); c.fillStyle = TOK.orp; c.fill(); c.restore();
      ink(c, T, 1.1);
      disc(c, 11, 11, 1.6, TOK.mad); circ(c, 11, 11, 1.6, 0.8, TOK.ink);
    }
    for (side = 0; side < 4; side++) { c.save(); c.translate(W / 2, W / 2); c.rotate(side * Math.PI / 2); c.translate(-W / 2, -W / 2); edgeBand(c); c.restore(); }
    for (k = 0; k < 4; k++) { c.save(); c.translate(W / 2, W / 2); c.rotate(k * Math.PI / 2); c.translate(-W / 2, -W / 2); corner(c); c.restore(); }
    return m.cv;
  }

  // ---- tile registry ----------------------------------------------------------------------------------------
  var REG = {
    lapis: { w: 144, h: 144, fn: drawLapis }, quat: { w: 56, h: 56, fn: drawQuat }, gold: { w: 24, h: 24, fn: drawGold },
    vine: { w: 40, h: 40, fn: drawVine }, grain: { w: 96, h: 96, fn: drawGrain }, ivy: { w: 72, h: 36, fn: drawIvy },
    frame: { w: 88, h: 88, fn: drawFrame },
    chequyEnemy: { w: 24, h: 24, fn: drawChequyEnemy }, chequyHost: { w: 24, h: 24, fn: drawChequyHost }
  };
  (function () { for (var i = 0; i < 7; i++) REG['r' + i] = { w: 144, h: 144, fn: drawRealm(i) }; })();
  Art.SIZE = {}; for (var nm in REG) if (Object.prototype.hasOwnProperty.call(REG, nm)) Art.SIZE[nm] = [REG[nm].w, REG[nm].h]; // natural size in u

  var cache = {}, urls = {};
  // tile(name) -> cached canvas (2 image px per u) or null when there is no DOM / unknown name
  function tile(name) {
    if (cache[name]) return cache[name];
    var reg = REG[name];
    if (!reg || !hasDom()) return null;
    var t0 = now(), cv = null;
    try { cv = reg.fn(); } catch (e) { cv = null; } // no 2d context / out of memory: callers fall back to plain colours
    if (!cv) return null;
    Art.stats.tiles[name] = { ms: now() - t0, w: cv.width, h: cv.height };
    return (cache[name] = cv);
  }
  function dataURL(name) {
    if (urls[name]) return urls[name];
    var cv = tile(name);
    if (!cv) return '';
    var t0 = now(); urls[name] = cv.toDataURL('image/png');
    if (Art.stats.tiles[name]) { Art.stats.tiles[name].pngMs = now() - t0; Art.stats.tiles[name].bytes = urls[name].length; }
    return urls[name];
  }
  // pattern(ctx, name, k): repeat pattern of a tile where one u = k ctx units (default 1)
  function pattern(ctx, name, k) {
    var t = tile(name), p, s = (k == null ? 1 : k) / S;
    if (!t) return null;
    p = ctx.createPattern(t, 'repeat');
    try { if (p && p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scale(s, s)); } catch (e) { /* old WebView: pattern stays at image px */ }
    return p;
  }
  function frame(kind) {
    if (kind == null) kind = 'modal';
    if (kind !== 'modal') return null;
    var cv = tile('frame');
    return cv ? { canvas: cv, slice: 44, width: 22 } : null;
  }

  // ---- battlefield frame ------------------------------------------------------------------------------------------
  // overlay(w, h, k) -> canvas of exactly w x h device px: ink 3 | leaf-art 6 | ink 3 = 12u, an ivy sprig every ~56u, orp studs r12u at the
  // corners, transparent middle. k = device px per u (R.px); defaults to w / 720. Cached per size (the last two sizes are kept).
  var ovCache = {}, ovKeys = [];
  function overlay(w, h, k) { try { return overlayDraw(w, h, k); } catch (e) { return null; } } // null: no 2d context / out of memory
  function overlayDraw(w, h, k) {
    w = Math.round(w); h = Math.round(h);
    if (!(w > 0 && h > 0) || !hasDom()) return null;
    k = k || w / 720;
    var key = w + 'x' + h + '@' + k.toFixed(4);
    if (ovCache[key]) return ovCache[key];
    var t0 = now(), cv = document.createElement('canvas'), c, Wu = w / k, Hu = h / k;
    cv.width = w; cv.height = h; c = cv.getContext('2d'); c.scale(k, k);
    function wobRect(c, inset, seed, rev) { // rectangle path with a slow hand-ruled wobble
      var r = wob(seed, 0.38), x0 = inset, y0 = inset, x1 = Wu - inset, y1 = Hu - inset, pts = [], x, y, step = 20, ph = [r() * 6, r() * 6, r() * 6, r() * 6];
      for (x = x0; x < x1; x += step) pts.push([x, y0 + Math.sin(x / 83 + ph[0]) * 0.32]);
      for (y = y0; y < y1; y += step) pts.push([x1 + Math.sin(y / 79 + ph[1]) * 0.32, y]);
      for (x = x1; x > x0; x -= step) pts.push([x, y1 + Math.sin(x / 91 + ph[2]) * 0.32]);
      for (y = y1; y > y0; y -= step) pts.push([x0 + Math.sin(y / 87 + ph[3]) * 0.32, y]);
      if (rev) pts.reverse();
      pts.forEach(function (p, j) { if (j) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
      c.closePath();
    }
    // ink bar (the whole 12u), gold bar over it
    c.beginPath(); c.rect(0, 0, Wu, Hu); wobRect(c, 12, 11, true); c.fillStyle = TOK.ink; c.fill('evenodd');
    c.beginPath(); wobRect(c, 3, 12, false); wobRect(c, 9, 13, true); c.fillStyle = leafBox(c, 0, 0, Wu, Hu, true); c.fill('evenodd');
    // sprigs growing from the inner ink edge into the field: stem, one ivy leaf and a berry, leaning alternately
    function sprig(x, y, a, lean) {
      var T = tf(x, y, a, 1, 1), p0 = T(-1.8, 0), p1 = T(2.8, 0.8 * lean), p2 = T(5.6, 0.6 * lean), lp = T(5.4, 0.6 * lean), bb = T(3.2, -4.2 * lean), st = T(1.7, -0.2 * lean);
      ink(c, function (p) { p.moveTo(p0[0], p0[1]); p.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); }, 2);
      ink(c, function (p) { p.moveTo(st[0], st[1]); p.lineTo(bb[0], bb[1]); }, 1.3);
      berry(c, bb[0], bb[1], 2.2);
      drawLeaf(c, lp[0], lp[1], a + 0.3 * lean, 13, 5.3, { lw: 1.2 });
    }
    var n, sp, s, j;
    n = Math.max(2, Math.round((Wu - 64) / 56)); sp = (Wu - 64) / n;
    for (j = 0; j < n; j++) { s = 32 + (j + 0.5) * sp; sprig(s, 12, Math.PI / 2, j % 2 ? 1 : -1); sprig(s, Hu - 12, -Math.PI / 2, j % 2 ? -1 : 1); }
    n = Math.max(2, Math.round((Hu - 64) / 56)); sp = (Hu - 64) / n;
    for (j = 0; j < n; j++) { s = 32 + (j + 0.5) * sp; sprig(12, s, 0, j % 2 ? 1 : -1); sprig(Wu - 12, s, Math.PI, j % 2 ? -1 : 1); }
    // corner studs r12u: gilt face over a bole crescent, ink ring, pricked ring of dots, a small quatrefoil heart
    function stud(x, y) {
      disc(c, x, y, 12, TOK.ink); disc(c, x, y, 9.2, TOK.bole);
      c.save(); c.beginPath(); c.arc(x, y, 9.2, 0, TAU); c.clip(); disc(c, x + 1.9, y + 1.9, 9.2, TOK.orp); c.restore();
      for (var q = 0; q < 8; q++) disc(c, x + Math.cos(q * Math.PI / 4) * 6, y + Math.sin(q * Math.PI / 4) * 6, 0.85, TOK.bole);
      ink(c, function (p) { quatPath(p, x + 0.8, y + 0.8, 2.3, 1.9, 0); }, 0.9, { fill: TOK.mad });
    }
    stud(12, 12); stud(Wu - 12, 12); stud(12, Hu - 12); stud(Wu - 12, Hu - 12);
    Art.stats.overlay = { ms: now() - t0, w: w, h: h };
    ovCache[key] = cv; ovKeys.push(key);
    while (ovKeys.length > 2) delete ovCache[ovKeys.shift()];
    return cv;
  }

  // ---- bake to CSS custom properties ---------------------------------------------------------------------------------
  var BOOT = [['--dp-lapis', 'lapis'], ['--grain', 'grain'], ['--frame', 'frame'], ['--ivy', 'ivy']];
  var REST = [['--dp-quat', 'quat'], ['--dp-gold', 'gold'], ['--dp-vine', 'vine'],
    ['--dp0', 'r0'], ['--dp1', 'r1'], ['--dp2', 'r2'], ['--dp3', 'r3'], ['--dp4', 'r4'], ['--dp5', 'r5'], ['--dp6', 'r6'],
    ['--chequy-enemy', 'chequyEnemy'], ['--chequy-host', 'chequyHost']];
  var baking = false, waiters = [], tStart = 0, qi = 0;
  function setVar(pair) {
    var u = '';
    try { u = dataURL(pair[1]); } catch (e) { u = ''; }
    document.documentElement.style.setProperty(pair[0], u ? 'url("' + u + '")' : 'none'); // 'none' keeps the CSS declarations valid if a tile failed
  }
  function finish() {
    Art.ready = true; Art.stats.totalMs = now() - tStart; Art.stats.restMs = Art.stats.totalMs - Art.stats.bootMs;
    var w = waiters; waiters = []; w.forEach(function (f) { try { f(); } catch (e) { /* listener errors never break boot */ } });
    try { document.dispatchEvent(new CustomEvent('zart', { bubbles: true, detail: { stats: Art.stats } })); } catch (e) { /* no CustomEvent */ }
  }
  function schedule(fn) {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 300 });
    else setTimeout(function () { fn(null); }, 16);
  }
  function step(dl) {
    var t0 = now(), n = 0;
    Art.stats.slices++;
    // at least one tile per slice, then keep going only while idle time remains and the slice stays under ~10 ms
    while (qi < REST.length && (n < 1 || ((now() - t0) < 10 && (dl && dl.timeRemaining ? dl.timeRemaining() > 5 : (now() - t0) < 6)))) { setVar(REST[qi++]); n++; }
    if (qi < REST.length) schedule(step); else finish();
  }
  // bake(done): bakes --dp-lapis --grain --frame --ivy synchronously, then calls done(); the other tiles follow in idle slices.
  // Z.Art.ready becomes true (and a "zart" CustomEvent fires on document) when all of them are set. Idempotent; in Node it just calls done().
  function bake(done) {
    if (!hasDom()) { Art.bootReady = Art.ready = true; if (done) done(); return; }
    if (baking) { if (done) done(); return; }
    baking = true; tStart = now();
    // not baked yet: 'none' keeps every `background: var(--dp-x) ..., colour` declaration valid (plain colour until the tile arrives)
    REST.forEach(function (p) { document.documentElement.style.setProperty(p[0], 'none'); });
    BOOT.forEach(setVar);
    Art.stats.bootMs = now() - tStart; Art.bootReady = true;
    schedule(step); // queued first, so a throwing callback cannot strand the idle tiles
    if (done) done();
  }
  function whenReady(fn) { if (Art.ready) fn(); else waiters.push(fn); }

  Art.rng = rng; Art.wob = wob; Art.ink = ink; Art.leafGrad = leafGrad; Art.leafBox = leafBox;
  Art.tile = tile; Art.dataURL = dataURL; Art.pattern = pattern; Art.frame = frame; Art.overlay = overlay;
  Art.bake = bake; Art.whenReady = whenReady;
})(globalThis.Z = globalThis.Z || {});
