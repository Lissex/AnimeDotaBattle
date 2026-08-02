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
    ctx.clearRect(0, 0, w.view.w, w.view.h);

    /* --- тряска камеры --- */
    var ox = 0, oy = 0;
    if (w.shakeT > 0) {
      var k = w.shakeMag * (w.shakeT / .3);
      ox = m.rnd(-k, k); oy = m.rnd(-k, k);
    }
    // всё, что ниже, рисуется в мировых координатах
    ctx.save();
    ctx.translate(ox - w.cam.x, oy - w.cam.y);

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
    fx.swipes();
    fx.bolts();
    fx.pillars();
    fx.slashes();
    fx.muzzles();
    fx.projectiles();
    fx.particles();
    fx.numbers();

    ctx.restore();

    /* --- 5. экранные слои: погода, постобработка, миникарта --- */
    fx.weather(dt || 0);
    post(ctx, w, m);
    AA.Render.minimap.draw();
  }

  /** Препятствия и юниты рисуются вперемешку по координате Y.
      За кадр берём только то, что попадает в видимую область. */
  function depthSorted(ctx) {
    var w = W(), world = AA.Game.world, list = [], i;
    for (i = 0; i < w.props.length; i++) {
      var p = w.props[i];
      if (world.onScreen(p.x, p.y, 160)) list.push(p);
    }
    for (i = 0; i < w.units.length; i++) {
      var u = w.units[i];
      if (!u.dead && world.onScreen(u.x, u.y, 120)) list.push(u);
    }
    list.sort(byY);
    for (i = 0; i < list.length; i++) {
      // разделяем по явному флагу: раньше проверяли поле meta, но
      // его же завёл себе юнит в Метаморфозе — и герой пропадал,
      // потому что рендер принимал его за объект ландшафта
      if (list[i].isProp) AA.Render.props.draw(list[i]);
      else AA.Render.units.draw(list[i]);
    }
  }
  function byY(a, b) { return a.y - b.y; }

  /** Постобработка идёт в экранных координатах, а не мировых. */
  function post(ctx, w, m) {
    var vw = w.view.w, vh = w.view.h;

    if (w.map) {
      ctx.fillStyle = w.map.tint;
      ctx.fillRect(0, 0, vw, vh);

      var v = ctx.createRadialGradient(
        vw / 2, vh / 2, Math.min(vw, vh) * .32,
        vw / 2, vh / 2, Math.max(vw, vh) * .8
      );
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,.7)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, vw, vh);
    }

    if (w.flashT > 0) {
      ctx.globalAlpha = Math.min(.5, w.flashT * .65);
      ctx.fillStyle = w.flashC;
      ctx.fillRect(0, 0, vw, vh);
      ctx.globalAlpha = 1;
    }

    // красная кайма при низком здоровье
    var h = w.hero;
    if (h && !h.dead && h.hp / h.maxHp < .3) {
      var pulse = .18 + Math.sin(w.time * 6) * .08;
      var g = ctx.createRadialGradient(
        vw / 2, vh / 2, Math.min(vw, vh) * .3,
        vw / 2, vh / 2, Math.max(vw, vh) * .7
      );
      g.addColorStop(0, 'rgba(255,0,30,0)');
      g.addColorStop(1, 'rgba(255,0,30,' + pulse + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  return { draw: draw };
})());
