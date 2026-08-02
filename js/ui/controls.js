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
    if (on) AA.Core.input.clearOrder();
  }

  /* ---------------- пауза ---------------- */
  function togglePause() {
    var d = D(), w = W();
    if (!S().isBattle() || w.over) return;

    var paused = !w.paused;
    AA.Game.loop.pause(paused);

    if (paused) {
      d.$('btn-quit').textContent = w.training ? d.t('ВЫЙТИ С ПОЛИГОНА') : d.t('СДАТЬСЯ');
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

      if (MOVE[e.code]) { input.setKey(MOVE[e.code], 1); input.clearOrder(); e.preventDefault(); return; }
      if (e.code === 'KeyH') { input.clearOrder(); e.preventDefault(); return; }   // стоп

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

  /* ---------------- мышь: приказ правой кнопкой ----------------
     Как в Dota: ПКМ — идти в точку, а если под курсором враг —
     подойти и бить его. Клавиши в любой момент перехватывают. */
  function bindMouse() {
    var d = D(), input = AA.Core.input;
    var canvas = d.$('cv');
    var held = false;

    // экранная точка → мировая: камера ездит, поэтому без сдвига никак
    function toWorld(e) {
      var r = canvas.getBoundingClientRect();
      return AA.Game.world.toWorld(e.clientX - r.left, e.clientY - r.top);
    }

    /** Враг под курсором с запасом на промах. */
    function enemyAt(p) {
      var w = W(), best = null, bd = 1e9;
      for (var i = 0; i < w.units.length; i++) {
        var u = w.units[i];
        if (u.dead || u.team !== 1) continue;
        var dx = u.x - p.x, dy = u.y - p.y;
        var d0 = Math.sqrt(dx * dx + dy * dy);
        if (d0 < u.r + 22 && d0 < bd) { bd = d0; best = u; }
      }
      return best;
    }

    function issue(e) {
      if (!S().isBattle() || W().auto) return;
      var p = toWorld(e);
      var target = enemyAt(p);
      input.order(p.x, p.y, target);
      AA.Game.effects.ring(p.x, p.y, target ? 46 : 30,
        target ? '#ff6a5a' : '#8fd66a');
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 2) return;                 // только правая
      held = true;
      issue(e);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = toWorld(e);
      input.setCursor(p.x, p.y, true);
      if (held && e.buttons & 2) issue(e);        // удержание — непрерывный приказ
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      canvas.addEventListener(ev, function () { held = false; });
    });
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
    };

    d.$('btn-pause-settings').onclick = function () { AA.UI.settings.open(); };

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
    bindMouse();
    bindButtons();
    bindGuards();
  }

  return { bind: bind, setAuto: setAuto, togglePause: togglePause };
})());
