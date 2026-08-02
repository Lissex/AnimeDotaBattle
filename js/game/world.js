/* game/world — единственный источник правды о состоянии боя.
   Никакой логики: только данные и мелкие запросы к ним. */
AA.module('game/world', (function () {
  'use strict';

  /** Списки эффектов, которые полностью очищаются при старте забега. */
  var POOLS = [
    'units', 'proj', 'parts', 'floats', 'rings', 'tele', 'bolts', 'slashes',
    'auras', 'corpses', 'sparks', 'zones', 'walls', 'cones', 'pillars',
    'embers', 'timers', 'runes', 'swipes', 'muzzles', 'shocks'
  ];

  var W = {
    /* --- размеры мира (заполняет render/canvas) ---
       Мир заметно больше экрана: камера ездит за героем,
       врагов и руны видно не сразу. */
    w: 0, h: 0,              // размер арены в игровых координатах
    view: { w: 0, h: 0 },    // видимая область (размер холста)
    cam: { x: 0, y: 0 },     // левый верхний угол камеры в мире
    PAD: 46,     // отступ от края арены
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
    bloomT: 0, bloomC: '#fff',   // короткая вспышка на добивании

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
    u.y = c(u.y, W.PAD + u.r, W.h - W.PAD - u.r);
  }

  /** Экранные координаты → мировые (курсор мыши). */
  function toWorld(sx, sy) { return { x: sx + W.cam.x, y: sy + W.cam.y }; }

  /** Мировые → экранные (для миникарты и отладки). */
  function toScreen(wx, wy) { return { x: wx - W.cam.x, y: wy - W.cam.y }; }

  /** Видна ли точка в кадре (с запасом). */
  function onScreen(x, y, pad) {
    pad = pad || 80;
    return x > W.cam.x - pad && x < W.cam.x + W.view.w + pad &&
      y > W.cam.y - pad && y < W.cam.y + W.view.h + pad;
  }

  return {
    state: W,
    POOLS: POOLS,
    clearPools: clearPools,
    aliveEnemies: aliveEnemies,
    confine: confine,
    toWorld: toWorld, toScreen: toScreen, onScreen: onScreen,
    center: function () { return { x: W.w / 2, y: W.h / 2 }; }
  };
})());
