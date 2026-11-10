#!/usr/bin/env node
'use strict';
/*
 * Castle Siege: History - Google Play phone screenshots (docs/ART_DIRECTION.md section 9, "Key art and native").
 *
 *   node store/make-screens.js [locale,...]      node store/make-screens.js              all seven store folders (en tr es pt ru zh; es also fills es-419)
 *                                                node store/make-screens.js ru,zh        just Russian and Chinese (en-US, ru-RU, es-ES ... work too)
 *   options: --out <dir>     write <dir>/<locale>/images/... instead of store/metadata/android   (scratch runs)
 *            --raw <dir>     also keep the raw live captures as <dir>/<lang>-<n>.png (1080 x 1919, n = 1..6 in the order of the sheets)
 *            --raw-in <dir>  skip the game: dress the raw captures found in <dir> (same names) instead; for tuning the page art
 *            --strict        exit 3 after writing if anything warned (a modal/toast/tutorial in a frame, an emoji still showing, a frame that never settled)
 *   (--fill, the old switch for the 9:16 capture, is accepted and ignored: that is the only capture now)
 *
 * Per language it
 *   1. loads the REAL game page (www/index.html) in Playwright, 412 x 732 css px (the game's native 9:16 stage, 720 x 1280 u) at DPR 1080/412, in that language (localStorage
 *      sefervakti.lang), with a fixed save (zafarion.save.v1: 29 sieges cleared, 2-3 stars on every one, 4200 coins, 180 gems, a five-unit deck), a pinned clock, a seeded
 *      Math.random, sound muted and reduced motion;
 *   2. captures six live screens, in this order on the page and in the sheets: 1 campaign map (the Western Europe / Holy Land boundary down to the Jerusalem boss, node 20),
 *      2 lane battle mid-fight (Jerusalem 1187), 3 the boss briefing of that siege, 4 field battle mid-fight (Rouen 1419), 5 army tab, 6 the victory result (the lane
 *      battle won with three stars). The battles are stepped by hand (fixed 1/30 s steps through Battle.update + Render.frame, no timers) and lightly directed: the host
 *      marches out, the garrison sallies and the wall is cracked (lane); a full line is drawn up and the game's own AUTO bot reinforces it (field); the walls fall (victory).
 *      The scrolled screens pick their scroll offset by search: no node label, banner or card may be cut by an edge (or, behind the briefing, by the modal), and node 20 shows.
 *      A frame is kept once two consecutive screenshots are byte-identical, so the same Chromium gives byte-identical files on every run;
 *   3. dresses each capture in the illuminated page of store/art/screens-frame.js (caption band with a madder banderole, a night mat, an ink | gold | ink frame with gilt
 *      studs, gilded ivy bars, a marginal figure) -> 1080 x 1920 JPEG q90 without alpha, written to
 *      store/metadata/android/<locale>/images/phoneScreenshots/<n>-<name>.jpg (the old files of that folder are deleted right before);
 *   4. copies www/icons/icon-512.png to images/icon.png (512 x 512 PNG, 32-bit).
 * The live UI is captured at run time, never from stale files: re-run after any UI change (about 19 s per language, ~2 min for all seven folders).
 * Layout: the capture is 1080 x 1919 px; scaled by .811 it is 876 x 1556 at x 102, the bible's window exactly (the old 412 x 915 capture made 668 px).
 * zh: two things in the game's Chinese UI are fixed in the page before the shot (the strings stay as they are in www/): www/js/lang/zh.js prints the percent before the
 * number as Turkish does ("%60"; zh wants "60%"), and www/js/ui.js joins labels with an ASCII ": " where the pack's own sentences use the full-width "：". The run says how
 * many text nodes it rewrote; once the sources are fixed it rewrites none.
 * Needs Playwright + Chromium (like tests/ui-shots.js). Files it owns: this script, store/art/screens-*, store/art/feature-cjk-* (shared with make-feature.js), the
 * phoneScreenshots folders and images/icon.png of the seven locale folders. The feature graphic is not touched.
 */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), WWW = path.join(ROOT, 'www'), ART = path.join(__dirname, 'art'), URL = 'file://' + path.join(WWW, 'index.html');
const T0 = Date.now(), log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(1).padStart(5) + 's', ...a);

// ---- arguments -----------------------------------------------------------------------------------------------------
const opt = {}; let pos = [], warnings = 0, OUT_ROOT = path.join(__dirname, 'metadata', 'android');
const warn = (...a) => { warnings++; log('  WARN', ...a); };
function parseArgs(argv) {
  Object.keys(opt).forEach(k => delete opt[k]); pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' || argv[i] === '--raw' || argv[i] === '--raw-in') opt[argv[i].slice(2)] = path.resolve(argv[++i] || '.');
    else if (argv[i] === '--strict') opt.strict = true; else if (argv[i] === '--fill') continue; else pos.push(argv[i]);
  }
  OUT_ROOT = opt.out || path.join(__dirname, 'metadata', 'android');
}

