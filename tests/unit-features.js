// v0.2 ozellikleri icin hizli mantik testleri: node tests/unit-features.js
const path = require('path'); const assert = require('assert');
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
['version', 'data', 'save', 'sim', 'field'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z;
const mk = (deck, hero, level, extra) => {
  const sv = { unitLvl: {}, heroLvl: { aslan: 1, yildiz: 1, demir: 1, buz: 1, ejder: 1 }, castleLvl: 1 }; Z.UNIT_ORDER.forEach(u => (sv.unitLvl[u] = 1));
  const b = new Z.Battle(Object.assign({ mode: 'campaign', level: level || 1, save: sv, deck, hero: hero || 'aslan', seed: 5 }, extra || {}));
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

// 8) Sefer kurallari ve hedefleri
{ const info = Z.levelInfo(4); assert(info.rule === 'survive', '4. bolum savunma seferi olmali');
  const b = mk(['spear'], 'aslan', 4); assert(b.base[1].max >= 1e8, 'savunma seferinde dusman kalesi yikilamaz olmali');
  for (let i = 0; i < 30 * (info.surviveTime + 5) && !b.over; i++) b.update(1 / 30);
  assert(b.over && b.result.win && b.t >= info.surviveTime && b.result.time < info.surviveTime + 1, 'sure dolunca kazanmali'); ok('Savunma seferi: süre dolunca zafer (' + info.surviveTime + ' sn), düşman kalesi yıkılamaz'); }
{ const base = mk(['spear'], 'aslan', 1).income(), rich = mk(['spear'], 'aslan', 3).income(), famine = mk(['spear'], 'aslan', 11).income();
  assert(Z.levelInfo(3).rule === 'rich' && Math.abs(rich / base - 1.3) < 1e-9, 'rich'); assert(Z.levelInfo(11).rule === 'famine' && Math.abs(famine / base - 0.8) < 1e-9, 'famine');
  ok('Altın Damarı +%30, Kıtlık -%20 gelir'); }
{ const b = mk(['spear'], 'aslan', 8); assert(Z.levelInfo(8).rule === 'ambush'); for (let i = 0; i < 60; i++) b.update(1 / 30);
  const lanes = new Set(b.units.filter(u => u.team === 1).map(u => u.lane)); assert(lanes.has(0) && lanes.has(2), 'pusu kenar koridorlara baskin yapmali'); ok('Pusu: düşman kenar koridorlardan (1 ve 3) baskın yapar'); }
{ const b1 = mk(['spear'], 'aslan', 7), bs = mk(['spear'], 'aslan', 1); assert(Z.levelInfo(7).rule === 'heavy');
  const e1 = b1.spawn(1, 'spear', 1), s1 = b1.enemyScale(); assert(Math.abs(e1.max - Z.UNITS.spear.hp * s1 * 1.2) < 1e-6, 'zirhli ordu +%20 can'); ok('Zırhlı Ordu: düşman canı +%20'); }
{ const f = mk(['spear'], 'aslan', 12), n = mk(['spear'], 'aslan', 1); assert(Z.levelInfo(12).rule === 'fortress');
  assert(Math.abs(f.base[1].max - Z.levelInfo(12).baseHp * 1.4) < 1e-6, 'kale +%40'); f.cooldown.spear = 0; f.gold = 500; f.deploy('spear', 0); assert(Math.abs(f.cooldown.spear - Z.UNITS.spear.cd * 0.85) < 1e-9, 'bekleme -%15'); ok('Kale Kuşatması: düşman kalesi +%40, kart bekleme -%15'); }
{ const w = mk(['spear'], 'aslan', 6), x = mk(['spear'], 'aslan', 1); assert(Z.levelInfo(6).rule === 'swift');
  const a = w.spawn(0, 'spear', 1), c = x.spawn(0, 'spear', 1); a.atkCd = c.atkCd = 99; for (let i = 0; i < 30; i++) { w.update(1 / 30); x.update(1 / 30); }
  assert(Math.abs((a.x - 180) / (c.x - 180) - 1.25) < 0.02, 'hiz +%25'); ok('Fırtına Rüzgârı: birlikler %25 daha hızlı'); }
{ for (let n = 1; n <= Z.MAX_LEVEL; n++) { const i = Z.levelInfo(n); assert(i.story && i.story.length > 10 && i.name, 'hikaye/ad eksik ' + n); assert(Z.RULES[i.rule], 'kural tanimsiz ' + n); assert(i.rule === 'none' || n >= 3, 'ilk iki bolum kuralsiz'); if (Z.isBoss(n)) assert(i.rule === 'none', 'patron kuralsiz'); }
  ok(Z.MAX_LEVEL + ' bölümün hepsinde ad, hikâye ve geçerli kural var'); }

// ---- v0.4: yeni birlikler ----
const still = (b) => b.units.forEach(u => { if (u.team === 1) u.atkCd = 99; });
{ const b = mk(['assassin'], 'aslan', 1); const as = b.spawn(0, 'assassin', 1); as.x = 200; as.age = 5;
  const sp = b.spawn(1, 'spear', 1); sp.x = 640; sp.hp = sp.max = 1e5; const ar = b.spawn(1, 'archer', 1); ar.x = 710; still(b);
  let spAtKill = null, asAtKill = 0;
  for (let i = 0; i < 30 * 9; i++) { b.update(1 / 30); still(b); if (!b.units.includes(ar) && spAtKill === null) { spAtKill = sp.hp; asAtKill = as.x; } }
  assert(spAtKill !== null, 'suikastci arka saftaki okcuyu oldurmedi'); assert(asAtKill > sp.x, 'suikastci on saftan gecmedi'); assert(spAtKill === sp.max, 'okcu olene kadar on saf mizrakciya dokunulmamali');
  ok('Suikastçı: ön saftaki mızrakçıyı geçip arkadaki okçuyu avlar'); }
{ const b = mk(['golem'], 'aslan', 1); const g = b.spawn(0, 'golem', 1); g.x = 300; g.age = 5; g.atkCd = 0;
  const a = b.spawn(1, 'knight', 1), c2 = b.spawn(1, 'knight', 1), far = b.spawn(1, 'knight', 1); a.x = 340; c2.x = 380; far.x = 480; still(b);
  b.attack(g, a); assert(a.hp < a.max && c2.hp < c2.max, 'sıçrama hasarı yok'); assert(far.hp === far.max, 'uzak birlik etkilenmemeli');
  assert(Math.abs((c2.max - c2.hp) / (a.max - a.hp) - 0.6) < 0.01, 'sıçrama %60 olmalı'); ok('Taş Dev: darbe çevredekilere %60 hasar yayar'); }
{ const b = mk(['flamer'], 'aslan', 1); const f = b.spawn(0, 'flamer', 1); f.x = 700; f.age = 5; const e = b.spawn(1, 'knight', 1); e.x = 780; e.hp = e.max = 1e5; still(b);
  b.attack(f, e); assert(e.burnUntil > b.t, 'yanma baslamadi'); const h0 = e.hp; f.atkCd = 99;
  for (let i = 0; i < 60; i++) { b.update(1 / 30); still(b); } const h1 = e.hp; assert(h1 < h0 - 5, 'yanma hasari yok');
  for (let i = 0; i < 90; i++) { b.update(1 / 30); still(b); } const h2 = e.hp; for (let i = 0; i < 60; i++) { b.update(1 / 30); still(b); }
  assert(e.hp === h2, 'yanma 3 sn sonra bitmeli'); ok('Alevci: hedefi yakar, yanma 3 sn sürer ve biter'); }
{ const b = mk(['spear'], 'ejder', 1); const es = [0, 1, 2].map(i => { const e = b.spawn(1, 'knight', 1); e.x = 500 + i * 30; e.hp = e.max = 1e5; return e; }); still(b);
  b.heroCd = 0; assert(b.useSkill(1), 'ejder yetenegi kullanilamadi'); assert(es.every(e => e.burnUntil > b.t + 5), 'tum koridor yanmali');
  const h = es[0].hp; for (let i = 0; i < 60; i++) { b.update(1 / 30); still(b); } assert(es[0].hp < h - 10, 'ejder yanma hasari yok'); ok('Ejder Hatun: koridordaki tüm düşmanları 6 sn yakar'); }

// ---- v0.4: zorluk kademeleri ----
{ const n = mk(['spear'], 'aslan', 10), h = mk(['spear'], 'aslan', 10, { diff: 1 }), l = mk(['spear'], 'aslan', 10, { diff: 2 });
  const en = n.spawn(1, 'spear', 1), eh = h.spawn(1, 'spear', 1), el = l.spawn(1, 'spear', 1);
  assert(Math.abs(eh.max / en.max - 1.35) < 1e-9 && Math.abs(el.max / en.max - 1.8) < 1e-9, 'dusman cani'); assert(Math.abs(eh.dmg / en.dmg - 1.2) < 1e-9 && Math.abs(el.dmg / en.dmg - 1.45) < 1e-9, 'dusman hasari');
  assert(l.base[1].max > h.base[1].max && h.base[1].max > n.base[1].max, 'kale cani zorlukla artmali'); ok('Zorluk: Zor ×1.35 / Efsane ×1.8 düşman canı, daha sağlam kale'); }
{ const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } }; Z.Save.reset();
  const S = Z.Save, d = S.data; d.cleared = 10;
  assert(Z.diffUnlocked(d, 10, 1) && !Z.diffUnlocked(d, 11, 1) && !Z.diffUnlocked(d, 10, 2), 'kademe kilitleri');
  const win = (diff) => { const b = mk(['spear'], 'aslan', 10, { diff }); b.base[1].hp = 0; b.update(0.01); assert(b.result && b.result.win); return Z.settleBattle(b, S); };
  const g0 = d.gems, o1 = win(1); assert(o1.firstHard && d.hardCleared[10] === 1 && d.gems - g0 === 5 + (o1.chest.gems || 0) && d.stats.hardWins === 1, 'ilk Zor galibiyeti');
  assert(Z.diffUnlocked(d, 10, 2), 'Efsane acilmali'); const g1 = d.gems, o2 = win(1); assert(!o2.firstHard && d.gems - g1 === (o2.chest.gems || 0), 'ikinci Zor galibiyetinde elmas yok');
  const o3 = win(2); assert(o3.firstHard && d.hardCleared[10] === 2 && d.stats.legendWins === 1, 'Efsane galibiyeti'); assert(d.stars[10] === undefined, 'zor kademe yildiz yazmamali');
  ok('Zor/Efsane: kilitler, ilk galibiyette elmas, ödül çarpanı ve yıldıza dokunmama'); }

