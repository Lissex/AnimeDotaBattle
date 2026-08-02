/* render/canvas — холст, масштаб под плотность пикселей, размеры арены.
   Все остальные модули отрисовки берут контекст отсюда. */
AA.module('render/canvas', (function () {
  'use strict';

  var el = null, ctx = null, dpr = 1;

  function W() { return AA.Game.world.state; }

  function attach(canvasEl) {
    el = canvasEl;
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  }

  function resize() {
    if (!el) return;
    var w = W();
    var rect = el.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    w.w = Math.max(320, Math.round(rect.width));
    w.h = Math.max(240, Math.round(rect.height));
    el.width = Math.round(w.w * dpr);
    el.height = Math.round(w.h * dpr);

    ctx = el.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // раскладка карты и погода зависят от размеров — перестраиваем
    if (w.mapId) {
      AA.Game.terrain.build(w.mapId);
      AA.Render.ground.rebuild();
      AA.Render.fx.resetWeather();
    }
    for (var i = 0; i < w.units.length; i++) AA.Game.world.confine(w.units[i]);
  }

  /** Временно подменяет контекст — нужно для запекания фона и портретов. */
  function withContext(other, fn) {
    var prev = ctx;
    ctx = other;
    try { fn(); } finally { ctx = prev; }
  }

  return {
    attach: attach,
    resize: resize,
    withContext: withContext,
    get: function () { return ctx; },
    dpr: function () { return dpr; },
    reset: function () { if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  };
})());