// ---- locales and captions ------------------------------------------------------------------------------------------
// store folder(s) per game language; the caption of each screenshot (<= 3 words, zh <= 6 characters); the browser locale
const LANGS = {
  en: { dirs: ['en-US'], locale: 'en-US' }, tr: { dirs: ['tr-TR'], locale: 'tr-TR' }, es: { dirs: ['es-ES', 'es-419'], locale: 'es-ES' },
  pt: { dirs: ['pt-BR'], locale: 'pt-BR' }, ru: { dirs: ['ru-RU'], locale: 'ru-RU' }, zh: { dirs: ['zh-CN'], locale: 'zh-CN' }
};
// order of the sheets: map, siege, briefing, field, army, victory (the two battle shots are kept apart by the briefing; the set ends on the payoff frame)
const NAMES = ['1-map', '2-siege', '3-briefing', '4-field', '5-army', '6-victory'];
const CAPTIONS = {
  en: ['105 real sieges', 'Break the walls', 'Read the siege', 'Take the field', 'Raise your host', 'Win every star'],
  tr: ['105 gerçek kuşatma', 'Surları yık', 'Kuşatmayı oku', 'Savaş meydanına çık', 'Ordunu kur', 'Tüm yıldızları kazan'],
  es: ['105 asedios reales', 'Derriba los muros', 'Estudia el asedio', 'Batalla campal', 'Levanta tu hueste', 'Consigue tres estrellas'],
  pt: ['105 cercos reais', 'Derrube as muralhas', 'Estude o cerco', 'Entre em campo', 'Monte seu exército', 'Conquiste as estrelas'],
  ru: ['105 реальных осад', 'Круши стены', 'Изучи осаду', 'Выходи в поле', 'Собери войско', 'Собери все звёзды'],
  zh: ['105场围攻', '攻破城墙', '读懂战局', '列阵出战', '招兵买马', '三星通关']
};
// the Chinese subset font (store/art/feature-cjk-subset.py) holds only the glyphs of store/art/feature-cjk-serif.txt
const HAN = new Set(fs.readFileSync(path.join(ART, 'feature-cjk-serif.txt'), 'utf8').replace(/\s+/g, ''));
Object.keys(CAPTIONS).forEach(l => { // bible section 9: <= 3 words (zh <= 6 characters), six per language
  if (CAPTIONS[l].length !== NAMES.length) throw new Error('captions ' + l + ': need ' + NAMES.length);
  CAPTIONS[l].forEach(c => {
    const n = l === 'zh' ? Array.from(c).length : c.trim().split(/\s+/).length; if (n > (l === 'zh' ? 6 : 3)) throw new Error('caption too long (' + l + '): ' + c);
    if (l === 'zh') Array.from(c).forEach(ch => { if (/[⺀-鿿＀-￯]/.test(ch) && !HAN.has(ch)) throw new Error('zh "' + ch + '" is not in store/art/feature-cjk-serif.txt: add it and run store/art/feature-cjk-subset.py'); });
  });
});
function wanted() {
  const want = pos.join(',').split(',').map(s => s.trim()).filter(Boolean), langs = new Set(), dirs = {};
  if (!want.length) Object.keys(LANGS).forEach(l => { langs.add(l); dirs[l] = LANGS[l].dirs; });
  want.forEach(w => {
    const l = w.slice(0, 2).toLowerCase();
    if (!LANGS[l]) { console.error('unknown locale "' + w + '" (use en tr es pt ru zh or the store folder names)'); process.exit(1); }
    langs.add(l); dirs[l] = (w.length > 2 && LANGS[l].dirs.indexOf(w) >= 0) ? [w] : LANGS[l].dirs;
  });
  return { langs: Object.keys(LANGS).filter(l => langs.has(l)), dirs };
}

