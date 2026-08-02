/* render/units — юнит в кадре: тень, аура, силуэт, анимация покоя,
   индикаторы состояний и полоска здоровья. */
AA.module('render/units', (function () {
  'use strict';

  function C() { return AA.Render.canvas.get(); }
  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }
  function B() { return AA.Game.buffs; }

  function draw(u) {
    var ctx = C(), w = W(), m = M(), A = AA.Render.anim;
    var isHero = u.team === 0;
    var prof = A.profile(u.anim);
    var z = u.airZ || 0;

    var bob = isHero ? A.bob(u, prof, w.time)
      : Math.sin(u.step * 1.4 + (u.wob || 0)) * 2.2;
    var y = u.y + bob - z;

    shadow(ctx, u, z);

    ctx.save();
    ctx.globalAlpha = B().isInvisible(u) ? (isHero ? .3 : .25) : 1;

    if (u.isBoss) bossAura(ctx, u, y, m);
    buffGlow(ctx, u, y, m);

    ctx.translate(u.x, y);

    if (isHero) {
      // корпус стоит прямо: наклон при беге и вращение от умений вроде «Вихря»
      var lean = (u.vx || u.vy) ? prof.lean * Math.sin(u.step * prof.bobF * 2) * .5 : 0;
      var spin = u.spin || 0;
      if (lean || spin) {
        ctx.translate(0, u.r * .8);
        ctx.rotate(lean + spin);
        ctx.translate(0, -u.r * .8);
      }
      AA.Render.shapes.hero(ctx, u, w.time);
      if (lean || spin) {
        ctx.translate(0, u.r * .8);
        ctx.rotate(-(lean + spin));
        ctx.translate(0, -u.r * .8);
      }
      idleFx(ctx, u);
    } else {
      ctx.rotate(u.face + (u.spin || 0));
      AA.Render.shapes.enemy(ctx, u,
        u.flash > 0 ? m.mixWhite(u.c1, u.flash) : u.c1, u.c2, u.glow, w.time);
    }
    ctx.restore();

    statusRings(ctx, u, y, w);
    if (u !== w.hero) healthBar(ctx, u, y, m);
  }

  /* ---------------- слои ---------------- */
  function shadow(ctx, u, z) {
    var scale = 1 - Math.min(.55, z / 120);
    ctx.save();
    ctx.globalAlpha = .42 * scale;
    var g = ctx.createRadialGradient(u.x, u.y + u.r * .72, 1, u.x, u.y + u.r * .72, u.r * 1.15);
    g.addColorStop(0, 'rgba(0,0,0,.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + u.r * .72, u.r * 1.15 * scale, u.r * .42 * scale, 0, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }

  function bossAura(ctx, u, y, m) {
    var pulse = 1 + Math.sin(W().time * 3) * .07;
    var g = ctx.createRadialGradient(u.x, y, u.r * .5, u.x, y, u.r * 2.5 * pulse);
    g.addColorStop(0, m.rgba(u.glow, .3));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(u.x, y, u.r * 2.5 * pulse, 0, 6.2832); ctx.fill();
  }

  function buffGlow(ctx, u, y, m) {
    var glow = null;
    for (var i = 0; i < u.buffs.length; i++) if (u.buffs[i].glow) glow = u.buffs[i].glow;
    if (!glow) return;
    var g = ctx.createRadialGradient(u.x, y, u.r * .4, u.x, y, u.r * 2);
    g.addColorStop(0, m.rgba(glow, .3));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(u.x, y, u.r * 2, 0, 6.2832); ctx.fill();
  }

  function statusRings(ctx, u, y, w) {
    if (u === w.hero) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,199,67,.5)'; ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]); ctx.lineDashOffset = -w.time * 26;
      ctx.beginPath(); ctx.arc(u.x, u.y, u.r + 9, 0, 6.2832); ctx.stroke();
      ctx.restore();
    }
    if (B().has(u, 'freeze')) ring(ctx, u, y, '#7fd4ff', 4);
    else if (B().has(u, 'root')) ring(ctx, u, y, '#3f8f5a', 4);

    var sh = B().get(u, 'shield');
    if (sh && sh.shield > 0) ring(ctx, u, y, '#b07dff', 10);

    if (B().has(u, 'venom')) emit(u, '#7ac043');
    if (B().has(u, 'ignite')) emit(u, '#ffb03a');
  }

  function ring(ctx, u, y, color, offset) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = .9;
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(u.x, y, u.r + offset, 0, 6.2832); ctx.stroke();
    ctx.restore();
  }

  function emit(u, color) {
    if (Math.random() >= .35) return;
    var m = M();
    W().parts.push({
      x: u.x + m.rnd(-u.r, u.r), y: u.y,
      vx: m.rnd(-10, 10), vy: m.rnd(-46, -16),
      c: color, r: 1.9, t: 0, life: .55
    });
  }

  function healthBar(ctx, u, y, m) {
    var bw = Math.max(32, u.r * 2.5), bh = u.isBoss ? 7 : 4;
    var top = u.isBoss ? u.r * 2.4 : u.r + 15;
    var bx = u.x - bw / 2, by = y - top;

    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);

    var g = ctx.createLinearGradient(bx, by, bx, by + bh);
    g.addColorStop(0, u.isBoss ? '#ff9a9a' : '#e88a6a');
    g.addColorStop(1, u.isBoss ? '#b01020' : '#8a2018');
    ctx.fillStyle = g;
    ctx.fillRect(bx, by, bw * m.clamp(u.hp / u.maxHp, 0, 1), bh);

    if (u.isBoss || u.isDummy) {
      ctx.textAlign = 'center';
      ctx.font = '900 11px "Trebuchet MS",sans-serif';
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,.85)';
      ctx.strokeText(u.name.toUpperCase(), u.x, by - 6);
      ctx.fillStyle = u.isBoss ? '#ffd24a' : '#8b97bd';
      ctx.fillText(u.name.toUpperCase(), u.x, by - 6);
    }
  }

  /* ---------------- личные эффекты покоя ---------------- */
  var ORB_COLORS = { F: '#ff5a2f', I: '#7fd4ff', S: '#c9a0ff' };

  function idleFx(ctx, u) {
    var w = W(), m = M(), t = w.time, r = u.r, i, a;

    switch (u.anim) {
      case 'orbit':                                   // реагенты Аркана
        var reg = u.reagents || [];
        for (i = 0; i < 3; i++) {
          a = t * 1.8 + i * 2.094;
          var color = reg[i] ? ORB_COLORS[reg[i]] : 'rgba(150,140,200,.35)';
          ctx.shadowColor = color; ctx.shadowBlur = reg[i] ? 14 : 0;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 1.75, Math.sin(a) * r * 1.75 * .45, reg[i] ? 5.5 : 3, 0, 6.2832);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        break;

      case 'flame':                                   // языки пламени и угольки
        ctx.globalCompositeOperation = 'lighter';
        for (i = 0; i < 3; i++) {
          a = t * 3 + i * 2.1;
          ctx.fillStyle = 'rgba(255,120,40,.28)';
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * .9, Math.sin(a * 1.3) * r * .5 - r * .2, r * (.9 + Math.sin(a) * .25) * .38, 0, 6.2832);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        if (Math.random() < .3) AA.Game.effects.ember(u.x + m.rnd(-r, r), u.y, '#ff8a3a', .8);
        break;

      case 'stone':                                   // парящие обломки
        for (i = 0; i < 3; i++) {
          a = t * .9 + i * 2.094;
          ctx.save();
          ctx.translate(Math.cos(a) * r * 1.6, Math.sin(a) * r * .5 - r * .5);
          ctx.rotate(a * 2);
          ctx.fillStyle = '#6a5a44';
          ctx.fillRect(-4, -4, 8, 8);
          ctx.restore();
        }
        break;

      case 'float':                                   // морозный круг под ногами
        ctx.strokeStyle = 'rgba(127,212,255,.28)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, r * .8, r * 1.2, r * .35, 0, 0, 6.2832); ctx.stroke();
        if (Math.random() < .18) {
          w.parts.push({
            x: u.x + m.rnd(-r, r), y: u.y + r * .5,
            vx: m.rnd(-6, 6), vy: m.rnd(-26, -8),
            c: 'rgba(160,230,255,.6)', r: 1.6, t: 0, life: .8
          });
        }
        break;

      case 'frenzy':                                  // кровь на низком здоровье
        if (u.hp / u.maxHp < .5 && Math.random() < .25) {
          w.parts.push({
            x: u.x + m.rnd(-r, r), y: u.y + m.rnd(-r, r),
            vx: m.rnd(-20, 20), vy: m.rnd(-40, -10),
            c: '#ff4d5e', r: 2, t: 0, life: .5
          });
        }
        break;

      case 'swift':                                   // шлейф теней при беге
        if (Math.abs(u.vx) + Math.abs(u.vy) > .5 && Math.random() < .4) {
          w.corpses.push({ x: u.x, y: u.y, r: r * .8, c: u.c2, glow: u.c1, t: 0, life: .3 });
        }
        break;

      case 'nimble':
        if (Math.random() < .12) {
          w.parts.push({
            x: u.x + m.rnd(-r, r), y: u.y,
            vx: m.rnd(-8, 8), vy: m.rnd(-20, -6),
            c: 'rgba(140,220,120,.6)', r: 1.8, t: 0, life: .9
          });
        }
        break;

      case 'charge':
        ctx.strokeStyle = 'rgba(255,60,60,.25)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.35 + Math.sin(t * 4) * 2, 0, 6.2832); ctx.stroke();
        break;

      case 'heavy':
        if (Math.random() < .06) {
          w.parts.push({
            x: u.x + m.rnd(-r, r), y: u.y + r * .6,
            vx: m.rnd(-5, 5), vy: m.rnd(-8, -2),
            c: 'rgba(120,60,50,.5)', r: 2.2, t: 0, life: .7
          });
        }
        break;

      case 'draw':
        ctx.strokeStyle = 'rgba(255,200,80,.2)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.5, u.face - .5, u.face + .5); ctx.stroke();
        break;
    }

    if (u.castFx > 0) castFlash(ctx, u.castFx, r);
  }

  function castFlash(ctx, k, r) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = k;
    var g = ctx.createRadialGradient(0, 0, r * .3, 0, 0, r * 2.4);
    g.addColorStop(0, 'rgba(255,255,255,.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  return { draw: draw };
})());
