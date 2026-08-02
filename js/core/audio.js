/* ============================================================
   core/audio — весь звук игры, синтезированный на лету.
   Файлов на диске по-прежнему ноль.

   Два независимых тракта:
     SFX     — короткие события: удары, касты, покупки
     MUSIC   — фоновая петля, ключ и тембр берутся от палитры арены

   mute() глушит оба при сворачивании вкладки (п.1.3 требований).
   ============================================================ */
AA.module('core/audio', (function () {
  'use strict';

  var ctx = null;
  var master = null, sfxBus = null, musicBus = null;
  var enabled = true, musicEnabled = true, muted = false;

  /* ------------------------------------------------------------
                        ИНИЦИАЛИЗАЦИЯ
     ------------------------------------------------------------ */
  function ac() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        buildGraph();
      } catch (e) { return null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function buildGraph() {
    master = ctx.createGain();
    master.gain.value = .9;

    // мягкий лимитер, чтобы залпы умений не резали слух
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.attack.value = .004;
    comp.release.value = .18;

    sfxBus = ctx.createGain(); sfxBus.gain.value = 1;
    musicBus = ctx.createGain(); musicBus.gain.value = .22;

    sfxBus.connect(comp);
    musicBus.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);
  }

  function silent() { return !enabled || muted || !ac(); }

  /* ------------------------------------------------------------
                        ПРИМИТИВЫ
     ------------------------------------------------------------ */

  /** Тон с огибающей: атака — спад — хвост. */
  function tone(o) {
    if (silent()) return;
    var a = ctx, t = a.currentTime;
    var osc = a.createOscillator(), gain = a.createGain();

    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f1, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);

    var peak = o.vol || .06;
    var atk = o.atk || .006;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + atk);
    gain.gain.exponentialRampToValueAtTime(.0001, t + o.dur);

    var node = osc;
    if (o.filter) {
      var f = a.createBiquadFilter();
      f.type = o.filter;
      f.frequency.value = o.cutoff || 900;
      f.Q.value = o.q || 1;
      osc.connect(f); node = f;
    }
    node.connect(gain);
    gain.connect(o.bus || sfxBus);

    osc.start(t);
    osc.stop(t + o.dur + .03);
  }

  /** Шумовой всплеск — основа всех ударов. */
  function noise(o) {
    if (silent()) return;
    var a = ctx, t = a.currentTime;
    var dur = o.dur || .1;

    var len = Math.max(1, Math.floor(a.sampleRate * dur));
    var buf = a.createBuffer(1, len, a.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      // затухающий белый шум
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, o.curve || 2);
    }

    var src = a.createBufferSource();
    src.buffer = buf;

    var f = a.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f1 || 1200, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.f2), t + dur);
    f.Q.value = o.q || 1.2;

    var gain = a.createGain();
    gain.gain.setValueAtTime(o.vol || .08, t);
    gain.gain.exponentialRampToValueAtTime(.0001, t + dur);

    src.connect(f); f.connect(gain); gain.connect(sfxBus);
    src.start(t);
  }

  /* ------------------------------------------------------------
                          ЭФФЕКТЫ
     Удар = шум (контакт) + тон (вес). Из этой пары собрано всё.
     ------------------------------------------------------------ */
  var SFX = {
    hit: function () {
      noise({ f1: 2200, f2: 700, dur: .07, vol: .05, q: .8 });
      tone({ f1: 180, f2: 90, dur: .06, type: 'triangle', vol: .035 });
    },
    crit: function () {
      noise({ f1: 3600, f2: 900, dur: .13, vol: .09, q: .6 });
      tone({ f1: 520, f2: 140, dur: .16, type: 'sawtooth', vol: .06, filter: 'lowpass', cutoff: 2400 });
    },
    cast: function () {
      tone({ f1: 320, f2: 780, dur: .18, type: 'triangle', vol: .05, atk: .02 });
      tone({ f1: 640, f2: 1560, dur: .16, type: 'sine', vol: .025, atk: .03 });
    },
    orb: function () {
      tone({ f1: 880, f2: 1320, dur: .09, type: 'sine', vol: .04, atk: .004 });
    },
    die: function () {
      noise({ f1: 900, f2: 140, dur: .26, vol: .07, curve: 1.4 });
      tone({ f1: 200, f2: 60, dur: .24, type: 'sawtooth', vol: .04, filter: 'lowpass', cutoff: 800 });
    },
    boom: function () {
      noise({ f1: 700, f2: 60, dur: .5, vol: .13, curve: 1.2, filter: 'lowpass' });
      tone({ f1: 120, f2: 34, dur: .45, type: 'sine', vol: .09 });
    },
    buy: function () {
      tone({ f1: 660, f2: 990, dur: .1, type: 'triangle', vol: .05 });
      tone({ f1: 990, f2: 1320, dur: .13, type: 'sine', vol: .035, atk: .05 });
    },
    sell: function () {
      tone({ f1: 620, f2: 330, dur: .12, type: 'triangle', vol: .05 });
    },
    craft: function () {
      tone({ f1: 440, f2: 660, dur: .14, type: 'triangle', vol: .05 });
      tone({ f1: 660, f2: 1100, dur: .2, type: 'sine', vol: .045, atk: .06 });
      noise({ f1: 4000, f2: 1600, dur: .18, vol: .05, q: .5 });
    },
    lvl: function () {
      [523, 659, 784].forEach(function (f, i) {
        setTimeout(function () {
          tone({ f1: f, f2: f * 1.5, dur: .22, type: 'triangle', vol: .05, atk: .01 });
        }, i * 70);
      });
    },
    heal: function () {
      tone({ f1: 520, f2: 880, dur: .22, type: 'sine', vol: .045, atk: .04 });
    },
    lose: function () {
      tone({ f1: 300, f2: 44, dur: .9, type: 'sawtooth', vol: .09, filter: 'lowpass', cutoff: 900 });
      noise({ f1: 400, f2: 60, dur: .7, vol: .06, curve: 1.1 });
    },
    wave: function () {
      tone({ f1: 300, f2: 600, dur: .26, type: 'square', vol: .04, filter: 'lowpass', cutoff: 1400 });
    }
  };

  /* ------------------------------------------------------------
                       ПРОЦЕДУРНАЯ МУЗЫКА

     Медленная петля: басовая педаль, редкие аккордовые подкладки
     и арпеджио поверх. Тональность и тембр берутся от акцентного
     цвета арены — на каждой карте музыка своя.
     ------------------------------------------------------------ */
  var music = {
    timer: null,
    step: 0,
    root: 110,
    scale: [0, 3, 5, 7, 10],     // минорная пентатоника: не надоедает
    tension: 0                   // 0..1, поднимается на боссах
  };

  /** Полутон → множитель частоты. */
  function semi(n) { return Math.pow(2, n / 12); }

  function padVoice(freq, dur, vol) {
    if (silent() || !musicEnabled) return;
    var a = ctx, t = a.currentTime;
    var osc = a.createOscillator(), gain = a.createGain(), f = a.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() * 2 - 1) * 8;

    f.type = 'lowpass';
    f.frequency.setValueAtTime(280 + music.tension * 900, t);
    f.Q.value = .7;

    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + dur * .35);
    gain.gain.exponentialRampToValueAtTime(.0001, t + dur);

    osc.connect(f); f.connect(gain); gain.connect(musicBus);
    osc.start(t); osc.stop(t + dur + .05);
  }

  function pluck(freq, vol) {
    if (silent() || !musicEnabled) return;
    var a = ctx, t = a.currentTime;
    var osc = a.createOscillator(), gain = a.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, t + .9);
    osc.connect(gain); gain.connect(musicBus);
    osc.start(t); osc.stop(t + .95);
  }

  /** Один шаг петли. Вызывается по таймеру. */
  function musicStep() {
    if (!musicEnabled || muted) return;
    var s = music.step++;

    // бас на каждую четверть
    if (s % 4 === 0) padVoice(music.root, 2.4, .16);

    // аккордовая подкладка раз в такт
    if (s % 8 === 0) {
      var chord = [0, 7, 10][Math.floor(Math.random() * 3)];
      padVoice(music.root * 2 * semi(chord), 3.2, .07);
    }

    // арпеджио: чем выше напряжение, тем плотнее
    var density = .35 + music.tension * .45;
    if (Math.random() < density) {
      var note = music.scale[Math.floor(Math.random() * music.scale.length)];
      var oct = Math.random() < .3 ? 4 : 2;
      pluck(music.root * oct * semi(note), .05 + music.tension * .03);
    }
  }

  var musicWanted = false;    // идёт ли бой — музыка нужна только там

  function runLoop() {
    if (music.timer) return;
    if (!musicWanted || !musicEnabled || !enabled) return;
    if (!ac()) return;
    music.timer = setInterval(musicStep, 420);
  }
  function killLoop() {
    if (!music.timer) return;
    clearInterval(music.timer);
    music.timer = null;
  }

  function startMusic() { musicWanted = true; runLoop(); }
  function stopMusic() { musicWanted = false; killLoop(); }

  /** Настроить музыку под арену: тональность от акцентного цвета. */
  function setMood(map) {
    if (!map) return;
    var rgb = AA.Core.math.hex2rgb(map.accent);
    // тёплые карты звучат ниже, холодные выше
    var warmth = (rgb[0] - rgb[2] + 255) / 510;      // 0..1
    var roots = [82.4, 87.3, 98, 110, 123.5, 130.8];
    music.root = roots[Math.min(roots.length - 1, Math.floor((1 - warmth) * roots.length))];
    music.step = 0;
  }

  /** Напряжение: 0 в меню, растёт к боссу. */
  function setTension(v) {
    music.tension = AA.Core.math.clamp(v, 0, 1);
  }

  /* ------------------------------------------------------------
                          ПУБЛИЧНОЕ
     ------------------------------------------------------------ */
  var api = {
    set: function (v) {
      enabled = v;
      if (v) runLoop(); else killLoop();
    },
    setMusic: function (v) {
      musicEnabled = v;
      if (v) runLoop(); else killLoop();
    },
    mute: function (v) {
      muted = v;
      if (!master) return;
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.linearRampToValueAtTime(v ? 0 : .9, t + .12);
    },
    startMusic: startMusic,
    stopMusic: stopMusic,
    setMood: setMood,
    setTension: setTension,
    /** Разблокировка звука первым касанием — требование браузеров. */
    unlock: function () { ac(); }
  };

  for (var k in SFX) api[k] = SFX[k];

  return api;
})());