// ---- the fixed world -----------------------------------------------------------------------------------------------
const FIXED_TIME = '2026-04-14T10:00:00Z', TODAY = '2026-04-14';                    // pinned: the quests, the daily reward and the battle seed follow the date
const NOTES_ID = (fs.readFileSync(path.join(WWW, 'js', 'version.js'), 'utf8').match(/NOTES_ID\s*=\s*'([^']+)'/) || [])[1] || '0.10';
const STARS = [3, 3, 2, 3, 3, 3, 2, 3, 3, 3, 3, 2, 3, 3, 3, 2, 3, 3, 3, 3, 2, 3, 3, 3, 2, 3, 3, 2, 3];  // levels 1..29: 2-3 stars on most
const stars = {}; STARS.forEach((s, i) => { stars[i + 1] = s; });
const SAVE = JSON.stringify({
  v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: NOTES_ID,
  cleared: 29, coins: 4200, gems: 180, stars, endlessBest: 14, hardCleared: { 5: 1, 10: 1, 15: 1, 20: 1 },
  unitLvl: { spear: 13, archer: 12, cav: 12, knight: 11, mage: 11, cata: 7, healer: 8, banner: 6, assassin: 5, golem: 3, flamer: 1 },
  heroOwned: { aslan: true, yildiz: true }, heroLvl: { aslan: 9, yildiz: 6, demir: 1, buz: 1, ejder: 1 }, hero: 'aslan',
  deck: ['spear', 'archer', 'cav', 'knight', 'mage'], castleLvl: 7, treasuryLvl: 3,
  stats: { battles: 64, wins: 52, kills: 2310, totalStars: STARS.reduce((a, b) => a + b, 0), maxCombo: 18, perks: 40, spins: 6, hardWins: 4, legendWins: 0, dailyWins: 3, purchases: 0, fieldWins: 14, castleWins: 15, bossWins: 5 },
  daily: { lastDay: TODAY, streak: 3, claimedToday: true }, wheel: { day: TODAY, used: true }, boost: { gold: 3, skill: 2, shield: 2 },
  settings: { sound: false, music: false, vibrate: false, menuBattle: true, musicVol: 70, sfxVol: 100 },   // muted: the sound code draws from Math.random in real time and would make the particles differ run to run
  seenUnlock: { spear: true, archer: true, cav: true, knight: true, mage: true, cata: true, healer: true, banner: true, assassin: true, golem: true }
});
// mulberry32 in place of Math.random (set before any game script runs): scenery, particles, the demo battle. __rs(n) re-seeds it: the home screen's
// demo battle burns random numbers on every frame, so the count at capture time depends on boot speed; each battle capture starts from a fresh seed
const SEED_JS = 'var __s=0x9E3779B9;globalThis.__rs=function(n){__s=n>>>0;};Math.random=function(){__s=(__s+0x6D2B79F5)>>>0;var t=Math.imul(__s^(__s>>>15),1|__s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};';

// older Playwright (< 1.45, no context.clock): the same pinned clock as a Date subclass
const DATE_JS = 'var __T=' + Date.parse(FIXED_TIME) + ';globalThis.Date=class extends Date{constructor(...a){if(a.length)super(...a);else super(__T);}static now(){return __T;}};';

// what the six screens show (real campaign levels: 20 Jerusalem 1187 = the boss briefing, the lane siege and the victory, 13 Rouen 1419 = the field battle in the green West)
const SHOT = { bossLevel: 20, laneLevel: 20, fieldLevel: 13, mapRealm: 1 };

