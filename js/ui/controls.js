/* ui/controls — ввод игрока: клавиатура, виртуальный джойстик,
   автобой, пауза, кнопки экрана поражения. */
AA.module('ui/controls', (function () {
  'use strict';

  var MOVE = {
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right'
  };
  var CAST = { Digit1: 0, Digit2: 1, Digit3: 2, KeyQ: 0, KeyE: 1, KeyR: 2 };
  var INVOKE = { Digit4: 1, KeyF: 1 };

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }
  function S() { return AA.UI.screens; }

  /* ---------------- автобой ---------------- */
  function setAuto(on) {
    var d = D();
    W().auto = on;
    var btn = d.$('btn-auto');
    btn.textContent = 'АВТО: ' + (on ? 'ВКЛ' : 'ВЫКЛ');
    btn.classList.toggle('on', on);
    d.$('mob-ctl').classList.toggle('on', !on && AA.Core.input.isTouch());
    d.$('skillbar').classList.toggle('dimmed', on);
  }

  /* ---------------- пауза ---------------- */
  function togglePause() {
    var d = D(), w = W();
    if (!S().isBattle() || w.over) return;

    var paused = !w.paused;
    AA.Game.loop.pause(paused);

    if (paused) {
      d.$('btn-quit').style.display = '';
      d.$('btn-quit').textContent = w.training ? d.t('ВЫЙТИ С ПОЛИГОНА') : d.t('СДАТЬСЯ');
      d.$('btn-resume').textContent = d.t('ПРОДОЛЖИТЬ');
      S().open('pause');
      AA.Core.audio.mute(true);
    } else {
      S().close('pause');
      AA.Core.audio.mute(false);
    }
  }

  /* ---------------- клавиатура ---------------- */
  function bindKeyboard() {
    var input = AA.Core.input;

    document.addEventListener('keydown', function (e) {
      if (!S().isBattle() || e.repeat) return;

      if (MOVE[e.code]) { input.setKey(MOVE[e.code], 1); e.preventDefault(); return; }

      if (CAST[e.code] !== undefined) {
        var i = AA.Game.abilities.activeIndex(W().hero, CAST[e.code]);
        if (i >= 0 && !W().auto) AA.Game.abilities.cast(W().hero, i);
        e.preventDefault(); return;
      }
      if (INVOKE[e.code]) {
        var h = W().hero;
        if (!W().auto && h && h.invoker) AA.Game.abilities.castInvoke(h);
        e.preventDefault(); return;
      }
      if (e.code === 'Space') { setAuto(!W().auto); e.preventDefault(); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); e.preventDefault(); }
    });

    document.addEventListener('keyup', function (e) {
      if (MOVE[e.code]) { input.setKey(MOVE[e.code], 0); e.preventDefault(); }
    });

    window.addEventListener('blur', function () { input.clearKeys(); });
  }

  /* ---------------- джойстик ---------------- */
  function bindStick() {
    var d = D(), input = AA.Core.input;
    var stick = d.$('stick'), knob = d.$('stick-knob');
    var cx = 0, cy = 0, radius = 46, pointer = null;

    function start(e) {
      input.markTouch();
      d.$('mob-ctl').classList.toggle('on', !W().auto);
      var r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      radius = r.width / 2 - 8;
      pointer = e.pointerId;
      stick.setPointerCapture(pointer);
      move(e);
    }
    function move(e) {
      if (pointer === null || e.pointerId !== pointer) return;
      var dx = e.clientX - cx, dy = e.clientY - cy;
      var d0 = Math.sqrt(dx * dx + dy * dy) || .001;
      var k = Math.min(1, d0 / radius);
      var nx = dx / d0 * k, ny = dy / d0 * k;
      input.setStick(nx, ny, true);
      knob.style.transform = 'translate(' + (nx * radius) + 'px,' + (ny * radius) + 'px)';
      e.preventDefault();
    }
    function end() {
      if (pointer === null) return;
      pointer = null;
      input.setStick(0, 0, false);
      knob.style.transform = '';
    }

    stick.addEventListener('pointerdown', start);
    stick.addEventListener('pointermove', move);
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);

    window.addEventListener('touchstart', function () {
      if (input.isTouch()) return;
      input.markTouch();
      if (S().isBattle()) d.$('mob-ctl').classList.toggle('on', !W().auto);
    }, { passive: true, once: true });
  }

  /* ---------------- кнопки боя и оверлеев ---------------- */
  function bindButtons() {
    var d = D(), s = S();

    d.$('btn-auto').onclick = function () { setAuto(!W().auto); };
    d.$('btn-pause').onclick = togglePause;

    d.$('btn-resume').onclick = function () {
      s.close('pause');
      if (s.isBattle() && !W().over) {
        AA.Game.loop.pause(false);
        AA.Core.audio.mute(false);
      }
      d.$('btn-resume').textContent = d.t('ПРОДОЛЖИТЬ');
    };

    d.$('btn-quit').onclick = function () {
      if (!s.isBattle()) { s.close('pause'); return; }
      s.close('pause');
      AA.Game.loop.pause(false);
      s.endRun();
    };

    d.$('btn-again').onclick = function () {
      s.closeAll();
      AA.Platform.sdk.hideBanner();
      s.startRun(false);
    };

    d.$('btn-revive').onclick = function () {
      AA.Platform.sdk.rewarded(function () {
        s.run.revived = true;
        s.closeAll();
        AA.Platform.sdk.hideBanner();
        AA.Game.loop.revive();
        s.show('battle');
        AA.UI.hud.refresh(true);
      }, function (ok) { if (!ok) AA.UI.toast.show('Реклама недоступна'); });
    };

    d.$('btn-x2').onclick = function () {
      AA.Platform.sdk.rewarded(function () {
        s.run.x2used = true;
        d.save().souls += s.run.pendingSouls || 0;
        AA.Platform.storage.commit(true);
        d.$('over-souls').textContent = d.fmt((s.run.pendingSouls || 0) * 2);
        d.$('btn-x2').style.display = 'none';
        AA.UI.menu.refresh();
        AA.Core.audio.buy();
      }, function (ok) { if (!ok) AA.UI.toast.show('Реклама недоступна'); });
    };

    d.$('opt-sound').onchange = function () {
      d.save().sound = this.checked;
      AA.Core.audio.set(this.checked);
      AA.Platform.storage.commit();
    };
    d.$('opt-shake').onchange = function () {
      d.save().shake = this.checked;
      AA.Game.effects.setShake(this.checked);
      AA.Platform.storage.commit();
    };
  }

  /* ---------------- запреты браузера ---------------- */
  // п.1.6.2.7 и п.1.6.1.8: никакого выделения и контекстного меню на поле
  function bindGuards() {
    ['contextmenu', 'selectstart', 'gesturestart', 'dblclick'].forEach(function (name) {
      document.addEventListener(name, function (e) { e.preventDefault(); });
    });
  }

  function bind() {
    bindKeyboard();
    bindStick();
    bindButtons();
    bindGuards();
  }

  return { bind: bind, setAuto: setAuto, togglePause: togglePause };
})());
