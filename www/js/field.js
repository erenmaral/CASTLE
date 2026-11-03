// Seferhan - ACIK ALAN SAVASI (2D). Serbest yerlestirme, arazi (nehir/gecit, orman, tepe, kaya), komutan, bayrak ele gecirme.
// DOM'dan bagimsizdir (Node'da test edilir). Dunya: 720 x 840; oyuncu altta (y buyuk), dusman ustte.
(function (Z) {
  'use strict';
  var FW = 720, FH = 840, ZONE_PREP = 175, ZONE_BATTLE = 100, SC = 0.8, MAXU = 60, HPX = 1.8, ENEMY_BUDGET = 1.75;
  var PRIO = { archer: 1, mage: 1, healer: 1, cata: 1, banner: 1 };
  var CMD = { cls: 'commander', hp: 650, dmg: 30, int: 0.9, range: 44, speed: 60, cost: 0, ranged: false };
  Z.FW = FW; Z.FH = FH; Z.FZONE = { prep: ZONE_PREP, battle: ZONE_BATTLE };

  // ---- Arazi uretimi (bolum numarasina gore sabit) -----------------------
  Z.fieldMap = function (level, objective) {
    var r = Z.mulberry32(level * 7919 + 13), map = { river: null, forests: [], hills: [], rocks: [], flags: [] }, i, k;
    if (objective !== 'capture' && r() < 0.6) {
      var a = 90 + r() * 140, b = 460 + r() * 120;
      map.river = { y: 385 + r() * 70, hw: 26, gaps: [{ x0: a, x1: a + 120 }, { x0: b, x1: b + 120 }] };
    }
    function free(x, y, rad) {
      if (y < 210 || y > FH - 210) return false;
      if (map.river && Math.abs(y - map.river.y) < map.river.hw + rad + 8) return false;
      var all = map.forests.concat(map.hills, map.rocks);
      for (var j = 0; j < all.length; j++) if (Math.hypot(all[j].x - x, all[j].y - y) < all[j].r + rad + 14) return false;
      return true;
    }
    function scatter(list, n, rmin, rmax, ymin, ymax) {
      for (var q = 0; q < n; q++) for (var t = 0; t < 14; t++) {
        var rad = rmin + r() * (rmax - rmin), x = 60 + r() * (FW - 120), y = ymin + r() * (ymax - ymin);
        if (free(x, y, rad)) { list.push({ x: x, y: y, r: rad }); break; }
      }
    }
    scatter(map.forests, 2 + Math.floor(r() * 3), 55, 85, 230, 610);
    scatter(map.hills, 1 + Math.floor(r() * 2), 58, 78, 260, 590);
    scatter(map.rocks, 5 + Math.floor(r() * 4), 13, 22, 230, 610);
    if (objective === 'capture') map.flags = [{ x: 150 + r() * 30, y: 410 + r() * 30 }, { x: 345 + r() * 30, y: 395 + r() * 30 }, { x: 540 + r() * 30, y: 410 + r() * 30 }];
    return map;
  };
  function inGap(map, x, m) { var g = map.river.gaps; for (var i = 0; i < g.length; i++) if (x >= g[i].x0 + (m || 0) && x <= g[i].x1 - (m || 0)) return true; return false; }
  Z.fieldBlocked = function (map, x, y, rad) { // nehir (gecit disinda) veya kaya
    if (map.river && Math.abs(y - map.river.y) < map.river.hw + rad * 0.3 && !inGap(map, x, 0)) return true;
    for (var i = 0; i < map.rocks.length; i++) if (Math.hypot(map.rocks[i].x - x, map.rocks[i].y - y) < map.rocks[i].r + rad) return true;
    return false;
  };
  function terrainAt(map, x, y) {
    var f = false, h = false, i;
    for (i = 0; i < map.forests.length; i++) if (Math.hypot(map.forests[i].x - x, map.forests[i].y - y) < map.forests[i].r) { f = true; break; }
    for (i = 0; i < map.hills.length; i++) if (Math.hypot(map.hills[i].x - x, map.hills[i].y - y) < map.hills[i].r) { h = true; break; }
    return { forest: f, hill: h };
  }
  Z.fieldTerrainAt = terrainAt;

  // ---- Savas -------------------------------------------------------------
  function FieldBattle(opts) {
    this.kind = 'field'; this.mode = opts.mode || 'campaign'; this.daily = opts.daily; this.startOpts = null;
    this.level = opts.level; this.sv = opts.save; this.deck = opts.deck.slice(); this.heroId = opts.hero || 'aslan';
    this.rng = Z.mulberry32(opts.seed || ((Date.now() & 0x7fffffff) || 1));
    this.info = Z.levelInfo(this.level); this.diff = opts.diff || 0; this.D = Z.DIFFS[this.diff];
    this.rules = (opts.rules || [this.info.rule]).filter(function (r) { return r && r !== 'none'; }); this.rule = this.rules[0] || 'none';
    this.theme = opts.theme !== undefined ? opts.theme : this.info.realm;
    this.objective = Z.fieldObjective(this.level, this.rules);
    this.map = Z.fieldMap(this.level, this.objective);
    this.W = FW; this.H = FH;
    this.t = 0; this.over = false; this.result = null; this.units = []; this.projs = []; this.events = []; this.nextId = 1;
    this.phase = 'prep'; this.budget0 = Z.fieldBudget(this.level); this.gold = this.budget0; this.mine = 0;
    this.cooldown = {}; this.deck.forEach(function (u) { this.cooldown[u] = 0; }, this);
    this.heroCd = Z.HEROES[this.heroId].cd * 0.4; this.roarUntil = 0; this.stance = 'attack';
    this.perks = {}; this.perkIdx = 0; this.perkOffer = null;
    this.stats = { kills: 0, spawns: 0, skills: 0, mines: 0, lost: 0, perks: 0 };
    this.combo = 0; this.comboT = 0; this.bestCombo = 0; this.valueDeployed = 0; this.valueLost = 0;
    this.scores = { p: 0, e: 0 }; this.flags = this.map.flags.map(function (f) { return { x: f.x, y: f.y, r: 62, prog: 0 }; });
    this.ai = { gold: 0, think: 3, ambushIdx: 0 };
    this.cmdP = this.spawnCommander(0, FW / 2, FH - 42); this.cmdE = this.spawnCommander(1, FW / 2, 46);
    this.genEnemyArmy();
  }
  Z.FieldBattle = FieldBattle;
  var P = FieldBattle.prototype;
  P.rl = function (n) { return this.rules.indexOf(n) >= 0; };
  P.emit = function (e) { e.field = true; this.events.push(e); };
  P.drain = function () { var e = this.events; this.events = []; return e; };
  P.buffed = function () { return this.roarUntil > this.t; };
  P.enemyScale = function () { return this.info.scale; };
  P.income = function () { return Z.mineIncome(this.mine) * 0.8 * (this.perks.gold ? 1.25 : 1) * (this.rl('rich') ? 1.3 : this.rl('famine') ? 0.8 : 1); };
  P.goldCap = function () { return Z.mineCap(this.mine); };
  P.mineCost = function () { return this.mine < Z.MINE_COSTS.length ? Z.MINE_COSTS[this.mine] : null; };
  P.aiRate = function () { return this.info.aiRate * 0.8 * this.D.ai; };
  P.countTeam = function (team) { var n = 0; for (var i = 0; i < this.units.length; i++) if (this.units[i].team === team && !this.units[i].dead) n++; return n; };
  P.skillReady = function () { return !this.over && this.phase === 'battle' && this.heroCd <= 0; };

  // ---- birim olusturma ----
  P.spawn = function (team, type, x, y, boss) {
    var def = type === 'commander' ? CMD : Z.UNITS[type], hpM, dmgM;
    if (team === 0) { var lvl = this.sv.unitLvl[type] || 1; hpM = Z.unitHpMult(lvl); dmgM = Z.unitDmgMult(lvl); if (this.perks.hp) hpM *= 1.15; }
    else { var s = this.enemyScale(), late = 1 + 0.011 * Math.max(0, this.level - 20); hpM = s * late * (this.rl('heavy') ? 1.2 : 1) * (this.rl('fortress') ? 1.25 : 1) * this.D.hp; dmgM = (1 + (s - 1) * 0.8) * (1 + (late - 1) * 0.6) * this.D.dmg; }
    hpM *= HPX; // acik alanda savaslar daha uzun ve taktiksel sursun
    if (boss) { hpM *= 3; dmgM *= 1.15; }
    var u = {
      id: this.nextId++, team: team, type: type, cls: def.cls, x: x, y: y, boss: !!boss, commander: type === 'commander', cost: def.cost || 0,
      hp: def.hp * hpM, max: def.hp * hpM, dmg: def.dmg * dmgM, int: def.int, speed: def.speed * SC, range: def.range * SC, ranged: !!def.ranged,
      aoe: (def.aoe || 0) * SC, minRange: (def.minRange || 0) * SC, splash: (def.splash || 0) * SC, heal: !!def.heal, aura: !!def.aura, assassin: def.cls === 'assassin', flame: !!def.flame,
      r: def.cls === 'cav' ? 15 : def.cls === 'cata' ? 17 : def.cls === 'golem' ? 20 : type === 'commander' ? 17 : 13, atkCd: def.int * 0.5, atkAnim: 0, flash: 0, age: 0, dead: false, charged: false,
      stunUntil: 0, wardUntil: 0, burnUntil: 0, burnDps: 0, burnTick: 0, moving: false, facing: team === 0 ? -Math.PI / 2 : Math.PI / 2
    };
    if (type === 'commander') {
      if (team === 0) { var hl = this.sv.heroLvl[this.heroId] || 1; u.max = u.hp = CMD.hp * (1 + 0.1 * (hl - 1)) * (Z.castleHp(this.sv.castleLvl || 1) / 1500); u.dmg = CMD.dmg * (1 + 0.06 * (hl - 1)); }
      else { var sc = this.enemyScale(); u.max = u.hp = CMD.hp * 1.4 * sc * (this.rl('heavy') ? 1.2 : 1) * this.D.hp; u.dmg = CMD.dmg * (1 + (sc - 1) * 0.8) * this.D.dmg; }
    }
    this.units.push(u); this.emit({ type: 'spawn', unit: u, x: x, y: y });
    return u;
  };
  P.spawnCommander = function (team, x, y) { return this.spawn(team, 'commander', x, y); };

  // ---- dusman ordusu: butceye gore, cephe/menzil/destek sirasi ----
  P.genEnemyArmy = function () {
    var info = this.info, tiers = info.tiers, rng = this.rng, budget = Z.fieldBudget(this.level) * Math.min(2.7, Math.min(ENEMY_BUDGET, 0.95 + 0.07 * (this.level - 3)) + 0.014 * Math.max(0, this.level - 25)) * (1 + 0.12 * this.diff), picks = [], i;
    var melee = tiers.filter(function (t) { return ['spear', 'knight', 'cav', 'golem', 'assassin'].indexOf(t) >= 0; });
    var ranged = tiers.filter(function (t) { return ['archer', 'mage', 'cata', 'flamer'].indexOf(t) >= 0; });
    var support = tiers.filter(function (t) { return ['healer', 'banner'].indexOf(t) >= 0; });
    var guard = 0;
    while (budget >= 50 && picks.length < 40 && guard++ < 200) {
      var r = rng(), pool = r < 0.52 ? melee : r < 0.86 ? ranged : support; if (!pool.length) pool = melee;
      var t = pool[Math.floor(rng() * pool.length)], c = Z.UNITS[t].cost;
      if (c > budget) { if (budget < 60) break; continue; }
      budget -= c; picks.push(t);
    }
    var rows = { front: [], mid: [], back: [] };
    picks.forEach(function (t) { var cls = Z.UNITS[t].cls; (['spear', 'knight', 'cav', 'golem', 'assassin'].indexOf(t) >= 0 ? rows.front : (t === 'healer' || t === 'banner') ? rows.back : rows.mid).push(t); });
    var place = function (list, y) { list.forEach(function (t, k) { var n = list.length, x = 60 + (k + 0.5) * (FW - 120) / n + (rng() - 0.5) * 18; this.spawn(1, t, x, y + (rng() - 0.5) * 14); }, this); };
    place.call(this, rows.front, 168); place.call(this, rows.mid, 118); place.call(this, rows.back, 78);
    if (Z.isBoss(this.level)) this.spawn(1, 'knight', FW / 2, 150, true);
    this.events = []; // hazirlik sirasinda olay yagmuru olmasin
  };

  // ---- yerlestirme (hazirlik ve takviye) ----
  P.blocked = function (x, y, rad) { return Z.fieldBlocked(this.map, x, y, rad); };
  P.canPlace = function (x, y) {
    if (x < 24 || x > FW - 24) return false;
    var top = this.phase === 'prep' ? FH - ZONE_PREP : FH - ZONE_BATTLE;
    return y >= top && y <= FH - 18 && !this.blocked(x, y, 14);
  };
  P.canDeploy = function (type) {
    var def = Z.UNITS[type];
    if (this.over || !def || this.cooldown[type] === undefined || this.gold < def.cost) return false;
    return this.phase === 'prep' ? true : this.cooldown[type] <= 0;
  };
  P.place = function (type, x, y) {
    if (this.over || this.perkOffer || !this.canDeploy(type) || !this.canPlace(x, y) || this.countTeam(0) >= MAXU) return null;
    var def = Z.UNITS[type]; this.gold -= def.cost;
    if (this.phase === 'battle') this.cooldown[type] = def.cd * (this.perks.cd ? 0.75 : 1) * (this.rl('fortress') ? 0.85 : 1);
    var u = this.spawn(0, type, x, y); this.stats.spawns++; this.valueDeployed += def.cost;
    return u;
  };
  P.unitAt = function (x, y, rad) {
    var best = null, bd = rad || 22;
    for (var i = 0; i < this.units.length; i++) { var u = this.units[i]; if (u.team !== 0 || u.dead) continue; var d = Math.hypot(u.x - x, u.y - y); if (d < bd) { bd = d; best = u; } }
    return best;
  };
  P.removeUnit = function (id) { // yalnizca hazirlikta: iade
    if (this.phase !== 'prep') return false;
    for (var i = 0; i < this.units.length; i++) { var u = this.units[i]; if (u.id === id && u.team === 0 && !u.commander) { this.gold += u.cost; this.valueDeployed -= u.cost; this.stats.spawns--; this.units.splice(i, 1); return true; } }
    return false;
  };
  P.moveUnit = function (id, x, y) {
    if (this.phase !== 'prep' || !this.canPlace(x, y)) return false;
    for (var i = 0; i < this.units.length; i++) { var u = this.units[i]; if (u.id === id && u.team === 0) { u.x = x; u.y = y; return true; } }
    return false;
  };
  // Otomatik dizilis: on safta yakin dovusu, arkaya menzilliler/destek
  P.autoPlace = function () {
    var self = this, i;
    this.units.filter(function (u) { return u.team === 0 && !u.commander; }).forEach(function (u) { self.removeUnit(u.id); });
    var FRONT = ['spear', 'knight', 'golem', 'cav', 'assassin', 'banner'], deck = this.deck.slice(), list = [];
    var minCost = Math.min.apply(null, deck.map(function (t) { return Z.UNITS[t].cost; })), k = 0, guard = 0;
    while (this.gold >= minCost && list.length < 40 && guard++ < 300) {
      var t = deck[k++ % deck.length], c = Z.UNITS[t].cost;
      if (c <= this.gold) { this.gold -= c; list.push(t); this.valueDeployed += c; this.stats.spawns++; }
    }
    var front = list.filter(function (t) { return FRONT.indexOf(t) >= 0; }), rear = list.filter(function (t) { return FRONT.indexOf(t) < 0; });
    var put = function (arr, y) { arr.forEach(function (t, j) { var n = arr.length, x = 56 + (j + 0.5) * (FW - 112) / n; self.spawn(0, t, x, y); }); };
    put(front, FH - ZONE_PREP + 38); put(rear, FH - 62);
    this.events = [];
    return list.length;
  };
  P.startBattle = function () {
    if (this.phase !== 'prep') return false;
    this.phase = 'battle'; this.gold = Math.min(this.goldCap(), 60 + this.gold * 0.5); this.emit({ type: 'start' });
    return true;
  };

  // ---- hasar ----
  P.damage = function (target, dmg, srcCls, isRanged, ignoreMult) {
    var m = 1;
    if (!ignoreMult) {
      var tbl = Z.BONUS[srcCls]; if (tbl && tbl[target.cls]) m *= tbl[target.cls];
      if (target.cls === 'knight' && isRanged && srcCls !== 'mage') m *= 0.7;
      if (isRanged && terrainAt(this.map, target.x, target.y).forest) m *= 0.75; // ormanda siper
    }
    if (target.wardUntil > this.t) m *= 0.5;
    var d = dmg * m; target.hp -= d; target.flash = 0.12;
    this.emit({ type: 'hit', x: target.x, y: target.y, dmg: d, strong: m > 1.2, team: target.team });
    if (target.hp <= 0 && !target.dead) this.kill(target);
  };
  P.kill = function (u) {
    u.dead = true; this.emit({ type: 'death', x: u.x, y: u.y, team: u.team, utype: u.type, boss: u.boss || u.commander });
    if (u.team === 1) {
      if (!u.commander) {
        this.stats.kills++; this.comboT = 3; this.combo++; if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        var g = Math.round(Z.UNITS[u.type].cost * 0.4 * (u.boss ? 4 : 1) * (1 + 0.05 * Math.min(this.combo, 10)) * (this.rl('famine') ? 1.5 : 1));
        this.gold = Math.min(this.goldCap() + 100, this.gold + g); this.emit({ type: 'coin', x: u.x, y: u.y, v: g });
      }
    } else { this.stats.lost++; this.valueLost += u.cost; }
    if (u.commander) this.finish(u.team === 1);
  };
  P.healUnit = function (healer, target) {
    var amt = healer.dmg * (healer.team === 0 && this.perks.dmg ? 1.15 : 1);
    healer.atkCd = healer.int; healer.atkAnim = 0.25; target.hp = Math.min(target.max, target.hp + amt);
    this.emit({ type: 'heal', x: target.x, y: target.y, v: amt, team: healer.team });
  };
  P.ignite = function (e, dps, dur) { if (!e.dead) { e.burnUntil = Math.max(e.burnUntil, this.t + dur); e.burnDps = Math.max(e.burnDps, dps); } };
  P.foesNear = function (team, x, y, rad) {
    var out = []; for (var i = 0; i < this.units.length; i++) { var e = this.units[i]; if (e.team !== team && !e.dead && Math.hypot(e.x - x, e.y - y) <= rad + e.r * 0.5) out.push(e); }
    return out;
  };
  P.auraNear = function (u) {
    for (var i = 0; i < this.units.length; i++) { var b = this.units[i]; if (b.aura && b !== u && !b.dead && b.team === u.team && Math.hypot(b.x - u.x, b.y - u.y) <= 130) return true; }
    return false;
  };

  // ---- saldiri ----
  P.attack = function (u, tgt, d) {
    var buff = u.team === 0 && this.buffed(), hill = terrainAt(this.map, u.x, u.y).hill;
    u.atkCd = u.int / (buff ? 1.35 : 1); u.atkAnim = 0.25;
    var dmg = u.dmg * (buff ? 1.35 : 1) * (hill ? 1.1 : 1);
    if (u.team === 0 && this.perks.dmg) dmg *= 1.15;
    if (this.auraNear(u)) dmg *= 1.2;
    if (u.cls === 'cav' && !u.charged) { u.charged = true; dmg *= 2; this.emit({ type: 'charge', x: u.x, y: u.y }); }
    var i, e;
    if (u.ranged) {
      this.projs.push({ team: u.team, cls: u.cls, kind: u.cls === 'cata' ? 'rock' : (u.cls === 'mage' ? 'bolt' : 'arrow'), x: u.x, y: u.y, sx: u.x, sy: u.y, tx: tgt.x, ty: tgt.y, target: tgt, dmg: dmg, aoe: u.aoe, speed: u.cls === 'cata' ? 300 : u.cls === 'mage' ? 360 : 520 });
      this.emit({ type: 'shoot', x: u.x, y: u.y, cls: u.cls });
    } else if (u.flame) {
      var ang = Math.atan2(tgt.y - u.y, tgt.x - u.x), foes = this.foesNear(u.team, u.x, u.y, u.range + 12);
      for (i = 0; i < foes.length; i++) {
        e = foes[i]; var da = Math.abs(Math.atan2(e.y - u.y, e.x - u.x) - ang); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > 0.55) continue;
        this.damage(e, e === tgt ? dmg : dmg * 0.6, u.cls, false); this.ignite(e, dmg * 0.9, 3);
      }
      this.emit({ type: 'flame', x: u.x, y: u.y, tx: tgt.x, ty: tgt.y, team: u.team });
    } else {
      this.damage(tgt, dmg, u.cls, false);
      if (u.splash) { var near = this.foesNear(u.team, tgt.x, tgt.y, u.splash); for (i = 0; i < near.length; i++) if (near[i] !== tgt) this.damage(near[i], dmg * 0.6, u.cls, false); this.emit({ type: 'boom', x: tgt.x, y: tgt.y, r: u.splash / SC, cls: 'golem' }); }
    }
  };
  P.updateProjectiles = function (dt) {
    var keep = [], i;
    for (i = 0; i < this.projs.length; i++) {
      var p = this.projs[i];
      if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
      var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = p.speed * dt;
      if (d <= step + 3) this.impact(p); else { p.x += dx / d * step; p.y += dy / d * step; keep.push(p); }
    }
    this.projs = keep;
  };
  P.impact = function (p) {
    var i, e;
    if (p.aoe) {
      this.emit({ type: 'boom', x: p.tx, y: p.ty, r: p.aoe / SC, cls: p.cls });
      for (i = 0; i < this.units.length; i++) { e = this.units[i]; if (e.team !== p.team && !e.dead) { var d = Math.hypot(e.x - p.tx, e.y - p.ty); if (d <= p.aoe + e.r * 0.5) this.damage(e, p.dmg * (1 - 0.4 * Math.min(1, d / p.aoe)), p.cls, p.cls !== 'mage'); } }
      return;
    }
    if (p.target && !p.target.dead && Math.hypot(p.target.x - p.tx, p.target.y - p.ty) < 30) { this.damage(p.target, p.dmg, p.cls, true); return; }
    for (i = 0; i < this.units.length; i++) { e = this.units[i]; if (e.team !== p.team && !e.dead && Math.hypot(e.x - p.tx, e.y - p.ty) < 22) { this.damage(e, p.dmg, p.cls, true); return; } }
  };

  // ---- kahraman yetenegi (noktaya) ----
  P.useSkill = function (x, y) {
    if (!this.skillReady()) return false;
    var hero = Z.HEROES[this.heroId], pw = Z.heroPower(this.sv.heroLvl[this.heroId] || 1), i, e, R = 130, list;
    if (hero.target !== 'none' && !(x >= 0 && x <= FW && y >= 0 && y <= FH)) return false;
    if (hero.type === 'roar') this.roarUntil = this.t + 8;
    else if (hero.type === 'bolt') {
      list = this.foesNear(0, x, y, 150).sort(function (a, b) { return Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y); }).slice(0, 5);
      for (i = 0; i < list.length; i++) { this.emit({ type: 'bolt', x: list[i].x, y: list[i].y }); this.damage(list[i], 190 * pw, 'bolt', false, true); }
    } else if (hero.type === 'ward') {
      for (i = 0; i < this.units.length; i++) { e = this.units[i]; if (e.team === 0 && !e.dead && Math.hypot(e.x - x, e.y - y) <= R) { e.hp = Math.min(e.max, e.hp + e.max * 0.35 * pw); e.wardUntil = this.t + 6; } }
    } else if (hero.type === 'freeze') {
      list = this.foesNear(0, x, y, R); for (i = 0; i < list.length; i++) { list[i].stunUntil = this.t + Math.min(6, 3.5 * pw); this.emit({ type: 'freeze', x: list[i].x, y: list[i].y }); this.damage(list[i], 55 * pw, 'freeze', false, true); }
    } else if (hero.type === 'dragon') {
      list = this.foesNear(0, x, y, R); for (i = 0; i < list.length; i++) { this.ignite(list[i], Math.max(list[i].max * 0.05 * pw, 6), 6); this.emit({ type: 'burn', x: list[i].x, y: list[i].y }); this.damage(list[i], 40 * pw, 'dragon', false, true); }
    }
    this.heroCd = hero.cd * (this.perks.skill ? 0.7 : 1); this.stats.skills++;
    this.emit({ type: 'skill', kind: hero.type, x: x, y: y, r: R });
    return true;
  };
  P.upgradeMine = function () {
    var c = this.mineCost(); if (this.over || c === null || this.gold < c || this.phase !== 'battle') return false;
    this.gold -= c; this.mine++; this.stats.mines++; this.emit({ type: 'mine', level: this.mine }); return true;
  };
  P.setStance = function (s) { this.stance = s === 'defend' ? 'defend' : 'attack'; };

  // ---- ganimet (savas ici guc) ----
  P.offerPerk = function () {
    var self = this, pool = Object.keys(Z.PERKS).filter(function (k) { return !self.perks[k] && k !== 'castle' && k !== 'tower'; }), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(this.rng() * pool.length), 1)[0]);
    if (out.length) this.perkOffer = out;
  };
  P.pickPerk = function (id) {
    if (!this.perkOffer || this.perkOffer.indexOf(id) < 0) return false;
    this.perks[id] = true; this.perkOffer = null; this.stats.perks++;
    if (id === 'hp') this.units.forEach(function (u) { if (u.team === 0 && !u.dead) { u.max *= 1.15; u.hp *= 1.15; } });
    if (id === 'loot') this.gold = Math.min(this.goldCap() + 100, this.gold + 150);
    if (id === 'skill') this.heroCd *= 0.7;
    this.emit({ type: 'perk', id: id });
    return true;
  };

  // ---- ana dongu ----
  P.update = function (dtRaw) {
    if (this.over || this.perkOffer || this.phase !== 'battle') return;
    var dt = Math.min(dtRaw, 0.05), i, u;
    this.t += dt;
    this.gold = Math.min(this.goldCap(), this.gold + this.income() * dt);
    for (var k in this.cooldown) if (this.cooldown[k] > 0) this.cooldown[k] = Math.max(0, this.cooldown[k] - dt);
    if (this.heroCd > 0) this.heroCd = Math.max(0, this.heroCd - dt);
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    this.updateAI(dt);
    var cen = this.centroids();
    for (i = 0; i < this.units.length; i++) if (!this.units[i].dead) this.stepUnit(this.units[i], dt, cen);
    this.updateProjectiles(dt);
    for (i = 0; i < this.units.length; i++) { // yanma
      u = this.units[i];
      if (!u.dead && u.burnUntil > this.t) { u.burnTick -= dt; if (u.burnTick <= 0) { u.burnTick = 0.5; u.hp -= u.burnDps * 0.5 * (u.wardUntil > this.t ? 0.5 : 1); this.emit({ type: 'burn', x: u.x, y: u.y }); if (u.hp <= 0) this.kill(u); } }
    }
    var regen = (this.perks.regen ? 0.015 : 0) + (this.rl('rally') ? 0.01 : 0);
    if (regen) for (i = 0; i < this.units.length; i++) { u = this.units[i]; if (u.team === 0 && !u.dead) u.hp = Math.min(u.max, u.hp + u.max * regen * dt); }
    this.updateFlags(dt);
    this.units = this.units.filter(function (x) { return !x.dead; });
    if (this.over) return;
    if (this.objective === 'capture') { if (this.scores.p >= 100) this.finish(true); else if (this.scores.e >= 100) this.finish(false); }
    if (!this.over && this.objective === 'survive' && this.t >= this.info.surviveTime) this.finish(true);
    if (!this.over && this.t >= 480) this.finish(false);
    if (!this.over && this.perkIdx < Z.PERK_KILLS.length && this.stats.kills >= Z.PERK_KILLS[this.perkIdx]) { this.perkIdx++; this.offerPerk(); }
  };
  P.centroids = function () {
    var s = [{ x: 0, y: 0, n: 0 }, { x: 0, y: 0, n: 0 }], i, u;
    for (i = 0; i < this.units.length; i++) { u = this.units[i]; if (u.dead || u.heal || u.aura || u.commander) continue; s[u.team].x += u.x; s[u.team].y += u.y; s[u.team].n++; }
    return s.map(function (c, t) { return c.n ? { x: c.x / c.n, y: c.y / c.n, n: c.n } : { x: FW / 2, y: t === 0 ? FH - 120 : 120, n: 0 }; });
  };
  P.updateFlags = function (dt) {
    for (var f = 0; f < this.flags.length; f++) {
      var fl = this.flags[f], cp = 0, ce = 0;
      for (var i = 0; i < this.units.length; i++) { var u = this.units[i]; if (u.dead || Math.hypot(u.x - fl.x, u.y - fl.y) > fl.r) continue; if (u.team === 0) cp++; else ce++; }
      if (cp !== ce) fl.prog = Math.max(-1, Math.min(1, fl.prog + (cp - ce) / Math.max(cp, ce) * Math.min(3, Math.abs(cp - ce)) * 0.1 * dt));
      if (fl.prog >= 0.55) this.scores.p += 0.85 * dt; else if (fl.prog <= -0.55) this.scores.e += 0.85 * dt;
    }
  };

  // ---- dusman yapay zekasi: takviye ----
  P.updateAI = function (dt) {
    var ai = this.ai, i;
    ai.gold += this.aiRate() * dt;
    if (this.rl('ambush')) { // yanlardan baskin
      var amb = [2, 50, 100];
      if (ai.ambushIdx < amb.length && this.t >= amb[ai.ambushIdx]) {
        var ty = ai.ambushIdx === 1 ? 'cav' : 'spear'; ai.ambushIdx++;
        for (i = 0; i < 3; i++) { this.spawn(1, ty, i % 2 ? 26 : FW - 26, FH / 2 - 60 + i * 30); }
        this.emit({ type: 'ambush' });
      }
    }
    ai.think -= dt; if (ai.think > 0) return;
    ai.think = 2.2 + this.rng() * 1.4;
    if (this.countTeam(1) >= MAXU) return;
    var tiers = this.info.tiers, cls = {}, dom = null, dv = 0, u;
    for (i = 0; i < this.units.length; i++) { u = this.units[i]; if (u.team === 0 && !u.dead) cls[u.cls] = (cls[u.cls] || 0) + u.hp; }
    for (var c in cls) if (cls[c] > dv) { dv = cls[c]; dom = c; }
    var type = (dom && this.rng() < 0.65 && tiers.indexOf(Z.COUNTER[dom]) >= 0) ? Z.COUNTER[dom] : tiers[Math.floor(this.rng() * tiers.length)];
    var cost = Z.UNITS[type].cost; if (ai.gold < cost) { type = tiers[0]; cost = Z.UNITS[type].cost; if (ai.gold < cost) return; }
    ai.gold -= cost; this.spawn(1, type, 60 + this.rng() * (FW - 120), 24 + this.rng() * 50);
  };

  // ---- birim adimi: hedef secimi + 2D hareket (birbirini gecebilir) ----
  P.stepUnit = function (u, dt, cen) {
    u.age += dt; u.atkCd -= dt; if (u.flash > 0) u.flash -= dt; if (u.atkAnim > 0) u.atkAnim -= dt;
    if (u.stunUntil > this.t) { u.moving = false; return; }
    var i, o, dx, dy, d, best = null, bd = 1e9, pBest = null, pd = 1e9, hurt = null, hr = 2, sx = 0, sy = 0, ally = null, ad = 1e9;
    for (i = 0; i < this.units.length; i++) {
      o = this.units[i]; if (o === u || o.dead) continue;
      dx = o.x - u.x; dy = o.y - u.y; d = Math.sqrt(dx * dx + dy * dy);
      if (o.team !== u.team) {
        if (!(u.minRange && d < u.minRange) && d < bd) { bd = d; best = o; }
        if (u.assassin && PRIO[o.cls] && d < pd) { pd = d; pBest = o; }
      } else {
        if (u.heal && o.hp < o.max && d < 330) { var rr = o.hp / o.max; if (rr < hr) { hr = rr; hurt = o; } }
        if (d < ad && dx * Math.cos(u.facing) + dy * Math.sin(u.facing) > 0) { ad = d; ally = o; }
      }
      var rad = u.r + o.r + 3;
      if (d < rad && d > 0.01) { var w = o.team === u.team ? 0.7 : (u.assassin ? 0 : 1), push = (rad - d) / rad * w; sx -= dx / d * push; sy -= dy / d * push; }
    }
    var tgt = u.heal ? hurt : (u.assassin && pBest && pd < 460 ? pBest : best);
    var aggro = 1e9;
    if (u.team === 0 && this.stance === 'defend') aggro = 215;
    if (u.commander) aggro = 175; // komutanlar yerinde durur, yalnizca yaklasana karsilik verir
    if (!u.heal && tgt && bd > aggro) tgt = null;
    var terr = terrainAt(this.map, u.x, u.y), rng = u.range * (terr.hill ? 1.2 : 1);
    var mx = 0, my = 0, goal = null;
    if (tgt) {
      d = Math.hypot(tgt.x - u.x, tgt.y - u.y);
      var reach = rng + tgt.r * 0.5 + (u.ranged ? 0 : u.r * 0.4);
      if (u.heal) reach = rng * 0.9;
      if (d <= reach) {
        u.moving = false; u.facing = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        if (u.atkCd <= 0) { if (u.heal) this.healUnit(u, tgt); else this.attack(u, tgt, d); }
        if (sx || sy) { u.x += sx * 22 * dt; u.y += sy * 22 * dt; }
        return;
      }
      goal = tgt;
    } else if (u.heal || u.aura) { // sifaci/sancaktar: ordunun agirlik merkezini izler, dusmandan uzak durur
      var c0 = cen[u.team]; goal = { x: c0.x + (u.team === 0 ? 30 : -30), y: c0.y + (u.team === 0 ? 40 : -40), r: 0 };
      if (Math.hypot(goal.x - u.x, goal.y - u.y) < 30) goal = null;
    } else if (best && !(u.team === 0 && this.stance === 'defend') && !u.commander) goal = best;
    if (!goal) { u.moving = false; if (sx || sy) { u.x += sx * 22 * dt; u.y += sy * 22 * dt; } return; }

    var gx = goal.x, gy = goal.y, rv = this.map.river;
    if (rv && (u.y < rv.y) !== (gy < rv.y) && Math.abs(u.y - rv.y) < 230) { // karsi yakadaki hedef: en yakin gecide
      var g0 = rv.gaps[0], g1 = rv.gaps[1], c0x = (g0.x0 + g0.x1) / 2, c1x = (g1.x0 + g1.x1) / 2;
      var gcx = Math.abs(u.x - c0x) < Math.abs(u.x - c1x) ? c0x : c1x;
      if (!(Math.abs(u.y - rv.y) < rv.hw + 14 && inGap(this.map, u.x, 6))) { gx = gcx; gy = rv.y + (u.y < rv.y ? -(rv.hw + 10) : (rv.hw + 10)); if (Math.abs(u.x - gcx) < 16 && Math.abs(u.y - gy) < 22) { gx = goal.x; gy = goal.y; } }
    }
    var ddx = gx - u.x, ddy = gy - u.y, dl = Math.hypot(ddx, ddy) || 1; ddx /= dl; ddy /= dl;
    if (ally && ad < u.r + ally.r + 9 && (ally.speed < u.speed || !ally.moving)) { // onunde yavas dost: yandan gec
      var side = (u.id % 2 ? 1 : -1) * 0.95, cs = Math.cos(side), sn = Math.sin(side), rx = ddx * cs - ddy * sn, ry = ddx * sn + ddy * cs; ddx = rx; ddy = ry;
    }
    var sp = u.speed * (this.rl('swift') ? 1.25 : 1) * (terr.forest ? 0.65 : terr.hill ? 0.9 : 1);
    var nx = u.x + (ddx * sp + sx * 60) * dt, ny = u.y + (ddy * sp + sy * 60) * dt;
    if (rv && Math.abs(ny - rv.y) < rv.hw && !inGap(this.map, nx, 0)) { // nehir: gecit disinda girilemez
      if (Math.abs(u.y - rv.y) >= rv.hw) ny = u.y; else ny = u.y > rv.y ? rv.y + rv.hw : rv.y - rv.hw;
    }
    for (i = 0; i < this.map.rocks.length; i++) { var rk = this.map.rocks[i], rd = Math.hypot(nx - rk.x, ny - rk.y); if (rd < rk.r + u.r && rd > 0.01) { nx = rk.x + (nx - rk.x) / rd * (rk.r + u.r); ny = rk.y + (ny - rk.y) / rd * (rk.r + u.r); } }
    nx = Math.max(u.r, Math.min(FW - u.r, nx)); ny = Math.max(u.r, Math.min(FH - u.r, ny));
    var mvx = nx - u.x, mvy = ny - u.y;
    if (mvx * mvx + mvy * mvy > 0.0004) u.facing = Math.atan2(mvy, mvx);
    u.x = nx; u.y = ny; u.moving = true;
  };

  // ---- bitis ----
  P.finish = function (win) {
    if (this.over) return;
    this.over = true;
    var pct = 1 - Math.min(1, this.valueLost / Math.max(1, this.valueDeployed)), stars = win ? (pct >= 0.65 ? 3 : pct >= 0.35 ? 2 : 1) : 0;
    this.result = { win: win, stars: stars, basePct: pct, time: this.t, kills: this.stats.kills, wave: 0 };
    this.emit({ type: win ? 'win' : 'lose' });
  };
})(globalThis.Z = globalThis.Z || {});
