/* =========================================================
   Арена Древних — интерфейс
   ========================================================= */
(function (root) {
  'use strict';

  var D = root.DATA, E = root.ENGINE, YA = root.YA;
  var T = function (s) { return YA.T(s); };
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, c) { return Array.prototype.slice.call((c || document).querySelectorAll(sel)); };

  var MAX_HERO_LV = 25, MAX_SKILL_LV = 4, INV_SLOTS = 6;
  var ELEM_OF = { elemFire: 'F', elemIce: 'I', elemStorm: 'S' };
  var ELEM_COLOR = { F: '#ff5a2f', I: '#7fd4ff', S: '#c9a0ff' };
  var ELEM_ICON = { F: '🔥', I: '❄', S: '⚡' };

  var state = {
    screen: 'loading', selHero: null, revived: false, x2used: false,
    pendingStart: false, pendingSouls: 0, invSel: -1, shopFilter: 0, training: false
  };

  function dev() { return YA.dev(); }

  /* ---------------- экраны ---------------- */
  var SCREENS = ['loading', 'menu', 'heroes', 'battle'];
  var OVERLAYS = ['shop', 'skills', 'pause', 'over', 'howto'];
  function show(n) {
    SCREENS.forEach(function (s) { $('scr-' + s).classList.toggle('active', s === n); });
    state.screen = n;
  }
  function openOv(n) { $('scr-' + n).classList.add('active'); }
  function closeOv(n) { $('scr-' + n).classList.remove('active'); }
  function closeAllOv() { OVERLAYS.forEach(function (n) { closeOv(n); }); }

  /* ---------------- тосты ---------------- */
  var toastT = {};
  function toast(msg) {
    msg = T(msg);
    if (toastT[msg] && Date.now() - toastT[msg] < 900) return;
    toastT[msg] = Date.now();
    var el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    $('toast-wrap').appendChild(el);
    setTimeout(function () { el.remove(); }, 1600);
  }

  /* ---------------- утилиты ---------------- */
  function heroById(id) {
    for (var i = 0; i < D.HEROES.length; i++) if (D.HEROES[i].id === id) return D.HEROES[i];
    return D.HEROES[0];
  }
  function permLv(id) { return YA.save.heroLv[id] || 0; }
  function upgradeCost(id) { return 300 + permLv(id) * 240; }
  function maxSkillLv(lv) { return Math.min(MAX_SKILL_LV, 1 + Math.floor((lv - 1) / 3)); }
  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
  function soulsText() { return dev() ? '∞' : fmt(YA.save.souls); }
  function spendSouls(n) {
    if (dev()) return true;
    if (YA.save.souls < n) return false;
    YA.save.souls -= n; return true;
  }
  function unlocked(id) { return dev() || YA.save.unlocked.indexOf(id) >= 0; }
  function gold() { return E.world.gold; }
  function spendGold(n) {
    if (dev() || state.training) return true;
    if (E.world.gold < n) return false;
    E.world.gold -= n; return true;
  }
  function goldText() { return (dev() || state.training) ? '∞' : fmt(E.world.gold); }

  function makePortrait(size, def) {
    var c = document.createElement('canvas');
    c.width = c.height = size * 2;
    c.style.width = c.style.height = '100%';
    E.portrait(c, def);
    return c;
  }

  function attrBlock(str, agi, int_, primary) {
    var vals = { str: str, agi: agi, int: int_ };
    var html = '<div class="attrs">';
    ['str', 'agi', 'int'].forEach(function (k) {
      html += '<div class="attr' + (primary === k ? ' prim' : '') + '" style="--ac:' + D.ATTR_COLOR[k] + '">' +
        '<small>' + D.ATTR_NAME[k] + (primary === k ? ' ★' : '') + '</small><b>' + Math.round(vals[k]) + '</b></div>';
    });
    return html + '</div>';
  }

  /* ---------------- меню ---------------- */
  function refreshMenu() {
    $('hud-souls').textContent = soulsText();
    $$('.hud-souls').forEach(function (e) { e.textContent = soulsText(); });
    $('hud-best').textContent = T('волна ') + YA.save.best;
    $('dev-badge').style.display = dev() ? '' : 'none';
  }

  /* ---------------- герои ---------------- */
  function renderHeroes() {
    var list = $('hero-list');
    list.innerHTML = '';
    D.HEROES.forEach(function (h) {
      var un = unlocked(h.id);
      var card = document.createElement('div');
      card.className = 'hero-card' + (state.selHero === h.id ? ' sel' : '') + (un ? '' : ' locked');
      var pw = document.createElement('div');
      pw.className = 'hero-portrait';
      pw.appendChild(makePortrait(48, h));
      card.appendChild(pw);
      var info = document.createElement('div');
      info.className = 'hc-info';
      info.innerHTML = '<b>' + T(h.name) + '</b><small style="color:' + D.ATTR_COLOR[h.primary] + '">' +
        (un ? ('ур. ' + (1 + permLv(h.id))) : T('ОТКРЫТЬ')) + '</small>';
      card.appendChild(info);
      if (!un) {
        var lk = document.createElement('div');
        lk.className = 'hero-lock';
        lk.innerHTML = '<span class="ic ic-soul"></span>' + fmt(h.cost);
        card.appendChild(lk);
      }
      card.onclick = function () { state.selHero = h.id; renderHeroes(); renderHeroDetail(); };
      list.appendChild(card);
    });
    refreshMenu();
  }

  function renderHeroDetail() {
    var h = heroById(state.selHero), un = unlocked(h.id), lv = 1 + permLv(h.id);
    var d = $('hero-detail');
    d.innerHTML = '';

    var top = document.createElement('div');
    top.className = 'hd-top';
    var pw = document.createElement('div');
    pw.className = 'hero-portrait';
    pw.appendChild(makePortrait(68, h));
    top.appendChild(pw);
    var nm = document.createElement('div');
    nm.innerHTML = '<div class="hd-name">' + T(h.name) + '</div><div class="hd-role">' + T(h.role) + '</div>' +
      '<div class="hd-map">Арена: ' + (D.MAPS[h.id] ? D.MAPS[h.id].name : '—') + '</div>';
    top.appendChild(nm);
    d.appendChild(top);

    var tip = document.createElement('p');
    tip.className = 'hd-tip';
    tip.textContent = h.tip;
    d.appendChild(tip);

    var k = lv - 1, A = D.ATTR;
    var str = h.attr.str + h.gain.str * k, agi = h.attr.agi + h.gain.agi * k, int_ = h.attr.int + h.gain.int * k;
    var wrap = document.createElement('div');
    wrap.innerHTML = attrBlock(str, agi, int_, h.primary);
    d.appendChild(wrap.firstChild);

    var prim = h.primary === 'str' ? str : h.primary === 'agi' ? agi : int_;
    var stats = [
      ['ЗДОРОВЬЕ', fmt(A.BASE_HP + str * A.HP_PER_STR)],
      ['МАНА', fmt(A.BASE_MP + int_ * A.MP_PER_INT)],
      ['УРОН', fmt(h.base.atk + prim * A.DMG_PER_PRIMARY)],
      ['БРОНЯ', (h.base.armor + agi * A.ARMOR_PER_AGI).toFixed(1)],
      ['СК. АТАКИ', (h.base.as * (1 + agi * A.AS_PER_AGI)).toFixed(2)],
      ['СКОРОСТЬ', fmt(h.base.ms)],
      ['ДАЛЬНОСТЬ', fmt(h.base.range)],
      ['СИЛА ЗАКЛ.', fmt(int_ * A.SP_PER_INT)]
    ];
    var sw = document.createElement('div');
    sw.className = 'hd-stats';
    stats.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'st';
      el.innerHTML = '<small>' + s[0] + '</small><b>' + s[1] + '</b>';
      sw.appendChild(el);
    });
    d.appendChild(sw);

    var sk = document.createElement('div');
    sk.className = 'hd-skills';
    var slot = 0;
    h.skills.forEach(function (sid) {
      var s = D.SKILLS[sid];
      var act = s.type !== 'passive';
      if (act) slot++;
      var kind = s.type === 'passive' ? 'ПАССИВНОЕ'
        : s.type === 'reagent' ? ('СТИХИЯ · клавиша ' + slot)
          : s.type === 'toggle' ? ('ПЕРЕКЛЮЧАЕМОЕ · клавиша ' + slot)
            : ('АКТИВНОЕ · клавиша ' + slot);
      var meta = (s.type === 'active') ? (kind + ' · мана ' + s.mana[0] + ' · КД ' + s.cd[0] + ' сек') : kind;
      var row = document.createElement('div');
      row.className = 'sk-row';
      row.innerHTML =
        '<div class="sk-ic" style="background:' + s.color + '">' + s.icon + '</div>' +
        '<div><b>' + s.name + '</b><p>' + s.desc(0) + '</p><div class="sk-meta">' + meta + '</div></div>';
      sk.appendChild(row);
    });
    d.appendChild(sk);

    if (h.invoker) d.appendChild(buildComboTable());

    var foot = document.createElement('div');
    foot.className = 'hd-foot';
    if (!un) {
      var buy = document.createElement('button');
      buy.className = 'btn btn-main';
      buy.innerHTML = T('ОТКРЫТЬ') + ' — ' + fmt(h.cost) + ' ♦';
      buy.onclick = function () {
        if (!spendSouls(h.cost)) { toast('Не хватает душ'); return; }
        YA.save.unlocked.push(h.id);
        YA.save.selected = h.id;
        YA.commit(true); E.SFX.buy(); toast('Герой открыт!');
        renderHeroes(); renderHeroDetail();
      };
      foot.appendChild(buy);
    } else {
      var up = document.createElement('button');
      up.className = 'btn';
      up.innerHTML = 'УЛУЧШИТЬ · ур.' + (lv + 1) + ' — ' + fmt(upgradeCost(h.id)) + ' ♦';
      up.disabled = lv >= MAX_HERO_LV;
      up.onclick = function () {
        if (!spendSouls(upgradeCost(h.id))) { toast('Не хватает душ'); return; }
        YA.save.heroLv[h.id] = permLv(h.id) + 1;
        YA.commit(true); E.SFX.lvl();
        renderHeroes(); renderHeroDetail();
      };
      foot.appendChild(up);

      var sel = document.createElement('button');
      sel.className = 'btn btn-main';
      sel.textContent = YA.save.selected === h.id ? T('ВЫБРАН') : T('ВЫБРАТЬ');
      sel.onclick = function () { YA.save.selected = h.id; YA.commit(); renderHeroes(); renderHeroDetail(); };
      foot.appendChild(sel);
    }
    d.appendChild(foot);
  }

  /* ---------------- таблица связок Аркана ---------------- */
  function reagentDots(key) {
    var s = '';
    for (var i = 0; i < key.length; i++) {
      s += '<span class="rg" style="background:' + ELEM_COLOR[key[i]] + '">' + ELEM_ICON[key[i]] + '</span>';
    }
    return s;
  }

  function buildComboTable() {
    var box = document.createElement('div');
    box.className = 'combo-box';
    box.innerHTML = '<div class="combo-head">10 СВЯЗОК · нажмите три стихии, затем ВЫЗОВ</div>';
    Object.keys(D.INVOKE).forEach(function (key) {
      var sp = D.INVOKE[key];
      var row = document.createElement('div');
      row.className = 'combo-row';
      row.innerHTML =
        '<div class="combo-keys">' + reagentDots(key) + '</div>' +
        '<div class="combo-info"><b style="color:' + sp.color + '">' + sp.icon + ' ' + sp.name + '</b>' +
        '<p>' + sp.desc + '</p><small>мана ' + sp.mana + ' · перезарядка ' + sp.cd + ' сек</small></div>';
      box.appendChild(row);
    });
    return box;
  }

  /* ---------------- забег ---------------- */
  function startRun(training) {
    var def = heroById(unlocked(YA.save.selected) ? YA.save.selected : 'butcher');
    var lv = training ? MAX_HERO_LV : 1 + permLv(def.id);
    var hero = E.makeHero(def, lv, {}, []);
    state.training = !!training;

    if (training) {
      hero.pts = 0;
      def.skills.forEach(function (id) { hero.skillLv[id] = MAX_SKILL_LV; });
    } else {
      hero.pts = lv;
      hero.skillLv[def.skills[0]] = 1; hero.pts--;
    }
    hero.xp = 0;
    E.recalc(hero);
    hero.hp = hero.maxHp; hero.mp = hero.maxMp;

    state.revived = false; state.x2used = false; state.invSel = -1;

    show('battle');
    E.resize();
    E.startRun(hero, training);
    if (dev() && !training) E.world.gold = 999999;
    YA.gameplayStart();
    YA.hideBanner();
    buildSkillbar();
    $('train-panel').style.display = training ? '' : 'none';
    $('bh-wave').style.display = training ? 'none' : '';
    $('hud-map').textContent = E.world.map ? E.world.map.name : '';
    updateHud(true);
    setAuto(false);
  }

  function endRun() {
    if (!E.world.hero) return;
    E.stop(); YA.gameplayStop();
    var w = E.world;
    if (state.training) { backToMenu(); return; }
    var s = D.soulsFor(w.wave, w.kills);
    state.pendingSouls = s;
    if (w.wave > YA.save.best) YA.save.best = w.wave;
    YA.save.souls += s;
    YA.commit(true);

    $('over-wave').textContent = w.wave;
    $('over-kills').textContent = w.kills;
    $('over-souls').textContent = fmt(s);
    $('btn-revive').style.display = (state.revived || !YA.hasAds()) ? 'none' : '';
    $('btn-x2').style.display = (state.x2used || !YA.hasAds()) ? 'none' : '';
    closeAllOv(); openOv('over');
    YA.showBanner();
  }

  function backToMenu() {
    closeAllOv(); E.stop(); YA.gameplayStop();
    state.training = false;
    show('menu'); refreshMenu(); YA.showBanner();
  }

  /* ---------------- HUD ---------------- */
  var hc = {};
  function setBar(id, txtId, val, max) {
    $(id).style.transform = 'scaleX(' + Math.max(0, Math.min(1, val / max)) + ')';
    if (txtId) {
      var s = Math.round(val) + ' / ' + Math.round(max);
      if (hc[txtId] !== s) { $(txtId).textContent = s; hc[txtId] = s; }
    }
  }

  function updateHud(force) {
    var w = E.world, h = w.hero;
    if (!h) return;
    setBar('hud-hp', 'hud-hp-txt', h.hp, h.maxHp);
    setBar('hud-mp', 'hud-mp-txt', h.mp, h.maxMp);
    setBar('hud-xp', null, h.xp, D.xpToLevel(h.level));

    if (hc.wave !== w.wave) { $('hud-wave').textContent = w.wave; hc.wave = w.wave; }
    if (hc.gold !== w.gold) { $('hud-gold').textContent = goldText(); hc.gold = w.gold; }
    if (hc.lvl !== h.level) { $('hud-hlvl').textContent = h.level; hc.lvl = h.level; }
    if (hc.pts !== h.pts) {
      $('hud-skillpts').textContent = h.pts;
      $('hud-skillpts').style.display = h.pts > 0 ? '' : 'none';
      hc.pts = h.pts;
    }
    if (state.training) {
      var dps = Math.round(w.dps);
      if (hc.dps !== dps) { $('hud-dps').textContent = fmt(dps); hc.dps = dps; }
    }
    if (force) $('hud-hname').textContent = T(h.name);
    updateSkillbar();
    if (force) renderHudItems();
  }

  function renderHudItems() {
    var box = $('hud-items'), h = E.world.hero;
    box.innerHTML = '';
    for (var i = 0; i < INV_SLOTS; i++) {
      var el = document.createElement('div');
      el.className = 'isl';
      var it = h.items[i];
      if (it) {
        el.classList.add('full');
        el.style.borderColor = D.RARITY[it.t].c;
        el.style.background = 'linear-gradient(180deg,' + D.RARITY[it.t].c + '33,rgba(0,0,0,.5))';
        el.textContent = it.name.charAt(0);
      }
      box.appendChild(el);
    }
  }

  /* ---------------- панель умений ---------------- */
  function buildSkillbar() {
    var bar = $('skillbar'), h = E.world.hero;
    bar.innerHTML = '';
    var slot = 0;
    h.skills.forEach(function (s, i) {
      if (s.type === 'passive') return;
      slot++;
      var b = document.createElement('div');
      b.className = 'sb' + (s.type === 'reagent' ? ' sb-elem' : '');
      b.style.background = 'linear-gradient(180deg,' + s.color + ',rgba(0,0,0,.62))';
      b.innerHTML = '<span class="key">' + slot + '</span><span class="gl">' + s.icon + '</span>' +
        '<div class="cd" style="display:none"></div>';
      b.dataset.idx = i;
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (E.world.auto) { toast('Автобой включён'); return; }
        E.castSkill(E.world.hero, i);
      });
      bar.appendChild(b);
    });

    if (h.invoker) {
      var inv = document.createElement('div');
      inv.className = 'sb sb-invoke';
      inv.id = 'sb-invoke';
      inv.innerHTML = '<span class="key">4</span><span class="gl" id="inv-icon">✦</span>' +
        '<div class="cd" style="display:none"></div>';
      inv.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (E.world.auto) { toast('Автобой включён'); return; }
        E.castInvoke(E.world.hero);
      });
      bar.appendChild(inv);
      $('reagent-bar').style.display = '';
    } else {
      $('reagent-bar').style.display = 'none';
    }
  }

  function updateSkillbar() {
    var h = E.world.hero;
    $$('#skillbar .sb').forEach(function (b) {
      if (b.id === 'sb-invoke') return;
      var i = +b.dataset.idx, s = h.skills[i];
      var lv = (h.skillLv[s.id] || 0) - 1, cd = h.cds[s.id] || 0;
      var el = b.querySelector('.cd');
      if (lv < 0) { el.style.display = 'flex'; el.textContent = '🔒'; b.classList.remove('ready'); return; }
      if (cd > 0) { el.style.display = 'flex'; el.textContent = cd.toFixed(cd < 3 ? 1 : 0); }
      else el.style.display = 'none';
      var noMana = h.mp < (s.mana[lv] || 0);
      b.classList.toggle('nomana', noMana);
      b.classList.toggle('ready', cd <= 0 && !noMana);
      b.classList.toggle('toggled', s.type === 'toggle' && !!h.toggles[s.id]);
      if (s.type === 'reagent') b.querySelector('.key').textContent = (+b.dataset.idx) + 1;
    });

    if (h.invoker) renderReagents(h);
  }

  function renderReagents(h) {
    var bar = $('reagent-bar');
    var slots = bar.querySelectorAll('.rg-slot');
    for (var i = 0; i < 3; i++) {
      var e = h.reagents[i];
      var el = slots[i];
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
    var sp = h.reagents.length === 3 ? D.INVOKE[D.comboKey(h.reagents)] : null;
    var nameEl = $('rg-name');
    var btn = $('sb-invoke');
    if (sp) {
      nameEl.textContent = sp.name;
      nameEl.style.color = sp.color;
      if (btn) {
        btn.style.background = 'linear-gradient(180deg,' + sp.color + ',rgba(0,0,0,.62))';
        $('inv-icon').textContent = sp.icon;
        var cd = h.invokeCds[sp.key] || 0;
        var cdEl = btn.querySelector('.cd');
        if (cd > 0) { cdEl.style.display = 'flex'; cdEl.textContent = cd.toFixed(cd < 3 ? 1 : 0); }
        else cdEl.style.display = 'none';
        btn.classList.toggle('ready', cd <= 0 && h.mp >= sp.mana);
        btn.classList.toggle('nomana', h.mp < sp.mana);
      }
    } else {
      nameEl.textContent = 'выберите 3 стихии';
      nameEl.style.color = 'var(--dim)';
      if (btn) {
        btn.style.background = 'linear-gradient(180deg,#3a3550,rgba(0,0,0,.62))';
        $('inv-icon').textContent = '✦';
        btn.querySelector('.cd').style.display = 'none';
        btn.classList.remove('ready');
      }
    }
  }

  /* ---------------- лавка ---------------- */
  function openShop() {
    state.invSel = -1;
    renderShopAll();
    $('btn-next-wave').textContent = state.training ? 'ЗАКРЫТЬ' : T('СЛЕДУЮЩАЯ ВОЛНА');
    openOv('shop');
  }
  function renderShopAll() {
    renderInv(); renderStatStrip(); renderShopGrid();
    $$('.hud-gold').forEach(function (e) { e.textContent = goldText(); });
    renderHudItems();
  }
  function sellPrice(it) { return Math.round(it.cost * D.SELL_RATE); }

  function renderInv() {
    var box = $('inv-slots'), h = E.world.hero;
    box.innerHTML = '';
    for (var i = 0; i < INV_SLOTS; i++) {
      (function (idx) {
        var it = h.items[idx];
        var el = document.createElement('div');
        el.className = 'isl' + (it ? ' full' : '') + (state.invSel === idx ? ' sel' : '');
        if (it) {
          el.style.borderColor = D.RARITY[it.t].c;
          el.style.background = 'linear-gradient(180deg,' + D.RARITY[it.t].c + '2e,rgba(0,0,0,.4))';
          el.textContent = it.name.split(' ')[0];
          el.onclick = function () {
            state.invSel = state.invSel === idx ? -1 : idx;
            renderInv();
          };
        }
        box.appendChild(el);
      })(i);
    }
    renderSellPanel();
  }

  function renderSellPanel() {
    var p = $('sell-panel'), h = E.world.hero;
    var it = h.items[state.invSel];
    if (!it) { p.style.display = 'none'; p.innerHTML = ''; return; }
    p.style.display = '';
    p.innerHTML = '<div class="sp-info"><b style="color:' + D.RARITY[it.t].c + '">' + it.name + '</b><p>' + it.d + '</p></div>';
    var btn = document.createElement('button');
    btn.className = 'btn btn-sell';
    btn.innerHTML = 'ПРОДАТЬ · <span class="ic ic-gold"></span> ' + fmt(sellPrice(it));
    btn.onclick = function () {
      var item = h.items[state.invSel];
      if (!item) return;
      E.world.gold += sellPrice(item);
      h.items.splice(state.invSel, 1);
      E.recalc(h);
      state.invSel = -1;
      E.SFX.sell();
      toast('Продано за ' + fmt(sellPrice(item)));
      renderShopAll();
    };
    p.appendChild(btn);
  }

  function renderStatStrip() {
    var h = E.world.hero, s = h.stats;
    var box = $('stat-strip');
    box.innerHTML = attrBlock(s.str, s.agi, s.int, h.primary);
    var rows = [
      ['УРОН', Math.round(s.atk)], ['БРОНЯ', s.armor.toFixed(1)],
      ['ЗДОРОВЬЕ', Math.round(s.hp)], ['МАНА', Math.round(s.mp)],
      ['СК. АТАКИ', s.as.toFixed(2)], ['СКОРОСТЬ', Math.round(s.ms)],
      ['КРИТ', Math.round(s.crit) + '%'], ['ВАМПИРИЗМ', Math.round(s.lifesteal) + '%'],
      ['СИЛА ЗАКЛ.', Math.round(s.sp)], ['МАГ. РЕЗИСТ', Math.round(s.mr * 100) + '%'],
      ['ПЕРЕЗАРЯДКА', '-' + Math.round(s.cdr) + '%'], ['РЕГЕН', s.hpReg.toFixed(1)]
    ];
    var g = document.createElement('div');
    g.className = 'stat-grid';
    rows.forEach(function (r) {
      var el = document.createElement('div');
      el.className = 'st';
      el.innerHTML = '<small>' + r[0] + '</small><b>' + r[1] + '</b>';
      g.appendChild(el);
    });
    box.appendChild(g);
  }

  function renderShopGrid() {
    var box = $('shop-grid'), h = E.world.hero;
    box.innerHTML = '';
    D.ITEMS.filter(function (it) { return state.shopFilter === 0 || it.t === state.shopFilter; })
      .forEach(function (it) {
        var owned = h.items.some(function (o) { return o.id === it.id; });
        var can = !owned && (gold() >= it.cost || dev() || state.training) && h.items.length < INV_SLOTS;
        var rc = D.RARITY[it.t].c;
        var el = document.createElement('div');
        el.className = 'item ' + (owned ? 'owned' : (can ? 'can' : 'cant'));
        el.style.borderColor = owned ? '#3ddb7f' : rc + (can ? 'aa' : '44');
        el.innerHTML =
          '<b style="color:' + rc + '">' + it.name + '</b><p>' + it.d + '</p>' +
          '<div class="price"><span class="ic ic-gold"></span>' + (owned ? 'куплено' : fmt(it.cost)) + '</div>';
        if (can) {
          el.onclick = function () {
            if (h.items.length >= INV_SLOTS) { toast('Инвентарь полон'); return; }
            if (!spendGold(it.cost)) { toast('Не хватает золота'); return; }
            h.items.push(it); E.recalc(h); E.SFX.buy();
            renderShopAll();
          };
        }
        box.appendChild(el);
      });
  }

  /* ---------------- автозакуп ---------------- */
  function itemScore(it, h) {
    var s = it.s, p = h.primary, caster = p === 'int', v = 0;
    v += (s.atk || 0) * 1.0;
    v += (s.str || 0) * (p === 'str' ? 2.4 : 1.4);
    v += (s.agi || 0) * (p === 'agi' ? 2.4 : 1.2);
    v += (s.int || 0) * (p === 'int' ? 2.4 : 1.0);
    v += (s.armor || 0) * 3.2;
    v += (s.asPct || 0) * (h.base.range > 150 ? .7 : .55);
    v += (s.crit || 0) * .9;
    v += (s.lifesteal || 0) * 1.1;
    v += (s.sp || 0) * (caster ? .85 : .12);
    v += (s.cdr || 0) * (caster ? 2.2 : 1.2);
    v += (s.ms || 0) * .16;
    v += (s.mr || 0) * 100 * .35;
    v += (s.hpReg || 0) * 1.3;
    v += (s.range || 0) * (h.base.range > 150 ? .12 : 0);
    return v;
  }

  function autoBuy(silent) {
    var h = E.world.hero, bought = 0, guard = 0;
    while (h.items.length < INV_SLOTS && guard++ < 12) {
      var best = null, bestV = 0;
      D.ITEMS.forEach(function (it) {
        if (h.items.some(function (o) { return o.id === it.id; })) return;
        if (!dev() && !state.training && it.cost > E.world.gold) return;
        var v = itemScore(it, h);
        if (v > bestV) { bestV = v; best = it; }
      });
      if (!best) break;
      spendGold(best.cost); h.items.push(best); bought++;
    }
    E.recalc(h);
    if (bought) { E.SFX.buy(); if (!silent) toast('Куплено предметов: ' + bought); }
    else if (!silent) toast('Нечего купить');
    renderShopAll();
  }

  function autoLevel(silent) {
    var h = E.world.hero, spent = 0, guard = 0;
    while (h.pts > 0 && guard++ < 24) {
      var cap = maxSkillLv(h.level), best = null, bestLv = 99;
      h.skills.forEach(function (s) {
        var lv = h.skillLv[s.id] || 0;
        if (lv >= cap) return;
        if (lv < bestLv) { bestLv = lv; best = s; }
      });
      if (!best) break;
      h.skillLv[best.id] = bestLv + 1; h.pts--; spent++;
    }
    E.recalc(h);
    if (spent) { E.SFX.lvl(); buildSkillbar(); }
    else if (!silent) toast('Нужен уровень героя выше');
    renderSkillUp();
  }

  /* ---------------- прокачка ---------------- */
  function openSkills() { renderSkillUp(); openOv('skills'); }

  function renderSkillUp() {
    var h = E.world.hero, box = $('skill-up-list');
    $('hud-pts').textContent = h.pts;
    box.innerHTML = '';
    var slot = 0;
    h.skills.forEach(function (s) {
      var lv = h.skillLv[s.id] || 0, cap = maxSkillLv(h.level);
      if (s.type !== 'passive') slot++;
      var row = document.createElement('div');
      row.className = 'su';
      var pips = '';
      for (var i = 0; i < MAX_SKILL_LV; i++) pips += '<div class="pip' + (i < lv ? ' on' : '') + '"></div>';
      row.innerHTML =
        '<div class="sk-ic" style="background:' + s.color + '">' + s.icon + '</div>' +
        '<div class="su-info"><b>' + s.name +
        (s.type !== 'passive' ? ' <span class="kbd">' + slot + '</span>' : ' <span class="kbd">П</span>') +
        ' <span class="dim">ур. ' + lv + '</span></b>' +
        '<p>' + s.desc(Math.max(0, lv - 1)) + '</p><div class="su-pips">' + pips + '</div></div>';
      var btn = document.createElement('button');
      btn.className = 'btn btn-main';
      btn.textContent = '+';
      btn.disabled = h.pts <= 0 || lv >= cap;
      btn.onclick = function () {
        if (h.pts <= 0 || lv >= cap) return;
        h.skillLv[s.id] = lv + 1; h.pts--;
        E.recalc(h); E.SFX.lvl();
        renderSkillUp(); buildSkillbar();
      };
      row.appendChild(btn);
      box.appendChild(row);
    });
    if (h.invoker) box.appendChild(buildComboTable());
  }

  /* ---------------- волна пройдена ---------------- */
  function onWaveClear(wave) {
    var h = E.world.hero;
    E.world.gold += D.goldPerWave(wave);
    h.xp += D.xpPerWave(wave);
    while (h.xp >= D.xpToLevel(h.level) && h.level < MAX_HERO_LV) {
      h.xp -= D.xpToLevel(h.level);
      h.level++; h.pts++;
      E.recalc(h);
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .2);
      E.SFX.lvl(); toast('Новый уровень!');
    }
    E.recalc(h);
    updateHud(true);
    if (E.world.auto) { autoLevel(true); autoBuy(true); }
    var go = function () { openShop(); };
    if (wave >= 2 && wave % 3 === 0) YA.interstitial(go); else go();
  }

  /* ---------------- автобой ---------------- */
  function setAuto(v) {
    E.world.auto = v;
    var b = $('btn-auto');
    b.textContent = 'АВТО: ' + (v ? 'ВКЛ' : 'ВЫКЛ');
    b.classList.toggle('on', v);
    $('mob-ctl').classList.toggle('on', !v && isTouch);
    $('skillbar').classList.toggle('dimmed', v);
  }

  /* ---------------- управление ---------------- */
  var isTouch = false;
  var moveKeys = {
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right'
  };
  var castMap = { Digit1: 0, Digit2: 1, Digit3: 2, KeyQ: 0, KeyE: 1, KeyR: 2 };
  var invokeKeys = { Digit4: 1, KeyF: 1 };

  function activeSkillIndex(n) {
    var h = E.world.hero; if (!h) return -1;
    var c = 0;
    for (var i = 0; i < h.skills.length; i++) {
      if (h.skills[i].type === 'passive') continue;
      if (c === n) return i;
      c++;
    }
    return -1;
  }

  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (state.screen !== 'battle' || e.repeat) return;
      var k = moveKeys[e.code];
      if (k) { E.input[k] = 1; e.preventDefault(); return; }
      if (castMap[e.code] !== undefined) {
        var i = activeSkillIndex(castMap[e.code]);
        if (i >= 0 && !E.world.auto) E.castSkill(E.world.hero, i);
        e.preventDefault(); return;
      }
      if (invokeKeys[e.code]) {
        if (!E.world.auto && E.world.hero && E.world.hero.invoker) E.castInvoke(E.world.hero);
        e.preventDefault(); return;
      }
      if (e.code === 'Space') { setAuto(!E.world.auto); e.preventDefault(); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); e.preventDefault(); }
    });
    document.addEventListener('keyup', function (e) {
      var k = moveKeys[e.code];
      if (k) { E.input[k] = 0; e.preventDefault(); }
    });
    root.addEventListener('blur', function () {
      E.input.up = E.input.down = E.input.left = E.input.right = 0;
    });
  }

  function bindStick() {
    var stick = $('stick'), knob = $('stick-knob');
    var cx = 0, cy = 0, R = 46, pid = null;
    function start(e) {
      isTouch = true;
      $('mob-ctl').classList.toggle('on', !E.world.auto);
      var r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width / 2 - 8;
      pid = e.pointerId; stick.setPointerCapture(pid); move(e);
    }
    function move(e) {
      if (pid === null || e.pointerId !== pid) return;
      var dx = e.clientX - cx, dy = e.clientY - cy;
      var d = Math.sqrt(dx * dx + dy * dy) || .001;
      var cl = Math.min(1, d / R), nx = dx / d * cl, ny = dy / d * cl;
      E.input.stick.on = true; E.input.stick.x = nx; E.input.stick.y = ny;
      knob.style.transform = 'translate(' + (nx * R) + 'px,' + (ny * R) + 'px)';
      e.preventDefault();
    }
    function end() {
      if (pid === null) return;
      pid = null;
      E.input.stick.on = false; E.input.stick.x = E.input.stick.y = 0;
      knob.style.transform = '';
    }
    stick.addEventListener('pointerdown', start);
    stick.addEventListener('pointermove', move);
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    root.addEventListener('touchstart', function () {
      if (isTouch) return;
      isTouch = true;
      if (state.screen === 'battle') $('mob-ctl').classList.toggle('on', !E.world.auto);
    }, { passive: true, once: true });
  }

  /* ---------------- пауза ---------------- */
  function togglePause() {
    if (state.screen !== 'battle' || E.world.over) return;
    var p = !E.world.paused;
    E.pause(p);
    if (p) {
      $('btn-quit').style.display = '';
      $('btn-quit').textContent = state.training ? 'ВЫЙТИ С ПОЛИГОНА' : T('СДАТЬСЯ');
      $('btn-resume').textContent = T('ПРОДОЛЖИТЬ');
      openOv('pause'); E.SFX.mute(true);
    } else { closeOv('pause'); E.SFX.mute(false); }
  }

  /* ---------------- как играть ---------------- */
  function fillHowto() {
    $('howto-body').innerHTML =
      '<h3>ЦЕЛЬ</h3><p>Отбивайте волны врагов. Каждая пятая волна — босс. ' +
      'Чем дальше зайдёте, тем больше душ получите в конце забега.</p>' +
      '<h3>ХАРАКТЕРИСТИКИ</h3><p>' +
      '<b style="color:' + D.ATTR_COLOR.str + '">Сила</b> — здоровье и его восстановление. ' +
      '<b style="color:' + D.ATTR_COLOR.agi + '">Ловкость</b> — броня и скорость атаки. ' +
      '<b style="color:' + D.ATTR_COLOR.int + '">Интеллект</b> — мана и сила заклинаний. ' +
      'Главный атрибут (со звёздочкой) дополнительно даёт урон атаки.</p>' +
      '<h3>УМЕНИЯ</h3><p>У каждого героя три активных умения и одно пассивное. ' +
      'Активные качаются за очки, которые дают уровни. Кап уровня умения растёт вместе с уровнем героя.</p>' +
      '<h3>АРКАН И СВЯЗКИ</h3><p>У Аркана вместо обычных умений три стихии: ' +
      '<b style="color:' + ELEM_COLOR.F + '">Пламя</b>, <b style="color:' + ELEM_COLOR.I + '">Лёд</b> и ' +
      '<b style="color:' + ELEM_COLOR.S + '">Шторм</b>. Нажимайте их в любом порядке — последние три ' +
      'складываются в связку. Кнопка <kbd>4</kbd> (или <kbd>F</kbd>) вызывает заклинание этой связки. ' +
      'Всего 10 связок. Чем выше уровни использованных стихий, тем сильнее заклинание.</p>' +
      '<h3>УПРАВЛЕНИЕ НА КОМПЬЮТЕРЕ</h3><p>Движение — <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> или стрелки. ' +
      'Умения — <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> (дубли <kbd>Q</kbd> <kbd>E</kbd> <kbd>R</kbd>), вызов — <kbd>4</kbd>. ' +
      'Автобой — <kbd>Пробел</kbd>, пауза — <kbd>Esc</kbd>. Атака идёт автоматически.</p>' +
      '<h3>УПРАВЛЕНИЕ НА ТЕЛЕФОНЕ</h3><p>Слева джойстик, справа кнопки умений. Всё делается одной рукой.</p>' +
      '<h3>АРЕНЫ</h3><p>У каждого героя своя арена со своим ландшафтом. Скалы, колонны и деревья ' +
      'блокируют движение — за ними можно прятаться от стрелков. Лава жжёт, лёд замедляет.</p>' +
      '<h3>УЧЕБНЫЙ ПОЛИГОН</h3><p>Отдельный режим из меню: все умения сразу максимального уровня, ' +
      'бесконечное золото, манекены с бесконечным здоровьем и счётчик урона в секунду. ' +
      'Можно вызывать любых врагов и боссов, чтобы проверить сборку.</p>' +
      '<h3>ЛАВКА</h3><p>Между волнами тратьте золото на предметы — до 6 штук. ' +
      'Ненужное продаётся обратно за 60% цены: нажмите на предмет в инвентаре.</p>' +
      '<h3>ВРАГИ</h3><p>Гнойник взрывается вплотную. Гнилодух лечит союзников — убивайте первым. ' +
      'Панцирник держит много брони. Проклятая замедляет. Гнус нападает роем.</p>' +
      '<h3>ДУШИ</h3><p>Постоянная валюта. В разделе «Герои» открывают новых бойцов и повышают их ' +
      'стартовый уровень. Прогресс сохраняется автоматически.</p>';
  }

  /* ---------------- события ---------------- */
  function bind() {
    $('btn-play').onclick = function () {
      if (!YA.save.seenHowto) {
        YA.save.seenHowto = true; YA.commit();
        state.pendingStart = true; fillHowto(); openOv('howto');
        return;
      }
      startRun(false);
    };
    $('btn-training').onclick = function () { startRun(true); };
    $('btn-heroes').onclick = function () {
      state.selHero = YA.save.selected;
      show('heroes'); renderHeroes(); renderHeroDetail();
    };
    $('btn-howto').onclick = function () { fillHowto(); openOv('howto'); };
    $('btn-settings').onclick = function () {
      openOv('pause');
      $('btn-resume').textContent = T('ГОТОВО');
      $('btn-quit').style.display = 'none';
    };

    $$('[data-back]').forEach(function (b) { b.onclick = backToMenu; });
    $$('[data-close]').forEach(function (b) {
      b.onclick = function () {
        closeOv(b.dataset.close);
        if (b.dataset.close === 'howto' && state.pendingStart) {
          state.pendingStart = false; startRun(false);
        }
      };
    });

    $('btn-auto').onclick = function () { setAuto(!E.world.auto); };
    $('btn-pause').onclick = togglePause;
    $('btn-resume').onclick = function () {
      closeOv('pause');
      if (state.screen === 'battle' && !E.world.over) { E.pause(false); E.SFX.mute(false); }
      $('btn-resume').textContent = T('ПРОДОЛЖИТЬ');
    };
    $('btn-quit').onclick = function () {
      if (state.screen !== 'battle') { closeOv('pause'); return; }
      closeOv('pause'); E.pause(false); endRun();
    };

    $('btn-next-wave').onclick = function () {
      closeOv('shop');
      if (!state.training) E.nextWave();
      updateHud(true);
    };
    $('btn-lvlup').onclick = openSkills;
    $('btn-autobuy').onclick = function () { autoBuy(false); };
    $('btn-autolevel').onclick = function () { autoLevel(false); };

    $$('.shop-tab').forEach(function (t) {
      t.onclick = function () {
        state.shopFilter = +t.dataset.t;
        $$('.shop-tab').forEach(function (x) { x.classList.toggle('on', x === t); });
        renderShopGrid();
      };
    });

    // полигон
    $('tr-mob').onclick = function () { E.spawnTrainingEnemy('mob'); };
    $('tr-boss').onclick = function () { E.spawnTrainingEnemy('boss'); };
    $('tr-clear').onclick = function () { E.clearTrainingEnemies(); toast('Арена очищена'); };
    $('tr-shop').onclick = openShop;
    $('tr-skills').onclick = openSkills;

    $('btn-again').onclick = function () { closeAllOv(); YA.hideBanner(); startRun(false); };
    $('btn-revive').onclick = function () {
      YA.rewarded(function () {
        state.revived = true;
        closeAllOv(); YA.hideBanner();
        E.revive(); show('battle'); updateHud(true);
      }, function (ok) { if (!ok) toast('Реклама недоступна'); });
    };
    $('btn-x2').onclick = function () {
      YA.rewarded(function () {
        state.x2used = true;
        YA.save.souls += state.pendingSouls || 0;
        YA.commit(true);
        $('over-souls').textContent = fmt((state.pendingSouls || 0) * 2);
        $('btn-x2').style.display = 'none';
        refreshMenu(); E.SFX.buy();
      }, function (ok) { if (!ok) toast('Реклама недоступна'); });
    };

    $('opt-sound').onchange = function () { YA.save.sound = this.checked; E.SFX.set(this.checked); YA.commit(); };
    $('opt-shake').onchange = function () { YA.save.shake = this.checked; E.setShake(this.checked); YA.commit(); };

    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('selectstart', function (e) { e.preventDefault(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  }

  /* ---------------- публично ---------------- */
  root.UI = {
    toast: toast,
    boot: function () {
      bind(); bindKeyboard(); bindStick();
      $('opt-sound').checked = YA.save.sound !== false;
      $('opt-shake').checked = YA.save.shake !== false;
      E.SFX.set(YA.save.sound !== false);
      E.setShake(YA.save.shake !== false);
      state.selHero = YA.save.selected;
      refreshMenu(); show('menu'); YA.showBanner();
    },
    onWaveClear: onWaveClear,
    onDeath: function () {
      if (state.training) {
        // на полигоне смерть не заканчивает сессию
        setTimeout(function () { E.revive(); toast('Возрождение на полигоне'); }, 800);
        return;
      }
      setTimeout(endRun, 800);
    },
    onUpdate: function () { if (state.screen === 'battle') updateHud(false); },
    refreshMenu: refreshMenu,
    show: show
  };

})(window);
