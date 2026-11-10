// Simge denetimi (ART_DIRECTION bolum 6): hicbir ekranda pictograf (renkli emoji) gorunmemeli - ozel simgeyle degisir ya da kaldirilir.
// node tests/art-audit.js [lang=tr] [WxH=412x915] [only,names]
//   FAIL (cikis 1): .vh (gorunmez test ikizi), script, style, svg, textarea disinda herhangi bir metin dugumunde, title/alt/placeholder/aria-label ozniteliklerinde ve
//                   ::before / ::after content'inde: (a) art/icons/manifest.json map[] ya da drop[] kod noktasi YA DA (b) herhangi bir \p{Extended_Pictographic} / \p{Emoji_Presentation}
//                   karakteri (haritada olmayan YENI bir emoji de yakalanir). VS16 / ZWJ yok sayilir; keep[] listesi serbest (ok, tipografi, tuval ucgenleri, xx ayraclari).
//                   + 18 css px altina dusen yuvarlak muhur / kalkan simgesi (act / rule / perk / hero; sembol kutunun ~17/32'si: secilemez olur). ui.js .rd + theme.css --rdmin 19 css px tabani saglar.
//   RAPOR (yalniz bilgi, cikis kodunu etkilemez): 44 css px altindaki dugme / baglanti dokunma hedefleri; satir sonunda yetim kalan simge / sayi ciftleri (simge bir satirda, sayisi ya da
//                   etiketi sonrakinde); yanindaki harfin baslik yuksekligi ortasindan >2.5 css px kayik simgeler.
//   AUDIT_SHOTS=<klasor> node tests/art-audit.js ... : her taramanin ekran goruntusunu de yazar (gorsel inceleme).
// Her bulgu: ekran adi + secici yolu + metin yazdirilir. Ekranlar: tests/ui-shots.js tablosu + modallar (brifing serit/acik alan/patron, ayarlar, dil, needGems, ganimet,
// sonuc zafer/yenilgi), ordu (kahraman kartlari), magaza, hazine, gorevler, cark, ogretici, savas HUD durumlari, toast akislari, test saglayici ekranlari.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const lang = process.argv[2] || 'tr', [W, H] = (process.argv[3] || '412x915').split('x').map(Number), only = (process.argv[4] || '').split(',').filter(Boolean);
const SHOTS = process.env.AUDIT_SHOTS || ''; // klasor verilirse her tarama ayrica <klasor>/<ekran>.png olarak kaydedilir (gorsel inceleme, 2x)
const ROOT = path.join(__dirname, '..'), URL = 'file://' + path.join(ROOT, 'www', 'index.html');
const LOC = { tr: 'tr-TR', en: 'en-US', es: 'es-ES', pt: 'pt-BR', ru: 'ru-RU', zh: 'zh-CN' };
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'art', 'icons', 'manifest.json'), 'utf8'));
const CPS = manifest.map.concat(manifest.drop).map(e => parseInt(e.cp, 16)).filter(c => c !== 0xFE0F);
const KEEP = (manifest.keep || []).map(e => parseInt(e.cp, 16));
const stars = {}; for (let i = 1; i <= 29; i++) stars[i] = (i % 3) + 1;
const today = new Date().toISOString().slice(0, 10);
const BASE = { v: 1, tutorialDone: true, tutorialDone2: true, fieldTutDone: true, langChosen: true, seenVersion: '0.10', cleared: 29, coins: 4200, gems: 180, stars, stats: { totalStars: 58, wins: 29 }, daily: { lastDay: today, claimedToday: true, streak: 3 } };
const wait = (p, ms) => p.waitForTimeout(ms);
const ev = (p, fn, arg) => p.evaluate(fn, arg);

