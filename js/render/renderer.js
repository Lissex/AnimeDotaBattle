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
    fx.shocks();
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

  /** Постобработка идёт в экранных координатах, а не мировых.
      Порядок важен: сначала тон карты и туман, потом свет, потом
      сигнальные слои — иначе вспышки уходят под затемнение. */
  function post(ctx, w, m) {
    var vw = w.view.w, vh = w.view.h;
    var h = w.hero;

    // виньетка и туман строятся вокруг героя, а не центра экрана:
    // камера ведёт с опережением, и центр кадра — не там, где игрок
    var fx = vw / 2, fy = vh / 2;
    if (h && !h.dead) {
      fx = m.clamp(h.x - w.cam.x, vw * .2, vw * .8);
      fy = m.clamp(h.y - w.cam.y, vh * .2, vh * .8);
    }

    if (w.map) {
      ctx.fillStyle = w.map.tint;
      ctx.fillRect(0, 0, vw, vh);

      // туман глубины: даль уходит в цвет неба карты, а не в чёрный —
      // из-за этого арена читается объёмной
      var far = m.rgba(w.map.fog || w.map.accent, .16);
      var fog = ctx.createRadialGradient(
        fx, fy, Math.min(vw, vh) * .18,
        fx, fy, Math.max(vw, vh) * .72
      );
      fog.addColorStop(0, 'rgba(0,0,0,0)');
      fog.addColorStop(.62, m.rgba(w.map.fog || w.map.accent, .05));
      fog.addColorStop(1, far);
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, vw, vh);

      var v = ctx.createRadialGradient(
        fx, fy, Math.min(vw, vh) * .3,
        fx, fy, Math.max(vw, vh) * .82
      );
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,.72)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, vw, vh);

      // тёплый контровой свет от акцента карты по краю кадра
      var rim = ctx.createLinearGradient(0, 0, 0, vh);
      rim.addColorStop(0, m.rgba(w.map.accent, .10));
      rim.addColorStop(.45, 'rgba(0,0,0,0)');
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, vw, vh);
    }

    // мягкая засветка добивания — осветляющая, поверх затемнения
    if (w.bloomT > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(.32, w.bloomT * .3);
      ctx.fillStyle = w.bloomC;
      ctx.fillRect(0, 0, vw, vh);
      ctx.restore();
    }

    if (w.flashT > 0) {
      ctx.globalAlpha = Math.min(.5, w.flashT * .65);
      ctx.fillStyle = w.flashC;
      ctx.fillRect(0, 0, vw, vh);
      ctx.globalAlpha = 1;
    }

    // красная кайма при низком здоровье
    if (h && !h.dead && h.hp / h.maxHp < .3) {
      var pulse = .18 + Math.sin(w.time * 6) * .08;
      var g = ctx.createRadialGradient(
        fx, fy, Math.min(vw, vh) * .3,
        fx, fy, Math.max(vw, vh) * .7
      );
      g.addColorStop(0, 'rgba(255,0,30,0)');
      g.addColorStop(1, 'rgba(255,0,30,' + pulse + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  return { draw: draw };
})());
