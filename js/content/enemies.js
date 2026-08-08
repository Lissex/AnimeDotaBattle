/* content/enemies — противники и боссы.
   Визуально это отдельный язык от героев: угловатые тёмные силуэты
   с шипами и светящимися глазами (см. render/shapes). */
AA.module('content/enemies', (function () {
  'use strict';

  // from   — с какой волны появляется
  // weight — вес в случайном выборе
  // fade   — с какой волны вес начинает падать (ранние типы уступают
  //          место поздним, иначе на сороковой волне то же Порождение)
  // role   — особое поведение (game/ai, game/combat)
  var LIST = [
    {
      id: 'grunt', name: 'Порождение', shape: 'e_husk',
      c1: '#6a3a3a', c2: '#2a1010', glow: '#ff5a4a',
      hp: 215, atk: 24, armor: 1, ms: 200, as: .8, range: 62, r: 18,
      from: 1, weight: 10, fade: 8
    },
    {
      id: 'archer', name: 'Костеплюй', shape: 'e_spitter',
      c1: '#3a5a6a', c2: '#101e28', glow: '#4affd0',
      hp: 160, atk: 27, armor: 0, ms: 190, as: .75, range: 360, r: 17,
      from: 1, weight: 8, fade: 10
    },
    {
      id: 'stalker', name: 'Тенегон', shape: 'e_stalker',
      c1: '#2a5a48', c2: '#0c1e18', glow: '#4aff9a',
      hp: 200, atk: 30, armor: 1, ms: 305, as: 1.1, range: 60, r: 16,
      from: 3, weight: 7, fade: 16
    },
    {
      id: 'brute', name: 'Костолом', shape: 'e_brute',
      c1: '#5a4a2a', c2: '#221a0c', glow: '#ffb03a',
      hp: 450, atk: 38, armor: 4, ms: 175, as: .6, range: 72, r: 24,
      from: 4, weight: 6, fade: 22
    },
    {
      id: 'shaman', name: 'Скверноус', shape: 'e_caster',
      c1: '#4a2a6a', c2: '#1a0c28', glow: '#c04aff',
      hp: 180, atk: 36, armor: 0, ms: 195, as: .62, range: 330, r: 17,
      from: 5, weight: 6, fade: 20, magic: true
    },
    {
      id: 'bomber', name: 'Гнойник', shape: 'e_bomb',
      c1: '#7a6a1a', c2: '#2a2408', glow: '#ffe04a',
      hp: 150, atk: 10, armor: 0, ms: 330, as: .5, range: 40, r: 17,
      from: 6, weight: 5,
      role: 'bomber', boomDmg: 130, boomR: 155
    },
    {
      /* Жалохвост: сам по себе хлипкий, но каждый удар оставляет яд.
         В толпе именно он не даёт спокойно стоять. */
      id: 'stinger', name: 'Жалохвост', shape: 'e_sting',
      c1: '#7a5a1a', c2: '#2a1e06', glow: '#ffd24a',
      hp: 165, atk: 20, armor: 0, ms: 300, as: 1.2, range: 56, r: 15,
      from: 6, weight: 6, role: 'stinger', venom: 6, venomDur: 4
    },
    {
      id: 'healer', name: 'Гнилодух', shape: 'e_healer',
      c1: '#2a6a4a', c2: '#0c2418', glow: '#5affb0',
      hp: 190, atk: 18, armor: 0, ms: 210, as: .6, range: 300, r: 17,
      from: 7, weight: 4,
      role: 'healer', healPs: 26, healR: 280
    },
    {
      id: 'shieldman', name: 'Панцирник', shape: 'e_shell',
      c1: '#3a4a5a', c2: '#141c24', glow: '#7ab0ff',
      hp: 380, atk: 30, armor: 12, ms: 160, as: .55, range: 66, r: 22,
      from: 8, weight: 5, fade: 26
    },
    {
      id: 'swarm', name: 'Гнус', shape: 'e_swarm',
      c1: '#6a7a1a', c2: '#242a08', glow: '#d0ff4a',
      hp: 70, atk: 14, armor: 0, ms: 360, as: 1.5, range: 44, r: 11,
      from: 9, weight: 6, pack: 4
    },
    {
      /* Кровосос: чем дольше живёт, тем толще. Его надо убивать первым. */
      id: 'leech', name: 'Кровосос', shape: 'e_leech',
      c1: '#6a1a2a', c2: '#260810', glow: '#ff4a6a',
      hp: 260, atk: 30, armor: 2, ms: 245, as: .9, range: 60, r: 18,
      from: 10, weight: 6, role: 'leech', drain: .9
    },
    {
      id: 'hexer', name: 'Проклятая', shape: 'e_hex',
      c1: '#6a1a5a', c2: '#260820', glow: '#ff4ad0',
      hp: 200, atk: 32, armor: 1, ms: 200, as: .55, range: 380, r: 18,
      from: 11, weight: 5,
      magic: true, role: 'hexer'
    },
    {
      /* Ревун: сам почти не бьёт, но разгоняет всех вокруг.
         Живой аргумент за то, чтобы бить не ближайшего, а нужного. */
      id: 'howler', name: 'Ревун', shape: 'e_howl',
      c1: '#5a3a6a', c2: '#1c0e28', glow: '#c88aff',
      hp: 300, atk: 20, armor: 3, ms: 215, as: .5, range: 70, r: 21,
      from: 13, weight: 5,
      role: 'howler', auraR: 340, auraAs: 1.35, auraMs: 1.18
    },
    {
      /* Прыгун: раз в несколько секунд перелетает через полкарты
         прямо к герою. Дистанция от него не спасает. */
      id: 'lunger', name: 'Прыгун', shape: 'e_lunge',
      c1: '#2a4a6a', c2: '#0c1826', glow: '#5ac8ff',
      hp: 240, atk: 34, armor: 1, ms: 260, as: .85, range: 62, r: 18,
      from: 15, weight: 6, role: 'lunger', leapCd: 6, leapRange: 620
    },
    {
      /* Расщепитель: убил одного — получил двух поменьше. */
      id: 'splitter', name: 'Расщепитель', shape: 'e_split',
      c1: '#4a6a3a', c2: '#16220e', glow: '#a8ff5a',
      hp: 340, atk: 28, armor: 2, ms: 205, as: .7, range: 64, r: 22,
      from: 17, weight: 6, role: 'splitter', splitInto: 2
    },
    {
      /* Костяной Страж: ходячая стена. Броню надо снимать, иначе не пробить. */
      id: 'sentinel', name: 'Костяной Страж', shape: 'e_sentinel',
      c1: '#8a8270', c2: '#2a2620', glow: '#ffe8a0',
      hp: 720, atk: 44, armor: 20, ms: 150, as: .5, range: 78, r: 27,
      from: 20, weight: 5
    },
    {
      /* Чернокнижник: щитует соседей, поэтому урон уходит в пустоту. */
      id: 'warlock', name: 'Чернокнижник', shape: 'e_warlock',
      c1: '#3a2a7a', c2: '#100a2a', glow: '#8a7aff',
      hp: 230, atk: 40, armor: 1, ms: 200, as: .55, range: 400, r: 18,
      from: 23, weight: 5, magic: true, role: 'warlock', shieldR: 320, shieldCd: 7
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
    },
    brood: {
      id: 'brood', name: 'Личинка', shape: 'e_swarm',
      c1: '#8aa81a', c2: '#2a3208', glow: '#d0ff4a',
      hp: 65, atk: 16, armor: 0, ms: 350, as: 1.4, range: 44, r: 11
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
      concept: 'Чем дольше тянется бой, тем больше костяков на арене. Наказывает за медлительность.',
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
      concept: 'Наказывает и за близость, и за побег: вплотную жрёт, на расстоянии заливает пол лужами.',
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
      concept: 'Не даёт себя достать: телепортируется, прячется за копиями и бьёт по площади издалека.',
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
      concept: 'Превращает арену в наковальню: безопасных мест почти не остаётся.',
      abilities: [
        { id: 'ashRings', cd: 12 },    // расходящиеся огненные кольца
        { id: 'hammerFall', cd: 9 },   // удар молотом по конусу
        { id: 'forgePillars', cd: 13 } // столбы пламени по арене
      ]
    },
    {
      id: 'b5', name: 'Хронарх', shape: 'e_boss_chrono',
      c1: '#4ac8c0', c2: '#0e2a30', glow: '#8affe8',
      hpMul: 5.4, atkMul: 2.0, armor: 9, ms: 210, as: .75, range: 340, r: 34, magic: true,
      phaseAt: .5,
      concept: 'Гонка со временем: откатывает своё здоровье, поэтому надо продавить его быстрее, чем он восстановится.',
      abilities: [
        { id: 'timeField', cd: 11 },   // зона замедленного времени
        { id: 'rewind', cd: 17 },      // откат здоровья к прошлому значению
        { id: 'hasteSelf', cd: 14 }    // ускоряет сам себя
      ]
    },
    {
      id: 'b6', name: 'Роевая Матка', shape: 'e_boss_brood',
      c1: '#8aa81a', c2: '#2a3208', glow: '#d0ff4a',
      hpMul: 5.0, atkMul: 1.7, armor: 6, ms: 200, as: .6, range: 76, r: 40,
      phaseAt: .5,
      concept: 'Прячется за собственным потомством: пока не разгребёшь рой, до неё не добраться.',
      abilities: [
        { id: 'spawnBrood', cd: 9 },   // выводок гнуса
        { id: 'burrow', cd: 15 },      // зарывается и вылезает в стороне
        { id: 'acidSpray', cd: 10 }    // конус кислоты, разъедает броню
      ]
    },
    {
      id: 'b7', name: 'Зеркальный Страж', shape: 'e_boss_mirror',
      c1: '#c0d8e8', c2: '#1c2c3a', glow: '#9adcff',
      hpMul: 6.2, atkMul: 1.9, armor: 14, ms: 190, as: .7, range: 84, r: 36,
      phaseAt: .45,
      concept: 'Наказывает за жадность: часть урона возвращается тому, кто бьёт не глядя.',
      abilities: [
        { id: 'reflectShield', cd: 14 },  // отражает часть урона обратно
        { id: 'mirrorWalls', cd: 12 },    // зеркальные стены режут проход
        { id: 'shardVolley', cd: 8 }      // веер осколков
      ]
    },
    {
      id: 'b8', name: 'Громовой Титан', shape: 'e_boss_storm',
      c1: '#5a8ae8', c2: '#141c3a', glow: '#a0d8ff',
      hpMul: 7.0, atkMul: 2.2, armor: 11, ms: 175, as: .65, range: 300, r: 44,
      phaseAt: .4,
      concept: 'Не даёт выбрать дистанцию: вблизи жжёт полем, издалека бьёт цепями молний.',
      abilities: [
        { id: 'staticField', cd: 13 },  // поле: чем ближе, тем больнее
        { id: 'chainStorm', cd: 10 },   // цепные молнии по всем
        { id: 'thunderclap', cd: 11 }   // удар с оглушением вокруг себя
      ]
    },
    {
      id: 'b9', name: 'Чумной Патриарх', shape: 'e_boss_plague',
      c1: '#9aa82a', c2: '#2a2a10', glow: '#c8ff6a',
      hpMul: 6.4, atkMul: 1.8, armor: 10, ms: 185, as: .6, range: 320, r: 38, magic: true,
      phaseAt: .45,
      concept: 'Арена постепенно становится непригодной: лужи растут, лечение слабеет. Кто медлит — задыхается.',
      abilities: [
        { id: 'plaguePool', cd: 9 },    // растущие лужи заразы
        { id: 'infect', cd: 12 },       // заражение с уроном по времени
        { id: 'miasma', cd: 16 }        // облако, режущее лечение
      ]
    },
    {
      id: 'b10', name: 'Владыка Ярости', shape: 'e_boss_wrath',
      c1: '#d02a2a', c2: '#3a0808', glow: '#ff6a4a',
      hpMul: 7.6, atkMul: 2.3, armor: 13, ms: 195, as: .8, range: 92, r: 42,
      phaseAt: .55,
      concept: 'Чем ближе к смерти, тем страшнее: не даёт ни убежать, ни отсидеться на низком здоровье.',
      abilities: [
        { id: 'chainPull', cd: 10 },    // цепью притягивает к себе
        { id: 'wrathWhirl', cd: 13 },   // вращение, идущее за героем
        { id: 'executeLeap', cd: 12 }   // прыжок-казнь по раненому
      ]
    }
  ];

  /** Манекен учебного полигона. */
  var DUMMY = {
    id: 'dummy', name: 'Манекен', shape: 'e_dummy',
    c1: '#5a5a6a', c2: '#1a1a24', glow: '#8b97bd',
    hp: 12000, atk: 0, armor: 0, ms: 0, as: 0, range: 0, r: 22, role: 'dummy'
  };

  /** Вес типа на конкретной волне: ранние постепенно вытесняются. */
  function weightAt(e, wave) {
    if (!e.fade || wave <= e.fade) return e.weight;
    return e.weight * Math.max(.12, 1 - (wave - e.fade) * .045);
  }

  /** Взвешенный выбор моба по номеру волны. */
  function roll(wave) {
    var pool = LIST.filter(function (e) { return wave >= e.from; });
    var total = 0, i, w = [];
    for (i = 0; i < pool.length; i++) { w[i] = weightAt(pool[i], wave); total += w[i]; }
    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[0] || LIST[0];
  }

  /** Боссы идут по порядку и после десятого начинают повторяться. */
  function bossFor(wave) {
    var idx = AA.Content.attributes.bossIndex(wave) - 1;
    if (idx < 0) idx = 0;
    return BOSSES[idx % BOSSES.length];
  }

  return {
    LIST: LIST, BOSSES: BOSSES, MINIONS: MINIONS, DUMMY: DUMMY,
    roll: roll, bossFor: bossFor, weightAt: weightAt,
    get: function (id) {
      for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
      return null;
    }
  };
})());
