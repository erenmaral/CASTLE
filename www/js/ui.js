// Sefer Vakti - arayuz: ana menu sekmeleri, modallar, savas HUD'u
(function (Z) {
  'use strict';
  var $t = Z.t || function (s) { return s; };
  var M = Z.Monetize, S = Z.Save, A = Z.Audio, $ = function (id) { return document.getElementById(id); };
  var UI = Z.UI = { tab: 'map', game: null, vaultTimer: null };
  var handlers = {};

  // ---- simge yardimcilari (ART_DIRECTION bolum 6): Z.Icons (js/icons.js). Cizilmemis simge ya da Icons yok = verilen yedek (emoji ya da bos): oyun yine acilir.
  // Iki yol: (1) eslemeli emoji -> simge, metnin bulundugu yerde: zi(html) HTML dizgesinde, UI.ico(duz metin) / UI.setIco(oge, duz metin) duz metinde (kacis + Z.ico + innerHTML);
  //          (2) veri tabanli yerler (kahraman, kural, kademe, hedef, savas turu, yetenek, hazirlik karti, pazar, paket): emoji data.js'te kalir, simge Z.Icons.by tablosundan
  //              anahtarla aranir (UI.heroIco ... UI.packIco); belirsiz emojiler (kalkan, kilic, altin kese...) Z.ICO'da yalniz tek bir varsayilana gider.
  var IC = Z.Icons || null;
  function icoId(id, fb, cls) { return IC && IC.has(id) ? IC.svg(id, cls) : (fb || ''); }
  function icoBy(tab, key, fb, cls) { var t = IC && IC.by && IC.by[tab]; return icoId(t && t[key], fb, cls); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function zi(html) { return Z.ico ? Z.ico(html) : html; }
  UI.ico = function (str) { return zi(esc(str)); };
  // twin: gorunmez ikiz (.vh): testlerin okudugu simge karakteri (yalniz #info-title, #rule-chip, #skill-ico); harf icermez (genislik / i18n denetimi degismez)
  UI.setIco = function (el, str, twin) { el.innerHTML = zi(esc(str)) + (twin ? '<span class="vh" aria-hidden="true">' + esc(twin) + '</span>' : ''); };
  // kahraman kalkani: size S (<= 20 css px, duz siluet) | M | L (96-128u, ayrintili); owned = turuncu bordur (--f2), sahipsiz = cls 'ud' (bos)
  UI.heroIco = function (id, size, cls) {
    var h = Z.HEROES[id], t = IC && IC.by && IC.by.hero, base = t && t[id], v = size === 'S' ? '-s' : size === 'L' ? '-l' : '';
    return icoId(IC && IC.has(base + v) ? base + v : base, h ? h.icon : '', cls);
  };
  UI.ruleIco = function (id, cls) { var r = Z.RULES[id]; return icoBy('rule', id, r ? r.icon : '', cls); };
  UI.tierIco = function (i, cls) { var D = Z.DIFFS[i]; return icoBy('tier', i, D ? D.icon : '', cls); };
  UI.objIco = function (id, cls) { var o = Z.FIELD_OBJECTIVES[id]; return icoBy('objective', id, o ? o.icon : '', cls); };
  UI.battleIco = function (type, cls) { return icoBy('battle', type === 'field' ? 'field' : 'castle', type === 'field' ? '🏕️' : '🏰', cls); };
  UI.perkIco = function (id, cls) { var p = Z.PERKS[id]; return icoBy('perk', id, p ? p.icon : '', cls); };
  UI.boosterIco = function (id, cls) { var b = Z.BOOSTERS[id]; return icoBy('booster', id, b ? b.icon : '', cls); };
  UI.marketIco = function (m, cls) { return icoBy('market', m.id, m.icon, cls); };
  UI.packIco = function (i, cls) { var t = IC && IC.by && IC.by.pack; return icoId(t && t[i % t.length], '💎', cls); };
  function star3(n) { var s = '', i; for (i = 1; i <= 3; i++) s += '<span class="' + (i <= n ? 'on' : 'off') + '">' + (i <= n ? icoId('ic-cur-mullet', '★') : icoId('ic-cur-mullet-empty', '★')) + '</span>'; return '<span class="stars">' + s + '</span>'; }
  function unitStats(id, lvl) {
    var u = Z.UNITS[id];
    return { hp: Math.round(u.hp * Z.unitHpMult(lvl)), dmg: Math.round(u.dmg * Z.unitDmgMult(lvl)) };
  }
  function avgDeckLevel() {
    var d = S.data, sum = 0; d.deck.forEach(function (u) { sum += d.unitLvl[u]; });
    return d.deck.length ? sum / d.deck.length : 1;
  }
  function recommendedLevel(n) { return Math.max(1, Math.round(Z.expectedLevel(n) * 0.9)); }

  // ---------------------------------------------------------------- toast / modal
  var toastTimer = null;
  UI.toast = function (msg) {
    var t = $('toast'); UI.setIco(t, msg); t.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2200);
  };
  UI.modal = function (html, acts) {
    var layer = $('modal-layer'), ps, pi;
    layer.innerHTML = '<div class="modal">' + zi(html) + '</div>';
    // sessiz bolge (S2): elmas desenin ustune oturan okuma paragraflari duz --night plakaya (.qp) alinir; vellum hikaye/kural kutusu, sprite satiri ve gruplanmis .qz hariclenir
    ps = layer.querySelectorAll('.modal p');
    for (pi = 0; pi < ps.length; pi++) if (!ps[pi].closest('.qz,.rule-box,.tbl') && !/(^|\s)(story|deck)(\s|$)/.test(ps[pi].className)) ps[pi].classList.add('qp');
    layer.classList.remove('hidden');
    handlers = acts || {};
    return layer.firstChild;
  };
  UI.closeModal = function () { $('modal-layer').classList.add('hidden'); $('modal-layer').innerHTML = ''; handlers = {}; };
  UI.modalOpen = function () { return !$('modal-layer').classList.contains('hidden'); };

  // ---------------------------------------------------------------- baslangic
  // Oyun adi dile gore: sekme basligi, logolar, ana ekran basligi ("AD:" / "ALT BASLIK")
  UI.applyName = function () {
    var nm = Z.NAME, up = nm.toLocaleUpperCase(Z.lang === 'zh' ? 'zh' : Z.lang), m = up.match(/^(.*?[:：])\s*(.*)$/);
    document.title = nm;
    var hl = document.querySelector('.hl-name'); if (hl) { hl.textContent = ''; if (m) { hl.appendChild(document.createTextNode(m[1])); hl.appendChild(document.createElement('br')); hl.appendChild(document.createTextNode(m[2])); } else hl.textContent = up; }
    Array.prototype.forEach.call(document.querySelectorAll('.logo'), function (el) { el.textContent = up; });
  };
  // Birlik simgesi: oyundaki gercek karakter cizimi (sprite) -> resim. Portre = halesiz, zemin cizgisiz (R.icoMode + R.px = 3; resim bir kez pisirilir, onbellekte).
  // ghost: oyuncunun henuz sahip olmadigi birlik = R.ghostSprite (--ink2 silueti .45, bos/underdrawn). Cizim yoksa: sinifin karsi-zincir simgesi (varsa) ya da bos (emoji gosterilmez).
  var iconCache = {};
  UI.unitImg = function (id, team, h, ghost) {
    var u = Z.UNITS[id], key = id + (team ? 1 : 0) + (ghost ? 'g' : ''), url = iconCache[key];
    if (url === undefined) {
      var R = Z.Render, o = R.px, oi = R.icoMode;
      try {
        R.px = 3; R.icoMode = true;
        var cv = ghost ? R.ghostSprite(u.cls, team ? 1 : 0) : R.renderSprite(u.cls, team ? 1 : 0, 'i', 0), w = cv.width, hh = cv.height, x0 = w, y0 = hh, x1 = 0, y1 = 0, xx, yy;
        if (ghost && cv.bbox) { x0 = cv.bbox.x0; y0 = cv.bbox.y0; x1 = cv.bbox.x1; y1 = cv.bbox.y1; } // silueti saydam: kutu ghostSprite'tan gelir
        else { // golgeyi atip karakterin sinirlarina kirp (ust kisim): saydam olmayan piksellerin kutusu
          var px = cv.getContext('2d').getImageData(0, 0, w, hh).data;
          for (yy = 0; yy < hh; yy++) for (xx = 0; xx < w; xx++) if (px[(yy * w + xx) * 4 + 3] > 150) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
        }
        var pad = 4, cw = Math.max(8, x1 - x0 + 1 + pad * 2), ch = Math.max(8, y1 - y0 + 1 + pad * 2), out = document.createElement('canvas'); out.width = cw; out.height = ch;
        out.getContext('2d').drawImage(cv, x0 - pad, y0 - pad, cw, ch, 0, 0, cw, ch); url = out.toDataURL('image/png');
      } catch (e) { url = null; }
      R.px = o; R.icoMode = oi;
      iconCache[key] = url;
    }
    return url ? '<img class="uico' + (ghost ? ' ghost' : '') + '" alt="" src="' + url + '" style="height:' + h + 'px">' : icoBy('unit', id, '');
  };
  // Elmas yetmiyorsa: eksik miktari + eksigi kapatan en kucuk paketi gosterip magazaya yonlendirir
  UI.needGems = function (price) {
    var need = Math.max(1, price - (S.data.gems || 0)), packs = ((Z.MONEY && Z.MONEY.products) || []).filter(function (p) { return p.type === 'gems'; }).sort(function (a, b) { return a.gems - b.gems; });
    var pick = packs.filter(function (p) { return p.gems >= need; })[0] || packs[packs.length - 1];
    UI.modal('<h1>💎 ' + $t('Elmas yetmiyor') + '</h1><div class="qz"><p>' + $t('Bunun için {n} elmas daha gerekiyor.', { n: need }) + '</p>' +
      (pick ? '<p class="small">' + $t('Önerilen paket') + ': <b style="color:var(--gold)">💎 ' + pick.gems + ' · ' + pick.price + '</b></p>' : '') + '</div>' +
      '<div class="actions"><button class="btn small" data-act="close">' + $t('Vazgeç') + '</button><button class="btn gold primary" data-act="shop">💎 ' + $t('Elmas al') + '</button></div>',
      { close: UI.closeModal, shop: function () { UI.closeModal(); UI.showHub('shop'); var c = $('tab-content'); if (c) c.scrollTop = 0; } });
  };
  UI.init = function (game) {
    UI.applyName();
    UI.game = game;
    $('modal-layer').addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!el) return;
      var fn = handlers[el.getAttribute('data-act')];
      A.click();
      if (fn) fn(el);
    });
    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (!b) return;
      A.click(); UI.tab = b.getAttribute('data-tab'); UI.renderHub();
    });
    $('tab-content').addEventListener('click', onTabClick);
    $('btn-settings').addEventListener('click', function () { A.click(); UI.settingsModal(); });
    $('modal-layer').addEventListener('input', function (e) {
      var el = e.target.closest ? e.target.closest('[data-vol]') : null; if (!el) return;
      S.data.settings[el.getAttribute('data-vol')] = +el.value; var lab = el.parentNode.querySelector('b'); if (lab) lab.textContent = el.value; UI.applyVolumes();
    });
    $('modal-layer').addEventListener('change', function (e) { if (e.target.closest && e.target.closest('[data-vol]')) { S.save(); A.click(); } });
    $('btn-home').addEventListener('click', function () { A.click(); UI.showHome(); });
    $('home').addEventListener('click', onHomeClick);
    bindHud();
    setTimeout(UI.prewarmMap, 1500); // harita simgeleri onceden (bkz. prewarmMap)
    setTimeout(UI.prewarmUnits, 1800); // kadro portreleri onceden (bkz. prewarmUnits)
  };
  // Birlik portresi (sprite -> resim) ilk kullanimda 3-19 ms surer; harita ust bolumundeki kadro sirasi, ordu ve savas kartlari ayni onbellegi kullanir:
  // kadro birimleri ana menu bosken, her biri ayri gorevde pisirilir (haritanin ilk acilisi bunu beklemez, yalnizca hazirsa kazanir).
  UI.prewarmUnits = function () {
    if (UI.unitsWarm || !S.data || !S.data.deck) return; UI.unitsWarm = true;
    var q = S.data.deck.slice(), i = 0;
    (function next() {
      if (i >= q.length) return;
      try { UI.unitImg(q[i++], 0, 40); } catch (e) { /* onbellek isitma isteye bagli */ }
      setTimeout(next, 60);
    })();
  };

  // Sefer merkezi: harita / ordu / hazine / gorev (ana menuden ayri ekran)
  UI.applyVolumes = function () { var st = S.data.settings; A.setVolumes((st.musicVol === undefined ? 70 : st.musicVol) / 100, (st.sfxVol === undefined ? 100 : st.sfxVol) / 100); };
  UI.showHub = function (tab) {
    S.rollDay(); if (tab) UI.tab = tab;
    $('home').classList.add('hidden'); $('hub').classList.remove('hidden'); $('hub').classList.add('opaque'); M.setBanner(true); $('hud').classList.add('hidden'); $('game').classList.add('hidden');
    UI.renderHub(); if (UI.game && UI.game.menuHub) UI.game.menuHub();
  };
  UI.hideHub = function () { $('hub').classList.add('hidden'); $('home').classList.add('hidden'); clearInterval(UI.vaultTimer); M.setBanner(false); };

  // Ana menu: arkada canli savas, buyuk dugmeler (harita burada gorunmez)
  UI.showHome = function () {
    S.rollDay();
    $('hub').classList.add('hidden'); $('hud').classList.add('hidden'); $('home').classList.remove('hidden'); clearInterval(UI.vaultTimer); M.setBanner(false);
    UI.renderHome(); if (UI.game && UI.game.menuStart) UI.game.menuStart();
  };
  UI.homeLevel = function () { return Math.min(Z.MAX_LEVEL, S.data.cleared + 1); };
  UI.renderHome = function () {
    var d = S.data, n = UI.homeLevel(), info = Z.levelInfo(n), dots = computeDots();
    $('home-coins').textContent = Z.fmt(d.coins); $('home-gems').textContent = Z.fmt(d.gems);
    UI.setIco($('hb-main'), d.cleared === 0 ? ('▶ ' + $t('İLK SEFERE ÇIK')) : d.cleared >= Z.MAX_LEVEL ? ('▶ ' + $t('SEFERİ TEKRARLA')) : ('▶ ' + $t('SEFERE DEVAM')));
    $('hb-sub').innerHTML = UI.battleIco(info.type) + ' ' + esc((info.type === 'field' ? $t('Kale önü muharebesi') : $t('Kale kuşatması')) + (' · ' + $t('Sefer') + ' ') + n + ' · ' + info.name);
    Array.prototype.forEach.call(document.querySelectorAll('#home [data-home]'), function (b) {
      var k = b.getAttribute('data-home'), old = b.querySelector('.dot'); if (old) old.remove();
      var map = { map: 'map', army: 'army', vault: 'vault', quests: 'quests', shop: 'shop' };
      if (map[k] && dots[map[k]]) { var i = document.createElement('i'); i.className = 'dot'; b.appendChild(i); }
    });
    $('home-ver').textContent = 'v' + Z.VERSION + (Z.BUILD !== 'dev' ? (' · ' + $t('derleme') + ' ') + Z.BUILD : '');
  };
  function onHomeClick(e) {
    var el = e.target.closest('[data-home]'); if (!el) return;
    A.init(); A.click(); var k = el.getAttribute('data-home');
    if (k === 'play') return levelModal(UI.homeLevel());
    if (k === 'daily') { if (S.dailyAvailable()) return UI.dailyModal(); A.deny(); return UI.toast($t('{n}. bölümü kazanınca açılır', { n: Z.DAILY_UNLOCK })); }
    if (k === 'endless') return UI.endlessModal();
    if (k === 'settings') return UI.settingsModal();
    UI.showHub(k);
  }

  UI.renderHub = function () {
    $('cur-coins').textContent = Z.fmt(S.data.coins);
    $('cur-gems').textContent = Z.fmt(S.data.gems);
    var dots = computeDots();
    Array.prototype.forEach.call(document.querySelectorAll('#tabs .tab'), function (t) {
      var k = t.getAttribute('data-tab');
      t.classList.toggle('active', k === UI.tab);
      var d = t.querySelector('.dot'); if (d) d.remove();
      if (dots[k]) { var s = document.createElement('i'); s.className = 'dot'; t.appendChild(s); }
    });
    clearInterval(UI.vaultTimer);
    var c = $('tab-content'), keep = c.scrollTop;
    if (UI.tab === 'map') renderMap(c);
    else if (UI.tab === 'army') renderArmy(c);
    else if (UI.tab === 'vault') renderVault(c);
    else if (UI.tab === 'shop') renderShop(c);
    else renderQuests(c);
    if (UI.tab !== 'map') c.scrollTop = keep;
  };

  function computeDots() {
    var d = S.data, out = { map: false, army: false, vault: false, quests: false, shop: false };
    out.shop = M.canRewarded() && M.rewardedLeft() === Z.MONEY.ads.rewardedPerDay;
    out.vault = !d.daily.claimedToday || S.treasuryPending() >= 150 || S.wheelFree();
    out.map = S.anyStarClaimable() || (S.dailyAvailable() && !d.dailySefer.won);
    if (S.anyAchClaimable()) out.quests = true;
    d.quests.list.concat(d.weekly.list).forEach(function (q) { if (!q.claimed && q.prog >= S.questDef(q.id).target) out.quests = true; });
    d.deck.forEach(function (u) { if (d.coins >= Z.unitUpgradeCost(d.unitLvl[u]) && d.unitLvl[u] < Z.MAX_UNIT_LVL) out.army = true; });
    return out;
  }

  // ---------------------------------------------------------------- SEFER
  // Harita: bolum 8. Yapi sabit (7 .rbg, 7 .realm, >=90 .dec, .flagmark, 105 .node dogrudan <button> cocugu, 42 .fld).
  // Diyar sinirinda 140u'luk ek bosluk: karti (kartus) onceki patronun etiketinden sonra, sonraki diyarin ilk dugumunden once durur.
  // Harita simgeleri CSS arka plani olarak (data: SVG, bir kez <style> olur): dugum basina <use> golge agaci kurmak renderMap'i 3 kat yavaslatiyordu.
  // Anahtar -> sinif: flora .dec.m-<ad>, dugum ici .mi-tower/camp/crown/lock/mul/mul0, kural .mi-r-<kural>, kademe .mi-t1/.mi-t2. Cizilmemis simge: miOk[anahtar] yok -> emoji yedegi.
  var miOk = {}, miCls = [], miDone = false, miCss = '';
  // vars: simge sembolunun --c1/--c2/--ink ozel ozelliklerini data: SVG kokunda gecersiz kilar (bos/underdrawn hal ya da renk duzeltmesi); yok = simgenin kendi renkleri
  function miUrl(id, vars) {
    if (!vars) return IC.dataUrl(id);
    var s = IC.standalone ? IC.standalone(id) : null; if (!s) return IC.dataUrl(id);
    s = s.replace('<svg ', '<svg style="' + vars + '" ');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
  }
  function miRule(key, sel, id, vars) {
    if (miOk[key]) return; if (!IC || !IC.has(id)) return;
    var u = miUrl(id, vars); if (!u) return;
    miOk[key] = 1; miCls.push(sel.slice(1).replace(/\./g, ' ')); miCss += sel + '{background-image:url("' + u + '")}';
  }
  // bos (underdrawn) hal: dolgu yok, ince kesik murekkep cizgi (harita zemininde --ink2); simge kendi Z.Icons.ud degiskenlerini kullanir
  function udVars() { return (IC.ud || '').replace('var(--ud,#C6B684)', '#4B3B2A'); }
  // R1 (Kutsal Topraklar) kaya yigini: soguk gri-lavanta (#CDD2DB) bulut gibi okunuyordu -> sicak kesme tas (#B9AE98), golge yuzu bister
  var TINT = { 'ic-dec-rocks': '--c1:#B9AE98;--c2:#8B7D63' };
  function mapStyle() {
    if (miDone) return; miDone = true;
    if (!IC || !IC.dataUrl || !document.head) return;
    (IC.by.dec || []).forEach(function (row) { row.forEach(function (id) { miRule(id, '.dec.m-' + id.slice(7), id, TINT[id]); }); });
    miRule('tower', '.mi-tower', 'ic-chg-tower'); miRule('camp', '.mi-camp', 'ic-nav-camp'); miRule('crown', '.mi-crown', 'ic-cur-crown'); miRule('lock', '.mi-lock', 'ic-act-lock', udVars());
    miRule('mul', '.mi-mul', 'ic-cur-mullet', '--tk:none'); miRule('mul0', '.mi-mul0', 'ic-cur-mullet-empty');
    Object.keys(IC.by.rule || {}).forEach(function (k) { miRule('r-' + k, '.mi-r-' + k, IC.by.rule[k]); });
    [1, 2].forEach(function (t) { miRule('t' + t, '.mi-t' + t, (IC.by.tier || [])[t]); });
    if (miCss) { var st = document.createElement('style'); st.id = 'map-icons'; st.textContent = miCss; document.head.appendChild(st); }
  }
  // Ilk harita acilisinin maliyetinin buyuk kismi 29 SVG resminin ilk ayristirilmasidir (~45 ms): ana menu bosken (acilistan ~1.5 sn sonra) gorunmez bir kapta
  // her motif bir kez cizdirilir; resimler ayri gorevlerde yuklenir, harita acildiginda hazirdir. Beklemeden acilirsa yalniz eski (soguk) yol calisir.
  UI.prewarmMap = function () {
    if (UI.mapWarm) return; UI.mapWarm = true;
    try {
      mapStyle(); if (!miCls.length) return;
      var box = document.createElement('div'), k;
      box.setAttribute('aria-hidden', 'true'); box.style.cssText = 'position:absolute;left:-200px;top:0;width:30px;height:30px;overflow:hidden;visibility:hidden;pointer-events:none';
      for (k = 0; k < miCls.length; k++) { var e = document.createElement('i'); e.className = 'mi ' + miCls[k]; e.style.cssText = 'width:28px;height:28px'; box.appendChild(e); }
      $('stage').appendChild(box); setTimeout(function () { box.remove(); }, 4000);
    } catch (e) { /* onbellek isitma isteye bagli */ }
  };
  function renderMap(c) {
    var t0 = performance.now(), d = S.data, N = Z.MAX_LEVEL, stepY = 168, topPad = 190, GAP = 140, i, html = '', pts = [], realms = Z.REALMS.length, r, k2;
    mapStyle();
    // patron dugumunun etrafinda nefes payi: oncesinde 6u, sonrasinda 12u (patron etiketi + sonraki dugumun kural madalyonu carpismasin)
    for (i = 1; i <= N; i++) pts.push([360 + Math.sin(i * 0.78) * 200 + Math.sin(i * 0.31) * 38, topPad + (i - 1) * stepY + Z.realmOf(i) * GAP + 6 * Math.floor(i / 5) + 12 * Math.floor((i - 1) / 5)]);
    var h = pts[N - 1][1] + 170, yb = [0];
    for (r = 1; r < realms; r++) yb.push(pts[r * 15 - 1][1] + 112); // diyar siniri: onceki diyarin patron dugumunun etiketi bittikten sonra
    // Catmull-Rom -> kubik Bezier: yumusak kivrimli yol
    function curve(list) {
      if (list.length < 2) return '';
      var out = 'M' + list[0][0].toFixed(1) + ' ' + list[0][1].toFixed(1), k, p0, p1, p2, p3;
      for (k = 0; k < list.length - 1; k++) {
        p0 = list[Math.max(0, k - 1)]; p1 = list[k]; p2 = list[k + 1]; p3 = list[Math.min(list.length - 1, k + 2)];
        out += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
      }
      return out;
    }
    var upto = Math.min(N, d.cleared + 1);
    html += ('<div class="row" style="margin-bottom:8px"><h2 style="margin:0">' + $t('Sefer Haritası') + '</h2><div class="spacer"></div><span class="chip">⭐ ') + d.stats.totalStars + ' / ' + (N * 3) + '</span></div>';
    html += '<div class="starrow">';
    Z.STAR_MILESTONES.forEach(function (m) {
      var can = S.starClaimable(m), got = d.starClaimed[m.n];
      html += '<div class="smile' + (can ? ' can' : '') + (got ? ' got' : '') + '"><span class="sn">⭐ ' + m.n + '</span><span>🪙' + m.coins + ' 💎' + m.gems + '</span>' +
        (got ? '<span>✔</span>' : can ? '<button class="btn gold" data-star="' + m.n + ('">' + $t('Al') + '</button>') : '<span class="mut">🔒</span>') + '</div>';
    });
    html += '</div>' + dailyCard(d) + '<div class="mode-row">' +
      ('<button class="panel mode-card" data-act-hub="endless"><span class="big">♾️</span><div><h3>' + $t('Sonsuz Kuşatma') + '</h3><small>' + $t('Rekor') + ': <b style="color:var(--gold)">') + $t('{n}. dalga', { n: d.endlessBest }) + '</b></small></div></button>' +
      ('<button class="panel mode-card" data-act-hub="deck"><span class="big">🎖️</span><div><h3>' + $t('Savaş Ordusu') + '</h3><small class="deckrow">') + d.deck.map(function (u) { return UI.unitImg(u, 0, 40); }).join('') + UI.heroIco(d.hero, 'M', 'own') + '</small></div></button></div>';
    html = zi(html) + '<div class="maptrack" id="maptrack" style="height:' + h + 'px">'; // emoji -> simge yalniz ust bolumde; harita izi (>= 90 .dec, 105 dugum) zaten simge/CSS: yeniden taranmaz
    for (r = 0; r < realms; r++) { // diyar zeminleri + donem florasi (emoji yok: cizilmemis motif atlanir)
      var y0 = yb[r], y1 = r === realms - 1 ? h : yb[r + 1], open = (r * 15 + 1) <= d.cleared + 1, row = (IC && IC.by.dec && IC.by.dec[r]) || [], rs = 0, ri2;
      html += '<div class="rbg r' + r + (open ? '' : ' closed') + '" style="top:' + y0 + 'px;height:' + (y1 - y0) + 'px"></div>';
      for (k2 = 0; k2 < 16; k2++) {
        var sd = r * 97 + k2 * 31, id = row[(k2 * 5 + r) % (row.length || 1)]; // k2*5 mod 6 gezinir: bir diyarin 6 motifi de kullanilir
        if (!miOk[id]) continue;
        var side = k2 % 2 ? 1 : -1, dx = 360 + side * (275 + ((sd * 13) % 50)), dy = y0 + 150 + ((sd * 53) % Math.max(1, y1 - y0 - 230));
        html += '<span class="dec m-' + id.slice(7) + (open ? '' : ' closed') + '" style="left:' + (dx / 7.2).toFixed(1) + '%;top:' + dy + 'px;font-size:' + (34 + (sd * 7) % 30) + 'px"></span>';
      }
      for (ri2 = r * 15 + 1; ri2 <= Math.min(N, r * 15 + 15); ri2++) rs += d.stars[ri2] || 0;
      html += '<div class="realm r' + r + (open ? '' : ' closed') + '" style="top:' + y0 + 'px"><span class="ri">' + icoId('ic-realm-' + r, '', open ? '' : 'ud') + '</span><div><b>' + $t('Diyar {n} · {name}', { n: '<i class="rn">' + (r + 1) + '</i>', name: Z.REALMS[r] }) + '</b><small>' +
        (open ? icoId('ic-cur-mullet', '⭐') + ' ' + rs + ' / 45' : icoId('ic-act-lock', '🔒', 'ud') + ' ' + $t('{n}. bölümü bitirince açılır', { n: r * 15 })) + '</small></div></div>';
    }
    // yol: tum yol = yalniz delik delik (pricked) cizgi; kazanilan kisim = murekkep kenar + bole + orpiment
    var full = curve(pts), won = upto > 1 ? curve(pts.slice(0, upto)) : '';
    html += '<svg viewBox="0 0 720 ' + h + '" preserveAspectRatio="none" height="' + h + '"><path d="' + full + '" class="rd-dash"/>' +
      (won ? '<path d="' + won + '" class="rd-edge"/><path d="' + won + '" class="rd-bole"/><path d="' + won + '" class="rd-done"/>' : '') + '</svg>';
    var TY = [miOk.tower ? '<span class="ty mi mi-tower"></span>' : '<span class="ty">🏰</span>', miOk.camp ? '<span class="ty mi mi-camp"></span>' : '<span class="ty">⚔️</span>', miOk.crown ? '<span class="ty mi mi-crown"></span>' : '<span class="ty">👑</span>'],
      LOCK = miOk.lock ? '<i class="mi mi-lock"></i>' : '🔒', MUL = miOk.mul ? '<i class="mi mi-mul"></i>' : '★', MUL0 = miOk.mul0 ? '<i class="mi mi-mul0"></i>' : '☆', STARS = [], n3, k3;
    for (n3 = 0; n3 <= 3; n3++) { STARS[n3] = ''; for (k3 = 1; k3 <= 3; k3++) STARS[n3] += k3 <= n3 ? MUL : MUL0; }
    for (i = 1; i <= N; i++) {
      var st = d.stars[i] || 0, boss = Z.isBoss(i), info = Z.levelInfo(i), isF = info.type === 'field', cls = 'node r' + Z.realmOf(i) + (boss ? ' boss' : '') + (isF ? ' fld' : ' cst'), sh, hc = d.hardCleared[i];
      if (st > 0) cls += ' done s' + st; else if (i === d.cleared + 1) cls += ' cur'; else if (i > d.cleared + 1) cls += ' locked';
      sh = st ? STARS[st] : (i > d.cleared + 1 ? LOCK : '');
      if (hc) sh += miOk['t' + hc] ? '<i class="mi mi-t' + hc + '"></i>' : Z.DIFFS[hc].icon;
      html += '<button class="' + cls + '" data-level="' + i + '" style="left:' + (pts[i - 1][0] / 7.2).toFixed(2) + '%;top:' + pts[i - 1][1] + 'px">' +
        (info.rule !== 'none' ? (miOk['r-' + info.rule] ? '<span class="rl mi mi-r-' + info.rule + '"></span>' : '<span class="rl">' + Z.RULES[info.rule].icon + '</span>') : '') +
        TY[boss ? 2 : isF ? 1 : 0] + '<span class="nn">' + i + '</span><span class="st">' + sh + '</span><span class="nm">' + info.name + '</span></button>';
    }
    if (d.cleared < N) html += '<div class="flagmark' + (Z.isBoss(upto) ? ' boss' : '') + (upto > 1 && pts[upto - 2][0] > pts[upto - 1][0] ? ' l' : ' r') + '" style="left:' + (pts[upto - 1][0] / 7.2).toFixed(2) + '%;top:' + pts[upto - 1][1] + 'px">' + icoId('ic-mar-pennon', '🚩') + '</div>';
    html += '</div>';
    c.innerHTML = html;
    // uzun etiketler (Mont-Saint-Michel 1424) harita kenarindan tasmasin: once tum olculer okunur, sonra kaydirma yazilir (tek yerlesim)
    var mt = c.querySelector('#maptrack'), mb = mt.getBoundingClientRect(), labs = mt.querySelectorAll('.nm'), sc2 = UI.game.stage.scale || 1, sh = [], li, lr;
    if (mb.width > 10) {
      for (li = 0; li < labs.length; li++) { lr = labs[li].getBoundingClientRect(); sh[li] = lr.left < mb.left + 8 ? (mb.left + 8 - lr.left) / sc2 : lr.right > mb.right - 8 ? (mb.right - 8 - lr.right) / sc2 : 0; }
      for (li = 0; li < labs.length; li++) if (sh[li]) labs[li].style.transform = 'translateX(' + sh[li].toFixed(1) + 'px)';
    }
    var cur = c.querySelector('.node.cur') || c.querySelector('.node.done:last-of-type');
    if (cur) {
      var rc = cur.getBoundingClientRect(), cr = c.getBoundingClientRect(), sc = UI.game.stage.scale || 1;
      c.scrollTop += ((rc.top - cr.top) - cr.height / 2 + rc.height / 2) / sc;
    }
    UI.mapMs = performance.now() - t0; // yerlesim dahil harita kurulum maliyeti (ms)
  }

  function dailyCard(d) {
    if (!S.dailyAvailable()) return ('<div class="panel daily-card off"><span class="big">📅</span><div><h3>' + $t('Günlük Sefer') + '</h3><small>' + $t('{n}. bölümü kazanınca açılır', { n: Z.DAILY_UNLOCK }) + '</small></div></div>');
    var di = S.dailyInfo(), won = d.dailySefer.won;
    return '<button class="panel daily-card' + (won ? ' done' : '') + ('" data-act-hub="daily"><span class="big">📅</span><div class="grow"><h3>' + $t('Günlük Sefer') + ' ') + (won ? ('<span class="chip">✔ ' + $t('Tamam') + '</span>') : ('<span class="chip gold">🎁 ' + $t('Ödül hazır') + '</span>')) + '</h3>' +
      '<small>' + Z.REALMS[di.theme] + ' · ' + di.rules.map(function (r) { return UI.ruleIco(r) + ' ' + Z.RULES[r].name; }).join(' + ') + '</small></div></button>';
  }

  // Hedef satiri: kale kusatmasi mi, acik alan mi
  function goalHtml(n, rules) {
    var info = Z.levelInfo(n);
    if (info.type === 'field') {
      var obk = Z.fieldObjective(n, rules), ob = Z.FIELD_OBJECTIVES[obk];
      return ('<div class="rule-box field-box">' + $t('<b>🏕️ Kale Önü Muharebesi').replace(/🏕️?/, UI.battleIco('field')) + ' · ') + UI.objIco(obk) + ' ' + ob.name + '</b><br><span class="small">' + ob.desc + (' ' + $t('Önce') + ' <b>') + Z.fieldBudget(n) + (' ' + $t('komuta puanı</b> ile ordunu sahaya yerleştirirsin, sonra savaş başlar.') + '</span></div>');
    }
    return ('<p class="goal">🎯 ' + $t('Hedef') + ': ') + (rules.indexOf('survive') >= 0 ? '<b>' + Z.fmtTime(info.surviveTime) + ('</b> ' + $t('boyunca kampını savun')) : $t('düşman kalesini yık')) + '</p>';
  }
  // kapak harfi: yalniz gercek bir sozcuk (>= 3 harf, Roma rakami degil) ile baslayan uzun hikayelere ("II. Edward" -> "I I." okunmasin)
  function dropCap(s) {
    s = s || ''; var w = s.replace(/^\s+/, '').split(/\s+/)[0] || '';
    return s.length > 45 && !/^[IVXLCDM]+[.,:;]?$/.test(w) && w.replace(/[^A-Za-zÀ-ɏЀ-ӿ]/g, '').length >= 3;
  }

  var boostSel = {}, boostFor = 0; // brifingte secilen hazirlik kartlari (bolum degisince sifirlanir)
  function boostRow(n) {
    var d = S.data; if (d.cleared < Z.BOOST_UNLOCK || n <= 1) return '';
    if (boostFor !== n) { boostSel = {}; boostFor = n; }
    var chips = Z.BOOSTER_ORDER.map(function (id) {
      var B = Z.BOOSTERS[id], cnt = d.boost[id] || 0, on = boostSel[id] && cnt > 0;
      return '<button class="bchip' + (on ? ' on' : '') + (cnt ? '' : ' none') + '" data-act="bst_' + id + '"><span class="bi">' + UI.boosterIco(id) + '</span><b>×' + cnt + '</b></button>';
    }).join('');
    var sel = Z.BOOSTER_ORDER.filter(function (id) { return boostSel[id] && (d.boost[id] || 0) > 0; });
    return '<div class="boost-row"><span class="bl">' + $t('Hazırlık') + '</span>' + chips + '</div><p class="small bdesc">' + (sel.length ? sel.map(function (id) { return UI.boosterIco(id) + ' ' + Z.BOOSTERS[id].name; }).join(' · ') : $t('Savaşa tek kullanımlık hazırlık kartı götür (Hazine → Pazar\'dan alınır).')) + '</p>';
  }
  function heroRow(n) {
    var d = S.data; if (n <= 1) return '';
    var owned = Z.HERO_ORDER.filter(function (h) { return d.heroOwned[h]; });
    if (owned.length < 2) return '';
    return '<div class="boost-row"><span class="bl">' + $t('Kahraman') + '</span>' + owned.map(function (h) { return '<button class="bchip' + (d.hero === h ? ' on' : '') + '" data-act="hero_' + h + '"><span class="bi">' + UI.heroIco(h, 'M', 'own') + '</span></button>'; }).join('') + '</div>';
  }
  function levelModal(n, diff) {
    diff = diff || 0;
    var d = S.data, info = Z.levelInfo(n), st = d.stars[n] || 0, avg = avgDeckLevel(), rec = Math.round(recommendedLevel(n) * (diff === 0 ? 1 : diff === 1 ? 1.3 : 1.7)), rl = Z.RULES[info.rule], D = Z.DIFFS[diff];
    var ok = avg >= rec - 0.51, surv = info.rule === 'survive', drow = '';
    if (d.cleared >= 3) { // kademe: uc muhur tableti (kilitli = bos: kesikli + kilit)
      drow = '<div class="diffrow">' + Z.DIFFS.map(function (x, i) {
        var un = Z.diffUnlocked(d, n, i);
        return '<button class="diff' + (i === diff ? ' on' : '') + (un ? '' : ' lock') + '" data-act="diff' + i + '"><span class="di">' + (un ? icoBy('tier', i, x.icon) : icoId('ic-act-lock', '🔒', 'ud')) + '</span>' + x.name + '</button>';
      }).join('') + '</div>';
      drow += diff > 0 ? '<p class="small">' + $t('Düşman %{hp} can · ödül ×{coin} · bu kademede ilk galibiyette +💎{gem}', { hp: Math.round(D.hp * 100), coin: D.coin, gem: D.gem }) + '</p>'
        : !Z.diffUnlocked(d, n, 1) ? ('<p class="small">🔒 ' + $t('Zor kademe: bu seferi bir kez kazanınca açılır.') + '</p>')
        : !Z.diffUnlocked(d, n, 2) ? ('<p class="small">🔒 ' + $t('Efsane: bu seferi Zor kademede kazanınca açılır.') + '</p>') : '';
    }
    var field = info.type === 'field', bro = boostRow(n), hro = heroRow(n), extraActs = {};
    Z.BOOSTER_ORDER.forEach(function (id) { extraActs['bst_' + id] = function () { if (!(d.boost[id] > 0)) { A.deny(); return UI.toast($t('Bu kart bitti — Hazine → Pazar\'dan al')); } boostSel[id] = !boostSel[id]; levelModal(n, diff); }; });
    Z.HERO_ORDER.forEach(function (h) { extraActs['hero_' + h] = function () { d.hero = h; S.save(); A.click(); levelModal(n, diff); }; });
    UI.modal(
      // baslik: arma (diyar) + sefer no + rozetler; sade metin satiri altta
      '<div class="bhead"><span class="niche bz">' + icoId('ic-realm-' + info.realm, '') + '</span><div class="bt"><h1>' + $t('Sefer') + ' ' + n + (info.boss ? (' <span class="badge">' + $t('PATRON') + '</span>') : '') + (info.type === 'field' ? (' <span class="badge fld">' + $t('KALE ÖNÜ') + '</span>') : '') + '</h1>' +
      '<p class="mut" style="margin:0">' + Z.REALMS[info.realm] + ' · ' + info.name + (d.hardCleared[n] ? ' · ' + UI.tierIco(d.hardCleared[n]) : '') + '</p></div></div>' +
      '<p class="story' + (dropCap(info.story) ? ' dc' : '') + '">' + (info.story || '') + '</p>' + drow +
      (info.rule !== 'none' ? '<div class="rule-box"><b>' + UI.ruleIco(info.rule) + (' ' + $t('Sefer kuralı') + ': ') + rl.name + '</b><br><span class="small">' + rl.desc + '</span></div>' : '') +
      (field ? goalHtml(n, [info.rule]) : '') +
      // sessiz bolge: hedef, yildiz, hazirlik, dusman/odul ve onerilen seviye tek duz --night defterde (elmas desenin ustunde okuma metni yok); satirlar kesik (pricked) cizgiyle ayrilir
      '<div class="qz"><div>' + (field ? '' : goalHtml(n, [info.rule])) +
      '<div class="big-stars" style="font-size:54px;margin:0">' + star3(st) + '</div>' +
      '<p class="small">' + (field ? $t('3 yıldız için ordunun en az %65\'i hayatta kalsın') : $t('3 yıldız için kamp canı %70\'in üstünde kalsın')) + '</p></div>' +
      (bro || hro ? '<div>' + bro + hro + '</div>' : '') +
      ('<div><div class="row-lines"><span>' + $t('Düşman') + ': ') + info.tiers.map(function (u) { return UI.unitImg(u, 1, 52); }).join(' ') + '</span>' +
      ('<span>' + $t('Ödül') + ': 🪙 ') + info.rewardCoins * D.coin + '+ · 💎 ' + info.rewardGems + '</span></div>' +
      ('<p>' + $t('Önerilen birlik seviyesi') + ': <b>') + rec + ('</b> · ' + $t('Senin ortalaman') + ': <b class="') + (ok ? 'ok' : 'bad') + '">' + avg.toFixed(1) + '</b></p>' +
      (ok ? '' : ('<p class="small warn">' + $t('Ordu sekmesinden birliklerini yükseltmek işini kolaylaştırır.') + '</p>')) + '</div></div>' +
      '<p class="deck">' + d.deck.map(function (u) { return UI.unitImg(u, 0, 56); }).join(' ') + '</p>' +
      ('<div class="actions"><button class="btn small" data-act="close">' + $t('Geri') + '</button><button class="btn small" data-act="army">🛡️ ' + $t('Ordu') + '</button><button class="btn gold primary" data-act="fight">⚔ ' + $t('SEFERE ÇIK') + '</button></div>'),
      Object.assign({
        close: UI.closeModal,
        army: function () { UI.closeModal(); UI.tab = 'army'; UI.renderHub(); },
        diff0: function () { levelModal(n, 0); },
        diff1: function () { if (Z.diffUnlocked(d, n, 1)) levelModal(n, 1); else { A.deny(); UI.toast($t('Önce bu seferi Normal kademede kazan')); } },
        diff2: function () { if (Z.diffUnlocked(d, n, 2)) levelModal(n, 2); else { A.deny(); UI.toast($t('Önce bu seferi Zor kademede kazan')); } },
        fight: function () { var bs = Z.BOOSTER_ORDER.filter(function (id) { return boostSel[id] && (d.boost[id] || 0) > 0; }); boostSel = {}; UI.closeModal(); UI.game.startBattle('campaign', n, { diff: diff, boosters: bs }); }
      }, extraActs));
  }

  UI.levelModal = levelModal;
  UI.dailyModal = function () {
    var d = S.data, di = S.dailyInfo(), won = d.dailySefer.won, info = Z.levelInfo(di.level);
    var rb = di.rules.map(function (r) { var R = Z.RULES[r]; return '<div class="rule-box"><b>' + UI.ruleIco(r) + ' ' + R.name + '</b><br><span class="small">' + R.desc + '</span></div>'; }).join('');
    UI.modal(('<h1>📅 ' + $t('Günlük Sefer') + '</h1><p class="mut" style="margin:0">') + Z.REALMS[di.theme] + ' · ' + $t('Sefer {n} seviyesinde', { n: di.level }) + '</p>' + rb +
      goalHtml(di.level, di.rules) +
      '<div class="rewards"><span class="coin">🪙 ' + di.rewardCoins + '</span><span class="gem">💎 ' + di.rewardGems + '</span></div>' +
      '<p class="small">' + (won ? ('✔ ' + $t('Bugünkü ödülü aldın. İstersen ödülsüz tekrar oynayabilirsin.')) : $t('Ödül günde bir kez, ilk galibiyette verilir. Her gün yeni bir sefer!')) + '</p>' +
      ('<div class="actions"><button class="btn small" data-act="close">' + $t('Geri') + '</button><button class="btn gold primary" data-act="go">⚔ ' + $t('SEFERE ÇIK') + '</button></div>'),
      { close: UI.closeModal, go: function () { UI.closeModal(); UI.game.startBattle('daily', di.level, { daily: di }); } });
  };

  // ---------------------------------------------------------------- ORDU
  function renderArmy(c) {
    var d = S.data, un = S.unlockedUnits(), html = '', i, gt = 0;
    // yaldiz (gilt) bolum basina YALNIZ en iyi (ilk) karsilanabilir eylemde; digerleri gouache (lapis), karsilanamayan = bos (kesikli)
    function gilt(afford) { if (!afford) return 'off'; if (gt) return ''; gt = 1; return 'gold'; }
    html += ('<div class="row"><h2 style="margin:0">' + $t('Ordu') + '</h2><div class="spacer"></div><span class="chip">' + $t('Savaş kadrosu') + ': ') + d.deck.length + ' / 5</span></div>';
    html += ('<div class="sect">' + $t('Birlikler') + '</div><div class="grid2">');
    Z.UNIT_ORDER.forEach(function (id) {
      var u = Z.UNITS[id], lvl = d.unitLvl[id], locked = un.indexOf(id) < 0, inDeck = d.deck.indexOf(id) >= 0, s = unitStats(id, lvl);
      var cost = Z.unitUpgradeCost(lvl), maxed = lvl >= Z.MAX_UNIT_LVL;
      html += '<div class="panel ucard' + (locked ? ' locked' : '') + (inDeck ? ' indeck' : '') + '"><div class="big">' + UI.unitImg(id, 0, 84, locked) + '</div><div class="info">' +
        '<h3>' + u.name + (' <span class="lvl">' + $t('Sv.')) + lvl + '</span></h3>' +
        (locked ? '<small>🔒 ' + $t('Bölüm {n} tamamlanınca açılır', { n: Z.UNLOCK_AT[id] }) + '</small>' :
          '<div class="qz"><small>❤ ' + s.hp + ' · ⚔ ' + s.dmg + ' · 🪙 ' + u.cost + '</small><div class="small">' + u.desc + '</div></div>' +
          '<div class="row" style="margin-top:10px;gap:10px">' +
          '<button class="btn small ' + (maxed ? 'off' : gilt(d.coins >= cost)) + '" data-upg="' + id + '">' + (maxed ? $t('MAKS') : '⬆ 🪙 ' + Z.fmt(cost)) + '</button>' +
          '<button class="btn small ' + (inDeck ? 'green' : '') + '" data-deck="' + id + '">' + (inDeck ? ('✔ ' + $t('Kadroda')) : $t('Kadroya ekle')) + '</button></div>') +
        '</div></div>';
    });
    html += ('</div><div class="sect">' + $t('Kahramanlar') + '</div><div class="grid2">'); gt = 0;
    Z.HERO_ORDER.forEach(function (id) {
      var h = Z.HEROES[id], owned = d.heroOwned[id], lvl = d.heroLvl[id], sel = d.hero === id, cost = Z.heroUpgradeCost(lvl);
      html += '<div class="panel ucard' + (sel ? ' indeck' : '') + '"><div class="big">' + UI.heroIco(id, 'L', owned ? 'own' : 'ud') + '</div><div class="info"><h3>' + h.name + (owned ? (' <span class="lvl">' + $t('Sv.')) + lvl + '</span>' : '') + '</h3>' +
        '<div class="qz"><small><b style="color:var(--gold)">' + h.skill + '</b> · ' + h.cd + (' ' + $t('sn') + '</small><div class="small">') + h.desc + '</div></div>' +
        '<div class="row" style="margin-top:10px;gap:10px">' +
        (owned ? (lvl >= Z.MAX_HERO_LVL ? ('<button class="btn small off">' + $t('MAKS') + '</button>') : '<button class="btn small ' + gilt(d.coins >= cost) + '" data-hup="' + id + '">⬆ 🪙 ' + Z.fmt(cost) + '</button>') +
          '<button class="btn small ' + (sel ? 'green' : '') + '" data-hsel="' + id + '">' + (sel ? ('✔ ' + $t('Seçili')) : $t('Seç')) + '</button>'
          : '<button class="btn small ' + gilt(d.gems >= h.gems) + '" data-hbuy="' + id + '">💎 ' + h.gems + (' ' + $t('ile aç') + '</button>')) +
        '</div></div></div>';
    });
    var cc = Z.castleUpgradeCost(d.castleLvl); gt = 0;
    html += ('</div><div class="sect">' + $t('Kamp') + '</div><div class="panel ucard"><div class="big">🏕️</div><div class="info"><h3>' + $t('Kamp Tahkimatı') + ' <span class="lvl">' + $t('Sv.')) + d.castleLvl + '</span></h3>' +
      ('<div class="qz"><small>' + $t('Kamp canı') + ': ❤ ') + Z.castleHp(d.castleLvl) + ' → ' + Z.castleHp(d.castleLvl + 1) + '</small></div></div>' +
      (d.castleLvl >= Z.MAX_CASTLE_LVL ? ('<button class="btn off">' + $t('MAKS') + '</button>') : '<button class="btn ' + gilt(d.coins >= cc) + '" data-castle="1">⬆ 🪙 ' + Z.fmt(cc) + '</button>') + '</div>';
    c.innerHTML = zi(html);
  }

  // ---------------------------------------------------------------- HAZINE
  function renderVault(c) {
    var d = S.data, html = '', pend = S.treasuryPending(), cap = Z.treasuryRate(d.treasuryLvl, d.cleared) * Z.TREASURY_CAP_H;
    var uc = Z.treasuryUpgradeCost(d.treasuryLvl);
    html += ('<h2>' + $t('Hazine') + '</h2><div class="panel"><div class="row"><span class="vault-ico">' + icoBy('ui', 'vault', '💰') + '</span><div class="grow" style="flex:1">') +
      '<div class="bignum" id="vault-amt">🪙 ' + Z.fmt(pend) + '</div>' +
      '<div class="bar green"><i id="vault-bar" style="width:' + Math.min(100, 100 * pend / cap) + '%"></i></div>' +
      '<small id="vault-sub">' + $t('Saatte {rate} altın · en çok {h} saat birikir', { rate: Z.fmt(Z.treasuryRate(d.treasuryLvl, d.cleared)), h: Z.TREASURY_CAP_H }) + (S.treasuryFull() ? (' · <b style="color:var(--red)">' + $t('DOLU!</b>')) : '') + '</small></div>' +
      ('<div style="display:flex;flex-direction:column;gap:10px"><button class="btn gold" data-collect="1" id="vault-btn">' + $t('Topla') + '</button>') +
      (d.treasuryLvl >= Z.MAX_TREASURY_LVL ? ('<button class="btn small off">' + $t('MAKS') + '</button>') : '<button class="btn small ' + (d.coins >= uc ? '' : 'off') + ('" data-tup="1">⬆ ' + $t('Sv.')) + d.treasuryLvl + ' · 🪙 ' + Z.fmt(uc) + '</button>') + '</div></div></div>';
    var free = S.wheelFree(), wl = '', gm = 0;
    // cark dilimlerinin renkleri theme.css .wheel'de (palet jetonlari); etiket dilimle doner ama kendi ekseninde geri doner: sayilar hep dik okunur
    Z.WHEEL.forEach(function (sg, i) {
      var a = i * 45 + 22.5;
      wl += '<span style="transform:rotate(' + a + 'deg) translateY(-104px) rotate(' + (-a) + 'deg)">' + (sg.gems ? '💎' + sg.gems : '🪙' + sg.coins) + '</span>';
    });
    html += ('<div class="sect">' + $t('Şans Çarkı') + '</div><div class="panel"><div class="wheel-box"><div class="wheel-wrap"><div class="wheel-ptr">' + icoBy('ui', 'wheelPointer', '▼') + '</div>') +
      '<div class="wheel" id="wheel">' + wl + '</div><div class="wheel-hub"></div></div>' +
      '<div style="flex:1"><h3>' + (free ? $t('Bugünkü bedava hakkın hazır!') : $t('Bedava hakkını kullandın')) + '</h3><p class="small" style="margin:6px 0 16px">' + $t('Her gün 1 bedava çevirme. Sonrası {n} 💎. En büyük ödül: 💎 40!', { n: Z.WHEEL_COST }) + '</p>' +
      '<button class="btn gold" data-spin="1" id="spin-btn">' + (free ? ('🎡 ' + $t('Bedava Çevir')) : ('🎡 ' + $t('Çevir') + ' · ') + Z.WHEEL_COST + ' 💎') + '</button></div></div></div>';
    html += ('<div class="sect">' + $t('Pazar') + '</div>');
    Z.MARKET.forEach(function (m) {
      html += '<div class="panel mrow"><span class="big">' + UI.marketIco(m) + '</span><div class="grow"><h3>' + m.name + '</h3><small>' + m.desc(d) + '</small></div><button class="btn small ' + (d.gems >= m.gems ? (gm++ ? '' : 'gold') : 'off') + '" data-buy="' + m.id + '">💎 ' + m.gems + '</button></div>';
    });
    html += ('<div class="sect">' + $t('Günlük Giriş Ödülü') + '</div><div class="panel"><div class="daily">');
    var idx = S.dailyIndex();
    Z.DAILY_REWARDS.forEach(function (r, i) {
      var cls = 'day' + (i === idx && !d.daily.claimedToday ? ' today' : '') + ((i < idx) || (i === idx && d.daily.claimedToday) ? ' got' : '');
      if (d.daily.claimedToday && i === (idx + 6) % 7) cls = 'day got';
      html += '<div class="' + cls + ('">' + $t('Gün') + ' ') + (i + 1) + '<span class="ico">' + (r.gems ? '💎' : '🪙') + '</span>' + (r.coins ? r.coins : '') + (r.coins && r.gems ? '<br>' : '') + (r.gems ? '💎' + r.gems : '') + '</div>';
    });
    html += '</div><div class="actions" style="text-align:center;margin-top:16px"><button class="btn ' + (d.daily.claimedToday ? 'off' : 'gold') + '" data-daily="1">' +
      (d.daily.claimedToday ? $t('Yarın tekrar gel!') : ('🎁 ' + $t('Ödülü Al'))) + '</button></div></div>';
    c.innerHTML = zi(html);
    UI.vaultTimer = setInterval(function () {
      var amt = $('vault-amt'); if (!amt) { clearInterval(UI.vaultTimer); return; }
      var p = S.treasuryPending(); UI.setIco(amt, '🪙 ' + Z.fmt(p));
      $('vault-bar').style.width = Math.min(100, 100 * p / cap) + '%';
    }, 1000);
  }

  // ---------------------------------------------------------------- MAGAZA (elmas paketleri + odullu reklam)
  function renderShop(c) {
    var d = S.data, cfgA = Z.MONEY.ads, html = '<div class="row"><h2 style="margin:0">' + $t('Mağaza') + '</h2><div class="spacer"></div>' +
      (M.mode === 'test' ? '<span class="chip gold">TEST</span>' : '') + '</div>';
    // ucretsiz oduller
    html += '<div class="sect">🎁 ' + $t('Ücretsiz Ödüller') + '</div><div class="panel shop-free">';
    var can = M.canRewarded(), left = M.rewardedLeft();
    html += '<div class="free-row"><button class="btn gold shopbtn' + (can ? '' : ' soft') + '" data-ad="gems"><span>🎬</span> +' + cfgA.rewardedGems + ' 💎</button>' +
      '<button class="btn shopbtn' + (can ? '' : ' soft') + '" data-ad="coins"><span>🎬</span> +' + cfgA.rewardedCoins + ' 🪙</button></div>' +
      '<p class="small" style="margin:8px 0 0">' + (M.adsOn() ? ($t('Bugün kalan') + ': <b>' + left + ' / ' + cfgA.rewardedPerDay + '</b> · ' + $t('Kısa bir reklam izle, ödülü kap.')) : $t('Reklam ödülleri yakında.')) + '</p></div>';
    // elmas paketleri
    html += '<div class="sect">💎 ' + $t('Elmas Paketleri') + '</div><div class="shop-grid">';
    var gi = 0;
    Z.MONEY.products.forEach(function (p) {
      if (p.type !== 'gems') return;
      html += '<div class="panel pack"><span class="pk-ico">' + UI.packIco(gi, 'pk' + (gi++ % 5)) + '</span><b class="pk-gems">' + Z.fmt(p.gems) + ' 💎</b>' +
        (p.badge ? '<span class="pk-badge">' + p.badge + '</span>' : '') +
        '<button class="btn small gold' + (M.iapOn() ? '' : ' soft') + '" data-iap="' + p.id + '">' + (M.iapOn() ? M.price(p) : $t('Yakında')) + '</button></div>';
    });
    html += '</div>';
    // ozel teklifler
    html += '<div class="sect">⭐ ' + $t('Özel Teklifler') + '</div>';
    Z.MONEY.products.forEach(function (p) {
      if (p.type === 'gems') return;
      var owned = M.owned(p), title = p.type === 'starter' ? ('🎖️ ' + $t('Başlangıç Paketi')) : ('🚫 ' + $t('Reklamları Kaldır'));
      var desc = p.type === 'starter' ? (p.gems + ' 💎 + ' + Z.fmt(p.coins) + ' 🪙 · ' + $t('tek seferlik')) : $t('Geçiş reklamları ve banner kalkar. Ödüllü reklamlar isteğe bağlı kalır.');
      html += '<div class="panel offer"><div class="grow"><h3>' + title + '</h3><small>' + desc + '</small></div><button class="btn small ' + (owned ? 'off' : 'gold') + (!owned && !M.iapOn() ? ' soft' : '') + '" data-iap="' + p.id + '">' + (owned ? '✔ ' + $t('Alındı') : (M.iapOn() ? M.price(p) : $t('Yakında'))) + '</button></div>';
    });
    // diger
    var L = Z.MONEY.links;
    html += '<div class="sect">' + $t('Diğer') + '</div><div class="panel shop-misc"><button class="btn small" data-shop="restore">♻️ ' + $t('Satın alımları geri yükle') + '</button>' +
      '<button class="btn small" data-shop="privacy">🔒 ' + $t('Reklam gizlilik tercihleri') + '</button>' +
      '<div class="links"><a data-url="privacy">' + $t('Gizlilik Politikası') + '</a><a data-url="terms">' + $t('Kullanım Şartları') + '</a><a data-url="support">' + $t('Destek') + '</a></div></div>' +
      '<p class="small qp">' + $t('Satın alımlar Google Play hesabına bağlıdır; cihaz değiştirsen de geri yükleyebilirsin.') + '</p>';
    void L; c.innerHTML = zi(html);
  }

  // ---------------------------------------------------------------- GOREVLER
  function renderQuests(c) {
    var d = S.data, html = ('<h2>' + $t('Günlük Görevler') + '</h2>');
    function qrow(q, i, kind) {
      var def = S.questDef(q.id), done = q.prog >= def.target;
      return '<div class="panel quest ' + kind + '" data-kind="' + kind + '"><div class="grow" style="flex:1"><h3>' + def.text + '</h3>' +
        '<div class="bar' + (done ? ' green' : '') + '"><i style="width:' + (100 * q.prog / def.target) + '%"></i></div><small>' + ($t('Ödül') + ': 🪙 ') + def.coins + ' 💎 ' + def.gems + '</small></div>' +
        // bos (underdrawn) yuva: ilerleme sayisi kesikli kutuda ("…" yer tutucusu yok); alinabilir = yaldiz, alindi = kesikli tik
        (q.claimed || done ? '<button class="btn ' + (q.claimed ? 'off' : 'gold') + '" data-quest="' + i + '" data-weekly="' + (kind === 'weekly' ? 1 : 0) + '">' + (q.claimed ? ('✔ ' + $t('Alındı')) : $t('Al')) + '</button>' : '<span class="btn off qcount">' + q.prog + '/' + def.target + '</span>') + '</div>';
    }
    d.quests.list.forEach(function (q, i) { html += qrow(q, i, 'daily'); });
    html += ('<div class="sect has-note">📅 ' + $t('Haftalık Görevler') + ' <small class="mut">' + $t('(her pazartesi yenilenir)') + '</small></div>');
    d.weekly.list.forEach(function (q, i) { html += qrow(q, i, 'weekly'); });
    var achs = Z.ACHIEVEMENTS.slice().sort(function (a, b) {
      var ca = d.achClaimed[a.id] ? 2 : S.achClaimable(a) ? 0 : 1, cb = d.achClaimed[b.id] ? 2 : S.achClaimable(b) ? 0 : 1;
      return ca - cb || (S.achProgress(b) / b.target) - (S.achProgress(a) / a.target);
    });
    html += ('<div class="sect">' + $t('Başarımlar') + '</div>');
    achs.forEach(function (a) {
      var got = d.achClaimed[a.id], can = S.achClaimable(a), pr = S.achProgress(a);
      html += '<div class="panel ach' + (got ? ' claimed' : '') + '"><div class="grow"><h3>' + a.text + '</h3><div class="bar' + (can || got ? ' green' : '') + '"><i style="width:' + (100 * pr / a.target) + '%"></i></div><small>' + Z.fmt(pr) + ' / ' + Z.fmt(a.target) + ('  ·  ' + $t('Ödül') + ': 💎 ') + a.gems + '</small></div>' +
        (got || can ? '<button class="btn ' + (got ? 'off' : 'gold') + '" data-ach="' + a.id + '">' + (got ? '✔' : $t('Al')) + '</button>' : '') + '</div>'; // alinabilir / alinmis disinda bos yuva cizilmez
    });
    html += ('<div class="sect">' + $t('İstatistikler') + '</div><div class="panel"><table class="tbl">') +
      ('<tr><td>' + $t('Oynanan savaş') + '</td><td>') + d.stats.battles + ('</td><td>' + $t('Kazanılan') + '</td><td>') + d.stats.wins + '</td></tr>' +
      ('<tr><td>' + $t('Yenilen düşman') + '</td><td>') + d.stats.kills + ('</td><td>' + $t('Toplam yıldız') + '</td><td>⭐ ') + d.stats.totalStars + '</td></tr>' +
      ('<tr><td>' + $t('Sonsuz kuşatma rekoru') + '</td><td>') + $t('{n}. dalga', { n: d.endlessBest }) + ('</td><td>' + $t('İlerleme') + '</td><td>') + $t('Bölüm {n}', { n: d.cleared + ' / ' + Z.MAX_LEVEL }) + '</td></tr></table></div>';
    c.innerHTML = zi(html);
  }

  // ---------------------------------------------------------------- sekme tiklamalari
  function onTabClick(e) {
    var t = e.target, el, d = S.data;
    if ((el = t.closest('[data-buy]'))) {
      var mid = el.getAttribute('data-buy'), mi = Z.MARKET.filter(function (x) { return x.id === mid; })[0];
      if (mi && d.gems < mi.gems) { A.deny(); return UI.needGems(mi.gems); }
      var res = S.buyMarket(mid);
      if (!res) { A.deny(); return UI.toast($t('Yeterli elmas yok')); }
      if (res.full) { A.deny(); return UI.toast($t('Hazine zaten dolu')); }
      if (res.unused) { A.deny(); return UI.toast($t('Önce bedava çarkı çevir')); }
      A.chest(); A.coin(); UI.toast(res.name + (' ' + $t('alındı!'))); return UI.renderHub();
    }
    if ((el = t.closest('[data-star]'))) {
      var sm = S.claimStar(+el.getAttribute('data-star')); if (!sm) return A.deny();
      A.chest(); UI.toast(($t('Yıldız ödülü') + ': 🪙') + sm.coins + ' 💎' + sm.gems); return UI.renderHub();
    }
    if ((el = t.closest('[data-ach]'))) {
      var ac = S.claimAch(el.getAttribute('data-ach')); if (!ac) return A.deny();
      A.win(); UI.toast(($t('Başarım ödülü') + ': 💎') + ac.gems); return UI.renderHub();
    }
    if ((el = t.closest('[data-spin]'))) {
      if (UI.spinning) return;
      if (!S.wheelFree() && d.gems < Z.WHEEL_COST) { A.deny(); return UI.needGems(Z.WHEEL_COST); }
      var res = S.spin(); if (!res) { A.deny(); return UI.toast($t('Yeterli elmas yok')); }
      UI.spinning = true; A.chest();
      var wheel = $('wheel'), turn = 360 * 6 + (360 - (res.idx * 45 + 22.5));
      wheel.style.transition = 'transform 3.4s cubic-bezier(.12,.7,.15,1)'; wheel.style.transform = 'rotate(' + turn + 'deg)';
      setTimeout(function () {
        UI.spinning = false; A.win();
        UI.toast(($t('Çarktan') + ': ') + (res.seg.coins ? '🪙' + res.seg.coins : '💎' + res.seg.gems) + '!');
        if (UI.tab === 'vault') UI.renderHub(); else { $('cur-coins').textContent = Z.fmt(S.data.coins); $('cur-gems').textContent = Z.fmt(S.data.gems); }
      }, 3600);
      return;
    }
    if ((el = t.closest('[data-level]'))) { A.click(); return levelModal(+el.getAttribute('data-level')); }
    if ((el = t.closest('[data-act-hub]'))) {
      A.click(); var k = el.getAttribute('data-act-hub');
      if (k === 'endless') return UI.endlessModal();
      if (k === 'daily') return UI.dailyModal();
      UI.tab = 'army'; return UI.renderHub();
    }
    if ((el = t.closest('[data-upg]'))) {
      var id = el.getAttribute('data-upg'), cost = Z.unitUpgradeCost(d.unitLvl[id]);
      if (d.coins < cost || d.unitLvl[id] >= Z.MAX_UNIT_LVL) return A.deny();
      d.coins -= cost; d.unitLvl[id]++; S.save(); A.chest(); UI.renderHub(); return;
    }
    if ((el = t.closest('[data-deck]'))) {
      var u = el.getAttribute('data-deck'), i = d.deck.indexOf(u);
      if (i >= 0) { if (d.deck.length <= 1) return UI.toast($t('En az 1 birlik gerekli')); d.deck.splice(i, 1); }
      else { if (d.deck.length >= 5) return UI.toast($t('Kadro en fazla 5 birlik')); d.deck.push(u); }
      S.save(); A.click(); return UI.renderHub();
    }
    if ((el = t.closest('[data-hsel]'))) { d.hero = el.getAttribute('data-hsel'); S.save(); A.click(); return UI.renderHub(); }
    if ((el = t.closest('[data-hup]'))) {
      var hid = el.getAttribute('data-hup'), hc = Z.heroUpgradeCost(d.heroLvl[hid]);
      if (d.coins < hc || d.heroLvl[hid] >= Z.MAX_HERO_LVL) return A.deny();
      d.coins -= hc; d.heroLvl[hid]++; S.save(); A.chest(); return UI.renderHub();
    }
    if ((el = t.closest('[data-hbuy]'))) {
      var bid = el.getAttribute('data-hbuy'), h = Z.HEROES[bid];
      if (d.gems < h.gems) { A.deny(); return UI.needGems(h.gems); }
      d.gems -= h.gems; d.heroOwned[bid] = true; d.hero = bid; S.save(); A.win(); UI.toast(h.name + (' ' + $t('ordunda!'))); return UI.renderHub();
    }
    if ((el = t.closest('[data-castle]'))) {
      var cc = Z.castleUpgradeCost(d.castleLvl);
      if (d.coins < cc || d.castleLvl >= Z.MAX_CASTLE_LVL) return A.deny();
      d.coins -= cc; d.castleLvl++; S.save(); A.chest(); return UI.renderHub();
    }
    if ((el = t.closest('[data-collect]'))) {
      var n = S.collectTreasury(); if (n <= 0) return A.deny();
      A.coin(); A.chest(); UI.toast('+' + n + (' ' + $t('altın toplandı!'))); return UI.renderHub();
    }
    if ((el = t.closest('[data-tup]'))) {
      var tc = Z.treasuryUpgradeCost(d.treasuryLvl);
      if (d.coins < tc || d.treasuryLvl >= Z.MAX_TREASURY_LVL) return A.deny();
      S.collectTreasury(); d.coins -= tc; d.treasuryLvl++; S.save(); A.chest(); return UI.renderHub();
    }
    if ((el = t.closest('[data-daily]'))) {
      var r = S.claimDaily(); if (!r) return A.deny();
      A.win(); UI.toast(($t('Günlük ödül') + ': ') + (r.coins ? '🪙' + r.coins + ' ' : '') + (r.gems ? '💎' + r.gems : '')); return UI.renderHub();
    }
    if ((el = t.closest('[data-ad]'))) {
      if (!M.adsOn()) { A.deny(); return UI.toast($t('Reklamlar şu an kullanılamıyor')); }
      if (!M.canRewarded()) { A.deny(); return UI.toast($t('Bugünlük reklam ödülü hakkın bitti')); }
      var kind = el.getAttribute('data-ad');
      return M.showRewarded('shop_' + kind, function (ok) {
        if (!ok) return UI.toast($t('Ödül için reklamı sonuna kadar izlemelisin'));
        var g = M.grantFreeReward(kind); S.save(); A.chest(); UI.toast($t('Ödül') + ': ' + (g.gems ? '+' + g.gems + ' 💎' : '+' + g.coins + ' 🪙')); UI.renderHub();
      });
    }
    if ((el = t.closest('[data-iap]'))) {
      var pid = el.getAttribute('data-iap'), prod = M.product(pid);
      if (!prod || M.owned(prod)) return A.deny();
      if (!M.iapOn()) { A.deny(); return UI.toast($t('Satın alma henüz etkin değil')); }
      return M.purchase(pid, function (res) {
        if (!res) return UI.toast($t('Satın alma tamamlanmadı'));
        if (res.dup) return UI.toast($t('Bu ürün zaten alınmış'));
        A.chest(); UI.toast($t('Teşekkürler!') + (res.gems ? ' +' + res.gems + ' 💎' : '') + (res.coins ? ' +' + Z.fmt(res.coins) + ' 🪙' : '') + (res.noAds ? ' 🚫' : '')); UI.renderHub();
      });
    }
    if ((el = t.closest('[data-shop]'))) {
      var sk = el.getAttribute('data-shop');
      if (sk === 'restore') { if (!M.iapOn()) { A.deny(); return UI.toast($t('Satın alma henüz etkin değil')); } return M.restore(function (n) { UI.toast(n ? $t('Geri yüklendi') + ': ' + n : $t('Geri yüklenecek ürün bulunamadı')); UI.renderHub(); }); }
      if (sk === 'privacy') return M.privacyOptions(function (ok) { if (!ok) UI.toast($t('Reklam gizlilik ayarı bu cihazda gerekli değil')); });
    }
    if ((el = t.closest('[data-url]'))) return UI.openLink(el.getAttribute('data-url'));
    if ((el = t.closest('[data-quest]'))) {
      var def = S.claimQuest(+el.getAttribute('data-quest'), el.getAttribute('data-weekly') === '1'); if (!def) return A.deny();
      A.chest(); UI.toast(($t('Görev ödülü') + ': 🪙') + def.coins + ' 💎' + def.gems); return UI.renderHub();
    }
  }

  UI.endlessModal = function () {
    var d = S.data;
    UI.modal(('<h1>♾️ ' + $t('Sonsuz Kuşatma') + '</h1><div class="qz"><p>' + $t('Düşman dalgalar hâlinde gelir ve her dalga güçlenir. Kampını koru, ne kadar dayanabilirsin?') + '</p>') +
      ('<p>' + $t('En iyi') + ': <b style="color:var(--gold)">') + $t('{n}. dalga', { n: d.endlessBest }) + ('</b></p><p class="small">' + $t('Her 5 dalgada 💎 kazanırsın. Düşman kalesi yıkılamaz.') + '</p></div>') +
      ('<div class="actions"><button class="btn" data-act="close">' + $t('Geri') + '</button><button class="btn gold primary" data-act="go">⚔ ' + $t('BAŞLA') + '</button></div>'),
      { close: UI.closeModal, go: function () { UI.closeModal(); UI.game.startBattle('endless', 1); } });
  };

  UI.isBrowser = function () {
    var native = globalThis.Capacitor && globalThis.Capacitor.isNativePlatform && globalThis.Capacitor.isNativePlatform();
    var standalone = globalThis.matchMedia && (globalThis.matchMedia('(display-mode: standalone)').matches || globalThis.matchMedia('(display-mode: fullscreen)').matches);
    return !native && !standalone;
  };

  // Gizlilik politikasi / sartlar / destek baglantisi (Z.MONEY.links); APK'da dis tarayicida acilir
  UI.openLink = function (kind) {
    var url = Z.MONEY.links[kind];
    if (!url) { A.deny(); return UI.toast($t('Bağlantı henüz ayarlanmadı')); }
    try { globalThis.open(url, '_blank'); } catch (e) { /* engelli */ }
  };

  // ---------------------------------------------------------------- Ayarlar
  UI.settingsModal = function () {
    var st = S.data.settings;
    function row(k, label) { return '<div class="toggle" data-act="t_' + k + '"><span>' + label + '</span><span class="sw' + (st[k] ? ' on' : '') + '"></span></div>'; }
    var acts = { close: UI.closeModal };
    ['sound', 'music', 'vibrate', 'menuBattle'].forEach(function (k) {
      acts['t_' + k] = function () {
        st[k] = !st[k]; S.save(); A.enabled = st.sound; A.musicOn = st.music; if (!st.sound || !st.music) A.musicStop(); if (UI.game.refreshMenu) UI.game.refreshMenu();
        UI.settingsModal();
      };
    });
    acts.exp = function () {
      var code = S.exportSave();
      UI.modal(('<h1>📤 ' + $t('Kayıt Kodu') + '</h1><p>' + $t('Kodu kopyala; başka cihazda “Kaydı içe aktar”a yapıştır.') + '</p><textarea id="save-code" readonly rows="6">') + code + ('</textarea><div class="actions"><button class="btn small" data-act="back">' + $t('Geri') + '</button><button class="btn gold primary" data-act="copy">📋 ' + $t('Kopyala') + '</button></div>'), {
        back: UI.settingsModal,
        copy: function () {
          var ta = $('save-code'); ta.focus(); ta.select(); var okc = false;
          try { okc = document.execCommand('copy'); } catch (e) { /* eski WebView */ }
          if (okc) UI.toast($t('Kopyalandı!')); else if (navigator.clipboard) navigator.clipboard.writeText(code).then(function () { UI.toast($t('Kopyalandı!')); }, function () { UI.toast($t('Kodu elle seçip kopyala')); });
        }
      });
    };
    acts.imp = function () {
      UI.modal(('<h1>📥 ' + $t('Kaydı İçe Aktar') + '</h1><p>' + $t('Başka cihazdan aldığın kodu yapıştır. <b>Mevcut ilerlemen bu kodla değiştirilir.</b>') + '</p><textarea id="save-code" rows="6" placeholder="' + $t('Kodu buraya yapıştır') + '"></textarea><div class="actions"><button class="btn small" data-act="back">' + $t('Geri') + '</button><button class="btn gold primary" data-act="load">' + $t('Yükle') + '</button></div>'), {
        back: UI.settingsModal,
        load: function () {
          if (!S.importSave($('save-code').value)) { A.deny(); return UI.toast($t('Geçersiz kayıt kodu')); }
          var st2 = S.data.settings; A.enabled = st2.sound; A.musicOn = st2.music; A.win(); UI.closeModal(); UI.showHub('map'); UI.toast($t('Kayıt yüklendi!'));
        }
      });
    };
    acts.reset = function () {
      UI.modal(('<h1>' + $t('Emin misin?') + '</h1><p>' + $t('Tüm ilerlemen silinecek. Bu işlem geri alınamaz.') + '</p><div class="actions"><button class="btn" data-act="close">' + $t('Vazgeç') + '</button><button class="btn red" data-act="yes">' + $t('Evet, sıfırla') + '</button></div>'),
        { close: UI.closeModal, yes: function () { S.reset(); UI.closeModal(); UI.showHub('map'); } });
    };
    acts.lang = function () { UI.langModal(false); };
    ['privacy', 'terms', 'support'].forEach(function (k) { acts['u_' + k] = function () { UI.openLink(k); }; });
    acts.adprivacy = function () { Z.Monetize.privacyOptions(function (ok) { if (!ok) UI.toast($t('Reklam gizlilik ayarı bu cihazda gerekli değil')); }); };
    var li = Z.langInfo();
    function slider(k, label) { return '<div class="slider"><span>' + label + '</span><input type="range" min="0" max="100" step="5" value="' + (st[k] === undefined ? 100 : st[k]) + '" data-vol="' + k + '"><b>' + (st[k] === undefined ? 100 : st[k]) + '</b></div>'; }
    // sessiz bolge: dil, anahtarlar ve kaydiricilar tek duz --night defterde (kesik cizgiyle ayrilir); altbilgi (ipucu + surum) ayri defter.
    // Son satir (Sifirla / Tamam) en sonda: pencere kayarsa yapisik (sticky) ayakta hep gorunur. Baglanti ayiraclari CSS'te (metin dugumu yok: satir sararken '·' yetim kalmaz).
    UI.modal(('<h1>' + $t('Ayarlar') + '</h1>') + '<div class="setbox">' + ('<div class="toggle" data-act="lang"><span>🌐 ' + $t('Dil') + '</span><b class="lc" data-code="' + li.id.toUpperCase() + '">' + li.name + ' ›</b></div>') + row('sound', ('🔊 ' + $t('Ses efektleri'))) + row('music', ('🥁 ' + $t('Savaş müziği'))) + row('vibrate', ('📳 ' + $t('Titreşim'))) + row('menuBattle', (icoId('ic-act-swords', '⚔️') + ' ' + $t('Menüde canlı savaş (pil/performans için kapatılabilir)'))) + slider('musicVol', '🥁 ' + $t('Müzik ses düzeyi')) + slider('sfxVol', '🔊 ' + $t('Efekt ses düzeyi')) + '</div>' +
      ('<div class="actions"><button class="btn small" data-act="exp">📤 ' + $t('Kaydı dışa aktar') + '</button><button class="btn small" data-act="imp">📥 ' + $t('İçe aktar') + '</button></div>') +
      (Z.Monetize.adsOn() ? ('<div class="actions"><button class="btn small" data-act="adprivacy">🔒 ' + $t('Reklam gizlilik tercihleri') + '</button></div>') : '') +
      ('<div class="links settings-links"><a data-act="u_privacy">' + $t('Gizlilik Politikası') + '</a><a data-act="u_terms">' + $t('Kullanım Şartları') + '</a><a data-act="u_support">' + $t('Destek') + '</a></div>') +
      '<div class="qz">' + (UI.isBrowser() ? ('<p class="small">💡 ' + $t('Tarayıcı menüsünden <b>Ana ekrana ekle</b> / <b>Uygulamayı yükle</b> seçersen tam ekran, uygulama gibi açılır.') + '</p>') : '') +
      ('<p class="small">' + Z.NAME + ' v') + Z.VERSION + (' ' + $t('(derleme') + ' ') + Z.BUILD + (')</p>') + '</div>' +
      ('<div class="actions"><button class="btn small red" data-act="reset">' + $t('Kaydı sıfırla') + '</button><button class="btn gold primary" data-act="close">' + $t('Tamam') + '</button></div>'), acts);
  };

  // ---------------------------------------------------------------- Acilis akisi
  // Dil secimi (Ayarlar'dan ya da ilk acilista). Secim sayfayi yeniler.
  UI.langModal = function (first) {
    var acts = {}, html = '<h1>🌐 ' + $t('Dil') + (' / Language</h1><div class="langs">');
    Z.LANGS.forEach(function (l) {
      html += '<button class="btn lang-btn' + (l.id === Z.lang ? ' on' : '') + '" data-act="l_' + l.id + '" data-code="' + l.id.toUpperCase() + '">' + l.name + (l.id === Z.lang ? '<span class="tk">' + icoId('ic-status-tick', '✔') + '</span>' : '') + '</button>';
      acts['l_' + l.id] = function () { S.data.langChosen = true; S.save(); if (l.id === Z.lang) { UI.closeModal(); if (first) UI.welcome(); return; } Z.setLang(l.id); };
    });
    UI.modal(html + '</div>' + (first ? '' : '<div class="actions"><button class="btn small" data-act="close">' + $t('Geri') + '</button></div>'), Object.assign(acts, { close: function () { UI.settingsModal(); } }));
  };
  UI.welcome = function () {
    var d = S.data;
    if (!d.tutorialDone) {
      UI.modal(('<h1>' + $t('Hoş geldin, Komutan!') + '</h1>') +
        ('<div class="qz"><p>' + $t('Düşman kalesi yolunu kesiyor. Kampını kur, ordunu hazırla ve kuşatmayı başlat!') + '</p>') +
        ('<p class="small">' + $t('İlk savaşta sana adım adım nasıl oynanacağını göstereceğim.') + '</p></div>') +
        ('<div class="actions"><button class="btn gold primary" data-act="go">⚔ ' + $t('İlk Savaşa Başla') + '</button></div>'),
        { go: function () { d.tutorialDone = true; d.seenVersion = Z.NOTES_ID; S.save(); UI.closeModal(); UI.game.startBattle('campaign', 1); } });
      return;
    }
    if (d.seenVersion !== Z.NOTES_ID) return UI.whatsNew();
    if (!d.daily.claimedToday) {
      var r = Z.DAILY_REWARDS[S.dailyIndex()];
      UI.modal(('<h1>🎁 ' + $t('Günlük Ödül') + '</h1><p>' + $t('Seri') + ': <b>') + $t('{n}. gün', { n: d.daily.streak + 1 }) + '</b></p><div class="rewards">' +
        (r.coins ? '<span class="coin">🪙 ' + r.coins + '</span>' : '') + (r.gems ? '<span class="gem">💎 ' + r.gems + '</span>' : '') + '</div>' +
        ('<p class="small">' + $t('Her gün gir, seri bozulmasın — 7. gün büyük ödül!') + '</p><div class="actions"><button class="btn gold primary" data-act="claim">' + $t('Ödülü Al') + '</button></div>'),
        { claim: function () { S.claimDaily(); A.win(); UI.closeModal(); UI.renderHub(); var p = S.treasuryPending(); if (p >= 100) UI.toast(($t('Hazinende') + ' ') + p + (' ' + $t('altın birikti!'))); } });
      return;
    }
    var p = S.treasuryPending();
    if (p >= 100) UI.toast(($t('Hazinende') + ' ') + p + (' ' + $t('altın birikti!')));
  };

  // ---------------------------------------------------------------- Sonuc ekrani
  UI.resultModal = function (b, out) {
    var r = b.result, isE = b.mode === 'endless', html, acts = {}, nextOk = b.mode === 'campaign' && r.win && b.level < Z.MAX_LEVEL;
    M.noteBattleEnd();
    function leave(fn) { UI.closeModal(); M.maybeInterstitial(b.level || 1, fn); } // gecis reklami (uygunsa) sonra devam
    acts.again = function () { leave(function () { var o = Object.assign({}, b.startOpts); delete o.boosters; UI.game.startBattle(b.mode, b.level, o); }); }; // hazirlik kartlari yeniden harcanmaz
    acts.menu = function () { leave(function () { UI.game.toMenu(); }); };
    acts.next = function () { leave(function () { UI.game.startBattle('campaign', b.level + 1); }); };
    acts.army = function () { leave(function () { UI.game.toMenu('army'); }); };
    acts.dbl = function () {
      M.showRewarded('double', function (ok) {
        if (!ok) return UI.toast($t('Ödül için reklamı sonuna kadar izlemelisin'));
        S.data.coins += base; S.save(); A.chest(); UI.toast('+' + base + ' 🪙'); var bt = $('btn-dbl'); if (bt) { UI.setIco(bt, '✔'); bt.classList.add('off'); }
      });
    };
    acts.adcoins = function () {
      M.showRewarded('result', function (ok) {
        if (!ok) return UI.toast($t('Ödül için reklamı sonuna kadar izlemelisin'));
        var g = M.grantFreeReward('coins'); S.save(); A.chest(); UI.toast('+' + g.coins + ' 🪙'); var bt = $('btn-adcoins'); if (bt) { UI.setIco(bt, '✔'); bt.classList.add('off'); }
      });
    };
    if (isE) {
      html = '<h1 class="ban">' + $t('{n}. Dalgaya Ulaştın!', { n: r.wave }) + '</h1>' + (out.newBest ? ('<p style="color:var(--gold);font-weight:800">🏆 ' + $t('YENİ REKOR!') + '</p>') : ('<p class="mut">' + $t('Rekor') + ': ') + S.data.endlessBest + ('. ' + $t('dalga') + '</p>')) +
        '<p class="mut">' + $t('Süre {time} · {kills} düşman', { time: Z.fmtTime(r.time), kills: r.kills }) + '</p><div class="rewards"><span class="coin">🪙 ' + out.coins + '</span>' + (out.gems ? '<span class="gem">💎 ' + out.gems + '</span>' : '') + '</div>';
    } else if (r.win) {
      var base = out.coins - (out.chest ? out.chest.coins : 0), bg = out.gems - (out.chest ? out.chest.gems : 0);
      html = '<h1 class="ban">' + (b.mode === 'daily' ? $t('GÜNLÜK SEFER TAMAM!') : $t('ZAFER!')) + '</h1>' + (b.diff > 0 ? '<p style="margin:0;color:var(--gold);font-weight:800">' + UI.tierIco(b.diff) + ' ' + Z.DIFFS[b.diff].name + (' ' + $t('kademe') + '</p>') : '') + '<div class="big-stars">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= r.stars ? 'on' : 'off') + '" style="animation-delay:' + (0.25 + i * 0.35) + 's">' + (i <= r.stars ? icoId('ic-cur-mullet', '★') : icoId('ic-cur-mullet-empty', '★')) + '</span>'; }).join('') + '</div>' +
        '<p class="mut">' + (b.kind === 'field' ? $t('Süre {time} · Ordu korundu %{pct} · {kills} düşman', { time: Z.fmtTime(r.time), pct: Math.round(r.basePct * 100), kills: r.kills }) : $t('Süre {time} · Kamp canı %{pct} · {kills} düşman', { time: Z.fmtTime(r.time), pct: Math.round(r.basePct * 100), kills: r.kills })) + '</p>' +
        '<div class="rewards"><span class="coin">🪙 ' + base + '</span>' + (bg > 0 ? '<span class="gem">💎 ' + bg + '</span>' : '') + '</div>' +
        (out.chest ? ('<div id="chest-area"><button class="chest" data-act="chest">' + icoId('ic-cur-coffer', '🎁') + '</button><p class="small qp">' + $t('Sandığı aç!') + '</p></div>') : '');
      var notes = (b.mode === 'daily' && !out.dailyFirst ? ('<p class="small">' + $t('Bugünkü ödül zaten alınmıştı (ödülsüz tekrar).') + '</p>') : '') +
        (out.firstHard ? ('<p class="small gold">' + $t('İlk kez bu kademede kazandın: bonus elmas!') + '</p>') : '') +
        (out.booster ? '<p class="gold">🎁 ' + $t('Hazırlık kartı kazandın') + ': ' + UI.boosterIco(out.booster) + ' ' + Z.BOOSTERS[out.booster].name + '</p>' : '') +
        (out.newUnits.length ? ('<p class="gold">🎉 ' + $t('Yeni birlik') + ': ') + out.newUnits.map(function (u) { return UI.unitImg(u, 0, 44) + ' ' + Z.UNITS[u].name; }).join(', ') + '</p>' : '');
      if (notes) html += '<div class="qz">' + notes + '</div>';
      acts.chest = function () {
        var a = $('chest-area'); if (!a || !out.chest) return;
        a.innerHTML = '<div class="chest open">' + icoId('ic-cur-coffer-open', '🎁') + '</div>'; A.chest();
        setTimeout(function () {
          if (!$('chest-area')) return;
          A.win();
          $('chest-area').innerHTML = zi(('<p class="small qp">' + $t('Sandık ödülü') + '</p><div class="rewards"><span class="coin">🪙 ') + out.chest.coins + '</span>' + (out.chest.gems ? '<span class="gem">💎 ' + out.chest.gems + '</span>' : '') + '</div>');
        }, 750);
      };
    } else {
      html = ('<h1>' + $t('Yenilgi') + '</h1><p>') + (b.kind === 'field' ? (b.cmdP.dead || b.cmdP.hp <= 0 ? $t('Komutanın düştü! Onu arkada, korunaklı tut.') : $t('Süre doldu ya da bayraklar kaybedildi. Dizilişini değiştirip tekrar dene!')) : $t('Kampın düştü. Ordunu güçlendirip tekrar dene!')) + '</p>' +
        '<div class="rewards"><span class="coin">🪙 ' + out.coins + ('</span></div><p class="small">' + $t('İpucu: Düşman birliklerine karşı üstün olanı çağır (🔱 > 🐎 > 🏹 > 🔱).') + '</p>');
    }
    if (M.canRewarded()) {
      if (r.win && !isE && Z.MONEY.ads.doubleWinReward && base > 0) html += '<div class="actions"><button id="btn-dbl" class="btn gold small" data-act="dbl">🎬 ' + $t('Ödülü ×2 yap') + ' (+' + base + ' 🪙)</button></div>';
      else if (!r.win || isE) html += '<div class="actions"><button id="btn-adcoins" class="btn small" data-act="adcoins">🎬 +' + Z.MONEY.ads.rewardedCoins + ' 🪙</button></div>';
    }
    html += '<div class="actions">' + (r.win || isE ? '' : ('<button class="btn small" data-act="army">🛡️ ' + $t('Ordu') + '</button>')) +
      ('<button class="btn small" data-act="menu">' + $t('Menü') + '</button><button class="btn small" data-act="again">' + $t('Tekrar') + '</button>') +
      (nextOk ? ('<button class="btn gold primary" data-act="next">' + $t('Sonraki') + ' ▶</button>') : '') + '</div>';
    var mod = UI.modal(html, acts); mod.classList.add(isE || r.win ? 'win' : 'defeat'); // zafer: kirmizi sancak baslik + lapis sandik; yenilgi: bos (underdrawn) pencere, altin cekilir
  };

  // ---------------------------------------------------------------- Savas HUD
  var hud = { battle: null, cards: {}, last: {}, drag: null, ghost: null };
  UI.hud = hud;
  // durus dugmesi: saldiri = capraz kilic, savunma = kalkan (ic-act-*); etiket i18n anahtarlari ayni
  function stanceHtml(def) { return def ? icoId('ic-act-shield', '🛡') + '<small>' + $t('Savun') + '</small>' : icoId('ic-act-swords', '⚔') + '<small>' + $t('Saldır') + '</small>'; }
  // secilen ganimet (perk) simgeleri: <i> ogeleri kalir (e2e-v02 '#perk-row i' sayar), icerik by.perk simgesi
  function perkRowHtml(b) { return Object.keys(b.perks).map(function (k) { return '<i title="' + esc(Z.PERKS[k].name) + '">' + UI.perkIco(k) + '</i>'; }).join(''); }

  UI.hudBuild = function (b) {
    hud.battle = b; hud.last = {}; hud.cards = {};
    $('hud').classList.remove('hidden'); $('game').classList.remove('hidden');
    var wrap = $('cards'); wrap.innerHTML = '';
    b.deck.forEach(function (id) {
      var u = Z.UNITS[id], el = document.createElement('button');
      el.className = 'card'; el.setAttribute('data-unit', id);
      el.innerHTML = zi('<div class="cd"></div><div class="c-ico">' + UI.unitImg(id, 0, 66) + '</div><div class="c-name">' + u.name + '</div><div class="c-cost">🪙 ' + u.cost + '</div>');
      wrap.appendChild(el); hud.cards[id] = { el: el, cd: el.firstChild };
    });
    var hero = Z.HEROES[b.heroId];
    $('skill-ico').innerHTML = UI.heroIco(b.heroId, 'M', 'own') + '<span class="vh" aria-hidden="true">' + hero.icon + '</span>'; $('skill-name').textContent = hero.skill; // .vh: testlerin okudugu kahraman karakteri (gorunmez ikiz)
    hud.tut = false; $('hint').classList.add('hidden');
    UI.tutStop(false);
    $('perk-row').innerHTML = '';
    // kural rozeti: kademe + kural simgeleri (veri tabanli); ikiz (.vh) ayni emojileri yalniz karakter olarak tutar (e2e-v04 /🔥/)
    var rc = $('rule-chip'), rhtml = (b.diff > 0 ? UI.tierIco(b.diff) + ' ' : '') + b.rules.map(function (r) { return UI.ruleIco(r) + (b.rules.length === 1 ? ' ' + esc(Z.RULES[r].name) : ''); }).join(' '),
      rtwin = (b.diff > 0 ? Z.DIFFS[b.diff].icon : '') + b.rules.map(function (r) { return Z.RULES[r].icon; }).join('');
    if (rhtml.replace(/\s+/g, '')) { rc.innerHTML = rhtml + (rtwin ? '<span class="vh" aria-hidden="true">' + esc(rtwin) + '</span>' : ''); rc.classList.remove('hidden'); } else rc.classList.add('hidden');
    $('info-title').textContent = b.mode === 'endless' ? $t('Sonsuz Kuşatma') : (b.mode === 'daily' ? $t('Günlük Sefer') : ($t('Bölüm') + ' ') + b.level) + ' · ' + b.info.name;
    $('btn-speed').textContent = 'x' + (UI.game.speed || 1);
    var f = b.kind === 'field';
    $('hud').classList.toggle('field', f);
    $('field-bar').classList.toggle('hidden', !f); $('obj-chip').classList.toggle('hidden', !f);
    hud.sel = f ? b.deck[0] : null; hud.fdrag = null; Z.Render.fhover = null;
    if (f) {
      $('fb-stance').classList.add('hidden'); $('fb-go').classList.remove('hidden'); $('fb-auto').classList.remove('hidden'); $('fb-clear').classList.remove('hidden');
      $('fb-stance').innerHTML = stanceHtml(false);
      hud.fieldTut = !S.data.fieldTutDone; $('hint').classList.toggle('hidden', !hud.fieldTut);
      UI.setIco($('hint'), '👆 ' + $t('Kartı sahaya sürükle · birliğe dokun: geri al'));
    }
    if (!f && b.mode === 'campaign' && b.level === 1 && !S.data.tutorialDone2) UI.tutStart(b);
  };

  // ---- Etkilesimli ogretici (ilk kez oynayan: Sefer 1) ----
  var tut = null;
  var TUT = [
    { kind: 'info', hold: true, text: $t('Hoş geldin, Komutan! 🏕️ Aşağıdaki kamp <b>senin</b>, yukarıdaki kale <b>düşmanın</b>. Amaç: düşman kalesini yıkmak.'), ok: $t('Devam') },
    { kind: 'action', hold: true, text: ('🃏 ' + $t('Bir <b>birlik kartını</b> sürükleyip yukarıdaki <b>yollardan birine</b> bırak.')), target: function (b) { return '[data-unit="' + b.deck[0] + '"]'; }, hand: 'up', cond: function (b) { return b.stats.spawns >= 1; }, assist: function (b) { b.gold = Math.max(b.gold, Z.UNITS[b.deck[0]].cost + 1); } },
    { kind: 'info', hold: true, text: ('⚔️ ' + $t('Her birliğin bir üstünlüğü var:<br><b>🔱 mızrakçı › 🐎 süvari › 🏹 okçu › 🔱</b><br>Düşmanın ne çıkardığına bak, ona karşı olanı çağır.')), ok: $t('Anladım') },
    { kind: 'action', text: ('🛤️ ' + $t('Altın birikince bu kez <b>başka bir yola</b> birlik çağır. (Bir yola dokunup seçip karta dokunmak da çalışır.)')), target: function () { return '#cards'; }, hand: 'up', cond: function (b) { return b.stats.spawns >= 2; }, assist: function (b) { b.gold = Math.max(b.gold, 60); } },
    { kind: 'action', text: ('⛏ ' + $t('<b>Madeni yükselt!</b> Daha çok altın, daha çok ordu demek.')), target: function () { return '#btn-mine'; }, hand: 'tap', cond: function (b) { return b.mine >= 1; }, assist: function (b) { var c = b.mineCost(); if (c) b.gold = Math.max(b.gold, c + 1); } },
    { kind: 'action', text: ('🦁 ' + $t('<b>Kahraman yeteneği!</b> Düğmeyi sürükleyip düşmanların olduğu <b>yola bırak</b>.')), target: function () { return '#btn-skill'; }, hand: 'up', cond: function (b) { return b.stats.skills >= 1; }, assist: function (b) { if (b.heroCd > 0) b.heroCd = 0; } },
    { kind: 'info', text: ('🎉 ' + $t('Harika! Şimdi ordunu çağırmaya devam et ve <b>düşman kalesini yık</b>. Kazanınca yıldız, altın ve yeni birlikler seni bekliyor!')), ok: $t('Savaşa devam') }
  ];
  UI.tutActive = function () { return !!tut; };
  UI.tutStop = function (done) {
    var wasOn = !!tut; tut = null; $('tut').classList.add('hidden'); $('tut').classList.remove('block'); if (UI.game) UI.game.tutHold = false;
    if (done && wasOn) { S.data.tutorialDone2 = true; S.save(); }
  };
  UI.tutStart = function (b) { tut = { i: -1, t: 0 }; $('tut').classList.remove('hidden'); UI.tutNext(b); };
  UI.tutNext = function (b) {
    tut.i++; if (tut.i >= TUT.length) return UI.tutStop(true);
    var st = TUT[tut.i], info = st.kind === 'info';
    $('tut-step').textContent = ($t('Öğretici') + ' ') + (tut.i + 1) + ' / ' + TUT.length; $('tut-text').innerHTML = zi(st.text);
    $('tut-ok').classList.toggle('hidden', !info); if (info) $('tut-ok').textContent = st.ok || $t('Tamam');
    $('tut').classList.toggle('block', info); UI.game.tutHold = !!st.hold; A.click();
    tut.target = st.target ? st.target(b) : null; tut.pos = 0; if (st.assist) st.assist(b); UI.tutPlace();
  };
  UI.tutPlace = function () {
    var ring = $('tut-ring'), hand = $('tut-hand'), el = tut && tut.target ? document.querySelector(tut.target) : null, st = TUT[tut.i];
    if (!el || !el.getBoundingClientRect().width) { ring.classList.add('hidden'); hand.classList.add('hidden'); return; }
    var r = el.getBoundingClientRect(), s = UI.game.stage, x = (r.left - (s.left || 0)) / s.scale, y = r.top / s.scale, w = r.width / s.scale, h = r.height / s.scale;
    ring.classList.remove('hidden'); ring.style.cssText = 'left:' + (x - 8) + 'px;top:' + (y - 8) + 'px;width:' + (w + 16) + 'px;height:' + (h + 16) + 'px';
    hand.classList.remove('hidden'); hand.className = st.hand === 'up' ? 'up' : 'tap'; hand.style.left = (x + w / 2 - 20) + 'px'; hand.style.top = (y + h / 2 - 8) + 'px';
  };
  UI.tutUpdate = function (b) {
    if (!tut) return;
    if (b.over) return UI.tutStop(true);
    var st = TUT[tut.i]; tut.t++;
    if (st.assist && tut.t % 30 === 0) st.assist(b);
    if (tut.t % 15 === 0) UI.tutPlace();
    if (st.kind === 'action' && st.cond(b)) UI.tutNext(b);
  };

  // ---- Acik alan arayuzu ----
  function fieldHudUpdate(b) {
    var L = hud.last, set = function (k, v, fn) { if (L[k] !== v) { L[k] = v; fn(v); } }, prep = b.phase === 'prep';
    set('g', Math.floor(b.gold), function (v) { $('gold-val').textContent = v; });
    set('cap', prep ? b.budget0 : b.goldCap(), function (v) { $('gold-cap').textContent = '/' + v; });
    set('rate', prep ? -1 : b.income(), function (v) { $('gold-rate').textContent = v < 0 ? $t('komuta puanı') : '+' + (Math.round(v * 10) / 10) + ('/' + $t('sn')); });
    b.deck.forEach(function (id) {
      var cd = b.cooldown[id], def = Z.UNITS[id], c = hud.cards[id], f = Math.round(100 * cd / def.cd) / 100;
      set('cd' + id, f, function (v) { c.cd.style.transform = 'scaleY(' + v + ')'; });
      set('p' + id, b.gold < def.cost, function (v) { c.el.classList.toggle('poor', v); });
      set('s' + id, hud.sel === id, function (v) { c.el.classList.toggle('sel', v); });
    });
    var h = Z.HEROES[b.heroId];
    set('hcd', prep ? 1 : Math.round(100 * b.heroCd / h.cd) / 100, function (v) { document.querySelector('#btn-skill .cd').style.transform = 'scaleY(' + v + ')'; });
    set('hst', prep ? $t('Savaşta') : b.heroCd <= 0 ? $t('HAZIR!') : Math.ceil(b.heroCd) + (' ' + $t('sn')), function (v) { $('skill-state').textContent = v; $('btn-skill').classList.toggle('ready', !prep && b.heroCd <= 0); });
    var mc = b.mineCost();
    set('mine', prep + ':' + b.mine + ':' + (mc !== null && b.gold >= mc), function () {
      $('mine-txt').innerHTML = zi(mc === null ? $t('Maden MAKS') : $t('Maden Sv.') + (b.mine + 1) + '<br><span style="color:var(--gold)">🪙 ' + mc + '</span>');
      $('btn-mine').classList.toggle('off', prep || mc === null || b.gold < mc);
    });
    set('phase', b.phase, function () {
      $('fb-go').classList.toggle('hidden', !prep); $('fb-auto').classList.toggle('hidden', !prep); $('fb-clear').classList.toggle('hidden', !prep); $('fb-stance').classList.toggle('hidden', prep);
      if (!prep) { hud.fieldTut = false; S.data.fieldTutDone = true; S.save(); $('hint').classList.add('hidden'); }
    });
    set('stance', b.stance, function (v) { $('fb-stance').innerHTML = stanceHtml(v === 'defend'); $('fb-stance').classList.toggle('def', v === 'defend'); });
    // hedef rozeti: komutan can yuzdesi (kalkan) + hedefin simgesi (by.objective: tac / sancak / kum saati) ve skoru
    var oc = $('obj-chip'), ok = b.objective === 'capture' ? 'capture' : b.objective === 'survive' ? 'survive' : 'commander', txt;
    if (ok === 'capture') txt = Math.floor(b.scores.p) + ' – ' + Math.floor(b.scores.e);
    else if (ok === 'survive') txt = Z.fmtTime(Math.max(0, b.info.surviveTime - b.t));
    else txt = Math.round(100 * Math.max(0, b.cmdE.hp) / b.cmdE.max) + '%';
    txt = zi('🛡 ' + Math.round(100 * Math.max(0, b.cmdP.hp) / b.cmdP.max) + '% · ') + UI.objIco(ok) + ' ' + esc(txt);
    set('obj', txt, function (v) { oc.innerHTML = v; });
    set('title', Math.floor(b.t / 2), function () { $('info-title').textContent = (b.mode === 'daily' ? $t('Günlük Sefer') : ($t('Sefer') + ' ') + b.level) + ' · ' + b.info.name + (prep ? (' · ' + $t('Hazırlık')) : ' · ' + Z.fmtTime(b.t)); });
    set('combo', b.combo >= 3 ? b.combo : 0, function (v) { var cEl = $('combo-chip'); cEl.classList.toggle('hidden', !v); if (v) UI.setIco(cEl, ('🔥 ' + $t('Seri x')) + v); });
    set('perks', Object.keys(b.perks).join(), function () { $('perk-row').innerHTML = perkRowHtml(b); });
  }
  UI.fieldPlace = function (type, x, y, el) {
    var b = hud.battle;
    if (b.phase === 'battle' && y < Z.FH - Z.FZONE.battle) { A.deny(); UI.toast($t('Takviye yalnızca alt şeritten gelir')); return false; }
    var cost = Z.UNITS[type].cost;
    if (b.gold < cost) { A.deny(); UI.toast(b.phase === 'prep' ? $t('Komuta puanın yetmiyor') : $t('Altın yetmiyor')); return false; }
    if (b.phase === 'battle' && b.cooldown[type] > 0) { A.deny(); return false; }
    if (!b.canPlace(x, y)) { A.deny(); UI.toast(y < Z.FH - Z.FZONE.prep ? $t('Burası yerleştirme alanı dışında') : $t('Buraya yerleştirilemez (nehir/kaya)')); return false; }
    if (!b.place(type, x, y)) { A.deny(); UI.toast($t('Ordu dolu')); return false; }
    if (b.phase === 'prep') A.click();
    return true;
  };
  UI.fieldSkill = function (x, y, el) {
    var b = hud.battle;
    if (b.phase !== 'battle') { A.deny(); UI.toast($t('Yetenek savaşta kullanılır')); return false; }
    if (b.useSkill(x, y)) return true;
    A.deny(); if (el) el.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 180 });
    return false;
  };
  UI.fieldSkillAuto = function (el) { // dokununca: dusman kalabaligina (sifa icin kendi ordunun merkezine)
    var b = hud.battle, h = Z.HEROES[b.heroId], team = h.type === 'ward' ? 0 : 1, best = null, bn = -1, i, j, n, o;
    if (h.target === 'none') return UI.fieldSkill(0, 0, el);
    for (i = 0; i < b.units.length; i++) {
      o = b.units[i]; if (o.team !== team || o.dead) continue;
      n = 0; for (j = 0; j < b.units.length; j++) if (b.units[j].team === team && !b.units[j].dead && Math.hypot(b.units[j].x - o.x, b.units[j].y - o.y) < 120) n++;
      if (n > bn) { bn = n; best = o; }
    }
    if (!best) { A.deny(); return false; }
    return UI.fieldSkill(best.x, best.y, el);
  };

  UI.hudUpdate = function (b) {
    if (b.kind === 'field') return fieldHudUpdate(b);
    var L = hud.last, i, set = function (k, v, fn) { if (L[k] !== v) { L[k] = v; fn(v); } };
    var g = Math.floor(b.gold);
    set('g', g, function (v) { $('gold-val').textContent = v; });
    set('cap', b.goldCap(), function (v) { $('gold-cap').textContent = '/' + v; });
    set('rate', b.income(), function (v) { $('gold-rate').textContent = '+' + (Math.round(v * 10) / 10) + ('/' + $t('sn')); });
    b.deck.forEach(function (id) {
      var cd = b.cooldown[id], def = Z.UNITS[id], c = hud.cards[id];
      var f = Math.round(100 * cd / def.cd) / 100;
      set('cd' + id, f, function (v) { c.cd.style.transform = 'scaleY(' + v + ')'; });
      set('p' + id, b.gold < def.cost, function (v) { c.el.classList.toggle('poor', v); });
    });
    var h = Z.HEROES[b.heroId];
    set('hcd', Math.round(100 * b.heroCd / h.cd) / 100, function (v) { document.querySelector('#btn-skill .cd').style.transform = 'scaleY(' + v + ')'; });
    set('hst', b.heroCd <= 0 ? $t('HAZIR!') : Math.ceil(b.heroCd) + (' ' + $t('sn')), function (v) {
      $('skill-state').textContent = v; $('btn-skill').classList.toggle('ready', b.heroCd <= 0);
    });
    var mc = b.mineCost();
    set('mine', b.mine + ':' + (mc !== null && b.gold >= mc), function () {
      $('mine-txt').innerHTML = zi(mc === null ? $t('Maden MAKS') : $t('Maden Sv.') + (b.mine + 1) + '<br><span style="color:var(--gold)">🪙 ' + mc + '</span>');
      $('btn-mine').classList.toggle('off', mc === null || b.gold < mc);
    });
    if (b.mode === 'endless') set('title', 'w' + b.wave(), function () { $('info-title').textContent = ($t('Dalga') + ' ') + b.wave() + ' · ' + Z.fmtTime(b.t); });
    else set('title', Math.floor(b.t), function () { var sv = b.rl('survive'); UI.setIco($('info-title'), (b.mode === 'daily' ? $t('Günlük Sefer') : ($t('Sefer') + ' ') + b.level) + ' · ' + b.info.name + ' · ' + (sv ? '⏳ ' + Z.fmtTime(Math.max(0, b.info.surviveTime - b.t)) : Z.fmtTime(b.t)), sv ? '⏳' : ''); }); // ikiz: e2e-v03 /⏳/
    set('combo', b.combo >= 3 ? b.combo : 0, function (v) {
      var cEl = $('combo-chip'); cEl.classList.toggle('hidden', !v); if (v) UI.setIco(cEl, ('🔥 ' + $t('Seri x')) + v);
    });
    set('perks', Object.keys(b.perks).join(), function () { $('perk-row').innerHTML = perkRowHtml(b); });
    if (UI.tutActive()) UI.tutUpdate(b);
  };

  function stagePoint(e) { var s = UI.game.stage; return { x: (e.clientX - (s.left || 0)) / s.scale, y: e.clientY / s.scale }; }

  function bindHud() {
    var Rn = Z.Render, canvas = $('game');
    canvas.addEventListener('pointerdown', function (e) {
      if (!hud.battle || UI.game.paused) return;
      var p = stagePoint(e);
      if (hud.battle.kind === 'field') {
        var b = hud.battle, w = Rn.toWorld(p.x, p.y); A.init();
        if (b.phase === 'prep') {
          var u = b.unitAt(w.x, w.y, 24);
          if (u && !u.commander) { try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* eski WebView */ } hud.fdrag = { id: u.id, pid: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; return; }
        }
        if (hud.sel) UI.fieldPlace(hud.sel, w.x, w.y);
        return;
      }
      var lane = Rn.laneAt(p.x, p.y);
      if (lane >= 0) { Rn.selLane = lane; A.init(); }
    });
    function startDrag(el, action, e) {
      e.preventDefault(); A.init();
      if (hud.drag) return; // ikinci parmak mevcut surukleme/hayaleti bozmasin
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* eski WebView */ }
      hud.drag = { el: el, action: action, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    }
    $('cards').addEventListener('pointerdown', function (e) {
      var el = e.target.closest('[data-unit]'); if (el && hud.battle && !UI.game.paused) startDrag(el, { kind: 'unit', type: el.getAttribute('data-unit') }, e);
    });
    $('btn-skill').addEventListener('pointerdown', function (e) {
      if (hud.battle && !UI.game.paused) startDrag($('btn-skill'), { kind: 'skill' }, e);
    });
    function fieldHover(d, p) {
      var b = hud.battle, w = Rn.toWorld(p.x, p.y);
      if (d.action.kind === 'skill') Rn.fhover = { kind: 'skill', x: w.x, y: w.y };
      else { w.y -= 34; Rn.fhover = { kind: 'unit', x: w.x, y: w.y, ok: b.canPlace(w.x, w.y) && (b.phase === 'prep' || w.y >= Z.FH - Z.FZONE.battle) && b.gold >= Z.UNITS[d.action.type].cost }; }
      return w;
    }
    function move(e) {
      var fd = hud.fdrag;
      if (fd && e.pointerId === fd.pid) {
        if (!fd.moved && Math.hypot(e.clientX - fd.x, e.clientY - fd.y) > 10 * UI.game.stage.scale) fd.moved = true;
        if (fd.moved && hud.battle) { var pf = stagePoint(e), wf = Rn.toWorld(pf.x, pf.y); wf.y -= 24; var okf = hud.battle.canPlace(wf.x, wf.y); if (okf) hud.battle.moveUnit(fd.id, wf.x, wf.y); Rn.fhover = { kind: 'unit', x: wf.x, y: wf.y, ok: okf }; }
        return;
      }
      var d = hud.drag; if (!d || e.pointerId !== d.id) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14 * UI.game.stage.scale) {
        d.moved = true;
        var g = document.createElement('div'); g.className = 'drag-ghost';
        g.innerHTML = d.action.kind === 'unit' ? UI.unitImg(d.action.type, 0, 84) : UI.heroIco(hud.battle.heroId, 'L', 'own'); // surukleme hayaleti: onbellekli birlik portresi / kahraman kalkani
        $('stage').appendChild(g); hud.ghost = g;
      }
      if (d.moved) {
        var p = stagePoint(e); hud.ghost.style.left = p.x + 'px'; hud.ghost.style.top = p.y + 'px';
        if (hud.battle.kind === 'field') fieldHover(d, p); else Rn.dragLane = Rn.laneAt(p.x, p.y);
      }
    }
    function up(e) {
      var fd = hud.fdrag;
      if (fd && e.pointerId === fd.pid) {
        hud.fdrag = null; Rn.fhover = null;
        var bf = hud.battle, pf = stagePoint(e);
        if (!bf || UI.game.paused || bf.phase !== 'prep') return;
        if (!fd.moved || pf.y > UI.game.stage.h - 262) { var un = bf.units.filter(function (q) { return q.id === fd.id; })[0]; if (bf.removeUnit(fd.id)) { A.click(); UI.toast(($t('Geri alındı') + ' +') + (un ? un.cost : 0) + (' ' + $t('puan'))); } }
        return;
      }
      var d = hud.drag; if (!d || e.pointerId !== d.id) return;
      hud.drag = null;
      if (hud.ghost) { hud.ghost.remove(); hud.ghost = null; }
      var lane = Rn.dragLane; Rn.dragLane = -1;
      if (hud.battle && hud.battle.kind === 'field') {
        var hv = Rn.fhover; Rn.fhover = null;
        if (UI.game.paused) return;
        var pu = stagePoint(e), over = pu.y > UI.game.stage.h - 262;
        if (!d.moved) { if (d.action.kind === 'unit') { hud.sel = d.action.type; A.click(); } else UI.fieldSkillAuto(d.el); return; }
        if (over) return; // kart alanina birakildi: iptal
        if (d.action.kind === 'unit') { if (hv) UI.fieldPlace(d.action.type, hv.x, hv.y, d.el); } else if (hv) UI.fieldSkill(hv.x, hv.y, d.el);
        return;
      }
      if (!hud.battle || UI.game.paused) return;
      if (!d.moved) lane = Rn.selLane;
      else if (lane < 0) return; // sahaya birakilmadi: iptal
      Rn.selLane = lane >= 0 ? lane : Rn.selLane;
      if (d.action.kind === 'unit') UI.tryDeploy(d.action.type, lane, d.el);
      else UI.trySkill(lane, d.el);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', function (e) { if (hud.fdrag) { hud.fdrag = null; Rn.fhover = null; } var d = hud.drag; if (d && e.pointerId === d.id) { Rn.fhover = null; hud.drag = null; Rn.dragLane = -1; if (hud.ghost) { hud.ghost.remove(); hud.ghost = null; } } });

    $('tut-ok').addEventListener('click', function () { if (tut) UI.tutNext(hud.battle); });
    $('tut-skip').addEventListener('click', function () { A.click(); UI.tutStop(true); UI.toast($t('Öğretici geçildi')); });
    $('btn-mine').addEventListener('click', function () {
      if (!hud.battle || UI.game.paused) return;
      if (!hud.battle.upgradeMine()) { A.deny(); } else { A.coin(); }
    });
    $('fb-auto').addEventListener('click', function () { var b = hud.battle; if (!b || b.kind !== 'field' || b.phase !== 'prep') return; A.click(); b.autoPlace(); UI.toast($t('Ordu otomatik dizildi — dilediğin gibi sürükleyip değiştir')); });
    $('fb-clear').addEventListener('click', function () { var b = hud.battle; if (!b || b.kind !== 'field' || b.phase !== 'prep') return; A.click(); b.units.filter(function (u) { return u.team === 0 && !u.commander; }).forEach(function (u) { b.removeUnit(u.id); }); });
    $('fb-go').addEventListener('click', function () {
      var b = hud.battle; if (!b || b.kind !== 'field' || b.phase !== 'prep' || UI.game.paused) return;
      if (b.countTeam(0) < 2) { A.deny(); UI.toast($t('Önce birlik yerleştir (ya da 🎲 Otomatik)')); return; }
      b.startBattle();
    });
    $('fb-stance').addEventListener('click', function () { var b = hud.battle; if (!b || b.kind !== 'field') return; A.click(); b.setStance(b.stance === 'attack' ? 'defend' : 'attack'); UI.toast(b.stance === 'defend' ? ('🛡 ' + $t('Savunma: birlikler yakındaki düşmana karşılık verir')) : ('⚔ ' + $t('Saldırı: birlikler düşmana yürür'))); });
    $('btn-pause').addEventListener('click', function () { A.click(); UI.game.pause(); });
    $('btn-speed').addEventListener('click', function () {
      var g = UI.game; g.speed = g.speed === 1 ? 2 : g.speed === 2 ? 3 : 1; $('btn-speed').textContent = 'x' + g.speed; A.click();
    });
    $('btn-auto').addEventListener('click', function () {
      var g = UI.game, b = g.battle; if (!b || b.over) return;
      if (S.data.cleared < Z.AUTO_UNLOCK) { A.deny(); return UI.toast($t('Oto savaş {n}. bölümden sonra açılır', { n: Z.AUTO_UNLOCK })); }
      g.setAuto(!g.auto); A.click(); UI.toast(g.auto ? ('🤖 ' + $t('Oto savaş açık')) : $t('Oto savaş kapalı'));
    });
  }

  UI.tryDeploy = function (type, lane, el) {
    var b = hud.battle;
    if (b.deploy(type, lane)) return true;
    A.deny();
    if (el) { el.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 180 }); }
    return false;
  };
  UI.trySkill = function (lane, el) {
    var b = hud.battle;
    if (b.useSkill(lane)) return true;
    A.deny(); if (el) el.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 180 });
    return false;
  };

  UI.perkModal = function (b, done) {
    var acts = {}, html = ('<h1>⚔️ ' + $t('Savaş Ganimeti') + '</h1><p>' + $t('Birini seç — bu savaş boyunca geçerli olur.') + '</p><div class="perks">');
    b.perkOffer.forEach(function (id) {
      var p = Z.PERKS[id];
      html += '<button class="perk" data-act="p_' + id + '"><span class="p-ico">' + UI.perkIco(id) + '</span><span class="p-name">' + p.name + '</span><span class="p-desc">' + p.desc + '</span></button>';
      acts['p_' + id] = function () { b.pickPerk(id); UI.closeModal(); if (done) done(); };
    });
    UI.modal(html + '</div>', acts);
  };

  UI.whatsNew = function () {
    var d = S.data;
    UI.modal('<h1>🎉 ' + Z.NAME + ' 0.10</h1><div class="new-list">' +
      '🏰 ' + $t('<b>Her bölüm gerçek bir tarihî kuşatma:</b> Orléans, Akka, Kazan, Malta, Viyana, İstanbul… 105 bölümün her biri gerçekten yaşanmış bir kale kuşatması') + '<br>' +
      '🏕️ ' + $t('<b>Senin tarafında artık kamp var:</b> tahta çit, yurtlar, ateşler ve tuğ') + '<br>' +
      '⚔️ ' + $t('<b>Yeni kuşatma kuralları:</b> Hendek, Yardım Ordusu, Abluka ve sur yarılınca gedik') + '<br>' +
      icoId('ic-status-new', '🌐') + ' ' + $t('Oyunun yeni adı:') + ' <b>' + Z.NAME + '</b><br><span class="small">' + $t('İlerlemen korundu.') + '</span></div>' +
      '<div class="actions"><button class="btn gold primary" data-act="ok">' + $t('Sefere çıkalım!') + '</button></div>',
      { ok: function () { d.seenVersion = Z.NOTES_ID; S.save(); UI.closeModal(); UI.welcome(); } });
  };

  UI.pauseModal = function (acts) {
    UI.modal(('<h1>' + $t('Duraklatıldı') + '</h1><div class="actions" style="flex-direction:column;align-items:center">') +
      ('<button class="btn gold primary" data-act="resume" style="width:420px">▶ ' + $t('Devam') + '</button>') +
      ('<button class="btn" data-act="restart" style="width:420px">↻ ' + $t('Yeniden Başla') + '</button>') +
      ('<button class="btn red" data-act="quit" style="width:420px">✕ ' + $t('Savaştan Çık') + '</button></div>'), acts);
  };
})(globalThis.Z = globalThis.Z || {});
