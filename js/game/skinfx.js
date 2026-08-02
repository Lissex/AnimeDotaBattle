/* game/skinfx — эффекты имморталок в бою.

   Обычные и покупные облики только перекрашивают героя.
   Имморталка обязана быть заметна в деле: у неё свой эффект на
   попадание, на убийство и на применение умения. На баланс это
   не влияет — весь урон здесь нулевой, работают только эффекты. */
AA.module('game/skinfx', (function () {
  'use strict';

  function FX() { return AA.Game.effects; }
  function M() { return AA.Core.math; }
  function W() { return AA.Game.world.state; }

  /** Есть ли у юнита имморталка и какая. */
  function of(u) {
    return (u && u.skin && u.skin.fx) ? u.skin : null;
  }

  /* ---------------- попадание ---------------- */
  function onHit(u, target) {
    var s = of(u);
    if (!s) return;
    var fx = FX(), m = M();

    switch (s.fx) {
      case 'trail':                                  // росчерк по цели
        fx.slash(u, target, s.fxColor);
        fx.sparks(target.x, target.y, s.fxColor, 5);
        break;

      case 'embers':                                 // угольки от удара
        for (var i = 0; i < 3; i++) {
          fx.ember(target.x + m.rnd(-10, 10), target.y, s.fxColor, .55);
        }
        break;

      case 'frost':                                  // иней осыпается
        fx.burst(target.x, target.y, s.fxColor, 5);
        break;

      case 'runes':                                  // руна вспыхивает на цели
        fx.ring(target.x, target.y, 44, s.fxColor);
        break;

      case 'storm':                                  // разряд перескакивает на соседа
        var near = nearestOther(u, target, 240);
        if (near) {
          fx.bolt(target.x, target.y, near.x, near.y, s.fxColor, .16);
          fx.sparks(near.x, near.y, s.fxColor, 4);
        } else {
          fx.sparks(target.x, target.y, s.fxColor, 6);
        }
        break;
    }
  }

  /* ---------------- убийство ---------------- */
  function onKill(u, target) {
    var s = of(u);
    if (!s) return;
    var fx = FX(), m = M();

    switch (s.fx) {
      case 'trail':
        fx.ring(target.x, target.y, 90, s.fxColor);
        fx.burst(target.x, target.y, s.fxColor, 18);
        break;

      case 'embers':                                 // тело вспыхивает
        fx.ring(target.x, target.y, 110, s.fxColor);
        for (var i = 0; i < 10; i++) {
          fx.ember(target.x + m.rnd(-16, 16), target.y + m.rnd(-8, 8), s.fxColor, 1);
        }
        break;

      case 'frost':                                  // цель рассыпается льдом
        fx.burst(target.x, target.y, s.fxColor, 22);
        fx.ring(target.x, target.y, 80, s.fxColor);
        break;

      case 'runes':                                  // столб света
        fx.pillar(target.x, target.y, s.fxColor);
        break;

      case 'storm':
        fx.bolt(u.x, u.y, target.x, target.y, s.fxColor, .22);
        fx.ring(target.x, target.y, 100, s.fxColor);
        break;
    }
  }

  /* ---------------- применение умения ---------------- */
  function onCast(u) {
    var s = of(u);
    if (!s) return;
    var fx = FX();

    switch (s.fx) {
      case 'trail': fx.spinBurst(u, u.r * 2.2, s.fxColor); break;
      case 'embers': fx.ring(u.x, u.y, u.r * 3, s.fxColor); break;
      case 'frost': fx.ring(u.x, u.y, u.r * 2.6, s.fxColor); break;
      case 'runes': fx.pillar(u.x, u.y, s.fxColor); break;
      case 'storm': fx.sparks(u.x, u.y, s.fxColor, 12); break;
    }
  }

  /** Ближайший другой враг — для перескока разряда. */
  function nearestOther(u, exclude, range) {
    var w = W(), m = M(), best = null, bd = range;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team === u.team || e === exclude) continue;
      var d = m.dist(exclude, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  return { of: of, onHit: onHit, onKill: onKill, onCast: onCast };
})());
