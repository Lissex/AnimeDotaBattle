/* ui/talents — выбор таланта на рубежах 10/20/30/40/50.
   Окно всплывает сразу, как только рубеж достигнут: пропустить
   нельзя, но можно посмотреть оба варианта. */
AA.module('ui/talents', (function () {
  'use strict';

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }

  /** Открыть окно, если герой дорос до невыбранного рубежа. */
  function checkPending() {
    var h = W().hero;
    if (!h) return false;
    var tier = AA.Game.talents.pending(h);
    if (!tier) return false;
    open(tier);
    return true;
  }

  function open(tier) {
    var d = D(), h = W().hero;
    var pair = AA.Content.talents.pairFor(h.defId, tier);
    if (!pair) return;

    d.$('talent-tier').textContent = 'УРОВЕНЬ ' + tier;
    var box = d.$('talent-options');
    box.innerHTML = '';

    pair.forEach(function (t, i) {
      var card = d.el('div', 'talent-card',
        '<div class="tc-side">' + (i === 0 ? 'ЛЕВЫЙ' : 'ПРАВЫЙ') + '</div>' +
        '<b>' + t.name + '</b>' +
        '<p>' + t.d + '</p>');
      card.onclick = function () {
        AA.Game.talents.choose(h, tier, t.id);
        AA.Core.audio.lvl();
        AA.UI.toast.show('Талант: ' + t.name);
        AA.UI.screens.close('talent');
        AA.UI.hud.refresh(true);
        // если рубежей накопилось несколько — показываем следующий
        setTimeout(checkPending, 250);
      };
      box.appendChild(card);
    });

    AA.UI.screens.open('talent');
  }

  /** Список уже выбранного — показывается в панели умений. */
  function chosenList() {
    var d = D(), h = W().hero;
    var wrap = d.el('div', 'talent-log');
    var T = AA.Content.talents;
    var any = false;

    T.TIERS.forEach(function (tier) {
      var id = h.talents && h.talents[tier];
      if (!id) return;
      any = true;
      var t = T.get(id);
      wrap.appendChild(d.el('div', 'tl-row',
        '<span class="tl-lv">' + tier + '</span>' +
        '<span class="tl-name">' + (t ? t.name : id) + '</span>'));
    });

    if (!any) {
      wrap.appendChild(d.el('div', 'tl-empty', 'Таланты открываются на 10, 20, 30, 40 и 50 уровнях.'));
    }
    return wrap;
  }

  return { checkPending: checkPending, open: open, chosenList: chosenList };
})());
