// Sefer Vakti - canvas cizimi (DIKEY): 3 orman yolu yan yana, oyuncu kalesi altta, dusman ustte.
// Simulasyondaki 'x' (koridor boyunca konum) ekranda yukari dogru y ekseni olur. Tum grafikler kodla cizilir.
// SPRITES (docs/ART_DIRECTION.md section 7, "The Unfinished Folio"): flat gouache figures with an opaque iron-gall ink contour.
//   Z.Render.renderSprite(cls, team, state, idx) -> canvas of the 92 x 120 sprite box (origin = ground point at 46, 74; scale px * SPR). The figure is drawn flat
//   (1.6u inner ink lines, hard shade crescent, ivory tick), then baked: 2.6u contour by 8-offset dilation, 2u vellum halo at alpha .45, three ink ground ticks.
//   R.icoMode = true  : skip the halo and the ticks (portraits: UI.unitImg, drag ghost). A bake made while R.px is overridden away from the battle canvas px
//   (R._bpx, set by R.resize; UI.unitImg bakes its portraits with R.px = 3) is a portrait too, so a caller that forgets icoMode still gets no halo and no ticks.
//   The canvas is only the figure rectangle: kx, ky = its offset in the 92 x 120 box, fw, fh = the box size in device px.
//   R.getSprite(cls, team, state, idx, m) / R.renderSprite(..., m) : m = bake scale multiplier (default 1). A figure drawn bigger or smaller than SPR (bosses 1.55 in
//   the lanes, the field's USC scale and its commanders) is baked at the scale it is drawn at, so the blit is 1:1 and the ink contour stays crisp; cached per m.
//   R.warmClass(cls, team, m) queues the 18 frames of a class (bosses) for the idle warm-up.
//   R.ghostSprite(cls, team) : --ink2 silhouette at alpha .45 for units the player does not own yet; .bbox = box of the opaque pixels in that canvas (device px).
//   R.makeSprite(cls, team, state, idx, fn) : the shared bake entry (field commander); R.blit(c, img, s) draws a baked sprite (figure rectangle only).
//   Team marks: R.PAL[0] host (azure + or, kite shield or great helm / kettle hat, cross pattee), R.PAL[1] garrison (gules + argent, round shield, conical nasal
//   helm, saltire); R.util.device(c, kind, x, y, r, pal, team) counter-flips for team 1 because garrison sprites are drawn mirrored.
//   Unit furniture for any caller: R.hpBar (ink ribbon), R.crown, R.auraRing, R.unitFx, R.drawTexts (R.DMG = combat number tinctures), R.drawBanderole /
//   R.drawBannerCard (swallow-tail banderole with ink text), R.TOK (bible tokens). Canvas 2D records lazily: keep intermediate canvases few (see scratch()).
// CASTLE, CAMP, FRAME (same bible section): the garrison's castle (ashlar, six ink courses, fish-scale cones with an orp ball, gatehouses with a keystone and a
//   portcullis, gonfanons gules + saltire argent, a moat with ivory bands on the moat rule) and the host's camp (azure / ivory pavilions, a bister palisade, a standard
//   planted in each gate) are painted by the kit above R (paintCastle, paintCamp), once per damage tier into a canvas: R.baseSlot(team, tier, moat) keeps the current
//   tier of each team (tiers: hp >= 60 %, >= 30 %, below; the previous one is evicted), R.resize drops them all. Per frame only the cloth, flames, torches, the chosen-gate
//   frame, the hit-flash silhouette and the ink-ribbon health bar are drawn (R.baseDyn, R.baseBar). The field battle's wall and camp are the same painters in two strips
//   (R.fieldSlot, fieldrender.js). The camp is painted in screen orientation (field side up), so there is no mirrored transform.
//   R.ovl = Z.Art.overlay(canvas.width, canvas.height, R.px) is baked in R.resize and drawn by R.drawFrame at the end of both frame() functions: four 34u edge strips
//   of it (its middle is transparent and the ivy reaches 31u), R.ovlStrips = false draws it whole.
//   R.cstat = { bakes, ms, last } counts the bakes (debugging); R.buildBgBasic / R.fieldBuildBgBasic are the flat fallbacks used when scenery.js fails.
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };
  var C = Z.C, TAU = Math.PI * 2;
  var DW = 720;        // tasarim genisligi (3 koridor x 240)
  var SPR = 1.28;      // birlik cizim olcegi (telefonda okunabilirlik)
  var CASTLE_H = 86;   // castle / camp height in u (castle top .. ground line)
  // Tinctures of the style bible (docs/ART_DIRECTION.md section 2): ink = sable, lapis = azure, verm = gules, orp = or, ivo/arg = argent.
  var INK = '#1E1610', INK2 = '#4B3B2A', IVO = '#F4ECD3', VEL = '#D8D0AB', VEL2 = '#C6B684', ORP = '#E9B62A', LEAF = '#D4A02F',
    VERM = '#D8391F', MAD = '#9A2018', MAL = '#1F6B4E', VDG = '#3FA58C', PUR = '#5B2E7A', BOLE = '#8C3520', BIS = '#7A5230',
    ARG = '#CDD2DB', FLESH = '#E7B99C', LAPIS = '#22409A', LAPISD = '#14275F', AZUR = '#4474C0', NIGHT = '#0F1838';
  // Teams (bible section 7): 0 = host (azure + or, kite shield, cross pattee), 1 = garrison (gules + argent, round shield, saltire).
  // dev = the colour of the heraldic device. Castle / camp code reads main, dark, trim and cloth from here too.
  var PAL = [
    { main: LAPIS, dark: LAPISD, light: AZUR, trim: ORP, metal: '#E3E7EE', metalD: '#7E889D', hi: IVO, cloth: LAPISD, dev: ORP },
    { main: VERM, dark: '#8E1F12', light: '#F0705A', trim: IVO, metal: '#8B94A8', metalD: '#4A5368', hi: IVO, cloth: '#8E1F12', dev: IVO }
  ];
  // Masonry and camp tones (bible section 7): ashlar #B9AE98 with a lit and a shade tone, gate wood #5A3A22, trodden earth, road sand #E3CFA0.
  function hex3(s) { var n = parseInt(s.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mixHex(a, b, t) {
    var p = hex3(a), q = hex3(b), r = Math.round(p[0] + (q[0] - p[0]) * t), g = Math.round(p[1] + (q[1] - p[1]) * t), bl = Math.round(p[2] + (q[2] - p[2]) * t);
    return '#' + ('000000' + ((r << 16) | (g << 8) | bl).toString(16)).slice(-6);
  }
  var ASH = '#B9AE98', ASHD = mixHex('#B9AE98', INK, 0.27), ASHL = mixHex('#B9AE98', IVO, 0.55), GATE = '#5A3A22', VERMD = '#8E1F12', SAND = '#E3CFA0',
    EARTH = mixHex(BIS, VEL2, 0.5), WOOD = mixHex(BIS, IVO, 0.14), WOODD = mixHex(BIS, INK, 0.3), WATERD = '#3866AE', METALD = '#7E889D', LEAFD = '#8A5A10', SMOKE = mixHex(INK2, VEL, 0.42), PURL = mixHex(PUR, IVO, 0.45), ICE = mixHex(AZUR, IVO, 0.55);
  var SKIN = FLESH, OUT = INK;                 // OUT: the opaque iron-gall ink (was a translucent navy)
  var INKW = 2.6, HALOW = 2, HEAD = 1.15, HAND = 1.2; // sprite contour (u, by 8-offset dilation), vellum halo (u), head and hand/foot scale
  // Diyar temalari (realm index = theme index): kind (scenery.js), amb (ambient life), ground / tree = flat tones for the fallback builders (the real ones are Z.Art.REALM and scenery.js)
  var THEMES = [
    { kind: 'forest', amb: 'leaf', ground: '#8DAA6B', tree: '#3F8F5A' },    // 0 W. Europe
    { kind: 'desert', amb: 'dust', ground: '#D2B070', tree: '#7C8D4B' },    // 1 Holy Lands
    { kind: 'ice', amb: 'snow', ground: '#A9BBD0', tree: '#2F6E7A' },       // 2 Northern
    { kind: 'volcano', amb: 'ember', ground: '#A99888', tree: '#5A4338' },  // 3 Mediterranean
    { kind: 'swamp', amb: 'fog', ground: '#A8B07A', tree: '#2F7F5F' },      // 4 Low Countries
    { kind: 'forest', amb: 'leaf', ground: '#A99AB5', tree: '#C4621F' },    // 5 Asia (autumn)
    { kind: 'forest', amb: 'fog', ground: '#8E9CBF', tree: '#473C86' }      // 6 Anatolia (night)
  ];

  // ---- yardimcilar ------------------------------------------------------
  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function line(c, x1, y1, x2, y2, w, col) { // onceki kontur ayarini bozmadan cizer
    var ss = c.strokeStyle, lw = c.lineWidth, lc = c.lineCap;
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = ss; c.lineWidth = lw; c.lineCap = lc;
  }
  function hash(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
  function seeded(seed) { var s = (seed * 9301 + 49297) % 233280; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  // ---- gouache kit (bible section 7): opaque ink line, flat pigment, hard shade crescent, ivory tick - no shading gradient anywhere ----
  // fe(): the ink line goes down first and the pigment is laid over it, so small parts keep their colour and only the outer half of the line shows
  function fe(c, col) { c.stroke(); c.fillStyle = col; c.fill(); }
  function outline(c) { c.strokeStyle = INK; c.lineWidth = 1.6; c.lineJoin = 'round'; c.lineCap = 'round'; } // 1.6u inner strokes
  // ivory tick: a short catch-light arc on the upper-left rim of a metal or gem surface (x, y, r = centre and radius of the surface)
  function tick(c, x, y, r) {
    var ss = c.strokeStyle, lw = c.lineWidth, lc = c.lineCap;
    c.strokeStyle = IVO; c.lineWidth = Math.max(1, r * 0.2); c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, r * 0.6, Math.PI * 1.08, Math.PI * 1.46); c.stroke();
    c.strokeStyle = ss; c.lineWidth = lw; c.lineCap = lc;
  }
  // gshape(c, build, col, dk, s, tk): build(p, dx, dy) appends the outline shifted by dx, dy. Without dk it is ink + flat col. With dk (the shade pigment)
  // the shape is ink, then dk, then col shifted up-left by s and clipped to the shape: what is left of dk is the hard shade crescent (lower right).
  // tk = [x, y, r] adds the ivory tick.
  function gshape(c, build, col, dk, s, tk) {
    c.beginPath(); build(c, 0, 0);
    if (!dk) { fe(c, col); return; }
    c.stroke(); c.fillStyle = dk; c.fill();
    c.save(); c.clip();
    c.beginPath(); build(c, -s, -s); c.fillStyle = col; c.fill();
    c.restore();
    if (tk) tick(c, tk[0], tk[1], tk[2]);
  }
  // lower-right lune of an ellipse minus the same ellipse shifted by (-sx, -sy), as an exact two-arc path (no clip: a third of the raster cost)
  function arcWithin(a, m, b) { var dm = ((m - a) % TAU + TAU) % TAU, db = ((b - a) % TAU + TAU) % TAU; return dm <= db; } // does the increasing-angle arc a -> b pass through m
  function crescent(c, x, y, rx, ry, sx, sy) {
    var ux = -sx / rx, uy = -sy / ry, d = Math.sqrt(ux * ux + uy * uy), nx, ny, h, p1x, p1y, p2x, p2y, th, f1, f2, q1, q2;
    if (d < 1e-6 || d >= 1.9) return false;
    nx = -uy / d; ny = ux / d; h = Math.sqrt(1 - d * d / 4);
    p1x = ux / 2 + nx * h; p1y = uy / 2 + ny * h; p2x = ux / 2 - nx * h; p2y = uy / 2 - ny * h; th = Math.atan2(-uy, -ux);
    f1 = Math.atan2(p1y, p1x); f2 = Math.atan2(p2y, p2x); q1 = Math.atan2(p1y - uy, p1x - ux); q2 = Math.atan2(p2y - uy, p2x - ux);
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, f1, f2, !arcWithin(f1, th, f2)); c.ellipse(x - sx, y - sy, rx, ry, 0, q2, q1, !arcWithin(q2, th, q1)); c.closePath();
    return true;
  }
  // E: ellipse. Ink line = an ink ellipse 0.8u larger under the pigment (what stroke-then-fill of a 1.6u line shows, at half the raster cost).
  // dk = shade pigment: hard crescent on the lower right; tk = ivory tick.
  function E(c, x, y, rx, ry, col, dk, tk) {
    c.fillStyle = INK; c.beginPath(); c.ellipse(x, y, rx + 0.8, ry + 0.8, 0, 0, TAU); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
    if (dk) {
      var sh = Math.max(1.1, Math.min(rx, ry) * 0.3);
      if (crescent(c, x, y, rx, ry, sh, sh)) { c.fillStyle = dk; c.fill(); }
      if (tk) tick(c, x, y, Math.min(rx, ry));
    }
  }
  function O(c, x, y, r, col, dk, tk) { E(c, x, y, r, r, col, dk, tk); }
  function RR(c, x, y, w, h, r, col, dk, tk) {
    gshape(c, function (p, dx, dy) { rrect(p, x + dx, y + dy, w, h, r); }, col, dk, Math.max(1.1, Math.min(w, h) * 0.2), tk ? [x + w / 2, y + h / 2, Math.min(w, h) / 2] : 0);
  }
  function poly(c, pts, col, dk, tk) {
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, i;
    for (i = 0; i < pts.length; i++) { x0 = Math.min(x0, pts[i][0]); x1 = Math.max(x1, pts[i][0]); y0 = Math.min(y0, pts[i][1]); y1 = Math.max(y1, pts[i][1]); }
    gshape(c, function (p, dx, dy) { p.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (var j = 1; j < pts.length; j++) p.lineTo(pts[j][0] + dx, pts[j][1] + dy); p.closePath(); }, col, dk,
      Math.max(1.1, Math.min(x1 - x0, y1 - y0) * 0.2), tk ? [(x0 + x1) / 2, (y0 + y1) / 2, Math.min(x1 - x0, y1 - y0) / 2] : 0);
  }
  // mgrad(c, x, y, r, p): was a radial gradient; now paints a flat metal disc with a hard shade crescent (metalD) and an ivory tick
  function mgrad(c, x, y, r, p) { O(c, x, y, r, p.metal, p.metalD, 1); }
  // bar: a weapon shaft or beam, drawn as an ink-edged stripe (w = pigment width, ed = ink edge width, 1.2u unless given)
  function bar(c, x1, y1, x2, y2, w, col, ed) {
    ed = ed || 1.2;
    if (x1 === x2 || y1 === y2) { // every shaft in the sprites is vertical or horizontal: two rects (ink edge, then pigment) cost a third of two stroked lines
      var hw = w / 2, ex = hw * 0.7, X0 = Math.min(x1, x2) - (y1 === y2 ? ex : hw), X1 = Math.max(x1, x2) + (y1 === y2 ? ex : hw), Y0 = Math.min(y1, y2) - (x1 === x2 ? ex : hw), Y1 = Math.max(y1, y2) + (x1 === x2 ? ex : hw);
      c.fillStyle = INK; c.fillRect(X0 - ed, Y0 - ed, X1 - X0 + 2 * ed, Y1 - Y0 + 2 * ed); c.fillStyle = col; c.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      return;
    }
    line(c, x1, y1, x2, y2, w + 2 * ed, INK); line(c, x1, y1, x2, y2, w, col);
  }
  // belt: a trim band across an ellipse (clipped to it) with ink edges
  function belt(c, x, y, rx, ry, by, bh, col) {
    c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.clip();
    c.fillStyle = col; c.fillRect(x - rx, by, rx * 2, bh); c.fillStyle = INK; c.fillRect(x - rx, by, rx * 2, 0.9); c.fillRect(x - rx, by + bh - 0.9, rx * 2, 0.9);
    c.restore();
  }
  // device(c, kind, x, y, r, pal, team): the heraldic charge of a team. host = cross pattee or, garrison = saltire argent ('auto'); r = arm length.
  // Garrison units are drawn mirrored (drawUnit scales y by -1 for team 1), so the device counter-flips for team 1 and reads upright on screen.
  function device(c, kind, x, y, r, pal, team) {
    var k = kind && kind !== 'auto' ? kind : (team === 1 ? 'saltire' : 'cross'), a, b;
    c.save(); c.translate(x, y); if (team === 1) c.scale(1, -1);
    c.strokeStyle = INK; c.lineWidth = Math.max(1.5, r * 0.3); c.lineJoin = 'round'; c.beginPath();
    if (k === 'saltire') { // two diagonal bars; stroke then fill hides the inner crossing lines
      a = r * 0.25; b = r * 1.02;
      c.save(); c.rotate(Math.PI / 4); c.rect(-b, -a, b * 2, a * 2); c.rotate(-Math.PI / 2); c.rect(-b, -a, b * 2, a * 2); c.restore();
    } else if (k === 'roundel') { c.arc(0, 0, r * 0.7, 0, TAU); }
    else { // cross pattee: four arms flaring from a narrow centre
      a = r * 0.2; b = r * 0.52;
      c.moveTo(-b, -r); c.lineTo(b, -r); c.lineTo(a, -a); c.lineTo(r, -b); c.lineTo(r, b); c.lineTo(a, a); c.lineTo(b, r); c.lineTo(-b, r); c.lineTo(-a, a); c.lineTo(-r, b); c.lineTo(-r, -b); c.lineTo(-a, -a); c.closePath();
    }
    c.stroke(); c.fillStyle = pal && pal.dev ? pal.dev : (team === 1 ? IVO : ORP); c.fill();
    c.restore();
  }
  // shield: host = kite (pointed, tall) carrying the cross; garrison = round with a boss carrying the saltire. s = scale (1 = spearman)
  function shield(c, x, y, s, pal, team) {
    if (team === 1) {
      O(c, x, y, 10.5 * s, pal.dark); O(c, x, y, 8.3 * s, pal.main, pal.dark);
      device(c, 'auto', x, y, 6.4 * s, pal, team);
      O(c, x, y, 2.6 * s, pal.metal, pal.metalD);
    } else {
      gshape(c, function (p, dx, dy) {
        var X = x + dx, Y = y + dy;
        p.moveTo(X - 6.8 * s, Y - 13 * s); p.lineTo(X + 6.8 * s, Y - 13 * s); p.quadraticCurveTo(X + 7.2 * s, Y + 4 * s, X, Y + 14.5 * s); p.quadraticCurveTo(X - 7.2 * s, Y + 4 * s, X - 6.8 * s, Y - 13 * s); p.closePath();
      }, pal.main, pal.dark, 2.3 * s);
      device(c, 'auto', x, y - 1.5 * s, 4.9 * s, pal, team);
    }
  }
  // ---- sprite bake plumbing: scratch canvases reused by every sprite (only the finished sprite is a new canvas) ----
  // Canvas 2D is recorded lazily, so every canvas used as a drawImage source is rasterised at bake time: keep their number and area small.
  // All blits are cropped to the class's figure extents (sprite units [x0, y0, x1, y1], measured over every state and both teams, plus 0.8u; a gallery check fails if a drawing leaves its entry) grown by contour + halo.
  var SCR = null, SCRM = {}, SCRN = 0, DIR8 = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
  var EXT = { def: [-46, -74, 46, 46], spear: [-26.7, -65.2, 31.4, 21.6], archer: [-22.1, -40.7, 22, 20], cav: [-18.2, -69.3, 31.6, 38.8], knight: [-39.2, -53.2, 27.2, 22.9],
    mage: [-18.2, -51.9, 34.5, 17.2], cata: [-36.9, -46.2, 30.6, 34.9], healer: [-32.7, -48.5, 32.7, 30.7], assassin: [-16.1, -37.3, 16.3, 30.7], golem: [-35.9, -34.7, 35.8, 24.7],
    flamer: [-16.1, -70.6, 20.7, 31.4], banner: [-18.9, -62.6, 40.2, 20.8], commander: [-41.3, -69.3, 31.6, 38.8] };
  function layer(w, h) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; return { cv: cv, g: cv.getContext('2d') }; }
  // One set of four layers per canvas size: the lane scale, the boss scale, the field scales and the portrait scale alternate, and a set must not be rebuilt each time.
  function scratch(w, h) {
    var k = w + 'x' + h, S = SCRM[k];
    if (!S) {
      if (SCRN >= 6) { SCRM = {}; SCRN = 0; }
      S = SCRM[k] = { w: w, h: h, fig: layer(w, h), comp: layer(w, h), hal: layer(w, h), ov: layer(w, h), ovUsed: false, crop: [0, 0, w, h], Sc: 1, rot: 0 }; SCRN++;
      S.fig.g.ovl = function () { // the hairline layer (bowstring, heal pulse): drawn over the contour, cleared on first use
        if (!S.ovUsed) { S.ovUsed = true; beginLayer(S.ov.g, S.crop, S.Sc); outline(S.ov.g); S.ov.g.rotate(S.rot); }
        return S.ov.g;
      };
    }
    return (SCR = S);
  }
  function cropOf(cls, Sc, w, h) { // figure extents + contour + halo, joined with the ground ticks (which are painted straight onto the sprite)
    var e = EXT[cls] || EXT.def, T = TICKS[cls] || TICKS.def, m = INKW + HALOW + 0.4,
      ux0 = Math.min(e[0] - m, -T[1] - 4.5), uy0 = e[1] - m, ux1 = Math.max(e[2] + m, T[1] * 1.12 + 4.5), uy1 = Math.max(e[3] + m, T[0] + 5),
      x0 = Math.max(0, Math.floor((46 + ux0) * Sc)), y0 = Math.max(0, Math.floor((74 + uy0) * Sc)), x1 = Math.min(w, Math.ceil((46 + ux1) * Sc)), y1 = Math.min(h, Math.ceil((74 + uy1) * Sc));
    return [x0, y0, x1 - x0, y1 - y0];
  }
  function beginLayer(g, K, Sc) { // clean state, then sprite units: origin = ground point at (46, 74) of the 92 x 120 box
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(K[0], K[1], K[2], K[3]);
    g.setTransform(Sc, 0, 0, Sc, 46 * Sc, 74 * Sc);
  }
  // three ink ticks under the feet, where the shadow ellipses used to be: [y of the middle tick, spread] per class (sprite units)
  var TICKS = { def: [22, 11], cav: [39.5, 15], cata: [35, 17], golem: [28, 15], commander: [39.5, 15] };
  function groundTicks(x, Sc, cls) {
    var T = TICKS[cls] || TICKS.def, ln = [6.5, 9, 6.5], xs = [-T[1], 0.2 * T[1], T[1] * 1.12], ys = [T[0], T[0] + 2.2, T[0] - 0.6], i;
    x.save(); x.setTransform(Sc, 0, 0, Sc, 46 * Sc, 74 * Sc); x.strokeStyle = INK; x.lineWidth = 2.2; x.lineCap = 'round';
    for (i = 0; i < 3; i++) { x.beginPath(); x.moveTo(xs[i] - ln[i] / 2, ys[i] + 0.7); x.quadraticCurveTo(xs[i], ys[i] - 1.1, xs[i] + ln[i] / 2, ys[i] + 0.7); x.stroke(); }
    x.restore();
  }
  // banner text face: Texturina (Rub) for words, EB Garamond (Hand) when there are digits (Texturina digits are old-style and proportional)
  function bandFont(text, size) {
    var num = /[0-9]/.test(text || '');
    return (num ? '600 ' : '700 ') + size + 'px ' + (num ? 'Hand' : 'Rub') + ',Hand,"Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif';
  }
  // banderole ground by announcement colour: alarms = madder with ivory text, frost = argent, the rest = or (ink text on or, 9:1)
  function bannerStyle(col) {
    var k = String(col || '').toLowerCase();
    if (k === '#ff6b6b' || k === '#ff9f6b' || k === '#ffb347') return { fill: MAD, ink: IVO, rule: IVO, under: INK2 };
    if (k === '#9bd7ff') return { fill: ARG };
    return { fill: ORP };
  }
  // flat swallow-tail banderole (ink border 3u, ground, ink text): c = context, (x, y) = centre. o: fill, ink (text), size
  function banderole(c, x, y, w, h, text, o) {
    o = o || {};
    var n = Math.min(h * 0.4, 24), x0 = x - w / 2, x1 = x + w / 2, y0 = y - h / 2, y1 = y + h / 2, fill = o.fill || VEL, size = o.size || Math.round(h * 0.56);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 6;
    c.beginPath(); c.moveTo(x0 + 8, y1 - 2); c.lineTo(x0 - 14, y1 + 12); c.lineTo(x0 + 2, y1 + 12 - h * 0.18); c.lineTo(x0 + 8, y1 - 8); c.closePath(); c.stroke(); c.fillStyle = o.under || VEL2; c.fill(); // back fold
    c.beginPath(); c.moveTo(x1 - 8, y1 - 2); c.lineTo(x1 + 14, y1 + 12); c.lineTo(x1 - 2, y1 + 12 - h * 0.18); c.lineTo(x1 - 8, y1 - 8); c.closePath(); c.stroke(); c.fill();
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y0); c.lineTo(x1 - n, y); c.lineTo(x1, y1); c.lineTo(x0, y1); c.lineTo(x0 + n, y); c.closePath(); c.stroke(); c.fillStyle = fill; c.fill();
    c.strokeStyle = o.rule || INK2; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0 + n + 8, y0 + 7); c.lineTo(x1 - n - 8, y0 + 7); c.moveTo(x0 + n + 8, y1 - 7); c.lineTo(x1 - n - 8, y1 - 7); c.stroke();
    if (text) {
      c.font = bandFont(text, size); c.textAlign = 'center'; c.textBaseline = 'middle';
      var tw = c.measureText(text).width, mw = w - 2 * n - 28; if (tw > mw) c.font = bandFont(text, Math.max(16, Math.floor(size * mw / tw)));
      c.fillStyle = o.ink || INK; c.fillText(text, x, y + 1);
    }
    c.restore();
  }
  function star(c, x, y, r1, r2, n, rot) {
    c.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = rot + i * Math.PI / n, r = i % 2 ? r2 : r1; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath();
  }

  // ==== CASTLE AND CAMP KIT (bible section 7) ================================================================================
  // Flat gouache architecture: ashlar #B9AE98 with a hard shade face and 3u ink contours, six ink courses (not bricks), fish-scale cones in --verm with an
  // orpiment ball, gates #5A3A22 with an ink portcullis and an orp keystone, moat --azur with ivory wavy bands; the host camp is azure / ivory striped
  // pavilions, a bister palisade and a standard planted in each gate. All of it is painted once per damage tier into a canvas (R.baseSlot, R.stripSlot) and
  // blitted; only cloth, flames and highlights are drawn per frame (R.baseDyn). Painter space: x = stage u (world u for the field), y = local u.
  function P2(build) { var p = new Path2D(); build(p); return p; }
  function rectP(x, y, w, h) { return P2(function (p) { p.rect(x, y, w, h); }); }
  function bowP(x, y, w, h, b) { return P2(function (p) { p.moveTo(x, y); p.lineTo(x + w, y); p.quadraticCurveTo(x + w + b, y + h / 2, x + w, y + h); p.lineTo(x, y + h); p.quadraticCurveTo(x - b, y + h / 2, x, y); p.closePath(); }); } // sides bow out by b
  function polyP(pts) { return P2(function (p) { p.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); }); }
  // two-pass iron-gall stroke of a Path2D: --ink2 shifted 0.6u at alpha .6, then the --ink core
  function pen2(c, P, w) {
    var ga = c.globalAlpha; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round';
    c.save(); c.translate(0.6, 0.6); c.globalAlpha = ga * 0.6; c.strokeStyle = INK2; c.stroke(P); c.restore();
    c.strokeStyle = INK; c.stroke(P);
  }
  // gou: ink contour (lw = full stroke width, half of it shows outside the fill), flat pigment, optional hard shade: o.sh = shade pigment, o.dx / o.dy = how far the lit face sits up-left of it
  function gou(c, P, col, o) {
    o = o || {}; pen2(c, P, o.lw || 6);
    if (o.sh) { c.fillStyle = o.sh; c.fill(P); c.save(); c.clip(P); c.translate(-(o.dx || 0), -(o.dy || 0)); c.fillStyle = col; c.fill(P); c.restore(); }
    else { c.fillStyle = col; c.fill(P); }
  }
  function ball(c, x, y, r, col, sh) { gou(c, P2(function (p) { p.arc(x, y, r, 0, TAU); }), col || ORP, { lw: 4.4, sh: sh || LEAFD, dx: r * 0.34, dy: r * 0.34 }); tick(c, x, y, r); }
  function heater(p, x, y, w, h) { // heater shield outline centred on (x, y)
    var a = w / 2, t = y - h / 2;
    p.moveTo(x - a, t); p.lineTo(x + a, t); p.lineTo(x + a, y + h * 0.04); p.quadraticCurveTo(x + a, y + h * 0.36, x, y + h / 2); p.quadraticCurveTo(x - a, y + h * 0.36, x - a, y + h * 0.04); p.closePath();
  }
  function saltire(c, x, y, w, h, wd) { // argent saltire between the four corners of a w x h box, ink edged, ends flat
    var D = P2(function (p) { p.moveTo(x - w / 2, y - h / 2); p.lineTo(x + w / 2, y + h / 2); p.moveTo(x + w / 2, y - h / 2); p.lineTo(x - w / 2, y + h / 2); });
    c.lineCap = 'butt'; c.lineWidth = wd + 1.8; c.strokeStyle = INK; c.stroke(D); c.lineWidth = wd; c.strokeStyle = IVO; c.stroke(D);
  }
  function shieldGules(c, x, y, w, h) { // the garrison's blazon: gules, a saltire argent
    var P = P2(function (p) { heater(p, x, y, w, h); });
    gou(c, P, VERM, { lw: 4.6, sh: VERMD, dx: w * 0.16, dy: h * 0.08 });
    c.save(); c.clip(P); saltire(c, x, y, w, h * 0.92, w * 0.22); c.restore();
  }
  function ticksRow(c, x0, x1, y, rn, skip) { // groups of three short ink ticks where the ground meets the foot (instead of a shadow), every ~55u
    var P = P2(function (p) {
      for (var x = x0 + 18 + rn() * 20; x < x1 - 10; x += 44 + rn() * 26) {
        if (skip && skip(x)) continue;
        p.moveTo(x - 9, y + 0.6); p.quadraticCurveTo(x - 5, y - 0.9, x - 2.4, y + 0.4); p.moveTo(x + 1, y + 1.8); p.quadraticCurveTo(x + 5.5, y + 0.4, x + 9, y + 1.6); p.moveTo(x + 14, y); p.lineTo(x + 18, y + 0.6);
      }
    });
    c.strokeStyle = INK; c.lineWidth = 2; c.lineCap = 'round'; c.stroke(P);
  }
  function courseLines(c, x0, x1, ys, rn, bow) { // ink courses: one hand-ruled line per y; bow > 0 curves them downward (cylinders)
    var P = P2(function (p) {
      for (var i = 0; i < ys.length; i++) {
        var j0 = rn() * 0.8 - 0.4, j1 = rn() * 0.8 - 0.4; p.moveTo(x0, ys[i] + j0);
        if (bow) p.quadraticCurveTo((x0 + x1) / 2, ys[i] + bow + j1, x1, ys[i] + j0); else p.lineTo(x1, ys[i] + j1);
      }
    });
    pen2(c, P, 1.3);
  }
  function joints(c, x0, x1, ys, rn, step) { // sparse staggered vertical joints between the courses (ys = course lines), a stone is ~50u long
    var P = P2(function (p) {
      for (var i = 0; i + 1 < ys.length; i++) for (var x = x0 + 8 + (i % 2) * (step / 2) + rn() * 8; x < x1 - 3; x += step + rn() * 12) { p.moveTo(x, ys[i] + 0.7); p.lineTo(x + rn() * 0.8 - 0.4, ys[i + 1] - 0.5); }
    });
    c.strokeStyle = INK; c.lineWidth = 1.1; c.lineCap = 'round'; c.stroke(P);
  }
  function crackP(p, bx, y0, y1, d) { // a jagged ink crack with one branch
    var h = y1 - y0;
    p.moveTo(bx, y0); p.lineTo(bx - 3 * d, y0 + h * 0.24); p.lineTo(bx + 2 * d, y0 + h * 0.46); p.lineTo(bx - 2.5 * d, y0 + h * 0.7); p.lineTo(bx + 2 * d, y1); p.moveTo(bx + 2 * d, y0 + h * 0.46); p.lineTo(bx + 8 * d, y0 + h * 0.6);
  }

  // ---- fish-scale cone with an orpiment ball (the pinwheel is gone) ----
  function paintCone(c, cx, yE, hw, H) {
    var bw = hw + 6, yT = yE - H, i, k, R, sc, rp = 5.2, r = 4.6, x, yk, hk, ys;
    gou(c, polyP([[cx - bw, yE - 1], [cx + bw, yE - 1], [cx + bw - 3, yE + 5], [cx - bw + 3, yE + 5]]), MAD, { lw: 4.8, sh: mixHex(MAD, INK, 0.45), dx: 0, dy: 2.4 }); // eave band
    R = P2(function (p) { p.moveTo(cx - bw, yE); p.quadraticCurveTo(cx - bw * 0.4, yE - H * 0.52, cx, yT); p.quadraticCurveTo(cx + bw * 0.4, yE - H * 0.52, cx + bw, yE); p.closePath(); });
    pen2(c, R, 6.4); c.fillStyle = VERM; c.fill(R);
    c.save(); c.clip(R);
    c.fillStyle = VERMD; c.beginPath(); c.moveTo(cx - 0.6, yT - 2); c.lineTo(cx + bw + 4, yE + 3); c.lineTo(cx + bw * 0.2, yE + 3); c.closePath(); c.fill(); // hard shade on the right
    sc = P2(function (p) { // fish scales: rows of lower half circles, every other row offset
      for (k = 0; (yk = yT + 6 + k * rp) < yE + 3; k++) { hk = bw * Math.min(1, (yk - yT) / H) + r; for (x = cx - hk + (k % 2) * r; x < cx + hk + r; x += r * 2) { p.moveTo(x + r, yk); p.arc(x, yk, r, 0, Math.PI, false); } }
    });
    c.strokeStyle = INK; c.lineWidth = 1.15; c.lineCap = 'round'; c.globalAlpha = 0.8; c.stroke(sc); c.globalAlpha = 1;
    c.restore();
    c.strokeStyle = IVO; c.lineWidth = 1.9; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - bw * 0.34, yE - H * 0.3); c.quadraticCurveTo(cx - bw * 0.26, yE - H * 0.62, cx - bw * 0.07, yT + H * 0.2); c.stroke(); // ivory tick
    ball(c, cx, yT + 0.5, 4.7);
  }

  // ---- round tower: ashlar cylinder with a lit edge and a shade side, machicolations, six curved ink courses, the garrison's shield ----
  function paintTower(c, t, rn) {
    var x = t.x, hw = t.hw, y0 = t.yT, y1 = t.yB, sp = (y1 - y0 - 15) / 5, ys = [], i;
    gou(c, bowP(x - hw, y0, hw * 2, y1 - y0, 1.3), ASH, { lw: 6, sh: ASHD, dx: hw * 0.62, dy: 0 });
    c.fillStyle = ASHL; c.fillRect(x - hw, y0 + 7, 4.4, y1 - y0 - 9);                                        // lit edge
    for (i = 0; i < 6; i++) ys.push(y0 + 10 + i * sp);
    courseLines(c, x - hw + 1, x + hw - 1, ys, rn, 2.4);
    gou(c, rectP(x - hw - 2.5, y0, hw * 2 + 5, 7.5), ASHD, { lw: 4.8 });                                      // machicolation band
    c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); for (i = 1; i < 8; i++) { c.moveTo(x - hw - 2.5 + i * (hw * 2 + 5) / 8, y0 + 1); c.lineTo(x - hw - 2.5 + i * (hw * 2 + 5) / 8, y0 + 7); } c.stroke();
    shieldGules(c, x, y0 + 30, 19, 23);
  }

  // ---- gatehouse: ashlar block with merlons, an arch of voussoirs with an orp keystone, half open #5A3A22 doors, an ink portcullis, torches ----
  function paintGate(c, g, rn, dyn) {
    var x = g.x, hw = g.hw, yT = g.yT, yF = g.yF, yB = g.yB, ow = g.ow, yS = g.yS, yC = yS - ow, i, ys = [], sp = (yB - yF - 8) / 5, mw = hw * 2 / 5 * 0.62, mx, P, k, a;
    for (i = 0; i < 5; i++) { mx = x - hw + (i + 0.5) * hw * 2 / 5 - mw / 2; gou(c, rectP(mx, yT, mw, yF - yT + 2), ASH, { lw: 4.8, sh: ASHD, dx: 3.4, dy: 0 }); }
    gou(c, bowP(x - hw, yF, hw * 2, yB - yF, 0.8), ASH, { lw: 6, sh: ASHD, dx: 9, dy: 0 });
    c.fillStyle = ASHD; c.fillRect(x - hw, yF, hw * 2 - 8, 5);
    for (i = 0; i < 6; i++) ys.push(yF + 5 + i * sp);
    courseLines(c, x - hw + 1, x + hw - 1, ys, rn, 0); joints(c, x - hw + 1, x + hw - 1, ys, rn, 40);
    // arch ring
    gou(c, P2(function (p) { p.moveTo(x - ow - 6, yB); p.lineTo(x - ow - 6, yS); p.arc(x, yS, ow + 6, Math.PI, 0, false); p.lineTo(x + ow + 6, yB); p.closePath(); }), ASHL, { lw: 4.6 });
    P = P2(function (p) { for (var q = 1; q < 6; q++) { var an = Math.PI + q * Math.PI / 6; p.moveTo(x + Math.cos(an) * (ow + 0.6), yS + Math.sin(an) * (ow + 0.6)); p.lineTo(x + Math.cos(an) * (ow + 6), yS + Math.sin(an) * (ow + 6)); } });
    c.strokeStyle = INK; c.lineWidth = 1.3; c.lineCap = 'round'; c.stroke(P);
    P = P2(function (p) { p.moveTo(x - ow, yB); p.lineTo(x - ow, yS); p.arc(x, yS, ow, Math.PI, 0, false); p.lineTo(x + ow, yB); p.closePath(); });
    c.fillStyle = INK; c.fill(P);
    // doors, half open, hinged at the jambs
    for (k = -1; k <= 1; k += 2) {
      gou(c, polyP([[x + k * ow, yS + 1], [x + k * (ow - 10.5), yS + 6.5], [x + k * (ow - 10.5), yB], [x + k * ow, yB]]), GATE, { lw: 3.4, sh: mixHex(GATE, INK, 0.4), dx: -k * 3, dy: 0 });
      c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + k * ow, yS + 12); c.lineTo(x + k * (ow - 10.5), yS + 15); c.moveTo(x + k * ow, yB - 11); c.lineTo(x + k * (ow - 10.5), yB - 11); c.stroke();
    }
    // portcullis: iron bars hanging in the arch, ink edged (the bars show against the dark opening)
    a = P2(function (p) { for (var q = -2; q <= 2; q++) { p.moveTo(x + q * ow * 0.34, yC + 1.5); p.lineTo(x + q * ow * 0.34, yC + 15.5 - Math.abs(q) * 3.4); } p.moveTo(x - ow * 0.8, yC + 6.5); p.lineTo(x + ow * 0.8, yC + 6.5); p.moveTo(x - ow * 0.66, yC + 11.5); p.lineTo(x + ow * 0.66, yC + 11.5); });
    c.lineCap = 'round'; c.lineWidth = 4.2; c.strokeStyle = INK; c.stroke(a); c.lineWidth = 2.1; c.strokeStyle = METALD; c.stroke(a);
    // keystone: orpiment face over a bole misregistration
    gou(c, polyP([[x - 4.4, yC - 6.6], [x + 4.4, yC - 6.6], [x + 3.2, yC + 0.8], [x - 3.2, yC + 0.8]]), ORP, { lw: 3.2, sh: BOLE, dx: -1.2, dy: -1.2 });
    // torch brackets and a pennon pole (the flames and the cloth are per frame)
    for (k = -1; k <= 1; k += 2) {
      var tx = x + k * (ow + 14.5), ty = yS + 4;
      c.strokeStyle = INK; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(tx, ty + 12); c.lineTo(tx, ty + 1); c.stroke(); c.strokeStyle = BIS; c.lineWidth = 2; c.stroke();
      gou(c, polyP([[tx - 3.4, ty - 3], [tx + 3.4, ty - 3], [tx + 2.2, ty + 2], [tx - 2.2, ty + 2]]), METALD, { lw: 2.8 });
      dyn.torch.push({ x: tx, y: ty - 3, s: 1 });
    }
    if (g.pen) { c.strokeStyle = INK; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, yT + 1); c.lineTo(x, yT - 17); c.stroke(); dyn.pen.push({ x: x, y: yT - 13, len: 17, hgt: 9, col: VERM }); }
    if (yC - 6.6 - yF > 16) shieldGules(c, x, (yF + yC - 6.6) / 2 + 2, 14, 17);   // the blazon between the parapet and the keystone
  }

  // ---- curtain wall: merlons, ashlar face with a parapet shade and six ink courses, gonfanon bars, damage ----
  function paintWall(c, S, tier, rn, dyn) {
    var x0 = S.x0, x1 = S.x1, yM = S.yM, yF = S.yF, yB = S.yB, i, k, n = Math.floor((x1 - x0 - 8) / 24), vis = [], broken = {}, ys = [], nc = S.nc || 6, sp = (yB - yF - 8) / (nc - 1), bx, hole;
    function covered(cx) { var q; for (q = 0; q < S.gates.length; q++) if (Math.abs(cx - S.gates[q].x) < S.gates[q].hw + 5) return true; for (q = 0; q < S.towers.length; q++) if (Math.abs(cx - S.towers[q].x) < S.towers[q].hw + 4) return true; return false; }
    for (i = 0; i < n; i++) if (!covered(x0 + 8 + i * 24 + 8)) vis.push(i);
    vis.sort(function (a, b) { return hash(a * 3.31 + 5) - hash(b * 3.31 + 5); });
    for (i = 0; i < (tier === 1 ? 2 : tier === 2 ? 7 : 0) && i < vis.length; i++) broken[vis[i]] = true;
    for (k = 0; k < vis.length; k++) { // merlons stand behind the face; the broken ones are jagged stumps
      i = vis[k]; bx = x0 + 8 + i * 24 + (hash(i * 2.9 + 1) - 0.5) * 1.6;
      gou(c, broken[i] ? polyP([[bx, yF + 2], [bx, yF - 3.5], [bx + 4, yF - 6.5], [bx + 8, yF - 4], [bx + 11.5, yF - 7.5], [bx + 16, yF - 3.5], [bx + 16, yF + 2]]) : rectP(bx, yM + (hash(i * 4.1 + 2) - 0.5) * 1.5, 15.4 + hash(i * 1.3) * 1.2, yF - yM + 2), ASH, { lw: 4.8, sh: ASHD, dx: 4.5, dy: 0 });
    }
    gou(c, rectP(x0, yF, x1 - x0, yB - yF), ASH, { lw: 6 });
    c.fillStyle = ASHD; c.fillRect(x0, yF, x1 - x0, 5);
    for (i = 0; i < nc; i++) ys.push(yF + 5 + i * sp);
    courseLines(c, x0, x1, ys, rn, 0); joints(c, x0, x1, ys, rn, 52);
    for (i = 0; i < S.bays.length; i++) { // gonfanon bars (the cloth hangs from them per frame); the two bays beside the middle gate lose theirs when the wall is breached
      bx = S.bays[i]; if (tier === 2 && (i === 1 || i === 2) && S.bays.length > 3) continue;
      gou(c, rectP(bx - 14.5, yF + 1, 29, 3.4), WOOD, { lw: 3 }); ball(c, bx - 15, yF + 2.7, 2.7); ball(c, bx + 15, yF + 2.7, 2.7);
      dyn.gon.push({ x: bx, y: yF + 5, w: S.gonW, h: S.gonH, col: VERM, dev: 'saltire' });
    }
    if (tier === 2) { // breach: a jagged dark hole with a broken ashlar rim and rubble at the foot (the two bays beside the middle gate)
      for (k = 1; k <= 2 && S.bays.length > 3; k++) {
        bx = S.bays[k]; var cy = (yF + yB) / 2 + 3, pts = [], a, rr;
        for (i = 0; i < 11; i++) { a = i * TAU / 11 + 0.3; rr = 0.6 + 0.4 * hash(i * 7.7 + bx); pts.push([bx + Math.cos(a) * 14 * rr, cy + Math.sin(a) * (yB - yF) * 0.46 * rr]); }
        hole = polyP(pts); c.lineJoin = 'round'; c.lineWidth = 8; c.strokeStyle = ASHD; c.stroke(hole); c.fillStyle = INK; c.fill(hole);
        for (i = 0; i < 4; i++) gou(c, polyP([[bx - 14 + i * 8.5, yB - 0.5], [bx - 13 + i * 8.5, yB - 5 - (i % 2) * 2.5], [bx - 8 + i * 8.5, yB - 4.5 - (i % 2) * 2], [bx - 6.5 + i * 8.5, yB - 0.5]]), ASH, { lw: 2.6, sh: ASHD, dx: 1.6, dy: 1 });
      }
    }
  }

  // ---- moat: azure with ivory wavy bands, ink banks, a plank bridge at every gate ----
  function paintMoat(c, S, rn) {
    var y0 = S.yB + 2, hh = 34, x0 = S.x0, x1 = S.x1, i, x, a, P, gx;
    gou(c, rectP(x0, y0, x1 - x0, hh), AZUR, { lw: 6, sh: WATERD, dx: 0, dy: 9 });
    for (i = 0; i < 3; i++) {
      a = rn() * 6; P = P2(function (p) { for (x = x0; x <= x1 + 6; x += 5) { var yy = y0 + 8 + i * 8.6 + Math.sin(x / 22 * TAU / 2.4 + a + i * 1.7) * 1.7; if (x === x0) p.moveTo(x, yy); else p.lineTo(x, yy); } });
      c.strokeStyle = IVO; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(P);
    }
    for (i = 0; i < S.gates.length; i++) {
      gx = S.gates[i].x;
      gou(c, rectP(gx - 33, y0 - 7, 66, hh + 9), WOOD, { lw: 5, sh: WOODD, dx: 9, dy: 0 });
      P = P2(function (p) { for (var q = 1; q < 6; q++) { p.moveTo(gx - 33, y0 - 7 + q * (hh + 9) / 6); p.lineTo(gx + 33, y0 - 7 + q * (hh + 9) / 6); } });
      c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke(P);
    }
  }

  // ---- the garrison's castle: moat, wall, gatehouses, towers, cones ----
  function paintCastle(c, S, tier, rn, dyn) {
    var i, t;
    if (S.moat) paintMoat(c, S, rn);
    paintWall(c, S, tier, rn, dyn);
    for (i = 0; i < S.gates.length; i++) { S.gates[i].pen = S.gatePen; paintGate(c, S.gates[i], rn, dyn); }
    for (i = 0; i < S.towers.length; i++) { t = S.towers[i]; paintTower(c, t, rn); }
    for (i = 0; i < S.towers.length; i++) {
      t = S.towers[i]; paintCone(c, t.x, t.yT, t.hw, t.H);
      if (S.towerPen) { c.strokeStyle = INK; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(t.x, t.yT - t.H); c.lineTo(t.x, t.yT - t.H - 15); c.stroke(); dyn.pen.push({ x: t.x, y: t.yT - t.H - 11, len: 17, hgt: 9, col: VERM }); }
      dyn.burn.push({ x: t.x + 4, y: t.yT + 2, s: 1.2 });
    }
    if (tier >= 1) { // cracks: on the outer towers, gatehouses and bays when the wall is hurt, everywhere at the last tier
      t = P2(function (p) {
        S.towers.forEach(function (tw, q) { if (tier === 2 || q % 2 === 0) crackP(p, tw.x + (q % 2 ? -20 : 20), tw.yT + 10, tw.yB - 3, q % 2 ? -1 : 1); });
        S.gates.forEach(function (g, q) { if (tier === 2 || q !== 1) crackP(p, g.x + (q % 2 ? 38 : -38), g.yF + 7, g.yB - 3, q % 2 ? 1 : -1); });
        S.bays.forEach(function (bx, q) { if (tier === 2 || q === 0 || q === S.bays.length - 1) crackP(p, bx + (q % 2 ? -18 : 18), S.yF + 6, S.yB - 3, q % 2 ? -1 : 1); });
      });
      pen2(c, t, 2.3);
    }
    if (!S.moat) ticksRow(c, S.x0, S.x1, S.yB + 5, rn, function (x) { for (var q = 0; q < S.gates.length; q++) if (Math.abs(x - S.gates[q].x) < S.gates[q].ow + 12) return true; return false; });
  }

  // ---- the host camp (screen orientation, field side up): trodden earth, sand paths, palisade, pavilions, fires, planted standards ----
  function paintPavilion(c, p) { // azure and ivory gores, a scalloped valance, a dark door, an orp finial (the pennon is per frame)
    var x = p.x, yB = p.yB, hw = p.hw, H = p.H, yT = yB - H, bw = hw + 2, m = Math.max(5, Math.round(bw * 2 / 7)), r = bw / m, i, R, cs = [LAPIS, IVO, LAPIS, IVO, VEL];
    for (i = 0; i < m; i++) gou(c, P2(function (q) { q.arc(x - bw + r * (2 * i + 1), yB, r, 0, Math.PI, false); q.closePath(); }), i % 2 ? IVO : LAPIS, { lw: 3.6 });
    R = P2(function (q) { q.moveTo(x - bw, yB); q.quadraticCurveTo(x - bw * 0.38, yB - H * 0.52, x, yT); q.quadraticCurveTo(x + bw * 0.38, yB - H * 0.52, x + bw, yB); q.closePath(); });
    pen2(c, R, 6.2); c.fillStyle = IVO; c.fill(R);
    c.save(); c.clip(R);
    for (i = 0; i < 5; i++) { c.fillStyle = i === 4 ? LAPISD : i === 3 ? VEL : cs[i]; c.beginPath(); c.moveTo(x, yT - 2); c.lineTo(x - bw + i * bw * 0.4 - (i ? 0 : 3), yB + 2); c.lineTo(x - bw + (i + 1) * bw * 0.4 + (i === 4 ? 3 : 0), yB + 2); c.closePath(); c.fill(); }
    c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); for (i = 1; i < 5; i++) { c.moveTo(x, yT); c.lineTo(x - bw + i * bw * 0.4, yB + 1); } c.stroke();
    c.restore();
    c.fillStyle = INK; c.beginPath(); c.moveTo(x - bw * 0.2, yB + 1.5); c.lineTo(x, yB - H * 0.34); c.lineTo(x + bw * 0.2, yB + 1.5); c.closePath(); c.fill();
    c.strokeStyle = IVO; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - bw * 0.2 - 1, yB + 1); c.lineTo(x - 1.5, yB - H * 0.26); c.stroke();
    ball(c, x, yT - 0.5, 3.3);
    c.strokeStyle = INK; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, yT - 2); c.lineTo(x, yT - 13); c.stroke();
  }
  function paintFire(c, x, y) { // stone ring and crossed logs; the flames are per frame
    var i, a;
    c.strokeStyle = INK; c.lineWidth = 5.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 8, y - 1); c.lineTo(x + 8, y + 2); c.moveTo(x - 8, y + 2); c.lineTo(x + 8, y - 1); c.stroke();
    c.strokeStyle = BIS; c.lineWidth = 3; c.stroke();
    for (i = 0; i < 8; i++) { a = i * TAU / 8 + 0.3; gou(c, P2(function (p) { p.arc(x + Math.cos(a) * 11, y + 2 + Math.sin(a) * 4.6, 2.5, 0, TAU); }), ASH, { lw: 3, sh: ASHD, dx: 0.8, dy: 0.8 }); }
  }
  function paintStandard(c, x, yBase, yTop, dyn, team) { // planted pole, orp spearhead, crossbar; the gonfanon hangs from the bar per frame
    c.fillStyle = INK; c.beginPath(); c.ellipse(x, yBase + 1, 9, 3.6, 0, 0, TAU); c.fill(); c.fillStyle = WOODD; c.beginPath(); c.ellipse(x, yBase, 7.4, 2.7, 0, 0, TAU); c.fill();
    gou(c, rectP(x - 1.9, yTop, 3.8, yBase - yTop), WOOD, { lw: 3.6, sh: WOODD, dx: 1.5, dy: 0 });
    gou(c, polyP([[x, yTop - 10], [x + 3.4, yTop - 1], [x, yTop + 1.5], [x - 3.4, yTop - 1]]), ORP, { lw: 3, sh: LEAFD, dx: 1.1, dy: 1.1 });
    gou(c, rectP(x - 14, yTop + 4, 28, 3), WOOD, { lw: 3 }); ball(c, x - 14.5, yTop + 5.5, 2.4); ball(c, x + 14.5, yTop + 5.5, 2.4);
    dyn.gon.push({ x: x, y: yTop + 8, w: 24, h: 33, col: LAPIS, dev: 'cross' });
  }
  function paintCamp(c, S, tier, rn, dyn) {
    var x, i, k, q, a, b, yy, gx, P, st, t0, brk, ln, top = [], dmg = tier === 2 ? 0.34 : tier === 1 ? 0.14 : 0, cur;
    var all = new Path2D(), sh = new Path2D(), lt = new Path2D(), dk = new Path2D(), yt = S.stakeTop, yb = S.stakeBase, w = 13.6, stp = 14.6;
    for (x = S.x0; x <= S.x1 + 12; x += 12) top.push([x, S.yPad + Math.sin(x * 0.045) * 1.5 + (rn() - 0.5) * 1.5]);
    gou(c, P2(function (p) { p.moveTo(top[0][0], top[0][1]); for (var n = 1; n < top.length; n++) p.lineTo(top[n][0], top[n][1]); p.lineTo(S.x1 + 12, S.yBot); p.lineTo(S.x0, S.yBot); p.closePath(); }), EARTH, { lw: 6 });
    P = P2(function (p) { for (var n = 0; n < 46; n++) { var dx = S.x0 + 6 + rn() * (S.x1 - S.x0 - 12), dy = S.yPad + 8 + rn() * (S.yBot - S.yPad - 14), ln = 3 + rn() * 5; p.moveTo(dx, dy); p.lineTo(dx + ln, dy + rn() * 1.2 - 0.6); } });
    c.strokeStyle = INK2; c.globalAlpha = 0.5; c.lineWidth = 1.5; c.lineCap = 'round'; c.stroke(P); c.globalAlpha = 1;
    for (i = 0; i < S.gates.length; i++) { // sand paths from the gates, edges pricked like the roads of the map
      gx = S.gates[i].x;
      c.fillStyle = SAND; c.fill(polyP([[gx - 54, S.yPad + 3], [gx + 54, S.yPad + 3], [gx + 48, S.yBot - 1], [gx - 48, S.yBot - 1]]));
      c.save(); c.setLineDash([0.1, 5.4]); c.strokeStyle = INK2; c.lineWidth = 2; c.lineCap = 'round'; c.globalAlpha = 0.7; c.beginPath(); c.moveTo(gx - 54, S.yPad + 4); c.lineTo(gx - 48, S.yBot - 2); c.moveTo(gx + 54, S.yPad + 4); c.lineTo(gx + 48, S.yBot - 2); c.stroke(); c.restore();
    }
    function gateGap(sx) { for (var n = 0; n < S.gates.length; n++) if (Math.abs(sx + w / 2 - S.gates[n].x) < S.gates[n].hw) return true; return false; }
    for (x = S.x0 + 2, k = 0; x < S.x1 - 4; x += stp, k++) { // palisade: pointed bister stakes in two tones, the right edge in shade; broken ones by tier; gaps at the gates
      if (gateGap(x)) continue;
      brk = hash(k * 5.3 + 1.7) < dmg; t0 = brk ? yt + 7 + hash(k) * 10 : yt + (hash(k * 2.3 + 0.4) - 0.5) * 3.2; ln = (hash(k * 1.9 + 0.8) - 0.5) * 1.6;
      st = brk ? [[x, yb], [x, t0 + 3], [x + 3.2, t0 - 1], [x + 6, t0 + 3.5], [x + 9.6, t0 - 2.5], [x + w, t0 + 2], [x + w, yb]] : [[x, yb], [x + ln * 0.3, t0 + 7], [x + w / 2 + ln, t0], [x + w + ln * 0.3, t0 + 7], [x + w, yb]];
      cur = k % 2 ? dk : lt;
      cur.moveTo(st[0][0], st[0][1]); all.moveTo(st[0][0], st[0][1]);
      for (i = 1; i < st.length; i++) { cur.lineTo(st[i][0], st[i][1]); all.lineTo(st[i][0], st[i][1]); }
      cur.closePath(); all.closePath();
      sh.moveTo(x + w - 4.2, yb); sh.lineTo(x + w - 4.2, brk ? t0 + 4 : yt + 4.8); sh.lineTo(x + w, brk ? t0 + 2 : yt + 7); sh.lineTo(x + w, yb); sh.closePath();
    }
    c.lineJoin = 'round'; c.lineWidth = 5.2; c.strokeStyle = INK; c.stroke(all); c.fillStyle = WOOD; c.fill(lt); c.fillStyle = BIS; c.fill(dk); c.fillStyle = WOODD; c.fill(sh);
    for (i = 0; i < 2; i++) { // two lashings across every run of stakes
      yy = yb - 21 + i * 12; P = new Path2D(); a = S.x0;
      for (q = 0; q <= S.gates.length; q++) { b = q < S.gates.length ? S.gates[q].x - S.gates[q].hw : S.x1; if (b - a > 6) { P.moveTo(a, yy); P.lineTo(b, yy); } if (q < S.gates.length) a = S.gates[q].x + S.gates[q].hw; }
      c.strokeStyle = INK; c.lineWidth = 2.6; c.lineCap = 'butt'; c.stroke(P);
    }
    for (i = 0; i < S.gates.length; i++) { // gate posts with orp balls
      gx = S.gates[i].x;
      for (q = -1; q <= 1; q += 2) { a = gx + q * (S.gates[i].hw + 4.5); gou(c, rectP(a - 5, yt - 4, 10, yb + 8 - yt), WOOD, { lw: 4.6, sh: WOODD, dx: 3.4, dy: 0 }); ball(c, a, yt - 5.5, 4.2); }
    }
    for (i = 0; i < S.pav.length; i++) {
      paintPavilion(c, S.pav[i]); dyn.pen.push({ x: S.pav[i].x, y: S.pav[i].yB - S.pav[i].H - 9, len: 15, hgt: 8, col: VERM });
      dyn.burn.push({ x: S.pav[i].x, y: S.pav[i].yB - S.pav[i].H * 0.55, s: 0.9 + S.pav[i].hw / 36 });
    }
    for (i = 0; i < S.fires.length; i++) { paintFire(c, S.fires[i][0], S.fires[i][1]); dyn.fire.push({ x: S.fires[i][0], y: S.fires[i][1] + 1, s: 1 }); }
    for (i = 0; i < S.stds.length; i++) paintStandard(c, S.stds[i][0], S.stds[i][1], S.stdTop, dyn);
    ticksRow(c, S.x0, S.x1, S.yBot + 4.5, rn, null);
  }

  // ---- per-frame cloth and flames (flat, ink edged; the poles and bars are baked) ----
  function gonfanon(c, x, y, w, h, sw, col, dev) { // three-tailed banner hanging from a bar at (x, y): gules + saltire argent (garrison) or azure + cross pattee or (host)
    var l = x - w / 2, r = x + w / 2, m = h * 0.72, s1 = sw * 0.45, w3 = w / 3, d;
    c.beginPath(); c.moveTo(l, y); c.lineTo(r, y); c.lineTo(r + s1, y + m); c.lineTo(r - w3 * 0.5 + sw, y + h); c.lineTo(r - w3 + s1, y + m); c.lineTo(r - w3 * 1.5 + sw, y + h); c.lineTo(l + w3 + s1, y + m); c.lineTo(l + w3 * 0.5 + sw, y + h); c.lineTo(l + s1, y + m); c.closePath();
    c.lineJoin = 'round'; c.lineWidth = 3.4; c.strokeStyle = INK; c.stroke(); c.fillStyle = col; c.fill();
    c.fillStyle = col === VERM ? VERMD : LAPISD; c.fillRect(r - w3 * 0.55 + s1 * 0.5, y + 1.7, w3 * 0.55, m - 3);          // hard shade on the fly edge
    if (dev === 'saltire') {
      d = [l + 3.6, y + 3.4, r - 3.6 + s1, y + m - 3.4];
      c.lineCap = 'butt'; c.beginPath(); c.moveTo(d[0], d[1]); c.lineTo(d[2], d[3]); c.moveTo(d[2] - (r - l - 7.2), d[1]); c.lineTo(d[0] + (r - l - 7.2) + s1, d[3]); c.lineWidth = w * 0.2 + 1.7; c.strokeStyle = INK; c.stroke(); c.lineWidth = w * 0.2; c.strokeStyle = IVO; c.stroke();
    } else if (dev === 'cross') device(c, 'cross', x + s1 * 0.5, y + m * 0.5, w * 0.34, PAL[0], 0);
  }
  function pennon(c, x, y, len, hgt, sw, col) { // small swallow-tail flag flying from a pole at (x, y)
    c.beginPath(); c.moveTo(x, y - hgt / 2); c.lineTo(x + len + sw, y - hgt / 2 + sw * 0.15); c.lineTo(x + len * 0.74 + sw * 0.7, y); c.lineTo(x + len + sw, y + hgt / 2 + sw * 0.1); c.lineTo(x, y + hgt / 2); c.closePath();
    c.lineJoin = 'round'; c.lineWidth = 3.2; c.strokeStyle = INK; c.stroke(); c.fillStyle = col; c.fill();
  }
  function flame(c, x, y, w, h) { // flat flame, (x, y) = base centre: vermilion with an ink edge and an or core
    c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 1.05, y - h * 0.55, x + w * 0.1, y - h); c.quadraticCurveTo(x + w * 1.1, y - h * 0.5, x + w, y); c.quadraticCurveTo(x, y + w * 0.75, x - w, y); c.closePath();
    c.lineJoin = 'round'; c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke(); c.fillStyle = VERM; c.fill();
    c.beginPath(); c.moveTo(x - w * 0.5, y - 0.5); c.quadraticCurveTo(x - w * 0.5, y - h * 0.35, x + w * 0.1, y - h * 0.62); c.quadraticCurveTo(x + w * 0.6, y - h * 0.3, x + w * 0.5, y - 0.5); c.quadraticCurveTo(x, y + w * 0.35, x - w * 0.5, y - 0.5); c.closePath(); c.fillStyle = ORP; c.fill();
  }
  function silhouette(cv, col) { // the baked canvas as one flat tincture (the hit flash)
    var o = document.createElement('canvas'), g; o.width = cv.width; o.height = cv.height; g = o.getContext('2d');
    if (!g) return cv;
    g.drawImage(cv, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, o.width, o.height);
    return o;
  }

  // ---- layouts (painter space): the lane castle and camp, the field battle's wall and camp (world u) ----
  function castleSpec(self, moat) { // lane castle: local y 0 = castle top, ground line at CASTLE_H; towers and gates stay in their old slots
    var ox = self.ox, h = CASTLE_H, S = { x0: -3, x1: self.W + 3, yM: 30, yF: 42, yB: h, moat: moat, nc: 6, gonW: 24, gonH: 34, towerPen: false, gatePen: false, towers: [], gates: [], bays: [] }, i;
    [44, 240, 480, 676].forEach(function (tx) { S.towers.push({ x: ox + tx, hw: 30, yT: 36, yB: h + 3, H: 36 }); });
    for (i = 0; i < 3; i++) S.gates.push({ x: self.laneX(i), hw: 44, yT: 7, yF: 17, yB: h, ow: 19, yS: 64 });
    [187, 293, 427, 533].forEach(function (bx) { S.bays.push(ox + bx); });
    return S;
  }
  function campSpec(self) { // lane camp: local y 0 = stake tips (the field edge), the pad ends at 86
    var ox = self.ox, S = { x0: -3, x1: self.W + 3, yPad: 28, yBot: 86, stakeTop: 0, stakeBase: 36, stdTop: -4, gates: [], pav: [], fires: [[ox + 242, 79], [ox + 478, 79]], stds: [] }, i;
    for (i = 0; i < 3; i++) { S.gates.push({ x: self.laneX(i), hw: 50 }); S.stds.push([self.laneX(i), 46]); }
    S.pav = [{ x: ox + 38, yB: 82, hw: 20, H: 37 }, { x: ox + 207, yB: 80, hw: 25, H: 45 }, { x: ox + 270, yB: 76, hw: 17, H: 33 }, { x: ox + 450, yB: 76, hw: 17, H: 33 }, { x: ox + 513, yB: 80, hw: 25, H: 45 }, { x: ox + 682, yB: 82, hw: 20, H: 37 }];
    return S;
  }
  function fieldWallSpec(self) { // the enemy castle at the top of the field world (world y 0 = wall top line), wide enough to reach both screen edges
    var FW = Z.FW, xl = -self.fox, S = { x0: xl - 3, x1: xl + self.W + 3, yM: 7, yF: 18, yB: 46, moat: false, nc: 4, gonW: 22, gonH: 25, towerPen: true, gatePen: true, towers: [{ x: 60, hw: 28, yT: 12, yB: 49, H: 34 }, { x: FW - 60, hw: 28, yT: 12, yB: 49, H: 34 }], gates: [{ x: FW / 2, hw: 44, yT: -6, yF: 4, yB: 46, ow: 17, yS: 31 }], bays: [210, FW - 210] };
    return S;
  }
  function fieldCampSpec(self) { // our camp at the foot of the field world: palisade tips at FH - 52, pavilions behind it
    var FW = Z.FW, FH = Z.FH, xl = -self.fox;
    return { x0: xl - 3, x1: xl + self.W + 3, yPad: FH - 22, yBot: FH + 42, stakeTop: FH - 52, stakeBase: FH - 18, stdTop: FH - 40, gates: [{ x: FW / 2, hw: 40 }], stds: [[34, FH + 12], [FW - 34, FH + 12]], fires: [[250, FH + 30], [470, FH + 30]],
      pav: [{ x: 76, yB: FH + 30, hw: 16, H: 30 }, { x: 188, yB: FH + 28, hw: 21, H: 37 }, { x: 292, yB: FH + 31, hw: 14, H: 27 }, { x: 428, yB: FH + 31, hw: 14, H: 27 }, { x: 532, yB: FH + 28, hw: 21, H: 37 }, { x: FW - 76, yB: FH + 30, hw: 16, H: 30 }] };
  }

  var R = Z.Render = {
    canvas: null, ctx: null, W: 720, H: 1280, ox: 0, scale: 1, dpr: 1, px: 1, _bpx: 1, bg: null,
    eY: 235, pY: 910, s: 0.72, seed: 1, phase: 0,
    battle: null, parts: [], texts: [], fx: [], shake: 0, time: 0, banner: null,
    selLane: 1, dragLane: -1, active: false, theme: 0, amb: [],

    init: function (canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); },

    resize: function (stageW, stageH, scale) {
      this.W = stageW; this.H = stageH; this.scale = scale;
      this.dpr = Math.min(globalThis.devicePixelRatio || 1, 2.5);
      this.ox = (stageW - DW) / 2;
      this.eY = 235; this.pY = stageH - 370;
      this.s = (this.pY - this.eY) / (C.EF - C.PF);
      var pw = Math.round(stageW * scale * this.dpr), ph = Math.round(stageH * scale * this.dpr);
      this.canvas.width = pw; this.canvas.height = ph;
      this.canvas.style.width = Math.round(stageW) + 'px'; this.canvas.style.height = Math.round(stageH) + 'px';
      this.px = pw / stageW; this._bpx = this.px; // _bpx: the px of the battle canvas; a sprite baked while R.px is overridden (UI.unitImg uses 3) is a portrait
      this.sprites = {}; this._cc = {}; this._bl = {}; this._bnc = {}; this._ovT = 0; this._bw = null; this._wc = {}; SCRM = {}; SCRN = 0; // baked castle / camp canvases, banderole widths and cards, scratch layers depend on the size
      this.ovl = (Z.Art && Z.Art.overlay) ? Z.Art.overlay(pw, ph, this.px) : null; // the battle frame, baked once per size and drawn once per frame
      this.buildBg();
    },

    laneX: function (i) { return this.ox + 120 + 240 * i; },
    // yolun hafif kivrimi (birlikler de bu egriyi izler); kalelerin yakininda duzlesir
    roadX: function (lane, y) {
      var f = Math.max(0, Math.min(1, (y - this.eY) / 70, (this.pY - y) / 70));
      return this.laneX(lane) + 9 * Math.sin(y * 0.0105 + lane * 2.1 + this.phase) * f;
    },
    Y: function (pos) { return this.pY - (pos - C.PF) * this.s; },

    start: function (battle) {
      this.battle = battle; this.parts = []; this.texts = []; this.fx = []; this.shake = 0; this.banner = null;
      this.selLane = 1; this.dragLane = -1; this.active = true;
      this.theme = battle.theme || 0; if (Z.Audio && Z.Audio.setRealm) Z.Audio.setRealm(this.theme);
      this.seed = battle.mode === 'endless' ? (Date.now() % 997) + 3 : battle.level * 13 + 7; // her sefer kendi manzarasi
      this.buildBg();
      this.warmQ = []; this._wc = {}; // sprite kareleri: kart destesi + dusman kademeleri; bosta kalan zamanlarda (warmIdle) pisirilir, gorunenler zaten istendiginde pisirilir
      var self = this, add = function (cls, team) { ['i', 'm', 'a'].forEach(function (st) { for (var q = 0; q < self.SN[st]; q++) self.warmQ.push([cls, team, st, q]); }); };
      battle.deck.forEach(function (id) { add(Z.UNITS[id].cls, 0); }); battle.tiers().forEach(function (id) { add(Z.UNITS[id].cls, 1); });
      this.warmIdle();
      var T = THEMES[this.theme], n = T.amb === 'snow' ? 90 : T.amb === 'dust' ? 40 : T.amb === 'ember' ? 46 : T.amb === 'fog' ? 34 : 26;
      this.amb = [];
      for (var i = 0; i < n; i++) this.amb.push({ x: Math.random() * this.W, y: Math.random() * this.H, v: 20 + Math.random() * 50, r: 1 + Math.random() * 2.2, ph: Math.random() * 6, c: Math.random() });
    },
    stop: function () { this.active = false; this.battle = null; },

    laneAt: function (sx, sy) {
      var lx = sx - this.ox;
      if (lx < 0 || lx >= DW || sy < 96 || sy > this.pY + 72) return -1;
      return Math.min(2, Math.floor(lx / 240));
    },

    // yol sekli (arka plan + vurgu icin ortak)
    roadPath: function (g, lane, hw) {
      var y, w, pts = [];
      g.beginPath();
      for (y = this.eY - CASTLE_H + 20; y <= this.pY + CASTLE_H - 20; y += 14) { w = hw + 5 * Math.sin(y * 0.021 + lane * 1.3); g.lineTo(this.roadX(lane, y) - w, y); pts.push([this.roadX(lane, y) + w, y]); }
      for (var i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
    },

    // ---- Arka plan (yedek/basit surum; ayrintili surum scenery.js icinde, hata olursa buna doner) ----
    // The fallback is flat too: the realm ground with its diaper, a gold horizon band with an ink hill line, sand roads with 3u ink edges, round-clump trees.
    // flatGround / flatHorizon / flatTree are shared with the field fallback (fieldrender.js).
    buildBg: function () { this.buildBgBasic(); },
    flatGround: function (g, x, y, w, h, th) { // realm ground + the Z.Art diaper at .3 (the plain colour when the tile is not there)
      var pat = (Z.Art && Z.Art.pattern) ? Z.Art.pattern(g, 'r' + th, 1) : null;
      g.fillStyle = THEMES[th].ground; g.fillRect(x, y, w, h);
      if (pat) { g.save(); g.globalAlpha = 0.3; g.fillStyle = pat; g.fillRect(x, y, w, h); g.restore(); }
    },
    flatHorizon: function (g, W, y1, th) { // the gold band (tooled-leaf diaper; plain leaf without it) down to y1, with rolling ink-edged hills along its foot
      var pat = (Z.Art && Z.Art.pattern) ? Z.Art.pattern(g, 'gold', 1) : null, x;
      g.fillStyle = LEAF; g.fillRect(0, 0, W, y1); if (pat) { g.fillStyle = pat; g.fillRect(0, 0, W, y1); }
      g.beginPath(); g.moveTo(0, y1); for (x = 0; x <= W + 20; x += 20) g.lineTo(x, y1 - 22 - 12 * Math.sin(x * 0.013 + 1 + th) - 7 * Math.sin(x * 0.031)); g.lineTo(W + 20, y1); g.closePath();
      g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.fillStyle = mixHex(THEMES[th].ground, IVO, 0.2); g.fill();
    },
    flatTree: function (g, x, y, r, th) { // bister trunk, three lobes in the realm's tone, one ink contour round the clump
      var col = THEMES[th].tree, cs = [[-0.5, -0.1, 0.62], [0.5, -0.1, 0.62], [0, -0.62, 0.74]], i;
      g.fillStyle = INK; g.fillRect(x - 3.2, y - 2, 6.4, r * 0.62 + 2); g.fillStyle = BIS; g.fillRect(x - 1.9, y - 1, 3.8, r * 0.62);
      g.lineWidth = 5; g.strokeStyle = INK; g.lineJoin = 'round';
      for (i = 0; i < 3; i++) { g.beginPath(); g.arc(x + cs[i][0] * r, y + cs[i][1] * r, cs[i][2] * r, 0, TAU); g.stroke(); }
      g.fillStyle = col; for (i = 0; i < 3; i++) circ(g, x + cs[i][0] * r, y + cs[i][1] * r, cs[i][2] * r);
    },
    buildBgBasic: function () {
      var c = document.createElement('canvas'), g, W = this.W, H = this.H, ox = this.ox, th = this.theme || 0, rnd = seeded(this.seed || 1), i, y, trees = [], top = this.eY - CASTLE_H, bot = this.pY + CASTLE_H;
      c.width = this.canvas.width; c.height = this.canvas.height; g = c.getContext('2d'); g.setTransform(this.px, 0, 0, this.px, 0, 0);
      this.phase = ((this.seed || 1) % 7) * 0.9;
      this.flatGround(g, 0, 0, W, H, th); this.flatHorizon(g, W, top + 14, th);
      for (i = 0; i < 3; i++) { this.roadPath(g, i, 64); g.fillStyle = INK; g.fill(); this.roadPath(g, i, 61); g.fillStyle = SAND; g.fill(); }
      [[0, 54], [188, 292], [428, 532], [668, 720]].forEach(function (st) { for (var yy = top + 44; yy < bot + 20; yy += 38) trees.push([ox + st[0] + (st[1] - st[0]) * (0.2 + rnd() * 0.6), yy + rnd() * 16, 13 + rnd() * 8]); });
      if (ox > 2) for (y = top + 44; y < bot + 20; y += 38) { trees.push([ox * rnd(), y + rnd() * 16, 15]); trees.push([ox + DW + (W - ox - DW) * rnd(), y + rnd() * 16, 15]); }
      trees.sort(function (a, b) { return a[1] - b[1]; });
      for (i = 0; i < trees.length; i++) this.flatTree(g, trees[i][0], trees[i][1], trees[i][2], th);
      this.bg = c;
    },

    // ---- Olaylar -> efektler + ses --------------------------------------
    handle: function (events) {
      var A = Z.Audio, i, e, ex, ey;
      for (i = 0; i < events.length; i++) {
        e = events[i];
        ey = e.x !== undefined ? this.Y(e.x) : 0;
        ex = e.lane !== undefined ? this.roadX(e.lane, ey || this.pY) : 0;
        switch (e.type) {
          case 'spawn':
            this.puff(this.roadX(e.unit.lane, this.Y(e.unit.x)), this.Y(e.unit.x), 7, VEL);
            if (e.unit.team === 0) A.spawn(e.unit.cls);
            break;
          case 'hit':
            this.sparks(ex, ey - 6, e.strong ? 7 : 3, e.strong ? ORP : IVO);
            if (this.fx.length < 40) this.fx.push({ k: 'slash', x: ex + (Math.random() - 0.5) * 14, y: ey - 6, a: Math.random() * TAU, t: 0.18, max: 0.18, big: e.strong });
            if (this.texts.length < 26 && (e.strong || e.dmg > 40)) this.text(ex + 18, ey - 40, String(Math.round(e.dmg)), e.team === 1 ? (e.strong ? R.DMG.crit : R.DMG.dealt) : R.DMG.taken, e.strong ? 26 : 20);
            A.hit();
            break;
          case 'death':
            this.puff(ex, ey, e.boss ? 24 : 10, e.team === 0 ? AZUR : PAL[1].light);
            if (this.fx.length < 60) this.fx.push({ k: 'decal', x: ex, y: ey, t: 4, max: 4, big: e.boss });
            A.death();
            if (e.boss) { this.shake = 14; A.boom(); }
            break;
          case 'coin': this.text(ex, ey - 46, '+' + e.v, ORP, 24); A.coin(); break;
          case 'shoot': A.shoot(); break;
          case 'tower':
            this.fx.push({ k: 'arrow', x1: ex, y1: e.team === 0 ? this.pY : this.eY, x2: ex, y2: ey, t: 0.18, max: 0.18 }); A.shoot(); break;
          case 'boom':
            this.fx.push({ k: 'ring', x: ex, y: ey, r: Math.max(36, e.r * this.s * 1.2), t: 0.4, max: 0.4, col: e.cls === 'mage' ? PURL : e.cls === 'golem' ? VEL2 : ORP });
            this.sparks(ex, ey, 12, e.cls === 'mage' ? PURL : ORP);
            this.shake = Math.max(this.shake, e.cls === 'cata' ? 5 : 2); A.boom();
            break;
          case 'heal':
            if (this.parts.length < 380) for (var hq = 0; hq < 5; hq++) this.parts.push({ x: ex + (Math.random() - 0.5) * 26, y: ey - 8, vx: (Math.random() - 0.5) * 20, vy: -44 - Math.random() * 30, life: 0.8, max: 0.8, size: 3, col: VDG, g: -10, shrink: true });
            if (this.texts.length < 26) this.text(ex, ey - 40, '+' + Math.round(e.v), R.DMG.heal, 20);
            if (e.team === 0) A.heal();
            break;
          case 'freeze':
            this.sparks(ex, ey - 6, 9, ARG); this.fx.push({ k: 'ring', x: ex, y: ey, r: 44, t: 0.45, max: 0.45, col: ICE });
            break;
          case 'perk': A.perk(); break;
          case 'flame': { var fy = this.Y(e.to), fx2 = this.roadX(e.lane, fy); this.sparks(fx2, fy - 6, 10, VERM); this.sparks(fx2, fy - 6, 5, ORP); this.fx.push({ k: 'ring', x: fx2, y: fy, r: 30, t: 0.25, max: 0.25, col: VERM }); A.fire(); break; }
          case 'burn': this.sparks(ex, ey - 10, 2, ORP); break;
          case 'charge': this.fx.push({ k: 'ring', x: ex, y: ey, r: 40, t: 0.3, max: 0.3, col: ORP }); A.charge(); break;
          case 'baseHit':
            this.shake = Math.max(this.shake, e.team === 0 ? 8 : 3);
            this.puff(this.ox + 60 + Math.random() * 600, e.team === 0 ? this.pY + 20 : this.eY - 20, 5, ASH);
            A.baseHit(); if (e.team === 0) A.vibrate(40);
            break;
          case 'skill':
            if (e.kind === 'roar') { this.fx.push({ k: 'wave', x: this.ox + 360, y: this.pY + 30, t: 0.9, max: 0.9, col: ORP }); this.banner = { text: $t('ZAFER NARAASI!'), col: '#ffd166', t: 1.4 }; }
            else if (e.kind === 'ward') { this.fx.push({ k: 'lane', lane: e.lane, t: 0.9, max: 0.9, col: VDG }); }
            else if (e.kind === 'bolt') { this.shake = Math.max(this.shake, 6); }
            else if (e.kind === 'dragon') { this.fx.push({ k: 'lane', lane: e.lane, t: 1.0, max: 1.0, col: VERM }); this.banner = { text: $t('EJDER NEFESİ!'), col: '#ffb347', t: 1.3 }; this.shake = Math.max(this.shake, 6); }
            else if (e.kind === 'freeze') { this.fx.push({ k: 'lane', lane: e.lane, t: 1.0, max: 1.0, col: ICE }); this.banner = { text: $t('DON FIRTINASI!'), col: '#9bd7ff', t: 1.2 }; }
            A.skill(e.kind); A.vibrate(25);
            break;
          case 'bolt': this.fx.push({ k: 'bolt', x: ex, y: ey, t: 0.4, max: 0.4, seed: Math.random() * 99 }); this.sparks(ex, ey, 9, ARG); break;
          case 'boss': this.banner = { text: $t('PATRON GELİYOR!'), col: '#ff6b6b', t: 1.8 }; this.shake = 10; A.boom(); break;
          case 'ambush': this.banner = { text: $t('PUSU!'), col: '#ffb347', t: 1.4 }; this.shake = 6; A.boom(); break;
          case 'breach': this.banner = { text: $t('SUR YARILDI! GEDİKTEN YÜKLEN!'), col: '#ffd166', t: 1.8 }; this.shake = 12; A.boom(); for (var bi = 0; bi < 4; bi++) this.puff(this.ox + 100 + Math.random() * 520, this.eY - 24, 7, ASH); break;
          case 'reliefWarn': this.banner = { text: $t('YARDIM ORDUSU YAKLAŞIYOR!'), col: '#ff9f6b', t: 2.2 }; A.boom(); break;
          case 'relief': this.banner = { text: $t('YARDIM ORDUSU GELDİ!'), col: '#ff6b6b', t: 1.8 }; this.shake = 10; A.boom(); break;
          case 'mine': this.text(this.ox + 360, this.H - 330, $t('Maden Sv.') + e.level + '!', ORP, 30); A.click(); break;
          case 'win': A.win(); break;
          case 'lose': A.lose(); break;
        }
      }
    },
    puff: function (x, y, n, col) {
      for (var i = 0; i < n && this.parts.length < 400; i++) {
        var a = Math.random() * TAU, s = 20 + Math.random() * 50;
        this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 - 10, life: 0.5 + Math.random() * 0.4, max: 0.9, size: 3 + Math.random() * 5, col: col, g: 10, shrink: true });
      }
    },
    sparks: function (x, y, n, col) {
      for (var i = 0; i < n && this.parts.length < 400; i++) {
        var a = Math.random() * TAU, s = 60 + Math.random() * 120;
        this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.25 + Math.random() * 0.25, max: 0.5, size: 1.6 + Math.random() * 1.8, col: col, g: 280, shrink: true });
      }
    },
    // combat numbers: at most 22 alive; a number that would land on a younger one is lifted above it (a stack of figures instead of one smear in a melee)
    text: function (x, y, str, col, size) {
      var tx = x + (Math.random() - 0.5) * 16, ty = y, i, n, o, hit;
      size = size || 20;
      if (this.texts.length >= 22) return;
      for (n = 0; n < 4; n++) {
        hit = false;
        for (i = 0; i < this.texts.length; i++) { o = this.texts[i]; if (Math.abs(o.x - tx) < 46 && Math.abs(o.y - ty) < (o.size + size) * 0.55 + 2) { ty = o.y - (o.size + size) * 0.55 - 4; hit = true; break; } }
        if (!hit) break;
      }
      this.texts.push({ x: tx, y: ty, t: 0.9, max: 0.9, s: str, col: col, size: size });
    },

    // ---- Cizim ------------------------------------------------------------
    frame: function (dt) {
      if (!this.active || !this.battle) return;
      this.time += dt;
      var b = this.battle, c = this.ctx, i, W = this.W, H = this.H, on, sel;
      this.handle(b.drain());
      if (this.warmQ && this.warmQ.length && !this._warmBusy) this.warmIdle();
      for (i = 0; i < b.projs.length; i++) { // tas atar dumani
        var pj = b.projs[i];
        if (pj.kind === 'rock' && Math.random() < 0.6 && this.parts.length < 380) this.parts.push({ x: this.roadX(pj.lane, this.Y(pj.x)), y: this.Y(pj.x), vx: (Math.random() - 0.5) * 10, vy: 6, life: 0.5, max: 0.5, size: 4, col: SMOKE, g: 0, shrink: true });
      }
      this.updateFx(dt);

      c.setTransform(this.px, 0, 0, this.px, 0, 0);
      c.drawImage(this.bg, 0, 0, W, H);
      c.save();
      var sx = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
      c.translate(sx, sy);

      // the chosen / dragged road: a flat tint (no glow); a dragged one also gets the drop banderole
      for (i = 0; i < 3; i++) {
        on = (this.dragLane === i); sel = (this.selLane === i && this.dragLane < 0);
        if (on || sel) {
          this.roadPath(c, i, 74);
          c.globalAlpha = on ? 0.3 : 0.16; c.fillStyle = on ? IVO : ORP; c.fill(); c.globalAlpha = 1;
          if (on) this.dropHint(c, this.laneX(i), this.eY + 110);
        }
      }
      this.drawCastle(c, 1); this.drawCastle(c, 0);
      for (i = 0; i < this.fx.length; i++) if (this.fx[i].k === 'decal') this.drawDecal(c, this.fx[i]);

      this.spreadLanes(b, dt);
      var order = b.units.slice(), ou;
      for (i = 0; i < order.length; i++) { ou = order[i]; ou._sy = this.Y(ou.x) + (ou._oy || 0); } // painter's order includes the lane-axis stagger of spreadLanes
      order.sort(function (a, d) { return a._sy - d._sy; });
      for (i = 0; i < order.length; i++) this.drawUnit(c, order[i]);
      for (i = 0; i < b.projs.length; i++) this.drawProj(c, b.projs[i]);
      this.drawFx(c);
      this.drawParts(c);
      this.drawTexts(c);
      c.restore();

      this.ambient(c, dt);
      if (b.buffed()) this.buffEdge(c);
      if (this.banner) this.drawBannerCard(c, W / 2, this.eY + 104, this.banner); // under the castle, over the first stretch of the roads
      this.drawFrame(c);
    },
    // the battle frame (ink | leaf-art | ink with ivy and studs), baked on resize into R.ovl, painted last over everything. Its middle is transparent and the ivy reaches
    // 31u from the edge, so it is drawn as four 34u strips (a fifth of the fill rate of one full-canvas blit); R.ovlStrips = false draws it whole.
    ovlStrips: true,
    drawFrame: function (c) {
      var o = this.ovl, w, h, t;
      if (!o) return;
      w = o.width; h = o.height; t = this._ovT || (this._ovT = Math.min(Math.ceil(34 * this.px), Math.floor(Math.min(w, h) / 2)));
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (this.ovlStrips && h > 2 * t + 2) {
        c.drawImage(o, 0, 0, w, t, 0, 0, w, t); c.drawImage(o, 0, h - t, w, t, 0, h - t, w, t);
        c.drawImage(o, 0, t, t, h - 2 * t, 0, t, t, h - 2 * t); c.drawImage(o, w - t, t, t, h - 2 * t, w - t, t, t, h - 2 * t);
      } else c.drawImage(o, 0, 0);
      c.setTransform(this.px, 0, 0, this.px, 0, 0);
    },
    // "buffed" (the roar): a pulsing or edge just inside the frame, flat (the radial vignette is gone)
    buffEdge: function (c) {
      c.save(); c.globalAlpha = 0.3 + 0.12 * Math.sin(this.time * 8); c.strokeStyle = ORP; c.lineWidth = 14; c.strokeRect(19, 19, this.W - 38, this.H - 38); c.restore();
    },
    drawParts: function (c) { // puffs and sparks: flat discs that fade by alpha
      for (var i = 0; i < this.parts.length; i++) { var p = this.parts[i], a = Math.max(0, p.life / p.max); c.globalAlpha = a; c.fillStyle = p.col; circ(c, p.x, p.y, p.shrink ? p.size * (0.4 + a * 0.6) : p.size); }
      c.globalAlpha = 1;
    },
    // flat ambient life per realm: leaves, sand streaks, snow, embers, fireflies (no fog, no haze)
    ambient: function (c, dt) {
      var amode = THEMES[this.theme].amb, i, am, H = this.H, W = this.W, t = this.time, fl;
      for (i = 0; i < this.amb.length; i++) {
        am = this.amb[i];
        if (amode === 'snow') { c.globalAlpha = 0.9; c.fillStyle = IVO; am.y += am.v * dt; am.x += Math.sin(t + am.ph) * 14 * dt - 6 * dt; circ(c, am.x, am.y, am.r); }
        else if (amode === 'dust') { c.globalAlpha = 0.5; c.fillStyle = VEL; am.x += am.v * 4 * dt; am.y += Math.sin(t * 0.7 + am.ph) * 6 * dt; c.fillRect(am.x, am.y, 14 + am.r * 8, 1.8); }
        else if (amode === 'ember') { am.y -= am.v * 0.9 * dt; am.x += Math.sin(t * 2 + am.ph) * 12 * dt; c.globalAlpha = 0.55 + 0.4 * Math.sin(t * 8 + am.ph); c.fillStyle = am.c < 0.5 ? VERM : ORP; circ(c, am.x, am.y, 1 + am.r * 0.55); if (am.y < -6) { am.y = H + 6; am.x = Math.random() * W; } }
        else if (amode === 'fog') { am.x += Math.sin(t * 0.8 + am.ph) * 16 * dt; am.y += Math.cos(t * 0.6 + am.ph) * 10 * dt; fl = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + am.ph)); c.globalAlpha = fl; c.fillStyle = am.c < 0.5 ? ORP : VDG; circ(c, am.x, am.y, 2.3); }
        else { am.y += am.v * 0.5 * dt; am.x += Math.sin(t * 0.9 + am.ph) * 18 * dt + 8 * dt; c.save(); c.translate(am.x, am.y); c.rotate(t * 1.2 + am.ph); c.globalAlpha = 0.9; c.fillStyle = am.c < 0.5 ? MAL : LEAF; ell(c, 0, 0, 5 + am.r, 2.4); c.restore(); }
        if (am.y > H) { am.y = -6; am.x = Math.random() * W; }
        if (am.x > W + 40) { am.x = -40; am.y = Math.random() * H; } else if (am.x < -40) am.x = W + 4;
      }
      c.globalAlpha = 1;
    },
    // measured banderole width for a label (cached per text and size once the fonts are in)
    bandW: function (c, text, size, h) {
      var k = text + '|' + size, bw = this._bw || (this._bw = {}), w = bw[k];
      if (!w) { c.font = bandFont(text, size); w = bw[k] = Math.ceil(c.measureText(text).width + 2 * Math.min(h * 0.4, 24) + 36); }
      return w;
    },
    // "drop here": a banderole between two ink-edged triangles (Path2D, no glyphs), over a dragged lane
    dropHint: function (c, x, y) {
      var tx = $t('BURAYA BIRAK'), w = Math.min(this.bandW(c, tx, 26, 46), 214), k, a;
      banderole(c, x, y, w, 46, tx, { fill: ORP, size: 26 });
      for (k = -1; k <= 1; k += 2) { a = x + k * (w / 2 + 22); c.beginPath(); c.moveTo(a - 9, y - 7); c.lineTo(a + 9, y - 7); c.lineTo(a, y + 9); c.closePath(); c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.fillStyle = ORP; c.fill(); }
    },

    updateFx: function (dt) {
      var i, p;
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
      for (i = this.parts.length - 1; i >= 0; i--) {
        p = this.parts[i]; p.life -= dt; if (p.life <= 0) { this.parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      }
      for (i = this.texts.length - 1; i >= 0; i--) { p = this.texts[i]; p.t -= dt; p.y -= 34 * dt; if (p.t <= 0) this.texts.splice(i, 1); }
      for (i = this.fx.length - 1; i >= 0; i--) { p = this.fx[i]; p.t -= dt; if (p.t <= 0) this.fx.splice(i, 1); }
      if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    },

    drawDecal: function (c, f) { // the mark a fallen unit leaves: two flat ink blots that fade
      var a = Math.min(1, f.t / 1.5) * 0.34, r = f.big ? 22 : 11;
      c.globalAlpha = a; c.fillStyle = INK; ell(c, f.x, f.y + 3, r, r * 0.6); c.fillStyle = INK2; ell(c, f.x + 4, f.y + 1, r * 0.4, r * 0.25);
      c.globalAlpha = 1;
    },

    // effects: every stroke is ink under pigment (two passes), fills are flat; they fade by alpha only
    drawFx: function (c) {
      for (var i = 0; i < this.fx.length; i++) {
        var f = this.fx[i], k = 1 - f.t / f.max;
        if (f.k === 'ring') {
          c.globalAlpha = (1 - k) * 0.22; c.fillStyle = f.col; c.beginPath(); c.arc(f.x, f.y, f.r * (0.4 + k * 0.8), 0, TAU); c.fill();
          c.globalAlpha = 1 - k; c.beginPath(); c.arc(f.x, f.y, f.r * (0.4 + k * 0.8), 0, TAU); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.6; c.strokeStyle = f.col; c.stroke();
        } else if (f.k === 'wave') {
          c.globalAlpha = (1 - k) * 0.9; c.beginPath(); c.arc(f.x, f.y, 40 + k * 1100, Math.PI * 1.1, Math.PI * 1.9); c.lineWidth = 10 * (1 - k) + 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 10 * (1 - k) + 2; c.strokeStyle = f.col; c.stroke();
        } else if (f.k === 'lane') {
          c.globalAlpha = (1 - k) * 0.4; this.roadPath(c, f.lane, 76); c.fillStyle = f.col; c.fill();
        } else if (f.k === 'bolt') {
          c.globalAlpha = Math.min(1, f.t / 0.2); c.lineJoin = 'round'; c.lineCap = 'round';
          c.beginPath(); var x = f.x, y = f.y - 520;
          c.moveTo(x, y); var n = 9, step = (f.y - y) / n;
          for (var j = 1; j <= n; j++) { x = f.x + (j === n ? 0 : (hash(f.seed + j + Math.floor(this.time * 30)) - 0.5) * 46); y += step; c.lineTo(x, y); }
          c.strokeStyle = INK; c.lineWidth = 10; c.stroke(); c.strokeStyle = ARG; c.lineWidth = 5.4; c.stroke(); c.strokeStyle = IVO; c.lineWidth = 2; c.stroke();
          c.globalAlpha = Math.min(1, f.t / 0.2) * 0.55; c.fillStyle = ARG; circ(c, f.x, f.y, 24 * (1 - k * 0.5)); c.globalAlpha = Math.min(1, f.t / 0.2); c.beginPath(); c.arc(f.x, f.y, 24 * (1 - k * 0.5), 0, TAU); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
        } else if (f.k === 'arrow') {
          c.globalAlpha = 1; var ay = f.y1 + (f.y2 - f.y1) * k, ad = f.y2 >= f.y1 ? 1 : -1; // tower arrow: the same thick shaft and head as a flying arrow
          bar(c, f.x1, ay - ad * 17, f.x1, ay + ad * 5, 2.8, IVO, 1.6); this.arrowHead(c, f.x1, ay + ad * 5, ad, 0);
        } else if (f.k === 'slash') { // sword stroke arc
          c.globalAlpha = (1 - k) * 0.95; c.lineCap = 'round'; c.beginPath(); c.arc(f.x, f.y, (f.big ? 20 : 14) * (0.6 + k * 0.5), f.a, f.a + 1.9);
          c.lineWidth = (f.big ? 4 : 2.6) + 3; c.strokeStyle = INK; c.stroke(); c.lineWidth = f.big ? 4 : 2.6; c.strokeStyle = f.big ? ORP : IVO; c.stroke();
        }
      }
      c.globalAlpha = 1;
    },

    drawProj: function (c, p) {
      var y = this.Y(p.x), x = this.roadX(p.lane, y) + (p.team === 0 ? 10 : -10), d = p.team === 0 ? -1 : 1; // d: ekrandaki hareket yonu
      var tot = Math.max(1, Math.abs(p.tx - p.fromX)), prog = Math.min(1, Math.abs(p.x - p.fromX) / tot), h = Math.sin(prog * Math.PI);
      this.projShape(c, p.kind, x, y, d, h, 1, 0);
    },
    // the head of an arrow: an ink-edged argent triangle, (x, y) = where the shaft ends, pointing along d (+-1) on the y axis, or along +x when horiz is true
    arrowHead: function (c, x, y, d, horiz) {
      c.beginPath();
      if (horiz) { c.moveTo(x + 9.5, y); c.lineTo(x - 1, y - 4.8); c.lineTo(x - 1, y + 4.8); }
      else { c.moveTo(x, y + d * 9.5); c.lineTo(x - 4.8, y - d); c.lineTo(x + 4.8, y - d); }
      c.closePath(); c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); c.fillStyle = ARG; c.fill();
    },
    // flat projectile art shared with the field renderer: kind, ground point (x, y), d = travel direction (+-1 along y), h = arc height 0..1, k = scale
    // trail: dir (radians) for the field renderer (arrows and bolts point along it), 0 in the lane view
    projShape: function (c, kind, x, y, d, h, k, dir) {
      if (kind === 'arrow') { // 2.8u ivory shaft in a 1.6u ink edge, 22u long, an ink-edged argent head, a flat streak behind: wide enough to read at 0.5 css px per u
        c.globalAlpha = 0.28; c.fillStyle = INK; ell(c, x + 5, y + 5, 2.6, 9); c.globalAlpha = 1;
        c.globalAlpha = 0.8; line(c, x, y - d * 36, x, y - d * 15, 2, IVO); c.globalAlpha = 1;             // motion streak: a flat stroke, no gradient
        bar(c, x, y - d * 17, x, y + d * 5, 2.8, IVO, 1.6);
        this.arrowHead(c, x, y + d * 5, d, 0);
      } else if (kind === 'bolt') {
        c.globalAlpha = 0.25; c.fillStyle = INK; ell(c, x + 3, y + 6, 7, 4); c.globalAlpha = 1;
        for (var q = 3; q >= 1; q--) { c.globalAlpha = 0.18 * (4 - q); c.fillStyle = PUR; circ(c, x, y - 10 * h - d * q * 9, 9 - q); }
        c.globalAlpha = 1; c.fillStyle = INK; circ(c, x, y - 10 * h, 11.5); c.fillStyle = PUR; circ(c, x, y - 10 * h, 9.2); c.fillStyle = IVO; circ(c, x, y - 10 * h, 4.4);
      } else {
        var ry = y - h * 50;
        c.globalAlpha = 0.3; c.fillStyle = INK; ell(c, x + 2, y + 5, 10, 5.5); c.globalAlpha = 1;
        c.fillStyle = INK; circ(c, x, ry, 11 + h * 3.5); c.fillStyle = INK2; circ(c, x, ry, 8.6 + h * 3.5); c.fillStyle = ARG; circ(c, x - 2.4, ry - 2.4, 3.2); c.fillStyle = ORP; circ(c, x + 3.4, ry + 2.6, 2.2);
      }
    },

    // ---- Castle (garrison, top) and camp (host, bottom): baked once per damage tier, see the kit above ----------------------------------------
    // A slot is { cv, dyn, bx, by, fl }: the baked canvas (blitted 1:1 at a device-pixel aligned bx, by in stage u), the per-frame items (cloth, flames),
    // and the hit-flash silhouette (made on the first hit). One slot per team holds the current tier; the previous tier's canvas is dropped when the tier
    // changes. R.resize drops them all. The camp is painted in screen orientation (field side up), so it needs no mirrored transform.
    bakeCv: function (xl, yTop, wU, hU, paint) {
      var px = this.px, cv = document.createElement('canvas'), g, dyn = { gon: [], pen: [], torch: [], fire: [], burn: [] }, t0 = performance.now(), st = this.cstat || (this.cstat = { bakes: 0, ms: 0, last: 0 });
      try {
        cv.width = Math.ceil(wU * px); cv.height = Math.ceil(hU * px); g = cv.getContext('2d'); g.setTransform(px, 0, 0, px, -xl * px, -yTop * px);
        paint(g, dyn);
      } catch (e) { if (typeof console !== 'undefined') console.warn('castle: bake failed, drawing what exists', e); } // a failed bake is kept (never retried per frame)
      st.bakes++; st.last = performance.now() - t0; st.ms += st.last;
      return { cv: cv, dyn: dyn, fl: null };
    },
    baseSlot: function (team, tier, moat) {
      var cc = this._cc || (this._cc = {}), key = tier + (moat ? 'm' : ''), s = cc[team], self = this, px = this.px, mt = team === 1 ? 20 : 26,
        y0 = team === 0 ? this.pY : this.eY - CASTLE_H, hU = team === 1 ? CASTLE_H + mt + 12 + (moat ? 40 : 0) : 96 + mt;
      if (s && s.key === key) return s;
      cc[team] = s = null; // the previous tier is evicted before the next one is baked
      s = this.bakeCv(0, -mt, this.W, hU, function (g, dyn) {
        var rn = seeded(team === 1 ? 11 : 23);
        if (team === 1) paintCastle(g, castleSpec(self, moat), tier, rn, dyn); else paintCamp(g, campSpec(self), tier, rn, dyn);
      });
      s.key = key; s.bx = 0; s.by = Math.round((y0 - mt) * px) / px;
      return (cc[team] = s);
    },
    fieldSlot: function (kind) { // the wall (enemy castle) and the camp strips of the field battle, in world u, reaching both screen edges; rebuilt after every resize
      var cc = this._cc || (this._cc = {}), s = cc[kind], px = this.px, xl = -this.fox, yTop = kind === 'wall' ? -56 : Z.FH - 70, S;
      if (s) return s;
      S = kind === 'wall' ? fieldWallSpec(this) : fieldCampSpec(this);
      s = this.bakeCv(xl, yTop, this.W, kind === 'wall' ? 120 : 124, function (g, dyn) { var rn = seeded(kind === 'wall' ? 5 : 9); if (kind === 'wall') paintCastle(g, S, 0, rn, dyn); else paintCamp(g, S, 0, rn, dyn); });
      s.bx = xl; s.by = Math.round((this.foy + yTop) * px) / px - this.foy;
      return (cc[kind] = s);
    },
    // cloth, torches, fires and (at the last tier) burning roofs: the only per-frame castle work; c is in the slot's painter space
    baseDyn: function (c, s, tier, t) {
      var d = s.dyn, i, k, a, ff;
      for (i = 0; i < d.gon.length; i++) { a = d.gon[i]; gonfanon(c, a.x, a.y, a.w, a.h, Math.sin(t * 2.4 + a.x * 0.045) * 3, a.col, a.dev); }
      for (i = 0; i < d.pen.length; i++) { a = d.pen[i]; pennon(c, a.x, a.y, a.len, a.hgt, Math.sin(t * 3.1 + a.x * 0.07) * 3, a.col); }
      for (i = 0; i < d.torch.length; i++) { a = d.torch[i]; flame(c, a.x, a.y, 3.2, 9 * (0.8 + 0.2 * Math.sin(t * 11 + i * 2 + a.x))); }
      for (i = 0; i < d.fire.length; i++) { a = d.fire[i]; flame(c, a.x, a.y, 5.4, 13 * (0.8 + 0.2 * Math.sin(t * 10 + i * 2))); }
      if (tier === 2) for (i = 0; i < d.burn.length; i++) { a = d.burn[i]; for (k = 0; k < 3; k++) { ff = 0.7 + 0.3 * Math.sin(t * 9 + k * 2 + i); flame(c, a.x - 8 + k * 8, a.y - k * 1.5, 4.6 * a.s * ff, 12 * a.s * ff); } }
    },
    drawCastle: function (c, team) {
      var b = this.battle.base[team], pct = b.hp / b.max, tier = pct < 0.3 ? 2 : pct < 0.6 ? 1 : 0, t = this.time, px = this.px, y0 = team === 0 ? this.pY : this.eY - CASTLE_H,
        s = this.baseSlot(team, tier, team === 1 && this.battle.rl('moat')), gx, pu, bn;
      c.drawImage(s.cv, s.bx, s.by, s.cv.width / px, s.cv.height / px);
      c.save(); c.translate(0, y0); this.baseDyn(c, s, tier, t); c.restore();
      if (b.flash > 0) { c.globalAlpha = Math.min(0.35, b.flash * 2.4); c.drawImage(s.fl || (s.fl = silhouette(s.cv, IVO)), s.bx, s.by, s.cv.width / px, s.cv.height / px); c.globalAlpha = 1; } // hit flash: the castle as one ivory tincture, capped at .35 so a siege (9 hits/s) never washes it out
      if (team === 0 && this.selLane >= 0) { // the chosen gate: an ink and or frame (flat, pulsing)
        gx = this.laneX(this.selLane); pu = 0.5 + 0.5 * Math.sin(t * 6);
        c.save(); c.globalAlpha = 0.7 + 0.3 * pu; rrect(c, gx - 60, y0 - 9, 120, 68, 14); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4.4; c.strokeStyle = ORP; c.stroke(); c.restore();
      }
      if (tier === 2 && Math.random() < 0.3 && this.parts.length < 380 && s.dyn.burn.length) { // smoke from the burning roofs
        bn = s.dyn.burn[Math.floor(Math.random() * s.dyn.burn.length)];
        this.parts.push({ x: bn.x + (Math.random() - 0.5) * 16, y: y0 + bn.y - 12, vx: (Math.random() - 0.5) * 12, vy: -30, life: 0.9, max: 1.4, size: 7, col: SMOKE, g: 0, shrink: false });
      }
      this.baseBar(c, b, team, y0, s.key.indexOf('m') >= 0);
    },
    // the castle's / camp's health: a flat ink ribbon (3u border, camp malachite, castle vermilion) with the numbers in ivory on ink; a sealed castle gets a banderole instead
    baseBar: function (c, b, team, y0, moat) {
      var by = y0 + (team === 0 ? 94 : moat ? 130 : 92), cx = this.ox + DW / 2, tl, tx, w, bl = this._bl || (this._bl = {});
      c.save();
      if (b.max < 1e8) {
        this.hpBar(c, cx, by, 420, Math.max(0, b.hp / b.max), team, 20);
        tl = Math.max(0, Math.ceil(b.hp)) + ' / ' + Math.ceil(b.max);
        c.font = '900 17px system-ui'; c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = INK; c.strokeText(tl, cx, by + 15.5); c.fillStyle = IVO; c.fillText(tl, cx, by + 15.5);
      } else {
        tx = $t('Abluka: kale yıkılamaz'); w = bl[tx];
        if (!w) { c.font = bandFont(tx, 20); w = bl[tx] = Math.ceil(c.measureText(tx).width) + 2 * 13.6 + 54; }
        banderole(c, cx, by + 10, w, 32, tx, { fill: VEL, size: 20 });
      }
      c.restore();
    },

    // Birlikler yolda birbirini gecebilsin: ayni konumdakiler yola yayilir (5 serit), yumusak gecisle
    spreadLanes: function (b, dt) {
      var groups = {}, SL = [0, 1, -1, 2, -2], GAP = 26, k = Math.min(1, dt * 7), i, u;
      for (i = 0; i < b.units.length; i++) { u = b.units[i]; (groups[u.lane * 2 + u.team] || (groups[u.lane * 2 + u.team] = [])).push(u); }
      for (var key in groups) {
        var arr = groups[key].sort(function (a, c) { return a.x - c.x; }), last = [-1e9, -1e9, -1e9, -1e9, -1e9];
        for (i = 0; i < arr.length; i++) {
          u = arr[i]; var s = -1, j;
          for (j = 0; j < 5; j++) if (u.x - last[j] >= GAP) { s = j; break; }
          if (s < 0) { s = 0; for (j = 1; j < 5; j++) if (last[j] < last[s]) s = j; }
          last[s] = u.x;
          var tg = SL[s] * 24, ty = SL[s] * 6; // across the road, and +-6u per strip along it so a cluster of four shows four heads
          u._ox = u._ox === undefined ? tg : u._ox + (tg - u._ox) * k; u._oy = u._oy === undefined ? ty : u._oy + (ty - u._oy) * k;
        }
      }
    },

    // ---- Birlikler (kusbakisi; oyuncu yukari, dusman asagi bakar) ---------
    // Performans: her sinif x takim x durum (bekle/yuru/saldir) kareleri bir kez cizilip onbellege alinir,
    // her karede yalnizca drawImage ile basilir. Sade efektler (donma, parlama, kalkan) uste canli cizilir.
    // Look (bible section 7): flat gouache + opaque ink. renderSprite draws the figure flat (1.6u inner ink lines, stroke-then-fill), then bakes the
    // 2.6u ink contour by 8-offset dilation, a 2u vellum halo at alpha .45 and three ink ground ticks (halo + ticks off when R.icoMode is true).
    SN: { i: 6, m: 8, a: 4 },
    icoMode: false, // true: renderSprite skips the vellum halo and the ground ticks (UI.unitImg portraits, drag ghosts)
    // m = bake scale multiplier (default 1): a sprite that is drawn bigger or smaller than SPR (bosses 1.55 in the lanes, the field's USC scale, the field commander)
    // is baked at the scale it is drawn at, so the blit is 1:1 and the ink contour stays crisp. Cached per m.
    getSprite: function (cls, team, st, idx, m) {
      var cache = this.sprites || (this.sprites = {}), key = cls + team + st + idx + (m && m !== 1 ? '@' + Math.round(m * 1000) : '');
      return cache[key] || (cache[key] = this.renderSprite(cls, team, st, idx, m));
    },
    // queue the 18 frames of a class at bake scale m for the idle warm-up (bosses: their frames are not in the start-of-battle queue); once per class, team and m
    warmClass: function (cls, team, m) {
      var k = cls + team + '@' + Math.round((m || 1) * 1000), w = this._wc || (this._wc = {}), self = this;
      if (w[k] || !this.warmQ) return;
      w[k] = 1;
      ['i', 'm', 'a'].forEach(function (st) { for (var q = 0; q < self.SN[st]; q++) self.warmQ.push([cls, team, st, q, m]); });
      this.warmIdle();
    },
    // warm-up in idle time instead of inside the frame (a baked sprite costs ~1 ms of raster work): at least one sprite per slice, then while the slice has time.
    // Sprites on screen are baked the moment they are first drawn (getSprite), so the queue only removes the first-use hitches.
    warmIdle: function () {
      var self = this, run;
      if (this._warmBusy || !this.warmQ || !this.warmQ.length) return;
      this._warmBusy = true;
      run = function (dl) {
        var t0 = performance.now(), w;
        self._warmBusy = false;
        if (!self.active || !self.warmQ) return;
        do { w = self.warmQ.shift(); if (!w) break; self.getSprite(w[0], w[1], w[2], w[3], w[4]); }
        while (self.warmQ.length && performance.now() - t0 < 5 && (!dl || !dl.timeRemaining || dl.timeRemaining() > 2));
        if (self.warmQ.length) self.warmIdle();
      };
      if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 250 }); else setTimeout(run, 20);
    },
    // makeSprite: shared entry for every figure (also the field commander). fn(g, pal, walk, atk, lunge, age, t) draws the flat figure on g
    // (sprite units, origin = ground point, forward = -y); g.ov is a second layer without contour for hairlines (bowstring, heal pulse).
    // m = bake scale multiplier (see getSprite). A portrait (R.icoMode, or R.px overridden away from the battle canvas px, as UI.unitImg does with 3) has no halo and no ticks.
    makeSprite: function (cls, team, st, idx, fn, m) {
      var Sc = this.px * SPR * (m || 1), w = Math.ceil(92 * Sc), h = Math.ceil(120 * Sc), S = scratch(w, h), g = S.fig.g, ico = this.icoMode || this.px !== this._bpx;
      var pal = PAL[team], walk = 0, atk = 0, lunge = 0, ph = 0, age = 0, t = 0;
      S.ovUsed = false; S.crop = cropOf(cls, Sc, w, h); S.Sc = Sc;
      if (st === 'm') { ph = idx / this.SN.m * TAU; walk = Math.sin(ph); t = ph; age = ph / 7; }
      else if (st === 'i') { t = idx / this.SN.i * TAU; }
      else { atk = [0.85, 0.6, 0.35, 0.12][idx]; lunge = Math.sin((1 - atk) * Math.PI); }
      S.rot = walk * 0.05;
      beginLayer(g, S.crop, Sc); outline(g);
      g.rotate(S.rot);
      fn.call(this, g, pal, walk, atk, lunge, age, t);
      return this.bakeSprite(S, w, h, Sc, cls, ico);
    },
    // Compositing runs on reused scratch canvases (drawing into a fresh canvas is several times slower) and the result is copied into the new sprite canvas with one
    // blit: the flat figure is blitted at 8 offsets around itself and recoloured to opaque ink (the 2.6u contour), the vellum halo is that ring blitted at
    // 4 diagonal offsets and recoloured, ticks go under, the figure and the hairline layer go on top.
    bakeSprite: function (S, w, h, Sc, cls, ico) {
      var out = document.createElement('canvas'), x = S.comp.g, hg = S.hal.g, K = S.crop, kx = K[0], ky = K[1], kw = K[2], kh = K[3], k, rH = Math.round(HALOW * Sc);
      out.width = kw; out.height = kh; // the sprite canvas is only the figure rectangle; kx, ky, fw, fh place it in the virtual 92 x 120 box
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, w, h);
      x.drawImage(S.fig.cv, kx, ky, kw, kh, kx, ky, kw, kh);
      for (k = 0; k < 8; k++) x.drawImage(S.fig.cv, kx, ky, kw, kh, kx + Math.round(DIR8[k][0] * INKW * Sc), ky + Math.round(DIR8[k][1] * INKW * Sc), kw, kh);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = INK; x.fillRect(kx, ky, kw, kh); x.globalCompositeOperation = 'source-over';
      if (!ico) {
        hg.setTransform(1, 0, 0, 1, 0, 0); hg.globalCompositeOperation = 'source-over'; hg.clearRect(kx, ky, kw, kh);
        hg.drawImage(S.comp.cv, kx, ky, kw, kh, kx + rH, ky + rH, kw, kh); hg.drawImage(S.comp.cv, kx, ky, kw, kh, kx - rH, ky + rH, kw, kh);
        hg.drawImage(S.comp.cv, kx, ky, kw, kh, kx + rH, ky - rH, kw, kh); hg.drawImage(S.comp.cv, kx, ky, kw, kh, kx - rH, ky - rH, kw, kh);
        hg.globalCompositeOperation = 'source-in'; hg.fillStyle = VEL; hg.fillRect(kx, ky, kw, kh); hg.globalCompositeOperation = 'source-over';
        x.globalCompositeOperation = 'destination-over'; groundTicks(x, Sc, cls); // under the figure, above the halo
        x.globalAlpha = 0.45; x.drawImage(S.hal.cv, kx, ky, kw, kh, kx, ky, kw, kh); x.globalAlpha = 1; // vellum halo, alpha <= .45 (under the alpha > 150 portrait crop)
        x.globalCompositeOperation = 'source-over';
      }
      x.drawImage(S.fig.cv, kx, ky, kw, kh, kx, ky, kw, kh);
      if (S.ovUsed) x.drawImage(S.ov.cv, kx, ky, kw, kh, kx, ky, kw, kh);
      out.getContext('2d').drawImage(S.comp.cv, kx, ky, kw, kh, 0, 0, kw, kh);
      out.kx = kx; out.ky = ky; out.fw = w; out.fh = h;
      return out;
    },
    // draw a baked sprite at scale s with the ground point at the current origin: the canvas holds only the figure rectangle (about half of the 92 x 120 box)
    blit: function (c, img, s) {
      if (img.fw) c.drawImage(img, (-46 + 92 * img.kx / img.fw) * s, (-74 + 120 * img.ky / img.fh) * s, 92 * img.width / img.fw * s, 120 * img.height / img.fh * s);
      else c.drawImage(img, -46 * s, -74 * s, 92 * s, 120 * s);
    },
    renderSprite: function (cls, team, st, idx, m) {
      return this.makeSprite(cls, team, st, idx, function (g, pal, walk, atk, lunge, age, t) {
        switch (cls) {
          case 'spear': this.dSpear(g, pal, team, walk, lunge, t); break;
          case 'archer': this.dArcher(g, pal, team, walk, atk, t); break;
          case 'cav': this.dCav(g, pal, team, walk, lunge, age, t); break;
          case 'knight': this.dKnight(g, pal, team, walk, lunge, t); break;
          case 'mage': this.dMage(g, pal, team, walk, atk, t); break;
          case 'cata': this.dCata(g, pal, team, idx * 6, atk, t); break;
          case 'healer': this.dHealer(g, pal, team, walk, atk, t); break;
          case 'banner': this.dBanner(g, pal, team, walk, lunge, t); break;
          case 'assassin': this.dAssassin(g, pal, team, walk, lunge, t); break;
          case 'golem': this.dGolem(g, pal, team, walk, lunge, t); break;
          case 'flamer': this.dFlamer(g, pal, team, walk, atk, t); break;
        }
      }, m);
    },
    // baked --ink2 silhouette at alpha .45 for units the player does not own yet (UI.unitImg(cls, team, "ghost")). The canvas carries .bbox (device px,
    // from the opaque sprite) because the silhouette itself never reaches the alpha > 150 the portrait crop looks for.
    ghostSprite: function (cls, team) {
      var key = cls + (team ? 1 : 0) + '@' + this.px, cache = this._ghost || (this._ghost = {});
      if (cache[key]) return cache[key];
      var oi = this.icoMode, cv, out, x, w, h, d, xx, yy, x0, x1, y0, y1;
      this.icoMode = true;
      try { cv = this.renderSprite(cls, team ? 1 : 0, 'i', 0); } finally { this.icoMode = oi; }
      w = cv.width; h = cv.height; out = document.createElement('canvas'); out.width = w; out.height = h; x = out.getContext('2d');
      x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = INK2; x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
      try {
        d = cv.getContext('2d').getImageData(0, 0, w, h).data; x0 = w; y0 = h; x1 = 0; y1 = 0;
        for (yy = 0; yy < h; yy++) for (xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 150) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
        out.bbox = { x0: x0, y0: y0, x1: x1, y1: y1 };
      } catch (e) { out.bbox = null; }
      return (cache[key] = out);
    },
    scratchFigure: function () { return SCR ? SCR.fig.cv : null; }, // the last flat figure before the contour was baked (gallery / margin checks)
    scratchOverlay: function () { return SCR && SCR.ovUsed ? SCR.ov.cv : null; },

    drawUnit: function (c, u) {
      var y = this.Y(u.x) + (u._oy || 0), x = this.roadX(u.lane, y) + (u._ox || 0), dirY = u.team === 0 ? 1 : -1, bm = u.boss ? 1.55 : 1, s = bm * SPR;
      if (u.age < 0.3) { var q = u.age / 0.3; s *= 0.5 + 0.5 * (1 - Math.pow(1 - q, 3)); }
      var atk = u.atkAnim > 0 ? u.atkAnim / 0.25 : 0, st, idx;
      if (atk > 0) { st = 'a'; idx = Math.min(this.SN.a - 1, Math.floor((1 - atk) * this.SN.a)); }
      else if (u.moving) { st = 'm'; idx = Math.floor(((u.age * u.speed * 0.0191) % 1) * this.SN.m); }
      else { st = 'i'; idx = Math.floor(((this.time * 0.55 + u.id * 0.137) % 1) * this.SN.i); }
      if (u.boss && !u._wb) { u._wb = 1; this.warmClass(u.cls, u.team, bm); } // a boss is baked at the scale it is drawn at (1.55): queue its other frames for idle time
      var img = this.getSprite(u.cls, u.team, st, idx, bm), k = s / SPR;

      if (u.aura) this.auraRing(c, x, y, 100, 160 * this.s, 0); // banner aura: a dashed ink-and-or ring on the ground
      c.save();
      c.translate(x, y); if (dirY < 0) c.scale(1, -1);
      if (u.boss) { c.fillStyle = VERM; c.globalAlpha = 0.16 + 0.05 * Math.sin(this.time * 6); circ(c, 0, 0, 46); c.globalAlpha = 0.22 + 0.05 * Math.sin(this.time * 6); circ(c, 0, 0, 30); c.globalAlpha = 1; } // two flat discs
      this.blit(c, img, s);
      c.scale(s, s);
      this.unitFx(c, u);
      c.restore();

      var ext = { spear: 54, archer: 30, cav: 58, knight: 36, mage: 38, cata: 42, healer: 34, banner: 58, assassin: 30, golem: 42, flamer: 38 }[u.cls] || 40;
      var rear = { cav: 36, cata: 30, banner: 20 }[u.cls] || 20;
      var top = y - (u.team === 0 ? ext : rear) * s - 10;
      if (u.boss) this.crown(c, x, top - 16, 1.15);
      if (u.hp < u.max) this.hpBar(c, x, top, 42 * Math.min(k, 1.4), Math.max(0, u.hp / u.max), u.team, 5.5);
    },
    // live status marks over a unit, in sprite units (context already scaled by s): frozen shell, flames, hit flash, ward ring. All flat, ink edged.
    unitFx: function (c, u) {
      var bt = this.battle.t, k, ft;
      if (u.stunUntil > bt) { // frozen: argent shell with ink cracks
        c.globalAlpha = 0.66; c.fillStyle = ARG; rrect(c, -17, -32, 34, 56, 10); c.fill(); c.globalAlpha = 1;
        c.strokeStyle = INK; c.lineWidth = 2; c.lineJoin = 'round'; c.lineCap = 'round'; rrect(c, -17, -32, 34, 56, 10); c.stroke();
        c.beginPath(); c.moveTo(-11, -24); c.lineTo(-4, -8); c.moveTo(10, -28); c.lineTo(4, -12); c.moveTo(-9, 12); c.lineTo(0, 0); c.moveTo(8, 6); c.lineTo(13, 18); c.stroke();
      }
      if (u.burnUntil > bt) { // burning: flat flames, vermilion and or
        ft = this.time * 14 + u.id; c.strokeStyle = INK; c.lineWidth = 1.2;
        for (k = 0; k < 4; k++) { c.beginPath(); c.ellipse(-10 + k * 7, -6 - Math.abs(Math.sin(ft + k * 2)) * 9, 3.4, 6 + Math.sin(ft + k) * 2, 0, 0, TAU); c.fillStyle = k % 2 ? ORP : VERM; c.fill(); c.stroke(); }
      }
      if (u.flash > 0) { c.globalAlpha = Math.min(0.75, u.flash * 6); c.fillStyle = IVO; ell(c, 0, -4, 16, 22); c.globalAlpha = 1; }
      if (u.wardUntil > bt) { // ward: malachite ring with an ink edge
        c.beginPath(); c.arc(0, -2, 25, 0, TAU); c.strokeStyle = INK; c.lineWidth = 4.6; c.stroke(); c.strokeStyle = VDG; c.lineWidth = 2.6; c.stroke();
        c.globalAlpha = 0.14; c.fillStyle = VDG; c.fill(); c.globalAlpha = 1;
      }
    },
    // flat ink ribbon (bible: 3u ink border, ally --mal, enemy --verm, vellum trough, no gradient); x = centre, top = y of the trough
    hpBar: function (c, x, top, bw, f, team, bh) {
      var B = 3, x0 = x - bw / 2;
      bh = bh || 4.5;
      c.fillStyle = INK; c.fillRect(x0 - B, top - B, bw + B * 2, bh + B * 2);
      c.fillStyle = VEL; c.fillRect(x0, top, bw, bh);
      c.fillStyle = team === 0 ? MAL : VERM; c.fillRect(x0, top, Math.max(1.5, bw * f), bh);
    },
    crown: function (c, x, y, s) { // boss / commander crown: or with an ink contour (stroke then fill)
      c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = INK; c.lineWidth = 2.6; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-9, 10); c.lineTo(-9, 0); c.lineTo(-4.5, 5); c.lineTo(0, -5); c.lineTo(4.5, 5); c.lineTo(9, 0); c.lineTo(9, 10); c.closePath(); c.stroke(); c.fillStyle = ORP; c.fill();
      c.restore();
    },
    auraRing: function (c, x, y, rx, ry, off) { // banner aura on the ground: a dashed ring, ink then or (flat, no glow); ry === rx draws a circle
      c.save(); c.translate(x, y); c.setLineDash([10, 8]); c.lineDashOffset = off || -this.time * 12; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU);
      c.strokeStyle = INK2; c.globalAlpha = 0.55; c.lineWidth = 4; c.stroke(); c.strokeStyle = ORP; c.globalAlpha = 0.9; c.lineWidth = 2; c.stroke();
      c.setLineDash([]); c.restore();
    },
    drawTexts: function (c) { // combat numbers: system-ui 900, 6u ink stroke (dealt ivory, crit or, taken coral, heal mint: see R.DMG)
      var i, tx;
      c.textAlign = 'center'; c.lineJoin = 'round'; c.strokeStyle = INK; c.lineWidth = 6;
      for (i = 0; i < this.texts.length; i++) {
        tx = this.texts[i]; c.globalAlpha = Math.min(1, tx.t / 0.35); c.font = '900 ' + tx.size + 'px system-ui';
        c.strokeText(tx.s, tx.x, tx.y); c.fillStyle = tx.col; c.fillText(tx.s, tx.x, tx.y);
      }
      c.globalAlpha = 1;
    },
    // flat swallow-tail banderole with ink text, for announcements and any banner placed by the castle / camp code.
    // drawBanderole(c, x, y, w, h, text, o): (x, y) = centre; o = { fill, ink, rule, under, size }. Draws at the current alpha and transform.
    drawBanderole: function (c, x, y, w, h, text, o) { banderole(c, x, y, w, h, text, o); },
    // the announcement in this.banner = { text, col, t } as a banderole centred at (cx, cy): 64u tall, 36u lettering. It is painted once into a card canvas (per text
    // and tincture) and blitted with ONE alpha, so the fade over the last 0.25 s never shows the folds through the ground (a banderole painted in layers at alpha is muddy).
    drawBannerCard: function (c, cx, cy, bn) {
      var key = bn.text + '|' + bn.col, bc = this._bnc || (this._bnc = {}), e = bc[key], px = this.px, size = 36, h = 64, tw, w, cv, g, st;
      if (!e) {
        c.save(); c.font = bandFont(bn.text, size); tw = c.measureText(bn.text).width; c.restore();
        w = Math.min(this.W - 76, Math.max(240, tw + 120));
        cv = document.createElement('canvas'); cv.width = Math.ceil((w + 44) * px); cv.height = Math.ceil((h + 26) * px); g = cv.getContext('2d');
        st = bannerStyle(bn.col); st.size = size;
        g.setTransform(px, 0, 0, px, 0, 0); banderole(g, cv.width / px / 2, 6 + h / 2, w, h, bn.text, st); // folds reach 17u beside and 15u below the 64u body
        e = bc[key] = { cv: cv, w: cv.width / px, h: cv.height / px, oy: 6 + h / 2 };
      }
      c.globalAlpha = bn.t < 0.25 ? Math.max(0, bn.t / 0.25) : 1; c.drawImage(e.cv, cx - e.w / 2, cy - e.oy, e.w, e.h); c.globalAlpha = 1;
    },

    // coordinates: origin = the unit's ground point, forward = -y, helmets and heads look up the screen. Everything is flat: ink line, pigment, crescent.
    feet: function (c, walk, col) { E(c, -5, 9 + walk * 3.5, 3.8 * HAND, 4.8 * HAND, col); E(c, 5, 9 - walk * 3.5, 3.8 * HAND, 4.8 * HAND, col); },
    hand: function (c, x, y) { O(c, x, y, 3.6 * HAND, SKIN); },
    // host: flat-top great helm (kind 'great') or kettle hat ('kettle'); garrison: conical nasal helm, never horned. r = head radius (already x1.15)
    helmet: function (c, x, y, r, p, team, kind) {
      if (team === 1) {
        gshape(c, function (q, dx, dy) {
          var X = x + dx, Y = y + dy;
          q.moveTo(X, Y - r * 1.62); q.bezierCurveTo(X + r * 0.62, Y - r * 1.05, X + r, Y - r * 0.55, X + r, Y); q.arc(X, Y, r, 0, Math.PI, false);
          q.bezierCurveTo(X - r, Y - r * 0.55, X - r * 0.62, Y - r * 1.05, X, Y - r * 1.62); q.closePath();
        }, p.metal, p.metalD, Math.max(1.1, r * 0.28), [x, y - r * 0.2, r]);
        c.fillStyle = INK; c.fillRect(x - 0.95, y - r * 1.52, 1.9, r * 1.35);                                   // nasal bar
        c.strokeStyle = p.main; c.lineWidth = 2.6; c.lineCap = 'butt'; c.beginPath(); c.arc(x, y, r * 0.84, Math.PI * 0.12, Math.PI * 0.88); c.stroke(); outline(c); // brow band
      } else if (kind === 'great') {
        E(c, x, y + r * 1.0, r * 0.45, r * 0.78, p.main);                                                       // plume behind
        RR(c, x - r, y - r, r * 2, r * 2.04, r * 0.44, p.metal, p.metalD, 1);
        c.fillStyle = INK; c.fillRect(x - r * 0.62, y - r * 0.52, r * 1.24, r * 0.3); c.fillRect(x - r * 0.1, y - r * 0.52, r * 0.2, r * 1.3);   // eye slit + breaths
      } else {
        O(c, x, y, r * 1.34, p.metal, p.metalD, 1);                                                             // kettle hat: broad brim
        E(c, x, y, r * 0.68, r * 0.84, p.metal, p.metalD, 1);                                                   // crown, longer front to back
        c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x, y - r * 0.8); c.lineTo(x, y + r * 0.8); c.stroke(); outline(c);   // ridge
      }
    },
    dSpear: function (c, pal, team, walk, lunge, t) {
      var ext = lunge * 12, sw = Math.sin(t * 7) * 2;
      c.beginPath(); c.moveTo(-8, 3); c.quadraticCurveTo(-10 + sw, 16, 0, 20); c.quadraticCurveTo(10 + sw, 16, 8, 3); c.closePath(); fe(c, pal.cloth);   // cloak
      this.feet(c, walk, BIS);
      E(c, 0, 2, 11.5, 9.5, pal.main, pal.dark);                                                                  // tabard
      belt(c, 0, 2, 11.5, 9.5, 6.2, 2.8, pal.trim); device(c, 'auto', 0, -0.4, 5, pal, team);
      mgrad(c, -11.5, -1, 5.2, pal); mgrad(c, 11.5, -1, 5.2, pal);                                                // pauldrons
      shield(c, -14.5, -3, 1, pal, team);
      bar(c, 12.5, 13, 12.5, -32 - ext, 3, BIS);                                                                  // shaft
      poly(c, [[12.5, -52 - ext], [16.8, -40 - ext], [12.5, -35 - ext], [8.2, -40 - ext]], pal.metal, pal.metalD, 1); // leaf blade
      poly(c, [[12.5, -39 - ext], [25 + Math.sin(t * 9) * 3, -35.5 - ext], [12.5, -30 - ext]], pal.main);        // pennon
      this.hand(c, 12.5, 2);
      this.helmet(c, 0, -8, 7.6 * HEAD, pal, team, 'kettle');
    },
    dArcher: function (c, pal, team, walk, atk, t) {
      var pull = atk > 0 ? (1 - atk) * 10 : 3, ax = 19 * Math.cos(Math.PI * 1.12), ay = -4 + 19 * Math.sin(Math.PI * 1.12), bx = 19 * Math.cos(Math.PI * 1.88);
      RR(c, 2, 3, 6.4, 15, 2.5, BIS, INK2); c.fillStyle = IVO; c.fillRect(3.4, 0.2, 2, 4); c.fillRect(5.4, -0.6, 2, 4.6);   // quiver and fletching
      c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-12, 12, 0, 18); c.quadraticCurveTo(12, 12, 6, 0); c.closePath(); fe(c, pal.dark);                // cloak
      this.feet(c, walk, BIS);
      E(c, 0, 2, 9.5, 8, pal.main, pal.dark); belt(c, 0, 2, 9.5, 8, 5.4, 2.6, BIS); device(c, 'auto', 0, -0.8, 4.3, pal, team);
      this.hand(c, -10, -3); this.hand(c, 10, -6);
      c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 5.8; c.beginPath(); c.arc(0, -4, 19, Math.PI * 1.12, Math.PI * 1.88); c.stroke();   // bow
      c.strokeStyle = BIS; c.lineWidth = 3.4; c.stroke(); outline(c);
      if (atk === 0 || atk < 0.6) {                                                                                 // arrow
        bar(c, 0, -3 + pull * 0.5, 0, -29, 2, IVO); poly(c, [[0, -39], [3.6, -29], [-3.6, -29]], pal.metal, pal.metalD);
        c.fillStyle = pal.light; c.fillRect(-2.4, -5 + pull * 0.5, 4.8, 4.2);
      }
      var o = c.ovl ? c.ovl() : c; o.strokeStyle = INK; o.lineWidth = 1.2; o.lineCap = 'round'; o.beginPath(); o.moveTo(ax, ay); o.lineTo(0, -4 + pull * 0.5 - 1); o.lineTo(bx, ay); o.stroke();   // bowstring: a hairline over the contour
      this.helmet(c, 0, -7, 7 * HEAD, pal, team, 'kettle');
    },
    dCav: function (c, pal, team, walk, lunge, age, t) {
      var host = team === 0, coat = host ? IVO : BIS, coatD = host ? VEL2 : INK2, g = Math.sin(age * 14) * (walk !== 0 ? 1 : 0.1), ext = lunge * 10, wv = Math.sin(t * 8) * 2;
      [[-12, -12], [12, -12], [-12, 14], [12, 14]].forEach(function (L, i) { E(c, L[0], L[1] + g * (i % 2 ? 5.5 : -5.5), 3.8, 7.4, coatD); });   // legs show beside the barrel
      c.beginPath(); c.moveTo(0, 22); c.quadraticCurveTo(-7 + Math.sin(t * 6) * 2, 33, -2, 37); c.quadraticCurveTo(5, 33, 0, 22); fe(c, INK2);              // tail
      E(c, 0, 2, 12.5, 22.5, coat, coatD);                                                                          // barrel
      E(c, 0, -23, 6.6, 10.5, coat, coatD); E(c, 0, -31.5, 4.6, 6, coatD);                                          // neck and muzzle
      c.strokeStyle = INK2; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -13); c.stroke(); outline(c);   // mane
      poly(c, [[-5, -16], [-8.5, -23], [-2.6, -19.5]], coatD); poly(c, [[5, -16], [8.5, -23], [2.6, -19.5]], coatD);       // ears
      RR(c, -13.8, -2, 27.6, 27, 6, pal.main, pal.dark);                                                            // caparison (horse cloth) over the croup, behind the rider
      c.save(); rrect(c, -13.8, -2, 27.6, 27, 6); c.clip(); c.fillStyle = pal.trim; c.fillRect(-15, 19.4, 30, 4); c.fillStyle = INK; c.fillRect(-15, 19.4, 30, 0.9); c.fillRect(-15, 22.5, 30, 0.9); c.restore();
      device(c, 'auto', 0, 9.6, 6.6, pal, team);
      c.beginPath(); c.moveTo(-6, -7); c.lineTo(6, -7); c.lineTo(4.6 + wv, 7); c.lineTo(-4.6 + wv, 7); c.closePath(); fe(c, pal.cloth);   // rider's cloak
      E(c, 0, -9, 8.4, 7, pal.metal, pal.metalD, 1); mgrad(c, -8.6, -10, 3.9, pal); mgrad(c, 8.6, -10, 3.9, pal);
      bar(c, 10.5, 4, 10.5, -44 - ext, 3.2, BIS);                                                                   // lance
      poly(c, [[10.5, -58 - ext], [14.4, -44 - ext], [6.6, -44 - ext]], pal.metal, pal.metalD);
      poly(c, [[10.5, -43 - ext], [25 + Math.sin(t * 9) * 3, -38.5 - ext], [10.5, -33 - ext]], pal.main);
      this.hand(c, 10.5, -4);
      this.helmet(c, 0, -15, 6.8 * HEAD, pal, team, 'great');
    },
    dKnight: function (c, pal, team, walk, lunge, t) {
      var sw = lunge * 12;
      this.feet(c, walk, INK2);
      poly(c, [[13.4, 8], [18.6, 8], [18.6, -33 - sw], [16, -40 - sw], [13.4, -33 - sw]], pal.metal, pal.metalD);   // blade
      c.strokeStyle = IVO; c.lineWidth = 1; c.beginPath(); c.moveTo(15.2, 4); c.lineTo(15.2, -30 - sw); c.stroke(); outline(c);
      bar(c, 8.5, -2, 23.5, -2, 3.6, pal.trim); O(c, 16, 12.5, 3, pal.trim);                                        // cross-guard and pommel
      E(c, 0, 2, 16, 12.5, pal.metal, pal.metalD, 1);                                                               // plate
      RR(c, -7, -7, 14, 24, 3.5, pal.main, pal.dark); c.fillStyle = pal.trim; c.fillRect(-7, 7.4, 14, 2.6); c.fillStyle = INK; c.fillRect(-7, 7.4, 14, 0.9); c.fillRect(-7, 9.1, 14, 0.9);
      device(c, 'auto', 0, 0.2, 6.2, pal, team);
      mgrad(c, -16, -1, 8.2, pal); mgrad(c, 16, -1, 8.2, pal);
      if (team === 1) shield(c, -24, 2, 1.28, pal, team); else shield(c, -25, 1, 1.3, pal, team);
      this.helmet(c, 0, -9, 9 * HEAD, pal, team, 'great');
    },
    dMage: function (c, pal, team, walk, atk, t) {
      var gl = 5.4 + (atk > 0 ? 6 * atk : 0) + Math.sin(t * 6) * 0.6, i, a;
      E(c, 0, 3, 14.5, 12.5, pal.main, pal.dark);                                                                   // robe
      c.fillStyle = ORP; for (i = 0; i < 7; i++) circ(c, Math.cos(i * 0.9 + 0.4) * 11.8, 3 + Math.sin(i * 0.9 + 0.4) * 10.2, 1.5);
      device(c, 'auto', 0, 8, 4.6, pal, team);
      this.hand(c, -12, -2); this.hand(c, 13, -6);
      bar(c, 14.5, 12, 14.5, -31, 3.2, BIS);                                                                        // staff
      O(c, 14.5, -37, gl + 2.6, PUR); O(c, 14.5, -37, gl * 0.6, IVO); tick(c, 14.5, -37, gl + 2.6);                // orb: two flat discs
      for (i = 0; i < 3; i++) { a = t * 3 + i * 2.1; c.fillStyle = IVO; circ(c, 14.5 + Math.cos(a) * (gl + 7), -37 + Math.sin(a) * (gl + 7) * 0.6, 1.7); }
      O(c, 0, -6, 11.8, pal.cloth);                                                                                 // hat: brim
      gshape(c, function (q, dx, dy) { q.moveTo(-6.8 + dx, -7 + dy); q.quadraticCurveTo(-4.4 + dx, -21 + dy, 3.6 + dx, -34 + dy); q.quadraticCurveTo(5.4 + dx, -20 + dy, 6.8 + dx, -7 + dy); q.closePath(); }, pal.main, pal.dark, 2.2);   // cone
      c.save(); c.beginPath(); c.moveTo(-6.8, -7); c.quadraticCurveTo(-4.4, -21, 3.6, -34); c.quadraticCurveTo(5.4, -20, 6.8, -7); c.closePath(); c.clip();
      c.fillStyle = pal.trim; c.fillRect(-9, -13.4, 18, 3.4); c.fillStyle = INK; c.fillRect(-9, -13.4, 18, 0.9); c.fillRect(-9, -10.9, 18, 0.9); c.restore();                             // band
      O(c, 3.6, -34, 2.2, pal.trim);
    },
    dCata: function (c, pal, team, ux, atk, t) {
      var rot = Math.floor((ux * 0.16) % 3), sweep = atk > 0 ? (1 - atk) : 0, k, by = 20 - sweep * 62 + (sweep === 0 ? 0 : -2);
      RR(c, -18.5, -23, 37, 51, 6, BIS, INK2);                                                                      // frame
      c.strokeStyle = INK2; c.lineWidth = 1.2; for (k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-17.5, -18 + k * 8); c.lineTo(17.5, -18 + k * 8); c.stroke(); } outline(c);
      [[-23, -8], [23, -8], [-23, 14], [23, 14]].forEach(function (w) {                                             // wheels
        RR(c, w[0] - 4.8, w[1] - 10, 9.6, 20, 3.5, INK2);
        c.strokeStyle = BIS; c.lineWidth = 1.8; for (var q = 0; q < 3; q++) { var yy = w[1] - 7 + ((q * 7 + rot * 2.3) % 14); c.beginPath(); c.moveTo(w[0] - 4, yy); c.lineTo(w[0] + 4, yy); c.stroke(); } outline(c);
      });
      RR(c, -15, -21, 30, 13, 3, pal.main, pal.dark); device(c, 'auto', 0, -14.6, 5, pal, team);                   // front screen carrying the device
      RR(c, -15, -3, 30, 6, 2, INK2);                                                                               // axle beam
      bar(c, 0, -1, 0, by, 5.2, BIS);                                                                               // throwing arm, bucket, stone
      O(c, 0, -1, 4.6, INK2); O(c, 0, by, 8, BIS, INK2); if (atk === 0) O(c, 0, by, 5.2, ARG, '#7E889D');
      bar(c, -19, 31, -19, 13, 2.2, BIS); poly(c, [[-19, 27], [-34, 23 + Math.sin(t * 5) * 1.5], [-19, 18]], pal.main);  // pennon
    },
    dHealer: function (c, pal, team, walk, atk, t) {
      var gl = atk > 0 ? 1 + 0.5 * atk : 1, o;
      this.feet(c, walk, VEL2);
      E(c, 0, 2, 12, 10.5, IVO, VEL2);                                                                              // robe
      RR(c, -4.9, -4, 9.8, 19, 3, pal.main, pal.dark); device(c, 'auto', 0, 4.4, 4.2, pal, team);                   // team scapular
      this.hand(c, -11, -2); this.hand(c, 13, -6);
      bar(c, 14, 12, 14, -28, 3, BIS);
      poly(c, [[14, -45 - (gl - 1) * 4], [19.8, -36], [14, -27 + (gl - 1) * 3], [8.2, -36]], VDG, MAL, 1);          // gem
      if (atk > 0) { o = c.ovl ? c.ovl() : c; o.strokeStyle = VDG; o.globalAlpha = atk; o.lineWidth = 2.4; o.beginPath(); o.arc(0, -2, 20 + (1 - atk) * 12, 0, TAU); o.stroke(); o.globalAlpha = 1; }
      O(c, 0, -7, 7.4 * HEAD, IVO, VEL2);                                                                           // coif
      c.strokeStyle = pal.main; c.lineWidth = 2.8; c.lineCap = 'butt'; c.beginPath(); c.arc(0, -7, 7.4, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); outline(c);
      c.fillStyle = MAL; c.fillRect(-1.4, -12.6, 2.8, 8.8); c.fillRect(-4.4, -9.4, 8.8, 2.8);                       // the green cross of the healers
    },
    dAssassin: function (c, pal, team, walk, lunge, t) {
      var L = lunge * 10, cl = pal.dark;
      c.beginPath(); c.moveTo(-9, 2); c.quadraticCurveTo(-13 + Math.sin(t * 5) * 3, 18, -2, 27 + Math.sin(t * 6) * 2); c.quadraticCurveTo(13 + Math.sin(t * 5) * 3, 18, 9, 2); c.closePath(); fe(c, cl);   // cloak
      this.feet(c, walk, INK2);
      E(c, 0, 2, 9.6, 8.6, pal.main, pal.dark); belt(c, 0, 2, 9.6, 8.6, 4.8, 2.4, pal.trim); device(c, 'auto', 0, -1, 3.8, pal, team);
      poly(c, [[9.8, -2], [13.8, -2], [13.2, -26 - L], [9.2, -19 - L]], pal.metal, pal.metalD); bar(c, 11.8, 4, 11.8, -1, 3.4, BIS);     // twin daggers
      poly(c, [[-9.8, -2], [-13.8, -2], [-13.2, -26 - L], [-9.2, -19 - L]], pal.metal, pal.metalD); bar(c, -11.8, 4, -11.8, -1, 3.4, BIS);
      poly(c, [[3, -2], [9.5, 6 + Math.sin(t * 6) * 2], [4, 11]], pal.main);                                         // sash end
      O(c, 0, -7, 7.2 * HEAD, cl, INK2);                                                                             // hood
      E(c, 0, -10.2, 4.6, 3, INK); c.fillStyle = pal.light; circ(c, -2, -10.4, 1.2); circ(c, 2, -10.4, 1.2);
    },
    dGolem: function (c, pal, team, walk, lunge, t) {
      var fy = lunge * 16, ST = ARG, SD = '#7E889D';
      E(c, -9, 13 + walk * 3, 7.4, 7.6, SD, INK2); E(c, 9, 13 - walk * 3, 7.4, 7.6, SD, INK2);                       // feet
      E(c, -19, 1, 7.4, 9.4, ST, SD); E(c, 19, 1, 7.4, 9.4, ST, SD);                                                 // shoulders
      E(c, 0, 2, 21, 16.5, ST, SD, 1);                                                                               // torso
      c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-13, -8); c.lineTo(-9, 0); c.lineTo(-14, 7); c.moveTo(13.5, -7); c.lineTo(10.5, 2); c.lineTo(15, 9); c.stroke(); outline(c);   // cracks
      E(c, -13, -4, 3.6, 2.2, MAL); E(c, 15.4, 8, 3.2, 1.9, MAL);                                                    // moss
      poly(c, [[-7.6, -5], [7.6, -5], [7.6, 5], [0, 14.5], [-7.6, 5]], pal.main, pal.dark);                          // painted shield: the team mark
      device(c, 'auto', 0, 1.6, 5.1, pal, team);
      O(c, -24, -8 - fy, 9.8, ST, SD, 1); O(c, 24, -8 - fy, 9.8, ST, SD, 1);                                         // fists
      O(c, 0, -14, 8.6 * HEAD, ST, SD, 1);                                                                           // head
      c.fillStyle = INK; c.fillRect(-6, -19, 4.6, 2.4); c.fillRect(1.4, -19, 4.6, 2.4); c.fillStyle = pal.light; c.fillRect(-4.6, -18.6, 2, 1.6); c.fillRect(2.6, -18.6, 2, 1.6);
    },
    dFlamer: function (c, pal, team, walk, atk, t) {
      var Lf;
      RR(c, -10.5, 4, 21, 26, 7, BIS, INK2); c.save(); rrect(c, -10.5, 4, 21, 26, 7); c.clip();                    // fire-pot on the back: it shows below the body
      c.fillStyle = LEAF; c.fillRect(-11, 14, 22, 3.4); c.fillRect(-11, 23.4, 22, 3.4); c.fillStyle = INK; c.fillRect(-11, 14, 22, 0.9); c.fillRect(-11, 16.5, 22, 0.9); c.fillRect(-11, 23.4, 22, 0.9); c.fillRect(-11, 25.9, 22, 0.9); c.restore();
      c.strokeStyle = INK; c.lineWidth = 5.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(4, 10); c.quadraticCurveTo(16, 6, 10, -8); c.stroke(); c.strokeStyle = INK2; c.lineWidth = 3; c.stroke(); outline(c);   // hose
      this.feet(c, walk, BIS);
      E(c, 0, 2, 10.2, 8.8, pal.main, pal.dark); belt(c, 0, 2, 10.2, 8.8, 5, 2.4, pal.trim); device(c, 'auto', 0, -1.2, 4, pal, team);
      O(c, -10, -3, 4.3, INK2); O(c, 10, -8, 4.3, INK2);
      bar(c, 10, -6, 10, -26, 4.4, '#4A5368'); RR(c, 6.6, -34, 6.8, 9, 2.4, INK2);                                    // nozzle
      if (atk > 0) { Lf = 12 + (1 - atk) * 23; poly(c, [[10, -34], [1, -34 - Lf * 0.78], [10, -34 - Lf], [19, -34 - Lf * 0.78]], VERM); poly(c, [[10, -34], [5.4, -34 - Lf * 0.5], [10, -34 - Lf * 0.78], [14.6, -34 - Lf * 0.5]], ORP); }
      else E(c, 10, -38, 3, 4.4 + Math.sin(t * 6) * 1.2, ORP);
      this.helmet(c, 0, -8, 7.2 * HEAD, pal, team, 'kettle');
    },
    dBanner: function (c, pal, team, walk, lunge, t) {
      var w = Math.sin(t * 4) * 4;
      c.beginPath(); c.moveTo(-8, 3); c.quadraticCurveTo(-10, 15, 0, 19); c.quadraticCurveTo(10, 15, 8, 3); c.closePath(); fe(c, pal.cloth);
      this.feet(c, walk, BIS);
      E(c, -1, 3, 12.5, 10, pal.metal, pal.metalD, 1); RR(c, -5, -4, 10, 17, 3, pal.main, pal.dark); c.fillStyle = pal.trim; c.fillRect(-5, 8.2, 10, 2.4); c.fillStyle = INK; c.fillRect(-5, 8.2, 10, 0.9); c.fillRect(-5, 9.7, 10, 0.9);
      device(c, 'auto', 0, 1.4, 3.9, pal, team);
      mgrad(c, -12, -1, 5.2, pal); mgrad(c, 10, -1, 5.2, pal);
      bar(c, 12, 8, 12, -8 - lunge * 8, 2.8, pal.metal);
      bar(c, 0, 14, 0, -54, 3.4, BIS);                                                                               // pole
      poly(c, [[0, -52], [35 + w, -47.5], [30 + w * 0.6, -38], [35 + w, -28.5], [0, -25]], pal.main, pal.dark);      // swallow-tail flag
      c.strokeStyle = pal.trim; c.lineWidth = 2.4; c.beginPath(); c.moveTo(2, -49.4); c.lineTo(31 + w, -45.6); c.moveTo(2, -27.6); c.lineTo(31 + w, -30.6); c.stroke(); outline(c);
      device(c, 'auto', 15.5, -38.5, 7.2, pal, team);
      O(c, 0, -57, 3.8, pal.trim);
      this.helmet(c, -1, -7, 7.2 * HEAD, pal, team, 'great');
    }
  };
  // Acik alan cizicisi (fieldrender.js) icin ortak yardimcilar
  R.THEMES = THEMES; R.PAL = PAL; R.SPR = SPR; R.OUT = OUT;
  R.DMG = { dealt: IVO, crit: ORP, taken: '#FF8A70', heal: '#7FD6B8' }; // combat number tinctures (bible section 7)
  R.TOK = { ink: INK, ink2: INK2, ivo: IVO, vel: VEL, vel2: VEL2, orp: ORP, leaf: LEAF, verm: VERM, mad: MAD, mal: MAL, vdg: VDG, pur: PUR, bole: BOLE, bis: BIS, arg: ARG, flesh: FLESH, lapis: LAPIS, lapisd: LAPISD, azur: AZUR, night: NIGHT, sand: SAND, ash: ASH };
  R.bannerStyle = bannerStyle; R.SPRITE_EXT = EXT; R.device = device; R.shield = shield;
  R.util = { ell: ell, circ: circ, rrect: rrect, line: line, seeded: seeded, hash: hash, star: star, E: E, O: O, RR: RR, poly: poly, outline: outline, mgrad: mgrad, TAU: TAU,
    fe: fe, gshape: gshape, tick: tick, bar: bar, belt: belt, device: device, shield: shield, banderole: banderole };
})(globalThis.Z = globalThis.Z || {});
