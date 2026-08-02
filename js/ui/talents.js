/* ui/talents — выбор таланта на рубежах 10/20/30/40/50.

   Окно всплывает сразу, как только рубеж достигнут, и закрыть его
   можно только выбором. Поэтому оно обязано продолжить цепочку
   после волны — иначе бой остаётся остановленным и игра встаёт.
   За это отвечает continuation: кто открыл окно, тот передал,
   что делать после последнего выбора. */
AA.module('ui/talents', (function () {
  'use strict';

  var SKIPPED = '-';      // заглушка для рубежа без вариантов
  var onDone = null;      // что запустить, когда рубежи кончатся
  var pausedByUs = false; // мы ли остановили бой ради окна

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }

  /**
   * Показать окно, если герой дорос до невыбранного рубежа.
   * @param {function} [next] что вызвать после последнего выбора
   * @returns {boolean} true, если окно открыто (вызывающий должен остановиться)
   */
  function checkPending(next) {
    var h = W().hero;
    if (!h) return false;

    var tier = AA.Game.talents.pending(h);
    if (!tier) return false;

    if (!open(tier)) {
      // на этого героя дерева нет — закрываем рубеж заглушкой.
      // Метка обязана быть «истинной», иначе pendingTier вернёт
      // тот же рубеж снова и проверка зациклится.
      if (!h.talents) h.talents = {};
      h.talents[tier] = SKIPPED;
      return checkPending(next);
    }

    if (next) onDone = next;
    return true;
  }

  /** @returns {boolean} удалось ли отрисовать выбор */
  function open(tier) {
    var d = D(), h = W().hero;
    var pair = AA.Content.talents.pairFor(h.defId, tier);
    if (!pair || pair.length < 2) return false;

    d.$('talent-tier').textContent = 'УРОВЕНЬ ' + tier;
    var box = d.$('talent-options');
    box.innerHTML = '';

    pair.forEach(function (t, i) {
      var card = d.el('div', 'talent-card',
        '<div class="tc-side">' + (i === 0 ? 'ЛЕВЫЙ' : 'ПРАВЫЙ') + '</div>' +
        '<b>' + t.name + '</b>' +
        '<p>' + t.d + '</p>');
      card.onclick = function () { pick(tier, t); };
      box.appendChild(card);
    });

    // если окно всплыло прямо во время боя — останавливаем бой,
    // чтобы игрока не били, пока он читает
    var w = W();
    if (w.running && !w.paused) {
      AA.Game.loop.pause(true);
      pausedByUs = true;
    }

    AA.UI.screens.open('talent');
    return true;
  }

  function pick(tier, talent) {
    var h = W().hero;
    AA.Game.talents.choose(h, tier, talent.id);
    AA.Core.audio.lvl();
    AA.UI.toast.show('Талант: ' + talent.name);

    AA.UI.screens.close('talent');
    AA.UI.hud.refresh(true);
    AA.UI.skillbar.build();

    // рубежей могло накопиться несколько — добираем их по одному,
    // и только когда закончатся, отдаём управление дальше
    setTimeout(function () {
      if (checkPending()) return;

      if (pausedByUs) { AA.Game.loop.pause(false); pausedByUs = false; }

      var next = onDone;
      onDone = null;
      if (next) next();
    }, 180);
  }

  /** Список уже выбранного — показывается в панели умений. */
  function chosenList() {
    var d = D(), h = W().hero;
    var wrap = d.el('div', 'talent-log');
    var T = AA.Content.talents;
    var any = false;

    T.TIERS.forEach(function (tier) {
      var id = h.talents && h.talents[tier];
      if (!id || id === SKIPPED) return;
      any = true;
      var t = T.get(id);
      wrap.appendChild(d.el('div', 'tl-row',
        '<span class="tl-lv">' + tier + '</span>' +
        '<span class="tl-name">' + (t ? t.name : id) + '</span>'));
    });

    if (!any) {
      wrap.appendChild(d.el('div', 'tl-empty',
        'Таланты открываются на 10, 20, 30, 40 и 50 уровнях.'));
    }
    return wrap;
  }

  return { checkPending: checkPending, open: open, chosenList: chosenList };
})());
