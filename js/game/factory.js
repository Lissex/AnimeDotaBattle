/* game/factory — сборка юнитов из описаний контента. */
AA.module('game/factory', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  function hero(def, level, skillLv, items) {
    var u = {
      id: M().uid(), team: 0, kind: 'hero', name: def.name, defId: def.id,
      shape: def.shape, anim: def.anim || 'heavy', c1: def.c1, c2: def.c2, r: 28,

      attr: def.attr, gain: def.gain, primary: def.primary, base: def.base,
      bonusAttr: { str: 0, agi: 0, int: 0 },

      invoker: !!def.invoker, reagents: [], invokeCds: {},

      level: level || 1, skillLv: skillLv || {}, items: items || [],
      skills: AA.Content.skills.resolve(def.skills),
      talents: {},                    // выбранные таланты по рубежам
      skin: null,                     // подставляется из ui/screens

      x: 0, y: 0, vx: 0, vy: 0, face: 0,
      atkCd: 0, cds: {}, buffs: [], toggles: {},
      chg: {}, chgT: {},              // умения с зарядами (см. game/abilities)
      flash: 0, spin: 0, swing: 0, step: 0, castFx: 0,
      dead: false, xp: 0, pts: 0
    };
    AA.Game.stats.recalc(u);
    u.hp = u.maxHp; u.mp = u.maxMp;
    return u;
  }

  /**
   * @param {object} def          описание врага из content/enemies
   * @param {boolean} isBoss
   * @param {object} [opts]       noElite: true — не навешивать элитный модификатор
   *                              (осколки делящихся врагов рождаются обычными)
   */
  function enemy(def, isBoss, opts) {
    var w = W(), m = M();
    var scale = AA.Game.run.enemyScale(w.wave);
    var u = {
      id: m.uid(), team: 1, kind: isBoss ? 'boss' : 'mob', name: def.name, defId: def.id,
      shape: def.shape, c1: def.c1, c2: def.c2, glow: def.glow || '#ff5a4a', r: def.r || 18,

      attr: null, def: def,
      base: {
        hp: (isBoss ? def.hpMul * 230 : def.hp) * scale,
        mp: 100,
        atk: (isBoss ? def.atkMul * 26 : def.atk) * scale,
        armor: def.armor + Math.floor(w.wave * .35),
        ms: def.ms, as: def.as, range: def.range,
        hpReg: 0, mpReg: 0, sp: 0, mr: .25
      },
      items: [], skillLv: {}, skills: null, level: 1,

      x: 0, y: 0, vx: 0, vy: 0, face: 0,
      magic: !!def.magic, role: def.role || null,
      atkCd: m.rnd(0, 1), cds: {}, buffs: [], toggles: {},
      flash: 0, spin: 0, swing: 0, step: m.rnd(0, 6), wob: m.rnd(0, 6.28),
      dead: false,

      isBoss: !!isBoss,
      // у каждого босса свой набор умений с отдельными перезарядками
      abilities: (def.abilities || []).map(function (a, i) {
        return { id: a.id, cd: a.cd, t: 2 + i * 1.6 };
      }),
      phase: 1, phaseAt: def.phaseAt || 0,

      gold: Math.round((isBoss ? 300 : 44) * (1 + w.wave * .16))
    };

    if (!isBoss && !(opts && opts.noElite)) maybeElite(u);

    AA.Game.stats.recalc(u);
    u.hp = u.maxHp;
    return u;
  }

  /** С некоторым шансом обычный враг становится элитным. */
  function maybeElite(u) {
    var w = W(), E = AA.Content.elites;
    if (u.role === 'dummy' || u.eliteChild) return;

    var chance = E.chanceFor(w.wave) + AA.Game.run.state.eliteChance;
    if (Math.random() > chance) return;

    var mod = E.roll();
    u.elite = mod;
    u.name = mod.name + ' · ' + u.name;
    u.r = Math.round(u.r * 1.18);
    u.base.hp *= 1.6;
    u.base.atk *= 1.25;
    u.gold = Math.round(u.gold * 3.2);

    if (mod.stats) mod.stats(u);
  }

  /* ============================================================
     ИЛЛЮЗИИ
     Копия юнита на стороне игрока. Бьёт долей урона оригинала,
     получает кратно больше, живёт ограниченное время.
     ============================================================ */

  /**
   * @param {object} src     кого копируем (герой или враг)
   * @param {object} opts    { dmgPct, takenMul, dur, invuln, owner, lockTarget }
   */
  function illusion(src, opts) {
    var w = W(), m = M();
    opts = opts || {};

    var u = {
      id: m.uid(), team: 0, kind: 'illusion',
      name: src.name, defId: src.defId,
      shape: src.shape, anim: src.anim, c1: src.c1, c2: src.c2,
      glow: src.glow, r: src.r,

      // характеристики копируются снимком, дальше живут отдельно
      attr: src.attr, gain: src.gain, primary: src.primary, base: src.base,
      bonusAttr: { str: 0, agi: 0, int: 0 },
      level: src.level, skillLv: {}, items: (src.items || []).slice(),
      skills: null,                       // иллюзии не колдуют
      skin: src.skin || null,

      x: src.x, y: src.y, vx: 0, vy: 0, face: src.face || 0,
      atkCd: m.rnd(0, .4), cds: {}, buffs: [], toggles: {},
      flash: 0, spin: 0, swing: 0, step: m.rnd(0, 6), castFx: 0,
      dead: false,

      isIllusion: true,
      dmgPct: opts.dmgPct !== undefined ? opts.dmgPct : .4,
      takenMul: opts.takenMul !== undefined ? opts.takenMul : 3,
      invuln: !!opts.invuln,
      guard: opts.guard || null,          // пока жив — иллюзия неуязвима
      lockTarget: opts.lockTarget || null,// бьёт только эту цель
      life: opts.dur || 20,
      morph: !!src.morph                  // состояние метаморфозы копируется
    };

    AA.Game.stats.recalc(u);
    u.hp = u.maxHp; u.mp = u.maxMp;
    AA.Game.world.confine(u);
    w.units.push(u);

    AA.Game.effects.burst(u.x, u.y, opts.color || '#8ab0ff', 14);
    AA.Game.effects.ring(u.x, u.y, 60, opts.color || '#8ab0ff');
    return u;
  }

  /* ============================================================
     ЭЙДОЛОНЫ
     Призванные существа на стороне игрока. Бьют магией, живут
     ограниченное время и один раз делятся надвое после серии атак.
     ============================================================ */
  /** Больше этого числа эйдолонов на поле не держим. */
  var MAX_EIDOLONS = 7;

  function countEidolons() {
    var w = W(), n = 0;
    for (var i = 0; i < w.units.length; i++) {
      if (!w.units[i].dead && w.units[i].isEidolon) n++;
    }
    return n;
  }

  function eidolon(owner, cfg, x, y) {
    var w = W(), m = M();
    if (countEidolons() >= MAX_EIDOLONS) return null;

    // потомство слабее родителя, иначе деление превращается в лавину
    var tier = cfg.tier || 0;
    var weaken = tier === 0 ? 1 : (tier === 1 ? .6 : .38);

    // урон тянется за силой заклинаний хозяина — иначе к поздним
    // волнам эйдолоны перестают что-либо значить
    var spBonus = owner && owner.stats ? 1 + owner.stats.sp / 260 : 1;

    var u = {
      id: m.uid(), team: 0, kind: 'eidolon', name: 'Эйдолон',
      shape: 'eidolon', anim: 'float',
      c1: '#7a5ae8', c2: '#1a1030', glow: '#a08aff', r: 15,

      attr: null,
      base: {
        hp: cfg.hp * weaken, mp: 0,
        atk: cfg.atk * weaken * spBonus, armor: cfg.armor * weaken,
        ms: 300, as: cfg.as || 1.0, range: 120,
        hpReg: 0, mpReg: 0, sp: 0, mr: .25
      },
      items: [], skillLv: {}, skills: null, level: 1,

      x: x, y: y, vx: 0, vy: 0, face: m.rnd(0, 6.2832),
      magic: true, atkCd: m.rnd(0, .5), cds: {}, buffs: [], toggles: {},
      flash: 0, spin: 0, swing: 0, step: m.rnd(0, 6), wob: m.rnd(0, 6.28),
      dead: false,

      isEidolon: true,
      owner: owner,
      tier: tier,                       // 0 — рождённый умением, дальше потомство
      auraSlow: cfg.auraSlow || 0,      // наследуют поле замедления хозяина
      auraR: cfg.auraR || 380,
      hits: 0,                          // атак до деления
      splitAt: cfg.splitAt || 8,
      canSplit: cfg.canSplit !== false,
      splitCfg: cfg,
      life: (cfg.dur || 30) * (tier ? .7 : 1)
    };

    AA.Game.stats.recalc(u);
    u.hp = u.maxHp;
    AA.Game.world.confine(u);
    w.units.push(u);

    AA.Game.effects.burst(u.x, u.y, '#a08aff', 12);
    return u;
  }

  /** Деление эйдолона надвое — вызывается из боя после N атак. */
  function splitEidolon(u) {
    var m = M();
    if (!u.canSplit || u.dead) return;
    u.canSplit = false;

    // потомство рождается на ступень слабее и живёт меньше
    var childCfg = {};
    for (var k in u.splitCfg) childCfg[k] = u.splitCfg[k];
    childCfg.tier = u.tier + 1;

    // талант «Бесконечное деление» разрешает детям поделиться ещё раз
    var childrenSplit = !!u.splitCfg.twice && u.tier === 0;

    var born = 0;
    for (var i = -1; i <= 1; i += 2) {
      var child = eidolon(u.owner, childCfg, u.x + i * 34, u.y + m.rnd(-20, 20));
      if (!child) continue;
      child.canSplit = childrenSplit;
      born++;
    }

    if (born) {
      AA.Game.effects.ring(u.x, u.y, 70, '#a08aff');
      u.dead = true;
    }
  }

  /** Сколько иллюзий героя сейчас на поле. */
  function countIllusions(owner) {
    var w = W(), n = 0;
    for (var i = 0; i < w.units.length; i++) {
      var u = w.units[i];
      if (!u.dead && u.isIllusion && !u.lockTarget) n++;
    }
    return n;
  }

  /** Убрать самую старую копию — когда упёрлись в лимит. */
  function dropOldestIllusion() {
    var w = W(), oldest = null;
    for (var i = 0; i < w.units.length; i++) {
      var u = w.units[i];
      if (u.dead || !u.isIllusion || u.lockTarget) continue;
      if (!oldest || u.life < oldest.life) oldest = u;
    }
    if (oldest) {
      oldest.dead = true;
      AA.Game.effects.burst(oldest.x, oldest.y, '#8ab0ff', 10);
    }
  }

  /** Прислужник, призванный боссом: слабее обычного моба, золота не даёт. */
  function minion(id, x, y) {
    var def = AA.Content.enemies.MINIONS[id];
    if (!def) return null;
    var u = enemy(def, false);
    u.gold = 0;
    u.isMinion = true;
    u.x = x; u.y = y;
    AA.Game.world.confine(u);
    AA.Game.terrain.collide(u);
    W().units.push(u);
    AA.Game.effects.ring(u.x, u.y, 44, def.glow);
    AA.Game.effects.burst(u.x, u.y, def.glow, 12);
    return u;
  }

  function dummy() {
    var def = AA.Content.enemies.DUMMY;
    var u = enemy(def, false);
    u.role = 'dummy'; u.isDummy = true; u.gold = 0;
    u.base.hp = def.hp; u.base.atk = 0; u.base.armor = 0; u.base.ms = 0;
    AA.Game.stats.recalc(u);
    u.hp = u.maxHp;
    return u;
  }

  return {
    hero: hero, enemy: enemy, minion: minion, dummy: dummy,
    illusion: illusion, countIllusions: countIllusions, dropOldestIllusion: dropOldestIllusion,
    eidolon: eidolon, splitEidolon: splitEidolon, countEidolons: countEidolons
  };
})());