// ---- sayfa icinde calisan tarayici islevi: metin dugumleri + oznitelikler + sahte oge icerigi + simge yerlesimi + kucuk dokunma hedefleri
function pageScan(arg) {
  const set = new Set(arg.cps), keep = new Set(arg.keep), bad = [], small = [], orphans = [], offc = [], tiny = [];
  const PICT = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;
  const pth = (el) => { const parts = []; let e = el; while (e && e.nodeType === 1 && e.id !== 'stage' && parts.length < 6) { let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; else if (e.className && typeof e.className === 'string') s += '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.'); parts.unshift(s); e = e.parentElement; } return parts.join(' > '); };
  const hit = (s) => { for (const ch of s) { const cp = ch.codePointAt(0); if (cp === 0xFE0F || cp === 0x200D || keep.has(cp)) continue; if (set.has(cp) || PICT.test(ch)) return cp; } return 0; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement; if (!el || el.closest('.vh, script, style, svg, textarea, noscript')) continue;
    const c = hit(n.nodeValue); if (c) bad.push({ where: pth(el), text: n.nodeValue.trim().slice(0, 70), cp: c.toString(16).toUpperCase(), kind: 'text' });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[title],[alt],[placeholder],[aria-label]'), (el) => {
    if (el.closest('.vh, svg')) return;
    ['title', 'alt', 'placeholder', 'aria-label'].forEach((a) => { const v = el.getAttribute(a); if (v) { const c = hit(v); if (c) bad.push({ where: pth(el), text: a + '="' + v.slice(0, 50) + '"', cp: c.toString(16).toUpperCase(), kind: 'attr' }); } });
  });
  // ::before / ::after content (sahte ogelerle gelen pictograf; computed content tirnakli dizgedir, attr() cozulmus gelir)
  Array.prototype.forEach.call(document.body.querySelectorAll('*'), (el) => {
    if (el.closest('.vh, script, style, svg, textarea, noscript')) return;
    ['::before', '::after'].forEach((ps) => { const v = getComputedStyle(el, ps).content; if (v && v !== 'none' && v !== 'normal') { const c = hit(v); if (c) bad.push({ where: pth(el) + ps, text: v.slice(0, 50), cp: c.toString(16).toUpperCase(), kind: 'pseudo' }); } });
  });
  const seen = new Set();
  Array.prototype.forEach.call(document.querySelectorAll('button, a, [role="button"], .btn, .toggle[data-act]'), (el) => {
    if (seen.has(el)) return; seen.add(el);
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return;
    if (Math.min(r.width, r.height) < 43.5) small.push({ where: pth(el), size: Math.round(r.width) + 'x' + Math.round(r.height), text: (el.textContent || '').trim().slice(0, 30) });
  });
  // ---- simge yerlesimi: satir icinde (akis) duran svg.i ogeleri
  const charRect = (node, idx) => { const r = document.createRange(); r.setStart(node, idx); r.setEnd(node, idx + 1); const l = r.getClientRects(); return l.length ? l[0] : null; };
  // gorsel merkez: yanindaki harfin BASLIK yuksekligi ortasi (satir kutusu ya da aksan payi degil); CJK / noktalama = em kutusunun ortasi
  const cvx = document.createElement('canvas').getContext('2d');
  const optY = (el, ch, rect) => {
    if (!el || !/[0-9%A-Za-z\u00C0-\u024F\u0400-\u04FF]/.test(ch || '')) return rect.top + rect.height / 2;
    const cs = getComputedStyle(el); cvx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const m = cvx.measureText('H'), fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
    if (!(fa > 0) || m.actualBoundingBoxAscent === undefined) return rect.top + rect.height / 2;
    return rect.top + (fa - m.actualBoundingBoxAscent / 2) * (rect.height / (fa + fd));
  };
  const near = (node, dir) => { // simgenin hemen yanindaki ilk anlamli parca: { rect, ch } (bosluk-yalniz metin dugumleri atlanir)
    let x = dir > 0 ? node.nextSibling : node.previousSibling;
    while (x && x.nodeType === 3 && !/\S/.test(x.nodeValue)) x = dir > 0 ? x.nextSibling : x.previousSibling;
    if (!x) return null;
    if (x.nodeType === 3) { const m = dir > 0 ? /\S/.exec(x.nodeValue) : null; let idx; if (dir > 0) idx = m.index; else { idx = x.nodeValue.length - 1; while (idx > 0 && /\s/.test(x.nodeValue[idx])) idx--; } const r = charRect(x, idx); return r ? { rect: r, ch: x.nodeValue[idx], txt: true, cy: optY(x.parentElement, x.nodeValue[idx], r) } : null; }
    if (x.nodeType === 1) { if (/^(svg|br)$/i.test(x.tagName)) return null; const rs = x.getClientRects(); if (!rs.length) return null; const rr = dir > 0 ? rs[0] : rs[rs.length - 1], cc = (x.textContent || '').trim().slice(dir > 0 ? 0 : -1); return { rect: rr, ch: cc, txt: false, cy: optY(x, cc, rr) }; }
    return null;
  };
  Array.prototype.forEach.call(document.querySelectorAll('svg.i'), (ic) => {
    if (ic.closest('.vh, .wheel, #tut-hand, .node, .flagmark')) return;
    const r = ic.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(ic); if (cs.visibility === 'hidden') return;
    const use = ic.querySelector('use'), href = use ? (use.getAttribute('href') || '') : '', id = href.replace('#', '');
    // 18 css px altinda yuvarlak muhur (act / rule / perk) ve kahraman kalkani: yuvarlagin sembolu (kutunun ~17/32'si) 18 px altinda secilemez
    if (/^ic-(act|rule|perk|hero)-/.test(id) && r.width < 17.5 && !ic.closest('#perk-row i')) tiny.push({ where: pth(ic), id: id, size: Math.round(r.width * 10) / 10 });
    const par = ic.parentElement, pd = par ? getComputedStyle(par).display : ''; if (!par || /flex|grid/.test(pd) || pd === 'table-cell' && false) return;
    const cy = r.top + r.height / 2, nx = near(ic, 1), pv = near(ic, -1);
    if (nx && nx.rect.height > 0) { const dy = nx.rect.top + nx.rect.height / 2 - cy; if (dy > nx.rect.height * 0.6) orphans.push({ where: pth(ic), text: 'icon ' + id + ' | next: ' + (nx.ch || '?') + ' on next line', kind: 'icon-then-text' }); else if (Math.abs(nx.cy - cy) > 2.5) offc.push({ where: pth(ic), id: id, dy: Math.round((cy - nx.cy) * 10) / 10 }); }
    // "80 [simge]": sayi simgenin KENDI sayisiysa (simgeden sonra sayi yok); "[para]300 [elmas]5" gibi onceki cifte ait sayi yetim sayilmaz
    if (pv && pv.rect.height > 0 && /[0-9%]/.test(pv.ch || '') && !(nx && /[0-9]/.test(nx.ch || ''))) { const dy = cy - (pv.rect.top + pv.rect.height / 2); if (dy > pv.rect.height * 0.6) orphans.push({ where: pth(ic), text: 'number "' + pv.ch + '" | icon ' + id + ' on next line', kind: 'number-then-icon' }); else if (!nx && Math.abs(pv.cy - cy) > 2.5) offc.push({ where: pth(ic), id: id, dy: Math.round((cy - pv.cy) * 10) / 10 }); }
  });
  return { bad: bad, small: small, orphans: orphans, offc: offc, tiny: tiny };
}

