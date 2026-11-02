// Zafarion - savas simulasyonu (DOM'dan bagimsiz; Node'da bot ile test edilebilir)
(function (Z) {
  'use strict';

  var C = Z.C = {
    W: 1280, H: 720,
    LANE_Y: [265, 370, 475],
    PF: 170,    // oyuncu kalesinin onu
    EF: 1110    // dusman kalesinin onu
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  Z.mulberry32 = mulberry32;

  var MAX_PER_LANE = 14;

  // opts: { mode:'campaign'|'endless', level, save:{unitLvl,heroLvl,castleLvl}, deck:[], hero:'aslan', seed }
  function Battle(opts) {
    this.mode = opts.mode || 'campaign';
    this.level = opts.level || 1;
    this.sv = opts.save;
    this.deck = opts.deck.slice();
    this.heroId = opts.hero || 'aslan';
    this.rng = mulberry32(opts.seed || ((Date.now() & 0x7fffffff) || 1));
    this.info = Z.levelInfo(this.mode === 'endless' ? 1 : this.level);
    this.t = 0;
    this.over = false;
    this.result = null;
    this.units = [];
    this.projs = [];
    this.events = [];
    this.nextId = 1;

    this.mine = 0;
    this.gold = 120;
    this.cooldown = {};
    this.deck.forEach(function (u) { this.cooldown[u] = 0; }, this);

    var hero = Z.HEROES[this.heroId];
    this.heroCd = hero.cd * 0.4;
    this.roarUntil = 0;

    var castle = Z.castleHp(this.sv.castleLvl || 1);
    this.base = [
      { hp: castle, max: castle, shoot: 0.8, flash: 0 },
      { hp: this.mode === 'endless' ? 1e9 : this.info.baseHp, max: this.mode === 'endless' ? 1e9 : this.info.baseHp, shoot: 1.2, flash: 0 }
    ];

    this.ai = { gold: this.info.startGold, think: 3, pending: null, pendingT: 0, bossDone: 0 };
    // istatistikler
    this.stats = { kills: 0, spawns: 0, skills: 0, mines: 0, lost: 0 };
    this.combo = 0; this.comboT = 0; this.bestCombo = 0;
  }
  Z.Battle = Battle;

  var P = Battle.prototype;

  P.wave = function () { return Z.endlessWave(this.t); };
  P.enemyScale = function () {
    return this.mode === 'endless' ? 1 + 0.065 * (this.wave() - 1) : this.info.scale;
  };
  P.aiRate = function () {
    return this.mode === 'endless' ? 8 + 0.8 * this.wave() : this.info.aiRate;
  };
  P.tiers = function () {
    if (this.mode !== 'endless') return this.info.tiers;
    var w = this.wave(), t = ['spear', 'archer'];
    if (w >= 2) t.push('cav'); if (w >= 4) t.push('knight'); if (w >= 6) t.push('mage'); if (w >= 8) t.push('cata');
    return t;
  };
  P.income = function () { return Z.mineIncome(this.mine); };
  P.goldCap = function () { return Z.mineCap(this.mine); };
  P.mineCost = function () { return this.mine < Z.MINE_COSTS.length ? Z.MINE_COSTS[this.mine] : null; };
  P.emit = function (e) { this.events.push(e); };
  P.drain = function () { var e = this.events; this.events = []; return e; };
  P.buffed = function () { return this.roarUntil > this.t; };

  // ---- Oyuncu eylemleri -------------------------------------------------
  P.canDeploy = function (type) {
    return !this.over && this.cooldown[type] !== undefined && this.cooldown[type] <= 0 && this.gold >= Z.UNITS[type].cost;
  };
  P.deploy = function (type, lane) {
    if (!this.canDeploy(type)) return false;
    if (this.laneCount(0, lane) >= MAX_PER_LANE) return false;
    var def = Z.UNITS[type];
    this.gold -= def.cost;
    this.cooldown[type] = def.cd;
    this.spawn(0, type, lane);
    this.stats.spawns++;
    return true;
  };
  P.upgradeMine = function () {
    var c = this.mineCost();
    if (this.over || c === null || this.gold < c) return false;
    this.gold -= c; this.mine++; this.stats.mines++;
    this.emit({ type: 'mine', level: this.mine });
    return true;
  };
  P.laneCount = function (team, lane) {
    var n = 0;
    for (var i = 0; i < this.units.length; i++) { var u = this.units[i]; if (u.team === team && u.lane === lane && !u.dead) n++; }
    return n;
  };
  P.skillReady = function () { return !this.over && this.heroCd <= 0; };
  P.useSkill = function (lane) {
    if (!this.skillReady()) return false;
    var hero = Z.HEROES[this.heroId], pw = Z.heroPower(this.sv.heroLvl[this.heroId] || 1);
    if (hero.target === 'lane' && !(lane >= 0 && lane <= 2)) return false;
    var i, u;
    if (hero.type === 'roar') {
      this.roarUntil = this.t + 8;
    } else if (hero.type === 'bolt') {
      var foes = this.units.filter(function (e) { return e.team === 1 && e.lane === lane && !e.dead; })
        .sort(function (a, b) { return a.x - b.x; }).slice(0, 5);
      for (i = 0; i < foes.length; i++) {
        this.emit({ type: 'bolt', x: foes[i].x, lane: lane });
        this.damage(foes[i], 190 * pw, 'bolt', false, true);
      }
    } else if (hero.type === 'ward') {
      for (i = 0; i < this.units.length; i++) {
        u = this.units[i];
        if (u.team === 0 && u.lane === lane && !u.dead) {
          u.hp = Math.min(u.max, u.hp + u.max * 0.35 * pw);
          u.wardUntil = this.t + 6;
        }
      }
    }
    this.heroCd = hero.cd;
    this.stats.skills++;
    this.emit({ type: 'skill', kind: hero.type, lane: lane });
    return true;
  };

  // ---- Birlik olusturma -------------------------------------------------
  P.spawn = function (team, type, lane, boss) {
    var def = Z.UNITS[type], hpM, dmgM;
    if (team === 0) {
      var lvl = this.sv.unitLvl[type] || 1;
      hpM = Z.unitHpMult(lvl); dmgM = Z.unitDmgMult(lvl);
    } else {
      var s = this.enemyScale();
      hpM = s; dmgM = 1 + (s - 1) * 0.8;
    }
    if (boss) { hpM *= 3; dmgM *= 1.15; }
    var u = {
      id: this.nextId++, team: team, type: type, cls: def.cls, lane: lane, boss: !!boss,
      x: team === 0 ? C.PF + 10 : C.EF - 10,
      hp: def.hp * hpM, max: def.hp * hpM, dmg: def.dmg * dmgM,
      int: def.int, range: def.range, speed: def.speed, ranged: def.ranged, aoe: def.aoe || 0, minRange: def.minRange || 0,
      atkCd: def.int * 0.5, atkAnim: 0, flash: 0, age: 0, dead: false, charged: false, wardUntil: 0, moving: false
    };
    this.units.push(u);
    this.emit({ type: 'spawn', unit: u });
    return u;
  };

  // ---- Hasar ------------------------------------------------------------
  P.damage = function (target, dmg, srcCls, isRanged, ignoreMult) {
    var m = 1;
    if (!ignoreMult) {
      var tbl = Z.BONUS[srcCls]; if (tbl && tbl[target.cls]) m *= tbl[target.cls];
      if (target.cls === 'knight' && isRanged && srcCls !== 'mage') m *= 0.7;
    }
    if (target.wardUntil > this.t) m *= 0.5;
    var d = dmg * m;
    target.hp -= d; target.flash = 0.12;
    this.emit({ type: 'hit', x: target.x, lane: target.lane, dmg: d, strong: m > 1.2, team: target.team });
    if (target.hp <= 0 && !target.dead) this.kill(target);
  };
  P.kill = function (u) {
    u.dead = true;
    this.emit({ type: 'death', x: u.x, lane: u.lane, team: u.team, utype: u.type, boss: u.boss });
    if (u.team === 1) {
      this.stats.kills++;
      this.comboT = 3; this.combo++; if (this.combo > this.bestCombo) this.bestCombo = this.combo;
      var g = Math.round(Z.UNITS[u.type].cost * 0.4 * (u.boss ? 4 : 1) * (1 + 0.05 * Math.min(this.combo, 10)));
      this.gold = Math.min(this.goldCap() + 100, this.gold + g);
      this.emit({ type: 'coin', x: u.x, lane: u.lane, v: g });
    } else {
      this.stats.lost++;
    }
  };
  P.hitBase = function (team, dmg, srcCls) {
    var b = this.base[team];
    var d = dmg * (srcCls === 'cata' ? Z.UNITS.cata.baseMult : 1);
    b.hp -= d; b.flash = 0.15;
    this.emit({ type: 'baseHit', team: team, dmg: d });
  };

  // ---- Ana dongu --------------------------------------------------------
  P.update = function (dtRaw) {
    if (this.over) return;
    var dt = Math.min(dtRaw, 0.05), i;
    this.t += dt;
    this.gold = Math.min(this.goldCap(), this.gold + this.income() * dt);
    for (var k in this.cooldown) if (this.cooldown[k] > 0) this.cooldown[k] = Math.max(0, this.cooldown[k] - dt);
    if (this.heroCd > 0) this.heroCd = Math.max(0, this.heroCd - dt);
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    this.base[0].flash = Math.max(0, this.base[0].flash - dt);
    this.base[1].flash = Math.max(0, this.base[1].flash - dt);

    this.updateAI(dt);
    for (i = 0; i < this.units.length; i++) if (!this.units[i].dead) this.stepUnit(this.units[i], dt);
    this.updateProjectiles(dt);
    this.updateBases(dt);
    this.units = this.units.filter(function (u) { return !u.dead; });

    if (this.base[1].hp <= 0) this.finish(true);
    else if (this.base[0].hp <= 0) this.finish(false);
  };

  P.stepUnit = function (u, dt) {
    u.age += dt; u.atkCd -= dt;
    if (u.flash > 0) u.flash -= dt;
    if (u.atkAnim > 0) u.atkAnim -= dt;
    var dir = u.team === 0 ? 1 : -1, tgt = null, best = 1e9, allyAhead = 1e9, enemyAhead = 1e9;

    for (var i = 0; i < this.units.length; i++) {
      var e = this.units[i];
      if (e === u || e.dead || e.lane !== u.lane) continue;
      var d = (e.x - u.x) * dir;
      if (d < -6) continue;
      if (e.team !== u.team) {
        if (d < enemyAhead) enemyAhead = d;
        if (u.minRange && d < u.minRange) continue; // mancinik yakina atamaz
        if (d < best) { best = d; tgt = e; }
      } else if (d > 0 && d < allyAhead) {
        allyAhead = d;
      }
    }

    var baseDist = u.team === 0 ? (C.EF - u.x) : (u.x - C.PF);
    var hasTarget = tgt && best <= u.range;
    var atBase = !hasTarget && baseDist <= u.range;

    if (hasTarget || atBase) {
      u.moving = false;
      if (u.atkCd <= 0) this.attack(u, hasTarget ? tgt : null);
    } else {
      // dusmanla temas varsa (mancinik gibi ates edemeyenler dahil) ilerleme
      var blocked = allyAhead < 26 || enemyAhead < 30;
      if (!blocked) { u.x += dir * u.speed * dt; u.moving = true; } else { u.moving = false; }
    }
  };

  P.attack = function (u, tgt) {
    var buff = u.team === 0 && this.buffed();
    u.atkCd = u.int / (buff ? 1.35 : 1);
    u.atkAnim = 0.25;
    var dmg = u.dmg * (buff ? 1.35 : 1);
    if (u.cls === 'cav' && !u.charged) { u.charged = true; dmg *= 2; this.emit({ type: 'charge', x: u.x, lane: u.lane }); }
    if (u.ranged) {
      var tx = tgt ? tgt.x : (u.team === 0 ? C.EF : C.PF);
      this.projs.push({
        team: u.team, cls: u.cls, lane: u.lane, kind: u.cls === 'cata' ? 'rock' : (u.cls === 'mage' ? 'bolt' : 'arrow'),
        x: u.x, fromX: u.x, tx: tx, target: tgt, toBase: !tgt, dmg: dmg, aoe: u.aoe,
        speed: u.cls === 'cata' ? 380 : (u.cls === 'mage' ? 430 : 640)
      });
      this.emit({ type: 'shoot', x: u.x, lane: u.lane, cls: u.cls });
    } else if (tgt) {
      this.damage(tgt, dmg, u.cls, false);
    } else {
      this.hitBase(u.team === 0 ? 1 : 0, dmg, u.cls);
    }
  };

  P.updateProjectiles = function (dt) {
    var keep = [];
    for (var i = 0; i < this.projs.length; i++) {
      var p = this.projs[i], dir = p.team === 0 ? 1 : -1;
      if (p.target && !p.target.dead) p.tx = p.target.x;
      var step = p.speed * dt, remain = (p.tx - p.x) * dir;
      if (remain <= step + 2) { this.impact(p); } else { p.x += dir * step; keep.push(p); }
    }
    this.projs = keep;
  };
  P.impact = function (p) {
    var foe = p.team === 0 ? 1 : 0, i, u;
    if (p.aoe) {
      this.emit({ type: 'boom', x: p.tx, lane: p.lane, r: p.aoe, cls: p.cls });
      for (i = 0; i < this.units.length; i++) {
        u = this.units[i];
        if (u.team === foe && u.lane === p.lane && !u.dead) {
          var d = Math.abs(u.x - p.tx);
          if (d <= p.aoe) this.damage(u, p.dmg * (1 - 0.4 * d / p.aoe), p.cls, p.cls !== 'mage');
        }
      }
      if (p.toBase) this.hitBase(foe, p.dmg, p.cls);
      return;
    }
    if (p.toBase) { this.hitBase(foe, p.dmg, p.cls); return; }
    if (p.target && !p.target.dead && Math.abs(p.target.x - p.tx) < 40) {
      this.damage(p.target, p.dmg, p.cls, true);
    }
  };

  // Kale okcu kuleleri
  P.updateBases = function (dt) {
    for (var team = 0; team < 2; team++) {
      var b = this.base[team];
      b.shoot -= dt;
      if (b.shoot > 0) continue;
      var front = team === 0 ? C.PF : C.EF, tgt = null, best = 270;
      for (var i = 0; i < this.units.length; i++) {
        var u = this.units[i];
        if (u.team === team || u.dead) continue;
        var d = Math.abs(u.x - front);
        if (d < best) { best = d; tgt = u; }
      }
      if (tgt) {
        b.shoot = 1.5;
        var dm = 11 * (team === 0 ? 1 + 0.1 * ((this.sv.castleLvl || 1) - 1) : 1 + (this.enemyScale() - 1) * 0.8);
        this.damage(tgt, dm, 'tower', true);
        this.emit({ type: 'tower', team: team, lane: tgt.lane, x: tgt.x });
      } else {
        b.shoot = 0.3;
      }
    }
  };

  // ---- Dusman yapay zekasi ---------------------------------------------
  P.updateAI = function (dt) {
    var ai = this.ai;
    ai.gold += this.aiRate() * dt;
    // Patron
    if (this.mode === 'campaign' && this.info.boss) {
      var times = [60, 130];
      if (ai.bossDone < times.length && this.t >= times[ai.bossDone]) {
        ai.bossDone++;
        this.spawn(1, 'knight', 1, true);
        this.emit({ type: 'boss' });
      }
    }
    ai.think -= dt;
    if (ai.think > 0) return;
    ai.think = Math.max(0.6, 1.5 - (this.mode === 'endless' ? this.wave() * 0.03 : this.level * 0.02)) + this.rng() * 0.8;

    var tiers = this.tiers(), i, u, lane, rng = this.rng;
    // koridor tehdidi
    var threat = [0, 0, 0], defend = [0, 0, 0], cls = [{}, {}, {}], span = C.EF - C.PF;
    for (i = 0; i < this.units.length; i++) {
      u = this.units[i]; if (u.dead) continue;
      if (u.team === 0) {
        var prog = (u.x - C.PF) / span;
        threat[u.lane] += u.hp * (0.3 + prog * 1.4);
        cls[u.lane][u.cls] = (cls[u.lane][u.cls] || 0) + u.hp * (0.3 + prog);
      } else {
        defend[u.lane] += u.hp;
      }
    }
    var bestLane = 0, bestScore = -1e9;
    for (lane = 0; lane < 3; lane++) {
      var sc = threat[lane] - 0.7 * defend[lane] + rng() * 80;
      if (sc > bestScore) { bestScore = sc; bestLane = lane; }
    }
    var dom = null, dv = 0;
    for (var c in cls[bestLane]) if (cls[bestLane][c] > dv) { dv = cls[bestLane][c]; dom = c; }

    // bekleyen alim
    if (ai.pending) {
      ai.pendingT += ai.think;
      var pd = Z.UNITS[ai.pending.type];
      if (ai.gold >= pd.cost) { this.aiSpawn(ai.pending.type, ai.pending.lane); ai.pending = null; return; }
      if (ai.pendingT < 5) return;
      ai.pending = null;
    }
    var type;
    if (dom && rng() < 0.7 && tiers.indexOf(Z.COUNTER[dom]) >= 0) type = Z.COUNTER[dom];
    else type = tiers[Math.floor(rng() * tiers.length)];
    var cost = Z.UNITS[type].cost;
    if (ai.gold < cost) {
      if (cost <= ai.gold + this.aiRate() * 5) { ai.pending = { type: type, lane: bestLane }; ai.pendingT = 0; return; }
      type = tiers[0]; cost = Z.UNITS[type].cost;
      if (ai.gold < cost) return;
    }
    this.aiSpawn(type, bestLane);
  };
  P.aiSpawn = function (type, lane) {
    if (this.laneCount(1, lane) >= MAX_PER_LANE) return;
    this.ai.gold -= Z.UNITS[type].cost;
    this.spawn(1, type, lane);
  };

  // ---- Bitis ------------------------------------------------------------
  P.finish = function (win) {
    if (this.over) return;
    this.over = true;
    var pct = Math.max(0, this.base[0].hp) / this.base[0].max;
    var stars = win ? (pct >= 0.7 ? 3 : pct >= 0.35 ? 2 : 1) : 0;
    this.result = { win: win, stars: stars, basePct: pct, time: this.t, kills: this.stats.kills, wave: this.mode === 'endless' ? this.wave() : 0 };
    this.emit({ type: win ? 'win' : 'lose' });
  };

  // Odulleri kayda isle. Dondurulen nesne UI'da gosterilir.
  Z.settleBattle = function (b, S) {
    var d = S.data, r = b.result, out = { coins: 0, gems: 0, chest: null, firstClear: false, newUnits: [], newBest: false, stars: r.stars, win: r.win };
    d.stats.battles++;
    d.stats.kills += b.stats.kills;
    S.track('kills', b.stats.kills); S.track('spawns', b.stats.spawns); S.track('skills', b.stats.skills); S.track('mines', b.stats.mines);

    if (b.mode === 'endless') {
      out.coins = r.wave * 25 + b.stats.kills * 2;
      out.gems = Math.floor(r.wave / 5) * 2;
      if (r.wave > d.endlessBest) { d.endlessBest = r.wave; out.newBest = true; }
    } else {
      var info = b.info;
      if (r.win) {
        d.stats.wins++; S.track('wins', 1);
        if (r.stars === 3) S.track('threeStars', 1);
        var prev = d.stars[b.level] || 0;
        out.coins = Math.round(info.rewardCoins * (1 + 0.25 * (r.stars - 1)) * (info.boss ? 1.5 : 1));
        if (prev === 0) { out.firstClear = true; out.gems += info.rewardGems; }
        if (r.stars > prev) { d.stats.totalStars += r.stars - prev; d.stars[b.level] = r.stars; if (prev > 0) out.gems += (r.stars - prev) * 2; }
        if (b.level > d.cleared) {
          var before = S.unlockedUnits();
          d.cleared = b.level;
          S.unlockedUnits().forEach(function (u) { if (before.indexOf(u) < 0) out.newUnits.push(u); });
        }
        // sandik
        var tier = r.stars;
        out.chest = { tier: tier, coins: Math.round(info.rewardCoins * (0.3 + 0.35 * tier) * (0.8 + b.rng() * 0.6)), gems: b.rng() < 0.15 * tier ? tier : 0 };
        out.coins += out.chest.coins; out.gems += out.chest.gems;
      } else {
        out.coins = Math.round(info.rewardCoins * 0.15) + b.stats.kills;
      }
    }
    d.coins += out.coins; d.gems += out.gems;
    S.save();
    return out;
  };
})(globalThis.Z = globalThis.Z || {});
