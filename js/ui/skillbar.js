/* ui/skillbar — кнопки умений и панель реагентов Аркана. */
AA.module('ui/skillbar', (function () {
  'use strict';

  var ELEM_COLOR = { F: '#ff5a2f', I: '#7fd4ff', S: '#c9a0ff' };
  var ELEM_ICON = { F: '🔥', I: '❄', S: '⚡' };

  function D() { return AA.UI.dom; }
  function W() { return AA.Game.world.state; }

  /* ---------------- построение ---------------- */
  function build() {
    var d = D(), bar = d.$('skillbar'), h = W().hero, slot = 0;
    bar.innerHTML = '';

    h.skills.forEach(function (s, i) {
      if (s.type === 'passive') return;
      slot++;
      var b = d.el('div', 'sb' + (s.type === 'reagent' ? ' sb-elem' : ''));
      b.appendChild(AA.Render.icons.element(s.type === 'reagent' ? 46 : 52, s.id, s.color));
      b.insertAdjacentHTML('beforeend',
        '<span class="key">' + slot + '</span>' +
        '<div class="cd" style="display:none"></div>' +
        (s.charges ? '<span class="chg" style="display:none">0</span>' : ''));
      b.dataset.idx = i;
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (W().auto) { AA.UI.toast.show('Автобой включён'); return; }
        AA.Game.abilities.cast(W().hero, i);
      });
      bar.appendChild(b);
    });

    if (h.invoker) {
      var inv = d.el('div', 'sb sb-invoke');
      inv.id = 'sb-invoke';
      inv.innerHTML =
        '<span class="key">4</span>' +
        '<span class="gl" id="inv-icon">✦</span>' +
        '<div class="cd" style="display:none"></div>';
      inv.style.background = 'linear-gradient(180deg,#3a3550,rgba(0,0,0,.62))';
      inv.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (W().auto) { AA.UI.toast.show('Автобой включён'); return; }
        AA.Game.abilities.castInvoke(W().hero);
      });
      bar.appendChild(inv);
    }
    d.$('reagent-bar').style.display = h.invoker ? '' : 'none';
  }

  /* ---------------- обновление ---------------- */
  function refresh() {
    var d = D(), h = W().hero;
    if (!h) return;

    d.$$('#skillbar .sb').forEach(function (b) {
      if (b.id === 'sb-invoke') return;
      var s = h.skills[+b.dataset.idx];
      var lv = (h.skillLv[s.id] || 0) - 1;
      var cd = h.cds[s.id] || 0;
      var badge = b.querySelector('.cd');

      if (lv < 0) {
        badge.style.display = 'flex';
        badge.textContent = '🔒';
        b.classList.remove('ready');
        return;
      }
      // у зарядного умения на кнопке два числа: сколько осталось
      // применений и сколько ждать до следующего заряда
      var free = 1;
      if (s.charges) {
        var A = AA.Game.abilities;
        free = A.charges(h, s);
        var chip = b.querySelector('.chg');
        if (chip) {
          chip.style.display = '';
          chip.textContent = free;
          chip.classList.toggle('empty', free <= 0);
        }
        cd = free < A.maxCharges(h, s) ? (h.chgT[s.id] || 0) : 0;
      }

      if (cd > 0) { badge.style.display = 'flex'; badge.textContent = cd.toFixed(cd < 3 ? 1 : 0); }
      else badge.style.display = 'none';

      var noMana = h.mp < (s.mana[lv] || 0);
      b.classList.toggle('nomana', noMana);
      b.classList.toggle('ready', free > 0 && (h.cds[s.id] || 0) <= 0 && !noMana);
      b.classList.toggle('toggled', s.type === 'toggle' && !!h.toggles[s.id]);
    });

    if (h.invoker) refreshReagents(h);
  }

  function refreshReagents(h) {
    var d = D();
    var slots = d.$$('#reagent-bar .rg-slot');

    for (var i = 0; i < 3; i++) {
      var e = h.reagents[i], el = slots[i];
      if (e) {
        el.textContent = ELEM_ICON[e];
        el.style.background = ELEM_COLOR[e];
        el.style.borderColor = ELEM_COLOR[e];
        el.classList.add('on');
      } else {
        el.textContent = '';
        el.style.background = '';
        el.style.borderColor = '';
        el.classList.remove('on');
      }
    }

    var spell = AA.Game.abilities.currentSpell(h);
    var name = d.$('rg-name'), btn = d.$('sb-invoke');

    if (!spell) {
      name.textContent = 'выберите 3 стихии';
      name.style.color = 'var(--dim)';
      if (btn) {
        btn.style.background = 'linear-gradient(180deg,#3a3550,rgba(0,0,0,.62))';
        d.$('inv-icon').textContent = '✦';
        btn.querySelector('.cd').style.display = 'none';
        btn.classList.remove('ready');
      }
      return;
    }

    name.textContent = spell.name;
    name.style.color = spell.color;
    if (!btn) return;

    btn.style.background = 'linear-gradient(180deg,' + spell.color + ',rgba(0,0,0,.62))';
    d.$('inv-icon').textContent = spell.icon;

    var cd = h.invokeCds[spell.key] || 0;
    var badge = btn.querySelector('.cd');
    if (cd > 0) { badge.style.display = 'flex'; badge.textContent = cd.toFixed(cd < 3 ? 1 : 0); }
    else badge.style.display = 'none';

    btn.classList.toggle('ready', cd <= 0 && h.mp >= spell.mana);
    btn.classList.toggle('nomana', h.mp < spell.mana);
  }

  return { build: build, refresh: refresh, ELEM_COLOR: ELEM_COLOR, ELEM_ICON: ELEM_ICON };
})());
