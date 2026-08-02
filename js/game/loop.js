/* game/loop — главный цикл: порядок обновления систем,
   старт и завершение забега, события наружу. */
AA.module('game/loop', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  var handlers = { waveClear: null, death: null, tick: null };
  var raf = 0, lastT = 0;

  /* ================= кадр ================= */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!lastT) lastT = now;
    var dt = Math.min(.05, (now - lastT) / 1000);
    lastT = now;

    var w = W();
    if (!w.running) return;

    // стоп-кадр: время стоит, картинка продолжает рисоваться
    if (w.hitstop > 0) { w.hitstop -= dt; AA.Render.renderer.draw(dt); return; }

    if (!w.paused && !w.over) update(dt);
    AA.Render.renderer.draw(dt);
  }

  function update(dt) {
    var w = W();
    w.time += dt;
    w.auras.length = 0;

    updateHero(dt);
    updateUnits(dt);
    AA.Game.terrain.separate();
    AA.Game.projectiles.update(dt);
    AA.Game.runes.update(dt);
    AA.Game.effects.update(dt);
    AA.Game.camera.update(dt);
    cleanupDead();
    updateDps();

    if (!w.over && !w.training && AA.Game.world.aliveEnemies() === 0) {
      w.running = false;
      if (handlers.waveClear) handlers.waveClear(w.wave);
    }
    if (handlers.tick) handlers.tick();
  }

  function updateHero(dt) {
    var w = W(), h = w.hero;
    if (!h || h.dead) return;

    if (w.auto) {
      AA.Game.ai.autopilot(h, dt);
    } else {
      var mv = AA.Core.input.moveVector(h);
      h.vx = mv.x; h.vy = mv.y;
      if (mv.len > .05) h.face = Math.atan2(mv.y, mv.x);
    }

    // пассивки вида «чем меньше здоровья, тем сильнее» требуют пересчёта каждый кадр
    if (AA.Game.stats.hasDynamicPassive(h)) AA.Game.stats.recalc(h);
  }

  function updateUnits(dt) {
    var w = W(), m = M(), B = AA.Game.buffs;

    for (var i = 0; i < w.units.length; i++) {
      var u = w.units[i];
      if (u.dead) continue;

      B.update(u, dt);
      if (u.dead) continue;

      if (u.team === 1) {
        AA.Game.ai.enemy(u, dt);
        if (u.isBoss && !B.isStunned(u)) AA.Game.ai.bossAbility(u, dt);
        if (u.dead) continue;
      } else if (u.isIllusion) {
        AA.Game.ai.illusion(u, dt);
        if (!updateIllusionLife(u, dt)) continue;
      }

      if (u.leap) {
        AA.Game.combat.updateLeap(u, dt);
      } else if (!B.isRooted(u)) {
        u.x += u.vx * u.stats.ms * dt;
        u.y += u.vy * u.stats.ms * dt;
        AA.Game.world.confine(u);
        AA.Game.terrain.collide(u);
        footsteps(u, dt);
      }

      AA.Game.terrain.applySurface(u, dt);

      u.hp = Math.min(u.maxHp, u.hp + u.stats.hpReg * dt);
      u.mp = Math.min(u.maxMp, u.mp + u.stats.mpReg * dt);

      AA.Game.abilities.tickCooldowns(u, dt);
      AA.Game.abilities.tickSkills(u, dt);

      if (!B.isStunned(u)) AA.Game.combat.autoAttack(u, dt);

      if (u.flash > 0) u.flash = Math.max(0, u.flash - dt * 5);
      if (u.swing > 0) u.swing = Math.max(0, u.swing - dt * 4.2);
      if (u.recoilT > 0) u.recoilT = Math.max(0, u.recoilT - dt);
      if (u.castFx > 0) u.castFx = Math.max(0, u.castFx - dt * 3);
      if (u.hp <= 0) AA.Game.combat.kill(null, u);
    }
  }

  /** Срок жизни копии. @returns {boolean} жива ли она дальше */
  function updateIllusionLife(u, dt) {
    u.life -= dt;

    // копия из Отражения держится, только пока жив оригинал
    if (u.guard && u.guard.dead) u.life = Math.min(u.life, 0);

    if (u.life > 0) return true;
    AA.Game.effects.burst(u.x, u.y, '#8ab0ff', 12);
    u.dead = true;
    return false;
  }

  function footsteps(u, dt) {
    var speed = Math.abs(u.vx) + Math.abs(u.vy);
    if (speed <= .3) return;
    u.step += dt * u.stats.ms * .022;
    if (Math.random() < dt * 5) {
      W().parts.push({
        x: u.x + M().rnd(-6, 6), y: u.y + u.r * .65,
        vx: M().rnd(-16, 16), vy: M().rnd(-8, 4),
        c: 'rgba(150,160,200,.45)', r: 1.7, t: 0, life: .45
      });
    }
  }

  function cleanupDead() {
    var w = W();
    for (var i = w.units.length - 1; i >= 0; i--) {
      if (w.units[i].dead && w.units[i] !== w.hero) w.units.splice(i, 1);
    }
  }

  function updateDps() {
    var w = W(), sum = 0;
    while (w.dmgWindow.length && w.time - w.dmgWindow[0][0] > 5) w.dmgWindow.shift();
    for (var i = 0; i < w.dmgWindow.length; i++) sum += w.dmgWindow[i][1];
    w.dps = sum / 5;
  }

  /* ================= управление забегом ================= */
  function start(canvas, callbacks) {
    handlers.waveClear = callbacks.onWaveClear || null;
    handlers.death = callbacks.onDeath || null;
    handlers.tick = callbacks.onTick || null;
    AA.Render.canvas.attach(canvas);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function startRun(hero, training) {
    var w = W();
    AA.Game.world.clearPools();
    w.training = !!training;
    w.wave = 1; w.kills = 0;
    w.gold = training ? 999999 : 700;
    w.over = false; w.hitstop = 0;

    AA.Game.terrain.build(training ? 'training' : hero.defId);
    AA.Render.ground.rebuild();

    var c = AA.Game.world.center();
    w.hero = hero;
    hero.x = c.x; hero.y = c.y; hero.dead = false;
    hero.reagents = []; hero.invokeCds = {};
    w.units.push(hero);

    w.running = true; w.paused = false;
    AA.Game.camera.snap();
    AA.Game.runes.reset();
    if (training) AA.Game.waves.setupTraining();
    else AA.Game.waves.spawnWave();
  }

  function revive() {
    var w = W(), h = w.hero, c = AA.Game.world.center();
    h.dead = false; h.buffs.length = 0;
    AA.Game.stats.recalc(h);
    h.hp = h.maxHp; h.mp = h.maxMp;
    h.x = c.x; h.y = c.y;
    w.over = false; w.running = true; w.paused = false;
    AA.Game.camera.snap();

    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.team === 1 && !e.dead) AA.Game.combat.pull(e, h, 340);
    }
    AA.Game.effects.ring(h.x, h.y, 290, '#ffd24a');
    AA.Game.effects.flash('#ffd24a', .32);
  }

  return {
    start: start, startRun: startRun, revive: revive,
    pause: function (v) { W().paused = v; },
    stop: function () { W().running = false; },
    emitDeath: function () { if (handlers.death) handlers.death(); }
  };
})());
