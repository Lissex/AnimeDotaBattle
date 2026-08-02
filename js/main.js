/* main — точка входа: загрузка, жизненный цикл вкладки, сборка слоёв.
   Ничего игрового здесь нет, только связывание. */
(function () {
  'use strict';

  /* ---------------- индикатор загрузки ---------------- */
  function progress(percent, hint) {
    var fill = document.getElementById('load-fill');
    var text = document.getElementById('load-hint');
    if (fill) fill.style.width = percent + '%';
    if (text && hint) text.textContent = AA.Platform.i18n.t(hint);
  }

  /* ---------------- локализация статичной разметки ---------------- */
  function applyLang() {
    if (AA.Platform.i18n.lang() === 'ru') return;
    var t = AA.Platform.i18n.t;

    [['btn-play', 'В БОЙ'], ['btn-heroes', 'ГЕРОИ'], ['btn-training', 'УЧЕБНЫЙ ПОЛИГОН'],
    ['btn-howto', 'КАК ИГРАТЬ'], ['btn-next-wave', 'СЛЕДУЮЩАЯ ВОЛНА'], ['btn-lvlup', 'УМЕНИЯ'],
    ['btn-autobuy', 'АВТОЗАКУП'], ['btn-autolevel', 'РАСПРЕДЕЛИТЬ САМО'],
    ['btn-resume', 'ПРОДОЛЖИТЬ'], ['btn-quit', 'СДАТЬСЯ'], ['btn-again', 'ЕЩЁ РАЗ'],
    ['over-title', 'ПОРАЖЕНИЕ']].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.textContent = t(pair[1]);
    });

    var titles = { 'ЛАВКА': 1, 'УМЕНИЯ': 1, 'ПАУЗА': 1, 'КАК ИГРАТЬ': 1, 'Герои': 1 };
    Array.prototype.forEach.call(
      document.querySelectorAll('h2,.topbar-title'),
      function (el) {
        var key = el.textContent.trim();
        if (titles[key]) el.textContent = t(key);
      }
    );
  }

  /* ---------------- жизненный цикл вкладки ----------------
     п.1.3 — при сворачивании страницы звук останавливается.
     п.1.19.4 — платформа сообщает о своих паузах (реклама). */
  function bindLifecycle() {
    var selfPaused = false;

    function suspend() {
      AA.Core.audio.mute(true);
      var w = AA.Game.world.state;
      if (w.running && !w.paused) { selfPaused = false; AA.Game.loop.pause(true); }
      else selfPaused = true;
    }

    function resume() {
      AA.Core.audio.mute(false);
      var overlayOpen = document.querySelector('.screen.overlay.active');
      if (!selfPaused && !overlayOpen && AA.Game.world.state.running) {
        AA.Game.loop.pause(false);
      }
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) suspend(); else resume();
    });
    window.addEventListener('blur', suspend);
    window.addEventListener('focus', resume);
    window.addEventListener('ya-pause', suspend);
    window.addEventListener('ya-resume', resume);
    window.addEventListener('pagehide', function () { AA.Platform.storage.commit(true); });
  }

  /* ---------------- запрет прокрутки (п.1.10.2) ---------------- */
  var SCROLLABLE = '.shop-body,.shop-tabs,.hero-detail,.hero-list,.skill-up-list,.howto-body';

  function lockScroll() {
    document.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) { e.preventDefault(); return; }
      var node = e.target;
      while (node && node !== document.body) {
        var ta = getComputedStyle(node).touchAction;
        if (ta && ta.indexOf('pan') === 0) return;   // внутри списка прокрутка разрешена
        node = node.parentElement;
      }
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('wheel', function (e) {
      if (!e.target.closest || !e.target.closest(SCROLLABLE)) e.preventDefault();
    }, { passive: false });
  }

  /* ---------------- старт ---------------- */
  function boot() {
    lockScroll();
    bindLifecycle();

    AA.Platform.sdk.init(progress).then(function () {
      applyLang();

      // цикл и отрисовка
      AA.Game.loop.start(document.getElementById('cv'), {
        onWaveClear: function (wave) { AA.UI.hud.onWaveClear(wave); },
        onDeath: function () { AA.UI.screens.onDeath(); },
        onTick: function () { if (AA.UI.screens.isBattle()) AA.UI.hud.refresh(false); }
      });

      // интерфейс
      var save = AA.Platform.storage.data;
      AA.UI.menu.bind();
      AA.UI.shop.bind();
      AA.UI.skilltree.bind();
      AA.UI.training.bind();
      AA.UI.controls.bind();

      document.getElementById('opt-sound').checked = save.sound !== false;
      document.getElementById('opt-shake').checked = save.shake !== false;
      AA.Core.audio.set(save.sound !== false);
      AA.Game.effects.setShake(save.shake !== false);

      AA.UI.menu.refresh();
      AA.UI.screens.show('menu');
      AA.Platform.sdk.showBanner();

      // п.1.19.2 — игрок может начать играть прямо сейчас
      AA.Platform.sdk.gameReady();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
