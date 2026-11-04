// Sefer Vakti - gelir katmani: odullu/gecis/banner reklam + uygulama ici satin alma. Saglayici (AdMob/Play Billing) takilabilir.
// Saglayici yoksa: reklam/odeme DEVRE DISI, hicbir sey bedava verilmez. Test modu: localStorage 'sv.monetize'='test' ya da ?monetize=test
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };
  var M = Z.Monetize = { provider: null, mode: 'off', priceCache: {}, busy: false };
  function cfg() { return Z.MONEY || { ads: {}, products: [], links: {} }; }
  function save() { return Z.Save; }
  function today() { return save().today(); }

  // ---- durum ----
  M.product = function (id) { return cfg().products.filter(function (p) { return p.id === id; })[0]; };
  M.adsOn = function () { return !!(M.provider && M.provider.ads && cfg().ads.enabled !== false); };
  M.iapOn = function () { return !!(M.provider && M.provider.iap); };
  M.noAds = function () { return !!save().data.iap.noAds; };
  M.price = function (p) { return M.priceCache[p.id] || p.price || ''; };
  function adState() { var a = save().data.ads; if (a.day !== today()) { a.day = today(); a.rewarded = 0; } return a; }
  M.rewardedLeft = function () { return Math.max(0, (cfg().ads.rewardedPerDay || 0) - adState().rewarded); };
  M.canRewarded = function () { return M.adsOn() && M.rewardedLeft() > 0 && !M.busy; };

  // ---- saglayici secimi ----
  M.detect = function () {
    var test = false;
    try { test = (typeof localStorage !== 'undefined' && localStorage.getItem('sv.monetize') === 'test') || (typeof location !== 'undefined' && /[?&]monetize=test/.test(location.search)); } catch (e) { /* engelli */ }
    if (test && M.testProvider) { M.provider = M.testProvider(); M.mode = 'test'; }
    else {
      var P = globalThis.Capacitor && globalThis.Capacitor.Plugins, hasAd = P && P.AdMob, hasIap = globalThis.CdvPurchase;
      if ((hasAd || hasIap) && M.nativeProvider) { M.provider = M.nativeProvider(hasAd, hasIap); M.mode = 'live'; }
    }
    if (M.provider && M.provider.init) { try { M.provider.init(cfg()); } catch (e) { /* saglayici hatasi oyunu durdurmasin */ } }
    if (M.provider && M.provider.products) M.provider.products(cfg().products.map(function (p) { return p.id; })).then(function (list) { (list || []).forEach(function (x) { if (x && x.id && x.price) M.priceCache[x.id] = x.price; }); }, function () { /* yedek fiyat */ });
    return M.mode;
  };
  // Elle saglayici takmak icin (ornegin kendi SDK'nizi): Z.Monetize.registerProvider({ ads:true, iap:true, showRewarded(){}, ... })
  M.registerProvider = function (p) { M.provider = p; M.mode = 'live'; if (p.init) p.init(cfg()); };

  // ---- odullu reklam ----
  // cb(ok): ok=true ise kullanici reklami sonuna kadar izledi
  M.showRewarded = function (placement, cb) {
    if (!M.canRewarded()) { cb(false); return; }
    M.busy = true;
    var done = function (ok) { M.busy = false; if (ok) { var a = adState(); a.rewarded++; save().data.stats.adsWatched = (save().data.stats.adsWatched || 0) + 1; save().save(); } cb(!!ok); };
    try { M.provider.showRewarded(placement).then(done, function () { done(false); }); } catch (e) { done(false); }
  };
  M.grantFreeReward = function (kind) { // 'gems' | 'coins'
    var d = save().data, c = cfg().ads;
    if (kind === 'gems') { d.gems += c.rewardedGems; return { gems: c.rewardedGems }; }
    d.coins += c.rewardedCoins; return { coins: c.rewardedCoins };
  };

  // ---- gecis reklami (savas arasi) ----
  M.noteBattleEnd = function () { adState(); save().data.ads.battles++; save().save(); };
  M.interstitialDue = function (level) {
    var a = adState(), c = cfg().ads;
    if (!M.adsOn() || M.noAds() || !M.provider.showInterstitial) return false;
    if (level < (c.interstitialMinLevel || 0)) return false;
    if (a.battles < (c.interstitialEvery || 3)) return false;
    return Date.now() - (a.lastInter || 0) >= (c.interstitialMinGapSec || 0) * 1000;
  };
  M.maybeInterstitial = function (level, done) { // her zaman done() cagirir
    if (!M.interstitialDue(level)) { done(); return; }
    var a = save().data.ads; a.battles = 0; a.lastInter = Date.now(); save().save();
    try { M.provider.showInterstitial().then(function () { done(); }, function () { done(); }); } catch (e) { done(); }
  };
  M.bannerWanted = function () { return M.adsOn() && !M.noAds() && !!M.provider.banner; };
  M.setBanner = function (show) { if (M.provider && M.provider.banner) { try { M.provider.banner(show && M.bannerWanted()); } catch (e) { /* yok say */ } } };

  // ---- satin alma ----
  M.grant = function (id, token) { // urunu oyuncuya ver (idempotent: tek seferlikler tekrar verilmez)
    var d = save().data, p = M.product(id); if (!p) return null;
    if (token && d.iap.tokens.indexOf(token) >= 0) return { dup: true };
    var out = { id: id, gems: 0, coins: 0 };
    if (p.type === 'gems') { d.gems += p.gems; out.gems = p.gems; }
    else if (p.type === 'starter') { if (d.iap.starter) return { dup: true }; d.iap.starter = true; d.gems += p.gems; d.coins += p.coins; out.gems = p.gems; out.coins = p.coins; }
    else if (p.type === 'noads') { if (d.iap.noAds) return { dup: true }; d.iap.noAds = true; out.noAds = true; M.setBanner(false); }
    if (token) { d.iap.tokens.push(token); if (d.iap.tokens.length > 200) d.iap.tokens.shift(); }
    d.stats.purchases = d.stats.purchases || 0; d.stats.iapCount = (d.stats.iapCount || 0) + 1; save().save();
    return out;
  };
  M.owned = function (p) { var d = save().data; return (p.type === 'starter' && d.iap.starter) || (p.type === 'noads' && d.iap.noAds); };
  M.purchase = function (id, cb) {
    var p = M.product(id); if (!p || !M.iapOn() || M.busy || M.owned(p)) { cb(null); return; }
    M.busy = true;
    var fin = function (res) { M.busy = false; if (res && res.ok) cb(M.grant(id, res.token || ('t' + Date.now() + Math.random()))); else cb(null); };
    try { M.provider.purchase(id).then(fin, function () { fin(null); }); } catch (e) { fin(null); }
  };
  M.restore = function (cb) { // tek seferlik urunleri geri yukle
    if (!M.iapOn() || !M.provider.restore) { cb(0); return; }
    M.provider.restore().then(function (ids) { var n = 0; (ids || []).forEach(function (id) { var p = M.product(id); if (p && p.type !== 'gems' && !M.owned(p)) { M.grant(id, null); n++; } }); cb(n); }, function () { cb(0); });
  };
  M.privacyOptions = function (cb) { if (M.provider && M.provider.privacyOptions) M.provider.privacyOptions().then(function () { cb(true); }, function () { cb(false); }); else cb(false); };
})(globalThis.Z = globalThis.Z || {});
