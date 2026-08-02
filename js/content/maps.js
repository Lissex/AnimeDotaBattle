/* content/maps — арена под каждого героя.
   props   — [тип, количество]; поведение типов задано в game/terrain
   weather — постоянная взвесь в воздухе, рисует render/fx
   Раскладка детерминирована по id карты: арена всегда узнаваема. */
AA.module('content/maps', (function () {
  'use strict';

  var MAPS = {
    butcher: {
      name: 'Скотобойня', floor: '#2a1817', floor2: '#100a09', accent: '#c0563a',
      tint: 'rgba(120,30,20,.14)', weather: 'ash',
      props: [
        ['pillar', 5], ['brazier', 4], ['obelisk', 2],
        ['bones', 16], ['puddle', 8], ['crack', 6]
      ]
    },
    ranger: {
      name: 'Лесная опушка', floor: '#1d3324', floor2: '#0a1410', accent: '#6ac07a',
      tint: 'rgba(40,110,60,.12)', weather: 'leaves',
      props: [
        ['tree', 10], ['stump', 5], ['shroom', 4],
        ['grass', 20], ['bush', 8]
      ]
    },
    berserk: {
      name: 'Ледяной фьорд', floor: '#1f2a38', floor2: '#0a0f16', accent: '#e8571a',
      tint: 'rgba(60,110,160,.12)', weather: 'snow',
      props: [
        ['rock', 8], ['ruin', 4], ['obelisk', 3],
        ['ice', 7], ['bones', 8], ['crack', 5]
      ]
    },
    frost: {
      name: 'Замёрзшее озеро', floor: '#1a2c40', floor2: '#080e18', accent: '#7fd4ff',
      tint: 'rgba(70,140,210,.15)', weather: 'snow',
      props: [
        ['crystal', 7], ['rock', 5], ['obelisk', 2],
        ['ice', 10], ['crack', 7]
      ]
    },
    knight: {
      name: 'Разрушенный замок', floor: '#292430', floor2: '#0e0c12', accent: '#d13a3a',
      tint: 'rgba(120,50,60,.12)', weather: 'dust',
      props: [
        ['ruin', 7], ['pillar', 6], ['brazier', 5],
        ['bones', 6], ['crack', 6], ['web', 4]
      ]
    },
    shadow: {
      name: 'Ночные катакомбы', floor: '#1c1a2a', floor2: '#08070e', accent: '#b07dff',
      tint: 'rgba(90,60,160,.14)', weather: 'fireflies',
      props: [
        ['pillar', 8], ['ruin', 4], ['brazier', 3], ['shroom', 5],
        ['bones', 14], ['web', 6]
      ]
    },
    dryad: {
      name: 'Священная роща', floor: '#1a3326', floor2: '#08140e', accent: '#8fd66a',
      tint: 'rgba(60,150,90,.13)', weather: 'fireflies',
      props: [
        ['tree', 12], ['crystal', 4], ['stump', 4], ['shroom', 6],
        ['grass', 22], ['bush', 10]
      ]
    },
    arcanist: {
      name: 'Парящие руины', floor: '#231e38', floor2: '#0b0918', accent: '#c9a0ff',
      tint: 'rgba(120,90,200,.13)', weather: 'void',
      props: [
        ['pillar', 9], ['crystal', 8], ['ruin', 5], ['obelisk', 4],
        ['crack', 8]
      ]
    },
    pyro: {
      name: 'Вулканический кратер', floor: '#2e1a12', floor2: '#120806', accent: '#ff7a2f',
      tint: 'rgba(180,70,20,.16)', weather: 'ash',
      props: [
        ['rock', 9], ['brazier', 4], ['obelisk', 2],
        ['lava', 8], ['crack', 9]
      ]
    },
    golem: {
      name: 'Каменоломня', floor: '#2b2620', floor2: '#100e0a', accent: '#c07a3a',
      tint: 'rgba(140,110,70,.12)', weather: 'dust',
      props: [
        ['rock', 12], ['ruin', 5], ['stump', 4], ['crystal', 3], ['spikes', 5],
        ['crack', 7]
      ]
    },
    training: {
      name: 'Учебный полигон', floor: '#1c2436', floor2: '#0a0e16', accent: '#3ddb7f',
      tint: 'rgba(60,140,110,.10)', weather: 'dust',
      props: [['pillar', 4], ['crystal', 3], ['crack', 4]]
    }
  };

  return {
    MAPS: MAPS,
    get: function (id) { return MAPS[id] || MAPS.butcher; }
  };
})());
