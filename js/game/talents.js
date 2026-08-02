/* game/talents — применение выбранных талантов.

   Три способа, которыми талант влияет на игру:
     1. stat(u, s)      — правит характеристики, подхватывает game/stats
     2. cd {skill,minus}— срезает перезарядку конкретному умению
     3. флаг по id      — умение или бой спрашивают has(u, 'id')
                          и меняют поведение

   Выбранное хранится в hero.talents = { 10:'id', 20:'id', ... }. */
AA.module('game/talents', (function () {
  'use strict';

  /** Есть ли у героя этот талант. */
  function has(u, id) {
    if (!u || !u.talents) return false;
    for (var k in u.talents) if (u.talents[k] === id) return true;
    return false;
  }

  /** Все выбранные таланты объектами. */
  function chosen(u) {
    var out = [];
    if (!u || !u.talents) return out;
    var T = AA.Content.talents;
    for (var k in u.talents) {
      var t = T.get(u.talents[k]);
      if (t) out.push(t);
    }
    return out;
  }

  /** Вклад талантов в характеристики — вызывается из game/stats. */
  function applyStats(u, s) {
    var list = chosen(u);
    for (var i = 0; i < list.length; i++) {
      if (list[i].stat) list[i].stat(u, s);
    }
  }

  /** Сокращение перезарядки конкретного умения. */
  function cdBonus(u, skillId) {
    var list = chosen(u), sum = 0;
    for (var i = 0; i < list.length; i++) {
      var c = list[i].cd;
      if (c && c.skill === skillId) sum += c.minus;
    }
    return sum;
  }

  /** Прибавка к максимуму зарядов умения. */
  function chargeBonus(u, skillId) {
    var list = chosen(u), sum = 0;
    for (var i = 0; i < list.length; i++) {
      var c = list[i].charge;
      if (c && c.skill === skillId) sum += c.plus;
    }
    return sum;
  }

  /** Ждёт ли герой выбора таланта. */
  function pending(u) {
    if (!u || !u.defId) return 0;
    return AA.Content.talents.pendingTier(u.defId, u.level, u.talents || {});
  }

  function choose(u, tier, id) {
    if (!u.talents) u.talents = {};
    if (u.talents[tier]) return false;
    u.talents[tier] = id;
    AA.Game.stats.recalc(u);
    return true;
  }

  return {
    has: has, chosen: chosen, applyStats: applyStats,
    cdBonus: cdBonus, chargeBonus: chargeBonus, pending: pending, choose: choose
  };
})());
