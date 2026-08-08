/* content/offers — карточки событий между волнами.

   Раз в несколько волн игрок выбирает одну из трёх. Пул общий,
   у каждой карточки свой вес, поэтому два забега не совпадают.

   Поля карточки:
     stat(u, s, w) — постоянная прибавка к характеристикам.
                     w — номер волны, на которой карта взята.
     run(state)    — правка множителей забега
     take(ctx)     — разовое действие: предмет, золото, лечение
     risk          — карточка с платой, подсвечивается красным
     unique        — берётся один раз за забег
     needShop      — не предлагать, если лавка закрыта

   ------------------------------------------------------------
   ПРО БАЛАНС

   Раньше пул был перекошен в двух местах.

   Первое: плоские дары («+18 к силе») не росли, а множители
   («+14% урона») росли и складывались. К тридцатой волне дар
   атрибута не значил ничего, а три «Заточки» подряд удваивали
   урон. Теперь дары считаются от волны, а множители уникальны:
   каждый берётся один раз.

   Второе: платой у рискованных карт было золото, а золота к
   двадцатой волне девать некуда — «Испытание» и «Голод» были
   бесплатными подарками. Теперь плата всегда в том, что дефицитно:
   здоровье, броня, размер волны, закрытая лавка.
   ------------------------------------------------------------ */
