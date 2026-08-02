/* game/factory — сборка юнитов из описаний контента. */
AA.module('game/factory', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  function hero(def, level, skillLv, items) {
    var u = {
      id: M().uid(), team: 0, kind: 'hero', name: def.name, defId: def.id,
      shape: def.shape, anim: def.anim || 'heavy', c1: def.c1, c2: def.c2, r: 22,

      attr: def.attr, gain: def.gain, primary: def.primary, base: def.base,
      bonusAttr: { str: 0, agi: 0, int: 0 },

      invoker: !!def.invoker, reagents: [], invokeCds: {},

      level: level || 1, skillLv: skillLv || {}, items: items || [],
      skills: AA.Content.skills.resolve(def.skills),
      talents: {},                    // выбранные таланты по рубежам
      skin: null,                     // подставляется из ui/screens

      x: 0, y: 0, vx: 0, vy: 0, face: 0,
      atkCd: 0, cds: {}, buffs: [], toggles: {},
      flash: 0, spin: 0, swing: 0, step: 0, castFx: 0,
      dead: false, xp: 0, pts: 0
    };
    AA.Game.stats.recalc(u);
    u.hp = u.maxHp; u.mp = u.maxMp;
    return u;
  }

  function enemy(def, isBoss) {
    var w = W(), m = M();
    var scale = AA.Content.attributes.enemyScale(w.wave);
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
    AA.Game.stats.recalc(u);
    u.hp = u.maxHp;
    return u;
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

  return { hero: hero, enemy: enemy, minion: minion, dummy: dummy };
})());