// ---- page helpers --------------------------------------------------------------------------------------------------
const wait = (p, ms) => p.waitForTimeout(ms);
const VIEW = { w: 412, h: 732, dpr: 1080 / 412 };                                   // the game's native 9:16 stage: 1080 x 1919 px, which the page art scales to the bible's 876 x 1556 (.811)
async function openGame(browser, lang) {
  const ctx = await browser.newContext({ locale: LANGS[lang].locale, timezoneId: 'UTC', viewport: { width: VIEW.w, height: VIEW.h }, deviceScaleFactor: VIEW.dpr, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  if (ctx.clock && ctx.clock.setFixedTime) await ctx.clock.setFixedTime(new Date(FIXED_TIME)); else await ctx.addInitScript(DATE_JS);
  await ctx.addInitScript(SEED_JS);
  await ctx.addInitScript(([l, s]) => { try { localStorage.setItem('sefervakti.lang', l); localStorage.setItem('zafarion.save.v1', s); } catch (e) { /* no storage */ } }, [lang, SAVE]);
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => { errors.push(e.message); log('  PAGEERR', lang, e.message); });
  p.on('console', m => { if (m.type() === 'error') log('  CONSOLE', lang, m.text().slice(0, 140)); });
  await p.goto(URL);
  await p.waitForFunction(() => globalThis.Z && Z.ready && Z.Art && Z.Art.ready, null, { timeout: 20000 }); // booted and every Z.Art tile baked (realm diapers come last)
  await p.evaluate(() => document.fonts.ready);
  await wait(p, 600);
  return { ctx, p, errors, lang, fixes: 0 };
}
// emoji that the icon pass replaces or drops (art/icons/manifest.json map[] + drop[], the list tests/art-audit.js enforces): none may show in a store frame
let EMOJI = [];
try { const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'art', 'icons', 'manifest.json'), 'utf8')); EMOJI = m.map.concat(m.drop || []).map(e => parseInt(e.cp, 16)).filter(c => c && c !== 0xFE0F); } catch (e) { /* no manifest: no emoji check */ }
// the frame must show no modal (unless asked), toast, tutorial or boot veil, and no emoji
async function clean(p, name, modal) {
  const bad = await p.evaluate(([modal, cps]) => {
    const $ = id => document.getElementById(id), vis = id => $(id) && !$(id).classList.contains('hidden'), out = [], set = new Set(cps);
    if (vis('toast')) { $('toast').classList.add('hidden'); out.push('toast'); }
    if (vis('tut')) out.push('tutorial');
    if ($('boot')) out.push('boot veil');
    if (vis('modal-layer') !== !!modal) out.push(modal ? 'modal missing' : 'modal open');
    if (set.size) {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), seen = {}; let n;
      while ((n = w.nextNode())) {
        const el = n.parentElement; if (!el || el.closest('.vh, script, style, svg, textarea, noscript, .hidden, #boot')) continue;
        for (const ch of n.nodeValue) if (set.has(ch.codePointAt(0))) seen['U+' + ch.codePointAt(0).toString(16).toUpperCase() + ' ' + ch] = 1;
      }
      Object.keys(seen).forEach(k => out.push('emoji ' + k));
    }
    return out;
  }, [!!modal, EMOJI]);
  if (bad.length) warn(name + ':', bad.join(', '));
}
// zh only: the Chinese UI prints "%60" (Turkish order) and joins labels with an ASCII ": "; rewritten in the page's text nodes before the shot (see the header)
async function zhFix(g) {
  if (g.lang !== 'zh') return;
  g.fixes += await g.p.evaluate(() => {
    let n = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), list = []; let t;
    while ((t = w.nextNode())) list.push(t);
    list.forEach(t => {
      const el = t.parentElement; if (!el || el.closest('script, style, textarea, noscript, .vh')) return;
      const v = t.nodeValue, r = v.replace(/(^|[^\d.])%(\d+(?:\.\d+)?)/g, '$1$2%').replace(/([㐀-鿿）])\s*:\s*/g, '$1：');
      if (r !== v) { t.nodeValue = r; n++; }
    });
    return n;
  });
}
// a screenshot counts once two consecutive frames are byte-identical (nothing is still decoding, painting or animating)
const shot = async (g, name, modal) => {
  const p = g.p;
  await wait(p, 350); await zhFix(g); await clean(p, name, modal);
  await p.evaluate(() => Promise.all(Array.from(document.images).map(i => (i.decode ? i.decode().catch(() => 0) : 0))));
  let prev = await p.screenshot({ type: 'png' });
  for (let i = 0; i < 10; i++) {
    await wait(p, 120);
    const cur = await p.screenshot({ type: 'png' });
    if (cur.equals(prev)) return cur;
    prev = cur;
  }
  warn(name + ': frame never settled');
  return prev;
};

