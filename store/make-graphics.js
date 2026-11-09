// Google Play gorselleri: simge (512), one cikan gorsel (1024x500), telefon ekran goruntuleri (1080x1920) - 6 dilde.
// Calistir: node store/make-graphics.js   (Playwright gerekir)  Cikti: store/metadata/android/<yerel>/images/
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..'), URL = 'file://' + path.join(ROOT, 'www', 'index.html');
const LOC = { tr: ['tr-TR', 'tr-TR'], en: ['en-US', 'en-US'], es: ['es-ES', 'es-ES'], pt: ['pt-BR', 'pt-BR'], ru: ['ru-RU', 'ru-RU'], zh: ['zh-CN', 'zh-CN'] };
const TITLE = { tr: 'Kale Kuşatması: Tarih', en: 'Castle Siege: History', es: 'Asedio de Castillos: Historia', pt: 'Cerco de Castelos: História', ru: 'Осада замков: История', zh: '城堡围攻：历史' };
const TAG = { tr: '105 gerçek tarihî kuşatma', en: '105 real historical sieges', es: '105 asedios históricos reales', pt: '105 cercos históricos reais', ru: '105 реальных исторических осад', zh: '105场真实历史围攻战' };
const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(LOC);
const save = JSON.stringify({ v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.10', cleared: 24, coins: 4200, gems: 180, stars: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, (i % 3) + 1])), stats: { totalStars: 48, wins: 24 }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 3 } });
(async () => {
  const b = await chromium.launch();
  for (const lang of only) {
    const dir = path.join(__dirname, 'metadata', 'android', LOC[lang][0], 'images'), ph = path.join(dir, 'phoneScreenshots'); fs.mkdirSync(ph, { recursive: true });
    const ctx = await b.newContext({ locale: LOC[lang][1], viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3, hasTouch: true, isMobile: true });
    await ctx.addInitScript(([l, s]) => { try { if (!localStorage.getItem('__i')) { localStorage.setItem('__i', '1'); localStorage.setItem('sefervakti.lang', l); localStorage.setItem('zafarion.save.v1', s); } } catch (e) {} }, [lang, save]);
    const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto(URL); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(1200);
    const shot = async (n, top) => { await p.waitForTimeout(500); if (top) { await p.evaluate(() => document.querySelectorAll('*').forEach(e => { if (e.scrollTop && e.id !== 'game') e.scrollTop = 0; })); await p.waitForTimeout(150); } await p.screenshot({ path: path.join(ph, n + '.jpg'), type: 'jpeg', quality: 90 }); };
    await p.evaluate(() => Z.UI.showHub('map')); await shot('1-map');
    await p.evaluate(() => Z.UI.levelModal(10)); await shot('2-briefing');
    await p.evaluate(() => { Z.UI.closeModal(); Z.Game.startBattle('campaign', 12, { diff: 1, boosters: [] }); });
    for (let i = 0; i < 16; i++) { await p.evaluate(i => { const bt = Z.Game.battle; bt.gold = 2000; ['spear', 'archer', 'cav', 'knight'].forEach(t => { bt.cooldown[t] = 0; }); bt.deploy(['spear', 'archer', 'cav', 'knight'][i % 4], i % 3); }, i); await p.waitForTimeout(420); }
    await p.waitForTimeout(1800); await shot('3-siege');
    await p.evaluate(() => { Z.Game.startBattle('campaign', 8, { diff: 1, boosters: [] }); }); await p.waitForTimeout(1200);
    await p.evaluate(() => { const bt = Z.Game.battle; bt.autoPlace(); bt.startBattle(); }); await p.waitForTimeout(7000); await shot('4-field');
    await p.evaluate(() => { Z.Game.toMenu ? Z.Game.toMenu() : Z.UI.showHome(); }); await p.waitForTimeout(600);
    await p.evaluate(() => Z.UI.showHub('army')); await shot('5-army', true);
    await p.evaluate(() => Z.UI.showHub('quests')); await shot('6-quests', true);
    // one cikan gorsel: savas goruntusu + baslik
    const fctx = await b.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 }), fg = await fctx.newPage(); const siege = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ph, '3-siege.jpg')).toString('base64'), font = 'file://' + path.join(ROOT, 'www', 'fonts', 'almendra-latin-700-normal.woff2');
        await fg.setContent(`<style>@font-face{font-family:A;src:url(${font});font-weight:700}*{margin:0;box-sizing:border-box}body{width:1024px;height:500px;overflow:hidden;background:#0b1020;position:relative;font-family:A,Georgia,serif}
      .bg{position:absolute;right:0;top:0;width:620px;filter:saturate(1.1)}
      .sh{position:absolute;inset:0;background:linear-gradient(90deg,#0b1020 0%,#0b1020 42%,rgba(11,16,32,.55) 66%,rgba(11,16,32,.1) 100%)}
      .t{position:absolute;left:56px;top:120px;width:470px;color:#ffd24d}.t h1{font-size:${lang === 'zh' ? 62 : 58}px;line-height:1.08;text-shadow:0 3px 0 #6b4a0b,0 8px 24px rgba(0,0,0,.6)}.t p{margin-top:22px;font-size:28px;color:#e9e4d4;font-weight:700}</style>
      <img class="bg" src="${siege}"><div class="sh"></div><div class="t"><h1>${TITLE[lang]}</h1><p>${TAG[lang]}</p></div>`);
    await fg.evaluate(() => document.fonts.ready); await fg.waitForTimeout(300); await fg.screenshot({ path: path.join(dir, 'featureGraphic.jpg'), type: 'jpeg', quality: 92 });
    fs.copyFileSync(path.join(ROOT, 'www', 'icons', 'icon-512.png'), path.join(dir, 'icon.png'));
    console.log(lang, 'tamam'); await fctx.close(); await ctx.close();
  }
  await b.close();
})();