AA.module('content/offers', (function () {
  'use strict';

  var LIST = [

    /* ============ дары: растут вместе с волной ============ */
    {
      id: 'might', name: 'Дар силы', icon: '✊', color: '#ff6b4a', weight: 10,
      d: 'Сила по номеру волны, на весь забег',
      stat: function (u, s, w) { s.str += 10 + w; }
    },
    {
      id: 'grace', name: 'Дар ловкости', icon: '➶', color: '#3ddb7f', weight: 10,
      d: 'Ловкость по номеру волны, на весь забег',
      stat: function (u, s, w) { s.agi += 10 + w; }
    },
    {
      id: 'insight', name: 'Дар разума', icon: '✦', color: '#4aa8ff', weight: 10,
      d: 'Интеллект по номеру волны, на весь забег',
      stat: function (u, s, w) { s.int += 10 + w; }
    },
    {
      id: 'vigor', name: 'Второе сердце', icon: '♥', color: '#3ddb7f', weight: 8,
      d: 'Восстановление здоровья по номеру волны',
      stat: function (u, s, w) { s.hpReg += 3 + w * .4; }
    },
    {
      id: 'wardstone', name: 'Оберег', icon: '🛡', color: '#8b97bd', weight: 7,
      d: 'Броня по номеру волны и +5% сопротивления магии',
      stat: function (u, s, w) { s.armor += 3 + w * .18; s.mr += .05; }
    },
    {
      id: 'bulwark', name: 'Твердыня', icon: '▤', color: '#7ab0ff', weight: 7,
      d: '+10% максимального здоровья',
      stat: function (u, s) { s.hp *= 1.10; }
    },

    /* ============ множители: по одному за забег ============ */
    {
      id: 'edge', name: 'Заточка', icon: '⚔', color: '#e8e8f0', weight: 8, unique: true,
      d: '+12% к урону атаки',
      stat: function (u, s) { s.atk *= 1.12; }
    },
    {
      id: 'runeword', name: 'Рунное слово', icon: '✳', color: '#b07dff', weight: 7, unique: true,
      d: '+30% к силе заклинаний',
      stat: function (u, s) { s.sp *= 1.30; }
    },
    {
      id: 'swiftness', name: 'Лёгкий шаг', icon: '»', color: '#ffd24a', weight: 8, unique: true,
      d: '+35 к скорости передвижения',
      stat: function (u, s) { s.ms += 35; }
    },
    {
      id: 'focus', name: 'Сосредоточение', icon: '◎', color: '#b07dff', weight: 7, unique: true,
      d: '−12% ко всем перезарядкам',
      stat: function (u, s) { s.cdr += 12; }
    },
    {
      id: 'sharpEye', name: 'Острый глаз', icon: '◉', color: '#ff7a2f', weight: 6, unique: true,
      d: '+12% шанса критического удара',
      stat: function (u, s) { s.crit += 12; }
    },
    {
      id: 'thirst', name: 'Жажда', icon: '🩸', color: '#ff4d5e', weight: 6, unique: true,
      d: '+10% вампиризма',
      stat: function (u, s) { s.lifesteal += 10; }
    },

    /* ============ разовое: предметы и ресурсы ============ */
    {
      id: 'chest', name: 'Сундук', icon: '▦', color: '#ffc043', weight: 8,
      d: 'Случайный эпический предмет бесплатно',
      take: function (ctx) { ctx.giveItem(3); }
    },
    {
      id: 'relic', name: 'Реликварий', icon: '◈', color: '#ffc043', weight: 3,
      d: 'Случайный легендарный предмет бесплатно',
      take: function (ctx) { ctx.giveItem(4); }
    },
    {
      id: 'purse', name: 'Кошель', icon: '●', color: '#ffc043', weight: 8,
      d: 'Золото по номеру волны',
      take: function (ctx) { ctx.gold(400 + ctx.wave * 150); }
    },
    {
      id: 'lesson', name: 'Урок', icon: '↑', color: '#ff7a2f', weight: 5,
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
      id: 'haggler', name: 'Торгаш', icon: '⚖', color: '#4aa8ff',
      weight: 6, unique: true, needShop: true,
      d: 'Скидка 15% в лавке до конца забега',
      run: function (r) { r.shopDiscount = Math.min(.6, r.shopDiscount + .15); }
    },
    {
      id: 'prospector', name: 'Старатель', icon: '◆', color: '#ffc043',
      weight: 5, unique: true, needShop: true,
      d: '+25% золота до конца забега',
      run: function (r) { r.goldMul += .25; }
    },
    {
      id: 'satchel', name: 'Заплечный мешок', icon: '▣', color: '#8b97bd',
      weight: 4, unique: true,
      d: 'Ещё один слот инвентаря',
      run: function (r) { r.extraSlots += 1; }
    },

    /* ============ сделки: плата всегда настоящая ============ */
    {
      id: 'bloodpact', name: 'Кровавый договор', icon: '☠', color: '#ff4d5e',
      weight: 6, risk: true, unique: true,
      d: '−25% максимального здоровья, зато +22% к урону атаки',
      stat: function (u, s) { s.hp *= .75; s.atk *= 1.22; }
    },
    {
      id: 'recklessness', name: 'Безрассудство', icon: '⚡', color: '#ff7a2f',
      weight: 6, risk: true, unique: true,
      d: '−9 брони, зато +25% скорости атаки',
      stat: function (u, s) { s.armor -= 9; s.asMul *= 1.25; }
    },
    {
      id: 'heavyhand', name: 'Тяжёлая рука', icon: '⬤', color: '#c88aff',
      weight: 6, risk: true, unique: true,
      d: '−20% скорости передвижения, зато +45% к силе заклинаний',
      stat: function (u, s) { s.ms *= .80; s.sp *= 1.45; }
    },
    {
      id: 'ordeal', name: 'Испытание', icon: '▲', color: '#ff4d5e',
      weight: 5, risk: true, unique: true,
      d: 'Враги на 22% крепче до конца забега, зато два очка умений сразу и +60% душ',
      run: function (r) { r.enemyMul *= 1.22; r.soulMul += .6; },
      take: function (ctx) { ctx.skillPoint(2); }
    },
    {
      id: 'rush', name: 'Спешка', icon: '⇉', color: '#ff7a2f',
      weight: 5, risk: true, unique: true,
      d: 'Волны на четверть больше, зато +15% к урону атаки и +10% скорости',
      run: function (r) { r.waveMul *= 1.25; },
      stat: function (u, s) { s.atk *= 1.15; s.ms += 22; }
    },
    {
      id: 'hunt', name: 'Большая охота', icon: '★', color: '#ff7a2f',
      weight: 5, risk: true, unique: true,
      d: 'Элитных врагов заметно больше, зато с них падает вдвое больше золота',
      run: function (r) { r.eliteChance += .16; r.goldMul += .5; }
    },
    {
      id: 'famine', name: 'Голод', icon: '◐', color: '#b07dff',
      weight: 4, risk: true, unique: true, needShop: true,
      d: 'Цены в лавке +60%, зато щедрый дар всех трёх атрибутов',
      run: function (r) { r.priceMul *= 1.6; },
      stat: function (u, s, w) { var v = 12 + w * .8; s.str += v; s.agi += v; s.int += v; }
    },
    {
      id: 'vow', name: 'Обет нищего', icon: '⊘', color: '#ff4d5e',
      weight: 3, risk: true, unique: true, needShop: true,
      d: 'Лавка закрывается до конца забега, зато три очка умений и большой дар атрибутов',
      run: function (r) { r.noShop = true; },
      stat: function (u, s, w) { var v = 20 + w * 1.4; s.str += v; s.agi += v; s.int += v; },
      take: function (ctx) { ctx.skillPoint(3); }
    }
  ];

  var byId = {};
  LIST.forEach(function (o) { byId[o.id] = o; });

  /** Можно ли предложить карточку прямо сейчас. */
  function available(o) {
    var run = AA.Game.run;
    if (o.unique && run.countOf(o.id) > 0) return false;
    if (o.needShop && run.state.noShop) return false;
    return true;
  }

  /**
   * Три разные карточки с учётом веса. Дары атрибутов можно брать
   * повторно — так собираются билды; всё остальное по одному разу.
   */
  function roll(count) {
    count = count || 3;
    var pool = LIST.filter(available);
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

  return { LIST: LIST, roll: roll, available: available, get: function (id) { return byId[id]; } };
})());