// ---- scroll offsets by search --------------------------------------------------------------------------------------
// The hub tabs scroll inside #tab-content. This page-side search tries every scroll offset (css px, step 1) and scores what each would show:
//   a label (node name, realm banner, section title) cut by an edge, or by the modal, costs 1000; a body (node, card) cut costs up to 100 (a sliver is cheap, a half is dear);
//   a "must" item that is not whole costs 1e6. `hidden` is the screen-space interval covered by the modal. Ties go to the offset closest to `want` (css px).
async function pickScroll(p, spec) {
  return p.evaluate(spec => {
    const c = document.getElementById('tab-content'), cr = c.getBoundingClientRect(), sc = Z.Game.stage.scale, H = cr.height, st0 = c.scrollTop * sc, items = [];
    const rect = el => { const r = el.getBoundingClientRect(); return [r.top - cr.top + st0, r.bottom - cr.top + st0]; };
    (spec.labels || []).forEach(sel => c.querySelectorAll(sel).forEach(el => { const r = rect(el); items.push({ t: r[0], b: r[1], kind: 'label', must: false }); }));
    (spec.bodies || []).forEach(sel => c.querySelectorAll(sel).forEach(el => { const r = rect(el); items.push({ t: r[0], b: r[1], kind: 'body', must: false }); }));
    (spec.musts || []).forEach(sel => { const el = c.querySelector(sel); if (!el) return; const r = rect(el); items.push({ t: r[0], b: r[1], kind: 'body', must: true }); });
    const hid = spec.hidden ? (() => { const m = document.querySelector('#modal-layer .modal'), mr = m.getBoundingClientRect(); return [mr.top - cr.top, mr.bottom - cr.top]; })() : null;
    const vis = hid ? [[0, Math.max(0, hid[0])], [Math.min(H, hid[1]), H]] : [[0, H]];
    const max = c.scrollHeight * sc - H, wantY = spec.want == null ? 0 : spec.want, anchor = spec.anchor ? rect(c.querySelector(spec.anchor))[0] : 0;
    let best = null;
    for (let s = 0; s <= max; s++) {
      let pen = 0;
      for (const it of items) {
        const t = it.t - s, b = it.b - s; let v = 0;
        for (const iv of vis) v += Math.max(0, Math.min(b, iv[1]) - Math.max(t, iv[0]));
        const f = v / (b - t);
        if (f > 0.02 && f < 0.98) pen += it.kind === 'label' ? 1000 : 200 * Math.min(f, 1 - f);
        if (it.must && f < 0.98) pen += 1e6;
      }
      const dist = spec.anchor ? Math.abs((anchor - s) - wantY) : 0;
      if (!best || pen < best.pen - 1e-6 || (Math.abs(pen - best.pen) < 1e-6 && dist < best.dist)) best = { s, pen, dist };
    }
    c.scrollTop = best.s / sc;
    let trimmed = 0;
    if (spec.trim) {   // a card or node that only shows as a stub (under spec.trim of its height) at the bottom edge is clipped away: the hub's own background shows below the last whole one
      let cut = H; items.forEach(it => { const t = it.t - best.s, b = it.b - best.s; if (it.kind === 'body' && t < H && b > H && (H - t) < spec.trim * (b - t)) cut = Math.min(cut, t - 5); });
      if (cut < H) { c.style.clipPath = 'inset(0 0 ' + ((H - cut) / sc).toFixed(1) + 'px 0)'; trimmed = Math.round(H - cut); }
    }
    return { scrollPx: Math.round(best.s), penalty: Math.round(best.pen), items: items.length, trimmedPx: trimmed };
  }, spec);
}

