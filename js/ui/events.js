/* ui/events — карточки выбора: событие между волнами и
   модификатор перед стартом забега.

   Обе разновидности используют одну разметку и одну механику
   продолжения: окно обязано вызвать переданный колбэк, иначе
   бой останется остановленным. */
AA.module('ui/events', (function () {
  'use strict';

  var onDone = null;

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }

  /* ============================================================
                    СОБЫТИЕ МЕЖДУ ВОЛНАМИ
     ============================================================ */

  /**
   * @param {function} [next] что запустить после выбора
   * @returns {boolean} открыто ли окно
   */
  function offerWave(next) {
    var w = W();
    if (w.training) return false;

    var cards = AA.Content.offers.roll(3);
    if (!cards.length) return false;

    onDone = next || null;
    AA.Game.run.state.eventsSeen++;
    render('СОБЫТИЕ', 'Выберите одно', cards, pickOffer);
    AA.UI.screens.open('event');
    return true;
  }

  function pickOffer(offer) {
    var w = W(), h = w.hero;

    AA.Game.run.addBlessing(offer);
    if (offer.take) offer.take(context());
    AA.Game.stats.recalc(h);

    AA.Core.audio.buy();
    AA.UI.toast.show(offer.name);
    AA.UI.hud.refresh(true);
    finish();
  }

  /** Что карточка может сделать разово. */
  function context() {
    var w = W(), h = w.hero;
    return {
      wave: w.wave,
      gold: function (n) {
        w.gold += AA.Game.run.gold(n);
        AA.Game.effects.floatText(h.x, h.y - 46, '+' + n, '#ffc043', 18);
      },
      giveItem: function (tier) {
        var pool = AA.Content.items.LIST.filter(function (it) {
          return it.t === tier && !h.items.some(function (o) { return o.id === it.id; });
        });
        if (!pool.length) { w.gold += 1500; return; }
        var item = pool[Math.floor(Math.random() * pool.length)];
        if (h.items.length >= AA.Game.run.slots()) h.items.pop();
        h.items.push(item);
        AA.Game.stats.recalc(h);
        AA.UI.toast.show('Получен: ' + item.name);
      },
      skillPoint: function (n) { h.pts += n; },
      heal: function () { h.hp = h.maxHp; h.mp = h.maxMp; }
    };
  }

  /* ============================================================
                  МОДИФИКАТОР ПЕРЕД ЗАБЕГОМ
     ============================================================ */

  function chooseModifier(next) {
    var cards = AA.Content.modifiers.roll();
    onDone = next || null;
    render('УСЛОВИЯ ЗАБЕГА', 'Выберите правила', cards, pickModifier);
    AA.UI.screens.open('event');
    return true;
  }

  function pickModifier(mod) {
    AA.Game.run.reset(mod);
    AA.Core.audio.lvl();
    if (mod.id !== 'none') AA.UI.toast.show(mod.name);
    finish();
  }

  /* ============================================================
                        ОБЩЕЕ
     ============================================================ */

  function render(title, subtitle, cards, onPick) {
    var d = D();
    d.$('event-title').textContent = title;
    d.$('event-sub').textContent = subtitle;

    var box = d.$('event-cards');
    box.innerHTML = '';

    cards.forEach(function (card, i) {
      var el = d.el('div', 'event-card' + (card.risk ? ' risky' : ''));
      el.style.setProperty('--cc', card.color);
      el.style.animationDelay = (i * .07) + 's';

      el.innerHTML =
        '<div class="ec-icon">' + card.icon + '</div>' +
        '<b>' + card.name + '</b>' +
        '<p>' + card.d + '</p>' +
        (card.risk ? '<div class="ec-tag">РИСК</div>' : '');

      el.onclick = function () { onPick(card); };
      box.appendChild(el);
    });

    renderSummary();
  }

  /** Что уже набрано за забег — чтобы выбор был осмысленным. */
  function renderSummary() {
    var d = D(), box = d.$('event-summary');
    var list = AA.Game.run.summary();
    if (!list.length) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.innerHTML = '<span class="es-label">Набрано:</span> ' +
      list.map(function (s) { return '<span class="es-item">' + s + '</span>'; }).join('');
  }

  function finish() {
    AA.UI.screens.close('event');
    var next = onDone;
    onDone = null;
    if (next) next();
  }

  return { offerWave: offerWave, chooseModifier: chooseModifier };
})());
