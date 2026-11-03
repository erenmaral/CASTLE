// Seferhan - WebAudio ile sentezlenen ses efektleri ve basit davul muzigi (dosya yok, telifsiz)
(function (Z) {
  'use strict';
  var ctx = null, master = null, noiseBuf = null, musicTimer = null, beat = 0, last = {};
  var A = {
    enabled: true, musicOn: true,
    init: function () {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      var AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; }
    },
    ok: function (key, gap) { // ayni sesin cok sik calinmasini engelle
      if (!ctx || !A.enabled) return false;
      var n = ctx.currentTime; if (last[key] && n - last[key] < gap) return false; last[key] = n; return true;
    },
    tone: function (f0, f1, dur, type, vol, delay) {
      var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    },
    noise: function (dur, vol, freq, delay) {
      var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq || 1500;
      g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
    },
    click: function () { if (A.ok('click', 0.04)) A.tone(660, 880, 0.07, 'triangle', 0.15); },
    back: function () { if (A.ok('back', 0.04)) A.tone(500, 330, 0.08, 'triangle', 0.15); },
    spawn: function () { if (A.ok('spawn', 0.05)) { A.tone(280, 420, 0.12, 'square', 0.07); } },
    deny: function () { if (A.ok('deny', 0.15)) A.tone(160, 110, 0.15, 'sawtooth', 0.12); },
    hit: function () { if (A.ok('hit', 0.06)) { A.noise(0.07, 0.16, 2200); A.tone(180, 90, 0.06, 'square', 0.05); } },
    shoot: function () { if (A.ok('shoot', 0.07)) A.tone(900, 300, 0.09, 'sawtooth', 0.05); },
    boom: function () { if (A.ok('boom', 0.1)) { A.noise(0.25, 0.3, 300); A.tone(120, 40, 0.25, 'sine', 0.25); } },
    death: function () { if (A.ok('death', 0.08)) A.tone(300, 80, 0.18, 'sawtooth', 0.08); },
    coin: function () { if (A.ok('coin', 0.05)) { A.tone(988, 0, 0.06, 'square', 0.06); A.tone(1319, 0, 0.1, 'square', 0.06, 0.06); } },
    baseHit: function () { if (A.ok('base', 0.15)) { A.noise(0.2, 0.28, 400); A.tone(90, 50, 0.2, 'sine', 0.3); } },
    skill: function (kind) {
      if (!ctx || !A.enabled) return;
      if (kind === 'freeze') { A.freeze(); return; }
      if (kind === 'dragon') { A.noise(0.7, 0.32, 600); A.tone(160, 60, 0.7, 'sawtooth', 0.18); A.tone(90, 50, 0.7, 'sine', 0.2); return; }
      if (kind === 'bolt') { A.noise(0.4, 0.35, 3000); A.tone(1200, 100, 0.4, 'sawtooth', 0.15); }
      else if (kind === 'ward') { A.tone(400, 800, 0.4, 'triangle', 0.2); A.tone(600, 1200, 0.4, 'triangle', 0.1, 0.1); }
      else { A.tone(200, 400, 0.5, 'sawtooth', 0.18); A.tone(300, 600, 0.5, 'sawtooth', 0.12, 0.05); }
    },
    win: function () {
      if (!ctx || !A.enabled) return;
      [523, 659, 784, 1047].forEach(function (f, i) { A.tone(f, 0, 0.3, 'triangle', 0.2, i * 0.13); });
      A.tone(1047, 0, 0.8, 'triangle', 0.2, 0.55);
    },
    lose: function () {
      if (!ctx || !A.enabled) return;
      [392, 330, 262, 196].forEach(function (f, i) { A.tone(f, 0, 0.35, 'sawtooth', 0.12, i * 0.2); });
    },
    heal: function () { if (A.ok('heal', 0.12)) { A.tone(660, 990, 0.14, 'sine', 0.09); } },
    freeze: function () { if (!ctx || !A.enabled) return; A.noise(0.5, 0.25, 5000); A.tone(1500, 400, 0.5, 'triangle', 0.14); A.tone(2200, 900, 0.4, 'sine', 0.08, 0.05); },
    fire: function () { if (A.ok('fire', 0.12)) { A.noise(0.18, 0.16, 900); A.tone(180, 90, 0.14, 'sawtooth', 0.06); } },
    perk: function () { if (!ctx || !A.enabled) return; [523, 659, 784].forEach(function (f, i) { A.tone(f, 0, 0.18, 'triangle', 0.16, i * 0.08); }); },
    star: function (i) { if (ctx && A.enabled) A.tone(700 + i * 200, 0, 0.25, 'triangle', 0.2); },
    chest: function () {
      if (!ctx || !A.enabled) return;
      A.noise(0.3, 0.2, 800); [440, 554, 659, 880].forEach(function (f, i) { A.tone(f, 0, 0.2, 'square', 0.1, 0.1 + i * 0.07); });
    },
    // Basit davul dongusu (savasta calar)
    musicStart: function () {
      if (!ctx || musicTimer || !A.musicOn || !A.enabled) return;
      beat = 0;
      musicTimer = setInterval(function () {
        if (!A.enabled || !A.musicOn) return;
        var b = beat++ % 16;
        if (b % 4 === 0) { A.tone(110, 45, 0.18, 'sine', 0.22); }
        if (b % 8 === 4 || b === 14) { A.noise(0.08, 0.07, 1800); }
        if (b === 0) { A.tone(55, 0, 0.9, 'sawtooth', 0.04); }
        if (b === 8) { A.tone(65, 0, 0.9, 'sawtooth', 0.04); }
        if (b === 6 || b === 15) { A.tone(220 * (b === 6 ? 1 : 1.2), 0, 0.12, 'triangle', 0.04); }
      }, 230);
    },
    musicStop: function () { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
    vibrate: function (ms) {
      if (Z.Save && Z.Save.data && !Z.Save.data.settings.vibrate) return;
      try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* yok say */ }
    }
  };
  Z.Audio = A;
})(globalThis.Z = globalThis.Z || {});
