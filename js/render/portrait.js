/* render/portrait — рисует героя или врага в маленький холст для UI.
   Переиспользует те же силуэты, что и бой, — портрет всегда совпадает. */
AA.module('render/portrait', (function () {
  'use strict';

  /**
   * @param {HTMLCanvasElement} el
   * @param {object} def  описание из content/heroes или content/enemies
   */
  function draw(el, def, skin) {
    var ctx = el.getContext('2d');
    var size = el.width;

    ctx.clearRect(0, 0, size, size);

    var g = ctx.createRadialGradient(size * .5, size * .34, size * .04, size * .5, size * .5, size * .78);
    g.addColorStop(0, def.c1);
    g.addColorStop(.5, def.c2);
    g.addColorStop(1, '#070a12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    var isEnemy = String(def.shape).indexOf('e_') === 0;
    var mock = {
      r: size * (isEnemy ? .3 : .24), shape: def.shape, anim: def.anim,
      c1: def.c1, c2: def.c2, glow: def.glow, skin: skin || null,
      face: -.35, vx: 0, vy: 0, step: 0, swing: 0, flash: 0, wob: 0,
      isBoss: String(def.shape).indexOf('e_boss') === 0
    };

    ctx.save();
    if (isEnemy) {
      ctx.translate(size / 2, size / 2);
      ctx.rotate(-.45);
      AA.Render.shapes.enemy(ctx, mock, def.c1, def.c2, def.glow || '#ff5a4a', 0);
    } else {
      // герой стоит в полный рост — сдвигаем, чтобы фигура попала в кадр
      ctx.translate(size * .46, size * .62);
      AA.Render.shapes.hero(ctx, mock, 0);
    }
    ctx.restore();
  }

  /** Готовый <canvas> нужного размера — удобно вставлять в разметку. */
  function element(size, def, skin) {
    var c = document.createElement('canvas');
    c.width = c.height = size * 2;
    c.style.width = c.style.height = '100%';
    draw(c, def, skin);
    return c;
  }

  return { draw: draw, element: element };
})());
