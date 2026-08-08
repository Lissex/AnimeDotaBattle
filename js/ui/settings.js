/* ui/settings — настройки игры: звук, музыка, тряска, числа урона
   и сброс прогресса. */
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
    d.$('set-music').checked = s.music !== false;
    d.$('set-shake').checked = s.shake !== false;
    d.$('set-numbers').checked = s.numbers !== false;
  }

  function bind() {
    var d = D();

    d.$('set-sound').onchange = function () {
      save().sound = this.checked;
      AA.Core.audio.set(this.checked);
      AA.Platform.storage.commit();
    };

    d.$('set-music').onchange = function () {
      save().music = this.checked;
      AA.Core.audio.setMusic(this.checked);
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
