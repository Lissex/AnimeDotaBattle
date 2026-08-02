/* ui/skilltree — распределение очков умений и справочник связок Аркана. */
AA.module('ui/skilltree', (function () {
  'use strict';

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }

  function open() { render(); AA.UI.screens.open('skills'); }

  /* ---------------- список умений ---------------- */
  function render() {
    var d = D(), h = W().hero, A = AA.Content.attributes;
    var box = d.$('skill-up-list');
    if (!h) return;

    d.$('hud-pts').textContent = h.pts;
    box.innerHTML = '';

    var cap = A.skillCap(h.level), slot = 0;

    h.skills.forEach(function (s) {
      var lv = h.skillLv[s.id] || 0;
      if (s.type !== 'passive') slot++;

      var pips = '';
      for (var i = 0; i < A.MAX_SKILL_LV; i++) {
        pips += '<div class="pip' + (i < lv ? ' on' : '') + '"></div>';
      }

      var row = d.el('div', 'su',
        '<div class="sk-ic" style="background:' + s.color + '">' + s.icon + '</div>' +
        '<div class="su-info"><b>' + s.name +
        (s.type !== 'passive' ? ' <span class="kbd">' + slot + '</span>' : ' <span class="kbd">П</span>') +
        ' <span class="dim">ур. ' + lv + '</span></b>' +
        '<p>' + s.desc(Math.max(0, lv - 1)) + '</p>' +
        '<div class="su-pips">' + pips + '</div></div>');

      var btn = d.el('button', 'btn btn-main', '+');
      btn.disabled = h.pts <= 0 || lv >= cap;
      btn.onclick = function () {
        if (h.pts <= 0 || lv >= cap) return;
        h.skillLv[s.id] = lv + 1;
        h.pts--;
        AA.Game.stats.recalc(h);
        AA.Core.audio.lvl();
        render();
        AA.UI.skillbar.build();
      };
      row.appendChild(btn);
      box.appendChild(row);
    });

    if (h.invoker) box.appendChild(comboTable());
  }

  /** Раскидать очки автоматически: качаем самое отстающее умение. */
  function autoAssign(silent) {
    var h = W().hero, A = AA.Content.attributes;
    var spent = 0, guard = 0;

    while (h.pts > 0 && guard++ < 24) {
      var cap = A.skillCap(h.level), target = null, lowest = 99;
      h.skills.forEach(function (s) {
        var lv = h.skillLv[s.id] || 0;
        if (lv >= cap) return;
        if (lv < lowest) { lowest = lv; target = s; }
      });
      if (!target) break;
      h.skillLv[target.id] = lowest + 1;
      h.pts--; spent++;
    }

    AA.Game.stats.recalc(h);
    if (spent) { AA.Core.audio.lvl(); AA.UI.skillbar.build(); }
    else if (!silent) AA.UI.toast.show('Нужен уровень героя выше');
    render();
  }

  /* ---------------- справочник связок ---------------- */
  function reagentDots(key) {
    var C = AA.UI.skillbar.ELEM_COLOR, I = AA.UI.skillbar.ELEM_ICON, s = '';
    for (var i = 0; i < key.length; i++) {
      s += '<span class="rg" style="background:' + C[key[i]] + '">' + I[key[i]] + '</span>';
    }
    return s;
  }

  function comboTable() {
    var d = D();
    var box = d.el('div', 'combo-box',
      '<div class="combo-head">10 СВЯЗОК · нажмите три стихии, затем ВЫЗОВ</div>');

    var SPELLS = AA.Content.invoke.SPELLS;
    Object.keys(SPELLS).forEach(function (key) {
      var sp = SPELLS[key];
      box.appendChild(d.el('div', 'combo-row',
        '<div class="combo-keys">' + reagentDots(key) + '</div>' +
        '<div class="combo-info">' +
        '<b style="color:' + sp.color + '">' + sp.icon + ' ' + sp.name + '</b>' +
        '<p>' + sp.desc + '</p>' +
        '<small>мана ' + sp.mana + ' · перезарядка ' + sp.cd + ' сек</small></div>'));
    });
    return box;
  }

  function bind() {
    D().$('btn-autolevel').onclick = function () { autoAssign(false); };
  }

  return { open: open, render: render, autoAssign: autoAssign, comboTable: comboTable, bind: bind };
})());
