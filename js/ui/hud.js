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
      renderPortrait(h);
      renderItems();
    }

    refreshBoss();
    AA.UI.skillbar.refresh();
  }

  /* ---------------- босс ---------------- */
  function strongestBoss() {
    var w = W(), best = null;
    for (var i = 0; i < w.units.length; i++) {
      var u = w.units[i];
      if (u.dead || !u.isBoss) continue;
      if (!best || u.hp > best.hp) best = u;
    }
    return best;
  }

  function refreshBoss() {
    var d = D(), boss = strongestBoss(), box = d.$('boss-hud');
    if (!boss) {
      if (cache.bossShown) { box.style.display = 'none'; cache.bossShown = false; }
      return;
    }
    if (!cache.bossShown) { box.style.display = ''; cache.bossShown = true; }

    var pct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    d.$('boss-hp').style.transform = 'scaleX(' + pct + ')';

    var label = boss.name + (boss.phase === 2 ? ' · ЯРОСТЬ' : '');
    if (cache.bossName !== label) {
      d.$('boss-name').textContent = label;
      d.$('boss-name').style.color = boss.phase === 2 ? boss.glow : '';
      cache.bossName = label;
    }
  }

  /** Плашка с именем и замыслом босса в момент появления. */
  function announceBoss(def) {
    var d = D(), banner = d.$('boss-banner');
    d.$('bb-title').textContent = def.name;
    d.$('bb-title').style.color = def.glow;
    d.$('bb-concept').textContent = def.concept || '';
    banner.style.display = '';
    banner.classList.remove('show');
    void banner.offsetWidth;          // перезапуск анимации
    banner.classList.add('show');
    clearTimeout(announceBoss._t);
    announceBoss._t = setTimeout(function () {
      banner.classList.remove('show');
      banner.style.display = 'none';
    }, 4200);
  }

  /** Портрет в панели — с учётом выбранного скина. */
  function renderPortrait(h) {
    var d = D(), box = d.$('dh-portrait');
    var def = AA.Content.heroes.get(h.defId);
    var view = {
      shape: def.shape, anim: def.anim,
      c1: (h.skin && h.skin.palette && h.skin.palette.armor) || def.c1,
      c2: (h.skin && h.skin.palette && h.skin.palette.cloth) || def.c2
    };
    box.innerHTML = '';
    box.appendChild(AA.Render.portrait.element(74, view, h.skin));
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

    // босс повержен — ставим главу истории в очередь
    var A = AA.Content.attributes;
    if (A.isBossWave(wave)) AA.UI.comic.queue(A.bossIndex(wave));

    var go = function () {
      // сначала талант, если дорос, затем комикс, затем лавка
      if (AA.UI.talents.checkPending()) return;
      if (AA.UI.comic.flush()) return;
      AA.UI.shop.open();
    };
    // п.4.4: полноэкранная реклама только в логической паузе
    if (wave >= 2 && wave % 3 === 0) AA.Platform.sdk.interstitial(go);
    else go();
  }

  function reset() { cache = {}; }

  return {
    refresh: refresh, renderItems: renderItems, onWaveClear: onWaveClear,
    announceBoss: announceBoss, reset: reset
  };
})());
