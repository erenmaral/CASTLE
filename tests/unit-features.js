// v0.2 ozellikleri icin hizli mantik testleri: node tests/unit-features.js
const path = require('path'); const assert = require('assert');
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
['version', 'data', 'save', 'sim'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z;
const mk = (deck, hero) => {
  const sv = { unitLvl: {}, heroLvl: { aslan: 1, yildiz: 1, demir: 1, buz: 1 }, castleLvl: 1 }; Z.UNIT_ORDER.forEach(u => (sv.unitLvl[u] = 1));
  const b = new Z.Battle({ mode: 'campaign', level: 1, save: sv, deck, hero: hero || 'aslan', seed: 5 });
  b.ai.gold = -1e9; b.ai.think = 1e9; // dusman yapay zekasi kapali
  return b;
};
let n = 0; const ok = (name) => { n++; console.log('  ✓', name); };

// 1) Sifaci yarali dostu iyilestirir
{ const b = mk(['spear', 'healer']); const sp = b.spawn(0, 'spear', 1); b.spawn(0, 'healer', 1);
  sp.hp = 40; const before = sp.hp; let healed = false;
  for (let i = 0; i < 90; i++) { b.update(1 / 30); if (b.drain().some(e => e.type === 'heal')) healed = true; }
  assert(healed && sp.hp > before, 'sifaci iyilestirmedi'); ok('Şifacı yaralı dostu iyileştirir (' + Math.round(before) + ' → ' + Math.round(sp.hp) + ')'); }

// 2) Sancaktar aurasi hasari %20 arttirir
{ const b = mk(['spear', 'banner']); const sp = b.spawn(0, 'spear', 1); const foe = b.spawn(1, 'spear', 1); foe.x = sp.x + 30; foe.hp = foe.max = 1e6;
  const base = (() => { const c = mk(['spear']); const s2 = c.spawn(0, 'spear', 1); const f2 = c.spawn(1, 'spear', 1); f2.x = s2.x + 30; f2.hp = f2.max = 1e6; s2.atkCd = 0; c.attack(s2, f2); return 1e6 - f2.hp; })();
  const bn = b.spawn(0, 'banner', 1); bn.x = sp.x - 40; sp.atkCd = 0; b.attack(sp, foe);
  const withAura = 1e6 - foe.hp; assert(Math.abs(withAura / base - 1.2) < 0.01, 'aura orani ' + withAura / base); ok('Sancaktar aurası hasarı ×1.2 yapar'); }

// 3) Buz Hatun: dusmani dondurur
{ const b = mk(['spear'], 'buz'); const foe = b.spawn(1, 'spear', 1); b.heroCd = 0; const x0 = foe.x;
  assert(b.useSkill(1), 'yetenek kullanilamadi'); for (let i = 0; i < 60; i++) b.update(1 / 30);
  assert(foe.x === x0, 'donmus birlik hareket etti'); for (let i = 0; i < 120; i++) b.update(1 / 30);
  assert(foe.x < x0, 'don cozulmedi'); ok('Buz Hatun düşmanı dondurur, süre bitince çözülür'); }

// 4) Ganimet: kill esiginde secenek sunulur, secilene kadar sim durur
{ const b = mk(['spear']); b.stats.kills = Z.PERK_KILLS[0]; b.update(1 / 30);
  assert(b.perkOffer && b.perkOffer.length === 3, 'ganimet sunulmadi'); const t = b.t; b.update(1 / 30); assert(b.t === t, 'sim durmadi');
  const id = b.perkOffer[0]; assert(b.pickPerk(id) && b.perks[id] && !b.perkOffer, 'secilemedi'); b.update(1 / 30); assert(b.t > t, 'sim devam etmedi');
  assert(!b.pickPerk('gecersiz'), 'gecersiz id kabul edildi'); ok('Ganimet: 3 seçenek sunulur, seçilene kadar savaş durur'); }

// 5) Ganimet etkileri
{ const b = mk(['spear']); const u = b.spawn(0, 'spear', 1); const hp0 = u.max; const inc0 = b.income();
  b.perkOffer = ['hp']; b.pickPerk('hp'); assert(Math.abs(u.max / hp0 - 1.15) < 1e-9, 'hp'); 
  b.perkOffer = ['gold']; b.pickPerk('gold'); assert(Math.abs(b.income() / inc0 - 1.25) < 1e-9, 'gold');
  b.perkOffer = ['cd']; b.pickPerk('cd'); b.cooldown.spear = 0; b.gold = 500; b.deploy('spear', 0); assert(Math.abs(b.cooldown.spear - Z.UNITS.spear.cd * 0.75) < 1e-9, 'cd');
  const cm = b.base[0].max; b.base[0].hp = cm * 0.4; b.perkOffer = ['castle']; b.pickPerk('castle'); assert(b.base[0].max > cm && b.base[0].hp > cm * 0.4 + 1, 'castle');
  ok('Ganimet etkileri: can, altın, bekleme süresi, kale'); }

// 6) Kayit: cark, basarim, yildiz odulu
{ Z.Save.load(); const S = Z.Save, d = S.data;
  const r = S.spin(); assert(r && r.free, 'bedava cark'); assert(S.spin() === null || d.gems >= 0, 'ucretli cark'); // 2. cevirme elmas ister
  d.gems = 0; assert(S.spin() === null, 'elmas yokken cevrilmemeli');
  d.stats.wins = 10; const a = S.claimAch('wins10'); assert(a && S.claimAch('wins10') === null, 'basarim bir kez alinmali');
  d.stats.totalStars = 12; assert(S.claimStar(10) && S.claimStar(10) === null && S.claimStar(25) === null, 'yildiz odulu');
  ok('Kayıt: çark (günlük bedava + elmaslı), başarım ve yıldız ödülü bir kez alınır'); }

// 7) Eski kayit yeni alanlarla tamamlanir
{ globalThis.localStorage = { getItem() { return JSON.stringify({ v: 1, coins: 999, gems: 3, unitLvl: { spear: 4 }, heroLvl: { aslan: 2 }, cleared: 7, stats: { wins: 5 } }); }, setItem() {} };
  Z.Save.load(); const d = Z.Save.data; assert(d.coins === 999 && d.cleared === 7 && d.unitLvl.spear === 4 && d.unitLvl.healer === 1 && d.heroLvl.buz === 1 && d.stats.spins === 0 && d.wheel && d.achClaimed && d.starClaimed, 'migrasyon');
  ok('Eski kayıt (v0.1) yeni alanlarla sorunsuz yükseltilir'); }

console.log(n + ' test geçti');
