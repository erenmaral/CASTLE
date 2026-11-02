// Zafarion - acilis, oyun dongusu, olcekleme, geri tusu
(function (Z) {
  'use strict';
  var S = Z.Save, A = Z.Audio, R = Z.Render, UI = Z.UI;
  var $ = function (id) { return document.getElementById(id); };

  var Game = Z.Game = {
    battle: null, paused: false, speed: 1, ending: false, endTimer: 0, last: 0,
    stage: { scale: 1, w: 1280, h: 720 },

    // Sahne boyutu: yukseklik 720 mantiksal birime sigar; genislik ekrana gore uzar (en az 1280)
    resize: function () {
      var iw = globalThis.innerWidth, ih = globalThis.innerHeight;
      var scale = Math.min(ih / 720, iw / 1280);
      var w = iw / scale, h = ih / scale, st = $('stage');
      this.stage = { scale: scale, w: w, h: h };
      st.style.width = w + 'px'; st.style.height = h + 'px'; st.style.transform = 'scale(' + scale + ')';
      st.style.setProperty('--s', scale);
      var hud = $('hud'); hud.style.left = '0px'; hud.style.width = w + 'px'; hud.style.top = (h - 720) / 2 + 'px';
      R.resize(w, h, scale);
    },

    startBattle: function (mode, level) {
      S.sanitizeDeck();
      var d = S.data;
      A.init();
      this.battle = new Z.Battle({ mode: mode, level: level, save: d, deck: d.deck, hero: d.heroOwned[d.hero] ? d.hero : 'aslan' });
      this.paused = false; this.ending = false; this.endTimer = 0;
      UI.closeModal(); UI.hideHub();
      UI.hudBuild(this.battle);
      R.start(this.battle);
      A.musicStart();
    },

    toMenu: function (tab) {
      A.musicStop(); R.stop(); this.battle = null; this.paused = false; this.ending = false;
      UI.closeModal(); UI.showHub(tab || (UI.tab || 'map'));
    },

    pause: function () {
      if (!this.battle || this.battle.over || this.paused) return;
      this.paused = true; A.musicStop();
      var self = this;
      UI.pauseModal({
        resume: function () { self.resume(); },
        restart: function () { var b = self.battle; self.startBattle(b.mode, b.level); },
        quit: function () { self.toMenu(); }
      });
    },
    resume: function () {
      if (!this.paused) return;
      this.paused = false; UI.closeModal(); A.musicStart();
    },

    loop: function (now) {
      var dt = Math.min(0.1, (now - Game.last) / 1000 || 0.016);
      Game.last = now;
      var b = Game.battle;
      if (b) {
        if (!Game.paused) {
          var steps = Game.speed, i;
          for (i = 0; i < steps; i++) b.update(dt);
          if (b.over && !Game.ending) {
            Game.ending = true; Game.endTimer = 1.1;
          }
          if (Game.ending) {
            Game.endTimer -= dt;
            if (Game.endTimer <= 0 && !Game.settled) {
              Game.settled = true;
              A.musicStop();
              var out = Z.settleBattle(b, S);
              UI.resultModal(b, out);
            }
          }
        }
        R.frame(Game.paused ? 0 : dt);
        UI.hudUpdate(b);
      }
      requestAnimationFrame(Game.loop);
    },

    // Android geri tusu
    onBack: function () {
      if (UI.modalOpen()) {
        if (this.paused) return this.resume();
        return UI.closeModal();
      }
      if (this.battle && !this.battle.over) return this.pause();
      if (!this.battle && UI.tab !== 'map') { UI.tab = 'map'; return UI.renderHub(); }
      try { var App = globalThis.Capacitor && globalThis.Capacitor.Plugins && globalThis.Capacitor.Plugins.App; if (App && App.exitApp) App.exitApp(); } catch (e) { /* tarayici */ }
    }
  };

  // Bir savas bittiginde bayragi sifirla
  var origStart = Game.startBattle;
  Game.startBattle = function (m, l) { Game.settled = false; origStart.call(Game, m, l); };

  function boot() {
    S.load();
    S.sanitizeDeck();
    var st = S.data.settings;
    A.enabled = st.sound; A.musicOn = st.music;
    R.init($('game'));
    UI.init(Game);
    Game.resize();
    globalThis.addEventListener('resize', function () { Game.resize(); });
    globalThis.addEventListener('orientationchange', function () { setTimeout(function () { Game.resize(); }, 200); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { Game.pause(); A.musicStop(); } });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // ilk dokunusta ses motorunu ac
    document.addEventListener('pointerdown', function () { A.init(); }, { once: true });
    try {
      var App = globalThis.Capacitor && globalThis.Capacitor.Plugins && globalThis.Capacitor.Plugins.App;
      if (App && App.addListener) {
        App.addListener('backButton', function () { Game.onBack(); });
        App.addListener('pause', function () { Game.pause(); });
      }
    } catch (e) { /* tarayici */ }
    UI.showHub('map');
    var bootEl = $('boot'); bootEl.style.opacity = 0; setTimeout(function () { bootEl.remove(); }, 600);
    UI.welcome();
    Game.last = performance.now();
    requestAnimationFrame(Game.loop);
    Z.ready = true;
    // Tarayici surumu: cevrimdisi calisma icin service worker (APK icinde ve file:// altinda kapali)
    var native = globalThis.Capacitor && globalThis.Capacitor.isNativePlatform && globalThis.Capacitor.isNativePlatform();
    if ('serviceWorker' in navigator && !native && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* sessizce gec */ });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(globalThis.Z = globalThis.Z || {});
