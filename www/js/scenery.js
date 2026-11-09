// Castle Siege: History - gercekci koridor sahnesi (arka plan, bir kez cizilir ve onbellege alinir).
// Katmanlar: dokulu zemin (fBm gurultu + ot/kum/kar/kul ayrintisi) -> gokyuzu, bulut, sisli daglar, ufuk agaclari ->
// yumusak golgeli orman, kaya, calilar -> dokulu toprak yol (tekerlek izi, cakil, su birikintisi) -> gun isigi, renk tonlamasi, vinyet.
// Herhangi bir hata olursa render.js icindeki basit surume (buildBgBasic) doner.
(function (Z) {
  'use strict';
  var R = Z.Render, U = R.util, TAU = U.TAU, ell = U.ell, circ = U.circ, rrect = U.rrect, seeded = U.seeded, hash = U.hash, star = U.star, THEMES = R.THEMES;
  var DW = 720, CASTLE_H = 86;

  // ---- renk yardimcilari --------------------------------------------------
  function hex(c) { if (c.charAt(0) === 'r') { var m = c.match(/\d+/g); return [+m[0], +m[1], +m[2]]; } c = c.replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function rgb(a) { return 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')'; }
  function css(c, al) { var a = hex(c); return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + al + ')'; }
  function shade(c, t) { var a = hex(c), k = t < 0 ? 0 : 255, u = Math.abs(t); return rgb([Math.round(a[0] + (k - a[0]) * u), Math.round(a[1] + (k - a[1]) * u), Math.round(a[2] + (k - a[2]) * u)]); }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2); return rgb([Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]); }
  function norm(c) { return c.charAt(0) === '#' ? c : rgbToHex(c); }
  function rgbToHex(s) { var m = s.match(/\d+/g); return '#' + [0, 1, 2].map(function (i) { var h = (+m[i]).toString(16); return h.length < 2 ? '0' + h : h; }).join(''); }

  // ---- dokular: kare doseyen fBm gurultusu (gri) ---------------------------
  var noiseCv = null;
  function noiseTile() {
    if (noiseCv) return noiseCv;
    var size = 192, cv = document.createElement('canvas'); cv.width = cv.height = size;
    var x = cv.getContext('2d'), im = x.createImageData(size, size), d = im.data, lat = [], o, i, X, Y;
    for (o = 0; o < 4; o++) { var n = 4 << o, a = new Float32Array(n * n); for (i = 0; i < n * n; i++) a[i] = hash(i * 1.37 + o * 91.7 + 3.3); lat.push(a); }
    for (Y = 0; Y < size; Y++) for (X = 0; X < size; X++) {
      var v = 0, amp = 0.55, tot = 0;
      for (o = 0; o < 4; o++) {
        var n2 = 4 << o, fx = X / size * n2, fy = Y / size * n2, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var a00 = lat[o][(iy % n2) * n2 + (ix % n2)], a10 = lat[o][(iy % n2) * n2 + ((ix + 1) % n2)], a01 = lat[o][((iy + 1) % n2) * n2 + (ix % n2)], a11 = lat[o][((iy + 1) % n2) * n2 + ((ix + 1) % n2)];
        v += amp * (a00 + (a10 - a00) * tx + (a01 - a00) * ty + (a00 - a10 - a01 + a11) * tx * ty); tot += amp; amp *= 0.55;
      }
      v = v / tot; v = Math.max(0, Math.min(1, (v - 0.5) * 1.9 + 0.5)); var gv = Math.round(v * 255), p = (Y * size + X) * 4; d[p] = d[p + 1] = d[p + 2] = gv; d[p + 3] = 255;
    }
    x.putImageData(im, 0, 0); noiseCv = cv; return cv;
  }
  function pattern(g, scale) { var p = g.createPattern(noiseTile(), 'repeat'); try { if (p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scale(scale, scale)); } catch (e) { /* eski WebView */ } return p; }

  // ---- yumusak golge (radyal degrade; shadowBlur'dan hizli) ------------------
  function softShadow(g, x, y, rx, ry, a) {
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(0.55, 'rgba(0,0,0,' + (a * 0.55) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
  }
  function blob(g, x, y, r, col, hl) { // kabarik, isik alan kume (ust-sol aydinlik)
    var gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    gr.addColorStop(0, shade(col, hl === undefined ? 0.32 : hl)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.34));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }

  // ---- agac / calilik / kaya spritelari -----------------------------------------
  function spriteCanvas(px, w, h) { var cv = document.createElement('canvas'); cv.width = Math.ceil(w * px); cv.height = Math.ceil(h * px); var g = cv.getContext('2d'); g.setTransform(px, 0, 0, px, cv.width / 2, cv.height / 2); return { cv: cv, g: g, w: w, h: h }; }

  function broadleafSprite(px, r, cols, rnd) { // genis yaprakli: yuzlerce kume, ust-soldan isik
    var S = Math.ceil(r * 2.7), sp = spriteCanvas(px, S, S), g = sp.g, i;
    g.fillStyle = shade(cols[0], -0.5); g.beginPath(); g.arc(0, 0, r * 0.97, 0, TAU); g.fill();
    var n = Math.round(r * 2.1), cl = [];
    for (i = 0; i < n; i++) { var a = rnd() * TAU, d = r * 0.8 * Math.sqrt(rnd()); cl.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: r * (0.2 + rnd() * 0.2) }); }
    cl.sort(function (p, q) { return (q.x + q.y) - (p.x + p.y); }); // alt-sag once (karanlik), ust-sol sonra (aydinlik)
    for (i = 0; i < cl.length; i++) {
      var c = cl[i], lt = Math.max(0, Math.min(1, 0.5 - (c.x * 0.55 + c.y * 0.85) / (r * 1.5))), col = lt < 0.5 ? mix(cols[0], cols[1], lt * 2) : mix(cols[1], cols[2], (lt - 0.5) * 2);
      blob(g, c.x, c.y, c.r, col);
    }
    for (i = 0; i < 26; i++) { var a2 = rnd() * TAU, d2 = r * 0.85 * Math.sqrt(rnd()); g.fillStyle = rnd() < 0.55 ? css(cols[2], 0.55) : css(cols[0], 0.55); g.beginPath(); g.arc(Math.cos(a2) * d2, Math.sin(a2) * d2, 0.9 + rnd() * 1.1, 0, TAU); g.fill(); }
    var rim = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.3, 0, 0, r * 1.08); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(0.7, 'rgba(0,0,0,.06)'); rim.addColorStop(1, 'rgba(0,0,0,.42)');
    g.fillStyle = rim; g.beginPath(); g.arc(0, 0, r * 0.99, 0, TAU); g.fill();
    var hl = g.createRadialGradient(-r * 0.34, -r * 0.4, 0, -r * 0.34, -r * 0.4, r * 0.55); hl.addColorStop(0, css(cols[2], 0.42)); hl.addColorStop(1, css(cols[2], 0));
    g.fillStyle = hl; g.beginPath(); g.arc(-r * 0.34, -r * 0.4, r * 0.55, 0, TAU); g.fill();
    return sp;
  }

  function coniferSprite(px, r, cols, snow, rnd) { // kati cam: iglelerle dokulu, kar ortulu olabilir
    var S = Math.ceil(r * 2.7), sp = spriteCanvas(px, S, S), g = sp.g, i, k, L = [1, 0.78, 0.56, 0.34, 0.16];
    g.fillStyle = shade(cols[0], snow ? -0.15 : -0.55); star(g, 0, 0, r * 1.02, r * (snow ? 0.88 : 0.62), snow ? 13 : 11, 0.3); g.fill();
    for (i = 0; i < L.length; i++) {
      var rr = r * L[i], ox = -i * r * 0.05, oy = -i * r * 0.09, base = snow ? mix(cols[1], '#f4f9ff', 0.28 + i * 0.16) : (i < 2 ? cols[0] : i < 4 ? cols[1] : cols[2]);
      var gr = g.createRadialGradient(ox - rr * 0.3, oy - rr * 0.35, rr * 0.05, ox, oy, rr * 1.05);
      gr.addColorStop(0, shade(base, 0.3)); gr.addColorStop(0.6, base); gr.addColorStop(1, shade(base, -0.4));
      g.fillStyle = gr; star(g, ox, oy, rr, rr * (snow ? 0.88 : 0.6), snow ? 13 : 11, 0.3 + i * 0.35); g.fill();
      g.strokeStyle = css(shade(base, -0.45), snow ? 0.22 : 0.55); g.lineWidth = 0.8; g.lineCap = 'round'; g.beginPath();
      for (k = 0; k < 16; k++) { var a = k * TAU / 16 + i * 0.4, r0 = rr * 0.3, r1 = rr * (0.72 + 0.2 * rnd()); g.moveTo(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0); g.lineTo(ox + Math.cos(a) * r1, oy + Math.sin(a) * r1); }
      g.stroke();
      g.strokeStyle = css(shade(base, 0.45), 0.4); g.beginPath();
      for (k = 0; k < 8; k++) { var a3 = -2.2 + k * 0.18 + i * 0.3, r2 = rr * (0.55 + 0.3 * rnd()); g.moveTo(ox + Math.cos(a3) * rr * 0.3, oy + Math.sin(a3) * rr * 0.3); g.lineTo(ox + Math.cos(a3) * r2, oy + Math.sin(a3) * r2); }
      g.stroke();
    }
    return sp;
  }

  function bushSprite(px, r, cols, flower, rnd) {
    var S = Math.ceil(r * 3), sp = spriteCanvas(px, S, S), g = sp.g, i;
    for (i = 0; i < 6; i++) { var a = i * TAU / 6 + rnd(), d = r * 0.42 * (0.6 + rnd() * 0.5); blob(g, Math.cos(a) * d, Math.sin(a) * d * 0.9, r * (0.5 + rnd() * 0.18), cols[0]); }
    blob(g, -r * 0.1, -r * 0.14, r * 0.55, cols[1], 0.38);
    if (flower) for (i = 0; i < 5; i++) { g.fillStyle = flower[Math.floor(rnd() * flower.length)]; g.beginPath(); g.arc((rnd() - 0.5) * r * 1.2, (rnd() - 0.5) * r * 1.1, 0.9 + rnd() * 0.6, 0, TAU); g.fill(); }
    return sp;
  }

  function rockSprite(px, r, base, rnd, moss) { // yuzeyli (faset) kaya: aydinlik ust, karanlik alt
    var S = Math.ceil(r * 3), sp = spriteCanvas(px, S, S), g = sp.g, n = 8, pts = [], i;
    for (i = 0; i < n; i++) { var a = i * TAU / n + rnd() * 0.3, d = r * (0.72 + rnd() * 0.3); pts.push([Math.cos(a) * d, Math.sin(a) * d * 0.78]); }
    var lg = g.createLinearGradient(-r * 0.7, -r * 0.8, r * 0.7, r * 0.7); lg.addColorStop(0, shade(base, 0.35)); lg.addColorStop(0.5, base); lg.addColorStop(1, shade(base, -0.5));
    g.fillStyle = lg; g.beginPath(); pts.forEach(function (p, j) { if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(10,10,14,.5)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = css(shade(base, 0.5), 0.55); g.beginPath(); g.moveTo(pts[5][0], pts[5][1]); g.lineTo(pts[6][0] * 0.9, pts[6][1] * 0.85 - 1); g.lineTo(pts[7][0] * 0.8, pts[7][1] * 0.6); g.lineTo(pts[0][0] * 0.35, pts[0][1] * 0.2 - r * 0.2); g.lineTo(pts[5][0] * 0.4, pts[5][1] * 0.3); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(pts[1][0] * 0.2, pts[1][1] * 0.1); g.lineTo(pts[2][0] * 0.7, pts[2][1] * 0.55); g.moveTo(pts[3][0] * 0.3, pts[3][1] * 0.2); g.lineTo(pts[4][0] * 0.8, pts[4][1] * 0.7); g.stroke();
    if (moss) { g.fillStyle = css('#4f8a45', 0.7); for (i = 0; i < 4; i++) { g.beginPath(); g.arc(-r * 0.4 + rnd() * r * 0.5, -r * 0.35 + rnd() * r * 0.3, r * (0.12 + rnd() * 0.12), 0, TAU); g.fill(); } }
    return sp;
  }

  function palmSprite(px, r, cols, rnd) {
    var S = Math.ceil(r * 2.8), sp = spriteCanvas(px, S, S), g = sp.g, i, n = 11;
    for (i = 0; i < n; i++) {
      var a = i * TAU / n + rnd() * 0.2, len = r * (0.95 + rnd() * 0.2), lt = 0.5 - Math.cos(a - 2.4) * 0.5;
      g.save(); g.rotate(a);
      var gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, shade(cols[0], -0.2)); gr.addColorStop(1, mix(cols[1], cols[2], lt));
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -r * 0.3, len, 0); g.quadraticCurveTo(len * 0.5, r * 0.22, 0, 0); g.fill();
      g.strokeStyle = css(shade(cols[0], -0.4), 0.7); g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.96, 0); g.stroke();
      g.strokeStyle = css(cols[2], 0.45); g.lineWidth = 0.7; g.beginPath(); for (var k = 1; k < 6; k++) { g.moveTo(len * k / 6.2, 0); g.lineTo(len * k / 6.2 + 3, -r * 0.2 * (1 - k / 7)); g.moveTo(len * k / 6.2, 0); g.lineTo(len * k / 6.2 + 3, r * 0.15 * (1 - k / 7)); } g.stroke();
      g.restore();
    }
    blob(g, 0, 0, r * 0.2, '#6b4a2a'); g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(r * 0.06, r * 0.05, r * 0.07, 0, TAU); g.fill(); g.beginPath(); g.arc(-r * 0.06, r * 0.08, r * 0.06, 0, TAU); g.fill();
    return sp;
  }

  function willowSprite(px, r, cols, rnd) { // salkim sogut (bataklik)
    var sp = broadleafSprite(px, r, cols, rnd), g = sp.g, i;
    g.strokeStyle = css(cols[2], 0.55); g.lineWidth = 1.1; g.lineCap = 'round';
    for (i = 0; i < 16; i++) { var a = i * TAU / 16, x0 = Math.cos(a) * r * 0.9, y0 = Math.sin(a) * r * 0.9; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 * 1.18, y0 * 1.18 + 3, x0 * 1.14, y0 * 1.14 + 10); g.stroke(); }
    return sp;
  }

  function charredSprite(px, r, rnd) { // yanik agac (yanardag)
    var S = Math.ceil(r * 2.8), sp = spriteCanvas(px, S, S), g = sp.g, i;
    g.lineCap = 'round';
    for (i = 0; i < 8; i++) { var a = rnd() * TAU, l = r * (0.7 + 0.5 * rnd()); g.strokeStyle = '#120c0c'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * l, Math.sin(a) * l); g.stroke(); g.strokeStyle = '#3a2a28'; g.lineWidth = 1; g.beginPath(); g.moveTo(-0.8, -0.8); g.lineTo(Math.cos(a) * l * 0.95 - 0.8, Math.sin(a) * l * 0.95 - 0.8); g.stroke(); g.strokeStyle = '#120c0c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(Math.cos(a) * l * 0.55, Math.sin(a) * l * 0.55); g.lineTo(Math.cos(a + 0.7) * l * 0.9, Math.sin(a + 0.7) * l * 0.9); g.stroke(); }
    blob(g, 0, 0, r * 0.26, '#2a1d1c', 0.2); g.fillStyle = 'rgba(255,130,50,.9)'; for (i = 0; i < 3; i++) { g.beginPath(); g.arc((rnd() - 0.5) * r, (rnd() - 0.5) * r, 1.5, 0, TAU); g.fill(); }
    return sp;
  }

  // ---- ana cizim ------------------------------------------------------------------
  // ---- ortak katmanlar (koridor + kale onu sahnesi) ----
  function groundLayer(g, c) {
    var W = c.W, H = c.H, top = c.top, bot = c.bot, rnd = c.rnd, T = c.T, kind = c.kind, i, nearRoad = c.nearRoad || function () { return false; };
    var gr = g.createLinearGradient(0, top, 0, H);
    gr.addColorStop(0, T.g[0]); gr.addColorStop(0.5, T.g[1]); gr.addColorStop(1, T.g[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (i = 0; i < 46; i++) { // buyuk acik/koyu renk lekeleri (cim cesitliligi)
      var mx = rnd() * W, my = top + rnd() * (H - top), mr = 50 + rnd() * 110, lgt = rnd() < 0.5;
      var mg = g.createRadialGradient(mx, my, 0, mx, my, mr); mg.addColorStop(0, lgt ? 'rgba(255,255,220,.10)' : 'rgba(0,0,0,.13)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = mg; g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    }
    g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.9; g.fillStyle = pattern(g, 0.42); g.fillRect(0, top, W, H - top); g.restore();
    g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.55; g.fillStyle = pattern(g, 1.6); g.fillRect(0, top, W, H - top); g.restore();

    // ot / kum izi / kar parlamasi / kul benekleri: tek renkli yollar halinde toplu cizim
    var groundDetail = function (count, avoid) {
      var buckets = {}, base = T.g[1];
      var palette = kind === 'desert' ? [shade(base, 0.22), shade(base, -0.22), '#e8d29a', '#8a6a34']
        : kind === 'ice' ? ['#ffffff', '#b8cfe6', '#8fa9c6', '#ffffff']
        : kind === 'volcano' ? ['#4a3b3b', '#181010', '#6a5252', '#ff7a2a']
        : [shade(base, 0.3), shade(base, 0.12), shade(base, -0.3), kind === 'swamp' ? '#6f8f3a' : '#a8c45a'];
      for (var n = 0; n < count; n++) {
        var x = rnd() * W, y = top + 14 + rnd() * (bot - top), ci = Math.floor(rnd() * palette.length);
        if (avoid && nearRoad(x, y, 70)) continue;
        (buckets[ci] || (buckets[ci] = [])).push([x, y, rnd(), rnd()]);
      }
      Object.keys(buckets).forEach(function (ci) {
        g.strokeStyle = css(palette[ci], ci == 3 && kind === 'volcano' ? 0.9 : 0.5); g.lineWidth = kind === 'desert' ? 1.1 : kind === 'ice' ? 1.3 : 1; g.lineCap = 'round'; g.beginPath();
        buckets[ci].forEach(function (p) {
          var x = p[0], y = p[1];
          if (kind === 'desert') { var l = 6 + p[2] * 10; g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y - 1.5 - p[3] * 1.5, x + l, y + (p[3] - 0.5)); }
          else if (kind === 'ice') { var l2 = 2 + p[2] * 5; g.moveTo(x, y); g.lineTo(x + l2, y + p[3] - 0.5); }
          else if (kind === 'volcano') { g.moveTo(x, y); g.lineTo(x + 1.4, y + 0.8); }
          else { var h = 3 + p[2] * 6, lean = (p[3] - 0.5) * 4; g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); }
        });
        g.stroke();
      });
    };
    groundDetail(5200, true);

  }
  function horizon(g, c) {
    var W = c.W, top = c.top, T = c.T, kind = c.kind, theme = c.theme, night = theme === 6, i, k, q;
    var sky = g.createLinearGradient(0, 0, 0, top + 10);
    sky.addColorStop(0, T.sky[0]); sky.addColorStop(0.6, T.sky[1]); sky.addColorStop(1, T.sky[2]);
    g.fillStyle = sky; g.fillRect(0, 0, W, top + 10);
    var sg = g.createRadialGradient(W * 0.75, top - 6, 4, W * 0.75, top - 6, 150);
    sg.addColorStop(0, 'rgba(' + T.sun.join(',') + ',1)'); sg.addColorStop(0.25, 'rgba(' + T.sun.join(',') + ',.5)'); sg.addColorStop(1, 'rgba(' + T.sun.join(',') + ',0)');
    g.fillStyle = sg; g.fillRect(0, 0, W, top + 10);
    g.fillStyle = 'rgba(255,255,255,.7)'; for (i = 0; i < 40; i++) circ(g, hash(i + c.seed) * W, hash(i + 50) * (top - 24), hash(i + 9) * 1.2 + 0.3);
    for (i = 0; i < 7; i++) { // yumusak bulutlar
      var cx = hash(i * 3 + c.seed) * W, cy = 16 + hash(i * 7 + 2) * (top - 60), cw = 60 + hash(i + 11) * 80;
      for (var q = 0; q < 7; q++) { var qx = cx + (q - 3) * cw * 0.2, qy = cy + Math.sin(q * 1.7 + i) * 6, qr = cw * (0.16 + 0.1 * Math.sin(q * 2.1 + i)); var cg = g.createRadialGradient(qx, qy - qr * 0.2, 1, qx, qy, qr); cg.addColorStop(0, night ? 'rgba(150,170,230,.16)' : 'rgba(255,255,255,.34)'); cg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = cg; circ(g, qx, qy, qr); }
    }
    var mount = function (col, base, amp, seed, step, hiCol) {
      var pts = [], x; g.fillStyle = col; g.beginPath(); g.moveTo(0, base + 40);
      for (x = 0; x <= W + step; x += step) { var yy = base - amp * (0.35 + hash(x / step + seed) * 0.65); pts.push([x, yy]); g.lineTo(x, yy); }
      g.lineTo(W, base + 40); g.closePath(); g.fill();
      g.strokeStyle = hiCol; g.lineWidth = 1.4; g.beginPath(); pts.forEach(function (p, n) { if (n) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke();
      var sh = g.createLinearGradient(0, base - amp, 0, base + 10); sh.addColorStop(0, 'rgba(255,255,255,.12)'); sh.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = sh; g.fill();
    };
    var haze = function (a) { var hg = g.createLinearGradient(0, top - 70, 0, top + 24); hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(1, css(norm(T.sky[2]), a)); g.fillStyle = hg; g.fillRect(0, top - 70, W, 100); };
    mount(T.m1, top + 14, 78, 3 + c.seed, 70, css(norm(T.sky[2]), 0.45)); haze(0.45);
    mount(T.m2, top + 20, 44, 11 + c.seed, 46, css(norm(T.sky[2]), 0.35)); haze(0.3);
    if (theme === 2) { g.fillStyle = 'rgba(255,255,255,.85)'; for (i = 0; i < Math.ceil(W / 70); i++) { var px2 = i * 70 + 35, hh = 78 * (0.35 + hash(i + 3 + c.seed) * 0.65); g.beginPath(); g.moveTo(px2 - 12, top + 14 - hh + 19); g.lineTo(px2, top + 14 - hh); g.lineTo(px2 + 12, top + 14 - hh + 19); g.fill(); } }
    if (kind === 'volcano') {
      [[W * 0.2, 92], [W * 0.7, 118]].forEach(function (cn) {
        var bx = cn[0], hh = cn[1], gy = top + 14 - hh;
        var gl = g.createRadialGradient(bx, gy, 2, bx, gy, 80); gl.addColorStop(0, 'rgba(255,140,40,.95)'); gl.addColorStop(1, 'rgba(255,100,20,0)');
        g.fillStyle = gl; g.fillRect(bx - 90, gy - 80, 180, 170);
        var vg2 = g.createLinearGradient(0, gy, 0, top + 18); vg2.addColorStop(0, '#3a1d18'); vg2.addColorStop(1, '#170a0a');
        g.fillStyle = vg2; g.beginPath(); g.moveTo(bx - hh * 1.0, top + 18); g.lineTo(bx - 13, gy); g.lineTo(bx + 13, gy); g.lineTo(bx + hh * 1.0, top + 18); g.closePath(); g.fill();
        g.fillStyle = '#ff7a2a'; ell(g, bx, gy, 13, 4.4); g.strokeStyle = 'rgba(255,120,40,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - 4, gy + 3); g.lineTo(bx - 14, gy + 30); g.moveTo(bx + 5, gy + 3); g.lineTo(bx + 11, gy + 26); g.stroke();
        for (var sm = 0; sm < 6; sm++) { var smg = g.createRadialGradient(bx + sm * 4, gy - 14 - sm * 14, 1, bx + sm * 4, gy - 14 - sm * 14, 16 + sm * 5); smg.addColorStop(0, 'rgba(70,50,50,.4)'); smg.addColorStop(1, 'rgba(70,50,50,0)'); g.fillStyle = smg; circ(g, bx + sm * 4, gy - 14 - sm * 14, 16 + sm * 5); }
      });
    }
    if (kind === 'swamp') {
      var mgm = g.createRadialGradient(W * 0.28, top - 34, 4, W * 0.28, top - 34, 100); mgm.addColorStop(0, 'rgba(230,255,235,.5)'); mgm.addColorStop(1, 'rgba(200,255,220,0)');
      g.fillStyle = mgm; g.fillRect(0, 0, W, top + 10); g.fillStyle = '#e9fff0'; circ(g, W * 0.28, top - 34, 22); g.fillStyle = 'rgba(160,200,170,.35)'; circ(g, W * 0.28 + 6, top - 40, 6);
    }
    // ufuk agac / kumul cizgisi
    var tl = T.m2;
    if (kind === 'desert') { // kum tepeleri
      for (k = 0; k < 2; k++) { g.fillStyle = shade(T.g[1], k ? -0.22 : -0.08); g.beginPath(); g.moveTo(0, top + 36); for (var dx = 0; dx <= W; dx += 12) g.lineTo(dx, top + 22 + k * 5 + Math.sin(dx * 0.012 + k * 2 + c.seed) * 8); g.lineTo(W, top + 40); g.closePath(); g.fill(); }
    } else if (kind !== 'volcano') {
      g.fillStyle = shade(tl, -0.35);
      for (var tx = -6; tx < W + 6; tx += 7 + hash(tx) * 5) {
        var th = 9 + hash(tx * 0.3 + c.seed) * 14;
        if (kind === 'swamp' || (kind === 'forest' && hash(tx * 1.7) < 0.35)) { g.beginPath(); g.arc(tx, top + 26 - th * 0.55, th * 0.55, 0, TAU); g.fill(); }
        else { g.beginPath(); g.moveTo(tx - th * 0.32, top + 28); g.lineTo(tx, top + 28 - th * 1.5); g.lineTo(tx + th * 0.32, top + 28); g.closePath(); g.fill(); }
      }
      g.fillRect(0, top + 24, W, 8);
    }
    // ufuk alt kenarini zemine yumusat (derinlik sisi)
    var fog = g.createLinearGradient(0, top + 6, 0, top + 120); fog.addColorStop(0, css(norm(T.sky[2]), 0.38)); fog.addColorStop(1, css(norm(T.sky[2]), 0));
    g.fillStyle = fog; g.fillRect(0, top + 6, W, 114);

  }
  function lightGrade(g, c) {
    var W = c.W, H = c.H, top = c.top, bot = c.bot, ox = c.ox, rnd = c.rnd, T = c.T, kind = c.kind, theme = c.theme, night = theme === 6, i;
    var shaftA = night ? 0.035 : 0.075;
    for (i = 0; i < 4; i++) {
      var sx0 = ox + 40 + i * 190 + rnd() * 30, shg = g.createLinearGradient(sx0, top, sx0 - 150, bot); shg.addColorStop(0, 'rgba(' + T.shaft + ',' + shaftA + ')'); shg.addColorStop(0.7, 'rgba(' + T.shaft + ',' + (shaftA * 0.4) + ')'); shg.addColorStop(1, 'rgba(' + T.shaft + ',0)');
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = shg; g.beginPath(); g.moveTo(sx0, top); g.lineTo(sx0 + 78, top); g.lineTo(sx0 - 140, bot); g.lineTo(sx0 - 230, bot); g.closePath(); g.fill(); g.restore();
    }
    if (kind === 'forest' && !night) for (i = 0; i < 40; i++) { // yaprak arasindan sizan isik lekeleri (yolda ve ormanda)
      var dx2 = rnd() * W, dy2 = top + 60 + rnd() * (bot - top - 120), dr = 10 + rnd() * 18, dg2 = g.createRadialGradient(dx2, dy2, 0, dx2, dy2, dr);
      dg2.addColorStop(0, 'rgba(255,250,200,.13)'); dg2.addColorStop(1, 'rgba(255,250,200,0)'); g.fillStyle = dg2; ell(g, dx2, dy2, dr * 1.2, dr * 0.8);
    }
    // derinlik: uzak (ust) hafif sisli ve soluk, yakin (alt) daha doygun
    var df = g.createLinearGradient(0, top, 0, top + 380); df.addColorStop(0, css(norm(T.sky[2]), 0.22)); df.addColorStop(1, css(norm(T.sky[2]), 0)); g.fillStyle = df; g.fillRect(0, top, W, 380);
    // sinematik renk tonlamasi (soft-light): sicak ust / serin alt
    g.save(); g.globalCompositeOperation = 'soft-light'; var cgd = g.createLinearGradient(0, 0, 0, H); cgd.addColorStop(0, night ? 'rgba(90,110,200,.35)' : 'rgba(255,190,120,.22)'); cgd.addColorStop(0.55, 'rgba(255,255,255,.0)'); cgd.addColorStop(1, night ? 'rgba(40,60,150,.3)' : 'rgba(70,100,170,.2)'); g.fillStyle = cgd; g.fillRect(0, 0, W, H); g.restore();
    var vg = g.createRadialGradient(W / 2, H * 0.48, H * 0.28, W / 2, H * 0.48, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, (kind === 'volcano' || kind === 'swamp') ? 'rgba(0,0,0,.5)' : 'rgba(0,0,0,.32)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (c.bottomDark !== false) {
      var dk = g.createLinearGradient(0, bot - 10, 0, H); dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(0.35, 'rgba(0,0,0,.55)'); dk.addColorStop(1, 'rgba(0,0,0,.7)');
      g.fillStyle = dk; g.fillRect(0, bot - 10, W, H - bot + 10);
    }
  }

  function build() {
    var c = document.createElement('canvas'); c.width = this.canvas.width; c.height = this.canvas.height;
    var g = c.getContext('2d'), W = this.W, H = this.H, ox = this.ox, i, j, k, T = THEMES[this.theme || 0], rnd = seeded(this.seed || 1), self = this, kind = T.kind, theme = this.theme || 0;
    this.phase = ((this.seed || 1) % 7) * 0.9;
    g.setTransform(this.px, 0, 0, this.px, 0, 0);
    var top = this.eY - CASTLE_H, bot = this.pY + CASTLE_H, px = this.px;
    var leafy = kind === 'forest' || kind === 'swamp', night = theme === 6;

    // ==== 1) zemin ====
 var self2 = this; groundLayer(g, { W: W, H: H, top: top, bot: bot, rnd: rnd, T: T, kind: kind, nearRoad: function (x, y, m) { for (var l = 0; l < 3; l++) if (Math.abs(x - self2.roadX(l, y)) < m) return true; return false; } });
    // ==== 2) ufuk ====
 horizon(g, { W: W, top: top, T: T, kind: kind, theme: theme, seed: this.seed });
    // ==== 3) yollar arasi golge + yol kenari gozlenmesi ===========================
    var strips = [[0, 54], [186, 294], [426, 534], [666, 720]];
    for (j = 0; j < strips.length; j++) {
      var a0 = ox + strips[j][0], b0 = ox + strips[j][1], fg = g.createLinearGradient(a0, 0, b0, 0);
      fg.addColorStop(0, 'rgba(0,0,0,.14)'); fg.addColorStop(0.5, 'rgba(0,0,0,.32)'); fg.addColorStop(1, 'rgba(0,0,0,.14)');
      g.fillStyle = fg; g.fillRect(a0, top + 30, b0 - a0, bot - top - 60);
    }
    if (ox > 2) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, top + 30, ox, bot - top - 60); g.fillRect(ox + DW, top + 30, W - ox - DW, bot - top - 60); }

    // ==== 4) goletler ============================================================
    var ponds = [];
    if (rnd() < 0.65) ponds.push([ox + 240 + (rnd() - 0.5) * 20, top + 220 + rnd() * 260, 40, 26]);
    if (rnd() < 0.5) ponds.push([ox + 480 + (rnd() - 0.5) * 20, top + 380 + rnd() * 300, 38, 24]);
    for (i = 0; i < ponds.length; i++) {
      var pd = ponds[i], wc = kind === 'volcano' ? ['#ffd36a', '#e8501a'] : kind === 'swamp' ? ['#7fb87a', '#2e5a3a'] : theme === 2 ? ['#e6f4ff', '#9ccbe8'] : theme === 1 ? ['#7fd0e0', '#2f8aa8'] : ['#79bde6', '#2a5f95'];
      softShadow(g, pd[0] + 3, pd[1] + 4, pd[2] + 12, pd[3] + 10, 0.35);
      g.fillStyle = theme === 2 ? '#ffffff' : kind === 'volcano' ? '#2a1a14' : kind === 'swamp' ? '#3a3020' : '#6b5638'; ell(g, pd[0], pd[1], pd[2] + 6, pd[3] + 5);
      g.fillStyle = theme === 2 ? '#dbe9f5' : kind === 'volcano' ? '#3a2620' : '#8a7550'; ell(g, pd[0], pd[1] + 1, pd[2] + 3, pd[3] + 2);
      var wg = g.createLinearGradient(pd[0], pd[1] - pd[3], pd[0], pd[1] + pd[3]); wg.addColorStop(0, wc[0]); wg.addColorStop(1, wc[1]); g.fillStyle = wg; ell(g, pd[0], pd[1], pd[2], pd[3]);
      if (kind === 'volcano') { var lg2 = g.createRadialGradient(pd[0], pd[1], pd[2] * 0.4, pd[0], pd[1], pd[2] * 2.6); lg2.addColorStop(0, 'rgba(255,120,40,.4)'); lg2.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = lg2; ell(g, pd[0], pd[1], pd[2] * 2.6, pd[3] * 2.6); }
      g.save(); g.beginPath(); g.ellipse(pd[0], pd[1], pd[2], pd[3], 0, 0, TAU); g.clip(); // yansima + dalgacik
      var rf = g.createLinearGradient(0, pd[1] - pd[3], 0, pd[1]); rf.addColorStop(0, css(norm(T.sky[2]), 0.55)); rf.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rf; g.fillRect(pd[0] - pd[2], pd[1] - pd[3], pd[2] * 2, pd[3]);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; for (k = 0; k < 4; k++) { g.beginPath(); g.ellipse(pd[0] - 4 + k * 3, pd[1] + 2, pd[2] * (0.3 + k * 0.17), pd[3] * (0.2 + k * 0.13), 0, 0.2, 2.9); g.stroke(); }
      g.restore();
      if (kind === 'swamp') for (var lp = 0; lp < 5; lp++) { var lx0 = pd[0] - pd[2] * 0.55 + lp * pd[2] * 0.28, ly0 = pd[1] + (lp % 2 ? 7 : -6); g.fillStyle = '#2f6f3f'; ell(g, lx0, ly0, 6.5, 4); g.fillStyle = '#58b068'; ell(g, lx0 - 1, ly0 - 1, 4, 2.4); }
      for (k = 0; k < 9; k++) { var ra = rnd() * TAU; g.strokeStyle = kind === 'swamp' ? '#5f7a3a' : '#4d7a35'; g.lineWidth = 1.2; var rx0 = pd[0] + Math.cos(ra) * (pd[2] + 6), ry0 = pd[1] + Math.sin(ra) * (pd[3] + 4); g.beginPath(); g.moveTo(rx0, ry0); g.lineTo(rx0 + (rnd() - 0.5) * 3, ry0 - 8 - rnd() * 6); g.stroke(); }
    }

    // ==== 5) yollar: dokulu toprak, kenar, tekerlek izi, cakil, birikinti ==========
    var roadCol = T.road, edgeBlur = 12, road;
    for (i = 0; i < 3; i++) {
      // yumusak kenar golgesi + ezilmis ot
      this.roadPath(g, i, 78); g.fillStyle = css(roadCol[2], 0.22); g.fill();
      this.roadPath(g, i, 70); g.fillStyle = css(roadCol[2], 0.4); g.fill();
      this.roadPath(g, i, 66); g.fillStyle = shade(roadCol[2], -0.1); g.fill();
      this.roadPath(g, i, 61);
      var lx = this.laneX(i), rg = g.createLinearGradient(lx - 64, 0, lx + 64, 0);
      rg.addColorStop(0, shade(roadCol[1], -0.2)); rg.addColorStop(0.14, roadCol[1]); rg.addColorStop(0.5, shade(roadCol[0], 0.12)); rg.addColorStop(0.86, roadCol[1]); rg.addColorStop(1, shade(roadCol[1], -0.2));
      g.fillStyle = rg; g.fill();
      g.save(); this.roadPath(g, i, 61); g.clip();
      g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.55; g.fillStyle = pattern(g, 0.3); g.fillRect(lx - 70, this.eY - 100, 140, this.pY - this.eY + 200);
      g.globalAlpha = 0.22; g.fillStyle = pattern(g, 0.9); g.fillRect(lx - 70, this.eY - 100, 140, this.pY - this.eY + 200);
      g.globalCompositeOperation = 'source-over';
      for (k = 0; k < 6; k++) { // ezilmis acik yamalar (orta serit yuvarlanmis)
        var wy = this.eY + rnd() * (this.pY - this.eY), wxx = this.roadX(i, wy) + (rnd() - 0.5) * 26; var wgg = g.createRadialGradient(wxx, wy, 0, wxx, wy, 40); wgg.addColorStop(0, 'rgba(255,255,230,.10)'); wgg.addColorStop(1, 'rgba(255,255,230,0)'); g.save(); g.translate(wxx, wy); g.scale(0.6, 1.8); g.translate(-wxx, -wy); g.fillStyle = wgg; circ(g, wxx, wy, 40); g.restore();
      }
      // tekerlek izleri: oyuk (koyu) + kenarda sirt (acik)
      for (k = 0; k < 2; k++) {
        var off = k ? 21 : -21;
        g.setLineDash([60 + rnd() * 50, 16 + rnd() * 20, 30 + rnd() * 30, 12 + rnd() * 14]);
        g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
        for (var yy = this.eY - 40; yy <= this.pY + 40; yy += 10) { var rx = this.roadX(i, yy) + off + Math.sin(yy * 0.07 + k * 3 + i) * 1.8; if (yy === this.eY - 40) g.moveTo(rx, yy); else g.lineTo(rx, yy); }
        g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.09)'; g.lineWidth = 3; g.stroke();
        g.strokeStyle = 'rgba(255,245,215,.09)'; g.lineWidth = 1.4; g.beginPath();
        for (yy = this.eY - 40; yy <= this.pY + 40; yy += 10) { var rx2 = this.roadX(i, yy) + off + (k ? -6 : 6) + Math.sin(yy * 0.07 + k * 3 + i) * 1.8; if (yy === this.eY - 40) g.moveTo(rx2, yy); else g.lineTo(rx2, yy); }
        g.stroke(); g.setLineDash([]);
      }
      // cakil + tas parcalari (golgeli)
      var pebbles = kind === 'volcano' ? ['#3b3030', '#5a4848'] : kind === 'ice' ? ['#8fa3b8', '#d4e2f0'] : kind === 'desert' ? ['#9a7c46', '#c8aa6c'] : ['#7a6a52', '#a89677'];
      for (k = 0; k < 150; k++) {
        var py = this.eY - 20 + rnd() * (this.pY - this.eY + 40), pxx = this.roadX(i, py) + (rnd() - 0.5) * 112, pr = 0.9 + rnd() * rnd() * 3.6;
        g.fillStyle = 'rgba(0,0,0,.28)'; ell(g, pxx + pr * 0.4, py + pr * 0.5, pr * 1.05, pr * 0.7);
        g.fillStyle = pebbles[rnd() < 0.5 ? 0 : 1]; ell(g, pxx, py, pr, pr * 0.72); g.fillStyle = 'rgba(255,255,255,.22)'; ell(g, pxx - pr * 0.3, py - pr * 0.3, pr * 0.45, pr * 0.3);
      }
      if (leafy || kind === 'forest') { // sig su birikintileri (gokyuzu yansimali)
        for (k = 0; k < (kind === 'swamp' ? 8 : 3); k++) {
          var by2 = this.eY + 50 + rnd() * (this.pY - this.eY - 100), bx2 = this.roadX(i, by2) + (rnd() - 0.5) * 70, brx = 9 + rnd() * 11, bry = 3.5 + rnd() * 3;
          g.fillStyle = 'rgba(40,28,16,.45)'; ell(g, bx2, by2 + 0.5, brx + 2, bry + 1.5);
          var pg = g.createLinearGradient(bx2, by2 - bry, bx2, by2 + bry); pg.addColorStop(0, css(norm(T.sky[2]), 0.85)); pg.addColorStop(1, css(norm(T.sky[1]), 0.8)); g.fillStyle = pg; ell(g, bx2, by2, brx, bry);
          g.fillStyle = 'rgba(255,255,255,.55)'; ell(g, bx2 - brx * 0.25, by2 - bry * 0.35, brx * 0.45, bry * 0.28);
        }
      }
      for (k = 0; k < 40; k++) { // saman / kuru yaprak kirintilari
        var sy = this.eY + rnd() * (this.pY - this.eY), sx = this.roadX(i, sy) + (rnd() - 0.5) * 100; g.strokeStyle = theme === 5 ? (rnd() < 0.5 ? '#c4621f' : '#e9a23a') : css(shade(roadCol[0], rnd() < 0.5 ? 0.25 : -0.3), 0.7); g.lineWidth = 1; g.beginPath(); var sa = rnd() * TAU; g.moveTo(sx, sy); g.lineTo(sx + Math.cos(sa) * 4, sy + Math.sin(sa) * 2.4); g.stroke();
      }
      if (kind === 'volcano') {
        for (k = 0; k < 10; k++) {
          var cy2 = this.eY + 40 + rnd() * (this.pY - this.eY - 80), cx2 = this.roadX(i, cy2) + (rnd() - 0.5) * 90, pts2 = [[cx2, cy2]];
          for (var z = 0; z < 4; z++) pts2.push([pts2[z][0] + (rnd() - 0.5) * 22, pts2[z][1] + 6 + rnd() * 10]);
          g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,100,30,.28)'; g.lineWidth = 8; g.beginPath(); pts2.forEach(function (q, qi) { if (qi) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke();
          g.strokeStyle = 'rgba(255,205,100,.95)'; g.lineWidth = 1.8; g.beginPath(); pts2.forEach(function (q, qi) { if (qi) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke();
        }
      }
      g.restore();
      // yol kenarinda cim / kum / kar kiyilari (yolu yumusatir)
      for (yy = this.eY - 30; yy < this.pY + 30; yy += 7) for (k = -1; k <= 1; k += 2) {
        var ex = this.roadX(i, yy) + k * (58 + rnd() * 12), ey = yy + rnd() * 6;
        if (kind === 'volcano') { g.fillStyle = css('#3a2c2c', 0.9); ell(g, ex, ey, 2 + rnd() * 3, 1.4 + rnd() * 1.4); }
        else if (theme === 2) { g.fillStyle = 'rgba(255,255,255,.85)'; ell(g, ex, ey, 3 + rnd() * 4, 1.8 + rnd() * 1.4); }
        else if (kind === 'desert') { g.strokeStyle = 'rgba(120,90,40,.75)'; g.lineWidth = 1.2; g.beginPath(); for (var bl = 0; bl < 3; bl++) { g.moveTo(ex, ey); g.lineTo(ex + (bl - 1) * 3, ey - 5 - rnd() * 4); } g.stroke(); }
        else { g.strokeStyle = css(shade(T.g[1], rnd() < 0.5 ? 0.3 : -0.2), 0.95); g.lineWidth = 1.3; g.beginPath(); for (var bl2 = 0; bl2 < 4; bl2++) { g.moveTo(ex + (bl2 - 1.5) * 1.6, ey); g.quadraticCurveTo(ex + (bl2 - 1.5) * 2.4, ey - 4, ex + (bl2 - 1.5) * 3.4 + (rnd() - 0.5) * 3, ey - 7 - rnd() * 5); } g.stroke(); }
      }
      softShadow(g, this.laneX(i), this.eY + 6, 90, 24, 0.14); softShadow(g, this.laneX(i), this.pY - 6, 90, 24, 0.14);
    }

    // ==== 6) orman: yumusak golgeler, sprite agaclar, calilar, kayalar ==============
    var trees = [], addStrip = function (x0, x1, dens, sizeMul) {
      var wd = x1 - x0, n = Math.max(1, Math.round(wd / 44 * dens));
      for (var y = top + 40; y < bot - 30; y += 24) for (var q = 0; q < n; q++) {
        if (rnd() < 0.18) continue; var r = (13 + rnd() * 12) * sizeMul;
        trees.push({ x: x0 + (q + 0.15 + rnd() * 0.7) * wd / n, y: y + rnd() * 20, r: r, t: rnd(), rot: rnd() * TAU, v: Math.floor(rnd() * 4) });
      }
    };
    for (j = 0; j < strips.length; j++) addStrip(ox + strips[j][0] - (j === 0 ? 0 : 6), ox + strips[j][1] + (j === 3 ? 0 : 6), 1, j === 0 || j === 3 ? 0.9 : 1);
    if (ox > 2) { addStrip(-10, ox + 6, 1.3, 1.05); addStrip(ox + DW - 6, W + 10, 1.3, 1.05); }
    trees.sort(function (p, q) { return p.y - q.y; });
    var cache = {};
    var get = function (key, make) { return cache[key] || (cache[key] = make()); };
    var broadCols = T.leaf || (kind === 'swamp' ? ['#1d4a38', '#2f7a5a', '#6fd1a3'] : ['#25602f', '#3a8a44', '#78b85a']);
    var conCols = [T.tree[0], T.tree[1], T.tree[2] === '#eef6fd' || T.tree[2] === '#ffffff' ? '#cfe6f6' : T.tree[2]];
    if (kind === 'ice') conCols = ['#1f3f52', '#2f5d72', '#4f86a0'];
    var drawSprite = function (sp, x, y, flip) { g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h); g.restore(); };
    for (i = 0; i < trees.length; i++) { var tr0 = trees[i]; softShadow(g, tr0.x + tr0.r * 0.42, tr0.y + tr0.r * 0.5, tr0.r * 1.3, tr0.r * 0.9, kind === 'ice' ? 0.2 : 0.34); }
    for (i = 0; i < trees.length; i++) {
      var tr = trees[i], rq = Math.max(10, Math.round(tr.r / 2) * 2), sp, key, vrnd = seeded(tr.v * 17 + rq);
      if (kind === 'desert') {
        if (tr.t < 0.34) { key = 'pa' + rq + tr.v; sp = get(key, function () { return palmSprite(px, rq, ['#2f6a34', '#4a8a3a', '#9ccb5a'], seeded(tr.v + rq)); }); }
        else if (tr.t < 0.66) { key = 'ol' + rq + tr.v; sp = get(key, function () { return broadleafSprite(px, rq * 0.78, ['#4a5a30', '#6f8044', '#a3b36a'], seeded(tr.v + rq + 5)); }); }
        else { key = 'rk' + rq + tr.v; sp = get(key, function () { return rockSprite(px, rq * 0.8, '#a68a5e', seeded(tr.v + rq + 9), false); }); }
      } else if (kind === 'volcano') {
        if (tr.t < 0.4) { key = 'ch' + rq + tr.v; sp = get(key, function () { return charredSprite(px, rq, seeded(tr.v + rq)); }); }
        else if (tr.t < 0.85) { key = 'rk' + rq + tr.v; sp = get(key, function () { return rockSprite(px, rq * 0.85, '#4a3c3c', seeded(tr.v + rq + 9), false); }); }
        else { // lav catlagi: parlayan eliptik havuz + siyah kaya kenari
          var va = tr.rot, vr = tr.r;
          var vgl = g.createRadialGradient(tr.x, tr.y, 1, tr.x, tr.y, vr * 2); vgl.addColorStop(0, 'rgba(255,150,50,.55)'); vgl.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = vgl; circ(g, tr.x, tr.y, vr * 2);
          g.save(); g.translate(tr.x, tr.y); g.rotate(va);
          var lp = [], ln = 9, li; for (li = 0; li < ln; li++) { var la = li * TAU / ln, lr = vr * (0.55 + 0.45 * hash(li * 3.7 + tr.v + vr)); lp.push([Math.cos(la) * lr * 1.15, Math.sin(la) * lr * 0.62]); }
          var path = function (sc) { g.beginPath(); lp.forEach(function (q, qi) { if (qi) g.lineTo(q[0] * sc, q[1] * sc); else g.moveTo(q[0] * sc, q[1] * sc); }); g.closePath(); };
          g.fillStyle = '#241716'; path(1.18); g.fill();
          var lvg = g.createRadialGradient(-vr * 0.2, -vr * 0.1, 1, 0, 0, vr * 0.9); lvg.addColorStop(0, '#fff0a0'); lvg.addColorStop(0.35, '#ffa83a'); lvg.addColorStop(1, '#e0481a'); g.fillStyle = lvg; path(1); g.fill();
          g.strokeStyle = 'rgba(255,230,150,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-vr * 0.5, vr * 0.05); g.quadraticCurveTo(0, -vr * 0.2, vr * 0.5, vr * 0.05); g.stroke(); g.restore();
          continue;
        }
      } else if (kind === 'swamp') {
        if (tr.t < 0.55) { key = 'wl' + rq + tr.v; sp = get(key, function () { return willowSprite(px, rq, broadCols, seeded(tr.v + rq)); }); }
        else if (tr.t < 0.82) { key = 'bl' + rq + tr.v; sp = get(key, function () { return broadleafSprite(px, rq * 0.85, broadCols, seeded(tr.v + rq + 3)); }); }
        else { // isildayan mantar
          for (k = 0; k < 4; k++) { var ma = tr.rot + k * 1.6, mx2 = tr.x + Math.cos(ma) * tr.r * 0.45, my2 = tr.y + Math.sin(ma) * tr.r * 0.45, mr2 = tr.r * (0.28 + 0.1 * (k % 2)); var mgl = g.createRadialGradient(mx2, my2, 1, mx2, my2, mr2 * 2.6); mgl.addColorStop(0, k % 2 ? 'rgba(197,140,255,.5)' : 'rgba(111,240,208,.5)'); mgl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = mgl; circ(g, mx2, my2, mr2 * 2.6); blob(g, mx2, my2, mr2, k % 2 ? '#a96cf0' : '#3fd9b4'); }
          continue;
        }
      } else if (tr.t < 0.78) { key = 'cf' + rq + tr.v + kind; sp = get(key, function () { return coniferSprite(px, rq, conCols, kind === 'ice', seeded(tr.v * 7 + rq)); }); }
      else if (kind === 'ice') { key = 'ic' + rq + tr.v; sp = get(key, function () { return rockSprite(px, rq * 0.8, '#b8cfe3', seeded(tr.v + rq + 1), false); }); }
      else { key = 'bl' + rq + tr.v + theme; sp = get(key, function () { return broadleafSprite(px, rq, broadCols, seeded(tr.v * 5 + rq)); }); }
      drawSprite(sp, tr.x, tr.y, tr.v & 1);
    }
    // alt bitki ortusu: calilar, cicekler, kayalar, kutukler (yol kenarinda)
    var flowers = theme === 0 ? ['#ffe066', '#ff8fa3', '#ffffff', '#b197fc'] : theme === 5 ? ['#f2b13c', '#d9701f'] : null;
    for (i = 0; i < 3; i++) for (yy = this.eY + 10; yy < this.pY - 10; yy += 26 + rnd() * 18) for (k = -1; k <= 1; k += 2) {
      if (rnd() < 0.35) continue;
      var bx = this.roadX(i, yy) + k * (68 + rnd() * 12), by = yy + rnd() * 12, br = 5 + rnd() * 6, bk = 'bu' + Math.round(br) + (rnd() < 0.5 ? 'a' : 'b') + theme, sp2;
      softShadow(g, bx + br * 0.4, by + br * 0.5, br * 1.3, br * 0.8, 0.3);
      if (kind === 'volcano') sp2 = get('vr' + Math.round(br) + (rnd() < 0.5), function () { return rockSprite(px, br, '#4a3c3c', seeded(Math.round(br) + 4), false); });
      else if (kind === 'desert') sp2 = get('dr' + Math.round(br) + (rnd() < 0.5), function () { return rockSprite(px, br * 0.95, '#b09468', seeded(Math.round(br) + 2), false); });
      else if (theme === 2) sp2 = get('ir' + Math.round(br) + (rnd() < 0.5), function () { return rockSprite(px, br, '#d6e6f4', seeded(Math.round(br) + 2), false); });
      else sp2 = get(bk, function () { return bushSprite(px, br, kind === 'swamp' ? ['#1f4a3a', '#3a8a64'] : theme === 5 ? ['#7a4a1a', '#c4721f'] : ['#2a6a34', '#4a9a52'], flowers, seeded(Math.round(br) + 1)); });
      drawSprite(sp2, bx, by, rnd() < 0.5);
    }
    for (i = 0; i < 16; i++) { // tas kumeleri ve kutukler
      var rx3 = ox + strips[1 + Math.floor(rnd() * 2)][0] + 10 + rnd() * 80, ry3 = top + 120 + rnd() * (bot - top - 240), rr3 = 6 + rnd() * 7;
      if (rnd() < 0.55) { softShadow(g, rx3 + rr3 * 0.4, ry3 + rr3 * 0.6, rr3 * 1.4, rr3 * 0.9, 0.34); drawSprite(get('sr' + Math.round(rr3) + kind + (rnd() < 0.5), function () { return rockSprite(px, rr3, kind === 'volcano' ? '#4a3c3c' : kind === 'desert' ? '#b09468' : theme === 2 ? '#c4d8ea' : '#8b909c', seeded(Math.round(rr3) + 7), kind === 'forest'); }), rx3, ry3, false); }
      else if (theme === 0 || theme === 5) {
        g.save(); g.translate(rx3, ry3); g.rotate(rnd() * 3); softShadow(g, 3, 4, 20, 7, 0.3);
        var lgl = g.createLinearGradient(0, -4.5, 0, 4.5); lgl.addColorStop(0, '#7b552e'); lgl.addColorStop(0.5, '#5b3d22'); lgl.addColorStop(1, '#3a2614'); g.fillStyle = lgl; rrect(g, -17, -4.5, 34, 9, 4.5); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8; for (k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 6, -3.5); g.lineTo(k * 6 + 2, 3.5); g.stroke(); }
        g.fillStyle = '#d8b07a'; ell(g, 17, 0, 3, 4.5); g.strokeStyle = '#8a6a3a'; g.lineWidth = 0.8; g.beginPath(); g.arc(17, 0, 1.6, 0, TAU); g.stroke(); g.restore();
      }
    }

    // ==== 7) isik ve renk ====
 lightGrade(g, { W: W, H: H, top: top, bot: bot, ox: ox, rnd: rnd, T: T, kind: kind, theme: theme });
    this.bg = c;
  }


  // ---- Kale onu muharebesi arka plani (acik alan): ayni gercekci katmanlar, harita ogelerine gore ----
  function field() {
    var b = this.battle, T = THEMES[this.theme || 0], map = b.map, W = this.W, H = this.H, rnd = seeded(this.seed || 1), kind = T.kind, theme = this.theme || 0, px = this.px;
    var fx = this.fox, fy = this.foy, FW = Z.FW, FH = Z.FH, i, j, k, night = theme === 6;
    var cv = document.createElement('canvas'); cv.width = this.canvas.width; cv.height = this.canvas.height;
    var g = cv.getContext('2d'); g.setTransform(px, 0, 0, px, 0, 0);
    var top = fy - 6;
    groundLayer(g, { W: W, H: H, top: top, bot: H, rnd: rnd, T: T, kind: kind });
    horizon(g, { W: W, top: top, T: T, kind: kind, theme: theme, seed: this.seed });
    var fog0 = g.createLinearGradient(0, top + 6, 0, top + 90); fog0.addColorStop(0, css(norm(T.sky[2]), 0.3)); fog0.addColorStop(1, css(norm(T.sky[2]), 0)); g.fillStyle = fog0; g.fillRect(0, top + 6, W, 84);
    g.save(); g.translate(fx, fy);

    // -- toprak yol (iki kampi baglar; nehir varsa en yakin gecitten) --
    var s1 = (rnd() - 0.5) * 140, s2 = (rnd() - 0.5) * 160, mx = 360 + s1, my = FH * 0.5;
    var pts = [[360, FH + 10], [360 - s1 * 0.5, FH * 0.78], [mx, my], [360 + s2 * 0.5, FH * 0.22], [360, -10]];
    if (map.river) { var gp = map.river.gaps, gc = gp.map(function (q) { return (q.x0 + q.x1) / 2; }), best = Math.abs(gc[0] - 360) < Math.abs(gc[1] - 360) ? gc[0] : gc[1]; pts[2] = [best, map.river.y]; }
    var poly = [], q2, tt; // ayni egrinin ornekleri (kenar ot, cakil icin)
    (function () {
      var a = pts[0], m;
      for (q2 = 1; q2 < pts.length; q2++) { m = [(pts[q2 - 1][0] + pts[q2][0]) / 2, (pts[q2 - 1][1] + pts[q2][1]) / 2]; for (tt = 0; tt < 1; tt += 0.05) { var u = 1 - tt; poly.push([u * u * a[0] + 2 * u * tt * pts[q2 - 1][0] + tt * tt * m[0], u * u * a[1] + 2 * u * tt * pts[q2 - 1][1] + tt * tt * m[1]]); } a = m; }
      poly.push(pts[pts.length - 1]);
    })();
    function road(w, col, dx) {
      dx = dx || 0; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0] + dx, pts[0][1]);
      for (var q = 1; q < pts.length; q++) { var m = [(pts[q - 1][0] + pts[q][0]) / 2 + dx, (pts[q - 1][1] + pts[q][1]) / 2]; g.quadraticCurveTo(pts[q - 1][0] + dx, pts[q - 1][1], m[0], m[1]); }
      g.lineTo(pts[pts.length - 1][0] + dx, pts[pts.length - 1][1]); g.stroke();
    }
    road(92, 'rgba(0,0,0,.1)'); road(76, css(T.road[2], 0.35)); road(64, shade(T.road[2], -0.1)); road(58, T.road[1]); road(44, shade(T.road[0], 0.1));
    g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.6; road(58, pattern(g, 0.3)); g.globalAlpha = 0.25; road(58, pattern(g, 0.9)); g.restore();
    g.setLineDash([46 + rnd() * 30, 14, 26, 10]); road(5, 'rgba(0,0,0,.14)', -13); road(5, 'rgba(0,0,0,.14)', 13); g.setLineDash([]); road(1.4, 'rgba(255,245,215,.1)', -8); road(1.4, 'rgba(255,245,215,.1)', 8);
    var peb = kind === 'volcano' ? ['#3b3030', '#5a4848'] : kind === 'ice' ? ['#8fa3b8', '#d4e2f0'] : kind === 'desert' ? ['#9a7c46', '#c8aa6c'] : ['#7a6a52', '#a89677'];
    for (k = 0; k < 130; k++) { var pp = poly[Math.floor(rnd() * poly.length)], pxx = pp[0] + (rnd() - 0.5) * 66, py = pp[1] + (rnd() - 0.5) * 8, pr = 0.9 + rnd() * rnd() * 3.4; g.fillStyle = 'rgba(0,0,0,.28)'; ell(g, pxx + pr * 0.4, py + pr * 0.5, pr * 1.05, pr * 0.7); g.fillStyle = peb[rnd() < 0.5 ? 0 : 1]; ell(g, pxx, py, pr, pr * 0.72); g.fillStyle = 'rgba(255,255,255,.22)'; ell(g, pxx - pr * 0.3, py - pr * 0.3, pr * 0.45, pr * 0.3); }
    for (k = 0; k < poly.length; k++) for (j = -1; j <= 1; j += 2) { // yol kenarinda ot/kum/kar kiyilari
      var ex = poly[k][0] + j * (36 + rnd() * 10), ey = poly[k][1] + (rnd() - 0.5) * 6;
      if (kind === 'volcano') { g.fillStyle = css('#3a2c2c', 0.9); ell(g, ex, ey, 2 + rnd() * 3, 1.4 + rnd() * 1.4); }
      else if (theme === 2) { g.fillStyle = 'rgba(255,255,255,.85)'; ell(g, ex, ey, 3 + rnd() * 4, 1.8 + rnd() * 1.4); }
      else if (kind === 'desert') { g.strokeStyle = 'rgba(120,90,40,.75)'; g.lineWidth = 1.2; g.beginPath(); for (var bl = 0; bl < 3; bl++) { g.moveTo(ex, ey); g.lineTo(ex + (bl - 1) * 3, ey - 5 - rnd() * 4); } g.stroke(); }
      else { g.strokeStyle = css(shade(T.g[1], rnd() < 0.5 ? 0.3 : -0.2), 0.95); g.lineWidth = 1.3; g.beginPath(); for (var bl2 = 0; bl2 < 4; bl2++) { g.moveTo(ex + (bl2 - 1.5) * 1.6, ey); g.quadraticCurveTo(ex + (bl2 - 1.5) * 2.4, ey - 4, ex + (bl2 - 1.5) * 3.4 + (rnd() - 0.5) * 3, ey - 7 - rnd() * 5); } g.stroke(); }
    }
    // kale onu ve kamp onu ezilmis toprak
    [[FH - 30, 1], [18, 1]].forEach(function (z) { var zg = g.createRadialGradient(360, z[0], 10, 360, z[0], 300); zg.addColorStop(0, css(T.road[1], 0.55)); zg.addColorStop(1, css(T.road[1], 0)); g.save(); g.translate(360, z[0]); g.scale(1, 0.22); g.translate(-360, -z[0]); g.fillStyle = zg; circ(g, 360, z[0], 300); g.restore(); });

    // -- nehir: derinlik, akis cizgileri, kopuk, kiyi --
    if (map.river) {
      var rv = map.river, W4 = waterColsField(kind), y0 = rv.y - rv.hw, y1 = rv.y + rv.hw, segs = [[-30, rv.gaps[0].x0], [rv.gaps[0].x1, rv.gaps[1].x0], [rv.gaps[1].x1, FW + 30]];
      var wob = function (x, ph) { return Math.sin(x * 0.045 + ph) * 3.2 + Math.sin(x * 0.11 + ph * 2) * 1.6; };
      segs.forEach(function (sg) {
        if (sg[1] - sg[0] < 4) return; var x;
        var bank = function (e, dy, ph) { g.beginPath(); for (x = sg[0]; x <= sg[1]; x += 8) g.lineTo(x, y0 - e + wob(x, ph) + dy); for (x = sg[1]; x >= sg[0]; x -= 8) g.lineTo(x, y1 + e + wob(x, ph + 2) - dy); g.closePath(); };
        bank(14, 0, 0.5); g.fillStyle = 'rgba(0,0,0,.22)'; g.fill();               // kiyi golgesi
        bank(9, 0, 0.3); g.fillStyle = kind === 'ice' ? '#e8f1fa' : kind === 'volcano' ? '#2a1a14' : kind === 'desert' ? '#c8aa6c' : '#6b5638'; g.fill();   // islak toprak/kum
        bank(4, 0, 0.4); g.fillStyle = W4[3]; g.fill();
        bank(0, 0, 0.5);
        var wg = g.createLinearGradient(0, y0, 0, y1); wg.addColorStop(0, W4[2]); wg.addColorStop(0.22, W4[1]); wg.addColorStop(0.5, W4[0]); wg.addColorStop(0.78, W4[1]); wg.addColorStop(1, W4[2]); g.fillStyle = wg; g.fill();
        g.save(); bank(0, 0, 0.5); g.clip();
        var rf = g.createLinearGradient(0, y0, 0, y0 + (y1 - y0) * 0.55); rf.addColorStop(0, css(norm(T.sky[2]), 0.45)); rf.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rf; g.fillRect(sg[0], y0 - 8, sg[1] - sg[0], (y1 - y0));
        g.lineCap = 'round'; for (k = 0; k < Math.round((sg[1] - sg[0]) / 14); k++) { var sx = sg[0] + rnd() * (sg[1] - sg[0]), sy = y0 + 4 + rnd() * (y1 - y0 - 8), sl = 14 + rnd() * 34; g.strokeStyle = 'rgba(255,255,255,' + (0.12 + rnd() * 0.22) + ')'; g.lineWidth = 1 + rnd() * 1.2; g.beginPath(); g.moveTo(sx, sy); g.bezierCurveTo(sx + sl * 0.3, sy - 2, sx + sl * 0.7, sy + 2, sx + sl, sy); g.stroke(); }
        for (k = 0; k < 14; k++) { g.fillStyle = 'rgba(255,255,255,.6)'; ell(g, sg[0] + rnd() * (sg[1] - sg[0]), y0 + rnd() * (y1 - y0), 1.4 + rnd() * 1.6, 0.8); }
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); for (x = sg[0]; x <= sg[1]; x += 6) { var fyy = y0 + 2 + wob(x, 0.5) + Math.sin(x * 0.3) * 0.8; if (x === sg[0]) g.moveTo(x, fyy); else g.lineTo(x, fyy); } g.stroke();
        g.beginPath(); for (x = sg[0]; x <= sg[1]; x += 6) { var fyy2 = y1 - 2 + wob(x, 2.4) + Math.sin(x * 0.3) * 0.8; if (x === sg[0]) g.moveTo(x, fyy2); else g.lineTo(x, fyy2); } g.stroke();
        g.restore();
        if (kind !== 'ice' && kind !== 'volcano') for (k = 0; k < Math.round((sg[1] - sg[0]) / 26); k++) { // kiyida kamis / ot
          var rx0 = sg[0] + rnd() * (sg[1] - sg[0]), ry0 = (rnd() < 0.5 ? y0 - 9 : y1 + 9) + wob(rx0, 1);
          g.strokeStyle = kind === 'swamp' ? '#5f7a3a' : kind === 'desert' ? '#8a7a3a' : '#4d7a35'; g.lineWidth = 1.3; g.beginPath(); for (var rd = 0; rd < 4; rd++) { g.moveTo(rx0 + rd * 2, ry0); g.lineTo(rx0 + rd * 2 + (rnd() - 0.5) * 4, ry0 - 8 - rnd() * 7); } g.stroke();
        }
      });
      rv.gaps.forEach(function (gp2) { // gecit: cakillik + basamak taslari + islak kenar
        var w = gp2.x1 - gp2.x0, sand = g.createLinearGradient(0, y0 - 8, 0, y1 + 8); sand.addColorStop(0, shade(T.road[1], -0.1)); sand.addColorStop(0.5, shade(T.road[0], 0.05)); sand.addColorStop(1, shade(T.road[1], -0.1));
        g.fillStyle = sand; rrect(g, gp2.x0, y0 - 9, w, y1 - y0 + 18, 9); g.fill();
        g.save(); g.beginPath(); g.rect(gp2.x0, y0 - 9, w, y1 - y0 + 18); g.clip(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = pattern(g, 0.35); g.fillRect(gp2.x0, y0 - 9, w, y1 - y0 + 18); g.restore();
        g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, gp2.x0 + 2, rv.y, 6, rv.hw + 5); ell(g, gp2.x1 - 2, rv.y, 6, rv.hw + 5);
        for (var qq = 0; qq < 18; qq++) { var sx2 = gp2.x0 + 8 + rnd() * (w - 16), sy2 = y0 + 3 + rnd() * (y1 - y0 - 6), sr = 2.5 + rnd() * 3.5; g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, sx2 + 1, sy2 + 1.5, sr * 1.1, sr * 0.75); g.fillStyle = qq % 2 ? '#9a9486' : '#bdb7a8'; ell(g, sx2, sy2, sr, sr * 0.75); g.fillStyle = 'rgba(255,255,255,.3)'; ell(g, sx2 - 1, sy2 - 1, sr * 0.45, sr * 0.3); }
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.4; for (qq = 0; qq < 5; qq++) { g.beginPath(); g.moveTo(gp2.x0 - 6, y0 + 4 + qq * 8); g.lineTo(gp2.x0 + 3, y0 + 5 + qq * 8); g.moveTo(gp2.x1 - 3, y0 + 4 + qq * 8); g.lineTo(gp2.x1 + 6, y0 + 5 + qq * 8); g.stroke(); }
      });
    }

    // -- tepeler: isiga gore golgeli kubbe + ot dokusu + isaret --
    map.hills.forEach(function (h) {
      softShadow(g, h.x + h.r * 0.3, h.y + h.r * 0.42, h.r * 1.2, h.r * 0.7, 0.34);
      for (k = 0; k < 3; k++) {
        var f = 1 - k * 0.26, hy = h.y - k * 7, hr = h.r * f, col = k % 2 ? T.g[0] : T.g[1];
        var hg = g.createRadialGradient(h.x - hr * 0.35, hy - hr * 0.4, hr * 0.05, h.x, hy, hr * 1.05);
        hg.addColorStop(0, shade(col, 0.34)); hg.addColorStop(0.5, col); hg.addColorStop(1, shade(col, -0.4));
        g.fillStyle = hg; ell(g, h.x, hy, hr, hr * 0.8);
        g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(h.x, hy, hr, hr * 0.8, 0, 0.2, 2.9); g.stroke();
        g.strokeStyle = 'rgba(255,255,230,.14)'; g.beginPath(); g.ellipse(h.x, hy, hr, hr * 0.8, 0, 3.5, 5.6); g.stroke();
      }
      var ghue = kind === 'desert' ? '#d8be82' : kind === 'ice' ? '#ffffff' : kind === 'volcano' ? '#6a5252' : '#a8c45a'; g.strokeStyle = css(ghue, 0.5); g.lineWidth = 1; g.lineCap = 'round'; g.beginPath();
      for (k = 0; k < 90; k++) { var ha = rnd() * TAU, hd = Math.sqrt(rnd()) * h.r * 0.85, hx = h.x + Math.cos(ha) * hd, hy2 = h.y - 10 + Math.sin(ha) * hd * 0.7; g.moveTo(hx, hy2); g.lineTo(hx + (rnd() - 0.5) * 3, hy2 - 3 - rnd() * 4); } g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(h.x - 9, h.y - 4); g.lineTo(h.x, h.y - 13); g.lineTo(h.x + 9, h.y - 4); g.stroke();
    });

    // -- ormanlar: golge + sprite agaclar --
    var cache = {}, get = function (key, make) { return cache[key] || (cache[key] = make()); };
    var broadCols = T.leaf || (kind === 'swamp' ? ['#1d4a38', '#2f7a5a', '#6fd1a3'] : ['#25602f', '#3a8a44', '#78b85a']);
    var conCols = kind === 'ice' ? ['#1f4a52', '#2f6a70', '#4f9a9a'] : [T.tree[0], T.tree[1], T.tree[2] === '#eef6fd' ? '#cfe6f6' : T.tree[2]];
    var drawSprite = function (sp, x, y, flip) { g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h); g.restore(); };
    map.forests.forEach(function (f) {
      softShadow(g, f.x + 6, f.y + 9, f.r * 1.08, f.r * 0.9, 0.3);
      var n = Math.round(f.r * f.r / 230), trees = [];
      for (j = 0; j < n; j++) { var a = rnd() * TAU, d = Math.sqrt(rnd()) * (f.r - 12); trees.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d, r: 14 + rnd() * 10, t: rnd(), v: Math.floor(rnd() * 4) }); }
      trees.sort(function (p, q) { return p.y - q.y; });
      trees.forEach(function (t) { softShadow(g, t.x + t.r * 0.4, t.y + t.r * 0.5, t.r * 1.2, t.r * 0.85, 0.3); });
      trees.forEach(function (t) {
        var rq = Math.max(10, Math.round(t.r / 2) * 2), sp, key = kind + t.v + rq + (t.t < 0.7 ? 'a' : 'b');
        if (kind === 'desert') sp = t.t < 0.5 ? get('pa' + key, function () { return palmSprite(px, rq, ['#2f6a34', '#4a8a3a', '#9ccb5a'], seeded(t.v + rq)); }) : get('ol' + key, function () { return broadleafSprite(px, rq * 0.8, ['#4a5a30', '#6f8044', '#a3b36a'], seeded(t.v + rq + 5)); });
        else if (kind === 'volcano') sp = t.t < 0.6 ? get('ch' + key, function () { return charredSprite(px, rq, seeded(t.v + rq)); }) : get('rk' + key, function () { return rockSprite(px, rq * 0.85, '#4a3c3c', seeded(t.v + rq + 9), false); });
        else if (kind === 'swamp') sp = t.t < 0.6 ? get('wl' + key, function () { return willowSprite(px, rq, broadCols, seeded(t.v + rq)); }) : get('bl' + key, function () { return broadleafSprite(px, rq * 0.85, broadCols, seeded(t.v + rq + 3)); });
        else if (t.t < 0.7) sp = get('cf' + key, function () { return coniferSprite(px, rq, conCols, kind === 'ice', seeded(t.v * 7 + rq)); });
        else sp = get('bl' + key, function () { return broadleafSprite(px, rq, broadCols, seeded(t.v * 5 + rq)); });
        drawSprite(sp, t.x, t.y, t.v & 1);
      });
    });

    // -- kayalar --
    var rockBase = kind === 'volcano' ? '#4a3c3c' : kind === 'ice' ? '#b8cfe3' : kind === 'desert' ? '#a68a5e' : '#8b909c';
    map.rocks.forEach(function (rk) {
      softShadow(g, rk.x + rk.r * 0.4, rk.y + rk.r * 0.55, rk.r * 1.4, rk.r * 0.85, 0.36);
      drawSprite(get('rk' + Math.round(rk.r) + kind + (rk.x > 360 ? 1 : 0), function () { return rockSprite(px, rk.r, rockBase, seeded(Math.round(rk.r * 7 + rk.x)), kind === 'forest'); }), rk.x, rk.y, rk.x > 360);
    });

    // -- kale onu golgeleri: duvar ve cit dibi --
    var wsh = g.createLinearGradient(0, 40, 0, 96); wsh.addColorStop(0, 'rgba(0,0,0,.38)'); wsh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = wsh; g.fillRect(0, 40, FW, 56);
    var csh = g.createLinearGradient(0, FH - 70, 0, FH - 24); csh.addColorStop(0, 'rgba(0,0,0,0)'); csh.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = csh; g.fillRect(0, FH - 70, FW, 46);
    g.restore();

    lightGrade(g, { W: W, H: H, top: fy, bot: fy + FH, ox: fx, rnd: rnd, T: T, kind: kind, theme: theme, bottomDark: false });
    // oyun alani disi: arayuz altinda kalan kenarlari karart
    var vt = g.createLinearGradient(0, fy - 40, 0, fy + 26); vt.addColorStop(0, 'rgba(6,10,24,.45)'); vt.addColorStop(1, 'rgba(6,10,24,0)'); g.fillStyle = vt; g.fillRect(0, 0, W, fy + 26);
    var vb = g.createLinearGradient(0, fy + FH - 26, 0, fy + FH + 40); vb.addColorStop(0, 'rgba(6,10,24,0)'); vb.addColorStop(1, 'rgba(6,10,24,.6)'); g.fillStyle = vb; g.fillRect(0, fy + FH - 26, W, H - (fy + FH) + 26);
    this.bg = cv;
  }
  function waterColsField(kind) {
    return kind === 'volcano' ? ['#8a2a0c', '#e0561a', '#ffb347', '#3a1208'] : kind === 'ice' ? ['#6fa8d6', '#a9d4f2', '#e8f6ff', '#4b7fa8']
      : kind === 'swamp' ? ['#1f3f35', '#2f6350', '#5fa88a', '#142a22'] : kind === 'desert' ? ['#2f7fa6', '#52a9c9', '#bfe8f2', '#1f5f7e'] : ['#245f94', '#3f8ac4', '#a9dcf5', '#17436b'];
  }

  R.buildBg = function () {
    try { build.call(this); } catch (e) { if (typeof console !== 'undefined') console.warn('scenery: basit arka plana donuldu', e); this.buildBgBasic(); }
  };
  R.Scenery = { build: build, field: field };
})(globalThis.Z = globalThis.Z || {});