// ---- the six live screens ------------------------------------------------------------------------------------------
async function captureMap(g) {
  const p = g.p;
  await p.evaluate(() => { Z.UI.closeModal(); Z.UI.showHub('map'); });
  await wait(p, 500);
  // the Holy Land banner flush under the top edge, nodes 16..19 and the boss, node 20 (Jerusalem 1187), whole at the bottom: the map leads into the briefing and the siege that follow
  const r = await pickScroll(p, { labels: ['.node .nm', '.realm'], bodies: ['.node'], musts: ['.realm.r' + SHOT.mapRealm, '.node[data-level="' + SHOT.bossLevel + '"] .nm', '.node[data-level="' + SHOT.bossLevel + '"]'], anchor: '.realm.r' + SHOT.mapRealm, want: 8 });
  if (r.penalty >= 1e6) warn('map: the boss node and the realm banner do not fit together');
  log('  map scroll', JSON.stringify(r));
  return shot(g, 'map');
}
async function captureBriefing(g) {
  const p = g.p;
  await p.evaluate(n => { Z.UI.showHub('map'); Z.UI.levelModal(n); }, SHOT.bossLevel);
  await wait(p, 400);
  // the modal covers the map between the HUD and the tab bar; the map behind it is scrolled (boss node near the top) so that no label or node is guillotined by the modal's edge
  const r = await pickScroll(p, { labels: ['.node .nm', '.realm'], bodies: ['.node'], anchor: '.node[data-level="' + SHOT.bossLevel + '"]', want: 6, hidden: true });
  log('  briefing scroll', JSON.stringify(r));
  const png = await shot(g, 'briefing', true);
  await p.evaluate(() => Z.UI.closeModal());
  return png;
}
async function captureArmy(g) {
  const p = g.p;
  await p.evaluate(() => { Z.UI.closeModal(); Z.UI.showHub('army'); document.getElementById('tab-content').scrollTop = 0; });
  await wait(p, 400);
  // the list from the top ("Army", "Units" whole); a card that would only show as a stub above the tab bar is clipped away
  const r = await pickScroll(p, { labels: ['.ucard h3'], bodies: ['.ucard'], musts: ['#tab-content h2', '#tab-content .sect'], anchor: '.ucard', want: 74, trim: 0.5 });
  log('  army scroll', JSON.stringify(r));
  const png = await shot(g, 'army');
  await p.evaluate(() => { document.getElementById('tab-content').style.clipPath = ''; });
  return png;
}
// battles: Battle.update / Render.frame stepped by hand at 1/30 s, so the frame is a function of the seed and the script only
async function captureLane(g) {
  const info = await g.p.evaluate(level => {
    globalThis.__rs(20260414); Z.Render.time = 0;                                           // fresh seed and a fresh render clock (the home demo battle has been advancing both)
    Z.UI.closeModal(); Z.Game.startBattle('campaign', level, { diff: 0, boosters: [] }); Z.Game.paused = true;
    const b = Z.Game.battle, R = Z.Render, C = Z.C, deck = b.deck.slice(), tiers = b.tiers(), dt = 1 / 30;
    let n = 0, e = 0, nextDeploy = 0.3, nextDefender = 5, hit = false, guard = 0;
    while (b.t < 19.5 && !b.over && guard++ < 4000) {
      if (b.t >= nextDeploy) { nextDeploy += 0.62; const t = deck[n % deck.length]; b.gold = 2000; b.cooldown[t] = 0; b.deploy(t, n % 3); n++; }   // the host marches out, all three lanes
      if (b.t >= nextDefender && b.t < 15) {                                                                                                     // the garrison sallies to the walls
        nextDefender += 1.2;
        for (let k = 0; k < 2; k++) { const tp = tiers[e++ % tiers.length]; b.spawn(1, tp, e % 3); b.units[b.units.length - 1].x = C.EF - 70 - ((e * 53) % 190); }
      }
      if (b.t >= 14.5 && !hit) { hit = true; b.hitBase(1, b.base[1].max * 0.58, 'spear'); }                                                         // the wall is cracked: castle at 42 %
      b.update(dt); if (b.perkOffer) b.pickPerk(b.perkOffer[0]); R.frame(dt);
    }
    b.gold = 286; for (const k in b.cooldown) b.cooldown[k] = 0; b.heroCd = 0; R.shake = 0; R.frame(0); R.active = false; // freeze the canvas on this exact frame
    return { t: +b.t.toFixed(1), castle: +(b.base[1].hp / b.base[1].max).toFixed(2), mine: b.units.filter(u => u.team === 0).length, foes: b.units.filter(u => u.team === 1).length, over: b.over };
  }, SHOT.laneLevel);
  return { png: await shot(g, 'siege'), info };
}
// the same battle carried on until the wall falls: the game settles it (rewards, stars) and opens its own result modal over the burning castle
async function captureVictory(g) {
  const info = await g.p.evaluate(() => {
    const b = Z.Game.battle, R = Z.Render, dt = 1 / 30; let guard = 0;
    R.active = true;
    b.hitBase(1, b.base[1].max * 0.5, 'spear');
    while (!b.over && guard++ < 900) { b.hitBase(1, b.base[1].max * 0.02, 'cata'); b.update(dt); R.frame(dt); }
    for (let k = 0; k < 8; k++) { b.update(dt); R.frame(dt); }
    R.shake = 0; R.frame(0); R.active = false;
    Z.Game.ending = true; Z.Game.settled = true;                                         // what the game loop does a moment after the end: settle the battle, show the result
    const q = [0.5, 0.8, 0.8], own = Object.prototype.hasOwnProperty.call(b, 'rng'), r0 = b.rng; let qi = 0;
    b.rng = function () { return qi < q.length ? q[qi++] : r0.call(b); };              // the chest's three rolls are staged (middling coins, no gems, no prep-card drop): the extra "prep card" row would push the modal's text under its button bar
    const out = Z.settleBattle(b, Z.Save); Z.UI.resultModal(b, out);
    if (own) b.rng = r0; else delete b.rng;
    return { over: b.over, win: !!(b.result && b.result.win), stars: b.result && b.result.stars, coins: out.coins, chest: !!out.chest };
  });
  if (!info.win || info.stars !== 3) warn('victory: the result is ' + JSON.stringify(info) + ' (want a win with 3 stars)');
  await wait(g.p, 500);
  return { png: await shot(g, 'victory', true), info };
}
async function captureField(g) {
  const info = await g.p.evaluate(level => {
    globalThis.__rs(20260415); Z.Render.time = 0;
    Z.UI.closeModal(); Z.Game.startBattle('campaign', level, { diff: 0, boosters: [] }); Z.Game.paused = true;
    const b = Z.Game.battle, R = Z.Render, dt = 1 / 30;
    for (let i = 0; i < 20; i++) R.frame(dt);
    b.gold = Math.max(b.gold, 1800); b.autoPlace(); b.startBattle();                       // a full line of twenty (more command points than the level grants), drawn up by the game's own auto-placement
    let guard = 0, bot = 0;
    while (b.t < 9 && !b.over && guard++ < 4000) {                                          // then the game's own AUTO bot reinforces and uses the hero, as the AUTO button does
      bot -= dt; if (bot <= 0) { bot = 0.9; Z.Game.botAct(b); }
      b.update(dt); if (b.perkOffer) b.pickPerk(b.perkOffer[0]); R.frame(dt);
    }
    b.gold = 244; for (const k in b.cooldown) b.cooldown[k] = 0;                            // every card affordable and ready on the frame that is kept
    R.shake = 0; R.frame(0); R.active = false;
    return { t: +b.t.toFixed(1), over: b.over, mine: b.units.filter(u => u.team === 0).length, foes: b.units.filter(u => u.team === 1).length };
  }, SHOT.fieldLevel);
  return { png: await shot(g, 'field'), info };
}
// all six, in the order of the sheets; the victory comes last (it settles the battle and so changes the save)
async function captureAll(g) {
  const map = await captureMap(g), briefing = await captureBriefing(g), army = await captureArmy(g);
  const field = await captureField(g); log('  field', JSON.stringify(field.info));
  const lane = await captureLane(g); log('  lane ', JSON.stringify(lane.info));
  const win = await captureVictory(g); log('  win  ', JSON.stringify(win.info));
  if (g.fixes) log('  zh: ' + g.fixes + ' text node(s) rewritten in the page (percent order, full-width colon)');
  return [map, lane.png, briefing, field.png, army, win.png];
}

