/* render/props — объекты ландшафта.
   Плоские (декали) запекаются в фон, объёмные сортируются с юнитами. */
AA.module('render/props', (function () {
  'use strict';

  function C() { return AA.Render.canvas.get(); }
  function W() { return AA.Game.world.state; }
  function M() { return AA.Core.math; }

  /* ---------------- плоские декали ---------------- */
  function drawDecal(p, animated) {
    var ctx = C(), t = animated ? W().time : 0, i;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    switch (p.type) {
      case 'bones':
        ctx.strokeStyle = 'rgba(220,215,200,.32)';
        ctx.fillStyle = 'rgba(220,215,200,.32)';
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-p.r * .6, 0); ctx.lineTo(p.r * .6, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(-p.r * .6, -3, 3.5, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-p.r * .3, p.r * .4); ctx.lineTo(p.r * .4, p.r * .1); ctx.stroke();
        break;

      case 'grass':
        ctx.strokeStyle = 'rgba(110,190,120,.35)';
        ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (i = 0; i < 7; i++) {
          var gx = (i - 3) * p.r * .22;
          ctx.beginPath();
          ctx.moveTo(gx, p.r * .3);
          ctx.quadraticCurveTo(gx + 4, -p.r * .2, gx + 8, -p.r * .55);
          ctx.stroke();
        }
        break;

      case 'puddle':
        ctx.fillStyle = 'rgba(90,15,15,.35)';
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .58, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(160,30,30,.2)';
        ctx.beginPath(); ctx.ellipse(p.r * .2, -p.r * .1, p.r * .5, p.r * .28, .4, 0, 6.2832); ctx.fill();
        break;

      case 'ice':
        ctx.fillStyle = 'rgba(150,220,255,.16)';
        ctx.beginPath();
        for (i = 0; i < 7; i++) {
          var a = i / 7 * 6.2832, rr = p.r * (.7 + ((i * 37) % 10) / 30);
          if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * .62);
          else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .62);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(200,240,255,.3)'; ctx.lineWidth = 1.5; ctx.stroke();
        break;

      case 'crack':                                    // трещина в породе
        ctx.strokeStyle = 'rgba(0,0,0,.45)';
        ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-p.r * .5, 0);
        for (i = 1; i <= 4; i++) {
          var seed = ((i * 71 + Math.round(p.r)) % 13) / 13 - .5;
          ctx.lineTo(-p.r * .5 + i * p.r * .25, seed * p.r * .35);
        }
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-p.r * .1, -p.r * .05);
        ctx.lineTo(p.r * .1, -p.r * .3);
        ctx.stroke();
        break;

      case 'web':                                      // паутина
        ctx.strokeStyle = 'rgba(220,225,240,.28)';
        ctx.lineWidth = 1.2;
        for (i = 0; i < 8; i++) {
          var a2 = i / 8 * 6.2832;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a2) * p.r, Math.sin(a2) * p.r * .6);
          ctx.stroke();
        }
        for (i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r * (i / 3.4), p.r * .6 * (i / 3.4), 0, 0, 6.2832);
          ctx.stroke();
        }
        break;

      case 'spikes':                                   // шипы из земли
        ctx.fillStyle = 'rgba(180,175,165,.65)';
        for (i = 0; i < 6; i++) {
          var sa = i / 6 * 6.2832;
          var sx = Math.cos(sa) * p.r * .5, sy = Math.sin(sa) * p.r * .3;
          ctx.beginPath();
          ctx.moveTo(sx - 3, sy + 2);
          ctx.lineTo(sx, sy - p.r * .45);
          ctx.lineTo(sx + 3, sy + 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(120,20,20,.4)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r * .7, p.r * .42, 0, 0, 6.2832); ctx.stroke();
        break;

      case 'lava':
        var pulse = animated ? .5 + Math.sin(t * 2.2 + p.sway) * .18 : .55;
        var g = ctx.createRadialGradient(0, 0, 2, 0, 0, p.r);
        g.addColorStop(0, 'rgba(255,220,120,' + pulse + ')');
        g.addColorStop(.5, 'rgba(255,110,20,' + (pulse * .8) + ')');
        g.addColorStop(1, 'rgba(90,20,0,.15)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .62, 0, 0, 6.2832); ctx.fill();
        break;
    }
    ctx.restore();
  }

  /** Только те декали, которые должны шевелиться в реальном времени. */
  function drawAnimatedDecals() {
    var w = W();
    for (var i = 0; i < w.decals.length; i++) {
      if (w.decals[i].type === 'lava') drawDecal(w.decals[i], true);
    }
  }

  /* ---------------- объёмные объекты ---------------- */
  function draw(p) {
    var ctx = C(), w = W(), m = M(), map = w.map, i;

    ctx.save();
    // мягкая тень
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath();
    ctx.ellipse(p.x + 4, p.y + p.r * .35, p.r * .95, p.r * .34, 0, 0, 6.2832);
    ctx.fill();

    ctx.translate(p.x, p.y);
    var sway = Math.sin(w.time * 1.1 + p.sway) * .022;

    switch (p.type) {
      case 'rock':
        ctx.rotate(p.rot);
        rock(ctx, p.r, '#6a6258', '#2a2620');
        break;

      case 'pillar':
        var ph = p.r * 3.1;
        ctx.fillStyle = '#2a2630';
        ctx.fillRect(-p.r, -ph, p.r * 2, ph + p.r * .3);
        var pg = ctx.createLinearGradient(-p.r, 0, p.r, 0);
        pg.addColorStop(0, '#3a3644'); pg.addColorStop(.4, '#6a6478'); pg.addColorStop(1, '#242030');
        ctx.fillStyle = pg;
        ctx.fillRect(-p.r * .82, -ph, p.r * 1.64, ph);
        ctx.fillStyle = '#4a4458';
        ctx.fillRect(-p.r * 1.1, -ph - p.r * .3, p.r * 2.2, p.r * .35);
        ctx.fillRect(-p.r * 1.1, -p.r * .2, p.r * 2.2, p.r * .38);
        break;

      case 'tree':
        ctx.rotate(sway);
        ctx.fillStyle = '#2e2118';
        ctx.fillRect(-p.r * .2, -p.r * 1.6, p.r * .4, p.r * 1.8);
        var tg = ctx.createRadialGradient(-p.r * .3, -p.r * 2.4, 4, 0, -p.r * 2.2, p.r * 1.7);
        tg.addColorStop(0, '#5da868'); tg.addColorStop(1, '#1c4426');
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(0, -p.r * 2.2, p.r * 1.5, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(-p.r * .9, -p.r * 1.6, p.r * .95, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(p.r * .9, -p.r * 1.7, p.r * .9, 0, 6.2832); ctx.fill();
        break;

      case 'crystal':
        ctx.rotate(p.rot * .2);
        var glow = .5 + Math.sin(w.time * 2 + p.sway) * .2;
        ctx.shadowColor = map.accent; ctx.shadowBlur = 22 * glow;
        var cg = ctx.createLinearGradient(0, -p.r * 2.2, 0, p.r * .3);
        cg.addColorStop(0, m.mixWhite(map.accent, .5));
        cg.addColorStop(1, map.accent);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(0, -p.r * 2.3); ctx.lineTo(p.r * .7, -p.r * .5);
        ctx.lineTo(p.r * .35, p.r * .3); ctx.lineTo(-p.r * .35, p.r * .3);
        ctx.lineTo(-p.r * .7, -p.r * .5); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath();
        ctx.moveTo(0, -p.r * 2.3); ctx.lineTo(p.r * .22, -p.r * .5); ctx.lineTo(-p.r * .1, -p.r * .5);
        ctx.closePath(); ctx.fill();
        break;

      case 'stump':
        ctx.fillStyle = '#3a2c1e';
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .55, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#5a4630';
        ctx.beginPath(); ctx.ellipse(0, -p.r * .3, p.r * .9, p.r * .48, 0, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = '#3a2c1e'; ctx.lineWidth = 1.5;
        for (i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.ellipse(0, -p.r * .3, p.r * .9 * (i / 4), p.r * .48 * (i / 4), 0, 0, 6.2832);
          ctx.stroke();
        }
        break;

      case 'ruin':
        ctx.rotate(p.rot * .1);
        ctx.fillStyle = '#2a2830';
        ctx.fillRect(-p.r, -p.r * 1.1, p.r * .7, p.r * 1.4);
        ctx.fillRect(p.r * .1, -p.r * .7, p.r * .6, p.r * 1.0);
        var rg = ctx.createLinearGradient(-p.r, 0, p.r, 0);
        rg.addColorStop(0, '#585264'); rg.addColorStop(1, '#2c2836');
        ctx.fillStyle = rg;
        ctx.fillRect(-p.r * .92, -p.r * 1.1, p.r * .58, p.r * 1.35);
        ctx.fillRect(p.r * .16, -p.r * .7, p.r * .5, p.r * .95);
        ctx.fillStyle = '#3a3644';
        ctx.fillRect(-p.r * 1.05, p.r * .18, p.r * 2.1, p.r * .26);
        break;

      case 'obelisk':                                  // обелиск с рунами
        var oh = p.r * 3.6;
        ctx.fillStyle = '#22202c';
        ctx.beginPath();
        ctx.moveTo(-p.r * .78, 0);
        ctx.lineTo(-p.r * .5, -oh);
        ctx.lineTo(p.r * .5, -oh);
        ctx.lineTo(p.r * .78, 0);
        ctx.closePath();
        ctx.fill();
        var og = ctx.createLinearGradient(-p.r, 0, p.r, 0);
        og.addColorStop(0, '#4a4458');
        og.addColorStop(.45, '#6a6478');
        og.addColorStop(1, '#2c2838');
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.moveTo(-p.r * .62, -p.r * .1);
        ctx.lineTo(-p.r * .38, -oh);
        ctx.lineTo(p.r * .38, -oh);
        ctx.lineTo(p.r * .62, -p.r * .1);
        ctx.closePath();
        ctx.fill();
        // светящиеся руны на грани
        ctx.shadowColor = map.accent; ctx.shadowBlur = 14 + Math.sin(w.time * 2 + p.sway) * 6;
        ctx.fillStyle = map.accent;
        for (i = 0; i < 3; i++) {
          var ry = -oh * (.28 + i * .22);
          ctx.fillRect(-p.r * .16, ry, p.r * .32, 2.4);
          ctx.fillRect(-p.r * .06, ry - p.r * .16, 2.4, p.r * .16);
        }
        ctx.shadowBlur = 0;
        break;

      case 'shroom':                                   // светящийся гриб
        ctx.fillStyle = '#d8d0c0';
        ctx.fillRect(-p.r * .16, -p.r * .9, p.r * .32, p.r * .95);
        var mg = ctx.createRadialGradient(0, -p.r, 2, 0, -p.r, p.r * 1.1);
        mg.addColorStop(0, m.mixWhite(map.accent, .5));
        mg.addColorStop(1, map.accent);
        ctx.shadowColor = map.accent;
        ctx.shadowBlur = 16 + Math.sin(w.time * 2.5 + p.sway) * 6;
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.ellipse(0, -p.r * .95, p.r * .9, p.r * .55, 0, Math.PI, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        for (i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(i * p.r * .35, -p.r * 1.12, p.r * .1, 0, 6.2832);
          ctx.fill();
        }
        break;

      case 'bush':                                     // куст, за ним видно силуэт
        ctx.globalAlpha = .92;
        var bg2 = ctx.createRadialGradient(-p.r * .3, -p.r * .6, 3, 0, -p.r * .3, p.r * 1.2);
        bg2.addColorStop(0, '#4e8a52');
        bg2.addColorStop(1, '#1c3a24');
        ctx.fillStyle = bg2;
        for (i = 0; i < 5; i++) {
          var ba = i / 5 * 6.2832;
          ctx.beginPath();
          ctx.arc(Math.cos(ba) * p.r * .45, -p.r * .35 + Math.sin(ba) * p.r * .3, p.r * .55, 0, 6.2832);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;

      case 'brazier':
        ctx.fillStyle = '#33302c';
        ctx.fillRect(-p.r * .28, -p.r * 1.5, p.r * .56, p.r * 1.6);
        ctx.fillStyle = '#4a4640';
        ctx.beginPath(); ctx.ellipse(0, -p.r * 1.5, p.r * .8, p.r * .34, 0, 0, 6.2832); ctx.fill();
        var fl = .8 + Math.sin(w.time * 9 + p.sway) * .2;
        ctx.shadowColor = '#ff9a3a'; ctx.shadowBlur = 26;
        var fg = ctx.createRadialGradient(0, -p.r * 1.9, 2, 0, -p.r * 1.8, p.r * 1.1 * fl);
        fg.addColorStop(0, '#fff3c0'); fg.addColorStop(.45, '#ff9a3a'); fg.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.ellipse(0, -p.r * 1.85, p.r * .8 * fl, p.r * 1.15 * fl, 0, 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;
        if (Math.random() < .12) AA.Game.effects.ember(p.x + m.rnd(-6, 6), p.y - p.r * 2, '#ff9a3a', 1.1);
        break;
    }
    ctx.restore();
  }

  function rock(ctx, r, c1, c2) {
    var g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (var i = 0; i < 7; i++) {
      var a = i / 7 * 6.2832, rr = r * (.75 + ((i * 53) % 11) / 24);
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * .82);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .82);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.09)';
    ctx.beginPath(); ctx.ellipse(-r * .25, -r * .3, r * .4, r * .22, -.5, 0, 6.2832); ctx.fill();
  }

  return { draw: draw, drawDecal: drawDecal, drawAnimatedDecals: drawAnimatedDecals };
})());