// ---- v0.4: gunluk sefer ----
{ const a = Z.dailySefer('2026-11-03', 20), b = Z.dailySefer('2026-11-03', 20); assert(JSON.stringify(a) === JSON.stringify(b), 'ayni gun ayni sefer olmali');
  const days = new Set(); for (let i = 1; i <= 28; i++) { const x = Z.dailySefer('2026-12-' + String(i).padStart(2, '0'), 30); days.add(x.rules.join('+') + x.theme);
    assert(x.rules.length === 2 && x.rules[0] !== x.rules[1], 'iki farkli kural'); assert(!(x.rules.includes('rich') && x.rules.includes('famine')), 'celisen kurallar'); assert(x.level >= 3 && x.level <= Z.MAX_LEVEL && x.theme >= 0 && x.theme < Z.REALMS.length); }
  assert(days.size >= 12, 'gunluk seferler yeterince cesitli degil: ' + days.size);
  Z.Save.reset(); const S = Z.Save, d = S.data; d.cleared = 12; const di = S.dailyInfo();
  const play = () => { const b = mk(['spear'], 'aslan', di.level, { mode: 'daily', rules: di.rules, theme: di.theme, daily: di }); b.base[1].hp = 0; b.update(0.01); return Z.settleBattle(b, S); };
  const c0 = d.coins, o1 = play(); assert(o1.dailyFirst && d.dailySefer.won && d.stats.dailyWins === 1 && o1.coins === di.rewardCoins && o1.gems === 12 && d.coins - c0 === di.rewardCoins, 'gunluk ilk odul');
  const o2 = play(); assert(!o2.dailyFirst && o2.coins === 0 && d.stats.dailyWins === 1, 'ikinci galibiyette odul yok'); ok('Günlük Sefer: aynı gün aynı sefer, 28 günde çeşitli, ödül günde bir kez'); }

