// Sefer Vakti - kayit sistemi (localStorage) + cevrimdisi hazine + gunluk sifirlama
(function (Z) {
  'use strict';
  var KEY = 'zafarion.save.v1';

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function weekIndex(t) { // 'YYYY-MM-DD' -> pazartesi baslangicli hafta numarasi
    var p = t.split('-'); return Math.floor((Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000 + 3) / 7);
  }
  function dayDiff(a, b) { // a,b: 'YYYY-MM-DD'
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
  }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function fresh() {
    var unitLvl = {};
    Z.UNIT_ORDER.forEach(function (u) { unitLvl[u] = 1; });
    return {
      v: 1,
      coins: 150, gems: 20,
      unitLvl: unitLvl,
      heroOwned: { aslan: true }, heroLvl: { aslan: 1, yildiz: 1, demir: 1, buz: 1, ejder: 1 }, hero: 'aslan',
      deck: ['spear', 'archer', 'cav'],
      castleLvl: 1, treasuryLvl: 1, treasuryLast: Date.now(),
      cleared: 0, stars: {}, endlessBest: 0,
      daily: { lastDay: '', streak: 0, claimedToday: false },
      quests: { day: '', list: [] }, weekly: { week: -1, list: [] },
      stats: { battles: 0, wins: 0, kills: 0, totalStars: 0, maxCombo: 0, perks: 0, spins: 0, hardWins: 0, legendWins: 0, dailyWins: 0, purchases: 0, fieldWins: 0, castleWins: 0, bossWins: 0 },
      achClaimed: {}, starClaimed: {}, wheel: { day: '', used: false },
      hardCleared: {}, dailySefer: { day: '', won: false },
      settings: { sound: true, music: true, vibrate: true, menuBattle: true, musicVol: 70, sfxVol: 100, notify: false, notifyAsked: false },
      seenUnlock: { spear: true, archer: true, cav: true },
      tutorialDone: false, seenVersion: '', langChosen: false,
      boost: { gold: 1, skill: 1, shield: 1 }, iap: { noAds: false, starter: false, tokens: [] }, ads: { day: '', rewarded: 0, battles: 0, lastInter: 0 }
    };
  }

  var Save = {
    data: null,
    today: today,
    load: function () {
      var d = null;
      var raw = null; try { raw = localStorage.getItem(KEY); d = JSON.parse(raw); } catch (e) { d = null; if (raw) { try { localStorage.setItem(KEY + '.bak', raw); } catch (e2) { /* dolu */ } } } // okunamayan kaydi yedekle
      var f = fresh();
      if (d && typeof d === 'object') {
        // eksik alanlari varsayilanlarla tamamla (guncellemeler eski kaydi bozmasin)
        for (var k in f) { if (d[k] === undefined) d[k] = f[k]; }
        ['unitLvl', 'heroLvl', 'settings', 'stats', 'daily', 'quests', 'seenUnlock', 'heroOwned'].forEach(function (key) {
          for (var kk in f[key]) { if (d[key][kk] === undefined) d[key][kk] = f[key][kk]; }
        });
        this.data = d;
      } else {
        this.data = f;
      }
      this.rollDay();
      return this.data;
    },
    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* dolu/engelli */ }
    },
    reset: function () { this.data = fresh(); this.rollDay(); this.save(); },

    // Gun degistiyse gunluk odul + gorevleri yenile
    rollDay: function () {
      var d = this.data, t = today();
      if (d.daily.lastDay !== t) {
        var gap = d.daily.lastDay ? dayDiff(d.daily.lastDay, t) : 99;
        d.daily.streak = (gap === 1) ? d.daily.streak : 0;
        d.daily.claimedToday = false;
        d.daily.lastDay = t;
      }
      if (d.wheel.day !== t) d.wheel = { day: t, used: false };
      if (d.dailySefer.day !== t) d.dailySefer = { day: t, won: false };
      var self = this, known = function (q) { return !!self.questDef(q.id); }; // surum guncellemesiyle silinen gorev kimlikleri gorevi/ekrani bozmasin
      if (d.quests.list && d.quests.list.some(function (q) { return !known(q); })) d.quests.day = '';
      if (d.weekly && d.weekly.list && d.weekly.list.some(function (q) { return !known(q); })) d.weekly = { week: -1, list: [] };
      if (d.quests.day !== t) {
        var pool = Z.QUEST_POOL.slice(), h = hashStr(t), list = [];
        for (var i = 0; i < Z.DAILY_QUEST_COUNT && pool.length; i++) {
          h = (Math.imul(h, 1103515245) + 12345) >>> 0;
          var q = pool.splice(h % pool.length, 1)[0];
          list.push({ id: q.id, prog: 0, claimed: false });
        }
        d.quests = { day: t, list: list };
      }
      var wk = weekIndex(t);
      if (!d.weekly || d.weekly.week !== wk) { // her pazartesi yeni haftalik gorevler
        var wp = Z.WEEKLY_POOL.slice(), wh = hashStr('w' + wk), wl = [];
        for (var j = 0; j < Z.WEEKLY_QUEST_COUNT && wp.length; j++) {
          wh = (Math.imul(wh, 1103515245) + 12345) >>> 0;
          wl.push({ id: wp.splice(wh % wp.length, 1)[0].id, prog: 0, claimed: false });
        }
        d.weekly = { week: wk, list: wl };
      }
    },
    // Gunluk odul: kacinci gun (0-6)
    dailyIndex: function () { return this.data.daily.streak % 7; },
    claimDaily: function () {
      var d = this.data;
      if (d.daily.claimedToday) return null;
      var r = Z.DAILY_REWARDS[this.dailyIndex()];
      d.coins += r.coins || 0; d.gems += r.gems || 0;
      d.daily.claimedToday = true; d.daily.streak += 1;
      this.save();
      return r;
    },

    // Gorev ilerlemesi: stat adina gore arttir
    track: function (stat, n) {
      var d = this.data;
      var self = this;
      d.quests.list.concat(d.weekly ? d.weekly.list : []).forEach(function (q) {
        var def = self.questDef(q.id);
        if (def && def.stat === stat && !q.claimed) q.prog = Math.min(def.target, q.prog + (n === undefined ? 1 : n));
      });
    },
    questDef: function (id) { return Z.QUEST_POOL.concat(Z.WEEKLY_POOL).filter(function (x) { return x.id === id; })[0]; },
    claimQuest: function (i, weekly) {
      var q = (weekly ? this.data.weekly.list : this.data.quests.list)[i]; if (!q || q.claimed) return null;
      var def = this.questDef(q.id); if (q.prog < def.target) return null;
      q.claimed = true; this.data.coins += def.coins; this.data.gems += def.gems; this.save();
      return def;
    },

    // Hazine (bosta gelir)
    treasuryPending: function () {
      var d = this.data, h = Math.min(Z.TREASURY_CAP_H, Math.max(0, (Date.now() - d.treasuryLast) / 3600000));
      return Math.floor(h * Z.treasuryRate(d.treasuryLvl, d.cleared));
    },
    treasuryFull: function () { return (Date.now() - this.data.treasuryLast) / 3600000 >= Z.TREASURY_CAP_H; },
    collectTreasury: function () {
      var n = this.treasuryPending(); this.data.coins += n; this.data.treasuryLast = Date.now(); this.save(); return n;
    },

    // ---- Sans carki ----
    wheelFree: function () { return !this.data.wheel.used; },
    spin: function () {
      var d = this.data, free = !d.wheel.used;
      if (!free) { if (d.gems < Z.WHEEL_COST) return null; d.gems -= Z.WHEEL_COST; } else { d.wheel.used = true; }
      var total = 0, i; Z.WHEEL.forEach(function (s) { total += s.w; });
      var r = Math.random() * total, idx = 0;
      for (i = 0; i < Z.WHEEL.length; i++) { r -= Z.WHEEL[i].w; if (r <= 0) { idx = i; break; } }
      var seg = Z.WHEEL[idx];
      d.coins += seg.coins || 0; d.gems += seg.gems || 0; d.stats.spins++;
      this.save();
      return { idx: idx, seg: seg, free: free };
    },

    // ---- Basarimlar ----
    achProgress: function (a) { return Math.min(a.target, a.get(this.data)); },
    achClaimable: function (a) { return !this.data.achClaimed[a.id] && a.get(this.data) >= a.target; },
    claimAch: function (id) {
      var a = Z.ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0];
      if (!a || !this.achClaimable(a)) return null;
      this.data.achClaimed[id] = true; this.data.gems += a.gems; this.save(); return a;
    },
    anyAchClaimable: function () { var self = this; return Z.ACHIEVEMENTS.some(function (a) { return self.achClaimable(a); }); },

    // ---- Yildiz odulleri ----
    starClaimable: function (m) { return !this.data.starClaimed[m.n] && this.data.stats.totalStars >= m.n; },
    claimStar: function (n) {
      var m = Z.STAR_MILESTONES.filter(function (x) { return x.n === n; })[0];
      if (!m || !this.starClaimable(m)) return null;
      this.data.starClaimed[n] = true; this.data.coins += m.coins; this.data.gems += m.gems; this.save(); return m;
    },
    anyStarClaimable: function () { var self = this; return Z.STAR_MILESTONES.some(function (m) { return self.starClaimable(m); }); },

    // ---- Gunluk sefer ----
    dailyInfo: function () { return Z.dailySefer(today(), this.data.cleared); },
    dailyAvailable: function () { return this.data.cleared >= Z.DAILY_UNLOCK; },

    // ---- Pazar (elmas harcama) ----
    buyMarket: function (id) {
      var d = this.data, m = Z.MARKET.filter(function (x) { return x.id === id; })[0];
      if (!m || d.gems < m.gems) return null;
      if (id === 'treasury' && this.treasuryFull()) return { full: true };
      if (id === 'spin' && !d.wheel.used) return { unused: true };
      d.gems -= m.gems;
      if (id === 'coins') d.coins += 400 + 60 * d.cleared;
      else if (id === 'chest') d.coins += 3000 + 250 * d.cleared;
      else if (id === 'treasury') d.treasuryLast = Date.now() - Z.TREASURY_CAP_H * 3600000;
      else if (id === 'spin') d.wheel.used = false;
      else if (/^b_/.test(id)) { var bk = id.slice(2); d.boost[bk] = (d.boost[bk] || 0) + Z.BOOST_PACK; }
      d.stats.purchases++; this.save();
      return m;
    },

    // ---- Kayit tasima (APK <-> tarayici <-> yeni telefon) ----
    exportSave: function () {
      try { return btoa(unescape(encodeURIComponent(JSON.stringify(this.data)))); } catch (e) { return ''; }
    },
    importSave: function (txt) {
      var json, d;
      try { json = decodeURIComponent(escape(atob(String(txt).replace(/\s+/g, '')))); d = JSON.parse(json); } catch (e) { return false; }
      if (!d || typeof d !== 'object' || d.v !== 1 || typeof d.coins !== 'number' || typeof d.gems !== 'number' || !d.unitLvl || typeof d.cleared !== 'number') return false;
      try { localStorage.setItem(KEY, json); } catch (e2) { return false; }
      this.load(); this.save();
      return true;
    },

    unlockedUnits: function () {
      var c = this.data.cleared;
      return Z.UNIT_ORDER.filter(function (u) { return c >= Z.UNLOCK_AT[u]; });
    },
    sanitizeDeck: function () {
      var d = this.data, un = this.unlockedUnits();
      d.deck = d.deck.filter(function (u) { return un.indexOf(u) >= 0; }).slice(0, 5);
      if (!d.deck.length) d.deck = un.slice(0, 3);
    }
  };
  Z.Save = Save;
})(globalThis.Z = globalThis.Z || {});
