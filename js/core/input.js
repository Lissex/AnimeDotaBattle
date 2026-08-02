/* core/input — сырое состояние ввода. Кто на него подписан и что
   означает конкретная клавиша, решает ui/controls. */
AA.module('core/input', (function () {
  'use strict';

  var state = {
    up: 0, down: 0, left: 0, right: 0,
    stick: { x: 0, y: 0, on: false },
    touch: false
  };

  /** Единичный вектор движения из клавиш или стика. */
  function moveVector() {
    var x, y;
    if (state.stick.on) { x = state.stick.x; y = state.stick.y; }
    else {
      x = (state.right ? 1 : 0) - (state.left ? 1 : 0);
      y = (state.down ? 1 : 0) - (state.up ? 1 : 0);
    }
    var len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }
    return { x: x, y: y, len: len };
  }

  function clearKeys() { state.up = state.down = state.left = state.right = 0; }

  return {
    state: state,
    moveVector: moveVector,
    clearKeys: clearKeys,
    setKey: function (k, v) { state[k] = v; },
    setStick: function (x, y, on) { state.stick.x = x; state.stick.y = y; state.stick.on = on; },
    markTouch: function () { state.touch = true; },
    isTouch: function () { return state.touch; }
  };
})());
