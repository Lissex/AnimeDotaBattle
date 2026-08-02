/* content/skills/arcanist — три стихии Аркана и его пассивка.
   Сами заклинания живут в content/skills/invoke. */
(function () {
  'use strict';
  var S = AA.Content.skills, g = S.g;

  function reagent(id, name, icon, color, elem, what) {
    return {
      id: id, name: name, icon: icon, color: color, type: 'reagent', elem: elem,
      mana: [0, 0, 0, 0], cd: [0, 0, 0, 0],
      desc: function (l) {
        return 'Стихия ' + what + '. Добавляет реагент в связку и усиливает все заклинания ' +
          'с этой стихией (текущий уровень ' + (l + 1) + ').';
      },
      cast: function (u) { g().addReagent(u, elem); return true; }
    };
  }

  S.add({
    elemFire: reagent('elemFire', 'Пламя', '🔥', '#ff5a2f', 'F', 'огня'),
    elemIce: reagent('elemIce', 'Лёд', '❄', '#7fd4ff', 'I', 'льда'),
    elemStorm: reagent('elemStorm', 'Шторм', '⚡', '#c9a0ff', 'S', 'бури'),

    arcana: {
      id: 'arcana', name: 'Аркана', icon: '🔮', color: '#b07dff', type: 'passive',
      sp: [30, 55, 85, 120], cdr: [8, 14, 20, 27],
      desc: function (l) {
        return '+' + this.sp[l] + ' к силе заклинаний и -' + this.cdr[l] +
          '% к перезарядке всех заклинаний.';
      },
      apply: function (u, l, s) { s.sp += this.sp[l]; s.cdr += this.cdr[l]; }
    }
  });
})();
