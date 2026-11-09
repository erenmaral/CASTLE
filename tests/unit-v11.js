// v0.11 Play Store hazirlik testleri: node tests/unit-v11.js  (paket adi tutarliligi, magaza metin sinirlari, gizlilik sayfasi, reklam/faturalandirma ayarlari)
const path = require('path'), fs = require('fs'), assert = require('assert'), cp = require('child_process');
const R = (...p) => path.join(__dirname, '..', ...p), read = (...p) => fs.readFileSync(R(...p), 'utf8');
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
['version', 'i18n', 'data', 'save', 'monetize-config', 'monetize'].forEach(f => require(R('www', 'js', f + '.js')));
const Z = globalThis.Z; let n = 0; const ok = (m) => { n++; console.log('  ✓', m); };
const PKG = 'io.github.erenmaral.castlesiege';

// 1) Paket adi her yerde ayni; eski ad kalmadi; Java paketi dizinle uyumlu
{ assert.strictEqual(JSON.parse(read('capacitor.config.json')).appId, PKG);
  const g = read('android', 'app', 'build.gradle'); assert(g.includes('namespace = "' + PKG + '"') && g.includes('applicationId "' + PKG + '"'), 'gradle');
  const j = read('android', 'app', 'src', 'main', 'java', ...PKG.split('.'), 'MainActivity.java'); assert(j.startsWith('package ' + PKG + ';'), 'MainActivity paketi');
  assert(!fs.existsSync(R('android', 'app', 'src', 'main', 'java', 'com')), 'eski java dizini yok');
  assert(!/zafarion\.game/.test(read('android', 'app', 'src', 'main', 'res', 'values', 'strings.xml')), 'strings.xml eski ad');
  assert(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(PKG), 'gecerli paket adi bicimi');
  ok('Paket adı ' + PKG + ' (capacitor, gradle, MainActivity, strings) tutarlı'); }

