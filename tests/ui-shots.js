// Ekran goruntusu seti (gorsel inceleme araci, assert yok): node tests/ui-shots.js <outdir> [lang=tr] [WxH=412x915] [only=a,b,c]
// Ekranlar: home map army shop vault quests brief-lane brief-field brief-boss settings lang battle-lane battle-field result-win result-lose perk
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const out = process.argv[2], lang = process.argv[3] || 'tr', [W, H] = (process.argv[4] || '412x915').split('x').map(Number), only = (process.argv[5] || '').split(',').filter(Boolean);
if (!out) { console.log('kullanim: node tests/ui-shots.js <outdir> [lang] [WxH] [only]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const URL = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
const LOC = { tr: 'tr-TR', en: 'en-US', es: 'es-ES', pt: 'pt-BR', ru: 'ru-RU', zh: 'zh-CN' };
const stars = {}; for (let i = 1; i <= 29; i++) stars[i] = (i % 3) + 1;
const save = JSON.stringify({ v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.10', cleared: 29, coins: 4200, gems: 180, stars, stats: { totalStars: 58, wins: 29 }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 3 } });
const wait = (p, ms) => p.waitForTimeout(ms);
const SCREENS = {
  home: async p => { await wait(p, 600); },
  map: p => p.evaluate(() => Z.UI.showHub('map')),
  army: p => p.evaluate(() => Z.UI.showHub('army')),
  shop: p => p.evaluate(() => Z.UI.showHub('shop')),
  vault: p => p.evaluate(() => Z.UI.showHub('vault')),
  quests: p => p.evaluate(() => Z.UI.showHub('quests')),
  'brief-lane': p => p.evaluate(() => { Z.UI.showHub('map'); Z.UI.levelModal(6); }),
  'brief-field': p => p.evaluate(() => { Z.UI.showHub('map'); Z.UI.levelModal(8); }),
  'brief-boss': p => p.evaluate(() => { Z.UI.showHub('map'); Z.UI.levelModal(10); }),
  settings: p => p.evaluate(() => { Z.UI.showHub('map'); Z.UI.settingsModal(); }),
  lang: p => p.evaluate(() => { Z.UI.showHub('map'); Z.UI.langModal(false); }),
  'battle-lane': async p => {
    await p.evaluate(() => { Z.UI.closeModal && Z.UI.closeModal(); Z.Game.startBattle('campaign', 12, { diff: 1, boosters: [] }); });
    for (let i = 0; i < 14; i++) { await p.evaluate(i => { const b = Z.Game.battle; b.gold = 2000; ['spear', 'archer', 'cav', 'knight'].forEach(t => { b.cooldown[t] = 0; }); b.deploy(['spear', 'archer', 'cav', 'knight'][i % 4], i % 3); }, i); await wait(p, 380); }
    await wait(p, 1500);
  },
  'battle-field': async p => {
    await p.evaluate(() => { Z.Game.startBattle('campaign', 8, { diff: 1, boosters: [] }); }); await wait(p, 1200);
    await p.evaluate(() => { const b = Z.Game.battle; b.autoPlace(); b.startBattle(); }); await wait(p, 6500);
  },
  'result-win': async p => { await p.evaluate(() => { Z.Game.startBattle('campaign', 12, { diff: 1, boosters: [] }); }); await wait(p, 800); await p.evaluate(() => { Z.Game.battle.hitBase(1, 1e9, 'spear'); }); await wait(p, 4500); },
  'result-lose': async p => { await p.evaluate(() => { Z.Game.startBattle('campaign', 12, { diff: 1, boosters: [] }); }); await wait(p, 800); await p.evaluate(() => { Z.Game.battle.hitBase(0, 1e9, 'spear'); }); await wait(p, 4500); },
};
(async () => {
  const b = await chromium.launch(); let first = true;
  const names = Object.keys(SCREENS).filter(n => !only.length || only.includes(n));
  for (const name of names) {
    const ctx = await b.newContext({ locale: LOC[lang] || 'tr-TR', viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await ctx.addInitScript(([l, s]) => { try { if (!localStorage.getItem('__i')) { localStorage.setItem('__i', '1'); localStorage.setItem('sefervakti.lang', l); localStorage.setItem('zafarion.save.v1', s); } } catch (e) {} }, [lang, save]);
    const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERR', name, e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', name, m.text().slice(0, 160)); });
    try {
      await p.goto(URL); await p.waitForFunction(() => globalThis.Z && Z.ready, null, { timeout: 15000 }); await wait(p, 900);
      await SCREENS[name](p); await wait(p, 500);
      await p.screenshot({ path: path.join(out, name + '.png') }); console.log('ok', name);
    } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); }
    await ctx.close();
  }
  await b.close();
})();
