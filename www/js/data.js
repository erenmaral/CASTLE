// Seferhan - oyun verileri (birlikler, kahramanlar, bolumler, gorevler)
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
              desc: 'Çok uzak menzil, kaleye 2.5 kat hasar. Yakındaki düşmana ateş edemez.' },
    healer: { id: 'healer', name: 'Şifacı', icon: '💚', cls: 'healer', hp: 75, dmg: 20, int: 1.6, range: 190, speed: 42, cost: 130, cd: 6.0, ranged: true, heal: true,
              desc: 'Koridordaki yaralı dostları iyileştirir. Savaşmaz, korumaya al! Süvariye karşı savunmasız.' },
    banner: { id: 'banner', name: 'Sancaktar', icon: '🚩', cls: 'banner', hp: 150, dmg: 9, int: 1.0, range: 40, speed: 48, cost: 90, cd: 5.0, ranged: false, aura: true,
              desc: 'Yanındaki (160 birim) dostlara %20 hasar bonusu verir. Sancağı düşmeden ordunu güçlendirir.' },
    assassin: { id: 'assassin', name: 'Suikastçı', icon: '🗡️', cls: 'assassin', hp: 70, dmg: 26, int: 0.6, range: 34, speed: 120, cost: 120, cd: 5.0, ranged: false,
              desc: 'Çok hızlı. Düşman saflarının arasından geçip okçu, büyücü ve şifacıları avlar. Canı azdır.' },
    golem: { id: 'golem', name: 'Taş Dev', icon: '🗿', cls: 'golem', hp: 900, dmg: 34, int: 1.8, range: 50, speed: 30, cost: 260, cd: 12.0, ranged: false, splash: 60,
              desc: 'Taştan dev. Çok dayanıklı; darbesi çevresindeki düşmanları da ezer. Çok yavaştır.' },
    flamer: { id: 'flamer', name: 'Alevci', icon: '🔥', cls: 'flamer', hp: 110, dmg: 11, int: 0.5, range: 110, speed: 44, cost: 170, cd: 7.0, ranged: false, flame: true,
              desc: 'Kısa menzilli alev. Birden fazla düşmanı yakar; yanan düşman 3 sn boyunca can kaybeder.' }
  };
  Z.UNIT_ORDER = ['spear', 'archer', 'cav', 'knight', 'mage', 'cata', 'healer', 'banner', 'assassin', 'golem', 'flamer'];
  // Bu kadar bolum kazanilinca birlik acilir
  Z.UNLOCK_AT = { spear: 0, archer: 0, cav: 0, knight: 4, mage: 8, cata: 12, healer: 6, banner: 10, assassin: 16, golem: 26, flamer: 36 };
  // Tas-kagit-makas benzeri bonus tablosu: BONUS[saldiran][savunan]
  Z.BONUS = {
    spear:  { cav: 1.6 },
    archer: { spear: 1.4 },
    cav:    { archer: 1.6, healer: 1.5 },
    mage:   { knight: 1.35 },
    knight: { mage: 1.3, assassin: 1.25 },
    assassin: { archer: 1.5, mage: 1.5, healer: 1.6, cata: 1.4, banner: 1.3 },
    golem:  {},
    flamer: { spear: 1.2, archer: 1.3, healer: 1.3 },
    cata:   {}
  };
  // Dusman yapay zekasi: bir sinifa karsi en iyi cevap
  Z.COUNTER = { spear: 'archer', archer: 'cav', cav: 'spear', knight: 'mage', mage: 'cav', cata: 'cav', healer: 'cav', banner: 'archer', assassin: 'knight', golem: 'mage', flamer: 'cav' };

  Z.unitHpMult  = function (lvl) { return 1 + 0.10 * (lvl - 1); };
  Z.unitDmgMult = function (lvl) { return 1 + 0.08 * (lvl - 1); };
  Z.unitUpgradeCost = function (lvl) { return Math.round(55 * Math.pow(1.28, lvl - 1)); };
  Z.MAX_UNIT_LVL = 40;

  // ---- Kahramanlar -----------------------------------------------------
  Z.HEROES = {
    aslan: { id: 'aslan', name: 'Aslan Han', icon: '🦁', skill: 'Zafer Naraası', type: 'roar', cd: 28, target: 'none', gems: 0,
             desc: 'Tüm birliklere 8 sn boyunca %35 hasar ve saldırı hızı verir.' },
    yildiz: { id: 'yildiz', name: 'Yıldız Hatun', icon: '⚡', skill: 'Yıldırım Fırtınası', type: 'bolt', cd: 22, target: 'lane', gems: 60,
             desc: 'Seçilen koridorda en öndeki 5 düşmana yıldırım indirir.' },
    demir: { id: 'demir', name: 'Demir Bey', icon: '🪖', skill: 'Çelik Siper', type: 'ward', cd: 26, target: 'lane', gems: 120,
             desc: 'Seçilen koridordaki dostları %35 iyileştirir, 6 sn yarı hasar alır.' },
    buz: { id: 'buz', name: 'Buz Hatun', icon: '❄️', skill: 'Don Fırtınası', type: 'freeze', cd: 24, target: 'lane', gems: 150,
             desc: 'Seçilen koridordaki tüm düşmanları 3.5 sn dondurur ve hasar verir.' },
    ejder: { id: 'ejder', name: 'Ejder Hatun', icon: '🐉', skill: 'Ejder Nefesi', type: 'dragon', cd: 26, target: 'lane', gems: 200,
             desc: 'Seçilen koridordaki tüm düşmanları 6 sn boyunca yakar: saniyede %5 can kaybederler.' }
  };
  Z.HERO_ORDER = ['aslan', 'yildiz', 'demir', 'buz', 'ejder'];
  Z.heroUpgradeCost = function (lvl) { return Math.round(120 * Math.pow(1.22, lvl - 1)); };
  Z.MAX_HERO_LVL = 30;
  Z.heroPower = function (lvl) { return 1 + 0.12 * (lvl - 1); };

  // ---- Kale / Hazine ---------------------------------------------------
  Z.castleHp = function (lvl) { return Math.round(1500 * (1 + 0.12 * (lvl - 1))); };
  Z.castleUpgradeCost = function (lvl) { return Math.round(150 * Math.pow(1.24, lvl - 1)); };
  Z.MAX_CASTLE_LVL = 30;
  Z.treasuryRate = function (lvl, cleared) { return 90 + 45 * (lvl - 1) + 6 * cleared; }; // altin / saat
  Z.TREASURY_CAP_H = 8;
  Z.treasuryUpgradeCost = function (lvl) { return Math.round(200 * Math.pow(1.28, lvl - 1)); };
  Z.MAX_TREASURY_LVL = 25;

  // ---- Savas ici maden -------------------------------------------------
  Z.MINE_COSTS = [100, 180, 300, 450, 650];
  Z.mineIncome = function (lvl) { return 10 + 3.5 * lvl; };
  Z.mineCap = function (lvl) { return 400 + 150 * lvl; };

  // ---- Bolumler --------------------------------------------------------
  Z.MAX_LEVEL = 75;
  Z.REALMS = ['Yeşil Vadi', 'Kızıl Çöl', 'Buz Diyarı', 'Volkan Diyarı', 'Gölge Bataklığı'];
  Z.realmOf = function (n) { return Math.min(Z.REALMS.length - 1, Math.floor((n - 1) / 15)); };
  // Her diyarin adlari kendi temasina uygun (1-15 Yesil Vadi, 16-30 Kizil Col, 31-45 Buz Diyari)
  Z.LEVEL_NAMES = [
    'Kızıl Vadi', 'Sis Geçidi', 'Kuzgun Tepesi', 'Demirkapı', 'Gölge Ormanı',
    'Kırık Köprü', 'Ateş Ovası', 'Taşkale Eteği', 'Fırtına Burnu', 'Kara Bataklık',
    'Çelik Dağ', 'Bozkurt Yaylası', 'Altın Çayır', 'Zehir Nehri', 'Kartal Kayalığı',
    'Kum Fırtınası', 'Akrep Vadisi', 'Güneş Tapınağı', 'Kayıp Vaha', 'Kemik Çölü',
    'Alev Boğazı', 'Tuz Düzü', 'Yıkık Şehir', 'Kervan Yolu', 'Kızıl Kule',
    'Ejder Geçidi', 'Kurt Kapanı', 'Siyah Kale', 'Kül Vadisi', 'Çöl Tahtı',
    'Buzul Kapısı', 'Kar Fırtınası', 'Donmuş Göl', 'Kurt Yurdu', 'Kristal Mağara',
    'Ayaz Boğazı', 'Beyaz Kale', 'Kutup Işığı', 'Don Vadisi', 'Dondurucu Zirve',
    'Buz Köprüsü', 'Kış Nöbeti', 'Yıldız Kalesi', 'Son Sur', 'Seferhan Tahtı',
    'Kül Kapısı', 'Lav Nehri', 'Köz Vadisi', 'Obsidyen Yolu', 'Magma Kalesi',
    'Duman Geçidi', 'Kızgın Kayalık', 'Alev Köprüsü', 'Bazalt Kule', 'Kor Meydanı',
    'Ateş Boğazı', 'Cehennem Yolu', 'Kül Fırtınası', 'Lav Gölü', 'Volkan Tahtı',
    'Sis Bataklığı', 'Çürük Köprü', 'Ölü Orman', 'Mantar Vadisi', 'Karanlık Göl',
    'Zehirli Sazlık', 'Hayalet Patikası', 'Çamur Kalesi', 'Kurbağa Tepesi', 'Kasvet Ormanı',
    'Ruhlar Çukuru', 'Uğultu Vadisi', 'Kara Su', 'Son Bataklık', 'Gölge Tahtı'
  ];
  // Her bolum ayri bir sefer: kisa hikaye
  Z.STORIES = [
    'Sınırda ilk çatışma! Düşman öncüleri vadiye girdi — sancağını dik, Seferhan.',
    'Sis her şeyi yutuyor. Düşman nerede, ne kadar? Önce savun, sonra vur.',
    'Kuzgunlar tepede dönüyor: süvari baskını yakın. Mızrakçılarını hazırla.',
    'Demirkapı\'yı tutan birlik dağıtılırsa yol açılacak.',
    'PATRON — Gölge Ormanı\'nın efendisi yolunu kesti. Ordunu topla!',
    'Köprü yıkık, düşman karşı yakada. Şifacıların cephede şart.',
    'Ova alev içinde. Zaman az: hızlı ilerle, düşman toparlanmadan vur.',
    'Taşkale\'nin eteğinde ağır zırhlı şövalyeler dizildi.',
    'Fırtına Burnu\'nda denizden gelen takviyeyi karşıla.',
    'PATRON — Kara Bataklık\'ın efendisi çamurdan doğruldu.',
    'Çelik Dağ madenleri ordunun can damarı. Ele geçir!',
    'Bozkurt Yaylası\'nda hızlı bir akıncı ordusu pusuda bekliyor.',
    'Altın Çayır\'da zengin kervanlar var. Ganimet seni bekliyor.',
    'Zehir Nehri\'nin kıyısında düşman nöbet tutuyor. Sessiz ve hızlı ol.',
    'PATRON — Kartal Kayalığı\'nın koruyucusu seni gökten izliyor.',
    'Kum Fırtınası! Çölün kapısında görüş yok, sabır var.',
    'Akrep Vadisi\'nin her taşı bir tuzak. Kalkanlarını yükselt.',
    'Güneş Tapınağı\'nın muhafızları kutsal toprağı bırakmayacak.',
    'Kayıp Vaha\'yı ele geçiren ordu su kaynağını kontrol ediyor.',
    'PATRON — Kemik Çölü\'nün kadim komutanı kumların altından yükseldi.',
    'Alev Boğazı\'ndan geçiş tek yol. Dar ve tehlikeli.',
    'Tuz Düzü\'nde kervan yolları kesilmiş. Yolları yeniden aç.',
    'Yıkık Şehir\'in surları hâlâ dik. Mancınıklar işe yarayacak.',
    'Kervan Yolu\'nu soyan haydut ordusu seni bekliyor.',
    'PATRON — Kızıl Kule\'nin efendisi kulesinden inmeyecek.',
    'Ejder Geçidi\'nde kanatlı gölgeler dolaşıyor. Ürkme, ilerle.',
    'Kurt Kapanı: ya sen avlanırsın ya düşman.',
    'Siyah Kale\'nin önündeki son meydan okuma.',
    'Kül Vadisi\'nde savaşın külleri hâlâ sıcak.',
    'PATRON — Çöl Tahtı\'nın hükümdarı seni sınamak için bekliyor.',
    'Buzul Kapısı\'nı geçtin: artık dondurucu soğukta savaşıyorsun.',
    'Kar fırtınasında ordular birbirini zor görüyor. Sancaklar yol göstersin.',
    'Donmuş Göl\'ün buzu ince. Düşman hızını kesmek istiyor.',
    'Kurt Yurdu\'nun sürüsü kar altında koşuyor.',
    'PATRON — Kristal Mağara\'nın buz devi uyandı!',
    'Ayaz Boğazı: nefes bile donuyor. Şifacılarını koru.',
    'Beyaz Kale\'nin surları buzdan, ama inatçı.',
    'Kutup Işığı altında gizemli bir ordu belirdi.',
    'Don Vadisi\'nde pusuya düşmemek için dikkatli ol.',
    'PATRON — Dondurucu Zirve\'nin bekçisi geçit vermeyecek.',
    'Buz Köprüsü çatırdıyor; hızlı geçmek gerek.',
    'Kış Nöbeti: düşman son yedeklerini sürüyor.',
    'Yıldız Kalesi\'nin kapıları sana açılmayı bekliyor.',
    'Son Sur\'un ardında Seferhan Tahtı var. Son hazırlık!',
    'PATRON — Seferhan Tahtı! Ama sefer burada bitmiyor: ufukta alev ve gölge var.',
    'Buz Diyarı\'nı geride bıraktın; ufukta alev kırmızısı bir gökyüzü var. Kül Kapısı\'nı geç.',
    'Lav nehrinin üzerindeki taş geçit tek yol. Düşman karşı kıyıda bekliyor.',
    'Köz Vadisi\'nin sıcağı zırhları kızartıyor. Hızlı ol, uzun savaşma.',
    'Keskin obsidyen kayalar arasında dar bir yol: pusu için ideal.',
    'PATRON — Magma Kalesi\'nin efendisi erimiş taştan bir zırh giyiyor.',
    'Duman gözleri yakıyor. Düşman seni görmeden sancak yerini belirle.',
    'Kızgın kayalıkta her adım tehlikeli. Şifacılarını yanında tut.',
    'Alev Köprüsü\'nün iki ucu da düşman elinde.',
    'Bazalt Kule\'nin muhafızları zırhlı ve sabırlı.',
    'PATRON — Kor Meydanı\'nda ateş dansçılarının komutanı seni bekliyor.',
    'Ateş Boğazı: düşman alevlerle yolu kapatmış.',
    'Cehennem Yolu\'nda bile ordunu geri çekme.',
    'Kül fırtınasında düşmanın sesi bile boğuk geliyor.',
    'Lav Gölü\'nün kıyısında Volkan Tahtı\'nın bekçileri toplandı.',
    'PATRON — Volkan Tahtı\'nın ejderha binicisi gökten indi!',
    'Bataklığın sisi her şeyi yutuyor. Ordun yönünü kaybetmesin.',
    'Çürük Köprü\'nün her tahtası bir tuzak.',
    'Ölü Orman\'da ağaçlar bile düşmanın safında gibi.',
    'Mantar Vadisi\'nin ışıkları cezbedici ama tehlikeli.',
    'PATRON — Karanlık Göl\'ün dev yaratığı sudan yükseldi.',
    'Zehirli sazlıkta sessiz ilerlemek şart.',
    'Hayalet Patikası\'nda gölge askerler beliriyor.',
    'Çamur Kalesi\'nin surları yumuşak ama kapıları sağlam.',
    'Kurbağa Tepesi\'nde düşman yüksek yerden atış yapıyor.',
    'PATRON — Kasvet Ormanı\'nın cadısı yolunu kesti.',
    'Ruhlar Çukuru\'nun başında kadim bir ordu uyanıyor.',
    'Uğultu Vadisi\'nde sesler bile silah.',
    'Kara Su\'yu geçmek için hızlı ve kararlı ol.',
    'Son Bataklık\'ın ardında Gölge Tahtı var. Son çabaya hazır ol!',
    'PATRON — Gölge Tahtı! Tüm seferlerin gerçek sonu. Gölge Han seni bekliyor.'
  ];
  // Sefer kurallari: her sefere ozgu bir savas kosulu
  Z.RULES = {
    none:     { name: '', icon: '', desc: '' },
    rich:     { name: 'Altın Damarı',    icon: '💰', desc: 'Altın kazancın %30 artar.' },
    swift:    { name: 'Fırtına Rüzgârı', icon: '🌪️', desc: 'Tüm birlikler %25 daha hızlı yürür.' },
    heavy:    { name: 'Zırhlı Ordu',     icon: '🛡️', desc: 'Düşman %20 daha dayanıklı. Ödüller %30 fazla.' },
    ambush:   { name: 'Pusu',            icon: '🗡️', desc: 'Düşman kenar koridorlardan baskın yapar.' },
    famine:   { name: 'Kıtlık',          icon: '🌾', desc: 'Altın kazancın %20 azalır, her düşman %50 fazla altın verir. Ödüller %30 fazla.' },
    rally:    { name: 'Moral Çağrısı',   icon: '📯', desc: 'Dost birlikler saniyede %1 can yeniler.' },
    fortress: { name: 'Kale Kuşatması',  icon: '🏰', desc: 'Düşman kalesi %40 daha sağlam. Kart bekleme süreleri %15 kısalır.' },
    survive:  { name: 'Savunma Seferi',  icon: '⏳', desc: 'Kalen düşmeden süreyi doldur! Düşman kalesi yıkılamaz.' }
  };
  var RULE_CYCLE = ['rich', 'survive', 'swift', 'heavy', 'ambush', 'rally', 'famine', 'fortress'];
  Z.ruleOf = function (n) {
    if (n <= 2 || n % 5 === 0) return 'none'; // ilk iki bolum ve patronlar kuralsiz
    var k = 0; for (var i = 3; i < n; i++) if (i % 5 !== 0) k++;
    return RULE_CYCLE[k % RULE_CYCLE.length];
  };
  Z.isBoss = function (n) { return n % 5 === 0; };
  // Savas turu: 3,4,8,9,13,14... ACIK ALAN (serbest yerlestirme, komutan, arazi); digerleri KALE KUSATMASI
  Z.levelType = function (n) { var m = n % 5; return (m === 3 || m === 4) ? 'field' : 'castle'; };
  Z.FIELD_OBJECTIVES = {
    commander: { icon: '👑', name: 'Komutanı Yok Et', desc: 'Düşman komutanını öldür. Komutanın düşerse yenilirsin!' },
    capture:   { icon: '🚩', name: 'Bayrakları Ele Geçir', desc: 'Orta alandaki 3 bayrağı tutarak 100 puana ulaş. Komutanın düşerse yenilirsin!' },
    survive:   { icon: '⏳', name: 'Mevzii Tut', desc: 'Komutanını koruyarak süre dolana kadar dayan.' }
  };
  Z.fieldObjective = function (n, rules) {
    if (rules && rules.indexOf('survive') >= 0) return 'survive';
    return Math.floor(n / 5) % 2 === 1 ? 'capture' : 'commander';
  };
  Z.fieldBudget = function (n) { return 300 + 55 * n; }; // savas oncesi yerlestirme butcesi (komuta puani)
  Z.levelInfo = function (n) {
    var tiers = ['spear', 'archer'];
    if (n >= 3) tiers.push('cav');
    if (n >= 6) tiers.push('knight');
    if (n >= 9) tiers.push('mage');
    if (n >= 12) tiers.push('cata');
    if (n >= 10) tiers.push('healer');
    if (n >= 20) tiers.push('banner');
    if (n >= 22) tiers.push('assassin');
    if (n >= 32) tiers.push('golem');
    if (n >= 42) tiers.push('flamer');
    return {
      n: n,
      name: Z.LEVEL_NAMES[(n - 1) % Z.LEVEL_NAMES.length],
      boss: Z.isBoss(n),
      realm: Z.realmOf(n),
      type: Z.levelType(n),
      rule: Z.ruleOf(n),
      story: Z.STORIES[(n - 1) % Z.STORIES.length],
      surviveTime: Math.round(90 + 2.5 * n),
      scale: 1 + 0.033 * Math.min(n - 1, 29) + 0.028 * Math.max(0, Math.min(n - 30, 15)) + 0.008 * Math.max(0, n - 45),
      baseHp: 700 + 130 * n,
      aiRate: n <= 40 ? 8 + 0.29 * n : 20 + 0.04 * (n - 40), // oyuncunun azami geliriyle (27.5) dengeli kalir
      // // oyuncunun azami geliriyle (27.5) dengeli kalir
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
    { id: 'mine3',  text: 'Savaşta madeni 3 kez yükselt', stat: 'mines', target: 3, coins: 100, gems: 2 },
    { id: 'perk3',  text: '3 savaş ganimeti seç', stat: 'perks', target: 3, coins: 110, gems: 3 }
  ];

  // ---- Savas ganimeti (savas ici secilen guc) --------------------------
  Z.PERKS = {
    gold:   { name: 'Zengin Maden',    icon: '💰', desc: 'Altın kazancı +%25.' },
    hp:     { name: 'Çelik Zırh',      icon: '🛡️', desc: 'Tüm birliklerin canı +%15.' },
    dmg:    { name: 'Keskin Kılıçlar', icon: '⚔️', desc: 'Tüm birliklerin hasarı +%15.' },
    cd:     { name: 'Hızlı Çağrı',     icon: '⏱️', desc: 'Kart bekleme süreleri -%25.' },
    castle: { name: 'Sur Onarımı',     icon: '🏰', desc: 'Kale canı +%15 ve %30 onarılır.' },
    tower:  { name: 'Kale Okçuları',   icon: '🏹', desc: 'Kale okçularının hasarı 2 katı.' },
    regen:  { name: 'Şifa Rüzgârı',    icon: '🍃', desc: 'Dost birlikler saniyede %1.5 can yeniler.' },
    loot:   { name: 'Ganimet Sandığı', icon: '🎁', desc: 'Hemen +150 altın.' },
    skill:  { name: 'Kahraman İlhamı', icon: '✨', desc: 'Kahraman yeteneği %30 daha hızlı dolar.' }
  };
  Z.PERK_KILLS = [6, 18, 36, 60]; // bu kadar dusman yenilince secim sunulur

  // ---- Sans carki -------------------------------------------------------
  Z.WHEEL = [
    { coins: 100, w: 22 }, { gems: 3, w: 16 }, { coins: 250, w: 18 }, { gems: 8, w: 8 },
    { coins: 500, w: 9 }, { gems: 5, w: 14 }, { coins: 150, w: 20 }, { gems: 40, w: 1.5 }
  ];
  Z.WHEEL_COST = 10; // elmas (gunluk bedava hak bittikten sonra)

  // ---- Yildiz odulleri ve basarimlar --------------------------------------
  Z.STAR_MILESTONES = [
    { n: 10, coins: 300, gems: 5 }, { n: 25, coins: 600, gems: 10 }, { n: 45, coins: 1000, gems: 15 },
    { n: 70, coins: 1800, gems: 25 }, { n: 100, coins: 3000, gems: 40 }, { n: 130, coins: 5000, gems: 60 }
  ];
  function maxUnit(d) { var m = 0; for (var k in d.unitLvl) if (d.unitLvl[k] > m) m = d.unitLvl[k]; return m; }
  Z.ACHIEVEMENTS = [
    { id: 'wins10',   text: '10 savaş kazan',            target: 10,   gems: 5,  get: function (d) { return d.stats.wins; } },
    { id: 'wins50',   text: '50 savaş kazan',            target: 50,   gems: 15, get: function (d) { return d.stats.wins; } },
    { id: 'kills200', text: '200 düşman yen',            target: 200,  gems: 5,  get: function (d) { return d.stats.kills; } },
    { id: 'kills2k',  text: '2000 düşman yen',           target: 2000, gems: 15, get: function (d) { return d.stats.kills; } },
    { id: 'lvl10',    text: '10. bölümü tamamla',        target: 10,   gems: 10, get: function (d) { return d.cleared; } },
    { id: 'lvl30',    text: '30. bölümü tamamla',        target: 30,   gems: 25, get: function (d) { return d.cleared; } },
    { id: 'lvl45',    text: 'Seferhan Tahtı\'nı ele geçir (45)', target: 45, gems: 50, get: function (d) { return d.cleared; } },
    { id: 'stars45',  text: '45 yıldız topla',           target: 45,   gems: 10, get: function (d) { return d.stats.totalStars; } },
    { id: 'stars100', text: '100 yıldız topla',          target: 100,  gems: 25, get: function (d) { return d.stats.totalStars; } },
    { id: 'end10',    text: 'Sonsuz Kuşatma: 10. dalga', target: 10,   gems: 8,  get: function (d) { return d.endlessBest; } },
    { id: 'end30',    text: 'Sonsuz Kuşatma: 30. dalga', target: 30,   gems: 20, get: function (d) { return d.endlessBest; } },
    { id: 'unit10',   text: 'Bir birliği 10. seviyeye çıkar', target: 10, gems: 10, get: maxUnit },
    { id: 'castle5',  text: 'Kaleyi 5. seviyeye çıkar',  target: 5,    gems: 8,  get: function (d) { return d.castleLvl; } },
    { id: 'treas5',   text: 'Hazineyi 5. seviyeye çıkar', target: 5,   gems: 8,  get: function (d) { return d.treasuryLvl; } },
    { id: 'heroes',   text: 'Tüm kahramanları aç',       target: 5,    gems: 20, get: function (d) { var n = 0; for (var k in d.heroOwned) if (d.heroOwned[k]) n++; return n; } },
    { id: 'combo15',  text: '15\'lik öldürme serisi yap', target: 15,  gems: 6,  get: function (d) { return d.stats.maxCombo || 0; } },
    { id: 'perks20',  text: '20 savaş ganimeti seç',     target: 20,   gems: 8,  get: function (d) { return d.stats.perks || 0; } },
    { id: 'spins10',  text: 'Şans Çarkı\'nı 10 kez çevir', target: 10, gems: 8,  get: function (d) { return d.stats.spins || 0; } },
    { id: 'lvl60',    text: 'Volkan Tahtı\'nı ele geçir (60)', target: 60, gems: 40, get: function (d) { return d.cleared; } },
    { id: 'lvl75',    text: 'Gölge Tahtı\'nı ele geçir (75)', target: 75, gems: 80, get: function (d) { return d.cleared; } },
    { id: 'hard10',   text: 'Zor kademede 10 sefer kazan', target: 10, gems: 15, get: function (d) { return d.stats.hardWins || 0; } },
    { id: 'legend5',  text: 'Efsane kademede 5 sefer kazan', target: 5, gems: 25, get: function (d) { return d.stats.legendWins || 0; } },
    { id: 'daily7',   text: '7 Günlük Sefer kazan',      target: 7,    gems: 15, get: function (d) { return d.stats.dailyWins || 0; } },
    { id: 'daily30',  text: '30 Günlük Sefer kazan',     target: 30,   gems: 50, get: function (d) { return d.stats.dailyWins || 0; } },
    { id: 'market5',  text: 'Pazar\'dan 5 kez alışveriş yap', target: 5, gems: 5, get: function (d) { return d.stats.purchases || 0; } },
    { id: 'unit25',   text: 'Bir birliği 25. seviyeye çıkar', target: 25, gems: 25, get: maxUnit },
    { id: 'unit40',   text: 'Bir birliği son seviyeye (40) çıkar', target: 40, gems: 60, get: maxUnit }
  ];

  // ---- Zorluk kademeleri (tekrar oynanabilirlik) --------------------------
  Z.DIFFS = [
    { name: 'Normal', icon: '⚔️', hp: 1,    dmg: 1,    ai: 1,    base: 1,    coin: 1, gem: 0 },
    { name: 'Zor',    icon: '🔥', hp: 1.35, dmg: 1.2,  ai: 1.15, base: 1.45, coin: 2, gem: 5 },
    { name: 'Efsane', icon: '💀', hp: 1.8,  dmg: 1.45, ai: 1.3,  base: 1.9,  coin: 3, gem: 10 }
  ];
  // Zor: normalde kazanilmis bolumde; Efsane: o bolumu Zor'da kazandiktan sonra
  Z.diffUnlocked = function (d, level, diff) {
    if (diff === 0) return true;
    if (diff === 1) return level <= d.cleared;
    return (d.hardCleared[level] || 0) >= 1;
  };

  // ---- Gunluk sefer: her gun tarihe gore degisen, ilerlemene gore olceklenen ozel savas
  Z.DAILY_UNLOCK = 5; // bu kadar bolum kazanilinca acilir
  Z.dailySefer = function (day, cleared) {
    var h = 2166136261, i;
    for (i = 0; i < day.length; i++) { h ^= day.charCodeAt(i); h = Math.imul(h, 16777619); }
    h >>>= 0;
    function rnd() { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return h / 4294967296; }
    rnd(); rnd();
    var maxRealm = Math.min(Z.REALMS.length - 1, Z.realmOf(Math.max(1, cleared + 1)));
    var theme = Math.floor(rnd() * (maxRealm + 1));
    var pool = ['rich', 'swift', 'heavy', 'ambush', 'famine', 'rally', 'fortress', 'survive'], rules = [];
    while (rules.length < 2) {
      var r = pool[Math.floor(rnd() * pool.length)];
      if (rules.indexOf(r) >= 0) continue;
      if ((r === 'rich' && rules[0] === 'famine') || (r === 'famine' && rules[0] === 'rich')) continue; // celisen gelir kurallari
      rules.push(r);
    }
    var level = Math.max(3, Math.min(Z.MAX_LEVEL, Math.round(cleared * 0.8) + 2));
    var info = Z.levelInfo(level);
    return { day: day, theme: theme, rules: rules, level: level, rewardCoins: Math.round(info.rewardCoins * 2.5), rewardGems: 12 };
  };

  // ---- Pazar: elmas harcama yeri ----------------------------------------
  Z.MARKET = [
    { id: 'coins',    icon: '👛', name: 'Altın Kesesi',       gems: 10, desc: function (d) { return '🪙 ' + (400 + 60 * d.cleared) + ' altın'; } },
    { id: 'chest',    icon: '🎁', name: 'Büyük Sandık',       gems: 40, desc: function (d) { return '🪙 ' + (3000 + 250 * d.cleared) + ' altın'; } },
    { id: 'treasury', icon: '💰', name: 'Hazine Hızlandırma', gems: 15, desc: function () { return 'Hazine hemen 8 saatlik geliri biriktirir'; } },
    { id: 'spin',     icon: '🎡', name: 'Bonus Çark Hakkı',   gems: 10, desc: function () { return 'Şans Çarkı\'nı bedava çevir'; } }
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
