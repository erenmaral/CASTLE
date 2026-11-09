// v0.6 mantik testleri: node tests/unit-v06.js  (gorevler, haftalik gorevler, 105 bolum, yeni diyarlar, saha sayaclari)
const path = require('path'); const assert = require('assert');
const store = {}; globalThis.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } };
['version', 'data', 'save', 'sim', 'field'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z; let n = 0; const ok = (m) => { n++; console.log('  ✓', m); };

// 1) Icerik tutarliligi
{ assert(Z.MAX_LEVEL === 105 && Z.REALMS.length === 7 && Z.realmOf(105) === 6 && Z.realmOf(76) === 5 && Z.realmOf(75) === 4, 'diyar-bolum esleme');
  assert(Z.LEVEL_NAMES.length === 105 && Z.STORIES.length === 105, 'ad/hikaye sayisi'); assert(new Set(Z.LEVEL_NAMES).size === 105, 'bolum adlari benzersiz olmali');
  for (let l = 1; l <= 105; l++) { const i = Z.levelInfo(l); assert(i.scale >= 1 && i.rewardCoins > 0 && i.tiers.length >= 2, 'bolum ' + l); assert(/\d/.test(Z.LEVEL_NAMES[l - 1]) && Z.STORIES[l - 1].length > 20, 'tarihi kusatma adi (yil) + not ' + l); }
  ok('105 bölüm, 7 diyar: her bölüm gerçek bir kuşatma (ad + yıl), adlar benzersiz'); }
// 2) Gorev havuzlari
{ const ids = Z.QUEST_POOL.concat(Z.WEEKLY_POOL).map(q => q.id); assert(new Set(ids).size === ids.length, 'gorev id benzersiz'); assert(Z.QUEST_POOL.length >= 20 && Z.WEEKLY_POOL.length >= 8, 'havuz boyutu');
  const stats = new Set(['wins', 'plays', 'kills', 'spawns', 'skills', 'threeStars', 'mines', 'perks', 'fieldWins', 'castleWins', 'bossWins', 'hardWins']);
  Z.QUEST_POOL.concat(Z.WEEKLY_POOL).forEach(q => { assert(stats.has(q.stat), 'bilinmeyen sayac: ' + q.stat); assert(q.target > 0 && q.coins > 0 && q.gems > 0 && q.text, 'gorev eksik: ' + q.id); });
  Z.WEEKLY_POOL.forEach(q => assert(/^w_/.test(q.id) && q.coins >= 1000, 'haftalik gorev kurali ' + q.id));
  ok('Görev havuzu: ' + Z.QUEST_POOL.length + ' günlük + ' + Z.WEEKLY_POOL.length + ' haftalık, sayaçlar tanımlı, kimlikler benzersiz'); }
// 3) Gunluk 4 + haftalik 3; hafta degisince yenilenir; ilerleme ve odul
{ const S = Z.Save; S.reset(); const d = S.data; assert(d.quests.list.length === 4 && d.weekly.list.length === 3, 'gorev sayilari');
  assert(new Set(d.quests.list.map(q => q.id)).size === 4 && new Set(d.weekly.list.map(q => q.id)).size === 3, 'tekrarsiz secim');
  const dq = d.quests.list[0], dd = S.questDef(dq.id); S.track(dd.stat, dd.target); assert(d.quests.list[0].prog === dd.target, 'gunluk ilerleme');
  const wq = d.weekly.list[0], wd = S.questDef(wq.id); S.track(wd.stat, wd.target); assert(d.weekly.list[0].prog === wd.target, 'haftalik ilerleme'); const c0 = d.coins, g0 = d.gems;
  assert(S.claimQuest(0, true).id === wq.id && d.coins === c0 + wd.coins && d.gems === g0 + wd.gems, 'haftalik odul'); assert(S.claimQuest(0, true) === null, 'iki kez alinmaz');
  const oldWeek = d.weekly.week, oldIds = d.weekly.list.map(q => q.id).join(); d.weekly.week = oldWeek - 1; S.rollDay(); assert(d.weekly.week === oldWeek && d.weekly.list.every(q => !q.claimed && q.prog === 0), 'hafta degisince yenilenmeli');
  d.weekly.week = oldWeek; const keep = JSON.stringify(d.weekly); S.rollDay(); assert(JSON.stringify(d.weekly) === keep, 'ayni hafta icinde degismemeli'); void oldIds;
  ok('Görevler: günde 4 + haftada 3, ilerleme ve ödül, hafta değişince yenilenir, aynı hafta korunur'); }
// 4) Eski kayit (haftalik alani yok) sorunsuz yuklenir
{ const S = Z.Save; store['zafarion.save.v1'] = JSON.stringify({ v: 1, cleared: 20, coins: 5, quests: { day: '2020-01-01', list: [{ id: 'win2', prog: 1, claimed: false }] }, stats: { wins: 3 } });
  S.load(); assert(S.data.cleared === 20 && S.data.weekly.list.length === 3 && S.data.quests.list.length === 4 && S.data.stats.fieldWins === 0 && S.data.settings.menuBattle === true, 'eski kayit yukseltme');
  ok('Eski kayıt yüklenince haftalık görevler, yeni sayaçlar ve menü ayarı eklenir'); }
// 5) Saha/kale sayaclari ve yeni basarimlar
{ const S = Z.Save; S.reset(); const d = S.data; const sv = { unitLvl: {}, heroLvl: { aslan: 1 }, castleLvl: 1 }; Z.UNIT_ORDER.forEach(u => (sv.unitLvl[u] = 1));
  const f = new Z.FieldBattle({ level: 3, save: sv, deck: ['spear'], hero: 'aslan', seed: 3 }); f.phase = 'battle'; f.kill(f.cmdE); Z.settleBattle(f, S); assert(d.stats.fieldWins === 1 && d.stats.castleWins === 0, 'saha sayaci');
  const c = new Z.Battle({ mode: 'campaign', level: 5, save: sv, deck: ['spear'], hero: 'aslan', seed: 3 }); c.base[1].hp = 0; c.update(0.1); if (!c.over) c.finish(true); Z.settleBattle(c, S); assert(d.stats.castleWins === 1 && d.stats.bossWins === 1, 'kale/patron sayaci');
  const a = Z.ACHIEVEMENTS.filter(x => x.id === 'field10')[0]; assert(S.achProgress(a) === 1, 'basarim ilerlemesi'); assert(Z.ACHIEVEMENTS.some(x => x.id === 'lvl105') && Z.STAR_MILESTONES.some(m => m.n === 300), 'yeni basarim/kilometre tasi');
  ok('Savaş sonu sayaçları: açık alan / kale / patron galibiyeti işlenir, yeni başarımlar ilerler'); }
console.log(n + ' test geçti');
