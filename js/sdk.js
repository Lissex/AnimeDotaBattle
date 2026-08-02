/* =========================================================
   Обёртка над SDK Яндекс Игр + сохранения + локализация
   Всё работает и без SDK (локальная отладка) — тогда данные
   пишутся в localStorage, а реклама молча пропускается.
   ========================================================= */
(function (root) {
  'use strict';

  var ysdk = null, player = null;
  var ready = false;
  var dev = false;      // SDK не загрузился → локальная отладка
  var lang = 'ru';
  var lastInterstitial = 0;      // п.4.4 — реклама только в логических паузах
  var INTERSTITIAL_GAP = 65000;  // Яндекс требует >60 сек между полноэкранными
  var SAVE_KEY = 'arena_ancients_v1';
  var saveTimer = null;

  /* ---------------- Локализация ---------------- */
  // Ключ = русская строка. Для en отдаётся перевод, иначе исходник.
  var EN = {
    'Загрузка...': 'Loading...', 'Соединение с Яндекс Играми': 'Connecting to Yandex Games',
    'Готово': 'Ready', 'В БОЙ': 'FIGHT', 'ГЕРОИ': 'HEROES', 'КАК ИГРАТЬ': 'HOW TO PLAY',
    'Рекорд: ': 'Best: ', 'волна ': 'wave ', 'ВОЛНА': 'WAVE', 'Герои': 'Heroes',
    'ЛАВКА': 'SHOP', 'Инвентарь': 'Inventory', 'СЛЕДУЮЩАЯ ВОЛНА': 'NEXT WAVE',
    'ПРОКАЧАТЬ УМЕНИЯ': 'UPGRADE SKILLS', 'УМЕНИЯ': 'SKILLS', 'Очков: ': 'Points: ',
    'ГОТОВО': 'DONE', 'ПАУЗА': 'PAUSE', 'Звук': 'Sound', 'Тряска экрана': 'Screen shake',
    'ПРОДОЛЖИТЬ': 'RESUME', 'СДАТЬСЯ': 'GIVE UP', 'ПОРАЖЕНИЕ': 'DEFEAT',
    'Дошёл до волны ': 'Reached wave ', ' душ': ' souls',
    'ВОСКРЕСНУТЬ ЗА РЕКЛАМУ': 'REVIVE FOR AD', 'УДВОИТЬ ДУШИ': 'DOUBLE SOULS',
    'ЕЩЁ РАЗ': 'PLAY AGAIN', 'В МЕНЮ': 'MENU', 'ПОНЯТНО': 'GOT IT',
    'ВЫБРАТЬ': 'SELECT', 'ВЫБРАН': 'SELECTED', 'ОТКРЫТЬ': 'UNLOCK',
    'Не хватает душ': 'Not enough souls', 'Не хватает золота': 'Not enough gold',
    'Инвентарь полон': 'Inventory is full', 'Нет цели': 'No target',
    'Нет цели рядом': 'No target nearby', 'Нет цели поблизости': 'No target nearby',
    'Мало маны': 'Not enough mana', 'Перезарядка': 'On cooldown',
    'Герой открыт!': 'Hero unlocked!', 'Новый уровень!': 'Level up!',
    'Реклама недоступна': 'Ad unavailable', 'Поверни устройство горизонтально': 'Please rotate your device',
    'Мясник': 'Butcher', 'Егерь': 'Ranger', 'Секира': 'Axeman',
    'Хладна': 'Frostmaiden', 'Клинок Тени': 'Shadowblade', 'Аркан': 'Arcanist',
    'ТАНК · БЛИЖНИЙ БОЙ': 'TANK · MELEE', 'СТРЕЛОК · ДАЛЬНИЙ БОЙ': 'MARKSMAN · RANGED',
    'ТАНК · ДУЭЛЯНТ': 'TANK · DUELIST', 'КОНТРОЛЬ · МАГ': 'CONTROL · MAGE',
    'АССАСИН · БЛИЖНИЙ БОЙ': 'ASSASSIN · MELEE', 'МАГ · ВЗРЫВНОЙ УРОН': 'MAGE · BURST'
  };

  function T(s) {
    if (lang === 'ru' || typeof s !== 'string') return s;
    return EN[s] !== undefined ? EN[s] : s;
  }

  /* ---------------- Сохранения ---------------- */
  var DEFAULT_SAVE = {
    souls: 0,
    best: 0,
    unlocked: ['butcher', 'ranger'],
    selected: 'butcher',
    heroLv: {},        // постоянные уровни героев между забегами
    sound: true,
    shake: true,
    seenHowto: false
  };

  var save = JSON.parse(JSON.stringify(DEFAULT_SAVE));

  function mergeSave(raw) {
    if (!raw || typeof raw !== 'object') return;
    for (var k in DEFAULT_SAVE) {
      if (raw[k] !== undefined && raw[k] !== null) save[k] = raw[k];
    }
    if (!Array.isArray(save.unlocked) || !save.unlocked.length) save.unlocked = ['butcher', 'ranger'];
    if (typeof save.heroLv !== 'object' || !save.heroLv) save.heroLv = {};
  }

  function loadLocal() {
    try {
      var raw = root.localStorage.getItem(SAVE_KEY);
      if (raw) mergeSave(JSON.parse(raw));
    } catch (e) { /* приватный режим — просто играем без сейва */ }
  }

  function writeLocal() {
    try { root.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { }
  }

  // п.1.9 — сохранение сразу после действия. Дебаунс 400 мс, чтобы не спамить API.
  function commit(immediate) {
    writeLocal();
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    var doIt = function () {
      saveTimer = null;
      if (player && player.setData) {
        try { player.setData({ save: save }, false); } catch (e) { }
      }
    };
    if (immediate) doIt(); else saveTimer = setTimeout(doIt, 400);
  }

  /* ---------------- Инициализация ---------------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function init(onProgress) {
    onProgress = onProgress || function () { };
    loadLocal();
    onProgress(15, 'Загрузка...');

    return loadScript('/sdk.js')
      .then(function () { return root.YaGames.init(); })
      .then(function (sdk) {
        ysdk = sdk;
        root.ysdk = sdk;
        onProgress(45, 'Соединение с Яндекс Играми');

        // п.2.14 — автоопределение языка через SDK
        try {
          var l = ysdk.environment.i18n.lang;
          lang = (['ru', 'be', 'kk', 'uk', 'uz'].indexOf(l) >= 0) ? 'ru' : 'en';
        } catch (e) { lang = 'ru'; }
        document.documentElement.lang = lang;

        // п.1.19.4 — обработка паузы от платформы (открылась реклама и т.п.)
        try {
          ysdk.on('game_api_pause', function () { root.dispatchEvent(new Event('ya-pause')); });
          ysdk.on('game_api_resume', function () { root.dispatchEvent(new Event('ya-resume')); });
        } catch (e) { }

        return ysdk.getPlayer({ scopes: false }).catch(function () { return null; });
      })
      .then(function (p) {
        player = p;
        onProgress(75, 'Загрузка...');
        if (!p || !p.getData) return null;
        return p.getData(['save']).catch(function () { return null; });
      })
      .then(function (data) {
        // Облачный сейв приоритетнее локального, если он новее по прогрессу
        if (data && data.save) {
          var cloud = data.save;
          if ((cloud.best || 0) >= (save.best || 0)) mergeSave(cloud);
        }
        ready = true;
        onProgress(100, 'Готово');
        return save;
      })
      .catch(function () {
        // SDK недоступен (локальный запуск) — режим отладки:
        // всё открыто, валюта бесконечная. На Яндексе этот код не выполняется.
        dev = true;
        ready = true;
        onProgress(100, 'Готово');
        return save;
      });
  }

  /* ---------------- Реклама (только через SDK, п.4.1) ---------------- */

  // Полноэкранная реклама. Вызывается ТОЛЬКО в паузах между волнами.
  function interstitial(onDone) {
    onDone = onDone || function () { };
    var now = Date.now();
    if (!ysdk || !ysdk.adv || now - lastInterstitial < INTERSTITIAL_GAP) { onDone(false); return; }
    lastInterstitial = now;
    root.dispatchEvent(new Event('ya-pause'));
    try {
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: function (wasShown) { root.dispatchEvent(new Event('ya-resume')); onDone(!!wasShown); },
          onError: function () { root.dispatchEvent(new Event('ya-resume')); onDone(false); }
        }
      });
    } catch (e) { root.dispatchEvent(new Event('ya-resume')); onDone(false); }
  }

  // Видео за вознаграждение. Награда выдаётся ТОЛЬКО в onRewarded (п.4.5).
  function rewarded(onReward, onClose) {
    onReward = onReward || function () { };
    onClose = onClose || function () { };
    if (!ysdk || !ysdk.adv) { onClose(false); return; }
    var got = false;
    root.dispatchEvent(new Event('ya-pause'));
    try {
      ysdk.adv.showRewardedVideoAdv({
        callbacks: {
          onRewarded: function () { got = true; onReward(); },
          onClose: function () { root.dispatchEvent(new Event('ya-resume')); onClose(got); },
          onError: function () { root.dispatchEvent(new Event('ya-resume')); onClose(false); }
        }
      });
    } catch (e) { root.dispatchEvent(new Event('ya-resume')); onClose(false); }
  }

  // п.4.6.1 — из дополнительных блоков допустимы только стики-баннеры
  function showBanner() {
    if (!ysdk || !ysdk.adv || !ysdk.adv.showBannerAdv) return;
    try { ysdk.adv.showBannerAdv(); } catch (e) { }
  }
  function hideBanner() {
    if (!ysdk || !ysdk.adv || !ysdk.adv.hideBannerAdv) return;
    try { ysdk.adv.hideBannerAdv(); } catch (e) { }
  }

  // п.1.19.2 — вызывается, когда игрок реально может начать играть
  function gameReady() {
    if (!ysdk) return;
    try { ysdk.features.LoadingAPI.ready(); } catch (e) { }
  }
  // п.1.19.3 — разметка геймплея
  function gameplayStart() { try { ysdk.features.GameplayAPI.start(); } catch (e) { } }
  function gameplayStop() { try { ysdk.features.GameplayAPI.stop(); } catch (e) { } }

  function hasAds() { return !!(ysdk && ysdk.adv); }

  root.YA = {
    init: init,
    save: save,
    commit: commit,
    T: T,
    lang: function () { return lang; },
    interstitial: interstitial,
    rewarded: rewarded,
    showBanner: showBanner,
    hideBanner: hideBanner,
    gameReady: gameReady,
    gameplayStart: gameplayStart,
    gameplayStop: gameplayStop,
    hasAds: hasAds,
    dev: function () { return dev; },
    isReady: function () { return ready; }
  };

})(window);
