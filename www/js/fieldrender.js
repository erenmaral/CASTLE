// Sefer Vakti - ACIK ALAN cizimi: serbest 2D sahne (nehir/gecit, orman, tepe, kaya, bayrak), komutanlar, yerlestirme onizlemesi.
// render.js uzerine eklenir: savas 'field' turundeyse start/frame/resize bu dosyadaki surumlere yonlenir.
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };
  var R = Z.Render, U = R.util, TAU = U.TAU, ell = U.ell, circ = U.circ, rrect = U.rrect, line = U.line, seeded = U.seeded, hash = U.hash;
  var E = U.E, O = U.O, RR = U.RR, poly = U.poly, outline = U.outline, mgrad = U.mgrad, bar = U.bar, device = U.device, K = R.TOK;
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
    this.theme = b.theme || 0; if (Z.Audio && Z.Audio.setRealm) Z.Audio.setRealm(this.theme); this.seed = b.level * 13 + 7; this.fieldLayout(); this.fieldBuildBg();
    this.warmQ = [];
    var self = this, add = function (cls, team) { ['i', 'm', 'a'].forEach(function (st) { for (var q = 0; q < self.SN[st]; q++) self.warmQ.push([cls, team, st, q]); }); };
    add('commander', 0); add('commander', 1);
    b.deck.forEach(function (id) { add(Z.UNITS[id].cls, 0); }); b.info.tiers.forEach(function (id) { add(Z.UNITS[id].cls, 1); });
    var T = THEMES[this.theme], n = T.amb === 'snow' ? 90 : T.amb === 'dust' ? 40 : T.amb === 'ember' ? 46 : T.amb === 'fog' ? 34 : 26;
    this.amb = [];
    for (var i = 0; i < n; i++) this.amb.push({ x: Math.random() * this.W, y: Math.random() * this.H, v: 20 + Math.random() * 50, r: 1 + Math.random() * 2.2, ph: Math.random() * 6, c: Math.random() });
    var oi = Z.FIELD_OBJECTIVES[b.objective];
    this.banner = { text: ($t('KALE ÖNÜ') + ' · ') + oi.name.toUpperCase(), col: '#ffd166', t: 2.4 };
  };

  // ---- sabit arka plan ---------------------------------------------------
  function waterCols(kind) {
    return kind === 'volcano' ? ['#8a2a0c', '#e0561a', '#ffb347', '#3a1208'] : kind === 'ice' ? ['#6fa8d6', '#a9d4f2', '#e8f6ff', '#4b7fa8']
      : kind === 'swamp' ? ['#1f3f35', '#2f6350', '#5fa88a', '#142a22'] : kind === 'desert' ? ['#2f7fa6', '#52a9c9', '#bfe8f2', '#1f5f7e'] : ['#245f94', '#3f8ac4', '#a9dcf5', '#17436b'];
  }
  // (basit surum; ayrintili surum scenery.js icinde, hata olursa buna doner)
  R.fieldBuildBgBasic = function () {
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
  // The commander is the cavalry figure with gold trim, a standard behind the saddle and a crown; baked through R.makeSprite like every unit.
  R.renderSprite = function (cls, team, st, idx) {
    if (cls !== 'commander') return base.renderSprite.call(this, cls, team, st, idx);
    return this.makeSprite('commander', team, st, idx, function (g, pal, walk, atk, lunge, age, t) {
      var gp = {}, k, w = Math.sin(t * 4) * 3;
      for (k in pal) gp[k] = pal[k]; gp.trim = K.orp;
      this.dCav(g, gp, team, walk, lunge, age, t);
      bar(g, -13, 12, -13, -54, 3.2, K.bis);                                                                       // standard
      poly(g, [[-13, -52], [-37 + w, -48], [-33 + w * 0.6, -40], [-37 + w, -32], [-13, -28]], pal.main, pal.dark);  // swallow-tail flag
      g.strokeStyle = gp.trim; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-14, -49.4); g.lineTo(-33 + w, -46); g.moveTo(-14, -30.6); g.lineTo(-33 + w, -33.6); g.stroke(); outline(g);
      device(g, 'auto', -24.5, -40, 6, pal, team);
      O(g, -13, -57, 3.6, K.orp);
      this.crown(g, 0, -29, 0.95);
    });
  };

  // ---- Olaylar -> efektler + ses ----------------------------------------
  R.fieldHandle = function (events) {
    var A = Z.Audio, i, e, p;
    for (i = 0; i < events.length; i++) {
      e = events[i]; p = e.x !== undefined ? this.w2s(e.x, e.y) : { x: 0, y: 0 };
      switch (e.type) {
        case 'spawn': this.puff(p.x, p.y, 7, '#d9c9a0'); if (e.unit.team === 0 && !e.unit.commander) A.spawn(e.unit.cls); break;
        case 'hit':
          this.sparks(p.x, p.y - 6, e.strong ? 7 : 3, e.strong ? K.orp : K.ivo);
          if (this.fx.length < 40) this.fx.push({ k: 'slash', x: p.x + (Math.random() - 0.5) * 14, y: p.y - 6, a: Math.random() * TAU, t: 0.18, max: 0.18, big: e.strong });
          if (this.texts.length < 26 && (e.strong || e.dmg > 40)) this.text(p.x + 14, p.y - 30, String(Math.round(e.dmg)), e.team === 1 ? (e.strong ? R.DMG.crit : R.DMG.dealt) : R.DMG.taken, e.strong ? 26 : 20);
          A.hit(); break;
        case 'death':
          this.puff(p.x, p.y, e.boss ? 24 : 10, e.team === 0 ? K.azur : PAL[1].light);
          if (this.fx.length < 70) this.fx.push({ k: 'decal', x: p.x, y: p.y, t: 5, max: 5, big: e.boss });
          A.death(); if (e.boss) { this.shake = 14; A.boom(); } break;
        case 'coin': this.text(p.x, p.y - 36, '+' + e.v, K.orp, 24); A.coin(); break;
        case 'shoot': A.shoot(); break;
        case 'boom':
          this.fx.push({ k: 'ring', x: p.x, y: p.y, r: Math.max(36, e.r * 0.8 * 1.25), t: 0.4, max: 0.4, col: e.cls === 'mage' ? '#c084fc' : e.cls === 'golem' ? '#c9a66b' : '#ffa94d' });
          this.sparks(p.x, p.y, 12, e.cls === 'mage' ? '#d8b4fe' : '#ffb347'); this.shake = Math.max(this.shake, e.cls === 'cata' ? 5 : 2); A.boom(); break;
        case 'heal':
          if (this.parts.length < 380) for (var hq = 0; hq < 5; hq++) this.parts.push({ x: p.x + (Math.random() - 0.5) * 26, y: p.y - 8, vx: (Math.random() - 0.5) * 20, vy: -44 - Math.random() * 30, life: 0.8, max: 0.8, size: 3, col: K.vdg, g: -10, shrink: true });
          if (this.texts.length < 26) this.text(p.x, p.y - 34, '+' + Math.round(e.v), R.DMG.heal, 20);
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
          if (e.kind === 'roar') { this.fx.push({ k: 'wave', x: this.fx0(), y: this.foy + FH - 30, t: 0.9, max: 0.9, col: '#ffd166' }); this.banner = { text: $t('ZAFER NARAASI!'), col: '#ffd166', t: 1.4 }; }
          else if (e.kind === 'ward') this.fx.push({ k: 'ring', x: p.x, y: p.y, r: sr * 1.1, t: 0.9, max: 0.9, col: '#6ee7b7' });
          else if (e.kind === 'bolt') { this.fx.push({ k: 'ring', x: p.x, y: p.y, r: sr * 1.1, t: 0.5, max: 0.5, col: '#a5d8ff' }); this.shake = Math.max(this.shake, 6); }
          else if (e.kind === 'dragon') { this.fx.push({ k: 'ring', x: p.x, y: p.y, r: sr * 1.15, t: 1.0, max: 1.0, col: '#ff8a3a' }); this.banner = { text: $t('EJDER NEFESİ!'), col: '#ffb347', t: 1.3 }; this.shake = Math.max(this.shake, 6); }
          else if (e.kind === 'freeze') { this.fx.push({ k: 'ring', x: p.x, y: p.y, r: sr * 1.1, t: 1.0, max: 1.0, col: '#9bd7ff' }); this.banner = { text: $t('DON FIRTINASI!'), col: '#9bd7ff', t: 1.2 }; }
          A.skill(e.kind); A.vibrate(25); break; }
        case 'bolt': this.fx.push({ k: 'bolt', x: p.x, y: p.y, t: 0.4, max: 0.4, seed: Math.random() * 99 }); this.sparks(p.x, p.y, 9, '#a5d8ff'); break;
        case 'ambush': this.banner = { text: $t('PUSU! YANLARDAN BASKIN'), col: '#ffb347', t: 1.6 }; this.shake = 6; A.boom(); break;
        case 'mine': this.text(this.fx0(), this.foy + FH - 120, $t('Maden Sv.') + e.level + '!', K.orp, 30); A.click(); break;
        case 'start': this.banner = { text: $t('SAVAŞ BAŞLASIN!'), col: '#ff6b6b', t: 1.5 }; this.shake = 8; A.battleStart(); break;
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
    if (u.aura) this.auraRing(c, u.x, u.y, 130, 130, -this.time * 12); // banner aura: dashed ring on the ground, flat
    if (u.commander) { // commander ring: ink under, team tincture over (dashed)
      c.save(); c.translate(u.x, u.y + 6); c.setLineDash([6, 5]); c.lineDashOffset = -this.time * 14; c.beginPath(); c.ellipse(0, 0, 30, 22, 0, 0, TAU);
      c.globalAlpha = 0.6; c.strokeStyle = K.ink2; c.lineWidth = 4.4; c.stroke(); c.globalAlpha = 1; c.strokeStyle = u.team === 0 ? K.azur : PAL[1].light; c.lineWidth = 2.4; c.stroke(); c.setLineDash([]); c.restore();
    }
    c.save(); c.translate(u.x, u.y); c.rotate(rot); if (flip) c.scale(1, -1);
    if (u.boss) { c.fillStyle = K.verm; c.globalAlpha = 0.16 + 0.05 * Math.sin(this.time * 6); circ(c, 0, 0, 46); c.globalAlpha = 0.22 + 0.05 * Math.sin(this.time * 6); circ(c, 0, 0, 30); c.globalAlpha = 1; } // two flat discs
    c.drawImage(img, -46 * s, -74 * s, 92 * s, 120 * s);
    c.scale(s, s);
    this.unitFx(c, u);
    c.restore();
    var top = u.y - ((u.commander ? 36 : 25) * Math.max(0.9, k) + 3), bw = u.commander ? 58 : 34 * Math.min(k, 1.4);
    if (u.boss || u.commander) this.crown(c, u.x, top - 20, 1.1);
    if (u.hp < u.max || u.commander) this.hpBar(c, u.x, top, bw, Math.max(0, u.hp / u.max), u.team, u.commander ? 6.5 : 4.5);
  };
  // field projectiles: flat, ink edged, no gradients (the arrow and bolt point along their flight angle a)
  R.fieldProj = function (c, p) {
    var tot = Math.max(1, Math.hypot(p.tx - p.sx, p.ty - p.sy)), prog = Math.min(1, Math.hypot(p.x - p.sx, p.y - p.sy) / tot), h = Math.sin(prog * Math.PI), a = Math.atan2(p.ty - p.y, p.tx - p.x), q;
    c.save();
    if (p.kind === 'arrow') {
      var lift = h * 10; c.globalAlpha = 0.28; c.fillStyle = K.ink; ell(c, p.x + 3, p.y + 4, 7, 2); c.globalAlpha = 1;
      c.translate(p.x, p.y - lift); c.rotate(a);
      c.globalAlpha = 0.5; line(c, -30, 0, -12, 0, 1.6, K.ivo); c.globalAlpha = 1;
      bar(c, -9, 0, 5, 0, 1.8, K.ivo); c.fillStyle = K.ink; circ(c, 6, 0, 3.5); c.fillStyle = K.arg; circ(c, 6, 0, 2.2);
    } else if (p.kind === 'bolt') {
      c.globalAlpha = 0.25; c.fillStyle = K.ink; ell(c, p.x + 2, p.y + 6, 7, 3.5);
      for (q = 3; q >= 1; q--) { c.globalAlpha = 0.18 * (4 - q); c.fillStyle = K.pur; circ(c, p.x - Math.cos(a) * q * 8, p.y - 10 - Math.sin(a) * q * 8, 9 - q); }
      c.globalAlpha = 1; c.fillStyle = K.ink; circ(c, p.x, p.y - 10, 11.5); c.fillStyle = K.pur; circ(c, p.x, p.y - 10, 9.2); c.fillStyle = K.ivo; circ(c, p.x, p.y - 10, 4.4);
    } else {
      var ry = p.y - h * 60; c.globalAlpha = 0.3; c.fillStyle = K.ink; ell(c, p.x + 2, p.y + 4, 10, 4.5); c.globalAlpha = 1;
      c.fillStyle = K.ink; circ(c, p.x, ry, 11 + h * 3.5); c.fillStyle = K.ink2; circ(c, p.x, ry, 8.6 + h * 3.5); c.fillStyle = K.arg; circ(c, p.x - 2.4, ry - 2.4, 3.2); c.fillStyle = K.orp; circ(c, p.x + 3.4, ry + 2.6, 2.2);
    }
    c.restore();
  };
  // capture flag: the owner's tincture comes from R.PAL (host azure, garrison gules), neutral = argent; ink edged and flat
  R.fieldFlag = function (c, f) {
    var own = f.prog >= 0.55 ? 0 : f.prog <= -0.55 ? 1 : -1, col = own < 0 ? K.arg : PAL[own].main, t = this.time, w = Math.sin(t * 4 + f.x) * 4;
    c.save(); c.translate(f.x, f.y);
    c.globalAlpha = 0.13; c.fillStyle = col; circ(c, 0, 0, f.r); c.globalAlpha = 1;
    c.setLineDash([7, 7]); c.lineDashOffset = -t * 8; c.beginPath(); c.arc(0, 0, f.r, 0, TAU);
    c.globalAlpha = 0.55; c.strokeStyle = K.ink2; c.lineWidth = 4; c.stroke(); c.globalAlpha = 0.9; c.strokeStyle = K.ivo; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1; c.setLineDash([]);
    if (Math.abs(f.prog) > 0.02) { // capture progress: ink under, the capturer's lighter tincture over
      c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, f.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.abs(f.prog) * TAU);
      c.strokeStyle = K.ink; c.lineWidth = 10; c.stroke(); c.strokeStyle = f.prog > 0 ? PAL[0].light : PAL[1].light; c.lineWidth = 5.4; c.stroke();
    }
    outline(c);
    E(c, 0, 4, 9, 4.5, K.bis, K.ink2);                                                                                // mound
    bar(c, 0, 4, 0, -44, 3.4, K.bis);                                                                                 // pole
    poly(c, [[0, -43], [30 + w, -39], [25 + w * 0.6, -31], [30 + w, -22], [0, -19]], col, own < 0 ? K.vel2 : PAL[own].dark);   // swallow-tail flag
    if (own >= 0) device(c, 'auto', 12.5, -31, 5.4, PAL[own], own);
    O(c, 0, -47, 3.2, K.orp);
    c.restore();
  };

  R.fieldAmbient = function (c, dt) {
    var amode = THEMES[this.theme].amb, i, H = this.H, W = this.W;
    for (i = 0; i < this.amb.length; i++) {
      var am = this.amb[i];
      if (amode === 'snow') { c.fillStyle = 'rgba(255,255,255,.85)'; am.y += am.v * dt; am.x += Math.sin(this.time + am.ph) * 14 * dt - 6 * dt; circ(c, am.x, am.y, am.r); }
      else if (amode === 'dust') { c.fillStyle = 'rgba(240,200,130,.3)'; am.x += am.v * 4 * dt; am.y += Math.sin(this.time * 0.7 + am.ph) * 6 * dt; c.fillRect(am.x, am.y, 14 + am.r * 8, 1.6); }
      else if (amode === 'ember') { am.y -= am.v * 0.9 * dt; am.x += Math.sin(this.time * 2 + am.ph) * 12 * dt; c.fillStyle = 'rgba(255,' + Math.floor(110 + am.c * 110) + ',40,' + (0.45 + 0.4 * Math.sin(this.time * 8 + am.ph)) + ')'; circ(c, am.x, am.y, 1 + am.r * 0.55); if (am.y < -6) { am.y = H + 6; am.x = Math.random() * W; } }
      else if (amode === 'fog') {
        if (i < 12) { c.fillStyle = 'rgba(200,255,225,.028)'; am.x += am.v * 0.3 * dt; circ(c, am.x, am.y, 70 + am.r * 28); }
        else { am.x += Math.sin(this.time * 0.8 + am.ph) * 16 * dt; am.y += Math.cos(this.time * 0.6 + am.ph) * 10 * dt; var fl = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 2 + am.ph)); c.fillStyle = 'rgba(220,255,140,' + (fl * 0.22) + ')'; circ(c, am.x, am.y, 7); c.fillStyle = 'rgba(240,255,170,' + fl + ')'; circ(c, am.x, am.y, 1.8); }
      } else { am.y += am.v * 0.5 * dt; am.x += Math.sin(this.time * 0.9 + am.ph) * 18 * dt + 8 * dt; c.save(); c.translate(am.x, am.y); c.rotate(this.time * 1.2 + am.ph); c.fillStyle = am.c < 0.5 ? 'rgba(120,190,90,.8)' : 'rgba(224,150,60,.8)'; ell(c, 0, 0, 5 + am.r, 2.4); c.restore(); }
      if (am.y > H) { am.y = -6; am.x = Math.random() * W; }
      if (am.x > W + 40) { am.x = -40; am.y = Math.random() * H; } else if (am.x < -40) am.x = W + 4;
    }
  };

  R.fieldBuildBg = function () {
    try { if (R.Scenery && R.Scenery.field) R.Scenery.field.call(this); else this.fieldBuildBgBasic(); }
    catch (e) { if (typeof console !== 'undefined') console.warn('scenery: basit kale onu arka planina donuldu', e); this.fieldBuildBgBasic(); }
  };

  // ---- Kale onu muharebesi: ustte dusman kalesi (sur+kuleler+kapi), altta bizim kamp (cit+yurt+ates) ----
  R.fieldSiegeBackdrop = function (c) {
    var pe = R.PAL[1], pp = R.PAL[0], t = this.time, i, x;
    // dusman kalesi (arka plan; birlikler onunde)
    var wg = c.createLinearGradient(0, 0, 0, 46); wg.addColorStop(0, '#9fa1b3'); wg.addColorStop(1, '#6a6c80');
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, 44, FW, 9);
    c.fillStyle = wg; c.fillRect(0, 0, FW, 44);
    c.strokeStyle = 'rgba(30,32,48,.35)'; c.lineWidth = 1.3;
    for (var r = 0; r < 3; r++) { var ry = 8 + r * 12; c.beginPath(); c.moveTo(0, ry); c.lineTo(FW, ry); c.stroke(); for (x = (r % 2) * 14; x < FW; x += 28) { c.beginPath(); c.moveTo(x, ry); c.lineTo(x, ry + 12); c.stroke(); } }
    c.fillStyle = '#b9bbcb'; for (x = 6; x < FW - 6; x += 26) c.fillRect(x, 40, 16, 8);      // siperlikler (sahaya bakan kenar)
    c.fillStyle = '#3a3c4e'; c.fillRect(0, 0, FW, 4);
    [60, FW - 60].forEach(function (tx) {                                                    // kuleler
      c.fillStyle = 'rgba(0,0,0,.3)'; circ(c, tx + 5, 28, 34);
      c.fillStyle = pe.dark; circ(c, tx, 22, 32);
      for (var sg = 0; sg < 12; sg++) { var a0 = sg * TAU / 12 + 0.2; c.fillStyle = sg % 2 ? pe.main : pe.cloth; c.beginPath(); c.moveTo(tx - 2, 20); c.arc(tx, 22, 30, a0, a0 + TAU / 12); c.closePath(); c.fill(); }
      c.strokeStyle = pe.trim; c.lineWidth = 2.4; c.beginPath(); c.arc(tx, 22, 31, 0, TAU); c.stroke(); c.fillStyle = '#ffd24d'; circ(c, tx - 2, 20, 4.5);
    });
    var gx = FW / 2;                                                                          // kapi
    c.fillStyle = '#4a4c60'; rrect(c, gx - 46, 4, 92, 50, 16); c.fill();
    var dg = c.createLinearGradient(0, 12, 0, 54); dg.addColorStop(0, '#0e0a08'); dg.addColorStop(1, '#2a1c12'); c.fillStyle = dg; rrect(c, gx - 38, 12, 76, 42, 14); c.fill();
    c.strokeStyle = '#8a8a98'; c.lineWidth = 2.2; for (var pk = -3; pk <= 3; pk++) { c.beginPath(); c.moveTo(gx + pk * 10, 14); c.lineTo(gx + pk * 10, 30); c.stroke(); }
    c.fillStyle = pe.main; circ(c, gx, 8, 9); c.fillStyle = pe.trim; circ(c, gx, 8, 3.4);
    [gx - 150, gx + 150].forEach(function (fx) { var sw = Math.sin(t * 2.4 + fx) * 3; c.fillStyle = pe.main; c.beginPath(); c.moveTo(fx - 10, 6); c.lineTo(fx + 10, 6); c.lineTo(fx + 10 + sw * .4, 30); c.lineTo(fx + sw, 38); c.lineTo(fx - 10 + sw * .4, 30); c.closePath(); c.fill(); c.strokeStyle = pe.trim; c.lineWidth = 1.6; c.stroke(); });
    // bizim kamp (alt): yurtlar arkada, sivri kazikli cit onde
    var by = FH;
    [[90, 15], [210, 18], [360, 16], [510, 18], [630, 15]].forEach(function (y, yi) {
      var cx = y[0], cy = by - 12, rr = y[1];
      c.fillStyle = 'rgba(0,0,0,.28)'; ell(c, cx + 3, cy + 5, rr * 1.05, rr * 0.5);
      c.fillStyle = '#d9ccb0'; circ(c, cx, cy, rr);
      for (var sg = 0; sg < 12; sg++) { var a0 = sg * TAU / 12, a1 = a0 + TAU / 12; c.fillStyle = sg % 2 ? '#efe6d0' : '#e2d5b8'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, rr - 1.5, a0, a1); c.closePath(); c.fill(); }
      c.strokeStyle = pp.main; c.lineWidth = rr * 0.16; c.beginPath(); c.arc(cx, cy, rr * 0.74, 0, TAU); c.stroke();
      c.fillStyle = '#3a2a1c'; circ(c, cx, cy, rr * 0.16);
      if (yi % 2 === 0) { var fl = 0.8 + 0.2 * Math.sin(t * 10 + yi); c.fillStyle = 'rgba(255,170,60,.85)'; ell(c, cx + rr + 9, cy + 2, 3.4, 6 * fl); }
    });
    for (x = 4; x < FW - 8; x += 14) {
      var gate = Math.abs(x + 6 - FW / 2) < 40; if (gate) continue;
      c.fillStyle = (x / 14 | 0) % 2 ? '#8a5a2b' : '#76491f'; c.fillRect(x, by - 46, 11, 20);
      c.beginPath(); c.moveTo(x, by - 46); c.lineTo(x + 5.5, by - 53); c.lineTo(x + 11, by - 46); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(30,18,8,.55)'; c.lineWidth = 1; c.strokeRect(x, by - 46, 11, 20);
    }
    c.strokeStyle = '#3a2814'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, by - 40); c.lineTo(FW / 2 - 40, by - 40); c.moveTo(FW / 2 + 40, by - 40); c.lineTo(FW, by - 40); c.stroke();
    var sw2 = Math.sin(t * 2.2) * 2.5;
    [28, FW - 28].forEach(function (tx) { c.save(); c.translate(0, by - 26); c.scale(1, -1); R.tugBanner(c, tx, 0, 30, pp, sw2); c.restore(); });      // tug
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
      c.globalAlpha = 0.6; c.strokeText($t('KAMP ÖNÜ: YERLEŞTİR'), FW / 2, zt + 22); c.fillStyle = 'rgba(210,230,255,.95)'; c.fillText($t('KAMP ÖNÜ: YERLEŞTİR'), FW / 2, zt + 22);
      c.strokeText($t('KALE GARNİZONU'), FW / 2, 96); c.fillStyle = 'rgba(255,200,200,.95)'; c.fillText($t('KALE GARNİZONU'), FW / 2, 96); c.globalAlpha = 1;
    }
    this.fieldSiegeBackdrop(c);
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
    this.drawTexts(c);
    c.restore();
    this.fieldAmbient(c, dt);
    if (b.buffed()) { var pulse = 0.2 + 0.08 * Math.sin(this.time * 8), vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62); vg.addColorStop(0, 'rgba(255,210,80,0)'); vg.addColorStop(1, 'rgba(255,200,60,' + pulse + ')'); c.fillStyle = vg; c.fillRect(0, 0, W, H); }
    if (this.banner) this.drawBannerCard(c, W / 2, this.foy + 312, this.banner);
  };
})(globalThis.Z = globalThis.Z || {});
