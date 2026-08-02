/* platform/leaderboard — таблица рекордов Яндекс Игр.

   Игра про «сколько волн продержишься», поэтому таблица здесь —
   основной повод переигрывать. Всё завёрнуто в мягкие отказы:
   без SDK, без авторизации или при выключенных лидербордах
   игра просто показывает локальный рекорд и не ломается.

   Перед публикацией таблицу нужно создать в Консоли разработчика
   с техническим названием, указанным в BOARD. */
AA.module('platform/leaderboard', (function () {
  'use strict';

  var BOARD = 'waves';        // техническое имя таблицы в Консоли
  var lb = null;              // объект лидерборда из SDK
  var ready = false;

  function sdk() { return window.ysdk || null; }

  /** Пытается получить объект таблицы. Молча сдаётся, если её нет. */
  function init() {
    var s = sdk();
    if (!s || !s.getLeaderboards) return Promise.resolve(false);

    return s.getLeaderboards()
      .then(function (api) { lb = api; ready = true; return true; })
      .catch(function () { return false; });
  }

  function available() { return ready && !!lb; }

  /** Отправить результат. Яндекс сам хранит только лучший. */
  function submit(wave) {
    if (!available() || !wave) return Promise.resolve(false);
    return lb.setLeaderboardScore(BOARD, wave)
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  /**
   * Верхушка таблицы плюс строка игрока.
   * @returns {Promise<{entries: Array, player: object|null}|null>}
   */
  function top(limit) {
    if (!available()) return Promise.resolve(null);

    return lb.getLeaderboardEntries(BOARD, {
      quantityTop: limit || 10,
      includeUser: true,
      quantityAround: 3
    }).then(function (res) {
      if (!res || !res.entries) return null;

      var entries = res.entries.map(function (e) {
        return {
          rank: e.rank,
          score: e.score,
          name: (e.player && e.player.publicName) || 'Игрок',
          avatar: e.player && e.player.getAvatarSrc ? e.player.getAvatarSrc('small') : null,
          self: !!e.player && !!res.userRank && e.rank === res.userRank
        };
      });

      return { entries: entries, userRank: res.userRank || 0 };
    }).catch(function () { return null; });
  }

  return {
    BOARD: BOARD,
    init: init,
    available: available,
    submit: submit,
    top: top
  };
})());
