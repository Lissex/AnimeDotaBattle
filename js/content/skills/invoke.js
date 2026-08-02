/* content/skills/invoke — 10 связок Аркана.
   Ключ — отсортированная строка из трёх реагентов (F/I/S).
   pw = сумма уровней использованных стихий, от 3 до 12. */
AA.module('content/invoke', (function () {
  'use strict';

  function g() { return AA.Game.api; }

  /** Каноничный ключ связки: FIS в любом порядке даёт 'FIS'. */
  function key(reagents) { return reagents.slice().sort().join(''); }

  var SPELLS = {

    FFF: {
      key: 'FFF', name: 'Испепеление', icon: '☀', color: '#ff3a10', cd: 11, mana: 130,
      desc: 'Колонна огня по одной цели: 130 + 95 за силу связки магического урона.',
      cast: function (u, pw) {
        var a = g(), t = a.pickTarget(u, 760);
        if (!t) return false;
        var x = t.x, y = t.y;
        a.telegraph(x, y, 92, '#ff3a10', .4, function () {
          a.pillar(x, y, '#ff3a10');
          a.aoeAt(u, x, y, 92, 130 + 95 * pw, 'magic');
          a.burst(x, y, '#ff3a10', 40);
          a.shake(15); a.hitstop(.08); a.flash('#ff6a2f', .2);
        });
        return true;
      }
    },

    III: {
      key: 'III', name: 'Ледяная тюрьма', icon: '🧊', color: '#4aa8ff', cd: 14, mana: 140,
      desc: 'Замораживает всех вокруг на 1 + 0.22 за силу связки секунд, урон 60 + 45 за силу.',
      cast: function (u, pw) {
        var a = g();
        a.ring(u.x, u.y, 300, '#4aa8ff'); a.shake(9);
        return a.aoeApply(u, u.x, u.y, 300, function (e) {
          a.damage(u, e, 60 + 45 * pw, 'magic');
          a.buff(e, { id: 'freeze', dur: 1 + .22 * pw, stun: true, color: '#4aa8ff' });
        }) > 0;
      }
    },

    SSS: {
      key: 'SSS', name: 'Гнев небес', icon: '🌩', color: '#c9a0ff', cd: 12, mana: 135,
      desc: 'Буря молний: 4 + сила связки переходов по 70 + 55 за силу магического урона.',
      cast: function (u, pw) {
        var a = g(), t = a.pickTarget(u, 700);
        if (!t) return false;
        a.chainLightning(u, t, 70 + 55 * pw, 4 + pw, .88, '#c9a0ff');
        a.shake(8); a.flash('#c9a0ff', .16);
        return true;
      }
    },

    FFI: {
      key: 'FFI', name: 'Расплав', icon: '🌡', color: '#ff8a3a', cd: 13, mana: 130,
      desc: 'Расплавленная лужа на 6 сек: 25 + 22 за силу связки урона в секунду и -6 брони внутри.',
      cast: function (u, pw) {
        var a = g(), c = a.bestCluster(u, 190, 620);
        if (!c) return false;
        a.zone({
          x: c.x, y: c.y, r: 190, dur: 6, src: u, color: '#ff8a3a', style: 'lava',
          onTick: function (z, dt) {
            a.aoeAt(u, z.x, z.y, z.r, (25 + 22 * pw) * dt, 'magic');
            a.aoeApply(u, z.x, z.y, z.r, function (e) {
              a.buff(e, { id: 'melt', dur: .5, armor: -6, quiet: true });
            });
          }
        });
        return true;
      }
    },

    FFS: {
      key: 'FFS', name: 'Хаос-метеор', icon: '☄', color: '#ff7a2f', cd: 15, mana: 150,
      desc: 'Катящийся метеор проходит через всех: 90 + 70 за силу связки урона и поджог.',
      cast: function (u, pw) {
        var a = g(), t = a.pickTarget(u, 900);
        var ang = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        a.projectile({
          from: u, angle: ang, speed: 330, r: 30, color: '#ff7a2f',
          range: 900, pierce: 99, trail: true, big: true, spin: true,
          onHit: function (x) {
            a.damage(u, x, 90 + 70 * pw, 'magic');
            a.buff(x, { id: 'ignite', dur: 4, dps: 20 + 12 * pw, dmgType: 'magic', src: u, color: '#ff9a3a' });
            a.burst(x.x, x.y, '#ff7a2f', 12);
          }
        });
        a.shake(7);
        return true;
      }
    },

    FIS: {
      key: 'FIS', name: 'Оглушающий взрыв', icon: '💠', color: '#7fd4ff', cd: 13, mana: 140,
      desc: 'Конус ударной волны: 80 + 62 за силу связки урона, отбрасывание и оглушение на 1.2 сек.',
      cast: function (u, pw) {
        var a = g(), t = a.pickTarget(u, 700);
        var ang = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        a.cone(u, ang, 460, 1.0, '#7fd4ff', function (e) {
          a.damage(u, e, 80 + 62 * pw, 'magic');
          a.knockback(e, u, 150);
          a.buff(e, { id: 'freeze', dur: 1.2, stun: true, color: '#7fd4ff' });
        });
        a.shake(10); a.hitstop(.06);
        return true;
      }
    },

    FII: {
      key: 'FII', name: 'Стена льда', icon: '🧱', color: '#a8e4ff', cd: 12, mana: 125,
      desc: 'Стена изо льда на 7 сек: 20 + 18 за силу связки урона в секунду и замедление 60%.',
      cast: function (u, pw) {
        var a = g(), t = a.pickTarget(u, 600);
        var ang = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        a.wall(u, ang, 300, 7, '#a8e4ff', function (e, dt) {
          a.damage(u, e, (20 + 18 * pw) * dt, 'magic');
          a.buff(e, { id: 'slow', dur: .5, msMul: .4, quiet: true });
        });
        return true;
      }
    },

    FSS: {
      key: 'FSS', name: 'Ускорение', icon: '⏫', color: '#ffd24a', cd: 16, mana: 120,
      desc: 'На 8 сек: +8% за силу связки скорости атаки и передвижения, атаки бьют молнией.',
      cast: function (u, pw) {
        var a = g();
        a.buff(u, {
          id: 'alacrity', dur: 8, asMul: 1 + .08 * pw, ms: 12 * pw,
          zap: 14 * pw, color: '#ffd24a', glow: '#ffd24a'
        });
        a.ring(u.x, u.y, 120, '#ffd24a');
        return true;
      }
    },

    IIS: {
      key: 'IIS', name: 'Морозный шаг', icon: '👻', color: '#a8e4ff', cd: 15, mana: 110,
      desc: 'Невидимость на 2 + 0.4 за силу связки секунд, +40% скорости и лечение 8% в секунду.',
      cast: function (u, pw) {
        var a = g();
        a.buff(u, {
          id: 'invis', dur: 2 + .4 * pw, invis: true, ambush: 2,
          msMul: 1.4, regenPct: 8, color: '#a8e4ff'
        });
        a.burst(u.x, u.y, '#a8e4ff', 24);
        return true;
      }
    },

    ISS: {
      key: 'ISS', name: 'Смерч', icon: '🌪', color: '#9ad4ff', cd: 14, mana: 145,
      desc: 'Смерч летит по линии, подбрасывая врагов: 70 + 58 за силу связки урона и оглушение 1.8 сек.',
      cast: function (u, pw) {
        var a = g(), t = a.pickTarget(u, 900);
        var ang = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        a.projectile({
          from: u, angle: ang, speed: 560, r: 26, color: '#9ad4ff',
          range: 900, pierce: 99, trail: true, big: true, spin: true,
          onHit: function (x) {
            a.damage(u, x, 70 + 58 * pw, 'magic');
            a.buff(x, { id: 'freeze', dur: 1.8, stun: true, color: '#9ad4ff' });
            a.burst(x.x, x.y, '#9ad4ff', 14);
          }
        });
        return true;
      }
    }
  };

  return {
    SPELLS: SPELLS,
    key: key,
    get: function (reagents) { return reagents.length === 3 ? SPELLS[key(reagents)] : null; },
    /** id умения-стихии по букве реагента. */
    skillIdOf: function (elem) {
      return elem === 'F' ? 'elemFire' : elem === 'I' ? 'elemIce' : 'elemStorm';
    }
  };
})());
