/* game/effects — визуальные и площадные эффекты: частицы, кольца,
   зоны, стены, конусы, телеграфы, тряска, стоп-кадры, таймеры.
   Здесь только их создание и обновление; рисует их слой render. */
AA.module('game/effects', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  var shakeEnabled = true;

  /* ---------------- частицы и текст ---------------- */
  function floatText(x, y, txt, color, size) {
    // числа урона можно отключить в настройках
    if (AA.Platform.storage.data.numbers === false) return;
    W().floats.push({
      x: x, y: y, txt: '' + txt, c: color, s: size || 14,
      t: 0, life: .95, vy: -50, vx: M().rnd(-10, 10)
    });
  }

  function burst(x, y, color, n) {
    var w = W(), m = M();
    for (var i = 0; i < n; i++) {
      var a = m.rnd(0, 6.2832), sp = m.rnd(70, 340);
      w.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        c: color, r: m.rnd(1.5, 4.4), t: 0, life: m.rnd(.25, .75)
      });
    }
  }

  function sparks(x, y, color, n) {
    var w = W(), m = M();
    for (var i = 0; i < n; i++) {
      var a = m.rnd(0, 6.2832), sp = m.rnd(140, 360);
      w.sparks.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        c: color, t: 0, life: m.rnd(.12, .3)
      });
    }
  }

  function sparkle(x, y, c) { sparks(x, y, c, 8); burst(x, y, c, 6); }

  function spinBurst(u, r, c) {
    var w = W();
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * 6.2832;
      w.sparks.push({
        x: u.x + Math.cos(a) * r * .7, y: u.y + Math.sin(a) * r * .7,
        vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, c: c, t: 0, life: .2
      });
    }
  }

  function ember(x, y, color, life) {
    W().embers.push({
      x: x, y: y, vy: M().rnd(-42, -14), c: color,
      t: 0, life: life || 1, r: M().rnd(1.2, 2.2)
    });
  }

  /* ---------------- геометрия ---------------- */
  /** Размашистая дуга удара ближнего боя: видно, что это замах, а не выстрел. */
  function swipe(u, angle, radius, color) {
    W().swipes.push({
      unit: u, a: angle, r: radius, c: color,
      t: 0, life: .26, arc: 1.5
    });
  }

  /** Вспышка выстрела у дальнобойного: короткая, у самого оружия. */
  function muzzle(x, y, angle, color) {
    W().muzzles.push({ x: x, y: y, a: angle, c: color, t: 0, life: .13 });
  }

  function ring(x, y, r, color) { W().rings.push({ x: x, y: y, r: 12, max: r, c: color, t: 0, life: .48 }); }
  function aura(u, r, color) { W().auras.push({ x: u.x, y: u.y, r: r, c: color }); }
  function slash(a, b, color) { W().slashes.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, c: color, t: 0, life: .2 }); }
  function pillar(x, y, c) { W().pillars.push({ x: x, y: y, c: c, t: 0, life: .5 }); }
  function bolt(x1, y1, x2, y2, c, life) { W().bolts.push({ x1: x1, y1: y1, x2: x2, y2: y2, c: c, t: 0, life: life || .32 }); }

  /** Предупреждающий круг, срабатывает через delay. Автобой из него уходит. */
  function telegraph(x, y, r, color, delay, done) {
    W().tele.push({ x: x, y: y, r: r, c: color, t: 0, life: delay, done: done });
  }

  /** Долгоживущая площадная зона (град, терния, лава). */
  function zone(o) {
    W().zones.push({
      x: o.x, y: o.y, r: o.r, t: 0, life: o.dur, src: o.src,
      c: o.color, style: o.style || 'circle', onTick: o.onTick
    });
  }

  /** Стена: отрезок, который каждый кадр задевает пересекающих. */
  function wall(u, angle, len, dur, color, fn) {
    W().walls.push({
      x: u.x + Math.cos(angle) * 120, y: u.y + Math.sin(angle) * 120,
      a: angle + Math.PI / 2, len: len, t: 0, life: dur, c: color, fn: fn, src: u
    });
  }

  /** Мгновенный конус: применяет fn ко всем врагам в секторе. */
  function cone(u, angle, range, half, color, fn) {
    var w = W(), m = M();
    w.cones.push({ x: u.x, y: u.y, a: angle, range: range, half: half, c: color, t: 0, life: .3 });
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team === u.team) continue;
      if (m.dist(u, e) > range) continue;
      if (m.angleDiff(m.angleTo(u, e), angle) <= half) fn(e);
    }
  }

  /* ---------------- камера и время ---------------- */
  function shake(mag) {
    if (!shakeEnabled) return;
    var w = W();
    w.shakeMag = Math.max(w.shakeMag, mag);
    w.shakeT = .3;
  }
  function flash(color, t) {
    var w = W();
    w.flashC = color;
    w.flashT = Math.max(w.flashT, t);
  }
  /** Микрозаморозка времени — делает удары весомее. */
  function hitstop(t) {
    var w = W();
    w.hitstop = Math.max(w.hitstop, t);
  }

  function timer(t, fn) { W().timers.push({ t: t, fn: fn }); }

  /* ---------------- обновление за кадр ---------------- */
  function update(dt) {
    var w = W(), i, o;

    for (i = w.timers.length - 1; i >= 0; i--) {
      o = w.timers[i]; o.t -= dt;
      if (o.t <= 0) { w.timers.splice(i, 1); o.fn(); }
    }
    for (i = w.tele.length - 1; i >= 0; i--) {
      o = w.tele[i]; o.t += dt;
      if (o.t >= o.life) { w.tele.splice(i, 1); if (o.done) o.done(); }
    }
    for (i = w.zones.length - 1; i >= 0; i--) {
      o = w.zones[i]; o.t += dt;
      if (o.onTick) o.onTick(o, dt);
      if (o.t >= o.life) w.zones.splice(i, 1);
    }
    for (i = w.walls.length - 1; i >= 0; i--) {
      o = w.walls[i]; o.t += dt;
      applyWall(o, dt);
      if (o.t >= o.life) w.walls.splice(i, 1);
    }
    for (i = w.parts.length - 1; i >= 0; i--) {
      o = w.parts[i]; o.t += dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= .93; o.vy *= .93;
      if (o.t >= o.life) w.parts.splice(i, 1);
    }
    for (i = w.sparks.length - 1; i >= 0; i--) {
      o = w.sparks[i]; o.t += dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= .85; o.vy *= .85;
      if (o.t >= o.life) w.sparks.splice(i, 1);
    }
    for (i = w.embers.length - 1; i >= 0; i--) {
      o = w.embers[i]; o.t += dt;
      o.y += o.vy * dt;
      o.x += Math.sin(w.time * 2 + o.y * .05) * 8 * dt;
      if (o.t >= o.life) w.embers.splice(i, 1);
    }
    for (i = w.floats.length - 1; i >= 0; i--) {
      o = w.floats[i]; o.t += dt;
      o.y += o.vy * dt; o.x += o.vx * dt; o.vy *= .92;
      if (o.t >= o.life) w.floats.splice(i, 1);
    }
    ['rings', 'bolts', 'slashes', 'corpses', 'pillars', 'cones', 'swipes', 'muzzles'].forEach(function (k) {
      var list = w[k];
      for (var j = list.length - 1; j >= 0; j--) {
        list[j].t += dt;
        if (list[j].t >= list[j].life) list.splice(j, 1);
      }
    });

    if (w.shakeT > 0) { w.shakeT -= dt; if (w.shakeT <= 0) w.shakeMag = 0; }
    if (w.flashT > 0) w.flashT = Math.max(0, w.flashT - dt * 2.2);

    // фоновые угольки под цвет карты — только в видимой области
    if (w.map && Math.random() < dt * 14) {
      ember(M().rnd(w.cam.x, w.cam.x + w.view.w),
        w.cam.y + w.view.h, w.map.accent, M().rnd(2, 4.5));
    }
  }

  function applyWall(wa, dt) {
    var w = W(), m = M();
    var hx = Math.cos(wa.a), hy = Math.sin(wa.a);
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team === wa.src.team) continue;
      var proj = m.clamp((e.x - wa.x) * hx + (e.y - wa.y) * hy, -wa.len / 2, wa.len / 2);
      var px = wa.x + hx * proj, py = wa.y + hy * proj;
      if (m.d2(e.x, e.y, px, py) < (22 + e.r) * (22 + e.r)) wa.fn(e, dt);
    }
  }

  return {
    floatText: floatText, burst: burst, sparks: sparks, sparkle: sparkle,
    spinBurst: spinBurst, ember: ember, swipe: swipe, muzzle: muzzle,
    ring: ring, aura: aura, slash: slash, pillar: pillar, bolt: bolt,
    telegraph: telegraph, zone: zone, wall: wall, cone: cone,
    shake: shake, flash: flash, hitstop: hitstop, timer: timer,
    update: update,
    setShake: function (v) { shakeEnabled = v; }
  };
})());
