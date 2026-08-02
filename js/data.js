/* =========================================================
   Арена Древних — данные
   ---------------------------------------------------------
   Характеристики: Сила / Ловкость / Интеллект, главный
   атрибут даёт урон. У каждого героя 3 прокачиваемых
   активных умения + 1 пассивное.
   Имена и образы оригинальные (архетипы MOBA): прямое
   использование персонажей Dota 2 нарушает п.3.5 требований
   Яндекс Игр. Переименование — поле name в HEROES.
   ========================================================= */
(function (root) {
  'use strict';

  function api() { return root.GameAPI; }

  /* ============ КОЭФФИЦИЕНТЫ АТРИБУТОВ ============ */
  var ATTR = {
    HP_PER_STR: 20, HPREG_PER_STR: 0.10,
    MP_PER_INT: 12, MPREG_PER_INT: 0.055, SP_PER_INT: 0.75,
    ARMOR_PER_AGI: 0.16, AS_PER_AGI: 0.01,
    DMG_PER_PRIMARY: 1.0,
    BASE_HP: 180, BASE_MP: 75, BASE_HPREG: 0.5, BASE_MPREG: 0.6
  };
  var ATTR_NAME = { str: 'СИЛА', agi: 'ЛОВКОСТЬ', int: 'ИНТЕЛЛЕКТ' };
  var ATTR_COLOR = { str: '#ff6b4a', agi: '#3ddb7f', int: '#4aa8ff' };

  /* ================================================
                        УМЕНИЯ
     type: 'active' | 'toggle' | 'passive' | 'reagent'
     ai:   'nuke' | 'aoe' | 'escape' | 'buff' | 'gap' | 'finish'
     ================================================ */
  var SKILLS = {

    /* ---------------- Мясник ---------------- */
    hook: {
      id: 'hook', name: 'Крюк', icon: '⛓', color: '#c0563a', type: 'active', ai: 'gap',
      mana: [60, 70, 80, 90], cd: [8, 7, 6, 5], dmg: [110, 190, 280, 380], range: 640,
      desc: function (l) { return 'Бросает крюк в ближайшего врага, притягивает его вплотную и наносит ' + this.dmg[l] + ' физического урона.'; },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, this.range), self = this;
        if (!t) return false;
        g.projectile({
          from: u, to: t, speed: 1200, r: 10, color: '#d9a05b', trail: true, homing: true, chain: true,
          onHit: function (x) { g.damage(u, x, self.dmg[l], 'phys'); g.pull(x, u, 62); g.shake(7); g.burst(x.x, x.y, '#d9a05b', 16); }
        });
        return true;
      }
    },
    rot: {
      id: 'rot', name: 'Гниль', icon: '☣', color: '#7ac043', type: 'toggle', ai: 'aoe',
      mana: [0, 0, 0, 0], cd: [1, 1, 1, 1], dmg: [30, 50, 72, 96], selfDmg: [10, 13, 16, 19], radius: 132,
      desc: function (l) { return 'Аура: ' + this.dmg[l] + ' магического урона в секунду врагам вокруг, вы теряете ' + this.selfDmg[l] + ' здоровья в секунду.'; },
      cast: function (u) { u.toggles.rot = !u.toggles.rot; return true; },
      tick: function (u, l, dt) {
        if (!u.toggles.rot) return;
        var g = api();
        g.aoeDamage(u, u.x, u.y, this.radius, this.dmg[l] * dt, 'magic');
        u.hp = Math.max(1, u.hp - this.selfDmg[l] * dt);
        g.aura(u, this.radius, 'rgba(122,192,67,.16)');
      }
    },
    dismember: {
      id: 'dismember', name: 'Расчленение', icon: '🔪', color: '#e04f6a', type: 'active', ai: 'finish',
      mana: [75, 90, 105, 120], cd: [12, 11, 10, 9], base: [90, 150, 215, 290], missing: [.12, .17, .22, .28], radius: 175,
      desc: function (l) {
        return this.base[l] + ' урона врагам вокруг плюс ' + Math.round(this.missing[l] * 100) +
          '% от их недостающего здоровья. Вы лечитесь на половину нанесённого.';
      },
      cast: function (u, l) {
        var g = api(), self = this, total = 0;
        g.ring(u.x, u.y, this.radius, '#e04f6a'); g.shake(8);
        var n = g.aoeApply(u, u.x, u.y, this.radius, function (e) {
          var miss = Math.max(0, e.maxHp - e.hp);
          total += g.damage(u, e, self.base[l] + miss * self.missing[l], 'phys');
        });
        if (!n) return false;
        u.hp = Math.min(u.maxHp, u.hp + total * .5);
        g.heal(u, total * .5);
        return true;
      }
    },
    feast: {
      id: 'feast', name: 'Пир', icon: '🍖', color: '#a01f3a', type: 'passive',
      lifesteal: [8, 14, 20, 26], stackStr: [1, 1.6, 2.2, 3],
      desc: function (l) { return '+' + this.lifesteal[l] + '% вампиризма. За каждое убийство навсегда в забеге +' + this.stackStr[l] + ' к силе.'; },
      apply: function (u, l, s) { s.lifesteal += this.lifesteal[l]; }
    },

    /* ---------------- Егерь ---------------- */
    volley: {
      id: 'volley', name: 'Залп', icon: '🏹', color: '#4aa8ff', type: 'active', ai: 'aoe',
      mana: [55, 70, 85, 100], cd: [7, 6.2, 5.4, 4.6], dmg: [55, 85, 118, 155], arrows: [5, 6, 7, 8],
      desc: function (l) { return 'Веер из ' + this.arrows[l] + ' стрел, каждая наносит ' + this.dmg[l] + ' физического урона и пробивает одну цель.'; },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, 900), self = this;
        var base = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        var n = this.arrows[l];
        for (var i = 0; i < n; i++) {
          g.projectile({
            from: u, angle: base + (i - (n - 1) / 2) * .17, speed: 950, r: 5, color: '#9ad4ff',
            range: 780, pierce: 1, trail: true,
            onHit: function (x) { g.damage(u, x, self.dmg[l], 'phys'); }
          });
        }
        g.shake(3);
        return true;
      }
    },
    hawkeye: {
      id: 'hawkeye', name: 'Соколиный глаз', icon: '👁', color: '#ffc043', type: 'active', ai: 'buff',
      mana: [50, 60, 70, 80], cd: [16, 15, 14, 13], dur: [6, 7, 8, 9], bonus: [30, 50, 74, 102], rangeUp: [90, 130, 170, 220],
      desc: function (l) { return 'На ' + this.dur[l] + ' сек: +' + this.bonus[l] + ' к урону атаки и +' + this.rangeUp[l] + ' к дальности.'; },
      cast: function (u, l) {
        api().buff(u, { id: 'hawkeye', dur: this.dur[l], atk: this.bonus[l], range: this.rangeUp[l], color: '#ffc043' });
        api().burst(u.x, u.y, '#ffc043', 18);
        return true;
      }
    },
    pierceshot: {
      id: 'pierceshot', name: 'Пронзающая стрела', icon: '➶', color: '#7fd4ff', type: 'active', ai: 'nuke',
      mana: [70, 85, 100, 115], cd: [10, 9, 8, 7], dmg: [220, 360, 520, 700],
      desc: function (l) { return 'Мощный выстрел насквозь через всех врагов на линии: ' + this.dmg[l] + ' физического урона.'; },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, 1100), self = this;
        var a = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        g.projectile({
          from: u, angle: a, speed: 1500, r: 9, color: '#7fd4ff', range: 1100, pierce: 99, trail: true, big: true,
          onHit: function (x) { g.damage(u, x, self.dmg[l], 'phys'); g.sparkle(x.x, x.y, '#7fd4ff'); }
        });
        g.shake(5); g.recoil(u, 16);
        return true;
      }
    },
    marks: {
      id: 'marks', name: 'Меткость', icon: '🎯', color: '#ff7a2f', type: 'passive',
      crit: [10, 17, 24, 32], mult: [1.8, 2.0, 2.2, 2.5],
      desc: function (l) { return '+' + this.crit[l] + '% шанса критического удара, множитель x' + this.mult[l].toFixed(1) + '.'; },
      apply: function (u, l, s) { s.crit += this.crit[l]; s.critMult = Math.max(s.critMult, this.mult[l]); }
    },

    /* ---------------- Берсерк ---------------- */
    leap: {
      id: 'leap', name: 'Прыжок', icon: '💥', color: '#e8571a', type: 'active', ai: 'gap',
      mana: [50, 60, 70, 80], cd: [9, 8, 7, 6], dmg: [130, 220, 320, 430], radius: 190,
      desc: function (l) { return 'Прыгает к скоплению врагов: ' + this.dmg[l] + ' физического урона по площади при приземлении и замедление 40%.'; },
      cast: function (u, l) {
        var g = api(), c = g.bestCluster(u, this.radius, 620), self = this;
        if (!c) return false;
        g.leapTo(u, c.x, c.y, .32, function () {
          g.ring(u.x, u.y, self.radius, '#e8571a'); g.shake(13); g.hitstop(.07);
          g.aoeApply(u, u.x, u.y, self.radius, function (e) {
            g.damage(u, e, self.dmg[l], 'phys');
            g.buff(e, { id: 'slow', dur: 2.5, msMul: .6, color: '#e8571a' });
          });
        });
        return true;
      }
    },
    cleave: {
      id: 'cleave', name: 'Раскол', icon: '⚔', color: '#ffb03a', type: 'active', ai: 'buff',
      mana: [45, 55, 65, 75], cd: [14, 13, 12, 11], dur: [7, 8, 9, 10], pct: [45, 65, 85, 110], radius: 155,
      desc: function (l) { return 'На ' + this.dur[l] + ' сек каждая атака дополнительно бьёт по всем врагам рядом с целью на ' + this.pct[l] + '% урона.'; },
      cast: function (u, l) {
        api().buff(u, { id: 'cleave', dur: this.dur[l], cleavePct: this.pct[l], cleaveR: this.radius, color: '#ffb03a' });
        api().ring(u.x, u.y, 100, '#ffb03a');
        return true;
      }
    },
    frenzy: {
      id: 'frenzy', name: 'Безумие', icon: '🔺', color: '#ff4d5e', type: 'active', ai: 'escape',
      mana: [60, 70, 80, 90], cd: [22, 20, 18, 16], dur: [5, 5.5, 6, 6.5], as: [80, 110, 145, 185], ls: [20, 28, 36, 46],
      desc: function (l) { return 'На ' + this.dur[l] + ' сек: +' + this.as[l] + '% скорости атаки и +' + this.ls[l] + '% вампиризма, но -35% брони.'; },
      cast: function (u, l) {
        api().buff(u, {
          id: 'frenzy', dur: this.dur[l], asMul: 1 + this.as[l] / 100,
          lifesteal: this.ls[l], armorMul: .65, color: '#ff4d5e', glow: '#ff4d5e'
        });
        api().ring(u.x, u.y, 120, '#ff4d5e'); api().shake(6);
        return true;
      }
    },
    bloodrage: {
      id: 'bloodrage', name: 'Кровавая ярость', icon: '🩸', color: '#a01f3a', type: 'passive',
      max: [35, 55, 78, 105],
      desc: function (l) { return 'Чем меньше здоровья, тем сильнее вы бьёте: до +' + this.max[l] + '% урона и скорости атаки при почти пустом здоровье.'; },
      apply: function (u, l, s) {
        var miss = 1 - (u.hp / Math.max(1, u.maxHp));
        var k = this.max[l] / 100 * miss;
        s.atk *= (1 + k); s.asMul *= (1 + k * .8);
      }
    },

    /* ---------------- Хладна ---------------- */
    nova: {
      id: 'nova', name: 'Морозная нова', icon: '❄', color: '#7fd4ff', type: 'active', ai: 'aoe',
      mana: [70, 85, 100, 115], cd: [8, 7, 6, 5], dmg: [120, 200, 285, 380], slow: [30, 40, 50, 60], radius: 210,
      desc: function (l) { return this.dmg[l] + ' магического урона вокруг и замедление на ' + this.slow[l] + '% на 3 сек.'; },
      cast: function (u, l) {
        var g = api(), self = this;
        g.ring(u.x, u.y, this.radius, '#7fd4ff'); g.shake(6);
        g.forEachEnemy(u, this.radius, function (e) {
          g.damage(u, e, self.dmg[l], 'magic');
          g.buff(e, { id: 'slow', dur: 3, msMul: 1 - self.slow[l] / 100, color: '#7fd4ff' });
        });
        return true;
      }
    },
    shackle: {
      id: 'shackle', name: 'Оковы льда', icon: '🧊', color: '#4aa8ff', type: 'active', ai: 'nuke',
      mana: [80, 95, 110, 125], cd: [15, 14, 13, 12], dur: [1.6, 2.1, 2.6, 3.1], dmg: [70, 130, 195, 265], range: 540,
      desc: function (l) { return 'Замораживает ближайшего врага на ' + this.dur[l] + ' сек и наносит ' + this.dmg[l] + ' магического урона.'; },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, this.range);
        if (!t) return false;
        g.damage(u, t, this.dmg[l], 'magic');
        g.buff(t, { id: 'freeze', dur: this.dur[l], stun: true, color: '#4aa8ff' });
        g.burst(t.x, t.y, '#7fd4ff', 16);
        return true;
      }
    },
    hail: {
      id: 'hail', name: 'Град', icon: '🌨', color: '#a8e4ff', type: 'active', ai: 'aoe',
      mana: [95, 115, 135, 155], cd: [16, 15, 14, 13], dps: [80, 135, 195, 265], dur: [4.5, 5, 5.5, 6], radius: 215, range: 640,
      desc: function (l) { return 'Ледяной град в области на ' + this.dur[l] + ' сек: ' + this.dps[l] + ' магического урона в секунду и замедление 45%.'; },
      cast: function (u, l) {
        var g = api(), c = g.bestCluster(u, this.radius, this.range), self = this;
        if (!c) return false;
        g.zone({
          x: c.x, y: c.y, r: this.radius, dur: this.dur[l], src: u, color: '#a8e4ff',
          onTick: function (z, dt) {
            g.aoeAt(u, z.x, z.y, z.r, self.dps[l] * dt, 'magic');
            g.aoeApply(u, z.x, z.y, z.r, function (e) { g.buff(e, { id: 'slow', dur: .5, msMul: .55, quiet: true }); });
          }
        });
        return true;
      }
    },
    chill: {
      id: 'chill', name: 'Аура холода', icon: '🌬', color: '#a8e4ff', type: 'passive',
      slow: [12, 18, 24, 30], mpReg: [1.4, 2.4, 3.6, 5], radius: 260,
      desc: function (l) { return 'Враги в радиусе медленнее на ' + this.slow[l] + '%. Вы получаете +' + this.mpReg[l] + ' восстановления маны.'; },
      apply: function (u, l, s) { s.mpReg += this.mpReg[l]; },
      tick: function (u, l) {
        var g = api(), self = this;
        g.aura(u, this.radius, 'rgba(127,212,255,.05)');
        g.forEachEnemy(u, this.radius, function (e) {
          g.buff(e, { id: 'chill', dur: .4, msMul: 1 - self.slow[l] / 100, quiet: true });
        });
      }
    },

    /* ---------------- Кровавый Рыцарь ---------------- */
    charge: {
      id: 'charge', name: 'Натиск', icon: '🐎', color: '#d13a3a', type: 'active', ai: 'gap',
      mana: [55, 65, 75, 85], cd: [10, 9, 8, 7], dmg: [120, 200, 290, 390], stun: [.8, 1.1, 1.4, 1.7], range: 620,
      desc: function (l) { return 'Врывается в цель: ' + this.dmg[l] + ' физического урона и оглушение на ' + this.stun[l] + ' сек.'; },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, this.range);
        if (!t) return false;
        g.dashTo(u, t, 46, '#d13a3a');
        g.damage(u, t, this.dmg[l], 'phys');
        g.buff(t, { id: 'freeze', dur: this.stun[l], stun: true, color: '#d13a3a' });
        g.shake(9); g.hitstop(.05);
        return true;
      }
    },
    crimson: {
      id: 'crimson', name: 'Багровый шквал', icon: '🔥', color: '#ff4d5e', type: 'active', ai: 'escape',
      mana: [70, 85, 100, 115], cd: [20, 18, 16, 14], heal: [18, 25, 32, 40], as: [40, 60, 80, 100], dur: [6, 6.5, 7, 7.5],
      desc: function (l) { return 'Лечит на ' + this.heal[l] + '% максимального здоровья и даёт +' + this.as[l] + '% скорости атаки на ' + this.dur[l] + ' сек.'; },
      cast: function (u, l) {
        var g = api(), h = u.maxHp * this.heal[l] / 100;
        u.hp = Math.min(u.maxHp, u.hp + h); g.heal(u, h);
        g.buff(u, { id: 'crimson', dur: this.dur[l], asMul: 1 + this.as[l] / 100, color: '#ff4d5e' });
        g.ring(u.x, u.y, 110, '#ff4d5e');
        return true;
      }
    },
    bloodoath: {
      id: 'bloodoath', name: 'Клятва крови', icon: '🗡', color: '#8a1030', type: 'active', ai: 'nuke',
      mana: [0, 0, 0, 0], cd: [14, 13, 12, 11], costPct: [15, 15, 15, 15], mult: [2.6, 3.4, 4.3, 5.4], range: 320,
      desc: function (l) {
        return 'Жертвует 15% текущего здоровья и наносит цели урон, равный x' + this.mult[l].toFixed(1) +
          ' от пожертвованного. Вампиризм с этого удара работает.';
      },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, this.range);
        if (!t) return false;
        var cost = u.hp * this.costPct[l] / 100;
        if (u.hp - cost < 1) return false;
        u.hp -= cost;
        g.slash(u, t, '#8a1030');
        g.damage(u, t, cost * this.mult[l], 'phys', true);
        g.shake(8); g.hitstop(.06); g.burst(t.x, t.y, '#8a1030', 22);
        return true;
      }
    },
    bloodpact: {
      id: 'bloodpact', name: 'Кровавая печать', icon: '🜂', color: '#a01f3a', type: 'passive',
      ls: [12, 19, 26, 34], reg: [3, 6, 10, 15],
      desc: function (l) { return '+' + this.ls[l] + '% вампиризма и +' + this.reg[l] + ' восстановления здоровья в секунду.'; },
      apply: function (u, l, s) { s.lifesteal += this.ls[l]; s.hpReg += this.reg[l]; }
    },

    /* ---------------- Клинок Тени ---------------- */
    dash: {
      id: 'dash', name: 'Рывок теней', icon: '⚡', color: '#b07dff', type: 'active', ai: 'gap',
      mana: [45, 55, 65, 75], cd: [7, 6, 5, 4], dmg: [90, 160, 240, 330], range: 580,
      desc: function (l) { return 'Мгновенно перемещается за спину врага и наносит ' + this.dmg[l] + ' физического урона.'; },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, this.range);
        if (!t) return false;
        g.blinkBehind(u, t, 52);
        g.damage(u, t, this.dmg[l], 'phys');
        g.burst(t.x, t.y, '#b07dff', 18); g.shake(5);
        return true;
      }
    },
    eclipse: {
      id: 'eclipse', name: 'Затмение', icon: '🌑', color: '#6a4fbf', type: 'active', ai: 'escape',
      mana: [70, 80, 90, 100], cd: [18, 16, 14, 12], dur: [4, 5, 6, 7], mul: [2.5, 3.2, 4, 5],
      desc: function (l) { return 'Полная невидимость на ' + this.dur[l] + ' сек — враги теряют вас из виду. Атака из невидимости наносит x' + this.mul[l].toFixed(1) + ' урона.'; },
      cast: function (u, l) {
        api().buff(u, { id: 'invis', dur: this.dur[l], invis: true, ambush: this.mul[l], ms: 70, color: '#6a4fbf' });
        api().burst(u.x, u.y, '#6a4fbf', 22);
        return true;
      }
    },
    bladefan: {
      id: 'bladefan', name: 'Веер клинков', icon: '✳', color: '#c9a0ff', type: 'active', ai: 'aoe',
      mana: [65, 80, 95, 110], cd: [11, 10, 9, 8], dmg: [70, 115, 165, 220], hits: [3, 4, 5, 6], radius: 165,
      desc: function (l) { return this.hits[l] + ' взмахов подряд по всем врагам вокруг, каждый на ' + this.dmg[l] + ' физического урона.'; },
      cast: function (u, l) {
        var g = api(), self = this, i = 0;
        var tick = function () {
          if (u.dead || i >= self.hits[l]) return;
          i++;
          g.ring(u.x, u.y, self.radius, '#c9a0ff');
          g.spinBurst(u, self.radius, '#c9a0ff');
          g.aoeAt(u, u.x, u.y, self.radius, self.dmg[l], 'phys');
          g.delay(.13, tick);
        };
        tick();
        return true;
      }
    },
    bloodlust: {
      id: 'bloodlust', name: 'Жажда крови', icon: '🩸', color: '#ff4d5e', type: 'passive',
      ls: [10, 16, 22, 28], as: [15, 25, 35, 46],
      desc: function (l) { return '+' + this.ls[l] + '% вампиризма и +' + this.as[l] + '% скорости атаки.'; },
      apply: function (u, l, s) { s.lifesteal += this.ls[l]; s.asMul *= (1 + this.as[l] / 100); }
    },

    /* ---------------- Дриада ---------------- */
    venom: {
      id: 'venom', name: 'Ядовитая стрела', icon: '🐍', color: '#7ac043', type: 'active', ai: 'nuke',
      mana: [50, 62, 74, 86], cd: [6, 5.4, 4.8, 4.2], dmg: [70, 115, 165, 220], dps: [30, 55, 84, 118], dur: [5, 5, 6, 6], range: 720,
      desc: function (l) { return this.dmg[l] + ' урона и яд: ' + this.dps[l] + ' магического урона в секунду ' + this.dur[l] + ' сек, замедление 25%.'; },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, this.range), self = this;
        if (!t) return false;
        g.projectile({
          from: u, to: t, speed: 900, r: 6, color: '#7ac043', trail: true, homing: true,
          onHit: function (x) {
            g.damage(u, x, self.dmg[l], 'phys');
            g.buff(x, { id: 'venom', dur: self.dur[l], dps: self.dps[l], dmgType: 'magic', src: u, msMul: .75, color: '#7ac043' });
          }
        });
        return true;
      }
    },
    roots: {
      id: 'roots', name: 'Оковы корней', icon: '🌿', color: '#3f8f5a', type: 'active', ai: 'aoe',
      mana: [70, 85, 100, 115], cd: [14, 13, 12, 11], dur: [1.8, 2.3, 2.8, 3.3], dmg: [60, 110, 165, 225], radius: 230,
      desc: function (l) { return 'Обездвиживает врагов в радиусе на ' + this.dur[l] + ' сек и наносит ' + this.dmg[l] + ' магического урона.'; },
      cast: function (u, l) {
        var g = api(), self = this;
        g.ring(u.x, u.y, this.radius, '#3f8f5a');
        return g.aoeApply(u, u.x, u.y, this.radius, function (e) {
          g.damage(u, e, self.dmg[l], 'magic');
          g.buff(e, { id: 'root', dur: self.dur[l], root: true, color: '#3f8f5a' });
        }) > 0;
      }
    },
    thorntrap: {
      id: 'thorntrap', name: 'Терновая ловушка', icon: '🌵', color: '#8fd66a', type: 'active', ai: 'aoe',
      mana: [80, 95, 110, 125], cd: [13, 12, 11, 10], dps: [95, 160, 235, 320], dur: [6, 6.5, 7, 7.5], radius: 175, range: 560,
      desc: function (l) { return 'Заросли терния на ' + this.dur[l] + ' сек: ' + this.dps[l] + ' физического урона в секунду и замедление 50% всем внутри.'; },
      cast: function (u, l) {
        var g = api(), c = g.bestCluster(u, this.radius, this.range), self = this;
        if (!c) return false;
        g.zone({
          x: c.x, y: c.y, r: this.radius, dur: this.dur[l], src: u, color: '#8fd66a', style: 'thorn',
          onTick: function (z, dt) {
            g.aoeAt(u, z.x, z.y, z.r, self.dps[l] * dt, 'phys');
            g.aoeApply(u, z.x, z.y, z.r, function (e) { g.buff(e, { id: 'slow', dur: .5, msMul: .5, quiet: true }); });
          }
        });
        return true;
      }
    },
    grace: {
      id: 'grace', name: 'Милость природы', icon: '🍃', color: '#8fd66a', type: 'passive',
      reg: [4, 8, 13, 19], ms: [20, 35, 50, 70],
      desc: function (l) { return '+' + this.reg[l] + ' восстановления здоровья и +' + this.ms[l] + ' к скорости передвижения.'; },
      apply: function (u, l, s) { s.hpReg += this.reg[l]; s.ms += this.ms[l]; }
    },

    /* ---------------- Пиромант ---------------- */
    firewave: {
      id: 'firewave', name: 'Огненная волна', icon: '🔥', color: '#ff7a2f', type: 'active', ai: 'aoe',
      mana: [80, 95, 110, 125], cd: [8, 7.2, 6.4, 5.6], dmg: [150, 250, 360, 480], range: 560,
      desc: function (l) { return 'Волна пламени пробивает всех на линии: ' + this.dmg[l] + ' магического урона.'; },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, 900), self = this;
        var a = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        g.projectile({
          from: u, angle: a, speed: 620, r: 24, color: '#ff7a2f', range: this.range, pierce: 99, trail: true, big: true,
          onHit: function (x) { g.damage(u, x, self.dmg[l], 'magic'); g.burst(x.x, x.y, '#ff7a2f', 8); }
        });
        g.shake(5);
        return true;
      }
    },
    ignite: {
      id: 'ignite', name: 'Поджог', icon: '🕯', color: '#ffb03a', type: 'active', ai: 'nuke',
      mana: [60, 75, 90, 105], cd: [10, 9, 8, 7], dps: [55, 95, 140, 195], dur: [6, 6, 7, 7], radius: 170, range: 620,
      desc: function (l) { return 'Поджигает врагов вокруг цели: ' + this.dps[l] + ' магического урона в секунду ' + this.dur[l] + ' сек.'; },
      cast: function (u, l) {
        var g = api(), c = g.bestCluster(u, this.radius, this.range), self = this;
        if (!c) return false;
        g.ring(c.x, c.y, this.radius, '#ffb03a');
        g.aoeApply(u, c.x, c.y, this.radius, function (e) {
          g.buff(e, { id: 'ignite', dur: self.dur[l], dps: self.dps[l], dmgType: 'magic', src: u, color: '#ffb03a' });
        });
        return true;
      }
    },
    flameaura: {
      id: 'flameaura', name: 'Пламенная аура', icon: '♨', color: '#ff5a2f', type: 'toggle', ai: 'aoe',
      mana: [0, 0, 0, 0], cd: [1, 1, 1, 1], dmg: [26, 46, 70, 96], mpDrain: [6, 8, 10, 12], radius: 150,
      desc: function (l) { return 'Аура: ' + this.dmg[l] + ' магического урона в секунду вокруг, расход ' + this.mpDrain[l] + ' маны в секунду.'; },
      cast: function (u) { u.toggles.flameaura = !u.toggles.flameaura; return true; },
      tick: function (u, l, dt) {
        if (!u.toggles.flameaura) return;
        if (u.mp <= 0) { u.toggles.flameaura = false; return; }
        var g = api();
        u.mp = Math.max(0, u.mp - this.mpDrain[l] * dt);
        g.aoeDamage(u, u.x, u.y, this.radius, this.dmg[l] * dt, 'magic');
        g.aura(u, this.radius, 'rgba(255,90,47,.15)');
      }
    },
    innerheat: {
      id: 'innerheat', name: 'Внутренний жар', icon: '☼', color: '#ff9a3a', type: 'passive',
      sp: [25, 45, 70, 100], burn: [20, 38, 60, 88],
      desc: function (l) { return '+' + this.sp[l] + ' к силе заклинаний. Ваши атаки поджигают цель на ' + this.burn[l] + ' урона в секунду на 3 сек.'; },
      apply: function (u, l, s) { s.sp += this.sp[l]; },
      onAttack: function (u, l, target) {
        api().buff(target, { id: 'ignite', dur: 3, dps: this.burn[l], dmgType: 'magic', src: u, color: '#ff9a3a' });
      }
    },

    /* ---------------- Голем ---------------- */
    slam: {
      id: 'slam', name: 'Удар оземь', icon: '👊', color: '#9a7b4f', type: 'active', ai: 'aoe',
      mana: [65, 80, 95, 110], cd: [9, 8, 7, 6], dmg: [130, 220, 320, 430], slow: [35, 45, 55, 65], radius: 220,
      desc: function (l) { return this.dmg[l] + ' физического урона вокруг и замедление на ' + this.slow[l] + '% на 3 сек.'; },
      cast: function (u, l) {
        var g = api(), self = this;
        g.ring(u.x, u.y, this.radius, '#9a7b4f'); g.shake(11); g.hitstop(.05);
        g.forEachEnemy(u, this.radius, function (e) {
          g.damage(u, e, self.dmg[l], 'phys');
          g.buff(e, { id: 'slow', dur: 3, msMul: 1 - self.slow[l] / 100, color: '#9a7b4f' });
        });
        return true;
      }
    },
    quake: {
      id: 'quake', name: 'Землетрясение', icon: '🌋', color: '#c07a3a', type: 'active', ai: 'aoe',
      mana: [100, 120, 140, 160], cd: [18, 16, 14, 12], dps: [70, 120, 175, 240], dur: [5, 5.5, 6, 6.5], radius: 250,
      desc: function (l) { return 'Земля трясётся ' + this.dur[l] + ' сек: ' + this.dps[l] + ' физического урона в секунду всем вокруг вас.'; },
      cast: function (u, l) {
        var g = api(), self = this;
        g.buff(u, {
          id: 'quake', dur: this.dur[l], color: '#c07a3a',
          onTick: function (unit, dt) {
            g.aoeDamage(unit, unit.x, unit.y, self.radius, self.dps[l] * dt, 'phys');
            g.aura(unit, self.radius, 'rgba(192,122,58,.13)');
            if (Math.random() < dt * 9) g.burst(unit.x + (Math.random() - .5) * self.radius * 1.7, unit.y + (Math.random() - .5) * self.radius * 1.7, '#c07a3a', 3);
          }
        });
        g.shake(8);
        return true;
      }
    },
    boulder: {
      id: 'boulder', name: 'Каменный кулак', icon: '🪨', color: '#8a8a8a', type: 'active', ai: 'nuke',
      mana: [55, 70, 85, 100], cd: [7, 6.2, 5.4, 4.6], dmg: [160, 270, 390, 525], radius: 110, range: 700,
      desc: function (l) { return 'Метает глыбу: ' + this.dmg[l] + ' физического урона по площади и оглушение на 1 сек.'; },
      cast: function (u, l) {
        var g = api(), t = g.pickTarget(u, this.range), self = this;
        if (!t) return false;
        g.projectile({
          from: u, to: t, speed: 700, r: 14, color: '#b0a08a', trail: true, homing: true, big: true, spin: true,
          onHit: function (x) {
            g.aoeAt(u, x.x, x.y, self.radius, self.dmg[l], 'phys');
            g.aoeApply(u, x.x, x.y, self.radius, function (e) { g.buff(e, { id: 'freeze', dur: 1, stun: true, color: '#8a8a8a' }); });
            g.ring(x.x, x.y, self.radius, '#b0a08a'); g.shake(9); g.hitstop(.05);
          }
        });
        return true;
      }
    },
    stoneskin: {
      id: 'stoneskin', name: 'Каменная кожа', icon: '🛡', color: '#8a8a8a', type: 'passive',
      armor: [5, 9, 14, 20], mr: [.08, .13, .18, .24],
      desc: function (l) { return '+' + this.armor[l] + ' брони и +' + Math.round(this.mr[l] * 100) + '% сопротивления магии.'; },
      apply: function (u, l, s) { s.armor += this.armor[l]; s.mr = Math.min(.8, s.mr + this.mr[l]); }
    },

    /* ---------------- Аркан: стихии ---------------- */
    elemFire: {
      id: 'elemFire', name: 'Пламя', icon: '🔥', color: '#ff5a2f', type: 'reagent', elem: 'F',
      mana: [0, 0, 0, 0], cd: [0, 0, 0, 0],
      desc: function (l) { return 'Стихия огня. Добавляет реагент в связку и усиливает все заклинания с огнём (уровень ' + (l + 1) + ').'; },
      cast: function (u) { api().addReagent(u, 'F'); return true; }
    },
    elemIce: {
      id: 'elemIce', name: 'Лёд', icon: '❄', color: '#7fd4ff', type: 'reagent', elem: 'I',
      mana: [0, 0, 0, 0], cd: [0, 0, 0, 0],
      desc: function (l) { return 'Стихия льда. Добавляет реагент в связку и усиливает все заклинания со льдом (уровень ' + (l + 1) + ').'; },
      cast: function (u) { api().addReagent(u, 'I'); return true; }
    },
    elemStorm: {
      id: 'elemStorm', name: 'Шторм', icon: '⚡', color: '#c9a0ff', type: 'reagent', elem: 'S',
      mana: [0, 0, 0, 0], cd: [0, 0, 0, 0],
      desc: function (l) { return 'Стихия бури. Добавляет реагент в связку и усиливает все заклинания с бурей (уровень ' + (l + 1) + ').'; },
      cast: function (u) { api().addReagent(u, 'S'); return true; }
    },
    arcana: {
      id: 'arcana', name: 'Аркана', icon: '🔮', color: '#b07dff', type: 'passive',
      sp: [30, 55, 85, 120], cdr: [8, 14, 20, 27],
      desc: function (l) { return '+' + this.sp[l] + ' к силе заклинаний и -' + this.cdr[l] + '% к перезарядке всех заклинаний.'; },
      apply: function (u, l, s) { s.sp += this.sp[l]; s.cdr += this.cdr[l]; }
    }
  };

  /* ================================================
        ЗАКЛИНАНИЯ АРКАНА — 10 КОМБИНАЦИЙ
        Ключ — отсортированная связка из F / I / S.
        pw = сумма уровней трёх использованных стихий (3..12)
     ================================================ */
  var INVOKE = {
    FFF: {
      key: 'FFF', name: 'Испепеление', icon: '☀', color: '#ff3a10', cd: 11, mana: 130,
      desc: 'Испепеляет одну цель колонной огня: 130 + 95 за силу связки магического урона.',
      cast: function (u, pw) {
        var g = api(), t = g.pickTarget(u, 760);
        if (!t) return false;
        var x = t.x, y = t.y;
        g.telegraph(x, y, 92, '#ff3a10', .4, function () {
          g.pillar(x, y, '#ff3a10');
          g.aoeAt(u, x, y, 92, 130 + 95 * pw, 'magic');
          g.burst(x, y, '#ff3a10', 40); g.shake(15); g.hitstop(.08); g.flash('#ff6a2f', .2);
        });
        return true;
      }
    },
    III: {
      key: 'III', name: 'Ледяная тюрьма', icon: '🧊', color: '#4aa8ff', cd: 14, mana: 140,
      desc: 'Замораживает всех врагов вокруг на 1 + 0.22 за силу связки секунд и наносит 60 + 45 за силу урона.',
      cast: function (u, pw) {
        var g = api();
        g.ring(u.x, u.y, 300, '#4aa8ff'); g.shake(9);
        return g.aoeApply(u, u.x, u.y, 300, function (e) {
          g.damage(u, e, 60 + 45 * pw, 'magic');
          g.buff(e, { id: 'freeze', dur: 1 + .22 * pw, stun: true, color: '#4aa8ff' });
        }) > 0;
      }
    },
    SSS: {
      key: 'SSS', name: 'Гнев небес', icon: '🌩', color: '#c9a0ff', cd: 12, mana: 135,
      desc: 'Буря молний: 4 + сила связки переходов по 70 + 55 за силу магического урона.',
      cast: function (u, pw) {
        var g = api(), t = g.pickTarget(u, 700);
        if (!t) return false;
        g.chainLightning(u, t, 70 + 55 * pw, 4 + pw, .88, '#c9a0ff');
        g.shake(8); g.flash('#c9a0ff', .16);
        return true;
      }
    },
    FFI: {
      key: 'FFI', name: 'Расплав', icon: '🌡', color: '#ff8a3a', cd: 13, mana: 130,
      desc: 'Расплавленная лужа на 6 сек: 25 + 22 за силу связки урона в секунду и -6 брони внутри.',
      cast: function (u, pw) {
        var g = api(), c = g.bestCluster(u, 190, 620);
        if (!c) return false;
        g.zone({
          x: c.x, y: c.y, r: 190, dur: 6, src: u, color: '#ff8a3a', style: 'lava',
          onTick: function (z, dt) {
            g.aoeAt(u, z.x, z.y, z.r, (25 + 22 * pw) * dt, 'magic');
            g.aoeApply(u, z.x, z.y, z.r, function (e) { g.buff(e, { id: 'melt', dur: .5, armor: -6, quiet: true }); });
          }
        });
        return true;
      }
    },
    FFS: {
      key: 'FFS', name: 'Хаос-метеор', icon: '☄', color: '#ff7a2f', cd: 15, mana: 150,
      desc: 'Катящийся метеор проходит через всех: 90 + 70 за силу связки урона и поджог.',
      cast: function (u, pw) {
        var g = api(), t = g.pickTarget(u, 900);
        var a = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        g.projectile({
          from: u, angle: a, speed: 330, r: 30, color: '#ff7a2f', range: 900, pierce: 99, trail: true, big: true, spin: true,
          onHit: function (x) {
            g.damage(u, x, 90 + 70 * pw, 'magic');
            g.buff(x, { id: 'ignite', dur: 4, dps: 20 + 12 * pw, dmgType: 'magic', src: u, color: '#ff9a3a' });
            g.burst(x.x, x.y, '#ff7a2f', 12);
          }
        });
        g.shake(7);
        return true;
      }
    },
    FIS: {
      key: 'FIS', name: 'Оглушающий взрыв', icon: '💠', color: '#7fd4ff', cd: 13, mana: 140,
      desc: 'Конус ударной волны: 80 + 62 за силу связки урона, отбрасывание и оглушение на 1.2 сек.',
      cast: function (u, pw) {
        var g = api(), t = g.pickTarget(u, 700);
        var a = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        g.cone(u, a, 460, 1.0, '#7fd4ff', function (e) {
          g.damage(u, e, 80 + 62 * pw, 'magic');
          g.knockback(e, u, 150);
          g.buff(e, { id: 'freeze', dur: 1.2, stun: true, color: '#7fd4ff' });
        });
        g.shake(10); g.hitstop(.06);
        return true;
      }
    },
    FII: {
      key: 'FII', name: 'Стена льда', icon: '🧱', color: '#a8e4ff', cd: 12, mana: 125,
      desc: 'Стена изо льда на 7 сек: режет на 20 + 18 за силу связки урона в секунду и замедляет на 60%.',
      cast: function (u, pw) {
        var g = api(), t = g.pickTarget(u, 600);
        var a = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        g.wall(u, a, 300, 7, '#a8e4ff', function (e, dt) {
          g.damage(u, e, (20 + 18 * pw) * dt, 'magic');
          g.buff(e, { id: 'slow', dur: .5, msMul: .4, quiet: true });
        });
        return true;
      }
    },
    FSS: {
      key: 'FSS', name: 'Ускорение', icon: '⏫', color: '#ffd24a', cd: 16, mana: 120,
      desc: 'На 8 сек: +8% за силу связки скорости атаки и передвижения, атаки бьют молнией.',
      cast: function (u, pw) {
        var g = api();
        g.buff(u, {
          id: 'alacrity', dur: 8, asMul: 1 + .08 * pw, ms: 12 * pw,
          zap: 14 * pw, color: '#ffd24a', glow: '#ffd24a'
        });
        g.ring(u.x, u.y, 120, '#ffd24a');
        return true;
      }
    },
    IIS: {
      key: 'IIS', name: 'Морозный шаг', icon: '👻', color: '#a8e4ff', cd: 15, mana: 110,
      desc: 'Невидимость на 2 + 0.4 за силу связки секунд, +40% скорости и лечение 8% здоровья в секунду.',
      cast: function (u, pw) {
        var g = api();
        g.buff(u, { id: 'invis', dur: 2 + .4 * pw, invis: true, ambush: 2, msMul: 1.4, regenPct: 8, color: '#a8e4ff' });
        g.burst(u.x, u.y, '#a8e4ff', 24);
        return true;
      }
    },
    ISS: {
      key: 'ISS', name: 'Смерч', icon: '🌪', color: '#9ad4ff', cd: 14, mana: 145,
      desc: 'Смерч летит по линии, подбрасывая врагов: 70 + 58 за силу связки урона и оглушение на 1.8 сек.',
      cast: function (u, pw) {
        var g = api(), t = g.pickTarget(u, 900);
        var a = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face;
        g.projectile({
          from: u, angle: a, speed: 560, r: 26, color: '#9ad4ff', range: 900, pierce: 99, trail: true, big: true, spin: true,
          onHit: function (x) {
            g.damage(u, x, 70 + 58 * pw, 'magic');
            g.buff(x, { id: 'freeze', dur: 1.8, stun: true, lift: true, color: '#9ad4ff' });
            g.burst(x.x, x.y, '#9ad4ff', 14);
          }
        });
        return true;
      }
    }
  };

  /* ================================================
                        ГЕРОИ
     ================================================ */
  var HEROES = [
    {
      id: 'butcher', name: 'Мясник', role: 'ТАНК · БЛИЖНИЙ БОЙ', cost: 0, shape: 'brute', anim: 'heavy',
      c1: '#c0563a', c2: '#5e2418', primary: 'str',
      tip: 'Цепляет крюком, стягивает врагов в кучу и переваривает их аурой гнили.',
      attr: { str: 25, agi: 14, int: 14 }, gain: { str: 3.4, agi: 1.5, int: 1.6 },
      base: { atk: 26, armor: 1, ms: 250, as: .72, range: 68, mr: .25 },
      skills: ['hook', 'rot', 'dismember', 'feast']
    },
    {
      id: 'ranger', name: 'Егерь', role: 'СТРЕЛОК · ДАЛЬНИЙ БОЙ', cost: 0, shape: 'archer', anim: 'draw',
      c1: '#3f8f5a', c2: '#1d4a2c', primary: 'agi',
      tip: 'Классический керри: слаб в начале, разносит всё к поздним волнам.',
      attr: { str: 18, agi: 24, int: 15 }, gain: { str: 1.9, agi: 2.9, int: 1.7 },
      base: { atk: 22, armor: 0, ms: 285, as: .82, range: 480, mr: .25 },
      skills: ['volley', 'hawkeye', 'pierceshot', 'marks']
    },
    {
      id: 'berserk', name: 'Берсерк', role: 'БОЕЦ · ЯРОСТЬ', cost: 700, shape: 'berserk', anim: 'frenzy',
      c1: '#e8571a', c2: '#5a1a06', primary: 'str',
      tip: 'Чем ближе к смерти, тем страшнее. Прыгает в толпу и рубит по площади.',
      attr: { str: 24, agi: 19, int: 12 }, gain: { str: 3.3, agi: 2.1, int: 1.3 },
      base: { atk: 26, armor: 1, ms: 290, as: .80, range: 72, mr: .25 },
      skills: ['leap', 'cleave', 'frenzy', 'bloodrage']
    },
    {
      id: 'frost', name: 'Хладна', role: 'КОНТРОЛЬ · МАГ', cost: 1100, shape: 'witch', anim: 'float',
      c1: '#4aa8ff', c2: '#123a6b', primary: 'int',
      tip: 'Замораживает, замедляет и не даёт врагам до себя дойти.',
      attr: { str: 16, agi: 14, int: 25 }, gain: { str: 1.8, agi: 1.5, int: 3.2 },
      base: { atk: 20, armor: 0, ms: 275, as: .70, range: 430, mr: .30 },
      skills: ['nova', 'shackle', 'hail', 'chill']
    },
    {
      id: 'knight', name: 'Кровавый Рыцарь', role: 'БОЕЦ · ВАМПИРИЗМ', cost: 1500, shape: 'knight', anim: 'charge',
      c1: '#d13a3a', c2: '#4a1010', primary: 'str',
      tip: 'Врывается в гущу, лечится от собственного урона и платит здоровьем за силу.',
      attr: { str: 24, agi: 18, int: 15 }, gain: { str: 3.1, agi: 1.9, int: 1.6 },
      base: { atk: 25, armor: 2, ms: 280, as: .78, range: 66, mr: .25 },
      skills: ['charge', 'crimson', 'bloodoath', 'bloodpact']
    },
    {
      id: 'shadow', name: 'Клинок Тени', role: 'АССАСИН · БЛИЖНИЙ БОЙ', cost: 1900, shape: 'rogue', anim: 'swift',
      c1: '#b07dff', c2: '#3a1f6b', primary: 'agi',
      tip: 'Прыгает в тыл, вырезает магов и уходит в невидимость.',
      attr: { str: 17, agi: 26, int: 14 }, gain: { str: 1.8, agi: 3.1, int: 1.5 },
      base: { atk: 24, armor: 1, ms: 310, as: .90, range: 66, mr: .25 },
      skills: ['dash', 'eclipse', 'bladefan', 'bloodlust']
    },
    {
      id: 'dryad', name: 'Дриада', role: 'СТРЕЛОК · КОНТРОЛЬ', cost: 2300, shape: 'dryad', anim: 'nimble',
      c1: '#6ac07a', c2: '#1f4a28', primary: 'agi',
      tip: 'Травит ядом, сковывает корнями и держит дистанцию за счёт регенерации.',
      attr: { str: 17, agi: 25, int: 16 }, gain: { str: 1.9, agi: 2.8, int: 1.9 },
      base: { atk: 21, armor: 1, ms: 295, as: .80, range: 460, mr: .25 },
      skills: ['venom', 'roots', 'thorntrap', 'grace']
    },
    {
      id: 'arcanist', name: 'Аркан', role: 'МАГ · КОМБИНАЦИИ СТИХИЙ', cost: 2800, shape: 'mage', anim: 'orbit',
      c1: '#ff7a2f', c2: '#3a2a6b', primary: 'int', invoker: true,
      tip: 'Три стихии складываются в связку из трёх реагентов — 10 разных заклинаний.',
      attr: { str: 15, agi: 13, int: 27 }, gain: { str: 1.7, agi: 1.4, int: 3.5 },
      base: { atk: 19, armor: 0, ms: 270, as: .68, range: 400, mr: .30 },
      skills: ['elemFire', 'elemIce', 'elemStorm', 'arcana']
    },
    {
      id: 'pyro', name: 'Пиромант', role: 'МАГ · УРОН ПО ВРЕМЕНИ', cost: 3400, shape: 'pyro', anim: 'flame',
      c1: '#ff5a2f', c2: '#5a1c06', primary: 'int',
      tip: 'Поджигает толпу и дожигает её, пока сам держится в стороне.',
      attr: { str: 16, agi: 13, int: 26 }, gain: { str: 1.8, agi: 1.4, int: 3.4 },
      base: { atk: 20, armor: 0, ms: 275, as: .70, range: 420, mr: .30 },
      skills: ['firewave', 'ignite', 'flameaura', 'innerheat']
    },
    {
      id: 'golem', name: 'Голем', role: 'ТАНК · ПЛОЩАДНОЙ УРОН', cost: 4200, shape: 'golem', anim: 'stone',
      c1: '#9a7b4f', c2: '#3a2c18', primary: 'str',
      tip: 'Самый живучий герой: стоит в центре толпы и перемалывает её землетрясением.',
      attr: { str: 28, agi: 12, int: 12 }, gain: { str: 4.0, agi: 1.2, int: 1.3 },
      base: { atk: 28, armor: 3, ms: 245, as: .68, range: 74, mr: .25 },
      skills: ['slam', 'quake', 'boulder', 'stoneskin']
    }
  ];

  /* ================================================
        КАРТЫ — своя арена под каждого героя
        props: [тип, количество]
     ================================================ */
  var MAPS = {
    butcher: {
      name: 'Скотобойня', floor: '#2a1817', floor2: '#100a09', accent: '#c0563a',
      tint: 'rgba(120,30,20,.14)', fog: '#3a1410',
      props: [['pillar', 5], ['bones', 16], ['brazier', 4], ['puddle', 7]]
    },
    ranger: {
      name: 'Лесная опушка', floor: '#1d3324', floor2: '#0a1410', accent: '#6ac07a',
      tint: 'rgba(40,110,60,.12)', fog: '#12291a',
      props: [['tree', 10], ['stump', 5], ['grass', 20]]
    },
    berserk: {
      name: 'Ледяной фьорд', floor: '#1f2a38', floor2: '#0a0f16', accent: '#e8571a',
      tint: 'rgba(60,110,160,.12)', fog: '#16202c',
      props: [['rock', 8], ['ice', 6], ['ruin', 4], ['bones', 8]]
    },
    frost: {
      name: 'Замёрзшее озеро', floor: '#1a2c40', floor2: '#080e18', accent: '#7fd4ff',
      tint: 'rgba(70,140,210,.15)', fog: '#122338',
      props: [['ice', 9], ['crystal', 7], ['rock', 5]]
    },
    knight: {
      name: 'Разрушенный замок', floor: '#292430', floor2: '#0e0c12', accent: '#d13a3a',
      tint: 'rgba(120,50,60,.12)', fog: '#241a22',
      props: [['ruin', 7], ['pillar', 6], ['brazier', 5], ['bones', 6]]
    },
    shadow: {
      name: 'Ночные катакомбы', floor: '#1c1a2a', floor2: '#08070e', accent: '#b07dff',
      tint: 'rgba(90,60,160,.14)', fog: '#191428',
      props: [['pillar', 8], ['bones', 14], ['ruin', 4], ['brazier', 3]]
    },
    dryad: {
      name: 'Священная роща', floor: '#1a3326', floor2: '#08140e', accent: '#8fd66a',
      tint: 'rgba(60,150,90,.13)', fog: '#0f2818',
      props: [['tree', 12], ['grass', 22], ['crystal', 4], ['stump', 4]]
    },
    arcanist: {
      name: 'Парящие руины', floor: '#231e38', floor2: '#0b0918', accent: '#c9a0ff',
      tint: 'rgba(120,90,200,.13)', fog: '#1c1730',
      props: [['pillar', 9], ['crystal', 8], ['ruin', 5]]
    },
    pyro: {
      name: 'Вулканический кратер', floor: '#2e1a12', floor2: '#120806', accent: '#ff7a2f',
      tint: 'rgba(180,70,20,.16)', fog: '#3a1608',
      props: [['lava', 7], ['rock', 9], ['brazier', 4]]
    },
    golem: {
      name: 'Каменоломня', floor: '#2b2620', floor2: '#100e0a', accent: '#c07a3a',
      tint: 'rgba(140,110,70,.12)', fog: '#241f18',
      props: [['rock', 12], ['ruin', 5], ['stump', 4], ['crystal', 3]]
    },
    training: {
      name: 'Учебный полигон', floor: '#1c2436', floor2: '#0a0e16', accent: '#3ddb7f',
      tint: 'rgba(60,140,110,.10)', fog: '#141c28',
      props: [['pillar', 4], ['crystal', 3]]
    }
  };

  /* ================================================
                      ПРЕДМЕТЫ
     ================================================ */
  var ITEMS = [
    { id: 'i_str', name: 'Пояс силача', cost: 420, t: 1, s: { str: 8 }, d: '+8 силы' },
    { id: 'i_agi', name: 'Перчатки ловкача', cost: 420, t: 1, s: { agi: 8 }, d: '+8 ловкости' },
    { id: 'i_int', name: 'Обруч мудреца', cost: 420, t: 1, s: { int: 8 }, d: '+8 интеллекта' },
    { id: 'blade', name: 'Клинок новичка', cost: 460, t: 1, s: { atk: 16 }, d: '+16 к урону атаки' },
    { id: 'mail', name: 'Кольчуга', cost: 500, t: 1, s: { armor: 6 }, d: '+6 брони' },
    { id: 'boots', name: 'Сапоги скорости', cost: 500, t: 1, s: { ms: 55 }, d: '+55 к скорости' },
    { id: 'vitality', name: 'Талисман жизни', cost: 620, t: 1, s: { str: 12, hpReg: 3 }, d: '+12 силы, +3 регена здоровья' },
    { id: 'crystal', name: 'Кристалл маны', cost: 600, t: 1, s: { int: 10, mpReg: 1.2 }, d: '+10 интеллекта, +1.2 регена маны' },
    { id: 'quiver', name: 'Лёгкий колчан', cost: 560, t: 1, s: { asPct: 22, range: 40 }, d: '+22% скорости атаки, +40 дальности' },
    { id: 'shieldw', name: 'Плетёный щит', cost: 540, t: 1, s: { armor: 4, mr: .08 }, d: '+4 брони, +8% сопр. магии' },

    { id: 'fang', name: 'Клык вампира', cost: 1300, t: 2, s: { lifesteal: 18, atk: 12 }, d: '+18% вампиризма, +12 к урону' },
    { id: 'gauntlet', name: 'Перчатки бури', cost: 1400, t: 2, s: { asPct: 45, agi: 10 }, d: '+45% скорости атаки, +10 ловкости' },
    { id: 'cloak', name: 'Плащ теней', cost: 1250, t: 2, s: { mr: .18, ms: 30 }, d: '+18% сопр. магии, +30 к скорости' },
    { id: 'staff', name: 'Посох мудреца', cost: 1500, t: 2, s: { sp: 50, int: 12 }, d: '+50 силы заклинаний, +12 интеллекта' },
    { id: 'hammer', name: 'Молот войны', cost: 1700, t: 2, s: { atk: 46, str: 8 }, d: '+46 к урону, +8 силы' },
    { id: 'plate', name: 'Латный доспех', cost: 1600, t: 2, s: { armor: 12, str: 10 }, d: '+12 брони, +10 силы' },
    { id: 'chalice', name: 'Чаша ясности', cost: 1450, t: 2, s: { int: 18, mpReg: 3.5, cdr: 8 }, d: '+18 интеллекта, +3.5 регена маны, -8% перезарядки' },
    { id: 'talons', name: 'Когти хищника', cost: 1550, t: 2, s: { crit: 18, critMult: 1.9, agi: 8 }, d: '+18% крита (x1.9), +8 ловкости' },
    { id: 'lantern', name: 'Фонарь охотника', cost: 1350, t: 2, s: { range: 130, atk: 14 }, d: '+130 дальности, +14 к урону' },
    { id: 'brooch', name: 'Брошь стойкости', cost: 1500, t: 2, s: { str: 16, hpReg: 8, armor: 4 }, d: '+16 силы, +8 регена, +4 брони' },

    { id: 'fury', name: 'Клинок ярости', cost: 2400, t: 3, s: { crit: 28, critMult: 2.2, atk: 24 }, d: '+28% крита (x2.2), +24 к урону' },
    { id: 'travel', name: 'Ботинки-путешественники', cost: 2200, t: 3, s: { ms: 100, asPct: 20, agi: 10 }, d: '+100 скорости, +20% скор. атаки' },
    { id: 'aegis', name: 'Эгида', cost: 2700, t: 3, s: { armor: 14, str: 22, mr: .10 }, d: '+14 брони, +22 силы, +10% сопр. магии' },
    { id: 'crown', name: 'Корона архимага', cost: 2900, t: 3, s: { sp: 85, cdr: 18, int: 16 }, d: '+85 силы заклинаний, -18% перезарядки' },
    { id: 'maul', name: 'Молот титанов', cost: 3000, t: 3, s: { atk: 70, str: 16 }, d: '+70 к урону, +16 силы' },
    { id: 'veil', name: 'Покров бездны', cost: 2600, t: 3, s: { mr: .30, int: 18, mpReg: 4 }, d: '+30% сопр. магии, +18 интеллекта' },

    { id: 'heart', name: 'Сердце титана', cost: 4200, t: 4, s: { str: 45, hpReg: 18, armor: 6 }, d: '+45 силы, +18 регена, +6 брони' },
    { id: 'scythe', name: 'Коса жнеца', cost: 4400, t: 4, s: { atk: 80, lifesteal: 26, agi: 14 }, d: '+80 к урону, +26% вампиризма' },
    { id: 'grimoire', name: 'Гримуар пустоты', cost: 4500, t: 4, s: { sp: 130, int: 30, cdr: 22 }, d: '+130 силы заклинаний, +30 интеллекта, -22% перезарядки' },
    { id: 'bulwark', name: 'Оплот вечности', cost: 4600, t: 4, s: { armor: 22, mr: .28, str: 26, hpReg: 10 }, d: '+22 брони, +28% сопр. магии, +26 силы' }
  ];

  var RARITY = {
    1: { name: 'Обычный', c: '#8b97bd' },
    2: { name: 'Редкий', c: '#4aa8ff' },
    3: { name: 'Эпический', c: '#b07dff' },
    4: { name: 'Легендарный', c: '#ffc043' }
  };

  /* ================================================
        ВРАГИ — отдельный визуальный язык:
        угловатые тёмные твари, не похожие на героев
     ================================================ */
  var ENEMIES = [
    { id: 'grunt', name: 'Порождение', shape: 'e_husk', c1: '#6a3a3a', c2: '#2a1010', glow: '#ff5a4a', hp: 215, atk: 24, armor: 1, ms: 200, as: .8, range: 62, r: 18, from: 1, weight: 10 },
    { id: 'archer', name: 'Костеплюй', shape: 'e_spitter', c1: '#3a5a6a', c2: '#101e28', glow: '#4affd0', hp: 160, atk: 27, armor: 0, ms: 190, as: .75, range: 360, r: 17, from: 1, weight: 8 },
    { id: 'stalker', name: 'Тенегон', shape: 'e_stalker', c1: '#2a5a48', c2: '#0c1e18', glow: '#4aff9a', hp: 200, atk: 30, armor: 1, ms: 305, as: 1.1, range: 60, r: 16, from: 3, weight: 7 },
    { id: 'brute', name: 'Костолом', shape: 'e_brute', c1: '#5a4a2a', c2: '#221a0c', glow: '#ffb03a', hp: 450, atk: 38, armor: 4, ms: 175, as: .6, range: 72, r: 24, from: 4, weight: 6 },
    { id: 'shaman', name: 'Скверноус', shape: 'e_caster', c1: '#4a2a6a', c2: '#1a0c28', glow: '#c04aff', hp: 180, atk: 36, armor: 0, ms: 195, as: .62, range: 330, r: 17, from: 5, weight: 6, magic: true },
    { id: 'bomber', name: 'Гнойник', shape: 'e_bomb', c1: '#7a6a1a', c2: '#2a2408', glow: '#ffe04a', hp: 150, atk: 10, armor: 0, ms: 330, as: .5, range: 40, r: 17, from: 6, weight: 5, role: 'bomber', boomDmg: 130, boomR: 155 },
    { id: 'healer', name: 'Гнилодух', shape: 'e_healer', c1: '#2a6a4a', c2: '#0c2418', glow: '#5affb0', hp: 190, atk: 18, armor: 0, ms: 210, as: .6, range: 300, r: 17, from: 7, weight: 4, role: 'healer', healPs: 26, healR: 280 },
    { id: 'shieldman', name: 'Панцирник', shape: 'e_shell', c1: '#3a4a5a', c2: '#141c24', glow: '#7ab0ff', hp: 380, atk: 30, armor: 12, ms: 160, as: .55, range: 66, r: 22, from: 8, weight: 5 },
    { id: 'swarm', name: 'Гнус', shape: 'e_swarm', c1: '#6a7a1a', c2: '#242a08', glow: '#d0ff4a', hp: 70, atk: 14, armor: 0, ms: 360, as: 1.5, range: 44, r: 11, from: 9, weight: 6, pack: 4 },
    { id: 'hexer', name: 'Проклятая', shape: 'e_hex', c1: '#6a1a5a', c2: '#260820', glow: '#ff4ad0', hp: 200, atk: 32, armor: 1, ms: 200, as: .55, range: 380, r: 18, from: 11, weight: 5, magic: true, role: 'hexer' }
  ];

  var BOSSES = [
    { id: 'b1', name: 'Костяной Владыка', shape: 'e_boss_bone', c1: '#c8c0a8', c2: '#3a3428', glow: '#ffe8a0', hpMul: 5.2, atkMul: 1.9, armor: 8, ms: 195, as: .7, range: 88, r: 36, ability: 'slam' },
    { id: 'b2', name: 'Пожиратель Бездны', shape: 'e_boss_maw', c1: '#7a2050', c2: '#2a0a1c', glow: '#ff4a9a', hpMul: 6.0, atkMul: 2.0, armor: 10, ms: 185, as: .65, range: 94, r: 38, ability: 'grab' },
    { id: 'b3', name: 'Архонт Пустоты', shape: 'e_boss_void', c1: '#4a6ac8', c2: '#141c3a', glow: '#8ab0ff', hpMul: 5.0, atkMul: 2.2, armor: 7, ms: 205, as: .8, range: 400, r: 34, magic: true, ability: 'meteor' },
    { id: 'b4', name: 'Кузнец Пепла', shape: 'e_boss_forge', c1: '#c85a20', c2: '#3a1a06', glow: '#ffa04a', hpMul: 6.6, atkMul: 2.1, armor: 12, ms: 180, as: .7, range: 90, r: 40, ability: 'ring' }
  ];

  var DUMMY = {
    id: 'dummy', name: 'Манекен', shape: 'e_dummy', c1: '#5a5a6a', c2: '#1a1a24', glow: '#8b97bd',
    hp: 12000, atk: 0, armor: 0, ms: 0, as: 0, range: 0, r: 22, role: 'dummy'
  };

  /* ================================================
                      ЭКОНОМИКА
     ================================================ */
  root.DATA = {
    ATTR: ATTR, ATTR_NAME: ATTR_NAME, ATTR_COLOR: ATTR_COLOR,
    SKILLS: SKILLS, INVOKE: INVOKE, HEROES: HEROES, MAPS: MAPS,
    ITEMS: ITEMS, RARITY: RARITY, ENEMIES: ENEMIES, BOSSES: BOSSES, DUMMY: DUMMY,
    SELL_RATE: 0.6,

    goldPerWave: function (w) { return Math.round(260 + 88 * w + 5 * w * w); },
    xpPerWave: function (w) { return Math.round(50 + 28 * w); },
    xpToLevel: function (lv) { return Math.round(110 * Math.pow(1.27, lv - 1)); },
    soulsFor: function (wave, kills) { return Math.round(wave * 28 + kills * 3); },
    enemyScale: function (w) { return 1 + 0.135 * (w - 1) + 0.0062 * (w - 1) * (w - 1); },
    enemyCount: function (w) { return Math.min(2 + Math.floor(w / 2), 7); },

    rollEnemy: function (w) {
      var pool = ENEMIES.filter(function (e) { return w >= e.from; });
      var total = 0, i;
      for (i = 0; i < pool.length; i++) total += pool[i].weight;
      var r = Math.random() * total;
      for (i = 0; i < pool.length; i++) { r -= pool[i].weight; if (r <= 0) return pool[i]; }
      return pool[0] || ENEMIES[0];
    },

    comboKey: function (arr) {
      return arr.slice().sort().join('');
    }
  };

})(window);
