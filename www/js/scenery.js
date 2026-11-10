// Castle Siege: History - battlefield scenery as an illuminated manuscript (docs/ART_DIRECTION.md sections 3 and 7, "Scenery, staged").
// Drawn once per battle into R.bg (one drawImage per frame): flat realm ground + a quiet diaper (Z.Art r0..r6) + a few hand-inked tufts,
// roads #E3CFA0 with 3u ink edges, trees/bushes/rocks as flat gouache + heavy ink contour, a gold-leaf diaper horizon band with an ink hill line.
// No gradient shading, soft shadow, fog, vignette, light shaft, sky, sun or cloud. u = logical px of the 720-wide stage; the context is scaled by R.px.
// Any error falls back to R.buildBgBasic / R.fieldBuildBgBasic (render.js / fieldrender.js). Chrome 87 safe: no ctx.filter, no optional chaining.
(function (Z) {
  'use strict';
  var R = Z.Render, U = R.util, TAU = U.TAU, THEMES = R.THEMES;
  var DW = 720, CASTLE_H = 86;
  var DIAPER_A = 0.18;        // bible section 7 says .10, but the realm tiles are tone-on-tone (lattice ~6% off the ground), so .10 vanishes; .30 read as wallpaper behind a melee (volcano, autumn); .18 is the quiet middle
  var ROAD = '#E3CFA0';       // lanes and roads: flat, no ruts or pebbles
  var TUFT_MAX = 400;         // ink tufts per scene (bible: <= 400)
  var ROAD_RULE = true;       // a pricked --ink2 line of dots 8u inside both road edges (scribe's ruling; the itinerary-road motif of the map)

  // ---- tokens: Z.Art.TOK (bible section 2), inline copy when art.js is missing ----------------------------------------
  var ART = Z.Art || {};
  var TK = ART.TOK || { ink: '#1E1610', ink2: '#4B3B2A', night: '#0F1838', lapis: '#22409A', lapisd: '#14275F', azur: '#4474C0', verm: '#D8391F', mad: '#9A2018',
    mal: '#1F6B4E', vdg: '#3FA58C', orp: '#E9B62A', leaf: '#D4A02F', bole: '#8C3520', pur: '#5B2E7A', vel: '#D8D0AB', vel2: '#C6B684', ivo: '#F4ECD3', arg: '#CDD2DB', bis: '#7A5230' };
  var INK = TK.ink, INK2 = TK.ink2, IVO = TK.ivo;
  var REALM = ART.REALM || [['#8DAA6B', '#7C9A5B'], ['#D2B070', '#C29E5C'], ['#A9BBD0', '#95AAC4'], ['#8CBBAA', '#79A898'], ['#A8B07A', '#979F69'], ['#A99AB5', '#9888A6'], ['#8E9CBF', '#7D8CB0']];

  // ---- colour helpers -------------------------------------------------------------------------------------------------
  function hex(c) { if (c.charAt(0) === 'r') { var m = c.match(/\d+/g); return [+m[0], +m[1], +m[2]]; } c = c.replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function rgb(a) { return 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')'; }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2); return rgb([Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]); }
  function fl(base, k) { return { b: base, s: mix(base, INK, k == null ? 0.36 : k), t: mix(base, IVO, 0.7) }; } // flat tone, hard-shade tone, ivory tick tone

  // ---- seeded randomness ------------------------------------------------------------------------------------------------
  function rng(seed) { return ART.rng ? ART.rng(seed) : U.seeded(typeof seed === 'number' ? seed : 7); }

  // ---- per-theme scenery tokens (theme index = realm index; the ground and diaper come from Z.Art.REALM) ------------------
  // leaf/leaf2 broadleaf clumps, con conifer, bush, rock, trunk, palm fronds; band = horizon tile; far = far-ridge tone; flowers = bush blossom dots
  // FOLIAGE VS UNITS: the units are mid-tones too (host azure #22409A, garrison gules #D8391F), so luminance alone cannot separate them from a canopy; every leaf / leaf2 /
  // con / bush / palm tone must sit >= 1.4:1 away in luminance OR >= 40 deg away in hue from both tinctures (azure is 227 deg, gules 7 deg). That is why the night forest is
  // jade (the old violet canopy was 1.00:1 against azure) and the autumn canopy is ochre (the old orange was 1.13:1 against gules). The gallery gate measures it.
  var TH = [
    /* 0 W. Europe  (forest) */ { leaf: '#3F8F5A', leaf2: '#4D9B54', con: '#2C7552', bush: '#5BA05A', rock: '#BDB8A8', trunk: TK.bis, band: 'gold', far: '#86A97A', flowers: [IVO, TK.verm, TK.orp] },
    /* 1 Holy Lands (desert) */ { leaf: '#7C8D4B', leaf2: '#8E9A55', palm: '#3F8F5A', con: '#3F8F5A', bush: '#8E9B52', rock: '#C9A56C', trunk: TK.bis, band: 'gold', far: '#DDBB7C', flowers: [TK.orp, IVO] },
    /* 2 Northern   (ice)    */ { leaf: '#2E7468', leaf2: '#3A8478', con: '#2E7468', bush: '#5C9486', rock: TK.arg, trunk: TK.bis, band: 'gold', far: '#C7D3E3', flowers: [IVO] },
    /* 3 Mediterr.  (volcano)*/ { leaf: '#3A2A22', leaf2: '#4B3A30', con: '#3A2A22', bush: '#4B3A30', rock: '#6D5A52', trunk: '#2C1F19', band: 'gold', far: '#9DB9AC', flowers: [TK.orp, TK.verm] },
    /* 4 Low Countr.(swamp)  */ { leaf: '#2F7F5F', leaf2: '#3C8F6A', con: '#2A6F55', bush: '#4A8F5E', rock: '#9AA088', trunk: '#6B4A2C', band: 'gold', far: '#B2BA84', flowers: [IVO, TK.orp] },
    /* 5 Asia       (autumn) */ { leaf: '#C9962E', leaf2: '#E0B84A', con: '#2C6B4E', bush: '#B8863A', rock: '#BDA9A0', trunk: TK.bis, band: 'gold', far: '#B9A7C4', flowers: [TK.orp, TK.verm] },
    /* 6 Anatolia   (night)  */ { leaf: '#2F7F6A', leaf2: '#3FA58C', con: '#1D5E55', bush: '#4E8F7A', rock: '#A7AEC8', trunk: '#5A3A22', band: 'lapis', far: '#6D78AC', flowers: [IVO, TK.orp] }
  ];
  function ground(theme) { var g0 = REALM[Math.max(0, Math.min(6, theme))][0]; return theme === 3 ? mix(g0, '#A99888', 0.8) : g0; } // the Mediterranean sea-green is pulled almost to warm ash for the volcano theme (mid-light, azure units stay >= 3:1)

  // ---- paths and ink -----------------------------------------------------------------------------------------------------
  var now = (typeof performance !== 'undefined' && performance.now) ? function () { return performance.now(); } : function () { return Date.now(); };
  function P2(fn) { var p = new Path2D(); fn(p); return p; }
  function smooth(p, pts, move) { // quadratic mid-point spline through pts (open)
    var i, n = pts.length;
    if (move) p.moveTo(pts[0][0], pts[0][1]); else p.lineTo(pts[0][0], pts[0][1]);
    for (i = 1; i < n - 1; i++) p.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    p.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
  function smoothClosed(p, pts) { // closed quadratic mid-point spline
    var n = pts.length, i, a, b;
    p.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (i = 0; i < n; i++) { a = pts[i]; b = pts[(i + 1) % n]; p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    p.closePath();
  }
  function cloud(p, cx, cy, rx, ry, n, rnd, rot) { // scalloped (lobed) clump: n quadratic bulges around an ellipse, unequal lobes
    var i, a, pts = [], k = 0.8;
    for (i = 0; i < n; i++) { a = rot + (i + (rnd() - 0.5) * 0.3) * TAU / n; pts.push({ a: a, x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k }); }
    p.moveTo(pts[0].x, pts[0].y);
    for (i = 0; i < n; i++) {
      var A = pts[i], B = pts[(i + 1) % n], a1 = B.a + (i + 1 === n ? TAU : 0), am = (A.a + a1) / 2, bl = 1.26 + (rnd() - 0.5) * 0.16;
      p.quadraticCurveTo(cx + Math.cos(am) * rx * bl, cy + Math.sin(am) * ry * bl, B.x, B.y);
    }
    p.closePath();
  }
  function blob(p, cx, cy, rx, ry, n, rnd) { // irregular rounded shape (unequal radii), closed
    var pts = [], i, a, k;
    for (i = 0; i < n; i++) { a = i * TAU / n + rnd() * 0.2; k = 0.82 + rnd() * 0.3; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    smoothClosed(p, pts);
  }
  function inkStroke(g, P, w, a2) { // two-pass iron-gall ink (Z.Art.ink): the shape shifted 0.6u in --ink2 at alpha .6, then the --ink core
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = w;
    g.globalAlpha = a2 == null ? 0.6 : a2; g.strokeStyle = INK2; g.translate(0.6, 0.6); g.stroke(P); g.translate(-0.6, -0.6);
    g.globalAlpha = 1; g.strokeStyle = INK; g.stroke(P); g.restore();
  }
  function gouache(g, P, pal, dx, dy) { // flat base + hard shade crescent (the shape shifted by dx,dy in the base tone leaves a crescent of shade tone)
    g.fillStyle = pal.s; g.fill(P);
    g.save(); g.clip(P); g.translate(dx, dy); g.fillStyle = pal.b; g.fill(P); g.restore();
  }
  function tick(g, col, w, x0, y0, cx, cy, x1, y1) { // one ivory highlight stroke
    g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke(); g.restore();
  }
  function groundTicks(g, r, y, rnd) { // three ink ticks replace the shadow ellipse
    var P = P2(function (p) {
      var a = r * (0.55 + rnd() * 0.15), b = r * (0.2 + rnd() * 0.1);
      p.moveTo(-a - r * 0.3, y + 0.5); p.lineTo(-a + r * 0.12, y);
      p.moveTo(-b, y + 1.6); p.lineTo(b * 1.4, y + 1.4);
      p.moveTo(a - r * 0.1, y); p.lineTo(a + r * 0.36, y + 0.6);
    });
    g.save(); g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 2; g.stroke(P); g.restore();
  }

  // ---- sprite cache (canvases baked once per px; shared by every build) -----------------------------------------------------
  var sc = { px: 0, m: {} };
  function sprite(px, key, w, h, foot, paint) {
    if (sc.px !== px) { sc.px = px; sc.m = {}; }
    var s = sc.m[key];
    if (s) return s;
    var cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w * px)); cv.height = Math.max(1, Math.ceil(h * px));
    var g = cv.getContext('2d'); g.setTransform(px, 0, 0, px, cv.width / 2, cv.height / 2);
    paint(g, rng(key));
    s = { cv: cv, w: cv.width / px, h: cv.height / px, foot: foot };
    sc.m[key] = s;
    return s;
  }
  function drawSprite(g, px, s, x, y, flip) {
    var X = Math.round(x * px) / px, Y = Math.round(y * px) / px;
    if (flip) { g.save(); g.translate(X, Y); g.scale(-1, 1); g.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h); g.restore(); }
    else g.drawImage(s.cv, X - s.w / 2, Y - s.h / 2, s.w, s.h);
  }

  // ---- flat sprites ----------------------------------------------------------------------------------------------------------
  function clump(g, cx, cy, rx, ry, pal, rnd, n, w) {
    var P = P2(function (p) { cloud(p, cx, cy, rx, ry, n || 9, rnd, rnd() * TAU); });
    gouache(g, P, pal, -rx * 0.2, -ry * 0.24);
    tick(g, pal.t, Math.max(1.3, rx * 0.075), cx - rx * 0.52, cy - ry * 0.1, cx - rx * 0.5, cy - ry * 0.54, cx - rx * 0.14, cy - ry * 0.6);
    inkStroke(g, P, w || 2.3);
  }
  function trunk(g, x, y0, y1, w0, w1, col, lean, rnd) { // tapered bister trunk with a hard shade side, ink contour and two bark ticks
    var P = P2(function (p) {
      p.moveTo(x - w0 / 2 + lean, y0); p.lineTo(x + w0 / 2 + lean, y0);
      p.quadraticCurveTo(x + w0 * 0.5 + lean * 0.4, y0 + (y1 - y0) * 0.6, x + w1 / 2, y1);
      p.lineTo(x - w1 / 2, y1);
      p.quadraticCurveTo(x - w0 * 0.5 + lean * 0.4, y0 + (y1 - y0) * 0.6, x - w0 / 2 + lean, y0);
      p.closePath();
    });
    var pal = fl(col, 0.4); gouache(g, P, pal, -w1 * 0.26, 0);
    g.save(); g.strokeStyle = INK2; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath();
    g.moveTo(x - w0 * 0.2 + lean * 0.6, y0 + (y1 - y0) * 0.35); g.lineTo(x - w0 * 0.05 + lean * 0.5, y0 + (y1 - y0) * 0.5);
    g.moveTo(x + w0 * 0.05 + lean * 0.3, y0 + (y1 - y0) * 0.68); g.lineTo(x + w0 * 0.22 + lean * 0.3, y0 + (y1 - y0) * 0.8); g.stroke(); g.restore();
    inkStroke(g, P, 1.9);
  }

  function broadSprite(px, key, r, pal1, pal2, trunkCol, o) { // bister trunk + three lobed clumps (top, left, right), flat, ink contour
    var w = Math.ceil(r * 2.5 + 10), h = Math.ceil(r * 2.4 + 10);
    return sprite(px, key, w, h, r * 1.0, function (g, rnd) {
      var dy = r * 0.04;
      g.translate(0, dy);
      trunk(g, 0, r * 0.15, r * 0.98, r * 0.3, r * 0.5, trunkCol, (rnd() - 0.5) * r * 0.08, rnd);
      groundTicks(g, r, r * 1.04, rnd);
      var top = { x: (rnd() - 0.5) * r * 0.1, y: -r * 0.5, r: r * (0.54 + rnd() * 0.05) };
      var left = { x: -r * (0.44 + rnd() * 0.06), y: -r * 0.1, r: r * (0.46 + rnd() * 0.06) };
      var right = { x: r * (0.44 + rnd() * 0.06), y: -r * 0.06, r: r * (0.48 + rnd() * 0.06) };
      var lc = o && o.alt ? pal2 : pal1;
      clump(g, top.x, top.y, top.r, top.r * 0.9, pal1, rnd, 9, 2.3);
      clump(g, left.x, left.y, left.r, left.r * 0.9, lc, rnd, 8, 2.3);
      clump(g, right.x, right.y, right.r, right.r * 0.9, pal2, rnd, 8, 2.3);
    });
  }

  function firSprite(px, key, r, pal, snow, trunkCol) { // three scalloped tiers, ink contour, optional ivory snow caps
    var w = Math.ceil(r * 2.2 + 10), h = Math.ceil(r * 2.4 + 10);
    return sprite(px, key, w, h, r * 1.0, function (g, rnd) {
      g.translate(0, r * 0.04);
      trunk(g, 0, r * 0.55, r * 1.0, r * 0.26, r * 0.36, trunkCol, 0, rnd);
      groundTicks(g, r, r * 1.04, rnd);
      var hw = [r * 0.56, r * 0.82, r * 1.06], tipY = [-r * 1.12, -r * 0.66, -r * 0.18], baseY = [-r * 0.2, r * 0.28, r * 0.74], i, k;
      for (i = 2; i >= 0; i--) {
        var tp = tipY[i] + (rnd() - 0.5) * r * 0.05, by = baseY[i], hwi = hw[i] * (0.96 + rnd() * 0.08), nb = i + 3;
        var P = P2(function (p) {
          p.moveTo(0, tp); p.lineTo(hwi * 0.9 + (rnd() - 0.5) * 2, by - r * 0.1);
          p.quadraticCurveTo(hwi * 1.02, by + r * 0.02, hwi, by + r * 0.04);
          for (k = 1; k <= nb; k++) { var x1 = hwi - (k * 2 * hwi) / nb, xm = hwi - ((k - 0.5) * 2 * hwi) / nb; p.quadraticCurveTo(xm, by + r * (0.2 + (rnd() - 0.5) * 0.04), x1, by + r * 0.02 + (rnd() - 0.5) * 1.2); }
          p.lineTo(-hwi * 0.9 - (rnd() - 0.5) * 2, by - r * 0.1); p.closePath();
        });
        gouache(g, P, pal, -hwi * 0.3, -r * 0.05);
        if (snow) { // flat ivory cap: the top 45% of the tier, a zig-zag lower edge in ink
          var cy = tp + (by - tp) * 0.5, cw = hwi * 0.5;
          var C = P2(function (p) { p.moveTo(0, tp - 0.4); p.lineTo(cw * 1.02, cy + 1); p.lineTo(cw * 0.62, cy - 2.4); p.lineTo(cw * 0.22, cy + 2.4); p.lineTo(-cw * 0.2, cy - 2.2); p.lineTo(-cw * 0.6, cy + 2); p.lineTo(-cw * 1.02, cy + 1); p.closePath(); });
          g.save(); g.clip(P); g.fillStyle = IVO; g.fill(C); g.fillStyle = '#C9D6E6'; g.save(); g.clip(C); g.translate(-hwi * 0.3, -r * 0.05); g.fillStyle = IVO; g.fillRect(-r * 2, -r * 2, r * 4, r * 4); g.restore(); g.restore();
          g.save(); g.clip(P); g.strokeStyle = INK; g.lineWidth = 1.5; g.lineJoin = 'round'; g.stroke(C); g.restore();
        } else tick(g, pal.t, Math.max(1.3, r * 0.07), -hwi * 0.34, by - r * 0.1, -hwi * 0.22, by - (by - tp) * 0.5, -hwi * 0.08, tp + (by - tp) * 0.34);
        inkStroke(g, P, 2.2);
      }
    });
  }

  function palmSprite(px, key, r, frond, trunkCol) {
    var w = Math.ceil(r * 2.7 + 10), h = Math.ceil(r * 2.7 + 10);
    return sprite(px, key, w, h, r * 1.0, function (g, rnd) {
      g.translate(0, r * 0.1);
      groundTicks(g, r * 0.9, r * 1.0, rnd);
      var P = P2(function (p) { p.moveTo(-r * 0.1, r * 0.98); p.quadraticCurveTo(-r * 0.04, r * 0.4, r * 0.1 - 1, -r * 0.2); p.lineTo(r * 0.1 + r * 0.16, -r * 0.2); p.quadraticCurveTo(r * 0.22, r * 0.4, r * 0.17, r * 0.98); p.closePath(); });
      gouache(g, P, fl(trunkCol, 0.4), -r * 0.08, 0);
      g.save(); g.clip(P); g.strokeStyle = INK2; g.lineWidth = 1.2; g.beginPath(); for (var k = 0; k < 5; k++) { var yy = r * (0.0 + k * 0.2); g.moveTo(-r * 0.2, yy); g.lineTo(r * 0.3, yy + r * 0.07); } g.stroke(); g.restore();
      inkStroke(g, P, 1.9);
      var pal = fl(frond, 0.34), cx = r * 0.15, cy = -r * 0.2, ang = [2.75, 2.2, -2.75, -2.3, -1.85, -1.4, -0.95, -0.5, 0.05, 0.6], i;
      for (i = 0; i < ang.length; i++) {
        var L = r * (0.96 + rnd() * 0.16), wd = r * 0.62, a = ang[i], droop = (a > 0.3 || a < -2.6) ? r * 0.34 : (a > -0.3 ? r * 0.2 : r * 0.05);
        g.save(); g.translate(cx, cy); g.rotate(a);
        var F = P2(function (p) { p.moveTo(0, 0); p.quadraticCurveTo(L * 0.5, -wd, L, droop); p.quadraticCurveTo(L * 0.5, wd * 0.34, 0, 0); p.closePath(); });
        gouache(g, F, pal, 0, wd * 0.16);
        g.strokeStyle = pal.t; g.lineWidth = 1; g.lineCap = 'round'; g.beginPath(); g.moveTo(L * 0.14, -wd * 0.06); g.quadraticCurveTo(L * 0.5, -wd * 0.3, L * 0.86, droop * 0.7); g.stroke();
        inkStroke(g, F, 1.5); g.restore();
      }
      g.fillStyle = TK.orp; g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.arc(cx - 2.4, cy + 3.8, 2.5, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.arc(cx + 2.8, cy + 4.4, 2.3, 0, TAU); g.fill(); g.stroke();
    });
  }

  function willowSprite(px, key, r, pal, trunkCol) { // broad clumps + hanging strands
    var w = Math.ceil(r * 2.6 + 10), h = Math.ceil(r * 2.5 + 12);
    return sprite(px, key, w, h, r * 1.0, function (g, rnd) {
      g.translate(0, r * 0.02);
      trunk(g, 0, r * 0.15, r * 0.98, r * 0.3, r * 0.5, trunkCol, (rnd() - 0.5) * r * 0.1, rnd);
      groundTicks(g, r, r * 1.04, rnd);
      clump(g, 0, -r * 0.5, r * 0.58, r * 0.5, pal, rnd, 9, 2.3);
      clump(g, -r * 0.46, -r * 0.14, r * 0.5, r * 0.44, pal, rnd, 8, 2.3);
      clump(g, r * 0.46, -r * 0.1, r * 0.5, r * 0.46, pal, rnd, 8, 2.3);
      var sp = fl(mix(pal.b, '#9BD7A8', 0.35), 0.3), i, n = 8;
      for (i = 0; i < n; i++) {
        var x = -r * 0.92 + (i + 0.5) * (r * 1.84 / n) + (rnd() - 0.5) * 3, y0 = -r * 0.02 + Math.abs(x) * 0.12, len = r * (0.5 + rnd() * 0.3);
        var S = P2(function (p) { p.moveTo(x, y0); p.quadraticCurveTo(x + 2.4 + (x > 0 ? 1.5 : -1.5), y0 + len * 0.55, x + (x > 0 ? 1.2 : -1.2), y0 + len); p.quadraticCurveTo(x - 2.6, y0 + len * 0.5, x, y0); p.closePath(); });
        g.fillStyle = sp.b; g.fill(S); inkStroke(g, S, 1.3, 0.45);
      }
    });
  }

  function charredSprite(px, key, r, col, trunkCol) { // bare burnt tree: ink-dark forked limbs, embers at the foot
    var w = Math.ceil(r * 2.4 + 10), h = Math.ceil(r * 2.4 + 10);
    return sprite(px, key, w, h, r * 1.0, function (g, rnd) {
      g.translate(0, r * 0.02);
      groundTicks(g, r, r * 1.02, rnd);
      var limbs = [[0, r * 1.0, 0, -r * 0.2, r * 0.24, r * 0.12], [0, r * 0.3, -r * 0.78, -r * 0.62, r * 0.16, r * 0.08], [0, r * 0.05, r * 0.72, -r * 0.8, r * 0.16, r * 0.08], [-r * 0.04, r * 0.55, -r * 0.5, r * 0.12, r * 0.1, r * 0.06], [r * 0.04, r * 0.4, r * 0.55, -r * 0.14, r * 0.1, r * 0.06], [-r * 0.5, -r * 0.34, -r * 0.84, -r * 0.1, r * 0.07, r * 0.04], [r * 0.4, -r * 0.5, r * 0.82, -r * 0.46, r * 0.07, r * 0.04]], i;
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (i = 0; i < limbs.length; i++) { var q = limbs[i]; g.strokeStyle = INK; g.lineWidth = q[4] + 3.6; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.stroke(); }
      for (i = 0; i < limbs.length; i++) { var q2 = limbs[i]; g.strokeStyle = col; g.lineWidth = q2[4]; g.beginPath(); g.moveTo(q2[0], q2[1]); g.lineTo(q2[2], q2[3]); g.stroke(); g.strokeStyle = INK2; g.lineWidth = Math.max(1, q2[4] * 0.3); g.beginPath(); g.moveTo(q2[0] - q2[4] * 0.2, q2[1]); g.lineTo(q2[2] - q2[4] * 0.2, q2[3] + 1); g.stroke(); }
      g.fillStyle = TK.verm; g.strokeStyle = INK; g.lineWidth = 1; for (i = 0; i < 3; i++) { g.beginPath(); g.arc(-r * 0.3 + i * r * 0.28, r * (0.86 + (i % 2) * 0.06), 1.8, 0, TAU); g.fill(); g.stroke(); }
      g.fillStyle = TK.orp; g.beginPath(); g.arc(-r * 0.02, r * 0.9, 1.1, 0, TAU); g.fill();
    });
  }

  function bushSprite(px, key, r, pal, flowers) {
    var w = Math.ceil(r * 3 + 8), h = Math.ceil(r * 2.4 + 8);
    return sprite(px, key, w, h, r * 0.55, function (g, rnd) {
      groundTicks(g, r * 0.9, r * 0.66, rnd);
      clump(g, -r * 0.5, r * 0.02, r * 0.62, r * 0.55, pal, rnd, 7, 2);
      clump(g, r * 0.52, r * 0.06, r * 0.58, r * 0.52, pal, rnd, 7, 2);
      clump(g, 0, -r * 0.3, r * 0.66, r * 0.58, pal, rnd, 8, 2);
      if (flowers) for (var i = 0; i < 3; i++) { g.fillStyle = flowers[Math.floor(rnd() * flowers.length)]; g.beginPath(); g.arc((rnd() - 0.5) * r * 1.3, -r * 0.3 + (rnd() - 0.5) * r * 0.6, 1.1 + rnd() * 0.4, 0, TAU); g.fill(); }
    });
  }

  function rockSprite(px, key, r, base) {
    var w = Math.ceil(r * 2.8 + 8), h = Math.ceil(r * 2.2 + 8);
    return sprite(px, key, w, h, r * 0.3, function (g, rnd) {
      var n = 7, pts = [], i, pal = fl(base, 0.32);
      for (i = 0; i < n; i++) { var a = i * TAU / n + (rnd() - 0.5) * 0.4, d = r * (0.8 + rnd() * 0.28); pts.push([Math.cos(a) * d * 1.1, Math.sin(a) * d * 0.74 + r * 0.04]); }
      groundTicks(g, r * 1.1, r * 0.66, rnd);
      var P = P2(function (p) { pts.forEach(function (q, j) { if (j) p.lineTo(q[0], q[1]); else p.moveTo(q[0], q[1]); }); p.closePath(); });
      gouache(g, P, pal, -r * 0.34, -r * 0.2);
      tick(g, pal.t, Math.max(1.3, r * 0.1), -r * 0.62, -r * 0.1, -r * 0.5, -r * 0.46, -r * 0.1, -r * 0.5);
      g.save(); g.strokeStyle = INK; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[1][0] * 0.3, pts[1][1] * 0.2); g.lineTo(pts[2][0] * 0.62, pts[2][1] * 0.5); g.moveTo(pts[4][0] * 0.3, pts[4][1] * 0.2); g.lineTo(pts[5][0] * 0.66, pts[5][1] * 0.6); g.stroke(); g.restore();
      inkStroke(g, P, 2.2);
    });
  }

  function lavaSprite(px, key, r) { // flat vermilion pool, orpiment heart, ink contour
    var w = Math.ceil(r * 3 + 8), h = Math.ceil(r * 2 + 8);
    return sprite(px, key, w, h, r * 0.3, function (g, rnd) {
      var P = P2(function (p) { blob(p, 0, 0, r * 1.25, r * 0.62, 10, rnd); }), Q = P2(function (p) { blob(p, -r * 0.1, -r * 0.05, r * 0.7, r * 0.3, 8, rnd); });
      g.fillStyle = INK; g.save(); g.translate(1.2, 1.6); g.fill(P); g.restore();
      g.fillStyle = TK.verm; g.fill(P); g.fillStyle = TK.orp; g.fill(Q);
      tick(g, IVO, 1.3, -r * 0.5, -r * 0.14, -r * 0.3, -r * 0.24, -r * 0.05, -r * 0.2);
      inkStroke(g, P, 2.4); g.save(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(Q); g.restore();
    });
  }

  function reedSprite(px, key, r) { // swamp: a clump of cattails
    var w = Math.ceil(r * 2.2 + 8), h = Math.ceil(r * 2.4 + 8);
    return sprite(px, key, w, h, r * 0.9, function (g, rnd) {
      groundTicks(g, r * 0.9, r * 0.98, rnd);
      var i, n = 6;
      g.lineCap = 'round';
      for (i = 0; i < n; i++) {
        var x0 = -r * 0.5 + i * r * 0.2 + (rnd() - 0.5) * 3, x1 = x0 + (i - 2.5) * r * 0.1 + (rnd() - 0.5) * 3, y1 = -r * (0.7 + rnd() * 0.3);
        g.strokeStyle = INK; g.lineWidth = 3.6; g.beginPath(); g.moveTo(x0, r * 0.95); g.quadraticCurveTo(x0 + (x1 - x0) * 0.2, y1 * 0.5, x1, y1); g.stroke();
        g.strokeStyle = '#4F8F3A'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(x0, r * 0.95); g.quadraticCurveTo(x0 + (x1 - x0) * 0.2, y1 * 0.5, x1, y1); g.stroke();
        if (i % 2 === 0) { g.fillStyle = TK.bis; g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.ellipse(x1, y1 - 3, 2.1, 5, 0, 0, TAU); g.fill(); g.stroke(); }
      }
    });
  }

  function driftSprite(px, key, r) { // ice: flat ivory snow drift
    var w = Math.ceil(r * 3 + 8), h = Math.ceil(r * 1.7 + 8);
    return sprite(px, key, w, h, r * 0.2, function (g, rnd) {
      var P = P2(function (p) { cloud(p, 0, 0, r * 1.3, r * 0.5, 7, rnd, 0); });
      gouache(g, P, { b: IVO, s: '#B7C7DC', t: '#FFFFFF' }, -r * 0.3, -r * 0.14); inkStroke(g, P, 1.9);
    });
  }

  // ---- ground: flat realm colour + quiet diaper + ink tufts --------------------------------------------------------------------
  function addTuft(kind, v, x, y, rnd, A, B, C, D, E) { // three hand-drawn variants per kind; A,B,C: stroke batches; D: ink dots; E: accent dots
    var s = 0.9 + rnd() * 0.3, f = kind === 'swamp' ? 1.5 : 1;
    if (kind === 'desert') {
      if (v === 0) { A.moveTo(x - 3, y); A.quadraticCurveTo(x - 4.4 * s, y - 3, x - 6 * s, y - 4.6 * s); A.moveTo(x + 1, y); A.quadraticCurveTo(x + 2.4 * s, y - 3.4, x + 4.6 * s, y - 6 * s); }
      else if (v === 1) { D.moveTo(x - 4 + 1.1, y); D.arc(x - 4, y, 1.1, 0, TAU); D.moveTo(x + 1.1, y - 2.4); D.arc(x, y - 2.4, 1.1, 0, TAU); D.moveTo(x + 4.6 + 0.9, y + 1); D.arc(x + 4.6, y + 1, 0.9, 0, TAU); }
      else { C.moveTo(x - 6 * s, y); C.quadraticCurveTo(x - 3, y - 2.6, x, y); C.moveTo(x + 1, y + 2.6); C.quadraticCurveTo(x + 4, y, x + 7 * s, y + 2.6); }
    } else if (kind === 'ice') {
      if (v === 0) { A.moveTo(x - 3 * s, y); A.lineTo(x + 3 * s, y); A.moveTo(x, y - 3 * s); A.lineTo(x, y + 3 * s); }
      else if (v === 1) { B.moveTo(x - 4 * s, y + 1); B.lineTo(x + 4 * s, y - 1); D.moveTo(x + 0.5 + 1, y + 3.6); D.arc(x + 0.5, y + 3.6, 1, 0, TAU); }
      else { D.moveTo(x - 3 + 1, y); D.arc(x - 3, y, 1, 0, TAU); D.moveTo(x + 3 + 1, y); D.arc(x + 3, y, 1, 0, TAU); D.moveTo(x + 1, y - 3.4); D.arc(x, y - 3.4, 1, 0, TAU); }
    } else if (kind === 'volcano') {
      if (v === 0) { A.moveTo(x - 3, y + 2); A.lineTo(x - 1, y - 1.4); A.moveTo(x + 1, y + 2); A.lineTo(x + 3, y - 1.4); }
      else if (v === 1) { B.moveTo(x - 5, y); B.lineTo(x - 2, y + 2); B.lineTo(x + 1, y - 1); B.lineTo(x + 5, y + 1); }
      else { E.moveTo(x + 1.7, y); E.arc(x, y, 1.7, 0, TAU); C.moveTo(x - 3.4, y + 2.6); C.lineTo(x + 3.4, y + 2.6); }
    } else {
      if (v === 0) { A.moveTo(x - 3, y); A.quadraticCurveTo(x - 3.5, y - 3 * f, x - 4.5 * s, y - 5.5 * f * s); A.moveTo(x, y); A.quadraticCurveTo(x, y - 4 * f, x + 0.5, y - 7.5 * f * s); A.moveTo(x + 3, y); A.quadraticCurveTo(x + 3.5, y - 3 * f, x + 5 * s, y - 5.5 * f * s); }
      else if (v === 1) { B.moveTo(x - 2, y); B.quadraticCurveTo(x - 2.5, y - 3 * f, x - 3.5 * s, y - 5.5 * f * s); B.moveTo(x + 1.5, y); B.quadraticCurveTo(x + 2, y - 3.5 * f, x + 3.5 * s, y - 6.5 * f * s); if (kind === 'forest' && (rnd() < 0.5)) { E.moveTo(x + 5.5 + 1.3, y - 0.5); E.arc(x + 5.5, y - 0.5, 1.3, 0, TAU); } else { D.moveTo(x + 5.5 + 1.1, y - 0.5); D.arc(x + 5.5, y - 0.5, 1.1, 0, TAU); } }
      else if (kind === 'swamp') { C.moveTo(x - 6, y); C.quadraticCurveTo(x - 3, y - 2.4, x, y); C.quadraticCurveTo(x + 3, y + 2.4, x + 6, y); }
      else { C.moveTo(x - 5 * s, y); C.quadraticCurveTo(x, y + 2.2, x + 5 * s, y); C.moveTo(x - 2, y + 0.6); C.lineTo(x - 2.4, y - 3); C.moveTo(x + 2, y + 0.6); C.lineTo(x + 2.2, y - 3.4); }
    }
  }
  function tufts(g, c) { // <= TUFT_MAX hand-drawn ink tufts on a jittered grid (quiet, even), skipping roads/water/other keep-outs
    var A = new Path2D(), B = new Path2D(), C = new Path2D(), D = new Path2D(), E = new Path2D(), cell = c.cell || 40, n = 0, x, y, tx, ty, rnd = c.rnd, kind = c.kind;
    for (y = c.y0; y < c.y1 && n < TUFT_MAX; y += cell) for (x = c.x0 - cell * 0.5; x < c.x1 && n < TUFT_MAX; x += cell) {
      if (rnd() > c.keep) continue;
      tx = x + rnd() * cell; ty = y + rnd() * cell;
      if (tx < 4 || tx > c.W - 4 || ty < c.y0 || ty > c.y1) continue;
      if (c.avoid && c.avoid(tx, ty)) continue;
      addTuft(kind, Math.floor(rnd() * 3), tx, ty, rnd, A, B, C, D, E); n++;
    }
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 1.5; g.strokeStyle = INK; g.globalAlpha = 0.66;
    g.stroke(A); g.stroke(B); g.stroke(C); g.fillStyle = INK; g.fill(D);
    g.globalAlpha = 0.9; g.fillStyle = kind === 'volcano' ? TK.verm : (c.theme === 5 ? '#C4621F' : TK.orp); g.fill(E);
    g.restore();
    return n;
  }
  function groundLayer(g, c) {
    var W = c.W, H = c.H;
    g.fillStyle = ground(c.theme); g.fillRect(0, 0, W, H);
    var pat = ART.pattern ? ART.pattern(g, 'r' + c.theme, 1) : null;
    if (pat) { g.save(); g.globalAlpha = DIAPER_A; g.fillStyle = pat; g.fillRect(0, 0, W, H); g.restore(); }
    return tufts(g, c);
  }

  // ---- ground decals that make a realm recognisable at a glance: lava cracks (volcano), sand dunes (desert) ------------------------------------
  function crackDecal(g, x, y, len, rnd) { // ink-edged vermilion zig-zag with an orpiment spark
    var pts = [[x, y]], a = rnd() * TAU, n = 4 + Math.floor(rnd() * 3), i, st;
    for (i = 0; i < n; i++) { a += (rnd() - 0.5) * 1.7; st = len / n * (0.7 + rnd() * 0.6); pts.push([pts[i][0] + Math.cos(a) * st, pts[i][1] + Math.sin(a) * st]); }
    var P = P2(function (p) { p.moveTo(pts[0][0], pts[0][1]); for (i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); });
    var B = P2(function (p) { var m = pts[2 + Math.floor(rnd() * 2)], b = a + (rnd() < 0.5 ? 1 : -1) * (0.9 + rnd() * 0.5); p.moveTo(m[0], m[1]); p.lineTo(m[0] + Math.cos(b) * len * 0.3, m[1] + Math.sin(b) * len * 0.3); });
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = INK; g.lineWidth = 4.6; g.stroke(P); g.stroke(B);
    g.strokeStyle = TK.verm; g.lineWidth = 2.2; g.stroke(P); g.stroke(B);
    g.strokeStyle = TK.orp; g.lineWidth = 0.8; g.stroke(P);
    g.restore();
  }
  function duneDecal(g, x, y, rx, ry, theme) { // a low dune: a lighter lobe, hard shade on the lee side, ink on the crest only
    var gr = ground(theme), pal = { b: mix(gr, IVO, 0.3), s: mix(gr, '#8A5E22', 0.3), t: IVO };
    var P = P2(function (p) { p.moveTo(x - rx, y); p.bezierCurveTo(x - rx * 0.7, y - ry * 1.5, x + rx * 0.2, y - ry * 1.55, x + rx, y); p.quadraticCurveTo(x, y + ry * 0.35, x - rx, y); });
    gouache(g, P, pal, -rx * 0.2, -ry * 0.12); inkStroke(g, P, 2);
  }
  function decals(g, c) {
    var n = c.n, tries = 0, x, y, k = c.kind;
    if (k !== 'volcano' && k !== 'desert') return;
    while (n > 0 && tries++ < n * 14) {
      x = c.x0 + c.rnd() * (c.x1 - c.x0); y = c.y0 + c.rnd() * (c.y1 - c.y0);
      if (c.avoid && c.avoid(x, y)) continue;
      if (k === 'volcano') crackDecal(g, x, y, 26 + c.rnd() * 26, c.rnd); else duneDecal(g, x, y, c.big ? 36 + c.rnd() * 34 : 20 + c.rnd() * 16, c.big ? 12 + c.rnd() * 6 : 7 + c.rnd() * 4, c.theme);
      n--;
    }
  }

  // ---- horizon: gold-leaf diaper band, ink hill line ------------------------------------------------------------------------------
  function domeY(q, y1, x) { // y of a round hill's dome at x (cubic samples), or null outside its span
    var j = q.j * q.w * 0.5, X0 = q.x - q.w, X1 = q.x - q.w * 1.02, X2 = q.x + q.w * 1.02 + j, X3 = q.x + q.w, Y1 = y1 - q.h * 1.34, t, u, px0 = X0, py0 = y1, px1, py1, bx, by;
    if (x < X0 || x > X3) return null;
    for (t = 0.04; t <= 1.0001; t += 0.04) {
      u = 1 - t; bx = u * u * u * X0 + 3 * u * u * t * X1 + 3 * u * t * t * X2 + t * t * t * X3; by = u * u * u * y1 + 3 * u * u * t * Y1 + 3 * u * t * t * Y1 + t * t * t * y1; px1 = bx; py1 = by;
      if (x <= px1 && px1 > px0) return py0 + (py1 - py0) * (x - px0) / (px1 - px0);
      px0 = px1; py0 = py1;
    }
    return null;
  }
  function ridge(g, c, y1, o) { // a row of overlapping hills/peaks/dunes, each its own flat shape with an ink contour (taller ones sit behind)
    var rnd = o.rnd, W = c.W, hills = [], x = -50 + rnd() * 20, i;
    while (x < W + 60) { var w = o.w0 + rnd() * (o.w1 - o.w0); hills.push({ x: x + w / 2, w: w / 2, h: o.h0 + rnd() * (o.h1 - o.h0), j: (rnd() - 0.5) * 0.5 }); x += w * (0.56 + rnd() * 0.22); }
    hills.sort(function (a, b) { return b.h - a.h; });
    for (i = 0; i < hills.length; i++) {
      var q = hills[i], xc = q.x, w2 = q.w, h2 = q.h, P, pal = fl(o.col, 0.3);
      if (o.shape === 'peak') {
        var ax = xc + q.j * w2, ay = y1 - h2, k1 = [xc - w2 * 0.46 + (rnd() - 0.5) * 5, y1 - h2 * (0.52 + rnd() * 0.1)], k2 = [xc + w2 * 0.5 + (rnd() - 0.5) * 5, y1 - h2 * (0.4 + rnd() * 0.12)];
        P = P2(function (p) { p.moveTo(xc - w2, y1); p.lineTo(k1[0], k1[1]); p.lineTo(ax - w2 * 0.06, ay + h2 * 0.06); p.lineTo(ax, ay); p.lineTo(ax + w2 * 0.1, ay + h2 * 0.1); p.lineTo(k2[0], k2[1]); p.lineTo(xc + w2, y1); });
        g.fillStyle = pal.b; g.fill(P);
        var Sh = P2(function (p) { p.moveTo(ax, ay); p.lineTo(ax + w2 * 0.1, ay + h2 * 0.1); p.lineTo(k2[0], k2[1]); p.lineTo(xc + w2, y1); p.lineTo(xc + w2 * 0.06, y1); p.lineTo(ax - w2 * 0.02, ay + h2 * 0.4); p.closePath(); });
        g.save(); g.clip(P); g.fillStyle = pal.s; g.fill(Sh);
        if (o.snow) { var cy = ay + h2 * 0.42, Cp = P2(function (p) { p.moveTo(ax, ay - 1); p.lineTo(ax + w2 * 0.34, cy + 1); p.lineTo(ax + w2 * 0.2, cy - 3); p.lineTo(ax + w2 * 0.05, cy + 3); p.lineTo(ax - w2 * 0.1, cy - 2.4); p.lineTo(ax - w2 * 0.24, cy + 3); p.lineTo(ax - w2 * 0.4, cy + 1); p.closePath(); }); g.fillStyle = IVO; g.fill(Cp); g.save(); g.clip(Cp); g.fillStyle = '#C9D6E6'; g.fill(Sh); g.restore(); g.strokeStyle = INK; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke(Cp); }
        g.restore();
      } else {
        P = P2(function (p) { p.moveTo(xc - w2, y1); p.bezierCurveTo(xc - w2 * 1.02, y1 - h2 * 1.34, xc + w2 * 1.02 + q.j * w2 * 0.5, y1 - h2 * 1.34, xc + w2, y1); });
        gouache(g, P, pal, -w2 * 0.2, -h2 * 0.06);
      }
      inkStroke(g, P, o.inkW || 2.6);
      if (o.out && o.shape !== 'peak') o.out.push(q);
    }
  }
  function strokeLine(g, pts, w) { var P = P2(function (p) { smooth(p, pts, true); }); inkStroke(g, P, w); }
  function horizon(g, c) { // c: W, y0 (band top; a lapis page margin fills above it), y1 (hill base), theme, kind, rnd, px
    var W = c.W, y0 = c.y0, y1 = c.y1, theme = c.theme, kind = c.kind, rnd = c.rnd, th = TH[theme], night = theme === 6, band = th.band, i, x, bh = y1 - y0, out = [];
    var padd = function (name, ya, yb) { var pt = ART.pattern ? ART.pattern(g, name, 1) : null; g.fillStyle = pt || (name === 'gold' ? TK.leaf : TK.lapisd); g.fillRect(-2, ya, W + 4, yb - ya); };
    if (y0 > 4) padd('lapis', 0, y0 + 2);
    padd(band === 'lapis' ? 'lapis' : 'gold', y0, y1 + 2);
    if (y0 > 4 && !night) { var pts = []; for (x = -10; x <= W + 10; x += 24) pts.push([x, y0 + Math.sin(x * 0.05 + 1) * 0.5 + (rnd() - 0.5) * 0.9]); strokeLine(g, pts, 3.2); }
    var gr = ground(theme), yb = y1 + 2;
    if (kind === 'ice') {
      ridge(g, c, yb, { rnd: rnd, w0: 70, w1: 120, h0: bh * 0.3, h1: bh * 0.7, col: '#9FB3CC', shape: 'peak', snow: true, inkW: 2.6 });
      ridge(g, c, yb, { rnd: rnd, w0: 70, w1: 130, h0: bh * 0.08, h1: bh * 0.2, col: mix(gr, IVO, 0.2), shape: 'round', inkW: 2.6 });
    } else if (kind === 'volcano') {
      ridge(g, c, yb, { rnd: rnd, w0: 110, w1: 180, h0: bh * 0.09, h1: bh * 0.22, col: '#8A6A5C', shape: 'round', inkW: 2.6 });
      var cones = [[W * 0.22, bh * 0.58], [W * 0.72, bh * 0.7]];
      cones.forEach(function (cn, ci) {
        var bx = cn[0], hh = cn[1], gy = y1 - hh, cw = 12 + hh * 0.04, hw2 = hh * 1.15;
        var P = P2(function (p) { p.moveTo(bx - hw2, y1 + 2); p.lineTo(bx - cw * 1.1, gy + 3); p.lineTo(bx - cw, gy); p.lineTo(bx + cw, gy); p.lineTo(bx + cw * 1.1, gy + 3); p.lineTo(bx + hw2, y1 + 2); });
        g.fillStyle = '#5A3B30'; g.fill(P);
        g.save(); g.clip(P); g.fillStyle = '#3A2620'; g.beginPath(); g.moveTo(bx + 4, gy); g.lineTo(bx + hw2, y1 + 2); g.lineTo(bx + 2, y1 + 2); g.closePath(); g.fill();
        g.lineCap = 'round'; g.lineJoin = 'round'; // lava streams: ink edge, vermilion body, orpiment core
        [[-6, 0.5], [7, 0.34]].forEach(function (st, si) {
          var sp = [[bx + st[0], gy + 2], [bx + st[0] * 1.8 + (si ? 4 : -3), gy + hh * 0.33], [bx + st[0] * 2.6 + (si ? -2 : 5), gy + hh * 0.62], [bx + st[0] * 3.4 + (si ? 5 : -4), gy + hh * (0.88 * st[1] + 0.3)]];
          var L = P2(function (p) { smooth(p, sp, true); });
          g.strokeStyle = INK; g.lineWidth = 6.4; g.stroke(L); g.strokeStyle = TK.verm; g.lineWidth = 3.6; g.stroke(L); g.strokeStyle = TK.orp; g.lineWidth = 1.3; g.stroke(L);
        });
        g.restore();
        inkStroke(g, P, 2.6);
        g.fillStyle = TK.orp; g.beginPath(); g.ellipse(bx, gy, cw, 4.2, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.8; g.stroke();
        for (var sm = 0; sm < 3; sm++) { var Sp = P2(function (p) { cloud(p, bx + 6 + sm * 9 + ci * 3, gy - 14 - sm * 15, 10 + sm * 4, 7 + sm * 3, 7, rnd, sm); }); gouache(g, Sp, { b: TK.arg, s: '#9AA3B2', t: IVO }, -3, -2); inkStroke(g, Sp, 1.9); }
      });
    } else if (kind === 'desert') {
      ridge(g, c, yb, { rnd: rnd, w0: 150, w1: 260, h0: bh * 0.1, h1: bh * 0.24, col: '#DDBB7C', shape: 'round', inkW: 2.6, out: out });
      ridge(g, c, yb, { rnd: rnd, w0: 130, w1: 220, h0: bh * 0.05, h1: bh * 0.13, col: mix(gr, '#C79F58', 0.35), shape: 'round', inkW: 2.6, out: out });
    } else if (kind === 'swamp') {
      ridge(g, c, yb, { rnd: rnd, w0: 90, w1: 150, h0: bh * 0.12, h1: bh * 0.28, col: '#A5B07F', shape: 'round', inkW: 2.6, out: out });
      ridge(g, c, yb, { rnd: rnd, w0: 90, w1: 150, h0: bh * 0.05, h1: bh * 0.13, col: mix(gr, '#3C8F6A', 0.2), shape: 'round', inkW: 2.6, out: out });
    } else if (night) {
      ridge(g, c, yb, { rnd: rnd, w0: 100, w1: 170, h0: bh * 0.14, h1: bh * 0.36, col: '#3C3470', shape: 'round', inkW: 2.6 });
      ridge(g, c, yb, { rnd: rnd, w0: 100, w1: 170, h0: bh * 0.05, h1: bh * 0.16, col: mix(gr, '#2A2458', 0.25), shape: 'round', inkW: 2.6 });
      // heraldic night: an orpiment crescent and mullets on the lapis band
      var cxm = W * 0.78, cym = y0 + Math.max(24, bh * 0.3), Cr = P2(function (p) { p.arc(cxm, cym, 15, 0.55 * Math.PI, 1.55 * Math.PI, false); p.arc(cxm - 7, cym - 1.5, 12, 1.5 * Math.PI, 0.6 * Math.PI, true); p.closePath(); });
      g.fillStyle = TK.orp; g.fill(Cr); inkStroke(g, Cr, 1.8);
      for (i = 0; i < 16; i++) { var sx = rnd() * W, sy = y0 + 8 + rnd() * Math.max(10, bh * 0.45), sr = 2.4 + rnd() * 2.2, St = P2(function (p) { for (var q = 0; q < 12; q++) { var a = -Math.PI / 2 + q * Math.PI / 6, rr = q % 2 ? sr * 0.45 : sr; if (q) p.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); else p.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } p.closePath(); }); g.fillStyle = TK.orp; g.fill(St); }
    } else { // forest and autumn: rolling hills with a row of tiny trees on the ridge line
      ridge(g, c, yb, { rnd: rnd, w0: 100, w1: 170, h0: bh * 0.27, h1: bh * 0.6, col: th.far, shape: 'round', inkW: 2.6, out: out });
      ridge(g, c, yb, { rnd: rnd, w0: 110, w1: 180, h0: bh * 0.1, h1: bh * 0.24, col: mix(gr, IVO, 0.1), shape: 'round', inkW: 2.6, out: out });
    }
    // tiny trees standing on the silhouette (same flat sprites, small)
    if (out.length && c.px) {
      var nT = Math.round(W / 46), tx, ty, best, h, yy, fa;
      for (i = 0; i < nT; i++) {
        tx = 10 + rnd() * (W - 20); best = 1e9;
        for (h = 0; h < out.length; h++) { yy = domeY(out[h], yb, tx); if (yy !== null && yy < best) best = yy; }
        if (best > yb - 8) continue;
        fa = floraFor(kind, theme, kind === 'desert' ? rnd() * 0.3 : kind === 'swamp' ? rnd() * 0.5 : 0.4 + rnd() * 0.6, Math.floor(rnd() * 3), 8 + rnd() * 3, c.px);
        drawSprite(g, c.px, fa.s, tx, best - fa.s.foot + 4, rnd() < 0.5);
      }
    }
    var gl = []; for (x = -10; x <= W + 10; x += 24) gl.push([x, y1 + 1 + (rnd() - 0.5) * 0.8]); strokeLine(g, gl, 3); // ground line under the hills
  }

  // ---- flora picking (lane strips and field forests share it) ---------------------------------------------------------------------
  function qr(r) { return Math.max(6, Math.round(r / 3) * 3); }
  function floraFor(kind, theme, t, v, r, px) { // -> { s: sprite, special: 'lava'|null }
    var th = TH[theme], rq = qr(r), key, p1, p2, snow = kind === 'ice';
    if (kind === 'desert') {
      if (t < 0.34) return { s: palmSprite(px, 'pa' + rq + '_' + v, rq, th.palm, th.trunk) };
      if (t < 0.68) return { s: broadSprite(px, 'ol' + rq + '_' + v, rq * 0.82, fl(th.leaf), fl(th.leaf2), '#6B4A2C', { alt: v & 1 }) };
      return { s: rockSprite(px, 'rk1_' + rq + '_' + v, rq * 0.8, th.rock) };
    }
    if (kind === 'volcano') {
      if (t < 0.45) return { s: charredSprite(px, 'ch' + rq + '_' + v, rq, th.leaf, th.trunk) };
      if (t < 0.86) return { s: rockSprite(px, 'rk3_' + rq + '_' + v, rq * 0.88, th.rock) };
      return { s: lavaSprite(px, 'lv' + rq + '_' + v, rq * 0.9), special: 'lava' };
    }
    if (kind === 'swamp') {
      if (t < 0.52) return { s: willowSprite(px, 'wl' + rq + '_' + v, rq, fl(th.leaf), th.trunk) };
      if (t < 0.8) return { s: broadSprite(px, 'bs' + rq + '_' + v, rq * 0.88, fl(th.leaf2), fl(th.leaf), th.trunk, { alt: v & 1 }) };
      return { s: reedSprite(px, 'rd' + rq + '_' + v, rq * 0.9) };
    }
    if (kind === 'ice') {
      if (t < 0.7) return { s: firSprite(px, 'fi' + rq + '_' + v, rq, fl(th.leaf, 0.3), true, th.trunk) };
      if (t < 0.84) return { s: rockSprite(px, 'rk2_' + rq + '_' + v, rq * 0.8, th.rock) };
      return { s: driftSprite(px, 'dr' + rq + '_' + v, rq * 0.8) };
    }
    // forest, autumn, night: broadleaf three-clump trees, some conifers
    var conShare = theme === 5 ? 0.16 : theme === 6 ? 0.4 : 0.3;
    if (t < conShare) return { s: firSprite(px, 'fo' + theme + '_' + rq + '_' + v, rq, fl(th.con, 0.34), false, th.trunk) };
    return { s: broadSprite(px, 'br' + theme + '_' + rq + '_' + v, rq, fl(th.leaf), fl(th.leaf2), th.trunk, { alt: v & 1 }) };
  }

  // ---- water: flat colour with ivory wavy bands, ink banks -------------------------------------------------------------------------
  function waterTones(theme, kind) {
    if (kind === 'volcano') return { body: TK.verm, band: TK.orp, deep: '#B22D17' };
    if (kind === 'ice') return { body: '#9CC4E8', band: IVO, deep: '#7FAAD6' };
    if (kind === 'swamp') return { body: '#3FA58C', band: IVO, deep: '#2E8764' };
    if (theme === 6) return { body: TK.lapis, band: TK.arg, deep: '#1B2F78' };
    return { body: TK.azur, band: IVO, deep: '#3866AE' };
  }
  function wavyBand(g, x0, x1, y, amp, wl, ph, w, col) {
    var pts = [], x;
    for (x = x0; x <= x1 + wl / 4; x += wl / 4) pts.push([x, y + Math.sin(x / wl * TAU + ph) * amp]);
    g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(P2(function (p) { smooth(p, pts, true); })); g.restore();
  }
  function pond(g, x, y, rx, ry, theme, kind, rnd) {
    var wt = waterTones(theme, kind), P = P2(function (p) { blob(p, x, y, rx, ry, 11, rnd); }), i;
    gouache(g, P, { b: wt.body, s: wt.deep }, -rx * 0.12, -ry * 0.22);
    g.save(); g.clip(P);
    for (i = 0; i < 3; i++) wavyBand(g, x - rx - 6, x + rx + 6, y - ry * 0.55 + i * ry * 0.55, 1.8, 15 + i * 3, rnd() * 6, 2.2, wt.band);
    g.restore();
    inkStroke(g, P, 3);
    if (kind === 'swamp') { // lily pads
      for (i = 0; i < 4; i++) { var lx = x + (rnd() - 0.5) * rx * 1.1, ly = y + (rnd() - 0.5) * ry * 0.9, Lp = P2(function (p) { p.moveTo(lx, ly); p.arc(lx, ly, 4.6, 0.35, TAU - 0.35); p.closePath(); }); g.fillStyle = TK.mal; g.fill(Lp); inkStroke(g, Lp, 1.4, 0.4); }
    }
    if (kind === 'volcano' || kind === 'ice') return;
    var T = P2(function (p) { for (var k = 0; k < 8; k++) { var a = rnd() * TAU, ex = x + Math.cos(a) * (rx + 4), ey = y + Math.sin(a) * (ry + 3); p.moveTo(ex - 2.2, ey); p.lineTo(ex, ey - 4.6 - rnd() * 2); p.moveTo(ex + 2, ey); p.lineTo(ex + 0.4, ey - 3.6); } });
    g.save(); g.strokeStyle = INK; g.lineWidth = 1.6; g.lineCap = 'round'; g.globalAlpha = 0.8; g.stroke(T); g.restore();
  }

  // ==============================================================================================================================
  // LANE SCENE (three roads between the enemy castle and our camp)
  // ==============================================================================================================================
  function laneRoad(g, self, i, rnd) { // flat #E3CFA0 road, 3u ink edges (hand wobble 0.7u), same outline as R.roadPath(hw 61)
    var y0 = self.eY - CASTLE_H + 20, y1 = self.pY + CASTLE_H - 20, step = 12, L = [], Rr = [], y, w, cx;
    var jit = function () { return (rnd() + rnd() - 1) * 0.7; };
    for (y = y0; y <= y1; y += step) { w = 61 + 5 * Math.sin(y * 0.021 + i * 1.3); cx = self.roadX(i, y); L.push([cx - w + jit(), y]); Rr.push([cx + w + jit(), y]); }
    var Rrev = Rr.slice().reverse();
    var F = P2(function (p) { smooth(p, L, true); smooth(p, Rrev, false); p.closePath(); });
    g.fillStyle = ROAD; g.fill(F);
    inkStroke(g, P2(function (p) { smooth(p, L, true); }), 3);
    inkStroke(g, P2(function (p) { smooth(p, Rr, true); }), 3);
    inkStroke(g, P2(function (p) { p.moveTo(L[0][0], L[0][1]); p.lineTo(Rr[0][0], Rr[0][1]); p.moveTo(L[L.length - 1][0], L[L.length - 1][1]); p.lineTo(Rr[Rr.length - 1][0], Rr[Rr.length - 1][1]); }), 3);
    if (ROAD_RULE) { // pricked dots, 8u inside both edges
      var at = function (arr, yy) { var k = Math.max(0, Math.min(arr.length - 2, Math.floor((yy - arr[0][1]) / step))); var a = arr[k], b = arr[k + 1]; return a[0] + (b[0] - a[0]) * (yy - a[1]) / (b[1] - a[1]); };
      var D = P2(function (p) { for (var yy = y0 + 28; yy < y1 - 24; yy += 11) { var xl = at(L, yy) + 8.5, xr = at(Rr, yy) - 8.5; p.moveTo(xl + 1.05, yy); p.arc(xl, yy, 1.05, 0, TAU); p.moveTo(xr + 1.05, yy); p.arc(xr, yy, 1.05, 0, TAU); } });
      g.save(); g.fillStyle = INK2; g.globalAlpha = 0.55; g.fill(D); g.restore();
    }
  }

  function build() {
    var c = document.createElement('canvas'); c.width = this.canvas.width; c.height = this.canvas.height;
    var g = c.getContext('2d'), W = this.W, H = this.H, ox = this.ox, i, j, k, self = this, px = this.px;
    var theme = this.theme || 0, T = THEMES[theme], kind = T.kind, seed = this.seed || 1, th = TH[theme], rnd = rng(seed * 31 + theme * 7 + 5), t0 = now();
    this.phase = ((seed || 1) % 7) * 0.9;
    g.setTransform(px, 0, 0, px, 0, 0);
    var top = this.eY - CASTLE_H, bot = this.pY + CASTLE_H;
    var nearRoad = function (x, y, m) { for (var l = 0; l < 3; l++) if (Math.abs(x - self.roadX(l, y)) < m) return true; return false; };

    // ponds / lava pools (ground decals) first so the tufts can avoid them
    var ponds = [];
    if (rnd() < 0.7) ponds.push([ox + 240 + (rnd() - 0.5) * 16, top + 230 + rnd() * 250, 36, 22]);
    if (rnd() < 0.55) ponds.push([ox + 480 + (rnd() - 0.5) * 16, top + 420 + rnd() * 290, 34, 21]);
    var inPond = function (x, y) { for (var q = 0; q < ponds.length; q++) { var pd = ponds[q]; if (Math.pow((x - pd[0]) / (pd[2] + 10), 2) + Math.pow((y - pd[1]) / (pd[3] + 9), 2) < 1) return true; } return false; };

    // 1) ground
    var nTuft = groundLayer(g, { W: W, H: H, x0: 0, x1: W, y0: top + 30, y1: H - 6, cell: 38, keep: 0.62, rnd: rnd, kind: kind, theme: theme, avoid: function (x, y) { return nearRoad(x, y, 72) || inPond(x, y); } });
    decals(g, { kind: kind, theme: theme, rnd: rnd, n: kind === 'volcano' ? 16 : 9, x0: 4, x1: W - 4, y0: top + 60, y1: bot + 110, avoid: function (x, y) { return nearRoad(x, y, 70) || inPond(x, y); } });
    // 2) horizon
    horizon(g, { W: W, y0: 0, y1: top + 14, theme: theme, kind: kind, rnd: rnd, px: px });
    for (i = 0; i < ponds.length; i++) pond(g, ponds[i][0], ponds[i][1], ponds[i][2], ponds[i][3], theme, kind, rnd);
    // 3) roads
    for (i = 0; i < 3; i++) laneRoad(g, this, i, rnd);

    // 4) flora: staggered trees in the strips between the roads, bushes on the verges, rocks (all back-to-front)
    var strips = [[0, 52], [188, 292], [428, 532], [668, 720]], items = [];
    var addStrip = function (x0, x1, mul, stepY, y1b) {
      var wd = x1 - x0, y = top + 36 + rnd() * 18;
      while (y < y1b) {
        var cnt = wd > 90 ? (rnd() < 0.55 ? 2 : 1) : 1;
        for (var q = 0; q < cnt; q++) {
          var r = (14 + rnd() * 11) * mul, cx = cnt === 2 ? (q ? x0 + wd * (0.62 + rnd() * 0.22) : x0 + wd * (0.14 + rnd() * 0.22)) : x0 + wd * (0.22 + rnd() * 0.56);
          cx = Math.max(x0 + r * 0.45, Math.min(x1 - r * 0.45, cx));
          var yy = y + rnd() * 14; if (inPond(cx, yy)) continue;
          items.push({ x: cx, y: yy, r: r, t: rnd(), v: Math.floor(rnd() * 3), kind: 'tree' });
        }
        y += stepY + rnd() * 12;
      }
    };
    for (j = 0; j < strips.length; j++) addStrip(ox + strips[j][0] - (j === 0 ? 14 : 0), ox + strips[j][1] + (j === 3 ? 14 : 0), (j === 0 || j === 3) ? 0.86 : 1, 33, bot + 60);
    if (ox > 2) { addStrip(-16, ox + 8, 1.1, 34, bot + 60); addStrip(ox + DW - 8, W + 16, 1.1, 34, bot + 60); }
    var flowersOn = th.flowers;
    for (i = 0; i < 3; i++) for (var yb = this.eY + 14; yb < this.pY - 10; yb += 46 + rnd() * 40) for (k = -1; k <= 1; k += 2) {
      if (rnd() < 0.62) continue;
      var bxx = this.roadX(i, yb) + k * (71 + rnd() * 12), byy = yb + rnd() * 14;
      if (kind === 'volcano' || kind === 'ice' || kind === 'desert') items.push({ x: bxx, y: byy, r: 5 + rnd() * 5, kind: 'rock', v: Math.floor(rnd() * 2) });
      else items.push({ x: bxx, y: byy, r: 6 + rnd() * 5, kind: 'bush', v: Math.floor(rnd() * 2) });
    }
    for (i = 0; i < 9; i++) {
      var rx3 = ox + strips[1 + Math.floor(rnd() * 2)][0] + 14 + rnd() * 76, ry3 = top + 110 + rnd() * (bot - top - 220);
      if (!inPond(rx3, ry3)) items.push({ x: rx3, y: ry3, r: 6 + rnd() * 6, kind: 'rock', v: Math.floor(rnd() * 3) });
    }
    items.forEach(function (it) {
      var s;
      if (it.kind === 'tree') { var fa = floraFor(kind, theme, it.t, it.v, it.r, px); it.s = fa.s; }
      else if (it.kind === 'bush') it.s = bushSprite(px, 'bu' + theme + '_' + qr(it.r) + '_' + it.v, qr(it.r), fl(th.bush, 0.34), flowersOn);
      else it.s = rockSprite(px, 'rkb' + theme + '_' + qr(it.r) + '_' + it.v, qr(it.r), th.rock);
      it.sy = it.y + it.s.foot;
    });
    items.sort(function (a, b) { return a.sy - b.sy; });
    for (i = 0; i < items.length; i++) drawSprite(g, px, items[i].s, items[i].x, items[i].y, (items[i].v & 1) === 1 && items[i].kind !== 'bush' ? true : false);

    this.bg = c;
    R.Scenery.stats = { kind: 'lane', theme: theme, tufts: nTuft, flora: items.length, ms: Math.round((now() - t0) * 10) / 10 };
  }

  // ==============================================================================================================================
  // FIELD SCENE (open battle in front of the castle: road, river with fords, hills, forests, rocks)
  // ==============================================================================================================================
  function field() {
    var b = this.battle, map = b.map, W = this.W, H = this.H, px = this.px, theme = this.theme || 0, T = THEMES[theme], kind = T.kind, th = TH[theme];
    var seed = this.seed || 1, rnd = rng(seed * 29 + theme * 11 + 3), t0 = now(), fx = this.fox, fy = this.foy, FW = Z.FW, FH = Z.FH, i, j, k;
    var cv = document.createElement('canvas'); cv.width = this.canvas.width; cv.height = this.canvas.height;
    var g = cv.getContext('2d'); g.setTransform(px, 0, 0, px, 0, 0);
    var top = fy - 6;

    // road (two camps joined; through the nearest ford when a river crosses): same control points as before
    var s1 = (rnd() - 0.5) * 140, s2 = (rnd() - 0.5) * 160, mx = 360 + s1, my = FH * 0.5;
    var pts = [[360, FH - 4], [360 - s1 * 0.5, FH * 0.78], [mx, my], [360 + s2 * 0.5, FH * 0.22], [360, 6]];
    if (map.river) { var gp = map.river.gaps, gc = gp.map(function (q) { return (q.x0 + q.x1) / 2; }), best = Math.abs(gc[0] - 360) < Math.abs(gc[1] - 360) ? gc[0] : gc[1]; pts[2] = [best, map.river.y]; }
    var poly = [], q2, tt; // samples of the same curve (keep-out for tufts and scatter)
    (function () {
      var a = pts[0], m;
      for (q2 = 1; q2 < pts.length; q2++) { m = [(pts[q2 - 1][0] + pts[q2][0]) / 2, (pts[q2 - 1][1] + pts[q2][1]) / 2]; for (tt = 0; tt < 1; tt += 0.05) { var u = 1 - tt; poly.push([u * u * a[0] + 2 * u * tt * pts[q2 - 1][0] + tt * tt * m[0], u * u * a[1] + 2 * u * tt * pts[q2 - 1][1] + tt * tt * m[1]]); } a = m; }
      poly.push(pts[pts.length - 1]);
    })();
    var nearPoly = function (x, y, m) { for (var q = 0; q < poly.length; q++) if (Math.abs(poly[q][1] - y) < m && Math.abs(poly[q][0] - x) < m) return true; return false; };
    var rv = map.river, riverNear = function (y, m) { return rv && Math.abs(y - rv.y) < rv.hw + m; };
    var hitObj = function (x, y) { var q; for (q = 0; q < map.forests.length; q++) if (Math.hypot(map.forests[q].x - x, map.forests[q].y - y) < map.forests[q].r + 6) return true; for (q = 0; q < map.hills.length; q++) if (Math.hypot(map.hills[q].x - x, map.hills[q].y - y) < map.hills[q].r + 6) return true; for (q = 0; q < map.rocks.length; q++) if (Math.hypot(map.rocks[q].x - x, map.rocks[q].y - y) < map.rocks[q].r + 8) return true; return false; };

    // 1) ground over the whole canvas (the world sits at fx, fy); tufts live in world coordinates
    g.save(); g.translate(fx, fy);
    var nT = groundLayerField(g, { W: FW, H: H, theme: theme, kind: kind, rnd: rnd, avoid: function (x, y) { return nearPoly(x, y, 44) || riverNear(y, 12) || hitObj(x, y); }, fx: fx, fy: fy, FW: FW, FH: FH, cvW: W, cvH: H });
    g.save(); g.translate(fx, fy); decals(g, { kind: kind, theme: theme, rnd: rnd, n: kind === 'volcano' ? 12 : 7, big: true, x0: 24, x1: FW - 24, y0: 80, y1: FH - 60, avoid: function (x, y) { return nearPoly(x, y, 56) || riverNear(y, 24) || hitObj(x, y); } }); g.restore();
    g.restore();
    // 2) horizon: lapis page margin above, gold band (110u) with the ink hill line right above the enemy wall
    var y1 = top + 14, y0 = Math.max(0, y1 - 14 - 110);
    horizon(g, { W: W, y0: y0, y1: y1, theme: theme, kind: kind, rnd: rnd, px: px });

    g.save(); g.translate(fx, fy);
    // 3) road: ink 64u under sand 58u (3u ink edges)
    var road = function (w, col, dx, dy, ext) { // ext: the ink pass runs 3u past both ends so the road ends in an ink edge too
      var X = dx || 0, Y = dy || 0, e = ext || 0, a0 = [pts[0][0], pts[0][1] + e], a1 = [pts[pts.length - 1][0], pts[pts.length - 1][1] - e];
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'butt'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(a0[0] + X, a0[1] + Y); g.lineTo(pts[0][0] + X, pts[0][1] + Y);
      for (var q = 1; q < pts.length; q++) { var m = [(pts[q - 1][0] + pts[q][0]) / 2 + X, (pts[q - 1][1] + pts[q][1]) / 2 + Y]; g.quadraticCurveTo(pts[q - 1][0] + X, pts[q - 1][1] + Y, m[0], m[1]); }
      g.lineTo(pts[pts.length - 1][0] + X, pts[pts.length - 1][1] + Y); g.lineTo(a1[0] + X, a1[1] + Y); g.stroke();
    };
    g.save(); g.globalAlpha = 0.6; road(64, INK2, 0.6, 0.6, 3); g.restore(); road(64, INK, 0, 0, 3); road(58, ROAD, 0, 0, 0);
    if (ROAD_RULE) { // pricked dots 8u inside both edges, evenly spaced along the centre curve
      var D = new Path2D(), acc = 0, q3, ax, ay, bx, by2, sl, nx, ny;
      for (q3 = 1; q3 < poly.length; q3++) {
        ax = poly[q3 - 1][0]; ay = poly[q3 - 1][1]; bx = poly[q3][0]; by2 = poly[q3][1]; sl = Math.hypot(bx - ax, by2 - ay); if (sl < 0.01) continue;
        nx = -(by2 - ay) / sl; ny = (bx - ax) / sl; acc += sl;
        if (acc >= 11 && ay > 14 && ay < FH - 14) { acc = 0; D.moveTo(ax + nx * 20.5 + 1.05, ay + ny * 20.5); D.arc(ax + nx * 20.5, ay + ny * 20.5, 1.05, 0, TAU); D.moveTo(ax - nx * 20.5 + 1.05, ay - ny * 20.5); D.arc(ax - nx * 20.5, ay - ny * 20.5, 1.05, 0, TAU); }
      }
      g.save(); g.fillStyle = INK2; g.globalAlpha = 0.55; g.fill(D); g.restore();
    }

    // 4) river with ivory wavy bands, ink banks and paved fords
    if (map.river) {
      var wt = waterTones(theme, kind), y0r = rv.y - rv.hw, y1r = rv.y + rv.hw, segs = [[-30, rv.gaps[0].x0], [rv.gaps[0].x1, rv.gaps[1].x0], [rv.gaps[1].x1, FW + 30]];
      var wob = function (x, ph) { return Math.sin(x * 0.045 + ph) * 3 + Math.sin(x * 0.11 + ph * 2) * 1.4; };
      segs.forEach(function (sg, si) {
        if (sg[1] - sg[0] < 4) return;
        var x, top2 = [], bot2 = [];
        for (x = sg[0]; x <= sg[1]; x += 8) { top2.push([x, y0r + wob(x, 0.5)]); bot2.push([x, y1r + wob(x, 2.5)]); }
        top2[top2.length - 1][0] = sg[1]; bot2[bot2.length - 1][0] = sg[1];
        var B = P2(function (p) { smooth(p, top2, true); smooth(p, bot2.slice().reverse(), false); p.closePath(); });
        g.fillStyle = wt.body; g.fill(B);
        g.save(); g.clip(B);
        g.fillStyle = wt.deep; g.fillRect(sg[0], y1r - 12, sg[1] - sg[0], 20);
        for (k = 0; k < 3; k++) wavyBand(g, sg[0] - 8, sg[1] + 8, y0r + (k + 1) * (y1r - y0r) / 4, 2.2, 24 + k * 4, k * 1.7 + si, 2.6, wt.band);
        var dash = P2(function (p) { for (var d = 0; d < Math.round((sg[1] - sg[0]) / 46); d++) { var dx = sg[0] + rnd() * (sg[1] - sg[0]), dy = y0r + 5 + rnd() * (y1r - y0r - 10); p.moveTo(dx, dy); p.lineTo(dx + 8 + rnd() * 8, dy + 0.5); } });
        g.strokeStyle = wt.band; g.lineWidth = 2; g.lineCap = 'round'; g.stroke(dash);
        g.restore();
        inkStroke(g, B, 3);
        var reeds = P2(function (p) { for (var d = 0; d < Math.round((sg[1] - sg[0]) / 30); d++) { var rx0 = sg[0] + 6 + rnd() * (sg[1] - sg[0] - 12), ry0 = (rnd() < 0.5 ? y0r - 4 + wob(rx0, 0.5) : y1r + 5 + wob(rx0, 2.5)); p.moveTo(rx0, ry0); p.lineTo(rx0 - 1.4, ry0 - 5 - rnd() * 3); p.moveTo(rx0 + 2, ry0); p.lineTo(rx0 + 2.8, ry0 - 4 - rnd() * 3); } });
        if (kind !== 'ice' && kind !== 'volcano') { g.save(); g.strokeStyle = INK; g.lineWidth = 1.6; g.lineCap = 'round'; g.globalAlpha = 0.8; g.stroke(reeds); g.restore(); }
      });
      rv.gaps.forEach(function (gp2) { // ford: pale stone blocks in ink joints
        var w = gp2.x1 - gp2.x0, ya = y0r - 8, yb = y1r + 8, bh = 15, rows = Math.max(3, Math.round((yb - ya) / bh)), rh = (yb - ya) / rows, r, x;
        var Bg = P2(function (p) { p.rect(gp2.x0, ya, w, yb - ya); });
        g.fillStyle = INK; g.fill(Bg);
        var tones = [TK.arg, TK.vel, IVO, '#BFC5CF'];
        for (r = 0; r < rows; r++) {
          var bw = 26 + (r % 2) * 4, off = (r % 2) * (bw / 2), cx0 = gp2.x0 - off;
          for (x = cx0; x < gp2.x1; x += bw) {
            var xa = Math.max(gp2.x0, x), xb = Math.min(gp2.x1, x + bw);
            if (xb - xa < 5) continue;
            var Bk = P2(function (p) { var m = 1.4, ww = xb - xa - 2 * m, hh = rh - 2 * m, rr = 3.2, X = xa + m, Y = ya + r * rh + m; p.moveTo(X + rr, Y); p.lineTo(X + ww - rr, Y); p.quadraticCurveTo(X + ww, Y, X + ww, Y + rr); p.lineTo(X + ww, Y + hh - rr); p.quadraticCurveTo(X + ww, Y + hh, X + ww - rr, Y + hh); p.lineTo(X + rr, Y + hh); p.quadraticCurveTo(X, Y + hh, X, Y + hh - rr); p.lineTo(X, Y + rr); p.quadraticCurveTo(X, Y, X + rr, Y); p.closePath(); });
            g.fillStyle = tones[Math.floor(rnd() * tones.length)]; g.fill(Bk);
          }
        }
        inkStroke(g, P2(function (p) { p.rect(gp2.x0, ya, w, yb - ya); }), 2.6);
      });
    }

    // 5) hills: flat lobed mounds with ink contour and a chevron mark
    var gr = ground(theme);
    map.hills.forEach(function (h) {
      var pal = { b: mix(gr, IVO, 0.2), s: mix(gr, INK, 0.2), t: IVO };
      for (var q = 0; q < 3; q++) {
        var f = 1 - q * 0.27, hy = h.y - q * 8, hr = h.r * f, E = P2(function (p) { blob(p, h.x, hy, hr, hr * 0.74, 12, rnd); });
        var pl = { b: mix(pal.b, IVO, q * 0.08), s: mix(pal.b, INK, 0.2 + q * 0.04), t: IVO };
        gouache(g, E, pl, -hr * 0.16, -hr * 0.1); inkStroke(g, E, q === 0 ? 3 : 2.2);
      }
      g.save(); g.strokeStyle = INK2; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = 0.75; g.beginPath(); g.moveTo(h.x - 9, h.y - 13); g.lineTo(h.x, h.y - 22); g.lineTo(h.x + 9, h.y - 13); g.stroke(); g.restore();
    });

    // 6) forests: clumps of the same tree sprites (back to front)
    map.forests.forEach(function (f) {
      var n = Math.max(5, Math.round(f.r * f.r / 380)), trees = [], q;
      for (q = 0; q < n; q++) { var a = rnd() * TAU, d = Math.sqrt(rnd()) * (f.r - 16); trees.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d, r: 17 + rnd() * 10, t: rnd(), v: Math.floor(rnd() * 3) }); }
      trees.forEach(function (t) { t.s = floraFor(kind, theme, t.t, t.v, t.r, px).s; t.sy = t.y + t.s.foot; });
      trees.sort(function (p, q3) { return p.sy - q3.sy; });
      trees.forEach(function (t) { drawSprite(g, px, t.s, t.x, t.y, (t.v & 1) === 1); });
    });

    // 7) rocks
    map.rocks.forEach(function (rk) { drawSprite(g, px, rockSprite(px, 'rkf' + theme + '_' + qr(rk.r) + '_' + (rk.x > 360 ? 1 : 0), qr(rk.r), th.rock), rk.x, rk.y, rk.x > 360); });
    // 8) a few bushes in the open ground (the field would be empty otherwise)
    var nb = 0, guard = 0;
    while (nb < 14 && guard++ < 300) {
      var bx = 40 + rnd() * (FW - 80), by = 90 + rnd() * (FH - 190);
      if (nearPoly(bx, by, 52) || riverNear(by, 22) || hitObj(bx, by)) continue;
      var br = 6 + rnd() * 4; drawSprite(g, px, bushSprite(px, 'bf' + theme + '_' + qr(br), qr(br), fl(th.bush, 0.34), th.flowers), bx, by, rnd() < 0.5); nb++;
    }
    g.restore();
    this.bg = cv;
    R.Scenery.stats = { kind: 'field', theme: theme, tufts: nT, ms: Math.round((now() - t0) * 10) / 10 };
  }
  function groundLayerField(g, c) { // world-space ground: the flat colour + diaper cover the whole canvas, tufts only the world rectangle
    var inv = { x: -c.fx, y: -c.fy };
    g.fillStyle = ground(c.theme); g.fillRect(inv.x, inv.y, c.cvW, c.cvH);
    var pat = ART.pattern ? ART.pattern(g, 'r' + c.theme, 1) : null;
    if (pat) { g.save(); g.globalAlpha = DIAPER_A; g.fillStyle = pat; g.fillRect(inv.x, inv.y, c.cvW, c.cvH); g.restore(); }
    return tufts(g, { W: c.FW, x0: 0, x1: c.FW, y0: 56, y1: c.FH - 10, cell: 36, keep: 0.72, rnd: c.rnd, kind: c.kind, theme: c.theme, avoid: c.avoid });
  }

  R.buildBg = function () {
    try { build.call(this); } catch (e) { if (typeof console !== 'undefined') console.warn('scenery: fell back to the basic background', e); this.buildBgBasic(); }
  };
  // build/field: the two scene builders (call with the renderer as this). flat: the flat painters, reusable by simpler fallbacks
  // (groundLayer/horizon take a context object, see their callers). tune({diaper, rule}): live knobs for art review. stats: last build.
  R.Scenery = { build: build, field: field, TH: TH, stats: null, flat: { groundLayer: groundLayer, horizon: horizon, laneRoad: laneRoad, pond: pond, inkStroke: inkStroke },
    tune: function (o) { if (o && o.diaper != null) DIAPER_A = o.diaper; if (o && o.rule != null) ROAD_RULE = !!o.rule; } };
})(globalThis.Z = globalThis.Z || {});
