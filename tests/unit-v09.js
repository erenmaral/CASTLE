// v0.9 mantik testleri: node tests/unit-v09.js  (hazirlik kartlari, onerilen seviye, olcek tablosu, dengeleme tutarliligi)
const path = require('path'); const assert = require('assert');
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
['version', 'i18n', 'data', 'save', 'monetize-config', 'monetize', 'monetize-providers', 'sim', 'field'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z, S = Z.Save; let n = 0; const ok = (m) => { n++; console.log('  ✓', m); };
const mkSave = () => { const sv = { unitLvl: {}, heroLvl: { aslan: 1, yildiz: 1 }, castleLvl: 1 }; Z.UNIT_ORDER.forEach(u => (sv.unitLvl[u] = 1)); return sv; };

// 1) Olcek tablosu: kale ve acik alan icin ayri, tek yonlu artan, ilk bolum 1.0
{ ['lane', 'field'].forEach(k => { let prev = 0; for (let L = 1; L <= Z.MAX_LEVEL; L++) { const s = Z.scaleFor(k, L); assert(Number.isFinite(s) && s >= 1 && s >= prev - 1e-9 && s < 8, k + ' olcek bozuk: ' + L + ' ' + s); prev = s; } });
  assert(Z.scaleFor('lane', 1) === 1 && Z.levelInfo(50).scale === Z.scaleFor('lane', 50) && Z.levelInfo(50).fieldScale === Z.scaleFor('field', 50), 'levelInfo olcekleri');
  Z.SCALE_OVERRIDE = { lane: { 7: 9.5 } }; assert(Z.scaleFor('lane', 7) === 9.5 && Z.scaleFor('lane', 8) !== 9.5, 'kalibrasyon override'); Z.SCALE_OVERRIDE = null;
  ok('Düşman ölçeği: kale/açık alan ayrı tablolar, 1.0 ile başlar, azalmaz, kalibrasyon override çalışır'); }
// 2) Beklenen seviye egirisi
{ let prev = 0; for (let L = 1; L <= Z.MAX_LEVEL; L++) { const e = Z.expectedLevel(L); assert(e >= prev && e <= Z.MAX_UNIT_LVL, 'beklenen seviye ' + L); prev = e; } assert(Math.round(Z.expectedLevel(10)) === 8 && Z.expectedLevel(105) < 27, 'bilinen noktalar'); ok('Beklenen birlik seviyesi eğrisi artan ve ulaşılabilir (105. bölümde ≈25)'); }
// 3) Hazirlik kartlari: kale savasi
{ const sv = mkSave(); const b = new Z.Battle({ mode: 'campaign', level: 6, save: sv, deck: ['spear'], hero: 'aslan', seed: 3 }); const g0 = b.gold, h0 = b.base[0].max;
  b.applyBoosters(['gold', 'skill', 'shield']); assert(b.gold === g0 + 150 && b.heroCd === 0 && Math.abs(b.base[0].max - h0 * 1.3) < 1e-6 && Math.abs(b.base[0].hp - h0 * 1.3) < 1e-6 && b.boosters.length === 3, 'kale: uc kart');
  const c = new Z.Battle({ mode: 'campaign', level: 6, save: sv, deck: ['spear'], hero: 'aslan', seed: 3 }); c.applyBoosters([]); assert(c.gold === g0 && c.heroCd > 0, 'kartsiz degisiklik yok'); ok('Hazırlık kartları (kale): +150 altın, hazır yetenek, sur +%30'); }
// 4) Hazirlik kartlari: acik alan
{ const sv = mkSave(); const f = new Z.FieldBattle({ level: 8, save: sv, deck: ['spear'], hero: 'aslan', seed: 3 }); const g0 = f.gold, b0 = f.budget0, h0 = f.cmdP.max;
  f.applyBoosters(['gold', 'skill', 'shield']); assert(f.gold === g0 + 120 && f.budget0 === b0 + 120 && f.heroCd === 0 && Math.abs(f.cmdP.max - h0 * 1.5) < 1e-6, 'acik alan kartlari'); ok('Hazırlık kartları (açık alan): +120 komuta puanı, hazır yetenek, komutan +%50'); }
// 5) Envanter: varsayilan 1'er, Pazar'dan 3'lu paket, zafer sandigi dususu (deterministik rng)
{ S.reset(); const d = S.data; assert(d.boost.gold === 1 && d.boost.skill === 1 && d.boost.shield === 1, 'baslangic 1er kart'); d.gems = 200; const r = S.buyMarket('b_shield'); assert(r && d.boost.shield === 1 + Z.BOOST_PACK && d.gems === 200 - 55, 'pazar 3lu paket'); assert(S.buyMarket('b_gold') && d.boost.gold === 4, 'altin karti');
  d.gems = 1; assert(S.buyMarket('b_skill') === null && d.boost.skill === 1, 'elmas yetmezse alinmaz');
  let drops = 0; for (let i = 0; i < 60; i++) { const b = new Z.Battle({ mode: 'campaign', level: 6, save: mkSave(), deck: ['spear'], hero: 'aslan', seed: 100 + i }); b.finish(true); const before = Object.values(d.boost).reduce((a, c) => a + c, 0); const out = Z.settleBattle(b, S); if (out.booster) { drops++; assert(Object.values(d.boost).reduce((a, c) => a + c, 0) === before + 1, 'dusen kart envantere eklenmeli'); } }
  assert(drops >= 8 && drops <= 40, 'dusme orani makul: ' + drops + '/60'); ok('Envanter: 1\'er başlangıç kartı, Pazar\'dan 3\'lü paket (elmas yetmezse alınmaz), zafer sandığından kart düşer (' + drops + '/60)'); }
// 6) Eski kayit: envanter eklenir
{ store['zafarion.save.v1'] = JSON.stringify({ v: 1, cleared: 9, coins: 5 }); S.load(); assert(S.data.boost && S.data.boost.gold === 1, 'eski kayit yukseltme'); ok('Eski kayıt yüklenince hazırlık kartı envanteri eklenir'); }
// 7) Hata taramasi duzeltmeleri (kod incelemesi bulgulari)
{ S.reset(); const d = S.data; const q = d.quests.list[0], def = S.questDef(q.id); S.track(def.stat, 0); assert(d.quests.list[0].prog === 0, 'track(stat, 0) ilerleme sayilmamali'); S.track(def.stat); assert(d.quests.list[0].prog === 1, 'track(stat) 1 sayar'); ok('Görev sayacı: 0 olay ilerleme saymaz (savaş sonu sahte görev ilerlemesi düzeltildi)'); }
{ S.reset(); const d = S.data; d.daily.claimedToday = true; d.wheel.used = true; d.dailySefer.won = true; const RD = Date; let off = 26 * 3600 * 1000;
  globalThis.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } };
  S.rollDay(); globalThis.Date = RD; assert(d.daily.claimedToday === false && d.wheel.used === false && d.dailySefer.won === false, 'gece yarisi asilinca yenilenmeli'); ok('rollDay yeniden çağrılınca (oturum gece yarısını aşsa da) günlük ödül/çark/sefer yenilenir'); }
{ S.reset(); const d = S.data; d.quests.list = [{ id: 'silinmis_gorev', prog: 0, claimed: false }]; d.weekly.list = [{ id: 'w_yok', prog: 0, claimed: false }]; S.rollDay(); assert(d.quests.list.every(q => S.questDef(q.id)) && d.weekly.list.length === Z.WEEKLY_QUEST_COUNT && d.weekly.list.every(q => S.questDef(q.id)), 'bilinmeyen gorev kimligi yeniden secilmeli'); ok('Bilinmeyen (silinmiş) görev kimlikleri yeniden seçilir, ekranı bozmaz'); }
{ const KEY = 'zafarion.save.v1'; store[KEY] = '{bozuk json'; S.load(); assert(store[KEY + '.bak'] === '{bozuk json' && S.data.coins === 150, 'okunamayan kayit yedeklenmeli'); delete store[KEY + '.bak']; ok('Okunamayan kayıt silinmeden önce .bak olarak yedeklenir'); }
{ const M = Z.Monetize; store['sv.monetize'] = 'test'; const b0 = Z.BUILD; Z.BUILD = '42'; M.provider = null; M.mode = 'off'; Z.MONEY.allowTestMode = false; M.detect(); assert(M.mode === 'off' && !M.iapOn(), 'yayin surumunde test saglayici kapali'); Z.MONEY.allowTestMode = true; M.provider = null; M.detect(); assert(M.mode === 'test', 'izin verilince acilir'); Z.MONEY.allowTestMode = false; Z.BUILD = 'dev'; M.provider = null; M.detect(); assert(M.mode === 'test', 'dev derlemede acik'); Z.BUILD = b0; M.provider = null; M.mode = 'off'; delete store['sv.monetize']; ok('Test (sahte ödeme) sağlayıcısı yayın sürümünde kapalı; yalnızca dev derlemede ya da allowTestMode ile açılır'); }

console.log(n + ' test geçti');
