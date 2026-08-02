/* ui/toast — короткие всплывающие подсказки.
   Одинаковые сообщения не дублируются чаще раза в секунду. */
AA.module('ui/toast', (function () {
  'use strict';

  var last = {};

  function show(msg) {
    var D = AA.UI.dom;
    msg = D.t(msg);
    if (last[msg] && Date.now() - last[msg] < 900) return;
    last[msg] = Date.now();

    var el = D.el('div', 'toast');
    el.textContent = msg;
    D.$('toast-wrap').appendChild(el);
    setTimeout(function () { el.remove(); }, 1600);
  }

  return { show: show };
})());
