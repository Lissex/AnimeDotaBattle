/* content/elites — свойства элитных врагов.

   Между боссами волны провисали: одинаковые мобы десять волн
   подряд. Элита это чинит дёшево — обычный враг с одним ярким
   свойством, золотой каймой и повышенной наградой.

   Свойство может:
     stats(u)        — поправить характеристики при рождении
     tick(u, dt)     — что-то делать каждый кадр
     onHit(u, t)     — реагировать на свой удар
     onDeath(u)      — сработать при смерти
     onDamaged(u, d) — среагировать на полученный урон
*/
AA.module('content/elites', (function () {
  'use strict';

  function FX() { return AA.Game.effects; }
  function C() { return AA.Game.combat; }
  function T() { return AA.Game.targeting; }

  var LIST = [
    {
      id: 'explosive', name: 'Взрывной', color: '#ffb03a', weight: 10,
      d: 'взрывается при смерти',
      stats: function (u) { u.base.hp *= 1.1; },
      onDeath: function (u) {
        var scale = AA.Game.run.enemyScale(AA.Game.world.state.wave);
        FX().ring(u.x, u.y, 190, '#ffb03a');
        FX().burst(u.x, u.y, '#ffb03a', 30);
        FX().shake(11); FX().flash('#ffb03a', .18);
        AA.Core.audio.boom();
        T().applyInCircle(u, u.x, u.y, 190, function (e) {
          C().damage(u, e, 90 * scale, 'magic');
        });
      }
    },

    {
      id: 'shielded', name: 'Закалённый', color: '#7ab0ff', weight: 10,
      d: 'первый удар почти не проходит',
      stats: function (u) {
        u.base.hp *= 1.25;
        u.eliteShield = true;
      },
      onDamaged: function (u) {
        if (!u.eliteShield) return 1;
        u.eliteShield = false;
        FX().ring(u.x, u.y, 70, '#7ab0ff');
        FX().sparks(u.x, u.y, '#7ab0ff', 10);
        return .1;                       // множитель полученного урона
      }
    },

    {
      id: 'splitter', name: 'Делящийся', color: '#d0ff4a', weight: 8,
      d: 'при смерти распадается надвое',
      stats: function (u) { u.base.hp *= 1.15; },
      onDeath: function (u) {
        if (u.eliteChild) return;        // осколки дальше не делятся
        var m = AA.Core.math;
        for (var i = -1; i <= 1; i += 2) {
          var child = AA.Game.factory.enemy(u.def, false);
          child.x = u.x + i * 34; child.y = u.y + m.rnd(-18, 18);
          child.base.hp *= .45; child.base.atk *= .7;
          child.r = Math.round(child.r * .8);
          child.eliteChild = true;
          child.gold = Math.round(child.gold * .4);
          AA.Game.stats.recalc(child);
          child.hp = child.maxHp;
          AA.Game.world.confine(child);
          AA.Game.world.state.units.push(child);
        }
        FX().burst(u.x, u.y, '#d0ff4a', 18);
      }
    },

    {
      id: 'warlord', name: 'Вожак', color: '#ff7a2f', weight: 8,
      d: 'ускоряет соседей',
      stats: function (u) { u.base.hp *= 1.3; u.base.atk *= 1.1; },
      tick: function (u, dt) {
        FX().aura(u, 300, 'rgba(255,122,47,.06)');
        var w = AA.Game.world.state, m = AA.Core.math;
        for (var i = 0; i < w.units.length; i++) {
          var e = w.units[i];
          if (e.dead || e.team !== u.team || e === u) continue;
          if (m.dist(u, e) > 300) continue;
          AA.Game.buffs.add(e, {
            id: 'warcry', dur: .4, msMul: 1.3, asMul: 1.3, quiet: true
          });
        }
      }
    },

    {
      id: 'vampiric', name: 'Ненасытный', color: '#ff4d5e', weight: 8,
      d: 'лечится от своих ударов',
      stats: function (u) { u.base.atk *= 1.15; },
      onHit: function (u, target, dealt) {
        var heal = dealt * .6;
        u.hp = Math.min(u.maxHp, u.hp + heal);
        FX().floatText(u.x, u.y - u.r - 12, '+' + Math.round(heal), '#3ddb7f', 12);
      }
    },

    {
      id: 'frostborn', name: 'Морозный', color: '#a8e4ff', weight: 7,
      d: 'замораживает вокруг себя',
      stats: function (u) { u.base.hp *= 1.2; },
      tick: function (u, dt) {
        FX().aura(u, 260, 'rgba(168,228,255,.06)');
        T().forEachEnemy(u, 260, function (e) {
          AA.Game.buffs.add(e, { id: 'frostborn', dur: .4, msMul: .62, quiet: true });
        });
      }
    },

    {
      id: 'juggernaut', name: 'Неудержимый', color: '#c8c0a8', weight: 7,
      d: 'много брони и здоровья',
      stats: function (u) {
        u.base.hp *= 1.8;
        u.base.armor += 10;
        u.base.ms *= .88;
      }
    },

    {
      id: 'arcanist', name: 'Чароплёт', color: '#c04aff', weight: 6,
      d: 'бьёт залпами магии',
      stats: function (u) { u.base.hp *= 1.15; u.magic = true; },
      tick: function (u, dt) {
        u.eliteCd = (u.eliteCd || 3) - dt;
        if (u.eliteCd > 0) return;
        u.eliteCd = 4.5;

        var target = T().enemyTarget(u);
        if (!target) return;
        var m = AA.Core.math;
        var base = m.angleTo(u, target);
        var scale = AA.Game.run.enemyScale(AA.Game.world.state.wave);

        for (var i = -1; i <= 1; i++) {
          AA.Game.projectiles.spawn({
            from: u, angle: base + i * .22, speed: 640, r: 7,
            color: '#c04aff', range: 620, trail: true,
            onHit: function (t) { C().damage(u, t, 42 * scale, 'magic'); }
          });
        }
      }
    }
  ];

  var byId = {};
  LIST.forEach(function (e) { byId[e.id] = e; });

  /** Базовый шанс элиты по номеру волны — растёт, но упирается в потолок. */
  function chanceFor(wave) {
    return Math.min(.18, .02 + wave * .004);
  }

  function roll() {
    var total = 0, i;
    for (i = 0; i < LIST.length; i++) total += LIST[i].weight;
    var r = Math.random() * total;
    for (i = 0; i < LIST.length; i++) {
      r -= LIST[i].weight;
      if (r <= 0) return LIST[i];
    }
    return LIST[0];
  }

  return { LIST: LIST, roll: roll, chanceFor: chanceFor, get: function (id) { return byId[id]; } };
})());