const SCREENS = [];
const def = (name, run, o) => SCREENS.push(Object.assign({ name, run }, o || {}));
const MON = { mon: true }; // test saglayici (sahte reklam / odeme): localStorage sv.monetize = test

// ---- ana menu + sefer merkezi sekmeleri
def('home', async p => { await wait(p, 600); });
['map', 'army', 'shop', 'vault', 'quests'].forEach(t => def(t, p => ev(p, tab => Z.UI.showHub(tab), t)));
def('army-heroes', async p => { await ev(p, () => { Z.Save.data.heroOwned.yildiz = true; Z.Save.data.heroOwned.demir = true; Z.Save.data.hero = 'yildiz'; Z.UI.showHub('army'); document.querySelectorAll('#tab-content .sect')[1].scrollIntoView(); }); await wait(p, 300); });
def('army-locked', async p => { await ev(p, () => { Z.UI.showHub('army'); }); await wait(p, 300); }, { save: { cleared: 2, stats: { totalStars: 3, wins: 2 } } }); // sahipsiz birlikler = hayalet silueti, sahipsiz kahramanlar = bos kalkan
def('army-camp', async p => { await ev(p, () => { Z.UI.showHub('army'); document.getElementById('tab-content').scrollTop = 99999; }); await wait(p, 300); });
def('vault-wheel', async p => { await ev(p, () => { Z.UI.showHub('vault'); document.getElementById('tab-content').scrollTop = 600; }); await wait(p, 200); });
def('map-top', async p => { await ev(p, () => { Z.UI.showHub('map'); document.getElementById('tab-content').scrollTop = 0; }); await wait(p, 200); });
// ---- brifing modallari
def('brief-lane', p => ev(p, () => { Z.UI.showHub('map'); Z.UI.levelModal(6); }));
def('brief-field', p => ev(p, () => { Z.UI.showHub('map'); Z.UI.levelModal(8); }));
def('brief-boss', p => ev(p, () => { Z.UI.showHub('map'); Z.UI.levelModal(10); }));
def('brief-heroes', p => ev(p, () => { Object.keys(Z.HEROES).forEach(h => { Z.Save.data.heroOwned[h] = true; }); Z.UI.showHub('map'); Z.UI.levelModal(7); }));
def('brief-hard', p => ev(p, () => { Z.Save.data.hardCleared[7] = 1; Z.Save.data.hardCleared[8] = 2; Z.UI.showHub('map'); Z.UI.levelModal(7, 1); }));
def('brief-rules-objectives', async (p, scan) => { // her kural icin bir brifing + her acik alan hedefi icin bir brifing
  const lv = await ev(p, () => { const seen = {}, out = [], objs = {}; for (let n = 1; n <= Z.MAX_LEVEL; n++) { const i = Z.levelInfo(n); if (!seen[i.rule]) { seen[i.rule] = 1; out.push(n); } if (i.type === 'field') { const o = Z.fieldObjective(n, [i.rule]); if (!objs[o]) { objs[o] = 1; out.push(n); } } } return out; });
  for (const n of lv) { await ev(p, x => { Z.UI.showHub('map'); Z.UI.levelModal(x); }, n); await wait(p, 320); await scan('brief-level-' + n); }
});
def('daily-modal', p => ev(p, () => { Z.UI.showHub('map'); Z.UI.dailyModal(); }));
def('endless-modal', p => ev(p, () => { Z.UI.showHub('map'); Z.UI.endlessModal(); }));
// ---- ayarlar ve alt pencereleri
def('settings', p => ev(p, () => { Z.UI.showHub('map'); Z.UI.settingsModal(); }));
def('settings-export', async p => { await ev(p, () => { Z.UI.showHub('map'); Z.UI.settingsModal(); }); await wait(p, 200); await p.click('[data-act="exp"]'); await wait(p, 200); });
def('settings-import', async p => { await ev(p, () => { Z.UI.showHub('map'); Z.UI.settingsModal(); }); await wait(p, 200); await p.click('[data-act="imp"]'); await wait(p, 200); });
def('settings-reset', async p => { await ev(p, () => { Z.UI.showHub('map'); Z.UI.settingsModal(); }); await wait(p, 200); await p.click('[data-act="reset"]'); await wait(p, 200); });
def('lang', p => ev(p, () => { Z.UI.showHub('map'); Z.UI.langModal(false); }));
def('need-gems', p => ev(p, () => { Z.UI.showHub('shop'); Z.UI.needGems(500); }));
def('whats-new', p => ev(p, () => { Z.UI.showHub('map'); Z.UI.whatsNew(); }));
def('welcome-daily', p => ev(p, () => { Z.Save.data.daily.claimedToday = false; Z.UI.showHub('map'); Z.UI.welcome(); }));
def('welcome-first', p => ev(p, () => { Z.Save.data.tutorialDone = false; Z.UI.showHub('map'); Z.UI.welcome(); }));
// ---- toast akislari (gercek tiklamalar)
def('toast-star-claim', async p => { await ev(p, () => { Z.UI.showHub('map'); document.getElementById('tab-content').scrollTop = 0; }); await wait(p, 200); const b = p.locator('[data-star]').first(); if (await b.count()) { await b.click(); await wait(p, 300); } });
def('toast-daily-claim', async p => { await ev(p, () => { Z.Save.data.daily.claimedToday = false; Z.UI.showHub('vault'); }); await wait(p, 250); await p.click('[data-daily]'); await wait(p, 300); });
def('toast-wheel-spin', async p => { await ev(p, () => { Z.UI.showHub('vault'); }); await wait(p, 250); await p.click('#spin-btn'); await wait(p, 3900); });
def('toast-quest-claim', async p => { await ev(p, () => { const q = Z.Save.data.quests.list[0]; q.prog = Z.Save.questDef(q.id).target; Z.UI.showHub('quests'); }); await wait(p, 250); await p.click('[data-quest]'); await wait(p, 300); });
def('toast-ach-claim', async p => { await ev(p, () => { Z.UI.showHub('quests'); }); await wait(p, 250); const b = p.locator('[data-ach].gold').first(); if (await b.count()) { await b.click(); await wait(p, 300); } });
def('toast-collect', async p => { await ev(p, () => { Z.UI.showHub('vault'); }); await wait(p, 250); await p.click('[data-collect]'); await wait(p, 300); });
def('toast-market-buy', async p => { await ev(p, () => { Z.UI.showHub('vault'); }); await wait(p, 250); await p.click('[data-buy="b_gold"]'); await wait(p, 300); });
// ---- test saglayici: sahte reklam + sahte odeme penceresi
def('sim-ad', async (p, scan) => { await ev(p, () => { Z.UI.showHub('shop'); }); await wait(p, 250); await p.click('[data-ad="gems"]'); await p.waitForSelector('#sim-overlay'); await wait(p, 200); await scan('sim-ad-count'); await wait(p, 3300); await scan('sim-ad-done'); await p.click('#sim-close'); await wait(p, 300); }, MON);
def('sim-purchase', async (p, scan) => { await ev(p, () => { Z.UI.showHub('shop'); }); await wait(p, 250); await p.click('[data-iap="' + (await ev(p, () => Z.MONEY.products[0].id)) + '"]'); await p.waitForSelector('#sim-overlay'); await wait(p, 200); await scan('sim-purchase-box'); await p.click('#sim-ok'); await wait(p, 300); }, MON);
def('shop-live', p => ev(p, () => { Z.UI.showHub('shop'); }), MON);
// ---- savas HUD (kale kusatmasi)
const place = async (p) => { for (let i = 0; i < 8; i++) { await ev(p, i => { const b = Z.Game.battle; b.gold = 2000; ['spear', 'archer', 'cav'].forEach(t => { b.cooldown[t] = 0; }); b.deploy(['spear', 'archer', 'cav'][i % 3], i % 3); }, i); await wait(p, 260); } };
def('battle-lane', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 12, { diff: 1, boosters: [] }); }); await place(p); await wait(p, 600); });
def('battle-lane-survive', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 16); const b = Z.Game.battle; b.rules = ['survive']; b.rule = 'survive'; Z.UI.hudBuild(b); }); await wait(p, 1300); });
def('battle-lane-combo-perks', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 12); const b = Z.Game.battle; b.perks.gold = 1; b.perks.dmg = 1; b.perks.tower = 1; b.combo = 5; b.gold = 80; }); await wait(p, 1200); });
def('battle-lane-poor-mine-off', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 12); Z.Game.battle.gold = 0; }); await wait(p, 900); });
def('battle-lane-drag', async (p, scan) => { await ev(p, () => { Z.Game.startBattle('campaign', 12); Z.Game.battle.gold = 900; }); await wait(p, 900); // surukleme hayaleti: birlik portresi, sonra kahraman kalkani
  const card = await p.locator('[data-unit]').first().boundingBox(); await p.mouse.move(card.x + card.width / 2, card.y + card.height / 2); await p.mouse.down(); await p.mouse.move(card.x + card.width / 2, card.y - 120, { steps: 5 }); await wait(p, 200); await scan('battle-lane-drag-unit');
  const sk = await p.locator('#btn-skill').boundingBox(); await p.mouse.up(); await p.mouse.move(sk.x + sk.width / 2, sk.y + sk.height / 2); await p.mouse.down(); await p.mouse.move(sk.x + sk.width / 2, sk.y - 160, { steps: 5 }); await wait(p, 200); });
