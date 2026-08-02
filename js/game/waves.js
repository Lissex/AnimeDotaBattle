/* game/waves — состав волн, спавн и учебный полигон. */
AA.module('game/waves', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  /** Ставит юнита на кольце вокруг героя, сразу за краем кадра.
      В большом мире спавн по краям арены был бы слишком далеко. */
  function placeAtEdge(u) {
    var w = W(), m = M(), h = w.hero;
    var cx = h ? h.x : w.w / 2, cy = h ? h.y : w.h / 2;
    var radius = Math.sqrt(w.view.w * w.view.w + w.view.h * w.view.h) * .56;

    for (var tries = 0; tries < 14; tries++) {
      var a = m.rnd(0, 6.2832);
      var d = radius * m.rnd(1, 1.18);
      u.x = m.clamp(cx + Math.cos(a) * d, w.PAD + u.r, w.w - w.PAD - u.r);
      u.y = m.clamp(cy + Math.sin(a) * d, w.PAD + u.r, w.h - w.PAD - u.r);
      if (!AA.Game.terrain.blocked(u.x, u.y, u.r)) break;
    }
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

    if (A.isBossWave(wave)) {
      /* --- босс --- */
      var bossDef = E.bossFor(wave);
      var count = 1 + Math.floor(A.bossIndex(wave) / 5);   // с 50-й волны их двое
      for (var i = 0; i < count; i++) spawn(bossDef, true);

      var escort = Math.min(6, 2 + Math.floor(wave / 10));
      for (var k = 0; k < escort; k++) spawn(E.roll(wave), false);

      AA.Game.effects.flash('#ff4d5e', .3);
      AA.Game.effects.shake(11);
      AA.Core.audio.setTension(1);            // музыка густеет на боссе
      if (AA.UI.hud.announceBoss) AA.UI.hud.announceBoss(bossDef);
    } else {
      /* --- обычная волна --- */
      var budget = AA.Game.run.waveSize(wave), guard = 0;
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
      // напряжение копится к следующему боссу
      AA.Core.audio.setTension((wave % A.BOSS_EVERY) / A.BOSS_EVERY * .8);
    }
    AA.Core.audio.wave();
  }

  function nextWave() {
    var w = W(), h = w.hero, A = AA.Content.attributes;

    // босса добили — уходим на следующую арену
    var wasBoss = A.isBossWave(w.wave);

    w.wave++;
    w.running = true; w.paused = false;
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .35);
    h.mp = h.maxMp;

    if (wasBoss) changeMap(AA.Content.maps.next(w.mapId));
    spawnWave();
  }

  /** Перестроить арену на лету: ландшафт, фон, погода, позиция героя. */
  function changeMap(mapId) {
    var w = W();
    AA.Game.terrain.build(mapId);
    AA.Render.ground.rebuild();
    AA.Render.fx.resetWeather();
    AA.Core.audio.setMood(W().map);

    var c = AA.Game.world.center();
    if (w.hero) {
      w.hero.x = c.x; w.hero.y = c.y;
      AA.Game.world.confine(w.hero);
      AA.Game.terrain.collide(w.hero);
    }
    AA.Game.camera.snap();
    // зоны и снаряды со старой арены больше не действуют
    ['proj', 'zones', 'walls', 'tele', 'runes'].forEach(function (k) { w[k].length = 0; });

    AA.Game.effects.flash(w.map.accent, .35);
    AA.Game.effects.ring(c.x, c.y, 340, w.map.accent);
    AA.Game.effects.shake(8);
    AA.UI.toast.show('Новая арена: ' + w.map.name);
  }

  /* ================= учебный полигон ================= */
  function setupTraining() {
    var w = W(), h = w.hero, c = AA.Game.world.center();
    var cx = h ? h.x : c.x, cy = h ? h.y : c.y;
    for (var i = 0; i < 3; i++) {
      var d = AA.Game.factory.dummy();
      d.x = cx + (i - 1) * 150;
      d.y = cy - 190;
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
    spawnWave: spawnWave, nextWave: nextWave, changeMap: changeMap, placeAtEdge: placeAtEdge,
    setupTraining: setupTraining, trainingSpawn: trainingSpawn, trainingClear: trainingClear
  };
})());
