/* render/renderer — порядок сборки кадра.
   Читать сверху вниз: это и есть слои картинки. */
AA.module('render/renderer', (function () {
  'use strict';

  function C() { return AA.Render.canvas.get(); }
  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  function draw(dt) {
    var ctx = C();
    if (!ctx) return;
    var w = W(), m = M(), fx = AA.Render.fx;

    AA.Render.canvas.reset();
    ctx.clearRect(0, 0, w.w, w.h);

    /* --- тряска камеры --- */
    var ox = 0, oy = 0;
    if (w.shakeT > 0) {
      var k = w.shakeMag * (w.shakeT / .3);
      ox = m.rnd(-k, k); oy = m.rnd(-k, k);
    }
    ctx.save();
    ctx.translate(ox, oy);

    /* --- 1. земля --- */
    AA.Render.ground.draw();
    AA.Render.props.drawAnimatedDecals();

    /* --- 2. под ногами --- */
    fx.zones();
    fx.runes();
    fx.auras();
    fx.corpses();
    fx.telegraphs();
    fx.rings();
    fx.cones();
    fx.lights();

    /* --- 3. объекты с глубиной --- */
    depthSorted(ctx);

    /* --- 4. поверх --- */
    fx.bolts();
    fx.pillars();
    fx.slashes();
    fx.projectiles();
    fx.particles();
    fx.weather(dt || 0);
    fx.numbers();

    ctx.restore();

    /* --- 5. постобработка --- */
    post(ctx, w, m);
  }

  /** Препятствия и юниты рисуются вперемешку по координате Y. */
  function depthSorted(ctx) {
    var w = W(), list = [], i;
    for (i = 0; i < w.props.length; i++) list.push(w.props[i]);
    for (i = 0; i < w.units.length; i++) if (!w.units[i].dead) list.push(w.units[i]);
    list.sort(byY);
    for (i = 0; i < list.length; i++) {
      if (list[i].meta) AA.Render.props.draw(list[i]);
      else AA.Render.units.draw(list[i]);
    }
  }
  function byY(a, b) { return a.y - b.y; }

  function post(ctx, w, m) {
    if (w.map) {
      ctx.fillStyle = w.map.tint;
      ctx.fillRect(0, 0, w.w, w.h);

      var v = ctx.createRadialGradient(
        w.w / 2, w.h / 2, Math.min(w.w, w.h) * .32,
        w.w / 2, w.h / 2, Math.max(w.w, w.h) * .8
      );
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,.7)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w.w, w.h);
    }

    if (w.flashT > 0) {
      ctx.globalAlpha = Math.min(.5, w.flashT * .65);
      ctx.fillStyle = w.flashC;
      ctx.fillRect(0, 0, w.w, w.h);
      ctx.globalAlpha = 1;
    }

    // красная кайма при низком здоровье
    var h = w.hero;
    if (h && !h.dead && h.hp / h.maxHp < .3) {
      var pulse = .18 + Math.sin(w.time * 6) * .08;
      var g = ctx.createRadialGradient(
        w.w / 2, w.h / 2, Math.min(w.w, w.h) * .3,
        w.w / 2, w.h / 2, Math.max(w.w, w.h) * .7
      );
      g.addColorStop(0, 'rgba(255,0,30,0)');
      g.addColorStop(1, 'rgba(255,0,30,' + pulse + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w.w, w.h);
    }
  }

  return { draw: draw };
})());
