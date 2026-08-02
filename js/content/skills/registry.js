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

  return {
    ALL: ALL,
    add: add,
    g: g,
    get: function (id) { return ALL[id]; },
    /** Разворачивает список id героя в объекты умений. */
    resolve: function (ids) { return ids.map(function (id) { return ALL[id]; }); }
  };
})());
