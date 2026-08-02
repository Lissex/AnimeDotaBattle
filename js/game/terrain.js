/* game/terrain — генерация карты, столкновения с ландшафтом,
   эффекты поверхностей (лава жжёт, лёд замедляет). */
AA.module('game/terrain', (function () {
  'use strict';

  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  /** Свойства типов объектов. solid — блокирует, flat — запекается в фон. */
  var PROP = {
    /* --- объёмные: блокируют движение, сортируются с юнитами --- */
    rock: { solid: true, flat: false, rMin: 16, rMax: 30 },
    pillar: { solid: true, flat: false, rMin: 15, rMax: 22 },
    tree: { solid: true, flat: false, rMin: 14, rMax: 20 },
    crystal: { solid: true, flat: false, rMin: 13, rMax: 22, light: true },
    stump: { solid: true, flat: false, rMin: 15, rMax: 21 },
    ruin: { solid: true, flat: false, rMin: 20, rMax: 32 },
    brazier: { solid: true, flat: false, rMin: 11, rMax: 14, light: true },
    obelisk: { solid: true, flat: false, rMin: 13, rMax: 18, light: true },
    shroom: { solid: true, flat: false, rMin: 10, rMax: 15, light: true },
    bush: { solid: false, flat: false, rMin: 13, rMax: 20 },

    /* --- плоские: запекаются в фон --- */
    bones: { solid: false, flat: true, rMin: 10, rMax: 18 },
    grass: { solid: false, flat: true, rMin: 12, rMax: 22 },
    puddle: { solid: false, flat: true, rMin: 16, rMax: 30 },
    crack: { solid: false, flat: true, rMin: 20, rMax: 42 },
    web: { solid: false, flat: true, rMin: 18, rMax: 30, slow: .78 },
    ice: { solid: false, flat: true, rMin: 24, rMax: 44, slow: .72 },
    spikes: { solid: false, flat: true, rMin: 16, rMax: 26, hazard: 30 },
    lava: { solid: false, flat: true, rMin: 22, rMax: 40, hazard: 22, light: true }
  };

  /** Строит карту героя. Раскладка детерминирована по id — арена узнаваема. */
  function build(mapId) {
    var w = W(), m = M();
    var map = AA.Content.maps.get(mapId);
    w.map = map; w.mapId = mapId;
    w.props.length = 0; w.decals.length = 0;

    var rand = m.seeded(m.seedFromString(mapId) + 7);
    var c = AA.Game.world.center();
    // мир большой — объектов нужно кратно больше, чем на один экран
    var scale = Math.max(1, (w.w * w.h) / 900000);

    map.props.forEach(function (entry) {
      var type = entry[0], meta = PROP[type];
      if (!meta) return;
      var count = Math.round(entry[1] * scale);

      for (var k = 0; k < count; k++) {
        var r = meta.rMin + rand() * (meta.rMax - meta.rMin);
        var spot = findSpot(rand, r, c);
        if (!spot) continue;
        var prop = {
          type: type, x: spot.x, y: spot.y, r: r, meta: meta,
          rot: rand() * 6.2832, seed: rand(), sway: rand() * 6.2832
        };
        (meta.flat ? w.decals : w.props).push(prop);
      }
    });
  }

  function findSpot(rand, r, center) {
    var w = W(), m = M();
    for (var tries = 0; tries < 40; tries++) {
      var x = w.PAD + 30 + rand() * (w.w - w.PAD * 2 - 60);
      var y = w.PAD + 30 + rand() * (w.h - w.PAD * 2 - 60);
      if (m.d2(x, y, center.x, center.y) < 190 * 190) continue;   // не заваливаем спавн
      var ok = true;
      for (var i = 0; i < w.props.length; i++) {
        var o = w.props[i];
        if (m.d2(x, y, o.x, o.y) < (r + o.r + 26) * (r + o.r + 26)) { ok = false; break; }
      }
      if (ok) return { x: x, y: y };
    }
    return null;
  }

  /** Не даёт юниту пройти сквозь препятствия. */
  function collide(u) {
    var w = W();
    for (var i = 0; i < w.props.length; i++) {
      var p = w.props[i];
      if (!p.meta.solid) continue;
      var dx = u.x - p.x, dy = u.y - p.y;
      var d = Math.sqrt(dx * dx + dy * dy) || .01;
      var min = u.r + p.r * .72;
      if (d < min) { u.x = p.x + dx / d * min; u.y = p.y + dy / d * min; }
    }
  }

  function blocked(x, y, r) {
    var w = W(), m = M();
    for (var i = 0; i < w.props.length; i++) {
      var p = w.props[i];
      if (p.meta.solid && m.d2(x, y, p.x, p.y) < (r + p.r) * (r + p.r)) return true;
    }
    return false;
  }

  /** Урон от лавы и замедление на льду. */
  function applySurface(u, dt) {
    var w = W(), m = M();
    var scale = AA.Content.attributes.enemyScale(w.wave);
    for (var i = 0; i < w.decals.length; i++) {
      var p = w.decals[i], meta = p.meta;
      if (!meta.hazard && !meta.slow) continue;
      var reach = p.r + u.r * .4;
      if (m.d2(u.x, u.y, p.x, p.y) > reach * reach) continue;

      if (meta.hazard) {
        AA.Game.combat.damage(null, u, meta.hazard * dt * scale * .5, 'magic');
        if (Math.random() < dt * 10) AA.Game.effects.ember(u.x + m.rnd(-10, 10), u.y, '#ff7a2f', .7);
      }
      if (meta.slow) AA.Game.buffs.add(u, { id: 'icy', dur: .3, msMul: meta.slow, quiet: true });
    }
  }

  /** Расталкивание тел между собой. */
  function separate() {
    var w = W(), us = w.units, i, j;
    for (i = 0; i < us.length; i++) {
      var a = us[i]; if (a.dead) continue;
      for (j = i + 1; j < us.length; j++) {
        var b = us[j]; if (b.dead) continue;
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || .01;
        var min = a.r + b.r;
        if (d >= min) continue;
        var push = (min - d) * .5, nx = dx / d, ny = dy / d;
        var aw = (a.isBoss || a.role === 'dummy') ? .15 : 1;
        var bw = (b.isBoss || b.role === 'dummy') ? .15 : 1;
        a.x -= nx * push * aw; a.y -= ny * push * aw;
        b.x += nx * push * bw; b.y += ny * push * bw;
      }
    }
  }

  return { PROP: PROP, build: build, collide: collide, blocked: blocked, applySurface: applySurface, separate: separate };
})());
