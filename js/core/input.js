/* core/input — сырое состояние ввода. Кто на него подписан и что
   означает конкретная клавиша, решает ui/controls. */
AA.module('core/input', (function () {
  'use strict';

  var state = {
    up: 0, down: 0, left: 0, right: 0,
    stick: { x: 0, y: 0, on: false },
    // приказ правой кнопкой: идти в точку и бить, что там стоит
    order: { x: 0, y: 0, active: false, target: null },
    cursor: { x: 0, y: 0, on: false },
    touch: false
  };

  /** Единичный вектор движения из клавиш, стика или приказа мышью. */
  function moveVector(unit) {
    var x, y;

    if (state.stick.on) { x = state.stick.x; y = state.stick.y; }
    else {
      x = (state.right ? 1 : 0) - (state.left ? 1 : 0);
      y = (state.down ? 1 : 0) - (state.up ? 1 : 0);
    }

    // клавиши имеют приоритет: любое нажатие отменяет приказ мышью
    if (x || y) { state.order.active = false; }
    else if (state.order.active && unit) {
      var tx = state.order.x, ty = state.order.y;
      var t = state.order.target;
      if (t && !t.dead) { tx = t.x; ty = t.y; }

      var dx = tx - unit.x, dy = ty - unit.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      // дошли: до точки — вплотную, до цели — на дистанцию атаки
      var stopAt = (t && !t.dead) ? (unit.stats.range * .8) : 14;
      if (d <= stopAt) { state.order.active = false; x = 0; y = 0; }
      else { x = dx / d; y = dy / d; }
    }

    var len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }
    return { x: x, y: y, len: len };
  }

  function order(x, y, target) {
    state.order.x = x;
    state.order.y = y;
    state.order.target = target || null;
    state.order.active = true;
  }
  function clearOrder() { state.order.active = false; state.order.target = null; }

  function clearKeys() { state.up = state.down = state.left = state.right = 0; }

  return {
    state: state,
    moveVector: moveVector,
    clearKeys: clearKeys,
    order: order,
    clearOrder: clearOrder,
    setKey: function (k, v) { state[k] = v; },
    setStick: function (x, y, on) { state.stick.x = x; state.stick.y = y; state.stick.on = on; },
    setCursor: function (x, y, on) { state.cursor.x = x; state.cursor.y = y; state.cursor.on = on; },
    markTouch: function () { state.touch = true; },
    isTouch: function () { return state.touch; }
  };
})());