// ---- the illuminated page ------------------------------------------------------------------------------------------
const FONT_SPEC = [ // the OFL woff2 files of the game, embedded as data: URIs (a file:// font does not load on a setContent page)
  ['Rub', '700', path.join(WWW, 'fonts', 'texturina-latin-700-normal.woff2'), 'LAT'], ['Rub', '700', path.join(WWW, 'fonts', 'texturina-latin-ext-700-normal.woff2'), 'EXT'],
  ['Hand', '400 800', path.join(WWW, 'fonts', 'eb-garamond-latin-600-normal.woff2'), 'LAT'], ['Hand', '400 800', path.join(WWW, 'fonts', 'eb-garamond-latin-ext-600-normal.woff2'), 'EXT'],
  ['Hand', '400 800', path.join(WWW, 'fonts', 'eb-garamond-cyrillic-600-normal.woff2'), 'CYR'],
  ['Top', '400', path.join(WWW, 'fonts', 'pirata-one-latin-400-normal.woff2'), 'LAT'], ['Top', '400', path.join(WWW, 'fonts', 'pirata-one-latin-ext-400-normal.woff2'), 'EXT'],
  ['Han', '700', path.join(ART, 'feature-cjk-serif-700.woff2'), null], ['Han', '900', path.join(ART, 'feature-cjk-serif-900.woff2'), null]   // Noto Serif SC subset for the Chinese captions
];
const RANGE = {
  LAT: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  EXT: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  CYR: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'
};
async function openComposer(browser) {
  const css = FONT_SPEC.map(f => `@font-face{font-family:${f[0]};font-style:normal;font-weight:${f[1]};src:url(data:font/woff2;base64,${fs.readFileSync(f[2]).toString('base64')}) format('woff2');${f[3] ? 'unicode-range:' + RANGE[f[3]] : ''}}`).join('\n');
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 }), p = await ctx.newPage();
  p.on('pageerror', e => log('  PAGEERR composer', e.message));
  await p.setContent(`<!doctype html><meta charset="utf-8"><style>${css}html,body{margin:0;background:#000}canvas{display:block}</style><canvas id="c"></canvas>`);
  for (const f of ['art.js', 'icons.js']) await p.addScriptTag({ path: path.join(WWW, 'js', f) });
  await p.addScriptTag({ path: path.join(ART, 'screens-frame.js') });
  return { ctx, p };
}
async function compose(comp, png, caption, lang, index) {
  await comp.p.evaluate(cap => Promise.all(['700 74px Rub', '700 74px Hand', '900 74px Han'].map(s => document.fonts.load(s, cap))), caption);
  const r = await comp.p.evaluate(([shotUrl, caption, lang, index]) => ScreensArt.compose(document.getElementById('c'), { shot: shotUrl, caption, lang, index }), ['data:image/png;base64,' + png.toString('base64'), caption, lang, index]);
  if (r.caption.size < 74) log('  caption "' + caption + '" fitted at ' + r.caption.size + ' px');
  if (r.frame.x !== 84 || r.frame.w !== 912) warn('the window is not the bible\'s 876 px at x 102: frame ' + JSON.stringify(r.frame));
  const url = await comp.p.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.9));
  return Buffer.from(url.split(',')[1], 'base64');
}

