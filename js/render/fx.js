/* render/fx — отрисовка эффектов: зоны, кольца, молнии, снаряды,
   частицы, искры, угольки, числа урона, свет. */
AA.module('render/fx', (function () {
  'use strict';

  function C() { return AA.Render.canvas.get(); }
  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  /* ================= под ногами ================= */
  function zones() {
    var ctx = C(), w = W(), m = M(), i, s;
    for (i = 0; i < w.zones.length; i++) {
      var z = w.zones[i], k = z.t / z.life;
      var fade = k > .85 ? (1 - k) / .15 : 1;

      ctx.save();
      ctx.globalAlpha = .32 * fade;
      var g = ctx.createRadialGradient(z.x, z.y, z.r * .1, z.x, z.y, z.r);
      g.addColorStop(0, z.c);
      g.addColorStop(.7, m.rgba(z.c, .3));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.2832); ctx.fill();

      ctx.globalAlpha = .7 * fade;
      ctx.strokeStyle = z.c; ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]); ctx.lineDashOffset = w.time * 24;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.2832); ctx.stroke();
      ctx.setLineDash([]);

      if (z.style === 'thorn') {
        ctx.globalAlpha = .8 * fade; ctx.lineWidth = 2;
        for (s = 0; s < 12; s++) {
          var a = s / 12 * 6.2832 + z.t;
          ctx.beginPath();
          ctx.moveTo(z.x + Math.cos(a) * z.r * .35, z.y + Math.sin(a) * z.r * .35);
          ctx.lineTo(z.x + Math.cos(a) * z.r * .9, z.y + Math.sin(a) * z.r * .9);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    for (i = 0; i < w.walls.length; i++) {
      var wa = w.walls[i], wk = wa.t / wa.life;
      ctx.save();
      ctx.globalAlpha = (wk > .85 ? (1 - wk) / .15 : 1) * .85;
      ctx.translate(wa.x, wa.y); ctx.rotate(wa.a);
      var wg = ctx.createLinearGradient(0, -20, 0, 20);
      wg.addColorStop(0, 'rgba(0,0,0,0)');
      wg.addColorStop(.5, wa.c);
      wg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wg;
      ctx.fillRect(-wa.len / 2, -20, wa.len, 40);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.globalAlpha *= .6;
      for (var sp = -wa.len / 2; sp < wa.len / 2; sp += 26) {
        ctx.beginPath(); ctx.moveTo(sp, -18); ctx.lineTo(sp + 8, 18); ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ================= руны ================= */
  function runes() {
    var ctx = C(), w = W(), m = M();
    for (var i = 0; i < w.runes.length; i++) {
      var r = w.runes[i];
      var fade = r.t > r.life - 4 ? Math.max(.15, (r.life - r.t) / 4) : 1;
      var pulse = 1 + Math.sin(w.time * 3 + i) * .12;
      var lift = Math.sin(w.time * 2 + i) * 3;

      ctx.save();
      ctx.globalAlpha = fade;

      // свечение на земле
      var g = ctx.createRadialGradient(r.x, r.y, 2, r.x, r.y, r.r * 3.2);
      g.addColorStop(0, m.rgba(r.def.color, .5));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 3.2, 0, 6.2832); ctx.fill();

      // вращающееся кольцо
      ctx.strokeStyle = r.def.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -w.time * 30;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 1.5, 0, 6.2832); ctx.stroke();
      ctx.setLineDash([]);

      // кристалл руны
      ctx.translate(r.x, r.y + lift);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = r.def.color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = r.def.color;
      ctx.beginPath();
      ctx.moveTo(0, -r.r);
      ctx.lineTo(r.r * .62, 0);
      ctx.lineTo(0, r.r);
      ctx.lineTo(-r.r * .62, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath();
      ctx.moveTo(0, -r.r * .55);
      ctx.lineTo(r.r * .26, 0);
      ctx.lineTo(0, r.r * .3);
      ctx.lineTo(-r.r * .26, 0);
      ctx.closePath();
      ctx.fill();

      // символ
      ctx.textAlign = 'center';
      ctx.font = '900 ' + Math.round(r.r * .8) + 'px "Trebuchet MS",sans-serif';
      ctx.fillStyle = 'rgba(20,14,30,.85)';
      ctx.fillText(r.def.icon, 0, r.r * .28);

      ctx.restore();
    }
  }

  function auras() {
    var ctx = C(), w = W();
    for (var i = 0; i < w.auras.length; i++) {
      var a = w.auras[i];
      var g = ctx.createRadialGradient(a.x, a.y, a.r * .15, a.x, a.y, a.r);
      g.addColorStop(0, a.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.2832); ctx.fill();
    }
  }

  function corpses() {
    var ctx = C(), w = W();
    for (var i = 0; i < w.corpses.length; i++) {
      var c = w.corpses[i], k = c.t / c.life;
      ctx.save();
      ctx.globalAlpha = (1 - k) * .55;
      ctx.translate(c.x, c.y + k * 7);
      ctx.scale(1, .5);
      var g = ctx.createRadialGradient(0, 0, 2, 0, 0, c.r * (1 + k * .5));
      g.addColorStop(0, c.glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, c.r * (1 + k * .5), 0, 6.2832); ctx.fill();
      ctx.restore();
    }
  }

  function telegraphs() {
    var ctx = C(), w = W();
    for (var i = 0; i < w.tele.length; i++) {
      var t = w.tele[i], p = t.t / t.life;
      ctx.save();
      ctx.globalAlpha = .6 + Math.sin(w.time * 24) * .14;
      ctx.strokeStyle = t.c; ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]); ctx.lineDashOffset = -w.time * 46;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 6.2832); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = .1 + p * .3;
      ctx.fillStyle = t.c;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r * p, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
  }

  function rings() {
    var ctx = C(), w = W();
    for (var i = 0; i < w.rings.length; i++) {
      var r = w.rings[i], k = r.t / r.life;
      var rad = r.r + (r.max - r.r) * (1 - Math.pow(1 - k, 2.2));
      ctx.strokeStyle = r.c;
      ctx.globalAlpha = (1 - k) * .95;
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.shadowColor = r.c; ctx.shadowBlur = 16 * (1 - k);
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, 6.2832); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }

  function cones() {
    var ctx = C(), w = W();
    for (var i = 0; i < w.cones.length; i++) {
      var c = w.cones[i], k = c.t / c.life;
      ctx.save();
      ctx.globalAlpha = (1 - k) * .5;
      var g = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, c.range);
      g.addColorStop(0, c.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.arc(c.x, c.y, c.range * (.4 + k * .6), c.a - c.half, c.a + c.half);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  /* ================= поверх юнитов ================= */
  function bolts() {
    var ctx = C(), w = W(), m = M();
    for (var i = 0; i < w.bolts.length; i++) {
      var b = w.bolts[i];
      ctx.globalAlpha = 1 - b.t / b.life;
      ctx.shadowColor = b.c; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
      for (var s = 1; s < 7; s++) {
        var k = s / 7;
        ctx.lineTo(b.x1 + (b.x2 - b.x1) * k + m.rnd(-11, 11),
          b.y1 + (b.y2 - b.y1) * k + m.rnd(-11, 11));
      }
      ctx.lineTo(b.x2, b.y2);
      ctx.strokeStyle = b.c; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }

  function pillars() {
    var ctx = C(), w = W();
    for (var i = 0; i < w.pillars.length; i++) {
      var p = w.pillars[i], k = p.t / p.life;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - k) * .9;
      var width = 60 * (1 - k * .5);
      var g = ctx.createLinearGradient(p.x, p.y - 400, p.x, p.y + 20);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, p.c);
      ctx.fillStyle = g;
      ctx.fillRect(p.x - width / 2, p.y - 400, width, 420);
      ctx.restore();
    }
  }

  /** Дуга ближнего удара: три следа с затуханием — читается как замах. */
  function swipes() {
    var ctx = C(), w = W();
    for (var i = 0; i < w.swipes.length; i++) {
      var s = w.swipes[i], k = s.t / s.life;
      var u = s.unit;
      if (!u || u.dead) continue;

      // дуга проходит от начала замаха к концу
      var span = s.arc;
      var head = s.a - span * .5 + span * k;

      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.lineCap = 'round';
      for (var g = 0; g < 3; g++) {
        var back = g * .22;
        ctx.globalAlpha = (1 - k) * (.55 - g * .16);
        ctx.strokeStyle = g === 0 ? '#ffffff' : s.c;
        ctx.lineWidth = (7 - g * 2) * (1 - k * .5);
        ctx.beginPath();
        ctx.arc(0, 0, s.r * (1 - g * .06), head - back - .34, head - back);
        ctx.stroke();
      }
      // остриё дуги
      ctx.globalAlpha = (1 - k) * .9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.cos(head) * s.r, Math.sin(head) * s.r, 3.4 * (1 - k), 0, 6.2832);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  /** Вспышка выстрела: короткий конус у оружия. */
  function muzzles() {
    var ctx = C(), w = W();
    for (var i = 0; i < w.muzzles.length; i++) {
      var m0 = w.muzzles[i], k = m0.t / m0.life;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - k;
      ctx.translate(m0.x, m0.y);
      ctx.rotate(m0.a);
      var len = 26 * (1 - k * .5);
      var g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(.4, m0.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -7 * (1 - k));
      ctx.lineTo(len, 0);
      ctx.lineTo(0, 7 * (1 - k));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  function slashes() {
    var ctx = C(), w = W();
    ctx.lineCap = 'round';
    for (var i = 0; i < w.slashes.length; i++) {
      var s = w.slashes[i], k = s.t / s.life;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5 * (1 - k) + 1;
      ctx.shadowColor = s.c; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }

  function projectiles() {
    var ctx = C(), w = W();
    for (var i = 0; i < w.proj.length; i++) {
      var p = w.proj[i];

      if (p.trail && p.pts.length > 3) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = p.c;
        for (var z = 0; z < p.pts.length - 2; z += 2) {
          var k = z / p.pts.length;
          ctx.globalAlpha = k * .55;
          ctx.lineWidth = p.r * k * 1.7;
          ctx.beginPath();
          ctx.moveTo(p.pts[z], p.pts[z + 1]);
          ctx.lineTo(p.pts[z + 2], p.pts[z + 3]);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.spin) ctx.rotate(p.rot);
      ctx.shadowColor = p.c; ctx.shadowBlur = p.big ? 34 : 14;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(0, 0, p.r * .45, 0, 6.2832); ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    }
  }

  function particles() {
    var ctx = C(), w = W(), i;

    for (i = 0; i < w.parts.length; i++) {
      var p = w.parts[i];
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.globalAlpha = 1;

    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < w.sparks.length; i++) {
      var s = w.sparks[i];
      ctx.globalAlpha = 1 - s.t / s.life;
      ctx.strokeStyle = s.c; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * .022, s.y - s.vy * .022);
      ctx.stroke();
    }
    for (i = 0; i < w.embers.length; i++) {
      var e = w.embers[i];
      ctx.globalAlpha = (1 - e.t / e.life) * .55;
      ctx.fillStyle = e.c;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r || 1.5, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function numbers() {
    var ctx = C(), w = W();
    ctx.textAlign = 'center';
    for (var i = 0; i < w.floats.length; i++) {
      var f = w.floats[i], k = f.t / f.life;
      var scale = k < .16 ? 1 + (1 - k / .16) * .55 : 1;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = '900 ' + (f.s * scale).toFixed(1) + 'px "Trebuchet MS",sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.85)';
      ctx.strokeText(f.txt, f.x, f.y);
      ctx.fillStyle = f.c;
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ================= погода ================= */
  // Взвесь живёт отдельным лёгким слоем: своя пачка частиц на карту,
  // они не участвуют в игровой логике и не чистятся между волнами.
  var flakes = [];
  var flakeMode = null;

  var WEATHER = {
    snow: { count: 90, size: [1, 2.6], vy: [18, 48], vx: [-14, 6], color: '#dfe9ff', alpha: .55, sway: 12 },
    ash: { count: 70, size: [1, 2.2], vy: [10, 30], vx: [-8, 10], color: '#ffb07a', alpha: .4, sway: 18 },
    leaves: { count: 34, size: [2, 4], vy: [14, 34], vx: [-20, 10], color: '#8fd66a', alpha: .45, sway: 26 },
    dust: { count: 55, size: [.8, 1.8], vy: [-10, 10], vx: [-10, 10], color: '#c8c0a8', alpha: .3, sway: 20 },
    fireflies: { count: 26, size: [1.4, 2.6], vy: [-14, 6], vx: [-10, 10], color: '#b0ff90', alpha: .8, sway: 30, blink: true },
    void: { count: 40, size: [1, 2.4], vy: [-22, -6], vx: [-6, 6], color: '#c9a0ff', alpha: .5, sway: 16 }
  };

  function seedWeather(mode) {
    var w = W(), m = M(), cfg = WEATHER[mode];
    flakes = [];
    flakeMode = mode;
    if (!cfg) return;
    for (var i = 0; i < cfg.count; i++) {
      flakes.push({
        x: m.rnd(0, w.view.w), y: m.rnd(0, w.view.h),
        r: m.rnd(cfg.size[0], cfg.size[1]),
        vy: m.rnd(cfg.vy[0], cfg.vy[1]),
        vx: m.rnd(cfg.vx[0], cfg.vx[1]),
        p: m.rnd(0, 6.2832)
      });
    }
  }

  function weather(dt) {
    var w = W(), m = M();
    var mode = w.map && w.map.weather;
    if (!mode || !WEATHER[mode]) return;
    if (mode !== flakeMode || !flakes.length) seedWeather(mode);

    var ctx = C(), cfg = WEATHER[mode];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.vy * dt;
      f.x += (f.vx + Math.sin(w.time * 1.2 + f.p) * cfg.sway) * dt;

      // взвесь живёт в экранных координатах и заворачивается по краям кадра
      if (f.y > w.view.h + 10) { f.y = -10; f.x = m.rnd(0, w.view.w); }
      if (f.y < -10) { f.y = w.view.h + 10; f.x = m.rnd(0, w.view.w); }
      if (f.x > w.view.w + 10) f.x = -10;
      if (f.x < -10) f.x = w.view.w + 10;

      var alpha = cfg.alpha;
      if (cfg.blink) alpha *= .35 + Math.abs(Math.sin(w.time * 2 + f.p)) * .65;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = cfg.color;

      if (mode === 'leaves') {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(w.time * 1.6 + f.p);
        ctx.beginPath();
        ctx.ellipse(0, 0, f.r, f.r * .45, 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ================= освещение ================= */
  function lights() {
    var ctx = C(), w = W(), m = M(), i;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (w.hero && !w.hero.dead) addLight(ctx, w.hero.x, w.hero.y, 190, m.rgba(w.hero.c1, .16));

    for (i = 0; i < w.props.length; i++) {
      var p = w.props[i];
      if (p.meta.light) {
        addLight(ctx, p.x, p.y, 130 + Math.sin(w.time * 5 + p.sway) * 14, 'rgba(255,150,60,.16)');
      }
    }
    for (i = 0; i < w.decals.length; i++) {
      var d = w.decals[i];
      if (d.meta.light) addLight(ctx, d.x, d.y, d.r * 2.6, 'rgba(255,110,30,.16)');
    }
    for (i = 0; i < w.proj.length; i++) {
      var pr = w.proj[i];
      addLight(ctx, pr.x, pr.y, pr.big ? 120 : 60, m.rgba(pr.c, .18));
    }
    for (i = 0; i < w.zones.length; i++) {
      var z = w.zones[i];
      addLight(ctx, z.x, z.y, z.r * 1.2, m.rgba(z.c, .1));
    }
    for (i = 0; i < w.runes.length; i++) {
      var rn = w.runes[i];
      addLight(ctx, rn.x, rn.y, 110, m.rgba(rn.def.color, .2));
    }
    for (i = 0; i < w.units.length; i++) {
      var u = w.units[i];
      if (u.dead || u.team !== 1) continue;
      addLight(ctx, u.x, u.y, u.isBoss ? 150 : 55, m.rgba(u.glow || '#ff5a4a', u.isBoss ? .14 : .08));
    }
    ctx.restore();
  }

  function addLight(ctx, x, y, r, color) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  return {
    zones: zones, runes: runes, auras: auras, corpses: corpses, telegraphs: telegraphs,
    rings: rings, cones: cones, lights: lights, weather: weather,
    bolts: bolts, pillars: pillars, slashes: slashes, swipes: swipes, muzzles: muzzles,
    projectiles: projectiles, particles: particles, numbers: numbers,
    resetWeather: function () { flakes = []; flakeMode = null; }
  };
})());
