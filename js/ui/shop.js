/* ui/shop — лавка между волнами: покупка, продажа, автозакуп. */
AA.module('ui/shop', (function () {
  'use strict';

  var selectedSlot = -1;
  var filter = 0;

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }
  function SLOTS() { return AA.Content.attributes.INV_SLOTS; }

  function open() {
    var d = D();
    selectedSlot = -1;
    renderAll();
    d.$('btn-next-wave').textContent = d.isTraining() ? d.t('ЗАКРЫТЬ') : d.t('СЛЕДУЮЩАЯ ВОЛНА');
    AA.UI.screens.open('shop');
  }

  function renderAll() {
    var d = D();
    renderInventory();
    renderStats();
    renderGrid();
    d.$$('.hud-gold').forEach(function (e) { e.textContent = d.goldText(); });
    AA.UI.hud.renderItems();
  }

  function sellPrice(item) {
    return Math.round(item.cost * AA.Content.attributes.SELL_RATE);
  }

  /* ---------------- инвентарь и продажа ---------------- */
  function renderInventory() {
    var d = D(), box = d.$('inv-slots'), h = W().hero;
    var R = AA.Content.items.RARITY;
    box.innerHTML = '';

    for (var i = 0; i < SLOTS(); i++) {
      (function (idx) {
        var item = h.items[idx];
        var el = d.el('div', 'isl' + (item ? ' full' : '') + (selectedSlot === idx ? ' sel' : ''));
        if (item) {
          el.style.borderColor = R[item.t].c;
          el.style.background = 'linear-gradient(180deg,' + R[item.t].c + '2e,rgba(0,0,0,.4))';
          el.textContent = item.name.split(' ')[0];
          el.onclick = function () {
            selectedSlot = selectedSlot === idx ? -1 : idx;
            renderInventory();
          };
        }
        box.appendChild(el);
      })(i);
    }
    renderSellPanel();
  }

  function renderSellPanel() {
    var d = D(), panel = d.$('sell-panel'), h = W().hero;
    var item = h.items[selectedSlot];

    if (!item) { panel.style.display = 'none'; panel.innerHTML = ''; return; }

    var R = AA.Content.items.RARITY;
    panel.style.display = '';
    panel.innerHTML =
      '<div class="sp-info"><b style="color:' + R[item.t].c + '">' + item.name + '</b>' +
      '<p>' + item.d + '</p></div>';

    var btn = d.el('button', 'btn btn-sell',
      'ПРОДАТЬ · <span class="ic ic-gold"></span> ' + d.fmt(sellPrice(item)));
    btn.onclick = function () {
      var sold = h.items[selectedSlot];
      if (!sold) return;
      W().gold += sellPrice(sold);
      h.items.splice(selectedSlot, 1);
      AA.Game.stats.recalc(h);
      selectedSlot = -1;
      AA.Core.audio.sell();
      AA.UI.toast.show('Продано за ' + d.fmt(sellPrice(sold)));
      renderAll();
    };
    panel.appendChild(btn);
  }

  /* ---------------- характеристики ---------------- */
  function renderStats() {
    var d = D(), h = W().hero, s = h.stats, box = d.$('stat-strip');
    box.innerHTML = d.attrBlock(s.str, s.agi, s.int, h.primary);

    var rows = [
      ['УРОН', Math.round(s.atk)], ['БРОНЯ', s.armor.toFixed(1)],
      ['ЗДОРОВЬЕ', Math.round(s.hp)], ['МАНА', Math.round(s.mp)],
      ['СК. АТАКИ', s.as.toFixed(2)], ['СКОРОСТЬ', Math.round(s.ms)],
      ['КРИТ', Math.round(s.crit) + '%'], ['ВАМПИРИЗМ', Math.round(s.lifesteal) + '%'],
      ['СИЛА ЗАКЛ.', Math.round(s.sp)], ['МАГ. РЕЗИСТ', Math.round(s.mr * 100) + '%'],
      ['ПЕРЕЗАРЯДКА', '-' + Math.round(s.cdr) + '%'], ['РЕГЕН', s.hpReg.toFixed(1)]
    ];
    var grid = d.el('div', 'stat-grid');
    rows.forEach(function (r) {
      grid.appendChild(d.el('div', 'st', '<small>' + r[0] + '</small><b>' + r[1] + '</b>'));
    });
    box.appendChild(grid);
  }

  /* ---------------- витрина ---------------- */
  function renderGrid() {
    var d = D(), box = d.$('shop-grid'), h = W().hero;
    var R = AA.Content.items.RARITY;
    box.innerHTML = '';

    AA.Content.items.LIST
      .filter(function (it) { return filter === 0 || it.t === filter; })
      .forEach(function (it) {
        var owned = h.items.some(function (o) { return o.id === it.id; });
        var can = !owned && d.canAfford(it.cost) && h.items.length < SLOTS();
        var color = R[it.t].c;

        var card = d.el('div', 'item ' + (owned ? 'owned' : (can ? 'can' : 'cant')));
        card.style.borderColor = owned ? '#3ddb7f' : color + (can ? 'aa' : '44');
        card.innerHTML =
          '<b style="color:' + color + '">' + it.name + '</b>' +
          '<p>' + it.d + '</p>' +
          '<div class="price"><span class="ic ic-gold"></span>' +
          (owned ? 'куплено' : d.fmt(it.cost)) + '</div>';

        if (can) {
          card.onclick = function () {
            if (h.items.length >= SLOTS()) { AA.UI.toast.show('Инвентарь полон'); return; }
            if (!d.spendGold(it.cost)) { AA.UI.toast.show('Не хватает золота'); return; }
            h.items.push(it);
            AA.Game.stats.recalc(h);
            AA.Core.audio.buy();
            renderAll();
          };
        }
        box.appendChild(card);
      });
  }

  /* ---------------- автозакуп ---------------- */
  function autoBuy(silent) {
    var d = D(), h = W().hero, bought = 0, guard = 0;

    while (h.items.length < SLOTS() && guard++ < 12) {
      var best = null, bestScore = 0;
      AA.Content.items.LIST.forEach(function (it) {
        if (h.items.some(function (o) { return o.id === it.id; })) return;
        if (!d.canAfford(it.cost)) return;
        var score = AA.Content.items.score(it, h);
        if (score > bestScore) { bestScore = score; best = it; }
      });
      if (!best) break;
      d.spendGold(best.cost);
      h.items.push(best);
      bought++;
    }

    AA.Game.stats.recalc(h);
    if (bought) {
      AA.Core.audio.buy();
      if (!silent) AA.UI.toast.show('Куплено предметов: ' + bought);
    } else if (!silent) AA.UI.toast.show('Нечего купить');
    renderAll();
  }

  /* ---------------- события ---------------- */
  function bind() {
    var d = D(), S = AA.UI.screens;

    d.$('btn-next-wave').onclick = function () {
      S.close('shop');
      if (!d.isTraining()) AA.Game.waves.nextWave();
      AA.UI.hud.refresh(true);
    };
    d.$('btn-lvlup').onclick = function () { AA.UI.skilltree.open(); };
    d.$('btn-autobuy').onclick = function () { autoBuy(false); };

    d.$$('.shop-tab').forEach(function (tab) {
      tab.onclick = function () {
        filter = +tab.dataset.t;
        d.$$('.shop-tab').forEach(function (x) { x.classList.toggle('on', x === tab); });
        renderGrid();
      };
    });
  }

  return { open: open, bind: bind, autoBuy: autoBuy, renderAll: renderAll };
})());
