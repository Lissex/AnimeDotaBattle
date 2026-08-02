/* ui/leaderboard — экран таблицы рекордов.
   Если таблица недоступна (нет SDK, нет авторизации, не создана
   в Консоли), показываем локальный рекорд и объясняем почему. */
AA.module('ui/leaderboard', (function () {
  'use strict';

  function D() { return AA.UI.dom; }

  function open() {
    var d = D();
    var box = d.$('lb-list');
    box.innerHTML = '<div class="lb-empty">Загрузка...</div>';
    AA.UI.screens.open('leaders');

    if (!AA.Platform.leaderboard.available()) { renderOffline(); return; }

    AA.Platform.leaderboard.top(12).then(function (res) {
      if (!res || !res.entries.length) { renderOffline(); return; }
      render(res);
    });
  }

  function render(res) {
    var d = D(), box = d.$('lb-list');
    box.innerHTML = '';

    res.entries.forEach(function (e) {
      var row = d.el('div', 'lb-row' + (e.rank === res.userRank ? ' self' : ''));

      var rank = d.el('span', 'lb-rank', '' + e.rank);
      if (e.rank <= 3) rank.classList.add('top' + e.rank);
      row.appendChild(rank);

      if (e.avatar) {
        var img = document.createElement('img');
        img.className = 'lb-avatar';
        img.src = e.avatar;
        img.alt = '';
        row.appendChild(img);
      }

      // имя приходит извне — вставляем текстом, а не разметкой
      var nameEl = d.el('span', 'lb-name');
      nameEl.textContent = e.name;
      row.appendChild(nameEl);
      row.appendChild(d.el('span', 'lb-score', 'волна ' + e.score));
      box.appendChild(row);
    });

    d.$('lb-note').textContent = res.userRank
      ? 'Ваше место: ' + res.userRank
      : 'Пройдите волну, чтобы попасть в таблицу';
  }

  function renderOffline() {
    var d = D();
    d.$('lb-list').innerHTML =
      '<div class="lb-empty">' +
      '<b>волна ' + d.save().best + '</b>' +
      '<p>Ваш личный рекорд</p>' +
      '</div>';
    d.$('lb-note').textContent =
      'Общая таблица доступна на Яндекс Играх после входа в аккаунт.';
  }

  function bind() {
    var d = D();
    d.$('btn-leaders').onclick = open;
    d.$('btn-leaders-close').onclick = function () { AA.UI.screens.close('leaders'); };
  }

  return { open: open, bind: bind };
})());