// ---- v0.4: pazar ----
{ Z.Save.reset(); const S = Z.Save, d = S.data; d.cleared = 10; d.gems = 100; d.coins = 0;
  assert(S.buyMarket('coins') && d.gems === 90 && d.coins === 400 + 600, 'altin kesesi'); assert(S.buyMarket('chest') && d.gems === 50 && d.coins === 1000 + 3000 + 2500, 'buyuk sandik');
  assert(S.buyMarket('spin').unused, 'bedava hak varken cark satilmamali'); S.spin(); d.gems = 50; /* cark odulu rastgele: elmasi sabitle */ assert(S.buyMarket('spin') && d.wheel.used === false && d.gems === 40, 'bonus cark');
  d.treasuryLast = Date.now(); assert(S.buyMarket('treasury') && S.treasuryFull() && d.gems === 25, 'hazine hizlandirma'); assert(S.buyMarket('treasury').full, 'dolu hazine satilmamali');
  d.gems = 5; assert(S.buyMarket('coins') === null && d.gems === 5, 'yetersiz elmas'); assert(d.stats.purchases === 4, 'satin alma sayaci'); ok('Pazar: 4 ürün, elmas düşer, gereksiz alımı engeller'); }

// ---- v0.4: kayit tasima ----
{ Z.Save.reset(); const S = Z.Save, d = S.data; d.coins = 12345; d.gems = 77; d.cleared = 33; d.unitLvl.spear = 17; d.hardCleared[5] = 2;
  const code = S.exportSave(); assert(code && /^[A-Za-z0-9+/=]+$/.test(code), 'disa aktarma kodu');
  d.coins = 1; d.cleared = 1; assert(S.importSave(code), 'ice aktarma basarisiz'); assert(S.data.coins === 12345 && S.data.cleared === 33 && S.data.unitLvl.spear === 17 && S.data.hardCleared[5] === 2, 'veri korunmadi');
  const before = JSON.stringify(S.data); ['', 'abc', 'e30=', btoa('{"v":2}'), btoa('{"v":1,"coins":"x"}'), btoa('not json')].forEach(bad => assert(S.importSave(bad) === false, 'gecersiz kod kabul edildi: ' + bad));
  assert(JSON.stringify(S.data) === before, 'gecersiz ice aktarma kaydi bozdu'); ok('Kayıt taşıma: dışa/içe aktarma gidiş-dönüş, geçersiz kodlar reddedilir'); }

