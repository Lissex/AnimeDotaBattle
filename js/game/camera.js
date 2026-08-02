/* game/camera — камера едет за героем.

   Мир больше экрана, поэтому камера ведёт героя с небольшим
   упреждением по направлению движения и мягко догоняет его.
   На краях мира упирается, чтобы не показывать пустоту. */
AA.module('game/camera', (function () {
  'use strict';

  var LEAD = 90;        // насколько камера смотрит вперёд по движению
  var SMOOTH = 6.5;     // жёсткость догона: больше — резче

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  /** Желаемое положение центра камеры. */
  function targetFor(hero) {
    var w = W();
    var lead = w.auto ? LEAD * .4 : LEAD;   // в автобое поменьше рывков
    return {
      x: hero.x + (hero.vx || 0) * lead,
      y: hero.y + (hero.vy || 0) * lead
    };
  }

  function clampToWorld(cx, cy) {
    var w = W(), m = M();
    return {
      x: m.clamp(cx - w.view.w / 2, 0, Math.max(0, w.w - w.view.w)),
      y: m.clamp(cy - w.view.h / 2, 0, Math.max(0, w.h - w.view.h))
    };
  }

  function update(dt) {
    var w = W(), m = M();
    var hero = w.hero;
    if (!hero) return;

    var t = targetFor(hero);
    var goal = clampToWorld(t.x, t.y);
    var k = 1 - Math.pow(.0015, dt * (SMOOTH / 6.5));   // кадронезависимое сглаживание

    w.cam.x = m.lerp(w.cam.x, goal.x, k);
    w.cam.y = m.lerp(w.cam.y, goal.y, k);
  }

  /** Поставить камеру сразу — при старте забега и смене арены. */
  function snap() {
    var w = W();
    var hero = w.hero;
    var c = hero ? { x: hero.x, y: hero.y } : AA.Game.world.center();
    var goal = clampToWorld(c.x, c.y);
    w.cam.x = goal.x;
    w.cam.y = goal.y;
  }

  return { update: update, snap: snap, clampToWorld: clampToWorld };
})());
