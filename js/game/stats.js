/* game/stats — пересчёт характеристик юнита.
   Порядок: атрибуты → предметы → пассивные умения → баффы → лимиты. */
AA.module('game/stats', (function () {
  'use strict';

  var FLAT = ['atk', 'armor', 'ms', 'range', 'hpReg', 'mpReg', 'sp', 'crit', 'lifesteal', 'cdr', 'hp', 'mp'];

  function W_hero() { return AA.Game.world.state.hero; }

  function blank() {
    return {
      str: 0, agi: 0, int: 0,
      hp: 1, mp: 0, atk: 0, armor: 0, ms: 200, as: 1, asMul: 1, range: 60,
      hpReg: 0, mpReg: 0, sp: 0, mr: .25, crit: 0, critMult: 1.7, lifesteal: 0, cdr: 0
    };
  }

  function collectItems(u) {
    var add = { asPct: 0, mr: 0, critMult: 0, str: 0, agi: 0, int: 0 }, i, k;
    for (i = 0; i < FLAT.length; i++) add[FLAT[i]] = 0;
    for (i = 0; i < u.items.length; i++) {
      var s = u.items[i].s;
      for (k in s) {
        if (k === 'critMult') add.critMult = Math.max(add.critMult, s[k]);
        else if (add[k] !== undefined) add[k] += s[k];
      }
    }
    return add;
  }

  function recalc(u) {
    var M = AA.Core.math;
    var A = AA.Content.attributes.ATTR;
    var s = blank(), add = collectItems(u), i;

    if (u.attr) {
      /* ---------- герой: всё считается от атрибутов ---------- */
      var lv = u.level - 1, gain = u.gain || {};
      var str = u.attr.str + (gain.str || 0) * lv + (u.bonusAttr.str || 0) + add.str;
      var agi = u.attr.agi + (gain.agi || 0) * lv + (u.bonusAttr.agi || 0) + add.agi;
      var int_ = u.attr.int + (gain.int || 0) * lv + (u.bonusAttr.int || 0) + add.int;
      var prim = u.primary === 'str' ? str : u.primary === 'agi' ? agi : int_;

      s.str = str; s.agi = agi; s.int = int_;
      s.hp = A.BASE_HP + str * A.HP_PER_STR + add.hp;
      s.mp = A.BASE_MP + int_ * A.MP_PER_INT + add.mp;
      s.hpReg = A.BASE_HPREG + str * A.HPREG_PER_STR + add.hpReg;
      s.mpReg = A.BASE_MPREG + int_ * A.MPREG_PER_INT + add.mpReg;
      s.armor = u.base.armor + agi * A.ARMOR_PER_AGI + add.armor;
      s.sp = int_ * A.SP_PER_INT + add.sp;
      s.atk = u.base.atk + prim * A.DMG_PER_PRIMARY + add.atk;
      s.as = u.base.as * (1 + agi * A.AS_PER_AGI);
      s.ms = u.base.ms + add.ms;
      s.range = u.base.range + add.range;
      s.mr = u.base.mr + add.mr;
    } else {
      /* ---------- моб: плоские значения из описания ---------- */
      var b = u.base;
      s.hp = b.hp + add.hp; s.mp = b.mp || 100;
      s.atk = b.atk + add.atk; s.armor = b.armor + add.armor;
      s.ms = b.ms + add.ms; s.as = b.as; s.range = b.range + add.range;
      s.hpReg = b.hpReg || 0; s.mpReg = b.mpReg || 0; s.sp = b.sp || 0; s.mr = b.mr;
    }

    s.as *= (1 + add.asPct / 100);
    s.crit += add.crit;
    s.critMult = Math.max(s.critMult, add.critMult);
    s.lifesteal += add.lifesteal;
    s.cdr += add.cdr;

    /* ---------- пассивные умения ---------- */
    if (u.skills) {
      for (i = 0; i < u.skills.length; i++) {
        var sk = u.skills[i], l = (u.skillLv[sk.id] || 0) - 1;
        if (l >= 0 && sk.apply) sk.apply(u, l, s);
      }
    }

    /* ---------- таланты ---------- */
    if (u.talents) AA.Game.talents.applyStats(u, s);

    /* ---------- баффы ---------- */
    for (i = 0; i < u.buffs.length; i++) {
      var f = u.buffs[i];
      if (f.atk) s.atk += f.atk;
      if (f.atkMul) s.atk *= f.atkMul;
      if (f.armor) s.armor += f.armor;
      if (f.armorMul) s.armor *= f.armorMul;
      if (f.range) s.range += f.range;
      if (f.ms) s.ms += f.ms;
      if (f.msMul) s.ms *= f.msMul;
      if (f.spMul) s.sp *= f.spMul;
      if (f.asMul) s.asMul *= f.asMul;
      if (f.mr) s.mr += f.mr;
      if (f.lifesteal) s.lifesteal += f.lifesteal;
      if (f.cdr) s.cdr += f.cdr;
      if (f.hpReg) s.hpReg += f.hpReg;
      if (f.mpReg) s.mpReg += f.mpReg;
    }

    /* ---------- лимиты ---------- */
    // метаморфоза меняет тип атаки: ближний бой становится дальним
    if (u.morph && u.base && u.base.range < 150) s.range = Math.max(s.range, 530);

    // талант «Живые копии» уменьшает лишний урон по иллюзиям
    if (u.isIllusion && u.takenMul > 1 && AA.Game.talents.has(W_hero(), 'dm_illu_dmg')) {
      u.takenMul = 1 + (3 - 1) * .5;
    }

    s.as *= s.asMul;
    s.mr = M.clamp(s.mr, -.5, .8);
    s.cdr = Math.min(60, s.cdr);
    s.crit = Math.min(85, s.crit);
    s.lifesteal = Math.min(75, s.lifesteal);
    s.ms = Math.max(60, s.ms);
    s.as = Math.max(.12, s.as);
    s.hp = Math.max(1, s.hp);

    /* ---------- перенос текущих значений ---------- */
    var oldHp = u.maxHp || s.hp, oldMp = u.maxMp || s.mp;
    u.stats = s; u.maxHp = s.hp; u.maxMp = s.mp;
    if (u.hp === undefined) { u.hp = s.hp; u.mp = s.mp; }
    else {
      u.hp = M.clamp(u.hp + (s.hp - oldHp), u.dead ? 0 : .01, s.hp);
      u.mp = M.clamp(u.mp + (s.mp - oldMp), 0, s.mp);
    }
    return s;
  }

  /** Множитель физического урона от брони. */
  function armorMult(armor) {
    var a = .06 * armor;
    return 1 - a / (1 + Math.abs(a));
  }

  /** Есть ли у героя пассивка, зависящая от текущего состояния. */
  function hasDynamicPassive(u) {
    if (!u.skills) return false;
    for (var i = 0; i < u.skills.length; i++) {
      if (u.skills[i].dynamic && (u.skillLv[u.skills[i].id] || 0) > 0) return true;
    }
    return false;
  }

  return { blank: blank, recalc: recalc, armorMult: armorMult, hasDynamicPassive: hasDynamicPassive };
})());
