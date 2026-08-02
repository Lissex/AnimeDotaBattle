/* render/ground — фон карты запекается один раз в отдельный холст:
   градиент, процедурная текстура, руническая печать, плоские декали.
   За кадр это одна операция drawImage вместо тысяч примитивов. */
AA.module('render/ground', (function () {
  'use strict';

  var buffer = null, bctx = null;

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  function rebuild() {
    var w = W(), m = M();
    if (!w.w || !w.h) return;

    // фон запекается в размер мира, а он большой — плотность
    // держим на единице, иначе холст съедает десятки мегабайт
    if (!buffer) { buffer = document.createElement('canvas'); bctx = buffer.getContext('2d'); }
    buffer.width = Math.round(w.w);
    buffer.height = Math.round(w.h);
    bctx.setTransform(1, 0, 0, 1, 0, 0);

    var map = w.map || AA.Content.maps.get('butcher');
    baseGradient(map);
    texture(map);
    runeSeal(map);
    decals();
    border(map);
  }

  function baseGradient(map) {
    var w = W();
    var g = bctx.createRadialGradient(
      w.w / 2, w.h / 2, 40,
      w.w / 2, w.h / 2, Math.max(w.w, w.h) * .82
    );
    g.addColorStop(0, map.floor);
    g.addColorStop(.6, map.floor2);
    g.addColorStop(1, '#04060a');
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, w.w, w.h);
  }

  function texture(map) {
    var w = W(), rand = M().seeded(1337), i;
    var grains = Math.round(w.w * w.h / 1600);   // плотность под площадь мира
    bctx.globalAlpha = .06;
    for (i = 0; i < grains; i++) {
      var s = rand() * 2.6 + .4;
      bctx.fillStyle = rand() > .5 ? '#ffffff' : '#000000';
      bctx.fillRect(rand() * w.w, rand() * w.h, s, s);
    }
    bctx.globalAlpha = .05;
    for (i = 0; i < 160; i++) {
      var r = 30 + rand() * 90;
      bctx.fillStyle = rand() > .5 ? map.accent : '#000000';
      bctx.beginPath();
      bctx.ellipse(rand() * w.w, rand() * w.h, r, r * (.4 + rand() * .5), rand() * 3, 0, 6.2832);
      bctx.fill();
    }
    bctx.globalAlpha = 1;
  }

  function runeSeal(map) {
    var w = W();
    var cx = w.w / 2, cy = w.h / 2;
    var r = Math.min(w.w, w.h) * .28;
    bctx.save();
    bctx.globalAlpha = .16;
    bctx.strokeStyle = map.accent;
    bctx.lineWidth = 2;
    bctx.beginPath(); bctx.arc(cx, cy, r, 0, 6.2832); bctx.stroke();
    bctx.beginPath(); bctx.arc(cx, cy, r * .7, 0, 6.2832); bctx.stroke();
    bctx.translate(cx, cy);
    bctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * 6.2832;
      var x = Math.cos(a) * r * .86, y = Math.sin(a) * r * .86;
      if (i === 0) bctx.moveTo(x, y); else bctx.lineTo(x, y);
    }
    bctx.closePath(); bctx.stroke();
    bctx.restore();
  }

  function decals() {
    var w = W();
    AA.Render.canvas.withContext(bctx, function () {
      for (var i = 0; i < w.decals.length; i++) {
        AA.Render.props.drawDecal(w.decals[i], false);
      }
    });
  }

  function border(map) {
    var w = W(), m = M();
    var x = w.PAD * .55, y = w.PAD * .55;
    var bw = w.w - w.PAD * 1.1, bh = w.h - w.PAD * 1.1;
    bctx.strokeStyle = 'rgba(0,0,0,.5)'; bctx.lineWidth = 10;
    bctx.strokeRect(x - 6, y - 6, bw + 12, bh + 12);
    bctx.strokeStyle = m.rgba(map.accent, .34); bctx.lineWidth = 2;
    bctx.strokeRect(x, y, bw, bh);
  }

  /** Рисуем только тот кусок мира, который попадает в кадр. */
  function draw() {
    var w = W();
    if (!buffer) return;
    var ctx = AA.Render.canvas.get();
    var sx = Math.max(0, Math.floor(w.cam.x));
    var sy = Math.max(0, Math.floor(w.cam.y));
    var sw = Math.min(buffer.width - sx, Math.ceil(w.view.w));
    var sh = Math.min(buffer.height - sy, Math.ceil(w.view.h));
    if (sw <= 0 || sh <= 0) return;
    ctx.drawImage(buffer, sx, sy, sw, sh, sx, sy, sw, sh);
  }

  return { rebuild: rebuild, draw: draw };
})());
