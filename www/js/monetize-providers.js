// Sefer Vakti - gelir saglayicilari: (1) TEST saglayici (tarayicida akisi denemek icin), (2) YERLI saglayici (AdMob + Play Billing, eklentiler kuruluysa).
// Yerli saglayici koda dokunmadan eklenti yuklenince devreye girer; gercek cihazda dogrulanmalidir (docs/MONETIZATION.md).
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };
  var M = Z.Monetize;

  // ---------- TEST saglayici: sahte reklam ve sahte odeme penceresi ----------
  M.testProvider = function () {
    function overlay(html) {
      var el = document.createElement('div'); el.id = 'sim-overlay'; el.innerHTML = '<div class="sim-box">' + html + '</div>'; document.getElementById('stage').appendChild(el); return el;
    }
    return {
      ads: true, iap: true, test: true,
      showRewarded: function () { return new Promise(function (res) {
        var left = 3, el = overlay('<div class="sim-tag">TEST</div><h2>🎬 ' + $t('Reklam (test)') + '</h2><p id="sim-cd">' + left + '</p><button id="sim-close" class="btn gold hidden">' + $t('Ödülü al') + '</button><button id="sim-cancel" class="btn small">' + $t('Kapat') + '</button>');
        var t = setInterval(function () { left--; var cd = el.querySelector('#sim-cd'); if (cd) cd.textContent = left > 0 ? left : '✔'; if (left <= 0) { clearInterval(t); var b = el.querySelector('#sim-close'); if (b) b.classList.remove('hidden'); } }, 1000);
        el.addEventListener('click', function (e) { var id = e.target.id; if (id === 'sim-close') { clearInterval(t); el.remove(); res(true); } else if (id === 'sim-cancel') { clearInterval(t); el.remove(); res(false); } });
      }); },
      showInterstitial: function () { return new Promise(function (res) {
        var el = overlay('<div class="sim-tag">TEST</div><h2>📺 ' + $t('Geçiş reklamı (test)') + '</h2><button id="sim-close" class="btn small">' + $t('Kapat') + '</button>');
        el.addEventListener('click', function (e) { if (e.target.id === 'sim-close') { el.remove(); res(); } });
      }); },
      banner: function (show) { var b = document.getElementById('ad-banner'); if (b) { b.classList.toggle('hidden', !show); b.textContent = show ? 'TEST ' + $t('Banner reklam') : ''; } },
      products: function () { return Promise.resolve([]); },
      purchase: function (id) { return new Promise(function (res) {
        var p = M.product(id), el = overlay('<div class="sim-tag">TEST</div><h2>🛒 ' + $t('Satın alma (test)') + '</h2><p>' + id + '<br><b>' + (p ? p.price : '') + '</b></p><button id="sim-ok" class="btn gold">' + $t('Onayla') + '</button><button id="sim-cancel" class="btn small">' + $t('Vazgeç') + '</button>');
        el.addEventListener('click', function (e) { var i = e.target.id; if (i === 'sim-ok') { el.remove(); res({ ok: true, token: 'test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) }); } else if (i === 'sim-cancel') { el.remove(); res({ ok: false }); } });
      }); },
      restore: function () { return Promise.resolve([]); },
      privacyOptions: function () { return Promise.resolve(); }
    };
  };

  // ---------- YERLI saglayici: Capacitor AdMob + cordova-plugin-purchase (v13) ----------
  M.nativeProvider = function (AdMob, hasIap) {
    var c = (Z.MONEY && Z.MONEY.ads) || {};
    var TEST = { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712', banner: 'ca-app-pub-3940256099942544/6300978111' };
    var P = globalThis.Capacitor && globalThis.Capacitor.Plugins, AM = P && P.AdMob;
    function adId(kind) { return c.testMode ? TEST[kind] : c[kind + 'Id']; }
    var p = {};
    if (AM) {
      p.ads = true;
      p.init = function () { try { AM.initialize({ initializeForTesting: !!c.testMode }); } catch (e) { /* yok say */ } };
      p.showRewarded = function () { return new Promise(function (resolve) {
        var rewarded = false, hs = [];
        function off() { hs.forEach(function (h) { try { h.remove(); } catch (e) { /* bitti */ } }); }
        function on(ev, fn) { try { var r = AM.addListener(ev, fn); if (r && r.then) r.then(function (h) { hs.push(h); }); else if (r) hs.push(r); } catch (e) { /* yok say */ } }
        on('onRewardedVideoAdReward', function () { rewarded = true; });
        on('onRewardedVideoAdDismissed', function () { off(); resolve(rewarded); });
        on('onRewardedVideoAdFailedToLoad', function () { off(); resolve(false); });
        on('onRewardedVideoAdFailedToShow', function () { off(); resolve(false); });
        Promise.resolve(AM.prepareRewardVideoAd({ adId: adId('rewarded') })).then(function () { return AM.showRewardVideoAd(); }).catch(function () { off(); resolve(false); });
      }); };
      p.showInterstitial = function () { return new Promise(function (resolve) {
        var hs = [];
        function off() { hs.forEach(function (h) { try { h.remove(); } catch (e) { /* bitti */ } }); }
        function on(ev, fn) { try { var r = AM.addListener(ev, fn); if (r && r.then) r.then(function (h) { hs.push(h); }); } catch (e) { /* yok say */ } }
        on('onInterstitialAdDismissed', function () { off(); resolve(); }); on('onInterstitialAdFailedToLoad', function () { off(); resolve(); }); on('onInterstitialAdFailedToShow', function () { off(); resolve(); });
        Promise.resolve(AM.prepareInterstitial({ adId: adId('interstitial') })).then(function () { return AM.showInterstitial(); }).catch(function () { off(); resolve(); });
      }); };
      p.banner = function (show) {
        if (show) AM.showBanner({ adId: adId('banner'), adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 96 });
        else AM.hideBanner();
      };
      p.privacyOptions = function () { return Promise.resolve(AM.showPrivacyOptionsForm ? AM.showPrivacyOptionsForm() : null); };
    }
    if (hasIap && globalThis.CdvPurchase) {
      var CP = globalThis.CdvPurchase, store = CP.store, PT = CP.ProductType, PL = CP.Platform.GOOGLE_PLAY, pending = {}, ownedIds = [];
      p.iap = true;
      var prevInit = p.init;
      p.init = function (conf) {
        if (prevInit) prevInit();
        try {
          store.register(conf.products.map(function (x) { return { id: x.id, type: x.type === 'gems' ? PT.CONSUMABLE : PT.NON_CONSUMABLE, platform: PL }; }));
          store.when().approved(function (tx) { // NOT: sunucu tarafi makbuz dogrulamasi onerilir (docs/MONETIZATION.md)
            var id = tx.products && tx.products[0] && tx.products[0].id, w = pending[id];
            if (w) { delete pending[id]; w({ ok: true, token: tx.transactionId || tx.purchaseId }); } else if (id) ownedIds.push(id);
            tx.finish();
          });
          store.error(function () { Object.keys(pending).forEach(function (k) { pending[k]({ ok: false }); delete pending[k]; }); });
          store.initialize([PL]);
        } catch (e) { /* yok say */ }
      };
      p.products = function (ids) { return new Promise(function (resolve) {
        function read() { var out = []; ids.forEach(function (id) { try { var pr = store.get(id, PL); var off = pr && pr.getOffer && pr.getOffer(); var ph = off && off.pricingPhases && off.pricingPhases[0]; if (ph && ph.price) out.push({ id: id, price: ph.price }); } catch (e) { /* yok say */ } }); resolve(out); }
        try { store.ready(read); } catch (e) { resolve([]); }
      }); };
      p.purchase = function (id) { return new Promise(function (resolve) {
        try { var offer = store.get(id, PL).getOffer(); pending[id] = resolve; store.order(offer).then(function (err) { if (err && pending[id]) { delete pending[id]; resolve({ ok: false }); } }); setTimeout(function () { if (pending[id]) { delete pending[id]; resolve({ ok: false }); } }, 180000); } catch (e) { resolve({ ok: false }); }
      }); };
      p.restore = function () { return new Promise(function (resolve) { try { store.restorePurchases().then(function () { setTimeout(function () { var l = ownedIds.slice(); ownedIds = []; resolve(l); }, 1500); }); } catch (e) { resolve([]); } }); };
    }
    return p;
  };
})(globalThis.Z = globalThis.Z || {});
