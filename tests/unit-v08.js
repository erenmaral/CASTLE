// v0.8 mantik testleri: node tests/unit-v08.js  (dil altyapisi, gelir katmani: reklam/satin alma, ses ayarlari verisi)
const path = require('path'); const assert = require('assert');
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
['version', 'i18n', 'data', 'save', 'monetize-config', 'monetize', 'monetize-providers', 'sim', 'field'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z; let n = 0; const ok = (m) => { n++; console.log('  ✓', m); };
const S = Z.Save, M = Z.Monetize;
const run = (fn) => new Promise(res => fn(res));

(async () => {
  // 1) Dil altyapisi
  { assert(Z.lang === 'tr' && Z.t('Ordu') === 'Ordu', 'Node varsayilani Turkce'); assert(Z.LANGS.length === 6 && ['tr', 'en', 'es', 'pt', 'ru', 'zh'].every(id => Z.LANGS.some(l => l.id === id)), 'dil listesi');
    Z.PACK.en = { 'Ordu': 'Army', 'Sefer {n} seviyesinde': 'Campaign {n}' }; Z.lang = 'en';
    assert(Z.t('Ordu') === 'Army' && Z.t('  Ordu ') === '  Army ', 'bosluk korunur'); assert(Z.t('Sefer {n} seviyesinde', { n: 7 }) === 'Campaign 7', 'yer tutucu'); assert(Z.t('Bilinmeyen') === 'Bilinmeyen' && Z.i18nMissing['Bilinmeyen'], 'eksik anahtar Turkce kalir ve kaydedilir');
    Z.lang = 'xx'; assert(Z.t(' Ordu ') === '⟦Ordu⟧', 'sahte dil'); Z.lang = 'tr';
    ok('Dil altyapısı: 6 dil, çeviri/boşluk/yer tutucu, eksik anahtarda Türkçe yedek, sahte dil'); }
  // 2) Saglayici yokken: hicbir sey bedava degil
  { S.reset(); const d = S.data; assert(!M.adsOn() && !M.iapOn() && !M.canRewarded() && M.mode === 'off', 'varsayilan kapali');
    const g0 = d.gems; await run(cb => M.showRewarded('x', cb)).then(r => assert(r === false, 'odullu reklam saglayicisiz false')); await run(cb => M.purchase('sefervakti_gems_80', cb)).then(r => assert(r === null, 'satin alma saglayicisiz null'));
    assert(d.gems === g0, 'elmas degismemeli'); let done = false; M.maybeInterstitial(20, () => (done = true)); assert(done, 'gecis reklami yokken devam eder');
    ok('Sağlayıcı yokken reklam/ödeme kapalı: ödül ve elmas verilmez, akış takılmaz'); }
  // 3) Sahte saglayici ile akis
  { const calls = []; M.registerProvider({ ads: true, iap: true, init() {}, showRewarded(pl) { calls.push('r:' + pl); return Promise.resolve(true); }, showInterstitial() { calls.push('i'); return Promise.resolve(); }, banner(s) { calls.push('b:' + s); }, purchase(id) { calls.push('p:' + id); return Promise.resolve({ ok: true, token: 'tok-' + id + calls.length }); }, restore() { return Promise.resolve(['sefervakti_noads']); }, products() { return Promise.resolve([]); } });
    S.reset(); const d = S.data; assert(M.adsOn() && M.iapOn() && M.canRewarded(), 'saglayici takilinca acik');
    // odullu reklam ust siniri
    const cap = Z.MONEY.ads.rewardedPerDay; for (let i = 0; i < cap; i++) assert(await run(cb => M.showRewarded('s', cb)) === true, 'reklam ' + i); assert(M.rewardedLeft() === 0 && !M.canRewarded(), 'gunluk sinir'); assert(await run(cb => M.showRewarded('s', cb)) === false, 'sinirdan sonra reklam yok'); d.ads.day = '1999-01-01'; assert(M.canRewarded(), 'gun degisince yenilenir');
    const g = M.grantFreeReward('gems'); assert(g.gems === Z.MONEY.ads.rewardedGems, 'odullu elmas');
    // satin alma
    const g1 = d.gems; let r = await run(cb => M.purchase('sefervakti_gems_450', cb)); assert(r && r.gems === 450 && d.gems === g1 + 450, 'elmas paketi'); r = await run(cb => M.purchase('sefervakti_gems_450', cb)); assert(r && r.gems === 450, 'elmas paketi tekrar alinabilir (tuketilebilir)');
    r = await run(cb => M.purchase('sefervakti_starter', cb)); assert(r.coins === 5000 && d.iap.starter, 'baslangic paketi'); r = await run(cb => M.purchase('sefervakti_starter', cb)); assert(r === null, 'baslangic paketi tek sefer');
    assert(M.grant('sefervakti_starter', 'x') && M.grant('sefervakti_gems_80', 'same').gems === 80 && M.grant('sefervakti_gems_80', 'same').dup === true, 'ayni makbuz iki kez islenmez');
    ok('Satın alma: elmas paketleri tüketilebilir, başlangıç paketi tek seferlik, aynı makbuz tekrar işlenmez, reklam günlük sınırı'); }
  // 4) Gecis reklami kurallari + reklamsiz
  { const d = S.data; d.ads.battles = 0; d.ads.lastInter = 0; assert(!M.interstitialDue(20), 'ilk savasta yok'); for (let i = 0; i < Z.MONEY.ads.interstitialEvery; i++) M.noteBattleEnd();
    assert(M.interstitialDue(20) && !M.interstitialDue(Z.MONEY.ads.interstitialMinLevel - 1), 'her N savasta, erken bolumlerde asla yok');
    let shown = false; await run(cb => M.maybeInterstitial(20, () => { shown = true; cb(); })); assert(shown && d.ads.battles === 0, 'gosterilince sayac sifirlanir'); for (let i = 0; i < 5; i++) M.noteBattleEnd(); assert(!M.interstitialDue(20), 'min. sure dolmadan tekrar yok');
    d.ads.lastInter = 0; assert(M.interstitialDue(20), 'sure dolunca var'); const r = await run(cb => M.purchase('sefervakti_noads', cb)); assert(r.noAds && M.noAds() && !M.interstitialDue(20) && !M.bannerWanted(), 'reklamsiz paket gecis/banner kapatir'); assert(M.canRewarded(), 'odullu reklam reklamsizda da serbest');
    d.iap.noAds = false; const n2 = await run(cb => M.restore(cb)); assert(n2 === 1 && d.iap.noAds, 'geri yukleme tek seferlik urunu verir');
    ok('Geçiş reklamı: her 3 savaşta, 6. bölümden sonra, 3 dk arayla; reklamsız paket kapatır ve geri yüklenir'); }
  // 5) Kayit uyumlulugu
  { store['zafarion.save.v1'] = JSON.stringify({ v: 1, cleared: 12, coins: 9 }); S.load(); assert(S.data.iap && S.data.ads && S.data.settings.musicVol === 70 && S.data.settings.sfxVol === 100 && S.data.langChosen === false, 'eski kayit yukseltme'); ok('Eski kayıt: mağaza/reklam alanları ve ses düzeyi varsayılanları eklenir'); }
  console.log(n + ' test geçti');
})().catch(e => { console.error(e); process.exit(1); });
