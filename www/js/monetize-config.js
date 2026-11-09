// Sefer Vakti - GELIR AYARLARI (reklam + elmas satin alma). Oyun sahibi burayi doldurur. Ayrintilar: docs/MONETIZATION.md
// Bu dosyada bir sey degistirmezseniz oyunda gercek reklam/odeme CALISMAZ ve kimse bedava elmas alamaz (guvenli varsayilan).
globalThis.Z = globalThis.Z || {};
Z.MONEY = {
  // ---- REKLAM (Google AdMob; Capacitor eklentisi: @capacitor-community/admob) ----
  ads: {
    enabled: true,
    testMode: true,              // YAYINDAN ONCE false yapin. true iken Google'in TEST reklam kimlikleri kullanilir.
    rewardedId: '',              // Odullu video reklam birimi:  ca-app-pub-XXXX/YYYY
    interstitialId: '',          // Gecis (tam ekran) reklam birimi
    bannerId: '',                // Banner reklam birimi
    // (AdMob uygulama kimligi android/app/src/main/AndroidManifest.xml icine yazilir, bkz. docs/MONETIZATION.md)
    rewardedPerDay: 8,           // gunde en fazla kac odullu reklam
    rewardedGems: 3,             // bir odullu reklamin verdigi elmas
    rewardedCoins: 250,          // ... ya da altin (mağazada iki ayri dugme)
    doubleWinReward: true,       // zafer sonunda "odulu x2 yap (reklam izle)" dugmesi
    interstitialEvery: 3,        // her kac savasta bir gecis reklami (reklamsiz paketi alanlara gosterilmez)
    interstitialMinLevel: 6,     // bu bolumden once hic gecis reklami yok (yeni oyuncuyu kacirmayin)
    interstitialMinGapSec: 180   // iki gecis reklami arasi en az sure
  },
  // ---- UYGULAMA ICI SATIN ALMA (Google Play Faturalandirma) ----
  // id: Play Console'da olusturacaginiz urun kimligi ile AYNI olmali. price: magaza fiyat veremezse gosterilen yedek metin.
  products: [
    { id: 'sefervakti_gems_80',   type: 'gems',    gems: 80,   price: '$0.99',  badge: '' },
    { id: 'sefervakti_gems_450',  type: 'gems',    gems: 450,  price: '$4.99',  badge: '+12%' },
    { id: 'sefervakti_gems_1000', type: 'gems',    gems: 1000, price: '$9.99',  badge: '+25%' },
    { id: 'sefervakti_gems_2200', type: 'gems',    gems: 2200, price: '$19.99', badge: '+37%' },
    { id: 'sefervakti_gems_6000', type: 'gems',    gems: 6000, price: '$49.99', badge: '+50%' },
    { id: 'sefervakti_starter',   type: 'starter', gems: 300,  coins: 5000, price: '$1.99' },   // tek seferlik baslangic paketi
    { id: 'sefervakti_noads',     type: 'noads',   price: '$3.99' }                              // reklamlari kaldirir (odullu reklam serbest kalir)
  ],
  // Test modunu (sahte reklam/odeme) YAYIN surumunde denemek isterseniz gecici olarak true yapin ve adrese ?monetize=test ekleyin. Yayinlamadan once false birakin!
  allowTestMode: false,
  links: { privacy: '', terms: '', support: '' }   // Gizlilik politikasi / sartlar / destek adresleri (Play Store icin zorunlu)
};
