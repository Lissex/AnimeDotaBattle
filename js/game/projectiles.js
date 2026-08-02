/* game/projectiles — снаряды: полёт, самонаведение, пробитие, попадания.
   Самонаведение теряет цель, ушедшую в невидимость, и снаряды
   физически не могут попасть по невидимому герою. */
AA.module('game/projectiles', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  /**
   * @param {object} o
   *   from     кто выпустил (берётся позиция и команда)
   *   to       цель (для homing) либо angle — направление
   *   speed, r, color, range
   *   pierce   сколько целей пробивает (99 — все)
   *   trail    рисовать шлейф
   *   big      усиленное свечение
   *   spin     вращать спрайт
   *   onHit(target)
   */
  function spawn(o) {
    var from = o.from;
    var a = o.angle;
    if (a === undefined && o.to) a = M().angleTo(from, o.to);
    W().proj.push({
      x: from.x, y: from.y, a: a, sp: o.speed || 800, r: o.r || 6,
      c: o.color || '#fff', src: from, team: from.team,
      onHit: o.onHit, target: o.to || null,
      homing: !!o.homing, trail: !!o.trail, big: !!o.big, spin: !!o.spin,
      rot: 0, pts: [], range: o.range || 1300, travelled: 0,
      pierce: o.pierce || 0, hitIds: {}
    });
  }

  function update(dt) {
    var w = W(), m = M(), B = AA.Game.buffs, fx = AA.Game.effects;

    for (var i = w.proj.length - 1; i >= 0; i--) {
      var p = w.proj[i];

      if (p.homing && p.target && !p.target.dead) {
        if (B.isInvisible(p.target)) p.target = null;        // цель растворилась
        else p.a = m.angleTo(p, p.target);
      }

      var step = p.sp * dt;
      if (p.trail) {
        p.pts.push(p.x, p.y);
        if (p.pts.length > 18) p.pts.splice(0, 2);
      }
      if (p.spin) p.rot += dt * 9;

      p.x += Math.cos(p.a) * step;
      p.y += Math.sin(p.a) * step;
      p.travelled += step;

      var gone = p.travelled > p.range ||
        p.x < -60 || p.x > w.w + 60 || p.y < -60 || p.y > w.h + 60;
      var consumed = false;

      for (var j = 0; j < w.units.length; j++) {
        var u = w.units[j];
        if (u.dead || u.team === p.team || p.hitIds[u.id]) continue;
        if (u.team === 0 && B.isInvisible(u)) continue;      // по невидимке не попасть
        if (m.d2(u.x, u.y, p.x, p.y) > (u.r + p.r) * (u.r + p.r)) continue;

        p.hitIds[u.id] = 1;
        if (p.onHit) p.onHit(u);
        fx.sparks(p.x, p.y, p.c, 6);
        if (p.pierce > 0) p.pierce--; else consumed = true;
        break;
      }

      if (consumed || gone) w.proj.splice(i, 1);
    }
  }

  return { spawn: spawn, update: update };
})());
