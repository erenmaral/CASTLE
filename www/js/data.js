// Sefer Vakti - oyun verileri (birlikler, kahramanlar, bolumler, gorevler)
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };

  // ---- Birlikler -------------------------------------------------------
  // cls: sinif (bonus tablosu icin), int: saldiri araligi (sn), cd: kart bekleme suresi
  Z.UNITS = {
    spear:  { id: 'spear',  name: $t('Mızrakçı'), icon: '🔱', cls: 'spear',  hp: 120, dmg: 14, int: 0.9, range: 40,  speed: 52,  cost: 50,  cd: 1.8, ranged: false,
              desc: $t('Ucuz ve dayanıklı ön saf. Süvarilere karşı %60 fazla hasar verir.') },
    archer: { id: 'archer', name: $t('Okçu'),     icon: '🏹', cls: 'archer', hp: 70,  dmg: 16, int: 1.1, range: 230, speed: 45,  cost: 70,  cd: 2.5, ranged: true,
              desc: $t('Uzaktan vurur. Mızrakçılara karşı %40 fazla hasar verir.') },
    cav:    { id: 'cav',    name: $t('Süvari'),   icon: '🐎', cls: 'cav',    hp: 160, dmg: 20, int: 0.8, range: 44,  speed: 105, cost: 110, cd: 4.0, ranged: false,
              desc: $t('Hızlı. İlk vuruşu çifte hasar (hücum). Okçulara karşı %60 fazla hasar.') },
    knight: { id: 'knight', name: $t('Şövalye'),  icon: '🛡️', cls: 'knight', hp: 420, dmg: 24, int: 1.2, range: 44,  speed: 38,  cost: 150, cd: 6.0, ranged: false,
              desc: $t('Ağır zırhlı. Ok ve mancınık hasarını %30 azaltır. Yavaştır.') },
    mage:   { id: 'mage',   name: $t('Büyücü'),   icon: '🔮', cls: 'mage',   hp: 80,  dmg: 30, int: 2.0, range: 200, speed: 40,  cost: 180, cd: 8.0, ranged: true, aoe: 70,
              desc: $t('Alan hasarı verir, zırhı deler (Şövalyeye +%35). Süvariye karşı savunmasız.') },
    cata:   { id: 'cata',   name: $t('Mancınık'), icon: '☄️', cls: 'cata',   hp: 150, dmg: 40, int: 3.0, range: 340, speed: 25,  cost: 200, cd: 10.0, ranged: true, aoe: 55, minRange: 110, baseMult: 2.5,
              desc: $t('Çok uzak menzil, kaleye 2.5 kat hasar. Yakındaki düşmana ateş edemez.') },
    healer: { id: 'healer', name: $t('Şifacı'), icon: '💚', cls: 'healer', hp: 75, dmg: 20, int: 1.6, range: 190, speed: 42, cost: 130, cd: 6.0, ranged: true, heal: true,
              desc: $t('Koridordaki yaralı dostları iyileştirir. Savaşmaz, korumaya al! Süvariye karşı savunmasız.') },
    banner: { id: 'banner', name: $t('Sancaktar'), icon: '🚩', cls: 'banner', hp: 150, dmg: 9, int: 1.0, range: 40, speed: 48, cost: 90, cd: 5.0, ranged: false, aura: true,
              desc: $t('Yanındaki (160 birim) dostlara %20 hasar bonusu verir. Sancağı düşmeden ordunu güçlendirir.') },
    assassin: { id: 'assassin', name: $t('Suikastçı'), icon: '🗡️', cls: 'assassin', hp: 70, dmg: 26, int: 0.6, range: 34, speed: 120, cost: 120, cd: 5.0, ranged: false,
              desc: $t('Çok hızlı. Düşman saflarının arasından geçip okçu, büyücü ve şifacıları avlar. Canı azdır.') },
    golem: { id: 'golem', name: $t('Taş Dev'), icon: '🗿', cls: 'golem', hp: 900, dmg: 34, int: 1.8, range: 50, speed: 30, cost: 260, cd: 12.0, ranged: false, splash: 60,
              desc: $t('Taştan dev. Çok dayanıklı; darbesi çevresindeki düşmanları da ezer. Çok yavaştır.') },
    flamer: { id: 'flamer', name: $t('Alevci'), icon: '🔥', cls: 'flamer', hp: 110, dmg: 11, int: 0.5, range: 110, speed: 44, cost: 170, cd: 7.0, ranged: false, flame: true,
              desc: $t('Kısa menzilli alev. Birden fazla düşmanı yakar; yanan düşman 3 sn boyunca can kaybeder.') }
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
    aslan: { id: 'aslan', name: $t('Aslan Han'), icon: '🦁', skill: $t('Zafer Naraası'), type: 'roar', cd: 28, target: 'none', gems: 0,
             desc: $t('Tüm birliklere 8 sn boyunca %35 hasar ve saldırı hızı verir.') },
    yildiz: { id: 'yildiz', name: $t('Yıldız Hatun'), icon: '⚡', skill: $t('Yıldırım Fırtınası'), type: 'bolt', cd: 22, target: 'lane', gems: 60,
             desc: $t('Seçilen koridorda en öndeki 5 düşmana yıldırım indirir.') },
    demir: { id: 'demir', name: $t('Demir Bey'), icon: '🪖', skill: $t('Çelik Siper'), type: 'ward', cd: 26, target: 'lane', gems: 120,
             desc: $t('Seçilen koridordaki dostları %35 iyileştirir, 6 sn yarı hasar alır.') },
    buz: { id: 'buz', name: $t('Buz Hatun'), icon: '❄️', skill: $t('Don Fırtınası'), type: 'freeze', cd: 24, target: 'lane', gems: 150,
             desc: $t('Seçilen koridordaki tüm düşmanları 3.5 sn dondurur ve hasar verir.') },
    ejder: { id: 'ejder', name: $t('Ejder Hatun'), icon: '🐉', skill: $t('Ejder Nefesi'), type: 'dragon', cd: 26, target: 'lane', gems: 200,
             desc: $t('Seçilen koridordaki tüm düşmanları 6 sn boyunca yakar: saniyede %5 can kaybederler.') }
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
  Z.MAX_LEVEL = 105;
  Z.AUTO_UNLOCK = 8; // oto-savas bu kadar bolum kazanilinca acilir
  Z.REALMS = [$t('Yeşil Vadi'), $t('Kızıl Çöl'), $t('Buz Diyarı'), $t('Volkan Diyarı'), $t('Gölge Bataklığı'), $t('Altın Yaprak Ormanı'), $t('Yıldız Ovası')];
  Z.realmOf = function (n) { return Math.min(Z.REALMS.length - 1, Math.floor((n - 1) / 15)); };
  // Her diyarin adlari kendi temasina uygun (1-15 Yesil Vadi, 16-30 Kizil Col, 31-45 Buz Diyari)
  Z.LEVEL_NAMES = [
    $t('Kızıl Vadi'), $t('Sis Geçidi'), $t('Kuzgun Tepesi'), $t('Demirkapı'), $t('Gölge Ormanı'),
    $t('Kırık Köprü'), $t('Ateş Ovası'), $t('Taşkale Eteği'), $t('Fırtına Burnu'), $t('Kara Bataklık'),
    $t('Çelik Dağ'), $t('Bozkurt Yaylası'), $t('Altın Çayır'), $t('Zehir Nehri'), $t('Kartal Kayalığı'),
    $t('Kum Fırtınası'), $t('Akrep Vadisi'), $t('Güneş Tapınağı'), $t('Kayıp Vaha'), $t('Kemik Çölü'),
    $t('Alev Boğazı'), $t('Tuz Düzü'), $t('Yıkık Şehir'), $t('Kervan Yolu'), $t('Kızıl Kule'),
    $t('Ejder Geçidi'), $t('Kurt Kapanı'), $t('Siyah Kale'), $t('Kül Vadisi'), $t('Çöl Tahtı'),
    $t('Buzul Kapısı'), $t('Kar Fırtınası'), $t('Donmuş Göl'), $t('Kurt Yurdu'), $t('Kristal Mağara'),
    $t('Ayaz Boğazı'), $t('Beyaz Kale'), $t('Kutup Işığı'), $t('Don Vadisi'), $t('Dondurucu Zirve'),
    $t('Buz Köprüsü'), $t('Kış Nöbeti'), $t('Yıldız Kalesi'), $t('Son Sur'), $t('Seferhan Tahtı'),
    $t('Kül Kapısı'), $t('Lav Nehri'), $t('Köz Vadisi'), $t('Obsidyen Yolu'), $t('Magma Kalesi'),
    $t('Duman Geçidi'), $t('Kızgın Kayalık'), $t('Alev Köprüsü'), $t('Bazalt Kule'), $t('Kor Meydanı'),
    $t('Ateş Boğazı'), $t('Cehennem Yolu'), $t('Kül Fırtınası'), $t('Lav Gölü'), $t('Volkan Tahtı'),
    $t('Sis Bataklığı'), $t('Çürük Köprü'), $t('Ölü Orman'), $t('Mantar Vadisi'), $t('Karanlık Göl'),
    $t('Zehirli Sazlık'), $t('Hayalet Patikası'), $t('Çamur Kalesi'), $t('Kurbağa Tepesi'), $t('Kasvet Ormanı'),
    $t('Ruhlar Çukuru'), $t('Uğultu Vadisi'), $t('Kara Su'), $t('Son Bataklık'), $t('Gölge Tahtı'),
    $t('Yaprak Geçidi'), $t('Kehribar Vadisi'), $t('Palamut Tepesi'), $t('Bakır Köprü'), $t('Hasat Tahtı'),
    $t('Kızıl Meşelik'), $t('Mantar Çayırı'), $t('Değirmen Yolu'), $t('Kurt Pınarı'), $t('Bal Kalesi'),
    $t('Sisli Bağlar'), $t('Çınar Meydanı'), $t('Kuzgun Ambarı'), $t('Son Hasat'), $t('Sonbahar Tahtı'),
    $t('Ay Kapısı'), $t('Yıldız Patikası'), $t('Gece Nöbeti'), $t('Meteor Vadisi'), $t('Işık Kulesi'),
    $t('Gümüş Göl'), $t('Kuyruklu Yıldız'), $t('Karanlık Surlar'), $t('Ay Tapınağı'), $t('Gökyüzü Kalesi'),
    $t('Tan Sökümü'), $t('Yıldız Çukuru'), $t('Samanyolu Geçidi'), $t('Son Gece'), $t('Vakit Tahtı')
  ];
  // Her bolum ayri bir sefer: kisa hikaye
  Z.STORIES = [
    $t('Sınırda ilk çatışma! Düşman öncüleri vadiye girdi — sancağını dik, Seferhan.'),
    $t('Sis her şeyi yutuyor. Düşman nerede, ne kadar? Önce savun, sonra vur.'),
    $t('Kuzgunlar tepede dönüyor: süvari baskını yakın. Mızrakçılarını hazırla.'),
    $t('Demirkapı\'yı tutan birlik dağıtılırsa yol açılacak.'),
    $t('PATRON — Gölge Ormanı\'nın efendisi yolunu kesti. Ordunu topla!'),
    $t('Köprü yıkık, düşman karşı yakada. Şifacıların cephede şart.'),
    $t('Ova alev içinde. Zaman az: hızlı ilerle, düşman toparlanmadan vur.'),
    $t('Taşkale\'nin eteğinde ağır zırhlı şövalyeler dizildi.'),
    $t('Fırtına Burnu\'nda denizden gelen takviyeyi karşıla.'),
    $t('PATRON — Kara Bataklık\'ın efendisi çamurdan doğruldu.'),
    $t('Çelik Dağ madenleri ordunun can damarı. Ele geçir!'),
    $t('Bozkurt Yaylası\'nda hızlı bir akıncı ordusu pusuda bekliyor.'),
    $t('Altın Çayır\'da zengin kervanlar var. Ganimet seni bekliyor.'),
    $t('Zehir Nehri\'nin kıyısında düşman nöbet tutuyor. Sessiz ve hızlı ol.'),
    $t('PATRON — Kartal Kayalığı\'nın koruyucusu seni gökten izliyor.'),
    $t('Kum Fırtınası! Çölün kapısında görüş yok, sabır var.'),
    $t('Akrep Vadisi\'nin her taşı bir tuzak. Kalkanlarını yükselt.'),
    $t('Güneş Tapınağı\'nın muhafızları kutsal toprağı bırakmayacak.'),
    $t('Kayıp Vaha\'yı ele geçiren ordu su kaynağını kontrol ediyor.'),
    $t('PATRON — Kemik Çölü\'nün kadim komutanı kumların altından yükseldi.'),
    $t('Alev Boğazı\'ndan geçiş tek yol. Dar ve tehlikeli.'),
    $t('Tuz Düzü\'nde kervan yolları kesilmiş. Yolları yeniden aç.'),
    $t('Yıkık Şehir\'in surları hâlâ dik. Mancınıklar işe yarayacak.'),
    $t('Kervan Yolu\'nu soyan haydut ordusu seni bekliyor.'),
    $t('PATRON — Kızıl Kule\'nin efendisi kulesinden inmeyecek.'),
    $t('Ejder Geçidi\'nde kanatlı gölgeler dolaşıyor. Ürkme, ilerle.'),
    $t('Kurt Kapanı: ya sen avlanırsın ya düşman.'),
    $t('Siyah Kale\'nin önündeki son meydan okuma.'),
    $t('Kül Vadisi\'nde savaşın külleri hâlâ sıcak.'),
    $t('PATRON — Çöl Tahtı\'nın hükümdarı seni sınamak için bekliyor.'),
    $t('Buzul Kapısı\'nı geçtin: artık dondurucu soğukta savaşıyorsun.'),
    $t('Kar fırtınasında ordular birbirini zor görüyor. Sancaklar yol göstersin.'),
    $t('Donmuş Göl\'ün buzu ince. Düşman hızını kesmek istiyor.'),
    $t('Kurt Yurdu\'nun sürüsü kar altında koşuyor.'),
    $t('PATRON — Kristal Mağara\'nın buz devi uyandı!'),
    $t('Ayaz Boğazı: nefes bile donuyor. Şifacılarını koru.'),
    $t('Beyaz Kale\'nin surları buzdan, ama inatçı.'),
    $t('Kutup Işığı altında gizemli bir ordu belirdi.'),
    $t('Don Vadisi\'nde pusuya düşmemek için dikkatli ol.'),
    $t('PATRON — Dondurucu Zirve\'nin bekçisi geçit vermeyecek.'),
    $t('Buz Köprüsü çatırdıyor; hızlı geçmek gerek.'),
    $t('Kış Nöbeti: düşman son yedeklerini sürüyor.'),
    $t('Yıldız Kalesi\'nin kapıları sana açılmayı bekliyor.'),
    $t('Son Sur\'un ardında Seferhan Tahtı var. Son hazırlık!'),
    $t('PATRON — Seferhan Tahtı! Ama sefer burada bitmiyor: ufukta alev ve gölge var.'),
    $t('Buz Diyarı\'nı geride bıraktın; ufukta alev kırmızısı bir gökyüzü var. Kül Kapısı\'nı geç.'),
    $t('Lav nehrinin üzerindeki taş geçit tek yol. Düşman karşı kıyıda bekliyor.'),
    $t('Köz Vadisi\'nin sıcağı zırhları kızartıyor. Hızlı ol, uzun savaşma.'),
    $t('Keskin obsidyen kayalar arasında dar bir yol: pusu için ideal.'),
    $t('PATRON — Magma Kalesi\'nin efendisi erimiş taştan bir zırh giyiyor.'),
    $t('Duman gözleri yakıyor. Düşman seni görmeden sancak yerini belirle.'),
    $t('Kızgın kayalıkta her adım tehlikeli. Şifacılarını yanında tut.'),
    $t('Alev Köprüsü\'nün iki ucu da düşman elinde.'),
    $t('Bazalt Kule\'nin muhafızları zırhlı ve sabırlı.'),
    $t('PATRON — Kor Meydanı\'nda ateş dansçılarının komutanı seni bekliyor.'),
    $t('Ateş Boğazı: düşman alevlerle yolu kapatmış.'),
    $t('Cehennem Yolu\'nda bile ordunu geri çekme.'),
    $t('Kül fırtınasında düşmanın sesi bile boğuk geliyor.'),
    $t('Lav Gölü\'nün kıyısında Volkan Tahtı\'nın bekçileri toplandı.'),
    $t('PATRON — Volkan Tahtı\'nın ejderha binicisi gökten indi!'),
    $t('Bataklığın sisi her şeyi yutuyor. Ordun yönünü kaybetmesin.'),
    $t('Çürük Köprü\'nün her tahtası bir tuzak.'),
    $t('Ölü Orman\'da ağaçlar bile düşmanın safında gibi.'),
    $t('Mantar Vadisi\'nin ışıkları cezbedici ama tehlikeli.'),
    $t('PATRON — Karanlık Göl\'ün dev yaratığı sudan yükseldi.'),
    $t('Zehirli sazlıkta sessiz ilerlemek şart.'),
    $t('Hayalet Patikası\'nda gölge askerler beliriyor.'),
    $t('Çamur Kalesi\'nin surları yumuşak ama kapıları sağlam.'),
    $t('Kurbağa Tepesi\'nde düşman yüksek yerden atış yapıyor.'),
    $t('PATRON — Kasvet Ormanı\'nın cadısı yolunu kesti.'),
    $t('Ruhlar Çukuru\'nun başında kadim bir ordu uyanıyor.'),
    $t('Uğultu Vadisi\'nde sesler bile silah.'),
    $t('Kara Su\'yu geçmek için hızlı ve kararlı ol.'),
    $t('Son Bataklık\'ın ardında Gölge Tahtı var. Son çabaya hazır ol!'),
    $t('PATRON — Gölge Tahtı! Gölge Han yenildi sanıldı; ama yapraklar sararıyor, yeni bir sefer vakti geliyor.'),
    $t('Altın yapraklı ormanın girişi: her yaprak bir gözcü gibi. Sessizce ilerle.'),
    $t('Kehribar Vadisi\'nde reçine kokusu var; düşman süvarileri sisin içinden çıkıyor.'),
    $t('Palamut Tepesi\'nde yüksek yerden atış yapan okçular seni bekliyor.'),
    $t('Bakır Köprü paslı ama dayanıklı; iki yanından da saldırı gelebilir.'),
    $t('PATRON — Hasat Tahtı\'nın bekçisi orak gibi kıvrık kılıcıyla yolunu kesti.'),
    $t('Kızıl Meşelik\'te yapraklar yerde halı gibi; ayak sesleri duyulmuyor.'),
    $t('Mantar Çayırı\'nda şaşırtıcı bir ordu toplanmış. Aldanma.'),
    $t('Değirmen Yolu\'nu tutan birlik erzak hattını kesiyor. Yolu aç!'),
    $t('Kurt Pınarı\'nda sürüler susuzluktan çılgın. Dikkatli ol.'),
    $t('PATRON — Bal Kalesi\'nin kraliçesi arı sürüsü gibi bir orduyla geliyor.'),
    $t('Sisli Bağlar\'da üzüm asmaları arasında pusu var.'),
    $t('Çınar Meydanı\'nda büyük bir meydan muharebesi seni bekliyor.'),
    $t('Kuzgun Ambarı\'ndaki erzak düşmanın can damarı. Ele geçir.'),
    $t('Son Hasat: bu ormanın son savunma hattı.'),
    $t('PATRON — Sonbahar Tahtı\'nın hükümdarı yaprak fırtınası kopardı!'),
    $t('Gece çöktü. Ay Kapısı\'ndan geçince yıldızlar ordunun yol göstericisi olacak.'),
    $t('Yıldız Patikası dar ve dik; düşman tepeden bakıyor.'),
    $t('Gece Nöbeti: uyuyan bir ordu uyandı, sessiz davran.'),
    $t('Meteor Vadisi\'nde göktaşları yeri çukurlara çevirmiş. Siper çok.'),
    $t('PATRON — Işık Kulesi\'nin bekçisi gecenin tek ışığını koruyor.'),
    $t('Gümüş Göl\'ün yansımasında düşman iki kat görünüyor. Hedefini seç.'),
    $t('Kuyruklu Yıldız gökyüzünü yararken düşman saldırıya geçti.'),
    $t('Karanlık Surlar\'ın ardında gölgelerin son ordusu var.'),
    $t('Ay Tapınağı\'nın rahipleri seni sınamak istiyor.'),
    $t('PATRON — Gökyüzü Kalesi\'nin komutanı yıldızların arasından iniyor.'),
    $t('Tan Sökümü\'ne az kaldı; düşman son hamlesini yapıyor.'),
    $t('Yıldız Çukuru\'nun başında kadim bir güç uyanıyor.'),
    $t('Samanyolu Geçidi: tek geçit, tek şans.'),
    $t('Son Gece: sabaha kadar dayanırsan sefer biter.'),
    $t('PATRON — Vakit Tahtı! Tüm seferlerin sonu... ya da başı. Sefer vakti!')
  ];
  // Sefer kurallari: her sefere ozgu bir savas kosulu
  Z.RULES = {
    none:     { name: '', icon: '', desc: '' },
    rich:     { name: $t('Altın Damarı'),    icon: '💰', desc: $t('Altın kazancın %30 artar.') },
    swift:    { name: $t('Fırtına Rüzgârı'), icon: '🌪️', desc: $t('Tüm birlikler %25 daha hızlı yürür.') },
    heavy:    { name: $t('Zırhlı Ordu'),     icon: '🛡️', desc: $t('Düşman %20 daha dayanıklı. Ödüller %30 fazla.') },
    ambush:   { name: $t('Pusu'),            icon: '🗡️', desc: $t('Düşman kenar koridorlardan baskın yapar.') },
    famine:   { name: $t('Kıtlık'),          icon: '🌾', desc: $t('Altın kazancın %20 azalır, her düşman %50 fazla altın verir. Ödüller %30 fazla.') },
    rally:    { name: $t('Moral Çağrısı'),   icon: '📯', desc: $t('Dost birlikler saniyede %1 can yeniler.') },
    fortress: { name: $t('Kale Kuşatması'),  icon: '🏰', desc: $t('Düşman kalesi %40 daha sağlam. Kart bekleme süreleri %15 kısalır.') },
    survive:  { name: $t('Savunma Seferi'),  icon: '⏳', desc: $t('Kalen düşmeden süreyi doldur! Düşman kalesi yıkılamaz.') }
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
    commander: { icon: '👑', name: $t('Komutanı Yok Et'), desc: $t('Düşman komutanını öldür. Komutanın düşerse yenilirsin!') },
    capture:   { icon: '🚩', name: $t('Bayrakları Ele Geçir'), desc: $t('Orta alandaki 3 bayrağı tutarak 100 puana ulaş. Komutanın düşerse yenilirsin!') },
    survive:   { icon: '⏳', name: $t('Mevzii Tut'), desc: $t('Komutanını koruyarak süre dolana kadar dayan.') }
  };
  Z.fieldObjective = function (n, rules) {
    if (rules && rules.indexOf('survive') >= 0) return 'survive';
    return Math.floor(n / 5) % 2 === 1 ? 'capture' : 'commander';
  };
  Z.fieldBudget = function (n) { return 300 + 55 * n; }; // savas oncesi yerlestirme butcesi (komuta puani)
  // ---- Dusman guc carpani (bolum basina): kale ve acik alan icin AYRI, kalibre edilmis tablolar -------------
  // tests/calibrate.js ile uretilir; ara bolumler dogrusal aradeger. Z.SCALE_OVERRIDE yalnizca kalibrasyon icindir.
  Z.SCALE_OVERRIDE = null;
  Z.SCALE_KNOTS = {
    lane:  [[1, 1.0], [5, 1.2], [10, 1.5], [15, 1.85], [20, 2.05], [30, 2.17], [45, 2.17], [60, 2.17], [75, 2.17], [90, 2.17], [105, 2.17]],
    field: [[1, 1.0], [5, 1.15], [10, 1.5], [15, 1.8], [20, 2.0], [30, 2.44], [45, 2.45], [60, 3.0], [75, 3.6], [90, 4.2], [105, 4.46]]
  };

  Z.scaleFor = function (kind, n) {
    if (Z.SCALE_OVERRIDE && Z.SCALE_OVERRIDE[kind] && Z.SCALE_OVERRIDE[kind][n] !== undefined) return Z.SCALE_OVERRIDE[kind][n];
    var k = Z.SCALE_KNOTS[kind], i;
    if (n <= k[0][0]) return k[0][1];
    for (i = 1; i < k.length; i++) if (n <= k[i][0]) { var a = k[i - 1], b = k[i]; return a[1] + (b[1] - a[1]) * (n - a[0]) / (b[0] - a[0]); }
    return k[k.length - 1][1];
  };
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
      scale: Z.scaleFor('lane', n),
      fieldScale: Z.scaleFor('field', n),
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
  Z.DAILY_QUEST_COUNT = 4; Z.WEEKLY_QUEST_COUNT = 3;
  Z.QUEST_POOL = [
    { id: 'win2',    text: $t('2 savaş kazan'),                    stat: 'wins',       target: 2,   coins: 120, gems: 3 },
    { id: 'win4',    text: $t('4 savaş kazan'),                    stat: 'wins',       target: 4,   coins: 250, gems: 6 },
    { id: 'win6',    text: $t('6 savaş kazan'),                    stat: 'wins',       target: 6,   coins: 400, gems: 9 },
    { id: 'play3',   text: $t('3 savaş oyna (kazan ya da kaybet)'), stat: 'plays',     target: 3,   coins: 100, gems: 2 },
    { id: 'kill40',  text: $t('40 düşman yen'),                    stat: 'kills',      target: 40,  coins: 100, gems: 2 },
    { id: 'kill100', text: $t('100 düşman yen'),                   stat: 'kills',      target: 100, coins: 240, gems: 5 },
    { id: 'kill250', text: $t('250 düşman yen'),                   stat: 'kills',      target: 250, coins: 480, gems: 9 },
    { id: 'spawn30', text: $t('30 birlik çağır'),                  stat: 'spawns',     target: 30,  coins: 100, gems: 2 },
    { id: 'spawn80', text: $t('80 birlik çağır'),                  stat: 'spawns',     target: 80,  coins: 260, gems: 5 },
    { id: 'skill3',  text: $t('Kahraman yeteneğini 3 kez kullan'), stat: 'skills',     target: 3,   coins: 120, gems: 3 },
    { id: 'skill8',  text: $t('Kahraman yeteneğini 8 kez kullan'), stat: 'skills',     target: 8,   coins: 280, gems: 6 },
    { id: 'star3',   text: $t('Bir savaşı 3 yıldızla bitir'),      stat: 'threeStars', target: 1,   coins: 200, gems: 5 },
    { id: 'star3x2', text: $t('İki savaşı 3 yıldızla bitir'),      stat: 'threeStars', target: 2,   coins: 420, gems: 9 },
    { id: 'mine3',   text: $t('Savaşta madeni 3 kez yükselt'),     stat: 'mines',      target: 3,   coins: 100, gems: 2 },
    { id: 'mine8',   text: $t('Savaşta madeni 8 kez yükselt'),     stat: 'mines',      target: 8,   coins: 260, gems: 5 },
    { id: 'perk3',   text: $t('3 savaş ganimeti seç'),             stat: 'perks',      target: 3,   coins: 110, gems: 3 },
    { id: 'perk8',   text: $t('8 savaş ganimeti seç'),             stat: 'perks',      target: 8,   coins: 300, gems: 6 },
    { id: 'field1',  text: ($t('Bir açık alan savaşı kazan') + ' 🏕️'),     stat: 'fieldWins',  target: 1,   coins: 220, gems: 5 },
    { id: 'field2',  text: ($t('2 açık alan savaşı kazan') + ' 🏕️'),       stat: 'fieldWins',  target: 2,   coins: 460, gems: 9 },
    { id: 'castle1', text: ($t('Bir kale kuşatması kazan') + ' 🏰'),       stat: 'castleWins', target: 1,   coins: 200, gems: 4 },
    { id: 'castle2', text: ($t('2 kale kuşatması kazan') + ' 🏰'),         stat: 'castleWins', target: 2,   coins: 420, gems: 8 }
  ];
  // Haftalik gorevler (her pazartesi yenilenir): daha uzun hedefler, daha buyuk oduller
  Z.WEEKLY_POOL = [
    { id: 'w_wins15',   text: $t('Bu hafta 15 savaş kazan'),            stat: 'wins',       target: 15,  coins: 1500, gems: 25 },
    { id: 'w_kills600', text: $t('Bu hafta 600 düşman yen'),            stat: 'kills',      target: 600, coins: 1400, gems: 22 },
    { id: 'w_field6',   text: $t('Bu hafta 6 açık alan savaşı kazan'),  stat: 'fieldWins',  target: 6,   coins: 1600, gems: 28 },
    { id: 'w_castle6',  text: $t('Bu hafta 6 kale kuşatması kazan'),    stat: 'castleWins', target: 6,   coins: 1500, gems: 25 },
    { id: 'w_boss2',    text: $t('Bu hafta 2 patron seferi kazan'),     stat: 'bossWins',   target: 2,   coins: 1800, gems: 32 },
    { id: 'w_star3x5',  text: $t('Bu hafta 5 savaşı 3 yıldızla bitir'), stat: 'threeStars', target: 5,   coins: 1700, gems: 30 },
    { id: 'w_hard3',    text: $t('Bu hafta Zor/Efsane kademede 3 sefer kazan'), stat: 'hardWins', target: 3, coins: 2000, gems: 35 },
    { id: 'w_skill30',  text: $t('Bu hafta kahraman yeteneğini 30 kez kullan'), stat: 'skills', target: 30, coins: 1300, gems: 20 },
    { id: 'w_spawn400', text: $t('Bu hafta 400 birlik çağır'),          stat: 'spawns',     target: 400, coins: 1300, gems: 20 },
    { id: 'w_perk20',   text: $t('Bu hafta 20 savaş ganimeti seç'),     stat: 'perks',      target: 20,  coins: 1200, gems: 18 }
  ];

  // ---- Savas ganimeti (savas ici secilen guc) --------------------------
  Z.PERKS = {
    gold:   { name: $t('Zengin Maden'),    icon: '💰', desc: $t('Altın kazancı +%25.') },
    hp:     { name: $t('Çelik Zırh'),      icon: '🛡️', desc: $t('Tüm birliklerin canı +%15.') },
    dmg:    { name: $t('Keskin Kılıçlar'), icon: '⚔️', desc: $t('Tüm birliklerin hasarı +%15.') },
    cd:     { name: $t('Hızlı Çağrı'),     icon: '⏱️', desc: $t('Kart bekleme süreleri -%25.') },
    castle: { name: $t('Sur Onarımı'),     icon: '🏰', desc: $t('Kale canı +%15 ve %30 onarılır.') },
    tower:  { name: $t('Kale Okçuları'),   icon: '🏹', desc: $t('Kale okçularının hasarı 2 katı.') },
    regen:  { name: $t('Şifa Rüzgârı'),    icon: '🍃', desc: $t('Dost birlikler saniyede %1.5 can yeniler.') },
    loot:   { name: $t('Ganimet Sandığı'), icon: '🎁', desc: $t('Hemen +150 altın.') },
    skill:  { name: $t('Kahraman İlhamı'), icon: '✨', desc: $t('Kahraman yeteneği %30 daha hızlı dolar.') }
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
    { n: 70, coins: 1800, gems: 25 }, { n: 100, coins: 3000, gems: 40 }, { n: 130, coins: 5000, gems: 60 },
    { n: 160, coins: 6500, gems: 80 }, { n: 200, coins: 9000, gems: 110 }, { n: 250, coins: 14000, gems: 160 }, { n: 300, coins: 20000, gems: 250 }
  ];
  function maxUnit(d) { var m = 0; for (var k in d.unitLvl) if (d.unitLvl[k] > m) m = d.unitLvl[k]; return m; }
  Z.ACHIEVEMENTS = [
    { id: 'wins10',   text: $t('10 savaş kazan'),            target: 10,   gems: 5,  get: function (d) { return d.stats.wins; } },
    { id: 'wins50',   text: $t('50 savaş kazan'),            target: 50,   gems: 15, get: function (d) { return d.stats.wins; } },
    { id: 'kills200', text: $t('200 düşman yen'),            target: 200,  gems: 5,  get: function (d) { return d.stats.kills; } },
    { id: 'kills2k',  text: $t('2000 düşman yen'),           target: 2000, gems: 15, get: function (d) { return d.stats.kills; } },
    { id: 'lvl10',    text: $t('{n}. bölümü tamamla', { n: 10 }),        target: 10,   gems: 10, get: function (d) { return d.cleared; } },
    { id: 'lvl30',    text: $t('{n}. bölümü tamamla', { n: 30 }),        target: 30,   gems: 25, get: function (d) { return d.cleared; } },
    { id: 'lvl45',    text: $t('Seferhan Tahtı\'nı ele geçir (45)'), target: 45, gems: 50, get: function (d) { return d.cleared; } },
    { id: 'stars45',  text: $t('45 yıldız topla'),           target: 45,   gems: 10, get: function (d) { return d.stats.totalStars; } },
    { id: 'stars100', text: $t('100 yıldız topla'),          target: 100,  gems: 25, get: function (d) { return d.stats.totalStars; } },
    { id: 'end10',    text: $t('Sonsuz Kuşatma: 10. dalga'), target: 10,   gems: 8,  get: function (d) { return d.endlessBest; } },
    { id: 'end30',    text: $t('Sonsuz Kuşatma: 30. dalga'), target: 30,   gems: 20, get: function (d) { return d.endlessBest; } },
    { id: 'unit10',   text: $t('Bir birliği 10. seviyeye çıkar'), target: 10, gems: 10, get: maxUnit },
    { id: 'castle5',  text: $t('Kaleyi 5. seviyeye çıkar'),  target: 5,    gems: 8,  get: function (d) { return d.castleLvl; } },
    { id: 'treas5',   text: $t('Hazineyi 5. seviyeye çıkar'), target: 5,   gems: 8,  get: function (d) { return d.treasuryLvl; } },
    { id: 'heroes',   text: $t('Tüm kahramanları aç'),       target: 5,    gems: 20, get: function (d) { var n = 0; for (var k in d.heroOwned) if (d.heroOwned[k]) n++; return n; } },
    { id: 'combo15',  text: $t('15\'lik öldürme serisi yap'), target: 15,  gems: 6,  get: function (d) { return d.stats.maxCombo || 0; } },
    { id: 'perks20',  text: $t('20 savaş ganimeti seç'),     target: 20,   gems: 8,  get: function (d) { return d.stats.perks || 0; } },
    { id: 'spins10',  text: $t('Şans Çarkı\'nı 10 kez çevir'), target: 10, gems: 8,  get: function (d) { return d.stats.spins || 0; } },
    { id: 'lvl60',    text: $t('Volkan Tahtı\'nı ele geçir (60)'), target: 60, gems: 40, get: function (d) { return d.cleared; } },
    { id: 'lvl75',    text: $t('Gölge Tahtı\'nı ele geçir (75)'), target: 75, gems: 80, get: function (d) { return d.cleared; } },
    { id: 'lvl90',    text: $t('Sonbahar Tahtı\'nı ele geçir (90)'), target: 90, gems: 90, get: function (d) { return d.cleared; } },
    { id: 'lvl105',   text: $t('Vakit Tahtı\'nı ele geçir (105)'), target: 105, gems: 150, get: function (d) { return d.cleared; } },
    { id: 'stars200', text: $t('200 yıldız topla'),          target: 200,  gems: 40, get: function (d) { return d.stats.totalStars; } },
    { id: 'stars300', text: $t('300 yıldız topla'),          target: 300,  gems: 80, get: function (d) { return d.stats.totalStars; } },
    { id: 'field10',  text: $t('10 açık alan savaşı kazan'), target: 10,   gems: 15, get: function (d) { return d.stats.fieldWins || 0; } },
    { id: 'field50',  text: $t('50 açık alan savaşı kazan'), target: 50,   gems: 50, get: function (d) { return d.stats.fieldWins || 0; } },
    { id: 'castle10', text: $t('10 kale kuşatması kazan'),   target: 10,   gems: 15, get: function (d) { return d.stats.castleWins || 0; } },
    { id: 'castle50', text: $t('50 kale kuşatması kazan'),   target: 50,   gems: 50, get: function (d) { return d.stats.castleWins || 0; } },
    { id: 'boss10',   text: $t('10 patron seferi kazan'),    target: 10,   gems: 30, get: function (d) { return d.stats.bossWins || 0; } },
    { id: 'wins200',  text: $t('200 savaş kazan'),           target: 200,  gems: 60, get: function (d) { return d.stats.wins; } },
    { id: 'kills10k', text: $t('10000 düşman yen'),          target: 10000, gems: 50, get: function (d) { return d.stats.kills; } },
    { id: 'hard10',   text: $t('Zor kademede 10 sefer kazan'), target: 10, gems: 15, get: function (d) { return d.stats.hardWins || 0; } },
    { id: 'legend5',  text: $t('Efsane kademede 5 sefer kazan'), target: 5, gems: 25, get: function (d) { return d.stats.legendWins || 0; } },
    { id: 'daily7',   text: $t('7 Günlük Sefer kazan'),      target: 7,    gems: 15, get: function (d) { return d.stats.dailyWins || 0; } },
    { id: 'daily30',  text: $t('30 Günlük Sefer kazan'),     target: 30,   gems: 50, get: function (d) { return d.stats.dailyWins || 0; } },
    { id: 'market5',  text: $t('Pazar\'dan 5 kez alışveriş yap'), target: 5, gems: 5, get: function (d) { return d.stats.purchases || 0; } },
    { id: 'unit25',   text: $t('Bir birliği 25. seviyeye çıkar'), target: 25, gems: 25, get: maxUnit },
    { id: 'unit40',   text: $t('Bir birliği son seviyeye (40) çıkar'), target: 40, gems: 60, get: maxUnit }
  ];

  // ---- Zorluk kademeleri (tekrar oynanabilirlik) --------------------------
  Z.DIFFS = [
    { name: $t('Normal'), icon: '⚔️', hp: 1,    dmg: 1,    ai: 1,    base: 1,    coin: 1, gem: 0 },
    { name: $t('Zor'),    icon: '🔥', hp: 1.35, dmg: 1.2,  ai: 1.15, base: 1.45, coin: 2, gem: 5 },
    { name: $t('Efsane'), icon: '💀', hp: 1.8,  dmg: 1.45, ai: 1.3,  base: 1.9,  coin: 3, gem: 10 }
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
  // ---- Sefer hazirlik kartlari (tek kullanimlik, brifingte secilir) ----
  Z.BOOSTERS = {
    gold:   { id: 'gold',   icon: '💰', name: $t('Altın Hazırlığı'), desc: $t('Savaşa +150 altınla başla (açık alanda +120 komuta puanı).'), gems: 15 },
    skill:  { id: 'skill',  icon: '⚡', name: $t('Kahraman Hazır'),  desc: $t('Kahraman yeteneği savaşın başında hazır gelir.'), gems: 15 },
    shield: { id: 'shield', icon: '🛡️', name: $t('Sur Zırhı'),       desc: $t('Kale canı +%30 (açık alanda komutan canı +%50).'), gems: 20 }
  };
  Z.BOOSTER_ORDER = ['gold', 'skill', 'shield'];
  Z.BOOST_UNLOCK = 3;   // bu kadar bolum kazanilinca brifingte gorunur
  Z.BOOST_PACK = 3;     // Pazar'dan bir alimda kac kart
  // Oyuncunun bu bolumde ulasmasi beklenen ortalama birlik seviyesi (tests/progression.js olcumu); onerilen seviye bunun %90'i
  Z.expectedLevel = function (n) {
    var k = [[1, 2], [5, 5], [10, 8], [20, 12.5], [40, 18], [60, 21], [80, 23.4], [105, 25.5]], i;
    if (n <= 1) return 2;
    for (i = 1; i < k.length; i++) if (n <= k[i][0]) return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (n - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
    return 25.5;
  };
  Z.MARKET = [
    { id: 'coins',    icon: '👛', name: $t('Altın Kesesi'),       gems: 10, desc: function (d) { return '🪙 ' + (400 + 60 * d.cleared) + (' ' + $t('altın')); } },
    { id: 'chest',    icon: '🎁', name: $t('Büyük Sandık'),       gems: 40, desc: function (d) { return '🪙 ' + (3000 + 250 * d.cleared) + (' ' + $t('altın')); } },
    { id: 'treasury', icon: '💰', name: $t('Hazine Hızlandırma'), gems: 15, desc: function () { return $t('Hazine hemen 8 saatlik geliri biriktirir'); } },
    { id: 'spin',     icon: '🎡', name: $t('Bonus Çark Hakkı'),   gems: 10, desc: function () { return $t('Şans Çarkı\'nı bedava çevir'); } },
    { id: 'b_gold',   icon: '💰', name: $t('Altın Hazırlığı') + ' ×3', gems: 40, desc: function () { return Z.BOOSTERS.gold.desc; } },
    { id: 'b_skill',  icon: '⚡', name: $t('Kahraman Hazır') + ' ×3',  gems: 40, desc: function () { return Z.BOOSTERS.skill.desc; } },
    { id: 'b_shield', icon: '🛡️', name: $t('Sur Zırhı') + ' ×3',       gems: 55, desc: function () { return Z.BOOSTERS.shield.desc; } }
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
