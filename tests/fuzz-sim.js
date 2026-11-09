// Simulasyon fuzz testi: rastgele bolum/deste/kahraman/kural/zorluk/kart ile yuzlerce savas; NaN, istisna, bitmeyen savas arar.
//   node tests/fuzz-sim.js [savasSayisi=400] [tohum=1]
const { Z } = require('./botlib');
const N = +process.argv[2] || 400; let seed = +process.argv[3] || 1;
const rng = Z.mulberry32(seed * 977 + 3), ri = (a, b) => a + Math.floor(rng() * (b - a + 1)), pick = a => a[Math.floor(rng() * a.length)];
const problems = []; let ended = 0, timeouts = 0;
function check(b, tag) {
  for (const u of b.units) { if (!Number.isFinite(u.hp) || !Number.isFinite(u.x) || (b.kind === 'field' && !Number.isFinite(u.y))) return problems.push(tag + ' birim NaN ' + u.type + ' hp=' + u.hp + ' x=' + u.x); }
  if (!Number.isFinite(b.gold) || !Number.isFinite(b.t)) problems.push(tag + ' altin/zaman NaN');
  if (b.base) b.base.forEach((x, i) => { if (!Number.isFinite(x.hp) && x.hp !== Infinity && x.hp < 1e8) problems.push(tag + ' kale hp ' + i + '=' + x.hp); });
}
for (let k = 0; k < N; k++) {
  const L = ri(1, Z.MAX_LEVEL), field = Z.levelType(L) === 'field' && rng() < 0.9, unlocked = Z.UNIT_ORDER.filter(u => L - 1 >= Z.UNLOCK_AT[u]), deck = []; // %10: kale kuralini acik alan seviyede zorla degil, yalnizca tipi
  const nd = ri(1, Math.min(5, unlocked.length)); while (deck.length < nd) { const u = pick(unlocked); if (deck.indexOf(u) < 0) deck.push(u); }
  const sv = { unitLvl: {}, heroLvl: { aslan: ri(1, 30), yildiz: ri(1, 30), demir: 1, buz: 1, ejder: ri(1, 30) }, castleLvl: ri(1, 30) }; Z.UNIT_ORDER.forEach(u => (sv.unitLvl[u] = ri(1, 40)));
  const hero = pick(['aslan', 'yildiz', 'demir', 'buz', 'ejder']), diff = ri(0, 2), tag = (field ? 'ACIK' : 'KALE') + ' L' + L + ' #' + k;
  try {
    const b = field ? new Z.FieldBattle({ level: L, save: sv, deck, hero, diff, seed: ri(1, 1e6) }) : new Z.Battle({ mode: pick(['campaign', 'campaign', 'endless']), level: L, save: sv, deck, hero, diff, seed: ri(1, 1e6) });
    if (rng() < 0.5) b.applyBoosters(['gold', 'skill', 'shield'].filter(() => rng() < 0.6));
    if (field) { if (rng() < 0.7) b.autoPlace(); else for (let i = 0; i < 8; i++) b.place(pick(deck), ri(0, 720), ri(560, 840)); if (!b.startBattle()) problems.push(tag + ' savas baslamadi'); }
    let tick = 0; const maxT = field ? 520 : (b.mode === 'endless' ? 700 : 520);
    while (!b.over && b.t < maxT) {
      if (b.perkOffer) b.pickPerk(pick(b.perkOffer));
      b.update(rng() < 0.2 ? 0.1 : 1 / 30); b.drain(); tick -= 1 / 30; // kare suresi dalgalanir
      if (tick <= 0) { tick = 0.2 + rng() * 0.6;
        const t = pick(deck);
        if (field) { b.place(t, ri(-50, 770), ri(300, 900)); if (rng() < 0.3) b.setStance(pick(['attack', 'defend'])); if (rng() < 0.2) b.upgradeMine(); if (b.skillReady()) b.useSkill(ri(-50, 770), ri(-50, 900)); if (rng() < 0.05 && b.units.length) b.moveUnit(pick(b.units).id, ri(0, 720), ri(0, 840)); }
        else { b.deploy(t, ri(-1, 3)); if (rng() < 0.2) b.upgradeMine(); if (b.skillReady()) b.useSkill(ri(-1, 3)); }
        check(b, tag);
      }
    }
    if (b.over) { ended++; if (!b.result || typeof b.result.win !== 'boolean') problems.push(tag + ' sonuc yok'); } else { timeouts++; if (!(b.mode === 'endless')) problems.push(tag + ' savas bitmedi t=' + Math.round(b.t)); }
  } catch (e) { problems.push(tag + ' ISTISNA: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); }
}
const uniq = [...new Set(problems)];
console.log('savas:', N, '· biten:', ended, '· zaman asimi (sonsuz modda normal):', timeouts); console.log(uniq.length ? 'SORUNLAR (' + uniq.length + '):\n' + uniq.slice(0, 20).join('\n') : 'Sorun bulunamadi'); process.exit(uniq.length ? 1 : 0);