// ---- the Play specs, checked on the bytes that are written ---------------------------------------------------------------
function jpegInfo(b) { // { w, h, comps } from the first SOF marker; 3 components = YCbCr, i.e. no alpha
  if (b[0] !== 0xFF || b[1] !== 0xD8) throw new Error('not a JPEG');
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xFF) { i++; continue; }
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7), comps: b[i + 9] };
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error('JPEG without a frame header');
}
function checkOutputs(jpgs, label) {
  jpgs.forEach((j, i) => {
    const q = jpegInfo(j);
    if (q.w !== 1080 || q.h !== 1920 || q.comps !== 3) throw new Error(label + ' ' + NAMES[i] + ': ' + q.w + 'x' + q.h + ' with ' + q.comps + ' components (want 1080x1920, no alpha)');
    if (j.length > 8 * 1024 * 1024) throw new Error(label + ' ' + NAMES[i] + ': over 8 MB');
  });
  if (jpgs.length < 2 || jpgs.length > 8) throw new Error(label + ': Play wants 2-8 phone screenshots');
}
function checkIcon(file) { // 512 x 512, 8-bit RGBA (32-bit PNG)
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(16) !== 512 || b.readUInt32BE(20) !== 512 || b[24] !== 8 || b[25] !== 6) warn(path.basename(file), 'is not a 512 x 512 32-bit RGBA PNG');
}

// ---- main ----------------------------------------------------------------------------------------------------------
async function run(argv) {
  parseArgs(argv || []); warnings = 0;
  const sel = wanted();
  let browser = null;
  const budget = 60000 + sel.langs.length * 120000; // a normal run needs ~19 s per language; this only stops a hung browser
  const bail = setTimeout(async () => { console.error('timeout after ' + budget / 1000 + ' s: closing the browser'); try { if (browser) await browser.close(); } catch (e) { /* gone */ } process.exit(2); }, budget);
  const stop = async () => { try { if (browser) await browser.close(); } catch (e) { /* gone */ } process.exit(130); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  try {
    checkIcon(path.join(WWW, 'icons', 'icon-512.png'));
    browser = await chromium.launch();
    const comp = await openComposer(browser);
    for (const lang of sel.langs) {
      const t1 = Date.now(); let raws = [];
      if (opt['raw-in']) raws = NAMES.map((n, i) => fs.readFileSync(path.join(opt['raw-in'], lang + '-' + (i + 1) + '.png')));
      else {
        const game = await openGame(browser, lang);
        try { raws = await captureAll(game); } finally { await game.ctx.close(); }
        if (game.errors.length) throw new Error(lang + ': the game threw ' + game.errors.length + ' uncaught error(s) (first: ' + game.errors[0] + '); not publishing screenshots of a broken UI');
      }
      if (opt.raw) { fs.mkdirSync(opt.raw, { recursive: true }); raws.forEach((b, i) => fs.writeFileSync(path.join(opt.raw, lang + '-' + (i + 1) + '.png'), b)); }
      const jpgs = []; for (let i = 0; i < NAMES.length; i++) jpgs.push(await compose(comp, raws[i], CAPTIONS[lang][i], lang, i));
      checkOutputs(jpgs, lang);
      for (const dir of sel.dirs[lang]) {
        const img = path.join(OUT_ROOT, dir, 'images'), ph = path.join(img, 'phoneScreenshots');
        fs.mkdirSync(ph, { recursive: true });
        fs.readdirSync(ph).forEach(f => { if (/\.(jpe?g|png|webp)$/i.test(f)) fs.unlinkSync(path.join(ph, f)); }); // no stale screenshots survive
        jpgs.forEach((j, i) => fs.writeFileSync(path.join(ph, NAMES[i] + '.jpg'), j));
        fs.copyFileSync(path.join(WWW, 'icons', 'icon-512.png'), path.join(img, 'icon.png'));
      }
      log(lang, 'done in ' + ((Date.now() - t1) / 1000).toFixed(1) + ' s ->', sel.dirs[lang].join(', '), '|', jpgs.map(j => Math.round(j.length / 1024) + ' KB').join(' '));
    }
    await comp.ctx.close();
  } finally { clearTimeout(bail); if (browser) await browser.close(); }
  log(warnings ? warnings + ' warning(s)' : 'no warnings');
  return { warnings, strict: !!opt.strict };
}

module.exports = { run, NAMES, CAPTIONS };
if (require.main === module) run(process.argv.slice(2)).then(r => { if (r.warnings && r.strict) process.exit(3); }).catch(e => { console.error(e); process.exit(1); });