// ---- v0.4: veri tutarliligi (yeni icerik eklerken bozuk veri yakalar) ----
{ assert(Z.LEVEL_NAMES.length === Z.MAX_LEVEL && Z.STORIES.length === Z.MAX_LEVEL, 'bolum ad/hikaye sayisi MAX_LEVEL ile esit olmali');
  assert(Z.REALMS.length * 15 >= Z.MAX_LEVEL && Z.realmOf(Z.MAX_LEVEL) === Z.REALMS.length - 1, 'diyar sayisi');
  Z.UNIT_ORDER.forEach(id => { const u = Z.UNITS[id]; assert(u && u.id === id && u.cls && u.hp > 0 && u.dmg > 0 && u.cost > 0 && u.cd > 0 && u.desc, 'birim eksik: ' + id); assert(Z.UNLOCK_AT[id] !== undefined, 'UNLOCK_AT yok: ' + id); assert(Z.COUNTER[u.cls], 'COUNTER yok: ' + u.cls); /* BONUS opsiyonel: bonusu olmayan siniflar tabloda yer almaz */ });
  Z.HERO_ORDER.forEach(id => { const h = Z.HEROES[id]; assert(h && h.name && h.skill && h.cd > 0 && h.type && h.desc, 'kahraman eksik: ' + id); });
  for (let n = 1; n <= Z.MAX_LEVEL; n++) Z.levelInfo(n).tiers.forEach(t => assert(Z.UNITS[t], 'dusman kademesinde bilinmeyen birim: ' + t));
  assert(Z.levelInfo(60).tiers.includes('flamer') && Z.levelInfo(22).tiers.includes('assassin'), 'yeni birimler dusman kademelerinde'); assert(Z.unitUpgradeCost(Z.MAX_UNIT_LVL - 1) > Z.unitUpgradeCost(10), 'maliyet egrisi');
  ok('Veri tutarlılığı: ' + Z.MAX_LEVEL + ' bölüm, ' + Z.UNIT_ORDER.length + ' birim, ' + Z.HERO_ORDER.length + ' kahraman eksiksiz'); }


