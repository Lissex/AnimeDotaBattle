/* content/skills/casters — Хладна, Пиромант. */
(function () {
  'use strict';
  var S = AA.Content.skills, g = S.g;

  S.add({

    /* ================= Хладна ================= */
    nova: {
      id: 'nova', name: 'Морозная нова', icon: '❄', color: '#7fd4ff', type: 'active', ai: 'aoe',
      mana: [70, 85, 100, 115], cd: [8, 7, 6, 5],
      dmg: [120, 200, 285, 380], slow: [30, 40, 50, 60], radius: 210,
      desc: function (l) {
        return this.dmg[l] + ' магического урона вокруг и замедление на ' + this.slow[l] + '% на 3 сек.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        a.ring(u.x, u.y, this.radius, '#7fd4ff'); a.shake(6);
        a.aoeApply(u, u.x, u.y, this.radius, function (e) {
          a.damage(u, e, self.dmg[l], 'magic');
          a.buff(e, { id: 'slow', dur: 3, msMul: 1 - self.slow[l] / 100, color: '#7fd4ff' });
        });
        return true;
      }
    },

    shackle: {
      id: 'shackle', name: 'Оковы льда', icon: '🧊', color: '#4aa8ff', type: 'active', ai: 'nuke',
      mana: [80, 95, 110, 125], cd: [15, 14, 13, 12],
      dur: [1.6, 2.1, 2.6, 3.1], dmg: [70, 130, 195, 265], range: 540,
      desc: function (l) {
        return 'Замораживает ближайшего врага на ' + this.dur[l] + ' сек и наносит ' +
          this.dmg[l] + ' магического урона.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, this.range);
        if (!t) return false;
        a.damage(u, t, this.dmg[l], 'magic');
        a.buff(t, { id: 'freeze', dur: this.dur[l], stun: true, color: '#4aa8ff' });
        a.burst(t.x, t.y, '#7fd4ff', 16);
        return true;
      }
    },

    hail: {
      id: 'hail', name: 'Град', icon: '🌨', color: '#a8e4ff', type: 'active', ai: 'aoe',
      mana: [95, 115, 135, 155], cd: [16, 15, 14, 13],
      dps: [80, 135, 195, 265], dur: [4.5, 5, 5.5, 6], radius: 215, range: 640,
      desc: function (l) {
        return 'Ледяной град в области на ' + this.dur[l] + ' сек: ' + this.dps[l] +
          ' магического урона в секунду и замедление 45%.';
      },
      cast: function (u, l) {
        var a = g(), c = a.bestCluster(u, this.radius, this.range), self = this;
        if (!c) return false;
        a.zone({
          x: c.x, y: c.y, r: this.radius, dur: this.dur[l], src: u, color: '#a8e4ff',
          onTick: function (z, dt) {
            a.aoeAt(u, z.x, z.y, z.r, self.dps[l] * dt, 'magic');
            a.aoeApply(u, z.x, z.y, z.r, function (e) {
              a.buff(e, { id: 'slow', dur: .5, msMul: .55, quiet: true });
            });
          }
        });
        return true;
      }
    },

    chill: {
      id: 'chill', name: 'Аура холода', icon: '🌬', color: '#a8e4ff', type: 'passive',
      slow: [12, 18, 24, 30], mpReg: [1.4, 2.4, 3.6, 5], radius: 260,
      desc: function (l) {
        return 'Враги в радиусе медленнее на ' + this.slow[l] + '%. Вы получаете +' +
          this.mpReg[l] + ' восстановления маны.';
      },
      apply: function (u, l, s) { s.mpReg += this.mpReg[l]; },
      tick: function (u, l) {
        var a = g(), self = this;
        a.aura(u, this.radius, 'rgba(127,212,255,.05)');
        a.forEachEnemy(u, this.radius, function (e) {
          a.buff(e, { id: 'chill', dur: .4, msMul: 1 - self.slow[l] / 100, quiet: true });
        });
      }
    },

    /* ================= Пиромант ================= */
    firewave: {
      id: 'firewave', name: 'Огненная волна', icon: '🔥', color: '#ff7a2f', type: 'active', ai: 'aoe',
      mana: [80, 95, 110, 125], cd: [8, 7.2, 6.4, 5.6], dmg: [150, 250, 360, 480], range: 560,
      desc: function (l) {
        return 'Волна пламени пробивает всех на линии: ' + this.dmg[l] + ' магического урона.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, 900), self = this;
        var ang = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        a.projectile({
          from: u, angle: ang, speed: 620, r: 24, color: '#ff7a2f',
          range: this.range, pierce: 99, trail: true, big: true,
          onHit: function (x) { a.damage(u, x, self.dmg[l], 'magic'); a.burst(x.x, x.y, '#ff7a2f', 8); }
        });
        a.shake(5);
        return true;
      }
    },

    ignite: {
      id: 'ignite', name: 'Поджог', icon: '🕯', color: '#ffb03a', type: 'active', ai: 'nuke',
      mana: [60, 75, 90, 105], cd: [10, 9, 8, 7],
      dps: [55, 95, 140, 195], dur: [6, 6, 7, 7], radius: 170, range: 620,
      desc: function (l) {
        return 'Поджигает врагов вокруг цели: ' + this.dps[l] + ' магического урона в секунду ' +
          this.dur[l] + ' сек.';
      },
      cast: function (u, l) {
        var a = g(), c = a.bestCluster(u, this.radius, this.range), self = this;
        if (!c) return false;
        a.ring(c.x, c.y, this.radius, '#ffb03a');
        a.aoeApply(u, c.x, c.y, this.radius, function (e) {
          a.buff(e, {
            id: 'ignite', dur: self.dur[l], dps: self.dps[l],
            dmgType: 'magic', src: u, color: '#ffb03a'
          });
        });
        return true;
      }
    },

    flameaura: {
      id: 'flameaura', name: 'Пламенная аура', icon: '♨', color: '#ff5a2f', type: 'toggle', ai: 'aoe',
      mana: [0, 0, 0, 0], cd: [1, 1, 1, 1],
      dmg: [26, 46, 70, 96], mpDrain: [6, 8, 10, 12], radius: 150,
      desc: function (l) {
        return 'Аура: ' + this.dmg[l] + ' магического урона в секунду вокруг, расход ' +
          this.mpDrain[l] + ' маны в секунду.';
      },
      cast: function (u) { u.toggles.flameaura = !u.toggles.flameaura; return true; },
      tick: function (u, l, dt) {
        if (!u.toggles.flameaura) return;
        if (u.mp <= 0) { u.toggles.flameaura = false; return; }
        var a = g();
        u.mp = Math.max(0, u.mp - this.mpDrain[l] * dt);
        a.aoeAt(u, u.x, u.y, this.radius, this.dmg[l] * dt, 'magic');
        a.aura(u, this.radius, 'rgba(255,90,47,.15)');
      }
    },

    innerheat: {
      id: 'innerheat', name: 'Внутренний жар', icon: '☼', color: '#ff9a3a', type: 'passive',
      sp: [25, 45, 70, 100], burn: [20, 38, 60, 88],
      desc: function (l) {
        return '+' + this.sp[l] + ' к силе заклинаний. Ваши атаки поджигают цель на ' +
          this.burn[l] + ' урона в секунду на 3 сек.';
      },
      apply: function (u, l, s) { s.sp += this.sp[l]; },
      onAttack: function (u, l, target) {
        g().buff(target, {
          id: 'ignite', dur: 3, dps: this.burn[l],
          dmgType: 'magic', src: u, color: '#ff9a3a'
        });
      }
    }
  });
})();
