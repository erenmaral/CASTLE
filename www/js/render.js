// Sefer Vakti - canvas cizimi (DIKEY): 3 orman yolu yan yana, oyuncu kalesi altta, dusman ustte.
// Simulasyondaki 'x' (koridor boyunca konum) ekranda yukari dogru y ekseni olur. Tum grafikler kodla cizilir.
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };
  var C = Z.C, TAU = Math.PI * 2;
  var DW = 720;        // tasarim genisligi (3 koridor x 240)
  var SPR = 1.28;      // birlik cizim olcegi (telefonda okunabilirlik)
  var CASTLE_H = 86;   // kale yuksekligi (mantiksal px)
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
  var SKIN = FLESH, OUT = INK;                 // OUT: the opaque iron-gall ink (was a translucent navy)
  var INKW = 2.6, HALOW = 2, HEAD = 1.15, HAND = 1.2; // sprite contour (u, by 8-offset dilation), vellum halo (u), head and hand/foot scale
  // Diyar temalari: 0 Yesil Vadi (orman), 1 Kizil Col, 2 Buz Diyari
  var THEMES = [
    { sky: ['#16224f', '#7a4a7a', '#f0a35e'], sun: [255, 240, 190], m1: '#4a3a73', m2: '#2f4a5e', g: ['#3f6f2c', '#37622a', '#264a1f'],
      road: ['#a98a58', '#8a6c41', '#5a4527'], tree: ['#17402a', '#25613a', '#3f8c4f'], lane: '255,244,190', amb: 'leaf', kind: 'forest', shaft: '255,244,200' },
    { sky: ['#2b1650', '#c2410c', '#fbbf24'], sun: [255, 225, 150], m1: '#7c3f2a', m2: '#5a2d1f', g: ['#cfaa60', '#bb934a', '#8c6c32'],
      road: ['#ead6a2', '#d3b97b', '#a58848'], tree: ['#3f6b2e', '#5f8a3a', '#86ad4c'], lane: '255,240,200', amb: 'dust', kind: 'desert', shaft: '255,236,190' },
    { sky: ['#0b1d3a', '#3b6ea5', '#cfe8ff'], sun: [220, 240, 255], m1: '#6b8bb0', m2: '#a5bdd8', g: ['#e8f1fa', '#d2e0ee', '#a3b9d0'],
      road: ['#c9d9ea', '#aec3da', '#7f9bb9'], tree: ['#1f3f52', '#2f5d72', '#eef6fd'], lane: '190,225,255', amb: 'snow', kind: 'ice', shaft: '220,240,255' },
    { sky: ['#140808', '#5a1a12', '#e8631c'], sun: [255, 170, 60], m1: '#3a1a18', m2: '#241012', g: ['#2b2123', '#241c1e', '#171112'],
      road: ['#6a5a58', '#4d403f', '#241a1a'], tree: ['#1a1213', '#2a1d1c', '#e8631c'], lane: '255,170,100', amb: 'ember', kind: 'volcano', shaft: '255,150,70' },
    { sky: ['#0d1a1a', '#27493f', '#8fb59a'], sun: [200, 255, 210], m1: '#274038', m2: '#355a4c', g: ['#2e4a3b', '#274132', '#1b2e22'],
      road: ['#7a6844', '#5d4f33', '#33291a'], tree: ['#173a30', '#1f5a46', '#6fd1a3'], lane: '210,255,220', amb: 'fog', kind: 'swamp', shaft: '190,255,210' },
    // 5 Altin Yaprak Ormani (sonbahar)
    { sky: ['#2a1a3a', '#c0562a', '#f6b45a'], sun: [255, 210, 140], m1: '#7a4a2e', m2: '#5a3524', g: ['#9a6a2c', '#85592a', '#5e3d1e'],
      road: ['#c9a36a', '#a8824d', '#6d5230'], tree: ['#7a3a14', '#c4621f', '#e9a23a'], leaf: ['#a8481a', '#d9701f', '#f2b13c'], lane: '255,224,170', amb: 'leaf', kind: 'forest', shaft: '255,214,150' },
    // 6 Yildiz Ovasi (gece)
    { sky: ['#050a1e', '#1b2a5e', '#4a5fa8'], sun: [200, 215, 255], m1: '#1e2a55', m2: '#141d40', g: ['#1f3a3a', '#1a3232', '#12242a'],
      road: ['#6a6f86', '#4d5268', '#2a2e40'], tree: ['#0f2a3a', '#1c4a5c', '#6fc4d8'], leaf: ['#1c2f55', '#2a4378', '#4f73b8'], lane: '170,190,255', amb: 'fog', kind: 'forest', shaft: '170,190,255' }
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
  function E(c, x, y, rx, ry, col, dk, tk) {
    gshape(c, function (p, dx, dy) { p.moveTo(x + dx + rx, y + dy); p.ellipse(x + dx, y + dy, rx, ry, 0, 0, TAU); }, col, dk, Math.max(1.1, Math.min(rx, ry) * 0.3), tk ? [x, y, Math.min(rx, ry)] : 0);
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
  // bar: a weapon shaft or beam, drawn as an ink-edged stripe (w = pigment width)
  function bar(c, x1, y1, x2, y2, w, col) { line(c, x1, y1, x2, y2, w + 2.4, INK); line(c, x1, y1, x2, y2, w, col); }
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
  // ---- sprite bake plumbing: five scratch canvases reused by every sprite (only the finished sprite is a new canvas) ----
  var SCR = null, DIR8 = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
  function layer(w, h) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; return { cv: cv, g: cv.getContext('2d') }; }
  function scratch(w, h) {
    if (!SCR || SCR.w !== w || SCR.h !== h) SCR = { w: w, h: h, fig: layer(w, h), sil: layer(w, h), ring: layer(w, h), hal: layer(w, h), ov: layer(w, h) };
    return SCR;
  }
  function beginLayer(g, w, h, Sc) { // clean state, then sprite units: origin = ground point at (46, 74) of the 92 x 120 box
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); g.setLineDash([]);
    g.setTransform(Sc, 0, 0, Sc, 46 * Sc, 74 * Sc);
  }
  function maskTo(g, src, w, h, col) { // g gets src's alpha painted in col
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
  }
  function dilate(g, src, r) { // 8-offset dilation: src drawn once in place and at 8 points on a circle of radius r (whole device px keep the edge crisp)
    g.drawImage(src, 0, 0);
    for (var k = 0; k < 8; k++) g.drawImage(src, Math.round(DIR8[k][0] * r), Math.round(DIR8[k][1] * r));
  }
  // three ink ticks under the feet, where the shadow ellipses used to be: [y of the middle tick, spread] per class (sprite units)
  var TICKS = { def: [22, 11], cav: [42, 15], cata: [35, 17], golem: [28, 15], commander: [42, 15] };
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

  var R = Z.Render = {
    canvas: null, ctx: null, W: 720, H: 1280, ox: 0, scale: 1, dpr: 1, px: 1, bg: null,
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
      this.px = pw / stageW; this.sprites = {};
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
      this.warmQ = []; // sprite kareleri: kart destesi + dusman kademeleri, kare basina birkac tane
      var self = this, add = function (cls, team) { ['i', 'm', 'a'].forEach(function (st) { for (var q = 0; q < self.SN[st]; q++) self.warmQ.push([cls, team, st, q]); }); };
      battle.deck.forEach(function (id) { add(Z.UNITS[id].cls, 0); }); battle.tiers().forEach(function (id) { add(Z.UNITS[id].cls, 1); });
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
    buildBg: function () { this.buildBgBasic(); },
    buildBgBasic: function () {
      var c = document.createElement('canvas'); c.width = this.canvas.width; c.height = this.canvas.height;
      var g = c.getContext('2d'), W = this.W, H = this.H, ox = this.ox, i, j, k, T = THEMES[this.theme || 0], rnd = seeded(this.seed || 1);
      this.phase = ((this.seed || 1) % 7) * 0.9;
      g.setTransform(this.px, 0, 0, this.px, 0, 0);
      var top = this.eY - CASTLE_H, bot = this.pY + CASTLE_H;

      // 1) zemin + doku
      var gr = g.createLinearGradient(0, top, 0, H);
      gr.addColorStop(0, T.g[0]); gr.addColorStop(0.5, T.g[1]); gr.addColorStop(1, T.g[2]);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (i = 0; i < 700; i++) {
        var sx = rnd() * W, sy = top + rnd() * (H - top);
        g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)'; ell(g, sx, sy, 2 + rnd() * 5, 1 + rnd() * 2.5);
      }

      // 2) ufuk: gokyuzu, gunes, daglar
      var sky = g.createLinearGradient(0, 0, 0, top + 10);
      sky.addColorStop(0, T.sky[0]); sky.addColorStop(0.6, T.sky[1]); sky.addColorStop(1, T.sky[2]);
      g.fillStyle = sky; g.fillRect(0, 0, W, top + 10);
      var sg = g.createRadialGradient(W * 0.75, top - 6, 4, W * 0.75, top - 6, 120);
      sg.addColorStop(0, 'rgba(' + T.sun.join(',') + ',1)'); sg.addColorStop(0.3, 'rgba(' + T.sun.join(',') + ',.45)'); sg.addColorStop(1, 'rgba(' + T.sun.join(',') + ',0)');
      g.fillStyle = sg; g.fillRect(0, 0, W, top + 10);
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (i = 0; i < 36; i++) circ(g, hash(i + this.seed) * W, hash(i + 50) * (top - 20), hash(i + 9) * 1.2 + 0.4);
      var mount = function (col, base, amp, seed, step) {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, base + 40);
        for (var x = 0; x <= W + step; x += step) g.lineTo(x, base - amp * (0.35 + hash(x / step + seed) * 0.65));
        g.lineTo(W, base + 40); g.closePath(); g.fill();
      };
      mount(T.m1, top + 14, 74, 3 + this.seed, 78); mount(T.m2, top + 20, 42, 11 + this.seed, 52);
      if (this.theme === 2) {
        g.fillStyle = 'rgba(255,255,255,.8)';
        for (i = 0; i < Math.ceil(W / 78); i++) { var px2 = i * 78 + 39, hh = 74 * (0.35 + hash(i + 3 + this.seed) * 0.65); g.beginPath(); g.moveTo(px2 - 13, top + 14 - hh + 19); g.lineTo(px2, top + 14 - hh); g.lineTo(px2 + 13, top + 14 - hh + 19); g.fill(); }
      }

      if (T.kind === 'volcano') { // ufukta lav parlayan yanardaglar
        [[W * 0.2, 92], [W * 0.7, 118]].forEach(function (cn) {
          var bx = cn[0], hh = cn[1], gy = top + 14 - hh;
          var gl = g.createRadialGradient(bx, gy, 2, bx, gy, 70); gl.addColorStop(0, 'rgba(255,140,40,.95)'); gl.addColorStop(1, 'rgba(255,100,20,0)');
          g.fillStyle = gl; g.fillRect(bx - 80, gy - 70, 160, 150);
          g.fillStyle = '#26110f'; g.beginPath(); g.moveTo(bx - hh * 1.0, top + 18); g.lineTo(bx - 13, gy); g.lineTo(bx + 13, gy); g.lineTo(bx + hh * 1.0, top + 18); g.closePath(); g.fill();
          g.fillStyle = '#ff7a2a'; ell(g, bx, gy, 13, 4.4); g.strokeStyle = 'rgba(255,120,40,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - 4, gy + 3); g.lineTo(bx - 14, gy + 30); g.moveTo(bx + 5, gy + 3); g.lineTo(bx + 11, gy + 26); g.stroke();
        });
      }
      if (T.kind === 'swamp') { // soluk ay + sis seritleri
        var mg = g.createRadialGradient(W * 0.28, top - 34, 4, W * 0.28, top - 34, 90); mg.addColorStop(0, 'rgba(230,255,235,.5)'); mg.addColorStop(1, 'rgba(200,255,220,0)');
        g.fillStyle = mg; g.fillRect(0, 0, W, top + 10); g.fillStyle = '#e9fff0'; circ(g, W * 0.28, top - 34, 22); g.fillStyle = 'rgba(160,200,170,.35)'; circ(g, W * 0.28 + 6, top - 40, 6);
        var fgm = g.createLinearGradient(0, top - 30, 0, top + 40); fgm.addColorStop(0, 'rgba(190,230,205,0)'); fgm.addColorStop(0.7, 'rgba(190,230,205,.35)'); fgm.addColorStop(1, 'rgba(190,230,205,0)');
        g.fillStyle = fgm; g.fillRect(0, top - 30, W, 70);
      }

      // 3) orman zemini golgesi (yollar arasi)
      var strips = [[0, 54], [186, 294], [426, 534], [666, 720]];
      for (j = 0; j < strips.length; j++) {
        var a = ox + strips[j][0], b = ox + strips[j][1];
        var fg = g.createLinearGradient(a, 0, b, 0);
        fg.addColorStop(0, 'rgba(0,0,0,.20)'); fg.addColorStop(0.5, 'rgba(0,0,0,.34)'); fg.addColorStop(1, 'rgba(0,0,0,.20)');
        g.fillStyle = fg; g.fillRect(a, top + 30, b - a, bot - top - 60);
      }
      if (ox > 2) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, top + 30, ox, bot - top - 60); g.fillRect(ox + DW, top + 30, W - ox - DW, bot - top - 60); }

      // 4) goletler (bazi seferlerde)
      var ponds = [];
      if (rnd() < 0.65) ponds.push([ox + 240 + (rnd() - 0.5) * 20, top + 220 + rnd() * 260, 40, 26]);
      if (rnd() < 0.5) ponds.push([ox + 480 + (rnd() - 0.5) * 20, top + 380 + rnd() * 300, 38, 24]);
      for (i = 0; i < ponds.length; i++) {
        var pd = ponds[i], wg = g.createRadialGradient(pd[0] - 6, pd[1] - 5, 2, pd[0], pd[1], pd[2]);
        var wc = T.kind === 'volcano' ? ['#ffd36a', '#e8501a'] : T.kind === 'swamp' ? ['#6aa86a', '#2e5a3a'] : this.theme === 2 ? ['#d6efff', '#9ccbe8'] : this.theme === 1 ? ['#6fc3d8', '#2f8aa8'] : ['#5aa6d8', '#2a5f95'];
        wg.addColorStop(0, wc[0]); wg.addColorStop(1, wc[1]);
        g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, pd[0] + 3, pd[1] + 4, pd[2] + 4, pd[3] + 3);
        if (T.kind === 'volcano') { var lg2 = g.createRadialGradient(pd[0], pd[1], pd[2] * 0.4, pd[0], pd[1], pd[2] * 2.6); lg2.addColorStop(0, 'rgba(255,120,40,.4)'); lg2.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = lg2; ell(g, pd[0], pd[1], pd[2] * 2.6, pd[3] * 2.6); }
        g.fillStyle = this.theme === 2 ? '#ffffff' : T.kind === 'volcano' ? '#2a1a14' : T.kind === 'swamp' ? '#3a3020' : '#5b4a2c'; ell(g, pd[0], pd[1], pd[2] + 5, pd[3] + 4);
        g.fillStyle = wg; ell(g, pd[0], pd[1], pd[2], pd[3]);
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(pd[0] - 6, pd[1] - 4, pd[2] * 0.5, pd[3] * 0.4, -0.2, 3.4, 5.2); g.stroke();
        if (T.kind === 'swamp') { for (var lp = 0; lp < 4; lp++) { g.fillStyle = '#3f8a4f'; circ(g, pd[0] - pd[2] * 0.5 + lp * pd[2] * 0.32, pd[1] + (lp % 2 ? 6 : -5), 5); g.fillStyle = '#6fd18a'; circ(g, pd[0] - pd[2] * 0.5 + lp * pd[2] * 0.32 - 1, pd[1] + (lp % 2 ? 5 : -6), 2.4); } }
      }

      // 5) yollar: toprak/kum/kar, kenar, tekerlek izleri
      for (i = 0; i < 3; i++) {
        this.roadPath(g, i, 66);
        g.fillStyle = T.road[2]; g.fill();                              // koyu kenar (ceper)
        this.roadPath(g, i, 61);
        var lx = this.laneX(i), rg = g.createLinearGradient(lx - 64, 0, lx + 64, 0);
        rg.addColorStop(0, T.road[1]); rg.addColorStop(0.5, T.road[0]); rg.addColorStop(1, T.road[1]);
        g.fillStyle = rg; g.fill();
        for (k = 0; k < 2; k++) { // tekerlek izleri
          g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 4; g.beginPath();
          for (var yy = this.eY - 40; yy <= this.pY + 40; yy += 14) { var rx = this.roadX(i, yy) + (k ? 22 : -22); if (yy === this.eY - 40) g.moveTo(rx, yy); else g.lineTo(rx, yy); }
          g.stroke();
        }
        for (k = 0; k < 90; k++) { // cakil ve toprak lekeleri
          var py = this.eY + rnd() * (this.pY - this.eY), pxx = this.roadX(i, py) + (rnd() - 0.5) * 108;
          g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.18)'; ell(g, pxx, py, 1.5 + rnd() * 3, 1 + rnd() * 1.8);
        }
        if (T.kind === 'volcano') { // yolda parlayan lav catlaklari
          for (k = 0; k < 10; k++) {
            var cy2 = this.eY + 40 + rnd() * (this.pY - this.eY - 80), cx2 = this.roadX(i, cy2) + (rnd() - 0.5) * 90, pts2 = [[cx2, cy2]];
            for (var z = 0; z < 4; z++) pts2.push([pts2[z][0] + (rnd() - 0.5) * 22, pts2[z][1] + 6 + rnd() * 10]);
            g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,100,30,.28)'; g.lineWidth = 7; g.beginPath(); pts2.forEach(function (q, qi) { if (qi) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke();
            g.strokeStyle = 'rgba(255,205,100,.95)'; g.lineWidth = 1.8; g.beginPath(); pts2.forEach(function (q, qi) { if (qi) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke();
          }
        }
        if (T.kind === 'swamp') { // yolda su birikintileri
          for (k = 0; k < 8; k++) { var py3 = this.eY + 40 + rnd() * (this.pY - this.eY - 80), px3 = this.roadX(i, py3) + (rnd() - 0.5) * 80; g.fillStyle = 'rgba(30,60,50,.55)'; ell(g, px3, py3, 12 + rnd() * 12, 5 + rnd() * 4); g.fillStyle = 'rgba(160,230,200,.4)'; ell(g, px3 - 3, py3 - 1.5, 5, 1.8); }
        }
        for (yy = this.eY - 30; yy < this.pY + 30; yy += 22) { // yol kenarinda ot / kar / kuru ot
          for (k = -1; k <= 1; k += 2) {
            var ex = this.roadX(i, yy) + k * (62 + rnd() * 6), ey = yy + rnd() * 10;
            if (T.kind === 'volcano') { g.fillStyle = '#3a2c2c'; ell(g, ex, ey, 5 + rnd() * 4, 3 + rnd() * 2.4); g.fillStyle = '#5a4646'; ell(g, ex - 1, ey - 1, 3, 1.6); if (rnd() < 0.4) { g.strokeStyle = 'rgba(255,130,40,.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ex - 3, ey); g.lineTo(ex + 3, ey - 3); g.stroke(); } }
            else if (T.kind === 'swamp') { for (var rd = 0; rd < 3; rd++) { g.strokeStyle = '#5f7a3a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(ex + (rd - 1) * 3, ey); g.lineTo(ex + (rd - 1) * 4, ey - 12 - rnd() * 5); g.stroke(); if (rd === 1) { g.fillStyle = '#6b3d20'; ell(g, ex, ey - 14, 1.8, 4); } } }
            else if (this.theme === 2) { g.fillStyle = 'rgba(255,255,255,.9)'; ell(g, ex, ey, 6 + rnd() * 4, 3 + rnd() * 2); }
            else if (this.theme === 1) { g.strokeStyle = 'rgba(120,90,40,.7)'; g.lineWidth = 1.6; for (var bl = 0; bl < 3; bl++) { g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + (bl - 1) * 3, ey - 6 - rnd() * 3); g.stroke(); } }
            else { g.strokeStyle = 'rgba(40,100,40,.9)'; g.lineWidth = 1.8; for (var bl2 = 0; bl2 < 4; bl2++) { g.beginPath(); g.moveTo(ex + (bl2 - 1.5) * 2, ey); g.lineTo(ex + (bl2 - 1.5) * 3.6, ey - 7 - rnd() * 4); g.stroke(); } }
          }
        }
        // kale onlerinde duz plaza
        g.fillStyle = 'rgba(0,0,0,.10)'; ell(g, this.laneX(i), this.eY + 6, 82, 22); ell(g, this.laneX(i), this.pY - 6, 82, 22);
      }

      // 6) orman: golgeler once, sonra tepe tepe agaclar (kusbakisi)
      var trees = [];
      var addStrip = function (x0, x1, dens, sizeMul) {
        var wd = x1 - x0, n = Math.max(1, Math.round(wd / 44 * dens));
        for (var y = top + 40; y < bot - 30; y += 24) {
          for (var q = 0; q < n; q++) {
            if (rnd() < 0.18) continue;
            var r = (13 + rnd() * 12) * sizeMul;
            trees.push({ x: x0 + (q + 0.15 + rnd() * 0.7) * wd / n, y: y + rnd() * 20, r: r, t: rnd(), rot: rnd() * TAU });
          }
        }
      };
      for (j = 0; j < strips.length; j++) addStrip(ox + strips[j][0] - (j === 0 ? 0 : 6), ox + strips[j][1] + (j === 3 ? 0 : 6), 1, j === 0 || j === 3 ? 0.9 : 1);
      if (ox > 2) { addStrip(-10, ox + 6, 1.3, 1.05); addStrip(ox + DW - 6, W + 10, 1.3, 1.05); }
      trees.sort(function (p, q) { return p.y - q.y; });
      for (i = 0; i < trees.length; i++) { var tr = trees[i]; g.fillStyle = 'rgba(0,0,0,.28)'; ell(g, tr.x + tr.r * 0.28, tr.y + tr.r * 0.38, tr.r * 1.02, tr.r * 0.86); }
      for (i = 0; i < trees.length; i++) this.drawTree(g, trees[i], T, rnd);
      // alt bitki ortusu: calilar + cicekler yol kenarlarinda
      for (i = 0; i < 3; i++) for (yy = this.eY + 10; yy < this.pY - 10; yy += 30 + rnd() * 20) for (k = -1; k <= 1; k += 2) {
        if (rnd() < 0.4) continue;
        var bx = this.roadX(i, yy) + k * (70 + rnd() * 10), by = yy + rnd() * 12, br = 5 + rnd() * 6;
        if (T.kind === 'volcano') { g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, bx + 2, by + 3, br + 2, br); g.fillStyle = '#3b2f2f'; circ(g, bx, by, br); g.fillStyle = '#5d4a4a'; circ(g, bx - 2, by - 2, br * 0.55); if (rnd() < 0.5) { g.fillStyle = '#ff8a2a'; circ(g, bx + 2, by + 1, 1.8); } }
        else if (T.kind === 'swamp') { g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, bx + 2, by + 3, br + 1, br); g.fillStyle = '#1f4a3a'; circ(g, bx, by, br); g.fillStyle = '#2f7a5a'; circ(g, bx - 2, by - 2, br * 0.6); if (rnd() < 0.55) { g.fillStyle = ['#c58cff', '#6ff0d0', '#ffd36a'][Math.floor(rnd() * 3)]; circ(g, bx + 3, by - 1, 2.6); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, bx + 2.2, by - 1.8, 0.9); } }
        else if (this.theme === 1) { g.fillStyle = '#8a6a40'; ell(g, bx, by, br + 2, br); g.fillStyle = '#a98655'; ell(g, bx - 1, by - 2, br, br * 0.6); }
        else if (this.theme === 2) { g.fillStyle = '#cfe3f5'; ell(g, bx, by, br + 3, br); g.fillStyle = '#fff'; ell(g, bx - 1, by - 2, br + 1, br * 0.6); }
        else {
          g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, bx + 2, by + 3, br + 1, br); g.fillStyle = '#2f7a3f'; circ(g, bx, by, br); g.fillStyle = '#46a257'; circ(g, bx - 2, by - 2, br * 0.6);
          if (rnd() < 0.5) { g.fillStyle = ['#ffe066', '#ff8fa3', '#ffffff', '#b197fc'][Math.floor(rnd() * 4)]; circ(g, bx + 2, by - 1, 1.8); circ(g, bx - 3, by + 2, 1.5); }
        }
      }
      // tas kumeleri ve kutukler
      for (i = 0; i < 12; i++) {
        var rx2 = ox + strips[1 + Math.floor(rnd() * 2)][0] + 10 + rnd() * 80, ry2 = top + 120 + rnd() * (bot - top - 240);
        if (rnd() < 0.5) { g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, rx2 + 2, ry2 + 3, 10, 7); g.fillStyle = '#8b909c'; ell(g, rx2, ry2, 9, 6.5); g.fillStyle = '#b4b9c4'; ell(g, rx2 - 2, ry2 - 2, 5, 3.4); }
        else if (this.theme === 0) { g.save(); g.translate(rx2, ry2); g.rotate(rnd() * 3); g.fillStyle = '#5b3d22'; rrect(g, -16, -4, 32, 8, 4); g.fill(); g.fillStyle = '#d8b07a'; ell(g, 16, 0, 3, 4); g.restore(); }
      }

      // 7) isik: gun isigi huzmeleri + kenar karartmasi
      g.fillStyle = 'rgba(' + T.shaft + ',.05)';
      for (i = 0; i < 4; i++) { var sx0 = ox + 40 + i * 190 + rnd() * 30; g.beginPath(); g.moveTo(sx0, top); g.lineTo(sx0 + 70, top); g.lineTo(sx0 - 150, bot); g.lineTo(sx0 - 220, bot); g.closePath(); g.fill(); }
      var vg = g.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.48, H * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, (T.kind === 'volcano' || T.kind === 'swamp') ? 'rgba(0,0,0,.52)' : 'rgba(0,0,0,.38)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      // alt kisim (kartlarin arkasi) karart
      var dk = g.createLinearGradient(0, bot - 10, 0, H);
      dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(0.35, 'rgba(0,0,0,.55)'); dk.addColorStop(1, 'rgba(0,0,0,.7)');
      g.fillStyle = dk; g.fillRect(0, bot - 10, W, H - bot + 10);
      this.bg = c;
    },

    // kusbakisi agac: tema'ya gore cam / genis yaprakli / palmiye-kaktus / karli cam
    drawTree: function (g, t, T, rnd) {
      var x = t.x, y = t.y, r = t.r, i, a;
      if (T.kind === 'desert') {
        if (t.t < 0.32) { // palmiye
          g.fillStyle = '#6b4a2a'; circ(g, x, y, r * 0.22);
          for (i = 0; i < 9; i++) { a = t.rot + i * TAU / 9; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = i % 2 ? T.tree[0] : T.tree[1]; ell(g, r * 0.75, 0, r * 0.82, r * 0.25); g.fillStyle = 'rgba(255,255,255,.18)'; ell(g, r * 0.7, -r * 0.05, r * 0.6, r * 0.06); g.restore(); }
          g.fillStyle = '#5a3d20'; circ(g, x, y, r * 0.16);
        } else if (t.t < 0.62) { // kaktus (ustten)
          g.fillStyle = '#2f6a38'; circ(g, x, y, r * 0.5); g.fillStyle = '#3f8a4a'; circ(g, x - 2, y - 2, r * 0.34);
          g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; for (i = 0; i < 8; i++) { a = i * TAU / 8; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); g.lineTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); g.stroke(); }
        } else { // kaya
          g.fillStyle = '#8a6a40'; ell(g, x, y, r * 0.9, r * 0.66); g.fillStyle = '#b08a58'; ell(g, x - r * 0.2, y - r * 0.2, r * 0.55, r * 0.38);
        }
        return;
      }
      if (T.kind === 'volcano') {
        if (t.t < 0.42) { // yanmis agac
          g.strokeStyle = '#150e0e'; g.lineCap = 'round';
          for (i = 0; i < 7; i++) { a = t.rot + i * TAU / 7; var bl3 = r * (0.8 + 0.5 * hash(i + t.rot)); g.lineWidth = 3.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * bl3, y + Math.sin(a) * bl3); g.stroke();
            g.lineWidth = 1.8; g.beginPath(); g.moveTo(x + Math.cos(a) * bl3 * 0.6, y + Math.sin(a) * bl3 * 0.6); g.lineTo(x + Math.cos(a + 0.7) * bl3 * 0.95, y + Math.sin(a + 0.7) * bl3 * 0.95); g.stroke(); }
          g.fillStyle = '#2a1d1c'; circ(g, x, y, r * 0.28); g.fillStyle = 'rgba(255,120,40,.85)'; circ(g, x + r * 0.5, y - r * 0.2, 1.8); circ(g, x - r * 0.4, y + r * 0.3, 1.5);
        } else if (t.t < 0.82) { // bazalt kaya
          g.fillStyle = '#2b2223'; g.beginPath(); for (i = 0; i < 7; i++) { a = t.rot + i * TAU / 7; var rr2 = r * (0.7 + 0.3 * hash(i * 3 + t.rot)); g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); g.fill();
          g.fillStyle = '#4a3b3c'; g.beginPath(); g.moveTo(x - r * 0.4, y - r * 0.3); g.lineTo(x + r * 0.1, y - r * 0.6); g.lineTo(x + r * 0.3, y); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(255,120,40,.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - r * 0.1, y + r * 0.1); g.lineTo(x + r * 0.15, y + r * 0.4); g.stroke();
        } else { // lav bacasi
          var vgl = g.createRadialGradient(x, y, 1, x, y, r * 1.4); vgl.addColorStop(0, 'rgba(255,200,90,.95)'); vgl.addColorStop(0.4, 'rgba(255,100,30,.6)'); vgl.addColorStop(1, 'rgba(255,80,20,0)');
          g.fillStyle = vgl; circ(g, x, y, r * 1.4); g.fillStyle = '#2b2223'; circ(g, x, y, r * 0.5); g.fillStyle = '#ff7a2a'; circ(g, x, y, r * 0.3); g.fillStyle = '#ffe08a'; circ(g, x, y, r * 0.14);
        }
        return;
      }
      if (T.kind === 'swamp') {
        if (t.t < 0.46) { // salkim sogut: koyu tepe + sarkan dallar
          for (i = 0; i < 6; i++) { a = t.rot + i * TAU / 6; g.fillStyle = i % 2 ? T.tree[0] : T.tree[1]; circ(g, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.58); }
          g.fillStyle = T.tree[1]; circ(g, x, y, r * 0.6); g.strokeStyle = 'rgba(120,200,160,.55)'; g.lineWidth = 1.4;
          for (i = 0; i < 9; i++) { a = t.rot + i * TAU / 9; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); g.quadraticCurveTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2 + 4, x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.15 + 9); g.stroke(); }
          g.fillStyle = 'rgba(190,255,220,.18)'; circ(g, x - r * 0.25, y - r * 0.3, r * 0.3);
        } else if (t.t < 0.76) { // mangrov kokleri
          g.strokeStyle = '#3a2c1c'; g.lineWidth = 3; g.lineCap = 'round';
          for (i = 0; i < 8; i++) { a = t.rot + i * TAU / 8; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.5) * r * 0.7, y + Math.sin(a + 0.5) * r * 0.7, x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1); g.stroke(); }
          g.fillStyle = '#245a42'; circ(g, x, y, r * 0.62); g.fillStyle = '#378a64'; circ(g, x - 2, y - 2, r * 0.4);
        } else { // isildayan mantarlar
          for (i = 0; i < 4; i++) { a = t.rot + i * 1.6; var mx = x + Math.cos(a) * r * 0.45, my = y + Math.sin(a) * r * 0.45, mr = r * (0.28 + 0.1 * (i % 2));
            var mgl = g.createRadialGradient(mx, my, 1, mx, my, mr * 2.4); mgl.addColorStop(0, i % 2 ? 'rgba(197,140,255,.5)' : 'rgba(111,240,208,.5)'); mgl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = mgl; circ(g, mx, my, mr * 2.4);
            g.fillStyle = i % 2 ? '#a96cf0' : '#3fd9b4'; circ(g, mx, my, mr); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, mx - mr * 0.3, my - mr * 0.3, mr * 0.22); circ(g, mx + mr * 0.25, my + mr * 0.1, mr * 0.16); }
        }
        return;
      }
      if (t.t < 0.78) { // cam: katmanli yildiz
        var cols = T.tree, layers = [1, 0.74, 0.5, 0.28];
        for (i = 0; i < layers.length; i++) {
          g.fillStyle = i === 3 ? cols[2] : i === 2 ? cols[1] : cols[0]; if (T.kind === 'ice' && i === 3) g.fillStyle = '#ffffff';
          star(g, x - i * 0.8, y - i * 1.4, r * layers[i], r * layers[i] * 0.58, 9, t.rot + i * 0.2); g.fill();
        }
        if (T.kind === 'ice') { g.fillStyle = 'rgba(255,255,255,.75)'; star(g, x - 2, y - 3, r * 0.62, r * 0.34, 9, t.rot); g.fill(); }
        else { g.fillStyle = 'rgba(255,255,255,.14)'; circ(g, x - r * 0.25, y - r * 0.3, r * 0.22); }
      } else { // genis yaprakli (veya buzlu kristal)
        if (T.kind === 'ice') {
          g.fillStyle = '#cfe8fa'; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.6, y); g.lineTo(x, y + r * 0.8); g.lineTo(x - r * 0.6, y); g.closePath(); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.2, y - r * 0.1); g.lineTo(x - r * 0.3, y - r * 0.15); g.closePath(); g.fill();
          return;
        }
        var gcol = T.leaf || ['#2c6f3a', '#3b8c4b', '#56ad5f'];
        for (i = 0; i < 5; i++) { a = t.rot + i * TAU / 5; g.fillStyle = gcol[0]; circ(g, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.55); }
        for (i = 0; i < 4; i++) { a = t.rot + 0.6 + i * TAU / 4; g.fillStyle = gcol[1]; circ(g, x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32 - 1, r * 0.46); }
        g.fillStyle = gcol[2]; circ(g, x - r * 0.18, y - r * 0.22, r * 0.34);
        g.fillStyle = 'rgba(255,255,255,.22)'; circ(g, x - r * 0.28, y - r * 0.32, r * 0.14);
      }
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
            this.puff(this.roadX(e.unit.lane, this.Y(e.unit.x)), this.Y(e.unit.x), 7, '#d9c9a0');
            if (e.unit.team === 0) A.spawn(e.unit.cls);
            break;
          case 'hit':
            this.sparks(ex, ey - 6, e.strong ? 7 : 3, e.strong ? ORP : IVO);
            if (this.fx.length < 40) this.fx.push({ k: 'slash', x: ex + (Math.random() - 0.5) * 14, y: ey - 6, a: Math.random() * TAU, t: 0.18, max: 0.18, big: e.strong });
            if (this.texts.length < 26 && (e.strong || e.dmg > 40)) this.text(ex + 18, ey - 40, String(Math.round(e.dmg)), e.team === 1 ? (e.strong ? R.DMG.crit : R.DMG.dealt) : R.DMG.taken, e.strong ? 26 : 20);
            A.hit();
            break;
          case 'death':
            this.puff(ex, ey, e.boss ? 24 : 10, e.team === 0 ? AZUR : '#F0705A');
            if (this.fx.length < 60) this.fx.push({ k: 'decal', x: ex, y: ey, t: 4, max: 4, big: e.boss });
            A.death();
            if (e.boss) { this.shake = 14; A.boom(); }
            break;
          case 'coin': this.text(ex, ey - 46, '+' + e.v, ORP, 24); A.coin(); break;
          case 'shoot': A.shoot(); break;
          case 'tower':
            this.fx.push({ k: 'arrow', x1: ex, y1: e.team === 0 ? this.pY : this.eY, x2: ex, y2: ey, t: 0.18, max: 0.18 }); A.shoot(); break;
          case 'boom':
            this.fx.push({ k: 'ring', x: ex, y: ey, r: Math.max(36, e.r * this.s * 1.2), t: 0.4, max: 0.4, col: e.cls === 'mage' ? '#c084fc' : e.cls === 'golem' ? '#c9a66b' : '#ffa94d' });
            this.sparks(ex, ey, 12, e.cls === 'mage' ? '#d8b4fe' : '#ffb347');
            this.shake = Math.max(this.shake, e.cls === 'cata' ? 5 : 2); A.boom();
            break;
          case 'heal':
            if (this.parts.length < 380) for (var hq = 0; hq < 5; hq++) this.parts.push({ x: ex + (Math.random() - 0.5) * 26, y: ey - 8, vx: (Math.random() - 0.5) * 20, vy: -44 - Math.random() * 30, life: 0.8, max: 0.8, size: 3, col: VDG, g: -10, shrink: true });
            if (this.texts.length < 26) this.text(ex, ey - 40, '+' + Math.round(e.v), R.DMG.heal, 20);
            if (e.team === 0) A.heal();
            break;
          case 'freeze':
            this.sparks(ex, ey - 6, 9, '#bfe6ff'); this.fx.push({ k: 'ring', x: ex, y: ey, r: 44, t: 0.45, max: 0.45, col: '#9bd7ff' });
            break;
          case 'perk': A.perk(); break;
          case 'flame': { var fy = this.Y(e.to), fx2 = this.roadX(e.lane, fy); this.sparks(fx2, fy - 6, 10, '#ff9a3a'); this.sparks(fx2, fy - 6, 5, '#ffe08a'); this.fx.push({ k: 'ring', x: fx2, y: fy, r: 30, t: 0.25, max: 0.25, col: '#ff8a2a' }); A.fire(); break; }
          case 'burn': this.sparks(ex, ey - 10, 2, '#ff8a2a'); break;
          case 'charge': this.fx.push({ k: 'ring', x: ex, y: ey, r: 40, t: 0.3, max: 0.3, col: '#ffe08a' }); A.charge(); break;
          case 'baseHit':
            this.shake = Math.max(this.shake, e.team === 0 ? 8 : 3);
            this.puff(this.ox + 60 + Math.random() * 600, e.team === 0 ? this.pY + 20 : this.eY - 20, 5, '#cfc6b4');
            A.baseHit(); if (e.team === 0) A.vibrate(40);
            break;
          case 'skill':
            if (e.kind === 'roar') { this.fx.push({ k: 'wave', x: this.ox + 360, y: this.pY + 30, t: 0.9, max: 0.9, col: '#ffd166' }); this.banner = { text: $t('ZAFER NARAASI!'), col: '#ffd166', t: 1.4 }; }
            else if (e.kind === 'ward') { this.fx.push({ k: 'lane', lane: e.lane, t: 0.9, max: 0.9, col: '#6ee7b7' }); }
            else if (e.kind === 'bolt') { this.shake = Math.max(this.shake, 6); }
            else if (e.kind === 'dragon') { this.fx.push({ k: 'lane', lane: e.lane, t: 1.0, max: 1.0, col: '#ff8a3a' }); this.banner = { text: $t('EJDER NEFESİ!'), col: '#ffb347', t: 1.3 }; this.shake = Math.max(this.shake, 6); }
            else if (e.kind === 'freeze') { this.fx.push({ k: 'lane', lane: e.lane, t: 1.0, max: 1.0, col: '#9bd7ff' }); this.banner = { text: $t('DON FIRTINASI!'), col: '#9bd7ff', t: 1.2 }; }
            A.skill(e.kind); A.vibrate(25);
            break;
          case 'bolt': this.fx.push({ k: 'bolt', x: ex, y: ey, t: 0.4, max: 0.4, seed: Math.random() * 99 }); this.sparks(ex, ey, 9, '#a5d8ff'); break;
          case 'boss': this.banner = { text: $t('PATRON GELİYOR!'), col: '#ff6b6b', t: 1.8 }; this.shake = 10; A.boom(); break;
          case 'ambush': this.banner = { text: $t('PUSU!'), col: '#ffb347', t: 1.4 }; this.shake = 6; A.boom(); break;
          case 'breach': this.banner = { text: $t('SUR YARILDI! GEDİKTEN YÜKLEN!'), col: '#ffd166', t: 1.8 }; this.shake = 12; A.boom(); for (var bi = 0; bi < 4; bi++) this.puff(this.ox + 100 + Math.random() * 520, this.eY - 24, 7, '#cfc6b4'); break;
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
    text: function (x, y, str, col, size) { this.texts.push({ x: x + (Math.random() - 0.5) * 16, y: y, t: 0.9, max: 0.9, s: str, col: col, size: size || 20 }); },

    // ---- Cizim ------------------------------------------------------------
    frame: function (dt) {
      if (!this.active || !this.battle) return;
      this.time += dt;
      var b = this.battle, c = this.ctx, i, W = this.W, H = this.H;
      this.handle(b.drain());
      for (i = 0; i < 4 && this.warmQ && this.warmQ.length; i++) { var w = this.warmQ.shift(); this.getSprite(w[0], w[1], w[2], w[3]); }
      for (i = 0; i < b.projs.length; i++) { // tas atar dumani
        var pj = b.projs[i];
        if (pj.kind === 'rock' && Math.random() < 0.6 && this.parts.length < 380) this.parts.push({ x: this.roadX(pj.lane, this.Y(pj.x)), y: this.Y(pj.x), vx: (Math.random() - 0.5) * 10, vy: 6, life: 0.5, max: 0.5, size: 4, col: 'rgba(90,90,100,.55)', g: 0, shrink: true });
      }
      this.updateFx(dt);

      c.setTransform(this.px, 0, 0, this.px, 0, 0);
      c.drawImage(this.bg, 0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.14)'; // bulutlar (ufuk)
      for (i = 0; i < 4; i++) { var cx = ((i * 260 + this.time * (6 + i * 2)) % (W + 300)) - 150, cy = 30 + i * 18; ell(c, cx, cy, 64, 12); ell(c, cx + 36, cy - 7, 40, 10); }
      c.save();
      var sx = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
      c.translate(sx, sy);

      // secili / surukle yol vurgusu
      for (i = 0; i < 3; i++) {
        var on = (this.dragLane === i), sel = (this.selLane === i && this.dragLane < 0);
        if (on || sel) {
          this.roadPath(c, i, 74);
          c.fillStyle = on ? 'rgba(255,255,255,.26)' : 'rgba(255,240,170,.13)'; c.fill();
          if (on) { c.fillStyle = '#fff'; c.font = 'bold 26px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(('▼ ' + $t('BURAYA BIRAK') + ' ▼'), this.laneX(i), this.eY + 110); c.fillText(('▼ ' + $t('BURAYA BIRAK') + ' ▼'), this.laneX(i), this.eY + 110); }
        }
      }
      this.drawCastle(c, 1); this.drawCastle(c, 0);
      for (i = 0; i < this.fx.length; i++) if (this.fx[i].k === 'decal') this.drawDecal(c, this.fx[i]);

      this.spreadLanes(b, dt);
      var self = this, order = b.units.slice().sort(function (a, d) { return self.Y(a.x) - self.Y(d.x); });
      for (i = 0; i < order.length; i++) this.drawUnit(c, order[i]);
      for (i = 0; i < b.projs.length; i++) this.drawProj(c, b.projs[i]);
      this.drawFx(c);
      for (i = 0; i < this.parts.length; i++) {
        var p = this.parts[i], a = Math.max(0, p.life / p.max);
        c.globalAlpha = a; c.fillStyle = p.col; circ(c, p.x, p.y, p.shrink ? p.size * (0.4 + a * 0.6) : p.size);
      }
      c.globalAlpha = 1;
      this.drawTexts(c);
      c.restore();

      // atmosfer: yaprak / kum tozu / kar
      var amode = THEMES[this.theme].amb;
      for (i = 0; i < this.amb.length; i++) {
        var am = this.amb[i];
        if (amode === 'snow') { c.fillStyle = 'rgba(255,255,255,.85)'; am.y += am.v * dt; am.x += Math.sin(this.time + am.ph) * 14 * dt - 6 * dt; circ(c, am.x, am.y, am.r); }
        else if (amode === 'dust') { c.fillStyle = 'rgba(240,200,130,.35)'; am.x += (am.v * 4) * dt; am.y += Math.sin(this.time * 0.7 + am.ph) * 6 * dt; c.fillRect(am.x, am.y, 14 + am.r * 8, 1.6); }
        else if (amode === 'ember') { // yukari ucan koz parcaciklari
          am.y -= am.v * 0.9 * dt; am.x += Math.sin(this.time * 2 + am.ph) * 12 * dt;
          c.fillStyle = 'rgba(255,' + Math.floor(110 + am.c * 110) + ',40,' + (0.45 + 0.4 * Math.sin(this.time * 8 + am.ph)) + ')'; circ(c, am.x, am.y, 1 + am.r * 0.55);
          if (am.y < -6) { am.y = H + 6; am.x = Math.random() * W; }
        }
        else if (amode === 'fog') {
          if (i < 12) { c.fillStyle = 'rgba(200,255,225,.05)'; am.x += am.v * 0.3 * dt; circ(c, am.x, am.y, 70 + am.r * 28); }
          else { // atesbocekleri
            am.x += Math.sin(this.time * 0.8 + am.ph) * 16 * dt; am.y += Math.cos(this.time * 0.6 + am.ph) * 10 * dt;
            var fl = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 2 + am.ph)); c.fillStyle = 'rgba(220,255,140,' + (fl * 0.22) + ')'; circ(c, am.x, am.y, 7); c.fillStyle = 'rgba(240,255,170,' + fl + ')'; circ(c, am.x, am.y, 1.8);
          }
        }
        else { // dusen yapraklar
          am.y += (am.v * 0.5) * dt; am.x += Math.sin(this.time * 0.9 + am.ph) * 18 * dt + 8 * dt;
          c.save(); c.translate(am.x, am.y); c.rotate(this.time * 1.2 + am.ph); c.fillStyle = am.c < 0.5 ? 'rgba(120,190,90,.85)' : 'rgba(224,150,60,.85)'; ell(c, 0, 0, 5 + am.r, 2.4); c.restore();
        }
        if (am.y > H) { am.y = -6; am.x = Math.random() * W; }
        if (am.x > W + 40) { am.x = -40; am.y = Math.random() * H; } else if (am.x < -40) am.x = W + 4;
      }
      if (b.buffed()) { // kukreme: altin kenar parlamasi
        var pulse = 0.2 + 0.08 * Math.sin(this.time * 8);
        var vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62);
        vg.addColorStop(0, 'rgba(255,210,80,0)'); vg.addColorStop(1, 'rgba(255,200,60,' + pulse + ')');
        c.fillStyle = vg; c.fillRect(0, 0, W, H);
      }
      if (this.banner) this.drawBannerCard(c, W / 2, this.eY + 142, this.banner);
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

    drawDecal: function (c, f) {
      var a = Math.min(1, f.t / 1.5) * 0.3, r = f.big ? 22 : 11;
      c.globalAlpha = a; c.fillStyle = '#1a1208'; ell(c, f.x, f.y + 3, r, r * 0.6); c.fillStyle = '#3a2c18'; ell(c, f.x + 4, f.y + 1, r * 0.4, r * 0.25);
      c.globalAlpha = 1;
    },

    drawFx: function (c) {
      for (var i = 0; i < this.fx.length; i++) {
        var f = this.fx[i], k = 1 - f.t / f.max;
        if (f.k === 'ring') {
          c.globalAlpha = 1 - k; c.strokeStyle = f.col; c.lineWidth = 4; c.beginPath(); c.arc(f.x, f.y, f.r * (0.4 + k * 0.8), 0, TAU); c.stroke();
          c.fillStyle = f.col; c.globalAlpha = (1 - k) * 0.25; c.fill();
        } else if (f.k === 'wave') {
          c.globalAlpha = (1 - k) * 0.8; c.strokeStyle = f.col; c.lineWidth = 10 * (1 - k) + 2; c.beginPath(); c.arc(f.x, f.y, 40 + k * 1100, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        } else if (f.k === 'lane') {
          c.globalAlpha = (1 - k) * 0.4; this.roadPath(c, f.lane, 76); c.fillStyle = f.col; c.fill();
        } else if (f.k === 'bolt') {
          c.globalAlpha = Math.min(1, f.t / 0.2); c.strokeStyle = '#d0ebff'; c.lineWidth = 6; c.lineJoin = 'round';
          c.beginPath(); var x = f.x, y = f.y - 520;
          c.moveTo(x, y); var n = 9, step = (f.y - y) / n;
          for (var j = 1; j <= n; j++) { x = f.x + (j === n ? 0 : (hash(f.seed + j + Math.floor(this.time * 30)) - 0.5) * 46); y += step; c.lineTo(x, y); }
          c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2.4; c.stroke();
          c.fillStyle = 'rgba(180,220,255,.5)'; circ(c, f.x, f.y, 26 * (1 - k * 0.5));
        } else if (f.k === 'arrow') {
          c.globalAlpha = 1; var ay = f.y1 + (f.y2 - f.y1) * k;
          bar(c, f.x1, ay - 10, f.x1, ay + 4, 1.8, IVO);
        } else if (f.k === 'slash') { // kilic darbesi yayi
          c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = f.big ? '#ffe08a' : '#ffffff'; c.lineWidth = f.big ? 4 : 2.6; c.lineCap = 'round';
          c.beginPath(); c.arc(f.x, f.y, (f.big ? 20 : 14) * (0.6 + k * 0.5), f.a, f.a + 1.9); c.stroke();
        }
      }
      c.globalAlpha = 1;
    },

    drawProj: function (c, p) {
      var y = this.Y(p.x), x = this.roadX(p.lane, y) + (p.team === 0 ? 10 : -10), d = p.team === 0 ? -1 : 1; // d: ekrandaki hareket yonu
      var tot = Math.max(1, Math.abs(p.tx - p.fromX)), prog = Math.min(1, Math.abs(p.x - p.fromX) / tot), h = Math.sin(prog * Math.PI);
      this.projShape(c, p.kind, x, y, d, h, 1, 0);
    },
    // flat projectile art shared with the field renderer: kind, ground point (x, y), d = travel direction (+-1 along y), h = arc height 0..1, k = scale
    // trail: dir (radians) for the field renderer (arrows and bolts point along it), 0 in the lane view
    projShape: function (c, kind, x, y, d, h, k, dir) {
      if (kind === 'arrow') {
        c.globalAlpha = 0.28; c.fillStyle = INK; ell(c, x + 5, y + 5, 2, 7); c.globalAlpha = 1;
        c.globalAlpha = 0.5; line(c, x, y - d * 26, x, y - d * 8, 1.6, IVO); c.globalAlpha = 1;             // motion streak: a flat hairline, no gradient
        bar(c, x, y - d * 11, x, y + d * 3, 1.8, IVO); circ(c, x, y + d * 5, 3.5); c.fillStyle = INK; c.fill(); circ(c, x, y + d * 5, 2.2); c.fillStyle = ARG; c.fill();
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

    // ---- Kale: buyuk, tuğlalı sur + silindirik kuleler + kapilar ---------
    drawCastle: function (c, team) {
      var b = this.battle.base[team], pal = PAL[team], ox = this.ox, h = CASTLE_H, pct = b.hp / b.max, t = this.time;
      var y0 = team === 0 ? this.pY : this.eY - h;
      c.save();
      // yerel cizim: orijin sur ustu; saha tarafi +y. Oyuncu kalesi aynalanir.
      if (team === 0) { c.translate(0, y0 + h); c.scale(1, -1); } else { c.translate(0, y0); }
      // sahaya dusen golge
      var sh = c.createLinearGradient(0, h, 0, h + 30); sh.addColorStop(0, 'rgba(0,0,0,.38)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sh; c.fillRect(ox + 4, h, DW - 8, 30);
      if (team === 0) { this.campBody(c, b, pal, ox, h, pct, t); } else {
      if (this.battle.rl('moat')) this.moatBody(c, ox, h, t);
      // sur govdesi
      var tgr = c.createLinearGradient(0, 0, 0, 36); tgr.addColorStop(0, '#c7c9d6'); tgr.addColorStop(1, '#a9abbb');
      c.fillStyle = tgr; c.fillRect(ox + 4, 0, DW - 8, 36);                      // ust yuzey (yuruyus yolu)
      var fgr = c.createLinearGradient(0, 36, 0, h); fgr.addColorStop(0, '#8d8fa1'); fgr.addColorStop(1, '#5f6174');
      c.fillStyle = fgr; c.fillRect(ox + 4, 36, DW - 8, h - 36);                 // on yuz
      c.strokeStyle = 'rgba(30,32,48,.35)'; c.lineWidth = 1.4;
      for (var r = 0; r < 4; r++) {                                              // tugla dokusu
        var ry = 36 + r * 13; c.beginPath(); c.moveTo(ox + 4, ry); c.lineTo(ox + DW - 4, ry); c.stroke();
        for (var bx = ox + 4 + (r % 2) * 14; bx < ox + DW - 4; bx += 28) { c.beginPath(); c.moveTo(bx, ry); c.lineTo(bx, ry + 13); c.stroke(); }
      }
      c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(ox + 4, 36, DW - 8, 3);   // kenar isigi
      c.fillStyle = '#3a3c4e'; c.fillRect(ox + 4, h - 5, DW - 8, 5);              // taban
      // siperlikler
      var broken = pct < 0.3 ? [3, 9, 14] : pct < 0.6 ? [6] : [];
      for (var m = 0, mx = ox + 8; mx < ox + DW - 20; m++, mx += 30) {
        if (broken.indexOf(m) >= 0) { c.fillStyle = '#7a7c8e'; c.fillRect(mx, 28, 18, 5); continue; }
        c.fillStyle = '#9d9fb0'; c.fillRect(mx, 22, 18, 14); c.fillStyle = '#cfd1dd'; c.fillRect(mx, 22, 18, 5); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(mx + 15, 22, 3, 14);
      }
      // kapilar
      for (var l = 0; l < 3; l++) {
        var gx = this.laneX(l), gw = 76, gt = h - 56;
        c.fillStyle = '#4a4c60'; rrect(c, gx - gw / 2 - 7, gt - 7, gw + 14, 63, 18); c.fill();                       // tas cerceve
        c.fillStyle = '#7d7f93'; rrect(c, gx - gw / 2 - 4, gt - 4, gw + 8, 60, 16); c.fill();
        var dg = c.createLinearGradient(0, gt, 0, h); dg.addColorStop(0, '#0e0a08'); dg.addColorStop(1, '#2a1c12');
        c.fillStyle = dg; rrect(c, gx - gw / 2, gt, gw, 56, 14); c.fill();                                           // karanlik ic
        c.fillStyle = '#5a3a1e';                                                                                      // yari acik kapi kanatlari
        c.beginPath(); c.moveTo(gx - gw / 2, gt + 12); c.lineTo(gx - gw / 2 + 16, gt + 16); c.lineTo(gx - gw / 2 + 16, h); c.lineTo(gx - gw / 2, h); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(gx + gw / 2, gt + 12); c.lineTo(gx + gw / 2 - 16, gt + 16); c.lineTo(gx + gw / 2 - 16, h); c.lineTo(gx + gw / 2, h); c.closePath(); c.fill();
        c.strokeStyle = '#2a2a34'; c.lineWidth = 2; c.beginPath(); c.moveTo(gx - gw / 2 + 8, gt + 12); c.lineTo(gx - gw / 2 + 8, h); c.moveTo(gx + gw / 2 - 8, gt + 12); c.lineTo(gx + gw / 2 - 8, h); c.stroke();
        c.strokeStyle = '#8a8a98'; c.lineWidth = 2.2; for (var pk = -2; pk <= 2; pk++) { c.beginPath(); c.moveTo(gx + pk * 9, gt + 4); c.lineTo(gx + pk * 9, gt + 20); c.stroke(); } // kafes disleri
        c.fillStyle = '#ffd24d'; c.beginPath(); c.moveTo(gx - 6, gt - 4); c.lineTo(gx + 6, gt - 4); c.lineTo(gx, gt + 5); c.closePath(); c.fill();       // kilit tasi
        // takim kalkani
        c.fillStyle = pal.dark; circ(c, gx, gt - 20, 11.5); c.fillStyle = pal.main; circ(c, gx, gt - 20, 9.5); c.fillStyle = pal.trim; circ(c, gx, gt - 20, 3.6);
        c.strokeStyle = pal.trim; c.lineWidth = 2; c.beginPath(); c.arc(gx, gt - 20, 11.5, 0, TAU); c.stroke();
        // mesaleler
        for (var tk = -1; tk <= 1; tk += 2) {
          var tx0 = gx + tk * (gw / 2 + 20), ty0 = gt + 6, fl = 0.8 + 0.2 * Math.sin(t * 11 + l * 2 + tk);
          c.fillStyle = '#4a3320'; c.fillRect(tx0 - 2, ty0, 4, 14);
          var fg = c.createRadialGradient(tx0, ty0 - 4, 1, tx0, ty0 - 4, 22 * fl); fg.addColorStop(0, 'rgba(255,200,90,.85)'); fg.addColorStop(1, 'rgba(255,140,40,0)');
          c.fillStyle = fg; c.fillRect(tx0 - 24, ty0 - 28, 48, 48);
          c.fillStyle = '#ff8a2a'; ell(c, tx0, ty0 - 4, 3.6, 6 * fl); c.fillStyle = '#ffe08a'; ell(c, tx0, ty0 - 3, 1.8, 3.6 * fl);
        }
        if (team === 0 && this.selLane === l) { // secili kapi: altin parlama
          var pulse = 0.5 + 0.5 * Math.sin(t * 6);
          c.strokeStyle = 'rgba(255,210,77,' + (0.55 + 0.35 * pulse) + ')'; c.lineWidth = 5; rrect(c, gx - gw / 2 - 9, gt - 9, gw + 18, 67, 20); c.stroke();
        }
      }
      // asilan sancaklar
      var sw = Math.sin(t * 2.4) * 3;
      [ox + 180, ox + 540].forEach(function (fx) {
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(fx - 12, 40, 28, 40);
        c.fillStyle = pal.main; c.beginPath(); c.moveTo(fx - 13, 38); c.lineTo(fx + 13, 38); c.lineTo(fx + 13 + sw * 0.4, 70); c.lineTo(fx + sw, 78); c.lineTo(fx - 13 + sw * 0.4, 70); c.closePath(); c.fill();
        c.strokeStyle = pal.trim; c.lineWidth = 2; c.stroke();
        c.fillStyle = pal.trim; circ(c, fx, 54, 5.5); c.fillStyle = pal.dark; circ(c, fx, 54, 2.4);
      });
      // kuleler: silindir govde + konik cati
      var towers = [ox + 44, ox + 240, ox + 480, ox + DW - 44];
      for (var ti = 0; ti < towers.length; ti++) {
        var tx = towers[ti], bw = 30;
        c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, tx + 6, h + 4, 42, 10);
        var bg2 = c.createLinearGradient(tx - bw, 0, tx + bw, 0); bg2.addColorStop(0, '#6c6e80'); bg2.addColorStop(0.4, '#b4b6c6'); bg2.addColorStop(1, '#5b5d70');
        c.fillStyle = bg2; rrect(c, tx - bw, 30, bw * 2, h - 26, 12); c.fill();
        c.strokeStyle = 'rgba(30,32,48,.35)'; c.lineWidth = 1.4; for (var rr = 0; rr < 4; rr++) { c.beginPath(); c.moveTo(tx - bw + 3, 44 + rr * 11); c.lineTo(tx + bw - 3, 44 + rr * 11); c.stroke(); }
        c.fillStyle = '#12131c'; rrect(c, tx - 3.5, 52, 7, 17, 3); c.fill();                                // ok yuvasi
        c.fillStyle = pal.trim; c.fillRect(tx - bw, 30, bw * 2, 4); c.fillStyle = pal.dark; c.fillRect(tx - bw, 34, bw * 2, 5);   // takim kusagi
        // konik cati (ustten): dilimler
        var cx = tx, cy = 24, cr = 34;
        c.fillStyle = 'rgba(0,0,0,.28)'; circ(c, cx + 4, cy + 6, cr);
        c.fillStyle = pal.dark; circ(c, cx, cy, cr);
        for (var sgm = 0; sgm < 12; sgm++) {
          var a0 = sgm * TAU / 12 + 0.2, a1 = a0 + TAU / 12;
          c.fillStyle = sgm % 2 ? pal.main : pal.cloth; c.beginPath(); c.moveTo(cx - 3, cy - 4); c.arc(cx, cy, cr - 2, a0, a1); c.closePath(); c.fill();
          if (sgm === 8 || sgm === 9 || sgm === 10) { c.fillStyle = 'rgba(255,255,255,.2)'; c.fill(); }
        }
        c.strokeStyle = pal.trim; c.lineWidth = 2.4; c.beginPath(); c.arc(cx, cy, cr - 1, 0, TAU); c.stroke();
        c.fillStyle = '#ffd24d'; circ(c, cx - 3, cy - 4, 5); c.fillStyle = '#fff3b0'; circ(c, cx - 4.4, cy - 5.4, 1.8);
        // sancak (sadece uc kuleler)
        if (ti === 0 || ti === 3) {
          line(c, cx - 3, cy - 4, cx - 3, cy - 44, 3, '#5b4a3a');
          c.fillStyle = pal.main; c.beginPath(); c.moveTo(cx - 3, cy - 44); c.lineTo(cx + 28 + sw, cy - 37); c.lineTo(cx + 20 + sw * 0.6, cy - 30); c.lineTo(cx + 28 + sw, cy - 22); c.lineTo(cx - 3, cy - 24); c.closePath(); c.fill();
          c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke(); c.fillStyle = pal.trim; circ(c, cx + 10, cy - 33, 4);
        }
        if (pct < 0.3) { // yanan kuleler
          for (var fl2 = 0; fl2 < 3; fl2++) { var ff = 0.7 + 0.3 * Math.sin(t * 9 + fl2 * 2 + ti); c.fillStyle = 'rgba(255,' + (110 + fl2 * 40) + ',30,.85)'; ell(c, cx - 10 + fl2 * 10, cy - 6 - fl2 * 2, 6 * ff, 11 * ff); }
        }
      }
      }
      // hasar: catlaklar
      if (team === 1 && pct < 0.6) { c.strokeStyle = 'rgba(20,20,30,.7)'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(ox + 130, 38); c.lineTo(ox + 142, 54); c.lineTo(ox + 132, 66); c.lineTo(ox + 146, 80); c.moveTo(ox + 520, 40); c.lineTo(ox + 508, 58); c.lineTo(ox + 518, 72); c.stroke(); }
      if (b.flash > 0) { c.globalAlpha = Math.min(0.8, b.flash * 4); c.fillStyle = '#fff'; c.fillRect(ox + 4, 0, DW - 8, h); c.globalAlpha = 1; }
      c.restore();
      if (pct < 0.3 && Math.random() < 0.3 && this.parts.length < 380) this.parts.push({ x: this.ox + 40 + Math.random() * 640, y: y0 + h * 0.4, vx: (Math.random() - 0.5) * 12, vy: team === 0 ? -34 : 34, life: 1, max: 1, size: 8, col: 'rgba(70,70,80,.65)', g: 0, shrink: false });

      // can cubugu (saha tarafinda dusman, altta oyuncu)
      var by = team === 0 ? y0 + h + 8 : y0 + h + 6, bw2 = 420, bx = ox + (DW - bw2) / 2;
      c.save();
      if (b.max < 1e8) {
        c.fillStyle = 'rgba(0,0,0,.65)'; rrect(c, bx - 4, by - 4, bw2 + 8, 26, 13); c.fill();
        c.strokeStyle = pct > 0.5 ? '#2c7a4b' : pct > 0.25 ? '#9a7410' : '#8a1a1a'; c.lineWidth = 2; c.stroke();
        var hg = c.createLinearGradient(0, by, 0, by + 18);
        if (pct > 0.5) { hg.addColorStop(0, '#7df2a8'); hg.addColorStop(1, '#27b869'); } else if (pct > 0.25) { hg.addColorStop(0, '#ffd966'); hg.addColorStop(1, '#e09a12'); } else { hg.addColorStop(0, '#ff8a8a'); hg.addColorStop(1, '#d62f2f'); }
        c.fillStyle = hg; rrect(c, bx, by, Math.max(0, bw2 * pct), 18, 9); c.fill();
        c.fillStyle = 'rgba(255,255,255,.28)'; rrect(c, bx + 3, by + 2, Math.max(0, bw2 * pct - 6), 5, 3); c.fill();
        c.font = '800 14px system-ui'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)';
        var tl = Math.max(0, Math.ceil(b.hp)) + ' / ' + Math.ceil(b.max); c.strokeText(tl, ox + DW / 2, by + 14); c.fillStyle = '#fff'; c.fillText(tl, ox + DW / 2, by + 14);
      } else {
        c.fillStyle = 'rgba(0,0,0,.65)'; rrect(c, ox + DW / 2 - 100, by - 4, 200, 26, 13); c.fill();
        c.font = '800 14px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText($t('Abluka: kale yıkılamaz'), ox + DW / 2, by + 14);
      }
      c.restore();
    },


    // ---- Hendek: kalenin onunde su seridi + kopruler (kural: moat) --------
    moatBody: function (c, ox, h, t) {
      var wy = h + 2, wh = 34;
      var wg = c.createLinearGradient(0, wy, 0, wy + wh); wg.addColorStop(0, '#2f6f8f'); wg.addColorStop(1, '#4b9bb8');
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(ox + 4, wy - 3, DW - 8, wh + 6);
      c.fillStyle = wg; c.fillRect(ox + 4, wy, DW - 8, wh);
      c.strokeStyle = 'rgba(220,245,255,.45)'; c.lineWidth = 1.6;
      for (var r = 0; r < 3; r++) { c.beginPath(); for (var x = ox + 8; x < ox + DW - 8; x += 18) { var yy = wy + 8 + r * 10 + Math.sin(t * 2 + x * 0.05 + r) * 2; if (x === ox + 8) c.moveTo(x, yy); else c.quadraticCurveTo(x - 9, yy - 3, x, yy); } c.stroke(); }
      for (var l = 0; l < 3; l++) { // her kapida tahta kopru
        var bx = this.laneX(l);
        c.fillStyle = '#6b4a2a'; c.fillRect(bx - 34, wy - 4, 68, wh + 8);
        c.strokeStyle = '#3a2814'; c.lineWidth = 1.4; for (var pl = 0; pl < 6; pl++) { c.beginPath(); c.moveTo(bx - 34, wy + pl * 7); c.lineTo(bx + 34, wy + pl * 7); c.stroke(); }
      }
    },

    // ---- Kamp: tahta cit, yurtlar, ates, nobet kuleleri, tug (oyuncu tarafi) ----
    tugBanner: function (c, x, y, len, pal, sw) { // at kuyruklu sancak: dikme + ay + sarkan kuyruk
      line(c, x, y, x, y + len, 3, '#5b4a3a');
      c.strokeStyle = '#e0b04a'; c.lineWidth = 2.4; c.beginPath(); c.arc(x, y + len, 6, Math.PI * 0.15, Math.PI * 0.85, true); c.stroke();
      c.fillStyle = '#e0b04a'; circ(c, x, y + len + 8, 2.6);
      var cols = [pal.main, '#f3ead8', pal.main];
      for (var k = 0; k < 3; k++) { c.fillStyle = cols[k]; c.beginPath(); c.moveTo(x - 1.5, y + len - 4); c.quadraticCurveTo(x + (k - 1) * 8 + sw, y + len - 14, x + (k - 1) * 11 + sw * 1.4, y + len - 30 - k % 2 * 3); c.quadraticCurveTo(x + (k - 1) * 4 + sw * 0.5, y + len - 14, x + 1.5, y + len - 4); c.closePath(); c.fill(); }
    },
    campBody: function (c, b, pal, ox, h, pct, t) {
      var i, sw = Math.sin(t * 2.2) * 2.5, self = this;
      // zemin: ezilmis toprak, otlak izleri
      var gg = c.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, 'rgba(70,52,34,.0)'); gg.addColorStop(0.3, 'rgba(84,62,38,.7)'); gg.addColorStop(1, 'rgba(104,78,48,.55)');
      c.fillStyle = gg; c.fillRect(ox + 2, 0, DW - 4, h);
      c.fillStyle = 'rgba(40,28,16,.2)';
      for (i = 0; i < 26; i++) ell(c, ox + 14 + hash(i * 3.1) * (DW - 28), 8 + hash(i * 7.7) * (h - 40), 8 + hash(i) * 8, 3 + hash(i + 9) * 3);
      for (var gl = 0; gl < 3; gl++) { c.fillStyle = 'rgba(176,142,92,.55)'; c.fillRect(this.laneX(gl) - 28, 18, 56, h - 20); } // kapilara giden patikalar
      // yurtlar (kusbakisi: kece catili cadirlar)
      var yurt = function (cx, cy, r) {
        c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, cx + 3, cy - r * 0.45, r * 1.05, r * 0.55);
        c.fillStyle = '#d9ccb0'; circ(c, cx, cy, r);
        for (var sg = 0; sg < 14; sg++) { var a0 = sg * TAU / 14, a1 = a0 + TAU / 14; c.fillStyle = sg % 2 ? '#efe6d0' : '#e2d5b8'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r - 2, a0, a1); c.closePath(); c.fill(); }
        c.strokeStyle = pal.main; c.lineWidth = r * 0.16; c.beginPath(); c.arc(cx, cy, r * 0.74, 0, TAU); c.stroke();
        c.strokeStyle = 'rgba(60,44,28,.55)'; c.lineWidth = 1.4; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
        c.fillStyle = '#4a3a2a'; circ(c, cx, cy, r * 0.2); c.fillStyle = '#241a12'; circ(c, cx, cy, r * 0.11);
        if (pct < 0.3) for (var f = 0; f < 2; f++) { var ff = 0.7 + 0.3 * Math.sin(t * 9 + f * 2 + cx); c.fillStyle = 'rgba(255,' + (120 + f * 50) + ',30,.85)'; ell(c, cx - 5 + f * 9, cy + 8 + f * 3, 5 * ff, 10 * ff); }
      };
      [[ox + 205, 28, 21], [ox + 268, 22, 14], [ox + 452, 22, 14], [ox + 515, 28, 21], [ox + 110, 14, 11], [ox + 610, 14, 11]].forEach(function (y) { yurt(y[0], y[1], y[2]); });
      // sandik/erzak yiginlari + arabasi
      c.fillStyle = '#7a5530'; c.fillRect(ox + 150, 6, 18, 12); c.fillStyle = '#946a3c'; c.fillRect(ox + 154, 16, 18, 12); c.strokeStyle = 'rgba(30,20,10,.6)'; c.lineWidth = 1.2; c.strokeRect(ox + 150, 6, 18, 12); c.strokeRect(ox + 154, 16, 18, 12);
      c.fillStyle = '#6a4a28'; c.fillRect(ox + 556, 12, 32, 14); c.strokeRect(ox + 556, 12, 32, 14); c.fillStyle = '#2a1c10'; circ(c, ox + 562, 10, 5); circ(c, ox + 582, 10, 5);
      // ates cukurlari
      [[ox + 238, 8], [ox + 484, 8], [ox + 360, 6]].forEach(function (fp, fi) {
        var fx = fp[0], fy = fp[1], fl = 0.8 + 0.2 * Math.sin(t * 10 + fi * 2);
        c.fillStyle = 'rgba(0,0,0,.28)'; ell(c, fx, fy - 2, 13, 5);
        c.fillStyle = '#7a7a84'; for (var st = 0; st < 7; st++) circ(c, fx + Math.cos(st * 0.9) * 10, fy + Math.sin(st * 0.9) * 4, 2.6);
        line(c, fx - 8, fy - 1, fx + 8, fy + 2, 3, '#5b3a1e'); line(c, fx - 8, fy + 2, fx + 8, fy - 1, 3, '#4a2e16');
        var fg = c.createRadialGradient(fx, fy + 6, 1, fx, fy + 6, 26 * fl); fg.addColorStop(0, 'rgba(255,200,90,.7)'); fg.addColorStop(1, 'rgba(255,140,40,0)');
        c.fillStyle = fg; c.fillRect(fx - 28, fy - 22, 56, 56);
        c.fillStyle = '#ff8a2a'; ell(c, fx, fy + 6, 4.4, 8 * fl); c.fillStyle = '#ffe08a'; ell(c, fx, fy + 5, 2.2, 4.4 * fl);
      });
      // tahta cit: sivri kazıklar, kapilarda bosluk
      var gates = [this.laneX(0), this.laneX(1), this.laneX(2)];
      var inGate = function (x) { for (var g = 0; g < 3; g++) if (Math.abs(x - gates[g]) < 50) return true; return false; };
      var dmgK = pct < 0.3 ? 0.34 : pct < 0.6 ? 0.14 : 0;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(ox + 4, h - 38, DW - 8, 5);
      for (var kx = ox + 8, ki = 0; kx < ox + DW - 8; kx += 15, ki++) {
        if (inGate(kx + 6)) continue;
        var broken = hash(ki * 5.3) < dmgK, top = broken ? h - 14 - hash(ki) * 8 : h - 2;
        c.fillStyle = ki % 2 ? '#8a5a2b' : '#76491f'; c.fillRect(kx, h - 36, 12, top - (h - 36) - 7);
        c.beginPath(); c.moveTo(kx, top - 7); c.lineTo(kx + 6, top + (broken ? 0 : 2)); c.lineTo(kx + 12, top - 7); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(kx + 1, h - 36, 3, top - (h - 36) - 8);
        c.strokeStyle = 'rgba(30,18,8,.55)'; c.lineWidth = 1; c.strokeRect(kx, h - 36, 12, top - (h - 36) - 7);
      }
      c.strokeStyle = '#3a2814'; c.lineWidth = 3;
      var segs = [[ox + 6, gates[0] - 50], [gates[0] + 50, gates[1] - 50], [gates[1] + 50, gates[2] - 50], [gates[2] + 50, ox + DW - 6]];
      for (var rw = 0; rw < 2; rw++) { var ry = h - 28 + rw * 13; c.beginPath(); for (var sg2 = 0; sg2 < segs.length; sg2++) { c.moveTo(segs[sg2][0], ry); c.lineTo(segs[sg2][1], ry); } c.stroke(); }
      // kapi diregi: iki kalin direk + sancak
      for (var l = 0; l < 3; l++) {
        var gx = gates[l];
        [-46, 46].forEach(function (dx) { c.fillStyle = '#5a3a1e'; c.fillRect(gx + dx - 6, h - 46, 12, 46); c.fillStyle = '#7a5230'; c.fillRect(gx + dx - 6, h - 46, 4, 46); c.fillStyle = '#e0b04a'; circ(c, gx + dx, h - 48, 6); });
        line(c, gx - 46, h - 40, gx + 46, h - 40, 4, '#4a3018');
        c.fillStyle = pal.main; c.beginPath(); c.moveTo(gx - 24, h - 40); c.lineTo(gx - 10, h - 40); c.lineTo(gx - 17, h - 54 + sw * 0.4); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(gx + 10, h - 40); c.lineTo(gx + 24, h - 40); c.lineTo(gx + 17, h - 54 + sw * 0.4); c.closePath(); c.fill();
        if (this.selLane === l) { var pulse = 0.5 + 0.5 * Math.sin(t * 6); c.strokeStyle = 'rgba(255,210,77,' + (0.55 + 0.35 * pulse) + ')'; c.lineWidth = 5; rrect(c, gx - 58, h - 56, 116, 62, 14); c.stroke(); }
      }
      // nobet kuleleri (ahsap, kare cati) + tug
      [ox + 38, ox + DW - 38].forEach(function (tx, ti) {
        c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, tx + 4, h - 52, 34, 11);
        c.fillStyle = '#6a4a28'; c.fillRect(tx - 24, h - 50, 48, 46); c.strokeStyle = '#2e1e0e'; c.lineWidth = 1.5; c.strokeRect(tx - 24, h - 50, 48, 46);
        for (var pl = 1; pl < 4; pl++) { c.beginPath(); c.moveTo(tx - 24 + pl * 12, h - 50); c.lineTo(tx - 24 + pl * 12, h - 4); c.stroke(); }
        c.fillStyle = '#12131c'; c.fillRect(tx - 5, h - 30, 10, 14);
        c.fillStyle = pal.dark; c.beginPath(); c.moveTo(tx - 32, h - 4); c.lineTo(tx + 32, h - 4); c.lineTo(tx + 20, h + 20); c.lineTo(tx - 20, h + 20); c.closePath(); c.fill();
        c.fillStyle = pal.main; c.beginPath(); c.moveTo(tx - 32, h - 4); c.lineTo(tx - 20, h + 20); c.lineTo(tx, h - 4); c.closePath(); c.fill(); c.beginPath(); c.moveTo(tx + 32, h - 4); c.lineTo(tx + 20, h + 20); c.lineTo(tx, h - 4); c.closePath(); c.fill();
        c.strokeStyle = pal.trim; c.lineWidth = 2; c.beginPath(); c.moveTo(tx - 32, h - 4); c.lineTo(tx + 32, h - 4); c.lineTo(tx + 20, h + 20); c.lineTo(tx - 20, h + 20); c.closePath(); c.stroke();
        self.tugBanner(c, tx, h + 20, 24, pal, sw * (ti ? -1 : 1));
        if (pct < 0.3) for (var f2 = 0; f2 < 3; f2++) { var f3 = 0.7 + 0.3 * Math.sin(t * 9 + f2 * 2 + ti); c.fillStyle = 'rgba(255,' + (110 + f2 * 40) + ',30,.85)'; ell(c, tx - 10 + f2 * 10, h + 4 + f2 * 3, 6 * f3, 11 * f3); }
      });
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
          var tg = SL[s] * 24; u._ox = u._ox === undefined ? tg : u._ox + (tg - u._ox) * k;
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
    getSprite: function (cls, team, st, idx) {
      var cache = this.sprites || (this.sprites = {}), key = cls + team + st + idx;
      return cache[key] || (cache[key] = this.renderSprite(cls, team, st, idx));
    },
    // makeSprite: shared entry for every figure (also the field commander). fn(g, pal, walk, atk, lunge, age, t) draws the flat figure on g
    // (sprite units, origin = ground point, forward = -y); g.ov is a second layer without contour for hairlines (bowstring, heal pulse).
    makeSprite: function (cls, team, st, idx, fn) {
      var Sc = this.px * SPR, w = Math.ceil(92 * Sc), h = Math.ceil(120 * Sc), S = scratch(w, h), g = S.fig.g, go = S.ov.g;
      var pal = PAL[team], walk = 0, atk = 0, lunge = 0, ph = 0, age = 0, t = 0;
      beginLayer(g, w, h, Sc); beginLayer(go, w, h, Sc); g.ov = go;
      if (st === 'm') { ph = idx / this.SN.m * TAU; walk = Math.sin(ph); t = ph; age = ph / 7; }
      else if (st === 'i') { t = idx / this.SN.i * TAU; }
      else { atk = [0.85, 0.6, 0.35, 0.12][idx]; lunge = Math.sin((1 - atk) * Math.PI); }
      outline(g); outline(go);
      g.rotate(walk * 0.05); go.rotate(walk * 0.05);
      fn.call(this, g, pal, walk, atk, lunge, age, t);
      return this.bakeSprite(S, w, h, Sc, cls);
    },
    bakeSprite: function (S, w, h, Sc, cls) {
      var out = document.createElement('canvas'), x, sg = S.sil.g, rg = S.ring.g, hg = S.hal.g;
      out.width = w; out.height = h; x = out.getContext('2d');
      maskTo(sg, S.fig.cv, w, h, INK);                                         // the figure as a flat ink silhouette
      rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'source-over'; rg.clearRect(0, 0, w, h);
      dilate(rg, S.sil.cv, INKW * Sc);                                          // 2.6u opaque contour: 8 offsets around the silhouette
      if (!this.icoMode) {
        hg.setTransform(1, 0, 0, 1, 0, 0); hg.globalCompositeOperation = 'source-over'; hg.clearRect(0, 0, w, h);
        dilate(hg, S.ring.cv, HALOW * Sc);                                       // 2u beyond the contour
        hg.globalCompositeOperation = 'source-in'; hg.fillStyle = VEL; hg.fillRect(0, 0, w, h); hg.globalCompositeOperation = 'source-over';
        x.globalAlpha = 0.45; x.drawImage(S.hal.cv, 0, 0); x.globalAlpha = 1;    // vellum halo, alpha <= .45 (stays under the alpha > 150 portrait crop)
        groundTicks(x, Sc, cls);
      }
      x.drawImage(S.ring.cv, 0, 0); x.drawImage(S.fig.cv, 0, 0); x.drawImage(S.ov.cv, 0, 0);
      return out;
    },
    renderSprite: function (cls, team, st, idx) {
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
      });
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

    drawUnit: function (c, u) {
      var y = this.Y(u.x), x = this.roadX(u.lane, y) + (u._ox || 0), dirY = u.team === 0 ? 1 : -1, s = (u.boss ? 1.55 : 1) * SPR;
      if (u.age < 0.3) { var q = u.age / 0.3; s *= 0.5 + 0.5 * (1 - Math.pow(1 - q, 3)); }
      var atk = u.atkAnim > 0 ? u.atkAnim / 0.25 : 0, st, idx;
      if (atk > 0) { st = 'a'; idx = Math.min(this.SN.a - 1, Math.floor((1 - atk) * this.SN.a)); }
      else if (u.moving) { st = 'm'; idx = Math.floor(((u.age * u.speed * 0.0191) % 1) * this.SN.m); }
      else { st = 'i'; idx = Math.floor(((this.time * 0.55 + u.id * 0.137) % 1) * this.SN.i); }
      var img = this.getSprite(u.cls, u.team, st, idx), k = s / SPR;

      if (u.aura) this.auraRing(c, x, y, 100, 160 * this.s, 0); // banner aura: a dashed ink-and-or ring on the ground
      c.save();
      c.translate(x, y); if (dirY < 0) c.scale(1, -1);
      if (u.boss) { c.fillStyle = VERM; c.globalAlpha = 0.16 + 0.05 * Math.sin(this.time * 6); circ(c, 0, 0, 46); c.globalAlpha = 0.22 + 0.05 * Math.sin(this.time * 6); circ(c, 0, 0, 30); c.globalAlpha = 1; } // two flat discs
      c.drawImage(img, -46 * s, -74 * s, 92 * s, 120 * s);
      c.scale(s, s);
      this.unitFx(c, u);
      c.restore();

      var ext = { spear: 54, archer: 30, cav: 58, knight: 36, mage: 38, cata: 42, healer: 34, banner: 58, assassin: 30, golem: 42, flamer: 38 }[u.cls] || 40;
      var rear = { cav: 36, cata: 30, banner: 20 }[u.cls] || 20;
      var top = y - (u.team === 0 ? ext : rear) * s - 9;
      if (u.boss) this.crown(c, x, top - 16, 1.15);
      if (u.hp < u.max) this.hpBar(c, x, top, 38 * Math.min(k, 1.4), Math.max(0, u.hp / u.max), u.team, 4.5);
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
    // the announcement in this.banner = { text, col, t } as a banderole centred at (cx, cy), fading in over 0.4 s
    drawBannerCard: function (c, cx, cy, bn) {
      var st = bannerStyle(bn.col), size = 44, w, h = 82, tw;
      c.save(); c.globalAlpha = Math.min(1, bn.t / 0.4);
      c.font = bandFont(bn.text, size); tw = c.measureText(bn.text).width; w = Math.min(this.W - 56, Math.max(300, tw + 150));
      st.size = size; banderole(c, cx, cy, w, h, bn.text, st);
      c.restore();
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
      var o = c.ov || c, pull = atk > 0 ? (1 - atk) * 10 : 3, ax = 19 * Math.cos(Math.PI * 1.12), ay = -4 + 19 * Math.sin(Math.PI * 1.12), bx = 19 * Math.cos(Math.PI * 1.88);
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
      o.strokeStyle = INK; o.lineWidth = 1.2; o.lineCap = 'round'; o.beginPath(); o.moveTo(ax, ay); o.lineTo(0, -4 + pull * 0.5 - 1); o.lineTo(bx, ay); o.stroke();   // bowstring: a hairline over the contour
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
      var gl = atk > 0 ? 1 + 0.5 * atk : 1, o = c.ov || c;
      this.feet(c, walk, VEL2);
      E(c, 0, 2, 12, 10.5, IVO, VEL2);                                                                              // robe
      RR(c, -4.9, -4, 9.8, 19, 3, pal.main, pal.dark); device(c, 'auto', 0, 4.4, 4.2, pal, team);                   // team scapular
      this.hand(c, -11, -2); this.hand(c, 13, -6);
      bar(c, 14, 12, 14, -28, 3, BIS);
      poly(c, [[14, -45 - (gl - 1) * 4], [19.8, -36], [14, -27 + (gl - 1) * 3], [8.2, -36]], VDG, MAL, 1);          // gem
      if (atk > 0) { o.strokeStyle = VDG; o.globalAlpha = atk; o.lineWidth = 2.4; o.beginPath(); o.arc(0, -2, 20 + (1 - atk) * 12, 0, TAU); o.stroke(); o.globalAlpha = 1; }
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
      RR(c, -7.5, 3, 15, 19, 5.5, BIS, INK2); c.save(); rrect(c, -7.5, 3, 15, 19, 5.5); c.clip(); c.fillStyle = LEAF; c.fillRect(-8, 9, 16, 3.2); c.fillStyle = INK; c.fillRect(-8, 9, 16, 0.9); c.fillRect(-8, 11.5, 16, 0.9); c.restore();   // fire-pot on the back
      c.strokeStyle = INK; c.lineWidth = 5.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(14, 4, 10, -8); c.stroke(); c.strokeStyle = INK2; c.lineWidth = 3; c.stroke(); outline(c);   // hose
      this.feet(c, walk, BIS);
      E(c, 0, 2, 10.2, 8.8, pal.main, pal.dark); belt(c, 0, 2, 10.2, 8.8, 5, 2.4, pal.trim); device(c, 'auto', 0, -1.2, 4, pal, team);
      O(c, -10, -3, 4.3, INK2); O(c, 10, -8, 4.3, INK2);
      bar(c, 10, -6, 10, -26, 4.4, '#4A5368'); RR(c, 6.6, -34, 6.8, 9, 2.4, INK2);                                    // nozzle
      if (atk > 0) { Lf = 12 + (1 - atk) * 26; poly(c, [[10, -34], [1, -34 - Lf * 0.78], [10, -34 - Lf], [19, -34 - Lf * 0.78]], VERM); poly(c, [[10, -34], [5.4, -34 - Lf * 0.5], [10, -34 - Lf * 0.78], [14.6, -34 - Lf * 0.5]], ORP); }
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
  R.TOK = { ink: INK, ink2: INK2, ivo: IVO, vel: VEL, vel2: VEL2, orp: ORP, leaf: LEAF, verm: VERM, mad: MAD, mal: MAL, vdg: VDG, pur: PUR, bole: BOLE, bis: BIS, arg: ARG, flesh: FLESH, lapis: LAPIS, lapisd: LAPISD, azur: AZUR, night: NIGHT };
  R.bannerStyle = bannerStyle;
  R.util = { ell: ell, circ: circ, rrect: rrect, line: line, seeded: seeded, hash: hash, star: star, E: E, O: O, RR: RR, poly: poly, outline: outline, mgrad: mgrad, TAU: TAU,
    fe: fe, gshape: gshape, tick: tick, bar: bar, belt: belt, device: device, shield: shield, banderole: banderole };
})(globalThis.Z = globalThis.Z || {});
