// Sefer Vakti - SAVAS SESLERI: WebAudio ile sentezlenir (dosya yok, telifsiz).
// Kilic/kalkan carpismasi, ok vinlamasi, at nali, savas boruzu, taiko davullari, savas narasi, arka plan savas uğultusu.
// Yogunluk (setIntensity) arttikca muzik hizlanir ve ortam sesi yukselir.
(function (Z) {
  'use strict';
  var ctx = null, master = null, sfxBus = null, musicBus = null, ambBus = null, noiseBuf = null, brownBuf = null;
  var musicTimer = null, nextT = 0, stepI = 0, last = {}, active = 0, intensity = 0, amb = null;
  var envBus = null, envTimer = null, realm = 0, mode = 'battle', volM = 0.7, volS = 1;
  var rnd = Math.random;

  function now() { return ctx.currentTime; }
  // ayni anda cok fazla ses cikmasin (telefon islemcisini koru)
  function voice(ms) { if (active >= 22) return false; active++; setTimeout(function () { active--; }, ms || 250); return true; }

  // salinimli ton: f0 -> f1 (0 = degisme yok), vol, gecikme, ses yolu, atak suresi
  function tone(f0, f1, dur, type, vol, delay, bus, att) {
    var t = now() + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain(), a = att || 0.004;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.2), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.03);
  }
  // suzulmus gurultu: ftype 'lowpass'|'highpass'|'bandpass', f0 -> f1
  function noise(dur, vol, ftype, f0, f1, q, delay, bus, att, brown) {
    var t = now() + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), a = att || 0.004;
    s.buffer = brown ? brownBuf : noiseBuf; f.type = ftype; f.Q.value = q || 0.8;
    f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus); s.start(t, rnd() * 1.4); s.stop(t + dur + 0.03);
  }
  // pirinc boru (savas borusu): iki testere dalga + alcak gecirgen filtre + hafif titresim
  function horn(f, dur, vol, delay) {
    var t = now() + (delay || 0), flt = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    flt.type = 'lowpass'; flt.Q.value = 2.2; flt.frequency.setValueAtTime(380, t); flt.frequency.exponentialRampToValueAtTime(1500, t + 0.18); flt.frequency.exponentialRampToValueAtTime(700, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.1); g.gain.setValueAtTime(vol, t + Math.max(0.12, dur - 0.18)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lfo.frequency.value = 5.2; lg.gain.value = f * 0.006; lfo.connect(lg);
    [1, 1.498, 2].forEach(function (m, i) {
      var o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f * m; og.gain.value = i === 0 ? 1 : i === 1 ? 0.55 : 0.25; lg.connect(o.frequency);
      o.connect(og); og.connect(flt); o.start(t); o.stop(t + dur + 0.05);
    });
    lfo.start(t); lfo.stop(t + dur + 0.05); flt.connect(g); g.connect(sfxBus);
  }
  function clash(v) { // metal kilic/kalkan carpismasi
    noise(0.06, 0.45 * v, 'highpass', 3600, 3600, 0.7); tone(1650 + rnd() * 350, 1500, 0.24, 'sine', 0.2 * v); tone(2600 + rnd() * 500, 2350, 0.18, 'sine', 0.13 * v); tone(3900, 3600, 0.12, 'sine', 0.07 * v); tone(150, 85, 0.09, 'triangle', 0.22 * v);
  }
  function thud(v) { noise(0.1, 0.32 * v, 'lowpass', 750, 200, 0.8); tone(115, 52, 0.15, 'sine', 0.34 * v); }
  function slash(v) { noise(0.11, 0.28 * v, 'bandpass', 1900, 850, 1.2); tone(230, 110, 0.08, 'sawtooth', 0.07 * v); }
  function battleCry(v) { // kalabalik savas narasi (iki formant)
    noise(0.8, 0.3 * v, 'bandpass', 620, 880, 3, 0, null, 0.28); noise(0.8, 0.24 * v, 'bandpass', 1150, 1500, 4, 0, null, 0.3); noise(0.7, 0.14 * v, 'lowpass', 400, 300, 0.7, 0, null, 0.2, true);
  }
  function hooves(n, v) { for (var i = 0; i < n; i++) { tone(130, 70, 0.07, 'sine', 0.28 * v, i * 0.085); noise(0.04, 0.16 * v, 'lowpass', 1200, 400, 1, i * 0.085); } }
  function tom(f, v, bus) { tone(f * 1.7, f, 0.2, 'sine', 0.55 * v, 0, bus); tone(f * 0.5, f * 0.4, 0.3, 'triangle', 0.25 * v, 0, bus); noise(0.05, 0.2 * v, 'lowpass', 2200, 500, 0.8, 0, bus); }

  var sfxLvl = 1;
  var A = {
    enabled: true, musicOn: true, noVibrate: false,
    // Ses duzeyleri (0..1): muzik ve efekt ayri
    setVolumes: function (m, sfx) {
      volM = Math.max(0, Math.min(1, m)); volS = Math.max(0, Math.min(1, sfx));
      if (ctx) { musicBus.gain.setTargetAtTime(0.5 * volM, now(), 0.05); sfxBus.gain.setTargetAtTime(0.95 * sfxLvl * volS, now(), 0.05); envBus.gain.setTargetAtTime(0.9 * volS, now(), 0.05); }
    },
    setRealm: function (r) { realm = Math.max(0, Math.min(REALMS.length - 1, r | 0)); },   // diyara ozel ortam sesi + muzik tonu
    setMode: function (m) { mode = m === 'menu' ? 'menu' : 'battle'; },                       // menu: sakin destansi, savas: tam tempo
    gem: function () { if (A.ok('gem', 0.08) && voice(500)) { [1568, 2093, 2637].forEach(function (f, i) { tone(f, 0, 0.35, 'triangle', 0.07, i * 0.07); }); tone(3136, 0, 0.5, 'sine', 0.04, 0.2); noise(0.08, 0.06, 'highpass', 7000, 7000, 1, 0.05); } },
    reward: function () { if (!ctx || !A.enabled) return; [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0, 0.32, 'triangle', 0.09, i * 0.08); }); noise(0.4, 0.1, 'highpass', 6000, 8000, 1, 0.3); },
    tab: function () { if (A.ok('tab', 0.05)) { tone(520, 700, 0.07, 'triangle', 0.07); noise(0.03, 0.08, 'bandpass', 2200, 2200, 2); } },
    setSfxLevel: function (v) { sfxLvl = v; if (sfxBus && ctx) sfxBus.gain.setTargetAtTime(0.95 * v * volS, now(), 0.1); },
    init: function () {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      var AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.16;
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.95 * sfxLvl; sfxBus.connect(master);
        musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
        ambBus = ctx.createGain(); ambBus.gain.value = 0.0; ambBus.connect(master);
        envBus = ctx.createGain(); envBus.gain.value = 0.9; envBus.connect(master);
        sfxBus.gain.value = 0.95 * sfxLvl * volS; musicBus.gain.value = 0.5 * volM;
        var len = ctx.sampleRate * 2, i, d, b = 0;
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); d = noiseBuf.getChannelData(0); for (i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
        brownBuf = ctx.createBuffer(1, len, ctx.sampleRate); d = brownBuf.getChannelData(0); for (i = 0; i < len; i++) { b = (b + 0.02 * (rnd() * 2 - 1)) / 1.02; d[i] = b * 3.5; }
      } catch (e) { ctx = null; }
    },
    ok: function (key, gap) { if (!ctx || !A.enabled) return false; var n = now(); if (last[key] && n - last[key] < gap) return false; last[key] = n; return true; },

    // ---- arayuz ----
    click: function () { if (A.ok('click', 0.04)) { noise(0.045, 0.18, 'bandpass', 1500, 900, 2); tone(390, 260, 0.06, 'triangle', 0.1); } },
    back: function () { if (A.ok('back', 0.04)) { noise(0.05, 0.16, 'bandpass', 900, 600, 2); tone(250, 170, 0.07, 'triangle', 0.1); } },
    deny: function () { if (A.ok('deny', 0.15)) { tone(140, 85, 0.15, 'square', 0.07); noise(0.07, 0.2, 'lowpass', 500, 280, 1); } },
    coin: function () { if (A.ok('coin', 0.05) && voice(300)) { tone(2400, 2300, 0.14, 'triangle', 0.09); tone(3300, 3200, 0.2, 'triangle', 0.07, 0.05); noise(0.03, 0.08, 'highpass', 5000, 5000, 1); } },
    star: function (i) { if (ctx && A.enabled) { tone(700 + i * 180, 0, 0.45, 'sine', 0.14); tone((700 + i * 180) * 2, 0, 0.3, 'sine', 0.05); } },
    chest: function () { if (!ctx || !A.enabled) return; tone(120, 200, 0.28, 'sawtooth', 0.05, 0, null, 0.1); noise(0.22, 0.14, 'lowpass', 600, 1200, 1); [0, 1, 2, 3].forEach(function (i) { tone(1800 + i * 500, 1700 + i * 450, 0.16, 'triangle', 0.08, 0.18 + i * 0.07); }); },
    perk: function () { if (!ctx || !A.enabled) return; [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0, 0.3, 'triangle', 0.12, i * 0.07); }); },
    heal: function () { if (A.ok('heal', 0.14) && voice(400)) { tone(880, 0, 0.4, 'sine', 0.1); tone(1320, 0, 0.32, 'sine', 0.06, 0.06); } },

    // ---- savas ----
    spawn: function (cls) {
      if (!A.ok('spawn', 0.06) || !voice(300)) return;
      if (cls === 'cav' || cls === 'assassin') { hooves(cls === 'cav' ? 3 : 2, 0.7); return; }
      if (cls === 'golem') { thud(1.1); tone(70, 45, 0.3, 'sine', 0.3); return; }
      if (cls === 'cata') { noise(0.25, 0.2, 'lowpass', 500, 300, 1); tone(100, 160, 0.2, 'sawtooth', 0.04, 0, null, 0.1); return; }
      noise(0.07, 0.17, 'bandpass', 2400, 1900, 3); tone(480 + rnd() * 120, 620, 0.07, 'triangle', 0.05); thud(0.35);
    },
    hit: function () {
      if (!A.ok('hit', 0.05) || !voice(260)) return;
      var r = rnd(); if (r < 0.5) clash(0.85); else if (r < 0.8) thud(0.85); else slash(0.9);
    },
    shoot: function () { if (A.ok('shoot', 0.07) && voice(220)) { noise(0.15, 0.2, 'bandpass', 700, 2800, 2); tone(330, 190, 0.11, 'triangle', 0.06); } },
    boom: function () { if (A.ok('boom', 0.1) && voice(700)) { tone(95, 36, 0.55, 'sine', 0.5); noise(0.55, 0.32, 'lowpass', 900, 110, 0.7); noise(0.7, 0.3, 'lowpass', 300, 150, 0.7, 0, null, 0.01, true); } },
    death: function () {
      if (!A.ok('death', 0.09) || !voice(350)) return;
      noise(0.3, 0.2, 'lowpass', 900, 140, 0.7); tone(230, 68, 0.26, 'sawtooth', 0.06);
      if (rnd() < 0.5) noise(0.28, 0.12, 'bandpass', 520, 330, 4, 0.02); // boguk inilti
    },
    baseHit: function () {
      if (!A.ok('base', 0.15) || !voice(600)) return;
      noise(0.5, 0.4, 'lowpass', 1300, 140, 0.7); tone(62, 38, 0.45, 'sine', 0.5); for (var i = 0; i < 4; i++) noise(0.05, 0.12, 'bandpass', 1500 + rnd() * 1500, 1200, 2, 0.12 + i * 0.07);
    },
    charge: function () { if (A.ok('charge', 0.4) && voice(600)) { hooves(5, 0.8); horn(147, 0.5, 0.07); } },
    fire: function () { if (A.ok('fire', 0.12) && voice(400)) { noise(0.32, 0.26, 'bandpass', 500, 1700, 1.2); noise(0.35, 0.2, 'lowpass', 280, 160, 0.7, 0, null, 0.02, true); } },
    freeze: function () {
      if (!ctx || !A.enabled) return;
      noise(0.55, 0.2, 'highpass', 4800, 7500, 1); for (var i = 0; i < 4; i++) tone(2000 + rnd() * 2200, 0, 0.3, 'sine', 0.07, i * 0.06); noise(0.1, 0.25, 'bandpass', 3000, 1500, 3, 0.2);
    },
    skill: function (kind) {
      if (!ctx || !A.enabled) return;
      if (kind === 'freeze') { A.freeze(); return; }
      if (kind === 'dragon') { tone(88, 44, 1.0, 'sawtooth', 0.2, 0, null, 0.08); noise(0.9, 0.25, 'bandpass', 320, 220, 2, 0, null, 0.1); A.fire(); return; }
      if (kind === 'bolt') { noise(0.4, 0.4, 'highpass', 2500, 6500, 0.8); tone(2600, 90, 0.4, 'sawtooth', 0.14); noise(0.9, 0.35, 'lowpass', 320, 120, 0.7, 0.05, null, 0.02, true); return; }
      if (kind === 'ward') { [392, 494, 587].forEach(function (f, i) { tone(f, 0, 1.0, 'sine', 0.08, i * 0.05, null, 0.18); }); tone(1175, 0, 0.7, 'sine', 0.04, 0.2); return; }
      battleCry(0.9); horn(131, 0.9, 0.12); // zafer naraasi
    },
    battleStart: function () { if (!ctx || !A.enabled) return; horn(147, 0.85, 0.11); horn(196, 0.8, 0.07, 0.12); battleCry(0.7); },
    win: function () {
      if (!ctx || !A.enabled) return;
      [196, 262, 330].forEach(function (f, i) { horn(f, 0.34, 0.1, i * 0.2); }); horn(392, 1.0, 0.12, 0.6); horn(262, 1.0, 0.08, 0.6);
      noise(1.2, 0.18, 'highpass', 6000, 4000, 1, 0.6, null, 0.01); tom(80, 1, null);
    },
    lose: function () {
      if (!ctx || !A.enabled) return;
      horn(165, 0.9, 0.12); horn(147, 0.9, 0.11, 0.8); horn(110, 1.6, 0.13, 1.6); tom(55, 1.2, null); tom(50, 1, null);
    },

    // ---- muzik (taiko davullari + boru) ve savas uğultusu ----
    setIntensity: function (v) {
      intensity = Math.max(0, Math.min(1, v));
      if (amb && ctx) amb.g.gain.setTargetAtTime(0.02 + 0.2 * intensity, now(), 0.4);
    },
    musicStart: function () {
      if (!ctx || musicTimer || !A.musicOn || !A.enabled) return;
      stepI = 0; nextT = now() + 0.1;
      // ortam: surekli kalabalik/carpisma uğultusu
      try {
        var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 0.6; g.gain.value = 0.02;
        s.connect(f); f.connect(g); g.connect(ambBus); s.start(); ambBus.gain.setTargetAtTime(0.45, now(), 0.3); amb = { s: s, g: g };
      } catch (e) { amb = null; }
      envTimer = setInterval(envTick, 1100);
      musicTimer = setInterval(function () {
        if (!ctx || !A.enabled || !A.musicOn) return;
        while (nextT < now() + 0.25) {
          var bpm = mode === 'menu' ? 78 : 92 + 44 * intensity, eighth = 30 / bpm, st = stepI % 8, bar = Math.floor(stepI / 8), d = nextT - now(), v = 0.7 + 0.5 * intensity;
          if (st === 0) padBar(bar, d, eighth);
          if (mode === 'menu') v *= 0.8;
          if (st === 0) tomAt(62, 1 * v, d); if (st === 2) tomAt(78, 0.7 * v, d); if (st === 3) tomAt(62, 0.8 * v, d);
          if (st === 4) tomAt(62, 1 * v, d); if (st === 6) tomAt(78, 0.7 * v, d);
          if (st === 7 && (intensity > 0.45 || bar % 4 === 3)) tomAt(98, 0.6 * v, d);
          if (intensity > 0.3 && (st === 2 || st === 6)) noiseAt(0.04, 0.12 * v, d);
          if (st === 0 && bar % 4 === 0 && intensity > 0.2) { var tt = now() + d; hornAt(98, 1.4, 0.05 + 0.04 * intensity, tt - now()); }
          if (rnd() < (mode === 'menu' ? 0.12 : 0.22 * intensity) && voice(300)) { var vv = 0.2 + 0.15 * rnd(); if (rnd() < 0.6) clash(vv); else thud(vv); } // uzaktan carpisma sesleri
          nextT += eighth; stepI++;
        }
      }, 90);
    },
    musicStop: function () {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      if (envTimer) { clearInterval(envTimer); envTimer = null; }
      if (amb && ctx) { try { ambBus.gain.setTargetAtTime(0, now(), 0.25); var s = amb.s; setTimeout(function () { try { s.stop(); } catch (e) { /* bitti */ } }, 900); } catch (e2) { /* yok say */ } amb = null; }
    },
    vibrate: function (ms) {
      if (A.noVibrate || (Z.Save && Z.Save.data && !Z.Save.data.settings.vibrate)) return;
      try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* yok say */ }
    },
    // test icin: tum sesleri bir kez cal (hatasiz calistigini dogrular)
    _all: function () { ['click', 'back', 'deny', 'coin', 'chest', 'perk', 'heal', 'hit', 'shoot', 'boom', 'death', 'baseHit', 'charge', 'fire', 'freeze', 'battleStart', 'win', 'lose', 'gem', 'reward', 'tab'].forEach(function (k) { last = {}; A[k](); }); ['cav', 'golem', 'cata', 'spear'].forEach(function (c) { last = {}; A.spawn(c); }); ['roar', 'bolt', 'ward', 'freeze', 'dragon'].forEach(function (k) { A.skill(k); }); A.star(1); }
  };
  // ---- diyara gore muzik tonu: kok nota + dizi + akor ilerlemesi ----
  var REALMS = [
    { root: 50, mode: [0, 2, 3, 5, 7, 9, 10], prog: [0, 5, 3, 4] },   // 0 Yesil Vadi: Re dorian
    { root: 52, mode: [0, 1, 4, 5, 7, 8, 10], prog: [0, 1, 0, 6] },   // 1 Kizil Col: frigien baskin
    { root: 57, mode: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 2, 6] },   // 2 Buz Diyari: la minor (parlak)
    { root: 45, mode: [0, 1, 3, 5, 7, 8, 10], prog: [0, 0, 1, 6] },   // 3 Volkan: frigien (agir)
    { root: 48, mode: [0, 2, 3, 6, 7, 8, 11], prog: [0, 3, 5, 3] },   // 4 Bataklik: gizemli
    { root: 55, mode: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 6, 4] },   // 5 Sonbahar: sicak dorian
    { root: 53, mode: [0, 2, 3, 5, 7, 8, 10], prog: [0, 6, 5, 4] }    // 6 Yildiz Ovasi: gece (cani cani)
  ];
  function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function degNote(R, deg) { var o = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7; return R.root + R.mode[i] + 12 * o; }
  function padNote(f, dur, vol, d) { // yumusak "yay" sesi: iki hafif detune ucgen dalga + alcak gecirgen filtre
    var t = now() + d, flt = ctx.createBiquadFilter(), g = ctx.createGain();
    flt.type = 'lowpass'; flt.frequency.value = 900; flt.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(1.2, dur * 0.35)); g.gain.setValueAtTime(vol, t + dur * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    flt.connect(g); g.connect(musicBus);
    [0, 6].forEach(function (cents) { var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = cents - 3; o.connect(flt); o.start(t); o.stop(t + dur + 0.05); });
  }
  function padBar(bar, d, eighth) {
    var R = REALMS[realm] || REALMS[0], deg = R.prog[bar % R.prog.length], dur = eighth * 8 * 1.02, vol = mode === 'menu' ? 0.075 : 0.04 + 0.02 * intensity;
    [0, 2, 4].forEach(function (k) { padNote(mf(degNote(R, deg + k) + 12), dur, vol, d); });         // akor
    padNote(mf(degNote(R, deg) - 12), dur, vol * 1.6, d);                                           // bas
    if (mode === 'menu' || intensity < 0.5) { // yumusak melodi: akor sesleri uzerinde 2 vurus
      var n1 = degNote(R, deg + [4, 2, 6, 4][bar % 4]) + 24, n2 = degNote(R, deg + [2, 4, 4, 6][bar % 4]) + 24;
      tone(mf(n1), 0, eighth * 3, R.bell ? 'sine' : 'triangle', 0.05, d + eighth * 2, musicBus, 0.02); tone(mf(n2), 0, eighth * 3, 'sine', 0.04, d + eighth * 5, musicBus, 0.02);
    }
  }
  // ---- diyara ozel ortam sesleri (kus, ruzgar, cekirge, kurbaga, volkan gurultusu...) ----
  function chirp(f, d) { tone(f, f * 1.3, 0.08, 'sine', 0.035, d, envBus); tone(f * 1.2, f * 0.9, 0.07, 'sine', 0.03, d + 0.1, envBus); }
  function envTick() {
    if (!ctx || !A.enabled || !A.musicOn || !envBus) return;
    var duck = 1 - 0.55 * intensity; envBus.gain.setTargetAtTime(0.9 * volS * duck, now(), 0.3);
    var r = rnd(), i;
    switch (realm) {
      case 0: if (r < 0.55) { var f = 2400 + rnd() * 1400; for (i = 0; i < 2 + (rnd() * 3 | 0); i++) chirp(f + i * 120, i * 0.15); } else if (r < 0.7) noise(2.2, 0.05, 'bandpass', 500, 900, 0.8, 0, envBus, 0.8); break;
      case 1: if (r < 0.6) noise(3.0, 0.07, 'bandpass', 350, 850, 0.7, 0, envBus, 1.2); if (r > 0.93) tone(1500, 900, 0.7, 'sawtooth', 0.02, 0, envBus, 0.1); break;
      case 2: if (r < 0.6) noise(3.4, 0.085, 'bandpass', 650, 1500, 1.1, 0, envBus, 1.3); if (r > 0.8) { tone(3200 + rnd() * 1200, 0, 0.5, 'sine', 0.03, 0, envBus); tone(4800, 0, 0.4, 'sine', 0.02, 0.12, envBus); } break;
      case 3: noise(1.4, 0.16, 'lowpass', 140, 90, 0.8, 0, envBus, 0.4, true); if (r < 0.7) for (i = 0; i < 5; i++) noise(0.03, 0.09, 'highpass', 3000 + rnd() * 3000, 3000, 1, rnd() * 0.9, envBus); if (r > 0.9) { tone(70, 40, 0.8, 'sine', 0.25, 0, envBus); noise(0.8, 0.12, 'lowpass', 500, 120, 0.7, 0, envBus, 0.05); } break;
      case 4: if (r < 0.45) { tone(150, 210, 0.09, 'square', 0.025, 0, envBus); tone(170, 230, 0.09, 'square', 0.025, 0.14, envBus); } if (r > 0.5 && r < 0.8) for (i = 0; i < 6; i++) tone(4300, 0, 0.05, 'sine', 0.015, i * 0.09, envBus); break;
      case 5: noise(2.4, 0.06, 'bandpass', 500, 1000, 0.7, 0, envBus, 0.9); if (r < 0.5) for (i = 0; i < 4; i++) noise(0.06, 0.04, 'highpass', 4000, 3500, 1, rnd() * 1.2, envBus); if (r > 0.92) { tone(620, 380, 0.3, 'sawtooth', 0.03, 0, envBus); tone(600, 360, 0.3, 'sawtooth', 0.03, 0.35, envBus); } break;
      case 6: if (r < 0.7) for (i = 0; i < 8; i++) tone(4100 + (i % 2) * 90, 0, 0.045, 'sine', 0.014, i * 0.07, envBus); if (r > 0.88) { tone(420, 380, 0.45, 'sine', 0.05, 0, envBus, 0.05); tone(400, 360, 0.5, 'sine', 0.045, 0.6, envBus, 0.05); } break;
    }
  }
  // zamanlanmis davul/boru/gurultu (muzik yoluna)
  function tomAt(f, v, d) { var save = now; tone(f * 1.7, f, 0.2, 'sine', 0.55 * v, d, musicBus); tone(f * 0.5, f * 0.4, 0.3, 'triangle', 0.25 * v, d, musicBus); noise(0.05, 0.2 * v, 'lowpass', 2200, 500, 0.8, d, musicBus); void save; }
  function noiseAt(dur, vol, d) { noise(dur, vol, 'bandpass', 3200, 2500, 2, d, musicBus); }
  function hornAt(f, dur, vol, d) { horn(f, dur, vol, d); }
  Z.Audio = A;
})(globalThis.Z = globalThis.Z || {});
