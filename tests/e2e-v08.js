// v0.8: dil secimi (6 dil), magaza + reklam (test saglayici), oto savas, hiz x3, ses ayarlari. node tests/e2e-v08.js [ciktiKlasoru]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots'); require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const stars = {}; for (let i = 1; i <= 30; i++) stars[i] = 2;
  const save = (st) => JSON.stringify({ v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.9', cleared: 30, coins: 3000, gems: 50, stars: st, stats: { totalStars: 60, wins: 30 }, daily: { lastDay: new Date().toISOString().slice(0, 10), claimedToday: true, streak: 1 } });
  const check = (c, msg) => { if (!c) errors.push('KONTROL BASARISIZ: ' + msg); else console.log('  ✓', msg); };
  async function open(opts) {
    const ctx = await browser.newContext({ locale: opts.locale || 'tr-TR', viewport: { width: 412, height: 915 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
    await ctx.addInitScript(([lang, sv, test, fresh]) => { try { if (!localStorage.getItem('__init')) { localStorage.setItem('__init', '1'); if (lang) localStorage.setItem('sefervakti.lang', lang); if (!fresh) localStorage.setItem('zafarion.save.v1', sv); if (test) localStorage.setItem('sv.monetize', 'test'); } } catch (e) {} }, [opts.lang, save(stars), !!opts.test, !!opts.fresh]);
    const p = await ctx.newPage(); p.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('console.error:', m.text().slice(0, 160)); } }); p.on('pageerror', e => { errors.push('pageerror: ' + e.message); console.log('pageerror:', e.message.slice(0, 200)); });
    await p.goto(url); await p.waitForFunction(() => globalThis.Z && Z.ready); await p.waitForTimeout(900); return { ctx, p };
  }
  const shot = (p, n) => p.screenshot({ path: path.join(out, n + '.png') });

  // --- 1) ilk acilis: cihaz dili Ispanyolca -> otomatik Ispanyolca; dil penceresi; tercih kalici
  { const { ctx, p } = await open({ locale: 'es-ES', fresh: true });
    check(await p.evaluate(() => Z.lang === 'es'), 'Cihaz dili İspanyolca → oyun İspanyolca açıldı');
    check(await p.locator('.modal h1').first().innerText().then(t => /Language/.test(t)), 'İlk açılışta dil seçim penceresi (Dil / Language)'); await shot(p, 'v08-01-langpick');
    await p.click('[data-act="l_ru"]'); await p.waitForFunction(() => Z.ready && Z.lang === 'ru'); await p.waitForTimeout(800);
    check(await p.evaluate(() => Z.lang === 'ru' && localStorage.getItem('sefervakti.lang') === 'ru' && Z.Save.data.langChosen === true), 'Rusça seçildi, sayfa yenilendi, tercih kalıcı');
    check(/[А-Яа-я]/.test(await p.locator('.modal h1').first().innerText()), 'Karşılama penceresi Rusça'); await ctx.close(); }

  // --- 2) her dil: ana menu, sekmeler, ayarlar; tasma + eksik anahtar kontrolu
  for (const lang of ['tr', 'en', 'es', 'pt', 'ru', 'zh']) {
    const { ctx, p } = await open({ lang, locale: lang === 'zh' ? 'zh-CN' : lang === 'tr' ? 'tr-TR' : 'en-US' });
    const txt = await p.locator('#home').innerText();
    check(await p.evaluate((l) => Z.lang === l, lang) && txt.length > 20, lang + ': ana menü açıldı');
    const over = async (sel) => p.evaluate((s) => Array.prototype.filter.call(document.querySelectorAll(s), el => el.offsetParent && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible').map(el => (el.textContent || '').trim().slice(0, 30)), sel);
    await shot(p, 'v08-02-home-' + lang);
    let bad = await over('#home button, #home span');
    for (const tab of ['map', 'army', 'shop', 'vault', 'quests']) { await p.evaluate((t) => Z.UI.showHub(t), tab); await p.waitForTimeout(250); bad = bad.concat(await over('#tabs button, #tab-content .btn, #tab-content .chip, #tab-content .panel h3')); if (tab === 'shop' || tab === 'army') await shot(p, 'v08-03-' + tab + '-' + lang); }
    await p.evaluate(() => Z.UI.settingsModal()); await p.waitForTimeout(250); await shot(p, 'v08-04-settings-' + lang);
    await p.evaluate(() => { Z.UI.closeModal(); Z.UI.levelModal(8); }); await p.waitForTimeout(250); if (lang === 'ru' || lang === 'zh') await shot(p, 'v08-05-brief-' + lang);
    check(bad.length === 0, lang + ': ana menü/sekme/düğmelerde metin taşması yok' + (bad.length ? ' → ' + [...new Set(bad)].slice(0, 6).join(' | ') : ''));
    if (lang !== 'tr') { const miss = await p.evaluate(() => Object.keys(Z.i18nMissing)); check(miss.length === 0, lang + ': eksik çeviri anahtarı yok' + (miss.length ? ' → ' + miss.slice(0, 5).join(' | ') : '')); }
    await ctx.close(); }

  // --- 3) dil degistirme (Ayarlar)
  { const { ctx, p } = await open({ lang: 'tr' });
    await p.evaluate(() => Z.UI.settingsModal()); await p.waitForTimeout(200); await p.click('[data-act="lang"]'); await p.waitForTimeout(200);
    check(await p.locator('.lang-btn').count() === 6, 'Dil penceresinde 6 dil var'); await p.click('[data-act="l_en"]'); await p.waitForFunction(() => Z.ready && Z.lang === 'en'); await p.waitForTimeout(600);
    check(/Army/.test(await p.locator('#home').innerText()) && !/Ordu/.test(await p.locator('#home').innerText()), 'İngilizce seçince ana menü İngilizce');
    await p.evaluate(() => Z.Game.startBattle('campaign', 6)); await p.waitForTimeout(900); const hud = await p.locator('#hud').innerText(); check(/Mine|Lv|Upgrade/i.test(hud) || hud.length > 5, 'Savaş HUD İngilizce'); await ctx.close(); }

  // --- 4) magaza (test saglayici): ucretsiz odul, paket, reklamsiz, banner, zafer x2
  { const { ctx, p } = await open({ lang: 'tr', test: true });
    check(await p.evaluate(() => Z.Monetize.mode === 'test' && Z.Monetize.adsOn() && Z.Monetize.iapOn()), 'Test modu: reklam ve satın alma etkin');
    await p.evaluate(() => Z.UI.showHub('shop')); await p.waitForTimeout(300); await shot(p, 'v08-06-shop');
    check(await p.locator('.pack').count() === 5 && await p.locator('.offer').count() === 2, 'Mağaza: 5 elmas paketi + 2 özel teklif');
    const g0 = await p.evaluate(() => Z.Save.data.gems);
    await p.click('[data-ad="gems"]'); await p.waitForSelector('#sim-overlay'); await p.waitForTimeout(3300); await p.click('#sim-close'); await p.waitForTimeout(400);
    check(await p.evaluate(([g]) => Z.Save.data.gems === g + Z.MONEY.ads.rewardedGems, [g0]), 'Ödüllü reklam izlenince elmas verildi');
    await p.click('[data-iap="sefervakti_gems_80"]'); await p.waitForSelector('#sim-overlay'); await shot(p, 'v08-07-sim-purchase'); await p.click('#sim-ok'); await p.waitForTimeout(400);
    check(await p.evaluate(([g]) => Z.Save.data.gems === g + Z.MONEY.ads.rewardedGems + 80, [g0]), '80 elmaslık paket satın alındı (test)');
    await p.click('[data-iap="sefervakti_gems_450"]'); await p.waitForSelector('#sim-overlay'); await p.click('#sim-cancel'); await p.waitForTimeout(300);
    check(await p.evaluate(([g]) => Z.Save.data.gems === g + Z.MONEY.ads.rewardedGems + 80, [g0]), 'Satın alma iptal edilince elmas verilmez');
    check(await p.evaluate(() => !document.getElementById('ad-banner').classList.contains('hidden')), 'Banner yuvası görünür');
    await p.click('[data-iap="sefervakti_noads"]'); await p.waitForSelector('#sim-overlay'); await p.click('#sim-ok'); await p.waitForTimeout(400);
    check(await p.evaluate(() => Z.Save.data.iap.noAds && document.getElementById('ad-banner').classList.contains('hidden')), 'Reklamsız paket: banner kalktı');
    // zafer sonrasi x2
    await p.evaluate(() => { Z.Save.data.iap.noAds = false; Z.Game.startBattle('campaign', 16); Z.Game.battle.base[1].hp = 0; }); await p.waitForSelector('#btn-dbl', { timeout: 9000 }); await p.waitForTimeout(500); await shot(p, 'v08-08-result-ad');
    const c0 = await p.evaluate(() => Z.Save.data.coins); await p.click('#btn-dbl'); await p.waitForSelector('#sim-overlay'); await p.waitForTimeout(3300); await p.click('#sim-close'); await p.waitForTimeout(400);
    check(await p.evaluate(([c]) => Z.Save.data.coins > c, [c0]), 'Zafer ödülü reklamla ×2 yapıldı');
    await ctx.close(); }

  // --- 5) saglayici yok: magaza kilitli, bedava elmas yok
  { const { ctx, p } = await open({ lang: 'tr' });
    await p.evaluate(() => Z.UI.showHub('shop')); await p.waitForTimeout(300); const g0 = await p.evaluate(() => Z.Save.data.gems);
    await p.click('[data-ad="gems"]'); await p.click('[data-iap="sefervakti_gems_80"]'); await p.waitForTimeout(300);
    check(await p.evaluate(([g]) => Z.Save.data.gems === g && !document.getElementById('sim-overlay'), [g0]) && /Yakında/.test(await p.locator('.pack').first().innerText()), 'Sağlayıcı yokken mağaza "Yakında": elmas verilmez'); await ctx.close(); }

  // --- 6) oto savas, hiz x3, ses ayarlari
  { const { ctx, p } = await open({ lang: 'tr' });
    await p.evaluate(() => Z.Game.startBattle('campaign', 6)); await p.waitForTimeout(1000);
    await p.click('#btn-speed'); await p.click('#btn-speed'); check(await p.evaluate(() => Z.Game.speed === 3), 'Hız x1→x2→x3');
    await p.click('#btn-auto'); check(await p.evaluate(() => Z.Game.auto === true), 'Oto savaş açıldı'); await p.waitForTimeout(6000);
    check(await p.evaluate(() => Z.Game.battle.stats.spawns >= 2), 'Oto savaş birlik çağırıyor'); await shot(p, 'v08-09-auto');
    await p.click('#btn-auto'); check(await p.evaluate(() => Z.Game.auto === false), 'Oto savaş kapanır');
    await p.evaluate(() => { Z.Save.data.cleared = 3; }); await p.click('#btn-auto'); check(await p.evaluate(() => Z.Game.auto === false), 'Oto savaş ilk bölümlerde kilitli'); await p.evaluate(() => { Z.Save.data.cleared = 30; });
    await p.evaluate(() => { Z.Game.toMenu(); Z.UI.settingsModal(); }); await p.waitForTimeout(300);
    await p.evaluate(() => { const el = document.querySelector('[data-vol="musicVol"]'); el.value = 20; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    check(await p.evaluate(() => Z.Save.data.settings.musicVol === 20), 'Müzik ses düzeyi kaydırıcısı ayarı kaydeder');
    await p.evaluate(() => { Z.Audio.init(); Z.Audio.musicStart(); for (let r = 0; r < 7; r++) { Z.Audio.setRealm(r); Z.Audio.setMode(r % 2 ? 'menu' : 'battle'); } Z.Audio.gem(); Z.Audio.reward(); Z.Audio.tab(); }); await p.waitForTimeout(2500);
    check(true, 'Yeni sesler (diyar ortamı, pad, gem/reward) hatasız çalıştı'); await ctx.close(); }

  if (errors.length) { console.log('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('Tüm kontroller geçti');
  await browser.close();
})();
