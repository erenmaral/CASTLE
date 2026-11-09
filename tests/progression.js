// Ilerleme simulatoru: gercekci bir oyuncu kampanyayi oynar, kazandigi altini birlik/kahraman/kale yukseltmelerine harcar.
//   node tests/progression.js [oyuncuSayisi=6] [ekstraGelir=0.5]     (env: LMAX, VERBOSE=1)
// ekstraGelir: hazine/gunluk/gorev gibi savas disi gelirin, savas odulune orani (0.5 = %50 ek gelir).
const { Z, botBattle } = require('./botlib');
const S = Z.Save;
const PLAYERS = +process.argv[2] || 6, EXTRA = process.argv[3] !== undefined ? +process.argv[3] : 0.5, LMAX = +(process.env.LMAX || Z.MAX_LEVEL);

function spend(d) { // en dusuk "normallestirilmis seviyeli" kalemi yukselt
  for (;;) {
    const items = [];
    d.deck.forEach(u => { if (d.unitLvl[u] < Z.MAX_UNIT_LVL) items.push({ k: 'u:' + u, v: d.unitLvl[u], cost: Z.unitUpgradeCost(d.unitLvl[u]) }); });
    if (d.castleLvl < Z.MAX_CASTLE_LVL) items.push({ k: 'castle', v: d.castleLvl * 1.6, cost: Z.castleUpgradeCost(d.castleLvl) });
    if (d.heroLvl.aslan < Z.MAX_HERO_LVL) items.push({ k: 'hero', v: d.heroLvl.aslan * 1.6, cost: Z.heroUpgradeCost(d.heroLvl.aslan) });
    items.sort((a, b) => a.v - b.v); const it = items.find(x => x.cost <= d.coins); if (!it) return;
    // en dusuk kalem odenemiyorsa biriktir (en dusuk 2 kalem icinde ode)
    if (items.indexOf(it) > 1) return;
    d.coins -= it.cost; if (it.k === 'castle') d.castleLvl++; else if (it.k === 'hero') d.heroLvl.aslan++; else d.unitLvl[it.k.slice(2)]++;
  }
}
const res = []; for (let L = 0; L <= LMAX; L++) res.push({ lvl: 0, tries: 0, wins: 0, n: 0, units: {}, castle: 0, hero: 0 });
for (let p = 0; p < PLAYERS; p++) {
  S.reset(); const d = S.data; d.deck = ['spear', 'archer', 'cav']; d.coins = 150; let stuck = 0;
  for (let L = 1; L <= LMAX; L++) {
    let won = false, tries = 0;
    while (!won && tries < 6) {
      d.deck = Z.UNIT_ORDER.filter(u => L - 1 >= Z.UNLOCK_AT[u]).slice(0, 5);
      const b = botBattle(L, { unitLvl: d.unitLvl, heroLvl: d.heroLvl, castleLvl: d.castleLvl }, d.deck, p * 1000 + L * 10 + tries + 1);
      tries++; const out = Z.settleBattle(b, S); won = b.result.win;
      if (won) d.coins += Math.round(out.coins * EXTRA); else d.coins += Math.round(40 + 6 * L); // yenilgide kucuk ek gelir (hazine)
      spend(d);
    }
    const r = res[L]; Z.UNIT_ORDER.forEach(u => { r.units[u] = (r.units[u] || 0) + d.unitLvl[u]; }); r.castle += d.castleLvl; r.hero += d.heroLvl.aslan; r.n++; r.tries += tries; r.wins += won ? 1 : 0; r.lvl += (d.deck.reduce((a, u) => a + d.unitLvl[u], 0) / d.deck.length);
    if (!won) { stuck++; d.cleared = Math.max(d.cleared, L); } // 6 denemede gecemediyse atlandi say (zorlugu isaretler)
  }
}
let line = 'Bolum | tur | ort. birlik sv | gecme denemesi | 6 denemede gecen';
console.log(line);
for (let L = 1; L <= LMAX; L++) { const r = res[L]; if (!process.env.VERBOSE && L % 5 !== 0 && L !== 1 && L !== LMAX && r.tries / r.n < 2.2) continue; console.log(String(L).padStart(5), '|', (Z.levelType(L) === 'field' ? 'acik ' : 'kale ').padEnd(5), '|', (r.lvl / r.n).toFixed(1).padStart(12), '|', (r.tries / r.n).toFixed(2).padStart(14), '|', Math.round(100 * r.wins / r.n) + '%'); }

if (process.env.OUT) { // kalibrasyon icin: bolum basina ortalama oyuncu durumu
  const st = {}; for (let L = 1; L <= LMAX; L++) { const r = res[L], u = {}; Z.UNIT_ORDER.forEach(k => { u[k] = +((r.units[k] || 0) / r.n).toFixed(2); }); st[L] = { units: u, castle: +(r.castle / r.n).toFixed(2), hero: +(r.hero / r.n).toFixed(2) }; }
  require('fs').writeFileSync(process.env.OUT, JSON.stringify(st)); console.log('durum tablosu ->', process.env.OUT);
}
