// Seferhan - savas simulasyonu (DOM'dan bagimsiz; Node'da bot ile test edilebilir)
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
  var PRIO = { archer: 1, mage: 1, healer: 1, cata: 1, banner: 1 }; // suikastcinin oncelikli avlari

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
    this.diff = opts.diff || 0; this.D = Z.DIFFS[this.diff];
    this.daily = opts.daily || null;
    this.rules = (opts.rules || (this.mode === 'endless' ? [] : [this.info.rule])).filter(function (r) { return r && r !== 'none'; });
    this.rule = this.rules[0] || 'none';
    var eHp = this.mode === 'endless' || this.rl('survive') ? 1e9 : this.info.baseHp * (this.rl('fortress') ? 1.4 : 1) * this.D.base; // savunma seferinde kale yikilamaz
    this.base = [
      { hp: castle, max: castle, shoot: 0.8, flash: 0 },
      { hp: eHp, max: eHp, shoot: 1.2, flash: 0 }
    ];
    this.ambushIdx = 0;

    this.ai = { gold: this.info.startGold, think: 3, pending: null, pendingT: 0, bossDone: 0 };
    // istatistikler
    this.stats = { kills: 0, spawns: 0, skills: 0, mines: 0, lost: 0, perks: 0 };
    this.combo = 0; this.comboT = 0; this.bestCombo = 0;
    this.theme = opts.theme !== undefined ? opts.theme : Z.realmOf(this.mode === 'endless' ? 1 : this.level);
    this.perks = {}; this.perkIdx = 0; this.perkOffer = null;
  }
  Z.Battle = Battle;

  var P = Battle.prototype;

  P.wave = function () { return Z.endlessWave(this.t); };
  P.enemyScale = function () {
    return this.mode === 'endless' ? 1 + 0.065 * (this.wave() - 1) : this.info.scale;
  };
  P.rl = function (name) { return this.rules.indexOf(name) >= 0; };
  P.aiRate = function () {
    return this.mode === 'endless' ? 8 + 0.8 * this.wave() : this.info.aiRate;
  };
  P.tiers = function () {
    if (this.mode !== 'endless') return this.info.tiers;
    var w = this.wave(), t = ['spear', 'archer'];
    if (w >= 2) t.push('cav'); if (w >= 4) t.push('knight'); if (w >= 6) t.push('mage'); if (w >= 8) t.push('cata');
    if (w >= 10) t.push('healer'); if (w >= 12) t.push('banner'); if (w >= 14) t.push('assassin'); if (w >= 17) t.push('golem'); if (w >= 20) t.push('flamer');
    return t;
  };
  P.income = function () { return Z.mineIncome(this.mine) * (this.perks.gold ? 1.25 : 1) * (this.rl('rich') ? 1.3 : this.rl('famine') ? 0.8 : 1); };
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
    this.cooldown[type] = def.cd * (this.perks.cd ? 0.75 : 1) * (this.rl('fortress') ? 0.85 : 1);
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
    if (hero.type === 'freeze') {
      var frozen = this.units.filter(function (e) { return e.team === 1 && e.lane === lane && !e.dead; });
      for (i = 0; i < frozen.length; i++) {
        frozen[i].stunUntil = this.t + Math.min(6, 3.5 * pw);
        this.emit({ type: 'freeze', x: frozen[i].x, lane: lane });
        this.damage(frozen[i], 55 * pw, 'freeze', false, true);
      }
    }
    if (hero.type === 'dragon') {
      var burning = this.units.filter(function (e) { return e.team === 1 && e.lane === lane && !e.dead; });
      for (i = 0; i < burning.length; i++) {
        this.ignite(burning[i], Math.max(burning[i].max * 0.05 * pw, 6), 6);
        this.emit({ type: 'burn', x: burning[i].x, lane: lane });
        this.damage(burning[i], 40 * pw, 'dragon', false, true);
      }
    }
    this.heroCd = hero.cd * (this.perks.skill ? 0.7 : 1);
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
      hpM = s * (this.rl('heavy') ? 1.2 : 1) * this.D.hp; dmgM = (1 + (s - 1) * 0.8) * this.D.dmg;
    }
    if (boss) { hpM *= 3; dmgM *= 1.15; }
    if (team === 0 && this.perks.hp) hpM *= 1.15;
    var u = {
      id: this.nextId++, team: team, type: type, cls: def.cls, lane: lane, boss: !!boss,
      x: team === 0 ? C.PF + 10 : C.EF - 10,
      hp: def.hp * hpM, max: def.hp * hpM, dmg: def.dmg * dmgM,
      int: def.int, range: def.range, speed: def.speed, ranged: def.ranged, aoe: def.aoe || 0, minRange: def.minRange || 0, heal: !!def.heal, aura: !!def.aura, stunUntil: 0,
      assassin: def.cls === 'assassin', splash: def.splash || 0, flame: !!def.flame, burnUntil: 0, burnDps: 0, burnTick: 0,
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
      var g = Math.round(Z.UNITS[u.type].cost * 0.4 * (u.boss ? 4 : 1) * (1 + 0.05 * Math.min(this.combo, 10)) * (this.rl('famine') ? 1.5 : 1));
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
    if (this.over || this.perkOffer) return;
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
    for (i = 0; i < this.units.length; i++) { // yanma hasari: yarim saniyede bir
      var bu = this.units[i];
      if (!bu.dead && bu.burnUntil > this.t) {
        bu.burnTick -= dt;
        if (bu.burnTick <= 0) {
          bu.burnTick = 0.5; bu.hp -= bu.burnDps * 0.5 * (bu.wardUntil > this.t ? 0.5 : 1);
          this.emit({ type: 'burn', x: bu.x, lane: bu.lane });
          if (bu.hp <= 0) this.kill(bu);
        }
      }
    }
    this.updateBases(dt);
    var regen = (this.perks.regen ? 0.015 : 0) + (this.rl('rally') ? 0.01 : 0);
    if (regen) {
      for (i = 0; i < this.units.length; i++) { var ru = this.units[i]; if (ru.team === 0 && !ru.dead) ru.hp = Math.min(ru.max, ru.hp + ru.max * regen * dt); }
    }
    this.units = this.units.filter(function (u) { return !u.dead; });

    if (this.base[1].hp <= 0) this.finish(true);
    else if (this.base[0].hp <= 0) this.finish(false);
    else if (this.rl('survive') && this.t >= this.info.surviveTime) this.finish(true);
    else if (this.perkIdx < Z.PERK_KILLS.length && this.stats.kills >= Z.PERK_KILLS[this.perkIdx]) { this.perkIdx++; this.offerPerk(); }
  };

  P.stepUnit = function (u, dt) {
    u.age += dt; u.atkCd -= dt;
    if (u.flash > 0) u.flash -= dt;
    if (u.atkAnim > 0) u.atkAnim -= dt;
    if (u.stunUntil > this.t) { u.moving = false; return; } // dondurulmus
    var dir = u.team === 0 ? 1 : -1, tgt = null, best = 1e9, allyAhead = 1e9, enemyAhead = 1e9, hurt = null, hurtR = 2, pTgt = null, pBest = 1e9;

    for (var i = 0; i < this.units.length; i++) {
      var e = this.units[i];
      if (e === u || e.dead || e.lane !== u.lane) continue;
      var d = (e.x - u.x) * dir;
      if (u.heal && e.team === u.team && e.hp < e.max && Math.abs(e.x - u.x) <= u.range) {
        var r = e.hp / e.max; if (r < hurtR) { hurtR = r; hurt = e; }
      }
      if (d < -6) continue;
      if (e.team !== u.team) {
        if (d < enemyAhead) enemyAhead = d;
        if (u.minRange && d < u.minRange) continue; // mancinik yakina atamaz
        if (d < best) { best = d; tgt = e; }
        if (u.assassin && PRIO[e.cls] && d < pBest) { pBest = d; pTgt = e; }
      } else if (d > 0 && d < allyAhead) {
        allyAhead = d;
      }
    }

    if (u.assassin && pTgt) { tgt = pTgt; best = pBest; enemyAhead = 1e9; } // arka saftaki avina engellenmeden gider

    // Sifaci: savasmaz, yarali dostu iyilestirir, dusmana yaklasmaz
    if (u.heal) {
      if (hurt && u.atkCd <= 0) this.healUnit(u, hurt);
      if (allyAhead < 26 || enemyAhead < 130) { u.moving = false; } else { u.x += dir * u.speed * (this.rl('swift') ? 1.25 : 1) * dt; u.moving = true; }
      return;
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
      if (!blocked) { u.x += dir * u.speed * (this.rl('swift') ? 1.25 : 1) * dt; u.moving = true; } else { u.moving = false; }
    }
  };

  P.attack = function (u, tgt) {
    var buff = u.team === 0 && this.buffed();
    u.atkCd = u.int / (buff ? 1.35 : 1);
    u.atkAnim = 0.25;
    var dmg = u.dmg * (buff ? 1.35 : 1);
    if (u.team === 0 && this.perks.dmg) dmg *= 1.15;
    if (this.auraNear(u)) dmg *= 1.2;
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
      if (u.flame) this.flameAttack(u, tgt, dmg);
      else { this.damage(tgt, dmg, u.cls, false); if (u.splash) this.splashHit(u, tgt, dmg); }
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

  // Tas Dev: darbe hedefin cevresindekilere de (%60) vurur
  P.splashHit = function (u, tgt, dmg) {
    for (var i = 0; i < this.units.length; i++) {
      var e = this.units[i];
      if (e.team !== u.team && !e.dead && e.lane === u.lane && e !== tgt && Math.abs(e.x - tgt.x) <= u.splash) this.damage(e, dmg * 0.6, u.cls, false);
    }
    this.emit({ type: 'boom', x: tgt.x, lane: u.lane, r: u.splash, cls: 'golem' });
  };
  // Alevci: hedef ve hemen arkasindakiler yanar
  P.ignite = function (e, dps, dur) {
    if (e.dead) return;
    e.burnUntil = Math.max(e.burnUntil, this.t + dur); e.burnDps = Math.max(e.burnDps, dps);
  };
  P.flameAttack = function (u, tgt, dmg) {
    var dir = u.team === 0 ? 1 : -1;
    for (var i = 0; i < this.units.length; i++) {
      var e = this.units[i];
      if (e.team === u.team || e.dead || e.lane !== u.lane) continue;
      var d = (e.x - u.x) * dir;
      if (d < -6 || d > u.range + 10 || Math.abs(e.x - tgt.x) > 45) continue;
      this.damage(e, e === tgt ? dmg : dmg * 0.6, u.cls, false);
      this.ignite(e, dmg * 0.9, 3);
    }
    this.emit({ type: 'flame', x: u.x, lane: u.lane, to: tgt.x, team: u.team });
  };

  // Sancaktar aurasi: ayni koridorda 160 birim icindeki baska bir sancaktar
  P.auraNear = function (u) {
    for (var i = 0; i < this.units.length; i++) {
      var b = this.units[i];
      if (b.aura && b !== u && !b.dead && b.team === u.team && b.lane === u.lane && Math.abs(b.x - u.x) <= 160) return true;
    }
    return false;
  };
  P.healUnit = function (healer, target) {
    var amt = healer.dmg * (healer.team === 0 && this.perks.dmg ? 1.15 : 1);
    healer.atkCd = healer.int; healer.atkAnim = 0.25;
    target.hp = Math.min(target.max, target.hp + amt);
    this.emit({ type: 'heal', x: target.x, lane: target.lane, v: amt, team: healer.team });
  };

  // ---- Savas ganimeti ---------------------------------------------------
  P.offerPerk = function () {
    var self = this, pool = Object.keys(Z.PERKS).filter(function (k) { return !self.perks[k]; }), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(this.rng() * pool.length), 1)[0]);
    if (out.length) this.perkOffer = out;
  };
  P.pickPerk = function (id) {
    if (!this.perkOffer || this.perkOffer.indexOf(id) < 0) return false;
    this.perks[id] = true; this.perkOffer = null; this.stats.perks++;
    var i, u;
    if (id === 'hp') { for (i = 0; i < this.units.length; i++) { u = this.units[i]; if (u.team === 0 && !u.dead) { u.max *= 1.15; u.hp *= 1.15; } } }
    if (id === 'castle') { var b = this.base[0]; b.max *= 1.15; b.hp = Math.min(b.max, b.hp + b.max * 0.3); }
    if (id === 'loot') this.gold = Math.min(this.goldCap() + 100, this.gold + 150);
    if (id === 'skill') this.heroCd *= 0.7;
    this.emit({ type: 'perk', id: id });
    return true;
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
        if (team === 0 && this.perks.tower) dm *= 2;
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
    ai.gold += this.aiRate() * this.D.ai * dt;
    // Patron
    if (this.mode === 'campaign' && this.info.boss) {
      var times = [60, 130];
      if (ai.bossDone < times.length && this.t >= times[ai.bossDone]) {
        ai.bossDone++;
        this.spawn(1, 'knight', 1, true);
        this.emit({ type: 'boss' });
      }
    }
    if (this.rl('ambush')) { // kenar koridorlardan baskin
      var amb = [1.5, 50, 100];
      if (this.ambushIdx < amb.length && this.t >= amb[this.ambushIdx]) {
        this.ambushIdx++;
        this.spawn(1, this.ambushIdx === 2 ? 'cav' : 'spear', 0); this.spawn(1, this.ambushIdx === 2 ? 'cav' : 'spear', 2);
        this.emit({ type: 'ambush' });
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
    S.track('kills', b.stats.kills); S.track('spawns', b.stats.spawns); S.track('skills', b.stats.skills); S.track('mines', b.stats.mines); S.track('perks', b.stats.perks);
    d.stats.perks += b.stats.perks; if (b.bestCombo > d.stats.maxCombo) d.stats.maxCombo = b.bestCombo;

    if (b.mode === 'daily') {
      var dsd = d.dailySefer;
      if (r.win) {
        d.stats.wins++; S.track('wins', 1); if (r.stars === 3) S.track('threeStars', 1);
        if (!dsd.won) { dsd.won = true; d.stats.dailyWins++; out.coins = b.daily.rewardCoins; out.gems = b.daily.rewardGems; out.dailyFirst = true; }
      } else { out.coins = Math.round(b.info.rewardCoins * 0.15) + b.stats.kills; }
    } else if (b.mode === 'endless') {
      out.coins = r.wave * 25 + b.stats.kills * 2;
      out.gems = Math.floor(r.wave / 5) * 2;
      if (r.wave > d.endlessBest) { d.endlessBest = r.wave; out.newBest = true; }
    } else {
      var info = b.info;
      if (r.win) {
        d.stats.wins++; S.track('wins', 1);
        if (r.stars === 3) S.track('threeStars', 1);
        var prev = d.stars[b.level] || 0;
        out.coins = Math.round(info.rewardCoins * (1 + 0.25 * (r.stars - 1)) * (info.boss ? 1.5 : 1) * (b.rl('heavy') || b.rl('famine') ? 1.3 : 1) * b.D.coin);
        if (prev === 0 && b.diff === 0) { out.firstClear = true; out.gems += info.rewardGems; }
        if (b.diff > 0) { // Zor / Efsane: ilk kez bu kademede kazaninca elmas
          var ph = d.hardCleared[b.level] || 0;
          if (b.diff > ph) { d.hardCleared[b.level] = b.diff; out.gems += b.D.gem; out.firstHard = true; }
          if (b.diff === 1) d.stats.hardWins++; else d.stats.legendWins++;
        }
        if (r.stars > prev && b.diff === 0) { d.stats.totalStars += r.stars - prev; d.stars[b.level] = r.stars; if (prev > 0) out.gems += (r.stars - prev) * 2; }
        if (b.level > d.cleared) {
          var before = S.unlockedUnits();
          d.cleared = b.level;
          S.unlockedUnits().forEach(function (u) { if (before.indexOf(u) < 0) out.newUnits.push(u); });
        }
        // sandik
        var tier = r.stars;
        out.chest = { tier: tier, coins: Math.round(info.rewardCoins * (0.3 + 0.35 * tier) * (0.8 + b.rng() * 0.6) * b.D.coin), gems: b.rng() < 0.15 * tier ? tier : 0 };
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
