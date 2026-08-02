/* game/combat — урон, лечение, смерть, автоатака и перемещения
   боевого характера (рывки, притягивание, отбрасывание). */
AA.module('game/combat', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }
  function FX() { return AA.Game.effects; }
  function B() { return AA.Game.buffs; }
  function T() { return AA.Game.targeting; }
  function SFX() { return AA.Core.audio; }

  var TINY = 3;   // урон ниже этого порога не показывает цифры (ауры, DoT)

  /* ================= урон ================= */
  function damage(src, tgt, amount, type, isAuto) {
    if (!tgt || tgt.dead) return 0;
    // неуязвимая копия из Отражения не получает урона вовсе
    if (tgt.invuln) return 0;

    var w = W(), m = M(), fx = FX();
    var s = src ? src.stats : AA.Game.stats.blank();
    var dmg = amount, tiny = amount < TINY;

    // иллюзии бьют долей урона и получают кратно больше
    if (src && src.isIllusion) dmg *= src.dmgPct;
    if (tgt.isIllusion) dmg *= tgt.takenMul;

    if (type === 'magic') {
      dmg *= (1 + (s.sp || 0) / 100);
      dmg *= (1 - m.clamp(tgt.stats.mr, -.5, .8));
    } else {
      dmg *= AA.Game.stats.armorMult(tgt.stats.armor);
    }

    // талант «Раскол льда»: замороженные получают вдвое
    if (src && AA.Game.talents.has(src, 'fr_shatter') && B().has(tgt, 'freeze')) dmg *= 2;

    // свойство элиты может погасить удар
    if (tgt.elite && tgt.elite.onDamaged) {
      var mul = tgt.elite.onDamaged(tgt, dmg);
      if (typeof mul === 'number') dmg *= mul;
    }

    var crit = false;
    if (isAuto && s.crit > 0 && Math.random() * 100 < s.crit) { dmg *= s.critMult; crit = true; }
    if (isAuto && src) {
      var amb = B().get(src, 'invis');
      if (amb && amb.ambush) { dmg *= amb.ambush; crit = true; B().remove(src, 'invis'); }
    }

    dmg = tiny ? Math.max(.01, dmg) : Math.max(1, dmg);

    // щит поглощает первым
    var sh = B().get(tgt, 'shield');
    if (sh && sh.shield > 0) {
      var ab = Math.min(sh.shield, dmg);
      sh.shield -= ab; dmg -= ab;
      if (!tiny) fx.floatText(tgt.x, tgt.y - tgt.r, '-' + Math.round(ab), '#b07dff', 13);
      if (sh.shield <= 0) B().remove(tgt, 'shield');
      if (dmg <= 0) return ab;
    }

    // талант «Казнь»: добивание слабых целей автоатакой
    if (isAuto && src && AA.Game.talents.has(src, 'sh_execute') &&
      tgt !== w.hero && tgt.hp - dmg < tgt.maxHp * .12) {
      dmg = tgt.hp;
      fx.floatText(tgt.x, tgt.y - tgt.r - 20, 'КАЗНЬ', '#b07dff', 18);
    }

    tgt.hp -= dmg;
    tgt.flash = tiny ? Math.max(tgt.flash, .18) : 1;
    if (src === w.hero) w.dmgWindow.push([w.time, dmg]);

    // талант «Шипы камня»: часть урона возвращается атакующему
    if (src && src !== tgt && !src._reflecting && AA.Game.talents.has(tgt, 'go_thorns')) {
      src._reflecting = true;
      damage(tgt, src, dmg * .25, 'phys');
      src._reflecting = false;
    }

    if (!tiny) {
      fx.floatText(tgt.x + m.rnd(-9, 9), tgt.y - tgt.r - 4, Math.round(dmg),
        crit ? '#ffd24a' : (type === 'magic' ? '#8ad0ff' : '#ffffff'), crit ? 22 : 14);
      fx.sparks(tgt.x, tgt.y, crit ? '#ffd24a' : '#ffffff', crit ? 10 : 4);
      if (crit) {
        SFX().crit(); fx.hitstop(.045);
        if (tgt === w.hero) fx.flash('#ff4d5e', .18);
      } else if (isAuto) SFX().hit();
    }

    if (src && s.lifesteal > 0 && isAuto) {
      var hl = dmg * s.lifesteal / 100;
      src.hp = Math.min(src.maxHp, src.hp + hl);
      if (!tiny) fx.floatText(src.x, src.y - src.r - 14, '+' + Math.round(hl), '#3ddb7f', 12);
    }

    // отражение (Зеркальный Страж): часть урона возвращается бьющему
    var refl = B().get(tgt, 'reflect');
    if (refl && refl.reflect && src && src !== tgt && !src._reflecting) {
      src._reflecting = true;
      damage(tgt, src, dmg * refl.reflect, 'magic');
      src._reflecting = false;
      if (!tiny) fx.sparks(tgt.x, tgt.y, '#9adcff', 6);
    }

    if (tgt.hp <= 0) kill(src, tgt);
    return dmg;
  }

  function aoeAt(src, x, y, r, amount, type) {
    T().applyInCircle(src, x, y, r, function (e) { damage(src, e, amount, type); });
  }

  function heal(u, amount) {
    FX().floatText(u.x, u.y - u.r - 10, '+' + Math.round(amount), '#3ddb7f', 15);
    SFX().heal();
  }

  /* ================= смерть ================= */
  function kill(src, tgt) {
    if (tgt.dead) return;
    var w = W(), fx = FX();

    // талант «Второе дыхание»: один раз за забег смерть отменяется
    if (tgt === w.hero && AA.Game.talents.has(tgt, 'be_second_wind') && !tgt._secondWindUsed) {
      tgt._secondWindUsed = true;
      tgt.hp = 1;
      fx.ring(tgt.x, tgt.y, 260, '#ff4d5e');
      fx.flash('#ff4d5e', .4);
      fx.hitstop(.12);
      AA.UI.toast.show('Второе дыхание!');
      return;
    }

    tgt.dead = true;

    w.corpses.push({
      x: tgt.x, y: tgt.y, r: tgt.r, c: tgt.c2,
      glow: tgt.glow || tgt.c1, t: 0, life: 1.3
    });
    fx.burst(tgt.x, tgt.y, tgt.glow || tgt.c1, tgt.isBoss ? 52 : 16);
    fx.killFlash(tgt, tgt.glow || tgt.c1);
    SFX().die();

    if (tgt.role === 'bomber' && tgt.def) explode(tgt);
    if (tgt.elite && tgt.elite.onDeath) tgt.elite.onDeath(tgt);
    if (tgt.isDummy) { respawnDummy(tgt); return; }

    if (tgt.team === 1) {
      w.kills++;
      w.gold += tgt.gold || 0;
      if (tgt.gold) fx.floatText(tgt.x, tgt.y - 28, '+' + tgt.gold, '#ffc043', 15);
      rewardKillPassives();
      if (w.hero && !w.hero.dead) AA.Game.skinfx.onKill(w.hero, tgt);
      if (tgt.isBoss) { fx.shake(20); fx.flash('#fff', .3); fx.hitstop(.12); }
    } else if (tgt === w.hero) {
      fx.shake(22); SFX().lose(); fx.flash('#ff4d5e', .45); fx.hitstop(.18);
      w.over = true;
      AA.Game.loop.emitDeath();
    }
  }

  function explode(tgt) {
    var w = W(), fx = FX();
    var scale = AA.Game.run.enemyScale(w.wave);
    var dmgVal = tgt.def.boomDmg * scale, r = tgt.def.boomR;
    fx.ring(tgt.x, tgt.y, r, '#ffe04a');
    fx.burst(tgt.x, tgt.y, '#ffe04a', 34);
    SFX().boom(); fx.shake(12); fx.flash('#ffe04a', .22); fx.hitstop(.05);
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team === tgt.team) continue;
      if (M().dist(e, tgt) <= r + e.r) damage(tgt, e, dmgVal, 'magic');
    }
  }

  function respawnDummy(old) {
    FX().timer(1.2, function () {
      var w = W();
      if (!w.training || !w.running) return;
      var d = AA.Game.factory.dummy();
      d.x = old.x; d.y = old.y;
      AA.Game.world.confine(d);
      w.units.push(d);
      FX().ring(d.x, d.y, 50, '#3ddb7f');
    });
  }

  /** Пассивки, которые срабатывают на убийство (Пир Мясника). */
  function rewardKillPassives() {
    var h = W().hero;
    if (!h || h.dead || !h.skills) return;
    for (var i = 0; i < h.skills.length; i++) {
      var sk = h.skills[i], l = (h.skillLv[sk.id] || 0) - 1;
      if (l < 0 || !sk.onKill) continue;
      var gainedStr = sk.onKill(h, l) || 0;
      AA.Game.stats.recalc(h);
      h.hp = Math.min(h.maxHp, h.hp + gainedStr * AA.Content.attributes.ATTR.HP_PER_STR);
    }
  }

  function execute(src, tgt) { tgt.hp = 0; kill(src, tgt); }

  /* ================= автоатака ================= */
  function autoAttack(u, dt) {
    u.atkCd -= dt;
    if (u.atkCd > 0 || B().isStunned(u) || u.leap) return;
    if (u.role === 'bomber' || u.role === 'healer' || u.role === 'dummy') return;

    var m = M(), t;
    if (u.team === 1) {
      t = T().enemyTarget(u);
      if (u.tauntT > 0 && u.tauntBy && !u.tauntBy.dead) t = u.tauntBy;
      if (!t || m.dist(u, t) > u.stats.range + u.r + t.r) return;
    } else if (u.isIllusion && u.lockTarget) {
      // копия из Отражения бьёт только свою жертву
      t = u.lockTarget;
      if (t.dead || m.dist(u, t) > u.stats.range + u.r + t.r) return;
    } else {
      t = T().nearest(u, u.stats.range + u.r);
      if (!t) return;
    }

    u.atkCd = 1 / Math.max(.15, u.stats.as);
    u.face = m.angleTo(u, t);
    u.swing = .22;

    var onHit = makeOnHit(u);
    var color = u.magic ? (u.glow || '#c08aff') : (u.team === 1 ? (u.glow || u.c1) : u.c1);

    if (u.stats.range > 150) {
      /* --- дальний бой: вспышка у оружия, отдача, снаряд --- */
      var mx = u.x + Math.cos(u.face) * u.r * 1.5;
      var my = u.y + Math.sin(u.face) * u.r * 1.5;
      FX().muzzle(mx, my, u.face, color);
      FX().sparks(mx, my, color, 4);
      u.recoilT = .12;
      AA.Game.projectiles.spawn({
        from: u, to: t, speed: 820, r: u.magic ? 7 : 5,
        color: color, trail: true, homing: true, onHit: onHit
      });
    } else {
      /* --- ближний бой: широкая дуга замаха --- */
      FX().swipe(u, u.face, u.stats.range + u.r * 1.4, color);
      FX().slash(u, t, color);
      onHit(t);
    }
  }

  /** Собирает эффекты удара: раскол, молнии Ускорения, пассивки. */
  function makeOnHit(u) {
    var cleaveB = B().get(u, 'cleave');
    var zapB = B().get(u, 'alacrity');
    return function (target) {
      var dealt = damage(u, target, u.stats.atk, u.magic ? 'magic' : 'phys', true);

      if (u.role === 'hexer') B().add(target, { id: 'hex', dur: 2, msMul: .6, color: '#ff4ad0' });
      if (u.elite && u.elite.onHit) u.elite.onHit(u, target, dealt);

      if (cleaveB) {
        var w = W(), m = M(), extra = dealt * cleaveB.cleavePct / 100;
        for (var i = 0; i < w.units.length; i++) {
          var e = w.units[i];
          if (e.dead || e.team === u.team || e === target) continue;
          if (m.d2(e.x, e.y, target.x, target.y) <= cleaveB.cleaveR * cleaveB.cleaveR) {
            damage(u, e, extra, 'phys');
          }
        }
        FX().ring(target.x, target.y, cleaveB.cleaveR, '#ffb03a');
      }

      if (zapB && zapB.zap) {
        FX().bolt(u.x, u.y, target.x, target.y, '#ffd24a', .18);
        damage(u, target, zapB.zap, 'magic');
      }

      if (u.skills) {
        for (var s = 0; s < u.skills.length; s++) {
          var sk = u.skills[s], lv = (u.skillLv[sk.id] || 0) - 1;
          if (lv >= 0 && sk.onAttack) sk.onAttack(u, lv, target);
        }
      }

      // эффект имморталки — только визуал, урона не добавляет
      if (u === W().hero) AA.Game.skinfx.onHit(u, target);

      // эйдолон делится надвое после серии атак
      if (u.isEidolon && u.canSplit) {
        u.hits++;
        if (u.hits >= u.splitAt) AA.Game.factory.splitEidolon(u);
      }
    };
  }

  /* ================= перемещения ================= */
  function pull(target, toward, gap) {
    var a = M().angleTo(toward, target);
    target.x = toward.x + Math.cos(a) * gap;
    target.y = toward.y + Math.sin(a) * gap;
    AA.Game.world.confine(target);
    B().add(target, { id: 'freeze', dur: .5, stun: true, color: '#d9a05b' });
  }

  function knockback(e, from, d) {
    var a = M().angleTo(from, e);
    e.x += Math.cos(a) * d; e.y += Math.sin(a) * d;
    AA.Game.world.confine(e);
  }

  function recoil(u, d) {
    u.x -= Math.cos(u.face) * d;
    u.y -= Math.sin(u.face) * d;
    AA.Game.world.confine(u);
  }

  function blinkBehind(u, t, gap) {
    var a = M().angleTo(u, t);
    FX().burst(u.x, u.y, '#b07dff', 12);
    u.x = t.x + Math.cos(a) * gap;
    u.y = t.y + Math.sin(a) * gap;
    u.face = a + Math.PI;
    AA.Game.world.confine(u);
    FX().burst(u.x, u.y, '#b07dff', 10);
  }

  function dashTo(u, t, gap, color) {
    var a = M().angleTo(u, t);
    for (var i = 0; i < 9; i++) {
      var k = i / 9;
      FX().burst(u.x + (t.x - u.x) * k, u.y + (t.y - u.y) * k, color || '#fff', 2);
    }
    u.x = t.x - Math.cos(a) * gap;
    u.y = t.y - Math.sin(a) * gap;
    u.face = a;
    AA.Game.world.confine(u);
  }

  /** Прыжок по дуге; onLand вызывается при приземлении. */
  function leapTo(u, x, y, dur, onLand) {
    u.leap = { fx: u.x, fy: u.y, tx: x, ty: y, t: 0, dur: dur, onLand: onLand };
  }

  function updateLeap(u, dt) {
    u.leap.t += dt;
    var k = Math.min(1, u.leap.t / u.leap.dur);
    u.x = u.leap.fx + (u.leap.tx - u.leap.fx) * k;
    u.y = u.leap.fy + (u.leap.ty - u.leap.fy) * k;
    u.airZ = Math.sin(k * Math.PI) * 60;
    if (k >= 1) {
      var f = u.leap.onLand;
      u.leap = null; u.airZ = 0;
      if (f) f();
    }
  }

  /* ================= цепная молния ================= */
  function chainLightning(src, first, dmgVal, jumps, falloff, color) {
    var w = W(), m = M();
    var cur = first, seen = {}, d = dmgVal, px = src.x, py = src.y;
    for (var i = 0; i < jumps && cur; i++) {
      seen[cur.id] = 1;
      FX().bolt(px, py, cur.x, cur.y, color);
      px = cur.x; py = cur.y;
      damage(src, cur, d, 'magic');
      d *= falloff;
      var next = null, best = 1e9;
      for (var j = 0; j < w.units.length; j++) {
        var e = w.units[j];
        if (e.dead || e.team === src.team || seen[e.id]) continue;
        var dd = m.dist(cur, e);
        if (dd < 330 && dd < best) { best = dd; next = e; }
      }
      cur = next;
    }
    SFX().cast();
  }

  return {
    damage: damage, aoeAt: aoeAt, heal: heal, kill: kill, execute: execute,
    autoAttack: autoAttack, chainLightning: chainLightning,
    pull: pull, knockback: knockback, recoil: recoil,
    blinkBehind: blinkBehind, dashTo: dashTo, leapTo: leapTo, updateLeap: updateLeap
  };
})());
