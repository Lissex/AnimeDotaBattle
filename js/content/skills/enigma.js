/* content/skills/enigma — Зодчий Пустоты.

   Интеллектуальный инициатор: держит толпу проклятием, давит
   призванными эйдолонами и решает бой чёрной дырой.
   Пассивное поле замедления делает опасной саму зону вокруг него.

   Архетип узнаваем, имя и облик собственные — прямое
   использование персонажа Dota 2 нарушает п.3.5 требований. */
(function () {
  'use strict';
  var S = AA.Content.skills, g = S.g;

  S.add({

    /* ================= Энергетическое проклятие (1) =================
       Три срабатывания подряд: каждое бьёт и коротко оглушает.
       Осколок расширяет каждое срабатывание на соседей цели. */
    curse: {
      id: 'curse', name: 'Энергетическое проклятие', icon: '⛓', color: '#8a5ae8',
      type: 'active', ai: 'nuke',
      mana: [100, 120, 140, 160], cd: [14, 14, 14, 14],
      dmg: [75, 120, 165, 210], stun: [.4, .5, .6, .7],
      ticks: 3, gap: 1.1, range: 620, splashR: 250,
      desc: function (l) {
        return 'Проклинает врага: ' + this.ticks + ' срабатывания подряд, каждое наносит ' +
          this.dmg[l] + ' магического урона и оглушает на ' + this.stun[l] + ' сек. ' +
          'Всего ' + (this.dmg[l] * this.ticks) + ' урона.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, this.range), self = this;
        if (!t) return false;

        var ticks = self.ticks + (a.talent(u, 'en_curse_tick') ? 1 : 0);
        var splash = a.shard(u);                       // осколок бьёт по площади
        var stun = self.stun[l] + (splash ? .2 : 0);

        for (var i = 0; i < ticks; i++) {
          (function (n) {
            a.delay(n * self.gap, function () {
              if (u.dead || t.dead) return;
              pulse(a, u, t, self.dmg[l], stun);
              if (splash) {
                a.ring(t.x, t.y, self.splashR, '#8a5ae8');
                a.aoeApply(u, t.x, t.y, self.splashR, function (e) {
                  if (e === t) return;
                  pulse(a, u, e, self.dmg[l], stun);
                });
              }
            });
          })(i);
        }
        return true;
      }
    },

    /* ================= Тёмное жертвоприношение (2) =================
       Приносит в жертву слабейшего врага рядом и поднимает на его
       месте трёх эйдолонов. Каждый один раз делится надвое. */
    sacrifice: {
      id: 'sacrifice', name: 'Тёмное жертвоприношение', icon: '☠', color: '#5a3ab0',
      type: 'active', ai: 'buff',
      mana: [90, 105, 120, 135], cd: [40, 38, 36, 34],
      atk: [14, 21, 28, 35], hp: [160, 185, 210, 235], armor: [2, 3, 4, 5],
      count: 3, dur: 26, splitAt: 8, range: 460, maxOnField: 7,
      desc: function (l) {
        return 'Приносит в жертву обычного врага рядом и поднимает ' + this.count +
          ' эйдолонов: ' + this.atk[l] + ' урона, ' + this.hp[l] + ' здоровья, ' +
          this.armor[l] + ' брони. Живут ' + this.dur + ' сек, один раз делятся ' +
          'после ' + this.splitAt + ' атак. Потомство слабее родителя, ' +
          'на поле не больше ' + this.maxOnField + '.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        var victim = weakestMob(a, u, self.range);
        if (!victim) { a.toast('Нужен обычный враг рядом'); return false; }

        var x = victim.x, y = victim.y;
        a.ring(x, y, 130, '#5a3ab0');
        a.burst(x, y, '#5a3ab0', 28);
        a.execute(u, victim);
        a.shake(7);

        var cfg = {
          atk: self.atk[l], hp: self.hp[l], armor: self.armor[l],
          dur: self.dur, splitAt: self.splitAt,
          as: a.talent(u, 'en_eidolon_as') ? 1.5 : 1.05,
          twice: a.talent(u, 'en_eidolon_split'),   // делиться можно дважды
          auraSlow: auraSlow(u), auraR: 380
        };

        // новый призыв заменяет старый выводок, а не суммируется с ним
        var w = AA.Game.world.state;
        for (var q = 0; q < w.units.length; q++) {
          if (w.units[q].isEidolon && !w.units[q].dead) w.units[q].dead = true;
        }

        for (var i = 0; i < self.count; i++) {
          var ang = i / self.count * 6.2832;
          AA.Game.factory.eidolon(u, cfg,
            x + Math.cos(ang) * 46, y + Math.sin(ang) * 46);
        }
        return true;
      }
    },

    /* ================= Сингулярность (3) =================
       Канал: герой стоит на месте, дыра тянет всех к центру,
       оглушает и жжёт. С осколком добавляется полуночная зона. */
    singularity: {
      id: 'singularity', name: 'Сингулярность', icon: '🕳', color: '#3a1a6b',
      type: 'active', ai: 'aoe',
      mana: [200, 250, 300, 350], cd: [70, 64, 58, 52],
      dps: [60, 115, 175, 235], dur: 4, radius: 265, range: 520,
      pctDps: 4,                                   // добавка от осколка, % макс. здоровья
      desc: function (l) {
        return 'Открывает чёрную дыру на ' + this.dur + ' сек: враги стягиваются ' +
          'к центру, оглушены и получают ' + this.dps[l] + ' урона в секунду. ' +
          'Пока идёт канал, вы не можете двигаться.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        var c = a.bestCluster(u, self.radius, self.range);
        if (!c) return false;

        var pct = a.shard(u) ? self.pctDps : 0;      // осколок: урон от макс. здоровья
        var grow = a.talent(u, 'en_horizon');        // талант расширяет горизонт
        var dps = self.dps[l] * (a.talent(u, 'en_hole_dmg') ? 2 : 1);

        // канал: героя держит на месте собственное умение
        a.buff(u, {
          id: 'channel', dur: self.dur, root: true,
          color: '#3a1a6b', glow: '#3a1a6b'
        });

        a.zone({
          x: c.x, y: c.y, r: self.radius, dur: self.dur, src: u,
          color: '#3a1a6b', style: 'hole',
          onTick: function (z, dt) {
            if (grow) z.r = Math.min(self.radius * 1.4, z.r + 34 * dt);

            // радиус захвата чуть больше визуального — иначе враги
            // «прилипают» к самой кромке и выглядят не втянутыми
            a.aoeApply(u, z.x, z.y, z.r * 1.15, function (e) {
              var dx = z.x - e.x, dy = z.y - e.y;
              var d = Math.sqrt(dx * dx + dy * dy) || .01;
              // ближе к центру тянет сильнее — воронка, а не лифт
              var force = (grow ? 260 : 210) * (.45 + .55 * (1 - d / (z.r * 1.15)));
              e.x += dx / d * Math.min(force * dt, d);
              e.y += dy / d * Math.min(force * dt, d);
              AA.Game.world.confine(e);

              a.buff(e, { id: 'freeze', dur: .4, stun: true, quiet: true, color: '#3a1a6b' });
              a.damage(u, e, dps * dt, 'magic');
              if (pct) a.damage(u, e, e.maxHp * pct / 100 * dt, 'magic');
            });
          }
        });

        a.ring(c.x, c.y, self.radius, '#8a5ae8');
        a.flash('#3a1a6b', .26);
        a.shake(13);
        return true;
      }
    },

    /* ================= Гравитационное искажение (пассивное) =================
       Поле замедления вокруг героя. Эйдолоны наследуют его. */
    gravity: {
      id: 'gravity', name: 'Гравитационное искажение', icon: '🌀', color: '#7a5ae8',
      type: 'passive',
      slow: [10, 15, 20, 25], radius: 400,
      desc: function (l) {
        return 'Вокруг вас и ваших эйдолонов поле притяжения: враги в радиусе ' +
          this.radius + ' медленнее на ' + this.slow[l] + '%. Эффект не складывается, ' +
          'но поля расширяют общую зону.';
      },
      apply: function () { /* эффект живёт в tick */ },
      tick: function (u, l) {
        var a = g(), self = this;
        var r = self.radius + (a.talent(u, 'en_gravity_r') ? 200 : 0);
        a.aura(u, r, 'rgba(122,90,232,.06)');
        a.forEachEnemy(u, r, function (e) {
          a.buff(e, { id: 'gravity', dur: .4, msMul: 1 - self.slow[l] / 100, quiet: true });
        });
      }
    }
  });

  /* ---------------- вспомогательное ---------------- */

  /** Одно срабатывание проклятия. */
  function pulse(a, u, target, dmg, stun) {
    a.damage(u, target, dmg, 'magic');
    a.buff(target, { id: 'freeze', dur: stun, stun: true, color: '#8a5ae8' });
    a.burst(target.x, target.y, '#8a5ae8', 12);
    a.ring(target.x, target.y, 60, '#8a5ae8');
  }

  /** Текущая сила пассивного поля — эйдолоны её наследуют. */
  function auraSlow(u) {
    var lv = (u.skillLv.gravity || 0) - 1;
    return lv < 0 ? 0 : S.get('gravity').slow[lv];
  }

  /** Слабейший обычный враг рядом: боссов и прислужников в жертву не берём. */
  function weakestMob(a, u, range) {
    var w = AA.Game.world.state, m = AA.Core.math;
    var best = null, bhp = 1e12;
    for (var i = 0; i < w.units.length; i++) {
      var e = w.units[i];
      if (e.dead || e.team !== 1 || e.isBoss || e.isDummy) continue;
      if (m.dist(u, e) > range) continue;
      if (e.hp < bhp) { bhp = e.hp; best = e; }
    }
    return best;
  }
})();
