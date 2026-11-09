// Sahte dil denetimi: 'xx' dilinde her cevrilmis metin ⟦...⟧ icine alinir. Ekranda ⟦⟧ disinda harf kalan metin = sarilmamis (cevrilmeyecek) metin.
// node tests/i18n-audit.js
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(); const problems = new Map(); const seenScreens = [];
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'tr-TR' });
  const stars = {}; for (let i = 1; i <= 60; i++) stars[i] = 2;
  await ctx.addInitScript((st) => { try { localStorage.setItem('sefervakti.lang', 'xx'); localStorage.setItem('zafarion.save.v1', JSON.stringify({ v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.9', cleared: 60, coins: 5000, gems: 100, stars: st, stats: { totalStars: 120, wins: 60 }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } })); } catch (e) {} }, stars);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const scan = async (name) => {
    const bad = await p.evaluate(() => {
      const txt = document.getElementById('stage').innerText.replace(/⟦[\s\S]*?⟧/g, ' ');
      return txt.split('\n').map(l => l.trim()).filter(l => /[A-Za-zçğıöşüÇĞİÖŞÜ]{2,}/.test(l)); });
    bad.forEach(b => { if (!/^(SEFER|VAKTİ|SEFER VAKTİ|Türkçe|English|Español|Português|Русский|简体中文)/.test(b) && !problems.has(b)) problems.set(b, name); }); seenScreens.push(name);
  };
  const go = async (code, arg) => { await p.evaluate(code, arg); await p.waitForTimeout(350); };
  await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(1200);
  await scan('ana menu');
  await go(() => Z.UI.settingsModal()); await scan('ayarlar'); await go(() => Z.UI.langModal(false)); await scan('dil'); await go(() => Z.UI.closeModal());
  await go(() => Z.UI.exportModal && Z.UI.exportModal());
  for (const tab of ['map', 'army', 'vault', 'quests', 'shop']) { await go((t) => { Z.UI.showHub(t); }, tab).catch(() => {}); await scan('sekme ' + tab); }
  await go(() => { Z.UI.showHub('map'); }); 
  for (const lv of [1, 3, 8, 13, 5, 16, 14, 40]) { await go((l) => Z.UI.levelModal(l), lv); await scan('brifing ' + lv); await go(() => Z.UI.closeModal()); }
  await go(() => Z.UI.dailyModal()); await scan('gunluk modal'); await go(() => Z.UI.closeModal());
  await go(() => Z.UI.endlessModal()); await scan('sonsuz modal'); await go(() => Z.UI.closeModal());
  await go(() => Z.UI.whatsNew()); await scan('yenilikler'); await go(() => Z.UI.closeModal());
  await go(() => { Z.Save.data.daily.claimedToday = false; Z.UI.welcome(); }); await scan('hosgeldin/gunluk odul'); await go(() => Z.UI.closeModal());
  // kale savasi + ogretici
  await go(() => { Z.Save.data.tutorialDone2 = false; Z.Game.startBattle('campaign', 1); });
  for (let i = 0; i < 7; i++) { await scan('ogretici ' + (i + 1)); await p.evaluate(() => { const ok = document.getElementById('tut-ok'); if (ok && !ok.classList.contains('hidden')) ok.click(); else { const b = Z.Game.battle; b.gold = 400; b.cooldown[b.deck[0]] = 0; b.deploy(b.deck[0], 0); b.useSkill(1); if (b.mineCost()) b.upgradeMine(); } }); await p.waitForTimeout(300); }
  await go(() => { Z.UI.tutStop(true); Z.Game.battle.gold = 500; Z.Game.battle.stats.kills = Z.PERK_KILLS[0]; }); await p.waitForTimeout(800); await scan('ganimet'); await go(() => { const m = document.querySelector('.perk'); if (m) m.click(); });
  await go(() => Z.Game.pause()); await scan('duraklat'); await go(() => Z.Game.resume());
  await go(() => { Z.Game.battle.base[1].hp = 0; }); await p.waitForTimeout(2600); await scan('sonuc zafer');
  await go(() => { Z.Game.toMenu('map'); Z.Game.startBattle('campaign', 6); Z.Game.battle.base[0].hp = 0; }); await p.waitForTimeout(2600); await scan('sonuc yenilgi');
  await go(() => Z.Game.startBattle('endless', 1)); await scan('sonsuz HUD'); await go(() => { Z.Game.battle.base[0].hp = 0; }); await p.waitForTimeout(2600); await scan('sonuc sonsuz');
  // acik alan
  await go(() => { Z.Game.toMenu('map'); Z.Save.data.fieldTutDone = false; Z.Game.startBattle('campaign', 8); }); await scan('acik alan hazirlik'); await go(() => { Z.Game.battle.autoPlace(); Z.Game.battle.startBattle(); }); await p.waitForTimeout(1500); await scan('acik alan savas');
  await go(() => { Z.Game.battle.kill(Z.Game.battle.cmdE); }); await p.waitForTimeout(2600); await scan('acik alan sonuc');
  await go(() => { Z.Game.toMenu('map'); Z.Game.startBattle('campaign', 9); Z.Game.battle.phase = 'battle'; Z.Game.battle.kill(Z.Game.battle.cmdP); }); await p.waitForTimeout(2600); await scan('acik alan yenilgi');
  console.log('Taranan ekranlar:', seenScreens.length); console.log('Sayfa hatalari:', errs.length ? errs : 'yok');
  console.log('Sarilmamis metinler (' + problems.size + '):'); for (const [k, v] of problems) console.log('  [' + v + '] ' + JSON.stringify(k));
  await browser.close();
})();
