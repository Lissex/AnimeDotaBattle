/* ui/screens — переключение экранов и оверлеев,
   старт и завершение забега. Центральная точка навигации. */
AA.module('ui/screens', (function () {
  'use strict';

  var SCREENS = ['loading', 'menu', 'heroes', 'battle'];
  var OVERLAYS = ['shop', 'skills', 'talent', 'comic', 'settings', 'pause', 'over', 'howto'];

  var current = 'loading';
  var run = { revived: false, x2used: false, pendingSouls: 0, pendingStart: false };

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }

  /* ---------------- навигация ---------------- */
  function show(name) {
    SCREENS.forEach(function (s) {
      D().$('scr-' + s).classList.toggle('active', s === name);
    });
    current = name;
  }
  function open(name) { D().$('scr-' + name).classList.add('active'); }
  function close(name) { D().$('scr-' + name).classList.remove('active'); }
  function closeAll() { OVERLAYS.forEach(close); }
  function isBattle() { return current === 'battle'; }

  /* ---------------- забег ---------------- */
  function startRun(training) {
    var d = D(), A = AA.Content.attributes;
    var save = d.save();
    var def = AA.Content.heroes.get(d.unlocked(save.selected) ? save.selected : 'butcher');
    var level = training ? A.MAX_HERO_LV : 1 + d.permLv(def.id);

    var hero = AA.Game.factory.hero(def, level, {}, []);
    hero.skin = AA.Content.skins.get(def.id, save.skins[def.id] || 'default');

    if (training) {
      hero.pts = 0;
      def.skills.forEach(function (id) { hero.skillLv[id] = A.MAX_SKILL_LV; });
    } else {
      hero.pts = level;
      hero.skillLv[def.skills[0]] = 1;
      hero.pts--;
    }
    hero.xp = 0;
    AA.Game.stats.recalc(hero);
    hero.hp = hero.maxHp; hero.mp = hero.maxMp;

    run.revived = false; run.x2used = false;

    show('battle');
    AA.Render.canvas.resize();
    AA.Game.loop.startRun(hero, training);
    if (d.isDev() && !training) W().gold = 999999;

    AA.Platform.sdk.gameplayStart();
    AA.Platform.sdk.hideBanner();

    AA.UI.skillbar.build();
    AA.UI.training.setVisible(!!training);
    AA.UI.hud.refresh(true);
    AA.UI.controls.setAuto(false);

    // герой мог начать забег уже выше 10 уровня (постоянные улучшения
    // или полигон на 50-м) — тогда таланты выбираются сразу
    setTimeout(function () { AA.UI.talents.checkPending(); }, 350);
  }

  function endRun() {
    var w = W(), d = D();
    if (!w.hero) return;

    AA.Game.loop.stop();
    AA.Platform.sdk.gameplayStop();

    if (w.training) { toMenu(); return; }

    var save = d.save();
    var souls = AA.Content.attributes.soulsFor(w.wave, w.kills);
    run.pendingSouls = souls;
    if (w.wave > save.best) save.best = w.wave;
    save.souls += souls;
    AA.Platform.storage.commit(true);

    d.$('over-wave').textContent = w.wave;
    d.$('over-kills').textContent = w.kills;
    d.$('over-souls').textContent = d.fmt(souls);
    d.$('btn-revive').style.display = (run.revived || !AA.Platform.sdk.hasAds()) ? 'none' : '';
    d.$('btn-x2').style.display = (run.x2used || !AA.Platform.sdk.hasAds()) ? 'none' : '';

    closeAll();
    open('over');
    AA.Platform.sdk.showBanner();
  }

  function toMenu() {
    closeAll();
    AA.Game.loop.stop();
    AA.Platform.sdk.gameplayStop();
    W().training = false;
    show('menu');
    AA.UI.menu.refresh();
    AA.Platform.sdk.showBanner();
  }

  /** Смерть героя: на полигоне просто возрождаемся. */
  function onDeath() {
    if (W().training) {
      setTimeout(function () {
        AA.Game.loop.revive();
        AA.UI.toast.show('Возрождение на полигоне');
      }, 800);
      return;
    }
    setTimeout(endRun, 800);
  }

  return {
    show: show, open: open, close: close, closeAll: closeAll,
    isBattle: isBattle, current: function () { return current; },
    run: run,
    startRun: startRun, endRun: endRun, toMenu: toMenu, onDeath: onDeath
  };
})());
