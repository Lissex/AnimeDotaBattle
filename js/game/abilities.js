/* game/abilities — применение умений и система связок Аркана.
   Проверки (уровень, мана, перезарядка, оглушение) в одном месте. */
AA.module('game/abilities', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function toast(msg) { if (AA.UI && AA.UI.toast) AA.UI.toast.show(msg); }

  /** Фактическая перезарядка с учётом сокращения и талантов. */
  function cooldown(u, skill, lvl) {
    var base = skill.cd[lvl] - AA.Game.talents.cdBonus(u, skill.id);
    return Math.max(.5, base) * (1 - u.stats.cdr / 100);
  }

  /**
   * Применить умение по индексу в списке героя.
   * @returns {boolean} получилось ли
   */
  function cast(u, idx) {
    if (!u || u.dead || W().paused) return false;
    var sk = u.skills[idx];
    if (!sk) return false;

    var lv = (u.skillLv[sk.id] || 0) - 1;
    if (lv < 0) { toast('Умение не изучено'); return false; }
    if (sk.type === 'passive') return false;
    if (AA.Game.buffs.isStunned(u)) return false;

    // стихии Аркана бесплатны и без перезарядки — они лишь набирают связку
    if (sk.type === 'reagent') {
      sk.cast(u, lv);
      AA.Core.audio.orb();
      return true;
    }

    if ((u.cds[sk.id] || 0) > 0) return false;

    var cost = sk.mana[lv] || 0;
    if (u.mp < cost) { toast('Мало маны'); return false; }

    if (sk.cast(u, lv) === false) {
      if (u === W().hero && !W().auto) toast('Нет цели');
      return false;
    }

    u.mp -= cost;
    u.cds[sk.id] = cooldown(u, sk, lv);
    u.castFx = .3;
    AA.Core.audio.cast();
    if (u === W().hero) AA.Game.skinfx.onCast(u);
    return true;
  }

  /* ================= связки Аркана ================= */

  /** Добавить реагент; в связке всегда три последних. */
  function addReagent(u, elem) {
    u.reagents.push(elem);
    if (u.reagents.length > 3) u.reagents.shift();
    var color = elem === 'F' ? '#ff5a2f' : elem === 'I' ? '#7fd4ff' : '#c9a0ff';
    AA.Game.effects.burst(u.x, u.y, color, 8);
  }

  function elemLevel(u, elem) {
    return u.skillLv[AA.Content.invoke.skillIdOf(elem)] || 0;
  }

  /** Сила связки — сумма уровней трёх стихий, от 3 до 12. */
  function invokePower(u) {
    if (u.reagents.length < 3) return 0;
    var p = 0, i;
    var bonus = AA.Game.talents.has(u, 'ar_all_elements') ? 1 : 0;   // «Мастер стихий»
    for (i = 0; i < 3; i++) p += elemLevel(u, u.reagents[i]) + bonus;

    // «Чистая стихия»: три одинаковых реагента бьют сильнее
    if (AA.Game.talents.has(u, 'ar_elem_boost') &&
      u.reagents[0] === u.reagents[1] && u.reagents[1] === u.reagents[2]) {
      p = Math.round(p * 1.6);
    }
    // Осколок Аганима у Аркана добавляет силы всем связкам
    for (i = 0; i < u.items.length; i++) if (u.items[i].shard) { p += 2; break; }

    return p;
  }

  function currentSpell(u) {
    return u.invoker ? AA.Content.invoke.get(u.reagents) : null;
  }

  function castInvoke(u) {
    if (!u || u.dead || W().paused) return false;
    if (AA.Game.buffs.isStunned(u)) return false;
    if (u.reagents.length < 3) { toast('Нужно 3 реагента'); return false; }

    var spell = currentSpell(u);
    if (!spell) return false;
    if ((u.invokeCds[spell.key] || 0) > 0) return false;
    if (u.mp < spell.mana) { toast('Мало маны'); return false; }

    if (spell.cast(u, invokePower(u)) === false) {
      if (!W().auto) toast('Нет цели');
      return false;
    }

    u.mp -= spell.mana;
    var cdMul = AA.Game.talents.has(u, 'ar_quick_invoke') ? .65 : 1;
    u.invokeCds[spell.key] = spell.cd * cdMul * (1 - u.stats.cdr / 100);
    u.castFx = .35;
    AA.Core.audio.cast();

    // талант «Эхо связки»: каждая третья срабатывает дважды
    if (AA.Game.talents.has(u, 'ar_double_invoke')) {
      u._invokeCount = (u._invokeCount || 0) + 1;
      if (u._invokeCount % 3 === 0) {
        var pw = invokePower(u);
        AA.Game.effects.timer(.35, function () { if (!u.dead) spell.cast(u, pw); });
      }
    }
    return true;
  }

  /** Тик перезарядок умений и связок. */
  function tickCooldowns(u, dt) {
    var k;
    for (k in u.cds) if (u.cds[k] > 0) u.cds[k] = Math.max(0, u.cds[k] - dt);
    if (u.invokeCds) {
      for (k in u.invokeCds) if (u.invokeCds[k] > 0) u.invokeCds[k] = Math.max(0, u.invokeCds[k] - dt);
    }
  }

  /** Постоянные эффекты умений (ауры, переключаемые). */
  function tickSkills(u, dt) {
    if (!u.skills) return;
    for (var i = 0; i < u.skills.length; i++) {
      var sk = u.skills[i], lv = (u.skillLv[sk.id] || 0) - 1;
      if (lv >= 0 && sk.tick) sk.tick(u, lv, dt);
    }
  }

  /** Индекс n-го непассивного умения — для раскладки клавиш 1/2/3. */
  function activeIndex(u, n) {
    var c = 0;
    for (var i = 0; i < u.skills.length; i++) {
      if (u.skills[i].type === 'passive') continue;
      if (c === n) return i;
      c++;
    }
    return -1;
  }

  return {
    cast: cast, cooldown: cooldown,
    addReagent: addReagent, castInvoke: castInvoke,
    elemLevel: elemLevel, invokePower: invokePower, currentSpell: currentSpell,
    tickCooldowns: tickCooldowns, tickSkills: tickSkills, activeIndex: activeIndex
  };
})());
