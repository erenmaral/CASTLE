// Denge testi: basit bir bot ile kampanyayi simule eder.
// Kullanim:  node tests/sim-balance.js [seedSayisi] [seviyeBonusu]
//   seviyeBonusu: botun birlik seviyesine eklenen deger (negatif = gerideki oyuncu)
const path = require('path');
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
['version', 'data', 'save', 'sim'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z;

const SEEDS = +process.argv[2] || 12;
const LVL_BONUS = +(process.argv[3] || 0);

function makeSave(L) {
  const lvl = Math.min(Z.MAX_UNIT_LVL, Math.max(1, 1 + Math.floor(L * 0.4) + LVL_BONUS));
  const unitLvl = {}; Z.UNIT_ORDER.forEach(u => (unitLvl[u] = lvl));
  const heroLvl = { aslan: 1 + Math.floor(L / 5), yildiz: 1, demir: 1 };
  return { unitLvl, heroLvl, castleLvl: 1 + Math.floor(L / 6) };
}
function unlockedAt(L) { return Z.UNIT_ORDER.filter(u => L - 1 >= Z.UNLOCK_AT[u]); }

function playBot(mode, L, seed) {
  const sv = makeSave(L);
  const deck = process.env.DECK ? process.env.DECK.split(',') : unlockedAt(L).slice(0, 5);
  const b = new Z.Battle({ mode, level: L, save: sv, deck, hero: 'aslan', seed });
  const rng = Z.mulberry32(seed * 7 + 1);
  let tick = 0;
  const maxT = mode === 'endless' ? 900 : 420;
  while (!b.over && b.t < maxT) {
    if (b.perkOffer) b.pickPerk(b.perkOffer[0]); // bot: ilk ganimeti al
    b.update(1 / 30);
    b.drain();
    tick -= 1 / 30;
    if (tick > 0) continue;
    tick = 0.35;
    const wantMine = L >= 6 ? 3 : 2;
    if (b.mine < wantMine && b.t > 5 && b.gold >= (b.mineCost() || 1e9) && b.t < 120) b.upgradeMine();
    // koridor tehdidi
    const th = [0, 0, 0], cls = [{}, {}, {}];
    b.units.forEach(u => {
      if (u.team !== 1) return;
      const closeness = 1 - (u.x - Z.C.PF) / (Z.C.EF - Z.C.PF);
      th[u.lane] += u.hp * (0.4 + closeness);
      cls[u.lane][u.cls] = (cls[u.lane][u.cls] || 0) + u.hp;
    });
    let lane = th.indexOf(Math.max(...th));
    if (th[lane] === 0) lane = Math.floor(rng() * 3);
    let dom = null, dv = 0; for (const c in cls[lane]) if (cls[lane][c] > dv) { dv = cls[lane][c]; dom = c; }
    let pick = Z.COUNTER[dom];
    if (!pick || deck.indexOf(pick) < 0 || rng() < 0.25) pick = deck[Math.floor(rng() * deck.length)];
    if (!b.canDeploy(pick)) {
      // en pahali oynanabilir olani dene
      const opts = deck.filter(u => b.canDeploy(u));
      if (opts.length && b.gold > b.goldCap() * 0.7) pick = opts[Math.floor(rng() * opts.length)]; else pick = null;
    }
    if (pick) b.deploy(pick, lane);
    if (b.skillReady()) {
      const h = Z.HEROES[b.heroId];
      if (h.target === 'none') { if (b.units.filter(u => u.team === 0).length >= 4) b.useSkill(); }
      else b.useSkill(lane);
    }
  }
  if (!b.over) b.finish(false);
  return b;
}

if (process.argv[4] === 'endless') {
  for (const L of [1, 8, 16, 24]) {
    const waves = []; for (let s = 1; s <= SEEDS; s++) waves.push(playBot('endless', L, s).result.wave);
    console.log('endless (bot seviyesi ~L' + L + '): ortalama dalga', (waves.reduce((a, c) => a + c, 0) / waves.length).toFixed(1), 'min', Math.min(...waves), 'max', Math.max(...waves));
  }
  process.exit(0);
}

console.log('Seviye | kazanma | ort. sure | ort. yildiz | birlik sv.');
let totalWins = 0, n = 0;
const LMIN = +(process.env.LMIN || 1), LMAX = +(process.env.LMAX || Z.MAX_LEVEL);
for (let L = LMIN; L <= LMAX; L++) {
  let wins = 0, time = 0, stars = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const b = playBot('campaign', L, s * 101 + L);
    if (b.result.win) { wins++; stars += b.result.stars; }
    time += b.t;
  }
  totalWins += wins; n += SEEDS;
  console.log(String(L).padStart(6), '|', (Math.round(100 * wins / SEEDS) + '%').padStart(7), '|', (time / SEEDS).toFixed(0).padStart(7) + 's', '|',
    (wins ? (stars / wins).toFixed(2) : '-').padStart(10), '|', makeSave(L).unitLvl.spear + (Z.isBoss(L) ? '  (patron)' : ''));
}
console.log('Genel kazanma: ' + Math.round(100 * totalWins / n) + '%');
