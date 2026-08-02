/* render/anim — паспорта анимаций героев.

   Герой ссылается на профиль полем anim. Профиль задаёт пластику
   покоя и бега: как сильно качается корпус, парит ли герой над
   землёй, насколько наклоняется при движении.

   Замах оружия живёт в render/shapes (там же, где рука), потому
   что он завязан на конкретное оружие. Здесь только общая длительность. */
AA.module('render/anim', (function () {
  'use strict';

  /**
   * bobA / bobF — амплитуда и частота покачивания
   * hover       — постоянный отрыв от земли (маги парят)
   * lean        — наклон корпуса при беге
   */
  var PROFILES = {
    heavy: { bobA: 3.2, bobF: .9, hover: 0, lean: .16 },   // Мясник
    draw: { bobA: 1.6, bobF: 1.5, hover: 0, lean: .06 },   // Егерь
    frenzy: { bobA: 2.6, bobF: 2.4, hover: 0, lean: .22 },   // Берсерк
    float: { bobA: 4.5, bobF: .7, hover: 8, lean: 0 },     // Хладна
    charge: { bobA: 2.2, bobF: 1.3, hover: 0, lean: .18 },   // Кровавый Рыцарь
    swift: { bobA: 1.4, bobF: 2.6, hover: 0, lean: .12 },   // Клинок Тени
    nimble: { bobA: 2.0, bobF: 1.8, hover: 2, lean: .08 },   // Дриада
    orbit: { bobA: 3.6, bobF: .8, hover: 10, lean: 0 },     // Аркан
    flame: { bobA: 3.0, bobF: 1.1, hover: 6, lean: 0 },     // Пиромант
    stone: { bobA: 1.2, bobF: .6, hover: 0, lean: .1 }      // Голем
  };

  /** Сколько длится фаза удара — общая для всех, чтобы кадры совпадали. */
  var SWING_TIME = .22;

  function profile(name) { return PROFILES[name] || PROFILES.heavy; }

  /** Вертикальное покачивание героя в текущем кадре. */
  function bob(u, prof, time) {
    var walk = Math.sin(u.step * prof.bobF) * prof.bobA;
    var hover = prof.hover ? Math.sin(time * 1.6) * prof.hover * .35 - prof.hover : 0;
    return walk + hover;
  }

  return { PROFILES: PROFILES, SWING_TIME: SWING_TIME, profile: profile, bob: bob };
})());
