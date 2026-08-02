/* content/heroes — ростер. Умения указаны строковыми id и
   разворачиваются в объекты при создании героя (game/factory).
   Порядок в skills: три активных, затем пассивное.

   ВАЖНО: имена и образы оригинальные. Прямое использование
   персонажей Dota 2 нарушает п.3.5 требований Яндекс Игр
   (авторские права). Переименование правится только полем name. */
AA.module('content/heroes', (function () {
  'use strict';

  var LIST = [
    {
      id: 'butcher', name: 'Мясник', role: 'ТАНК · БЛИЖНИЙ БОЙ', cost: 0,
      shape: 'brute', anim: 'heavy', c1: '#c0563a', c2: '#5e2418', primary: 'str',
      tip: 'Цепляет крюком, стягивает врагов в кучу и переваривает их аурой гнили.',
      attr: { str: 25, agi: 14, int: 14 }, gain: { str: 3.4, agi: 1.5, int: 1.6 },
      base: { atk: 26, armor: 1, ms: 250, as: .72, range: 68, mr: .25 },
      skills: ['hook', 'rot', 'dismember', 'feast']
    },
    {
      id: 'ranger', name: 'Егерь', role: 'СТРЕЛОК · ДАЛЬНИЙ БОЙ', cost: 0,
      shape: 'archer', anim: 'draw', c1: '#3f8f5a', c2: '#1d4a2c', primary: 'agi',
      tip: 'Классический керри: слаб в начале, разносит всё к поздним волнам.',
      attr: { str: 18, agi: 24, int: 15 }, gain: { str: 1.9, agi: 2.9, int: 1.7 },
      base: { atk: 22, armor: 0, ms: 285, as: .82, range: 480, mr: .25 },
      skills: ['volley', 'hawkeye', 'pierceshot', 'marks']
    },
    {
      id: 'berserk', name: 'Берсерк', role: 'БОЕЦ · ЯРОСТЬ', cost: 700,
      shape: 'berserk', anim: 'frenzy', c1: '#e8571a', c2: '#5a1a06', primary: 'str',
      tip: 'Чем ближе к смерти, тем страшнее. Прыгает в толпу и рубит по площади.',
      attr: { str: 24, agi: 19, int: 12 }, gain: { str: 3.3, agi: 2.1, int: 1.3 },
      base: { atk: 26, armor: 1, ms: 290, as: .80, range: 72, mr: .25 },
      skills: ['leap', 'cleave', 'frenzy', 'bloodrage']
    },
    {
      id: 'frost', name: 'Хладна', role: 'КОНТРОЛЬ · МАГ', cost: 1100,
      shape: 'witch', anim: 'float', c1: '#4aa8ff', c2: '#123a6b', primary: 'int',
      tip: 'Замораживает, замедляет и не даёт врагам до себя дойти.',
      attr: { str: 16, agi: 14, int: 25 }, gain: { str: 1.8, agi: 1.5, int: 3.2 },
      base: { atk: 20, armor: 0, ms: 275, as: .70, range: 430, mr: .30 },
      skills: ['nova', 'shackle', 'hail', 'chill']
    },
    {
      id: 'knight', name: 'Кровавый Рыцарь', role: 'БОЕЦ · ВАМПИРИЗМ', cost: 1500,
      shape: 'knight', anim: 'charge', c1: '#d13a3a', c2: '#4a1010', primary: 'str',
      tip: 'Врывается в гущу, лечится от собственного урона и платит здоровьем за силу.',
      attr: { str: 24, agi: 18, int: 15 }, gain: { str: 3.1, agi: 1.9, int: 1.6 },
      base: { atk: 25, armor: 2, ms: 280, as: .78, range: 66, mr: .25 },
      skills: ['charge', 'crimson', 'bloodoath', 'bloodpact']
    },
    {
      id: 'shadow', name: 'Клинок Тени', role: 'АССАСИН · БЛИЖНИЙ БОЙ', cost: 1900,
      shape: 'rogue', anim: 'swift', c1: '#b07dff', c2: '#3a1f6b', primary: 'agi',
      tip: 'Прыгает в тыл, вырезает магов и уходит в невидимость.',
      attr: { str: 17, agi: 26, int: 14 }, gain: { str: 1.8, agi: 3.1, int: 1.5 },
      base: { atk: 24, armor: 1, ms: 310, as: .90, range: 66, mr: .25 },
      skills: ['dash', 'eclipse', 'bladefan', 'bloodlust']
    },
    {
      id: 'dryad', name: 'Дриада', role: 'СТРЕЛОК · КОНТРОЛЬ', cost: 2300,
      shape: 'dryad', anim: 'nimble', c1: '#6ac07a', c2: '#1f4a28', primary: 'agi',
      tip: 'Травит ядом, сковывает корнями и держит дистанцию за счёт регенерации.',
      attr: { str: 17, agi: 25, int: 16 }, gain: { str: 1.9, agi: 2.8, int: 1.9 },
      base: { atk: 21, armor: 1, ms: 295, as: .80, range: 460, mr: .25 },
      skills: ['venom', 'roots', 'thorntrap', 'grace']
    },
    {
      id: 'arcanist', name: 'Аркан', role: 'МАГ · КОМБИНАЦИИ СТИХИЙ', cost: 2800,
      shape: 'mage', anim: 'orbit', c1: '#ff7a2f', c2: '#3a2a6b', primary: 'int',
      invoker: true,
      tip: 'Три стихии складываются в связку из трёх реагентов — 10 разных заклинаний.',
      attr: { str: 15, agi: 13, int: 27 }, gain: { str: 1.7, agi: 1.4, int: 3.5 },
      base: { atk: 19, armor: 0, ms: 270, as: .68, range: 400, mr: .30 },
      skills: ['elemFire', 'elemIce', 'elemStorm', 'arcana']
    },
    {
      id: 'enigma', name: 'Зодчий Пустоты', role: 'МАГ · КОНТРОЛЬ И ПРИЗЫВ', cost: 3600,
      shape: 'void', anim: 'orbit', c1: '#7a5ae8', c2: '#1a1030', primary: 'int',
      tip: 'Держит толпу проклятием, давит эйдолонами и решает бой чёрной дырой. ' +
        'Само пространство вокруг него замедляет врагов.',
      attr: { str: 19, agi: 14, int: 21 }, gain: { str: 2.5, agi: 1.0, int: 3.6 },
      base: { atk: 25, armor: 0, ms: 300, as: .58, range: 500, mr: .30 },
      skills: ['curse', 'sacrifice', 'singularity', 'gravity']
    },
    {
      id: 'pyro', name: 'Пиромант', role: 'МАГ · УРОН ПО ВРЕМЕНИ', cost: 3400,
      shape: 'pyro', anim: 'flame', c1: '#ff5a2f', c2: '#5a1c06', primary: 'int',
      tip: 'Поджигает толпу и дожигает её, пока сам держится в стороне.',
      attr: { str: 16, agi: 13, int: 26 }, gain: { str: 1.8, agi: 1.4, int: 3.4 },
      base: { atk: 20, armor: 0, ms: 275, as: .70, range: 420, mr: .30 },
      skills: ['firewave', 'ignite', 'flameaura', 'innerheat']
    },
    {
      id: 'demon', name: 'Демон Клинков', role: 'КЕРРИ · ИЛЛЮЗИИ', cost: 3800,
      shape: 'demon', anim: 'swift', c1: '#a05ad8', c2: '#2a0f3a', primary: 'agi',
      tip: 'Дерётся чужими руками: копии бьют за него, а метаморфоза превращает ' +
        'его и всех копий в дальнобойных чудовищ. Слаб в начале, страшен к концу.',
      attr: { str: 15, agi: 22, int: 15 }, gain: { str: 1.7, agi: 4.4, int: 1.6 },
      base: { atk: 24, armor: 2, ms: 315, as: .84, range: 70, mr: .25 },
      skills: ['reflection', 'splinter', 'metamorph', 'sunder']
    },
    {
      id: 'golem', name: 'Голем', role: 'ТАНК · ПЛОЩАДНОЙ УРОН', cost: 4200,
      shape: 'golem', anim: 'stone', c1: '#9a7b4f', c2: '#3a2c18', primary: 'str',
      tip: 'Самый живучий герой: стоит в центре толпы и перемалывает её землетрясением.',
      attr: { str: 28, agi: 12, int: 12 }, gain: { str: 4.0, agi: 1.2, int: 1.3 },
      base: { atk: 28, armor: 3, ms: 245, as: .68, range: 74, mr: .25 },
      skills: ['slam', 'quake', 'boulder', 'stoneskin']
    }
  ];

  var byId = {};
  LIST.forEach(function (h) { byId[h.id] = h; });

  return {
    LIST: LIST,
    get: function (id) { return byId[id] || LIST[0]; },
    has: function (id) { return !!byId[id]; }
  };
})());
