/* ui/dom — мелкие помощники разметки и общий доступ к прогрессу.
   Всё, что связано с «сколько у игрока душ и открыт ли герой»,
   живёт здесь, чтобы режим отладки не размазывался по экранам. */
AA.module('ui/dom', (function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function t(s) { return AA.Platform.i18n.t(s); }
  function fmt(n) { return AA.Core.math.fmt(n); }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  /* ---------------- прогресс и валюта ---------------- */
  function save() { return AA.Platform.storage.data; }
  function isTraining() { return AA.Game.world.state.training; }

  /** Отладка активна, только если SDK не загрузился И игрок её не выключил. */
  function isDev() {
    return AA.Platform.sdk.isDev() && !save().forceGame;
  }

  function soulsText() { return isDev() ? '∞' : fmt(save().souls); }

  function spendSouls(n) {
    if (isDev()) return true;
    if (save().souls < n) return false;
    save().souls -= n;
    return true;
  }

  function unlocked(id) {
    return isDev() || save().unlocked.indexOf(id) >= 0;
  }

  function permLv(id) { return save().heroLv[id] || 0; }

  function goldText() {
    return (isDev() || isTraining()) ? '∞' : fmt(AA.Game.world.state.gold);
  }

  function spendGold(n) {
    if (isDev() || isTraining()) return true;
    var w = AA.Game.world.state;
    if (w.gold < n) return false;
    w.gold -= n;
    return true;
  }

  function canAfford(n) {
    return isDev() || isTraining() || AA.Game.world.state.gold >= n;
  }

  /* ---------------- блок атрибутов ---------------- */
  function attrBlock(str, agi, int_, primary) {
    var A = AA.Content.attributes;
    var vals = { str: str, agi: agi, int: int_ };
    var html = '<div class="attrs">';
    ['str', 'agi', 'int'].forEach(function (k) {
      html += '<div class="attr' + (primary === k ? ' prim' : '') + '" style="--ac:' + A.COLOR[k] + '">' +
        '<small>' + A.NAME[k] + (primary === k ? ' ★' : '') + '</small>' +
        '<b>' + Math.round(vals[k]) + '</b></div>';
    });
    return html + '</div>';
  }

  return {
    $: $, $$: $$, t: t, fmt: fmt, el: el,
    save: save, isDev: isDev, isTraining: isTraining,
    soulsText: soulsText, spendSouls: spendSouls, unlocked: unlocked, permLv: permLv,
    goldText: goldText, spendGold: spendGold, canAfford: canAfford,
    attrBlock: attrBlock
  };
})());
