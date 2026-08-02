/* content/skills/registry — общий реестр умений.
   Файлы групп (melee/ranged/casters/arcanist) добавляют себя сюда.
   Герои ссылаются на умения по строковому id, поэтому порядок
   подключения групп значения не имеет.

   Формат умения:
     id, name, icon, color
     type   'active' | 'toggle' | 'passive' | 'reagent'
     ai     подсказка автобою: nuke | aoe | escape | buff | gap | finish
     mana[], cd[]   — по уровням 0..3
     desc(l)        — текст для интерфейса
     cast(u, l)     — применение; вернуть false, если цели нет
     tick(u, l, dt) — каждый кадр (ауры, переключаемые)
     apply(u, l, s) — вклад пассивки в характеристики
     onAttack(u, l, target) — реакция на автоатаку
*/
AA.module('content/skills', (function () {
  'use strict';

  var ALL = {};

  /** Короткий доступ к боевому API из тела умения. */
  function g() { return AA.Game.api; }

  function add(map) {
    for (var k in map) {
      if (ALL[k]) console.warn('skills: дубликат id «' + k + '»');
      ALL[k] = map[k];
    }
    return map;
  }

  /* ============================================================
     ДОСТРОЙКА РАНГОВ

     Умения описаны четырьмя значениями, а рангов теперь восемь.
     Вместо того чтобы руками дописывать четыре числа в каждое
     из полусотни умений, продолжаем прогрессию по последнему шагу.
     Для полей, которые нельзя разгонять бесконечно, есть потолки.
     ============================================================ */

  // Как продолжать конкретное поле: cap — предел, floorPct — не ниже
  // доли от первого значения (для перезарядок, которые убывают).
  var RULES = {
    cd: { floorPct: .45, min: 1 },
    slow: { cap: 75 },
    crit: { cap: 65 },
    mult: { cap: 4 },
    critMult: { cap: 4 },
    mr: { cap: .5 },
    ls: { cap: 65 },
    lifesteal: { cap: 65 },
    as: { cap: 240 },
    heal: { cap: 65 },
    costPct: { cap: 15 },
    threshold: { cap: .45 },
    pct: { cap: 200 },
    missing: { cap: .45 }
  };

  function roundNice(v) {
    if (Math.abs(v) >= 20) return Math.round(v);
    if (Math.abs(v) >= 1) return Math.round(v * 10) / 10;
    return Math.round(v * 1000) / 1000;
  }

  function extend(arr, key, target) {
    var rule = RULES[key] || {};
    var base = arr[0];
    while (arr.length < target) {
      var n = arr.length;
      var step = arr[n - 1] - arr[n - 2];
      var next = arr[n - 1] + step;

      if (rule.cap !== undefined) next = Math.min(next, rule.cap);
      if (rule.floorPct !== undefined) next = Math.max(next, base * rule.floorPct);
      if (rule.min !== undefined) next = Math.max(next, rule.min);

      arr.push(roundNice(next));
    }
  }

  var finalized = false;

  /** Достраивает все умения до нужного числа рангов. Вызывается один раз. */
  function finalize() {
    if (finalized) return;
    finalized = true;
    var target = AA.Content.attributes.MAX_SKILL_LV;

    for (var id in ALL) {
      var skill = ALL[id];
      for (var key in skill) {
        var v = skill[key];
        if (!Array.isArray(v) || v.length >= target) continue;
        if (v.length < 2 || typeof v[0] !== 'number') continue;
        extend(v, key, target);
      }
    }
  }

  return {
    ALL: ALL,
    add: add,
    g: g,
    finalize: finalize,
    get: function (id) { return ALL[id]; },
    /** Разворачивает список id героя в объекты умений. */
    resolve: function (ids) { return ids.map(function (id) { return ALL[id]; }); }
  };
})());
