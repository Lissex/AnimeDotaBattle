/* game/buffs — временные эффекты на юните.
   Поля бафа читают game/stats (модификаторы) и game/loop (тики). */
AA.module('game/buffs', (function () {
  'use strict';

  function get(u, id) {
    for (var i = 0; i < u.buffs.length; i++) if (u.buffs[i].id === id) return u.buffs[i];
    return null;
  }

  function has(u, id) { return !!get(u, id); }

  function remove(u, id) {
    var changed = false;
    for (var i = u.buffs.length - 1; i >= 0; i--) {
      if (u.buffs[i].id === id) { u.buffs.splice(i, 1); changed = true; }
    }
    if (changed) AA.Game.stats.recalc(u);
  }

  /**
   * Наложить или обновить бафф.
   * quiet: true — не пересчитывать характеристики при обновлении
   *        (для эффектов, которые обновляются каждый кадр).
   */
  function add(u, def) {
    if (!u || u.dead) return;
    var ex = get(u, def.id);
    if (ex) {
      for (var k in def) ex[k] = def[k];
      ex.t = def.dur;
      if (!def.quiet) AA.Game.stats.recalc(u);
    } else {
      def.t = def.dur;
      u.buffs.push(def);
      AA.Game.stats.recalc(u);
    }
  }

  /** Обновление за кадр: тики, урон по времени, регенерация, истечение. */
  function update(u, dt) {
    var combat = AA.Game.combat;
    for (var i = u.buffs.length - 1; i >= 0; i--) {
      var b = u.buffs[i];
      b.t -= dt;
      if (b.onTick) b.onTick(u, dt);
      if (b.dps) combat.damage(b.src || null, u, b.dps * dt, b.dmgType || 'magic');
      if (b.regenPct) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * b.regenPct / 100 * dt);
      if (b.spin) u.spin += dt * 15;
      if (u.dead) return;
      if (b.t <= 0) {
        if (b.morph) u.morph = false;    // метаморфоза кончилась
        u.buffs.splice(i, 1);
        AA.Game.stats.recalc(u);
      }
    }
  }

  return {
    get: get, has: has, add: add, remove: remove, update: update,
    isStunned: function (u) { return has(u, 'freeze'); },
    isRooted: function (u) { return has(u, 'freeze') || has(u, 'root'); },
    isInvisible: function (u) { return has(u, 'invis'); }
  };
})());