// ---- v0.5: iki savas turu + gecis ----
{ assert(Z.levelType(3) === 'field' && Z.levelType(4) === 'field' && Z.levelType(1) === 'castle' && Z.levelType(5) === 'castle' && Z.levelType(8) === 'field', 'savas turu dagilimi');
  const ft = []; for (let n = 1; n <= Z.MAX_LEVEL; n++) if (Z.levelType(n) === 'field') ft.push(n); assert(ft.length === 42, 'acik alan bolum sayisi ' + ft.length);
  const objs = new Set(ft.map(n => Z.fieldObjective(n, [Z.ruleOf(n)]))); assert(objs.has('commander') && objs.has('capture') && objs.has('survive'), 'uc hedef de kullanilmali');
  ok('Savaş türleri: 105 bölümde 42 açık alan (komutan / bayrak / dayanma hedefleri)'); }
const fmk = (deck, level, extra) => {
  const sv = { unitLvl: {}, heroLvl: { aslan: 1, yildiz: 1, demir: 1, buz: 1, ejder: 1 }, castleLvl: 1 }; Z.UNIT_ORDER.forEach(u => (sv.unitLvl[u] = 1));
  const b = new Z.FieldBattle(Object.assign({ level: level || 3, save: sv, deck, hero: 'aslan', seed: 9 }, extra || {}));
  b.ai.gold = -1e9; b.ai.think = 1e9; return b;
};
const clearEnemy = b => { b.units = b.units.filter(u => u.team === 0 || u.commander); };
// F1) Harita deterministik; arazi yerlesim bolgelerine tasmaz
{ const a = Z.fieldMap(8, 'capture'), b = Z.fieldMap(8, 'capture'), c = Z.fieldMap(13, 'commander');
  assert(JSON.stringify(a) === JSON.stringify(b), 'harita bolum numarasina gore sabit olmali'); assert(JSON.stringify(a) !== JSON.stringify(c), 'farkli bolum farkli harita');
  assert(a.flags.length === 3 && a.river === null, 'bayrak modunda 3 bayrak ve nehir yok');
  for (let n = 1; n <= Z.MAX_LEVEL; n++) { const m = Z.fieldMap(n, 'commander'); [].concat(m.forests, m.hills, m.rocks).forEach(o => assert(o.y - o.r > 150 && o.y + o.r < Z.FH - 150, 'arazi yerlesim alanina tasti: bolum ' + n)); if (m.river) assert(m.river.gaps[0].x1 < m.river.gaps[1].x0, 'gecitler cakisiyor: ' + n); }
  ok('Açık alan haritası: bölüme göre sabit, araziler ordugah bölgelerini kapatmaz, nehir geçitleri ayrık'); }
// F2) Yerlestirme: butce, iade, bolge, engel
{ const b = fmk(['spear', 'archer']); const g0 = b.gold, cost = Z.UNITS.spear.cost;
  const u = b.place('spear', 300, Z.FH - 100); assert(u && b.gold === g0 - cost, 'butce dusmedi');
  assert(!b.place('spear', 300, 300), 'oyuncu alani disina yerlestirildi'); assert(!b.canPlace(5, Z.FH - 50), 'kenara yerlestirildi');
  assert(b.moveUnit(u.id, 200, Z.FH - 60) && Math.abs(u.x - 200) < 1e-9, 'tasima'); assert(b.removeUnit(u.id) && b.gold === g0, 'iade tam olmali');
  const n0 = b.autoPlace(); assert(n0 >= 6 && b.countTeam(0) === n0 + 1 && b.gold < Z.UNITS.spear.cost, 'otomatik dizilis butceyi kullanmali');
  b.startBattle(); assert(b.phase === 'battle' && !b.removeUnit(b.units.find(x => x.team === 0 && !x.commander).id), 'savasta iade yapilamaz'); assert(!b.canPlace(300, Z.FH - 150), 'savasta yalniz alt serit');
  ok('Yerleştirme: bütçe, geri alma tam iade, bölge/kenar kuralları, otomatik diziliş'); }
