/* platform/i18n — локализация. Ключ = русская строка,
   для остальных языков отдаётся перевод (п.2.10, п.2.14). */
AA.module('platform/i18n', (function () {
  'use strict';

  var lang = 'ru';

  var EN = {
    'Загрузка...': 'Loading...', 'Соединение с Яндекс Играми': 'Connecting to Yandex Games',
    'Готово': 'Ready', 'В БОЙ': 'FIGHT', 'ГЕРОИ': 'HEROES', 'КАК ИГРАТЬ': 'HOW TO PLAY',
    'УЧЕБНЫЙ ПОЛИГОН': 'TRAINING GROUND',
    'Рекорд: ': 'Best: ', 'волна ': 'wave ', 'ВОЛНА': 'WAVE', 'Герои': 'Heroes',
    'ЛАВКА': 'SHOP', 'Инвентарь': 'Inventory', 'СЛЕДУЮЩАЯ ВОЛНА': 'NEXT WAVE',
    'ЗАКРЫТЬ': 'CLOSE', 'УМЕНИЯ': 'SKILLS', 'АВТОЗАКУП': 'AUTO-BUY',
    'РАСПРЕДЕЛИТЬ САМО': 'AUTO-ASSIGN', 'Очков: ': 'Points: ',
    'ГОТОВО': 'DONE', 'ПАУЗА': 'PAUSE', 'Звук': 'Sound', 'Тряска экрана': 'Screen shake',
    'ПРОДОЛЖИТЬ': 'RESUME', 'СДАТЬСЯ': 'GIVE UP', 'ВЫЙТИ С ПОЛИГОНА': 'LEAVE TRAINING',
    'ПОРАЖЕНИЕ': 'DEFEAT', 'Дошёл до волны ': 'Reached wave ', ' душ': ' souls',
    'ВОСКРЕСНУТЬ ЗА РЕКЛАМУ': 'REVIVE FOR AD', 'УДВОИТЬ ДУШИ': 'DOUBLE SOULS',
    'ЕЩЁ РАЗ': 'PLAY AGAIN', 'В МЕНЮ': 'MENU', 'ПОНЯТНО': 'GOT IT',
    'ВЫБРАТЬ': 'SELECT', 'ВЫБРАН': 'SELECTED', 'ОТКРЫТЬ': 'UNLOCK',
    'Не хватает душ': 'Not enough souls', 'Не хватает золота': 'Not enough gold',
    'Инвентарь полон': 'Inventory is full', 'Нет цели': 'No target',
    'Мало маны': 'Not enough mana', 'Умение не изучено': 'Skill not learned',
    'Нужно 3 реагента': 'Need 3 reagents', 'Автобой включён': 'Autoplay is on',
    'Герой открыт!': 'Hero unlocked!', 'Новый уровень!': 'Level up!',
    'Реклама недоступна': 'Ad unavailable', 'Нечего купить': 'Nothing to buy',
    'Нужен уровень героя выше': 'Hero level too low', 'Арена очищена': 'Arena cleared',
    'Возрождение на полигоне': 'Respawned in training',
    'Мясник': 'Butcher', 'Егерь': 'Ranger', 'Берсерк': 'Berserker',
    'Хладна': 'Frostmaiden', 'Кровавый Рыцарь': 'Blood Knight', 'Клинок Тени': 'Shadowblade',
    'Дриада': 'Dryad', 'Аркан': 'Arcanist', 'Пиромант': 'Pyromancer', 'Голем': 'Golem',
    'ТАНК · БЛИЖНИЙ БОЙ': 'TANK · MELEE', 'СТРЕЛОК · ДАЛЬНИЙ БОЙ': 'MARKSMAN · RANGED',
    'БОЕЦ · ЯРОСТЬ': 'FIGHTER · RAGE', 'КОНТРОЛЬ · МАГ': 'CONTROL · MAGE',
    'БОЕЦ · ВАМПИРИЗМ': 'FIGHTER · LIFESTEAL', 'АССАСИН · БЛИЖНИЙ БОЙ': 'ASSASSIN · MELEE',
    'СТРЕЛОК · КОНТРОЛЬ': 'MARKSMAN · CONTROL', 'МАГ · КОМБИНАЦИИ СТИХИЙ': 'MAGE · ELEMENT COMBOS',
    'МАГ · УРОН ПО ВРЕМЕНИ': 'MAGE · DAMAGE OVER TIME', 'ТАНК · ПЛОЩАДНОЙ УРОН': 'TANK · AREA DAMAGE'
  };

  function t(s) {
    if (lang === 'ru' || typeof s !== 'string') return s;
    return EN[s] !== undefined ? EN[s] : s;
  }

  /** Яндекс отдаёт код языка; для СНГ показываем русский, остальным английский. */
  function detect(code) {
    lang = (['ru', 'be', 'kk', 'uk', 'uz'].indexOf(code) >= 0) ? 'ru' : 'en';
    document.documentElement.lang = lang;
    return lang;
  }

  return { t: t, detect: detect, lang: function () { return lang; } };
})());
