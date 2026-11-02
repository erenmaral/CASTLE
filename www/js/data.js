// Zafarion - oyun verileri (birlikler, kahramanlar, bolumler, gorevler)
(function (Z) {
  'use strict';

  // ---- Birlikler -------------------------------------------------------
  // cls: sinif (bonus tablosu icin), int: saldiri araligi (sn), cd: kart bekleme suresi
  Z.UNITS = {
    spear:  { id: 'spear',  name: 'Mızrakçı', icon: '🔱', cls: 'spear',  hp: 120, dmg: 14, int: 0.9, range: 40,  speed: 52,  cost: 50,  cd: 1.8, ranged: false,
              desc: 'Ucuz ve dayanıklı ön saf. Süvarilere karşı %60 fazla hasar verir.' },
    archer: { id: 'archer', name: 'Okçu',     icon: '🏹', cls: 'archer', hp: 70,  dmg: 16, int: 1.1, range: 230, speed: 45,  cost: 70,  cd: 2.5, ranged: true,
              desc: 'Uzaktan vurur. Mızrakçılara karşı %40 fazla hasar verir.' },
    cav:    { id: 'cav',    name: 'Süvari',   icon: '🐎', cls: 'cav',    hp: 160, dmg: 20, int: 0.8, range: 44,  speed: 105, cost: 110, cd: 4.0, ranged: false,
              desc: 'Hızlı. İlk vuruşu çifte hasar (hücum). Okçulara karşı %60 fazla hasar.' },
    knight: { id: 'knight', name: 'Şövalye',  icon: '🛡️', cls: 'knight', hp: 420, dmg: 24, int: 1.2, range: 44,  speed: 38,  cost: 150, cd: 6.0, ranged: false,
              desc: 'Ağır zırhlı. Ok ve mancınık hasarını %30 azaltır. Yavaştır.' },
    mage:   { id: 'mage',   name: 'Büyücü',   icon: '🔮', cls: 'mage',   hp: 80,  dmg: 30, int: 2.0, range: 200, speed: 40,  cost: 180, cd: 8.0, ranged: true, aoe: 70,
              desc: 'Alan hasarı verir, zırhı deler (Şövalyeye +%35). Süvariye karşı savunmasız.' },
    cata:   { id: 'cata',   name: 'Mancınık', icon: '☄️', cls: 'cata',   hp: 150, dmg: 40, int: 3.0, range: 340, speed: 25,  cost: 200, cd: 10.0, ranged: true, aoe: 55, minRange: 110, baseMult: 2.5,
              desc: 'Çok uzak menzil, kaleye 2.5 kat hasar. Yakındaki düşmana ateş edemez.' }
  };
  Z.UNIT_ORDER = ['spear', 'archer', 'cav', 'knight', 'mage', 'cata'];
  // Bu kadar bolum kazanilinca birlik acilir
  Z.UNLOCK_AT = { spear: 0, archer: 0, cav: 0, knight: 4, mage: 8, cata: 12 };
  // Tas-kagit-makas benzeri bonus tablosu: BONUS[saldiran][savunan]
  Z.BONUS = {
    spear:  { cav: 1.6 },
    archer: { spear: 1.4 },
    cav:    { archer: 1.6 },
    mage:   { knight: 1.35 },
    knight: { mage: 1.3 },
    cata:   {}
  };
  // Dusman yapay zekasi: bir sinifa karsi en iyi cevap
  Z.COUNTER = { spear: 'archer', archer: 'cav', cav: 'spear', knight: 'mage', mage: 'cav', cata: 'cav' };

  Z.unitHpMult  = function (lvl) { return 1 + 0.10 * (lvl - 1); };
  Z.unitDmgMult = function (lvl) { return 1 + 0.08 * (lvl - 1); };
  Z.unitUpgradeCost = function (lvl) { return Math.round(55 * Math.pow(1.42, lvl - 1)); };
  Z.MAX_UNIT_LVL = 25;

  // ---- Kahramanlar -----------------------------------------------------
  Z.HEROES = {
    aslan: { id: 'aslan', name: 'Aslan Han', icon: '🦁', skill: 'Zafer Naraası', type: 'roar', cd: 28, target: 'none', gems: 0,
             desc: 'Tüm birliklere 8 sn boyunca %35 hasar ve saldırı hızı verir.' },
    yildiz: { id: 'yildiz', name: 'Yıldız Hatun', icon: '⚡', skill: 'Yıldırım Fırtınası', type: 'bolt', cd: 22, target: 'lane', gems: 60,
             desc: 'Seçilen koridorda en öndeki 5 düşmana yıldırım indirir.' },
    demir: { id: 'demir', name: 'Demir Bey', icon: '🪖', skill: 'Çelik Siper', type: 'ward', cd: 26, target: 'lane', gems: 120,
             desc: 'Seçilen koridordaki dostları %35 iyileştirir, 6 sn yarı hasar alır.' }
  };
  Z.HERO_ORDER = ['aslan', 'yildiz', 'demir'];
  Z.heroUpgradeCost = function (lvl) { return Math.round(120 * Math.pow(1.5, lvl - 1)); };
  Z.heroPower = function (lvl) { return 1 + 0.12 * (lvl - 1); };

  // ---- Kale / Hazine ---------------------------------------------------
  Z.castleHp = function (lvl) { return Math.round(1500 * (1 + 0.12 * (lvl - 1))); };
  Z.castleUpgradeCost = function (lvl) { return Math.round(150 * Math.pow(1.5, lvl - 1)); };
  Z.treasuryRate = function (lvl, cleared) { return 90 + 45 * (lvl - 1) + 6 * cleared; }; // altin / saat
  Z.TREASURY_CAP_H = 8;
  Z.treasuryUpgradeCost = function (lvl) { return Math.round(200 * Math.pow(1.6, lvl - 1)); };

  // ---- Savas ici maden -------------------------------------------------
  Z.MINE_COSTS = [100, 180, 300, 450, 650];
  Z.mineIncome = function (lvl) { return 10 + 3.5 * lvl; };
  Z.mineCap = function (lvl) { return 400 + 150 * lvl; };

  // ---- Bolumler --------------------------------------------------------
  Z.MAX_LEVEL = 30;
  Z.LEVEL_NAMES = [
    'Kızıl Vadi', 'Sis Geçidi', 'Kuzgun Tepesi', 'Demirkapı', 'Gölge Ormanı',
    'Kırık Köprü', 'Ateş Ovası', 'Taşkale Eteği', 'Fırtına Burnu', 'Kara Bataklık',
    'Çelik Dağ', 'Bozkurt Yaylası', 'Altın Çöl', 'Zehir Nehri', 'Buzul Boğazı',
    'Yıldız Kalesi', 'Kemik Çölü', 'Alev Boğazı', 'Rüzgâr Ovası', 'Kül Vadisi',
    'Tuz Gölü', 'Karanlık Orman', 'Yıkık Şehir', 'Kızıl Kule', 'Ejder Geçidi',
    'Kurt Kapanı', 'Siyah Kale', 'Gök Kubbe', 'Son Sur', 'Zafarion Tahtı'
  ];
  Z.isBoss = function (n) { return n % 5 === 0; };
  Z.levelInfo = function (n) {
    var tiers = ['spear', 'archer'];
    if (n >= 3) tiers.push('cav');
    if (n >= 6) tiers.push('knight');
    if (n >= 9) tiers.push('mage');
    if (n >= 12) tiers.push('cata');
    return {
      n: n,
      name: Z.LEVEL_NAMES[(n - 1) % Z.LEVEL_NAMES.length],
      boss: Z.isBoss(n),
      scale: 1 + 0.040 * (n - 1),
      baseHp: 700 + 130 * n,
      aiRate: 8 + 0.35 * n,
      startGold: 60 + 8 * n,
      tiers: tiers,
      rewardCoins: 40 + 18 * n,
      rewardGems: n % 5 === 0 ? 10 : 5
    };
  };

  // Sonsuz kusatma
  Z.endlessWave = function (t) { return Math.floor(t / 25) + 1; };

  // ---- Gunluk giris odulleri ------------------------------------------
  Z.DAILY_REWARDS = [
    { coins: 100 }, { coins: 150 }, { gems: 10 }, { coins: 300 }, { gems: 20 }, { coins: 600 }, { gems: 50, coins: 500 }
  ];

  // ---- Gorevler --------------------------------------------------------
  Z.QUEST_POOL = [
    { id: 'win2',   text: '2 savaş kazan',            stat: 'wins',   target: 2,  coins: 120, gems: 3 },
    { id: 'win4',   text: '4 savaş kazan',            stat: 'wins',   target: 4,  coins: 250, gems: 6 },
    { id: 'kill40', text: '40 düşman yen',            stat: 'kills',  target: 40, coins: 100, gems: 2 },
    { id: 'kill100',text: '100 düşman yen',           stat: 'kills',  target: 100,coins: 240, gems: 5 },
    { id: 'spawn30',text: '30 birlik çağır',          stat: 'spawns', target: 30, coins: 100, gems: 2 },
    { id: 'skill3', text: 'Kahraman yeteneğini 3 kez kullan', stat: 'skills', target: 3, coins: 120, gems: 3 },
    { id: 'star3',  text: 'Bir savaşı 3 yıldızla bitir', stat: 'threeStars', target: 1, coins: 200, gems: 5 },
    { id: 'mine3',  text: 'Savaşta madeni 3 kez yükselt', stat: 'mines', target: 3, coins: 100, gems: 2 }
  ];

  // ---- Yardimcilar -----------------------------------------------------
  Z.fmt = function (n) {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };
  Z.fmtTime = function (s) {
    s = Math.max(0, Math.floor(s));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  };
})(globalThis.Z = globalThis.Z || {});
