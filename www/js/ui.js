// Zafarion - arayuz: ana menu sekmeleri, modallar, savas HUD'u
(function (Z) {
  'use strict';
  var S = Z.Save, A = Z.Audio, $ = function (id) { return document.getElementById(id); };
  var UI = Z.UI = { tab: 'map', game: null, vaultTimer: null };
  var handlers = {};

  function star3(n) { var s = ''; for (var i = 1; i <= 3; i++) s += '<span class="' + (i <= n ? 'on' : 'off') + '">★</span>'; return '<span class="stars">' + s + '</span>'; }
  function unitStats(id, lvl) {
    var u = Z.UNITS[id];
    return { hp: Math.round(u.hp * Z.unitHpMult(lvl)), dmg: Math.round(u.dmg * Z.unitDmgMult(lvl)) };
  }
  function avgDeckLevel() {
    var d = S.data, sum = 0; d.deck.forEach(function (u) { sum += d.unitLvl[u]; });
    return d.deck.length ? sum / d.deck.length : 1;
  }
  function recommendedLevel(n) { return 1 + Math.floor(n * 0.4); }

  // ---------------------------------------------------------------- toast / modal
  var toastTimer = null;
  UI.toast = function (msg) {
    var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2200);
  };
  UI.modal = function (html, acts) {
    var layer = $('modal-layer');
    layer.innerHTML = '<div class="modal">' + html + '</div>';
    layer.classList.remove('hidden');
    handlers = acts || {};
    return layer.firstChild;
  };
  UI.closeModal = function () { $('modal-layer').classList.add('hidden'); $('modal-layer').innerHTML = ''; handlers = {}; };
  UI.modalOpen = function () { return !$('modal-layer').classList.contains('hidden'); };

  // ---------------------------------------------------------------- baslangic
  UI.init = function (game) {
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
    bindHud();
  };

  UI.showHub = function (tab) {
    if (tab) UI.tab = tab;
    $('hub').classList.remove('hidden'); $('hud').classList.add('hidden'); $('game').classList.add('hidden');
    UI.renderHub();
  };
  UI.hideHub = function () { $('hub').classList.add('hidden'); clearInterval(UI.vaultTimer); };

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
    else renderQuests(c);
    if (UI.tab !== 'map') c.scrollTop = keep;
  };

  function computeDots() {
    var d = S.data, out = { map: false, army: false, vault: false, quests: false };
    out.vault = !d.daily.claimedToday || S.treasuryPending() >= 150;
    d.quests.list.forEach(function (q) { if (!q.claimed && q.prog >= S.questDef(q.id).target) out.quests = true; });
    d.deck.forEach(function (u) { if (d.coins >= Z.unitUpgradeCost(d.unitLvl[u]) && d.unitLvl[u] < Z.MAX_UNIT_LVL) out.army = true; });
    return out;
  }

  // ---------------------------------------------------------------- SEFER
  function renderMap(c) {
    var d = S.data, N = Z.MAX_LEVEL, stepX = 156, w = 150 + N * stepX, i, html = '', pts = [];
    for (i = 1; i <= N; i++) pts.push([100 + (i - 1) * stepX, 150 + Math.sin(i * 0.95) * 78 + (i % 2 ? 24 : -4)]);
    var path = pts.map(function (p, k) { return (k ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
    html += '<div class="row" style="margin-bottom:10px"><h2 style="margin:0">Sefer Haritası</h2><div class="spacer"></div>' +
      '<span class="chip">⭐ ' + d.stats.totalStars + ' / ' + (N * 3) + '</span></div>';
    html += '<div class="mapwrap" id="mapwrap"><div class="maptrack" style="width:' + w + 'px">' +
      '<svg width="' + w + '" height="340"><path d="' + path + '" fill="none" stroke="#2f3b78" stroke-width="14" stroke-linecap="round" stroke-dasharray="2 22"/></svg>';
    for (i = 1; i <= N; i++) {
      var st = d.stars[i] || 0, boss = Z.isBoss(i), cls = 'node' + (boss ? ' boss' : '');
      if (st > 0) cls += ' done'; else if (i === d.cleared + 1) cls += ' cur'; else if (i > d.cleared + 1) cls += ' locked';
      html += '<button class="' + cls + '" data-level="' + i + '" style="left:' + pts[i - 1][0] + 'px;top:' + pts[i - 1][1] + 'px">' +
        (boss ? '<span style="font-size:30px;line-height:1">👑</span>' : '') + i +
        '<span class="st">' + (st ? '★'.repeat(st) : (i > d.cleared + 1 ? '🔒' : '')) + '</span>' +
        '<span class="nm">' + Z.levelInfo(i).name + '</span></button>';
    }
    html += '</div></div>';
    html += '<div class="mode-row">' +
      '<button class="panel mode-card" data-act-hub="endless"><span class="big">♾️</span><div><h3>Sonsuz Kuşatma</h3><small>Dalgalara dayan, rekor kır. En iyi: <b style="color:var(--gold)">' + d.endlessBest + '. dalga</b></small></div></button>' +
      '<button class="panel mode-card" data-act-hub="deck"><span class="big">🎖️</span><div><h3>Savaş Ordusu</h3><small>' + d.deck.map(function (u) { return Z.UNITS[u].icon; }).join(' ') + '  ·  ' + Z.HEROES[d.hero].icon + ' ' + Z.HEROES[d.hero].name + '</small></div></button>' +
      '</div>';
    c.innerHTML = html;
    var cur = c.querySelector('.node.cur') || c.querySelector('.node.done:last-of-type');
    if (cur) { var wrap = $('mapwrap'); wrap.scrollLeft = Math.max(0, cur.offsetLeft - wrap.clientWidth / 2 + 60); }
  }

  function levelModal(n) {
    var d = S.data, info = Z.levelInfo(n), st = d.stars[n] || 0, avg = avgDeckLevel(), rec = recommendedLevel(n);
    var ok = avg >= rec - 0.51;
    UI.modal(
      '<h1>Bölüm ' + n + (info.boss ? ' <span class="badge">PATRON</span>' : '') + '</h1>' +
      '<p class="mut" style="margin-top:0">' + info.name + '</p>' +
      '<div class="big-stars" style="font-size:64px">' + star3(st) + '</div>' +
      '<div class="row-lines"><span>Düşman: ' + info.tiers.map(function (u) { return Z.UNITS[u].icon; }).join(' ') + '</span>' +
      '<span>Ödül: 🪙 ' + info.rewardCoins + '+ · 💎 ' + info.rewardGems + '</span></div>' +
      '<p style="margin-top:16px">Önerilen birlik seviyesi: <b>' + rec + '</b> · Senin ortalaman: <b style="color:' + (ok ? 'var(--green)' : 'var(--red)') + '">' + avg.toFixed(1) + '</b></p>' +
      (ok ? '' : '<p class="small" style="color:#ffb4b4">Ordu sekmesinden birliklerini yükseltmek işini kolaylaştırır.</p>') +
      '<p>' + d.deck.map(function (u) { return '<span style="font-size:44px">' + Z.UNITS[u].icon + '</span>'; }).join(' ') + '</p>' +
      '<div class="actions"><button class="btn" data-act="close">Geri</button><button class="btn small" data-act="army">🛡️ Ordu</button><button class="btn gold" data-act="fight">⚔ SAVAŞ!</button></div>',
      {
        close: UI.closeModal,
        army: function () { UI.closeModal(); UI.tab = 'army'; UI.renderHub(); },
        fight: function () { UI.closeModal(); UI.game.startBattle('campaign', n); }
      });
  }

  // ---------------------------------------------------------------- ORDU
  function renderArmy(c) {
    var d = S.data, un = S.unlockedUnits(), html = '', i;
    html += '<div class="row"><h2 style="margin:0">Ordu</h2><div class="spacer"></div><span class="chip">Savaş kadrosu: ' + d.deck.length + ' / 5</span></div>';
    html += '<div class="sect">Birlikler</div><div class="grid2">';
    Z.UNIT_ORDER.forEach(function (id) {
      var u = Z.UNITS[id], lvl = d.unitLvl[id], locked = un.indexOf(id) < 0, inDeck = d.deck.indexOf(id) >= 0, s = unitStats(id, lvl);
      var cost = Z.unitUpgradeCost(lvl), maxed = lvl >= Z.MAX_UNIT_LVL;
      html += '<div class="panel ucard' + (locked ? ' locked' : '') + (inDeck ? ' indeck' : '') + '"><div class="big">' + u.icon + '</div><div class="info">' +
        '<h3>' + u.name + ' <span class="lvl">Sv.' + lvl + '</span></h3>' +
        (locked ? '<small>🔒 Bölüm ' + Z.UNLOCK_AT[id] + ' tamamlanınca açılır</small>' :
          '<small>❤ ' + s.hp + ' · ⚔ ' + s.dmg + ' · 🪙 ' + u.cost + '</small><div class="small" style="margin-top:4px;line-height:1.2">' + u.desc + '</div>' +
          '<div class="row" style="margin-top:10px;gap:10px">' +
          '<button class="btn small ' + (d.coins >= cost && !maxed ? 'gold' : 'off') + '" data-upg="' + id + '">' + (maxed ? 'MAKS' : '⬆ 🪙 ' + Z.fmt(cost)) + '</button>' +
          '<button class="btn small ' + (inDeck ? 'green' : '') + '" data-deck="' + id + '">' + (inDeck ? '✔ Kadroda' : 'Kadroya ekle') + '</button></div>') +
        '</div></div>';
    });
    html += '</div><div class="sect">Kahramanlar</div><div class="grid2">';
    Z.HERO_ORDER.forEach(function (id) {
      var h = Z.HEROES[id], owned = d.heroOwned[id], lvl = d.heroLvl[id], sel = d.hero === id, cost = Z.heroUpgradeCost(lvl);
      html += '<div class="panel ucard' + (sel ? ' indeck' : '') + '"><div class="big">' + h.icon + '</div><div class="info"><h3>' + h.name + (owned ? ' <span class="lvl">Sv.' + lvl + '</span>' : '') + '</h3>' +
        '<small><b style="color:var(--gold)">' + h.skill + '</b> · ' + h.cd + ' sn</small><div class="small" style="line-height:1.2;margin-top:4px">' + h.desc + '</div>' +
        '<div class="row" style="margin-top:10px;gap:10px">' +
        (owned ? '<button class="btn small ' + (d.coins >= cost ? 'gold' : 'off') + '" data-hup="' + id + '">⬆ 🪙 ' + Z.fmt(cost) + '</button>' +
          '<button class="btn small ' + (sel ? 'green' : '') + '" data-hsel="' + id + '">' + (sel ? '✔ Seçili' : 'Seç') + '</button>'
          : '<button class="btn small ' + (d.gems >= h.gems ? 'gold' : 'off') + '" data-hbuy="' + id + '">💎 ' + h.gems + ' ile aç</button>') +
        '</div></div></div>';
    });
    var cc = Z.castleUpgradeCost(d.castleLvl);
    html += '</div><div class="sect">Kale</div><div class="panel ucard"><div class="big">🏰</div><div class="info"><h3>Kale Surları <span class="lvl">Sv.' + d.castleLvl + '</span></h3>' +
      '<small>Kale canı: ❤ ' + Z.castleHp(d.castleLvl) + ' → ' + Z.castleHp(d.castleLvl + 1) + '</small></div>' +
      '<button class="btn ' + (d.coins >= cc ? 'gold' : 'off') + '" data-castle="1">⬆ 🪙 ' + Z.fmt(cc) + '</button></div>';
    c.innerHTML = html;
  }

  // ---------------------------------------------------------------- HAZINE
  function renderVault(c) {
    var d = S.data, html = '', pend = S.treasuryPending(), cap = Z.treasuryRate(d.treasuryLvl, d.cleared) * Z.TREASURY_CAP_H;
    var uc = Z.treasuryUpgradeCost(d.treasuryLvl);
    html += '<h2>Hazine</h2><div class="panel"><div class="row"><span style="font-size:80px">💰</span><div class="grow" style="flex:1">' +
      '<div class="bignum" id="vault-amt">🪙 ' + Z.fmt(pend) + '</div>' +
      '<div class="bar green"><i id="vault-bar" style="width:' + Math.min(100, 100 * pend / cap) + '%"></i></div>' +
      '<small id="vault-sub">Saatte ' + Z.fmt(Z.treasuryRate(d.treasuryLvl, d.cleared)) + ' altın · en çok ' + Z.TREASURY_CAP_H + ' saat birikir' + (S.treasuryFull() ? ' · <b style="color:var(--red)">DOLU!</b>' : '') + '</small></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px"><button class="btn gold" data-collect="1" id="vault-btn">Topla</button>' +
      '<button class="btn small ' + (d.coins >= uc ? '' : 'off') + '" data-tup="1">⬆ Sv.' + d.treasuryLvl + ' · 🪙 ' + Z.fmt(uc) + '</button></div></div></div>';
    html += '<div class="sect">Günlük Giriş Ödülü</div><div class="panel"><div class="daily">';
    var idx = S.dailyIndex();
    Z.DAILY_REWARDS.forEach(function (r, i) {
      var cls = 'day' + (i === idx && !d.daily.claimedToday ? ' today' : '') + ((i < idx) || (i === idx && d.daily.claimedToday) ? ' got' : '');
      if (d.daily.claimedToday && i === (idx + 6) % 7) cls = 'day got';
      html += '<div class="' + cls + '">Gün ' + (i + 1) + '<span class="ico">' + (r.gems ? '💎' : '🪙') + '</span>' + (r.coins ? r.coins : '') + (r.coins && r.gems ? '<br>' : '') + (r.gems ? '💎' + r.gems : '') + '</div>';
    });
    html += '</div><div class="actions" style="text-align:center;margin-top:16px"><button class="btn ' + (d.daily.claimedToday ? 'off' : 'gold') + '" data-daily="1">' +
      (d.daily.claimedToday ? 'Yarın tekrar gel!' : '🎁 Ödülü Al') + '</button></div></div>';
    c.innerHTML = html;
    UI.vaultTimer = setInterval(function () {
      var amt = $('vault-amt'); if (!amt) { clearInterval(UI.vaultTimer); return; }
      var p = S.treasuryPending(); amt.textContent = '🪙 ' + Z.fmt(p);
      $('vault-bar').style.width = Math.min(100, 100 * p / cap) + '%';
    }, 1000);
  }

  // ---------------------------------------------------------------- GOREVLER
  function renderQuests(c) {
    var d = S.data, html = '<h2>Günlük Görevler</h2>';
    d.quests.list.forEach(function (q, i) {
      var def = S.questDef(q.id), done = q.prog >= def.target;
      html += '<div class="panel quest"><div class="grow" style="flex:1"><h3>' + def.text + '</h3>' +
        '<div class="bar' + (done ? ' green' : '') + '"><i style="width:' + (100 * q.prog / def.target) + '%"></i></div><small>' + q.prog + ' / ' + def.target + '  ·  Ödül: 🪙 ' + def.coins + ' 💎 ' + def.gems + '</small></div>' +
        '<button class="btn ' + (q.claimed ? 'off' : done ? 'gold' : 'off') + '" data-quest="' + i + '">' + (q.claimed ? '✔ Alındı' : done ? 'Al' : '…') + '</button></div>';
    });
    html += '<div class="sect">İstatistikler</div><div class="panel"><table class="tbl">' +
      '<tr><td>Oynanan savaş</td><td>' + d.stats.battles + '</td><td>Kazanılan</td><td>' + d.stats.wins + '</td></tr>' +
      '<tr><td>Yenilen düşman</td><td>' + d.stats.kills + '</td><td>Toplam yıldız</td><td>⭐ ' + d.stats.totalStars + '</td></tr>' +
      '<tr><td>Sonsuz kuşatma rekoru</td><td>' + d.endlessBest + '. dalga</td><td>İlerleme</td><td>Bölüm ' + d.cleared + ' / ' + Z.MAX_LEVEL + '</td></tr></table></div>';
    c.innerHTML = html;
  }

  // ---------------------------------------------------------------- sekme tiklamalari
  function onTabClick(e) {
    var t = e.target, el, d = S.data;
    if ((el = t.closest('[data-level]'))) { A.click(); return levelModal(+el.getAttribute('data-level')); }
    if ((el = t.closest('[data-act-hub]'))) {
      A.click(); var k = el.getAttribute('data-act-hub');
      if (k === 'endless') return UI.endlessModal();
      UI.tab = 'army'; return UI.renderHub();
    }
    if ((el = t.closest('[data-upg]'))) {
      var id = el.getAttribute('data-upg'), cost = Z.unitUpgradeCost(d.unitLvl[id]);
      if (d.coins < cost || d.unitLvl[id] >= Z.MAX_UNIT_LVL) return A.deny();
      d.coins -= cost; d.unitLvl[id]++; S.save(); A.chest(); UI.renderHub(); return;
    }
    if ((el = t.closest('[data-deck]'))) {
      var u = el.getAttribute('data-deck'), i = d.deck.indexOf(u);
      if (i >= 0) { if (d.deck.length <= 1) return UI.toast('En az 1 birlik gerekli'); d.deck.splice(i, 1); }
      else { if (d.deck.length >= 5) return UI.toast('Kadro en fazla 5 birlik'); d.deck.push(u); }
      S.save(); A.click(); return UI.renderHub();
    }
    if ((el = t.closest('[data-hsel]'))) { d.hero = el.getAttribute('data-hsel'); S.save(); A.click(); return UI.renderHub(); }
    if ((el = t.closest('[data-hup]'))) {
      var hid = el.getAttribute('data-hup'), hc = Z.heroUpgradeCost(d.heroLvl[hid]);
      if (d.coins < hc) return A.deny();
      d.coins -= hc; d.heroLvl[hid]++; S.save(); A.chest(); return UI.renderHub();
    }
    if ((el = t.closest('[data-hbuy]'))) {
      var bid = el.getAttribute('data-hbuy'), h = Z.HEROES[bid];
      if (d.gems < h.gems) return A.deny();
      d.gems -= h.gems; d.heroOwned[bid] = true; d.hero = bid; S.save(); A.win(); UI.toast(h.name + ' ordunda!'); return UI.renderHub();
    }
    if ((el = t.closest('[data-castle]'))) {
      var cc = Z.castleUpgradeCost(d.castleLvl);
      if (d.coins < cc) return A.deny();
      d.coins -= cc; d.castleLvl++; S.save(); A.chest(); return UI.renderHub();
    }
    if ((el = t.closest('[data-collect]'))) {
      var n = S.collectTreasury(); if (n <= 0) return A.deny();
      A.coin(); A.chest(); UI.toast('+' + n + ' altın toplandı!'); return UI.renderHub();
    }
    if ((el = t.closest('[data-tup]'))) {
      var tc = Z.treasuryUpgradeCost(d.treasuryLvl);
      if (d.coins < tc) return A.deny();
      S.collectTreasury(); d.coins -= tc; d.treasuryLvl++; S.save(); A.chest(); return UI.renderHub();
    }
    if ((el = t.closest('[data-daily]'))) {
      var r = S.claimDaily(); if (!r) return A.deny();
      A.win(); UI.toast('Günlük ödül: ' + (r.coins ? '🪙' + r.coins + ' ' : '') + (r.gems ? '💎' + r.gems : '')); return UI.renderHub();
    }
    if ((el = t.closest('[data-quest]'))) {
      var def = S.claimQuest(+el.getAttribute('data-quest')); if (!def) return A.deny();
      A.chest(); UI.toast('Görev ödülü: 🪙' + def.coins + ' 💎' + def.gems); return UI.renderHub();
    }
  }

  UI.endlessModal = function () {
    var d = S.data;
    UI.modal('<h1>♾️ Sonsuz Kuşatma</h1><p>Düşman dalgalar hâlinde gelir ve her dalga güçlenir. Kaleni koru, ne kadar dayanabilirsin?</p>' +
      '<p>En iyi: <b style="color:var(--gold)">' + d.endlessBest + '. dalga</b></p><p class="small">Her 5 dalgada 💎 kazanırsın. Düşman kalesi yıkılamaz.</p>' +
      '<div class="actions"><button class="btn" data-act="close">Geri</button><button class="btn gold" data-act="go">⚔ BAŞLA</button></div>',
      { close: UI.closeModal, go: function () { UI.closeModal(); UI.game.startBattle('endless', 1); } });
  };

  UI.isBrowser = function () {
    var native = globalThis.Capacitor && globalThis.Capacitor.isNativePlatform && globalThis.Capacitor.isNativePlatform();
    var standalone = globalThis.matchMedia && (globalThis.matchMedia('(display-mode: standalone)').matches || globalThis.matchMedia('(display-mode: fullscreen)').matches);
    return !native && !standalone;
  };

  // ---------------------------------------------------------------- Ayarlar
  UI.settingsModal = function () {
    var st = S.data.settings;
    function row(k, label) { return '<div class="toggle" data-act="t_' + k + '"><span>' + label + '</span><span class="sw' + (st[k] ? ' on' : '') + '"></span></div>'; }
    var acts = { close: UI.closeModal };
    ['sound', 'music', 'vibrate'].forEach(function (k) {
      acts['t_' + k] = function () {
        st[k] = !st[k]; S.save(); A.enabled = st.sound; A.musicOn = st.music; if (!st.sound || !st.music) A.musicStop();
        UI.settingsModal();
      };
    });
    acts.reset = function () {
      UI.modal('<h1>Emin misin?</h1><p>Tüm ilerlemen silinecek. Bu işlem geri alınamaz.</p><div class="actions"><button class="btn" data-act="close">Vazgeç</button><button class="btn red" data-act="yes">Evet, sıfırla</button></div>',
        { close: UI.closeModal, yes: function () { S.reset(); UI.closeModal(); UI.showHub('map'); } });
    };
    UI.modal('<h1>Ayarlar</h1>' + row('sound', '🔊 Ses efektleri') + row('music', '🥁 Savaş müziği') + row('vibrate', '📳 Titreşim') +
      '<div class="actions"><button class="btn small red" data-act="reset">Kaydı sıfırla</button><button class="btn gold" data-act="close">Tamam</button></div>' +
      (UI.isBrowser() ? '<p class="small" style="margin-top:14px">💡 Tarayıcı menüsünden <b>Ana ekrana ekle</b> / <b>Uygulamayı yükle</b> seçersen tam ekran, uygulama gibi açılır.</p>' : '') +
      '<p class="small" style="margin-top:20px">Zafarion v' + Z.VERSION + ' (derleme ' + Z.BUILD + ')<br>Tüm grafik ve sesler kodla üretilmiştir.</p>', acts);
  };

  // ---------------------------------------------------------------- Acilis akisi
  UI.welcome = function () {
    var d = S.data;
    if (!d.tutorialDone) {
      UI.modal('<h1>Hoş geldin, Komutan!</h1>' +
        '<p>🏰 Kaleni koru, düşman kalesini yık.</p>' +
        '<p>🃏 Alttaki bir <b>kartı koridora sürükle</b> (ya da dokun) — birlik çağrılır.</p>' +
        '<p>⛏ <b>Madeni yükselt</b>, daha çok altın kazan. 🔱→🐎→🏹→🔱 : her birlik birine üstündür!</p>' +
        '<div class="actions"><button class="btn gold" data-act="go">⚔ İlk Savaşa Başla</button></div>',
        { go: function () { d.tutorialDone = true; S.save(); UI.closeModal(); UI.game.startBattle('campaign', 1); } });
      return;
    }
    if (!d.daily.claimedToday) {
      var r = Z.DAILY_REWARDS[S.dailyIndex()];
      UI.modal('<h1>🎁 Günlük Ödül</h1><p>Seri: <b>' + (d.daily.streak + 1) + '. gün</b></p><div class="rewards">' +
        (r.coins ? '<span class="coin">🪙 ' + r.coins + '</span>' : '') + (r.gems ? '<span class="gem">💎 ' + r.gems + '</span>' : '') + '</div>' +
        '<p class="small">Her gün gir, seri bozulmasın — 7. gün büyük ödül!</p><div class="actions"><button class="btn gold" data-act="claim">Ödülü Al</button></div>',
        { claim: function () { S.claimDaily(); A.win(); UI.closeModal(); UI.renderHub(); var p = S.treasuryPending(); if (p >= 100) UI.toast('Hazinende ' + p + ' altın birikti!'); } });
      return;
    }
    var p = S.treasuryPending();
    if (p >= 100) UI.toast('Hazinende ' + p + ' altın birikti!');
  };

  // ---------------------------------------------------------------- Sonuc ekrani
  UI.resultModal = function (b, out) {
    var r = b.result, isE = b.mode === 'endless', html, acts = {}, nextOk = !isE && r.win && b.level < Z.MAX_LEVEL;
    function again() { UI.closeModal(); UI.game.startBattle(b.mode, b.level); }
    acts.again = again;
    acts.menu = function () { UI.closeModal(); UI.game.toMenu(); };
    acts.next = function () { UI.closeModal(); UI.game.startBattle('campaign', b.level + 1); };
    acts.army = function () { UI.closeModal(); UI.game.toMenu('army'); };
    if (isE) {
      html = '<h1>' + r.wave + '. Dalgaya Ulaştın!</h1>' + (out.newBest ? '<p style="color:var(--gold);font-weight:800">🏆 YENİ REKOR!</p>' : '<p class="mut">Rekor: ' + S.data.endlessBest + '. dalga</p>') +
        '<p class="mut">Süre ' + Z.fmtTime(r.time) + ' · ' + r.kills + ' düşman</p><div class="rewards"><span class="coin">🪙 ' + out.coins + '</span>' + (out.gems ? '<span class="gem">💎 ' + out.gems + '</span>' : '') + '</div>';
    } else if (r.win) {
      var base = out.coins - (out.chest ? out.chest.coins : 0), bg = out.gems - (out.chest ? out.chest.gems : 0);
      html = '<h1>ZAFER!</h1><div class="big-stars">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= r.stars ? 'on' : '') + '" style="animation-delay:' + (0.25 + i * 0.35) + 's">★</span>'; }).join('') + '</div>' +
        '<p class="mut">Süre ' + Z.fmtTime(r.time) + ' · Kale canı %' + Math.round(r.basePct * 100) + ' · ' + r.kills + ' düşman</p>' +
        '<div class="rewards"><span class="coin">🪙 ' + base + '</span>' + (bg > 0 ? '<span class="gem">💎 ' + bg + '</span>' : '') + '</div>' +
        '<div id="chest-area"><button class="chest" data-act="chest" style="font-size:110px">🎁</button><p class="small">Sandığı aç!</p></div>';
      if (out.newUnits.length) html += '<p style="color:var(--green);font-weight:800;font-size:30px">🎉 Yeni birlik: ' + out.newUnits.map(function (u) { return Z.UNITS[u].icon + ' ' + Z.UNITS[u].name; }).join(', ') + '</p>';
      acts.chest = function () {
        var a = $('chest-area'); if (!a || !out.chest) return;
        a.innerHTML = '<div class="chest">🎁</div>'; A.chest();
        setTimeout(function () {
          if (!$('chest-area')) return;
          A.win();
          $('chest-area').innerHTML = '<p class="small">Sandık ödülü</p><div class="rewards"><span class="coin">🪙 ' + out.chest.coins + '</span>' + (out.chest.gems ? '<span class="gem">💎 ' + out.chest.gems + '</span>' : '') + '</div>';
        }, 750);
      };
    } else {
      html = '<h1 style="color:var(--red)">Yenilgi</h1><p>Kalen düştü. Ordunu güçlendirip tekrar dene!</p>' +
        '<div class="rewards"><span class="coin">🪙 ' + out.coins + '</span></div><p class="small">İpucu: Düşman birliklerine karşı üstün olanı çağır (🔱 > 🐎 > 🏹 > 🔱).</p>';
    }
    html += '<div class="actions">' + (r.win || isE ? '' : '<button class="btn small" data-act="army">🛡️ Ordu</button>') +
      '<button class="btn small" data-act="menu">Menü</button><button class="btn small" data-act="again">Tekrar</button>' +
      (nextOk ? '<button class="btn gold" data-act="next">Sonraki ▶</button>' : '') + '</div>';
    UI.modal(html, acts);
  };

  // ---------------------------------------------------------------- Savas HUD
  var hud = { battle: null, cards: {}, last: {}, drag: null, ghost: null };
  UI.hud = hud;

  UI.hudBuild = function (b) {
    hud.battle = b; hud.last = {}; hud.cards = {};
    $('hud').classList.remove('hidden'); $('game').classList.remove('hidden');
    var wrap = $('cards'); wrap.innerHTML = '';
    b.deck.forEach(function (id) {
      var u = Z.UNITS[id], el = document.createElement('button');
      el.className = 'card'; el.setAttribute('data-unit', id);
      el.innerHTML = '<div class="cd"></div><div class="c-ico">' + u.icon + '</div><div class="c-name">' + u.name + '</div><div class="c-cost">🪙 ' + u.cost + '</div>';
      wrap.appendChild(el); hud.cards[id] = { el: el, cd: el.firstChild };
    });
    var hero = Z.HEROES[b.heroId];
    $('skill-ico').textContent = hero.icon; $('skill-name').textContent = hero.skill;
    var tut = !S.data.tutorialDone2 && b.mode === 'campaign' && b.level <= 2;
    hud.tut = tut;
    $('hint').classList.toggle('hidden', !tut);
    $('hint').textContent = '👆 Bir kartı koridora sürükle!';
    $('info-title').textContent = b.mode === 'endless' ? 'Sonsuz Kuşatma' : 'Bölüm ' + b.level + ' · ' + b.info.name;
    $('btn-speed').textContent = 'x' + (UI.game.speed || 1);
  };

  UI.hudUpdate = function (b) {
    var L = hud.last, i, set = function (k, v, fn) { if (L[k] !== v) { L[k] = v; fn(v); } };
    var g = Math.floor(b.gold);
    set('g', g, function (v) { $('gold-val').textContent = v; });
    set('cap', b.goldCap(), function (v) { $('gold-cap').textContent = '/' + v; });
    set('rate', b.income(), function (v) { $('gold-rate').textContent = '+' + (Math.round(v * 10) / 10) + '/sn'; });
    b.deck.forEach(function (id) {
      var cd = b.cooldown[id], def = Z.UNITS[id], c = hud.cards[id];
      var f = Math.round(100 * cd / def.cd) / 100;
      set('cd' + id, f, function (v) { c.cd.style.transform = 'scaleY(' + v + ')'; });
      set('p' + id, b.gold < def.cost, function (v) { c.el.classList.toggle('poor', v); });
    });
    var h = Z.HEROES[b.heroId];
    set('hcd', Math.round(100 * b.heroCd / h.cd) / 100, function (v) { document.querySelector('#btn-skill .cd').style.transform = 'scaleY(' + v + ')'; });
    set('hst', b.heroCd <= 0 ? 'HAZIR!' : Math.ceil(b.heroCd) + ' sn', function (v) {
      $('skill-state').textContent = v; $('btn-skill').classList.toggle('ready', b.heroCd <= 0);
    });
    var mc = b.mineCost();
    set('mine', b.mine + ':' + (mc !== null && b.gold >= mc), function () {
      $('mine-txt').innerHTML = mc === null ? 'Maden MAKS' : 'Maden Sv.' + (b.mine + 1) + '<br><span style="color:var(--gold)">🪙 ' + mc + '</span>';
      $('btn-mine').classList.toggle('off', mc === null || b.gold < mc);
    });
    if (b.mode === 'endless') set('title', 'w' + b.wave(), function () { $('info-title').textContent = 'Dalga ' + b.wave() + ' · ' + Z.fmtTime(b.t); });
    else set('title', Math.floor(b.t), function () { $('info-title').textContent = 'Bölüm ' + b.level + ' · ' + b.info.name + ' · ' + Z.fmtTime(b.t); });
    set('combo', b.combo >= 3 ? b.combo : 0, function (v) {
      var cEl = $('combo-chip'); cEl.classList.toggle('hidden', !v); if (v) cEl.textContent = '🔥 Seri x' + v;
    });
    if (hud.tut) {
      if (b.stats.spawns >= 3 && b.stats.mines === 0 && b.t < 60) { $('hint').textContent = '⛏ Madeni yükselt: daha çok altın!'; }
      if (b.stats.spawns >= 3 && b.stats.mines > 0) { hud.tut = false; $('hint').classList.add('hidden'); }
      if (b.t > 70) { hud.tut = false; $('hint').classList.add('hidden'); }
    }
  };

  function stagePoint(e) { var s = UI.game.stage; return { x: e.clientX / s.scale, y: e.clientY / s.scale }; }

  function bindHud() {
    var Rn = Z.Render, canvas = $('game');
    canvas.addEventListener('pointerdown', function (e) {
      if (!hud.battle || UI.game.paused) return;
      var p = stagePoint(e), lane = Rn.laneAt(p.x, p.y);
      if (lane >= 0) { Rn.selLane = lane; A.init(); }
    });
    function startDrag(el, action, e) {
      e.preventDefault(); A.init();
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* eski WebView */ }
      hud.drag = { el: el, action: action, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    }
    $('cards').addEventListener('pointerdown', function (e) {
      var el = e.target.closest('[data-unit]'); if (el && hud.battle && !UI.game.paused) startDrag(el, { kind: 'unit', type: el.getAttribute('data-unit') }, e);
    });
    $('btn-skill').addEventListener('pointerdown', function (e) {
      if (hud.battle && !UI.game.paused) startDrag($('btn-skill'), { kind: 'skill' }, e);
    });
    function move(e) {
      var d = hud.drag; if (!d || e.pointerId !== d.id) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14 * UI.game.stage.scale) {
        d.moved = true;
        var g = document.createElement('div'); g.className = 'drag-ghost';
        g.textContent = d.action.kind === 'unit' ? Z.UNITS[d.action.type].icon : Z.HEROES[hud.battle.heroId].icon;
        $('stage').appendChild(g); hud.ghost = g;
      }
      if (d.moved) {
        var p = stagePoint(e); hud.ghost.style.left = p.x + 'px'; hud.ghost.style.top = p.y + 'px';
        Rn.dragLane = Rn.laneAt(p.x, p.y);
      }
    }
    function up(e) {
      var d = hud.drag; if (!d || e.pointerId !== d.id) return;
      hud.drag = null;
      if (hud.ghost) { hud.ghost.remove(); hud.ghost = null; }
      var lane = Rn.dragLane; Rn.dragLane = -1;
      if (!hud.battle || UI.game.paused) return;
      if (!d.moved) lane = Rn.selLane;
      else if (lane < 0) return; // sahaya birakilmadi: iptal
      Rn.selLane = lane >= 0 ? lane : Rn.selLane;
      if (d.action.kind === 'unit') UI.tryDeploy(d.action.type, lane, d.el);
      else UI.trySkill(lane, d.el);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', function (e) { var d = hud.drag; if (d && e.pointerId === d.id) { hud.drag = null; Rn.dragLane = -1; if (hud.ghost) { hud.ghost.remove(); hud.ghost = null; } } });

    $('btn-mine').addEventListener('click', function () {
      if (!hud.battle || UI.game.paused) return;
      if (!hud.battle.upgradeMine()) { A.deny(); } else { A.coin(); }
    });
    $('btn-pause').addEventListener('click', function () { A.click(); UI.game.pause(); });
    $('btn-speed').addEventListener('click', function () {
      var g = UI.game; g.speed = g.speed === 1 ? 2 : 1; $('btn-speed').textContent = 'x' + g.speed; A.click();
    });
  }

  UI.tryDeploy = function (type, lane, el) {
    var b = hud.battle;
    if (b.deploy(type, lane)) { if (hud.tut) { $('hint').classList.add('hidden'); } return true; }
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

  UI.pauseModal = function (acts) {
    UI.modal('<h1>Duraklatıldı</h1><div class="actions" style="flex-direction:column;align-items:center">' +
      '<button class="btn gold" data-act="resume" style="width:420px">▶ Devam</button>' +
      '<button class="btn" data-act="restart" style="width:420px">↻ Yeniden Başla</button>' +
      '<button class="btn red" data-act="quit" style="width:420px">✕ Savaştan Çık</button></div>', acts);
  };
})(globalThis.Z = globalThis.Z || {});
