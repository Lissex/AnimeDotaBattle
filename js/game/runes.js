/* game/runes — появление рун на арене и их подбор.
   Руны нужны, чтобы бой не был статичным: они заставляют
   отрываться от толпы и бежать за бонусом. */
AA.module('game/runes', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }
  function R() { return AA.Content.runes; }

  var timer = 0;

  function reset() {
    W().runes.length = 0;
    timer = R().FIRST_DELAY;
  }

  /** Свободная точка подальше от героя и вне препятствий. */
  function findSpot() {
    var w = W(), m = M(), h = w.hero;
    for (var i = 0; i < 40; i++) {
      var x = w.PAD + 60 + Math.random() * (w.w - w.PAD * 2 - 120);
      var y = w.PAD + w.TOP + 60 + Math.random() * (w.h - w.PAD * 2 - w.TOP - 120);
      if (AA.Game.terrain.blocked(x, y, 26)) continue;
      if (h && m.d2(x, y, h.x, h.y) < 220 * 220) continue;   // не под ногами
      return { x: x, y: y };
    }
    return null;
  }

  function spawn(def) {
    var spot = findSpot();
    if (!spot) return null;
    def = def || R().roll();
    var rune = {
      def: def, x: spot.x, y: spot.y, r: 20,
      t: 0, life: R().LIFETIME, born: W().time
    };
    W().runes.push(rune);
    AA.Game.effects.ring(rune.x, rune.y, 120, def.color);
    AA.Game.effects.burst(rune.x, rune.y, def.color, 14);
    return rune;
  }

  /** Что руна умеет сделать с героем — передаётся в apply. */
  function effects() {
    return {
      buff: function (u, d) { AA.Game.buffs.add(u, d); },
      gold: function (amount) {
        var w = W();
        w.gold += amount;
        AA.Game.effects.floatText(w.hero.x, w.hero.y - 40, '+' + amount, '#ffc043', 18);
      },
      wave: W().wave
    };
  }

  function pickup(rune, hero) {
    var fx = AA.Game.effects;
    rune.def.apply(hero, effects());
    fx.ring(hero.x, hero.y, 150, rune.def.color);
    fx.burst(hero.x, hero.y, rune.def.color, 26);
    fx.flash(rune.def.color, .18);
    AA.Core.audio.buy();
    AA.UI.toast.show(rune.def.name);
  }

  function update(dt) {
    var w = W(), m = M(), C = R();
    if (!w.running || w.over) return;

    // на полигоне руны не мешают замерам
    if (!w.training) {
      timer -= dt;
      if (timer <= 0) {
        timer = C.INTERVAL;
        if (w.runes.length < C.MAX_ON_FIELD) spawn();
      }
    }

    var h = w.hero;
    for (var i = w.runes.length - 1; i >= 0; i--) {
      var rune = w.runes[i];
      rune.t += dt;

      if (h && !h.dead && m.d2(h.x, h.y, rune.x, rune.y) < (rune.r + h.r) * (rune.r + h.r)) {
        pickup(rune, h);
        w.runes.splice(i, 1);
        continue;
      }
      if (rune.t >= rune.life) {
        AA.Game.effects.burst(rune.x, rune.y, rune.def.color, 8);
        w.runes.splice(i, 1);
      }
    }
  }

  /** Ближайшая руна — автобой за ней бегает. */
  function nearest(u, maxDist) {
    var w = W(), m = M(), best = null, bd = maxDist || 1e9;
    for (var i = 0; i < w.runes.length; i++) {
      var d = Math.sqrt(m.d2(u.x, u.y, w.runes[i].x, w.runes[i].y));
      if (d < bd) { bd = d; best = w.runes[i]; }
    }
    return best;
  }

  return { reset: reset, update: update, spawn: spawn, nearest: nearest };
})());
