// Ortak denge botu (kale + acik alan): tests/progression.js ve tests/calibrate.js kullanir.
const path = require('path');
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
['version', 'i18n', 'data', 'save', 'monetize-config', 'monetize', 'sim', 'field'].forEach(f => require(path.join('..', 'www', 'js', f + '.js')));
const Z = globalThis.Z;
function botBattle(L, sv, deck, seed) {
  const field = Z.levelType(L) === 'field';
  const b = field ? new Z.FieldBattle({ level: L, save: sv, deck, hero: 'aslan', seed }) : new Z.Battle({ mode: 'campaign', level: L, save: sv, deck, hero: 'aslan', seed });
  const rng = Z.mulberry32(seed * 7 + 1); let tick = 0;
  if (field) { b.autoPlace(); b.startBattle(); }
  const maxT = field ? 500 : 420;
  while (!b.over && b.t < maxT) {
    if (b.perkOffer) b.pickPerk(b.perkOffer[0]);
    b.update(1 / 30); b.drain(); tick -= 1 / 30; if (tick > 0) continue; tick = field ? 0.6 : 0.35;
    if (field) {
      if (b.mine < 2 && b.gold >= (b.mineCost() || 1e9) && b.t < 100) b.upgradeMine();
      const pick = deck.filter(u => b.canDeploy(u)); if (pick.length && b.gold > 60) b.place(pick[Math.floor(rng() * pick.length)], 120 + rng() * 480, Z.FH - 40);
      if (b.skillReady()) { const h = Z.HEROES[b.heroId]; if (h.target === 'none') { if (b.countTeam(0) >= 6) b.useSkill(); } else { const e = b.units.filter(u => u.team === 1 && !u.commander); if (e.length >= 4) { const t = e[Math.floor(rng() * e.length)]; b.useSkill(t.x, t.y); } } }
    } else {
      const wantMine = L >= 6 ? 3 : 2; if (b.mine < wantMine && b.t > 5 && b.gold >= (b.mineCost() || 1e9) && b.t < 120) b.upgradeMine();
      const th = [0, 0, 0], cls = [{}, {}, {}];
      b.units.forEach(u => { if (u.team !== 1) return; const c = 1 - (u.x - Z.C.PF) / (Z.C.EF - Z.C.PF); th[u.lane] += u.hp * (0.4 + c); cls[u.lane][u.cls] = (cls[u.lane][u.cls] || 0) + u.hp; });
      let lane = th.indexOf(Math.max(...th)); if (th[lane] === 0) lane = Math.floor(rng() * 3);
      let dom = null, dv = 0; for (const c in cls[lane]) if (cls[lane][c] > dv) { dv = cls[lane][c]; dom = c; }
      let pick = Z.COUNTER[dom]; if (!pick || deck.indexOf(pick) < 0 || rng() < 0.25) pick = deck[Math.floor(rng() * deck.length)];
      if (!b.canDeploy(pick)) { const o = deck.filter(u => b.canDeploy(u)); pick = o.length && b.gold > b.goldCap() * 0.7 ? o[Math.floor(rng() * o.length)] : null; }
      if (pick) b.deploy(pick, lane);
      if (b.skillReady()) { const h = Z.HEROES[b.heroId]; if (h.target === 'none') { if (b.units.filter(u => u.team === 0).length >= 4) b.useSkill(); } else b.useSkill(lane); }
    }
  }
  if (!b.over) b.finish(false);
  return b;
}
module.exports = { Z, botBattle };
