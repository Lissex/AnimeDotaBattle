/* platform/storage — постоянный прогресс.
   Пишет и в localStorage, и в облако Яндекса (если SDK доступен).
   Сохранение вызывается сразу после действия игрока (п.1.9). */
AA.module('platform/storage', (function () {
  'use strict';

  var KEY = 'arena_ancients_v2';
  var LEGACY_KEY = 'arena_ancients_v1';

  var DEFAULTS = {
    souls: 0,
    best: 0,
    unlocked: ['butcher', 'ranger'],
    selected: 'butcher',
    heroLv: {},

    skins: {},          // heroId → выбранный skinId
    ownedSkins: [],     // ключи вида 'butcher:slaughter'
    story: {},          // heroId → сколько глав открыто

    sound: true,
    music: true,
    shake: true,
    numbers: true,      // показывать числа урона
    seenHowto: false
  };

  var data = clone(DEFAULTS);
  var cloudWriter = null;   // подставляется из platform/sdk
  var timer = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(raw) {
    if (!raw || typeof raw !== 'object') return;
    for (var k in DEFAULTS) {
      if (raw[k] !== undefined && raw[k] !== null) data[k] = raw[k];
    }
    if (!Array.isArray(data.unlocked) || !data.unlocked.length) data.unlocked = ['butcher', 'ranger'];
    if (!Array.isArray(data.ownedSkins)) data.ownedSkins = [];
    ['heroLv', 'skins', 'story'].forEach(function (k) {
      if (!data[k] || typeof data[k] !== 'object') data[k] = {};
    });
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
      if (raw) merge(JSON.parse(raw));
    } catch (e) { /* приватный режим — играем без сейва */ }
  }

  function writeLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { }
  }

  /**
   * Сохранить прогресс.
   * @param {boolean} immediate  true для важных действий (покупка, конец забега)
   */
  function commit(immediate) {
    writeLocal();
    if (timer) { clearTimeout(timer); timer = null; }
    var push = function () {
      timer = null;
      if (cloudWriter) cloudWriter(data);
    };
    if (immediate) push(); else timer = setTimeout(push, 400);
  }

  /** Полный сброс прогресса — из настроек. */
  function reset() {
    var fresh = clone(DEFAULTS);
    for (var k in fresh) data[k] = fresh[k];
    commit(true);
  }

  return {
    data: data,
    load: readLocal,
    merge: merge,
    commit: commit,
    reset: reset,
    setCloudWriter: function (fn) { cloudWriter = fn; },
    defaults: DEFAULTS
  };
})());
