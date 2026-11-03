// Acik alan savaslari icin denge botu:  node tests/field-balance.js [seedSayisi] [seviyeBonusu]
// Bot: otomatik dizilis, savasta takviye + yetenek. Yalnizca ACIK ALAN seviyelerini oynar.
const path = require('path');
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
['version', 'data', 'save', 'sim', 'field'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z;
const SEEDS = +process.argv[2] || 8, LVL_BONUS = +(process.argv[3] || 0);
function makeSave(L) {
  const lvl = Math.min(Z.MAX_UNIT_LVL, Math.max(1, 1 + Math.floor(L * 0.4) + LVL_BONUS)), unitLvl = {}; Z.UNIT_ORDER.forEach(u => (unitLvl[u] = lvl));
  return { unitLvl, heroLvl: { aslan: 1 + Math.floor(L / 5), yildiz: 1, demir: 1 }, castleLvl: 1 + Math.floor(L / 6) };
}
const unlockedAt = L => Z.UNIT_ORDER.filter(u => L - 1 >= Z.UNLOCK_AT[u]);
function playField(L, seed, stats) {
  const sv = makeSave(L), deck = process.env.DECK ? process.env.DECK.split(',') : unlockedAt(L).slice(0, 5);
  const b = new Z.FieldBattle({ level: L, save: sv, deck, hero: 'aslan', seed });
  const rng = Z.mulberry32(seed * 7 + 1);
  b.autoPlace(); b.startBattle();
  let tick = 0;
  while (!b.over && b.t < 500) {
    if (b.perkOffer) b.pickPerk(b.perkOffer[0]);
    b.update(1 / 30); b.drain();
    tick -= 1 / 30; if (tick > 0) continue;
    tick = 0.6;
    if (b.mine < 2 && b.gold >= (b.mineCost() || 1e9) && b.t < 100) b.upgradeMine();
    const pick = deck.filter(u => b.canDeploy(u)); // takviye: komutanin yakini
    if (pick.length && b.gold > 60) b.place(pick[Math.floor(rng() * pick.length)], 120 + rng() * 480, Z.FH - 40);
    if (b.skillReady()) {
      const h = Z.HEROES[b.heroId];
      if (h.target === 'none') { if (b.countTeam(0) >= 6) b.useSkill(); }
      else { const e = b.units.filter(u => u.team === 1 && !u.commander); if (e.length >= 4) { const t = e[Math.floor(rng() * e.length)]; b.useSkill(t.x, t.y); } }
    }
  }
  if (!b.over) b.finish(false);
  return b;
}
const LMIN = +(process.env.LMIN || 1), LMAX = +(process.env.LMAX || Z.MAX_LEVEL);
let tw = 0, tn = 0;
console.log('Seviye | hedef      | kazanma | ort. sure | ort. yildiz');
for (let L = LMIN; L <= LMAX; L++) {
  if (Z.levelType(L) !== 'field') continue;
  let wins = 0, time = 0, stars = 0;
  for (let s = 1; s <= SEEDS; s++) { const b = playField(L, s * 101 + L); if (b.result.win) { wins++; stars += b.result.stars; } time += b.t; }
  tw += wins; tn += SEEDS;
  console.log(String(L).padStart(6), '|', Z.fieldObjective(L, [Z.ruleOf(L)]).padEnd(10), '|', (Math.round(100 * wins / SEEDS) + '%').padStart(7), '|', (time / SEEDS).toFixed(0).padStart(8) + 's', '|', (wins ? (stars / wins).toFixed(2) : '-').padStart(10));
}
console.log('Genel kazanma: ' + Math.round(100 * tw / tn) + '%');
