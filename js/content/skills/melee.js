/* content/skills/melee — Мясник, Берсерк, Кровавый Рыцарь, Голем. */
(function () {
  'use strict';
  var S = AA.Content.skills, g = S.g;

  S.add({

    /* ================= Мясник ================= */
    hook: {
      id: 'hook', name: 'Крюк', icon: '⛓', color: '#c0563a', type: 'active', ai: 'gap',
      mana: [60, 70, 80, 90], cd: [8, 7, 6, 5], dmg: [110, 190, 280, 380], range: 640,
      desc: function (l) {
        return 'Бросает крюк в ближайшего врага, притягивает его вплотную и наносит ' +
          this.dmg[l] + ' физического урона.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, this.range), self = this;
        if (!t) return false;
        // осколок: крюк пробивает и тянет всех на линии, талант делает то же
        var sweep = a.shard(u) || a.talent(u, 'bu_hook_all');
        a.projectile({
          from: u, to: t, speed: 1200, r: 10, color: '#d9a05b',
          trail: true, homing: !sweep, pierce: sweep ? 99 : 0,
          onHit: function (x) {
            a.damage(u, x, self.dmg[l] * (sweep ? 1 : 1), 'phys');
            a.pull(x, u, 62);
            if (a.talent(u, 'bu_hook_stun')) {
              a.buff(x, { id: 'freeze', dur: 1.2, stun: true, color: '#d9a05b' });
            }
            a.shake(7); a.burst(x.x, x.y, '#d9a05b', 16);
          }
        });
        return true;
      }
    },

    rot: {
      id: 'rot', name: 'Гниль', icon: '☣', color: '#7ac043', type: 'toggle', ai: 'aoe',
      mana: [0, 0, 0, 0], cd: [1, 1, 1, 1],
      dmg: [30, 50, 72, 96], selfDmg: [10, 13, 16, 19], radius: 132,
      desc: function (l) {
        return 'Аура: ' + this.dmg[l] + ' магического урона в секунду врагам вокруг, ' +
          'вы теряете ' + this.selfDmg[l] + ' здоровья в секунду.';
      },
      cast: function (u) { u.toggles.rot = !u.toggles.rot; return true; },
      tick: function (u, l, dt) {
        if (!u.toggles.rot) return;
        var a = g();
        var big = a.talent(u, 'bu_rot_huge');
        var r = this.radius * (big ? 1.8 : 1);
        var dmg = this.dmg[l] * (big ? 1.5 : 1);

        a.aoeAt(u, u.x, u.y, r, dmg * dt, 'magic');
        if (a.talent(u, 'bu_rot_slow')) {
          a.forEachEnemy(u, r, function (e) {
            a.buff(e, { id: 'rotslow', dur: .4, msMul: .7, quiet: true });
          });
        }
        if (!a.talent(u, 'bu_rot_free')) u.hp = Math.max(1, u.hp - this.selfDmg[l] * dt);
        a.aura(u, r, 'rgba(122,192,67,.16)');
      }
    },

    dismember: {
      id: 'dismember', name: 'Расчленение', icon: '🔪', color: '#e04f6a', type: 'active', ai: 'finish',
      mana: [75, 90, 105, 120], cd: [12, 11, 10, 9],
      base: [90, 150, 215, 290], missing: [.12, .17, .22, .28], radius: 175,
      desc: function (l) {
        return this.base[l] + ' урона врагам вокруг плюс ' + Math.round(this.missing[l] * 100) +
          '% от их недостающего здоровья. Вы лечитесь на половину нанесённого.';
      },
      cast: function (u, l) {
        var a = g(), self = this, total = 0;
        a.ring(u.x, u.y, this.radius, '#e04f6a'); a.shake(8);
        var n = a.aoeApply(u, u.x, u.y, this.radius, function (e) {
          var miss = Math.max(0, e.maxHp - e.hp);
          total += a.damage(u, e, self.base[l] + miss * self.missing[l], 'phys');
        });
        if (!n) return false;
        u.hp = Math.min(u.maxHp, u.hp + total * .5);
        a.heal(u, total * .5);
        return true;
      }
    },

    feast: {
      id: 'feast', name: 'Пир', icon: '🍖', color: '#a01f3a', type: 'passive',
      lifesteal: [8, 14, 20, 26], stackStr: [1, 1.6, 2.2, 3],
      desc: function (l) {
        return '+' + this.lifesteal[l] + '% вампиризма. За каждое убийство навсегда в забеге +' +
          this.stackStr[l] + ' к силе.';
      },
      apply: function (u, l, s) { s.lifesteal += this.lifesteal[l]; },
      /** Вызывается из game/combat при убийстве. */
      onKill: function (u, l) {
        u.bonusAttr.str += this.stackStr[l];
        return this.stackStr[l];
      }
    },

    /* ================= Берсерк ================= */
    leap: {
      id: 'leap', name: 'Прыжок', icon: '💥', color: '#e8571a', type: 'active', ai: 'gap',
      mana: [50, 60, 70, 80], cd: [9, 8, 7, 6], dmg: [130, 220, 320, 430], radius: 190,
      desc: function (l) {
        return 'Прыгает к скоплению врагов: ' + this.dmg[l] +
          ' физического урона по площади при приземлении и замедление 40%.';
      },
      cast: function (u, l) {
        var a = g(), c = a.bestCluster(u, this.radius, 620), self = this;
        if (!c) return false;
        a.leapTo(u, c.x, c.y, .32, function () {
          a.ring(u.x, u.y, self.radius, '#e8571a'); a.shake(13); a.hitstop(.07);
          a.aoeApply(u, u.x, u.y, self.radius, function (e) {
            a.damage(u, e, self.dmg[l], 'phys');
            a.buff(e, { id: 'slow', dur: 2.5, msMul: .6, color: '#e8571a' });
          });
        });
        return true;
      }
    },

    cleave: {
      id: 'cleave', name: 'Раскол', icon: '⚔', color: '#ffb03a', type: 'active', ai: 'buff',
      mana: [45, 55, 65, 75], cd: [14, 13, 12, 11],
      dur: [7, 8, 9, 10], pct: [45, 65, 85, 110], radius: 155,
      desc: function (l) {
        return 'На ' + this.dur[l] + ' сек каждая атака дополнительно бьёт по всем врагам ' +
          'рядом с целью на ' + this.pct[l] + '% урона.';
      },
      cast: function (u, l) {
        g().buff(u, { id: 'cleave', dur: this.dur[l], cleavePct: this.pct[l], cleaveR: this.radius, color: '#ffb03a' });
        g().ring(u.x, u.y, 100, '#ffb03a');
        return true;
      }
    },

    frenzy: {
      id: 'frenzy', name: 'Безумие', icon: '🔺', color: '#ff4d5e', type: 'active', ai: 'escape',
      mana: [60, 70, 80, 90], cd: [22, 20, 18, 16],
      dur: [5, 5.5, 6, 6.5], as: [80, 110, 145, 185], ls: [20, 28, 36, 46],
      desc: function (l) {
        return 'На ' + this.dur[l] + ' сек: +' + this.as[l] + '% скорости атаки и +' +
          this.ls[l] + '% вампиризма, но -35% брони.';
      },
      cast: function (u, l) {
        g().buff(u, {
          id: 'frenzy', dur: this.dur[l], asMul: 1 + this.as[l] / 100,
          lifesteal: this.ls[l], armorMul: .65, color: '#ff4d5e', glow: '#ff4d5e'
        });
        g().ring(u.x, u.y, 120, '#ff4d5e'); g().shake(6);
        return true;
      }
    },

    bloodrage: {
      id: 'bloodrage', name: 'Кровавая ярость', icon: '🩸', color: '#a01f3a', type: 'passive',
      dynamic: true,   // зависит от текущего здоровья → пересчёт каждый кадр
      max: [35, 55, 78, 105],
      desc: function (l) {
        return 'Чем меньше здоровья, тем сильнее вы бьёте: до +' + this.max[l] +
          '% урона и скорости атаки при почти пустом здоровье.';
      },
      apply: function (u, l, s) {
        var missing = 1 - (u.hp / Math.max(1, u.maxHp));
        var k = this.max[l] / 100 * missing;
        s.atk *= (1 + k);
        s.asMul *= (1 + k * .8);
      }
    },

    /* ================= Кровавый Рыцарь ================= */
    charge: {
      id: 'charge', name: 'Натиск', icon: '🐎', color: '#d13a3a', type: 'active', ai: 'gap',
      mana: [55, 65, 75, 85], cd: [10, 9, 8, 7],
      dmg: [120, 200, 290, 390], stun: [.8, 1.1, 1.4, 1.7], range: 620,
      desc: function (l) {
        return 'Врывается в цель: ' + this.dmg[l] + ' физического урона и оглушение на ' +
          this.stun[l] + ' сек.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, this.range);
        if (!t) return false;
        a.dashTo(u, t, 46, '#d13a3a');
        a.damage(u, t, this.dmg[l], 'phys');
        a.buff(t, { id: 'freeze', dur: this.stun[l], stun: true, color: '#d13a3a' });
        a.shake(9); a.hitstop(.05);
        return true;
      }
    },

    crimson: {
      id: 'crimson', name: 'Багровый шквал', icon: '🔥', color: '#ff4d5e', type: 'active', ai: 'escape',
      mana: [70, 85, 100, 115], cd: [20, 18, 16, 14],
      heal: [18, 25, 32, 40], as: [40, 60, 80, 100], dur: [6, 6.5, 7, 7.5],
      desc: function (l) {
        return 'Лечит на ' + this.heal[l] + '% максимального здоровья и даёт +' +
          this.as[l] + '% скорости атаки на ' + this.dur[l] + ' сек.';
      },
      cast: function (u, l) {
        var a = g(), h = u.maxHp * this.heal[l] / 100;
        u.hp = Math.min(u.maxHp, u.hp + h); a.heal(u, h);
        a.buff(u, { id: 'crimson', dur: this.dur[l], asMul: 1 + this.as[l] / 100, color: '#ff4d5e' });
        a.ring(u.x, u.y, 110, '#ff4d5e');
        return true;
      }
    },

    bloodoath: {
      id: 'bloodoath', name: 'Клятва крови', icon: '🗡', color: '#8a1030', type: 'active', ai: 'nuke',
      mana: [0, 0, 0, 0], cd: [14, 13, 12, 11],
      costPct: 15, mult: [2.6, 3.4, 4.3, 5.4], range: 320,
      desc: function (l) {
        return 'Жертвует 15% текущего здоровья и наносит цели урон, равный x' +
          this.mult[l].toFixed(1) + ' от пожертвованного. Вампиризм с этого удара работает.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, this.range);
        if (!t) return false;
        var cost = u.hp * this.costPct / 100;
        if (u.hp - cost < 1) return false;
        u.hp -= cost;
        a.slash(u, t, '#8a1030');
        a.damage(u, t, cost * this.mult[l], 'phys', true);
        a.shake(8); a.hitstop(.06); a.burst(t.x, t.y, '#8a1030', 22);
        return true;
      }
    },

    bloodpact: {
      id: 'bloodpact', name: 'Кровавая печать', icon: '🜂', color: '#a01f3a', type: 'passive',
      ls: [12, 19, 26, 34], reg: [3, 6, 10, 15],
      desc: function (l) {
        return '+' + this.ls[l] + '% вампиризма и +' + this.reg[l] + ' восстановления здоровья в секунду.';
      },
      apply: function (u, l, s) { s.lifesteal += this.ls[l]; s.hpReg += this.reg[l]; }
    },

    /* ================= Голем ================= */
    slam: {
      id: 'slam', name: 'Удар оземь', icon: '👊', color: '#9a7b4f', type: 'active', ai: 'aoe',
      mana: [65, 80, 95, 110], cd: [9, 8, 7, 6],
      dmg: [130, 220, 320, 430], slow: [35, 45, 55, 65], radius: 220,
      desc: function (l) {
        return this.dmg[l] + ' физического урона вокруг и замедление на ' + this.slow[l] + '% на 3 сек.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        a.ring(u.x, u.y, this.radius, '#9a7b4f'); a.shake(11); a.hitstop(.05);
        a.aoeApply(u, u.x, u.y, this.radius, function (e) {
          a.damage(u, e, self.dmg[l], 'phys');
          a.buff(e, { id: 'slow', dur: 3, msMul: 1 - self.slow[l] / 100, color: '#9a7b4f' });
        });
        return true;
      }
    },

    quake: {
      id: 'quake', name: 'Землетрясение', icon: '🌋', color: '#c07a3a', type: 'active', ai: 'aoe',
      mana: [100, 120, 140, 160], cd: [18, 16, 14, 12],
      dps: [70, 120, 175, 240], dur: [5, 5.5, 6, 6.5], radius: 250,
      desc: function (l) {
        return 'Земля трясётся ' + this.dur[l] + ' сек: ' + this.dps[l] +
          ' физического урона в секунду всем вокруг вас.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        a.buff(u, {
          id: 'quake', dur: this.dur[l], color: '#c07a3a',
          onTick: function (unit, dt) {
            a.aoeAt(unit, unit.x, unit.y, self.radius, self.dps[l] * dt, 'phys');
            a.aura(unit, self.radius, 'rgba(192,122,58,.13)');
            if (Math.random() < dt * 9) {
              a.burst(unit.x + (Math.random() - .5) * self.radius * 1.7,
                unit.y + (Math.random() - .5) * self.radius * 1.7, '#c07a3a', 3);
            }
          }
        });
        a.shake(8);
        return true;
      }
    },

    boulder: {
      id: 'boulder', name: 'Каменный кулак', icon: '🪨', color: '#8a8a8a', type: 'active', ai: 'nuke',
      mana: [55, 70, 85, 100], cd: [7, 6.2, 5.4, 4.6],
      dmg: [160, 270, 390, 525], radius: 110, range: 700,
      desc: function (l) {
        return 'Метает глыбу: ' + this.dmg[l] + ' физического урона по площади и оглушение на 1 сек.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, this.range), self = this;
        if (!t) return false;
        // осколок и талант «Двойная глыба»: летят две
        var shots = (a.shard(u) || a.talent(u, 'go_boulder_2')) ? 2 : 1;

        for (var k = 0; k < shots; k++) {
          (function (n) {
            a.delay(n * .16, function () {
              if (u.dead) return;
              var tgt = a.pickTarget(u, self.range) || t;
              a.projectile({
                from: u, to: tgt, speed: 700, r: 14, color: '#b0a08a',
                trail: true, homing: true, big: true, spin: true,
                onHit: function (x) {
                  a.aoeAt(u, x.x, x.y, self.radius, self.dmg[l], 'phys');
                  a.aoeApply(u, x.x, x.y, self.radius, function (e) {
                    a.buff(e, { id: 'freeze', dur: 1, stun: true, color: '#8a8a8a' });
                  });
                  a.ring(x.x, x.y, self.radius, '#b0a08a'); a.shake(9); a.hitstop(.05);
                }
              });
            });
          })(k);
        }
        return true;
      }
    },

    stoneskin: {
      id: 'stoneskin', name: 'Каменная кожа', icon: '🛡', color: '#8a8a8a', type: 'passive',
      armor: [5, 9, 14, 20], mr: [.08, .13, .18, .24],
      desc: function (l) {
        return '+' + this.armor[l] + ' брони и +' + Math.round(this.mr[l] * 100) + '% сопротивления магии.';
      },
      apply: function (u, l, s) { s.armor += this.armor[l]; s.mr = Math.min(.8, s.mr + this.mr[l]); }
    }
  });
})();
