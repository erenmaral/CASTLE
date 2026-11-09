// Sefer Vakti - oyun verileri (birlikler, kahramanlar, bolumler, gorevler)
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };

  // Oyunun adi dile gore degisir (Turkce kaynak: Kale Kusatmasi: Tarih; Ingilizce: Castle Siege: History)
  Object.defineProperty(Z, 'NAME', { get: function () { return $t('Kale Kuşatması: Tarih'); }, configurable: true });

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
  Z.REALMS = [$t('Batı Avrupa'), $t('Kutsal Topraklar'), $t('Kuzey Seferleri'), $t('Akdeniz'), $t('Alçak Ülkeler'), $t('Asya'), $t('Anadolu ve Balkanlar')];
  Z.realmOf = function (n) { return Math.min(Z.REALMS.length - 1, Math.floor((n - 1) / 15)); };
  // Her bolum GERCEK bir tarihi kale/sehir kusatmasidir (ad + yil). Her 5. bolum (patron) diyarin en unlu kusatmasi.
  Z.LEVEL_NAMES = [
    $t('Rochester 1215'), $t('Dover 1216'), $t('Harfleur 1415'), $t('Calais 1347'),
    $t('Orléans 1429'), $t('Caen 1346'), $t('Carcassonne 1209'), $t('Montségur 1244'),
    $t('Bamburgh 1464'), $t('Stirling 1304'), $t('Edinburgh 1314'), $t('Kenilworth 1266'),
    $t('Rouen 1419'), $t('Mont-Saint-Michel 1424'), $t('Château Gaillard 1204'), $t('Antakya 1098'),
    $t('Sur 1124'), $t('Urfa 1144'), $t('Şam 1148'), $t('Kudüs 1187'),
    $t('Kerak 1183'), $t('Belvoir 1189'), $t('Masada 73'), $t('Safed 1266'),
    $t('Krak 1271'), $t('Montfort 1271'), $t('Trablus 1289'), $t('Aşkelon 1153'),
    $t('Kudüs 1099'), $t('Akka 1291'), $t('Rezan 1237'), $t('Vladimir 1238'),
    $t('Kozelsk 1238'), $t('Kiev 1240'), $t('Kazan 1552'), $t('Pskov 1581'),
    $t('Smolensk 1611'), $t('Malbork 1410'), $t('Narva 1558'), $t('Nöteborg 1702'),
    $t('Vyborg 1710'), $t('Riga 1710'), $t('Poltava 1709'), $t('Fredriksten 1718'),
    $t('Stralsund 1628'), $t('Syrakusa MÖ 212'), $t('Kartaca MÖ 146'), $t('Numantia MÖ 133'),
    $t('Roma 537'), $t('Malta 1565'), $t('Rodos 1480'), $t('Mağusa 1571'),
    $t('Otranto 1480'), $t('Kandiye 1669'), $t('Granada 1492'), $t('Cebelitarık 1779'),
    $t('Napoli 536'), $t('Palermo 1072'), $t('Lefkoşa 1570'), $t('Rodos 1522'),
    $t('Haarlem 1573'), $t('Alkmaar 1573'), $t('Leiden 1574'), $t('Brielle 1572'),
    $t('Anvers 1585'), $t('Ostende 1604'), $t('Sluis 1604'), $t('Maastricht 1673'),
    $t('Den Bosch 1629'), $t('Breda 1625'), $t('Breda 1590'), $t('Lille 1708'),
    $t('Tournai 1709'), $t('Mons 1691'), $t('Namur 1692'), $t('Xiangyang 1273'),
    $t('Diaoyu 1259'), $t('Kaifeng 1233'), $t('Buhara 1220'), $t('Bağdat 1258'),
    $t('Alamut 1256'), $t('Urgenç 1221'), $t('Osaka 1615'), $t('Odawara 1590'),
    $t('Jinju 1592'), $t('Nagashino 1575'), $t('Takamatsu 1582'), $t('Hara 1638'),
    $t('Çitor 1568'), $t('Port Arthur 1904'), $t('İznik 1331'), $t('Bursa 1326'),
    $t('Selanik 1430'), $t('Belgrad 1456'), $t('Konstantinopolis 1204'), $t('Kefe 1475'),
    $t('Akkerman 1484'), $t('Belgrad 1521'), $t('Bağdat 1638'), $t('Zigetvar 1566'),
    $t('Eğri 1552'), $t('Estergon 1543'), $t('Revan 1635'), $t('Viyana 1683'),
    $t('İstanbul 1453')
  ];
  // Her bolumun kisa tarih notu (gercek olay)
  Z.STORIES = [
    $t('Kral John, Rochester Şatosu\'nun kulesini tünelle çökertti; tünel domuz yağıyla yakıldı.'),
    $t('Fransız prensi Louis, Dover Şatosu\'nu kuşattı; komutan Hubert de Burgh teslim etmedi.'),
    $t('V. Henry, Agincourt seferine Harfleur\'u topla kuşatarak başladı; kent beş haftada düştü.'),
    $t('III. Edward Calais\'yi on bir ay abluka altında tuttu; kent açlıktan teslim oldu.'),
    $t('Jeanne d\'Arc\'ın yardım ordusu, aylarca süren Orléans kuşatmasını Mayıs 1429\'da kırdı.'),
    $t('III. Edward Caen\'ı hücumla aldı; kent günlerce yağmalandı.'),
    $t('Albigens Haçlı Seferi\'nde Carcassonne, susuzluk yüzünden iki haftada teslim oldu.'),
    $t('Kayalık tepedeki Montségur, aylar süren kuşatmadan sonra 1244\'te teslim oldu.'),
    $t('Güller Savaşı\'nda Bamburgh, barutlu toplarla dövülen ilk İngiliz şatosu oldu.'),
    $t('I. Edward, "Warwolf" adlı dev mancınıkla Stirling Şatosu\'nu teslim aldı.'),
    $t('Thomas Randolph\'un adamları geceleyin uçurumu tırmanıp Edinburgh Şatosu\'nu geri aldı.'),
    $t('Kenilworth Şatosu altı ay kuşatıldı; İngiltere\'nin en uzun şato kuşatmalarından biri.'),
    $t('V. Henry Rouen\'i altı ay çevirdi; açlık kenti teslime zorladı.'),
    $t('İngilizler yıllarca Mont-Saint-Michel\'i kuşattı; kaya ve deniz kaleyi korudu.'),
    $t('Philippe Auguste, Richard\'ın Seine kıyısındaki Château Gaillard\'ını altı ayda aldı.'),
    $t('Haçlılar Antakya\'yı sekiz ay kuşattı; bir hainin açtığı kuleden kente girdiler.'),
    $t('Venedikli ve Haçlı güçler, Sur\'u (Tyre) denizden ve karadan aylarca kuşatıp aldı.'),
    $t('Zengî, Urfa\'yı (Edessa) aldı; bu olay İkinci Haçlı Seferi\'ni başlattı.'),
    $t('İkinci Haçlı Seferi Şam\'ı dört gün kuşattı ve başarısız çekildi.'),
    $t('Selahaddin, iki haftalık kuşatmanın ardından Kudüs\'ü 2 Ekim 1187\'de teslim aldı.'),
    $t('Selahaddin, Kerak Kalesi\'ni bir düğün sırasında kuşattı ama alamadı.'),
    $t('Hospitalier şövalyeler Belvoir Kalesi\'ni Selahaddin\'e karşı uzun süre savundu.'),
    $t('Romalılar, Masada kayalığına yığma bir rampa yaparak kaleyi aldı.'),
    $t('Baybars, Safed Kalesi\'ni kuşatıp Tapınak Şövalyelerinden aldı.'),
    $t('Baybars, Hospitalierlerin Krak des Chevaliers Kalesi\'ni bir ayda aldı.'),
    $t('Baybars, Cermen şövalyelerinin dağ kalesi Montfort\'u kuşatıp aldı.'),
    $t('Memlûk Sultanı Kalavun, Trablus\'u bir ay kuşatıp aldı.'),
    $t('III. Baudouin Aşkelon\'u yedi ay kuşatıp aldı.'),
    $t('Haçlılar, iki kuşatma kulesiyle Kudüs surlarını aştı.'),
    $t('Memlûk ordusu Akka\'yı aldı; Haçlıların Kutsal Topraklar\'daki son büyük kalesi düştü.'),
    $t('Batu Han\'ın Moğolları Rezan\'ı altı günde aldı.'),
    $t('Moğollar, Vladimir\'in surlarını kırıp kenti kış ortasında aldı.'),
    $t('Kozelsk yedi hafta direndi; Moğollar ona "kötü şehir" adını verdi.'),
    $t('Batu Han\'ın orduları Kiev\'i kuşatıp surları dövdü.'),
    $t('IV. İvan, Kazan Kalesi\'nin surlarının altına barut madenleri döşeyip patlattı.'),
    $t('Báthory\'nin ordusu Pskov\'u kuşattı; kent teslim olmadı, kuşatma kaldırıldı.'),
    $t('Polonya ordusu Smolensk\'i yaklaşık yirmi ay kuşatıp aldı.'),
    $t('Grunwald\'dan sonra Polonya-Litvanya orduları Malbork\'u kuşattı; Töton şövalyeleri direndi.'),
    $t('IV. İvan\'ın topçusu Narva Kalesi\'ni 1558\'de dövüp aldı.'),
    $t('Büyük Petro, İsveç\'in Nöteborg Kalesi\'ni aldı ve adını "Anahtar Kale" koydu.'),
    $t('Büyük Petro, Vyborg Kalesi\'ni kuşatıp aldı.'),
    $t('Rus ordusu Riga\'yı kuşattı; kent veba ve kuşatma yüzünden teslim oldu.'),
    $t('XII. Karl Poltava Kalesi\'ni kuşattı; kuşatma ünlü muharebeyle son buldu.'),
    $t('XII. Karl, Fredriksten Kalesi\'ni kuşatırken siperde vurularak öldü.'),
    $t('Wallenstein Stralsund\'u kuşattı ama kenti alamadı.'),
    $t('Arşimet\'in makineleri Syrakusa\'yı aylarca Roma\'dan korudu.'),
    $t('Roma, Kartaca\'yı üç yıl kuşatıp yıktı.'),
    $t('Scipio, Numantia\'yı surlarla çevirdi; kent açlıktan teslim oldu.'),
    $t('Belisarius, Ostrogotların Roma kuşatmasına bir yıl dayandı.'),
    $t('Osmanlı donanması Sen Elmo Kalesi\'ni aldı ama Malta\'yı alamadı.'),
    $t('Mesih Paşa Rodos\'u kuşattı; Hospitalierlerin direnişiyle başarısız oldu.'),
    $t('Osmanlı ordusu Mağusa Kalesi\'ni uzun bir kuşatmanın ardından aldı.'),
    $t('Gedik Ahmed Paşa Otranto\'yu hücumla aldı.'),
    $t('Girit\'teki Kandiye kuşatması 21 yıl sürdü; Osmanlı 1669\'da kenti aldı.'),
    $t('Katolik Krallar Granada\'yı kuşattı; Endülüs\'ün son kalesi Ocak 1492\'de teslim oldu.'),
    $t('İspanyol-Fransız güçleri Cebelitarık\'ı dört yıl kuşattı; İngiliz garnizonu direndi.'),
    $t('Belisarius\'un askerleri Napoli\'ye su kemerinden sızıp kenti aldı.'),
    $t('Normanlar, Robert Guiscard komutasında Palermo\'yu kuşatıp aldı.'),
    $t('Osmanlı ordusu Lefkoşa\'yı kuşatıp hücumla aldı.'),
    $t('Kanuni, Rodos\'u beş ay kuşatıp Hospitalierlerden aldı.'),
    $t('Haarlem yedi ay kuşatıldı; İspanyol ordusu kenti açlıkla aldı.'),
    $t('Alkmaar, diklerin açılıp ovaya su salınmasıyla kuşatmadan kurtuldu.'),
    $t('Setler yıkılıp ova sular altında kalınca Leiden kuşatmadan kurtuldu.'),
    $t('Su Dilencileri Brielle\'yi aldı; Hollanda isyanı bu zaferle büyüdü.'),
    $t('Parma Dükü Şelde Nehri\'ne köprü kurup Anvers\'i kuşatarak aldı.'),
    $t('Ostende kuşatması üç yıl sürdü; İspanyollar yıkıntılar içindeki kenti aldı.'),
    $t('Prens Maurits, Sluis\'u kuşatıp aldı.'),
    $t('Vauban, Maastricht\'te paralel siperler yöntemini uyguladı.'),
    $t('Frederik Hendrik, sulak araziyi kurutarak \'s-Hertogenbosch\'u kuşatıp aldı.'),
    $t('Spinola Breda\'yı on ay kuşattı; Velázquez bu teslimi "Mızraklar" tablosunda resmetti.'),
    $t('Bir turba gemisine gizlenen askerler Breda Kalesi\'ne sızıp kenti aldı.'),
    $t('Marlborough ve Savoyalı Eugene, Lille\'in surlarını aylarca kuşatıp aldı.'),
    $t('Marlborough, Tournai\'yi kuşattı; kentin kalesi eylülde düştü.'),
    $t('XIV. Louis, Mons\'u kuşatıp aldı.'),
    $t('XIV. Louis ve Vauban, Namur Kalesi\'ni kuşatıp aldı.'),
    $t('Moğollar, Xiangyang\'ı beş yıl kuşattı; kent dev mancınıklarla düştü.'),
    $t('Möngke Han, Diaoyu Kalesi\'ni kuşatırken öldü; kale direndi.'),
    $t('Moğollar Kaifeng\'i kuşattı; savunucular barutlu bombalar kullandı.'),
    $t('Cengiz Han Buhara\'yı aldı; kale birkaç gün daha direndi.'),
    $t('Hülagü, Bağdat\'ı on iki günlük kuşatmayla aldı.'),
    $t('Hülagü, dağ kalesi Alamut\'u teslim aldı.'),
    $t('Moğollar Urgenç\'i aylarca süren sokak çatışmalarıyla aldı.'),
    $t('Tokugawa Ieyasu, Osaka Kalesi\'ni iki kuşatmada aldı.'),
    $t('Hideyoshi, Odawara Kalesi\'ni çok kalabalık bir orduyla kuşattı.'),
    $t('Kim Si-min Jinju Kalesi\'ni savundu ve Japon ordusunu geri püskürttü.'),
    $t('Takeda ordusu Nagashino Kalesi\'ni kuşattı; yardım ordusu kuşatmayı bozdu.'),
    $t('Hideyoshi, Takamatsu Kalesi\'ni nehri çevirip sel basarak kuşattı.'),
    $t('Şimabara İsyanı, Hara Kalesi\'nin kuşatmasıyla bastırıldı.'),
    $t('Ekber, Çitorgarh Kalesi\'ni surun altına kazdığı madenle aldı.'),
    $t('Japon ordusu Port Arthur Kalesi\'ni aylarca kuşatıp aldı.'),
    $t('Orhan Bey, uzun bir ablukadan sonra İznik\'i aldı.'),
    $t('Orhan Bey, Bursa\'yı abluka altına alıp teslim aldı.'),
    $t('II. Murad Selanik\'i kuşatıp hücumla aldı.'),
    $t('Hunyadi János, Fatih\'in Belgrad kuşatmasını bozdu.'),
    $t('Haçlılar ve Venedik, Konstantinopolis\'i denizden ve karadan aldı.'),
    $t('Gedik Ahmed Paşa Kefe\'yi kuşatıp aldı.'),
    $t('II. Bayezid Akkerman Kalesi\'ni kuşatıp aldı.'),
    $t('Kanuni Belgrad\'ı kuşatıp aldı.'),
    $t('IV. Murad Bağdat\'ı kuşatıp aldı.'),
    $t('Kanuni Zigetvar kuşatması sırasında öldü; kale yine de düştü.'),
    $t('Eğri Kalesi, Dobó István komutasında Osmanlı kuşatmasına direndi.'),
    $t('Kanuni Estergon Kalesi\'ni kuşatıp aldı.'),
    $t('IV. Murad Revan Kalesi\'ni kuşatıp aldı.'),
    $t('Kara Mustafa Paşa Viyana\'yı kuşattı; yardım ordusu kuşatmayı bozdu.'),
    $t('Fatih Sultan Mehmed, İstanbul\'u yaklaşık elli üç günlük kuşatmayla aldı.')
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
    fortress: { name: $t('Sağlam Surlar'),   icon: '🏰', desc: $t('Düşman kalesi %40 daha sağlam. Kart bekleme süreleri %15 kısalır.') },
    survive:  { name: $t('Abluka'),          icon: '⏳', desc: $t('Kaleye saldıramazsın: kampını koruyarak süre dolana kadar dayan, kale açlıktan teslim olur.') },
    moat:     { name: $t('Hendek'),          icon: '🌊', desc: $t('Kalenin önündeki hendek yakın dövüşçüleri %35 yavaşlatır. Okçular ve mancınıklar etkilenmez.') },
    relief:   { name: $t('Yardım Ordusu'),   icon: '🐎', desc: $t('Kuşatma uzarsa kaleye yardım ordusu gelir: her koridora ağır bir düşman dalgası iner. Kaleyi önce düşür!') }
  };
  // Kale kusatmasi ve kale onu muharebesi kendi dongulerini izler (hendek / yardim ordusu yalniz kale kusatmasinda)
  var LANE_CYCLE = ['moat', 'survive', 'relief', 'heavy', 'ambush', 'rich', 'fortress', 'famine'];
  var FIELD_CYCLE = ['rich', 'survive', 'swift', 'heavy', 'ambush', 'rally', 'famine', 'fortress'];
  Z.ruleOf = function (n) {
    if (n <= 2 || n % 5 === 0) return 'none'; // ilk iki bolum ve patronlar kuralsiz
    var type = Z.levelType(n), k = 0; for (var i = 3; i < n; i++) if (i % 5 !== 0 && Z.levelType(i) === type) k++;
    var cyc = type === 'field' ? FIELD_CYCLE : LANE_CYCLE;
    return cyc[k % cyc.length];
  };
  Z.isBoss = function (n) { return n % 5 === 0; };
  // Savas turu: 3,4,8,9,13,14... ACIK ALAN (serbest yerlestirme, komutan, arazi); digerleri KALE KUSATMASI
  Z.levelType = function (n) { var m = n % 5; return (m === 3 || m === 4) ? 'field' : 'castle'; };
  Z.FIELD_OBJECTIVES = {
    commander: { icon: '👑', name: $t('Garnizon Komutanını Yok Et'), desc: $t('Kale garnizonunun komutanını öldür. Komutanın düşerse yenilirsin!') },
    capture:   { icon: '🚩', name: $t('Mevzileri Ele Geçir'), desc: $t('Kale önündeki 3 mevziyi (bayrak) tutarak 100 puana ulaş. Komutanın düşerse yenilirsin!') },
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
    { id: 'field1',  text: ($t('Bir kale önü muharebesi kazan') + ' 🏕️'),     stat: 'fieldWins',  target: 1,   coins: 220, gems: 5 },
    { id: 'field2',  text: ($t('2 kale önü muharebesi kazan') + ' 🏕️'),       stat: 'fieldWins',  target: 2,   coins: 460, gems: 9 },
    { id: 'castle1', text: ($t('Bir kale kuşatması kazan') + ' 🏰'),       stat: 'castleWins', target: 1,   coins: 200, gems: 4 },
    { id: 'castle2', text: ($t('2 kale kuşatması kazan') + ' 🏰'),         stat: 'castleWins', target: 2,   coins: 420, gems: 8 }
  ];
  // Haftalik gorevler (her pazartesi yenilenir): daha uzun hedefler, daha buyuk oduller
  Z.WEEKLY_POOL = [
    { id: 'w_wins15',   text: $t('Bu hafta 15 savaş kazan'),            stat: 'wins',       target: 15,  coins: 1500, gems: 25 },
    { id: 'w_kills600', text: $t('Bu hafta 600 düşman yen'),            stat: 'kills',      target: 600, coins: 1400, gems: 22 },
    { id: 'w_field6',   text: $t('Bu hafta 6 kale önü muharebesi kazan'),  stat: 'fieldWins',  target: 6,   coins: 1600, gems: 28 },
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
    castle: { name: $t('Kamp Onarımı'),    icon: '🏕️', desc: $t('Kamp canı +%15 ve %30 onarılır.') },
    tower:  { name: $t('Nöbetçi Okçular'), icon: '🏹', desc: $t('Kamp nöbetçilerinin okları 2 kat hasar verir.') },
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
    { id: 'castle5',  text: $t('Kampı 5. seviyeye çıkar'),  target: 5,    gems: 8,  get: function (d) { return d.castleLvl; } },
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
    { id: 'field10',  text: $t('10 kale önü muharebesi kazan'), target: 10,   gems: 15, get: function (d) { return d.stats.fieldWins || 0; } },
    { id: 'field50',  text: $t('50 kale önü muharebesi kazan'), target: 50,   gems: 50, get: function (d) { return d.stats.fieldWins || 0; } },
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
    gold:   { id: 'gold',   icon: '💰', name: $t('Altın Hazırlığı'), desc: $t('Savaşa +150 altınla başla (kale önü muharebesinde +120 komuta puanı).'), gems: 15 },
    skill:  { id: 'skill',  icon: '⚡', name: $t('Kahraman Hazır'),  desc: $t('Kahraman yeteneği savaşın başında hazır gelir.'), gems: 15 },
    shield: { id: 'shield', icon: '🛡️', name: $t('Kamp Çiti'),       desc: $t('Kamp canı +%30 (kale önü muharebesinde komutan canı +%50).'), gems: 20 }
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
    { id: 'b_shield', icon: '🛡️', name: $t('Kamp Çiti') + ' ×3',       gems: 55, desc: function () { return Z.BOOSTERS.shield.desc; } }
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
