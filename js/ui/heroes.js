/* ui/heroes — экран выбора героя: список, карточка, покупка и апгрейд. */
AA.module('ui/heroes', (function () {
  'use strict';

  var selected = null;

  function D() { return AA.UI.dom; }

  function open() {
    selected = D().save().selected;
    AA.UI.screens.show('heroes');
    renderList();
    renderDetail();
  }

  /* ---------------- список ---------------- */
  function renderList() {
    var d = D(), list = d.$('hero-list');
    list.innerHTML = '';

    AA.Content.heroes.LIST.forEach(function (h) {
      var open_ = d.unlocked(h.id);
      var card = d.el('div', 'hero-card' + (selected === h.id ? ' sel' : '') + (open_ ? '' : ' locked'));

      var pw = d.el('div', 'hero-portrait');
      pw.appendChild(AA.Render.portrait.element(48, h));
      card.appendChild(pw);

      var A = AA.Content.attributes;
      card.appendChild(d.el('div', 'hc-info',
        '<b>' + d.t(h.name) + '</b>' +
        '<small style="color:' + A.COLOR[h.primary] + '">' +
        (open_ ? A.NAME[h.primary] : d.t('ОТКРЫТЬ')) + '</small>'));

      if (!open_) {
        card.appendChild(d.el('div', 'hero-lock',
          '<span class="ic ic-soul"></span>' + d.fmt(h.cost)));
      }

      card.onclick = function () { selected = h.id; renderList(); renderDetail(); };
      list.appendChild(card);
    });

    AA.UI.menu.refresh();
  }

  /* ---------------- карточка ---------------- */
  function renderDetail() {
    var d = D(), A = AA.Content.attributes;
    var h = AA.Content.heroes.get(selected);
    var open_ = d.unlocked(h.id);
    var box = d.$('hero-detail');
    box.innerHTML = '';

    /* заголовок */
    var top = d.el('div', 'hd-top');
    var pw = d.el('div', 'hero-portrait');
    pw.appendChild(AA.Render.portrait.element(68, h));
    top.appendChild(pw);
    top.appendChild(d.el('div', null,
      '<div class="hd-name">' + d.t(h.name) + '</div>' +
      '<div class="hd-role">' + d.t(h.role) + '</div>' +
      '<div class="hd-map">Арена: ' + AA.Content.maps.get(h.id).name + '</div>'));
    box.appendChild(top);

    box.appendChild(d.el('p', 'hd-tip', h.tip));

    /* атрибуты на первом уровне — герой всегда стартует с него */
    var str = h.attr.str;
    var agi = h.attr.agi;
    var int_ = h.attr.int;
    var prim = h.primary === 'str' ? str : h.primary === 'agi' ? agi : int_;

    var wrap = d.el('div', null, d.attrBlock(str, agi, int_, h.primary));
    box.appendChild(wrap.firstChild);

    var C = A.ATTR;
    var stats = [
      ['ЗДОРОВЬЕ', d.fmt(C.BASE_HP + str * C.HP_PER_STR)],
      ['МАНА', d.fmt(C.BASE_MP + int_ * C.MP_PER_INT)],
      ['УРОН', d.fmt(h.base.atk + prim * C.DMG_PER_PRIMARY)],
      ['БРОНЯ', (h.base.armor + agi * C.ARMOR_PER_AGI).toFixed(1)],
      ['СК. АТАКИ', (h.base.as * (1 + agi * C.AS_PER_AGI)).toFixed(2)],
      ['СКОРОСТЬ', d.fmt(h.base.ms)],
      ['ДАЛЬНОСТЬ', d.fmt(h.base.range)],
      ['СИЛА ЗАКЛ.', d.fmt(int_ * C.SP_PER_INT)]
    ];
    var grid = d.el('div', 'hd-stats');
    stats.forEach(function (s) {
      grid.appendChild(d.el('div', 'st', '<small>' + s[0] + '</small><b>' + s[1] + '</b>'));
    });
    box.appendChild(grid);

    /* облики */
    if (open_) box.appendChild(skinRow(h));

    /* умения */
    box.appendChild(skillList(h));
    if (h.invoker) box.appendChild(AA.UI.skilltree.comboTable());

    /* прирост за уровень — важнее стартовых чисел */
    box.appendChild(d.el('div', 'hd-growth',
      'Прирост за уровень: ' +
      '<b style="color:' + A.COLOR.str + '">' + h.gain.str.toFixed(1) + '</b> / ' +
      '<b style="color:' + A.COLOR.agi + '">' + h.gain.agi.toFixed(1) + '</b> / ' +
      '<b style="color:' + A.COLOR.int + '">' + h.gain.int.toFixed(1) + '</b>' +
      ' · уровень даётся за каждую волну, за босса сразу два'));

    /* кнопки */
    box.appendChild(footer(h, open_));
  }

  /* ---------------- облики ----------------
     Дефолт скромный, покупной за души, имморталка за рекламу. */
  function skinRow(hero) {
    var d = D(), S = AA.Content.skins;
    var save = d.save();
    var current = save.skins[hero.id] || 'default';

    var row = d.el('div', 'skin-row', '<div class="skin-head">ОБЛИКИ</div>');
    var list = d.el('div', 'skin-list');

    S.listFor(hero.id).forEach(function (skin) {
      var key = S.key(hero.id, skin.id);
      var owned = skin.tier === 0 || d.isDev() || save.ownedSkins.indexOf(key) >= 0;

      var card = d.el('div',
        'skin-card skin-t' + skin.tier +
        (current === skin.id ? ' on' : '') + (owned ? '' : ' locked'));

      var prev = d.el('div', 'skin-preview');
      prev.appendChild(AA.Render.portrait.element(52, hero, skin));
      card.appendChild(prev);

      card.appendChild(d.el('b', null, skin.name));

      var label;
      if (owned) label = current === skin.id ? 'НАДЕТ' : 'НАДЕТЬ';
      else if (skin.ad) label = 'ЗА РЕКЛАМУ';
      else label = d.fmt(skin.cost) + ' ♦';
      card.appendChild(d.el('small', null, label));

      card.onclick = function () { pickSkin(hero, skin, owned); };
      list.appendChild(card);
    });

    row.appendChild(list);
    return row;
  }

  function pickSkin(hero, skin, owned) {
    var d = D(), S = AA.Content.skins, save = d.save();
    var key = S.key(hero.id, skin.id);

    function equip() {
      save.skins[hero.id] = skin.id;
      AA.Platform.storage.commit(true);
      AA.Core.audio.buy();
      renderDetail();
    }

    if (owned) { equip(); return; }

    if (skin.ad) {
      if (!AA.Platform.sdk.hasAds()) { AA.UI.toast.show('Реклама недоступна'); return; }
      AA.Platform.sdk.rewarded(function () {
        save.ownedSkins.push(key);
        equip();
        AA.UI.toast.show('Открыт облик: ' + skin.name);
      }, function (ok) { if (!ok) AA.UI.toast.show('Реклама недоступна'); });
      return;
    }

    if (!d.spendSouls(skin.cost)) { AA.UI.toast.show('Не хватает душ'); return; }
    save.ownedSkins.push(key);
    equip();
    AA.UI.menu.refresh();
    AA.UI.toast.show('Открыт облик: ' + skin.name);
  }

  function skillList(h) {
    var d = D(), wrap = d.el('div', 'hd-skills'), slot = 0;
    AA.Content.skills.resolve(h.skills).forEach(function (s) {
      var active = s.type !== 'passive';
      if (active) slot++;
      var kind = s.type === 'passive' ? 'ПАССИВНОЕ'
        : s.type === 'reagent' ? ('СТИХИЯ · клавиша ' + slot)
          : s.type === 'toggle' ? ('ПЕРЕКЛЮЧАЕМОЕ · клавиша ' + slot)
            : ('АКТИВНОЕ · клавиша ' + slot);
      var meta = s.type === 'active'
        ? (kind + ' · мана ' + s.mana[0] + ' · КД ' + s.cd[0] + ' сек')
        : kind;
      wrap.appendChild(d.el('div', 'sk-row',
        '<div class="sk-ic" data-icon="' + s.id + '" data-color="' + s.color + '"></div>' +
        '<div><b>' + s.name + '</b><p>' + s.desc(0) + '</p>' +
        '<div class="sk-meta">' + meta + '</div></div>'));
    });
    AA.UI.skilltree.fillIcons(wrap);
    return wrap;
  }

  function footer(h, open_) {
    var d = D();
    var foot = d.el('div', 'hd-foot');

    if (!open_) {
      var buy = d.el('button', 'btn btn-main', d.t('ОТКРЫТЬ') + ' — ' + d.fmt(h.cost) + ' ♦');
      buy.onclick = function () {
        if (!d.spendSouls(h.cost)) { AA.UI.toast.show('Не хватает душ'); return; }
        d.save().unlocked.push(h.id);
        d.save().selected = h.id;
        AA.Platform.storage.commit(true);
        AA.Core.audio.buy();
        AA.UI.toast.show('Герой открыт!');
        renderList(); renderDetail();
      };
      foot.appendChild(buy);
      return foot;
    }

    // уровни больше не покупаются — герой качается прямо в бою
    var pick = d.el('button', 'btn btn-main',
      d.save().selected === h.id ? d.t('ВЫБРАН') : d.t('ВЫБРАТЬ'));
    pick.onclick = function () {
      d.save().selected = h.id;
      AA.Platform.storage.commit();
      renderList(); renderDetail();
    };
    foot.appendChild(pick);

    return foot;
  }

  return { open: open, renderList: renderList, renderDetail: renderDetail };
})());