// F3) Hazirlikta savas yok; komutanlar var
{ const b = fmk(['spear']); b.place('spear', 300, Z.FH - 60); for (let i = 0; i < 90; i++) b.update(1 / 30); assert(b.t === 0, 'hazirlikta zaman akmamali');
  assert(b.cmdP && b.cmdE && b.cmdP.team === 0 && b.cmdE.team === 1 && b.cmdE.hp > b.cmdP.hp * 0.5, 'komutanlar'); ok('Hazırlık aşamasında savaş işlemez; iki taraf da komutanla başlar'); }
// F4) Birlikler birbirini gecebilir (hizli, yavas dostun onunde takilmaz)
{ const b = fmk(['spear', 'cav']); clearEnemy(b); b.cmdE.x = 600; b.cmdE.y = 40; b.cmdE.hp = b.cmdE.max = 1e9;
  const slow = b.spawn(0, 'knight', 300, 600), fast = b.spawn(0, 'cav', 300, 700); slow.speed = 20; b.phase = 'battle';
  let passed = false; for (let i = 0; i < 400 && !passed; i++) { b.update(1 / 30); if (fast.y < slow.y - 20) passed = true; } assert(passed, 'hizli birlik yavasi gecemedi');
  ok('Açık alanda hızlı birlik, yavaş dostun yanından geçer'); }
// F5) Orman yavaslatir, ormanda menzilli hasari azalir
{ const b = fmk(['spear']); b.map.forests = [{ x: 200, y: 500, r: 90 }]; b.map.hills = []; b.map.river = null; b.map.rocks = []; clearEnemy(b); b.cmdE.hp = b.cmdE.max = 1e9; b.cmdE.x = 600; b.cmdE.y = 60; b.phase = 'battle';
  const inF = b.spawn(0, 'spear', 200, 520), out = b.spawn(0, 'spear', 520, 520);
  for (let i = 0; i < 30; i++) b.update(1 / 30); const dIn = 520 - inF.y, dOut = 520 - out.y; assert(dIn < dOut * 0.8 && dIn > 0, 'orman yavaslatmali ' + dIn + ' ' + dOut);
  const t1 = b.spawn(1, 'archer', 100, 100); const vs = (tgt) => { tgt.hp = tgt.max = 1e5; b.damage(tgt, 100, 'archer', true); return 1e5 - tgt.hp; };
  const dmgOut = vs(out), dmgIn = vs(inF); assert(Math.abs(dmgIn / dmgOut - 0.75) < 0.01, 'orman siperi ×0.75 ' + dmgIn / dmgOut); void t1;
  ok('Orman: hareket yavaşlar, okçu hasarı ×0.75'); }
// F6) Nehir: gecit disindan gecilmez, gecitten gecer
{ const b = fmk(['spear']); b.map.river = { y: 420, hw: 26, gaps: [{ x0: 80, x1: 200 }, { x0: 500, x1: 620 }] }; b.map.forests = []; b.map.hills = []; b.map.rocks = []; clearEnemy(b);
  b.cmdE.x = 360; b.cmdE.y = 60; b.cmdE.hp = b.cmdE.max = 1e9; b.phase = 'battle'; const u = b.spawn(0, 'spear', 340, 600); let cross = null;
  for (let i = 0; i < 900; i++) { b.update(1 / 30); if (Math.abs(u.y - 420) < 22 && !(u.x >= 76 && u.x <= 204) && !(u.x >= 496 && u.x <= 624)) assert.fail('nehirin icinden gecildi: x=' + Math.round(u.x)); if (u.y < 380 && cross === null) cross = u.x; if (u.dead) break; }
  assert(cross !== null, 'nehir hic asilmadi'); ok('Nehir: yalnızca geçitlerden aşılır (birlik x=' + Math.round(cross) + ' geçidinden geçti)'); }
// F7) Komutan olurse savas biter
{ const b = fmk(['spear']); b.phase = 'battle'; b.kill(b.cmdE); assert(b.over && b.result.win, 'dusman komutani oldu: zafer'); const c = fmk(['spear']); c.phase = 'battle'; c.kill(c.cmdP); assert(c.over && !c.result.win, 'komutan oldu: yenilgi');
  ok('Komutan düşünce savaş biter (düşman: zafer, senin: yenilgi)'); }
