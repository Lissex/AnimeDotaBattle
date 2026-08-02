/* content/offers — карточки событий между волнами.

   Раз в несколько волн игрок выбирает одну из трёх. Пул общий,
   у каждой карточки своя редкость и условие появления, поэтому
   два забега подряд не совпадают.

   Поля карточки:
     stat(u, s)  — постоянная прибавка к характеристикам (через game/run)
     run(state)  — правка множителей забега
     take(ctx)   — разовое действие: предмет, золото, лечение
     risk        — карточка с платой, подсвечивается красным
*/
AA.module('content/offers', (function () {
  'use strict';

  function mul(key, k) {
    return function (u, s) { s[key] *= k; };
  }
  function add(key, v) {
    return function (u, s) { s[key] += v; };
  }

  var LIST = [

    /* ============ дары: чистая прибавка ============ */
    {
      id: 'might', name: 'Дар силы', icon: '✊', color: '#ff6b4a', weight: 10,
      d: '+18 к силе на весь забег',
      stat: add('str', 18)
    },
    {
      id: 'grace', name: 'Дар ловкости', icon: '➶', color: '#3ddb7f', weight: 10,
      d: '+18 к ловкости на весь забег',
      stat: add('agi', 18)
    },
    {
      id: 'insight', name: 'Дар разума', icon: '✦', color: '#4aa8ff', weight: 10,
      d: '+18 к интеллекту на весь забег',
      stat: add('int', 18)
    },
    {
      id: 'edge', name: 'Заточка', icon: '⚔', color: '#e8e8f0', weight: 9,
      d: '+14% к урону атаки',
      stat: mul('atk', 1.14)
    },
    {
      id: 'swiftness', name: 'Лёгкий шаг', icon: '»', color: '#ffd24a', weight: 9,
      d: '+40 к скорости передвижения',
      stat: add('ms', 40)
    },
    {
      id: 'focus', name: 'Сосредоточение', icon: '◎', color: '#b07dff', weight: 8,
      d: '−10% ко всем перезарядкам',
      stat: add('cdr', 10)
    },
    {
      id: 'vigor', name: 'Второе сердце', icon: '♥', color: '#3ddb7f', weight: 8,
      d: '+9 к восстановлению здоровья',
      stat: add('hpReg', 9)
    },
    {
      id: 'sharpEye', name: 'Острый глаз', icon: '◉', color: '#ff7a2f', weight: 7,
      d: '+10% шанса критического удара',
      stat: add('crit', 10)
    },
    {
      id: 'thirst', name: 'Жажда', icon: '🩸', color: '#ff4d5e', weight: 7,
      d: '+10% вампиризма',
      stat: add('lifesteal', 10)
    },
    {
      id: 'wardstone', name: 'Оберег', icon: '🛡', color: '#8b97bd', weight: 7,
      d: '+6 брони и +8% сопротивления магии',
      stat: function (u, s) { s.armor += 6; s.mr += .08; }
    },

    /* ============ разовое: предметы и ресурсы ============ */
    {
      id: 'chest', name: 'Сундук', icon: '▤', color: '#ffc043', weight: 9,
      d: 'Случайный эпический предмет бесплатно',
      take: function (ctx) { ctx.giveItem(3); }
    },
    {
      id: 'relic', name: 'Реликварий', icon: '◈', color: '#ffc043', weight: 4,
      d: 'Случайный легендарный предмет бесплатно',
      take: function (ctx) { ctx.giveItem(4); }
    },
    {
      id: 'purse', name: 'Кошель', icon: '●', color: '#ffc043', weight: 10,
      d: 'Золото по номеру волны',
      take: function (ctx) { ctx.gold(600 + ctx.wave * 220); }
    },
    {
      id: 'lesson', name: 'Урок', icon: '↑', color: '#ff7a2f', weight: 6,
      d: 'Одно очко умений сверх обычного',
      take: function (ctx) { ctx.skillPoint(1); }
    },
    {
      id: 'mending', name: 'Исцеление', icon: '✚', color: '#3ddb7f', weight: 8,
      d: 'Полностью восстанавливает здоровье и ману',
      take: function (ctx) { ctx.heal(); }
    },

    /* ============ экономика забега ============ */
    {
      id: 'haggler', name: 'Торгаш', icon: '⚖', color: '#4aa8ff', weight: 7,
      d: 'Скидка 15% в лавке до конца забега',
      run: function (r) { r.shopDiscount = Math.min(.6, r.shopDiscount + .15); }
    },
    {
      id: 'prospector', name: 'Старатель', icon: '◆', color: '#ffc043', weight: 7,
      d: '+25% золота до конца забега',
      run: function (r) { r.goldMul += .25; }
    },
    {
      id: 'satchel', name: 'Заплечный мешок', icon: '▣', color: '#8b97bd', weight: 5,
      d: 'Ещё один слот инвентаря',
      run: function (r) { r.extraSlots += 1; }
    },

    /* ============ сделки: есть плата ============ */
    {
      id: 'bloodpact', name: 'Кровавый договор', icon: '☠', color: '#ff4d5e',
      weight: 7, risk: true,
      d: '−25% максимального здоровья, но +30% к урону атаки',
      stat: function (u, s) { s.hp *= .75; s.atk *= 1.3; }
    },
    {
      id: 'recklessness', name: 'Безрассудство', icon: '⚡', color: '#ff7a2f',
      weight: 7, risk: true,
      d: '−8 брони, но +35% скорости атаки',
      stat: function (u, s) { s.armor -= 8; s.asMul *= 1.35; }
    },
    {
      id: 'ordeal', name: 'Испытание', icon: '▲', color: '#ff4d5e',
      weight: 6, risk: true,
      d: 'Враги на 15% крепче до конца забега, зато золота и душ вдвое больше',
      run: function (r) { r.enemyMul *= 1.15; r.goldMul += 1; r.soulMul += 1; }
    },
    {
      id: 'hunt', name: 'Большая охота', icon: '★', color: '#ff7a2f',
      weight: 5, risk: true,
      d: 'Каждый пятый враг становится элитным, но с них падает больше золота',
      run: function (r) { r.eliteChance += .2; r.goldMul += .3; }
    },
    {
      id: 'famine', name: 'Голод', icon: '◐', color: '#b07dff',
      weight: 5, risk: true,
      d: 'Цены в лавке +40%, но +25 ко всем трём атрибутам',
      run: function (r) { r.priceMul *= 1.4; },
      stat: function (u, s) { s.str += 25; s.agi += 25; s.int += 25; }
    }
  ];

  var byId = {};
  LIST.forEach(function (o) { byId[o.id] = o; });

  /**
   * Три разные карточки с учётом веса. Одну и ту же прибавку
   * можно взять повторно — так собираются билды.
   */
  function roll(count) {
    count = count || 3;
    var pool = LIST.slice();
    var picked = [];

    while (picked.length < count && pool.length) {
      var total = 0, i;
      for (i = 0; i < pool.length; i++) total += pool[i].weight;

      var r = Math.random() * total;
      for (i = 0; i < pool.length; i++) {
        r -= pool[i].weight;
        if (r <= 0) { picked.push(pool.splice(i, 1)[0]); break; }
      }
    }
    return picked;
  }

  return { LIST: LIST, roll: roll, get: function (id) { return byId[id]; } };
})());
