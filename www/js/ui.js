// Seferhan - arayuz: ana menu sekmeleri, modallar, savas HUD'u
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
    out.vault = !d.daily.claimedToday || S.treasuryPending() >= 150 || S.wheelFree();
    out.map = S.anyStarClaimable() || (S.dailyAvailable() && !d.dailySefer.won);
    if (S.anyAchClaimable()) out.quests = true;
    d.quests.list.forEach(function (q) { if (!q.claimed && q.prog >= S.questDef(q.id).target) out.quests = true; });
    d.deck.forEach(function (u) { if (d.coins >= Z.unitUpgradeCost(d.unitLvl[u]) && d.unitLvl[u] < Z.MAX_UNIT_LVL) out.army = true; });
    return out;
  }

  // ---------------------------------------------------------------- SEFER
  function renderMap(c) {
    var d = S.data, N = Z.MAX_LEVEL, stepY = 176, topPad = 120, h = topPad + (N - 1) * stepY + 150, i, html = '', pts = [];
    for (i = 1; i <= N; i++) pts.push([360 + Math.sin(i * 0.85) * 205, topPad + (i - 1) * stepY]);
    var path = pts.map(function (p, k) { return (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1]; }).join(' ');
    html += '<div class="row" style="margin-bottom:8px"><h2 style="margin:0">Sefer Haritası</h2><div class="spacer"></div><span class="chip">⭐ ' + d.stats.totalStars + ' / ' + (N * 3) + '</span></div>';
    html += '<div class="starrow">';
    Z.STAR_MILESTONES.forEach(function (m) {
      var can = S.starClaimable(m), got = d.starClaimed[m.n];
      html += '<div class="smile' + (can ? ' can' : '') + (got ? ' got' : '') + '">⭐ ' + m.n + '<span>🪙' + m.coins + ' 💎' + m.gems + '</span>' +
        (got ? '<span>✔</span>' : can ? '<button class="btn gold" data-star="' + m.n + '">Al</button>' : '<span class="mut">🔒</span>') + '</div>';
    });
    html += '</div>' + dailyCard(d) + '<div class="mode-row">' +
      '<button class="panel mode-card" data-act-hub="endless"><span class="big">♾️</span><div><h3>Sonsuz Kuşatma</h3><small>Rekor: <b style="color:var(--gold)">' + d.endlessBest + '. dalga</b></small></div></button>' +
      '<button class="panel mode-card" data-act-hub="deck"><span class="big">🎖️</span><div><h3>Savaş Ordusu</h3><small>' + d.deck.map(function (u) { return Z.UNITS[u].icon; }).join(' ') + ' ' + Z.HEROES[d.hero].icon + '</small></div></button></div>';
    html += '<div class="maptrack" id="maptrack" style="height:' + h + 'px"><svg viewBox="0 0 720 ' + h + '" preserveAspectRatio="none" height="' + h + '"><path d="' + path + '" fill="none" stroke="#2f3b78" stroke-width="14" stroke-linecap="round" stroke-dasharray="2 22"/></svg>';
    for (i = 1; i <= N; i++) {
      var st = d.stars[i] || 0, boss = Z.isBoss(i), info = Z.levelInfo(i), cls = 'node r' + Z.realmOf(i) + (boss ? ' boss' : '') + (info.type === 'field' ? ' fld' : '');
      if (st > 0) cls += ' done'; else if (i === d.cleared + 1) cls += ' cur'; else if (i > d.cleared + 1) cls += ' locked';
      if ((i - 1) % 15 === 0) html += '<div class="realm" style="top:' + (pts[i - 1][1] - 96) + 'px">Diyar ' + (Z.realmOf(i) + 1) + ' · ' + Z.REALMS[Z.realmOf(i)] + '</div>';
      html += '<button class="' + cls + '" data-level="' + i + '" style="left:' + (pts[i - 1][0] / 7.2).toFixed(2) + '%;top:' + pts[i - 1][1] + 'px">' +
        (info.rule !== 'none' ? '<span class="rl">' + Z.RULES[info.rule].icon + '</span>' : '') +
        (info.type === 'field' ? '<span class="ft">🏕️</span>' : '') + (boss ? '<span style="font-size:28px;line-height:1">👑</span>' : '') + i +
        '<span class="st">' + (st ? '★'.repeat(st) : (i > d.cleared + 1 ? '🔒' : '')) + (d.hardCleared[i] ? Z.DIFFS[d.hardCleared[i]].icon : '') + '</span>' +
        '<span class="nm">' + info.name + '</span></button>';
    }
    html += '</div>';
    c.innerHTML = html;
    var cur = c.querySelector('.node.cur') || c.querySelector('.node.done:last-of-type');
    if (cur) {
      var r = cur.getBoundingClientRect(), cr = c.getBoundingClientRect(), sc = UI.game.stage.scale || 1;
      c.scrollTop += ((r.top - cr.top) - cr.height / 2 + r.height / 2) / sc;
    }
  }

  function dailyCard(d) {
    if (!S.dailyAvailable()) return '<div class="panel daily-card off"><span class="big">📅</span><div><h3>Günlük Sefer</h3><small>' + Z.DAILY_UNLOCK + '. bölümü kazanınca açılır</small></div></div>';
    var di = S.dailyInfo(), won = d.dailySefer.won;
    return '<button class="panel daily-card' + (won ? ' done' : '') + '" data-act-hub="daily"><span class="big">📅</span><div class="grow"><h3>Günlük Sefer ' + (won ? '<span class="chip">✔ Tamam</span>' : '<span class="chip gold">🎁 Ödül hazır</span>') + '</h3>' +
      '<small>' + Z.REALMS[di.theme] + ' · ' + di.rules.map(function (r) { return Z.RULES[r].icon + ' ' + Z.RULES[r].name; }).join(' + ') + '</small></div></button>';
  }

  // Hedef satiri: kale kusatmasi mi, acik alan mi
  function goalHtml(n, rules) {
    var info = Z.levelInfo(n);
    if (info.type === 'field') {
      var ob = Z.FIELD_OBJECTIVES[Z.fieldObjective(n, rules)];
      return '<div class="rule-box field-box"><b>🏕️ Açık Alan Savaşı · ' + ob.icon + ' ' + ob.name + '</b><br><span class="small">' + ob.desc + ' Önce <b>' + Z.fieldBudget(n) + ' komuta puanı</b> ile ordunu sahaya yerleştirirsin, sonra savaş başlar.</span></div>';
    }
    return '<p style="margin:6px 0">🎯 Hedef: ' + (rules.indexOf('survive') >= 0 ? '<b>' + Z.fmtTime(info.surviveTime) + '</b> boyunca kaleni savun' : 'düşman kalesini yık') + '</p>';
  }

  function levelModal(n, diff) {
    diff = diff || 0;
    var d = S.data, info = Z.levelInfo(n), st = d.stars[n] || 0, avg = avgDeckLevel(), rec = Math.round(recommendedLevel(n) * (diff === 0 ? 1 : diff === 1 ? 1.3 : 1.7)), rl = Z.RULES[info.rule], D = Z.DIFFS[diff];
    var ok = avg >= rec - 0.51, surv = info.rule === 'survive', drow = '';
    if (d.cleared >= 3) {
      drow = '<div class="diffrow">' + Z.DIFFS.map(function (x, i) {
        var un = Z.diffUnlocked(d, n, i);
        return '<button class="diff' + (i === diff ? ' on' : '') + (un ? '' : ' lock') + '" data-act="diff' + i + '"><span class="di">' + (un ? x.icon : '🔒') + '</span>' + x.name + '</button>';
      }).join('') + '</div>';
      drow += diff > 0 ? '<p class="small" style="margin:2px 0 8px">Düşman %' + Math.round(D.hp * 100) + ' can · ödül ×' + D.coin + ' · bu kademede ilk galibiyette +💎' + D.gem + '</p>'
        : !Z.diffUnlocked(d, n, 1) ? '<p class="small" style="margin:2px 0 8px">🔒 Zor kademe: bu seferi bir kez kazanınca açılır.</p>'
        : !Z.diffUnlocked(d, n, 2) ? '<p class="small" style="margin:2px 0 8px">🔒 Efsane: bu seferi Zor kademede kazanınca açılır.</p>' : '';
    }
    UI.modal(
      '<h1>Sefer ' + n + (info.boss ? ' <span class="badge">PATRON</span>' : '') + (info.type === 'field' ? ' <span class="badge fld">AÇIK ALAN</span>' : '') + '</h1>' +
      '<p class="mut" style="margin:0">' + Z.REALMS[info.realm] + ' · ' + info.name + (d.hardCleared[n] ? ' · ' + Z.DIFFS[d.hardCleared[n]].icon : '') + '</p>' +
      '<p class="story">“' + info.story + '”</p>' + drow +
      (info.rule !== 'none' ? '<div class="rule-box"><b>' + rl.icon + ' Sefer kuralı: ' + rl.name + '</b><br><span class="small">' + rl.desc + '</span></div>' : '') +
      goalHtml(n, [info.rule]) +
      '<div class="big-stars" style="font-size:54px;margin:0">' + star3(st) + '</div>' +
      '<div class="row-lines"><span>Düşman: ' + info.tiers.map(function (u) { return Z.UNITS[u].icon; }).join(' ') + '</span>' +
      '<span>Ödül: 🪙 ' + info.rewardCoins * D.coin + '+ · 💎 ' + info.rewardGems + '</span></div>' +
      '<p style="margin:10px 0 2px;font-size:22px">Önerilen birlik seviyesi: <b>' + rec + '</b> · Senin ortalaman: <b style="color:' + (ok ? 'var(--green)' : 'var(--red)') + '">' + avg.toFixed(1) + '</b></p>' +
      (ok ? '' : '<p class="small" style="color:#ffb4b4;margin:0">Ordu sekmesinden birliklerini yükseltmek işini kolaylaştırır.</p>') +
      '<p style="margin:6px 0">' + d.deck.map(function (u) { return '<span style="font-size:38px">' + Z.UNITS[u].icon + '</span>'; }).join(' ') + '</p>' +
      '<div class="actions"><button class="btn small" data-act="close">Geri</button><button class="btn small" data-act="army">🛡️ Ordu</button><button class="btn gold" data-act="fight">⚔ SEFERE ÇIK</button></div>',
      {
        close: UI.closeModal,
        army: function () { UI.closeModal(); UI.tab = 'army'; UI.renderHub(); },
        diff0: function () { levelModal(n, 0); },
        diff1: function () { if (Z.diffUnlocked(d, n, 1)) levelModal(n, 1); else { A.deny(); UI.toast('Önce bu seferi Normal kademede kazan'); } },
        diff2: function () { if (Z.diffUnlocked(d, n, 2)) levelModal(n, 2); else { A.deny(); UI.toast('Önce bu seferi Zor kademede kazan'); } },
        fight: function () { UI.closeModal(); UI.game.startBattle('campaign', n, { diff: diff }); }
      });
  }

  UI.dailyModal = function () {
    var d = S.data, di = S.dailyInfo(), won = d.dailySefer.won, info = Z.levelInfo(di.level);
    var rb = di.rules.map(function (r) { var R = Z.RULES[r]; return '<div class="rule-box"><b>' + R.icon + ' ' + R.name + '</b><br><span class="small">' + R.desc + '</span></div>'; }).join('');
    UI.modal('<h1>📅 Günlük Sefer</h1><p class="mut" style="margin:0">' + Z.REALMS[di.theme] + ' · Sefer ' + di.level + ' seviyesinde</p>' + rb +
      goalHtml(di.level, di.rules) +
      '<div class="rewards"><span class="coin">🪙 ' + di.rewardCoins + '</span><span class="gem">💎 ' + di.rewardGems + '</span></div>' +
      '<p class="small">' + (won ? '✔ Bugünkü ödülü aldın. İstersen ödülsüz tekrar oynayabilirsin.' : 'Ödül günde bir kez, ilk galibiyette verilir. Her gün yeni bir sefer!') + '</p>' +
      '<div class="actions"><button class="btn small" data-act="close">Geri</button><button class="btn gold" data-act="go">⚔ SEFERE ÇIK</button></div>',
      { close: UI.closeModal, go: function () { UI.closeModal(); UI.game.startBattle('daily', di.level, { daily: di }); } });
  };

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
        (owned ? (lvl >= Z.MAX_HERO_LVL ? '<button class="btn small off">MAKS</button>' : '<button class="btn small ' + (d.coins >= cost ? 'gold' : 'off') + '" data-hup="' + id + '">⬆ 🪙 ' + Z.fmt(cost) + '</button>') +
          '<button class="btn small ' + (sel ? 'green' : '') + '" data-hsel="' + id + '">' + (sel ? '✔ Seçili' : 'Seç') + '</button>'
          : '<button class="btn small ' + (d.gems >= h.gems ? 'gold' : 'off') + '" data-hbuy="' + id + '">💎 ' + h.gems + ' ile aç</button>') +
        '</div></div></div>';
    });
    var cc = Z.castleUpgradeCost(d.castleLvl);
    html += '</div><div class="sect">Kale</div><div class="panel ucard"><div class="big">🏰</div><div class="info"><h3>Kale Surları <span class="lvl">Sv.' + d.castleLvl + '</span></h3>' +
      '<small>Kale canı: ❤ ' + Z.castleHp(d.castleLvl) + ' → ' + Z.castleHp(d.castleLvl + 1) + '</small></div>' +
      (d.castleLvl >= Z.MAX_CASTLE_LVL ? '<button class="btn off">MAKS</button>' : '<button class="btn ' + (d.coins >= cc ? 'gold' : 'off') + '" data-castle="1">⬆ 🪙 ' + Z.fmt(cc) + '</button>') + '</div>';
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
      (d.treasuryLvl >= Z.MAX_TREASURY_LVL ? '<button class="btn small off">MAKS</button>' : '<button class="btn small ' + (d.coins >= uc ? '' : 'off') + '" data-tup="1">⬆ Sv.' + d.treasuryLvl + ' · 🪙 ' + Z.fmt(uc) + '</button>') + '</div></div></div>';
    var free = S.wheelFree(), WCOL = ['#7c3aed', '#2563eb', '#0d9488', '#d97706', '#be185d', '#4f46e5', '#15803d', '#b91c1c'], grad = [], wl = '';
    Z.WHEEL.forEach(function (sg, i) {
      grad.push(WCOL[i % WCOL.length] + ' ' + (i * 45) + 'deg ' + ((i + 1) * 45) + 'deg');
      wl += '<span style="transform:rotate(' + (i * 45 + 22.5) + 'deg) translateY(-104px)">' + (sg.gems ? '💎' + sg.gems : '🪙' + sg.coins) + '</span>';
    });
    html += '<div class="sect">Şans Çarkı</div><div class="panel"><div class="wheel-box"><div class="wheel-wrap"><div class="wheel-ptr">▼</div>' +
      '<div class="wheel" id="wheel" style="background:conic-gradient(' + grad.join(',') + ')">' + wl + '</div><div class="wheel-hub"></div></div>' +
      '<div style="flex:1"><h3>' + (free ? 'Bugünkü bedava hakkın hazır!' : 'Bedava hakkını kullandın') + '</h3><p class="small" style="margin:6px 0 16px">Her gün 1 bedava çevirme. Sonrası ' + Z.WHEEL_COST + ' 💎. En büyük ödül: 💎 40!</p>' +
      '<button class="btn gold" data-spin="1" id="spin-btn">' + (free ? '🎡 Bedava Çevir' : '🎡 Çevir · ' + Z.WHEEL_COST + ' 💎') + '</button></div></div></div>';
    html += '<div class="sect">Pazar</div>';
    Z.MARKET.forEach(function (m) {
      html += '<div class="panel mrow"><span class="big">' + m.icon + '</span><div class="grow"><h3>' + m.name + '</h3><small>' + m.desc(d) + '</small></div><button class="btn small ' + (d.gems >= m.gems ? 'gold' : 'off') + '" data-buy="' + m.id + '">💎 ' + m.gems + '</button></div>';
    });
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
    var achs = Z.ACHIEVEMENTS.slice().sort(function (a, b) {
      var ca = d.achClaimed[a.id] ? 2 : S.achClaimable(a) ? 0 : 1, cb = d.achClaimed[b.id] ? 2 : S.achClaimable(b) ? 0 : 1;
      return ca - cb || (S.achProgress(b) / b.target) - (S.achProgress(a) / a.target);
    });
    html += '<div class="sect">Başarımlar</div>';
    achs.forEach(function (a) {
      var got = d.achClaimed[a.id], can = S.achClaimable(a), pr = S.achProgress(a);
      html += '<div class="panel ach' + (got ? ' claimed' : '') + '"><div class="grow"><h3>' + a.text + '</h3><div class="bar' + (can || got ? ' green' : '') + '"><i style="width:' + (100 * pr / a.target) + '%"></i></div><small>' + Z.fmt(pr) + ' / ' + Z.fmt(a.target) + '  ·  Ödül: 💎 ' + a.gems + '</small></div>' +
        '<button class="btn ' + (got ? 'off' : can ? 'gold' : 'off') + '" data-ach="' + a.id + '">' + (got ? '✔' : can ? 'Al' : '…') + '</button></div>';
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
    if ((el = t.closest('[data-buy]'))) {
      var res = S.buyMarket(el.getAttribute('data-buy'));
      if (!res) { A.deny(); return UI.toast('Yeterli elmas yok'); }
      if (res.full) { A.deny(); return UI.toast('Hazine zaten dolu'); }
      if (res.unused) { A.deny(); return UI.toast('Önce bedava çarkı çevir'); }
      A.chest(); A.coin(); UI.toast(res.name + ' alındı!'); return UI.renderHub();
    }
    if ((el = t.closest('[data-star]'))) {
      var sm = S.claimStar(+el.getAttribute('data-star')); if (!sm) return A.deny();
      A.chest(); UI.toast('Yıldız ödülü: 🪙' + sm.coins + ' 💎' + sm.gems); return UI.renderHub();
    }
    if ((el = t.closest('[data-ach]'))) {
      var ac = S.claimAch(el.getAttribute('data-ach')); if (!ac) return A.deny();
      A.win(); UI.toast('Başarım ödülü: 💎' + ac.gems); return UI.renderHub();
    }
    if ((el = t.closest('[data-spin]'))) {
      if (UI.spinning) return;
      var res = S.spin(); if (!res) { A.deny(); return UI.toast('Yeterli elmas yok'); }
      UI.spinning = true; A.chest();
      var wheel = $('wheel'), turn = 360 * 6 + (360 - (res.idx * 45 + 22.5));
      wheel.style.transition = 'transform 3.4s cubic-bezier(.12,.7,.15,1)'; wheel.style.transform = 'rotate(' + turn + 'deg)';
      setTimeout(function () {
        UI.spinning = false; A.win();
        UI.toast('Çarktan: ' + (res.seg.coins ? '🪙' + res.seg.coins : '💎' + res.seg.gems) + '!');
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
      if (i >= 0) { if (d.deck.length <= 1) return UI.toast('En az 1 birlik gerekli'); d.deck.splice(i, 1); }
      else { if (d.deck.length >= 5) return UI.toast('Kadro en fazla 5 birlik'); d.deck.push(u); }
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
      if (d.gems < h.gems) return A.deny();
      d.gems -= h.gems; d.heroOwned[bid] = true; d.hero = bid; S.save(); A.win(); UI.toast(h.name + ' ordunda!'); return UI.renderHub();
    }
    if ((el = t.closest('[data-castle]'))) {
      var cc = Z.castleUpgradeCost(d.castleLvl);
      if (d.coins < cc || d.castleLvl >= Z.MAX_CASTLE_LVL) return A.deny();
      d.coins -= cc; d.castleLvl++; S.save(); A.chest(); return UI.renderHub();
    }
    if ((el = t.closest('[data-collect]'))) {
      var n = S.collectTreasury(); if (n <= 0) return A.deny();
      A.coin(); A.chest(); UI.toast('+' + n + ' altın toplandı!'); return UI.renderHub();
    }
    if ((el = t.closest('[data-tup]'))) {
      var tc = Z.treasuryUpgradeCost(d.treasuryLvl);
      if (d.coins < tc || d.treasuryLvl >= Z.MAX_TREASURY_LVL) return A.deny();
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
    acts.exp = function () {
      var code = S.exportSave();
      UI.modal('<h1>📤 Kayıt Kodu</h1><p>Kodu kopyala; başka cihazda “Kaydı içe aktar”a yapıştır.</p><textarea id="save-code" readonly rows="6">' + code + '</textarea><div class="actions"><button class="btn small" data-act="back">Geri</button><button class="btn gold" data-act="copy">📋 Kopyala</button></div>', {
        back: UI.settingsModal,
        copy: function () {
          var ta = $('save-code'); ta.focus(); ta.select(); var okc = false;
          try { okc = document.execCommand('copy'); } catch (e) { /* eski WebView */ }
          if (okc) UI.toast('Kopyalandı!'); else if (navigator.clipboard) navigator.clipboard.writeText(code).then(function () { UI.toast('Kopyalandı!'); }, function () { UI.toast('Kodu elle seçip kopyala'); });
        }
      });
    };
    acts.imp = function () {
      UI.modal('<h1>📥 Kaydı İçe Aktar</h1><p>Başka cihazdan aldığın kodu yapıştır. <b>Mevcut ilerlemen bu kodla değiştirilir.</b></p><textarea id="save-code" rows="6" placeholder="Kodu buraya yapıştır"></textarea><div class="actions"><button class="btn small" data-act="back">Geri</button><button class="btn gold" data-act="load">Yükle</button></div>', {
        back: UI.settingsModal,
        load: function () {
          if (!S.importSave($('save-code').value)) { A.deny(); return UI.toast('Geçersiz kayıt kodu'); }
          var st2 = S.data.settings; A.enabled = st2.sound; A.musicOn = st2.music; A.win(); UI.closeModal(); UI.showHub('map'); UI.toast('Kayıt yüklendi!');
        }
      });
    };
    acts.reset = function () {
      UI.modal('<h1>Emin misin?</h1><p>Tüm ilerlemen silinecek. Bu işlem geri alınamaz.</p><div class="actions"><button class="btn" data-act="close">Vazgeç</button><button class="btn red" data-act="yes">Evet, sıfırla</button></div>',
        { close: UI.closeModal, yes: function () { S.reset(); UI.closeModal(); UI.showHub('map'); } });
    };
    UI.modal('<h1>Ayarlar</h1>' + row('sound', '🔊 Ses efektleri') + row('music', '🥁 Savaş müziği') + row('vibrate', '📳 Titreşim') +
      '<div class="actions"><button class="btn small" data-act="exp">📤 Kaydı dışa aktar</button><button class="btn small" data-act="imp">📥 İçe aktar</button></div>' +
      '<div class="actions"><button class="btn small red" data-act="reset">Kaydı sıfırla</button><button class="btn gold" data-act="close">Tamam</button></div>' +
      (UI.isBrowser() ? '<p class="small" style="margin-top:14px">💡 Tarayıcı menüsünden <b>Ana ekrana ekle</b> / <b>Uygulamayı yükle</b> seçersen tam ekran, uygulama gibi açılır.</p>' : '') +
      '<p class="small" style="margin-top:20px">Seferhan v' + Z.VERSION + ' (derleme ' + Z.BUILD + ')<br>Tüm grafik ve sesler kodla üretilmiştir.</p>', acts);
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
        { go: function () { d.tutorialDone = true; d.seenVersion = Z.NOTES_ID; S.save(); UI.closeModal(); UI.game.startBattle('campaign', 1); } });
      return;
    }
    if (d.seenVersion !== Z.NOTES_ID) return UI.whatsNew();
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
    var r = b.result, isE = b.mode === 'endless', html, acts = {}, nextOk = b.mode === 'campaign' && r.win && b.level < Z.MAX_LEVEL;
    function again() { UI.closeModal(); UI.game.startBattle(b.mode, b.level, b.startOpts); }
    acts.again = again;
    acts.menu = function () { UI.closeModal(); UI.game.toMenu(); };
    acts.next = function () { UI.closeModal(); UI.game.startBattle('campaign', b.level + 1); };
    acts.army = function () { UI.closeModal(); UI.game.toMenu('army'); };
    if (isE) {
      html = '<h1>' + r.wave + '. Dalgaya Ulaştın!</h1>' + (out.newBest ? '<p style="color:var(--gold);font-weight:800">🏆 YENİ REKOR!</p>' : '<p class="mut">Rekor: ' + S.data.endlessBest + '. dalga</p>') +
        '<p class="mut">Süre ' + Z.fmtTime(r.time) + ' · ' + r.kills + ' düşman</p><div class="rewards"><span class="coin">🪙 ' + out.coins + '</span>' + (out.gems ? '<span class="gem">💎 ' + out.gems + '</span>' : '') + '</div>';
    } else if (r.win) {
      var base = out.coins - (out.chest ? out.chest.coins : 0), bg = out.gems - (out.chest ? out.chest.gems : 0);
      html = '<h1>' + (b.mode === 'daily' ? 'GÜNLÜK SEFER TAMAM!' : 'ZAFER!') + '</h1>' + (b.diff > 0 ? '<p style="margin:0;color:var(--gold);font-weight:800">' + Z.DIFFS[b.diff].icon + ' ' + Z.DIFFS[b.diff].name + ' kademe</p>' : '') + '<div class="big-stars">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= r.stars ? 'on' : '') + '" style="animation-delay:' + (0.25 + i * 0.35) + 's">★</span>'; }).join('') + '</div>' +
        '<p class="mut">Süre ' + Z.fmtTime(r.time) + ' · ' + (b.kind === 'field' ? 'Ordu korundu %' : 'Kale canı %') + Math.round(r.basePct * 100) + ' · ' + r.kills + ' düşman</p>' +
        '<div class="rewards"><span class="coin">🪙 ' + base + '</span>' + (bg > 0 ? '<span class="gem">💎 ' + bg + '</span>' : '') + '</div>' +
        (out.chest ? '<div id="chest-area"><button class="chest" data-act="chest" style="font-size:110px">🎁</button><p class="small">Sandığı aç!</p></div>' : '') +
        (b.mode === 'daily' && !out.dailyFirst ? '<p class="small">Bugünkü ödül zaten alınmıştı (ödülsüz tekrar).</p>' : '') +
        (out.firstHard ? '<p class="small" style="color:var(--green)">İlk kez bu kademede kazandın: bonus elmas!</p>' : '');
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
      html = '<h1 style="color:var(--red)">Yenilgi</h1><p>' + (b.kind === 'field' ? (b.cmdP.dead || b.cmdP.hp <= 0 ? 'Komutanın düştü! Onu arkada, korunaklı tut.' : 'Süre doldu ya da bayraklar kaybedildi. Dizilişini değiştirip tekrar dene!') : 'Kalen düştü. Ordunu güçlendirip tekrar dene!') + '</p>' +
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
    $('perk-row').innerHTML = '';
    var rc = $('rule-chip'), rtxt = (b.diff > 0 ? Z.DIFFS[b.diff].icon + ' ' : '') + b.rules.map(function (r) { return Z.RULES[r].icon + (b.rules.length === 1 ? ' ' + Z.RULES[r].name : ''); }).join(' ');
    if (rtxt) { rc.textContent = rtxt; rc.classList.remove('hidden'); } else rc.classList.add('hidden');
    $('info-title').textContent = b.mode === 'endless' ? 'Sonsuz Kuşatma' : (b.mode === 'daily' ? 'Günlük Sefer' : 'Bölüm ' + b.level) + ' · ' + b.info.name;
    $('btn-speed').textContent = 'x' + (UI.game.speed || 1);
    var f = b.kind === 'field';
    $('hud').classList.toggle('field', f);
    $('lane-pick').classList.toggle('hidden', f); $('field-bar').classList.toggle('hidden', !f); $('obj-chip').classList.toggle('hidden', !f);
    hud.sel = f ? b.deck[0] : null; hud.fdrag = null; Z.Render.fhover = null;
    if (f) {
      $('fb-stance').classList.add('hidden'); $('fb-go').classList.remove('hidden'); $('fb-auto').classList.remove('hidden'); $('fb-clear').classList.remove('hidden');
      $('fb-stance').innerHTML = '⚔<small>Saldır</small>';
      hud.fieldTut = !S.data.fieldTutDone; $('hint').classList.toggle('hidden', !hud.fieldTut);
      $('hint').textContent = '👆 Kartı sahaya sürükle · birliğe dokun: geri al';
    }
  };

  // ---- Acik alan arayuzu ----
  function fieldHudUpdate(b) {
    var L = hud.last, set = function (k, v, fn) { if (L[k] !== v) { L[k] = v; fn(v); } }, prep = b.phase === 'prep';
    set('g', Math.floor(b.gold), function (v) { $('gold-val').textContent = v; });
    set('cap', prep ? b.budget0 : b.goldCap(), function (v) { $('gold-cap').textContent = '/' + v; });
    set('rate', prep ? -1 : b.income(), function (v) { $('gold-rate').textContent = v < 0 ? 'komuta puanı' : '+' + (Math.round(v * 10) / 10) + '/sn'; });
    b.deck.forEach(function (id) {
      var cd = b.cooldown[id], def = Z.UNITS[id], c = hud.cards[id], f = Math.round(100 * cd / def.cd) / 100;
      set('cd' + id, f, function (v) { c.cd.style.transform = 'scaleY(' + v + ')'; });
      set('p' + id, b.gold < def.cost, function (v) { c.el.classList.toggle('poor', v); });
      set('s' + id, hud.sel === id, function (v) { c.el.classList.toggle('sel', v); });
    });
    var h = Z.HEROES[b.heroId];
    set('hcd', prep ? 1 : Math.round(100 * b.heroCd / h.cd) / 100, function (v) { document.querySelector('#btn-skill .cd').style.transform = 'scaleY(' + v + ')'; });
    set('hst', prep ? 'Savaşta' : b.heroCd <= 0 ? 'HAZIR!' : Math.ceil(b.heroCd) + ' sn', function (v) { $('skill-state').textContent = v; $('btn-skill').classList.toggle('ready', !prep && b.heroCd <= 0); });
    var mc = b.mineCost();
    set('mine', prep + ':' + b.mine + ':' + (mc !== null && b.gold >= mc), function () {
      $('mine-txt').innerHTML = mc === null ? 'Maden MAKS' : 'Maden Sv.' + (b.mine + 1) + '<br><span style="color:var(--gold)">🪙 ' + mc + '</span>';
      $('btn-mine').classList.toggle('off', prep || mc === null || b.gold < mc);
    });
    set('phase', b.phase, function () {
      $('fb-go').classList.toggle('hidden', !prep); $('fb-auto').classList.toggle('hidden', !prep); $('fb-clear').classList.toggle('hidden', !prep); $('fb-stance').classList.toggle('hidden', prep);
      if (!prep) { hud.fieldTut = false; S.data.fieldTutDone = true; S.save(); $('hint').classList.add('hidden'); }
    });
    set('stance', b.stance, function (v) { $('fb-stance').innerHTML = (v === 'defend' ? '🛡<small>Savun</small>' : '⚔<small>Saldır</small>'); $('fb-stance').classList.toggle('def', v === 'defend'); });
    var oc = $('obj-chip'), txt;
    if (b.objective === 'capture') txt = '🚩 ' + Math.floor(b.scores.p) + ' – ' + Math.floor(b.scores.e);
    else if (b.objective === 'survive') txt = '⏳ ' + Z.fmtTime(Math.max(0, b.info.surviveTime - b.t));
    else txt = '👑 ' + Math.round(100 * Math.max(0, b.cmdE.hp) / b.cmdE.max) + '%';
    txt = '🛡 ' + Math.round(100 * Math.max(0, b.cmdP.hp) / b.cmdP.max) + '% · ' + txt;
    set('obj', txt, function (v) { oc.textContent = v; });
    set('title', Math.floor(b.t / 2), function () { $('info-title').textContent = (b.mode === 'daily' ? 'Günlük Sefer' : 'Sefer ' + b.level) + ' · ' + b.info.name + (prep ? ' · Hazırlık' : ' · ' + Z.fmtTime(b.t)); });
    set('combo', b.combo >= 3 ? b.combo : 0, function (v) { var cEl = $('combo-chip'); cEl.classList.toggle('hidden', !v); if (v) cEl.textContent = '🔥 Seri x' + v; });
    set('perks', Object.keys(b.perks).join(), function () { $('perk-row').innerHTML = Object.keys(b.perks).map(function (k) { return '<i title="' + Z.PERKS[k].name + '">' + Z.PERKS[k].icon + '</i>'; }).join(''); });
  }
  UI.fieldPlace = function (type, x, y, el) {
    var b = hud.battle;
    if (b.phase === 'battle' && y < Z.FH - Z.FZONE.battle) { A.deny(); UI.toast('Takviye yalnızca alt şeritten gelir'); return false; }
    var cost = Z.UNITS[type].cost;
    if (b.gold < cost) { A.deny(); UI.toast(b.phase === 'prep' ? 'Komuta puanın yetmiyor' : 'Altın yetmiyor'); return false; }
    if (b.phase === 'battle' && b.cooldown[type] > 0) { A.deny(); return false; }
    if (!b.canPlace(x, y)) { A.deny(); UI.toast(y < Z.FH - Z.FZONE.prep ? 'Burası yerleştirme alanı dışında' : 'Buraya yerleştirilemez (nehir/kaya)'); return false; }
    if (!b.place(type, x, y)) { A.deny(); UI.toast('Ordu dolu'); return false; }
    if (b.phase === 'prep') A.click();
    return true;
  };
  UI.fieldSkill = function (x, y, el) {
    var b = hud.battle;
    if (b.phase !== 'battle') { A.deny(); UI.toast('Yetenek savaşta kullanılır'); return false; }
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
    else set('title', Math.floor(b.t), function () { $('info-title').textContent = (b.mode === 'daily' ? 'Günlük Sefer' : 'Sefer ' + b.level) + ' · ' + b.info.name + ' · ' + (b.rl('survive') ? '⏳ ' + Z.fmtTime(Math.max(0, b.info.surviveTime - b.t)) : Z.fmtTime(b.t)); });
    set('lane', Z.Render.selLane, function (v) { Array.prototype.forEach.call(document.querySelectorAll('.lane-btn'), function (el) { el.classList.toggle('on', +el.getAttribute('data-lane') === v); }); });
    set('combo', b.combo >= 3 ? b.combo : 0, function (v) {
      var cEl = $('combo-chip'); cEl.classList.toggle('hidden', !v); if (v) cEl.textContent = '🔥 Seri x' + v;
    });
    set('perks', Object.keys(b.perks).join(), function () {
      $('perk-row').innerHTML = Object.keys(b.perks).map(function (k) { return '<i title="' + Z.PERKS[k].name + '">' + Z.PERKS[k].icon + '</i>'; }).join('');
    });
    if (hud.tut) {
      if (b.stats.spawns >= 3 && b.stats.mines === 0 && b.t < 60) { $('hint').textContent = '⛏ Madeni yükselt: daha çok altın!'; }
      if (b.stats.spawns >= 3 && b.stats.mines > 0) { hud.tut = false; $('hint').classList.add('hidden'); }
      if (b.t > 70) { hud.tut = false; $('hint').classList.add('hidden'); }
    }
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
        g.textContent = d.action.kind === 'unit' ? Z.UNITS[d.action.type].icon : Z.HEROES[hud.battle.heroId].icon;
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
        if (!fd.moved || pf.y > UI.game.stage.h - 262) { var un = bf.units.filter(function (q) { return q.id === fd.id; })[0]; if (bf.removeUnit(fd.id)) { A.click(); UI.toast('Geri alındı +' + (un ? un.cost : 0) + ' puan'); } }
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

    $('lane-pick').addEventListener('click', function (e) {
      var el = e.target.closest('[data-lane]'); if (!el || !hud.battle) return;
      Rn.selLane = +el.getAttribute('data-lane'); A.init(); A.click();
    });
    $('btn-mine').addEventListener('click', function () {
      if (!hud.battle || UI.game.paused) return;
      if (!hud.battle.upgradeMine()) { A.deny(); } else { A.coin(); }
    });
    $('fb-auto').addEventListener('click', function () { var b = hud.battle; if (!b || b.kind !== 'field' || b.phase !== 'prep') return; A.click(); b.autoPlace(); UI.toast('Ordu otomatik dizildi — dilediğin gibi sürükleyip değiştir'); });
    $('fb-clear').addEventListener('click', function () { var b = hud.battle; if (!b || b.kind !== 'field' || b.phase !== 'prep') return; A.click(); b.units.filter(function (u) { return u.team === 0 && !u.commander; }).forEach(function (u) { b.removeUnit(u.id); }); });
    $('fb-go').addEventListener('click', function () {
      var b = hud.battle; if (!b || b.kind !== 'field' || b.phase !== 'prep' || UI.game.paused) return;
      if (b.countTeam(0) < 2) { A.deny(); UI.toast('Önce birlik yerleştir (ya da 🎲 Otomatik)'); return; }
      b.startBattle();
    });
    $('fb-stance').addEventListener('click', function () { var b = hud.battle; if (!b || b.kind !== 'field') return; A.click(); b.setStance(b.stance === 'attack' ? 'defend' : 'attack'); UI.toast(b.stance === 'defend' ? '🛡 Savunma: birlikler yakındaki düşmana karşılık verir' : '⚔ Saldırı: birlikler düşmana yürür'); });
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

  UI.perkModal = function (b, done) {
    var acts = {}, html = '<h1>⚔️ Savaş Ganimeti</h1><p>Birini seç — bu savaş boyunca geçerli olur.</p><div class="perks">';
    b.perkOffer.forEach(function (id) {
      var p = Z.PERKS[id];
      html += '<button class="perk" data-act="p_' + id + '"><span class="p-ico">' + p.icon + '</span><span class="p-name">' + p.name + '</span><span class="p-desc">' + p.desc + '</span></button>';
      acts['p_' + id] = function () { b.pickPerk(id); UI.closeModal(); if (done) done(); };
    });
    UI.modal(html + '</div>', acts);
  };

  UI.whatsNew = function () {
    var d = S.data;
    UI.modal('<h1>🎉 Seferhan 0.5</h1><p>Artık sadece kale kuşatmak yok — <b>açık alan savaşları</b> geldi!</p><div class="new-list">' +
      '🏕️ <b>Açık alan seferleri:</b> 30 bölümde ordunu sahaya <b>istediğin yere yerleştir</b><br>' +
      '👑 <b>Komutan</b> düşerse yenilirsin — onu koru! 🚩 Bayrakları ele geçir ya da ⏳ mevzii tut<br>' +
      '🌊 <b>Arazi:</b> nehir geçitleri, 🌲 orman (siper), ⛰️ tepe (menzil), 🪨 kaya<br>' +
      '🛡️ Saldırı / Savunma duruşu, 🎯 noktaya kahraman yeteneği, alt şeritten takviye<br>' +
      '🏃 Askerler artık <b>birbirini geçebiliyor</b> · 🔊 yepyeni <b>savaş sesleri</b> (kılıç, ok, davul, boru)</div>' +
      '<p class="small">Kale kuşatmaları aynen devam ediyor; bölümler sırayla iki türü de getirir.</p>' +
      '<div class="actions"><button class="btn gold" data-act="ok">Sefere çıkalım!</button></div>',
      { ok: function () { d.seenVersion = Z.NOTES_ID; S.save(); UI.closeModal(); UI.welcome(); } });
  };

  UI.pauseModal = function (acts) {
    UI.modal('<h1>Duraklatıldı</h1><div class="actions" style="flex-direction:column;align-items:center">' +
      '<button class="btn gold" data-act="resume" style="width:420px">▶ Devam</button>' +
      '<button class="btn" data-act="restart" style="width:420px">↻ Yeniden Başla</button>' +
      '<button class="btn red" data-act="quit" style="width:420px">✕ Savaştan Çık</button></div>', acts);
  };
})(globalThis.Z = globalThis.Z || {});