def('pause', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 12); }); await wait(p, 700); await ev(p, () => Z.Game.pause()); await wait(p, 250); });
def('perk-modal-all', async (p, scan) => { // by.perk tablosunun TAMAMI (9 ganimet; cuirass / hourglass / leaf / coffer dahil), ucer ucer teklif; sahte savas nesnesi: modal yalniz perkOffer + pickPerk okur
  const ids = await ev(p, () => Object.keys(Z.PERKS)); await ev(p, () => { Z.UI.showHub('map'); });
  for (let i = 0; i < ids.length; i += 3) { await ev(p, o => { Z.UI.perkModal({ perkOffer: o, pickPerk() {} }, null); }, ids.slice(i, i + 3)); await wait(p, 320); await scan('perk-modal-all-' + (i / 3 + 1)); }
});
def('battle-lane-all-perks', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 12); const b = Z.Game.battle; Object.keys(Z.PERKS).forEach(k => { b.perks[k] = 1; }); b.gold = 80; }); await wait(p, 1200); });
def('perk-modal', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 12); Z.Game.battle.stats.kills = Z.PERK_KILLS[0]; }); await p.waitForSelector('.perk', { timeout: 6000 }); await wait(p, 300); });
for (let k = 1; k <= 7; k++) def('tutorial-' + k, async (p) => {
  await ev(p, () => { Z.Game.startBattle('campaign', 1); }); await wait(p, 500);
  for (let i = 1; i < k; i++) { await ev(p, () => { const ok = document.getElementById('tut-ok'); if (ok && !ok.classList.contains('hidden')) ok.click(); else { const b = Z.Game.battle; b.gold = 400; b.cooldown[b.deck[0]] = 0; b.deploy(b.deck[0], 0); b.useSkill(1); if (b.mineCost()) b.upgradeMine(); } }); await wait(p, 350); }
  await wait(p, 300);
}, { save: { tutorialDone2: false } });
// ---- savas HUD (kale onu muharebesi) + hedef turleri
def('battle-field-prep', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 8); }); await wait(p, 900); }, { save: { fieldTutDone: false } });
def('battle-field', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 8); }); await wait(p, 900); await ev(p, () => { const b = Z.Game.battle; b.autoPlace(); b.startBattle(); }); await wait(p, 2500); });
def('battle-field-objectives', async (p, scan) => {
  const lv = await ev(p, () => { const objs = {}, out = []; for (let n = 1; n <= Z.MAX_LEVEL; n++) { const i = Z.levelInfo(n); if (i.type === 'field') { const o = Z.fieldObjective(n, [i.rule]); if (!objs[o]) { objs[o] = 1; out.push(n); } } } return out; });
  for (const n of lv) { await ev(p, x => { Z.Game.startBattle('campaign', x); const b = Z.Game.battle; b.autoPlace(); b.startBattle(); }, n); await wait(p, 1500); await scan('battle-field-level-' + n); await ev(p, () => Z.Game.toMenu()); await wait(p, 300); }
});
// ---- sonuc ekranlari
def('result-win', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 12, { diff: 1, boosters: [] }); }); await wait(p, 700); await ev(p, () => { Z.Game.battle.hitBase(1, 1e9, 'spear'); }); await p.waitForSelector('.modal h1', { timeout: 8000 }); await wait(p, 900); });
def('result-win-chest-open', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 12, { diff: 1, boosters: [] }); }); await wait(p, 700); await ev(p, () => { Z.Game.battle.hitBase(1, 1e9, 'spear'); }); await p.waitForSelector('[data-act="chest"]', { timeout: 8000 }); await wait(p, 600); await ev(p, () => document.querySelector('[data-act="chest"]').click()); await wait(p, 1100); }, MON);
def('result-win-new-unit', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 6); }); await wait(p, 700); await ev(p, () => { Z.Game.battle.hitBase(1, 1e9, 'spear'); }); await p.waitForSelector('.modal h1', { timeout: 8000 }); await wait(p, 900); }, { save: { cleared: 5, stars: {}, stats: { totalStars: 0, wins: 5 } } });
def('result-lose', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 12, { diff: 1, boosters: [] }); }); await wait(p, 700); await ev(p, () => { Z.Game.battle.hitBase(0, 1e9, 'spear'); }); await p.waitForSelector('.modal h1', { timeout: 8000 }); await wait(p, 900); }, MON);
def('result-endless', async p => { await ev(p, () => { Z.Game.startBattle('endless', 1); }); await wait(p, 700); await ev(p, () => { Z.Game.battle.hitBase(0, 1e9, 'spear'); }); await p.waitForSelector('.modal h1', { timeout: 8000 }); await wait(p, 900); });
def('result-field-win', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 8); }); await wait(p, 800); await ev(p, () => { const b = Z.Game.battle; b.autoPlace(); b.startBattle(); }); await wait(p, 600); await ev(p, () => { const b = Z.Game.battle; b.kill(b.cmdE); }); await p.waitForSelector('.modal h1', { timeout: 8000 }); await wait(p, 900); });
def('result-field-lose', async p => { await ev(p, () => { Z.Game.startBattle('campaign', 9); }); await wait(p, 800); await ev(p, () => { const b = Z.Game.battle; b.phase = 'battle'; b.kill(b.cmdP); }); await p.waitForSelector('.modal h1', { timeout: 8000 }); await wait(p, 900); });

