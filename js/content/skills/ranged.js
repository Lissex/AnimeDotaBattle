/* content/skills/ranged — Егерь, Клинок Тени, Дриада. */
(function () {
  'use strict';
  var S = AA.Content.skills, g = S.g;

  S.add({

    /* ================= Егерь ================= */
    volley: {
      id: 'volley', name: 'Залп', icon: '🏹', color: '#4aa8ff', type: 'active', ai: 'aoe',
      mana: [55, 70, 85, 100], cd: [7, 6.2, 5.4, 4.6],
      dmg: [55, 85, 118, 155], arrows: [5, 6, 7, 8],
      desc: function (l) {
        return 'Веер из ' + this.arrows[l] + ' стрел, каждая наносит ' + this.dmg[l] +
          ' физического урона и пробивает одну цель.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, 900), self = this;
        var base = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        var n = this.arrows[l];
        for (var i = 0; i < n; i++) {
          a.projectile({
            from: u, angle: base + (i - (n - 1) / 2) * .17, speed: 950, r: 5,
            color: '#9ad4ff', range: 780, pierce: 1, trail: true,
            onHit: function (x) { a.damage(u, x, self.dmg[l], 'phys'); }
          });
        }
        a.shake(3);
        return true;
      }
    },

    hawkeye: {
      id: 'hawkeye', name: 'Соколиный глаз', icon: '👁', color: '#ffc043', type: 'active', ai: 'buff',
      mana: [50, 60, 70, 80], cd: [16, 15, 14, 13],
      dur: [6, 7, 8, 9], bonus: [30, 50, 74, 102], rangeUp: [90, 130, 170, 220],
      desc: function (l) {
        return 'На ' + this.dur[l] + ' сек: +' + this.bonus[l] + ' к урону атаки и +' +
          this.rangeUp[l] + ' к дальности.';
      },
      cast: function (u, l) {
        g().buff(u, { id: 'hawkeye', dur: this.dur[l], atk: this.bonus[l], range: this.rangeUp[l], color: '#ffc043' });
        g().burst(u.x, u.y, '#ffc043', 18);
        return true;
      }
    },

    pierceshot: {
      id: 'pierceshot', name: 'Пронзающая стрела', icon: '➶', color: '#7fd4ff', type: 'active', ai: 'nuke',
      mana: [70, 85, 100, 115], cd: [10, 9, 8, 7], dmg: [220, 360, 520, 700],
      desc: function (l) {
        return 'Мощный выстрел насквозь через всех врагов на линии: ' + this.dmg[l] + ' физического урона.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, 1100), self = this;
        var ang = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        a.projectile({
          from: u, angle: ang, speed: 1500, r: 9, color: '#7fd4ff',
          range: 1100, pierce: 99, trail: true, big: true,
          onHit: function (x) { a.damage(u, x, self.dmg[l], 'phys'); a.sparkle(x.x, x.y, '#7fd4ff'); }
        });
        a.shake(5); a.recoil(u, 16);
        return true;
      }
    },

    marks: {
      id: 'marks', name: 'Меткость', icon: '🎯', color: '#ff7a2f', type: 'passive',
      crit: [10, 17, 24, 32], mult: [1.8, 2.0, 2.2, 2.5],
      desc: function (l) {
        return '+' + this.crit[l] + '% шанса критического удара, множитель x' + this.mult[l].toFixed(1) + '.';
      },
      apply: function (u, l, s) {
        s.crit += this.crit[l];
        s.critMult = Math.max(s.critMult, this.mult[l]);
      }
    },

    /* ================= Клинок Тени ================= */
    dash: {
      id: 'dash', name: 'Рывок теней', icon: '⚡', color: '#b07dff', type: 'active', ai: 'gap',
      mana: [45, 55, 65, 75], cd: [7, 6, 5, 4], dmg: [90, 160, 240, 330], range: 580,
      desc: function (l) {
        return 'Мгновенно перемещается за спину врага и наносит ' + this.dmg[l] + ' физического урона.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, this.range);
        if (!t) return false;
        a.blinkBehind(u, t, 52);
        a.damage(u, t, this.dmg[l], 'phys');
        a.burst(t.x, t.y, '#b07dff', 18); a.shake(5);
        return true;
      }
    },

    eclipse: {
      id: 'eclipse', name: 'Затмение', icon: '🌑', color: '#6a4fbf', type: 'active', ai: 'escape',
      mana: [70, 80, 90, 100], cd: [18, 16, 14, 12], dur: [4, 5, 6, 7], mul: [2.5, 3.2, 4, 5],
      desc: function (l) {
        return 'Полная невидимость на ' + this.dur[l] + ' сек — враги теряют вас из виду. ' +
          'Атака из невидимости наносит x' + this.mul[l].toFixed(1) + ' урона.';
      },
      cast: function (u, l) {
        g().buff(u, { id: 'invis', dur: this.dur[l], invis: true, ambush: this.mul[l], ms: 70, color: '#6a4fbf' });
        g().burst(u.x, u.y, '#6a4fbf', 22);
        return true;
      }
    },

    bladefan: {
      id: 'bladefan', name: 'Веер клинков', icon: '✳', color: '#c9a0ff', type: 'active', ai: 'aoe',
      mana: [65, 80, 95, 110], cd: [11, 10, 9, 8],
      dmg: [70, 115, 165, 220], hits: [3, 4, 5, 6], radius: 165,
      desc: function (l) {
        return this.hits[l] + ' взмахов подряд по всем врагам вокруг, каждый на ' +
          this.dmg[l] + ' физического урона.';
      },
      cast: function (u, l) {
        var a = g(), self = this, i = 0;
        (function swing() {
          if (u.dead || i >= self.hits[l]) return;
          i++;
          a.ring(u.x, u.y, self.radius, '#c9a0ff');
          a.spinBurst(u, self.radius, '#c9a0ff');
          a.aoeAt(u, u.x, u.y, self.radius, self.dmg[l], 'phys');
          a.delay(.13, swing);
        })();
        return true;
      }
    },

    bloodlust: {
      id: 'bloodlust', name: 'Жажда крови', icon: '🩸', color: '#ff4d5e', type: 'passive',
      ls: [10, 16, 22, 28], as: [15, 25, 35, 46],
      desc: function (l) { return '+' + this.ls[l] + '% вампиризма и +' + this.as[l] + '% скорости атаки.'; },
      apply: function (u, l, s) { s.lifesteal += this.ls[l]; s.asMul *= (1 + this.as[l] / 100); }
    },

    /* ================= Дриада ================= */
    venom: {
      id: 'venom', name: 'Ядовитая стрела', icon: '🐍', color: '#7ac043', type: 'active', ai: 'nuke',
      mana: [50, 62, 74, 86], cd: [6, 5.4, 4.8, 4.2],
      dmg: [70, 115, 165, 220], dps: [30, 55, 84, 118], dur: [5, 5, 6, 6], range: 720,
      desc: function (l) {
        return this.dmg[l] + ' урона и яд: ' + this.dps[l] + ' магического урона в секунду ' +
          this.dur[l] + ' сек, замедление 25%.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, this.range), self = this;
        if (!t) return false;
        a.projectile({
          from: u, to: t, speed: 900, r: 6, color: '#7ac043', trail: true, homing: true,
          onHit: function (x) {
            a.damage(u, x, self.dmg[l], 'phys');
            a.buff(x, {
              id: 'venom', dur: self.dur[l], dps: self.dps[l], dmgType: 'magic',
              src: u, msMul: .75, color: '#7ac043'
            });
          }
        });
        return true;
      }
    },

    roots: {
      id: 'roots', name: 'Оковы корней', icon: '🌿', color: '#3f8f5a', type: 'active', ai: 'aoe',
      mana: [70, 85, 100, 115], cd: [14, 13, 12, 11],
      dur: [1.8, 2.3, 2.8, 3.3], dmg: [60, 110, 165, 225], radius: 230,
      desc: function (l) {
        return 'Обездвиживает врагов в радиусе на ' + this.dur[l] + ' сек и наносит ' +
          this.dmg[l] + ' магического урона.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        a.ring(u.x, u.y, this.radius, '#3f8f5a');
        return a.aoeApply(u, u.x, u.y, this.radius, function (e) {
          a.damage(u, e, self.dmg[l], 'magic');
          a.buff(e, { id: 'root', dur: self.dur[l], root: true, color: '#3f8f5a' });
        }) > 0;
      }
    },

    thorntrap: {
      id: 'thorntrap', name: 'Терновая ловушка', icon: '🌵', color: '#8fd66a', type: 'active', ai: 'aoe',
      mana: [80, 95, 110, 125], cd: [13, 12, 11, 10],
      dps: [95, 160, 235, 320], dur: [6, 6.5, 7, 7.5], radius: 175, range: 560,
      desc: function (l) {
        return 'Заросли терния на ' + this.dur[l] + ' сек: ' + this.dps[l] +
          ' физического урона в секунду и замедление 50% всем внутри.';
      },
      cast: function (u, l) {
        var a = g(), c = a.bestCluster(u, this.radius, this.range), self = this;
        if (!c) return false;
        a.zone({
          x: c.x, y: c.y, r: this.radius, dur: this.dur[l], src: u, color: '#8fd66a', style: 'thorn',
          onTick: function (z, dt) {
            a.aoeAt(u, z.x, z.y, z.r, self.dps[l] * dt, 'phys');
            a.aoeApply(u, z.x, z.y, z.r, function (e) {
              a.buff(e, { id: 'slow', dur: .5, msMul: .5, quiet: true });
            });
          }
        });
        return true;
      }
    },

    grace: {
      id: 'grace', name: 'Милость природы', icon: '🍃', color: '#8fd66a', type: 'passive',
      reg: [4, 8, 13, 19], ms: [20, 35, 50, 70],
      desc: function (l) {
        return '+' + this.reg[l] + ' восстановления здоровья и +' + this.ms[l] + ' к скорости передвижения.';
      },
      apply: function (u, l, s) { s.hpReg += this.reg[l]; s.ms += this.ms[l]; }
    }
  });
})();