// F8) Bayrak ele gecirme
{ const b = fmk(['spear'], 8); assert(b.objective === 'capture' && b.flags.length === 3, 'bayrak modu'); clearEnemy(b); b.cmdE.hp = b.cmdE.max = 1e9; b.cmdE.x = 20; b.cmdE.y = 20; b.cmdP.hp = b.cmdP.max = 1e9; b.phase = 'battle';
  b.flags.forEach(f => { for (let k = 0; k < 4; k++) b.spawn(0, 'spear', f.x + k * 6, f.y); });
  for (let i = 0; i < 30 * 70 && !b.over; i++) { b.update(1 / 30); if (b.perkOffer) b.pickPerk(b.perkOffer[0]); } assert(b.over && b.result.win && b.scores.p >= 100, 'bayraklar tutuldu ama kazanilmadi: ' + b.scores.p); ok('Bayrak hedefi: 3 bayrağı tutan taraf 100 puana ulaşıp kazanır'); }
// F9) Durus: savunmada birlik uzak dusmana yurumez; yetenek noktaya etki eder; settle uyumlu
{ const b = fmk(['spear']); clearEnemy(b); b.phase = 'battle'; b.cmdE.hp = b.cmdE.max = 1e9; b.cmdE.x = 360; b.cmdE.y = 30; b.setStance('defend'); const u = b.spawn(0, 'spear', 360, 700), y0 = u.y;
  for (let i = 0; i < 60; i++) b.update(1 / 30); assert(Math.abs(u.y - y0) < 2, 'savunmada yururken: ' + (y0 - u.y));
  const e1 = b.spawn(1, 'spear', 60, 300), e2 = b.spawn(1, 'spear', 600, 300); e1.hp = e1.max = e2.hp = e2.max = 1e5; b.heroCd = 0; const hero = Z.HEROES[b.heroId];
  if (hero.target !== 'none') { assert(b.useSkill(60, 300), 'yetenek'); assert(e1.hp < 1e5 || e1.burnUntil > b.t || e1.stunUntil > b.t, 'yakindaki etkilenmeli'); assert(e2.hp === 1e5 && e2.stunUntil <= b.t, 'uzaktaki etkilenmemeli'); }
  ok('Duruş: savunmada yerinde durur; kahraman yeteneği yalnızca hedef noktadaki birliklere etki eder'); }
{ Z.Save.reset(); const S = Z.Save; const b = fmk(['spear'], 3); b.phase = 'battle'; b.kill(b.cmdE); const out = Z.settleBattle(b, S); assert(out.win && out.coins > 0 && S.data.cleared >= 3 && S.data.stars[3] >= 1, 'oduller islenmedi');
  ok('Açık alan zaferi ödülleri ve ilerlemeyi işler (settleBattle uyumlu)'); }
// F10) Komutan bolgesinden cikmaz, rakibi kovalamaz
{ const b = fmk(['spear']); b.phase = 'battle'; const e = b.spawn(1, 'knight', 360, Z.FH - 260); e.hp = e.max = 1e9; e.speed = 0; const c0 = { x: b.cmdP.x, y: b.cmdP.y };
  for (let i = 0; i < 300; i++) b.update(1 / 30); assert(b.cmdP.y >= Z.FH - Z.FZONE.prep && Math.hypot(b.cmdP.x - c0.x, b.cmdP.y - c0.y) < 30, 'komutan yerinden oynadi: ' + Math.round(b.cmdP.y));
  const f = fmk(['spear']); f.phase = 'battle'; const ally = f.spawn(0, 'knight', 360, 200); ally.speed = 0; ally.hp = ally.max = 1e9; for (let i = 0; i < 300; i++) f.update(1 / 30); assert(f.cmdE.y <= Z.FZONE.prep, 'dusman komutani bolgesinden cikti: ' + Math.round(f.cmdE.y));
  ok('Komutanlar yerinde durur: rakibi kovalamaz, asker basma bölgesinden çıkmaz'); }

console.log(n + ' test geçti');
