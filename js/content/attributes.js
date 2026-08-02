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

  /* ---- прогрессия ----
     Восемь рангов умения, а не четыре: иначе к 15 уровню всё
     выкачано и оставшиеся 35 уровней некуда девать. Значения
     рангов 5–8 достраиваются автоматически (content/skills). */
  var MAX_HERO_LV = 50;
  var MAX_SKILL_LV = 8;
  var INV_SLOTS = 6;
  var SELL_RATE = 0.6;

  /** Босс приходит каждые столько волн. */
  var BOSS_EVERY = 10;

  /** Очко, вложенное в атрибуты, когда умения уже прокачаны. */
  var ATTR_PER_POINT = 3;

  return {
    ATTR: ATTR, NAME: NAME, COLOR: COLOR,
    MAX_HERO_LV: MAX_HERO_LV, MAX_SKILL_LV: MAX_SKILL_LV,
    INV_SLOTS: INV_SLOTS, SELL_RATE: SELL_RATE,
    BOSS_EVERY: BOSS_EVERY, ATTR_PER_POINT: ATTR_PER_POINT,

    isBossWave: function (w) { return w % BOSS_EVERY === 0; },
    /** Порядковый номер боссовой встречи: 10-я волна → 1, 20-я → 2. */
    bossIndex: function (w) { return Math.floor(w / BOSS_EVERY); },

    /* ---- прогрессия за волны ----
       Опыта нет: уровень выдаётся прямо за зачищенную волну.
       Обычная волна — один уровень, боссовая — два. Значит к
       45-й волне герой упирается в потолок, а таланты падают
       ровно на 10, 20, 30, 40 и 50 уровнях. */
    levelsForWave: function (w) { return (w % BOSS_EVERY === 0) ? 2 : 1; },

    /** До какого уровня герой дорастёт к концу указанной волны. */
    levelAfterWave: function (w) {
      return Math.min(MAX_HERO_LV, 1 + w + Math.floor(w / BOSS_EVERY));
    },

    /* ---- экономика ---- */
    goldPerWave: function (w) { return Math.round(280 + 95 * w + 7 * w * w); },
    soulsFor: function (wave, kills) { return Math.round(wave * 34 + kills * 3); },

    // герой теперь заметно сильнее к концу — враги растут быстрее
    enemyScale: function (w) { return 1 + 0.13 * (w - 1) + 0.0078 * (w - 1) * (w - 1); },
    enemyCount: function (w) { return Math.min(2 + Math.floor(w / 3), 9); },

    /** Потолок ранга умения растёт вместе с уровнем героя.
        Шаг в 6 уровней: восьмой ранг открывается только к 42-му,
        поэтому очки есть куда вкладывать почти весь забег. */
    skillCap: function (heroLv) { return Math.min(MAX_SKILL_LV, 1 + Math.floor(heroLv / 6)); }
  };
})());
