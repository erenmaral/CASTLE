// Seferhan - canvas cizimi (DIKEY): 3 koridor yan yana, oyuncu kalesi altta, dusman ustte.
// Simulasyondaki 'x' (koridor boyunca konum) ekranda yukari dogru y ekseni olur. Tum grafikler kodla cizilir.
(function (Z) {
  'use strict';
  var C = Z.C, TAU = Math.PI * 2;
  var DW = 720; // tasarim genisligi (koridor alani)
  var PAL = [
    { main: '#3b82f6', dark: '#1e3a8a', light: '#93c5fd', trim: '#fbbf24' },
    { main: '#dc2626', dark: '#7f1d1d', light: '#fca5a5', trim: '#9ca3af' }
  ];
  var SKIN = '#f2c9a0';
  // Diyar temalari: 0 Yesil Vadi, 1 Kizil Col, 2 Buz Diyari
  var THEMES = [
    { sky: ['#16224f', '#7a4a7a', '#f0a35e'], sun: [255, 240, 190], m1: '#4a3a73', m2: '#2f4a5e', g: ['#4f7d36', '#456f2f', '#2d4f22'], lane: '255,240,170', amb: 'none' },
    { sky: ['#2b1650', '#c2410c', '#fbbf24'], sun: [255, 225, 150], m1: '#7c3f2a', m2: '#5a2d1f', g: ['#cfa95e', '#bb9348', '#8a6a30'], lane: '255,240,200', amb: 'dust' },
    { sky: ['#0b1d3a', '#3b6ea5', '#cfe8ff'], sun: [220, 240, 255], m1: '#6b8bb0', m2: '#a5bdd8', g: ['#e6f0f9', '#cfdeec', '#9fb6cd'], lane: '190,225,255', amb: 'snow' }
  ];

  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function line(c, x1, y1, x2, y2, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function hash(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

  var R = Z.Render = {
    canvas: null, ctx: null, W: 720, H: 1280, ox: 0, scale: 1, dpr: 1, px: 1, bg: null,
    eY: 215, pY: 930, s: 0.76,
    battle: null, parts: [], texts: [], fx: [], shake: 0, time: 0, banner: null,
    selLane: 1, dragLane: -1, active: false, theme: 0, amb: [],

    init: function (canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); },

    // stageW/H: mantiksal sahne (en az 720x1280'e sigar), scale: mantiksal -> css piksel
    resize: function (stageW, stageH, scale) {
      this.W = stageW; this.H = stageH; this.scale = scale;
      this.dpr = Math.min(globalThis.devicePixelRatio || 1, 2.5);
      this.ox = (stageW - DW) / 2;
      this.eY = 215; this.pY = stageH - 350;
      this.s = (this.pY - this.eY) / (C.EF - C.PF);
      var pw = Math.round(stageW * scale * this.dpr), ph = Math.round(stageH * scale * this.dpr);
      this.canvas.width = pw; this.canvas.height = ph;
      this.canvas.style.width = Math.round(stageW) + 'px'; this.canvas.style.height = Math.round(stageH) + 'px';
      this.px = pw / stageW;
      this.buildBg();
    },

    laneX: function (i) { return this.ox + 120 + 240 * i; },
    Y: function (pos) { return this.pY - (pos - C.PF) * this.s; },

    start: function (battle) {
      this.battle = battle; this.parts = []; this.texts = []; this.fx = []; this.shake = 0; this.banner = null;
      this.selLane = 1; this.dragLane = -1; this.active = true;
      var th = battle.theme || 0;
      if (th !== this.theme || !this.bg) { this.theme = th; this.buildBg(); }
      this.amb = []; var n = THEMES[th].amb === 'snow' ? 90 : THEMES[th].amb === 'dust' ? 40 : 0;
      for (var i = 0; i < n; i++) this.amb.push({ x: Math.random() * this.W, y: Math.random() * this.H, v: 20 + Math.random() * 50, r: 1 + Math.random() * 2.2, ph: Math.random() * 6 });
    },
    stop: function () { this.active = false; this.battle = null; },

    // ekran (mantiksal sahne) koordinatindan koridor bul; saha disindaysa -1
    laneAt: function (sx, sy) {
      var lx = sx - this.ox;
      if (lx < 0 || lx >= DW || sy < 96 || sy > this.pY + 72) return -1;
      return Math.min(2, Math.floor(lx / 240));
    },

    // ---- Arka plan (bir kez cizilir) ------------------------------------
    buildBg: function () {
      var c = document.createElement('canvas'); c.width = this.canvas.width; c.height = this.canvas.height;
      var g = c.getContext('2d'), W = this.W, H = this.H, ox = this.ox, i, j, T = THEMES[this.theme || 0];
      g.setTransform(this.px, 0, 0, this.px, 0, 0);
      var top = this.eY - 58;
      // zemin
      var gr = g.createLinearGradient(0, top, 0, H);
      gr.addColorStop(0, T.g[0]); gr.addColorStop(0.5, T.g[1]); gr.addColorStop(1, T.g[2]);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // ufuk: gokyuzu seridi + gunes + daglar (dusman tarafi, ustte)
      var sky = g.createLinearGradient(0, 0, 0, top + 6);
      sky.addColorStop(0, T.sky[0]); sky.addColorStop(0.6, T.sky[1]); sky.addColorStop(1, T.sky[2]);
      g.fillStyle = sky; g.fillRect(0, 0, W, top + 6);
      var sg = g.createRadialGradient(W * 0.75, top - 10, 4, W * 0.75, top - 10, 110);
      sg.addColorStop(0, 'rgba(' + T.sun.join(',') + ',1)'); sg.addColorStop(0.3, 'rgba(' + T.sun.join(',') + ',.45)'); sg.addColorStop(1, 'rgba(' + T.sun.join(',') + ',0)');
      g.fillStyle = sg; g.fillRect(0, 0, W, top + 6);
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (i = 0; i < 36; i++) circ(g, hash(i) * W, hash(i + 50) * (top - 30), hash(i + 9) * 1.2 + 0.4);
      function mount(col, base, amp, seed, step) {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, base + 40);
        for (var x = 0; x <= W + step; x += step) g.lineTo(x, base - amp * (0.35 + hash(x / step + seed) * 0.65));
        g.lineTo(W, base + 40); g.closePath(); g.fill();
      }
      mount(T.m1, top + 4, 80, 3, 80); mount(T.m2, top + 8, 46, 11, 54);
      if (this.theme === 2) {
        g.fillStyle = 'rgba(255,255,255,.75)';
        for (i = 0; i < Math.ceil(W / 80); i++) { var px2 = i * 80 + 40, hh = 80 * (0.35 + hash(i + 3) * 0.65); g.beginPath(); g.moveTo(px2 - 14, top + 4 - hh + 20); g.lineTo(px2, top + 4 - hh); g.lineTo(px2 + 14, top + 4 - hh + 20); g.fill(); }
      }
      // koridor seritleri
      for (i = 0; i < 3; i++) {
        var lx = ox + i * 240;
        var lg = g.createLinearGradient(lx, 0, lx + 240, 0);
        lg.addColorStop(0, 'rgba(' + T.lane + ',.03)'); lg.addColorStop(0.5, 'rgba(' + T.lane + ',' + (i === 1 ? 0.16 : 0.12) + ')'); lg.addColorStop(1, 'rgba(' + T.lane + ',.03)');
        g.fillStyle = lg; g.fillRect(lx, top + 56, 240, this.pY - top - 56 + 6);
        g.strokeStyle = 'rgba(255,245,210,.14)'; g.lineWidth = 3; g.setLineDash([16, 16]);
        g.beginPath(); g.moveTo(lx + 120, top + 70); g.lineTo(lx + 120, this.pY); g.stroke(); g.setLineDash([]);
        for (var k = 0; k < 22; k++) { // ot demetleri / tas
          var gx = lx + 16 + hash(k * 3 + i * 91) * 208, gy = top + 90 + hash(k + i * 17) * (this.pY - top - 120);
          if (this.theme === 2) { line(g, gx, gy, gx + 3, gy - 5, 1.6, 'rgba(120,150,180,.6)'); }
          else if (this.theme === 1) { g.fillStyle = 'rgba(110,80,40,.35)'; ell(g, gx, gy, 5, 2.4); }
          else { line(g, gx, gy, gx - 3, gy - 7, 1.6, 'rgba(25,60,22,.7)'); line(g, gx, gy, gx + 3, gy - 6, 1.6, 'rgba(25,60,22,.7)'); }
        }
      }
      // koridor aralarindaki ve kenardaki dekor (agac / kaktus / karli cam)
      var xs = [ox + 4, ox + 240, ox + 480, ox + 716];
      for (j = 0; j < xs.length; j++) {
        for (i = 0; i < Math.ceil((this.pY - top) / 74); i++) {
          var dx = xs[j] + (hash(i * 7 + j) - 0.5) * 16, dy = top + 90 + i * 74 + hash(i + j * 13) * 30, sc = 0.7 + hash(i + j) * 0.5;
          if (dy > this.pY - 10) continue;
          if (this.theme === 1) {
            g.fillStyle = '#3d6b3a'; g.fillRect(dx - 3 * sc, dy - 22 * sc, 6 * sc, 22 * sc); g.fillRect(dx - 11 * sc, dy - 14 * sc, 5 * sc, 9 * sc); g.fillRect(dx + 6 * sc, dy - 17 * sc, 5 * sc, 10 * sc);
          } else if (this.theme === 2) {
            g.fillStyle = '#2c4a5e'; g.beginPath(); g.moveTo(dx, dy - 36 * sc); g.lineTo(dx + 12 * sc, dy); g.lineTo(dx - 12 * sc, dy); g.fill();
            g.fillStyle = '#eef6fd'; g.beginPath(); g.moveTo(dx, dy - 36 * sc); g.lineTo(dx + 8 * sc, dy - 14 * sc); g.lineTo(dx - 8 * sc, dy - 14 * sc); g.fill();
          } else {
            g.fillStyle = '#1d3a2a'; g.beginPath(); g.moveTo(dx, dy - 38 * sc); g.lineTo(dx + 13 * sc, dy); g.lineTo(dx - 13 * sc, dy); g.fill();
            g.fillStyle = '#2b4f36'; g.beginPath(); g.moveTo(dx, dy - 28 * sc); g.lineTo(dx + 10 * sc, dy - 4 * sc); g.lineTo(dx - 10 * sc, dy - 4 * sc); g.fill();
          }
        }
      }
      // genis ekranlarda yan seritler: ayni dekor yogun
      if (ox > 4) {
        for (j = 0; j < 2; j++) for (i = 0; i < Math.ceil(H / 60); i++) {
          var sx = j === 0 ? hash(i * 5) * (ox - 6) : ox + DW + 6 + hash(i * 9) * (ox - 6);
          var sy = 40 + i * 60 + hash(i + 31) * 30, ss = 0.8 + hash(i + 3) * 0.6;
          g.fillStyle = this.theme === 1 ? '#a8803c' : this.theme === 2 ? '#2c4a5e' : '#1d3a2a';
          g.beginPath(); g.moveTo(sx, sy - 34 * ss); g.lineTo(sx + 12 * ss, sy); g.lineTo(sx - 12 * ss, sy); g.fill();
        }
      }
      // alt kisim (kartlarin arkasi) karart
      var dk = g.createLinearGradient(0, this.pY + 40, 0, H);
      dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(0.35, 'rgba(0,0,0,.55)'); dk.addColorStop(1, 'rgba(0,0,0,.7)');
      g.fillStyle = dk; g.fillRect(0, this.pY + 40, W, H - this.pY - 40);
      this.bg = c;
    },

    // ---- Olaylar -> efektler + ses --------------------------------------
    handle: function (events) {
      var A = Z.Audio, i, e, ex, ey;
      for (i = 0; i < events.length; i++) {
        e = events[i];
        ex = e.lane !== undefined ? this.laneX(e.lane) : 0;
        ey = e.x !== undefined ? this.Y(e.x) : 0;
        switch (e.type) {
          case 'spawn':
            this.puff(this.laneX(e.unit.lane), this.Y(e.unit.x), 6, '#d9c9a0');
            if (e.unit.team === 0) A.spawn();
            break;
          case 'hit':
            this.sparks(ex, ey - 6, e.strong ? 6 : 3, e.strong ? '#ffd166' : '#ffffff');
            if (this.texts.length < 26 && (e.strong || e.dmg > 40)) this.text(ex + 18, ey - 34, String(Math.round(e.dmg)), e.team === 1 ? (e.strong ? '#ffd166' : '#ffffff') : '#ff8b8b', e.strong ? 24 : 19);
            A.hit();
            break;
          case 'death':
            this.puff(ex, ey, e.boss ? 22 : 9, e.team === 0 ? '#9ec5ff' : '#ff9d9d');
            A.death();
            if (e.boss) { this.shake = 14; A.boom(); }
            break;
          case 'coin': this.text(ex, ey - 40, '+' + e.v, '#ffd23f', 22); A.coin(); break;
          case 'shoot': A.shoot(); break;
          case 'tower':
            this.fx.push({ k: 'arrow', x1: ex, y1: e.team === 0 ? this.pY : this.eY, x2: ex, y2: ey, t: 0.18, max: 0.18 }); A.shoot(); break;
          case 'boom':
            this.fx.push({ k: 'ring', x: ex, y: ey, r: Math.max(34, e.r * this.s * 1.2), t: 0.4, max: 0.4, col: e.cls === 'mage' ? '#c084fc' : '#ffa94d' });
            this.sparks(ex, ey, 10, e.cls === 'mage' ? '#d8b4fe' : '#ffb347');
            this.shake = Math.max(this.shake, e.cls === 'cata' ? 5 : 2); A.boom();
            break;
          case 'heal':
            if (this.parts.length < 380) for (var hq = 0; hq < 4; hq++) this.parts.push({ x: ex + (Math.random() - 0.5) * 24, y: ey - 8, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, life: 0.7, max: 0.7, size: 2.8, col: '#6ee7b7', g: -10, shrink: true });
            if (this.texts.length < 26) this.text(ex, ey - 36, '+' + Math.round(e.v), '#6ee7b7', 18);
            if (e.team === 0) A.heal();
            break;
          case 'freeze':
            this.sparks(ex, ey - 6, 8, '#bfe6ff'); this.fx.push({ k: 'ring', x: ex, y: ey, r: 40, t: 0.45, max: 0.45, col: '#9bd7ff' });
            break;
          case 'perk': A.perk(); break;
          case 'charge': this.fx.push({ k: 'ring', x: ex, y: ey, r: 36, t: 0.3, max: 0.3, col: '#ffe08a' }); break;
          case 'baseHit':
            this.shake = Math.max(this.shake, e.team === 0 ? 8 : 3);
            this.puff(this.ox + 60 + Math.random() * 600, e.team === 0 ? this.pY + 24 : this.eY - 24, 4, '#cfc6b4');
            A.baseHit(); if (e.team === 0) A.vibrate(40);
            break;
          case 'skill':
            if (e.kind === 'roar') { this.fx.push({ k: 'wave', x: this.ox + 360, y: this.pY + 24, t: 0.9, max: 0.9, col: '#ffd166' }); this.banner = { text: 'ZAFER NARAASI!', col: '#ffd166', t: 1.4 }; }
            else if (e.kind === 'ward') { this.fx.push({ k: 'lane', lane: e.lane, t: 0.9, max: 0.9, col: '#6ee7b7' }); }
            else if (e.kind === 'bolt') { this.shake = Math.max(this.shake, 6); }
            else if (e.kind === 'freeze') { this.fx.push({ k: 'lane', lane: e.lane, t: 1.0, max: 1.0, col: '#9bd7ff' }); this.banner = { text: 'DON FIRTINASI!', col: '#9bd7ff', t: 1.2 }; }
            A.skill(e.kind); A.vibrate(25);
            break;
          case 'bolt': this.fx.push({ k: 'bolt', x: ex, y: ey, t: 0.4, max: 0.4, seed: Math.random() * 99 }); this.sparks(ex, ey, 8, '#a5d8ff'); break;
          case 'boss': this.banner = { text: 'PATRON GELİYOR!', col: '#ff6b6b', t: 1.8 }; this.shake = 10; A.boom(); break;
          case 'ambush': this.banner = { text: 'PUSU!', col: '#ffb347', t: 1.4 }; this.shake = 6; A.boom(); break;
          case 'mine': this.text(this.ox + 360, this.H - 330, 'Maden Sv.' + e.level + '!', '#ffd23f', 28); A.click(); break;
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
      this.updateFx(dt);

      c.setTransform(this.px, 0, 0, this.px, 0, 0);
      c.drawImage(this.bg, 0, 0, W, H);
      // bulutlar (ufuk seridinde)
      c.fillStyle = 'rgba(255,255,255,.16)';
      for (i = 0; i < 4; i++) { var cx = ((i * 260 + this.time * (6 + i * 2)) % (W + 300)) - 150, cy = 36 + i * 20; ell(c, cx, cy, 64, 12); ell(c, cx + 36, cy - 7, 40, 10); }
      c.save();
      var sx = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
      c.translate(sx, sy);

      // secili / surukle koridor vurgusu
      for (i = 0; i < 3; i++) {
        var on = (this.dragLane === i), sel = (this.selLane === i && this.dragLane < 0);
        if (on || sel) {
          c.fillStyle = on ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)';
          c.fillRect(this.ox + i * 240, this.eY, 240, this.pY - this.eY);
          if (on) { c.fillStyle = '#fff'; c.font = 'bold 26px system-ui'; c.textAlign = 'center'; c.fillText('▼ BURAYA BIRAK ▼', this.laneX(i), this.eY + 90); }
        }
      }
      this.drawCastle(c, 1); this.drawCastle(c, 0);

      var order = b.units.slice().sort(function (a, d) { return R.Y(a.x) - R.Y(d.x); });
      for (i = 0; i < order.length; i++) this.drawUnit(c, order[i]);
      for (i = 0; i < b.projs.length; i++) this.drawProj(c, b.projs[i]);
      this.drawFx(c);
      for (i = 0; i < this.parts.length; i++) {
        var p = this.parts[i], a = Math.max(0, p.life / p.max);
        c.globalAlpha = a; c.fillStyle = p.col; circ(c, p.x, p.y, p.shrink ? p.size * (0.4 + a * 0.6) : p.size);
      }
      c.globalAlpha = 1;
      for (i = 0; i < this.texts.length; i++) {
        var tx = this.texts[i], ta = Math.min(1, tx.t / 0.35);
        c.globalAlpha = ta; c.font = 'bold ' + tx.size + 'px system-ui'; c.textAlign = 'center';
        c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.65)'; c.strokeText(tx.s, tx.x, tx.y);
        c.fillStyle = tx.col; c.fillText(tx.s, tx.x, tx.y);
      }
      c.globalAlpha = 1;
      c.restore();

      // diyar atmosferi: kar / kum tozu
      var amode = THEMES[this.theme].amb;
      if (amode !== 'none') {
        c.fillStyle = amode === 'snow' ? 'rgba(255,255,255,.85)' : 'rgba(240,200,130,.35)';
        for (i = 0; i < this.amb.length; i++) {
          var am = this.amb[i];
          if (amode === 'snow') { am.y += am.v * dt; am.x += Math.sin(this.time + am.ph) * 14 * dt - 6 * dt; circ(c, am.x, am.y, am.r); }
          else { am.x += (am.v * 4) * dt; am.y += Math.sin(this.time * 0.7 + am.ph) * 6 * dt; c.fillRect(am.x, am.y, 14 + am.r * 8, 1.6); }
          if (am.y > H) { am.y = -4; am.x = Math.random() * W; }
          if (am.x > W + 40) { am.x = -40; am.y = Math.random() * H; } else if (am.x < -10) am.x = W + 4;
        }
      }
      // kukreme: altin kenar parlamasi
      if (b.buffed()) {
        var pulse = 0.2 + 0.08 * Math.sin(this.time * 8);
        var vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62);
        vg.addColorStop(0, 'rgba(255,210,80,0)'); vg.addColorStop(1, 'rgba(255,200,60,' + pulse + ')');
        c.fillStyle = vg; c.fillRect(0, 0, W, H);
      }
      if (this.banner) {
        var bn = this.banner, ba = Math.min(1, bn.t / 0.4);
        c.save(); c.globalAlpha = ba; c.translate(W / 2, this.eY + 150);
        c.font = '900 52px system-ui'; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = 'rgba(0,0,0,.7)';
        c.strokeText(bn.text, 0, 0); c.fillStyle = bn.col; c.fillText(bn.text, 0, 0); c.restore();
      }
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

    drawFx: function (c) {
      for (var i = 0; i < this.fx.length; i++) {
        var f = this.fx[i], k = 1 - f.t / f.max;
        if (f.k === 'ring') {
          c.globalAlpha = 1 - k; c.strokeStyle = f.col; c.lineWidth = 4; c.beginPath(); c.arc(f.x, f.y, f.r * (0.4 + k * 0.8), 0, TAU); c.stroke();
          c.fillStyle = f.col; c.globalAlpha = (1 - k) * 0.25; c.fill();
        } else if (f.k === 'wave') {
          c.globalAlpha = (1 - k) * 0.8; c.strokeStyle = f.col; c.lineWidth = 10 * (1 - k) + 2; c.beginPath(); c.arc(f.x, f.y, 40 + k * 1100, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        } else if (f.k === 'lane') {
          c.globalAlpha = (1 - k) * 0.35; c.fillStyle = f.col; c.fillRect(this.ox + f.lane * 240, this.eY, 240, this.pY - this.eY);
        } else if (f.k === 'bolt') {
          c.globalAlpha = Math.min(1, f.t / 0.2); c.strokeStyle = '#d0ebff'; c.lineWidth = 5; c.lineJoin = 'round';
          c.beginPath(); var x = f.x, y = f.y - 520;
          c.moveTo(x, y); var n = 9, step = (f.y - y) / n;
          for (var j = 1; j <= n; j++) { x = f.x + (j === n ? 0 : (hash(f.seed + j + Math.floor(this.time * 30)) - 0.5) * 46); y += step; c.lineTo(x, y); }
          c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
        } else if (f.k === 'arrow') {
          c.globalAlpha = 1; var ay = f.y1 + (f.y2 - f.y1) * k;
          line(c, f.x1, ay - 9, f.x1, ay + 3, 2.4, '#e9d8a6');
        }
      }
      c.globalAlpha = 1;
    },

    drawProj: function (c, p) {
      var x = this.laneX(p.lane) + (p.team === 0 ? 10 : -10), y = this.Y(p.x), d = p.team === 0 ? -1 : 1; // d: ekrandaki hareket yonu
      var tot = Math.max(1, Math.abs(p.tx - p.fromX)), prog = Math.min(1, Math.abs(p.x - p.fromX) / tot), h = Math.sin(prog * Math.PI);
      if (p.kind === 'arrow') {
        c.fillStyle = 'rgba(0,0,0,.25)'; ell(c, x + 4, y + 4, 2, 6);
        line(c, x, y - d * 10, x, y + d * 2, 2.4, '#f1e3b0');
        c.fillStyle = '#ddd'; circ(c, x, y + d * 4, 2);
      } else if (p.kind === 'bolt') {
        c.fillStyle = 'rgba(0,0,0,.2)'; ell(c, x + 3, y + 5, 7, 4);
        c.fillStyle = 'rgba(192,132,252,.4)'; circ(c, x, y - 10 * h, 12); c.fillStyle = '#e9d5ff'; circ(c, x, y - 10 * h, 6);
      } else {
        var ry = y - h * 46;
        c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, x + 2, y + 4, 9, 5);
        c.fillStyle = '#4a4a52'; circ(c, x, ry, 8 + h * 3); c.fillStyle = '#ff9f43'; circ(c, x - 2, ry - 2, 3);
      }
    },

    // ---- Kale (yatay sur, uc koridora uc kapi) --------------------------
    drawCastle: function (c, team) {
      var b = this.battle.base[team], pal = PAL[team], ox = this.ox, w = DW, h = 58;
      var y0 = team === 0 ? this.pY : this.eY - h; // sur seridinin ust kenari
      c.save();
      c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(ox + 8, y0 + (team === 0 ? 8 : -2), w - 16, h);
      var sg = c.createLinearGradient(0, y0, 0, y0 + h);
      sg.addColorStop(0, team === 0 ? '#b3b4c0' : '#8d8e9b'); sg.addColorStop(1, team === 0 ? '#8d8e9b' : '#b3b4c0');
      c.fillStyle = sg; c.fillRect(ox + 8, y0, w - 16, h);
      c.strokeStyle = 'rgba(60,60,80,.28)'; c.lineWidth = 1.5;
      for (var r = 1; r < 4; r++) { var yy = y0 + r * h / 4; c.beginPath(); c.moveTo(ox + 8, yy); c.lineTo(ox + w - 8, yy); c.stroke(); }
      // siperlikler (sahaya bakan kenar)
      c.fillStyle = '#9a9bab';
      for (var m = 0; m < 24; m++) { var mx = ox + 14 + m * 29; c.fillRect(mx, team === 0 ? y0 - 8 : y0 + h - 2, 17, 10); }
      // kuleler: iki uc + iki ara
      var towers = [ox + 4, ox + 240, ox + 480, ox + w - 4];
      for (var t = 0; t < towers.length; t++) {
        var tx = towers[t], tw = 60, th = 74, ty = team === 0 ? y0 - 12 : y0 - 4;
        var tg = c.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0);
        tg.addColorStop(0, '#6f7080'); tg.addColorStop(0.45, '#a3a4b3'); tg.addColorStop(1, '#6a6b7b');
        c.fillStyle = tg; rrect(c, tx - tw / 2, ty, tw, th, 10); c.fill();
        c.fillStyle = pal.dark; circ(c, tx, ty + th / 2, 22); c.fillStyle = pal.main; c.beginPath(); c.arc(tx, ty + th / 2, 20, Math.PI * 0.8, Math.PI * 1.8); c.lineTo(tx, ty + th / 2); c.fill();
        c.fillStyle = pal.trim; circ(c, tx, ty + th / 2, 5);
      }
      // kapilar (koridor merkezlerinde)
      for (var l = 0; l < 3; l++) {
        var gx = this.laneX(l), gw = 64;
        c.fillStyle = '#4a2f1a'; c.beginPath();
        if (team === 0) { c.moveTo(gx - gw / 2, y0 + h); c.lineTo(gx - gw / 2, y0 + 18); c.arc(gx, y0 + 18, gw / 2, Math.PI, 0); c.lineTo(gx + gw / 2, y0 + h); }
        else { c.moveTo(gx - gw / 2, y0); c.lineTo(gx - gw / 2, y0 + h - 18); c.arc(gx, y0 + h - 18, gw / 2, Math.PI, 0, true); c.lineTo(gx + gw / 2, y0); }
        c.fill(); line(c, gx, y0 + 6, gx, y0 + h - 6, 2, '#2c1a0c');
        if (team === 0 && this.selLane === l) { // secili koridor: altin parlama + ok
          c.fillStyle = 'rgba(255,210,77,.35)'; ell(c, gx, y0 - 4, 54, 14);
          var bob = Math.sin(this.time * 6) * 4; c.fillStyle = '#ffd24d'; c.beginPath(); c.moveTo(gx, y0 - 44 + bob); c.lineTo(gx + 15, y0 - 20 + bob); c.lineTo(gx - 15, y0 - 20 + bob); c.closePath(); c.fill();
          c.strokeStyle = '#7c4a00'; c.lineWidth = 2; c.stroke();
        }
      }
      // sancaklar
      var wave = Math.sin(this.time * 3 + team) * 4;
      [ox + 44, ox + w - 44].forEach(function (fx) {
        var fy = team === 0 ? y0 - 10 : y0 + h + 10, dir = team === 0 ? -1 : 1;
        line(c, fx, fy, fx, fy + dir * 46, 3, '#5b4a3a');
        c.fillStyle = pal.main; c.beginPath(); c.moveTo(fx, fy + dir * 46); c.lineTo(fx + 30 + wave, fy + dir * 36); c.lineTo(fx, fy + dir * 26); c.fill();
        c.fillStyle = pal.trim; circ(c, fx + 11, fy + dir * 36, 3.4);
      });
      // hasar
      var pct = b.hp / b.max;
      if (pct < 0.6) { c.strokeStyle = 'rgba(30,30,40,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(ox + 140, y0 + 6); c.lineTo(ox + 152, y0 + 26); c.lineTo(ox + 142, y0 + 46); c.stroke(); }
      if (pct < 0.3 && Math.random() < 0.25 && this.parts.length < 380) this.parts.push({ x: ox + 40 + Math.random() * 640, y: y0 + h / 2, vx: (Math.random() - 0.5) * 12, vy: team === 0 ? -30 : 30, life: 1, max: 1, size: 7, col: 'rgba(80,80,90,.7)', g: 0, shrink: false });
      if (b.flash > 0) { c.globalAlpha = b.flash * 3; c.fillStyle = '#fff'; c.fillRect(ox + 8, y0, w - 16, h); c.globalAlpha = 1; }
      // can cubugu
      var by = team === 0 ? y0 + h + 12 : y0 - 24, bw = 380, bx = ox + (w - bw) / 2;
      if (b.max < 1e8) {
        c.fillStyle = 'rgba(0,0,0,.6)'; rrect(c, bx - 3, by - 3, bw + 6, 20, 9); c.fill();
        c.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#ef4444'; rrect(c, bx, by, Math.max(0, bw * pct), 14, 7); c.fill();
        c.font = 'bold 13px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(Math.max(0, Math.ceil(b.hp)) + ' / ' + Math.ceil(b.max), ox + w / 2, by + 12);
      } else {
        c.fillStyle = 'rgba(0,0,0,.6)'; rrect(c, bx + bw / 2 - 90, by - 3, 180, 20, 9); c.fill();
        c.font = 'bold 13px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('Yıkılamaz kale', ox + w / 2, by + 12);
      }
      c.restore();
    },

    // ---- Birlikler (kuşbakışı; oyuncu yukari, dusman asagi bakar) ---------
    drawUnit: function (c, u) {
      var x = this.laneX(u.lane) + ((u.id * 37) % 5 - 2) * 13, y = this.Y(u.x), dirY = u.team === 0 ? 1 : -1, pal = PAL[u.team], s = u.boss ? 1.55 : 1;
      if (u.age < 0.3) { var q = u.age / 0.3; s *= 0.5 + 0.5 * (1 - Math.pow(1 - q, 3)); }
      var walk = u.moving ? Math.sin(u.age * u.speed * 0.12) : 0;
      var atk = u.atkAnim > 0 ? u.atkAnim / 0.25 : 0, lunge = atk > 0 ? Math.sin((1 - atk) * Math.PI) : 0;

      if (u.aura) { // sancak aurasi (yer duzleminde)
        c.save(); c.translate(x, y); c.fillStyle = 'rgba(255,210,77,' + (0.07 + 0.03 * Math.sin(this.time * 3)) + ')'; ell(c, 0, 0, 100, 160 * this.s); c.restore();
      }
      c.save();
      c.translate(x, y); c.scale(s, s * dirY);
      c.fillStyle = 'rgba(0,0,0,.28)'; ell(c, 3, 5, u.cls === 'cav' ? 15 : u.cls === 'cata' ? 22 : 13, u.cls === 'cav' ? 24 : u.cls === 'cata' ? 24 : 9);
      if (u.boss) { c.fillStyle = 'rgba(255,60,60,' + (0.18 + 0.08 * Math.sin(this.time * 6)) + ')'; circ(c, 0, 0, 32); }
      switch (u.cls) {
        case 'spear': this.dSpear(c, pal, walk, lunge); break;
        case 'archer': this.dArcher(c, pal, walk, atk); break;
        case 'cav': this.dCav(c, pal, walk, lunge, u.age); break;
        case 'knight': this.dKnight(c, pal, walk, lunge); break;
        case 'mage': this.dMage(c, pal, walk, atk); break;
        case 'cata': this.dCata(c, pal, u.x, atk); break;
        case 'healer': this.dHealer(c, pal, walk, atk, this.time); break;
        case 'banner': this.dBanner(c, pal, walk, lunge, this.time); break;
      }
      if (u.stunUntil > this.battle.t) { // donmus
        c.fillStyle = 'rgba(160,215,255,.55)'; rrect(c, -16, -30, 32, 52, 9); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, -22); c.lineTo(-4, -8); c.moveTo(9, -26); c.lineTo(4, -12); c.moveTo(-8, 10); c.lineTo(0, 0); c.stroke();
      }
      if (u.flash > 0) { c.globalAlpha = Math.min(0.7, u.flash * 6); c.fillStyle = '#fff'; ell(c, 0, -4, 15, 20); c.globalAlpha = 1; }
      if (u.wardUntil > this.battle.t) { c.strokeStyle = 'rgba(110,231,183,.85)'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -2, 24, 0, TAU); c.stroke(); }
      c.restore();
      if (u.boss) { c.fillStyle = '#ffd23f'; var cy = y - 62; c.beginPath(); c.moveTo(x - 9, cy + 10); c.lineTo(x - 9, cy); c.lineTo(x - 4, cy + 6); c.lineTo(x, cy - 3); c.lineTo(x + 4, cy + 6); c.lineTo(x + 9, cy); c.lineTo(x + 9, cy + 10); c.fill(); }

      if (u.hp < u.max) {
        var bw = 32 * Math.min(s, 1.4), by = y - 40 * s - (u.cls === 'cav' || u.cls === 'cata' ? 12 : 0), f = Math.max(0, u.hp / u.max);
        c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 6);
        c.fillStyle = u.team === 0 ? '#4ade80' : '#f87171'; c.fillRect(x - bw / 2, by, bw * f, 4);
      }
    },
    // yerel koordinat: orijin = birligin zemin noktasi, ON = -y
    feet: function (c, walk, col) {
      c.fillStyle = col; ell(c, -5, 7 + walk * 3, 3.6, 4.6); ell(c, 5, 7 - walk * 3, 3.6, 4.6);
    },
    dSpear: function (c, pal, walk, lunge) {
      this.feet(c, walk, '#3a3a4a');
      var ext = lunge * 12;
      line(c, 10, 8, 10, -34 - ext, 2.8, '#7a5a35');
      c.fillStyle = '#e5e7eb'; c.beginPath(); c.moveTo(10, -46 - ext); c.lineTo(14, -33 - ext); c.lineTo(6, -33 - ext); c.fill();
      c.fillStyle = pal.main; ell(c, 0, 1, 11, 9); c.fillStyle = pal.trim; c.fillRect(-11, 0, 22, 2.4);
      c.fillStyle = pal.dark; circ(c, -12, -3, 8); c.fillStyle = pal.trim; circ(c, -12, -3, 3);
      c.fillStyle = '#9ca3af'; circ(c, 0, -8, 7); c.fillStyle = pal.main; circ(c, 0, -12, 2.6);
    },
    dArcher: function (c, pal, walk, atk) {
      this.feet(c, walk, '#3d3322');
      c.fillStyle = '#7a5a35'; c.fillRect(2, 2, 5, 12); c.fillStyle = '#e9d8a6'; c.fillRect(3, 0, 1.4, 4); c.fillRect(5.4, 0, 1.4, 4); // sadak
      c.fillStyle = pal.dark; ell(c, 0, 1, 9, 8);
      var pull = atk > 0 ? (1 - atk) * 8 : 3;
      c.strokeStyle = '#7a5a35'; c.lineWidth = 2.8; c.beginPath(); c.arc(0, -4, 17, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      var ax = 17 * Math.cos(Math.PI * 1.15), ay = -4 + 17 * Math.sin(Math.PI * 1.15), bx = 17 * Math.cos(Math.PI * 1.85);
      c.strokeStyle = '#eee'; c.lineWidth = 1; c.beginPath(); c.moveTo(ax, ay); c.lineTo(0, -4 + pull * 0.6 - 2); c.lineTo(bx, ay); c.stroke();
      if (atk === 0 || atk < 0.6) line(c, 0, -2 + pull * 0.4, 0, -24, 1.6, '#e9d8a6');
      c.fillStyle = pal.main; circ(c, 0, -7, 6.4); c.fillStyle = pal.dark; circ(c, 0, -7, 2.4);
    },
    dCav: function (c, pal, walk, lunge, age) {
      var g = Math.sin(age * 14) * (walk !== 0 ? 1 : 0.1);
      c.fillStyle = '#6b4423';
      [[-9, -10], [9, -10], [-9, 12], [9, 12]].forEach(function (L, i) { ell(c, L[0], L[1] + g * (i % 2 ? 5 : -5), 3, 6); });
      c.fillStyle = '#9a6a3a'; ell(c, 0, 2, 11, 21);
      c.fillStyle = '#9a6a3a'; ell(c, 0, -22, 5.6, 9); c.fillStyle = '#2b1a0c'; ell(c, 0, -17, 2.4, 8);
      c.fillStyle = '#2b1a0c'; c.beginPath(); c.moveTo(0, 22); c.lineTo(-4, 31); c.lineTo(4, 31); c.fill();
      c.fillStyle = pal.main; rrect(c, -10, -4, 20, 14, 4); c.fill(); c.fillStyle = pal.trim; c.fillRect(-10, 2, 20, 2.2);
      var ext = lunge * 10;
      line(c, 8, 8, 8, -44 - ext, 2.8, '#7a5a35');
      c.fillStyle = '#e5e7eb'; c.beginPath(); c.moveTo(8, -56 - ext); c.lineTo(12, -43 - ext); c.lineTo(4, -43 - ext); c.fill();
      c.fillStyle = pal.main; c.beginPath(); c.moveTo(8, -40 - ext); c.lineTo(20, -35 - ext); c.lineTo(8, -30 - ext); c.fill();
      c.fillStyle = pal.dark; ell(c, 0, 0, 8, 6.6); c.fillStyle = '#9ca3af'; circ(c, 0, -5, 6); c.fillStyle = pal.main; circ(c, 0, -9, 2.4);
    },
    dKnight: function (c, pal, walk, lunge) {
      this.feet(c, walk, '#4b5563');
      var sw = lunge * 12;
      line(c, 14, 6, 14, -32 - sw, 3.4, '#d1d5db'); line(c, 9, -2, 19, -2, 3, '#a16207');
      c.fillStyle = '#9aa3b2'; ell(c, 0, 1, 15, 11);
      c.fillStyle = '#c0c7d4'; circ(c, -14, -1, 6.4); circ(c, 14, -1, 6.4);
      c.fillStyle = pal.dark; rrect(c, -27, -18, 15, 28, 6); c.fill(); c.fillStyle = pal.trim; c.fillRect(-20.4, -16, 2.2, 24); c.fillRect(-25, -6, 11, 2.4);
      c.fillStyle = '#b6bdca'; circ(c, 0, -9, 8); c.fillStyle = '#1f2937'; c.fillRect(-5, -16, 10, 2.4);
      c.fillStyle = pal.main; c.beginPath(); c.arc(0, -4, 8, Math.PI * 0.2, Math.PI * 0.8); c.lineTo(0, -4); c.fill();
    },
    dMage: function (c, pal, walk, atk) {
      c.fillStyle = pal.dark; circ(c, 0, 1, 12.5); c.fillStyle = pal.main; circ(c, 0, 1, 8.5);
      line(c, 14, 8, 14, -30, 2.8, '#7a5a35');
      var gl = 5 + (atk > 0 ? 6 * atk : 0) + Math.sin(walk * 9 + 1) * 0.5;
      c.fillStyle = 'rgba(216,180,254,.4)'; circ(c, 14, -33, gl + 5); c.fillStyle = '#e9d5ff'; circ(c, 14, -33, gl); c.fillStyle = '#fff'; circ(c, 13, -34, 2);
      c.fillStyle = pal.dark; circ(c, 0, -5, 8.4); c.fillStyle = pal.trim; circ(c, 0, -5, 3.2); c.fillStyle = SKIN; circ(c, 0, 5, 3.2);
    },
    dCata: function (c, pal, ux, atk) {
      var rot = (ux * 0.07) % TAU;
      c.fillStyle = '#7a5a35'; rrect(c, -17, -22, 34, 48, 5); c.fill();
      c.fillStyle = '#5b4426'; c.fillRect(-12, -14, 24, 5); c.fillRect(-12, 6, 24, 5);
      [[-21, -6], [21, -6], [-21, 14], [21, 14]].forEach(function (w) {
        c.fillStyle = '#4a3720'; rrect(c, w[0] - 4, w[1] - 8, 8, 16, 3); c.fill();
        c.strokeStyle = '#7a5a35'; c.lineWidth = 1.4; for (var k = 0; k < 3; k++) { var yy = w[1] - 6 + ((k * 5 + Math.floor(rot * 4)) % 12); c.beginPath(); c.moveTo(w[0] - 4, yy); c.lineTo(w[0] + 4, yy); c.stroke(); }
      });
      var ang = (atk > 0 ? (1 - atk) * Math.PI : 0); // geride bekler, atis aninda one savrulur
      c.save(); c.rotate(-ang * 0.35);
      line(c, 0, 18, 0, -34, 4.4, '#8a6a40'); c.fillStyle = '#4a3720'; circ(c, 0, -36, 7); if (atk === 0) { c.fillStyle = '#4a4a52'; circ(c, 0, -37, 5.4); }
      c.restore();
      c.fillStyle = pal.main; c.beginPath(); c.moveTo(-17, 24); c.lineTo(-30, 18); c.lineTo(-17, 12); c.fill();
    },
    dHealer: function (c, pal, walk, atk, time) {
      this.feet(c, walk, '#cbd5e1');
      c.fillStyle = '#f1f5f9'; ell(c, 0, 1, 10.5, 9);
      c.fillStyle = '#16a34a'; c.fillRect(-1.8, 1, 3.6, 10); c.fillRect(-5.4, 4.6, 10.8, 3.6);
      line(c, 12, 8, 12, -28, 2.6, '#8a6a40');
      var gl = 4.5 + (atk > 0 ? 5 * atk : 0) + Math.sin(time * 5) * 0.6;
      c.fillStyle = 'rgba(110,231,183,.4)'; circ(c, 12, -31, gl + 5); c.fillStyle = '#a7f3d0'; circ(c, 12, -31, gl);
      c.fillStyle = '#f1f5f9'; circ(c, 0, -7, 7); c.fillStyle = '#16a34a'; c.fillRect(-1.1, -11, 2.2, 7); c.fillRect(-3.6, -8.8, 7.2, 2.2);
    },
    dBanner: function (c, pal, walk, lunge, time) {
      this.feet(c, walk, '#3a3a4a');
      var w = Math.sin(time * 4) * 4;
      line(c, 0, 8, 0, -50, 3, '#7a5a35');
      c.fillStyle = pal.main; c.beginPath(); c.moveTo(0, -50); c.lineTo(32 + w, -44); c.lineTo(26 + w * 0.6, -34); c.lineTo(32 + w, -24); c.lineTo(0, -22); c.closePath(); c.fill();
      c.fillStyle = pal.trim; circ(c, 15, -36, 5); c.fillStyle = pal.dark; circ(c, 15, -36, 2.2);
      c.fillStyle = pal.main; ell(c, -1, 2, 11, 9); c.fillStyle = pal.trim; c.fillRect(-12, 1, 23, 2.4);
      c.fillStyle = '#9ca3af'; circ(c, -1, -6, 6.6);
      line(c, 10, 6, 10, -10 - lunge * 8, 2.4, '#d1d5db');
    }
  };
})(globalThis.Z = globalThis.Z || {});
