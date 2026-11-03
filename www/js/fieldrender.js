// Seferhan - ACIK ALAN cizimi: serbest 2D sahne (nehir/gecit, orman, tepe, kaya, bayrak), komutanlar, yerlestirme onizlemesi.
// render.js uzerine eklenir: savas 'field' turundeyse start/frame/resize bu dosyadaki surumlere yonlenir.
(function (Z) {
  'use strict';
  var R = Z.Render, U = R.util, TAU = U.TAU, ell = U.ell, circ = U.circ, rrect = U.rrect, line = U.line, seeded = U.seeded, hash = U.hash;
  var E = U.E, O = U.O, RR = U.RR, poly = U.poly, outline = U.outline, mgrad = U.mgrad;
  var PAL = R.PAL, THEMES = R.THEMES, SPR = R.SPR, OUT = R.OUT, FW = Z.FW, FH = Z.FH;
  var base = { start: R.start, stop: R.stop, frame: R.frame, resize: R.resize, renderSprite: R.renderSprite };
  var USC = 0.92; // birlik cizim olcegi (acik alanda daha cok birlik var)

  R.field = false; R.fs = 1; R.fox = 0; R.foy = 150; R.fhover = null;

  // Savas alani: ust arayuz ~150px, alt arayuz ~262px; dunya 720x840 tam sigar (sahne en az 1280 yuksek)
  R.fieldLayout = function () {
    var top = 150, bot = this.H - 262;
    this.fs = 1; this.fox = this.ox; this.foy = Math.max(top, top + (bot - top - FH) / 2);
  };
  R.toWorld = function (sx, sy) { return { x: (sx - this.fox) / this.fs, y: (sy - this.foy) / this.fs }; };
  R.w2s = function (x, y) { return { x: this.fox + x * this.fs, y: this.foy + y * this.fs }; };

  R.resize = function (w, h, s) {
    base.resize.call(this, w, h, s);
    this.fieldLayout();
    if (this.field && this.battle) this.fieldBuildBg();
  };
  R.stop = function () { this.field = false; this.fhover = null; base.stop.call(this); };
  R.start = function (b) {
    if (b.kind !== 'field') { this.field = false; return base.start.call(this, b); }
    this.field = true; this.battle = b; this.parts = []; this.texts = []; this.fx = []; this.shake = 0; this.active = true; this.fhover = null;
    this.theme = b.theme || 0; this.seed = b.level * 13 + 7; this.fieldLayout(); this.fieldBuildBg();
    this.warmQ = [];
    var self = this, add = function (cls, team) { ['i', 'm', 'a'].forEach(function (st) { for (var q = 0; q < self.SN[st]; q++) self.warmQ.push([cls, team, st, q]); }); };
    add('commander', 0); add('commander', 1);
    b.deck.forEach(function (id) { add(Z.UNITS[id].cls, 0); }); b.info.tiers.forEach(function (id) { add(Z.UNITS[id].cls, 1); });
    var T = THEMES[this.theme], n = T.amb === 'snow' ? 90 : T.amb === 'dust' ? 40 : T.amb === 'ember' ? 46 : T.amb === 'fog' ? 34 : 26;
    this.amb = [];
    for (var i = 0; i < n; i++) this.amb.push({ x: Math.random() * this.W, y: Math.random() * this.H, v: 20 + Math.random() * 50, r: 1 + Math.random() * 2.2, ph: Math.random() * 6, c: Math.random() });
    var oi = Z.FIELD_OBJECTIVES[b.objective];
    this.banner = { text: 'AÇIK ALAN · ' + oi.name.toUpperCase(), col: '#ffd166', t: 2.4 };
  };

  // ---- sabit arka plan ---------------------------------------------------
  function waterCols(kind) {
    return kind === 'volcano' ? ['#8a2a0c', '#e0561a', '#ffb347', '#3a1208'] : kind === 'ice' ? ['#6fa8d6', '#a9d4f2', '#e8f6ff', '#4b7fa8']
      : kind === 'swamp' ? ['#1f3f35', '#2f6350', '#5fa88a', '#142a22'] : kind === 'desert' ? ['#2f7fa6', '#52a9c9', '#bfe8f2', '#1f5f7e'] : ['#245f94', '#3f8ac4', '#a9dcf5', '#17436b'];
  }
  R.fieldBuildBg = function () {
    var b = this.battle, T = THEMES[this.theme || 0], map = b.map, W = this.W, H = this.H, rnd = seeded(this.seed || 1), i, j, k;
    var cv = document.createElement('canvas'); cv.width = this.canvas.width; cv.height = this.canvas.height;
    var g = cv.getContext('2d'); g.setTransform(this.px, 0, 0, this.px, 0, 0);
    // zemin
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, T.g[1]); gr.addColorStop(0.5, T.g[0]); gr.addColorStop(1, T.g[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (i = 0; i < 1100; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.07)'; ell(g, rnd() * W, rnd() * H, 3 + rnd() * 7, 1.5 + rnd() * 3); }
    var tuft = T.kind === 'ice' ? 'rgba(255,255,255,.35)' : T.kind === 'volcano' ? 'rgba(255,120,50,.16)' : T.kind === 'desert' ? 'rgba(120,90,40,.28)' : 'rgba(150,210,110,.28)';
    g.strokeStyle = tuft; g.lineWidth = 1.3; g.lineCap = 'round';
    for (i = 0; i < 420; i++) { var tx = rnd() * W, ty = rnd() * H; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - 1.5, ty - 4 - rnd() * 3); g.moveTo(tx + 2, ty); g.lineTo(tx + 3, ty - 3 - rnd() * 3); g.stroke(); }
    var fx = this.fox, fy = this.foy;
    g.save(); g.translate(fx, fy);

    // toprak yol: iki ordugahi birbirine baglar (nehir varsa en yakin gecitten)
    var s1 = (rnd() - 0.5) * 140, s2 = (rnd() - 0.5) * 160, mx = 360 + s1, my = FH * 0.5;
    var pts = [[360, FH + 10], [360 - s1 * 0.5, FH * 0.78], [mx, my], [360 + s2 * 0.5, FH * 0.22], [360, -10]];
    if (map.river) {
      var gp = map.river.gaps, gc = gp.map(function (q) { return (q.x0 + q.x1) / 2; }), best = Math.abs(gc[0] - 360) < Math.abs(gc[1] - 360) ? gc[0] : gc[1];
      pts[2] = [best, map.river.y];
    }
    function road(w, col) {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var q = 1; q < pts.length; q++) { var m = [(pts[q - 1][0] + pts[q][0]) / 2, (pts[q - 1][1] + pts[q][1]) / 2]; g.quadraticCurveTo(pts[q - 1][0], pts[q - 1][1], m[0], m[1]); }
      g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); g.stroke();
    }
    road(74, 'rgba(0,0,0,.16)'); road(62, T.road[2]); road(54, T.road[1]); road(40, T.road[0]);
    g.fillStyle = 'rgba(255,255,255,.1)'; for (i = 0; i < 90; i++) { var rp = rnd(); var qx = pts[0][0] + (pts[2][0] - pts[0][0]) * rp + (rnd() - 0.5) * 36; g.fillRect(qx, FH * (1 - rp * 0.5) - rnd() * 8, 2 + rnd() * 3, 1.5); }

    // nehir + gecitler
    if (map.river) {
      var rv = map.river, W4 = waterCols(T.kind), y0 = rv.y - rv.hw, y1 = rv.y + rv.hw, segs = [[-30, rv.gaps[0].x0], [rv.gaps[0].x1, rv.gaps[1].x0], [rv.gaps[1].x1, FW + 30]];
      var wob = function (x, ph) { return Math.sin(x * 0.045 + ph) * 3.2 + Math.sin(x * 0.11 + ph * 2) * 1.6; };
      segs.forEach(function (sg) {
        if (sg[1] - sg[0] < 4) return;
        g.beginPath(); var x;
        for (x = sg[0]; x <= sg[1]; x += 8) g.lineTo(x, y0 - 7 + wob(x, 0));
        for (x = sg[1]; x >= sg[0]; x -= 8) g.lineTo(x, y1 + 7 + wob(x, 2));
        g.closePath(); g.fillStyle = W4[3]; g.fill();                       // sig kiyi (koyu cerceve)
        g.beginPath();
        for (x = sg[0]; x <= sg[1]; x += 8) g.lineTo(x, y0 + wob(x, 0.5));
        for (x = sg[1]; x >= sg[0]; x -= 8) g.lineTo(x, y1 + wob(x, 2.4));
        g.closePath();
        var wg = g.createLinearGradient(0, y0, 0, y1); wg.addColorStop(0, W4[1]); wg.addColorStop(0.5, W4[0]); wg.addColorStop(1, W4[1]); g.fillStyle = wg; g.fill();
      });
      // gecitler: tas dolgulu sig gecit
      rv.gaps.forEach(function (gp2) {
        var w = gp2.x1 - gp2.x0, sand = g.createLinearGradient(0, y0 - 8, 0, y1 + 8); sand.addColorStop(0, T.road[1]); sand.addColorStop(0.5, T.road[0]); sand.addColorStop(1, T.road[1]);
        g.fillStyle = sand; rrect(g, gp2.x0, y0 - 9, w, y1 - y0 + 18, 9); g.fill();
        g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, gp2.x0 + 2, rv.y, 6, rv.hw + 5); ell(g, gp2.x1 - 2, rv.y, 6, rv.hw + 5);
        for (var q = 0; q < 16; q++) { g.fillStyle = q % 2 ? '#9a9486' : '#bdb7a8'; var sx2 = gp2.x0 + 8 + rnd() * (w - 16), sy2 = y0 + 2 + rnd() * (y1 - y0 - 4); ell(g, sx2, sy2, 4 + rnd() * 5, 3 + rnd() * 3); g.fillStyle = 'rgba(255,255,255,.28)'; ell(g, sx2 - 1, sy2 - 1, 2, 1.4); }
        g.fillStyle = 'rgba(255,255,255,.35)'; for (q = 0; q < 6; q++) ell(g, gp2.x0 - 4 + (q % 2) * (w + 8), y0 + 6 + q * 6, 6, 2);
      });
    }

    // tepeler: katmanli yukselti
    map.hills.forEach(function (h) {
      g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, h.x + 6, h.y + h.r * 0.5, h.r * 1.02, h.r * 0.55);
      for (k = 0; k < 4; k++) {
        var f = 1 - k * 0.24, hg = g.createRadialGradient(h.x - h.r * 0.25, h.y - h.r * 0.45 - k * 4, 2, h.x, h.y - k * 5, h.r * f);
        hg.addColorStop(0, 'rgba(255,255,255,.28)'); hg.addColorStop(1, 'rgba(0,0,0,.16)');
        g.fillStyle = k % 2 ? T.g[0] : T.g[1]; ell(g, h.x, h.y - k * 5, h.r * f, h.r * f * 0.82);
        g.fillStyle = hg; ell(g, h.x, h.y - k * 5, h.r * f, h.r * f * 0.82);
        g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(h.x, h.y - k * 5, h.r * f, h.r * f * 0.82, 0, 0, TAU); g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,.18)'; g.font = '900 15px system-ui'; g.textAlign = 'center'; g.fillText('▲', h.x, h.y - 10);
    });

    // ormanlar: yogun agac kumesi
    map.forests.forEach(function (f) {
      g.fillStyle = 'rgba(0,0,0,.25)'; circ(g, f.x + 4, f.y + 6, f.r * 1.02);
      var n = Math.round(f.r * f.r / 230), trees = [];
      for (j = 0; j < n; j++) { var a = rnd() * TAU, d = Math.sqrt(rnd()) * (f.r - 12); trees.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d, r: 15 + rnd() * 10, t: rnd(), rot: rnd() * TAU }); }
      trees.sort(function (p, q) { return p.y - q.y; });
      trees.forEach(function (t) { g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, t.x + 3, t.y + 5, t.r * 0.9, t.r * 0.55); R.drawTree(g, t, T, rnd); });
    });

    // kayalar
    var rockCols = T.kind === 'volcano' ? ['#1e1819', '#3d3031', '#5b4748'] : T.kind === 'ice' ? ['#7d97b3', '#a9c1d9', '#e6f1fb'] : T.kind === 'desert' ? ['#7d6238', '#a98a58', '#d6b985'] : ['#5c6068', '#8a8f99', '#c1c6d0'];
    map.rocks.forEach(function (rk) {
      g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, rk.x + 4, rk.y + rk.r * 0.6, rk.r * 1.1, rk.r * 0.6);
      for (k = 0; k < 3; k++) {
        g.fillStyle = rockCols[k]; g.beginPath();
        for (j = 0; j < 8; j++) { var aa = j * TAU / 8 + k * 0.2, rr = rk.r * (1 - k * 0.2) * (0.82 + 0.3 * hash(j * 5 + rk.x + k)); g.lineTo(rk.x - k * 2 + Math.cos(aa) * rr, rk.y - k * 3 + Math.sin(aa) * rr * 0.86); }
        g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(rk.x - rk.r * 0.2, rk.y - rk.r * 0.3); g.lineTo(rk.x + rk.r * 0.1, rk.y + rk.r * 0.2); g.stroke();
    });

    // ordugah isaretleri: alt (oyuncu, mavi) ve ust (dusman, kirmizi) sancak diregi + kazik cit
    [[0, FH - 20, PAL[0]], [1, 20, PAL[1]]].forEach(function (cd) {
      var team = cd[0], y = cd[1], p = cd[2];
      for (i = 0; i < 15; i++) {
        var px = 30 + i * 47, sy = y + (team === 0 ? 8 : -8);
        g.fillStyle = 'rgba(0,0,0,.28)'; ell(g, px + 2, sy + 3, 6, 3);
        g.strokeStyle = '#4a3320'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, sy + 2); g.lineTo(px, sy - 12); g.stroke();
        g.strokeStyle = '#8a6a44'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(px - 0.6, sy + 1); g.lineTo(px - 0.6, sy - 12); g.stroke();
      }
      [60, FW - 60].forEach(function (px) {
        var sy = y + (team === 0 ? -4 : 4);
        line(g, px, sy + 8, px, sy - 40, 4, '#5a3d20'); g.fillStyle = p.main; g.strokeStyle = OUT; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(px, sy - 40); g.lineTo(px + 28, sy - 34); g.lineTo(px + 22, sy - 26); g.lineTo(px + 28, sy - 18); g.lineTo(px, sy - 16); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = p.trim; circ(g, px, sy - 42, 3);
      });
    });
    g.restore();

    // oyun alani disi: arayuz altinda kalan kenarlari karart
    var vt = g.createLinearGradient(0, fy - 40, 0, fy + 26); vt.addColorStop(0, 'rgba(6,10,24,.55)'); vt.addColorStop(1, 'rgba(6,10,24,0)'); g.fillStyle = vt; g.fillRect(0, 0, W, fy + 26);
    var vb = g.createLinearGradient(0, fy + FH - 26, 0, fy + FH + 40); vb.addColorStop(0, 'rgba(6,10,24,0)'); vb.addColorStop(1, 'rgba(6,10,24,.6)'); g.fillStyle = vb; g.fillRect(0, fy + FH - 26, W, H - (fy + FH) + 26);
    var sd = g.createLinearGradient(0, 0, W, 0); sd.addColorStop(0, 'rgba(0,0,0,.28)'); sd.addColorStop(0.06, 'rgba(0,0,0,0)'); sd.addColorStop(0.94, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = sd; g.fillRect(0, 0, W, H);
    this.bg = cv;
  };

  // ---- Komutan cizimi ----------------------------------------------------
  R.renderSprite = function (cls, team, st, idx) {
    if (cls !== 'commander') return base.renderSprite.call(this, cls, team, st, idx);
    var Sc = this.px * SPR, cv = document.createElement('canvas');
    cv.width = Math.ceil(92 * Sc); cv.height = Math.ceil(120 * Sc);
    var g = cv.getContext('2d'), pal = PAL[team], walk = 0, lunge = 0, age = 0, t = 0;
    g.setTransform(Sc, 0, 0, Sc, 46 * Sc, 74 * Sc);
    if (st === 'm') { var ph = idx / this.SN.m * TAU; walk = Math.sin(ph); t = ph; age = ph / 7; }
    else if (st === 'i') t = idx / this.SN.i * TAU;
    else lunge = Math.sin((1 - [0.85, 0.6, 0.35, 0.12][idx]) * Math.PI);
    g.fillStyle = 'rgba(255,214,90,.22)'; circ(g, 0, 0, 38); g.fillStyle = 'rgba(0,0,0,.24)'; ell(g, 3, 6, 19, 28);
    outline(g);
    var gp = {}; for (var k in pal) gp[k] = pal[k]; gp.trim = '#ffd23f';
    this.dCav(g, gp, team, walk, lunge, age, t);
    line(g, -13, 14, -13, -56, 3.2, '#5a3d20'); line(g, -13, 14, -13, -56, 1.2, '#a07a4a');
    var w = Math.sin(t * 4) * 3;
    g.beginPath(); g.moveTo(-13, -56); g.lineTo(-40 + w, -51); g.lineTo(-35 + w * 0.6, -42); g.lineTo(-41 + w, -33); g.lineTo(-13, -30); g.closePath(); g.fillStyle = pal.main; g.fill(); g.stroke();
    O(g, -26, -43, 5.5, '#ffd23f'); O(g, -26, -43, 2.6, pal.dark);
    poly(g, [[-6.5, -13], [-6.5, -20], [-3.3, -16.5], [0, -22.5], [3.3, -16.5], [6.5, -20], [6.5, -13]], '#ffd23f');
    return cv;
  };

  // ---- Olaylar -> efektler + ses ----------------------------------------
  R.fieldHandle = function (events) {
    var A = Z.Audio, i, e, p;
    for (i = 0; i < events.length; i++) {
      e = events[i]; p = e.x !== undefined ? this.w2s(e.x, e.y) : { x: 0, y: 0 };
      switch (e.type) {
        case 'spawn': this.puff(p.x, p.y, 7, '#d9c9a0'); if (e.unit.team === 0 && !e.unit.commander) A.spawn(e.unit.cls); break;
        case 'hit':
          this.sparks(p.x, p.y - 6, e.strong ? 7 : 3, e.strong ? '#ffd166' : '#ffffff');
          if (this.fx.length < 40) this.fx.push({ k: 'slash', x: p.x + (Math.random() - 0.5) * 14, y: p.y - 6, a: Math.random() * TAU, t: 0.18, max: 0.18, big: e.strong });
          if (this.texts.length < 26 && (e.strong || e.dmg > 40)) this.text(p.x + 14, p.y - 30, String(Math.round(e.dmg)), e.team === 1 ? (e.strong ? '#ffd166' : '#ffffff') : '#ff8b8b', e.strong ? 26 : 20);
          A.hit(); break;
        case 'death':
          this.puff(p.x, p.y, e.boss ? 24 : 10, e.team === 0 ? '#9ec5ff' : '#ff9d9d');
          if (this.fx.length < 70) this.fx.push({ k: 'decal', x: p.x, y: p.y, t: 5, max: 5, big: e.boss });
          A.death(); if (e.boss) { this.shake = 14; A.boom(); } break;
        case 'coin': this.text(p.x, p.y - 36, '+' + e.v, '#ffd23f', 24); A.coin(); break;
        case 'shoot': A.shoot(); break;
        case 'boom':
          this.fx.push({ k: 'ring', x: p.x, y: p.y, r: Math.max(36, e.r * 0.8 * 1.25), t: 0.4, max: 0.4, col: e.cls === 'mage' ? '#c084fc' : e.cls === 'golem' ? '#c9a66b' : '#ffa94d' });
          this.sparks(p.x, p.y, 12, e.cls === 'mage' ? '#d8b4fe' : '#ffb347'); this.shake = Math.max(this.shake, e.cls === 'cata' ? 5 : 2); A.boom(); break;
        case 'heal':
          if (this.parts.length < 380) for (var hq = 0; hq < 5; hq++) this.parts.push({ x: p.x + (Math.random() - 0.5) * 26, y: p.y - 8, vx: (Math.random() - 0.5) * 20, vy: -44 - Math.random() * 30, life: 0.8, max: 0.8, size: 3, col: '#6ee7b7', g: -10, shrink: true });
          if (this.texts.length < 26) this.text(p.x, p.y - 34, '+' + Math.round(e.v), '#6ee7b7', 20);
          if (e.team === 0) A.heal(); break;
        case 'freeze': this.sparks(p.x, p.y - 6, 9, '#bfe6ff'); this.fx.push({ k: 'ring', x: p.x, y: p.y, r: 44, t: 0.45, max: 0.45, col: '#9bd7ff' }); break;
        case 'perk': A.perk(); break;
        case 'flame': {
          var q = this.w2s(e.tx, e.ty);
          for (var fq = 0; fq < 7 && this.parts.length < 380; fq++) { var tt = fq / 6; this.parts.push({ x: p.x + (q.x - p.x) * tt, y: p.y + (q.y - p.y) * tt, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 0.35, max: 0.35, size: 5 + tt * 5, col: fq % 2 ? '#ffb04a' : '#ff6a2a', g: -30, shrink: true }); }
          this.fx.push({ k: 'ring', x: q.x, y: q.y, r: 30, t: 0.25, max: 0.25, col: '#ff8a2a' }); A.fire(); break; }
        case 'burn': this.sparks(p.x, p.y - 10, 2, '#ff8a2a'); break;
        case 'charge': this.fx.push({ k: 'ring', x: p.x, y: p.y, r: 40, t: 0.3, max: 0.3, col: '#ffe08a' }); A.charge(); break;
        case 'skill': {
          var sr = (e.r || 130) * this.fs;
          if (e.kind === 'roar') { this.fx.push({ k: 'wave', x: this.fx0(), y: this.foy + FH - 30, t: 0.9, max: 0.9, col: '#ffd166' }); this.banner = { text: 'ZAFER NARAASI!', col: '#ffd166', t: 1.4 }; }
          else if (e.kind === 'ward') this.fx.push({ k: 'ring', x: p.x, y: p.y, r: sr * 1.1, t: 0.9, max: 0.9, col: '#6ee7b7' });
          else if (e.kind === 'bolt') { this.fx.push({ k: 'ring', x: p.x, y: p.y, r: sr * 1.1, t: 0.5, max: 0.5, col: '#a5d8ff' }); this.shake = Math.max(this.shake, 6); }
          else if (e.kind === 'dragon') { this.fx.push({ k: 'ring', x: p.x, y: p.y, r: sr * 1.15, t: 1.0, max: 1.0, col: '#ff8a3a' }); this.banner = { text: 'EJDER NEFESİ!', col: '#ffb347', t: 1.3 }; this.shake = Math.max(this.shake, 6); }
          else if (e.kind === 'freeze') { this.fx.push({ k: 'ring', x: p.x, y: p.y, r: sr * 1.1, t: 1.0, max: 1.0, col: '#9bd7ff' }); this.banner = { text: 'DON FIRTINASI!', col: '#9bd7ff', t: 1.2 }; }
          A.skill(e.kind); A.vibrate(25); break; }
        case 'bolt': this.fx.push({ k: 'bolt', x: p.x, y: p.y, t: 0.4, max: 0.4, seed: Math.random() * 99 }); this.sparks(p.x, p.y, 9, '#a5d8ff'); break;
        case 'ambush': this.banner = { text: 'PUSU! YANLARDAN BASKIN', col: '#ffb347', t: 1.6 }; this.shake = 6; A.boom(); break;
        case 'mine': this.text(this.fx0(), this.foy + FH - 120, 'Maden Sv.' + e.level + '!', '#ffd23f', 30); A.click(); break;
        case 'start': this.banner = { text: 'SAVAŞ BAŞLASIN!', col: '#ff6b6b', t: 1.5 }; this.shake = 8; A.battleStart(); break;
        case 'win': A.win(); break;
        case 'lose': A.lose(); break;
      }
    }
  };
  R.fx0 = function () { return this.fox + FW / 2; };

  // ---- Birim / mermi cizimi ----------------------------------------------
  function angDiff(a, b) { var d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; }
  R.fieldDrawUnit = function (c, u, dt) {
    var b = this.battle, s = (u.boss ? 1.45 : 1) * (u.commander ? 1.16 : 1) * SPR * USC, k = s / SPR;
    if (u.age < 0.3) { var q = u.age / 0.3; s *= 0.5 + 0.5 * (1 - Math.pow(1 - q, 3)); }
    var atk = u.atkAnim > 0 ? u.atkAnim / 0.25 : 0, st, idx, SN = this.SN;
    if (atk > 0) { st = 'a'; idx = Math.min(SN.a - 1, Math.floor((1 - atk) * SN.a)); }
    else if (u.moving) { st = 'm'; idx = Math.floor(((u.age * u.speed * 0.024) % 1) * SN.m); }
    else { st = 'i'; idx = Math.floor(((this.time * 0.55 + u.id * 0.137) % 1) * SN.i); }
    var img = this.getSprite(u.cls, u.team, st, idx);
    // yon: yumusak donus (dikey cevirme + yana egim)
    if (u._rf === undefined) u._rf = u.facing; else u._rf += angDiff(u._rf, u.facing) * Math.min(1, dt * 10);
    var vy = Math.sin(u._rf), hx = Math.cos(u._rf), flip = vy > 0.12, tilt = Math.atan2(hx, Math.abs(vy) + 0.0001);
    tilt = Math.max(-1.15, Math.min(1.15, tilt)); var rot = flip ? -tilt : tilt;
    if (u.aura) { // sancak aurasi
      c.save(); c.translate(u.x, u.y); c.fillStyle = 'rgba(255,210,77,' + (0.07 + 0.03 * Math.sin(this.time * 3)) + ')'; circ(c, 0, 0, 130);
      c.strokeStyle = 'rgba(255,210,77,.25)'; c.lineWidth = 2; c.setLineDash([8, 8]); c.lineDashOffset = -this.time * 12; c.beginPath(); c.arc(0, 0, 130, 0, TAU); c.stroke(); c.restore();
    }
    if (u.commander) { c.save(); c.translate(u.x, u.y + 6); c.strokeStyle = u.team === 0 ? 'rgba(120,180,255,.7)' : 'rgba(255,110,110,.7)'; c.lineWidth = 2.5; c.setLineDash([6, 5]); c.lineDashOffset = -this.time * 14; c.beginPath(); c.ellipse(0, 0, 30, 22, 0, 0, TAU); c.stroke(); c.restore(); }
    c.save(); c.translate(u.x, u.y); c.rotate(rot); if (flip) c.scale(1, -1);
    if (u.boss) { var ag = c.createRadialGradient(0, 0, 4, 0, 0, 40); ag.addColorStop(0, 'rgba(255,70,70,' + (0.4 + 0.15 * Math.sin(this.time * 6)) + ')'); ag.addColorStop(1, 'rgba(255,70,70,0)'); c.fillStyle = ag; circ(c, 0, 0, 40); }
    c.drawImage(img, -46 * s, -74 * s, 92 * s, 120 * s);
    c.scale(s, s);
    if (u.stunUntil > b.t) { c.fillStyle = 'rgba(170,220,255,.6)'; rrect(c, -17, -32, 34, 56, 10); c.fill(); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-11, -24); c.lineTo(-4, -8); c.moveTo(10, -28); c.lineTo(4, -12); c.moveTo(-9, 12); c.lineTo(0, 0); c.moveTo(8, 6); c.lineTo(13, 18); c.stroke(); }
    if (u.burnUntil > b.t) { var bt = this.time * 14 + u.id; for (var bk = 0; bk < 4; bk++) { c.fillStyle = bk % 2 ? 'rgba(255,205,70,.92)' : 'rgba(255,100,30,.92)'; ell(c, -10 + bk * 7, -6 - Math.abs(Math.sin(bt + bk * 2)) * 9, 3.4, 6 + Math.sin(bt + bk) * 2); } }
    if (u.flash > 0) { c.globalAlpha = Math.min(0.75, u.flash * 6); c.fillStyle = '#fff'; ell(c, 0, -4, 16, 22); c.globalAlpha = 1; }
    if (u.wardUntil > b.t) { c.strokeStyle = 'rgba(110,231,183,.9)'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -2, 25, 0, TAU); c.stroke(); c.fillStyle = 'rgba(110,231,183,.14)'; c.fill(); }
    c.restore();
    var top = u.y - (u.commander ? 36 : 25) * Math.max(0.9, k), bw = u.commander ? 58 : 34 * Math.min(k, 1.4);
    if (u.boss || u.commander) { c.fillStyle = '#ffd23f'; c.strokeStyle = OUT; c.lineWidth = 1.2; var cy = top - 13; c.beginPath(); c.moveTo(u.x - 9, cy + 10); c.lineTo(u.x - 9, cy); c.lineTo(u.x - 4, cy + 6); c.lineTo(u.x, cy - 4); c.lineTo(u.x + 4, cy + 6); c.lineTo(u.x + 9, cy); c.lineTo(u.x + 9, cy + 10); c.closePath(); c.fill(); c.stroke(); }
    if (u.hp < u.max || u.commander) {
      var f = Math.max(0, u.hp / u.max), bh = u.commander ? 8 : 5;
      c.fillStyle = 'rgba(0,0,0,.72)'; rrect(c, u.x - bw / 2 - 2, top - 2, bw + 4, bh + 4, 4.5); c.fill();
      var hg = c.createLinearGradient(0, top, 0, top + bh);
      if (u.team === 0) { hg.addColorStop(0, '#8cf5b0'); hg.addColorStop(1, '#2dbd6a'); } else { hg.addColorStop(0, '#ff9a9a'); hg.addColorStop(1, '#d33a3a'); }
      c.fillStyle = hg; rrect(c, u.x - bw / 2, top, Math.max(1, bw * f), bh, 2.5); c.fill();
    }
  };
  R.fieldProj = function (c, p) {
    var tot = Math.max(1, Math.hypot(p.tx - p.sx, p.ty - p.sy)), prog = Math.min(1, Math.hypot(p.x - p.sx, p.y - p.sy) / tot), h = Math.sin(prog * Math.PI), a = Math.atan2(p.ty - p.y, p.tx - p.x);
    c.save();
    if (p.kind === 'arrow') {
      var lift = h * 10; c.fillStyle = 'rgba(0,0,0,.25)'; ell(c, p.x + 3, p.y + 4, 7, 2);
      c.translate(p.x, p.y - lift); c.rotate(a);
      var tg = c.createLinearGradient(-30, 0, 0, 0); tg.addColorStop(0, 'rgba(255,255,255,0)'); tg.addColorStop(1, 'rgba(255,245,200,.65)'); c.strokeStyle = tg; c.lineWidth = 2; c.beginPath(); c.moveTo(-30, 0); c.lineTo(0, 0); c.stroke();
      line(c, -9, 0, 5, 0, 2.6, '#f1e3b0'); c.fillStyle = '#e8edf5'; circ(c, 6, 0, 2.2);
    } else if (p.kind === 'bolt') {
      c.fillStyle = 'rgba(0,0,0,.2)'; ell(c, p.x + 2, p.y + 6, 7, 3.5);
      for (var q = 3; q >= 1; q--) { c.fillStyle = 'rgba(192,132,252,' + (0.18 * (4 - q)) + ')'; circ(c, p.x - Math.cos(a) * q * 8, p.y - 10 - Math.sin(a) * q * 8, 9 - q); }
      c.fillStyle = 'rgba(192,132,252,.45)'; circ(c, p.x, p.y - 10, 13); c.fillStyle = '#f1e4ff'; circ(c, p.x, p.y - 10, 6.5);
    } else {
      var ry = p.y - h * 60; c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, p.x + 2, p.y + 4, 10, 4.5);
      c.fillStyle = '#4a4a54'; circ(c, p.x, ry, 8.5 + h * 3.5); c.fillStyle = '#6a6a76'; circ(c, p.x - 2, ry - 2, 4); c.fillStyle = '#ff9f43'; circ(c, p.x + 3, ry + 2, 2.6);
    }
    c.restore();
  };
  R.fieldFlag = function (c, f) {
    var own = f.prog >= 0.55 ? 0 : f.prog <= -0.55 ? 1 : -1, col = own === 0 ? '#3b82f6' : own === 1 ? '#d62d2d' : '#c4cad6', t = this.time;
    c.save(); c.translate(f.x, f.y);
    c.fillStyle = own === 0 ? 'rgba(59,130,246,.12)' : own === 1 ? 'rgba(214,45,45,.12)' : 'rgba(255,255,255,.07)'; circ(c, 0, 0, f.r);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.setLineDash([7, 7]); c.lineDashOffset = -t * 8; c.beginPath(); c.arc(0, 0, f.r, 0, TAU); c.stroke(); c.setLineDash([]);
    if (Math.abs(f.prog) > 0.02) { c.strokeStyle = f.prog > 0 ? '#60a5fa' : '#f87171'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, f.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.abs(f.prog) * TAU); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, 3, 6, 11, 4); c.fillStyle = '#6b5a45'; ell(c, 0, 4, 9, 4.5);
    line(c, 0, 4, 0, -44, 3.6, '#5a3d20'); line(c, 0, 4, 0, -44, 1.3, '#a07a4a');
    var w = Math.sin(t * 4 + f.x) * 4; c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(0, -44); c.lineTo(30 + w, -40); c.lineTo(24 + w * 0.6, -31); c.lineTo(30 + w, -22); c.lineTo(0, -19); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffd23f'; circ(c, 0, -46, 3.2); c.restore();
  };

  R.fieldAmbient = function (c, dt) {
    var amode = THEMES[this.theme].amb, i, H = this.H, W = this.W;
    for (i = 0; i < this.amb.length; i++) {
      var am = this.amb[i];
      if (amode === 'snow') { c.fillStyle = 'rgba(255,255,255,.85)'; am.y += am.v * dt; am.x += Math.sin(this.time + am.ph) * 14 * dt - 6 * dt; circ(c, am.x, am.y, am.r); }
      else if (amode === 'dust') { c.fillStyle = 'rgba(240,200,130,.3)'; am.x += am.v * 4 * dt; am.y += Math.sin(this.time * 0.7 + am.ph) * 6 * dt; c.fillRect(am.x, am.y, 14 + am.r * 8, 1.6); }
      else if (amode === 'ember') { am.y -= am.v * 0.9 * dt; am.x += Math.sin(this.time * 2 + am.ph) * 12 * dt; c.fillStyle = 'rgba(255,' + Math.floor(110 + am.c * 110) + ',40,' + (0.45 + 0.4 * Math.sin(this.time * 8 + am.ph)) + ')'; circ(c, am.x, am.y, 1 + am.r * 0.55); if (am.y < -6) { am.y = H + 6; am.x = Math.random() * W; } }
      else if (amode === 'fog') {
        if (i < 12) { c.fillStyle = 'rgba(200,255,225,.045)'; am.x += am.v * 0.3 * dt; circ(c, am.x, am.y, 70 + am.r * 28); }
        else { am.x += Math.sin(this.time * 0.8 + am.ph) * 16 * dt; am.y += Math.cos(this.time * 0.6 + am.ph) * 10 * dt; var fl = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 2 + am.ph)); c.fillStyle = 'rgba(220,255,140,' + (fl * 0.22) + ')'; circ(c, am.x, am.y, 7); c.fillStyle = 'rgba(240,255,170,' + fl + ')'; circ(c, am.x, am.y, 1.8); }
      } else { am.y += am.v * 0.5 * dt; am.x += Math.sin(this.time * 0.9 + am.ph) * 18 * dt + 8 * dt; c.save(); c.translate(am.x, am.y); c.rotate(this.time * 1.2 + am.ph); c.fillStyle = am.c < 0.5 ? 'rgba(120,190,90,.8)' : 'rgba(224,150,60,.8)'; ell(c, 0, 0, 5 + am.r, 2.4); c.restore(); }
      if (am.y > H) { am.y = -6; am.x = Math.random() * W; }
      if (am.x > W + 40) { am.x = -40; am.y = Math.random() * H; } else if (am.x < -40) am.x = W + 4;
    }
  };

  // ---- Ana cizim ---------------------------------------------------------
  R.frame = function (dt) {
    if (!this.field) return base.frame.call(this, dt);
    if (!this.active || !this.battle) return;
    this.time += dt;
    var b = this.battle, c = this.ctx, i, W = this.W, H = this.H, T = THEMES[this.theme], map = b.map;
    this.fieldHandle(b.drain());
    for (i = 0; i < 4 && this.warmQ && this.warmQ.length; i++) { var wq = this.warmQ.shift(); this.getSprite(wq[0], wq[1], wq[2], wq[3]); }
    for (i = 0; i < b.projs.length; i++) { var pj = b.projs[i]; if (pj.kind === 'rock' && Math.random() < 0.6 && this.parts.length < 380) { var ps = this.w2s(pj.x, pj.y); this.parts.push({ x: ps.x, y: ps.y, vx: (Math.random() - 0.5) * 10, vy: 6, life: 0.5, max: 0.5, size: 4, col: 'rgba(90,90,100,.55)', g: 0, shrink: true }); } }
    this.updateFx(dt);

    c.setTransform(this.px, 0, 0, this.px, 0, 0);
    c.drawImage(this.bg, 0, 0, W, H);
    c.save();
    var sx = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
    c.translate(sx + this.fox, sy + this.foy);

    // nehir isiltisi
    if (map.river) {
      var rv = map.river, wc = waterCols(T.kind);
      c.save(); c.beginPath(); c.rect(0, rv.y - rv.hw, FW, rv.hw * 2);
      rv.gaps.forEach(function (gp) { c.rect(gp.x1, rv.y - rv.hw, -(gp.x1 - gp.x0), rv.hw * 2); }); c.clip('evenodd');
      c.strokeStyle = T.kind === 'volcano' ? 'rgba(255,210,120,.5)' : 'rgba(255,255,255,.4)'; c.lineWidth = 1.8; c.lineCap = 'round';
      for (i = 0; i < 22; i++) { var wx = ((i * 83 + this.time * (12 + (i % 4) * 5)) % (FW + 60)) - 30, wy = rv.y + ((i * 37) % (rv.hw * 2 - 10)) - rv.hw + 5; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + 14 + (i % 3) * 5, wy + Math.sin(this.time * 2 + i) * 1.2); c.stroke(); }
      c.restore(); void wc;
    }
    // bolgeler
    var prep = b.phase === 'prep', zt = FH - (prep ? Z.FZONE.prep : Z.FZONE.battle), drag = !!this.fhover;
    var zg = c.createLinearGradient(0, zt, 0, FH); zg.addColorStop(0, 'rgba(90,150,255,' + (prep ? 0.22 : drag ? 0.2 : 0.09) + ')'); zg.addColorStop(1, 'rgba(90,150,255,' + (prep ? 0.34 : drag ? 0.3 : 0.14) + ')');
    c.fillStyle = zg; c.fillRect(0, zt, FW, FH - zt);
    c.strokeStyle = 'rgba(160,200,255,' + (prep || drag ? 0.75 : 0.3) + ')'; c.lineWidth = 2.5; c.setLineDash([14, 10]); c.lineDashOffset = -this.time * 10; c.beginPath(); c.moveTo(0, zt); c.lineTo(FW, zt); c.stroke(); c.setLineDash([]);
    if (prep) {
      var eg = c.createLinearGradient(0, 0, 0, Z.FZONE.prep); eg.addColorStop(0, 'rgba(255,70,70,.24)'); eg.addColorStop(1, 'rgba(255,70,70,0)'); c.fillStyle = eg; c.fillRect(0, 0, FW, Z.FZONE.prep);
      c.font = '900 22px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.55)';
      c.globalAlpha = 0.6; c.strokeText('YERLEŞTİRME ALANI', FW / 2, zt + 22); c.fillStyle = 'rgba(210,230,255,.95)'; c.fillText('YERLEŞTİRME ALANI', FW / 2, zt + 22);
      c.strokeText('DÜŞMAN ORDUSU', FW / 2, 22); c.fillStyle = 'rgba(255,200,200,.95)'; c.fillText('DÜŞMAN ORDUSU', FW / 2, 22); c.globalAlpha = 1;
    }
    // bayraklar
    for (i = 0; i < b.flags.length; i++) this.fieldFlag(c, b.flags[i]);
    // birlikler (y'ye gore)
    var order = b.units.slice().sort(function (p, q) { return p.y - q.y; });
    for (i = 0; i < order.length; i++) this.fieldDrawUnit(c, order[i], dt);
    for (i = 0; i < b.projs.length; i++) this.fieldProj(c, b.projs[i]);
    // orman: ustten yari saydam yaprak ortusu (icindeki birlikler siperde)
    map.forests.forEach(function (f) { var fg = c.createRadialGradient(f.x, f.y, f.r * 0.3, f.x, f.y, f.r); fg.addColorStop(0, 'rgba(20,50,30,.22)'); fg.addColorStop(1, 'rgba(20,50,30,0)'); c.fillStyle = fg; circ(c, f.x, f.y, f.r); });
    // yerlestirme onizlemesi
    var hv = this.fhover;
    if (hv) {
      if (hv.kind === 'skill') {
        c.fillStyle = 'rgba(255,214,90,.16)'; circ(c, hv.x, hv.y, 130); c.strokeStyle = 'rgba(255,230,140,.9)'; c.lineWidth = 3; c.setLineDash([10, 8]); c.lineDashOffset = -this.time * 20; c.beginPath(); c.arc(hv.x, hv.y, 130, 0, TAU); c.stroke(); c.setLineDash([]);
      } else {
        c.fillStyle = hv.ok ? 'rgba(120,255,160,.28)' : 'rgba(255,100,100,.3)'; circ(c, hv.x, hv.y, 20); c.strokeStyle = hv.ok ? '#8cf5b0' : '#ff8b8b'; c.lineWidth = 3; c.beginPath(); c.arc(hv.x, hv.y, 20, 0, TAU); c.stroke();
        if (!hv.ok) line(c, hv.x - 9, hv.y - 9, hv.x + 9, hv.y + 9, 3, '#ff8b8b');
      }
    }
    c.restore();

    // ekran uzayi: parcaciklar, metinler, efektler
    c.save(); c.translate(sx, sy);
    for (i = 0; i < this.fx.length; i++) if (this.fx[i].k === 'decal') this.drawDecal(c, this.fx[i]);
    this.drawFx(c);
    for (i = 0; i < this.parts.length; i++) { var p = this.parts[i], a = Math.max(0, p.life / p.max); c.globalAlpha = a; c.fillStyle = p.col; circ(c, p.x, p.y, p.shrink ? p.size * (0.4 + a * 0.6) : p.size); }
    c.globalAlpha = 1;
    for (i = 0; i < this.texts.length; i++) { var tx = this.texts[i], ta = Math.min(1, tx.t / 0.35); c.globalAlpha = ta; c.font = '900 ' + tx.size + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(tx.s, tx.x, tx.y); c.fillStyle = tx.col; c.fillText(tx.s, tx.x, tx.y); }
    c.globalAlpha = 1; c.restore();
    this.fieldAmbient(c, dt);
    if (b.buffed()) { var pulse = 0.2 + 0.08 * Math.sin(this.time * 8), vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62); vg.addColorStop(0, 'rgba(255,210,80,0)'); vg.addColorStop(1, 'rgba(255,200,60,' + pulse + ')'); c.fillStyle = vg; c.fillRect(0, 0, W, H); }
    if (this.banner) {
      var bn = this.banner, ba = Math.min(1, bn.t / 0.4);
      c.save(); c.globalAlpha = ba; c.translate(W / 2, this.foy + 330); c.font = '900 50px system-ui'; c.textAlign = 'center'; c.lineWidth = 9; c.strokeStyle = 'rgba(0,0,0,.75)'; c.lineJoin = 'round';
      c.strokeText(bn.text, 0, 0); var tg = c.createLinearGradient(0, -40, 0, 8); tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.45, bn.col); tg.addColorStop(1, bn.col); c.fillStyle = tg; c.fillText(bn.text, 0, 0); c.restore();
    }
  };
})(globalThis.Z = globalThis.Z || {});
