/* =========================================================
   AA — корневой неймспейс игры «Арена Древних».
   ---------------------------------------------------------
   Сборки нет: файлы подключаются обычными <script> в порядке
   слоёв (см. index.html). Чтобы порядок не превращался в
   минное поле, действует одно правило:

     ЗАГРУЗКА  — только объявления. Никаких обращений к
                 другим слоям на верхнем уровне файла.
     ВЫЗОВ     — обращаться к соседям через AA.<Слой>.<метод>
                 внутри функций, то есть уже после загрузки.

   Слои и направление зависимостей (сверху вниз, вверх нельзя):

     ui       экраны, HUD, ввод пользователя
     render   отрисовка кадра
     game     состояние мира, боевая логика, ИИ
     content  данные: герои, умения, предметы, карты
     platform SDK Яндекс Игр, сейвы, локализация
     core     математика, звук, ввод, неймспейс

   ========================================================= */
(function (root) {
  'use strict';

  /** Имя папки → имя слоя в неймспейсе. */
  var LAYERS = {
    core: 'Core', platform: 'Platform', content: 'Content',
    game: 'Game', render: 'Render', ui: 'UI'
  };

  var AA = root.AA = {
    version: '2.0.0',

    // слои
    Core: {}, Platform: {}, Content: {}, Game: {}, Render: {}, UI: {},

    // список объявленных модулей — для самопроверки в консоли
    _modules: [],

    /**
     * Регистрирует модуль в слое.
     * @param {string} path  'game/combat' → AA.Game.combat
     * @param {object} api   публичные методы модуля
     */
    module: function (path, api) {
      var parts = path.split('/');
      var layer = LAYERS[parts[0]];
      if (!layer) throw new Error('AA: неизвестный слой «' + parts[0] + '»');
      AA[layer][parts[1]] = api;
      AA._modules.push(path);
      return api;
    },

    /** Проверка, что все ожидаемые модули загрузились. */
    verify: function (expected) {
      var missing = expected.filter(function (p) { return AA._modules.indexOf(p) < 0; });
      if (missing.length) console.error('AA: не загружены модули', missing);
      return !missing.length;
    },

    /** Список загруженного — удобно проверять в консоли: AA.list() */
    list: function () { return AA._modules.slice().sort(); }
  };

})(window);
