/* ui/settings — настройки игры.
   Здесь же переключение между режимом отладки и честной игрой:
   отладка включается сама, когда SDK не загрузился, но её можно
   выключить и играть по нормальным правилам локально. */
AA.module('ui/settings', (function () {
  'use strict';

  function D() { return AA.UI.dom; }
  function save() { return AA.Platform.storage.data; }

  function open() {
    sync();
    AA.UI.screens.open('settings');
  }

  /** Подтянуть значения из сейва в контролы. */
  function sync() {
    var d = D(), s = save();
    d.$('set-sound').checked = s.sound !== false;
    d.$('set-shake').checked = s.shake !== false;
    d.$('set-numbers').checked = s.numbers !== false;

    var sdkMissing = AA.Platform.sdk.isDev();
    var row = d.$('set-mode-row');
    row.style.display = sdkMissing ? '' : 'none';
    d.$('set-game-mode').checked = !!s.forceGame;
    d.$('set-mode-hint').textContent = s.forceGame
      ? 'Честный режим: души и золото копятся как на Яндексе.'
      : 'Отладка: всё открыто, валюта бесконечна.';
  }

  function bind() {
    var d = D();

    d.$('set-sound').onchange = function () {
      save().sound = this.checked;
      AA.Core.audio.set(this.checked);
      AA.Platform.storage.commit();
    };

    d.$('set-shake').onchange = function () {
      save().shake = this.checked;
      AA.Game.effects.setShake(this.checked);
      AA.Platform.storage.commit();
    };

    d.$('set-numbers').onchange = function () {
      save().numbers = this.checked;
      AA.Platform.storage.commit();
    };

    // главный тумблер: отладка ↔ честная игра
    d.$('set-game-mode').onchange = function () {
      save().forceGame = this.checked;
      AA.Platform.storage.commit(true);
      sync();
      AA.UI.menu.refresh();
      AA.UI.toast.show(this.checked ? 'Игровой режим' : 'Режим отладки');
    };

    d.$('btn-settings-close').onclick = function () { AA.UI.screens.close('settings'); };

    d.$('btn-reset').onclick = function () {
      var btn = this;
      if (btn.dataset.armed !== '1') {              // двойное подтверждение
        btn.dataset.armed = '1';
        btn.textContent = 'ТОЧНО СБРОСИТЬ?';
        btn.classList.add('danger');
        setTimeout(function () {
          btn.dataset.armed = '0';
          btn.textContent = 'СБРОСИТЬ ПРОГРЕСС';
          btn.classList.remove('danger');
        }, 4000);
        return;
      }
      AA.Platform.storage.reset();
      btn.dataset.armed = '0';
      btn.textContent = 'СБРОСИТЬ ПРОГРЕСС';
      btn.classList.remove('danger');
      sync();
      AA.UI.menu.refresh();
      AA.UI.toast.show('Прогресс сброшен');
    };
  }

  return { open: open, bind: bind, sync: sync };
})());
