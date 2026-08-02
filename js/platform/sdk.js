/* platform/sdk — единственное место, где игра знает про Яндекс Игры.
   Всё остальное обращается сюда. Если SDK не загрузился (локальный
   запуск), включается режим отладки: бесконечная валюта, всё открыто. */
AA.module('platform/sdk', (function () {
  'use strict';

  var ysdk = null, player = null;
  var ready = false, devMode = false;
  var lastInterstitial = 0;
  var INTERSTITIAL_GAP = 65000;   // Яндекс требует >60 сек между полноэкранными

  function i18n() { return AA.Platform.i18n; }
  function store() { return AA.Platform.storage; }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function emit(name) { window.dispatchEvent(new Event(name)); }

  /* ---------------- инициализация ---------------- */
  function init(onProgress) {
    onProgress = onProgress || function () { };
    store().load();
    onProgress(15, 'Загрузка...');

    return loadScript('/sdk.js')
      .then(function () { return window.YaGames.init(); })
      .then(function (sdk) {
        ysdk = sdk;
        onProgress(45, 'Соединение с Яндекс Играми');

        try { i18n().detect(ysdk.environment.i18n.lang); } catch (e) { i18n().detect('ru'); }

        // п.1.19.4 — платформа сообщает о своих паузах (реклама, оверлеи)
        try {
          ysdk.on('game_api_pause', function () { emit('ya-pause'); });
          ysdk.on('game_api_resume', function () { emit('ya-resume'); });
        } catch (e) { }

        store().setCloudWriter(function (d) {
          if (player && player.setData) {
            try { player.setData({ save: d }, false); } catch (e) { }
          }
        });

        return ysdk.getPlayer({ scopes: false }).catch(function () { return null; });
      })
      .then(function (p) {
        player = p;
        onProgress(75, 'Загрузка...');
        if (!p || !p.getData) return null;
        return p.getData(['save']).catch(function () { return null; });
      })
      .then(function (res) {
        // облачный сейв приоритетнее локального, если прогресс не хуже
        if (res && res.save && (res.save.best || 0) >= (store().data.best || 0)) {
          store().merge(res.save);
        }
        ready = true;
        onProgress(100, 'Готово');
        return store().data;
      })
      .catch(function () {
        // SDK недоступен → локальная отладка. На Яндексе сюда не попадаем.
        devMode = true;
        ready = true;
        onProgress(100, 'Готово');
        return store().data;
      });
  }

  /* ---------------- реклама (только через SDK, п.4.1) ---------------- */

  /** Полноэкранная. Вызывать строго в логических паузах (п.4.4). */
  function interstitial(done) {
    done = done || function () { };
    var now = Date.now();
    if (!ysdk || !ysdk.adv || now - lastInterstitial < INTERSTITIAL_GAP) { done(false); return; }
    lastInterstitial = now;
    emit('ya-pause');
    try {
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: function (shown) { emit('ya-resume'); done(!!shown); },
          onError: function () { emit('ya-resume'); done(false); }
        }
      });
    } catch (e) { emit('ya-resume'); done(false); }
  }

  /** Видео за вознаграждение. Награду выдавать ТОЛЬКО в onReward (п.4.5). */
  function rewarded(onReward, onClose) {
    onReward = onReward || function () { };
    onClose = onClose || function () { };
    if (!ysdk || !ysdk.adv) { onClose(false); return; }
    var got = false;
    emit('ya-pause');
    try {
      ysdk.adv.showRewardedVideoAdv({
        callbacks: {
          onRewarded: function () { got = true; onReward(); },
          onClose: function () { emit('ya-resume'); onClose(got); },
          onError: function () { emit('ya-resume'); onClose(false); }
        }
      });
    } catch (e) { emit('ya-resume'); onClose(false); }
  }

  function showBanner() { try { ysdk.adv.showBannerAdv(); } catch (e) { } }
  function hideBanner() { try { ysdk.adv.hideBannerAdv(); } catch (e) { } }

  /* ---------------- разметка жизненного цикла ---------------- */
  function gameReady() { try { ysdk.features.LoadingAPI.ready(); } catch (e) { } }
  function gameplayStart() { try { ysdk.features.GameplayAPI.start(); } catch (e) { } }
  function gameplayStop() { try { ysdk.features.GameplayAPI.stop(); } catch (e) { } }

  return {
    init: init,
    interstitial: interstitial, rewarded: rewarded,
    showBanner: showBanner, hideBanner: hideBanner,
    gameReady: gameReady, gameplayStart: gameplayStart, gameplayStop: gameplayStop,
    hasAds: function () { return !!(ysdk && ysdk.adv); },
    isDev: function () { return devMode; },
    isReady: function () { return ready; }
  };
})());
