// Zafarion - canvas cizimi: sahne, birlikler, kaleler, efektler (tum grafikler kodla cizilir, dis dosya yok)
(function (Z) {
  'use strict';
  var C = Z.C, TAU = Math.PI * 2;
  var PAL = [
    { main: '#3b82f6', dark: '#1e3a8a', light: '#93c5fd', trim: '#fbbf24' },
    { main: '#dc2626', dark: '#7f1d1d', light: '#fca5a5', trim: '#9ca3af' }
  ];
  var SKIN = '#f2c9a0';

  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function line(c, x1, y1, x2, y2, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function hash(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

  var R = Z.Render = {
    canvas: null, ctx: null, W: 1280, H: 720, ox: 0, oy: 0, scale: 1, dpr: 1, bg: null,
    battle: null, parts: [], texts: [], fx: [], shake: 0, time: 0, banner: null,
    selLane: 1, dragLane: -1, active: false,

    init: function (canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); },

    // stageW/H: mantiksal sahne boyutu, scale: mantiksal -> css piksel
    resize: function (stageW, stageH, scale) {
      this.W = stageW; this.H = stageH; this.scale = scale;
      this.dpr = Math.min(globalThis.devicePixelRatio || 1, 2.5);
      this.ox = (stageW - C.W) / 2; this.oy = (stageH - C.H) / 2;
      var pw = Math.round(stageW * scale * this.dpr), ph = Math.round(stageH * scale * this.dpr);
      this.canvas.width = pw; this.canvas.height = ph;
      this.canvas.style.width = Math.round(stageW) + 'px'; this.canvas.style.height = Math.round(stageH) + 'px';
      this.px = pw / stageW;
      this.buildBg();
    },

    start: function (battle) {
      this.battle = battle; this.parts = []; this.texts = []; this.fx = []; this.shake = 0; this.banner = null;
      this.selLane = 1; this.dragLane = -1; this.active = true;
    },
    stop: function () { this.active = false; this.battle = null; },

    // ekran (mantiksal sahne) koordinatindan koridor bul
    laneAt: function (sx, sy) {
      var wy = sy - this.oy, best = -1, bd = 60;
      for (var i = 0; i < 3; i++) { var d = Math.abs(wy - C.LANE_Y[i]); if (d < bd) { bd = d; best = i; } }
      return best;
    },

    // ---- Arka plan (bir kez cizilir) ------------------------------------
    buildBg: function () {
      var c = document.createElement('canvas'); c.width = this.canvas.width; c.height = this.canvas.height;
      var g = c.getContext('2d'), W = this.W, H = this.H, oy = this.oy, ox = this.ox, i;
      g.setTransform(this.px, 0, 0, this.px, 0, 0);
      var sky = g.createLinearGradient(0, 0, 0, oy + 230);
      sky.addColorStop(0, '#16224f'); sky.addColorStop(0.55, '#7a4a7a'); sky.addColorStop(1, '#f0a35e');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // gunes
      var sg = g.createRadialGradient(W * 0.72, oy + 150, 4, W * 0.72, oy + 150, 120);
      sg.addColorStop(0, 'rgba(255,240,190,1)'); sg.addColorStop(0.25, 'rgba(255,200,120,.55)'); sg.addColorStop(1, 'rgba(255,160,90,0)');
      g.fillStyle = sg; g.fillRect(0, 0, W, oy + 300);
      // yildizlar
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (i = 0; i < 40; i++) { circ(g, hash(i) * W, hash(i + 50) * (oy + 110), hash(i + 9) * 1.2 + 0.4); }
      // daglar (2 katman)
      function mount(col, base, amp, seed, step) {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, base + 80);
        for (var x = 0; x <= W + step; x += step) g.lineTo(x, base - amp * (0.35 + hash(x / step + seed) * 0.65));
        g.lineTo(W, base + 80); g.closePath(); g.fill();
      }
      mount('#4a3a73', oy + 205, 120, 3, 90);
      mount('#2f4a5e', oy + 225, 70, 11, 60);
      // zemin
      var gr = g.createLinearGradient(0, oy + 205, 0, H);
      gr.addColorStop(0, '#5b8a3c'); gr.addColorStop(0.5, '#3f6b2d'); gr.addColorStop(1, '#25421f');
      g.fillStyle = gr; g.fillRect(0, oy + 205, W, H - oy - 205);
      // agaclar (arka sira)
      for (i = 0; i < Math.ceil(W / 46); i++) {
        var tx = i * 46 + hash(i) * 20, ty = oy + 214 + hash(i + 3) * 8, th = 28 + hash(i + 7) * 20;
        g.fillStyle = '#1d3a2a'; g.beginPath(); g.moveTo(tx, ty - th); g.lineTo(tx + 13, ty); g.lineTo(tx - 13, ty); g.fill();
        g.fillStyle = '#2b4f36'; g.beginPath(); g.moveTo(tx, ty - th * 0.75); g.lineTo(tx + 10, ty - th * 0.1); g.lineTo(tx - 10, ty - th * 0.1); g.fill();
      }
      // koridor seritleri
      for (i = 0; i < 3; i++) {
        var ly = oy + C.LANE_Y[i];
        var lg = g.createLinearGradient(0, ly - 46, 0, ly + 28);
        lg.addColorStop(0, 'rgba(255,230,160,.04)'); lg.addColorStop(0.5, 'rgba(255,230,160,.17)'); lg.addColorStop(1, 'rgba(255,230,160,.03)');
        g.fillStyle = lg; g.fillRect(0, ly - 46, W, 74);
        g.strokeStyle = 'rgba(255,240,200,.12)'; g.lineWidth = 2; g.setLineDash([14, 14]);
        g.beginPath(); g.moveTo(0, ly + 6); g.lineTo(W, ly + 6); g.stroke(); g.setLineDash([]);
        for (var k = 0; k < 26; k++) { // ot demetleri
          var gx = hash(k * 3 + i * 91) * W, gy = ly - 40 + hash(k + i * 17) * 66;
          line(g, gx, gy, gx - 3, gy - 7, 1.6, 'rgba(30,70,25,.7)'); line(g, gx, gy, gx + 3, gy - 6, 1.6, 'rgba(30,70,25,.7)');
        }
      }
      // alt kisim (kartlarin arkasi) karart
      var dk = g.createLinearGradient(0, oy + 540, 0, H);
      dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(1, 'rgba(0,0,0,.5)');
      g.fillStyle = dk; g.fillRect(0, oy + 540, W, H - oy - 540);
      this.bg = c;
    },

    // ---- Olaylar -> efektler + ses --------------------------------------
    handle: function (events) {
      var A = Z.Audio, i, e, y;
      for (i = 0; i < events.length; i++) {
        e = events[i];
        y = e.lane !== undefined ? C.LANE_Y[e.lane] : 0;
        switch (e.type) {
          case 'spawn':
            this.puff(e.unit.x, C.LANE_Y[e.unit.lane] - 4, 6, '#d9c9a0');
            if (e.unit.team === 0) A.spawn();
            break;
          case 'hit':
            this.sparks(e.x, y - 24, e.strong ? 6 : 3, e.strong ? '#ffd166' : '#ffffff');
            if (this.texts.length < 26 && (e.strong || e.dmg > 40)) this.text(e.x, y - 50, String(Math.round(e.dmg)), e.team === 1 ? (e.strong ? '#ffd166' : '#ffffff') : '#ff8b8b', e.strong ? 22 : 17);
            A.hit();
            break;
          case 'death':
            this.puff(e.x, y - 12, e.boss ? 22 : 9, e.team === 0 ? '#9ec5ff' : '#ff9d9d');
            A.death();
            if (e.boss) { this.shake = 14; A.boom(); }
            break;
          case 'coin':
            this.text(e.x, y - 62, '+' + e.v, '#ffd23f', 20); A.coin();
            break;
          case 'shoot': A.shoot(); break;
          case 'tower': this.fx.push({ k: 'arrow', x1: e.team === 0 ? C.PF - 30 : C.EF + 30, y1: 240, x2: e.x, y2: y - 26, t: 0.18, max: 0.18 }); A.shoot(); break;
          case 'boom':
            this.fx.push({ k: 'ring', x: e.x, y: y - 8, r: e.r, t: 0.4, max: 0.4, col: e.cls === 'mage' ? '#c084fc' : '#ffa94d' });
            this.sparks(e.x, y - 14, 10, e.cls === 'mage' ? '#d8b4fe' : '#ffb347');
            this.shake = Math.max(this.shake, e.cls === 'cata' ? 5 : 2); A.boom();
            break;
          case 'charge': this.fx.push({ k: 'ring', x: e.x, y: y - 10, r: 38, t: 0.3, max: 0.3, col: '#ffe08a' }); break;
          case 'baseHit':
            this.shake = Math.max(this.shake, e.team === 0 ? 8 : 3);
            this.puff(e.team === 0 ? C.PF - 30 : C.EF + 30, 330 + (Math.random() - 0.5) * 160, 4, '#cfc6b4');
            A.baseHit(); if (e.team === 0) A.vibrate(40);
            break;
          case 'skill':
            if (e.kind === 'roar') { this.fx.push({ k: 'wave', x: C.PF - 40, y: 370, t: 0.9, max: 0.9, col: '#ffd166' }); this.banner = { text: 'ZAFER NARAASI!', col: '#ffd166', t: 1.4 }; }
            else if (e.kind === 'ward') { this.fx.push({ k: 'lane', lane: e.lane, t: 0.9, max: 0.9, col: '#6ee7b7' }); }
            else if (e.kind === 'bolt') { this.shake = Math.max(this.shake, 6); }
            A.skill(e.kind); A.vibrate(25);
            break;
          case 'bolt': this.fx.push({ k: 'bolt', x: e.x, y: y - 10, t: 0.4, max: 0.4, seed: Math.random() * 99 }); this.sparks(e.x, y - 20, 8, '#a5d8ff'); break;
          case 'boss': this.banner = { text: 'PATRON GELİYOR!', col: '#ff6b6b', t: 1.8 }; this.shake = 10; A.boom(); break;
          case 'mine': this.text(130, 120, 'Maden Sv.' + e.level + '!', '#ffd23f', 24); A.click(); break;
          case 'win': A.win(); break;
          case 'lose': A.lose(); break;
        }
      }
    },
    puff: function (x, y, n, col) {
      for (var i = 0; i < n && this.parts.length < 400; i++) {
        var a = Math.random() * TAU, s = 20 + Math.random() * 50;
        this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5 - 20, life: 0.5 + Math.random() * 0.4, max: 0.9, size: 3 + Math.random() * 5, col: col, g: 20, shrink: true });
      }
    },
    sparks: function (x, y, n, col) {
      for (var i = 0; i < n && this.parts.length < 400; i++) {
        var a = Math.random() * TAU, s = 60 + Math.random() * 120;
        this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50, life: 0.25 + Math.random() * 0.25, max: 0.5, size: 1.6 + Math.random() * 1.8, col: col, g: 380, shrink: true });
      }
    },
    text: function (x, y, str, col, size) { this.texts.push({ x: x + (Math.random() - 0.5) * 16, y: y, t: 0.9, max: 0.9, s: str, col: col, size: size || 18 }); },

    // ---- Cizim ------------------------------------------------------------
    frame: function (dt) {
      if (!this.active || !this.battle) return;
      this.time += dt;
      var b = this.battle, c = this.ctx, i;
      this.handle(b.drain());
      this.updateFx(dt);

      c.setTransform(this.px, 0, 0, this.px, 0, 0);
      c.drawImage(this.bg, 0, 0, this.W, this.H);
      // bulutlar
      c.fillStyle = 'rgba(255,255,255,.16)';
      for (i = 0; i < 5; i++) {
        var cx = ((i * 330 + this.time * (6 + i * 2)) % (this.W + 300)) - 150, cy = this.oy + 40 + i * 22;
        ell(c, cx, cy, 70, 14); ell(c, cx + 40, cy - 8, 44, 12);
      }
      c.save();
      var sx = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
      c.translate(this.ox + sx, this.oy + sy);

      // secili / surukle koridor vurgusu
      for (i = 0; i < 3; i++) {
        var on = (this.dragLane === i), sel = (this.selLane === i && this.dragLane < 0);
        if (on || sel) {
          c.fillStyle = on ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)';
          c.fillRect(-this.ox, C.LANE_Y[i] - 46, this.W, 74);
          if (on) { c.fillStyle = '#fff'; c.font = 'bold 22px system-ui'; c.textAlign = 'left'; c.fillText('▶ BURAYA BIRAK', C.PF + 20, C.LANE_Y[i] - 52); }
        }
      }
      this.drawCastle(c, 0); this.drawCastle(c, 1);

      // birlikler: koridora sonra yaklasim sirasina gore
      var order = b.units.slice().sort(function (a, d) { return a.lane - d.lane || a.x - d.x; });
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

      // kukreme: altin kenar parlamasi
      if (b.buffed()) {
        var pulse = 0.18 + 0.08 * Math.sin(this.time * 8);
        var vg = c.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.35, this.W / 2, this.H / 2, this.W * 0.6);
        vg.addColorStop(0, 'rgba(255,210,80,0)'); vg.addColorStop(1, 'rgba(255,200,60,' + pulse + ')');
        c.fillStyle = vg; c.fillRect(0, 0, this.W, this.H);
      }
      if (this.banner) {
        var bn = this.banner, ba = Math.min(1, bn.t / 0.4), sc = 1 + (1 - Math.min(1, (1.6 - bn.t) * 4)) * 0.0;
        c.save(); c.globalAlpha = ba; c.translate(this.W / 2, this.oy + 200); c.scale(sc, sc);
        c.font = '900 56px system-ui'; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = 'rgba(0,0,0,.7)';
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
          c.globalAlpha = 1 - k; c.strokeStyle = f.col; c.lineWidth = 4; c.beginPath(); c.ellipse(f.x, f.y, f.r * (0.4 + k * 0.8), f.r * (0.4 + k * 0.8) * 0.45, 0, 0, TAU); c.stroke();
          c.fillStyle = f.col; c.globalAlpha = (1 - k) * 0.25; c.fill();
        } else if (f.k === 'wave') {
          c.globalAlpha = (1 - k) * 0.8; c.strokeStyle = f.col; c.lineWidth = 10 * (1 - k) + 2; c.beginPath(); c.arc(f.x, f.y, 40 + k * 900, -0.9, 0.9); c.stroke();
        } else if (f.k === 'lane') {
          c.globalAlpha = (1 - k) * 0.35; c.fillStyle = f.col; c.fillRect(-this.ox, C.LANE_Y[f.lane] - 46, this.W, 74);
        } else if (f.k === 'bolt') {
          c.globalAlpha = Math.min(1, f.t / 0.2); c.strokeStyle = '#d0ebff'; c.lineWidth = 5; c.lineJoin = 'round';
          c.beginPath(); var x = f.x, y = -this.oy; c.moveTo(x, y);
          var n = 9, step = (f.y - y) / n;
          for (var j = 1; j <= n; j++) { x = f.x + (j === n ? 0 : (hash(f.seed + j + Math.floor(this.time * 30)) - 0.5) * 50); y += step; c.lineTo(x, y); }
          c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
        } else if (f.k === 'arrow') {
          c.globalAlpha = 1; var q = k, ax = f.x1 + (f.x2 - f.x1) * q, ay = f.y1 + (f.y2 - f.y1) * q - Math.sin(q * Math.PI) * 30;
          line(c, ax - 8, ay + 2, ax + 3, ay - 1, 2, '#e9d8a6');
        }
      }
      c.globalAlpha = 1;
    },

    drawProj: function (c, p) {
      var y = C.LANE_Y[p.lane] - 28, dir = p.team === 0 ? 1 : -1;
      var tot = Math.max(1, Math.abs(p.tx - p.fromX)), prog = Math.min(1, Math.abs(p.x - p.fromX) / tot);
      if (p.kind === 'arrow') {
        var ay = y - Math.sin(prog * Math.PI) * 22;
        line(c, p.x - 9 * dir, ay + 1, p.x + 4 * dir, ay - 1, 2.2, '#f1e3b0'); c.fillStyle = '#ddd'; circ(c, p.x + 5 * dir, ay - 1, 1.8);
      } else if (p.kind === 'bolt') {
        c.fillStyle = 'rgba(192,132,252,.4)'; circ(c, p.x, y, 11); c.fillStyle = '#e9d5ff'; circ(c, p.x, y, 5.5);
      } else {
        var ry = y - Math.sin(prog * Math.PI) * 120;
        c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, p.x, C.LANE_Y[p.lane] + 2, 8, 3);
        c.fillStyle = '#4a4a52'; circ(c, p.x, ry, 8); c.fillStyle = '#ff9f43'; circ(c, p.x - 3 * dir, ry - 2, 3);
      }
    },

    // ---- Kale -------------------------------------------------------------
    drawCastle: function (c, team) {
      var b = this.battle.base[team], pal = PAL[team], x0 = team === 0 ? 8 : 1138, w = 134, top = 196, bot = 505;
      c.save();
      var sg = c.createLinearGradient(x0, 0, x0 + w, 0);
      sg.addColorStop(0, '#8d8e9b'); sg.addColorStop(0.5, '#b3b4c0'); sg.addColorStop(1, '#8d8e9b');
      c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, x0 + w / 2, bot + 4, w * 0.62, 12);
      c.fillStyle = sg; c.fillRect(x0 + 14, top + 26, w - 28, bot - top - 26);
      // taslar
      c.strokeStyle = 'rgba(60,60,80,.28)'; c.lineWidth = 1.5;
      for (var r = 0; r < 9; r++) { var yy = top + 40 + r * 32; c.beginPath(); c.moveTo(x0 + 14, yy); c.lineTo(x0 + w - 14, yy); c.stroke(); }
      // kuleler (ust ve alt): koyu govde + takim renginde konik cati
      var tw = 66, th = 74, tx0 = x0 + (w - tw) / 2;
      [top + 8, bot - th + 4].forEach(function (ty) {
        var tg = c.createLinearGradient(tx0, 0, tx0 + tw, 0);
        tg.addColorStop(0, '#6f7080'); tg.addColorStop(0.45, '#a3a4b3'); tg.addColorStop(1, '#6a6b7b');
        c.fillStyle = tg; c.fillRect(tx0, ty, tw, th);
        c.fillStyle = pal.dark; c.beginPath(); c.moveTo(tx0 - 8, ty + 2); c.lineTo(tx0 + tw / 2, ty - 38); c.lineTo(tx0 + tw + 8, ty + 2); c.closePath(); c.fill();
        c.fillStyle = pal.main; c.beginPath(); c.moveTo(tx0 + 2, ty + 2); c.lineTo(tx0 + tw / 2, ty - 34); c.lineTo(tx0 + tw / 2, ty + 2); c.closePath(); c.fill();
        c.fillStyle = '#23263a'; rrect(c, x0 + w / 2 - 6, ty + 26, 12, 22, 5); c.fill();
        c.strokeStyle = 'rgba(40,40,60,.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tx0, ty + th - 22); c.lineTo(tx0 + tw, ty + th - 22); c.stroke();
      });
      // ana kapi
      c.fillStyle = '#4a2f1a'; c.beginPath(); c.moveTo(x0 + w / 2 - 20, bot); c.lineTo(x0 + w / 2 - 20, bot - 56); c.arc(x0 + w / 2, bot - 56, 20, Math.PI, 0); c.lineTo(x0 + w / 2 + 20, bot); c.fill();
      line(c, x0 + w / 2, bot - 76, x0 + w / 2, bot, 2, '#2c1a0c');
      // sancak
      var bx = team === 0 ? x0 + w - 6 : x0 + 6, wave = Math.sin(this.time * 3 + team) * 4;
      line(c, bx, top - 58, bx, top + 20, 3, '#5b4a3a');
      c.fillStyle = pal.main; c.beginPath(); c.moveTo(bx, top - 56); c.lineTo(bx + (team === 0 ? 34 : -34) + wave, top - 46); c.lineTo(bx, top - 34); c.fill();
      c.fillStyle = pal.trim; circ(c, bx + (team === 0 ? 12 : -12), top - 46, 4);
      // hasar
      var pct = b.hp / b.max;
      if (pct < 0.6) { c.strokeStyle = 'rgba(30,30,40,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 40, top + 90); c.lineTo(x0 + 55, top + 130); c.lineTo(x0 + 46, top + 160); c.stroke(); }
      if (pct < 0.3 && Math.random() < 0.25 && this.parts.length < 380) this.parts.push({ x: x0 + 30 + Math.random() * 70, y: top + 40, vx: (Math.random() - 0.5) * 12, vy: -30, life: 1, max: 1, size: 7, col: 'rgba(80,80,90,.7)', g: -4, shrink: false });
      if (b.flash > 0) { c.globalAlpha = b.flash * 3; c.fillStyle = '#fff'; c.fillRect(x0 + 14, top, w - 28, bot - top); c.globalAlpha = 1; }
      // can cubugu
      if (b.max < 1e8) {
        var bw = 120, bxx = x0 + (w - bw) / 2, byy = top - 82;
        c.fillStyle = 'rgba(0,0,0,.55)'; rrect(c, bxx - 2, byy - 2, bw + 4, 14, 6); c.fill();
        c.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#ef4444'; rrect(c, bxx, byy, Math.max(0, bw * pct), 10, 5); c.fill();
      } else {
        c.fillStyle = 'rgba(0,0,0,.55)'; c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('♾', x0 + w / 2, top - 70);
      }
      c.restore();
    },

    // ---- Birlikler --------------------------------------------------------
    drawUnit: function (c, u) {
      var y = C.LANE_Y[u.lane], dir = u.team === 0 ? 1 : -1, pal = PAL[u.team], s = u.boss ? 1.55 : 1;
      if (u.age < 0.3) { var q = u.age / 0.3; s *= 0.5 + 0.5 * (1 - Math.pow(1 - q, 3)); }
      var walk = u.moving ? Math.sin(u.age * u.speed * 0.12) : 0;
      var atk = u.atkAnim > 0 ? u.atkAnim / 0.25 : 0, lunge = atk > 0 ? Math.sin((1 - atk) * Math.PI) : 0;
      var h = 56;

      c.save();
      c.translate(u.x, y); c.scale(dir * s, s);
      c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, 0, 2, u.cls === 'cav' || u.cls === 'cata' ? 26 : 15, 5);
      if (u.boss) { c.fillStyle = 'rgba(255,60,60,' + (0.18 + 0.08 * Math.sin(this.time * 6)) + ')'; ell(c, 0, -22, 34, 34); }
      switch (u.cls) {
        case 'spear': this.dSpear(c, pal, walk, lunge); break;
        case 'archer': this.dArcher(c, pal, walk, atk); break;
        case 'cav': this.dCav(c, pal, walk, lunge, u.age); h = 70; break;
        case 'knight': this.dKnight(c, pal, walk, lunge); h = 62; break;
        case 'mage': this.dMage(c, pal, walk, atk); h = 64; break;
        case 'cata': this.dCata(c, pal, u.x, atk, u.moving); h = 52; break;
      }
      if (u.boss) { c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-8, -62); c.lineTo(-8, -72); c.lineTo(-3, -66); c.lineTo(0, -75); c.lineTo(3, -66); c.lineTo(8, -72); c.lineTo(8, -62); c.fill(); }
      if (u.flash > 0) { c.globalAlpha = Math.min(0.7, u.flash * 6); c.fillStyle = '#fff'; ell(c, 0, -26, 15, 28); c.globalAlpha = 1; }
      if (u.wardUntil > this.battle.t) { c.strokeStyle = 'rgba(110,231,183,.85)'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, -26, 24, 34, 0, 0, TAU); c.stroke(); }
      c.restore();

      if (u.hp < u.max) {
        var bw = 30 * Math.min(s, 1.4), by = y - (h + 8) * s, f = Math.max(0, u.hp / u.max);
        c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(u.x - bw / 2 - 1, by - 1, bw + 2, 6);
        c.fillStyle = u.team === 0 ? '#4ade80' : '#f87171'; c.fillRect(u.x - bw / 2, by, bw * f, 4);
      }
    },
    legs: function (c, walk, col) {
      c.fillStyle = col;
      c.save(); c.translate(-3, -9); c.rotate(walk * 0.5); c.fillRect(-2.5, 0, 5, 9); c.restore();
      c.save(); c.translate(3, -9); c.rotate(-walk * 0.5); c.fillRect(-2.5, 0, 5, 9); c.restore();
    },
    dSpear: function (c, pal, walk, lunge) {
      this.legs(c, walk, '#3a3a4a');
      c.fillStyle = pal.main; rrect(c, -7, -31, 14, 23, 4); c.fill();
      c.fillStyle = pal.trim; c.fillRect(-7, -17, 14, 3);
      c.fillStyle = SKIN; circ(c, 0, -37, 6.5);
      c.fillStyle = '#9ca3af'; c.beginPath(); c.arc(0, -38, 7, Math.PI, 0); c.fill(); c.fillRect(-7, -38, 14, 2);
      c.fillStyle = pal.main; c.fillRect(-1, -48, 2, 5);
      var ext = lunge * 14;
      line(c, -6, -21, 26 + ext, -27, 2.6, '#7a5a35');
      c.fillStyle = '#e5e7eb'; c.beginPath(); c.moveTo(26 + ext, -31); c.lineTo(36 + ext, -27); c.lineTo(26 + ext, -23); c.fill();
      c.fillStyle = pal.dark; circ(c, 4, -20, 7); c.fillStyle = pal.trim; circ(c, 4, -20, 2.6);
    },
    dArcher: function (c, pal, walk, atk) {
      this.legs(c, walk, '#3d3322');
      c.fillStyle = pal.dark; rrect(c, -6.5, -30, 13, 22, 4); c.fill();
      c.fillStyle = pal.main; c.fillRect(-6.5, -22, 13, 4);
      c.fillStyle = SKIN; circ(c, 0, -36, 6);
      c.fillStyle = pal.main; c.beginPath(); c.moveTo(-8, -33); c.lineTo(0, -48); c.lineTo(8, -33); c.lineTo(0, -37); c.fill();
      var pull = atk > 0 ? (1 - atk) * 7 : 3;
      c.strokeStyle = '#7a5a35'; c.lineWidth = 2.6; c.beginPath(); c.arc(12, -26, 13, -1.15, 1.15); c.stroke();
      c.strokeStyle = '#eee'; c.lineWidth = 1; c.beginPath(); c.moveTo(12 + 13 * Math.cos(-1.15), -26 + 13 * Math.sin(-1.15)); c.lineTo(12 - pull + 2, -26); c.lineTo(12 + 13 * Math.cos(1.15), -26 + 13 * Math.sin(1.15)); c.stroke();
      if (atk === 0 || atk < 0.6) line(c, 12 - pull + 2, -26, 26, -26, 1.6, '#e9d8a6');
    },
    dCav: function (c, pal, walk, lunge, age) {
      var g = Math.sin(age * 14) * (walk !== 0 ? 1 : 0.1);
      c.strokeStyle = '#6b4423'; c.lineWidth = 4; c.lineCap = 'round';
      [[-14, 0], [-8, 1], [10, 0], [16, 1]].forEach(function (L, i) {
        var a = g * (i % 2 ? 1 : -1) * 6; c.beginPath(); c.moveTo(L[0], -14); c.lineTo(L[0] + a, -1); c.stroke();
      });
      c.fillStyle = '#9a6a3a'; ell(c, 0, -22, 22, 11);
      c.fillStyle = '#9a6a3a'; c.beginPath(); c.moveTo(14, -28); c.lineTo(24, -42); c.lineTo(31, -37); c.lineTo(26, -26); c.fill();
      c.fillStyle = '#6b4423'; circ(c, 29, -37, 2.4); // goz yerine burun
      c.fillStyle = '#2b1a0c'; c.beginPath(); c.moveTo(21, -42); c.lineTo(15, -37); c.lineTo(18, -30); c.fill(); // yele
      c.fillStyle = pal.main; rrect(c, -10, -31, 20, 8, 3); c.fill(); c.fillStyle = pal.trim; c.fillRect(-10, -26, 20, 2);
      c.fillStyle = pal.dark; rrect(c, -4, -48, 10, 19, 4); c.fill();
      c.fillStyle = SKIN; circ(c, 2, -53, 5.8);
      c.fillStyle = '#9ca3af'; c.beginPath(); c.arc(2, -54, 6.4, Math.PI, 0); c.fill(); c.fillStyle = pal.main; c.fillRect(1, -64, 2, 5);
      var ext = lunge * 10;
      line(c, -2, -40, 32 + ext, -46, 2.6, '#7a5a35');
      c.fillStyle = '#e5e7eb'; c.beginPath(); c.moveTo(32 + ext, -50); c.lineTo(44 + ext, -46); c.lineTo(32 + ext, -42); c.fill();
      c.fillStyle = pal.main; c.beginPath(); c.moveTo(30 + ext, -48); c.lineTo(22 + ext, -52); c.lineTo(22 + ext, -42); c.fill();
    },
    dKnight: function (c, pal, walk, lunge) {
      this.legs(c, walk, '#4b5563');
      c.fillStyle = '#9aa3b2'; rrect(c, -10, -36, 20, 29, 5); c.fill();
      c.fillStyle = '#c0c7d4'; rrect(c, -12, -37, 8, 10, 4); c.fill(); rrect(c, 4, -37, 8, 10, 4); c.fill();
      c.fillStyle = pal.main; c.fillRect(-10, -20, 20, 4);
      c.fillStyle = '#b6bdca'; circ(c, 0, -43, 8);
      c.fillStyle = '#1f2937'; c.fillRect(-1, -46, 9, 3);
      c.fillStyle = pal.main; c.beginPath(); c.moveTo(-3, -50); c.quadraticCurveTo(-12, -62, -14, -48); c.quadraticCurveTo(-8, -50, -3, -48); c.fill();
      var sw = -0.9 + lunge * 1.9;
      c.save(); c.translate(-2, -26); c.rotate(sw); line(c, 0, 0, 0, -30, 3.2, '#d1d5db'); line(c, -5, -4, 5, -4, 3, '#a16207'); c.restore();
      c.fillStyle = pal.dark; rrect(c, 4, -36, 12, 25, 5); c.fill();
      c.fillStyle = pal.trim; c.fillRect(9, -34, 2, 21); c.fillRect(5, -26, 10, 2.4);
    },
    dMage: function (c, pal, walk, atk) {
      c.fillStyle = pal.dark; c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.lineTo(5, -34); c.lineTo(-5, -34); c.closePath(); c.fill();
      c.fillStyle = pal.main; c.beginPath(); c.moveTo(-8, -3); c.lineTo(8, -3); c.lineTo(5, -14); c.lineTo(-5, -14); c.closePath(); c.fill();
      c.fillStyle = SKIN; circ(c, 0, -39, 6);
      c.fillStyle = pal.dark; c.beginPath(); c.moveTo(-10, -42); c.lineTo(0, -64); c.lineTo(10, -42); c.closePath(); c.fill();
      c.fillStyle = pal.trim; c.fillRect(-9, -44, 18, 3);
      line(c, 12, -4, 14, -50, 2.8, '#7a5a35');
      var gl = 5 + (atk > 0 ? 6 * atk : 0) + Math.sin(walk * 9 + 1) * 0.5;
      c.fillStyle = 'rgba(216,180,254,.4)'; circ(c, 14, -53, gl + 5); c.fillStyle = '#e9d5ff'; circ(c, 14, -53, gl);
      c.fillStyle = '#fff'; circ(c, 13, -54, 2);
    },
    dCata: function (c, pal, ux, atk, moving) {
      var rot = (ux * 0.07) % TAU;
      c.fillStyle = '#7a5a35'; rrect(c, -24, -18, 48, 9, 3); c.fill();
      c.fillStyle = '#5b4426'; c.fillRect(-18, -26, 5, 9); c.fillRect(13, -26, 5, 9);
      [[-15, -7], [15, -7]].forEach(function (w) {
        c.fillStyle = '#4a3720'; circ(c, w[0], w[1], 8); c.fillStyle = '#7a5a35'; circ(c, w[0], w[1], 5.2);
        for (var k = 0; k < 4; k++) { var a = rot + k * Math.PI / 2; line(c, w[0], w[1], w[0] + Math.cos(a) * 7, w[1] + Math.sin(a) * 7, 1.5, '#4a3720'); }
      });
      var ang = -2.2 + (atk > 0 ? (1 - atk) * 1.9 : 0);
      c.save(); c.translate(0, -24); c.rotate(ang);
      line(c, -12, 0, 30, 0, 4, '#8a6a40'); c.fillStyle = '#4a3720'; circ(c, 32, 0, 6); if (atk === 0) { c.fillStyle = '#4a4a52'; circ(c, 32, -4, 5); }
      c.restore();
      c.fillStyle = pal.main; c.beginPath(); c.moveTo(-18, -35); c.lineTo(-30, -31); c.lineTo(-18, -27); c.fill(); line(c, -18, -36, -18, -24, 2, '#5b4a3a');
    }
  };
})(globalThis.Z = globalThis.Z || {});
