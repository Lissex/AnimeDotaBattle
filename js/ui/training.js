/* ui/training — панель учебного полигона. */
AA.module('ui/training', (function () {
  'use strict';

  function D() { return AA.UI.dom; }

  function setVisible(on) {
    var d = D();
    d.$('train-panel').style.display = on ? '' : 'none';
    d.$('bh-wave').style.display = on ? 'none' : '';
  }

  function bind() {
    var d = D();
    d.$('tr-mob').onclick = function () { AA.Game.waves.trainingSpawn('mob'); };
    d.$('tr-boss').onclick = function () { AA.Game.waves.trainingSpawn('boss'); };
    d.$('tr-clear').onclick = function () {
      AA.Game.waves.trainingClear();
      AA.UI.toast.show('Арена очищена');
    };
    d.$('tr-shop').onclick = function () { AA.UI.shop.open(); };
    d.$('tr-skills').onclick = function () { AA.UI.skilltree.open(); };
  }

  return { setVisible: setVisible, bind: bind };
})());
