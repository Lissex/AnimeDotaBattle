/* game/api — фасад для контента.
   Файлы умений видят ТОЛЬКО этот объект и не знают о внутреннем
   устройстве систем. Расширять его — единственный способ дать
   умениям новую возможность.
   Доступ из умения: AA.Game.api (в файлах умений — короткое g()). */
AA.module('game/api', (function () {
  'use strict';

  var T = function () { return AA.Game.targeting; };
  var C = function () { return AA.Game.combat; };
  var F = function () { return AA.Game.effects; };
  var B = function () { return AA.Game.buffs; };

  return {
    /* ---------- поиск целей ---------- */
    nearestEnemy: function (u, r) { return T().nearest(u, r); },
    pickTarget: function (u, r) { return T().pick(u, r); },
    lowestHpEnemy: function (u, r) { return T().lowestHp(u, r); },
    bestCluster: function (u, radius, range) { return T().bestCluster(u, radius, range); },
    forEachEnemy: function (u, radius, fn) { return T().forEachEnemy(u, radius, fn); },
    aoeApply: function (src, x, y, r, fn) { return T().applyInCircle(src, x, y, r, fn); },

    /* ---------- урон и лечение ---------- */
    damage: function (src, tgt, amount, type, isAuto) { return C().damage(src, tgt, amount, type, isAuto); },
    aoeAt: function (src, x, y, r, amount, type) { return C().aoeAt(src, x, y, r, amount, type); },
    heal: function (u, amount) { return C().heal(u, amount); },
    execute: function (src, t) { return C().execute(src, t); },
    chainLightning: function (src, first, dmg, jumps, falloff, color) {
      return C().chainLightning(src, first, dmg, jumps, falloff, color);
    },

    /* ---------- снаряды ---------- */
    projectile: function (o) { return AA.Game.projectiles.spawn(o); },

    /* ---------- перемещения ---------- */
    pull: function (t, toward, gap) { return C().pull(t, toward, gap); },
    knockback: function (e, from, d) { return C().knockback(e, from, d); },
    recoil: function (u, d) { return C().recoil(u, d); },
    blinkBehind: function (u, t, gap) { return C().blinkBehind(u, t, gap); },
    dashTo: function (u, t, gap, color) { return C().dashTo(u, t, gap, color); },
    leapTo: function (u, x, y, dur, cb) { return C().leapTo(u, x, y, dur, cb); },

    /* ---------- баффы ---------- */
    buff: function (u, def) { return B().add(u, def); },
    removeBuff: function (u, id) { return B().remove(u, id); },
    hasBuff: function (u, id) { return B().has(u, id); },

    /* ---------- эффекты ---------- */
    burst: function (x, y, c, n) { F().burst(x, y, c, n); },
    sparks: function (x, y, c, n) { F().sparks(x, y, c, n); },
    sparkle: function (x, y, c) { F().sparkle(x, y, c); },
    spinBurst: function (u, r, c) { F().spinBurst(u, r, c); },
    ring: function (x, y, r, c) { F().ring(x, y, r, c); },
    aura: function (u, r, c) { F().aura(u, r, c); },
    slash: function (a, b, c) { F().slash(a, b, c); },
    pillar: function (x, y, c) { F().pillar(x, y, c); },
    telegraph: function (x, y, r, c, delay, cb) { F().telegraph(x, y, r, c, delay, cb); },
    zone: function (o) { F().zone(o); },
    wall: function (u, ang, len, dur, c, fn) { F().wall(u, ang, len, dur, c, fn); },
    cone: function (u, ang, range, half, c, fn) { F().cone(u, ang, range, half, c, fn); },
    shake: function (m) { F().shake(m); },
    flash: function (c, t) { F().flash(c, t); },
    hitstop: function (t) { F().hitstop(t); },
    delay: function (t, fn) { F().timer(t, fn); },

    /* ---------- таланты и осколок ---------- */
    talent: function (u, id) { return AA.Game.talents.has(u, id); },
    /** Куплен ли «Осколок Аганима» — усиливает ключевое умение героя. */
    shard: function (u) {
      for (var i = 0; i < u.items.length; i++) if (u.items[i].shard) return true;
      return false;
    },

    /* ---------- Аркан ---------- */
    addReagent: function (u, elem) { AA.Game.abilities.addReagent(u, elem); },

    /* ---------- интерфейс ---------- */
    toast: function (msg) { if (AA.UI && AA.UI.toast) AA.UI.toast.show(msg); }
  };
})());