// 2) Manifest: yalniz gerekli izinler, AdMob kimligi yer tutucu, yedekleme kurallari, acik http yok
{ const m = read('android', 'app', 'src', 'main', 'AndroidManifest.xml');
  assert(m.includes('com.google.android.gms.ads.APPLICATION_ID') && m.includes('${admobAppId}'), 'AdMob app id yer tutucusu');
  assert(m.includes('usesCleartextTraffic="false"') && m.includes('data_extraction_rules') && m.includes('backup_rules'), 'guvenlik/yedek');
  const perms = (m.match(/uses-permission android:name="([^"]+)"/g) || []); assert(perms.length === 1 && /INTERNET/.test(perms[0]), 'tek izin: INTERNET ' + perms.join());
  ['data_extraction_rules.xml', 'backup_rules.xml'].forEach(f => assert(fs.existsSync(R('android', 'app', 'src', 'main', 'res', 'xml', f)), f));
  assert(/ZAFARION_VERSION_CODE/.test(read('android', 'app', 'build.gradle')) && /language\s*\{\s*enableSplit = false/.test(read('android', 'app', 'build.gradle')), 'surum kodu + dil bolunmesi kapali');
  const pj = JSON.parse(read('package.json')).dependencies; assert(pj['@capacitor-community/admob'] && pj['cordova-plugin-purchase'], 'AdMob ve Faturalandirma eklentileri kurulu');
  ok('Manifest: tek izin INTERNET (faturalandırma/reklam izinlerini eklentiler ekler), AdMob kimliği yer tutucu, yedek kuralları, sürüm kodu, eklentiler'); }

// 3) Magaza girisi: Play sinirlari (baslik 30, kisa 80, tam 4000) ve her yerel icin dosyalar; baslik oyun adiyla ayni
{ const root = R('store', 'metadata', 'android'), locs = fs.readdirSync(root); ['en-US', 'tr-TR', 'es-ES', 'es-419', 'pt-BR', 'ru-RU', 'zh-CN'].forEach(l => assert(locs.includes(l), 'yerel yok ' + l));
  const nameOf = { 'en-US': 'en', 'tr-TR': 'tr', 'es-ES': 'es', 'es-419': 'es', 'pt-BR': 'pt', 'ru-RU': 'ru', 'zh-CN': 'zh' };
  locs.forEach(l => { const t = read('store', 'metadata', 'android', l, 'title.txt').trim(), s = read('store', 'metadata', 'android', l, 'short_description.txt').trim(), f = read('store', 'metadata', 'android', l, 'full_description.txt').trim();
    assert(t.length <= 30 && s.length <= 80 && f.length <= 4000 && t && s && f.length > 300, l + ' sinirlar ' + t.length + '/' + s.length + '/' + f.length);
    const lang = nameOf[l]; if (lang !== 'tr') require(R('www', 'js', 'lang', lang + '.js'));
    Z.lang = lang; assert.strictEqual(t, Z.NAME, l + ' baslik oyun adiyla ayni: ' + t + ' / ' + Z.NAME); Z.lang = 'tr'; });
  ok('Mağaza girişi ' + locs.length + ' yerel için başlık ≤30, kısa ≤80, tam ≤4000; başlık oyun içi adla aynı'); }

// 4) Gizlilik sayfasi ve baglantilar
{ const h = read('www', 'privacy.html'); ['AdMob', 'Google Play', 'io.github.erenmaral.castlesiege', 'terms-en', 'terms-tr'].forEach(k => assert(h.includes(k), 'gizlilik: ' + k));
  assert(/class="tr"/.test(h) && /class="en"/.test(h), 'iki dil');
  const L = Z.MONEY.links; assert(/^https:\/\/.+\/privacy\.html$/.test(L.privacy) && /privacy\.html#terms$/.test(L.terms) && /^https:\/\//.test(L.support), 'baglantilar dolu');
  assert(Z.MONEY.allowTestMode === false, 'yayinda test modu kapali');
  ok('Gizlilik politikası + şartlar sayfası (tr/en) hazır, uygulama içi bağlantılar dolu, test modu kapalı'); }

// 5) Reklam eklentisi baglayici: v8 olay adlari dogru (gecis reklami kilitlenmesin) + onay (UMP) akisi
{ const s = read('www', 'js', 'monetize-providers.js');
  ['interstitialAdDismissed', 'interstitialAdFailedToLoad', 'interstitialAdFailedToShow', 'onRewardedVideoAdReward', 'onRewardedVideoAdDismissed', 'requestConsentInfo', 'showConsentForm', 'showPrivacyOptionsForm'].forEach(k => assert(s.includes(k), 'olay/yontem: ' + k));
  assert(!/onInterstitialAdDismissed/.test(s), 'eski (yanlis) olay adi yok');
  // eklentinin kendi tanimlariyla dogrula (kuruluysa)
  const ev = R('node_modules', '@capacitor-community', 'admob', 'dist', 'esm', 'interstitial', 'interstitial-ad-plugin-events.enum.d.ts');
  if (fs.existsSync(ev)) { const d = fs.readFileSync(ev, 'utf8'); ['interstitialAdDismissed', 'interstitialAdFailedToLoad', 'interstitialAdFailedToShow'].forEach(k => assert(d.includes(k), 'eklentide yok: ' + k)); }
  ok('AdMob bağlayıcı: geçiş reklamı olay adları eklentiyle uyumlu, UMP onay formu + gizlilik seçenekleri bağlı'); }

// 6) CI reklam kimligi betigi: eksikse test modu + uyari, tam ise testMode=false yazilir (dosyayi bozmadan)
{ const tmp = R('www', 'js', 'monetize-config.js'), orig = fs.readFileSync(tmp, 'utf8');
  try {
    let out = cp.execFileSync('node', [R('scripts', 'play-config.js')], { env: { PATH: process.env.PATH }, encoding: 'utf8' }); assert(/TEST modu/.test(out) && /::warning::/.test(out), 'eksik kimlik uyarisi'); assert.strictEqual(fs.readFileSync(tmp, 'utf8'), orig, 'dosya degismedi');
    out = cp.execFileSync('node', [R('scripts', 'play-config.js')], { env: { PATH: process.env.PATH, ADMOB_APP_ID: 'ca-app-pub-1234567890123456~1234567890', ADMOB_REWARDED_ID: 'ca-app-pub-1234567890123456/1111111111', ADMOB_INTERSTITIAL_ID: 'ca-app-pub-1234567890123456/2222222222', ADMOB_BANNER_ID: 'ca-app-pub-1234567890123456/3333333333' }, encoding: 'utf8' });
    const s = fs.readFileSync(tmp, 'utf8'); assert(/testMode:\s*false/.test(s) && s.includes("rewardedId: 'ca-app-pub-1234567890123456/1111111111'") && s.includes("bannerId: 'ca-app-pub-1234567890123456/3333333333'"), 'kimlikler yazildi');
  } finally { fs.writeFileSync(tmp, orig); }
  ok('CI betiği: kimlik eksikse Google TEST modu + uyarı; tam ise gerçek kimlikler ve testMode=false'); }
console.log(n + ' test geçti');
