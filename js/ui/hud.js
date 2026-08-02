/* ui/hud — панель боя. Вызывается каждый кадр, поэтому пишет в DOM
   только когда значение реально изменилось. */
AA.module('ui/hud', (function () {
  'use strict';

  var cache = {};

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }

  function bar(id, textId, value, max) {
    var d = D();
    d.$(id).style.transform = 'scaleX(' + Math.max(0, Math.min(1, value / max)) + ')';
    if (!textId) return;
    var s = Math.round(value) + ' / ' + Math.round(max);
    if (cache[textId] !== s) { d.$(textId).textContent = s; cache[textId] = s; }
  }

  function set(id, value, key) {
    if (cache[key] === value) return;
    D().$(id).textContent = value;
    cache[key] = value;
  }

  /**
   * @param {boolean} full  перерисовать и редко меняющиеся части
   */
  function refresh(full) {
    var w = W(), h = w.hero, d = D();
    if (!h) return;

    bar('hud-hp', 'hud-hp-txt', h.hp, h.maxHp);
    bar('hud-mp', 'hud-mp-txt', h.mp, h.maxMp);
    bar('hud-xp', null, h.xp, AA.Content.attributes.xpToLevel(h.level));

    set('hud-wave', w.wave, 'wave');
    set('hud-gold', d.goldText(), 'gold');
    set('hud-hlvl', h.level, 'lvl');

    if (cache.pts !== h.pts) {
      d.$('hud-skillpts').textContent = h.pts;
      d.$('hud-skillpts').style.display = h.pts > 0 ? '' : 'none';
      cache.pts = h.pts;
    }
    if (w.training) set('hud-dps', d.fmt(Math.round(w.dps)), 'dps');

    if (full) {
      d.$('hud-hname').textContent = d.t(h.name);
      d.$('hud-map').textContent = w.map ? w.map.name : '';
      renderItems();
    }

    AA.UI.skillbar.refresh();
  }

  function renderItems() {
    var d = D(), box = d.$('hud-items'), h = W().hero;
    var R = AA.Content.items.RARITY;
    box.innerHTML = '';
    for (var i = 0; i < AA.Content.attributes.INV_SLOTS; i++) {
      var slot = d.el('div', 'isl');
      var it = h.items[i];
      if (it) {
        slot.classList.add('full');
        slot.style.borderColor = R[it.t].c;
        slot.style.background = 'linear-gradient(180deg,' + R[it.t].c + '33,rgba(0,0,0,.5))';
        slot.textContent = it.name.charAt(0);
      }
      box.appendChild(slot);
    }
  }

  /** Волна пройдена: награды, уровни, лавка, реклама в паузе. */
  function onWaveClear(wave) {
    var w = W(), h = w.hero, A = AA.Content.attributes;

    w.gold += A.goldPerWave(wave);
    h.xp += A.xpPerWave(wave);

    while (h.xp >= A.xpToLevel(h.level) && h.level < A.MAX_HERO_LV) {
      h.xp -= A.xpToLevel(h.level);
      h.level++; h.pts++;
      AA.Game.stats.recalc(h);
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .2);
      AA.Core.audio.lvl();
      AA.UI.toast.show('Новый уровень!');
    }
    AA.Game.stats.recalc(h);
    refresh(true);

    if (w.auto) { AA.UI.skilltree.autoAssign(true); AA.UI.shop.autoBuy(true); }

    var go = function () { AA.UI.shop.open(); };
    // п.4.4: полноэкранная реклама только в логической паузе
    if (wave >= 2 && wave % 3 === 0) AA.Platform.sdk.interstitial(go);
    else go();
  }

  function reset() { cache = {}; }

  return { refresh: refresh, renderItems: renderItems, onWaveClear: onWaveClear, reset: reset };
})());
