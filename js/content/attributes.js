/* content/attributes — упрощённая дотовская система характеристик
   и вся экономика забега. Главные балансные ручки проекта. */
AA.module('content/attributes', (function () {
  'use strict';

  /** Сколько даёт одно очко атрибута. */
  var ATTR = {
    HP_PER_STR: 20,
    HPREG_PER_STR: 0.10,
    MP_PER_INT: 12,
    MPREG_PER_INT: 0.055,
    SP_PER_INT: 0.75,
    ARMOR_PER_AGI: 0.16,
    AS_PER_AGI: 0.01,       // +1% скорости атаки за очко ловкости
    DMG_PER_PRIMARY: 1.0,   // главный атрибут даёт урон атаки
    BASE_HP: 180,
    BASE_MP: 75,
    BASE_HPREG: 0.5,
    BASE_MPREG: 0.6
  };

  var NAME = { str: 'СИЛА', agi: 'ЛОВКОСТЬ', int: 'ИНТЕЛЛЕКТ' };
  var COLOR = { str: '#ff6b4a', agi: '#3ddb7f', int: '#4aa8ff' };

  /* ---- прогрессия и экономика ---- */
  var MAX_HERO_LV = 25;
  var MAX_SKILL_LV = 4;
  var INV_SLOTS = 6;
  var SELL_RATE = 0.6;

  return {
    ATTR: ATTR, NAME: NAME, COLOR: COLOR,
    MAX_HERO_LV: MAX_HERO_LV, MAX_SKILL_LV: MAX_SKILL_LV,
    INV_SLOTS: INV_SLOTS, SELL_RATE: SELL_RATE,

    goldPerWave: function (w) { return Math.round(260 + 88 * w + 5 * w * w); },
    xpPerWave: function (w) { return Math.round(50 + 28 * w); },
    xpToLevel: function (lv) { return Math.round(110 * Math.pow(1.27, lv - 1)); },
    soulsFor: function (wave, kills) { return Math.round(wave * 28 + kills * 3); },

    enemyScale: function (w) { return 1 + 0.135 * (w - 1) + 0.0062 * (w - 1) * (w - 1); },
    enemyCount: function (w) { return Math.min(2 + Math.floor(w / 2), 7); },

    /** Потолок уровня умения растёт вместе с уровнем героя. */
    skillCap: function (heroLv) { return Math.min(MAX_SKILL_LV, 1 + Math.floor((heroLv - 1) / 3)); },

    /** Стоимость постоянного уровня героя в душах. */
    upgradeCost: function (permLv) { return 300 + permLv * 240; }
  };
})());
