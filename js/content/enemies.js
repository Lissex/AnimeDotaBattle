/* content/enemies — противники и боссы.
   Визуально это отдельный язык от героев: угловатые тёмные силуэты
   с шипами и светящимися глазами (см. render/shapes). */
AA.module('content/enemies', (function () {
  'use strict';

  // from   — с какой волны появляется
  // weight — вес в случайном выборе
  // role   — особое поведение (game/ai)
  var LIST = [
    {
      id: 'grunt', name: 'Порождение', shape: 'e_husk',
      c1: '#6a3a3a', c2: '#2a1010', glow: '#ff5a4a',
      hp: 215, atk: 24, armor: 1, ms: 200, as: .8, range: 62, r: 18, from: 1, weight: 10
    },
    {
      id: 'archer', name: 'Костеплюй', shape: 'e_spitter',
      c1: '#3a5a6a', c2: '#101e28', glow: '#4affd0',
      hp: 160, atk: 27, armor: 0, ms: 190, as: .75, range: 360, r: 17, from: 1, weight: 8
    },
    {
      id: 'stalker', name: 'Тенегон', shape: 'e_stalker',
      c1: '#2a5a48', c2: '#0c1e18', glow: '#4aff9a',
      hp: 200, atk: 30, armor: 1, ms: 305, as: 1.1, range: 60, r: 16, from: 3, weight: 7
    },
    {
      id: 'brute', name: 'Костолом', shape: 'e_brute',
      c1: '#5a4a2a', c2: '#221a0c', glow: '#ffb03a',
      hp: 450, atk: 38, armor: 4, ms: 175, as: .6, range: 72, r: 24, from: 4, weight: 6
    },
    {
      id: 'shaman', name: 'Скверноус', shape: 'e_caster',
      c1: '#4a2a6a', c2: '#1a0c28', glow: '#c04aff',
      hp: 180, atk: 36, armor: 0, ms: 195, as: .62, range: 330, r: 17, from: 5, weight: 6, magic: true
    },
    {
      id: 'bomber', name: 'Гнойник', shape: 'e_bomb',
      c1: '#7a6a1a', c2: '#2a2408', glow: '#ffe04a',
      hp: 150, atk: 10, armor: 0, ms: 330, as: .5, range: 40, r: 17, from: 6, weight: 5,
      role: 'bomber', boomDmg: 130, boomR: 155
    },
    {
      id: 'healer', name: 'Гнилодух', shape: 'e_healer',
      c1: '#2a6a4a', c2: '#0c2418', glow: '#5affb0',
      hp: 190, atk: 18, armor: 0, ms: 210, as: .6, range: 300, r: 17, from: 7, weight: 4,
      role: 'healer', healPs: 26, healR: 280
    },
    {
      id: 'shieldman', name: 'Панцирник', shape: 'e_shell',
      c1: '#3a4a5a', c2: '#141c24', glow: '#7ab0ff',
      hp: 380, atk: 30, armor: 12, ms: 160, as: .55, range: 66, r: 22, from: 8, weight: 5
    },
    {
      id: 'swarm', name: 'Гнус', shape: 'e_swarm',
      c1: '#6a7a1a', c2: '#242a08', glow: '#d0ff4a',
      hp: 70, atk: 14, armor: 0, ms: 360, as: 1.5, range: 44, r: 11, from: 9, weight: 6, pack: 4
    },
    {
      id: 'hexer', name: 'Проклятая', shape: 'e_hex',
      c1: '#6a1a5a', c2: '#260820', glow: '#ff4ad0',
      hp: 200, atk: 32, armor: 1, ms: 200, as: .55, range: 380, r: 18, from: 11, weight: 5,
      magic: true, role: 'hexer'
    }
  ];

  /* ---------------- призываемые прислужники ---------------- */
  var MINIONS = {
    skeleton: {
      id: 'skeleton', name: 'Костяк', shape: 'e_skeleton',
      c1: '#b8b0a0', c2: '#2a2620', glow: '#ffe8a0',
      hp: 130, atk: 22, armor: 2, ms: 265, as: 1.0, range: 58, r: 15
    },
    mirror: {
      id: 'mirror', name: 'Отражение', shape: 'e_mirror',
      c1: '#4a6ac8', c2: '#141c3a', glow: '#8ab0ff',
      hp: 90, atk: 26, armor: 0, ms: 235, as: .7, range: 330, r: 16, magic: true
    }
  };

  /* ---------------- боссы ----------------
     abilities — набор умений с собственными перезарядками.
     phaseAt   — доля здоровья, ниже которой босс звереет:
                 перезарядки короче, урон выше, силуэт светится. */
  var BOSSES = [
    {
      id: 'b1', name: 'Костяной Владыка', shape: 'e_boss_bone',
      c1: '#c8c0a8', c2: '#3a3428', glow: '#ffe8a0',
      hpMul: 5.2, atkMul: 1.9, armor: 8, ms: 195, as: .7, range: 88, r: 36,
      phaseAt: .5,
      abilities: [
        { id: 'boneStorm', cd: 9 },    // круговой удар с телеграфом
        { id: 'boneSpears', cd: 7 },   // веер костяных копий
        { id: 'raiseDead', cd: 16 }    // поднимает костяков
      ]
    },
    {
      id: 'b2', name: 'Пожиратель Бездны', shape: 'e_boss_maw',
      c1: '#7a2050', c2: '#2a0a1c', glow: '#ff4a9a',
      hpMul: 6.0, atkMul: 2.0, armor: 10, ms: 185, as: .65, range: 94, r: 38,
      phaseAt: .45,
      abilities: [
        { id: 'grab', cd: 8 },         // притягивает крюком
        { id: 'devour', cd: 11 },      // кусает вплотную и лечится
        { id: 'voidPools', cd: 14 }    // разливает лужи бездны
      ]
    },
    {
      id: 'b3', name: 'Архонт Пустоты', shape: 'e_boss_void',
      c1: '#4a6ac8', c2: '#141c3a', glow: '#8ab0ff',
      hpMul: 5.0, atkMul: 2.2, armor: 7, ms: 205, as: .8, range: 400, r: 34, magic: true,
      phaseAt: .5,
      abilities: [
        { id: 'voidMeteor', cd: 8 },   // метеор в точку игрока
        { id: 'voidRift', cd: 10 },    // разлом по линии
        { id: 'mirrorImages', cd: 18 },// призывает отражения
        { id: 'voidBlink', cd: 6 }     // телепорт при сближении
      ]
    },
    {
      id: 'b4', name: 'Кузнец Пепла', shape: 'e_boss_forge',
      c1: '#c85a20', c2: '#3a1a06', glow: '#ffa04a',
      hpMul: 6.6, atkMul: 2.1, armor: 12, ms: 180, as: .7, range: 90, r: 40,
      phaseAt: .4,
      abilities: [
        { id: 'ashRings', cd: 12 },    // расходящиеся огненные кольца
        { id: 'hammerFall', cd: 9 },   // удар молотом по конусу
        { id: 'forgePillars', cd: 13 } // столбы пламени по арене
      ]
    }
  ];

  /** Манекен учебного полигона. */
  var DUMMY = {
    id: 'dummy', name: 'Манекен', shape: 'e_dummy',
    c1: '#5a5a6a', c2: '#1a1a24', glow: '#8b97bd',
    hp: 12000, atk: 0, armor: 0, ms: 0, as: 0, range: 0, r: 22, role: 'dummy'
  };

  /** Взвешенный выбор моба по номеру волны. */
  function roll(wave) {
    var pool = LIST.filter(function (e) { return wave >= e.from; });
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += pool[i].weight;
    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) { r -= pool[i].weight; if (r <= 0) return pool[i]; }
    return pool[0] || LIST[0];
  }

  function bossFor(wave) {
    return BOSSES[(Math.floor(wave / 5) - 1) % BOSSES.length];
  }

  return {
    LIST: LIST, BOSSES: BOSSES, MINIONS: MINIONS, DUMMY: DUMMY,
    roll: roll, bossFor: bossFor
  };
})());
