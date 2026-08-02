/* content/skills/demon — Демон Клинков.

   Ловкий керри-иллюзионист. Копии — его основной источник урона,
   метаморфоза превращает его и все копии в дальнобойную форму,
   а пассивный разрыв не даёт умереть с первого фокуса.

   Архетип узнаваем, но имя и облик собственные: прямое
   использование персонажа Dota 2 нарушает п.3.5 требований. */
(function () {
  'use strict';
  var S = AA.Content.skills, g = S.g;

  S.add({

    /* ================= Отражение (1) =================
       Помечает врага: он замедляется, а рядом появляется его
       неуязвимая копия, которая бьёт только его самого. */
    reflection: {
      id: 'reflection', name: 'Отражение', icon: '🪞', color: '#a05ad8',
      type: 'active', ai: 'nuke',
      mana: [45, 55, 65, 75], cd: [22, 20, 18, 16],
      dur: [3.5, 4, 4.5, 5], slow: [30, 35, 40, 45], range: 700,
      desc: function (l) {
        return 'Помечает врага: замедление на ' + this.slow[l] + '% и его собственная ' +
          'неуязвимая копия на ' + this.dur[l] + ' сек, которая бьёт только его. ' +
          'Копия исчезает вместе с оригиналом.';
      },
      cast: function (u, l) {
        var a = g(), t = a.pickTarget(u, this.range), self = this;
        if (!t || t.isIllusion) return false;

        var dur = self.dur[l] + (a.shard(u) ? 2 : 0);

        a.buff(t, {
          id: 'slow', dur: dur, msMul: 1 - self.slow[l] / 100, color: '#a05ad8'
        });
        a.burst(t.x, t.y, '#a05ad8', 22);
        a.ring(t.x, t.y, 90, '#a05ad8');

        // копия жертвы: неуязвима, пока жива жертва, бьёт только её
        var copy = AA.Game.factory.illusion(t, {
          dmgPct: 1, takenMul: 1, invuln: true,
          dur: dur, guard: t, lockTarget: t, color: '#a05ad8'
        });
        if (copy) {
          copy.c1 = '#a05ad8';
          copy.x = t.x + 60; copy.y = t.y + 30;
          AA.Game.world.confine(copy);
        }
        return true;
      }
    },

    /* ================= Раскол (2) =================
       Две собственные копии. Снимает с героя дебаффы. */
    splinter: {
      id: 'splinter', name: 'Раскол', icon: '🌀', color: '#6a8ae8',
      type: 'active', ai: 'buff',
      mana: [55, 65, 75, 85], cd: [14, 14, 14, 14],
      dmg: [30, 40, 50, 60], dur: 24, maxCount: 2,
      desc: function (l) {
        return 'Создаёт копии, наносящие ' + this.dmg[l] + '% вашего урона и получающие ' +
          'урон втрое. Живут ' + this.dur + ' сек, максимум ' + this.maxCount +
          '. Снимает с вас отрицательные эффекты.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        var F = AA.Game.factory;

        // снятие дебаффов
        ['slow', 'freeze', 'root', 'venom', 'ignite', 'hex', 'chill', 'acid', 'plague']
          .forEach(function (id) { a.removeBuff(u, id); });

        var cap = self.maxCount + (a.talent(u, 'dm_extra_illusion') ? 1 : 0);
        var pct = self.dmg[l] / 100 + passiveBonus(u, a);

        for (var i = 0; i < 2; i++) {
          while (F.countIllusions(u) >= cap) F.dropOldestIllusion();
          var c = F.illusion(u, {
            dmgPct: pct, takenMul: 3, dur: self.dur, color: '#6a8ae8'
          });
          if (!c) break;
          c.x = u.x + Math.cos(i * 3.14) * 60;
          c.y = u.y + Math.sin(i * 3.14) * 60;
          c.meta = !!a.hasBuff(u, 'metamorph');
          AA.Game.world.confine(c);
          if (c.meta) applyMeta(c, a.hasBuff(u, 'metamorph'));
        }
        a.ring(u.x, u.y, 120, '#6a8ae8');
        return true;
      }
    },

    /* ================= Метаморфоза (3) =================
       Дальнобойная форма: больше урона и дальности, копии тоже. */
    metamorph: {
      id: 'metamorph', name: 'Метаморфоза', icon: '👹', color: '#d84a2a',
      type: 'active', ai: 'buff',
      mana: [75, 100, 125, 150], cd: [60, 56, 52, 48],
      dur: [16, 18, 20, 22], atk: [15, 30, 45, 60], range: 380,
      desc: function (l) {
        return 'На ' + this.dur[l] + ' сек превращается в дальнобойную форму: ' +
          '+' + this.atk[l] + ' к урону, дальность атаки ' + (150 + this.range) +
          '. Все ваши копии тоже перевоплощаются.';
      },
      cast: function (u, l) {
        var a = g(), self = this;
        var dur = self.dur[l] * (a.shard(u) ? 1.35 : 1);

        var buff = {
          id: 'metamorph', dur: dur,
          atk: self.atk[l], range: self.range,
          color: '#d84a2a', glow: '#d84a2a', meta: true
        };
        a.buff(u, buff);
        applyMeta(u, buff);

        // копии переходят в ту же форму
        var w = AA.Game.world.state;
        for (var i = 0; i < w.units.length; i++) {
          var c = w.units[i];
          if (c.dead || !c.isIllusion || c.lockTarget) continue;
          a.buff(c, {
            id: 'metamorph', dur: dur, atk: self.atk[l], range: self.range,
            ms: 30, color: '#d84a2a', glow: '#d84a2a', meta: true
          });
          applyMeta(c, buff);
        }

        a.ring(u.x, u.y, 170, '#d84a2a');
        a.burst(u.x, u.y, '#d84a2a', 34);
        a.shake(9); a.flash('#d84a2a', .18);
        return true;
      }
    },

    /* ================= Разрыв (пассивное) =================
       Автоматически меняется процентом здоровья с ближайшим
       врагом, когда дело плохо. Плюс усиливает копии. */
    sunder: {
      id: 'sunder', name: 'Разрыв', icon: '⧗', color: '#8a2ad8', type: 'passive',
      bonus: [10, 15, 20, 25], threshold: .28, cd: 45, range: 420,
      desc: function (l) {
        return 'Копии наносят дополнительно +' + this.bonus[l] + '% вашего урона. ' +
          'Когда ваше здоровье падает ниже 28%, вы меняетесь процентом здоровья ' +
          'с ближайшим врагом. Не чаще раза в ' + this.cd + ' сек.';
      },
      apply: function (u, l, s) { /* бонус копиям читается в passiveBonus */ },
      tick: function (u, l, dt) {
        var a = g();
        u.sunderCd = Math.max(0, (u.sunderCd || 0) - dt);
        if (u.sunderCd > 0) return;
        if (u.hp / u.maxHp > this.threshold) return;

        var t = a.pickTarget(u, this.range);
        if (!t || t.isIllusion) return;

        var mine = u.hp / u.maxHp;
        var theirs = t.hp / t.maxHp;
        if (theirs <= mine) return;              // менять невыгодно

        u.hp = Math.min(u.maxHp, u.maxHp * theirs);
        t.hp = Math.max(t.maxHp * .12, t.maxHp * mine);

        u.sunderCd = this.cd;
        a.ring(u.x, u.y, 200, '#8a2ad8');
        a.ring(t.x, t.y, 200, '#8a2ad8');
        a.burst(u.x, u.y, '#8a2ad8', 26);
        a.burst(t.x, t.y, '#8a2ad8', 26);
        a.flash('#8a2ad8', .22);
        a.shake(10); a.hitstop(.07);
        a.toast('Разрыв');
      }
    }
  });

  /* ---------------- вспомогательное ---------------- */

  /** Прибавка пассивки к урону копий. */
  function passiveBonus(u, a) {
    var lv = (u.skillLv.sunder || 0) - 1;
    if (lv < 0) return 0;
    return S.get('sunder').bonus[lv] / 100;
  }

  /** Метаморфоза меняет тип атаки: ближний бой становится дальним. */
  function applyMeta(unit, buff) {
    unit.meta = true;
    unit.metaUntil = buff.dur;
  }
})();
