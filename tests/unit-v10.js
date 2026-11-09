// v0.10 mantik testleri: node tests/unit-v10.js  (gercek kusatmalar, Hendek / Yardim Ordusu / Abluka / Gedik kurallari, sabit oyun adi)
const path = require('path'); const assert = require('assert');
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
['version', 'i18n', 'data', 'save', 'monetize-config', 'monetize', 'monetize-providers', 'sim', 'field'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z; let n = 0; const ok = (m) => { n++; console.log('  ✓', m); };
const mkSave = () => { const sv = { unitLvl: {}, heroLvl: { aslan: 1 }, castleLvl: 1 }; Z.UNIT_ORDER.forEach(u => (sv.unitLvl[u] = 1)); return sv; };
const mk = (level, rules, seed) => new Z.Battle({ mode: 'campaign', level, save: mkSave(), deck: ['spear', 'archer'], hero: 'aslan', seed: seed || 5, rules });

// 1) Oyun adi sabit Ingilizce, 105 gercek kusatma: ad + yil, her diyarin patronu bilinen bir kusatma
{ assert(Z.NAME === 'Kale Kuşatması: Tarih', 'Turkce ad'); ['en', 'es', 'pt', 'ru', 'zh'].forEach(l => { Z.PACK = {}; require('../www/js/lang/' + l + '.js'); Z.lang = l; assert(Z.NAME && Z.NAME !== 'Kale Kuşatması: Tarih', l + ' adi cevrilmis: ' + Z.NAME); if (l === 'en') assert(Z.NAME === 'Castle Siege: History', 'Ingilizce ad'); }); Z.lang = 'tr';
  assert(Z.REALMS.length === 7 && Z.LEVEL_NAMES.length === 105 && Z.STORIES.length === 105, 'diyar/bolum sayisi');
  Z.LEVEL_NAMES.forEach((nm, i) => { assert(/\d/.test(nm), 'yil yok: ' + nm); assert(!/Seferhan|PATRON/.test(Z.STORIES[i]), 'kurgu kalintisi ' + (i + 1)); });
  assert(Z.LEVEL_NAMES[104] === 'İstanbul 1453' && Z.LEVEL_NAMES[4] === 'Orléans 1429' && Z.LEVEL_NAMES[29] === 'Akka 1291', 'bilinen patronlar');
  ok('Oyun adı dile göre (tr: Kale Kuşatması: Tarih, en: Castle Siege: History, 3 dil daha); 105 bölümün her biri gerçek bir kuşatma (ad + yıl), kurgu kalıntısı yok'); }

// 2) Kurallar: hendek ve yardim ordusu yalnizca kale kusatmasinda; abluka/sagplam surlar yeniden adlandi
{ ['moat', 'relief'].forEach(r => assert(Z.RULES[r] && Z.RULES[r].name && Z.RULES[r].desc, r + ' tanimli'));
  const seen = {}; for (let l = 1; l <= 105; l++) { const r = Z.ruleOf(l); seen[r] = (seen[r] || 0) + 1; if (Z.levelType(l) === 'field') assert(r !== 'moat' && r !== 'relief', 'kale onu muharebesinde hendek/yardim yok: ' + l); }
  assert(seen.moat >= 4 && seen.relief >= 4 && seen.survive >= 4, 'yeni kurallar kampanyada kullaniliyor ' + JSON.stringify(seen));
  assert(Z.RULES.survive.name === 'Abluka' && Z.RULES.fortress.name === 'Sağlam Surlar', 'yeni adlar');
  ok('Kurallar: Hendek ve Yardım Ordusu yalnızca kale kuşatmalarında (' + seen.moat + ' + ' + seen.relief + ' bölüm), Abluka/Sağlam Surlar yeniden adlandı'); }

// 3) Hendek: kalenin onunde yakin dovuscu yavaslar, okcu etkilenmez
{ const run = (rules, type) => { const b = mk(30, rules); const u = b.spawn(0, type, 1); u.x = 1110 - 100; b.units.forEach(e => { if (e !== u) e.dead = true; }); b.base[1].hp = b.base[1].max = 1e7; const x0 = u.x; for (let i = 0; i < 20; i++) { u.atkCd = 99; b.stepUnit(u, 0.05); } return u.x - x0; };
  const a = run([], 'spear'), m = run(['moat'], 'spear'); assert(a > 0 && Math.abs(m / a - 0.65) < 0.02, 'yakin dovuscu %35 yavas ' + a + ' ' + m);
  const ra = run([], 'archer'), rm = run(['moat'], 'archer'); assert(Math.abs(ra - rm) < 1e-9, 'okcu etkilenmez (zaten menzilde durur ya da ayni hiz)');
  ok('Hendek: kalenin önündeki yakın dövüşçü %35 yavaşlar, okçu etkilenmez'); }

// 4) Yardim ordusu: uyari + her koridora dalga, yalniz kural varken
{ const b = mk(30, ['relief']), t0 = b.units.length; const ev = []; let warned = false, came = false;
  for (let i = 0; i < 2600 && !b.over; i++) { b.update(0.05); b.drain().forEach(e => { if (e.type === 'reliefWarn') warned = true; if (e.type === 'relief') { came = true; ev.push(b.t); } }); b.base[0].hp = b.base[0].max; if (came) break; }
  assert(warned && came && Math.abs(ev[0] - b.reliefAt) < 0.2, 'yardim ordusu zamaninda geldi ' + ev[0] + ' / ' + b.reliefAt);
  const none = mk(30, []); let c2 = false; for (let i = 0; i < 2600; i++) { none.update(0.05); none.base[0].hp = none.base[0].max; none.base[1].hp = none.base[1].max; if (none.drain().some(e => e.type === 'relief')) c2 = true; } assert(!c2, 'kuralsiz yardim ordusu yok');
  ok('Yardım Ordusu: kuralı olan bölümde uyarı + dalga (' + b.reliefAt + '. sn), olmayanda yok'); }

// 5) Gedik: kale yariya inince bir kez; kale oklari %40 azalir, saldirgan hasari +%10
{ const b = mk(10, []); const e0 = b.base[1].max; let breach = 0; b.hitBase(1, e0 * 0.4, 'spear'); b.drain(); assert(!b.breached, '%60te gedik yok');
  b.hitBase(1, e0 * 0.15, 'spear'); b.drain().forEach(e => { if (e.type === 'breach') breach++; }); assert(b.breached && breach === 1, 'gedik bir kez'); b.hitBase(1, 1, 'spear'); assert(b.drain().every(e => e.type !== 'breach'), 'tekrar yok');
  const h0 = b.base[1].hp; b.hitBase(1, 100, 'spear'); assert(Math.abs((h0 - b.base[1].hp) - 110) < 1e-6, 'gedikte hasar +%10');
  const s = mk(10, ['survive']); s.hitBase(1, 5, 'spear'); assert(!s.breached, 'ablukada (yikilamaz kale) gedik yok');
  ok('Gedik: kale %50\'ye inince bir kez tetiklenir, saldırgan hasarı +%10; ablukada tetiklenmez'); }

// 6) Savas bozulmadan biter: butun kurallarla rastgele botsuz kisa kosu (cokme yok)
{ ['moat', 'relief', 'survive', 'fortress', 'ambush'].forEach(r => { const b = mk(40, [r], 9); for (let i = 0; i < 1200 && !b.over; i++) { if (i % 20 === 0) { b.gold = 999; b.cooldown.spear = 0; b.deploy('spear', i % 3); } b.update(0.05); b.drain(); } assert(Number.isFinite(b.t), r + ' calisti'); });
  ok('Tüm yeni/yeniden adlanan kurallarla savaş döngüsü çökmeden çalışır'); }

// 7) Sifaci dusman kalesini gecip gitmez; onunde dusman yokken kale onunde (200 birim) durur
{ const b = mk(10, []); const h = b.spawn(0, 'healer', 1); b.units.forEach(e => { if (e !== h) e.dead = true; }); b.base[0].hp = b.base[0].max = 1e9; b.base[1].hp = b.base[1].max = 1e9;
  for (let i = 0; i < 4000; i++) { h.atkCd = 99; b.stepUnit(h, 0.05); } assert(h.x <= 1110 - 190 && h.x >= 1110 - 215 && !h.moving, 'sifaci kale onunde durdu: x=' + Math.round(h.x));
  const e = mk(10, []); const eh = e.spawn(1, 'healer', 1); e.units.forEach(u => { if (u !== eh) u.dead = true; }); for (let i = 0; i < 4000; i++) { eh.atkCd = 99; e.stepUnit(eh, 0.05); } assert(eh.x >= 170 + 190 && eh.x <= 170 + 215, 'dusman sifaci da oyuncu kampinin onunde durur: x=' + Math.round(eh.x));
  ok('Şifacı: önünde düşman kalmayınca kalenin 200 birim önünde durur, kuleyi geçmez (iki taraf için)'); }

// 8) Dusman en cok askerimin oldugu koridordan cikar
{ [0, 1, 2].forEach(L => { const b = mk(20, []); b.units.length = 0; for (let k = 0; k < 4; k++) { const u = b.spawn(0, 'spear', L); u.x = 600; } b.ai.gold = 1e6; const before = b.units.length;
    for (let i = 0; i < 12; i++) { b.ai.think = 0; b.ai.pending = null; b.updateAI(0.05); } const spawned = b.units.filter(u => u.team === 1);
    assert(spawned.length >= 6 && spawned.every(u => u.lane === L), 'dusman ' + L + '. koridordan cikmali: ' + spawned.map(u => u.lane).join('')); });
  const c = mk(20, []); c.units.length = 0; for (let k = 0; k < 2; k++) c.spawn(0, 'spear', 0).x = 500; for (let k = 0; k < 5; k++) c.spawn(0, 'spear', 2).x = 500; c.ai.gold = 1e6; for (let i = 0; i < 10; i++) { c.ai.think = 0; c.ai.pending = null; c.updateAI(0.05); }
  assert(c.units.filter(u => u.team === 1).every(u => u.lane === 2), 'en kalabalik koridor secilir');
  ok('Düşman, en çok askerimin olduğu koridordan çıkar (her koridor için doğrulandı)'); }

// 9) Elmas fiyatlari satin alma paketlerine uyumlu: ilk kahraman baslangic paketiyle (300) alinir, sonrakiler buyuk paketlere yonlendirir
{ const packs = Z.MONEY.products.filter(p => p.type === 'gems').map(p => p.gems).sort((a, b) => a - b), starter = Z.MONEY.products.filter(p => p.type === 'starter')[0].gems;
  const hp = Z.HERO_ORDER.filter(h => Z.HEROES[h].gems > 0).map(h => Z.HEROES[h].gems); assert(hp.every((v, i) => i === 0 || v > hp[i - 1]), 'kahraman fiyatlari artar');
  assert(hp[0] <= starter && hp[0] > packs[0], 'ilk kahraman baslangic paketiyle (' + starter + ') alinir, en kucuk paketle (' + packs[0] + ') alinamaz');
  hp.forEach(v => assert(v <= packs[packs.length - 1] && v > packs[0], 'kahraman fiyati paket araliginda: ' + v));
  Z.MARKET.forEach(m => assert(m.gems > 0 && m.gems <= packs[1], 'pazar urunu tek paketle alinabilir: ' + m.id)); assert(Z.WHEEL_COST >= 10 && Z.WHEEL_COST <= 30, 'cark ucreti');
  ok('Elmas fiyatları: kahramanlar ' + hp.join('/') + ' (ilk kahraman başlangıç paketine uyar), pazar ürünleri tek paketle alınır'); }
console.log(n + ' test geçti');
