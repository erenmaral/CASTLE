// Bolum zorlugu kalibrasyonu: her bolum icin, o bolumdeki tipik oyuncu durumuyla botun HEDEF kazanma oranini veren dusman carpanini bulur.
//   node tests/calibrate.js <lane|field> <durum.json> <cikti.json> [parca=0/1] [tohum=14]
// durum.json: tests/progression.js'in OUT=... ciktisi. Patron bolumleri atlanir (carpan ayni egriden gelir, patron birimi zaten x3 can).
const fs = require('fs');
const { Z, botBattle } = require('./botlib');
const [kind, stateFile, outFile, part = '0/1', seedsArg = '14'] = process.argv.slice(2);
const SEEDS = +seedsArg, [pi, pn] = part.split('/').map(Number), state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
// hedef kazanma orani (tek denemede): erken kolay -> gec zorlu
const KNOTS = [[1, 0.97], [10, 0.9], [25, 0.8], [45, 0.7], [70, 0.62], [105, 0.55]];
const target = L => { for (let i = 1; i < KNOTS.length; i++) if (L <= KNOTS[i][0]) { const a = KNOTS[i - 1], b = KNOTS[i]; return a[1] + (b[1] - a[1]) * (L - a[0]) / (b[0] - a[0]); } return KNOTS[KNOTS.length - 1][1]; };
function winRate(L, s) {
  const st = state[L], deck = Z.UNIT_ORDER.filter(u => L - 1 >= Z.UNLOCK_AT[u]).slice(0, 5);
  Z.SCALE_OVERRIDE = { lane: {}, field: {} }; Z.SCALE_OVERRIDE[kind][L] = s;
  const sv = { unitLvl: st.units, heroLvl: { aslan: st.hero, yildiz: 1, demir: 1, buz: 1, ejder: 1 }, castleLvl: st.castle };
  let w = 0; for (let i = 1; i <= SEEDS; i++) if (botBattle(L, sv, deck, i * 131 + L).result.win) w++;
  return w / SEEDS;
}
const out = {};
for (let L = 1, k = 0; L <= Z.MAX_LEVEL; L++) {
  if ((Z.levelType(L) === 'field') !== (kind === 'field') || Z.isBoss(L) || !state[L]) continue;
  if ((k++ % pn) !== pi) continue;
  const T = target(L); let lo = Math.log(0.4), hi = Math.log(6), best = { s: 1, w: 0 };
  for (let it = 0; it < 8; it++) { const mid = (lo + hi) / 2, s = Math.exp(mid), w = winRate(L, s); if (Math.abs(w - T) <= Math.abs(best.w - T) || it === 0) best = { s, w }; if (w > T) lo = mid; else hi = mid; }
  out[L] = { s: +best.s.toFixed(3), w: +best.w.toFixed(2), T: +T.toFixed(2) }; process.stderr.write(kind + ' L' + L + ' s=' + best.s.toFixed(2) + ' w=' + best.w.toFixed(2) + ' (hedef ' + T.toFixed(2) + ')\n');
  fs.writeFileSync(outFile, JSON.stringify(out));
}
fs.writeFileSync(outFile, JSON.stringify(out));