(async () => {
  const b = await chromium.launch(); const fails = [], errors = [], smalls = new Map(), orphs = new Map(), offs = new Map(), tinies = new Map(); let screens = 0;
  try {
    for (const sc of SCREENS) {
      if (only.length && !only.includes(sc.name)) continue;
      const ctx = await b.newContext({ locale: LOC[lang] || 'tr-TR', viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
      const save = JSON.stringify(Object.assign({}, BASE, sc.save || {}));
      await ctx.addInitScript(([l, s, mon]) => { try { if (!localStorage.getItem('__i')) { localStorage.setItem('__i', '1'); localStorage.setItem('sefervakti.lang', l); localStorage.setItem('zafarion.save.v1', s); if (mon) localStorage.setItem('sv.monetize', 'test'); } } catch (e) {} }, [lang, save, !!sc.mon]);
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(sc.name + ': pageerror ' + e.message));
      p.on('console', m => { if (m.type() === 'error') errors.push(sc.name + ': console ' + m.text().slice(0, 160)); });
      const scan = async (label) => {
        const r = await p.evaluate(pageScan, { cps: CPS, keep: KEEP }); screens++;
        if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, label + '.png') }); }
        r.bad.forEach(o => fails.push({ screen: label, o }));
        r.small.forEach(o => { const k = o.where + ' ' + o.size; if (!smalls.has(k)) smalls.set(k, { screen: label, o }); });
        r.orphans.forEach(o => { const k = o.where + ' ' + o.text; if (!orphs.has(k)) orphs.set(k, { screen: label, o }); });
        r.offc.forEach(o => { const k = o.where + ' ' + o.id; if (!offs.has(k)) offs.set(k, { screen: label, o }); });
        r.tiny.forEach(o => { const k = o.where + ' ' + o.id; if (!tinies.has(k)) tinies.set(k, { screen: label, o }); });
      };
      try {
        await p.goto(URL); await p.waitForFunction(() => globalThis.Z && Z.ready, null, { timeout: 15000 }); await wait(p, 900);
        await sc.run(p, scan); await wait(p, 300);
        await scan(sc.name);
        console.log('ok', sc.name);
      } catch (e) { errors.push(sc.name + ': ' + e.message.split('\n')[0]); console.log('ERR', sc.name, e.message.split('\n')[0]); }
      await ctx.close();
    }
  } finally { await b.close(); }
  const uniq = new Map(); fails.forEach(f => { const k = f.o.where + '|' + f.o.text + '|' + f.o.cp; if (!uniq.has(k)) uniq.set(k, f); });
  uniq.forEach(f => console.log('FAIL [' + f.screen + '] ' + f.o.kind + ' U+' + f.o.cp + ' ' + f.o.where + '  "' + f.o.text + '"'));
  smalls.forEach(s => console.log('REPORT tap<44px [' + s.screen + '] ' + s.o.where + ' ' + s.o.size + '  "' + s.o.text + '"'));
  orphs.forEach(s => console.log('REPORT icon-orphan [' + s.screen + '] ' + s.o.where + '  ' + s.o.text));
  offs.forEach(s => console.log('REPORT icon-offcentre [' + s.screen + '] ' + s.o.where + ' ' + s.o.id + ' ' + s.o.dy + 'px'));
  tinies.forEach(s => console.log('FAIL roundel<18px [' + s.screen + '] ' + s.o.where + ' ' + s.o.id + ' ' + s.o.size + 'px'));
  errors.forEach(e => console.log('ERROR ' + e));
  console.log('Denetim (' + lang + ' ' + W + 'x' + H + '): ' + screens + ' tarama, ' + uniq.size + ' simge ihlali, ' + smalls.size + ' kucuk dokunma hedefi (rapor), ' + orphs.size + ' yetim simge/sayi (rapor), ' + offs.size + ' kayik simge (rapor), ' + tinies.size + ' kucuk muhur simgesi, ' + errors.length + ' hata');
  process.exit(uniq.size || tinies.size || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
