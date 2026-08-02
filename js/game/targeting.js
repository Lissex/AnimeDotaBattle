/* game/targeting — поиск целей и площадные выборки.
   Единственное место, где решается «видно ли цель»: невидимость
   работает именно отсюда, поэтому её нельзя случайно обойти. */
AA.module('game/targeting', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }
  function B() { return AA.Game.buffs; }

  /** Цель существует и её видно. */
  function visible(e) { return !e.dead && !B().isInvisible(e); }

  /** Герой глазами врага: в невидимости не виден дальше 110. */
  function heroVisibleTo(u) {
    var h = W().hero;
    if (!h || h.dead) return null;
    if (B().isInvisible(h) && M().dist(u, h) > 110) return null;
    return h;
  }

  /**
   * На кого враг реально нападает: ближайший видимый союзник игрока.
   * Благодаря этому иллюзии оттягивают на себя урон — иначе они были
   * бы просто декорацией.
   */
  function enemyTarget(u) {
    var w = W(), m = M(), best = null, bd = 1e9;
    for (var i = 0; i < w.units.length; i++) {
      var a = w.units[i];
      if (a.dead || a.team !== 0) continue;
      if (B().isInvisible(a) && m.dist(u, a) > 110) continue;
      var d = m.dist(u, a);
      // за настоящим героем гонятся чуть охотнее, чем за копией
      if (a.isIllusion) d += 90;
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  function nearest(u, range) {
    var w = W(), m = M(), best = null, bd = range === undefined ? 1e9 : range;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.team === u.team || !visible(e)) continue;
      var d = m.dist(u, e);
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }

  /** Приоритетная цель для умений: опасные роли важнее близости. */
  function pick(u, range) {
    var w = W(), m = M(), best = null, score = -1e9;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.team === u.team || !visible(e)) continue;
      var d = m.dist(u, e);
      if (d > (range || 1e9)) continue;
      var sc = -d;
      if (e.role === 'healer') sc += 420;   // лечит толпу — бить первым
      if (e.role === 'hexer') sc += 260;
      if (e.role === 'bomber') sc += 200;
      if (e.isBoss) sc += 180;
      if (sc > score) { score = sc; best = e; }
    }
    return best;
  }

  function lowestHp(u, range) {
    var w = W(), m = M(), best = null, bhp = 1e12;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.team === u.team || !visible(e)) continue;
      if (m.dist(u, e) > (range || 1e9)) continue;
      if (e.hp < bhp) { bhp = e.hp; best = e; }
    }
    return best;
  }

  /** Точка, накрывающая больше всего врагов — для площадных умений. */
  function bestCluster(u, radius, range) {
    var w = W(), m = M(), best = null, bn = 0;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.team === u.team || !visible(e)) continue;
      if (m.dist(u, e) > (range || 1e9)) continue;
      var n = 0;
      for (var j = 0; j < w.units.length; j++) {
        var o = w.units[j];
        if (o.team === u.team || !visible(o)) continue;
        if (m.dist(e, o) <= radius) n++;
      }
      if (n > bn) { bn = n; best = e; }
    }
    return best ? { x: best.x, y: best.y, n: bn } : null;
  }

  function forEachEnemy(u, radius, fn) {
    var w = W(), m = M(), n = 0;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team === u.team) continue;
      if (m.d2(e.x, e.y, u.x, u.y) <= radius * radius) { fn(e); n++; }
    }
    return n;
  }

  /** Применить fn ко всем врагам в круге (учитывает радиус тел). */
  function applyInCircle(src, x, y, r, fn) {
    var w = W(), m = M(), n = 0;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team === src.team) continue;
      if (m.d2(e.x, e.y, x, y) <= (r + e.r) * (r + e.r)) { fn(e); n++; }
    }
    return n;
  }

  function countThreats(u, r) {
    var w = W(), m = M(), n = 0;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team === u.team) continue;
      if (m.dist(u, e) <= r) n++;
    }
    return n;
  }

  return {
    visible: visible, heroVisibleTo: heroVisibleTo, enemyTarget: enemyTarget,
    nearest: nearest, pick: pick, lowestHp: lowestHp, bestCluster: bestCluster,
    forEachEnemy: forEachEnemy, applyInCircle: applyInCircle, countThreats: countThreats
  };
})());
