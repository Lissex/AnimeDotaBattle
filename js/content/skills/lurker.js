/* content/skills/lurker — Хищник Глубин.

   Дуэлянт: чем дольше идёт бой, тем он сильнее, а жертва слабее.
   Пьёт сущность из тех, кого бьёт, привязывает жертву к себе
   и уходит в тень, из которой можно бить не раскрываясь.

   Оригинал разделяет врождённую способность и пассивку; у нас
   у каждого героя ровно три активных и одна пассивная, поэтому
   «дыхание глубин» (регенерация вне чужих глаз) сложено в ту же
   пассивку, что и кража сущности — они об одном и том же.

   Архетип узнаваем, но имя и облик собственные: прямое
   использование персонажа Dota 2 нарушает п.3.5 требований. */
(function () {
  'use strict';
  var S = AA.Content.skills, g = S.g;

  /** Дебаффы, которые снимает Тёмный договор. */
  var DEBUFFS = ['slow', 'freeze', 'root', 'venom', 'ignite', 'hex',
    'chill', 'acid', 'plague', 'burn', 'bleed'];

  S.add({

    /* ================= Тёмный договор (1) =================
       Взрыв не мгновенный: полторы секунды герой стоит помеченным,
       и только потом вокруг него бьёт волна. Задержка — это и есть
       цена: за неё враг успевает отойти, зато договор снимает с
       героя весь контроль. С Осколком снятие идёт сразу. */
    darkpact: {
      id: 'darkpact', name: 'Тёмный договор', icon: '☠', color: '#5ad8c0',
      type: 'active', ai: 'aoe',
      mana: [55, 55, 55, 55], cd: [9, 8, 7, 6],
      dmg: [75, 150, 225, 300], radius: 325, delay: 1.5,
      desc: function (l) {
        return 'Через ' + this.delay + ' сек вокруг вас бьёт волна на ' + this.dmg[l] +
          ' магического урона в радиусе ' + this.radius +
          ' и снимает с вас отрицательные эффекты. ' +
          'С Осколком Аганима эффекты снимаются сразу при активации.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        var shard = a.shard(u);
        var dmg = self.dmg[l] * (a.talent(u, 'lu_pact_dmg') ? 1.6 : 1);
        var r = self.radius;

        // с Осколком контроль слетает мгновенно, а не в момент взрыва
        if (shard) cleanse(u, a);

        a.buff(u, {
          id: 'darkpact', dur: self.delay, color: '#5ad8c0', glow: '#5ad8c0'
        });
        a.ring(u.x, u.y, r * .35, '#5ad8c0');

        // предупреждение видно и игроку, и автобою
        a.telegraph(u.x, u.y, r, '#5ad8c0', self.delay, function () { });

        a.delay(self.delay, function () {
          if (u.dead) return;
          if (!shard) cleanse(u, a);

          a.aoeAt(u, u.x, u.y, r, dmg + u.stats.sp * 1.1, 'magic');
          a.ring(u.x, u.y, r, '#5ad8c0');
          a.burst(u.x, u.y, '#5ad8c0', 30);
          a.spinBurst(u, r * .5, '#a8fff0');
          a.shake(7); a.hitstop(.03);
        });
        return true;
      }
    },

    /* ================= Прыжок (2) =================
       Рывок вперёд; первый, кого задели, оказывается на привязи:
       ходить может, оторваться — нет. Верёвка натягивается сама. */
    pounce: {
      id: 'pounce', name: 'Прыжок', icon: '⇱', color: '#3ad8e8',
      type: 'active', ai: 'gap',
      mana: [60, 60, 60, 60], cd: [20, 16, 12, 8],
      dur: [2.5, 2.75, 3, 3.25], dist: 700, grab: 110, leash: 350,
      desc: function (l) {
        return 'Рывок на ' + this.dist + ' вперёд. Первый задетый враг сажается ' +
          'на привязь на ' + this.dur[l] + ' сек: он может двигаться, но не может ' +
          'уйти дальше ' + this.leash + ' от места захвата.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        var dur = self.dur[l] + (a.talent(u, 'lu_leash_long') ? 1.5 : 0);
        var hunter = a.talent(u, 'lu_nighthunter');

        var ang = u.face || 0;
        var tx = u.x + Math.cos(ang) * self.dist;
        var ty = u.y + Math.sin(ang) * self.dist;

        a.burst(u.x, u.y, '#3ad8e8', 18);

        a.leapTo(u, tx, ty, .34, function () {
          a.ring(u.x, u.y, 120, '#3ad8e8');
          a.sparks(u.x, u.y, '#3ad8e8', 14);

          // цепляем ближайшего в радиусе захвата
          var t = a.nearestEnemy(u, self.grab);
          if (!t) return;
          leash(u, t, dur, self.leash, a);
        });

        // «Ночной охотник»: пока идёт погоня, контроль почти не берёт
        if (hunter) {
          a.buff(u, {
            id: 'nighthunter', dur: dur + .4, mr: .12, msMul: 1.1,
            color: '#3ad8e8', glow: '#3ad8e8'
          });
        }
        return true;
      }
    },

    /* ================= Теневой танец (3) =================
       Невидимость, которая не спадает от атак: единственная в игре.
       Обычная невидимость держится на поле ambush и слетает первым
       же ударом — здесь его нет намеренно. */
    shadowdance: {
      id: 'shadowdance', name: 'Теневой танец', icon: '🌘', color: '#7a5ae8',
      type: 'active', ai: 'escape',
      mana: [75, 75, 75, 75], cd: [80, 72, 64, 56],
      dur: [4, 4.5, 5, 5.5], ms: [30, 40, 50, 60], regen: [30, 45, 60, 75],
      desc: function (l) {
        return 'Полная невидимость на ' + this.dur[l] + ' сек — атаки и умения ' +
          'её не снимают. +' + this.ms[l] + '% скорости передвижения и ' +
          this.regen[l] + ' здоровья в секунду.';
      },
      cast: function (u, l) {
        var a = g(), self = this;

        var dur = self.dur[l] + (a.talent(u, 'lu_dance_long') ? 1.8 : 0);

        a.buff(u, {
          id: 'invis', dur: dur, invis: true,          // без ambush: не спадает от удара
          msMul: 1 + self.ms[l] / 100, hpReg: self.regen[l],
          color: '#7a5ae8', glow: '#7a5ae8'
        });
        // отдельная метка: пассивка и таланты смотрят именно на танец
        a.buff(u, { id: 'shadowdance', dur: dur, color: '#7a5ae8' });

        a.ring(u.x, u.y, 200, '#7a5ae8');
        a.burst(u.x, u.y, '#7a5ae8', 34);
        a.flash('#7a5ae8', .16);

        // «Глубинная дымка»: после ухода в тень остаётся облако,
        // слепящее всех внутри — врагам не за кем идти
        if (a.talent(u, 'lu_deepmist')) {
          a.zone({
            x: u.x, y: u.y, r: 300, dur: dur, src: u, color: '#7a5ae8', style: 'circle',
            onTick: function (z, dt) {
              a.aoeApply(u, z.x, z.y, z.r, function (e) {
                a.buff(e, { id: 'slow', dur: .4, msMul: .55, quiet: true, color: '#7a5ae8' });
              });
            }
          });
        }
        return true;
      }
    },

    /* ================= Кража сущности (пассивное) =================
       Два эффекта, но об одном: герой тем сильнее, чем дольше
       остаётся хищником — пьёт сущность из тех, кого бьёт, и
       залечивается, пока его никто не видит. */
    essence: {
      id: 'essence', name: 'Кража сущности', icon: '◈', color: '#3ddb7f', type: 'passive',
      dur: [15, 30, 45, 60], maxStacks: 40,
      idleRegen: [10, 20, 30, 40], idleMs: 7, idleAfter: 3,
      desc: function (l) {
        return 'Каждый ваш удар забирает у врага сущность: он теряет броню ' +
          'и скорость атаки, вы получаете столько же. Заряды держатся ' +
          this.dur[l] + ' сек, максимум ' + this.maxStacks + '. ' +
          'Пока вас никто не бьёт или вы в невидимости: +' + this.idleMs +
          '% скорости и ' + this.idleRegen[l] + ' здоровья в секунду.';
      },

      /** Накопленные заряды превращаются в характеристики. */
      apply: function (u, l, s) {
        var n = u.essenceStacks || 0;
        if (!n) return;
        s.atk += n;                       // как +1 ловкости за заряд
        s.armor += n * 0.16;
        s.as *= (1 + n * 0.01);
      },

      /** Вызывается из combat при попадании автоатаки. */
      onAttack: function (u, l, target) {
        var a = g(), self = this;
        if (!target || target.dead || target.isIllusion) return;

        var take = a.talent(u, 'lu_greed') ? 2 : 1;

        // «Ярость рифа»: в танце пьём со всех вокруг, а не только с цели
        if (a.talent(u, 'lu_reefrage') && a.hasBuff(u, 'shadowdance')) {
          a.forEachEnemy(u, 300, function (e) { drain(u, e, take, self.dur[l], a); });
        } else {
          drain(u, target, take, self.dur[l], a);
        }
      },

      tick: function (u, l, dt) {
        var a = g();

        // заряды живут общим таймером: проще читается и не плодит объекты
        if (u.essenceStacks) {
          u.essenceT = Math.max(0, (u.essenceT || 0) - dt);
          if (u.essenceT <= 0) {
            u.essenceStacks = 0;
            AA.Game.stats.recalc(u);
            a.toast('Сущность рассеялась');
          }
        }

        // дыхание глубин: пока вас не трогают или вы в тени
        u.unseenT = (u.unseenT || 0) + dt;
        var hidden = a.hasBuff(u, 'invis') || u.unseenT >= this.idleAfter;
        if (!hidden || u.hp >= u.maxHp) return;

        // в танце регенерация своя, сильнее — не складываем
        if (a.hasBuff(u, 'shadowdance')) return;

        u.hp = Math.min(u.maxHp, u.hp + this.idleRegen[l] * dt);
        if (Math.random() < dt * 4) a.sparks(u.x, u.y, '#3ddb7f', 1);
      }
    }
  });

  /* ---------------- вспомогательное ---------------- */

  /** Снять с героя весь контроль. */
  function cleanse(u, a) {
    for (var i = 0; i < DEBUFFS.length; i++) a.removeBuff(u, DEBUFFS[i]);
    a.sparkle(u.x, u.y, '#a8fff0');
  }

  /** Забрать n сущности у цели и отдать герою. */
  function drain(u, t, n, dur, a) {
    if (!t || t.dead) return;

    t.essenceLost = Math.min(30, (t.essenceLost || 0) + n);
    a.buff(t, {
      id: 'drained', dur: dur,
      armor: -t.essenceLost * 0.16, asMul: 1 / (1 + t.essenceLost * 0.012),
      color: '#3ddb7f'
    });

    u.essenceStacks = Math.min(40, (u.essenceStacks || 0) + n);
    u.essenceT = dur;
    AA.Game.stats.recalc(u);

    a.sparks(t.x, t.y, '#3ddb7f', 3);
  }

  /**
   * Посадить цель на привязь: она ходит, но её тянет обратно
   * к точке захвата, стоит выйти за радиус.
   */
  function leash(u, t, dur, radius, a) {
    var ax = t.x, ay = t.y;

    a.buff(t, {
      id: 'leash', dur: dur, color: '#3ad8e8', glow: '#3ad8e8',
      onTick: function (e) {
        var dx = e.x - ax, dy = e.y - ay;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > radius) {
          // возвращаем ровно на границу — движение внутри круга свободно
          var k = radius / d;
          e.x = ax + dx * k;
          e.y = ay + dy * k;
          e.vx *= .2; e.vy *= .2;
          a.sparks(e.x, e.y, '#3ad8e8', 2);
        }
        // натянутая верёвка от якоря к жертве
        if (Math.random() < .5) a.slash({ x: ax, y: ay }, e, '#3ad8e8');
      }
    });

    a.ring(ax, ay, radius, '#3ad8e8');
    a.burst(t.x, t.y, '#3ad8e8', 20);
    a.toast('На привязи');
  }
})();
