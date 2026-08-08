/* game/run — состояние текущего забега.

   Всё, что живёт от старта до смерти и не относится к конкретному
   юниту: выбранный модификатор, накопленные благословения из
   событий, скидка в лавке, множители экономики.

   Забеги перестают быть одинаковыми именно отсюда: враги, золото
   и характеристики героя проходят через эти множители. */
AA.module('game/run', (function () {
  'use strict';

  var state = {
    modifier: null,        // выбранный перед стартом модификатор
    blessings: [],         // подобранные на событиях эффекты
    eventsSeen: 0,

    /* --- множители, которые складывают модификатор и благословения --- */
    enemyMul: 1,           // сила врагов
    goldMul: 1,
    soulMul: 1,
    shopDiscount: 0,       // доля скидки, 0..0.6
    priceMul: 1,           // множитель цен в лавке
    artifactDiscount: 0,   // отдельная скидка на артефакты
    eliteChance: 0,        // добавка к шансу элитного врага
    extraSlots: 0,         // дополнительные слоты инвентаря
    waveMul: 1,            // множитель размера волны
    eventEvery: 4,         // раз во сколько волн случается событие

    noShop: false,         // лавка закрыта, предметы приходят с событий
    oneLife: false         // воскрешение недоступно
  };

  function reset(modifier) {
    state.modifier = modifier || null;
    state.blessings = [];
    state.eventsSeen = 0;

    state.enemyMul = 1;
    state.goldMul = 1;
    state.soulMul = 1;
    state.shopDiscount = 0;
    state.priceMul = 1;
    state.artifactDiscount = 0;
    state.eliteChance = 0;
    state.extraSlots = 0;
    state.waveMul = 1;
    state.eventEvery = 4;
    state.noShop = false;
    state.oneLife = false;

    if (modifier && modifier.apply) modifier.apply(state);
  }

  /**
   * Добавить благословение из события.
   * Запоминаем волну, на которой карта взята: дары атрибутов растут
   * вместе с ней, иначе взятое на четвёртой волне к сороковой
   * превращается в ничто, а игрок этого не понимает.
   */
  function addBlessing(offer) {
    state.blessings.push({ def: offer, wave: AA.Game.world.state.wave || 1 });
    if (offer.run) offer.run(state);
  }

  /** Вклад благословений в характеристики героя — зовётся из game/stats. */
  function applyStats(u, s) {
    for (var i = 0; i < state.blessings.length; i++) {
      var b = state.blessings[i];
      if (b.def.stat) b.def.stat(u, s, b.wave);
    }
  }

  /** Сколько раз подобрано конкретное благословение. */
  function countOf(id) {
    var n = 0;
    for (var i = 0; i < state.blessings.length; i++) {
      if (state.blessings[i].def.id === id) n++;
    }
    return n;
  }

  /* --- удобные обёртки над множителями --- */
  function enemyScale(wave) {
    return AA.Content.attributes.enemyScale(wave) * state.enemyMul;
  }
  function gold(amount) { return Math.round(amount * state.goldMul); }
  function souls(amount) { return Math.round(amount * state.soulMul); }
  /** Цена в лавке с учётом модификаторов и скидок событий. */
  function price(item) {
    var cost = typeof item === 'number' ? item : item.cost;
    var discount = state.shopDiscount;
    if (item && item.t === 5) discount = Math.max(discount, state.artifactDiscount);
    return Math.max(1, Math.round(cost * state.priceMul * (1 - discount)));
  }

  function slots() {
    return AA.Content.attributes.INV_SLOTS + state.extraSlots;
  }

  /** Размер волны с учётом модификаторов. */
  function waveSize(wave) {
    return Math.max(1, Math.round(AA.Content.attributes.enemyCount(wave) * state.waveMul));
  }

  /** Пора ли показывать событие после этой волны. */
  function isEventWave(wave) {
    return wave > 0 && wave % state.eventEvery === 0 &&
      !AA.Content.attributes.isBossWave(wave);
  }

  /** Короткая сводка для интерфейса. */
  function summary() {
    var out = [];
    if (state.modifier) out.push(state.modifier.name);
    var seen = {};
    for (var i = 0; i < state.blessings.length; i++) {
      var name = state.blessings[i].def.name;
      seen[name] = (seen[name] || 0) + 1;
    }
    for (var name in seen) {
      out.push(seen[name] > 1 ? name + ' ×' + seen[name] : name);
    }
    return out;
  }

  return {
    state: state,
    reset: reset,
    addBlessing: addBlessing,
    applyStats: applyStats,
    countOf: countOf,
    enemyScale: enemyScale,
    gold: gold, souls: souls, price: price, slots: slots,
    waveSize: waveSize, isEventWave: isEventWave,
    summary: summary
  };
})());
