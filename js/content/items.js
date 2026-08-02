/* content/items — предметы лавки. Действуют только внутри забега.
   t — редкость 1..4. Ключи s складываются в game/stats. */
AA.module('content/items', (function () {
  'use strict';

  var RARITY = {
    1: { name: 'Обычный', c: '#8b97bd' },
    2: { name: 'Редкий', c: '#4aa8ff' },
    3: { name: 'Эпический', c: '#b07dff' },
    4: { name: 'Легендарный', c: '#ffc043' },
    5: { name: 'Артефакт', c: '#ff5ad8' }
  };

  /* ============================================================
     АРТЕФАКТЫ И РЕЦЕПТЫ

     Два предмета соединяются в один и освобождают слот. Это
     единственный способ выйти за потолок сборки в поздних волнах:
     шесть слотов заполняются к двадцатой волне, и без сборки
     решений в лавке больше не остаётся.
     ============================================================ */
  var ARTIFACTS = [
    {
      id: 'a_reaper', name: 'Жатва Бесконечности', cost: 2400, t: 5,
      s: { atk: 120, lifesteal: 30, agi: 24, crit: 20, critMult: 2.4 },
      d: '+120 к урону, +30% вампиризма, +24 ловкости, +20% крита (x2.4)',
      parts: ['scythe', 'fury']
    },
    {
      id: 'a_bastion', name: 'Бастион Мира', cost: 2600, t: 5,
      s: { armor: 40, mr: .42, str: 60, hpReg: 26 },
      d: '+40 брони, +42% сопр. магии, +60 силы, +26 регена',
      parts: ['bulwark', 'aegis']
    },
    {
      id: 'a_omniscience', name: 'Всеведение', cost: 2800, t: 5,
      s: { sp: 230, int: 52, cdr: 34, mpReg: 8 },
      d: '+230 силы заклинаний, +52 интеллекта, −34% перезарядки',
      parts: ['grimoire', 'crown']
    },
    {
      id: 'a_titanpulse', name: 'Пульс Титана', cost: 2500, t: 5,
      s: { str: 80, hpReg: 30, armor: 14, atk: 40 },
      d: '+80 силы, +30 регена, +14 брони, +40 к урону',
      parts: ['heart', 'maul']
    },
    {
      id: 'a_tempest', name: 'Поступь Бури', cost: 2200, t: 5,
      s: { ms: 150, asPct: 70, agi: 30, crit: 14 },
      d: '+150 скорости, +70% скорости атаки, +30 ловкости, +14% крита',
      parts: ['travel', 'gauntlet']
    },
    {
      id: 'a_eclipse', name: 'Затмение', cost: 2300, t: 5,
      s: { mr: .48, int: 34, sp: 90, ms: 60 },
      d: '+48% сопр. магии, +34 интеллекта, +90 силы заклинаний, +60 скорости',
      parts: ['veil', 'cloak']
    },
    {
      id: 'a_bloodmoon', name: 'Кровавая Луна', cost: 2100, t: 5,
      s: { lifesteal: 46, atk: 70, str: 26 },
      d: '+46% вампиризма, +70 к урону, +26 силы',
      parts: ['fang', 'hammer']
    },
    {
      id: 'a_falconer', name: 'Взгляд Сокола', cost: 2000, t: 5,
      s: { range: 320, atk: 52, crit: 26, critMult: 2.3 },
      d: '+320 дальности, +52 к урону, +26% крита (x2.3)',
      parts: ['lantern', 'talons']
    },
    {
      id: 'a_aghanim', name: 'Скипетр Аганима', cost: 3200, t: 5, shard: true,
      s: { int: 46, sp: 120, cdr: 24, hp: 500 },
      d: 'Усиливает ключевое умение. +46 интеллекта, +120 силы заклинаний, ' +
        '−24% перезарядки, +500 здоровья',
      parts: ['shard', 'chalice']
    }
  ];

  var LIST = [
    /* --- обычные --- */
    { id: 'i_str', name: 'Пояс силача', cost: 420, t: 1, s: { str: 8 }, d: '+8 силы' },
    { id: 'i_agi', name: 'Перчатки ловкача', cost: 420, t: 1, s: { agi: 8 }, d: '+8 ловкости' },
    { id: 'i_int', name: 'Обруч мудреца', cost: 420, t: 1, s: { int: 8 }, d: '+8 интеллекта' },
    { id: 'blade', name: 'Клинок новичка', cost: 460, t: 1, s: { atk: 16 }, d: '+16 к урону атаки' },
    { id: 'mail', name: 'Кольчуга', cost: 500, t: 1, s: { armor: 6 }, d: '+6 брони' },
    { id: 'boots', name: 'Сапоги скорости', cost: 500, t: 1, s: { ms: 55 }, d: '+55 к скорости' },
    { id: 'vitality', name: 'Талисман жизни', cost: 620, t: 1, s: { str: 12, hpReg: 3 }, d: '+12 силы, +3 регена здоровья' },
    { id: 'crystal', name: 'Кристалл маны', cost: 600, t: 1, s: { int: 10, mpReg: 1.2 }, d: '+10 интеллекта, +1.2 регена маны' },
    { id: 'quiver', name: 'Лёгкий колчан', cost: 560, t: 1, s: { asPct: 22, range: 40 }, d: '+22% скорости атаки, +40 дальности' },
    { id: 'shieldw', name: 'Плетёный щит', cost: 540, t: 1, s: { armor: 4, mr: .08 }, d: '+4 брони, +8% сопр. магии' },

    /* --- редкие --- */
    { id: 'fang', name: 'Клык вампира', cost: 1300, t: 2, s: { lifesteal: 18, atk: 12 }, d: '+18% вампиризма, +12 к урону' },
    { id: 'gauntlet', name: 'Перчатки бури', cost: 1400, t: 2, s: { asPct: 45, agi: 10 }, d: '+45% скорости атаки, +10 ловкости' },
    { id: 'cloak', name: 'Плащ теней', cost: 1250, t: 2, s: { mr: .18, ms: 30 }, d: '+18% сопр. магии, +30 к скорости' },
    { id: 'staff', name: 'Посох мудреца', cost: 1500, t: 2, s: { sp: 50, int: 12 }, d: '+50 силы заклинаний, +12 интеллекта' },
    { id: 'hammer', name: 'Молот войны', cost: 1700, t: 2, s: { atk: 46, str: 8 }, d: '+46 к урону, +8 силы' },
    { id: 'plate', name: 'Латный доспех', cost: 1600, t: 2, s: { armor: 12, str: 10 }, d: '+12 брони, +10 силы' },
    { id: 'chalice', name: 'Чаша ясности', cost: 1450, t: 2, s: { int: 18, mpReg: 3.5, cdr: 8 }, d: '+18 интеллекта, +3.5 регена маны, -8% перезарядки' },
    { id: 'talons', name: 'Когти хищника', cost: 1550, t: 2, s: { crit: 18, critMult: 1.9, agi: 8 }, d: '+18% крита (x1.9), +8 ловкости' },
    { id: 'lantern', name: 'Фонарь охотника', cost: 1350, t: 2, s: { range: 130, atk: 14 }, d: '+130 дальности, +14 к урону' },
    { id: 'brooch', name: 'Брошь стойкости', cost: 1500, t: 2, s: { str: 16, hpReg: 8, armor: 4 }, d: '+16 силы, +8 регена, +4 брони' },

    /* --- эпические --- */
    { id: 'fury', name: 'Клинок ярости', cost: 2400, t: 3, s: { crit: 28, critMult: 2.2, atk: 24 }, d: '+28% крита (x2.2), +24 к урону' },
    { id: 'travel', name: 'Ботинки-путешественники', cost: 2200, t: 3, s: { ms: 100, asPct: 20, agi: 10 }, d: '+100 скорости, +20% скор. атаки' },
    { id: 'aegis', name: 'Эгида', cost: 2700, t: 3, s: { armor: 14, str: 22, mr: .10 }, d: '+14 брони, +22 силы, +10% сопр. магии' },
    { id: 'crown', name: 'Корона архимага', cost: 2900, t: 3, s: { sp: 85, cdr: 18, int: 16 }, d: '+85 силы заклинаний, -18% перезарядки' },
    { id: 'maul', name: 'Молот титанов', cost: 3000, t: 3, s: { atk: 70, str: 16 }, d: '+70 к урону, +16 силы' },
    { id: 'veil', name: 'Покров бездны', cost: 2600, t: 3, s: { mr: .30, int: 18, mpReg: 4 }, d: '+30% сопр. магии, +18 интеллекта' },

    /* --- легендарные --- */
    { id: 'heart', name: 'Сердце титана', cost: 4200, t: 4, s: { str: 45, hpReg: 18, armor: 6 }, d: '+45 силы, +18 регена, +6 брони' },
    { id: 'scythe', name: 'Коса жнеца', cost: 4400, t: 4, s: { atk: 80, lifesteal: 26, agi: 14 }, d: '+80 к урону, +26% вампиризма' },
    { id: 'grimoire', name: 'Гримуар пустоты', cost: 4500, t: 4, s: { sp: 130, int: 30, cdr: 22 }, d: '+130 силы заклинаний, +30 интеллекта, -22% перезарядки' },
    { id: 'bulwark', name: 'Оплот вечности', cost: 4600, t: 4, s: { armor: 22, mr: .28, str: 26, hpReg: 10 }, d: '+22 брони, +28% сопр. магии, +26 силы' },

    /* --- особый: усиливает ключевое умение героя --- */
    {
      id: 'shard', name: 'Осколок Аганима', cost: 5200, t: 4, shard: true,
      s: { int: 20, sp: 40, cdr: 10 },
      d: 'Усиливает ключевое умение героя. +20 интеллекта, +40 силы заклинаний, −10% перезарядки'
    }
  ];

  /** Оценка полезности предмета для героя — используется автозакупом. */
  function score(item, hero) {
    var s = item.s, p = hero.primary, caster = p === 'int', ranged = hero.base.range > 150, v = 0;
    v += (s.atk || 0) * 1.0;
    v += (s.str || 0) * (p === 'str' ? 2.4 : 1.4);
    v += (s.agi || 0) * (p === 'agi' ? 2.4 : 1.2);
    v += (s.int || 0) * (p === 'int' ? 2.4 : 1.0);
    v += (s.armor || 0) * 3.2;
    v += (s.asPct || 0) * (ranged ? .7 : .55);
    v += (s.crit || 0) * .9;
    v += (s.lifesteal || 0) * 1.1;
    v += (s.sp || 0) * (caster ? .85 : .12);
    v += (s.cdr || 0) * (caster ? 2.2 : 1.2);
    v += (s.ms || 0) * .16;
    v += (s.mr || 0) * 100 * .35;
    v += (s.hpReg || 0) * 1.3;
    v += (s.range || 0) * (ranged ? .12 : 0);
    return v;
  }

  // артефакты живут в общем списке, но не продаются напрямую —
  // их только собирают, поэтому в витрине они скрыты
  ARTIFACTS.forEach(function (a) { a.craftOnly = true; LIST.push(a); });

  var byId = {};
  LIST.forEach(function (it) { byId[it.id] = it; });

  /** Какие артефакты можно собрать из того, что лежит в инвентаре. */
  function craftable(items) {
    var have = {};
    items.forEach(function (it) { have[it.id] = true; });

    return ARTIFACTS.filter(function (a) {
      return a.parts.every(function (p) { return have[p]; });
    });
  }

  /** Все рецепты с пометкой, каких частей не хватает. */
  function recipes(items) {
    var have = {};
    items.forEach(function (it) { have[it.id] = true; });

    return ARTIFACTS.map(function (a) {
      return {
        art: a,
        parts: a.parts.map(function (p) {
          return { item: byId[p], owned: !!have[p] };
        }),
        ready: a.parts.every(function (p) { return have[p]; })
      };
    });
  }

  return {
    LIST: LIST, ARTIFACTS: ARTIFACTS, RARITY: RARITY,
    score: score, craftable: craftable, recipes: recipes,
    get: function (id) { return byId[id]; }
  };
})());
