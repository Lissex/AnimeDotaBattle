/* content/modifiers — условия забега, выбираются перед стартом.

   Смысл в том, чтобы уже пройденное можно было переиграть иначе:
   каждый модификатор что-то ломает и что-то даёт взамен. Отказаться
   тоже можно — «Чистый забег» всегда доступен. */
AA.module('content/modifiers', (function () {
  'use strict';

  var LIST = [
    {
      id: 'none', name: 'Чистый забег', icon: '○', color: '#8b97bd',
      d: 'Никаких изменений. Классические правила.',
      always: true,
      apply: function () { }
    },

    {
      id: 'greed', name: 'Жадность', icon: '◈', color: '#ffc043',
      d: 'Враги на 35% крепче, зато золота вдвое больше.',
      apply: function (r) { r.enemyMul = 1.35; r.goldMul = 2; }
    },

    {
      id: 'fragile', name: 'Одна жизнь', icon: '✚', color: '#ff4d5e',
      d: 'Воскрешение недоступно, но душ втрое больше.',
      apply: function (r) { r.oneLife = true; r.soulMul = 3; }
    },

    {
      id: 'nomarket', name: 'Без лавки', icon: '⊘', color: '#b07dff',
      d: 'Лавка закрыта. Вместо неё после каждой волны выбор из трёх предметов.',
      apply: function (r) { r.noShop = true; r.goldMul = .4; }
    },

    {
      id: 'elites', name: 'Охота', icon: '★', color: '#ff7a2f',
      d: 'Каждый третий враг элитный. Золота и опыта с них больше.',
      apply: function (r) { r.eliteChance = .33; r.goldMul = 1.35; }
    },

    {
      id: 'swarm', name: 'Нашествие', icon: '⁂', color: '#8fd66a',
      d: 'Врагов вдвое больше, но каждый заметно слабее.',
      apply: function (r) { r.enemyMul = .62; r.waveMul = 2; }
    },

    {
      id: 'pockets', name: 'Глубокие карманы', icon: '▤', color: '#4aa8ff',
      d: 'Два дополнительных слота инвентаря, но враги на 20% крепче.',
      apply: function (r) { r.extraSlots = 2; r.enemyMul = 1.2; }
    },

    {
      id: 'ascetic', name: 'Аскеза', icon: '◇', color: '#a8e4ff',
      d: 'Предметы дорожают вдвое, но душ вдвое больше и лавка даёт скидку 30% на артефакты.',
      apply: function (r) { r.soulMul = 2; r.priceMul = 2; r.artifactDiscount = .3; }
    },

    {
      id: 'blessed', name: 'Щедрые боги', icon: '✦', color: '#3ddb7f',
      d: 'События случаются вдвое чаще, но врагов на 25% больше.',
      apply: function (r) { r.eventEvery = 2; r.waveMul = 1.25; }
    }
  ];

  var byId = {};
  LIST.forEach(function (m) { byId[m.id] = m; });

  /**
   * Три варианта на выбор: «Чистый забег» всегда плюс два случайных.
   */
  function roll() {
    var pool = LIST.filter(function (m) { return !m.always; });
    var picked = [byId.none];
    for (var i = 0; i < 2 && pool.length; i++) {
      var k = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(k, 1)[0]);
    }
    return picked;
  }

  return { LIST: LIST, roll: roll, get: function (id) { return byId[id]; } };
})());
