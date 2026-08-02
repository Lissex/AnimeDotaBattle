/* game/world — единственный источник правды о состоянии боя.
   Никакой логики: только данные и мелкие запросы к ним. */
AA.module('game/world', (function () {
  'use strict';

  /** Списки эффектов, которые полностью очищаются при старте забега. */
  var POOLS = [
    'units', 'proj', 'parts', 'floats', 'rings', 'tele', 'bolts', 'slashes',
    'auras', 'corpses', 'sparks', 'zones', 'walls', 'cones', 'pillars',
    'embers', 'timers', 'runes'
  ];

  var W = {
    /* --- размеры арены (заполняет render/canvas) --- */
    w: 0, h: 0,
    PAD: 46,     // отступ от края холста
    TOP: 54,     // место под верхнюю панель HUD

    /* --- карта --- */
    map: null, mapId: null,
    props: [],   // объекты с высотой: сортируются вместе с юнитами
    decals: [],  // плоские: запекаются в фон

    /* --- ход боя --- */
    wave: 1, kills: 0, gold: 0,
    running: false, paused: false, over: false, training: false, auto: false,
    hero: null, time: 0,

    /* --- камера и постобработка --- */
    shakeT: 0, shakeMag: 0, flashT: 0, flashC: '#fff', hitstop: 0,

    /* --- счётчик урона в секунду (полигон) --- */
    dmgWindow: [], dps: 0
  };

  POOLS.forEach(function (k) { W[k] = []; });

  function clearPools() {
    POOLS.forEach(function (k) { W[k].length = 0; });
    W.dmgWindow.length = 0;
    W.dps = 0;
  }

  function aliveEnemies() {
    var n = 0;
    for (var i = 0; i < W.units.length; i++) {
      if (!W.units[i].dead && W.units[i].team === 1) n++;
    }
    return n;
  }

  /** Держит юнита внутри арены. */
  function confine(u) {
    var c = AA.Core.math.clamp;
    u.x = c(u.x, W.PAD + u.r, W.w - W.PAD - u.r);
    u.y = c(u.y, W.PAD + W.TOP + u.r, W.h - W.PAD - u.r);
  }

  return {
    state: W,
    POOLS: POOLS,
    clearPools: clearPools,
    aliveEnemies: aliveEnemies,
    confine: confine,
    center: function () { return { x: W.w / 2, y: (W.h + W.TOP) / 2 }; }
  };
})());
