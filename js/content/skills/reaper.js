/* content/skills/reaper — Жнец Душ.

   Дальнобойный керри, который растёт не от предметов, а от трупов:
   каждая смерть рядом даёт душу, каждая душа — прибавку к урону.
   Реквием разряжает весь запас разом, поэтому весь бой строится
   вокруг вопроса «копить дальше или бить сейчас».

   Оригинал делит роли между врождённой способностью (души),
   пассивной аурой (минус броня) и ультимативной; у нас у каждого
   героя ровно три активных и одна пассивная, поэтому души и аура
   сведены в одну пассивку — обе про присутствие владыки душ.

   Архетип узнаваем, но имя и облик собственные: прямое
   использование персонажа Dota 2 нарушает п.3.5 требований. */
(function () {
  'use strict';
  var S = AA.Content.skills, g = S.g;

  S.add({

    /* ================= Темновой разрыв (1) =================
       Умение с зарядами: перезарядка копит применения, а тратить
       их можно подряд. Точка взрыва выбирается по скоплению врагов,
       и чем она дальше, тем шире воронка — риск за размах. */
    rend: {
      id: 'rend', name: 'Темновой разрыв', icon: '◤', color: '#5a2ad8',
      type: 'active', ai: 'nuke',
      mana: [50, 50, 50, 50], cd: [10, 8, 6, 4],
      charges: 3, chargeGap: .38,
      dmg: [100, 175, 250, 325], shred: [1, 1, 2, 2],
      range: 800, rMin: 150, rMax: 300, shredDur: 8,
      desc: function (l) {
        return 'До ' + this.charges + ' зарядов, восстановление ' + this.cd[l] +
          ' сек. Взрыв на ' + this.dmg[l] + ' магического урона; чем дальше точка, ' +
          'тем шире воронка (' + this.rMin + '→' + this.rMax + '). ' +
          'Снимает ' + this.shred[l] + ' брони на ' + this.shredDur +
          ' сек, эффект складывается.';
      },
      cast: function (u, l) {
        var a = g(), self = this;

        // целимся в скопление; одиночку берём ближайшей целью
        var spot = a.bestCluster(u, self.rMax * .6, self.range);
        if (!spot) {
          var t = a.pickTarget(u, self.range);
          if (!t) return false;
          spot = { x: t.x, y: t.y };
        }

        var dx = spot.x - u.x, dy = spot.y - u.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var k = Math.min(1, dist / self.range);
        var r = self.rMin + (self.rMax - self.rMin) * k;

        var dmg = self.dmg[l] * (a.talent(u, 'rp_rend_dmg') ? 1.5 : 1);
        var shred = self.shred[l];

        a.telegraph(spot.x, spot.y, r, '#5a2ad8', .18, function () {
          a.aoeApply(u, spot.x, spot.y, r, function (e) {
            a.damage(u, e, dmg + u.stats.sp * 1.2, 'magic');

            // минус броня копится: три разрыва подряд и есть комбо
            e.rendShred = Math.min(12, (e.rendShred || 0) + shred);
            a.buff(e, {
              id: 'rendshred', dur: self.shredDur,
              armor: -e.rendShred, color: '#5a2ad8'
            });
          });

          a.ring(spot.x, spot.y, r, '#5a2ad8');
          a.burst(spot.x, spot.y, '#7a4aff', 26);
          a.pillar(spot.x, spot.y, '#5a2ad8');
          a.shake(4 + k * 4);
        });
        return true;
      }
    },

    /* ================= Пир душ (2) =================
       Вырывает кусок жизни: цель замедляется ровно настолько,
       насколько ускоряется герой, — скорость буквально крадётся.
       Всегда даёт душу, поэтому это ещё и способ отыграться
       после неудачного Реквиема. */
    soulfeast: {
      id: 'soulfeast', name: 'Пир душ', icon: '❥', color: '#c02ad8',
      type: 'active', ai: 'nuke',
      mana: [70, 70, 70, 70], cd: [12, 11, 10, 9],
      dmg: [90, 160, 230, 300], slow: [20, 25, 30, 35],
      range: 600, dur: 3,
      desc: function (l) {
        return 'Вырывает жизнь у цели: ' + this.dmg[l] + ' магического урона, ' +
          'замедление на ' + this.slow[l] + '% и столько же скорости вам на ' +
          this.dur + ' сек. Всегда даёт одну душу. ' +
          'С Осколком Аганима цель теряет 5% максимального здоровья, а вы столько же лечите.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        var range = self.range + (a.shard(u) ? 200 : 0);
        var t = a.pickTarget(u, range);
        if (!t) return false;

        var slow = self.slow[l] + (a.shard(u) ? 10 : 0);
        var dmg = self.dmg[l] + u.stats.sp * 1.1;

        // «Пожиратель душ»: чем больше душ, тем больнее толстым целям
        if (a.talent(u, 'rp_devour')) {
          dmg += t.maxHp * 0.012 * souls(u);
        }

        a.damage(u, t, dmg, 'magic');

        // осколок: отрывает долю запаса здоровья и отдаёт её герою
        if (a.shard(u) && !t.dead) {
          var rip = t.maxHp * .05;
          a.damage(u, t, rip, 'magic');
          a.heal(u, rip);
          u.hp = Math.min(u.maxHp, u.hp + rip);
        }

        a.buff(t, {
          id: 'slow', dur: self.dur, msMul: 1 - slow / 100, color: '#c02ad8'
        });
        a.buff(u, {
          id: 'soulrush', dur: self.dur, msMul: 1 + slow / 100,
          color: '#c02ad8', glow: '#c02ad8'
        });

        // «Голод»: заодно крадём скорость атаки
        if (a.talent(u, 'rp_steal_as')) {
          a.buff(t, { id: 'drained', dur: self.dur, asMul: .85, color: '#c02ad8' });
          a.buff(u, { id: 'soulrush_as', dur: self.dur, asMul: 1.15, color: '#c02ad8' });
        }

        addSoul(u, 1);
        a.bolt(u.x, u.y, t.x, t.y, '#c02ad8', .26);
        a.burst(t.x, t.y, '#c02ad8', 20);
        a.sparks(u.x, u.y, '#ff8ae8', 10);
        return true;
      }
    },

    /* ================= Реквием душ (3) =================
       Весь накопленный запас уходит в один залп: сколько душ,
       столько лучей. Вблизи в цель попадает сразу несколько —
       отсюда правило «сначала сблизиться, потом жать». */
    requiem: {
      id: 'requiem', name: 'Реквием душ', icon: '✹', color: '#8a2ad8',
      type: 'active', ai: 'aoe',
      mana: [150, 165, 180, 195], cd: [120, 110, 100, 90],
      dmg: [80, 120, 160, 200], fear: [.9, 1.1, 1.3, 1.5],
      range: 700, halfWidth: 46,
      desc: function (l) {
        return 'Выпускает все души разом: каждая — отдельный луч на ' + this.dmg[l] +
          ' магического урона в радиусе ' + this.range + '. Кто ближе, того заденет ' +
          'несколько лучей. Поражённые в ужасе разбегаются (до 2.5 сек). ' +
          'Запас душ обнуляется.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        var n = souls(u);
        if (n < 4) { a.toast('Слишком мало душ'); return false; }
        // автобою нельзя разряжать запас на первой же паре мобов
        if (AA.Game.world.state.auto && n < soulCap(u) * .6) return false;

        var dmg = self.dmg[l] + u.stats.sp * .8;
        var wave = a.talent(u, 'rp_double_wave');   // «Отражённый хор»

        fireRequiem(u, n, dmg, self, a, 0);
        // вторая волна возвращается к герою и добивает
        if (wave) a.delay(.55, function () { if (!u.dead) fireRequiem(u, n, dmg * .8, self, a, 1); });

        u.souls = 0;
        AA.Game.stats.recalc(u);

        a.flash('#8a2ad8', .3);
        a.shake(16);
        a.hitstop(.08);
        return true;
      }
    },

    /* ================= Жатва (пассивное) =================
       Две грани одного: рядом с ним всё умирает и всё гниёт.
       Смерти дают души (и урон), присутствие точит броню. */
    harvest: {
      id: 'harvest', name: 'Жатва', icon: '☾', color: '#7a2ad8', type: 'passive',
      perSoul: [2, 2, 3, 3], cap: [11, 14, 17, 20],
      aura: [3, 4, 5, 6], auraR: 520, pickupR: 620,
      desc: function (l) {
        return 'Каждая смерть рядом даёт душу (босс — три): +' + this.perSoul[l] +
          ' к урону за душу, максимум ' + this.cap[l] + '. ' +
          'Враги в радиусе ' + this.auraR + ' теряют ' + this.aura[l] + ' брони. ' +
          'При вашей смерти половина душ вырывается взрывом.';
      },

      apply: function (u, l, s) {
        var per = this.perSoul[l] + (AA.Game.talents.has(u, 'rp_per_soul') ? 2 : 0);
        s.atk += Math.min(u.souls || 0, this.cap[l]) * per;
      },

      /** Смерть рядом кормит: боссы дают сразу три души. */
      onKill: function (u, l, victim) {
        if (!victim) return 0;
        var dx = victim.x - u.x, dy = victim.y - u.y;
        if (dx * dx + dy * dy > this.pickupR * this.pickupR) return 0;
        addSoul(u, victim.isBoss ? 3 : 1);
        return 0;
      },

      /** Гибель владыки: половина запаса вырывается наружу. */
      onSelfDeath: function (u, l) {
        var n = Math.floor(souls(u) / 2);
        if (n < 1) return;

        var a = g();
        a.aoeAt(u, u.x, u.y, 420, (60 + l * 20) * n, 'magic');
        a.ring(u.x, u.y, 420, '#8a2ad8');
        a.burst(u.x, u.y, '#c08aff', 40);
        a.flash('#8a2ad8', .3);
        u.souls = 0;
      },

      tick: function (u, l, dt) {
        var a = g(), self = this;
        var r = self.auraR * (a.talent(u, 'rp_aura_tight') ? .75 : 1);
        var minus = self.aura[l] + (a.talent(u, 'rp_aura_tight') ? 2 : 0);

        // аура обновляется коротким баффом: ушёл из радиуса — отпустило
        a.forEachEnemy(u, r, function (e) {
          a.buff(e, { id: 'dreadaura', dur: .6, armor: -minus, quiet: true, color: '#7a2ad8' });
        });

        u.auraPulse = (u.auraPulse || 0) + dt;
        if (u.auraPulse > .9) { u.auraPulse = 0; a.aura(u, r, 'rgba(122,42,216,.10)'); }
      }
    }
  });

  /* ---------------- вспомогательное ---------------- */

  /** Потолок запаса: ранг пассивки плюс «Бездонный сосуд». */
  function soulCap(u) {
    var lv = (u.skillLv.harvest || 0) - 1;
    var base = lv >= 0 ? S.get('harvest').cap[lv] : 11;
    return base + (AA.Game.talents.has(u, 'rp_soul_cap') ? 8 : 0);
  }

  /** Текущий запас душ с учётом потолка. */
  function souls(u) {
    return Math.min(u.souls || 0, soulCap(u));
  }

  /** Добавить душ и пересчитать урон. */
  function addSoul(u, n) {
    if ((u.skillLv.harvest || 0) < 1) return;
    var cap = soulCap(u);
    var was = u.souls || 0;
    u.souls = Math.min(cap, was + n);
    if (u.souls === was) return;

    AA.Game.stats.recalc(u);
    AA.Game.effects.sparks(u.x, u.y, '#c08aff', 5);
  }

  /**
   * Залп лучей. Луч — узкий сектор; чем ближе враг, тем в большее
   * число секторов он попадает, поэтому урон вблизи кратный.
   */
  function fireRequiem(u, n, dmg, self, a, phase) {
    var step = 6.2832 / n;
    var offset = phase ? step * .5 : 0;

    for (var i = 0; i < n; i++) {
      (function (ang, idx) {
        a.delay(idx * .012, function () {
          if (u.dead) return;
          var ex = u.x + Math.cos(ang) * self.range;
          var ey = u.y + Math.sin(ang) * self.range;
          a.bolt(u.x, u.y, ex, ey, phase ? '#c08aff' : '#8a2ad8', .3);
        });
      })(offset + i * step, i);
    }

    // урон считаем один раз по секторам, а не лучом на юнита
    a.forEachEnemy(u, self.range, function (e) {
      var dx = e.x - u.x, dy = e.y - u.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var ang = Math.atan2(dy, dx);

      // сколько лучей накрывает цель: угловой размер тела делим на шаг
      var halfAng = Math.atan2(e.r + self.halfWidth, d);
      var hits = Math.max(1, Math.round(halfAng * 2 / step));
      hits = Math.min(hits, Math.max(1, Math.round(n * .55)));

      a.damage(u, e, dmg * hits, 'magic');
      a.burst(e.x, e.y, '#8a2ad8', 10);

      if (phase) {
        // вторая волна не пугает, а вяжет — иначе жертвы разбегутся из-под неё
        a.buff(e, { id: 'slow', dur: 3, msMul: .6, color: '#c08aff' });
      } else {
        var fear = Math.min(2.5, self.fear[0] * hits);
        a.buff(e, { id: 'fear', dur: fear, msMul: .8, fear: true, color: '#8a2ad8' });
      }
    });

    a.ring(u.x, u.y, self.range, phase ? '#c08aff' : '#8a2ad8');
    a.spinBurst(u, 90, '#c08aff');
  }

})();
