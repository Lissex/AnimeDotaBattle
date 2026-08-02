/* render/minimap — компактная карта мира в углу экрана.
   Мир больше кадра, поэтому без неё непонятно, откуда идут враги
   и где лежит руна. */
AA.module('render/minimap', (function () {
  'use strict';

  var SIZE = 108;      // сторона карты в пикселях
  var MARGIN = 12;

  function C() { return AA.Render.canvas.get(); }
  function W() { return AA.Game.world.state; }

  function rect() {
    var w = W();
    var s = w.view.w < 620 ? SIZE * .78 : SIZE;
    return {
      x: w.view.w - s - MARGIN,
      y: MARGIN + 46,           // под верхней строкой HUD
      s: s
    };
  }

  function draw() {
    var ctx = C(), w = W();
    if (!ctx || !w.map || !w.w) return;

    var r = rect();
    var kx = r.s / w.w, ky = r.s / w.h;

    ctx.save();

    /* подложка */
    ctx.globalAlpha = .82;
    ctx.fillStyle = 'rgba(6,9,18,.9)';
    ctx.fillRect(r.x, r.y, r.s, r.s);
    ctx.strokeStyle = w.map.accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = .5;
    ctx.strokeRect(r.x, r.y, r.s, r.s);
    ctx.globalAlpha = 1;

    /* препятствия — общий рельеф */
    ctx.fillStyle = 'rgba(120,130,170,.32)';
    for (var i = 0; i < w.props.length; i++) {
      var p = w.props[i];
      ctx.fillRect(r.x + p.x * kx - 1, r.y + p.y * ky - 1, 2.4, 2.4);
    }

    /* руны */
    for (i = 0; i < w.runes.length; i++) {
      var rn = w.runes[i];
      ctx.fillStyle = rn.def.color;
      ctx.beginPath();
      ctx.arc(r.x + rn.x * kx, r.y + rn.y * ky, 3, 0, 6.2832);
      ctx.fill();
    }

    /* юниты */
    for (i = 0; i < w.units.length; i++) {
      var u = w.units[i];
      if (u.dead) continue;
      var x = r.x + u.x * kx, y = r.y + u.y * ky;

      if (u === w.hero) continue;                    // героя рисуем последним
      if (u.team === 0) {                            // иллюзии
        ctx.fillStyle = 'rgba(140,220,255,.75)';
        ctx.fillRect(x - 1.4, y - 1.4, 2.8, 2.8);
      } else if (u.isBoss) {
        ctx.fillStyle = u.glow;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.2832); ctx.fill();
      } else {
        ctx.fillStyle = '#ff6a5a';
        ctx.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
      }
    }

    /* рамка кадра */
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      r.x + w.cam.x * kx, r.y + w.cam.y * ky,
      w.view.w * kx, w.view.h * ky
    );

    /* герой */
    if (w.hero && !w.hero.dead) {
      var hx = r.x + w.hero.x * kx, hy = r.y + w.hero.y * ky;
      ctx.fillStyle = '#ffd24a';
      ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, 6.2832); ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  return { draw: draw, rect: rect };
})());
