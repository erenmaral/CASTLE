// Sefer Vakti - acilis, oyun dongusu, olcekleme, geri tusu
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };
  var S = Z.Save, A = Z.Audio, R = Z.Render, UI = Z.UI;
  var $ = function (id) { return document.getElementById(id); };

  var Game = Z.Game = {
    demo: null, demoSkip: false, demoWait: 0, demoBot: 0, auto: false, autoT: 0,
    battle: null, paused: false, speed: 1, ending: false, endTimer: 0, last: 0,
    stage: { scale: 1, w: 720, h: 1280, left: 0 },

    // Dikey sahne: tasarim 720x1280 mantiksal birim. Telefon dar/uzunsa yukseklik uzar; genis pencerede (masaustu) sutun ortalanir.
    resize: function () {
      var iw = globalThis.innerWidth, ih = globalThis.innerHeight;
      var scale = Math.min(iw / 720, ih / 1280);
      var w = Math.min(iw / scale, 1000), h = ih / scale, st = $('stage'), left = (iw - w * scale) / 2;
      this.stage = { scale: scale, w: w, h: h, left: left };
      st.style.width = w + 'px'; st.style.height = h + 'px'; st.style.left = left + 'px'; st.style.transform = 'scale(' + scale + ')';
      st.style.setProperty('--s', scale);
      R.resize(w, h, scale);
    },

    startBattle: function (mode, level, opts) {
      opts = opts || {}; S.rollDay();
      S.sanitizeDeck();
      var d = S.data;
      A.init();
      var lvl = mode === 'daily' ? opts.daily.level : level, isField = mode !== 'endless' && Z.levelType(lvl) === 'field';
      var cfg = { mode: mode, level: lvl, save: d, deck: d.deck, hero: d.heroOwned[d.hero] ? d.hero : 'aslan',
        diff: opts.diff || 0, daily: opts.daily, rules: opts.daily ? opts.daily.rules : undefined,
        theme: mode === 'daily' ? opts.daily.theme : mode === 'endless' ? Math.floor(Math.random() * Z.REALMS.length) : undefined };
      this.battle = isField ? new Z.FieldBattle(cfg) : new Z.Battle(cfg);
      if (opts.boosters && opts.boosters.length && mode !== 'endless' && lvl > 1) { // hazirlik kartlarini tuket ve uygula
        var used = opts.boosters.filter(function (id) { return d.boost[id] > 0; }); used.forEach(function (id) { d.boost[id]--; }); S.save(); this.battle.applyBoosters(used);
      }
      this.battle.startOpts = opts; this.demo = null; A.setSfxLevel(1); A.noVibrate = false; A.setMode('battle'); this.setAuto(false);
      this.paused = false; this.ending = false; this.endTimer = 0; this.perkOpen = false;
      UI.closeModal(); UI.hideHub();
      UI.hudBuild(this.battle);
      R.start(this.battle);
      if (!this.battle.kind) R.banner = { text: mode === 'endless' ? $t('SONSUZ KUŞATMA') : mode === 'daily' ? $t('GÜNLÜK SEFER') : ($t('SEFER') + ' ') + level, col: '#ffd166', t: 1.8 };
      A.musicStart(); if (!this.battle.kind) A.battleStart(); // acik alanda borazan 'SAVAS' dugmesine basinca calar
    },

    toMenu: function (tab) {
      A.musicStop(); R.stop(); this.battle = null; this.demo = null; this.paused = false; this.ending = false; this.perkOpen = false;
      UI.tutStop(false); UI.closeModal(); UI.showHub(tab || (UI.tab || 'map'));
    },

    // ---- Ana menu: arkada savasin surdugu canli sahne + savas muzigi ----
    menuMusic: function () { if (this.battle) return; A.musicStart(); A.setIntensity(this.demo ? 0.6 : 0.35); },
    menuStart: function (force) {
      if (this.battle) return;
      A.setSfxLevel(0.4); A.noVibrate = true; A.setMode('menu');
      var on = S.data.settings.menuBattle;
      $('home').classList.toggle('opaque', !on);
      if (!on) { this.demo = null; R.stop(); $('game').classList.add('hidden'); this.menuMusic(); return; }
      if (!this.demo || force === 'new') this.newDemo();
      $('game').classList.remove('hidden');
      this.menuMusic();
    },
    menuHub: function () { // sefer merkezi: canli savas durur (pil), muzik surer
      if (this.battle) return;
      this.demo = null; R.stop(); $('game').classList.add('hidden'); A.setSfxLevel(0.7); A.noVibrate = false; A.setMode('menu'); this.menuMusic();
    },
    refreshMenu: function () { if (this.battle) return; if (!$('home').classList.contains('hidden')) this.menuStart(true); else this.menuHub(); },
    // Ortak bot: menudeki canli savas ve oyuncunun OTO-SAVAS dugmesi kullanir (kale + acik alan)
    botAct: function (b) {
      var i, q, opts;
      if (b.kind === 'field') {
        if (b.phase !== 'battle') return;
        if (b.mine < 2 && b.gold >= (b.mineCost() || 1e9) && b.t < 100) b.upgradeMine();
        opts = b.deck.filter(function (t) { return b.canDeploy(t); });
        if (opts.length && b.gold > 40) { q = opts[Math.floor(Math.random() * opts.length)]; for (i = 0; i < 6; i++) if (b.place(q, 80 + Math.random() * 560, Z.FH - 30 - Math.random() * 50)) break; }
        if (b.skillReady()) {
          var h = Z.HEROES[b.heroId], foes = b.units.filter(function (u) { return u.team === 1 && !u.commander; });
          if (h.target === 'none') { if (b.countTeam(0) >= 6) b.useSkill(); } else if (foes.length >= 3) { var f = foes[Math.floor(Math.random() * foes.length)]; b.useSkill(h.type === 'ward' ? b.cmdP.x : f.x, h.type === 'ward' ? b.cmdP.y - 120 : f.y); }
        }
        return;
      }
      if (b.mine < 3 && b.gold >= (b.mineCost() || 1e9)) b.upgradeMine();
      var th = [0, 0, 0];
      b.units.forEach(function (u) { if (u.team === 1) th[u.lane] += u.hp * (1.4 - (u.x - Z.C.PF) / (Z.C.EF - Z.C.PF)); });
      var lane = th.indexOf(Math.max.apply(null, th)); if (th[lane] === 0) lane = Math.floor(Math.random() * 3);
      opts = b.deck.filter(function (t) { return b.canDeploy(t); }); q = opts[Math.floor(Math.random() * opts.length)];
      if (q) b.deploy(q, lane);
      if (b.skillReady()) b.useSkill(lane);
    },
    setAuto: function (on) { this.auto = !!on; this.autoT = 0; var el = $('btn-auto'); if (el) { el.classList.toggle('on', this.auto); } },
    newDemo: function () {
      var levels = [6, 16, 26, 36, 46, 56, 66, 76, 86, 96], lv = levels[Math.floor(Math.random() * levels.length)], unitLvl = {}, i;
      Z.UNIT_ORDER.forEach(function (u) { unitLvl[u] = 14; });
      var b = new Z.Battle({ mode: 'campaign', level: lv, save: { unitLvl: unitLvl, heroLvl: { aslan: 8, yildiz: 5, demir: 5, buz: 5, ejder: 5 }, castleLvl: 14 },
        deck: ['spear', 'archer', 'cav', 'knight', 'mage'], hero: 'aslan', rules: ['none'], seed: Math.floor(Math.random() * 1e6) + 1 });
      b.gold = 200; this.demo = b; this.demoWait = 0; this.demoBot = 0;
      R.start(b); R.banner = null; A.setRealm(b.theme);
    },
    demoStep: function (dt) {
      var b = this.demo; if (!b) return;
      this.demoSkip = !this.demoSkip; // 30 kare/sn: menu akici ve pil dostu
      if (this.demoSkip) return;
      dt = Math.min(0.066, dt * 2);
      if (b.perkOffer) b.pickPerk(b.perkOffer[0]);
      b.update(dt);
      if (b.over) { this.demoWait += dt; if (this.demoWait > 2.8) { this.newDemo(); return; } }
      else {
        this.demoBot -= dt;
        if (this.demoBot <= 0) { this.demoBot = 0.9; this.botAct(b); }
      }
      R.frame(dt);
    },

    pause: function () {
      if (!this.battle || this.battle.over || this.paused || this.battle.perkOffer) return;
      this.paused = true; A.musicStop();
      var self = this;
      UI.pauseModal({
        resume: function () { self.resume(); },
        restart: function () { var b = self.battle, o = Object.assign({}, b.startOpts); delete o.boosters; self.startBattle(b.mode, b.level, o); }, // kartlar tekrar harcanmaz
        quit: function () { self.toMenu(); }
      });
    },
    resume: function () {
      if (!this.paused) return;
      this.paused = false; UI.closeModal(); A.musicStart();
    },

    loop: function (now) {
      requestAnimationFrame(Game.loop); // once sonraki kareyi iste: tek bir istisna oyunu dondurmasin
      var dt = Math.min(0.1, (now - Game.last) / 1000 || 0.016);
      Game.last = now;
      var b = Game.battle;
      if (b) {
        Game.intT = (Game.intT || 0) + dt; if (Game.intT > 0.5) { Game.intT = 0; A.setIntensity(b.units.length / 34); } // savas yogunlugu -> muzik/ortam sesi
        if (b.perkOffer && !Game.perkOpen && !b.over && !Game.paused) { Game.perkOpen = true; UI.perkModal(b, function () { Game.perkOpen = false; }); }
        if (!Game.paused) {
          var steps = Game.speed, i;
          if (!Game.tutHold) for (i = 0; i < steps; i++) b.update(dt);
          if (Game.auto && !b.over && !Game.tutHold) { Game.autoT -= dt * steps; if (Game.autoT <= 0) { Game.autoT = 0.9; Game.botAct(b); } }
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
      } else if (Game.demo) Game.demoStep(dt);
    },

    // Android geri tusu
    onBack: function () {
      if (this.battle && this.battle.perkOffer) return; // ganimet secilmeden kapatilamaz
      if (this.battle && this.battle.over) { if (this.settled) { UI.closeModal(); return this.toMenu(); } return; } // sonuc ekraninda geri = menu; sonuc hesaplanirken yok say
      if (UI.modalOpen()) {
        if (this.paused) return this.resume();
        return UI.closeModal();
      }
      if (this.battle && !this.battle.over) return this.pause();
      if (!this.battle && $('home').classList.contains('hidden')) { // sefer merkezinden: once haritaya, sonra ana menuye
        if (UI.tab !== 'map') { UI.tab = 'map'; return UI.renderHub(); }
        return UI.showHome();
      }
      try { var App = globalThis.Capacitor && globalThis.Capacitor.Plugins && globalThis.Capacitor.Plugins.App; if (App && App.exitApp) App.exitApp(); } catch (e) { /* tarayici */ }
    }
  };

  // Bir savas bittiginde bayragi sifirla
  var origStart = Game.startBattle;
  Game.startBattle = function (m, l, o) { Game.settled = false; origStart.call(Game, m, l, o); };

  function boot() {
    S.load();
    S.sanitizeDeck();
    Z.Monetize.detect();
    var st = S.data.settings;
    A.enabled = st.sound; A.musicOn = st.music;
    R.init($('game'));
    Z.i18nDom();
    UI.init(Game);
    UI.applyVolumes();
    Game.resize();
    globalThis.addEventListener('resize', function () { Game.resize(); });
    globalThis.addEventListener('orientationchange', function () { setTimeout(function () { Game.resize(); }, 200); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { Game.pause(); A.musicStop(); return; }
      S.rollDay(); // uygulama gece yarisini asarak acik kaldiysa gunluk durumu yenile
      if (!Game.battle) Game.menuMusic(); else if (!Game.paused && !Game.battle.over) A.musicStart();
    });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // ilk dokunusta ses motorunu ac
    document.addEventListener('pointerdown', function () { A.init(); if (!Game.battle) Game.menuMusic(); }, { once: true });
    try {
      var App = globalThis.Capacitor && globalThis.Capacitor.Plugins && globalThis.Capacitor.Plugins.App;
      if (App && App.addListener) {
        App.addListener('backButton', function () { Game.onBack(); });
        App.addListener('pause', function () { Game.pause(); });
      }
    } catch (e) { /* tarayici */ }
    UI.showHome();
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
