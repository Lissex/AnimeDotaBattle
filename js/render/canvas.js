/* render/canvas — холст, масштаб под плотность пикселей,
   размеры видимой области и всего мира.

   Мир крупнее экрана: на телефоне примерно вдвое, на широком
   мониторе — меньше, чтобы арена не превращалась в пустое поле. */
AA.module('render/canvas', (function () {
  'use strict';

  var el = null, ctx = null, dpr = 1;

  var WORLD_MIN_W = 1700, WORLD_MIN_H = 1250;
  var WORLD_MAX_W = 2600, WORLD_MAX_H = 1900;

  function W() { return AA.Game.world.state; }

  function attach(canvasEl) {
    el = canvasEl;
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  }

  function resize() {
    if (!el) return;
    var w = W(), m = AA.Core.math;
    var rect = el.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* --- видимая область --- */
    w.view.w = Math.max(320, Math.round(rect.width));
    w.view.h = Math.max(240, Math.round(rect.height));

    el.width = Math.round(w.view.w * dpr);
    el.height = Math.round(w.view.h * dpr);
    ctx = el.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* --- размер мира --- */
    w.w = Math.round(m.clamp(w.view.w * 2.05, WORLD_MIN_W, WORLD_MAX_W));
    w.h = Math.round(m.clamp(w.view.h * 2.05, WORLD_MIN_H, WORLD_MAX_H));

    // раскладка карты и погода зависят от размеров — перестраиваем
    if (w.mapId) {
      AA.Game.terrain.build(w.mapId);
      AA.Render.ground.rebuild();
      AA.Render.fx.resetWeather();
    }
    for (var i = 0; i < w.units.length; i++) AA.Game.world.confine(w.units[i]);
    AA.Game.camera.snap();
  }

  /** Временно подменяет контекст — для запекания фона и портретов. */
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
