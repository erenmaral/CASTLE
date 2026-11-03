// Seferhan - kayit sistemi (localStorage) + cevrimdisi hazine + gunluk sifirlama
(function (Z) {
  'use strict';
  var KEY = 'zafarion.save.v1';

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
      heroOwned: { aslan: true }, heroLvl: { aslan: 1, yildiz: 1, demir: 1, buz: 1 }, hero: 'aslan',
      deck: ['spear', 'archer', 'cav'],
      castleLvl: 1, treasuryLvl: 1, treasuryLast: Date.now(),
      cleared: 0, stars: {}, endlessBest: 0,
      daily: { lastDay: '', streak: 0, claimedToday: false },
      quests: { day: '', list: [] },
      stats: { battles: 0, wins: 0, kills: 0, totalStars: 0, maxCombo: 0, perks: 0, spins: 0 },
      achClaimed: {}, starClaimed: {}, wheel: { day: '', used: false },
      settings: { sound: true, music: true, vibrate: true },
      seenUnlock: { spear: true, archer: true, cav: true },
      tutorialDone: false, seenVersion: ''
    };
  }

  var Save = {
    data: null,
    today: today,
    load: function () {
      var d = null;
      try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
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
      if (d.quests.day !== t) {
        var pool = Z.QUEST_POOL.slice(), h = hashStr(t), list = [];
        for (var i = 0; i < 3 && pool.length; i++) {
          h = (Math.imul(h, 1103515245) + 12345) >>> 0;
          var q = pool.splice(h % pool.length, 1)[0];
          list.push({ id: q.id, prog: 0, claimed: false });
        }
        d.quests = { day: t, list: list };
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
      d.quests.list.forEach(function (q) {
        var def = Z.QUEST_POOL.filter(function (x) { return x.id === q.id; })[0];
        if (def && def.stat === stat && !q.claimed) q.prog = Math.min(def.target, q.prog + (n || 1));
      });
    },
    questDef: function (id) { return Z.QUEST_POOL.filter(function (x) { return x.id === id; })[0]; },
    claimQuest: function (i) {
      var q = this.data.quests.list[i]; if (!q || q.claimed) return null;
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
