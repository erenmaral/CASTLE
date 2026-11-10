/* Castle Siege: History - Play Store phone screenshot shell ("The Unfinished Folio", docs/ART_DIRECTION.md sections 1, 2, 3 and 9).
 *
 * Browser-side drawing library, loaded by store/make-screens.js into a Playwright page together with www/js/art.js and www/js/icons.js
 * (it uses the Z.Art tiles, Z.Art.ink and the Z.Icons marginalia, so the shell is made of the same pigments and tiles as the game).
 *
 *   ScreensArt.compose(canvas, { shot, caption, lang, index })  ->  Promise of { frame, caption, scale }; draws one 1080 x 1920 sheet on the canvas
 *     shot     data: URL (or any image URL) of the live game capture: 1080 x 1919 px (412 x 732 css px of the game's native 9:16 stage at DPR 1080/412)
 *     caption  <= 3 words (zh <= 6 characters), already in the target language
 *     lang     'en' | 'tr' | 'es' | 'pt' | 'ru' | 'zh'  (caption face: Texturina for Latin, EB Garamond for Cyrillic, the embedded Noto Serif SC subset for zh)
 *     index    0..5; seeds the hand wobble (every banderole, bar and frame is a slightly different drawing: sag, tail droop and tail length of the ribbon, the ivy's phase,
 *              the diaper's shift) and picks the marginal figure and its side
 *   The page must already hold the fonts Rub (Texturina 700), Hand (EB Garamond 600) and Han (Noto Serif SC 700 / 900) as @font-face (data: URIs), and have run
 *   document.fonts.load for the caption (store/make-screens.js does both).
 *
 * Layout (px of the 1080 x 1920 sheet; 1u = 1.5 px of the 720u stage). The window is the bible's: the capture scaled .811 = 876 x 1556 at x 102
 *   0..300     caption band: the lapis diaper, a madder banderole hung between two gilt studs (face sagging a little, two folded swallow
 *              tails drooping, ink contour, hard shade, stitched seams) carrying the caption in Texturina 700 74 px ivory under a 6 px ink
 *              outline (a hard 5 px ink shadow under that; EB Garamond for Russian, Noto Serif SC for Chinese; lining figures);
 *              an ink | gold | ink bar closes the band
 *   300..1920  the page: the diaper again under a flat night veil, then a flat night mat with an ink edge around the window (so the page's lapis and the game's lapis
 *              never touch), the capture in an 18 px ink | gold | ink frame (pricked leaf, gilt corner studs, hard shadow), a gilded ivy bar down each
 *              outer margin, and one marginal figure from the icon kit (drake, manicule, hare, pennon, ape herald, snail) that climbs the ivy bar on a gilt
 *              ledge and reaches over the frame, turned toward the window; it owns no gutter of its own
 * No glow, blur, gradient shading or rotation of text; imperfection is baked: seeded wobble, two-pass ink, unequal radii.
 */
