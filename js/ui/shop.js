/* ui/shop — лавка между волнами: покупка, продажа, автозакуп. */
AA.module('ui/shop', (function () {
  'use strict';

  var selectedSlot = -1;
  var filter = 0;
  var tab = 'shop';        // shop | craft

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }
  function SLOTS() { return AA.Game.run.slots(); }

  function open() {
    var d = D();
    selectedSlot = -1;
    // если что-то готово к сборке — открываем сразу на этой вкладке
    if (AA.Content.items.craftable(W().hero.items).length) tab = 'craft';
    renderAll();
    d.$('btn-next-wave').textContent = d.isTraining() ? d.t('ЗАКРЫТЬ') : d.t('СЛЕДУЮЩАЯ ВОЛНА');
    AA.UI.screens.open('shop');
  }

  function renderAll() {
    var d = D();
    renderInventory();
    renderStats();
    renderTabs();
    if (tab === 'craft') renderCraft(); else renderGrid();
    d.$$('.hud-gold').forEach(function (e) { e.textContent = d.goldText(); });
    AA.UI.hud.renderItems();
  }

  function sellPrice(item) {
    return Math.round(item.cost * AA.Content.attributes.SELL_RATE);
  }
  function buyPrice(item) { return AA.Game.run.price(item); }

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
          el.appendChild(AA.Render.icons.element(52, item.id, R[item.t].c));
          el.title = item.name + ' — ' + item.d;
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

  /* ---------------- вкладки ---------------- */
  function renderTabs() {
    var d = D();
    d.$$('.shop-mode').forEach(function (b) {
      b.classList.toggle('on', b.dataset.mode === tab);
    });
    d.$('shop-tabs').style.display = tab === 'shop' ? '' : 'none';

    // подсказка, когда что-то уже можно собрать
    var ready = AA.Content.items.craftable(W().hero.items).length;
    var badge = d.$('craft-badge');
    badge.style.display = ready ? '' : 'none';
    badge.textContent = ready;
  }

  /* ---------------- сборка артефактов ---------------- */
  function renderCraft() {
    var d = D(), box = d.$('shop-grid'), h = W().hero;
    var R = AA.Content.items.RARITY;
    box.innerHTML = '';

    var list = AA.Content.items.recipes(h.items);
    // сначала то, что уже можно собрать
    list.sort(function (a, b) { return (b.ready ? 1 : 0) - (a.ready ? 1 : 0); });

    list.forEach(function (rec) {
      var art = rec.art, color = R[5].c;
      var price = buyPrice(art);
      var affordable = d.canAfford(price);
      var can = rec.ready && affordable;

      var card = d.el('div', 'item craft' + (can ? ' can' : (rec.ready ? '' : ' cant')));
      card.style.borderColor = color + (can ? 'cc' : '44');

      var head = d.el('div', 'item-head');
      var ico = d.el('div', 'item-ico');
      ico.appendChild(AA.Render.icons.element(38, art.id, color, color));
      head.appendChild(ico);
      var name = d.el('b', null, art.name);
      name.style.color = color;
      head.appendChild(name);
      card.appendChild(head);

      card.insertAdjacentHTML('beforeend', '<p>' + art.d + '</p>');

      // из чего собирается
      var parts = d.el('div', 'craft-parts');
      rec.parts.forEach(function (p, i) {
        if (i) parts.appendChild(d.el('span', 'craft-plus', '+'));
        var chip = d.el('span', 'craft-part' + (p.owned ? ' has' : ''));
        chip.appendChild(AA.Render.icons.element(22, p.item.id,
          p.owned ? R[p.item.t].c : '#3a4260'));
        chip.appendChild(d.el('span', null, p.item.name));
        parts.appendChild(chip);
      });
      card.appendChild(parts);

      card.insertAdjacentHTML('beforeend',
        '<div class="price"><span class="ic ic-gold"></span>' + d.fmt(price) +
        (rec.ready ? '' : ' · нет частей') + '</div>');

      if (can) {
        card.onclick = function () { craft(rec, price); };
      }
      box.appendChild(card);
    });
  }

  function craft(rec, price) {
    var d = D(), h = W().hero;
    if (!d.spendGold(price)) { AA.UI.toast.show('Не хватает золота'); return; }

    // части исчезают, артефакт занимает один слот вместо двух
    rec.art.parts.forEach(function (pid) {
      for (var i = h.items.length - 1; i >= 0; i--) {
        if (h.items[i].id === pid) { h.items.splice(i, 1); break; }
      }
    });
    h.items.push(rec.art);
    AA.Game.stats.recalc(h);

    AA.Core.audio.craft();
    AA.UI.toast.show('Собран: ' + rec.art.name);
    AA.Game.effects.ring(h.x, h.y, 160, '#ff5ad8');
    AA.Game.effects.burst(h.x, h.y, '#ff5ad8', 28);
    renderAll();
  }

  /* ---------------- витрина ---------------- */
  function renderGrid() {
    var d = D(), box = d.$('shop-grid'), h = W().hero;
    var R = AA.Content.items.RARITY;
    box.innerHTML = '';

    AA.Content.items.LIST
      .filter(function (it) { return !it.craftOnly && (filter === 0 || it.t === filter); })
      .forEach(function (it) {
        var owned = h.items.some(function (o) { return o.id === it.id; });
        var price = buyPrice(it);
        var can = !owned && d.canAfford(price) && h.items.length < SLOTS();
        var color = R[it.t].c;

        var card = d.el('div', 'item ' + (owned ? 'owned' : (can ? 'can' : 'cant')));
        card.style.borderColor = owned ? '#3ddb7f' : color + (can ? 'aa' : '44');

        var head = d.el('div', 'item-head');
        var ico = d.el('div', 'item-ico');
        ico.appendChild(AA.Render.icons.element(38, it.id, color, color));
        head.appendChild(ico);
        head.appendChild(d.el('b', null, it.name));
        head.firstChild.nextSibling.style.color = color;
        card.appendChild(head);

        card.insertAdjacentHTML('beforeend',
          '<p>' + it.d + '</p>' +
          '<div class="price"><span class="ic ic-gold"></span>' +
          (owned ? 'куплено' : d.fmt(price)) + '</div>');

        if (can) {
          card.onclick = function () {
            if (h.items.length >= SLOTS()) { AA.UI.toast.show('Инвентарь полон'); return; }
            if (!d.spendGold(price)) { AA.UI.toast.show('Не хватает золота'); return; }
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

    // сначала собираем всё, что можно — артефакт освобождает слот
    var ready = AA.Content.items.craftable(h.items);
    for (var c = 0; c < ready.length; c++) {
      var art = ready[c], price = buyPrice(art);
      if (!d.canAfford(price)) continue;
      var rec = { art: art };
      d.spendGold(price);
      art.parts.forEach(function (pid) {
        for (var i = h.items.length - 1; i >= 0; i--) {
          if (h.items[i].id === pid) { h.items.splice(i, 1); break; }
        }
      });
      h.items.push(art);
      bought++;
    }

    while (h.items.length < SLOTS() && guard++ < 12) {
      var best = null, bestScore = 0;
      AA.Content.items.LIST.forEach(function (it) {
        if (it.craftOnly) return;
        if (h.items.some(function (o) { return o.id === it.id; })) return;
        if (!d.canAfford(buyPrice(it))) return;
        var score = AA.Content.items.score(it, h);
        if (score > bestScore) { bestScore = score; best = it; }
      });
      if (!best) break;
      d.spendGold(buyPrice(best));
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

    d.$$('.shop-tab').forEach(function (btn) {
      btn.onclick = function () {
        filter = +btn.dataset.t;
        d.$$('.shop-tab').forEach(function (x) { x.classList.toggle('on', x === btn); });
        renderGrid();
      };
    });

    d.$$('.shop-mode').forEach(function (btn) {
      btn.onclick = function () { tab = btn.dataset.mode; renderAll(); };
    });
  }

  return { open: open, bind: bind, autoBuy: autoBuy, renderAll: renderAll };
})());
