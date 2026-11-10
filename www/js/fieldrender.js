// Sefer Vakti - ACIK ALAN cizimi: serbest 2D sahne (nehir/gecit, orman, tepe, kaya, bayrak), komutanlar, yerlestirme onizlemesi.
// render.js uzerine eklenir: savas 'field' turundeyse start/frame/resize bu dosyadaki surumlere yonlenir.
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };
  var R = Z.Render, U = R.util, TAU = U.TAU, ell = U.ell, circ = U.circ, rrect = U.rrect, line = U.line, seeded = U.seeded, hash = U.hash;
  var E = U.E, O = U.O, RR = U.RR, poly = U.poly, outline = U.outline, mgrad = U.mgrad, bar = U.bar, device = U.device, K = R.TOK;
  var PAL = R.PAL, THEMES = R.THEMES, SPR = R.SPR, OUT = R.OUT, FW = Z.FW, FH = Z.FH;
  var base = { start: R.start, stop: R.stop, frame: R.frame, resize: R.resize, renderSprite: R.renderSprite };
  var USC = 0.92;     // birlik cizim olcegi (acik alanda daha cok birlik var)
  var USC_SMALL = 0.84; // the same 70 units on a stage under 1400u high (360 x 640 phones): a smaller figure keeps the melee from fusing into one pale tangle
  var HUD_B = 200;    // the DOM chip rows cover the stage down to about 192u: a crown or a health bar that would sit above this line is drawn below its unit instead

  R.field = false; R.fs = 1; R.fox = 0; R.foy = 150; R.fhover = null; R.usc = USC;

  // Savas alani: ust arayuz ~150px, alt arayuz ~262px; dunya 720x840 tam sigar (sahne en az 1280 yuksek)
  R.fieldLayout = function () {
    var top = 150, bot = this.H - 262;
    this.fs = 1; this.fox = this.ox; this.foy = Math.max(top, top + (bot - top - FH) / 2);
    this.usc = this.H < 1400 ? USC_SMALL : USC; // sprites are baked at this scale (R.getSprite m), so it must be set before any sprite is asked for
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
    this.warmQ = []; this._wc = {};
    // frames are baked at the scale they are drawn at (fieldDrawUnit): usc for the troops, usc x 1.16 for the commanders
    var self = this, usc = this.usc, add = function (cls, team) { var m = cls === 'commander' ? usc * 1.16 : usc; ['i', 'm', 'a'].forEach(function (st) { for (var q = 0; q < self.SN[st]; q++) self.warmQ.push([cls, team, st, q, m]); }); };
    add('commander', 0); add('commander', 1);
    b.deck.forEach(function (id) { add(Z.UNITS[id].cls, 0); }); b.info.tiers.forEach(function (id) { add(Z.UNITS[id].cls, 1); });
    this.warmIdle();
    var T = THEMES[this.theme], n = T.amb === 'snow' ? 90 : T.amb === 'dust' ? 40 : T.amb === 'ember' ? 46 : T.amb === 'fog' ? 34 : 26;
    this.amb = [];
    for (var i = 0; i < n; i++) this.amb.push({ x: Math.random() * this.W, y: Math.random() * this.H, v: 20 + Math.random() * 50, r: 1 + Math.random() * 2.2, ph: Math.random() * 6, c: Math.random() });
    var oi = Z.FIELD_OBJECTIVES[b.objective];
    this.banner = { text: ($t('KALE ÖNÜ') + ' · ') + oi.name.toUpperCase(), col: '#ffd166', t: 2.4 };
  };

  // ---- sabit arka plan ---------------------------------------------------
  // (basit surum; ayrintili surum scenery.js icinde, hata olursa buna doner) Flat like the real one: ground + diaper, gold horizon, sand road with ink edges,
  // a river with ivory bands and sand fords, ink-edged hills, clumps of trees, rocks; the shared flat helpers live in render.js.
  R.fieldBuildBgBasic = function () {
    var b = this.battle, map = b.map, W = this.W, H = this.H, th = this.theme || 0, rnd = seeded(this.seed || 1), self = this, i, g, cv = document.createElement('canvas');
    cv.width = this.canvas.width; cv.height = this.canvas.height; g = cv.getContext('2d'); g.setTransform(this.px, 0, 0, this.px, 0, 0);
    this.flatGround(g, 0, 0, W, H, th); this.flatHorizon(g, W, this.foy + 8, th);
    g.save(); g.translate(this.fox, this.foy); g.lineJoin = 'round'; g.lineCap = 'round';
    var s1 = (rnd() - 0.5) * 140, mx = 360 + s1, pts = [[360, FH - 4], [360 - s1 * 0.5, FH * 0.78], [mx, FH * 0.5], [360 + (rnd() - 0.5) * 80, FH * 0.22], [360, 6]];
    if (map.river) { var gc = map.river.gaps.map(function (q) { return (q.x0 + q.x1) / 2; }); pts[2] = [Math.abs(gc[0] - 360) < Math.abs(gc[1] - 360) ? gc[0] : gc[1], map.river.y]; }
    function road(w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var q = 1; q < pts.length; q++) g.quadraticCurveTo(pts[q - 1][0], pts[q - 1][1], (pts[q - 1][0] + pts[q][0]) / 2, (pts[q - 1][1] + pts[q][1]) / 2); g.lineTo(pts[4][0], pts[4][1]); g.stroke(); }
    road(64, K.ink); road(58, K.sand);
    if (map.river) {
      var rv = map.river, y0 = rv.y - rv.hw, y1 = rv.y + rv.hw, segs = [[-30, rv.gaps[0].x0], [rv.gaps[0].x1, rv.gaps[1].x0], [rv.gaps[1].x1, FW + 30]];
      segs.forEach(function (sg) {
        if (sg[1] - sg[0] < 4) return;
        g.fillStyle = K.ink; g.fillRect(sg[0] - 1.5, y0 - 3, sg[1] - sg[0] + 3, y1 - y0 + 6); g.fillStyle = K.azur; g.fillRect(sg[0], y0, sg[1] - sg[0], y1 - y0);
        g.strokeStyle = K.ivo; g.lineWidth = 2.2; for (var k = 1; k < 4; k++) { g.beginPath(); for (var x = sg[0]; x <= sg[1]; x += 6) { var yy = y0 + k * (y1 - y0) / 4 + Math.sin(x * 0.1 + k) * 1.8; if (x === sg[0]) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
      });
      rv.gaps.forEach(function (gp) { g.fillStyle = K.ink; g.fillRect(gp.x0, y0 - 6, gp.x1 - gp.x0, y1 - y0 + 12); g.fillStyle = K.arg; g.fillRect(gp.x0 + 2.5, y0 - 3.5, gp.x1 - gp.x0 - 5, y1 - y0 + 7); });
    }
    map.hills.forEach(function (h) { for (var k = 0; k < 3; k++) { var f = 1 - k * 0.27; g.beginPath(); g.ellipse(h.x, h.y - k * 8, h.r * f, h.r * f * 0.74, 0, 0, TAU); g.lineWidth = 6; g.strokeStyle = K.ink; g.stroke(); g.fillStyle = THEMES[th].ground; g.fill(); g.fillStyle = 'rgba(244,236,211,' + (0.18 + k * 0.1) + ')'; g.fill(); } });
    var trees = [];
    map.forests.forEach(function (f) { var n = Math.max(5, Math.round(f.r * f.r / 380)); for (i = 0; i < n; i++) { var a = rnd() * TAU, d = Math.sqrt(rnd()) * (f.r - 16); trees.push([f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 17 + rnd() * 9]); } });
    trees.sort(function (p, q) { return p[1] - q[1]; });
    trees.forEach(function (t) { self.flatTree(g, t[0], t[1], t[2], th); });
    map.rocks.forEach(function (rk) { g.beginPath(); g.ellipse(rk.x, rk.y, rk.r * 1.05, rk.r * 0.8, 0, 0, TAU); g.lineWidth = 5; g.strokeStyle = K.ink; g.stroke(); g.fillStyle = K.arg; g.fill(); });
    g.restore();
    this.bg = cv;
  };

  // ---- Komutan cizimi ----------------------------------------------------
  // The commander is the cavalry figure with gold trim, a standard behind the saddle and a crown; baked through R.makeSprite like every unit.
  R.renderSprite = function (cls, team, st, idx, m) {
    if (cls !== 'commander') return base.renderSprite.call(this, cls, team, st, idx, m);
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
    }, m);
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
    var b = this.battle, mf = (u.boss ? 1.45 : 1) * (u.commander ? 1.16 : 1) * this.usc, s = SPR * mf, k = mf; // mf = the scale the figure is drawn at = the scale it is baked at
    if (u.age < 0.3) { var q = u.age / 0.3; s *= 0.5 + 0.5 * (1 - Math.pow(1 - q, 3)); }
    var atk = u.atkAnim > 0 ? u.atkAnim / 0.25 : 0, st, idx, SN = this.SN;
    if (atk > 0) { st = 'a'; idx = Math.min(SN.a - 1, Math.floor((1 - atk) * SN.a)); }
    else if (u.moving) { st = 'm'; idx = Math.floor(((u.age * u.speed * 0.024) % 1) * SN.m); }
    else { st = 'i'; idx = Math.floor(((this.time * 0.55 + u.id * 0.137) % 1) * SN.i); }
    if (u.boss && !u._wb) { u._wb = 1; this.warmClass(u.cls, u.team, mf); }
    var img = this.getSprite(u.cls, u.team, st, idx, mf);
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
    this.blit(c, img, s);
    c.scale(s, s);
    this.unitFx(c, u);
    c.restore();
    // crown and health ribbon: above the figure, unless that would put them under the DOM chip rows (stages up to ~1340u high: the garrison commander's crown and bar
    // stood at 148u and 168u, behind the chips); then they hang below it, mirrored, with a little hysteresis so a unit crossing the line does not flicker
    var crowned = u.boss || u.commander, barred = u.hp < u.max || u.commander;
    if (crowned || barred) {
      var e0 = (u.commander ? 36 : 25) * Math.max(0.9, k) + 3, bw = u.commander ? 58 : 42 * Math.min(k, 1.4), bh = u.commander ? 7 : 5.5, low = !!u._lo, need = this.foy + u.y - e0 - (crowned ? 34 : 3), by, cy;
      low = low ? need < HUD_B + 16 : need < HUD_B; u._lo = low;
      if (low) { by = u.y + e0 - 2; cy = by + bh + 12; } else { by = u.y - e0; cy = by - 20; }
      if (crowned) this.crown(c, u.x, cy, 1.1);
      if (barred) this.hpBar(c, u.x, by, bw, Math.max(0, u.hp / u.max), u.team, bh);
    }
  };
  // field projectiles: flat, ink edged, no gradients (the arrow and bolt point along their flight angle a)
  R.fieldProj = function (c, p) {
    var tot = Math.max(1, Math.hypot(p.tx - p.sx, p.ty - p.sy)), prog = Math.min(1, Math.hypot(p.x - p.sx, p.y - p.sy) / tot), h = Math.sin(prog * Math.PI), a = Math.atan2(p.ty - p.y, p.tx - p.x), q;
    c.save();
    if (p.kind === 'arrow') {
      var lift = h * 10; c.globalAlpha = 0.28; c.fillStyle = K.ink; ell(c, p.x + 3, p.y + 4, 8, 2.6); c.globalAlpha = 1;
      c.translate(p.x, p.y - lift); c.rotate(a);
      c.globalAlpha = 0.8; line(c, -38, 0, -16, 0, 2, K.ivo); c.globalAlpha = 1;                                  // flat streak
      bar(c, -17, 0, 5, 0, 2.8, K.ivo, 1.6); this.arrowHead(c, 5, 0, 1, true);                                    // 2.8u shaft in a 1.6u ink edge, 22u long, ink-edged argent head
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

  R.fieldAmbient = function (c, dt) { this.ambient(c, dt); }; // the shared flat ambient (render.js)

  R.fieldBuildBg = function () {
    try { if (R.Scenery && R.Scenery.field) R.Scenery.field.call(this); else this.fieldBuildBgBasic(); }
    catch (e) { if (typeof console !== 'undefined') console.warn('scenery: basit kale onu arka planina donuldu', e); this.fieldBuildBgBasic(); }
  };

  // ---- Kale onu muharebesi: ustte dusman kalesi (sur, kuleler, kapi), altta bizim kamp (cit, pavyonlar, ates) ----
  // Both are baked once per resize into strips that reach the screen edges (R.fieldSlot, the same painters as the lane castle and camp) and blitted in world
  // coordinates; only the cloth and the flames are drawn per frame.
  R.fieldSiegeBackdrop = function (c) {
    var px = this.px, t = this.time, w = this.fieldSlot('wall'), k = this.fieldSlot('camp');
    c.drawImage(w.cv, w.bx, w.by, w.cv.width / px, w.cv.height / px); this.baseDyn(c, w, 0, t);
    c.drawImage(k.cv, k.bx, k.by, k.cv.width / px, k.cv.height / px); this.baseDyn(c, k, 0, t);
  };

  // ---- Ana cizim ---------------------------------------------------------
  // dashed ink-and-ivory boundary line (flat; the dashes march)
  function zoneLine(c, x0, x1, y, t, col) {
    c.setLineDash([14, 10]); c.lineDashOffset = -t * 10; c.lineCap = 'butt'; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y);
    c.globalAlpha = 0.6; c.strokeStyle = K.ink2; c.lineWidth = 5; c.stroke(); c.globalAlpha = 1; c.strokeStyle = col || K.ivo; c.lineWidth = 2.4; c.stroke(); c.setLineDash([]);
  }
  R.frame = function (dt) {
    if (!this.field) return base.frame.call(this, dt);
    if (!this.active || !this.battle) return;
    this.time += dt;
    var b = this.battle, c = this.ctx, i, W = this.W, T = THEMES[this.theme], map = b.map, xl = -this.fox, t = this.time;
    this.fieldHandle(b.drain());
    if (this.warmQ && this.warmQ.length && !this._warmBusy) this.warmIdle();
    for (i = 0; i < b.projs.length; i++) { var pj = b.projs[i]; if (pj.kind === 'rock' && Math.random() < 0.6 && this.parts.length < 380) { var ps = this.w2s(pj.x, pj.y); this.parts.push({ x: ps.x, y: ps.y, vx: (Math.random() - 0.5) * 10, vy: 6, life: 0.5, max: 0.5, size: 4, col: K.ink2, g: 0, shrink: true }); } }
    this.updateFx(dt);

    c.setTransform(this.px, 0, 0, this.px, 0, 0);
    c.drawImage(this.bg, 0, 0, W, this.H);
    c.save();
    var sx = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
    c.translate(sx + this.fox, sy + this.foy);

    // river glints: ivory dashes drifting over the water (volcano: or on lava)
    if (map.river) {
      var rv = map.river;
      c.save(); c.beginPath(); c.rect(0, rv.y - rv.hw, FW, rv.hw * 2);
      rv.gaps.forEach(function (gp) { c.rect(gp.x1, rv.y - rv.hw, -(gp.x1 - gp.x0), rv.hw * 2); }); c.clip('evenodd');
      c.strokeStyle = T.kind === 'volcano' ? K.orp : K.ivo; c.globalAlpha = 0.6; c.lineWidth = 2; c.lineCap = 'round';
      for (i = 0; i < 22; i++) { var wx = ((i * 83 + t * (12 + (i % 4) * 5)) % (FW + 60)) - 30, wy = rv.y + ((i * 37) % (rv.hw * 2 - 10)) - rv.hw + 5; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + 14 + (i % 3) * 5, wy + Math.sin(t * 2 + i) * 1.2); c.stroke(); }
      c.restore();
    }
    // zones: flat washes with dashed lines (no gradients); in the prep phase the garrison's zone is marked too, each with its banderole just outside the line
    var prep = b.phase === 'prep', zt = FH - (prep ? Z.FZONE.prep : Z.FZONE.battle), drag = !!this.fhover, lb, lh, w1, w2;
    c.globalAlpha = prep ? 0.2 : drag ? 0.15 : 0.07; c.fillStyle = K.lapis; c.fillRect(xl, zt, W, FH - zt); c.globalAlpha = 1;
    zoneLine(c, xl, xl + W, zt, t, K.ivo);
    if (prep) {
      c.globalAlpha = 0.1; c.fillStyle = K.verm; c.fillRect(xl, 0, W, Z.FZONE.prep); c.globalAlpha = 1;
      zoneLine(c, xl, xl + W, Z.FZONE.prep, t, K.ivo);
      lb = $t('KALE GARNİZONU'); lh = $t('KAMP ÖNÜ: YERLEŞTİR'); w1 = this.bandW(c, lb, 22, 38); w2 = this.bandW(c, lh, 22, 38); // the banderoles themselves are painted after the units (below)
    }
    this.fieldSiegeBackdrop(c);
    // bayraklar
    for (i = 0; i < b.flags.length; i++) this.fieldFlag(c, b.flags[i]);
    // birlikler (y'ye gore)
    var order = b.units.slice().sort(function (p, q) { return p.y - q.y; });
    for (i = 0; i < order.length; i++) this.fieldDrawUnit(c, order[i], dt);
    for (i = 0; i < b.projs.length; i++) this.fieldProj(c, b.projs[i]);
    // forests: a faint flat leaf cover over the units inside (cover in the sim), a dashed edge so it reads as a zone
    map.forests.forEach(function (f) {
      c.globalAlpha = 0.11; c.fillStyle = K.mal; circ(c, f.x, f.y, f.r); c.globalAlpha = 0.4; c.setLineDash([9, 8]); c.beginPath(); c.arc(f.x, f.y, f.r - 1, 0, TAU); c.strokeStyle = K.ink2; c.lineWidth = 2.4; c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    });
    // the zone banderoles go over the units (garrison spear tips and shields poke across the zone line and cut the first letter when painted before them)
    if (prep) {
      R.drawBanderole(c, FW / 2, Z.FZONE.prep + 34, Math.min(w1, FW - 70), 38, lb, { fill: K.vel, ink: K.ink, rule: K.mad, under: K.mad, size: 22 });      // ink lettering on vellum; the rules and the folds carry the side's tincture
      R.drawBanderole(c, FW / 2, zt - 34, Math.min(w2, FW - 70), 38, lh, { fill: K.vel, ink: K.ink, rule: K.lapis, under: K.lapis, size: 22 });
    }
    // yerlestirme onizlemesi
    var hv = this.fhover;
    if (hv) {
      c.lineJoin = 'round';
      if (hv.kind === 'skill') {
        c.globalAlpha = 0.18; c.fillStyle = K.orp; circ(c, hv.x, hv.y, 130); c.globalAlpha = 1; c.setLineDash([10, 8]); c.lineDashOffset = -t * 20; c.beginPath(); c.arc(hv.x, hv.y, 130, 0, TAU); c.lineWidth = 6.4; c.strokeStyle = K.ink; c.stroke(); c.lineWidth = 3; c.strokeStyle = K.orp; c.stroke(); c.setLineDash([]);
      } else {
        var pc = hv.ok ? R.DMG.heal : R.DMG.taken;
        c.globalAlpha = 0.34; c.fillStyle = pc; circ(c, hv.x, hv.y, 20); c.globalAlpha = 1; c.beginPath(); c.arc(hv.x, hv.y, 20, 0, TAU); c.lineWidth = 6; c.strokeStyle = K.ink; c.stroke(); c.lineWidth = 3; c.strokeStyle = pc; c.stroke();
        if (!hv.ok) { c.lineCap = 'round'; c.beginPath(); c.moveTo(hv.x - 9, hv.y - 9); c.lineTo(hv.x + 9, hv.y + 9); c.lineWidth = 6; c.strokeStyle = K.ink; c.stroke(); c.lineWidth = 3; c.strokeStyle = pc; c.stroke(); }
      }
    }
    c.restore();

    // ekran uzayi: parcaciklar, metinler, efektler
    c.save(); c.translate(sx, sy);
    for (i = 0; i < this.fx.length; i++) if (this.fx[i].k === 'decal') this.drawDecal(c, this.fx[i]);
    this.drawFx(c);
    this.drawParts(c);
    this.drawTexts(c);
    c.restore();
    this.ambient(c, dt);
    if (b.buffed()) this.buffEdge(c);
    if (this.banner) this.drawBannerCard(c, W / 2, this.foy + 130, this.banner); // under the wall, over the garrison's end of the field
    this.drawFrame(c);
  };
})(globalThis.Z = globalThis.Z || {});
