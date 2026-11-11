// v0.13 bildirim sistemi testleri (Node, tarayici yok): node tests/unit-v13.js
// Hatirlatici plani (saat dilimi bagimsiz: yerel saat kurucusuyla), sessiz saat, izin akisi, planlama/iptal, tam zamanli alarm KULLANILMAZ.
const path = require('path'), fs = require('fs'), assert = require('assert');
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
['version', 'i18n', 'data', 'save', 'notify'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z, N = Z.Notify; let n = 0; const ok = (m) => { n++; console.log('  ✓', m); };
const L = (d, h, m) => new Date(2026, 10, d, h || 0, m || 0, 0, 0).getTime(); // yerel saat: 2026-11-<d> <h>:<m>
const HR = 3600000;
const data = (over) => Object.assign({ treasuryLast: 0, daily: { claimedToday: false }, cleared: 10 }, over || {});
const ids = (plan) => plan.map(p => p.kind).join(',');

// 1) Plan: sira, saatler, kimlikler
{ const now = L(12, 14, 0), p = N.plan(now, data({ treasuryLast: now - HR }));
  assert.strictEqual(ids(p), 'nudge,treasury,daily,back3,back7', 'sira: ' + ids(p));
  const by = {}; p.forEach(x => (by[x.kind] = x.at));
  assert.strictEqual(by.nudge, L(12, 19, 0), 'bugunku odul 19:00'); assert.strictEqual(by.treasury, now - HR + 8 * HR, 'hazine dolunca (14:00-1s+8s=21:00)');
  assert.strictEqual(by.daily, L(13, 10, 0), 'yarin 10:00'); assert.strictEqual(by.back3, L(15, 18, 30), '3 gun sonra 18:30'); assert.strictEqual(by.back7, L(19, 18, 30), '7 gun sonra 18:30');
  assert.strictEqual(new Set(p.map(x => x.id)).size, p.length, 'kimlikler benzersiz'); p.forEach(x => assert(x.at > now, 'gelecekte: ' + x.kind));
  assert(Object.values(N.IDS).every(v => v >= 7101 && v <= 7105), 'kimlik araligi');
  ok('Plan: bugünkü ödül 19:00, hazine dolunca, yarın 10:00, 3. ve 7. günde 18:30; sıralı ve kimlikler benzersiz'); }

// 2) Odul alindiysa yoklama yok; 19:00'a 90 dakikadan az kaldiysa da yok
{ const now = L(12, 14, 0); assert(!ids(N.plan(now, data({ daily: { claimedToday: true }, treasuryLast: now }))).includes('nudge'), 'alindi: yoklama yok');
  const late = L(12, 18, 0); assert(!ids(N.plan(late, data({ treasuryLast: late }))).includes('nudge'), '19:00 cok yakin'); ok('Günlük ödül alındıysa (ya da 19:00\'a 90 dk kala) yoklama bildirimi yok'); }

// 3) Sessiz saat 22:00-08:00 ve hazine zaten doluysa
{ const now = L(12, 16, 0), p = N.plan(now, data({ treasuryLast: now })); // dolma 24:00 -> ertesi gun 09:00
  assert.strictEqual(p.filter(x => x.kind === 'treasury')[0].at, L(13, 9, 0), 'gece yarisi dolum sabaha ertelenir');
  const n2 = L(12, 15, 30), p2 = N.plan(n2, data({ treasuryLast: n2 - 0.5 * HR })); // dolma 23:00 -> ertesi gun 09:00
  assert.strictEqual(p2.filter(x => x.kind === 'treasury')[0].at, L(13, 9, 0), '23:00 ertelenir');
  const full = N.plan(now, data({ treasuryLast: now - 9 * HR })); assert(!ids(full).includes('treasury'), 'hazine zaten dolu: bildirim yok');
  ok('Sessiz saat: 22:00-08:00 arasına denk gelen hazine bildirimi sabah 09:00\'a ertelenir; zaten dolu hazine için bildirim yok'); }

// 4) Metinler secili dilde; gunluk sefer cumlesi yalniz acildiysa
{ const a = N.text('daily', { cleared: Z.DAILY_UNLOCK }), b = N.text('daily', { cleared: 0 }); assert(/seferin/.test(a.body) && !/seferin/.test(b.body), 'gunluk sefer cumlesi bolum sartina bagli');
  ['treasury', 'nudge', 'back3', 'back7'].forEach(k => { const t = N.text(k, {}); assert(t.title && t.body && t.title.length <= 40 && t.body.length <= 120, k + ' metin uzunlugu'); });
  ['en', 'es', 'pt', 'ru', 'zh'].forEach(l => { require('../www/js/lang/' + l + '.js'); Z.lang = l; ['treasury', 'daily', 'nudge', 'back3', 'back7'].forEach(k => { const t = N.text(k, { cleared: 9 }); assert(t.title && t.body && t.title !== N.text.call(null, k, {}).title + 'x', l + ' ' + k); assert(!/[ğüşıöçĞÜŞİÖÇ]/.test(t.title + t.body) || l === 'tr', l + ' ceviri eksik: ' + k); }); }); Z.lang = 'tr';
  ok('Bildirim metinleri 6 dilde var (Türkçe karakter kalıntısı yok), uzunluklar uygun'); }

// 5) Eklenti yoksa her sey sessizce kapali; izin ve planlama akisi sahte eklentiyle
{ Z.Save.load(); assert(!N.available() && !N.enabled(), 'tarayicida kapali');
  Promise.resolve().then(() => N.onBackground()).then(c => { assert.strictEqual(c, 0, 'eklenti yok: planlama yok'); });
  const calls = []; let perm = 'prompt', granted = true;
  const mock = { checkPermissions: async () => ({ display: perm }), requestPermissions: async () => { calls.push('request'); perm = granted ? 'granted' : 'denied'; return { display: perm }; },
    createChannel: async (o) => { calls.push('channel:' + o.id); }, cancel: async (o) => { calls.push('cancel:' + o.notifications.length); }, schedule: async (o) => { calls.push('schedule'); mock.last = o; }, addListener: () => {} };
  globalThis.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: mock } };
  assert(N.available(), 'APK: eklenti var'); assert(!N.shouldAsk(), '3 galibiyet yok: sorma');
  Z.Save.data.stats.wins = 3; assert(N.shouldAsk(), '3. galibiyetten sonra sor');
  (async () => {
    granted = false; let r = await new Promise(res => N.enable(res)); assert.strictEqual(r, false, 'izin reddedildi'); assert(!N.enabled(), 'reddedilince acilmaz'); assert(calls.includes('request'), 'izin istendi');
    perm = 'prompt'; granted = true; calls.length = 0; r = await new Promise(res => N.enable(res)); assert.strictEqual(r, true, 'izin verildi'); assert(N.enabled(), 'acildi'); assert(Z.Save.data.settings.notify === true, 'ayar kaydedildi');
    assert(!N.shouldAsk(), 'acikken sorma');
    calls.length = 0; const c = await N.onBackground(); assert(c >= 4 && c <= 5, 'planlandi: ' + c); assert.deepStrictEqual(calls.filter(x => !x.startsWith('channel')), ['cancel:5', 'schedule'], 'once iptal sonra planla: ' + calls.join());
    mock.last.notifications.forEach(x => { assert.strictEqual(x.isExactNotification, false, 'tam zamanli alarm yok'); assert.strictEqual(x.isExactMandatory, false); assert(x.schedule.at instanceof Date && x.schedule.allowWhileIdle === true, 'yaklasik + uyku modunda calisir'); assert(x.smallIcon === 'ic_stat_castle' && x.channelId === 'reminders' && x.id >= 7101 && x.id <= 7105 && x.title && x.body, 'alanlar'); });
    calls.length = 0; await N.onForeground(); assert.deepStrictEqual(calls, ['cancel:5'], 'one gelince iptal');
    // hizli gidip-gelme (pause+resume): yavas schedule, sonraki iptali ezmemeli -> son islem hep iptal
    { const orig = mock.schedule; mock.schedule = async (o) => { await new Promise(r => setTimeout(r, 40)); calls.push('schedule'); mock.last = o; };
      calls.length = 0; const p1 = N.onBackground(), p2 = N.onForeground(); await Promise.all([p1, p2]);
      assert.strictEqual(calls.filter(x => !x.startsWith('channel')).pop(), 'cancel:5', 'yaris yok: son islem iptal: ' + calls.join());
      calls.length = 0; const q1 = N.onBackground(), q2 = N.disable(); await Promise.all([q1, q2]); Z.Save.data.settings.notify = true;
      assert.strictEqual(calls.filter(x => !x.startsWith('channel')).pop(), 'cancel:5', 'kapatma bekleyen planlamadan sonra iptal eder: ' + calls.join());
      mock.schedule = orig; }
    await N.disable(); assert(!N.enabled(), 'kapatildi'); calls.length = 0; assert.strictEqual(await N.onBackground(), 0, 'kapaliyken planlama yok'); assert(!calls.includes('schedule'));
    delete globalThis.Capacitor;
    ok('İzin akışı (verilmedi/verildi), arka planda iptal+planla, öne gelince iptal, kapalıyken planlama yok; tam zamanlı alarm istenmiyor');
    // 6) Manifest ve ikon: SCHEDULE_EXACT_ALARM kaldirildi, kucuk ikon 5 yogunlukta, ayar varsayilanlari
    const R = (...p) => path.join(__dirname, '..', ...p), man = fs.readFileSync(R('android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
    assert(/SCHEDULE_EXACT_ALARM"\s+tools:node="remove"/.test(man) && /xmlns:tools=/.test(man), 'SCHEDULE_EXACT_ALARM manifestten kaldirilir');
    ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].forEach(d => assert(fs.existsSync(R('android', 'app', 'src', 'main', 'res', 'drawable-' + d, 'ic_stat_castle.png')), 'bildirim ikonu ' + d));
    const cc = JSON.parse(fs.readFileSync(R('capacitor.config.json'), 'utf8')); assert.strictEqual(cc.plugins.LocalNotifications.smallIcon, 'ic_stat_castle');
    assert(JSON.parse(fs.readFileSync(R('package.json'), 'utf8')).dependencies['@capacitor/local-notifications'], 'eklenti kurulu');
    const s2 = Z.Save.load(); assert(s2.settings.notify === false && s2.settings.notifyAsked === false, 'varsayilan kapali, sorulmadi');
    ok('Manifest: SCHEDULE_EXACT_ALARM kaldırıldı; küçük bildirim ikonu 5 yoğunlukta; eklenti kurulu; varsayılan ayar kapalı');
    console.log(n + ' test geçti');
  })().catch(e => { console.error(e); process.exit(1); });
}