(function (G) {
  'use strict';
  var Z = G.Z, Art = Z.Art, TOK = Art.TOK, AUX = Art.AUX, TAU = Math.PI * 2;
  var W = 1080, H = 1920, BAND = 300;

  // ---- small helpers ----------------------------------------------------------------------------------------------
  function hex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(A[i] + (B[i] - A[i]) * t).toString(16)).slice(-2); }).join(''); }
  function rgba(h, a) { var A = hex(h); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; }
  function loadImage(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('image failed: ' + String(src).slice(0, 60))); }; im.src = src; });
  }
  // rectangle outline with a slow hand-ruled wobble (same recipe as Z.Art.overlay)
  function wobRect(p, x0, y0, x1, y1, seed, amp) {
    var r = Art.wob(seed, amp == null ? 0.7 : amp), ph = [r() * 6, r() * 6, r() * 6, r() * 6], step = 24, pts = [], x, y, A = 0.5;
    for (x = x0; x < x1; x += step) pts.push([x, y0 + Math.sin(x / 83 + ph[0]) * A + r() * 0.35]);
    for (y = y0; y < y1; y += step) pts.push([x1 + Math.sin(y / 79 + ph[1]) * A + r() * 0.35, y]);
    for (x = x1; x > x0; x -= step) pts.push([x, y1 + Math.sin(x / 91 + ph[2]) * A + r() * 0.35]);
    for (y = y1; y > y0; y -= step) pts.push([x0 + Math.sin(y / 87 + ph[3]) * A + r() * 0.35, y]);
    pts.forEach(function (q, j) { if (j) p.lineTo(q[0], q[1]); else p.moveTo(q[0], q[1]); });
    p.closePath();
  }
  function polyPath(p, pts) { pts.forEach(function (q, j) { if (j) p.lineTo(q[0], q[1]); else p.moveTo(q[0], q[1]); }); p.closePath(); }
  function disc(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }

  // gilt stud: ink ring, bole disc, orpiment face shifted a little (the misregistration crescent), pricked ring, small quatrefoil heart
  function stud(c, x, y, R) {
    var k = R / 18;
    disc(c, x, y, R, TOK.ink); disc(c, x, y, R * 0.77, TOK.bole);
    c.save(); c.beginPath(); c.arc(x, y, R * 0.77, 0, TAU); c.clip(); disc(c, x + R * 0.16, y + R * 0.16, R * 0.77, TOK.orp); c.restore();
    for (var q = 0; q < 8; q++) disc(c, x + Math.cos(q * Math.PI / 4) * R * 0.5, y + Math.sin(q * Math.PI / 4) * R * 0.5, 1.3 * k, TOK.bole);
    Art.ink(c, function (p) {
      var d = 3.2 * k, r = 2.6 * k, t = (d + Math.sqrt(2 * r * r - d * d)) / 2, a1 = Math.atan2(-t, t - d), a2 = Math.atan2(t, t - d), j, th;
      for (j = 0; j < 4; j++) { th = j * Math.PI / 2; p.arc(x + R * 0.07 + d * Math.cos(th), y + R * 0.07 + d * Math.sin(th), r, a1 + th, a2 + th, false); }
      p.closePath();
    }, 1.4 * k, { fill: TOK.mad, u: 1 });
  }

  // pricked dots along a gold bar: the game's frame carries the same tooling, so the leaf never reads as a hairline
  function prick(c, x0, y0, x1, y1, step, r) {
    var n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / step)), i, t;
    c.save(); c.fillStyle = AUX.leafDk;
    for (i = 0; i <= n; i++) { t = i / n; c.beginPath(); c.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, 0, TAU); c.fill(); }
    c.restore();
  }

  // ---- text -------------------------------------------------------------------------------------------------------
  var FACE = {
    latin: '700 %px Rub, Hand, "Noto Serif CJK SC", serif',
    cyr: '700 %px Hand, Rub, serif',
    zh: '900 %px Han, Rub, "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "Microsoft YaHei", "PingFang SC", sans-serif'
  };
  function faceOf(lang) { return lang === 'zh' ? FACE.zh : lang === 'ru' ? FACE.cyr : FACE.latin; }
  // the caption is fitted first (size <= 74), then drawn: hard 5 px ink shadow, 6 px ink outline outside the glyph edge, ivory fill
  function fitCaption(c, text, size, lang, maxW) {
    c.save(); c.font = faceOf(lang).replace('%', size);
    var w = c.measureText(text).width;
    if (w > maxW) { size = Math.floor(size * maxW / w); c.font = faceOf(lang).replace('%', size); w = c.measureText(text).width; }
    c.restore();
    return { size: size, w: w };
  }
  function drawCaption(c, text, cx, cy, size, lang) {
    var m;
    c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.miterLimit = 2;
    c.font = faceOf(lang).replace('%', size); m = c.measureText(text);
    var by = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2; // optical centring on the ink, not on the font's ascent
    var oy = 5, sw = 12;                                                         // sw 12 = 6 px of ink outside the glyph edge
    c.strokeStyle = TOK.ink; c.lineWidth = sw; c.strokeText(text, cx, by + oy);  // hard shadow (the game's 0 3u 0 ink text-shadow)
    c.save(); c.translate(0.9, 0.9); c.strokeStyle = TOK.ink2; c.globalAlpha = 0.6; c.lineWidth = sw; c.strokeText(text, cx, by); c.restore(); // two-pass ink
    c.lineWidth = sw; c.strokeText(text, cx, by);
    c.fillStyle = TOK.ivo; c.fillText(text, cx, by);
    c.restore();
  }

  // ---- grounds and bars -------------------------------------------------------------------------------------------
  function diaper(c, x, y, w, h, k, ox, oy) {
    var p = Art.pattern(c, 'lapis', k);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    if (p) { c.translate(ox || 0, oy || 0); c.fillStyle = p; c.fillRect(x - (ox || 0), y - (oy || 0), w, h); } else { c.fillStyle = TOK.diap; c.fillRect(x, y, w, h); }
    c.restore();
  }

  // ink | gold | ink bar (the "bar frame"); t = thickness: ink 25 % | leaf-art 50 % | ink 25 %
  function bar(c, x, y, w, h, horiz, seed) {
    var t = horiz ? h : w, e = t * 0.25, g = t * 0.5;
    c.save();
    c.fillStyle = TOK.ink; c.fillRect(x, y, w, h);
    c.beginPath();
    if (horiz) wobRect(c, x - 2, y + e, x + w + 2, y + e + g, seed, 0.4); else wobRect(c, x + e, y - 2, x + e + g, y + h + 2, seed, 0.4);
    c.fillStyle = Art.leafBox(c, x, y, w, h, true); c.fill();
    if (horiz) prick(c, x + 12, y + e + g / 2, x + w - 12, y + e + g / 2, 22, 1.7); else prick(c, x + e + g / 2, y + 12, x + e + g / 2, y + h - 12, 22, 1.7);
    c.restore();
  }

  // gilded ivy bar: a tooled gold-leaf strip (Z.Art 'gold' tile) between two ink edges with the Z.Art 'ivy' tile (72u x 36u, repeats
  // horizontally) turned on its side over it; malachite leaves and the ink stem read on gold the way they do on the game's night plates
  function ivyBar(c, xc, y0, y1, flip, seed, bw, phase) {
    var tile = Art.tile('ivy'), gold = Art.pattern(c, 'gold', 1.5), x = xc - bw / 2, e = bw > 40 ? 5 : 4, k = (bw - 2 * e) / 72;   // the tile is 72 px tall at 2x: it fills the bar's inner width
    c.save();
    c.fillStyle = TOK.ink; c.beginPath(); wobRect(c, x + 3, y0 + 8, x + bw + 3, y1 + 8, seed, 0.5); c.fill(); // hard shadow
    c.beginPath(); wobRect(c, x, y0, x + bw, y1, seed + 1, 0.5); c.fillStyle = TOK.ink; c.fill();
    c.beginPath(); wobRect(c, x + e, y0 + e, x + bw - e, y1 - e, seed + 2, 0.4); c.save(); c.clip();
    c.fillStyle = TOK.leaf; c.fillRect(x, y0, bw, y1 - y0);
    if (gold) { c.fillStyle = gold; c.fillRect(x, y0, bw, y1 - y0); }
    if (tile) {
      c.translate(xc, y0); c.rotate(Math.PI / 2); if (flip) c.scale(1, -1);
      var pat = c.createPattern(tile, 'repeat'); pat.setTransform(new DOMMatrix().translate(-(phase || 0), 0).scale(k, k).translate(0, -36));
      c.fillStyle = pat; c.fillRect(0, -bw / 2, y1 - y0, bw);
    }
    c.restore(); c.restore();
  }

  // ---- ivy sprigs: they grow out of the gilded bars into the gutters (same three-lobed leaf as Z.Art's ivy: malachite, lit half in --vdg, ink veins) --
  var LF = { n: [[0.08, 0], [-0.03, 0.30], [0.34, 0.97], [0.55, 0.30], [1, 0]], c: [[[0.06, 0.10], [-0.02, 0.18]], [[-0.05, 0.56], [0.12, 0.92]], [[0.45, 0.80], [0.50, 0.50]], [[0.66, 0.46], [0.88, 0.32]]] };
  function tf(x, y, a, sx, sy) { var cs = Math.cos(a), sn = Math.sin(a); return function (lx, ly) { var X = lx * sx, Y = ly * sy; return [x + X * cs - Y * sn, y + X * sn + Y * cs]; }; }
  function leafPath(p, T, half) {
    var n = LF.n, k = LF.c, i, a, b, e;
    a = T(n[0][0], n[0][1]); p.moveTo(a[0], a[1]);
    for (i = 0; i < k.length; i++) { a = T(k[i][0][0], k[i][0][1]); b = T(k[i][1][0], k[i][1][1]); e = T(n[i + 1][0], n[i + 1][1]); p.bezierCurveTo(a[0], a[1], b[0], b[1], e[0], e[1]); }
    if (!half) for (i = k.length - 1; i >= 0; i--) { a = T(k[i][1][0], -k[i][1][1]); b = T(k[i][0][0], -k[i][0][1]); e = T(n[i][0], -n[i][1]); p.bezierCurveTo(a[0], a[1], b[0], b[1], e[0], e[1]); }
    p.closePath();
  }
  function ivyLeaf(c, x, y, a, L, Wh) {
    var s = (Math.sin(a) - Math.cos(a)) >= 0 ? 1 : -1, T = tf(x, y, a, L, Wh * s), v, w;
    c.beginPath(); leafPath(c, T, false); c.fillStyle = TOK.mal; c.fill();
    c.beginPath(); leafPath(c, T, true); c.fillStyle = TOK.vdg; c.fill();
    c.strokeStyle = TOK.ink; c.lineCap = 'round'; c.lineWidth = 1.5; c.beginPath();
    v = T(0.1, 0); c.moveTo(v[0], v[1]); v = T(0.88, 0); c.lineTo(v[0], v[1]);
    v = T(0.14, 0.02); c.moveTo(v[0], v[1]); w = T(0.34, 0.7); c.lineTo(w[0], w[1]);
    v = T(0.14, -0.02); c.moveTo(v[0], v[1]); w = T(0.34, -0.7); c.lineTo(w[0], w[1]);
    c.stroke();
    Art.ink(c, function (p) { leafPath(p, T, false); }, 2.6, { u: 1 });
  }
  function ivyBerry(c, x, y, r) { // gilt berry: ink contour, bole disc, orpiment face shifted a little (the misregistration crescent)
    var rim = Math.max(0.55, r * 0.3), fr = r - rim * 0.5;
    disc(c, x, y, r + rim * 0.5, TOK.ink); disc(c, x, y, fr, TOK.bole);
    c.save(); c.beginPath(); c.arc(x, y, fr, 0, TAU); c.clip(); disc(c, x + fr * 0.28, y + fr * 0.28, fr, TOK.orp); c.restore();
  }
  // one sprig from (x, y) on a bar edge, growing toward dir (+1 right, -1 left); lean +-1 bends the stem and swings the leaf
  function sprig(c, x, y, dir, lean, k) {
    var T = tf(x, y, dir > 0 ? 0 : Math.PI, 1, 1), p0 = T(-3, 0), p1 = T(15 * k, 6 * lean * k), p2 = T(32 * k, 3 * lean * k);
    function stem(p) { p.moveTo(p0[0], p0[1]); p.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); }
    Art.ink(c, stem, 4, { u: 1 });
    c.save(); c.translate(-0.5, -0.6); c.strokeStyle = TOK.vel2; c.globalAlpha = 0.85; c.lineWidth = 1.1; c.lineCap = 'round'; c.beginPath(); stem(c); c.stroke(); c.restore(); // lit edge: ink alone is lost on the lapis
    var st = T(13 * k, 2 * lean * k), bb = T(19 * k, -13 * lean * k), lp = T(29 * k, 3 * lean * k);
    Art.ink(c, function (p) { p.moveTo(st[0], st[1]); p.lineTo(bb[0], bb[1]); }, 2.4, { u: 1 });
    ivyBerry(c, bb[0], bb[1], 4.6 * k);
    ivyLeaf(c, lp[0], lp[1], (dir > 0 ? 0 : Math.PI) + 0.5 * lean * dir, 34 * k, 14 * k);
  }

  // a short gilt ledge growing out of the ivy bar; the marginal figure stands on it (hard shadow like every plate)
  function ledge(c, x0, x1, y, seed) {
    c.save();
    c.fillStyle = TOK.ink; c.beginPath(); wobRect(c, x0 + 2, y + 6, x1 + 2, y + 24, seed, 0.4); c.fill();
    c.beginPath(); wobRect(c, x0, y, x1, y + 18, seed + 1, 0.4); c.fillStyle = TOK.ink; c.fill();
    c.beginPath(); wobRect(c, x0 + 4, y + 4, x1 - 4, y + 14, seed + 2, 0.3); c.fillStyle = Art.leafBox(c, x0, y, x1 - x0, 18, true); c.fill();
    prick(c, x0 + 14, y + 9, x1 - 14, y + 9, 16, 1.3);
    c.restore();
  }

  // ---- the banderole ----------------------------------------------------------------------------------------------
  // hung ribbon: a madder face that sags a little between its two gilt studs (the text on it stays level), two tails folded behind it and
  // drooping (darker madder), a hard shade on the lower third, an ivory catch-light and a stitched seam along each edge; every point carries
  // the seeded wobble and the ink contour is two-pass like the game's
  function banderole(c, cx, cy, bw, bh, tl, seed, v) {
    v = v || {};
    var J = Art.wob(seed * 17 + 3, 1.5), x1 = cx - bw / 2, x2 = cx + bw / 2, y1 = cy - bh / 2, y2 = cy + bh / 2, S = v.sag != null ? v.sag : 7;
    var dd = 12, f = 46, tail = mix(TOK.mad, TOK.ink, 0.34), fold = mix(TOK.mad, TOK.ink, 0.6), lw = 6.4, sh = 9, dL = v.dL != null ? v.dL : 30, dR = v.dR != null ? v.dR : 30, tlL = tl * (v.tlL || 1), tlR = tl * (v.tlR || 1);
    function wj(pts) { return pts.map(function (q) { return [q[0] + J(), q[1] + J()]; }); }
    function sagAt(x) { var u = (x - cx) / (bw / 2); return S * (1 - u * u); }
    var A = [x1 + J(), y1 + J()], B = [x2 + J(), y1 + J()], D = [x2 + J(), y2 + J()], E = [x1 + J(), y2 + J()], Ct = [cx + J(), y1 + 2 * S + J()], Cb = [cx + J(), y2 + 2 * S + J()];
    function frontPath(p) { p.moveTo(A[0], A[1]); p.quadraticCurveTo(Ct[0], Ct[1], B[0], B[1]); p.lineTo(D[0], D[1]); p.quadraticCurveTo(Cb[0], Cb[1], E[0], E[1]); p.closePath(); }
    function tailPts(s) { var xe = s < 0 ? x1 : x2, d = s < 0 ? dL : dR, t = s < 0 ? tlL : tlR, nd = Math.min(46, t * 0.4); return wj([[xe, y1 + d], [xe + s * t, y1 + d + dd], [xe + s * (t - nd), cy + d + dd], [xe + s * t, y2 + d + dd], [xe - s * f, y2 + d], [xe, y2]]); }
    function foldPts(s) { var xe = s < 0 ? x1 : x2, d = s < 0 ? dL : dR; return wj([[xe, y2], [xe - s * f, y2 + d], [xe - s * f, y2]]); }
    var tL = tailPts(-1), tR = tailPts(1), fL = foldPts(-1), fR = foldPts(1), P = new Path2D(); frontPath(P);
    c.save(); c.translate(0, sh); c.fillStyle = TOK.ink; [tL, tR].forEach(function (pts) { c.beginPath(); polyPath(c, pts); c.fill(); }); c.fill(P); c.restore(); // hard shadow
    [tL, tR].forEach(function (t) { c.beginPath(); polyPath(c, t); c.fillStyle = tail; c.fill(); Art.ink(c, function (p) { polyPath(p, t); }, lw, { u: 1 }); });
    [fL, fR].forEach(function (t) { c.beginPath(); polyPath(c, t); c.fillStyle = fold; c.fill(); Art.ink(c, function (p) { polyPath(p, t); }, lw * 0.8, { u: 1 }); });
    c.fillStyle = TOK.mad; c.fill(P);
    c.save(); c.clip(P);
    c.fillStyle = mix(TOK.mad, TOK.ink, 0.26);                                                                      // hard shade, lower third (follows the sag)
    c.beginPath(); c.moveTo(x1 - 6, y2 - bh * 0.27); c.quadraticCurveTo(cx, y2 - bh * 0.27 + 2 * S, x2 + 6, y2 - bh * 0.27); c.lineTo(x2 + 6, y2 + 40); c.lineTo(x1 - 6, y2 + 40); c.closePath(); c.fill();
    function edgeLine(xa, xb, y0) { c.moveTo(xa, y0 + sagAt(xa)); for (var x = xa + 8; x < xb; x += 8) c.lineTo(x, y0 + sagAt(x)); c.lineTo(xb, y0 + sagAt(xb)); }
    c.lineCap = 'round';
    c.strokeStyle = rgba(TOK.ivo, 0.5); c.lineWidth = 4; c.beginPath(); edgeLine(x1 + 76, x2 - 76, y1 + 13); c.stroke();                         // ivory catch-light along the top edge
    c.strokeStyle = rgba(TOK.ink, 0.5); c.lineWidth = 2.6; c.setLineDash([9, 9]);                                                              // stitched seam, top and bottom
    c.beginPath(); edgeLine(x1 + 76, x2 - 76, y1 + 24); edgeLine(x1 + 76, x2 - 76, y2 - 22); c.stroke();
    c.restore();
    Art.ink(c, frontPath, lw, { u: 1 });
    stud(c, x1 + 40, cy + 1 + sagAt(x1 + 40), 16); stud(c, x2 - 40, cy + 1 + sagAt(x2 - 40), 16);
    return S;
  }

  // ---- the capture window -----------------------------------------------------------------------------------------
  // 18 px frame: ink 4.5 | gold leaf 9 | ink 4.5, pricked, hard ink shadow, four gilt studs on the corners
  function windowFrame(c, x, y, w, h, seed) {
    var e = 4.5, g = 9;
    c.save();
    c.fillStyle = TOK.ink; c.beginPath(); wobRect(c, x + 3, y + 10, x + w + 3, y + h + 10, seed + 7, 0.4); c.fill(); // hard shadow
    c.beginPath(); wobRect(c, x, y, x + w, y + h, seed, 0.5); c.fillStyle = TOK.ink; c.fill();
    c.beginPath(); wobRect(c, x + e, y + e, x + w - e, y + h - e, seed + 1, 0.4); wobRect(c, x + e + g, y + e + g, x + w - e - g, y + h - e - g, seed + 2, 0.4);
    c.fillStyle = Art.leafBox(c, x, y, w, h, true); c.fill('evenodd');
    var m = e + g / 2;
    prick(c, x + 30, y + m, x + w - 30, y + m, 20, 1.5); prick(c, x + 30, y + h - m, x + w - 30, y + h - m, 20, 1.5);
    prick(c, x + m, y + 30, x + m, y + h - 30, 20, 1.5); prick(c, x + w - m, y + 30, x + w - m, y + h - 30, 20, 1.5);
    c.restore();
    [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2], [x + w - 2, y + h - 2]].forEach(function (q) { stud(c, q[0], q[1], 19); });
  }

  // ---- compose ----------------------------------------------------------------------------------------------------
  // marginal figures from the icon kit (docs section 12, family 10): one per screenshot, alternating sides; 'face' = the way the drawing looks; y = share of the page below the band
  var FIG = [
    { id: 'ic-mar-manicule', side: -1, y: 0.50, face: 1 }, { id: 'ic-mar-drake', side: 1, y: 0.62, face: 1 }, { id: 'ic-mar-snail', side: -1, y: 0.68, face: 1 },
    { id: 'ic-mar-hare', side: 1, y: 0.42, face: -1 }, { id: 'ic-mar-ape', side: -1, y: 0.58, face: 1 }, { id: 'ic-mar-pennon', side: 1, y: 0.36, face: 1 }
  ];
  // what changes from sheet to sheet so that the six banderoles are six drawings: sag of the face, droop and length of each tail, where the ribbon hangs, the ivy's phase on each bar
  var VAR = [
    { sag: 7, dL: 30, dR: 30, tlL: 1, tlR: 1, dy: 0, ivyL: 0, ivyR: 31 }, { sag: 4, dL: 24, dR: 36, tlL: 0.9, tlR: 1.08, dy: 4, ivyL: 23, ivyR: 9 },
    { sag: 10, dL: 36, dR: 22, tlL: 1.08, tlR: 0.88, dy: -3, ivyL: 41, ivyR: 17 }, { sag: 6, dL: 28, dR: 34, tlL: 0.94, tlR: 1.06, dy: 3, ivyL: 12, ivyR: 52 },
    { sag: 9, dL: 34, dR: 26, tlL: 1.06, tlR: 0.92, dy: -2, ivyL: 33, ivyR: 3 }, { sag: 5, dL: 22, dR: 38, tlL: 0.88, tlR: 1.1, dy: 5, ivyL: 6, ivyR: 44 }
  ];
  var WIN_W = 876, FRAME = 18, MAT_X = 14, MAT_Y = 12;   // the capture's width (the bible's .811 of 1080), the frame, the night mat around the frame

  // the night mat: a flat panel with a hand-ruled ink edge; the lapis of the page and the lapis of the game never touch
  function mat(c, x0, y0, x1, y1, seed) {
    c.save(); c.beginPath(); wobRect(c, x0, y0, x1, y1, seed, 0.7); c.fillStyle = TOK.night; c.fill();
    Art.ink(c, function (p) { wobRect(p, x0, y0, x1, y1, seed, 0.7); }, 3.6, { u: 1 });
    c.restore();
  }

  function compose(canvas, o) {
    var lang = o.lang || 'en', idx = o.index || 0, seed = 101 + idx * 37, fig = FIG[idx % FIG.length], V = VAR[idx % VAR.length];
    canvas.width = W; canvas.height = H;
    canvas.style.fontVariantNumeric = 'lining-nums'; // Texturina's default figures are oldstyle; canvas text inherits this from the element (bible section 4)
    var c = canvas.getContext('2d');
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    var figUrl = Z.Icons && Z.Icons.dataUrl ? Z.Icons.dataUrl(fig.id) : null;
    return Promise.all([loadImage(o.shot), figUrl ? loadImage(figUrl).catch(function () { return null; }) : null]).then(function (r) {
      var shot = r[0], fimg = r[1], s = o.scale || WIN_W / shot.width, cw = Math.round(shot.width * s), ch = Math.round(shot.height * s);
      var fx = Math.round((W - cw) / 2), fy = BAND + Math.round((H - BAND - ch) / 2), left = fig.side < 0;
      var bwid = 46, bx = 35;                                                                       // the ivy bars: 46 px wide, centred 35 px from the sheet edge
      // 1. ground: lapis diaper over the whole sheet, shifted a little on every sheet; a flat night veil under the band so the pattern recedes behind the game window
      var dox = 14 + idx * 37, doy = 22 + idx * 53;
      diaper(c, 0, 0, W, H, 1.15, dox, doy);
      c.fillStyle = rgba(TOK.night, 0.58); c.fillRect(0, BAND, W, H - BAND);
      // 2. the night mat round the window, then the gilded ivy bars down the outer margins
      mat(c, fx - FRAME - MAT_X, Math.max(BAND + 3, fy - FRAME - MAT_Y), fx + cw + FRAME + MAT_X, Math.min(H - 2, fy + ch + FRAME + MAT_Y), seed + 3);
      ivyBar(c, bx, BAND - 10, H - 26, false, seed + 11, bwid, V.ivyL); ivyBar(c, W - bx, BAND - 10, H - 26, true, seed + 13, bwid, V.ivyR);
      stud(c, bx, H - 30, 17); stud(c, W - bx, H - 30, 17);
      // 3. the marginal figure: it stands on a gilt ledge that grows out of the ivy bar and reaches over the mat to the frame, turned toward the window
      var fs = 108, ftop = BAND + Math.round((H - BAND) * fig.y), fcx = left ? 54 : W - 54, fxx = fcx - fs / 2, feet = ftop + Math.round(fs * 0.9);
      ledge(c, left ? bx - 12 : fx + cw + FRAME - 10, left ? fx - FRAME + 10 : W - bx + 12, feet - 4, seed + 21);
      if (fimg) {
        var flip = (left ? 1 : -1) !== fig.face;
        c.save(); if (flip) { c.translate(fxx + fs, ftop); c.scale(-1, 1); c.drawImage(fimg, 0, 0, fs, fs); } else c.drawImage(fimg, fxx, ftop, fs, fs); c.restore();
      }
      // 4. the capture in its frame
      windowFrame(c, fx - FRAME, fy - FRAME, cw + 2 * FRAME, ch + 2 * FRAME, seed);
      c.drawImage(shot, fx, fy, cw, ch);
      // 5. caption band
      c.save(); c.beginPath(); c.rect(0, 0, W, BAND); c.clip();
      diaper(c, 0, 0, W, BAND, 1.15, dox, doy);
      var cap = fitCaption(c, o.caption, 74, lang, 700), bw = Math.max(540, cap.w + 168), tl = Math.min(118, Math.floor((W - 56 - bw) / 2)), cy = 138 + V.dy;
      var sag = banderole(c, W / 2, cy, bw, 132, tl, seed, V);
      drawCaption(c, o.caption, W / 2, cy - 2 + sag * 0.8, cap.size, lang); // level text on the sagging face
      c.restore();
      bar(c, 0, BAND - 24, W, 24, true, seed + 5);
      return { frame: { x: fx - FRAME, y: fy - FRAME, w: cw + 2 * FRAME, h: ch + 2 * FRAME }, caption: cap, scale: s };
    });
  }

  G.ScreensArt = { compose: compose, W: W, H: H, BAND: BAND, faceOf: faceOf, FIG: FIG };
})(globalThis);
