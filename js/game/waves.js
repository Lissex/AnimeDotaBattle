/* game/waves — состав волн, спавн и учебный полигон. */
AA.module('game/waves', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  /** Ставит юнита на край арены, стараясь не попасть в препятствие. */
  function placeAtEdge(u) {
    var w = W(), m = M(), side = Math.floor(Math.random() * 4), tries = 0;
    do {
      if (side === 0) { u.x = m.rnd(w.PAD, w.w - w.PAD); u.y = w.PAD + w.TOP + 10; }
      else if (side === 1) { u.x = m.rnd(w.PAD, w.w - w.PAD); u.y = w.h - w.PAD; }
      else if (side === 2) { u.x = w.PAD; u.y = m.rnd(w.PAD + w.TOP, w.h - w.PAD); }
      else { u.x = w.w - w.PAD; u.y = m.rnd(w.PAD + w.TOP, w.h - w.PAD); }
      side = (side + 1) % 4;
    } while (AA.Game.terrain.blocked(u.x, u.y, u.r) && tries++ < 8);
    AA.Game.world.confine(u);
    AA.Game.effects.ring(u.x, u.y, 46, '#ff4d5e');
  }

  function spawn(def, isBoss) {
    var u = AA.Game.factory.enemy(def, isBoss);
    placeAtEdge(u);
    W().units.push(u);
    return u;
  }

  function spawnWave() {
    var w = W(), E = AA.Content.enemies, A = AA.Content.attributes;
    var wave = w.wave;

    if (wave % 5 === 0) {
      /* --- босс --- */
      var bossDef = E.bossFor(wave);
      var count = 1 + Math.floor(wave / 15);
      for (var i = 0; i < count; i++) spawn(bossDef, true);

      var escort = Math.min(5, 2 + Math.floor(wave / 6));
      for (var k = 0; k < escort; k++) spawn(E.roll(wave), false);

      AA.Game.effects.flash('#ff4d5e', .3);
      AA.Game.effects.shake(11);
    } else {
      /* --- обычная волна --- */
      var budget = A.enemyCount(wave), guard = 0;
      while (budget > 0 && guard++ < 20) {
        var def = E.roll(wave), pack = def.pack || 1;
        for (var p = 0; p < pack; p++) {
          var u = spawn(def, false);
          if (p > 0) {
            u.x += M().rnd(-44, 44); u.y += M().rnd(-44, 44);
            AA.Game.world.confine(u);
          }
        }
        budget -= (pack > 1 ? 2 : 1);   // рой занимает два «слота» волны
      }
    }
    AA.Core.audio.wave();
  }

  function nextWave() {
    var w = W(), h = w.hero;
    w.wave++;
    w.running = true; w.paused = false;
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .35);
    h.mp = h.maxMp;
    spawnWave();
  }

  /* ================= учебный полигон ================= */
  function setupTraining() {
    var w = W(), c = AA.Game.world.center();
    for (var i = 0; i < 3; i++) {
      var d = AA.Game.factory.dummy();
      d.x = c.x + (i - 1) * 130;
      d.y = c.y - 150;
      AA.Game.world.confine(d);
      w.units.push(d);
    }
  }

  function trainingSpawn(kind) {
    var w = W(), E = AA.Content.enemies;
    if (!w.training) return;
    var def = kind === 'boss'
      ? E.BOSSES[Math.floor(Math.random() * E.BOSSES.length)]
      : E.roll(20);
    spawn(def, kind === 'boss');
  }

  function trainingClear() {
    var w = W();
    for (var i = w.units.length - 1; i >= 0; i--) {
      var u = w.units[i];
      if (u.team === 1 && !u.isDummy) w.units.splice(i, 1);
    }
  }

  return {
    spawnWave: spawnWave, nextWave: nextWave, placeAtEdge: placeAtEdge,
    setupTraining: setupTraining, trainingSpawn: trainingSpawn, trainingClear: trainingClear
  };
})());
