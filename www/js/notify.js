// Castle Siege: History - yerel hatirlatici bildirimleri (Capacitor LocalNotifications). Sunucu yok: her sey cihazda planlanir.
// Akis: oyuncu Ayarlar'dan acar (Android 13+ izin penceresi) -> uygulama arka plana gidince gelecek hatirlaticilar planlanir -> geri donunce iptal edilir.
// Tur ve saatler: Hazine dolunca, ertesi sabah 10:00 gunluk odul/cark/sefer, bugunku odul alinmadiysa 19:00, 3 ve 7 gun gelmeyince 18:30.
// Sessiz saat 22:00-08:00. Tam zamanli alarm (SCHEDULE_EXACT_ALARM) KULLANILMAZ: Play ozel beyan ister, hatirlatici icin gerekmez.
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };
  var H = 3600000, MIN = 60000;
  var IDS = { treasury: 7101, daily: 7102, nudge: 7103, back3: 7104, back7: 7105 };
  var CHANNEL = 'reminders', SMALL_ICON = 'ic_stat_castle', ICON_COLOR = '#22409A';

  function atDay(base, dayOffset, hh, mm) { var d = new Date(base); d.setHours(hh, mm, 0, 0); d.setDate(d.getDate() + dayOffset); return d.getTime(); }
  // Sessiz saate (22:00-08:00) denk gelen zaman ertesi/ayni sabah 09:00'a alinir
  function quiet(ms) { var h = new Date(ms).getHours(); if (h >= 22) return atDay(ms, 1, 9, 0); if (h < 8) return atDay(ms, 0, 9, 0); return ms; }

  var N = Z.Notify = { IDS: IDS, CHANNEL: CHANNEL, SMALL_ICON: SMALL_ICON, ICON_COLOR: ICON_COLOR, ready: false };

  // ---- plan: saf fonksiyon (Node'da test edilir). now: ms, data: Z.Save.data -> [{id, kind, at}] (zamana gore sirali)
  N.plan = function (now, data) {
    var out = [], d = data || {}, daily = d.daily || {};
    var cap = (Z.TREASURY_CAP_H || 8) * H, full = (d.treasuryLast || now) + cap;
    if (full > now + 10 * MIN) out.push({ id: IDS.treasury, kind: 'treasury', at: quiet(full) });          // hazine dolunca (bos hazine zaten dolu degil)
    out.push({ id: IDS.daily, kind: 'daily', at: atDay(now, 1, 10, 0) });                                  // yarin 10:00: gunluk odul + bedava cark (+ gunluk sefer)
    if (!daily.claimedToday) { var t = atDay(now, 0, 19, 0); if (t - now > 90 * MIN) out.push({ id: IDS.nudge, kind: 'nudge', at: t }); } // bugunku odul alinmadi
    out.push({ id: IDS.back3, kind: 'back3', at: atDay(now, 3, 18, 30) });
    out.push({ id: IDS.back7, kind: 'back7', at: atDay(now, 7, 18, 30) });
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  };

  // ---- metinler (bildirim aninda secili dilde)
  N.text = function (kind, data) {
    var dailyOn = data && (data.cleared || 0) >= (Z.DAILY_UNLOCK || 5);
    switch (kind) {
      case 'treasury': return { title: $t('Hazine doldu!'), body: $t('Kampın birikmiş altınla dolu. Gel ve topla!') };
      case 'daily': return { title: $t('Yeni gün, yeni sefer'), body: dailyOn ? $t('Günlük ödülün, bedava şans çarkın ve günlük seferin hazır.') : $t('Günlük ödülün ve bedava şans çarkın hazır.') };
      case 'nudge': return { title: $t('Günlük ödülünü almadın'), body: $t('Serini bozma: bugünkü ödülün seni bekliyor.') };
      case 'back3': return { title: $t('Ordun seni bekliyor'), body: $t('Kuşatma yarım kaldı. Birliklerini topla ve seferine devam et!') };
      default: return { title: $t('Kampın sessiz, komutanım'), body: $t('Bir haftadır sefer yok. Yeni bir kuşatma için dönmeye ne dersin?') };
    }
  };

  // ---- eklenti: yalnizca APK'da (Capacitor yerel platform) vardir
  N.plugin = function () {
    var C = globalThis.Capacitor, P = C && C.Plugins, native = C && C.isNativePlatform && C.isNativePlatform();
    return (native && P && P.LocalNotifications) || null;
  };
  N.available = function () { return !!N.plugin(); };
  N.enabled = function () { var s = Z.Save && Z.Save.data && Z.Save.data.settings; return !!(s && s.notify); };
  function save() { if (Z.Save && Z.Save.save) Z.Save.save(); }
  function ids() { return Object.keys(IDS).map(function (k) { return { id: IDS[k] }; }); }

  function channel(P) {
    try { return Promise.resolve(P.createChannel({ id: CHANNEL, name: $t('Hatırlatıcılar'), description: $t('Hazine, günlük ödül ve sefer hatırlatmaları'), importance: 3, visibility: 1 })).catch(function () { /* kanal zaten var */ }); } catch (e) { return Promise.resolve(); }
  }
  N.cancelAll = function () { var P = N.plugin(); if (!P) return Promise.resolve(); try { return Promise.resolve(P.cancel({ notifications: ids() })).catch(function () { /* yok say */ }); } catch (e) { return Promise.resolve(); } };

  // Ayarlar'dan ac: izin iste (Android 13+), basariliysa ayari kaydet. cb(ok)
  N.enable = function (cb) {
    var P = N.plugin(); cb = cb || function () {};
    if (!P) return cb(false);
    var done = function (ok) { if (ok) { Z.Save.data.settings.notify = true; save(); channel(P); } cb(!!ok); };
    try {
      Promise.resolve(P.checkPermissions()).then(function (st) { return st && st.display === 'granted' ? st : P.requestPermissions(); })
        .then(function (st) { done(st && st.display === 'granted'); }, function () { done(false); });
    } catch (e) { done(false); }
  };
  N.disable = function () { if (Z.Save && Z.Save.data) { Z.Save.data.settings.notify = false; save(); } return N.cancelAll(); };

  // Arka plana gidince: eskileri iptal et, yenilerini planla
  N.onBackground = function () {
    var P = N.plugin(); if (!P || !N.enabled()) return Promise.resolve(0);
    var now = Date.now(), data = Z.Save.data, list = N.plan(now, data);
    var notes = list.map(function (p) {
      var t = N.text(p.kind, data);
      return { id: p.id, title: t.title, body: t.body, channelId: CHANNEL, smallIcon: SMALL_ICON, iconColor: ICON_COLOR, extra: { kind: p.kind },
        schedule: { at: new Date(p.at), allowWhileIdle: true }, isExactNotification: false, isExactMandatory: false };
    });
    return N.cancelAll().then(function () { return channel(P); }).then(function () { return P.schedule({ notifications: notes }); }).then(function () { return notes.length; }, function () { return 0; });
  };
  // Geri donunce: bekleyen hatirlaticilari iptal et (oyuncu zaten burada)
  N.onForeground = function () { return N.enabled() ? N.cancelAll() : Promise.resolve(); };

  // Bildirime dokunma: ilgili sekmeyi ac
  N.listen = function () {
    var P = N.plugin(); if (!P || N.ready) return; N.ready = true;
    try {
      P.addListener('localNotificationActionPerformed', function (ev) {
        var kind = ev && ev.notification && ev.notification.extra && ev.notification.extra.kind;
        if (Z.UI && Z.UI.showHub && Z.Game && !Z.Game.battle) Z.UI.showHub(kind === 'treasury' || kind === 'daily' || kind === 'nudge' ? 'vault' : 'map');
      });
    } catch (e) { /* yok say */ }
  };

  // Tek seferlik nazik soru: 3. galibiyetten sonra, bildirim kapaliysa ve hic sorulmadiysa
  N.shouldAsk = function () {
    var s = Z.Save && Z.Save.data; if (!s || !N.available() || N.enabled() || s.settings.notifyAsked) return false;
    return (s.stats && s.stats.wins || 0) >= 3;
  };
  N.ask = function () {
    var UI = Z.UI; if (!UI || !UI.modal || (UI.modalOpen && UI.modalOpen())) return false;
    Z.Save.data.settings.notifyAsked = true; save();
    UI.modal('<h1>' + $t('Hatırlatıcılar açılsın mı?') + '</h1><p>' + $t('Hazine dolduğunda ve günlük ödülün hazır olduğunda haber verelim. İstediğin zaman Ayarlar’dan kapatabilirsin.') + '</p><div class="actions"><button class="btn small" data-act="no">' + $t('Şimdi değil') + '</button><button class="btn gold" data-act="yes">' + $t('Aç') + '</button></div>', {
      no: UI.closeModal,
      yes: function () { UI.closeModal(); N.enable(function (ok) { if (UI.toast) UI.toast(ok ? $t('Hatırlatıcılar açıldı') : $t('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.')); }); }
    });
    return true;
  };
})(globalThis.Z = globalThis.Z || {});
