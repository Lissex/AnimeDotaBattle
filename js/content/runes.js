/* content/runes — руны, которые появляются на арене во время боя.
   Подбираются наступанием, действуют ограниченное время.
   Логика спавна и подбора — в game/runes. */
AA.module('content/runes', (function () {
  'use strict';

  var LIST = [
    {
      id: 'damage', name: 'Двойной урон', icon: '⚔', color: '#ff4d5e', dur: 25,
      desc: 'Урон атаки удвоен',
      apply: function (u, d) {
        d.buff(u, { id: 'rune_dd', dur: 25, atkMul: 2, color: '#ff4d5e', glow: '#ff4d5e' });
      }
    },
    {
      id: 'haste', name: 'Ускорение', icon: '»', color: '#ffd24a', dur: 20,
      desc: '+45% скорости передвижения и атаки',
      apply: function (u, d) {
        d.buff(u, { id: 'rune_haste', dur: 20, msMul: 1.45, asMul: 1.45, color: '#ffd24a', glow: '#ffd24a' });
      }
    },
    {
      id: 'regen', name: 'Регенерация', icon: '✚', color: '#3ddb7f', dur: 14,
      desc: 'Быстро восстанавливает здоровье и ману',
      apply: function (u, d) {
        d.buff(u, {
          id: 'rune_regen', dur: 14, regenPct: 6, mpReg: 14,
          color: '#3ddb7f', glow: '#3ddb7f'
        });
      }
    },
    {
      id: 'invis', name: 'Невидимость', icon: '👁', color: '#b07dff', dur: 18,
      desc: 'Враги теряют вас из виду',
      apply: function (u, d) {
        d.buff(u, { id: 'invis', dur: 18, invis: true, ambush: 2, ms: 40, color: '#b07dff' });
      }
    },
    {
      id: 'arcane', name: 'Аркана', icon: '✦', color: '#4aa8ff', dur: 22,
      desc: '-40% к перезарядке умений, мана не кончается',
      apply: function (u, d) {
        d.buff(u, {
          id: 'rune_arcane', dur: 22, cdr: 40, mpReg: 26,
          color: '#4aa8ff', glow: '#4aa8ff'
        });
      }
    },
    {
      id: 'bounty', name: 'Богатство', icon: '◈', color: '#ffc043', dur: 0,
      desc: 'Мгновенно даёт золото',
      instant: true,
      apply: function (u, d) { d.gold(220 + d.wave * 90); }
    }
  ];

  var byId = {};
  LIST.forEach(function (r) { byId[r.id] = r; });

  return {
    LIST: LIST,
    get: function (id) { return byId[id]; },
    roll: function () { return LIST[Math.floor(Math.random() * LIST.length)]; },

    /* настройки спавна */
    FIRST_DELAY: 18,     // первая руна появляется не сразу
    INTERVAL: 32,        // как часто появляются следующие
    MAX_ON_FIELD: 2,     // больше двух одновременно не лежит
    LIFETIME: 26         // если не подобрать, руна тускнеет и исчезает
  };
})());
