/* core/audio — синтезированные звуки, ни одного файла на диске.
   mute() используется при сворачивании вкладки (п.1.3 требований). */
AA.module('core/audio', (function () {
  'use strict';

  var ctx = null, enabled = true, muted = false;

  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(f1, f2, dur, type, vol) {
    if (!enabled || muted) return;
    var a = ac(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f1, a.currentTime);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), a.currentTime + dur);
    g.gain.setValueAtTime(vol || .05, a.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur + .02);
  }

  return {
    set: function (v) { enabled = v; },
    mute: function (v) { muted = v; },

    hit: function () { tone(210, 95, .06, 'square', .032); },
    crit: function () { tone(560, 150, .14, 'sawtooth', .07); },
    cast: function () { tone(390, 800, .15, 'triangle', .05); },
    orb: function () { tone(900, 1250, .07, 'sine', .04); },
    die: function () { tone(180, 50, .26, 'sawtooth', .055); },
    boom: function () { tone(120, 38, .5, 'sawtooth', .085); },
    buy: function () { tone(700, 1120, .12, 'triangle', .055); },
    sell: function () { tone(620, 360, .12, 'triangle', .055); },
    lvl: function () { tone(520, 1020, .3, 'triangle', .07); },
    heal: function () { tone(620, 920, .18, 'sine', .045); },
    lose: function () { tone(300, 55, .75, 'sawtooth', .09); },
    wave: function () { tone(420, 900, .22, 'square', .05); }
  };
})());
