/* game/ai — автобой за игрока, поведение мобов и способности боссов. */
AA.module('game/ai', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }
  function T() { return AA.Game.targeting; }
  function AB() { return AA.Game.abilities; }
  function FX() { return AA.Game.effects; }

  /* ================================================
                       АВТОБОЙ
     ================================================ */

  /** Какую связку хочет Аркан в текущей ситуации. */
  function preferredCombo(near, danger, target) {
    if (danger) return ['I', 'I', 'S'];              // морозный шаг: уйти
    if (near >= 3) return ['I', 'I', 'I'];           // заморозить толпу
    if (near === 2) return ['S', 'S', 'S'];          // цепные молнии
    if (target && target.isBoss) return ['F', 'F', 'F'];
    return ['F', 'F', 'S'];
  }

  function autoInvoke(u, near, danger, target) {
    var ab = AB(), inv = AA.Content.invoke;
    var want = preferredCombo(near, danger, target)
      .filter(function (e) { return ab.elemLevel(u, e) > 0; });

    if (want.length < 3) {
      var have = ['F', 'I', 'S'].filter(function (e) { return ab.elemLevel(u, e) > 0; });
      if (!have.length) return;
      while (want.length < 3) want.push(have[want.length % have.length]);
    }

    var key = inv.key(want);
    if ((u.invokeCds[key] || 0) > 0) return;
    var spell = inv.SPELLS[key];
    if (!spell || u.mp < spell.mana + 20) return;

    // сначала выставляем связку, кастуем на следующем кадре
    if (inv.key(u.reagents) !== key || u.reagents.length < 3) {
      u.reagents = want.slice();
      return;
    }
    ab.castInvoke(u);
  }

  /** Стоит ли применять умение прямо сейчас. */
  function shouldCast(sk, ctx) {
    switch (sk.ai) {
      case 'aoe': return ctx.near >= 2 || (ctx.target.isBoss && ctx.dist < (sk.radius || 220));
      case 'escape': return ctx.danger;
      case 'gap': return ctx.melee ? ctx.dist > 150 : (ctx.danger && ctx.dist < 200);
      case 'finish': return !!T().lowestHp(ctx.u, sk.range || 300);
      case 'buff': return ctx.near >= 1;
      default: return ctx.dist < (sk.range || 560);
    }
  }

  function autoSkills(u, ctx) {
    var ab = AB();
    for (var i = 0; i < u.skills.length; i++) {
      var sk = u.skills[i], lv = (u.skillLv[sk.id] || 0) - 1;
      if (lv < 0 || sk.type === 'passive') continue;

      if (sk.type === 'toggle') {
        var wantOn = ctx.near >= 1 && u.mp > u.maxMp * .25;
        if (!!u.toggles[sk.id] !== wantOn) ab.cast(u, i);
        continue;
      }
      if ((u.cds[sk.id] || 0) > 0 || u.mp < sk.mana[lv]) continue;
      if (shouldCast(sk, ctx)) ab.cast(u, i);
    }
  }

  /** Вектор ухода от опасностей и препятствий. */
  function avoidance(u) {
    var w = W(), m = M(), vx = 0, vy = 0, i, d, a;

    for (i = 0; i < w.tele.length; i++) {                 // площадные атаки боссов
      var te = w.tele[i];
      d = Math.sqrt(m.d2(u.x, u.y, te.x, te.y));
      if (d < te.r + u.r + 24) {
        a = Math.atan2(u.y - te.y, u.x - te.x);
        vx += Math.cos(a) * 2.4; vy += Math.sin(a) * 2.4;
      }
    }
    for (i = 0; i < w.units.length; i++) {                // подрывники
      var e = w.units[i];
      if (e.dead || e.team === u.team || e.role !== 'bomber') continue;
      d = m.dist(u, e);
      if (d < 195) {
        a = Math.atan2(u.y - e.y, u.x - e.x);
        vx += Math.cos(a) * 1.5; vy += Math.sin(a) * 1.5;
      }
    }
    for (i = 0; i < w.props.length; i++) {                // ландшафт
      var p = w.props[i];
      if (!p.meta.solid) continue;
      d = Math.sqrt(m.d2(u.x, u.y, p.x, p.y));
      if (d < p.r + u.r + 34) {
        a = Math.atan2(u.y - p.y, u.x - p.x);
        vx += Math.cos(a) * 1.1; vy += Math.sin(a) * 1.1;
      }
    }
    if (u.x < w.PAD + 95) vx += .9;                       // не жаться к краю
    if (u.x > w.w - w.PAD - 95) vx -= .9;
    if (u.y < w.PAD + 95) vy += .9;
    if (u.y > w.h - w.PAD - 95) vy -= .9;

    return { x: vx, y: vy };
  }

  function autopilot(u, dt) {
    var m = M(), t = T().pick(u);
    if (!t) { u.vx *= .8; u.vy *= .8; return; }

    var ctx = {
      u: u, target: t,
      dist: m.dist(u, t),
      melee: u.stats.range < 160,
      near: T().countThreats(u, 215),
      danger: false
    };
    ctx.danger = (u.hp / u.maxHp) < .35 || ctx.near >= 4;

    if (u.invoker) autoInvoke(u, ctx.near, ctx.danger, t);
    else autoSkills(u, ctx);

    // дистанция боя: ближники прижимаются, стрелки держат край дальности
    var want = ctx.melee ? u.stats.range * .75 : u.stats.range * .8;
    if (!ctx.melee && ctx.danger) want = u.stats.range * .98;

    var a = m.angleTo(u, t), mv = { x: 0, y: 0 };
    if (ctx.dist > want + 20) { mv.x = Math.cos(a); mv.y = Math.sin(a); }
    else if (ctx.dist < want - 45) { mv.x = -Math.cos(a); mv.y = -Math.sin(a); }

    // руна рядом — стоит сделать крюк за ней
    var rune = AA.Game.runes.nearest(u, 520);
    if (rune && !ctx.danger) {
      var ra = Math.atan2(rune.y - u.y, rune.x - u.x);
      mv.x += Math.cos(ra) * 1.6;
      mv.y += Math.sin(ra) * 1.6;
    }

    var av = avoidance(u);
    mv.x += av.x; mv.y += av.y;

    var len = Math.sqrt(mv.x * mv.x + mv.y * mv.y);
    if (len > .05) { u.vx = mv.x / len; u.vy = mv.y / len; }
    else { u.vx *= .8; u.vy *= .8; }
    u.face = a;
  }

  /* ================================================
                      ВРАГИ
     ================================================ */
  function enemy(u, dt) {
    if (u.role === 'dummy') { u.vx = u.vy = 0; return; }

    var m = M(), target = T().enemyTarget(u);
    if (u.tauntT > 0) {
      u.tauntT -= dt;
      if (u.tauntBy && !u.tauntBy.dead) target = u.tauntBy;
    }

    if (!target) { wander(u, dt); return; }

    // ужас: цель разворачивается и бежит прочь, драться не может
    var fear = AA.Game.buffs.get(u, 'fear');
    if (fear && fear.fear) {
      var af = m.angleTo(target, u);
      u.face = af;
      u.vx = Math.cos(af); u.vy = Math.sin(af);
      if (Math.random() < dt * 6) FX().sparks(u.x, u.y - u.r, '#8a2ad8', 1);
      return;
    }

    if (u.role === 'healer') { healerLogic(u, dt, target); return; }

    // поддержка работает фоном и не мешает обычному движению
    if (u.role === 'howler') howlerAura(u, dt);
    if (u.role === 'warlock') warlockShield(u, dt);
    if (u.role === 'lunger' && lungerLeap(u, dt, target)) return;

    var d = m.dist(u, target), a = m.angleTo(u, target);
    u.face = a;
    var want = u.role === 'bomber' ? 0 : u.stats.range * .82;
    if (d > want) { u.vx = Math.cos(a); u.vy = Math.sin(a); }
    else { u.vx *= .82; u.vy *= .82; }

    if (u.role === 'bomber' && d < u.r + target.r + 14) AA.Game.combat.kill(null, u);
  }

  /* ---------------- поведение новых видов ---------------- */

  /** Ревун: разгоняет всех своих вокруг. Пока жив — толпа быстрее. */
  function howlerAura(u, dt) {
    var w = W(), m = M(), def = u.def;
    var r = def.auraR;

    // на арене бывает под сорок юнитов, а ревунов сразу несколько —
    // обходим список четыре раза в секунду, а не каждый кадр
    u.auraT = (u.auraT || 0) - dt;
    if (u.auraT > 0) return;
    u.auraT = .25;

    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team !== u.team || e === u) continue;
      if (m.d2(e.x, e.y, u.x, u.y) > r * r) continue;
      AA.Game.buffs.add(e, {
        id: 'howl', dur: .45, asMul: def.auraAs, msMul: def.auraMs,
        quiet: true, color: '#c88aff'
      });
    }

    u.howlT = (u.howlT || 0) + dt;
    if (u.howlT > .8) { u.howlT = 0; FX().aura(u, r, 'rgba(200,138,255,.09)'); }
  }

  /** Чернокнижник: раз в несколько секунд накрывает соседей щитом. */
  function warlockShield(u, dt) {
    var w = W(), m = M(), def = u.def;
    u.shieldT = (u.shieldT || m.rnd(0, 3)) - dt;
    if (u.shieldT > 0) return;
    u.shieldT = def.shieldCd;

    var amount = 60 * AA.Game.run.enemyScale(w.wave);
    var n = 0;
    for (var i = 0; i < w.units.length && n < 5; i++) {
      var e = w.units[i];
      if (e.dead || e.team !== u.team) continue;
      if (m.d2(e.x, e.y, u.x, u.y) > def.shieldR * def.shieldR) continue;
      AA.Game.buffs.add(e, { id: 'shield', dur: 8, shield: amount, color: '#8a7aff' });
      FX().bolt(u.x, u.y, e.x, e.y, '#8a7aff', .25);
      n++;
    }
    if (n) FX().ring(u.x, u.y, def.shieldR, '#8a7aff');
  }

  /** Прыгун: перелетает к герою, дистанция от него не спасает. */
  function lungerLeap(u, dt, target) {
    var m = M(), def = u.def;
    u.leapT = (u.leapT || m.rnd(1, 4)) - dt;
    if (u.leapT > 0 || u.leap) return false;

    var d = m.dist(u, target);
    if (d < 180 || d > def.leapRange) return false;

    u.leapT = def.leapCd;
    FX().telegraph(target.x, target.y, 70, '#5ac8ff', .35, function () {
      if (u.dead || target.dead) return;
      AA.Game.combat.leapTo(u, target.x, target.y, .32, function () {
        FX().ring(u.x, u.y, 110, '#5ac8ff');
        FX().sparks(u.x, u.y, '#5ac8ff', 10);
      });
    });
    return true;
  }

  /** Герой пропал из виду (невидимость) — враг бродит. */
  function wander(u, dt) {
    u.wander = (u.wander || 0) - dt;
    if (u.wander <= 0) { u.wander = M().rnd(.6, 1.4); u.wa = M().rnd(0, 6.2832); }
    u.vx = Math.cos(u.wa || 0) * .4;
    u.vy = Math.sin(u.wa || 0) * .4;
  }

  function healerLogic(u, dt, target) {
    var w = W(), m = M();
    u.face = m.angleTo(u, target);
    if (m.dist(u, target) < 300) { u.vx = -Math.cos(u.face); u.vy = -Math.sin(u.face); }
    else { u.vx *= .85; u.vy *= .85; }

    u.healT = (u.healT || 0) - dt;
    if (u.healT > 0) return;
    u.healT = 1;

    var amount = u.def.healPs * AA.Game.run.enemyScale(w.wave), healed = 0;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team !== u.team || e === u) continue;
      if (m.dist(u, e) <= u.def.healR && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + amount);
        FX().floatText(e.x, e.y - e.r - 8, '+' + Math.round(amount), '#5affb0', 12);
        healed++;
      }
    }
    if (healed) FX().aura(u, u.def.healR, 'rgba(90,255,176,.06)');
  }

  /* ================================================
                   СПОСОБНОСТИ БОССОВ
     Каждая: { range, run(ctx) }.
     ctx = { u, hero, scale, dist, rage } — rage true во второй фазе.
     Вернуть false, если применить сейчас нельзя.
     ================================================ */
  function C() { return AA.Game.combat; }

  var BOSS = {

    /* ---------- Костяной Владыка ---------- */
    boneStorm: function (c) {
      var u = c.u, r = 200 + c.u.r * 2;
      FX().telegraph(u.x, u.y, r, '#ffe8a0', .8, function () {
        if (u.dead) return;
        C().aoeAt(u, u.x, u.y, r, 95 * c.scale, 'phys');
        T().applyInCircle(u, u.x, u.y, r, function (e) {
          AA.Game.buffs.add(e, { id: 'slow', dur: 2, msMul: .55, color: '#ffe8a0' });
        });
        FX().ring(u.x, u.y, r, '#ffe8a0');
        FX().shake(14); FX().hitstop(.05); AA.Core.audio.boom();
      });
      return true;
    },

    boneSpears: function (c) {
      var u = c.u, m = M();
      var base = m.angleTo(u, c.hero);
      var count = c.rage ? 7 : 5;
      for (var i = 0; i < count; i++) {
        AA.Game.projectiles.spawn({
          from: u, angle: base + (i - (count - 1) / 2) * .22,
          speed: 620, r: 8, color: '#e8e4d4', range: 760, pierce: 2, trail: true,
          onHit: function (t) {
            C().damage(u, t, 55 * c.scale, 'phys');
            FX().burst(t.x, t.y, '#e8e4d4', 8);
          }
        });
      }
      FX().shake(5);
      return true;
    },

    raiseDead: function (c) {
      var u = c.u, m = M();
      var count = c.rage ? 4 : 3;
      FX().ring(u.x, u.y, 150, '#ffe8a0');
      for (var i = 0; i < count; i++) {
        (function (k) {
          FX().timer(k * .18, function () {
            if (u.dead) return;
            var a = k / count * 6.2832 + m.rnd(0, 1);
            AA.Game.factory.minion('skeleton',
              u.x + Math.cos(a) * 90, u.y + Math.sin(a) * 90);
          });
        })(i);
      }
      return true;
    },

    /* ---------- Пожиратель Бездны ---------- */
    grab: function (c) {
      if (c.dist >= 720) return false;
      var u = c.u;
      AA.Game.projectiles.spawn({
        from: u, to: c.hero, speed: 900, r: 12, color: '#ff4a9a',
        trail: true, homing: true,
        onHit: function (t) {
          C().damage(u, t, 70 * c.scale, 'phys');
          C().pull(t, u, 72);
          FX().shake(10);
        }
      });
      return true;
    },

    devour: function (c) {
      if (c.dist > c.u.r + c.hero.r + 70) return false;
      var u = c.u;
      FX().telegraph(u.x, u.y, 130, '#ff4a9a', .45, function () {
        if (u.dead) return;
        var total = 0;
        T().applyInCircle(u, u.x, u.y, 130, function (e) {
          total += C().damage(u, e, 165 * c.scale, 'phys');
        });
        if (total > 0) {                       // сожрал — подлечился
          u.hp = Math.min(u.maxHp, u.hp + total * .8);
          C().heal(u, total * .8);
        }
        FX().burst(u.x, u.y, '#ff4a9a', 26);
        FX().shake(12); FX().hitstop(.06);
      });
      return true;
    },

    voidPools: function (c) {
      var u = c.u, m = M();
      var count = c.rage ? 4 : 3;
      for (var i = 0; i < count; i++) {
        var a = m.rnd(0, 6.2832), d = m.rnd(90, 260);
        var x = u.x + Math.cos(a) * d, y = u.y + Math.sin(a) * d;
        FX().zone({
          x: x, y: y, r: 105, dur: 8, src: u, color: '#ff4a9a',
          onTick: function (z, dt) {
            C().aoeAt(u, z.x, z.y, z.r, 42 * c.scale * dt, 'magic');
            T().applyInCircle(u, z.x, z.y, z.r, function (e) {
              AA.Game.buffs.add(e, { id: 'slow', dur: .5, msMul: .55, quiet: true });
            });
          }
        });
      }
      return true;
    },

    /* ---------- Архонт Пустоты ---------- */
    voidMeteor: function (c) {
      var u = c.u, x = c.hero.x, y = c.hero.y;
      FX().telegraph(x, y, 150, '#8ab0ff', .9, function () {
        if (u.dead) return;
        C().aoeAt(u, x, y, 150, 130 * c.scale, 'magic');
        FX().pillar(x, y, '#8ab0ff');
        FX().burst(x, y, '#8ab0ff', 30);
        FX().shake(12);
      });
      return true;
    },

    voidRift: function (c) {
      var u = c.u, m = M(), a = m.angleTo(u, c.hero);
      // предупреждение вдоль линии, затем разлом
      for (var i = 1; i <= 5; i++) {
        var x = u.x + Math.cos(a) * i * 110;
        var y = u.y + Math.sin(a) * i * 110;
        (function (px, py, k) {
          FX().telegraph(px, py, 78, '#8ab0ff', .5 + k * .08, function () {
            if (u.dead) return;
            C().aoeAt(u, px, py, 78, 85 * c.scale, 'magic');
            FX().burst(px, py, '#8ab0ff', 12);
          });
        })(x, y, i);
      }
      FX().shake(7);
      return true;
    },

    mirrorImages: function (c) {
      var u = c.u, m = M();
      var count = c.rage ? 3 : 2;
      FX().burst(u.x, u.y, '#8ab0ff', 24);
      for (var i = 0; i < count; i++) {
        var a = i / count * 6.2832 + m.rnd(0, 1);
        AA.Game.factory.minion('mirror',
          u.x + Math.cos(a) * 110, u.y + Math.sin(a) * 110);
      }
      return true;
    },

    voidBlink: function (c) {
      if (c.dist > 220) return false;          // телепорт только когда прижали
      var u = c.u, m = M(), w = W();
      FX().burst(u.x, u.y, '#8ab0ff', 20);
      var a = m.angleTo(c.hero, u);
      u.x = c.hero.x + Math.cos(a) * 380;
      u.y = c.hero.y + Math.sin(a) * 380;
      AA.Game.world.confine(u);
      AA.Game.terrain.collide(u);
      FX().burst(u.x, u.y, '#8ab0ff', 20);
      FX().ring(u.x, u.y, 120, '#8ab0ff');
      return true;
    },

    /* ---------- Кузнец Пепла ---------- */
    ashRings: function (c) {
      var u = c.u, m = M(), cx = u.x, cy = u.y;
      var waves = c.rage ? 4 : 3;
      for (var i = 0; i < waves; i++) {
        (function (k) {
          FX().timer(k * .42, function () {
            if (u.dead || !W().running) return;
            var r = 130 + k * 115;
            FX().ring(cx, cy, r, '#ffa04a');
            T().applyInCircle(u, cx, cy, r + 26, function (e) {
              if (Math.sqrt(m.d2(cx, cy, e.x, e.y)) > r - 44) {
                C().damage(u, e, 75 * c.scale, 'magic');
              }
            });
          });
        })(i);
      }
      FX().shake(9);
      return true;
    },

    hammerFall: function (c) {
      var u = c.u, m = M(), a = m.angleTo(u, c.hero);
      var tx = u.x + Math.cos(a) * 150, ty = u.y + Math.sin(a) * 150;
      FX().telegraph(tx, ty, 165, '#ffa04a', .7, function () {
        if (u.dead) return;
        C().aoeAt(u, tx, ty, 165, 145 * c.scale, 'phys');
        T().applyInCircle(u, tx, ty, 165, function (e) {
          C().knockback(e, u, 120);
          AA.Game.buffs.add(e, { id: 'freeze', dur: .9, stun: true, color: '#ffa04a' });
        });
        FX().ring(tx, ty, 165, '#ffa04a');
        FX().burst(tx, ty, '#ffa04a', 30);
        FX().shake(16); FX().hitstop(.07); AA.Core.audio.boom();
      });
      return true;
    },

    /* ---------- Хронарх: гонка со временем ---------- */
    timeField: function (c) {
      var u = c.u, h = c.hero;
      FX().zone({
        x: h.x, y: h.y, r: 200, dur: 7, src: u, color: '#8affe8',
        onTick: function (z, dt) {
          T().applyInCircle(u, z.x, z.y, z.r, function (e) {
            AA.Game.buffs.add(e, { id: 'timewarp', dur: .4, msMul: .5, asMul: .5, quiet: true });
          });
          C().aoeAt(u, z.x, z.y, z.r, 18 * c.scale * dt, 'magic');
        }
      });
      FX().ring(h.x, h.y, 200, '#8affe8');
      return true;
    },

    /** Запоминает здоровье и через несколько секунд возвращается к нему. */
    rewind: function (c) {
      var u = c.u;
      var saved = u.hp;
      FX().ring(u.x, u.y, 180, '#8affe8');
      FX().burst(u.x, u.y, '#8affe8', 22);
      AA.UI.toast.show('Хронарх запоминает миг');
      FX().timer(4.5, function () {
        if (u.dead) return;
        if (u.hp < saved) {
          FX().floatText(u.x, u.y - u.r, '+' + Math.round(saved - u.hp), '#8affe8', 18);
          u.hp = Math.min(u.maxHp, saved);
        }
        FX().ring(u.x, u.y, 220, '#8affe8');
        FX().flash('#8affe8', .2);
      });
      return true;
    },

    hasteSelf: function (c) {
      AA.Game.buffs.add(c.u, {
        id: 'chrono_haste', dur: 6, msMul: 1.7, asMul: 1.9,
        color: '#8affe8', glow: '#8affe8'
      });
      FX().ring(c.u.x, c.u.y, 140, '#8affe8');
      return true;
    },

    /* ---------- Роевая Матка: прячется за потомством ---------- */
    spawnBrood: function (c) {
      var u = c.u, m = M();
      var count = c.rage ? 6 : 4;
      FX().ring(u.x, u.y, 130, '#d0ff4a');
      for (var i = 0; i < count; i++) {
        (function (k) {
          FX().timer(k * .12, function () {
            if (u.dead) return;
            var a = m.rnd(0, 6.2832);
            AA.Game.factory.minion('brood',
              u.x + Math.cos(a) * 70, u.y + Math.sin(a) * 70);
          });
        })(i);
      }
      return true;
    },

    burrow: function (c) {
      var u = c.u, m = M(), w = W();
      FX().burst(u.x, u.y, '#d0ff4a', 28);
      FX().ring(u.x, u.y, 120, '#d0ff4a');
      AA.Game.buffs.add(u, { id: 'burrow', dur: 3, mr: .75, armor: 60, msMul: 1.6, color: '#d0ff4a' });
      // вылезает подальше от героя
      FX().timer(2.6, function () {
        if (u.dead) return;
        var a = m.rnd(0, 6.2832);
        u.x = c.hero.x + Math.cos(a) * 340;
        u.y = c.hero.y + Math.sin(a) * 340;
        AA.Game.world.confine(u);
        AA.Game.terrain.collide(u);
        FX().burst(u.x, u.y, '#d0ff4a', 30);
        FX().ring(u.x, u.y, 160, '#d0ff4a');
        FX().shake(8);
      });
      return true;
    },

    acidSpray: function (c) {
      var u = c.u, m = M(), a = m.angleTo(u, c.hero);
      FX().cone(u, a, 380, .8, '#d0ff4a', function (e) {
        C().damage(u, e, 90 * c.scale, 'magic');
        AA.Game.buffs.add(e, { id: 'acid', dur: 6, armor: -10, msMul: .85, color: '#d0ff4a' });
      });
      FX().shake(6);
      return true;
    },

    /* ---------- Зеркальный Страж: возвращает урон ---------- */
    reflectShield: function (c) {
      var u = c.u;
      AA.Game.buffs.add(u, {
        id: 'reflect', dur: 6, reflect: c.rage ? .55 : .4, mr: .2,
        color: '#9adcff', glow: '#9adcff'
      });
      FX().ring(u.x, u.y, 150, '#9adcff');
      AA.UI.toast.show('Зеркальный Страж отражает урон');
      return true;
    },

    mirrorWalls: function (c) {
      var u = c.u, m = M();
      var base = m.angleTo(u, c.hero);
      for (var i = 0; i < 3; i++) {
        var a = base + (i - 1) * 1.05;
        FX().wall(u, a, 280, 6, '#9adcff', function (e, dt) {
          C().damage(u, e, 55 * c.scale * dt, 'magic');
          AA.Game.buffs.add(e, { id: 'slow', dur: .5, msMul: .5, quiet: true });
        });
      }
      return true;
    },

    shardVolley: function (c) {
      var u = c.u, m = M(), base = m.angleTo(u, c.hero);
      var n = c.rage ? 9 : 7;
      for (var i = 0; i < n; i++) {
        AA.Game.projectiles.spawn({
          from: u, angle: base + (i - (n - 1) / 2) * .19,
          speed: 780, r: 7, color: '#c0d8e8', range: 700, pierce: 1, trail: true,
          onHit: function (t) { C().damage(u, t, 52 * c.scale, 'magic'); }
        });
      }
      return true;
    },

    /* ---------- Громовой Титан: не даёт выбрать дистанцию ---------- */
    staticField: function (c) {
      var u = c.u;
      AA.Game.buffs.add(u, {
        id: 'static', dur: 8, color: '#a0d8ff', glow: '#a0d8ff',
        onTick: function (unit, dt) {
          var m = M();
          FX().aura(unit, 260, 'rgba(160,216,255,.10)');
          T().forEachEnemy(unit, 260, function (e) {
            // чем ближе, тем больнее
            var k = 1 - m.dist(unit, e) / 260;
            C().damage(unit, e, 110 * c.scale * k * dt, 'magic');
          });
        }
      });
      FX().ring(u.x, u.y, 260, '#a0d8ff');
      return true;
    },

    chainStorm: function (c) {
      var u = c.u;
      C().chainLightning(u, c.hero, 95 * c.scale, c.rage ? 9 : 6, .9, '#a0d8ff');
      FX().flash('#a0d8ff', .16);
      FX().shake(8);
      return true;
    },

    thunderclap: function (c) {
      var u = c.u;
      FX().telegraph(u.x, u.y, 240, '#a0d8ff', .6, function () {
        if (u.dead) return;
        C().aoeAt(u, u.x, u.y, 240, 130 * c.scale, 'magic');
        T().applyInCircle(u, u.x, u.y, 240, function (e) {
          AA.Game.buffs.add(e, { id: 'freeze', dur: 1.1, stun: true, color: '#a0d8ff' });
        });
        FX().ring(u.x, u.y, 240, '#a0d8ff');
        FX().shake(15); FX().hitstop(.06); AA.Core.audio.boom();
      });
      return true;
    },

    /* ---------- Чумной Патриарх: арена гниёт ---------- */
    plaguePool: function (c) {
      var u = c.u, m = M();
      var count = c.rage ? 3 : 2;
      for (var i = 0; i < count; i++) {
        var a = m.rnd(0, 6.2832), d = m.rnd(60, 240);
        var x = c.hero.x + Math.cos(a) * d, y = c.hero.y + Math.sin(a) * d;
        FX().zone({
          x: x, y: y, r: 90, dur: 14, src: u, color: '#c8ff6a', style: 'thorn',
          onTick: function (z, dt) {
            z.r = Math.min(190, z.r + 7 * dt);          // лужа расползается
            C().aoeAt(u, z.x, z.y, z.r, 40 * c.scale * dt, 'magic');
          }
        });
      }
      return true;
    },

    infect: function (c) {
      var u = c.u;
      C().damage(u, c.hero, 60 * c.scale, 'magic');
      AA.Game.buffs.add(c.hero, {
        id: 'plague', dur: 9, dps: 45 * c.scale, dmgType: 'magic', src: u,
        hpReg: -12, color: '#c8ff6a'
      });
      FX().burst(c.hero.x, c.hero.y, '#c8ff6a', 20);
      AA.UI.toast.show('Вы заражены');
      return true;
    },

    miasma: function (c) {
      var u = c.u;
      FX().zone({
        x: u.x, y: u.y, r: 300, dur: 10, src: u, color: '#9aa82a',
        onTick: function (z, dt) {
          T().applyInCircle(u, z.x, z.y, z.r, function (e) {
            AA.Game.buffs.add(e, { id: 'miasma', dur: .5, hpReg: -20, msMul: .85, quiet: true });
          });
          C().aoeAt(u, z.x, z.y, z.r, 22 * c.scale * dt, 'magic');
        }
      });
      FX().ring(u.x, u.y, 300, '#9aa82a');
      return true;
    },

    /* ---------- Владыка Ярости: не отпускает ---------- */
    chainPull: function (c) {
      if (c.dist < 160) return false;
      var u = c.u;
      AA.Game.projectiles.spawn({
        from: u, to: c.hero, speed: 1100, r: 11, color: '#ff6a4a',
        trail: true, homing: true,
        onHit: function (t) {
          C().damage(u, t, 80 * c.scale, 'phys');
          C().pull(t, u, 80);
          FX().shake(11); FX().hitstop(.05);
        }
      });
      return true;
    },

    wrathWhirl: function (c) {
      var u = c.u;
      AA.Game.buffs.add(u, {
        id: 'wrathwhirl', dur: 5, spin: true, msMul: 1.35,
        color: '#ff6a4a', glow: '#ff6a4a',
        onTick: function (unit, dt) {
          FX().aura(unit, 170, 'rgba(255,106,74,.16)');
          C().aoeAt(unit, unit.x, unit.y, 170, 150 * c.scale * dt, 'phys');
        }
      });
      FX().ring(u.x, u.y, 170, '#ff6a4a');
      return true;
    },

    executeLeap: function (c) {
      var h = c.hero;
      if (h.hp / h.maxHp > .5) return false;        // только по раненому
      var u = c.u, tx = h.x, ty = h.y;
      FX().telegraph(tx, ty, 150, '#ff6a4a', .55, function () {
        if (u.dead) return;
        C().leapTo(u, tx, ty, .22, function () {
          C().aoeAt(u, u.x, u.y, 150, 260 * c.scale, 'phys');
          FX().ring(u.x, u.y, 150, '#ff6a4a');
          FX().burst(u.x, u.y, '#ff6a4a', 34);
          FX().shake(18); FX().hitstop(.09); FX().flash('#ff6a4a', .22);
        });
      });
      return true;
    },

    forgePillars: function (c) {
      var u = c.u, m = M(), w = W();
      var count = c.rage ? 6 : 4;
      for (var i = 0; i < count; i++) {
        (function (k) {
          FX().timer(k * .22, function () {
            if (u.dead || !W().running) return;
            var h = W().hero;
            var x = (h ? h.x : u.x) + m.rnd(-170, 170);
            var y = (h ? h.y : u.y) + m.rnd(-170, 170);
            FX().telegraph(x, y, 82, '#ffa04a', .55, function () {
              if (u.dead) return;
              FX().pillar(x, y, '#ffa04a');
              C().aoeAt(u, x, y, 82, 100 * c.scale, 'magic');
              FX().burst(x, y, '#ffa04a', 16);
            });
          });
        })(i);
      }
      return true;
    }
  };

  /** Переход во вторую фазу: перезарядки короче, урон выше. */
  function checkPhase(u) {
    if (u.phase !== 1 || !u.phaseAt) return;
    if (u.hp / u.maxHp > u.phaseAt) return;
    u.phase = 2;
    AA.Game.buffs.add(u, {
      id: 'rage', dur: 9999, atkMul: 1.3, ms: 35,
      color: u.glow, glow: u.glow
    });
    FX().ring(u.x, u.y, 260, u.glow);
    FX().flash(u.glow, .28);
    FX().shake(14);
    AA.Core.audio.boom();
    AA.UI.toast.show(u.name + ' в ярости!');
  }

  function bossAbility(u, dt) {
    checkPhase(u);

    var hero = T().heroVisibleTo(u);
    if (!hero || !u.abilities || !u.abilities.length) return;

    var rage = u.phase === 2;
    var ctx = {
      u: u, hero: hero, rage: rage,
      scale: AA.Game.run.enemyScale(W().wave) * (rage ? 1.15 : 1),
      dist: M().dist(u, hero)
    };

    // тикаем все перезарядки, применяем первое готовое умение за кадр
    var fired = false;
    for (var i = 0; i < u.abilities.length; i++) {
      var ab = u.abilities[i];
      ab.t -= dt * (rage ? 1.35 : 1);
      if (fired || ab.t > 0) continue;
      var fn = BOSS[ab.id];
      if (!fn) { ab.t = ab.cd; continue; }
      if (fn(ctx) === false) { ab.t = 1.2; continue; }   // не сложилось — пробуем скоро
      ab.t = ab.cd;
      fired = true;
    }
  }

  /* ================================================
                    ИЛЛЮЗИИ ИГРОКА
     Простое поведение: держаться цели и бить. Копия,
     привязанная к жертве Отражения, не отвлекается ни на кого.
     ================================================ */
  function illusion(u, dt) {
    var m = M();
    var target = u.lockTarget && !u.lockTarget.dead
      ? u.lockTarget
      : T().pick(u);

    if (!target) {
      // без цели держимся рядом с героем
      var h = W().hero;
      if (!h || h.dead) { u.vx = u.vy = 0; return; }
      var dh = m.dist(u, h);
      if (dh > 220) {
        var ah = m.angleTo(u, h);
        u.vx = Math.cos(ah); u.vy = Math.sin(ah);
      } else { u.vx *= .85; u.vy *= .85; }
      return;
    }

    var d = m.dist(u, target), a = m.angleTo(u, target);
    u.face = a;
    var want = u.stats.range * .8;
    if (d > want) { u.vx = Math.cos(a); u.vy = Math.sin(a); }
    else { u.vx *= .82; u.vy *= .82; }
  }

  return {
    autopilot: autopilot, enemy: enemy, illusion: illusion,
    bossAbility: bossAbility, BOSS: BOSS
  };
})());
