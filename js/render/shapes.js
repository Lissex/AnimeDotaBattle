/* ============================================================
   render/shapes — силуэты.

   Герои рисуются как настоящие фигуры: ноги, торс с бронёй или
   одеждой, наплечники, плащ, голова с лицом и оружие в руке.
   Корпус всегда стоит прямо и зеркалится по направлению взгляда,
   поворачивается только рука с оружием — так броня и лицо
   читаются под любым углом.

   Враги — существа с конечностями, а не те же круги: другая
   пластика, другой силуэт. У каждого босса своя фигура.
   ============================================================ */
AA.module('render/shapes', (function () {
  'use strict';

  function M() { return AA.Core.math; }

  /* ============================================================
                        НАБОРЫ ГЕРОЕВ
     helm   — форма головного убора
     torso  — тип корпуса: plate / robe / leather / fur / stone / apron
     weapon — что в руке
     ============================================================ */
  var KITS = {
    brute: {
      skin: '#c9a883', cloth: '#7a3a24', armor: '#a04a30', trim: '#e0b070',
      helm: 'butcher', torso: 'apron', weapon: 'cleaver', cape: false, bulk: 1.22
    },
    archer: {
      skin: '#d8b48c', cloth: '#2f5c3c', armor: '#4a7a52', trim: '#c8a44a',
      helm: 'hood', torso: 'leather', weapon: 'bow', cape: true, bulk: .92
    },
    berserk: {
      skin: '#d9a878', cloth: '#8a3a14', armor: '#c05a20', trim: '#f0c060',
      helm: 'horned', torso: 'fur', weapon: 'greataxe', cape: false, bulk: 1.14
    },
    witch: {
      skin: '#e8d8e8', cloth: '#1c4a80', armor: '#3a78c0', trim: '#a8e4ff',
      helm: 'wizard', torso: 'robe', weapon: 'staff_ice', cape: true, bulk: .88
    },
    knight: {
      skin: '#d8b48c', cloth: '#6a1414', armor: '#b03a3a', trim: '#e8c060',
      helm: 'greathelm', torso: 'plate', weapon: 'sword', cape: true, bulk: 1.1
    },
    rogue: {
      skin: '#cfae8e', cloth: '#2a1450', armor: '#6a3ab0', trim: '#c9a0ff',
      helm: 'mask', torso: 'leather', weapon: 'daggers', cape: true, bulk: .9
    },
    dryad: {
      skin: '#e0c8a0', cloth: '#2a5a34', armor: '#5aa060', trim: '#a8e07a',
      helm: 'leaf', torso: 'robe', weapon: 'bow_leaf', cape: false, bulk: .9
    },
    mage: {
      skin: '#e0c0a0', cloth: '#3a2a6b', armor: '#7a5ac0', trim: '#ff9a4a',
      helm: 'wizard', torso: 'robe', weapon: 'staff_orb', cape: true, bulk: .92
    },
    pyro: {
      skin: '#e8bfa0', cloth: '#5a1c06', armor: '#c04a18', trim: '#ffb03a',
      helm: 'flamehood', torso: 'robe', weapon: 'staff_fire', cape: true, bulk: .95
    },
    golem: {
      skin: '#8a7458', cloth: '#3a2c18', armor: '#9a7b4f', trim: '#d0a860',
      helm: 'stone', torso: 'stone', weapon: 'fists', cape: false, bulk: 1.35
    },
    demon: {
      skin: '#b884d8', cloth: '#2a0f3a', armor: '#7a2ab0', trim: '#ff6ad8',
      helm: 'horns', torso: 'leather', weapon: 'twinblades', cape: true, bulk: .96
    },
    void: {
      skin: '#2a2038', cloth: '#1a1030', armor: '#5a3ab0', trim: '#a08aff',
      helm: 'voidcrown', torso: 'robe', weapon: 'voidorb', cape: true, bulk: .94
    },
    lurker: {
      skin: '#4a8a7a', cloth: '#0e3a3a', armor: '#1f6a68', trim: '#5affd8',
      helm: 'finned', torso: 'leather', weapon: 'clawblade', cape: false, bulk: .88
    },
    reaper: {
      skin: '#3a2050', cloth: '#1a0828', armor: '#6a2ab0', trim: '#d08aff',
      helm: 'skullcrown', torso: 'robe', weapon: 'soulscythe', cape: true, bulk: .92
    }
  };

  /* ------------------------------------------------------------
                          ПОМОЩНИКИ
     ------------------------------------------------------------ */
  function limb(ctx, x1, y1, x2, y2, w, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function shade(ctx, x, y, w, h, c1, c2, round) {
    var g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    if (round && ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, round);
    else ctx.rect(x - w / 2, y - h / 2, w, h);
    ctx.fill();
  }

  function outline(ctx, w) {
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = w || 1.6;
    ctx.stroke();
  }

  /* ============================================================
                             ГЕРОЙ
     ============================================================ */
  /** Палитра скина накладывается поверх базового набора. */
  function kitOf(u) {
    var base = KITS[u.shape] || KITS.brute;
    if (!u.skin || !u.skin.palette) return base;
    var out = {}, k;
    for (k in base) out[k] = base[k];
    for (k in u.skin.palette) out[k] = u.skin.palette[k];
    return out;
  }

  function hero(ctx, u, time) {
    var m = M();
    var kit = kitOf(u);
    var s = u.r / 28;               // базовый масштаб фигуры
    var t = time || 0;

    // направление: корпус зеркалится, рука целится
    var dirX = Math.cos(u.face || 0), dirY = Math.sin(u.face || 0);
    var flip = dirX < 0 ? -1 : 1;
    var aim = Math.atan2(dirY, Math.abs(dirX) || .0001);

    // фаза шага и удар
    var moving = (Math.abs(u.vx || 0) + Math.abs(u.vy || 0)) > .3;
    var walk = moving ? Math.sin((u.step || 0) * 2) : 0;
    var swingK = (u.swing || 0) / AA.Render.anim.SWING_TIME;

    // вспышка при получении урона подсвечивает все детали разом
    var flash = u.flash || 0;
    var tint = flash > 0
      ? function (c) { return m.mixWhite(c, flash * .8); }
      : function (c) { return c; };

    ctx.save();
    ctx.scale(flip, 1);

    var bulk = kit.bulk;

    /* --- 1. плащ и снаряжение за спиной --- */
    if (kit.cape) cape(ctx, s, bulk, tint(kit.cloth), t, moving);
    backGear(ctx, s, bulk, kit, tint, t);

    /* --- 2. дальняя нога и рука --- */
    leg(ctx, s, -2.2 * s, -walk * 5 * s, tint(kit.cloth), .75);
    limb(ctx, -3 * s, -8 * s, -7 * s + walk * 2 * s, -1 * s, 4.4 * s * bulk, tint(shadeColor(kit.skin, .72)));

    /* --- 3. ноги --- */
    leg(ctx, s, 2.4 * s, walk * 5 * s, tint(kit.cloth), 1);

    /* --- 4. корпус --- */
    torso(ctx, s, bulk, kit, tint, u);

    /* --- 5. наплечники и снаряжение на поясе --- */
    pauldrons(ctx, s, bulk, kit, tint);
    beltGear(ctx, s, bulk, kit, tint, t);

    /* --- 6. голова --- */
    ctx.save();
    ctx.translate(0, -1.5 * s + (moving ? Math.abs(walk) * 1.2 * s : 0));
    head(ctx, s, kit, tint, u, t);
    ctx.restore();

    /* --- 7. рука с оружием поверх всего --- */
    armWithWeapon(ctx, s, bulk, kit, tint, aim, swingK, u, t);

    ctx.restore();
  }

  function shadeColor(hex, k) {
    var m = M(), c = m.hex2rgb(hex);
    return 'rgb(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ')';
  }

  /* ---------------- части тела ---------------- */
  function leg(ctx, s, x, offset, color, front) {
    var w = 5.2 * s * (front ? 1 : .85);
    limb(ctx, x, 3 * s, x + offset, 16 * s, w, front ? color : shadeColor(color, .7));

    // наколенник
    if (front) {
      ctx.fillStyle = shadeColor(color, 1.35);
      ctx.beginPath();
      ctx.ellipse(x + offset * .55, 9.5 * s, 2.9 * s, 2.2 * s, 0, 0, 6.2832);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ботинок с отворотом
    ctx.fillStyle = front ? '#2a2018' : '#1e160f';
    ctx.beginPath();
    ctx.ellipse(x + offset + 1.2 * s, 17.4 * s, 3.9 * s, 2.4 * s, 0, 0, 6.2832);
    ctx.fill();
    if (front) {
      ctx.fillStyle = '#3a2c20';
      ctx.fillRect(x + offset - 2.6 * s, 14.4 * s, 5.4 * s, 1.6 * s);
    }
  }

  function cape(ctx, s, bulk, color, t, moving) {
    var sway = Math.sin(t * (moving ? 7 : 2)) * (moving ? 3 : 1.2) * s;
    ctx.fillStyle = shadeColor(color, .62);
    ctx.beginPath();
    ctx.moveTo(-7 * s * bulk, -11 * s);
    ctx.quadraticCurveTo(-13 * s - sway, 2 * s, -9 * s - sway, 15 * s);
    ctx.lineTo(4 * s - sway * .4, 16 * s);
    ctx.quadraticCurveTo(7 * s * bulk, 0, 6 * s * bulk, -11 * s);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.4);
  }

  function torso(ctx, s, bulk, kit, tint, u) {
    var w = 15 * s * bulk, h = 17 * s;

    switch (kit.torso) {
      case 'robe':
        // подол расширяется книзу
        ctx.fillStyle = tint(kit.cloth);
        ctx.beginPath();
        ctx.moveTo(-w * .38, -11 * s);
        ctx.lineTo(w * .38, -11 * s);
        ctx.lineTo(w * .62, 16 * s);
        ctx.lineTo(-w * .62, 16 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx);
        // накидка сверху
        ctx.fillStyle = tint(kit.armor);
        ctx.beginPath();
        ctx.moveTo(-w * .36, -11 * s);
        ctx.lineTo(w * .36, -11 * s);
        ctx.lineTo(w * .26, 1 * s);
        ctx.lineTo(-w * .26, 1 * s);
        ctx.closePath();
        ctx.fill();
        // пояс с пряжкой
        ctx.fillStyle = kit.trim;
        ctx.fillRect(-w * .32, 1 * s, w * .64, 2.2 * s);
        ctx.fillStyle = shadeColor(kit.trim, .55);
        ctx.fillRect(-1.8 * s, .4 * s, 3.6 * s, 3.4 * s);
        // вышивка по подолу
        ctx.strokeStyle = kit.trim; ctx.lineWidth = 1.2;
        ctx.globalAlpha = .7;
        ctx.beginPath();
        ctx.moveTo(-w * .58, 13 * s); ctx.lineTo(w * .58, 13 * s);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;

      case 'plate':
        shade(ctx, 0, -2 * s, w * .82, h, tint(kit.armor), shadeColor(kit.armor, .55), 4 * s);
        outline(ctx);
        // нагрудные пластины
        ctx.strokeStyle = 'rgba(0,0,0,.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-w * .34, -4 * s); ctx.lineTo(w * .34, -4 * s);
        ctx.moveTo(-w * .3, 1 * s); ctx.lineTo(w * .3, 1 * s);
        ctx.stroke();
        // заклёпки по краю нагрудника
        ctx.fillStyle = shadeColor(kit.trim, .9);
        for (var ri = -1; ri <= 1; ri++) {
          ctx.beginPath(); ctx.arc(-w * .36, ri * 4 * s - 2 * s, .8 * s, 0, 6.2832); ctx.fill();
          ctx.beginPath(); ctx.arc(w * .36, ri * 4 * s - 2 * s, .8 * s, 0, 6.2832); ctx.fill();
        }
        // герб
        ctx.fillStyle = kit.trim;
        ctx.beginPath();
        ctx.moveTo(0, -9 * s); ctx.lineTo(3 * s, -6 * s);
        ctx.lineTo(0, -2 * s); ctx.lineTo(-3 * s, -6 * s);
        ctx.closePath(); ctx.fill();
        // юбка доспеха с сегментами
        ctx.fillStyle = shadeColor(kit.armor, .7);
        ctx.fillRect(-w * .36, 5 * s, w * .72, 5 * s);
        ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1;
        for (var sg = -1; sg <= 1; sg++) {
          ctx.beginPath();
          ctx.moveTo(sg * w * .16, 5 * s); ctx.lineTo(sg * w * .16, 10 * s);
          ctx.stroke();
        }
        break;

      case 'leather':
        shade(ctx, 0, -2 * s, w * .74, h, tint(kit.cloth), shadeColor(kit.cloth, .6), 4 * s);
        outline(ctx);
        // ремни крест-накрест
        ctx.strokeStyle = kit.trim;
        ctx.lineWidth = 1.8 * s;
        ctx.beginPath();
        ctx.moveTo(-w * .3, -9 * s); ctx.lineTo(w * .28, 2 * s);
        ctx.moveTo(w * .3, -9 * s); ctx.lineTo(-w * .28, 2 * s);
        ctx.stroke();
        // пояс с сумками
        ctx.fillStyle = shadeColor(kit.trim, .8);
        ctx.fillRect(-w * .34, 3 * s, w * .68, 2.4 * s);
        break;

      case 'fur':
        shade(ctx, 0, -2 * s, w * .8, h, tint(kit.cloth), shadeColor(kit.cloth, .55), 4 * s);
        outline(ctx);
        // меховой воротник
        ctx.fillStyle = '#d8c8a8';
        ctx.beginPath();
        for (var i = -3; i <= 3; i++) {
          ctx.arc(i * 2.4 * s, -10 * s, 2.4 * s, 0, 6.2832);
        }
        ctx.fill();
        // голая грудь и шрамы
        ctx.fillStyle = tint(kit.skin);
        ctx.beginPath();
        ctx.ellipse(0, -3 * s, w * .2, 5 * s, 0, 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = 'rgba(140,40,30,.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2 * s, -6 * s); ctx.lineTo(2 * s, -1 * s);
        ctx.stroke();
        break;

      case 'stone':
        // каменные блоки
        ctx.fillStyle = tint(kit.armor);
        ctx.beginPath();
        ctx.moveTo(-w * .48, -11 * s);
        ctx.lineTo(w * .48, -11 * s);
        ctx.lineTo(w * .40, 14 * s);
        ctx.lineTo(-w * .40, 14 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 2);
        ctx.strokeStyle = 'rgba(0,0,0,.4)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-w * .44, -3 * s); ctx.lineTo(w * .44, -4 * s);
        ctx.moveTo(-w * .1, -11 * s); ctx.lineTo(-w * .06, -3 * s);
        ctx.moveTo(w * .18, -3 * s); ctx.lineTo(w * .14, 14 * s);
        ctx.stroke();
        // светящиеся трещины
        ctx.strokeStyle = kit.trim;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = .8;
        ctx.beginPath();
        ctx.moveTo(-w * .2, -8 * s); ctx.lineTo(w * .05, -2 * s); ctx.lineTo(-w * .12, 6 * s);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;

      default: // apron — мясницкий фартук
        shade(ctx, 0, -2 * s, w * .8, h, tint(kit.armor), shadeColor(kit.armor, .55), 3 * s);
        outline(ctx);
        ctx.fillStyle = '#d8d0c0';
        ctx.beginPath();
        ctx.moveTo(-w * .3, -10 * s);
        ctx.lineTo(w * .3, -10 * s);
        ctx.lineTo(w * .34, 12 * s);
        ctx.lineTo(-w * .34, 12 * s);
        ctx.closePath();
        ctx.fill();
        // пятна крови
        ctx.fillStyle = 'rgba(150,20,20,.55)';
        ctx.beginPath(); ctx.ellipse(-2 * s, 2 * s, 3 * s, 2 * s, .3, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3 * s, 7 * s, 2 * s, 1.4 * s, -.4, 0, 6.2832); ctx.fill();
        break;
    }
  }

  /* ---------------- снаряжение за спиной ---------------- */
  // Рисуется до корпуса, поэтому выглядывает из-за плеч.
  function backGear(ctx, s, bulk, kit, tint, t) {
    var i;
    switch (kit.weapon) {
      case 'bow':                                     // колчан со стрелами
      case 'bow_leaf':
        ctx.fillStyle = shadeColor(kit.cloth, .7);
        ctx.save();
        ctx.translate(-6 * s, -4 * s);
        ctx.rotate(-.45);
        ctx.fillRect(-3 * s, -6 * s, 6 * s, 15 * s);
        ctx.strokeStyle = kit.trim; ctx.lineWidth = 1.4;
        ctx.strokeRect(-3 * s, -6 * s, 6 * s, 15 * s);
        for (i = -1; i <= 1; i++) {                   // оперение
          ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1.6 * s;
          ctx.beginPath();
          ctx.moveTo(i * 1.8 * s, -6 * s);
          ctx.lineTo(i * 1.8 * s, -11 * s);
          ctx.stroke();
        }
        ctx.restore();
        break;

      case 'sword':                                   // щит за спиной
        ctx.fillStyle = shadeColor(kit.armor, .75);
        ctx.beginPath();
        ctx.moveTo(-11 * s, -12 * s);
        ctx.lineTo(-2 * s, -13 * s);
        ctx.lineTo(-2 * s, 2 * s);
        ctx.lineTo(-11 * s, -1 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.4);
        ctx.fillStyle = kit.trim;
        ctx.fillRect(-8 * s, -9 * s, 3 * s, 8 * s);
        break;

      case 'staff_orb':                               // парящий фолиант
        var lift = Math.sin(t * 2) * 1.5 * s;
        ctx.fillStyle = shadeColor(kit.cloth, 1.3);
        ctx.fillRect(-13 * s, -12 * s + lift, 7 * s, 9 * s);
        ctx.fillStyle = kit.trim;
        ctx.fillRect(-13 * s, -12 * s + lift, 1.6 * s, 9 * s);
        ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.2;
        ctx.strokeRect(-13 * s, -12 * s + lift, 7 * s, 9 * s);
        break;

      case 'greataxe':                                // шкура и рог за спиной
        ctx.fillStyle = '#d8c8a8';
        ctx.beginPath();
        ctx.ellipse(-9 * s, -6 * s, 4 * s, 6 * s, .4, 0, 6.2832);
        ctx.fill();
        break;

      case 'daggers':                                 // ножны с запасными клинками
        ctx.strokeStyle = shadeColor(kit.cloth, 1.4);
        ctx.lineWidth = 2.4 * s;
        ctx.beginPath();
        ctx.moveTo(-10 * s, -11 * s); ctx.lineTo(-4 * s, -2 * s);
        ctx.moveTo(-4 * s, -12 * s); ctx.lineTo(-10 * s, -3 * s);
        ctx.stroke();
        break;
    }
  }

  /* ---------------- снаряжение на поясе ---------------- */
  function beltGear(ctx, s, bulk, kit, tint, t) {
    var i;
    switch (kit.torso) {
      case 'apron':                                   // крюки и связка ключей мясника
        ctx.strokeStyle = '#b0a898'; ctx.lineWidth = 1.6 * s;
        for (i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.arc(i * 5 * s, 6 * s, 2.2 * s, -.6, 2.4);
          ctx.stroke();
        }
        break;

      case 'fur':                                     // черепа на поясе
        ctx.fillStyle = '#d8d0c0';
        for (i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(i * 4.6 * s, 5.5 * s, 1.9 * s, 0, 6.2832);
          ctx.fill();
          ctx.fillStyle = 'rgba(20,16,12,.7)';
          ctx.fillRect(i * 4.6 * s - 1.2 * s, 5.2 * s, 2.4 * s, .9 * s);
          ctx.fillStyle = '#d8d0c0';
        }
        break;

      case 'robe':                                    // пояс с флаконами
        ctx.fillStyle = kit.trim;
        for (i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.ellipse(i * 5.4 * s, 4.5 * s, 1.5 * s, 2.2 * s, 0, 0, 6.2832);
          ctx.fill();
        }
        break;

      case 'leather':                                 // подсумки
        ctx.fillStyle = shadeColor(kit.cloth, .7);
        ctx.fillRect(-7 * s, 3.4 * s, 4 * s, 4 * s);
        ctx.fillRect(3 * s, 3.4 * s, 3.4 * s, 3.4 * s);
        ctx.strokeStyle = kit.trim; ctx.lineWidth = 1;
        ctx.strokeRect(-7 * s, 3.4 * s, 4 * s, 4 * s);
        break;

      case 'plate':                                   // накидка с гербом
        ctx.fillStyle = tint(kit.cloth);
        ctx.beginPath();
        ctx.moveTo(-4.5 * s, 2 * s);
        ctx.lineTo(4.5 * s, 2 * s);
        ctx.lineTo(3.5 * s, 13 * s);
        ctx.lineTo(0, 11 * s);
        ctx.lineTo(-3.5 * s, 13 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.2);
        break;

      case 'stone':                                   // светящееся ядро
        var pulse = .6 + Math.sin(t * 2.5) * .35;
        ctx.shadowColor = kit.trim;
        ctx.shadowBlur = 16 * pulse;
        ctx.fillStyle = kit.trim;
        ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(0, -2 * s, 2.6 * s, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        break;
    }
  }

  function pauldrons(ctx, s, bulk, kit, tint) {
    if (kit.torso === 'robe') {
      // у магов вместо наплечников — оторочка воротника
      ctx.strokeStyle = kit.trim;
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.moveTo(-5.4 * s, -10.4 * s);
      ctx.quadraticCurveTo(0, -12.4 * s, 5.4 * s, -10.4 * s);
      ctx.stroke();
      return;
    }

    var x = 7.6 * s * bulk;
    ctx.fillStyle = tint(kit.armor);
    ctx.beginPath();
    ctx.ellipse(-x, -9 * s, 4.2 * s, 3.4 * s, -.3, 0, 6.2832);
    ctx.fill();
    outline(ctx, 1.4);
    ctx.beginPath();
    ctx.ellipse(x, -9 * s, 4.6 * s, 3.8 * s, .3, 0, 6.2832);
    ctx.fill();
    outline(ctx, 1.4);

    // блик и заклёпки на правом наплечнике
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath();
    ctx.ellipse(x - .6 * s, -10.4 * s, 2.4 * s, 1.2 * s, .3, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = kit.trim;
    for (var i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(x + i * 2.2 * s, -7.2 * s, .7 * s, 0, 6.2832);
      ctx.fill();
    }

    if (kit.helm === 'horned' || kit.torso === 'plate') {
      // шипы на правом наплечнике
      ctx.fillStyle = kit.trim;
      ctx.beginPath();
      ctx.moveTo(x + 1 * s, -12 * s);
      ctx.lineTo(x + 4 * s, -15 * s);
      ctx.lineTo(x + 3 * s, -10 * s);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---------------- голова и лицо ---------------- */
  function head(ctx, s, kit, tint, u, t) {
    var hr = 7.4 * s;

    // шея
    limb(ctx, 0, -11 * s, 0, -14 * s, 4 * s, shadeColor(kit.skin, .82));

    // череп
    ctx.fillStyle = tint(kit.skin);
    ctx.beginPath();
    ctx.ellipse(.6 * s, -19 * s, hr * .92, hr, 0, 0, 6.2832);
    ctx.fill();
    outline(ctx, 1.5);

    // объём: тень со стороны спины и блик на скуле
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(-2.6 * s, -19 * s, hr * .42, hr * .82, 0, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath();
    ctx.ellipse(3.2 * s, -21.4 * s, hr * .3, hr * .22, -.4, 0, 6.2832);
    ctx.fill();

    face(ctx, s, kit, u, t);
    headgear(ctx, s, hr, kit, tint, t);
  }

  function face(ctx, s, kit, u, t) {
    // лицо закрыто наглухо либо заменено самой головой
    if (kit.helm === 'greathelm' || kit.helm === 'stone' ||
      kit.helm === 'finned' || kit.helm === 'skullcrown') return;

    var eyeY = -20 * s;
    var open = kit.helm === 'mask' ? .55 : 1;

    // глаза
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(2.4 * s, eyeY, 1.9 * s, 1.5 * s * open, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1.6 * s, eyeY, 1.7 * s, 1.4 * s * open, 0, 0, 6.2832); ctx.fill();

    ctx.fillStyle = '#1a1420';
    ctx.beginPath(); ctx.arc(3 * s, eyeY, .95 * s, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(-1.1 * s, eyeY, .9 * s, 0, 6.2832); ctx.fill();

    // брови — задают характер
    ctx.strokeStyle = 'rgba(30,20,20,.75)';
    ctx.lineWidth = 1.5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (kit.torso === 'fur' || kit.torso === 'apron') {         // злые, сдвинутые
      ctx.moveTo(.8 * s, -22.6 * s); ctx.lineTo(4.4 * s, -21.4 * s);
      ctx.moveTo(-3.4 * s, -22.4 * s); ctx.lineTo(-.2 * s, -22.8 * s);
    } else {                                                    // спокойные
      ctx.moveTo(1 * s, -22.4 * s); ctx.lineTo(4.2 * s, -22.6 * s);
      ctx.moveTo(-3.2 * s, -22.4 * s); ctx.lineTo(-.4 * s, -22.6 * s);
    }
    ctx.stroke();

    // рот
    ctx.strokeStyle = 'rgba(90,40,40,.7)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-.4 * s, -16.4 * s);
    ctx.lineTo(2.6 * s, -16.4 * s);
    ctx.stroke();

    // борода мясника и берсерка
    if (kit.torso === 'fur' || kit.torso === 'apron') {
      ctx.fillStyle = 'rgba(40,28,20,.85)';
      ctx.beginPath();
      ctx.moveTo(-3.6 * s, -17.4 * s);
      ctx.quadraticCurveTo(.6 * s, -11 * s, 5 * s, -17.4 * s);
      ctx.quadraticCurveTo(.6 * s, -15 * s, -3.6 * s, -17.4 * s);
      ctx.fill();
    }
  }

  function headgear(ctx, s, hr, kit, tint, t) {
    switch (kit.helm) {
      case 'butcher':                                   // кожаная маска и ремень
        ctx.fillStyle = '#8a7a68';
        ctx.beginPath();
        ctx.ellipse(.6 * s, -23 * s, hr * .95, hr * .55, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#5a4a38';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.moveTo(-6 * s, -24 * s); ctx.lineTo(7 * s, -24.6 * s);
        ctx.stroke();
        break;

      case 'hood':                                      // капюшон охотника
        ctx.fillStyle = tint(kit.cloth);
        ctx.beginPath();
        ctx.moveTo(-7.6 * s, -16 * s);
        ctx.quadraticCurveTo(-8.4 * s, -28 * s, .8 * s, -28 * s);
        ctx.quadraticCurveTo(9 * s, -28 * s, 8 * s, -16 * s);
        ctx.quadraticCurveTo(4 * s, -22 * s, -7.6 * s, -16 * s);
        ctx.fill();
        outline(ctx, 1.4);
        break;

      case 'horned':                                    // рогатый шлем
        ctx.fillStyle = tint(kit.armor);
        ctx.beginPath();
        ctx.ellipse(.6 * s, -23 * s, hr * 1.02, hr * .72, 0, Math.PI, 0);
        ctx.fill();
        outline(ctx, 1.4);
        ctx.fillStyle = '#e8dcc0';
        ctx.beginPath();
        ctx.moveTo(-6 * s, -25 * s);
        ctx.quadraticCurveTo(-13 * s, -30 * s, -10 * s, -35 * s);
        ctx.quadraticCurveTo(-8 * s, -29 * s, -3.5 * s, -25.5 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(7 * s, -25 * s);
        ctx.quadraticCurveTo(14 * s, -30 * s, 11 * s, -35 * s);
        ctx.quadraticCurveTo(9 * s, -29 * s, 4.5 * s, -25.5 * s);
        ctx.fill();
        break;

      case 'greathelm':                                 // глухой шлем рыцаря
        ctx.fillStyle = tint(kit.armor);
        ctx.beginPath();
        ctx.ellipse(.6 * s, -19.5 * s, hr * .98, hr * 1.06, 0, 0, 6.2832);
        ctx.fill();
        outline(ctx, 1.6);
        ctx.fillStyle = '#14121a';                      // смотровая щель
        ctx.fillRect(-3 * s, -21.4 * s, 8 * s, 1.8 * s);
        ctx.fillRect(.4 * s, -21 * s, 1.4 * s, 5 * s);
        ctx.fillStyle = kit.trim;                       // гребень
        ctx.beginPath();
        ctx.moveTo(-1 * s, -27 * s);
        ctx.quadraticCurveTo(.8 * s, -32 * s, 3 * s, -26.6 * s);
        ctx.closePath();
        ctx.fill();
        break;

      case 'mask':                                      // маска ассасина
        ctx.fillStyle = '#1c1430';
        ctx.beginPath();
        ctx.ellipse(.6 * s, -22.6 * s, hr * .96, hr * .62, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#1c1430';
        ctx.beginPath();
        ctx.moveTo(-6.6 * s, -18.6 * s);
        ctx.lineTo(7.4 * s, -18.6 * s);
        ctx.lineTo(6 * s, -13 * s);
        ctx.lineTo(-5 * s, -13 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = kit.trim;                       // светящаяся полоса
        ctx.globalAlpha = .8;
        ctx.fillRect(-5 * s, -22 * s, 12 * s, 1 * s);
        ctx.globalAlpha = 1;
        break;

      case 'wizard':                                    // остроконечная шляпа
        ctx.fillStyle = tint(kit.cloth);
        ctx.beginPath();
        ctx.ellipse(.6 * s, -25 * s, hr * 1.5, hr * .38, 0, 0, 6.2832);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6.4 * s, -25.4 * s);
        ctx.quadraticCurveTo(-2 * s, -42 * s, 8 * s, -37 * s);
        ctx.lineTo(7.6 * s, -25.4 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.4);
        ctx.fillStyle = kit.trim;
        ctx.beginPath(); ctx.arc(6.6 * s, -36 * s, 1.8 * s, 0, 6.2832); ctx.fill();
        break;

      case 'flamehood':                                 // капюшон с пламенем
        ctx.fillStyle = tint(kit.cloth);
        ctx.beginPath();
        ctx.moveTo(-7.6 * s, -16 * s);
        ctx.quadraticCurveTo(-8.6 * s, -29 * s, .8 * s, -29 * s);
        ctx.quadraticCurveTo(9.4 * s, -29 * s, 8 * s, -16 * s);
        ctx.quadraticCurveTo(4 * s, -22 * s, -7.6 * s, -16 * s);
        ctx.fill();
        outline(ctx, 1.4);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var f = 0; f < 3; f++) {
          var fx = (f - 1) * 3.4 * s;
          var fh = (4 + Math.sin(t * 8 + f * 2) * 1.6) * s;
          ctx.fillStyle = 'rgba(255,150,60,.5)';
          ctx.beginPath();
          ctx.moveTo(fx - 1.6 * s, -28 * s);
          ctx.quadraticCurveTo(fx, -28 * s - fh, fx + 1.6 * s, -28 * s);
          ctx.fill();
        }
        ctx.restore();
        break;

      case 'leaf':                                      // венок дриады
        ctx.fillStyle = tint(kit.armor);
        for (var i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.ellipse(.6 * s + i * 3 * s, -25.4 * s - Math.abs(i) * .6 * s,
            2.4 * s, 1.1 * s, i * .35, 0, 6.2832);
          ctx.fill();
        }
        ctx.fillStyle = shadeColor(kit.cloth, 1.4);     // волосы
        ctx.beginPath();
        ctx.ellipse(-4.6 * s, -18 * s, 3 * s, 6 * s, .2, 0, 6.2832);
        ctx.fill();
        break;

      case 'voidcrown':                                 // осколки вместо головы
        ctx.fillStyle = '#0a0812';
        ctx.beginPath();
        ctx.ellipse(.6 * s, -19 * s, hr * .82, hr * .9, 0, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = kit.trim;
        ctx.shadowColor = kit.trim; ctx.shadowBlur = 14;
        for (var vi = -2; vi <= 2; vi++) {
          var vh = 27 + Math.abs(vi) * -1.6;
          ctx.beginPath();
          ctx.moveTo(.6 * s + vi * 2.6 * s - .8 * s, -24 * s);
          ctx.lineTo(.6 * s + vi * 2.6 * s, -vh * s);
          ctx.lineTo(.6 * s + vi * 2.6 * s + .8 * s, -24 * s);
          ctx.closePath(); ctx.fill();
        }
        // два огонька вместо глаз
        ctx.beginPath(); ctx.arc(-1.4 * s, -19.6 * s, 1.1 * s, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(2.8 * s, -19.6 * s, 1.1 * s, 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;
        break;

      case 'horns':                                     // демонические рога и грива
        ctx.fillStyle = shadeColor(kit.cloth, 1.6);
        ctx.beginPath();
        ctx.ellipse(-2.2 * s, -20 * s, hr * .8, hr * .95, .2, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = tint(kit.armor);
        ctx.beginPath();
        ctx.moveTo(-4.6 * s, -24.4 * s);
        ctx.quadraticCurveTo(-11 * s, -31 * s, -6.4 * s, -35 * s);
        ctx.quadraticCurveTo(-6.6 * s, -28 * s, -2.4 * s, -25 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5.8 * s, -24.4 * s);
        ctx.quadraticCurveTo(12.2 * s, -31 * s, 7.6 * s, -35 * s);
        ctx.quadraticCurveTo(7.8 * s, -28 * s, 3.6 * s, -25 * s);
        ctx.fill();
        // светящаяся метка на лбу
        ctx.fillStyle = kit.trim;
        ctx.shadowColor = kit.trim; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(.6 * s, -25.4 * s);
        ctx.lineTo(2 * s, -23 * s);
        ctx.lineTo(.6 * s, -21.4 * s);
        ctx.lineTo(-.8 * s, -23 * s);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        break;

      case 'finned':                                    // гребень и жабры хищника
        ctx.fillStyle = shadeColor(kit.skin, 1.15);
        ctx.beginPath();
        ctx.ellipse(.6 * s, -19.5 * s, hr * .88, hr * .96, 0, 0, 6.2832);
        ctx.fill();
        outline(ctx, 1.4);

        // спинной гребень: три пластины, задняя длиннее
        ctx.fillStyle = tint(kit.armor);
        for (var fn = 0; fn < 3; fn++) {
          var fx2 = -1.4 * s - fn * 2.6 * s;
          var fh2 = (7 + fn * 2.6) * s;
          ctx.beginPath();
          ctx.moveTo(fx2, -24 * s);
          ctx.quadraticCurveTo(fx2 - 2 * s, -24 * s - fh2, fx2 - 4.4 * s, -22 * s);
          ctx.quadraticCurveTo(fx2 - 2 * s, -23 * s, fx2, -24 * s);
          ctx.fill();
        }

        // жаберные щели
        ctx.strokeStyle = shadeColor(kit.cloth, .7);
        ctx.lineWidth = 1.1;
        for (var gi = 0; gi < 3; gi++) {
          ctx.beginPath();
          ctx.moveTo(4.4 * s, (-21 + gi * 2.2) * s);
          ctx.lineTo(6.6 * s, (-20.4 + gi * 2.2) * s);
          ctx.stroke();
        }

        // узкие светящиеся глаза глубоководного
        ctx.fillStyle = kit.trim;
        ctx.shadowColor = kit.trim; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(2.4 * s, -20.4 * s, 2.2 * s, .9 * s, -.16, 0, 6.2832);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-2.6 * s, -20.2 * s, 1.5 * s, .8 * s, -.16, 0, 6.2832);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;

      case 'skullcrown':                                // череп в венце из душ
        ctx.fillStyle = '#e8e0d0';
        ctx.beginPath();
        ctx.ellipse(.6 * s, -20 * s, hr * .82, hr * .9, 0, 0, 6.2832);
        ctx.fill();
        outline(ctx, 1.4);
        // челюсть
        ctx.fillStyle = '#cfc4b0';
        ctx.beginPath();
        ctx.moveTo(-3.6 * s, -16.4 * s);
        ctx.lineTo(4.8 * s, -16.4 * s);
        ctx.lineTo(3.4 * s, -12.6 * s);
        ctx.lineTo(-2.4 * s, -12.6 * s);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8a7f6a'; ctx.lineWidth = .8;
        for (var tj = 0; tj < 4; tj++) {
          ctx.beginPath();
          ctx.moveTo((-2.6 + tj * 1.9) * s, -16.4 * s);
          ctx.lineTo((-2.6 + tj * 1.9) * s, -13 * s);
          ctx.stroke();
        }
        // пустые глазницы с огнём внутри
        ctx.fillStyle = '#120a1c';
        ctx.beginPath(); ctx.ellipse(-2 * s, -21 * s, 2.1 * s, 2.4 * s, 0, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3.4 * s, -21 * s, 2.1 * s, 2.4 * s, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = kit.trim;
        ctx.shadowColor = kit.trim; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(-2 * s, -21 * s, 1 * s, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(3.4 * s, -21 * s, 1 * s, 0, 6.2832); ctx.fill();
        // венец: рожки по кругу
        for (var ci = -2; ci <= 2; ci++) {
          ctx.beginPath();
          ctx.moveTo(.6 * s + ci * 3 * s - .7 * s, -25.6 * s);
          ctx.lineTo(.6 * s + ci * 3 * s, (-30 + Math.abs(ci) * 1.4) * s);
          ctx.lineTo(.6 * s + ci * 3 * s + .7 * s, -25.6 * s);
          ctx.closePath(); ctx.fill();
        }
        ctx.shadowBlur = 0;
        break;

      case 'stone':                                     // каменная голова
        ctx.fillStyle = tint(kit.armor);
        ctx.beginPath();
        ctx.moveTo(-6.4 * s, -14 * s);
        ctx.lineTo(-7.4 * s, -24 * s);
        ctx.lineTo(1 * s, -28 * s);
        ctx.lineTo(8 * s, -23 * s);
        ctx.lineTo(6.6 * s, -14 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 2);
        ctx.fillStyle = kit.trim;                       // светящиеся глазницы
        ctx.shadowColor = kit.trim; ctx.shadowBlur = 10;
        ctx.fillRect(-4 * s, -22 * s, 3.4 * s, 1.8 * s);
        ctx.fillRect(2 * s, -22.4 * s, 3.4 * s, 1.8 * s);
        ctx.shadowBlur = 0;
        break;
    }
  }

  /* ---------------- рука и оружие ---------------- */
  function armWithWeapon(ctx, s, bulk, kit, tint, aim, swingK, u, t) {
    var sx = 7 * s * bulk, sy = -9 * s;

    // замах добавляет поворот сверх прицела
    var extra = 0;
    switch (u.anim) {
      case 'heavy': extra = -swingK * 1.0; break;
      case 'stone': extra = -swingK * 1.25; break;
      case 'charge': extra = swingK * .15; break;
      case 'frenzy': extra = Math.sin(swingK * Math.PI * 3) * 1.05; break;
      case 'swift': extra = Math.sin(swingK * Math.PI * 2) * .9; break;
      case 'draw':
      case 'nimble': extra = swingK * .35; break;
      default: extra = -swingK * .5;
    }
    var angle = M().clamp(aim, -1.15, 1.15) + extra;

    // выпад вперёд у колющих
    var lunge = (u.anim === 'charge') ? swingK * 5 * s : 0;

    ctx.save();
    ctx.translate(sx + lunge, sy);
    ctx.rotate(angle);

    var reach = 11 * s;
    limb(ctx, 0, 0, reach, 0, 5 * s * bulk, tint(kit.skin));   // предплечье

    // наруч
    ctx.fillStyle = tint(kit.armor);
    ctx.beginPath();
    ctx.ellipse(reach * .5, 0, 3 * s, 2.9 * s * bulk, 0, 0, 6.2832);
    ctx.fill();
    outline(ctx, 1.2);
    ctx.fillStyle = kit.trim;
    ctx.fillRect(reach * .5 - 2.6 * s, -.7 * s, 5.2 * s, 1.4 * s);

    // перчатка с пальцами
    ctx.fillStyle = '#3a2a1e';
    ctx.beginPath(); ctx.arc(reach, 0, 3 * s, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = .9;
    ctx.beginPath();
    ctx.moveTo(reach - 1 * s, -2.4 * s); ctx.lineTo(reach + 1.6 * s, -1.6 * s);
    ctx.moveTo(reach - 1 * s, 2.4 * s); ctx.lineTo(reach + 1.6 * s, 1.6 * s);
    ctx.stroke();

    weapon(ctx, s, kit, reach, t, u);
    ctx.restore();
  }

  function weapon(ctx, s, kit, hand, t, u) {
    ctx.save();
    ctx.translate(hand, 0);

    switch (kit.weapon) {
      case 'cleaver':                                   // тесак мясника
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(-1 * s, -1.4 * s, 5 * s, 2.8 * s);
        ctx.fillStyle = '#d8d8e0';
        ctx.beginPath();
        ctx.moveTo(4 * s, -5.6 * s);
        ctx.lineTo(15 * s, -6.4 * s);
        ctx.lineTo(15 * s, 4 * s);
        ctx.lineTo(4 * s, 3.4 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.4);
        ctx.fillStyle = 'rgba(150,20,20,.5)';
        ctx.fillRect(9 * s, -5 * s, 4 * s, 8 * s);
        break;

      case 'greataxe':                                  // двусторонний топор
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(-4 * s, -1.6 * s, 22 * s, 3.2 * s);
        ctx.fillStyle = '#e0e0e8';
        ctx.beginPath();
        ctx.moveTo(11 * s, -2 * s);
        ctx.quadraticCurveTo(17 * s, -12 * s, 22 * s, -3 * s);
        ctx.quadraticCurveTo(17 * s, -1 * s, 11 * s, -2 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(11 * s, 2 * s);
        ctx.quadraticCurveTo(17 * s, 12 * s, 22 * s, 3 * s);
        ctx.quadraticCurveTo(17 * s, 1 * s, 11 * s, 2 * s);
        ctx.fill();
        outline(ctx, 1.4);
        break;

      case 'sword':                                     // меч рыцаря
        ctx.fillStyle = kit.trim;
        ctx.fillRect(-1 * s, -3.4 * s, 2.4 * s, 6.8 * s);   // гарда
        ctx.fillStyle = '#e8e8f0';
        ctx.beginPath();
        ctx.moveTo(2 * s, -2 * s);
        ctx.lineTo(21 * s, -1 * s);
        ctx.lineTo(23 * s, 0);
        ctx.lineTo(21 * s, 1 * s);
        ctx.lineTo(2 * s, 2 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.2);
        ctx.strokeStyle = 'rgba(255,255,255,.6)';
        ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(3 * s, 0); ctx.lineTo(20 * s, 0); ctx.stroke();
        break;

      case 'daggers':                                   // парные клинки
        ctx.fillStyle = '#d0d0e0';
        ctx.beginPath();
        ctx.moveTo(1 * s, -1.6 * s); ctx.lineTo(12 * s, -3 * s); ctx.lineTo(1 * s, 0);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1 * s, 1.6 * s); ctx.lineTo(11 * s, 3.4 * s); ctx.lineTo(1 * s, 0);
        ctx.closePath(); ctx.fill();
        outline(ctx, 1.1);
        break;

      case 'bow':
      case 'bow_leaf':                                  // лук с тетивой
        ctx.strokeStyle = kit.weapon === 'bow_leaf' ? '#5a8a3a' : '#6a4a2a';
        ctx.lineWidth = 2.6 * s;
        ctx.beginPath();
        ctx.arc(2 * s, 0, 11 * s, -1.25, 1.25);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(240,240,255,.75)';
        ctx.lineWidth = 1 * s;
        var pull = (u.swing || 0) > 0 ? -3.5 * s : 0;
        ctx.beginPath();
        ctx.moveTo(2 * s + Math.cos(-1.25) * 11 * s, Math.sin(-1.25) * 11 * s);
        ctx.lineTo(2 * s + pull, 0);
        ctx.lineTo(2 * s + Math.cos(1.25) * 11 * s, Math.sin(1.25) * 11 * s);
        ctx.stroke();
        if (kit.weapon === 'bow_leaf') {
          ctx.fillStyle = '#8fd66a';
          ctx.beginPath(); ctx.ellipse(2 * s, -10 * s, 2.4 * s, 1.1 * s, .4, 0, 6.2832); ctx.fill();
          ctx.beginPath(); ctx.ellipse(2 * s, 10 * s, 2.4 * s, 1.1 * s, -.4, 0, 6.2832); ctx.fill();
        }
        break;

      case 'staff_ice':
      case 'staff_orb':
      case 'staff_fire':                                // посохи
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(-6 * s, -1.4 * s, 24 * s, 2.8 * s);
        var orbX = 18 * s;
        var glow = kit.weapon === 'staff_ice' ? '#a8e4ff'
          : kit.weapon === 'staff_fire' ? '#ff9a3a' : '#c9a0ff';
        ctx.shadowColor = glow;
        ctx.shadowBlur = 16 + Math.sin(t * 4) * 5;
        ctx.fillStyle = glow;
        if (kit.weapon === 'staff_ice') {
          ctx.beginPath();
          ctx.moveTo(orbX, -5 * s); ctx.lineTo(orbX + 4 * s, 0);
          ctx.lineTo(orbX, 5 * s); ctx.lineTo(orbX - 4 * s, 0);
          ctx.closePath(); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(orbX, 0, 3.6 * s, 0, 6.2832); ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.arc(orbX - 1 * s, -1 * s, 1.2 * s, 0, 6.2832); ctx.fill();
        break;

      case 'voidorb':                                   // сфера пустоты на цепи
        ctx.strokeStyle = 'rgba(160,138,255,.6)';
        ctx.lineWidth = 1.4 * s;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(11 * s, 0);
        ctx.stroke();
        ctx.fillStyle = '#0a0812';
        ctx.shadowColor = kit.trim; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(15 * s, 0, 4.6 * s, 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;
        // кольцо аккреции
        ctx.strokeStyle = kit.trim;
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.ellipse(15 * s, 0, 7 * s, 2.4 * s, t * .8, 0, 6.2832);
        ctx.stroke();
        break;

      case 'twinblades':                                // изогнутые демонические клинки
        var morphed = !!u.morph;
        ctx.fillStyle = morphed ? kit.trim : '#e0d0f0';
        ctx.shadowColor = kit.trim;
        ctx.shadowBlur = morphed ? 16 : 6;
        ctx.beginPath();
        ctx.moveTo(0, -2 * s);
        ctx.quadraticCurveTo(11 * s, -8 * s, 19 * s, -2 * s);
        ctx.quadraticCurveTo(11 * s, -3.4 * s, 0, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 2 * s);
        ctx.quadraticCurveTo(9 * s, 8 * s, 15 * s, 3 * s);
        ctx.quadraticCurveTo(9 * s, 2.4 * s, 0, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;

      case 'clawblade':                                 // костяной коготь-серп
        ctx.fillStyle = '#dff3ea';
        ctx.shadowColor = kit.trim;
        ctx.shadowBlur = u.essenceStacks ? 6 + Math.min(14, u.essenceStacks * .5) : 5;
        ctx.beginPath();
        ctx.moveTo(0, -2.6 * s);
        ctx.quadraticCurveTo(10 * s, -7 * s, 17 * s, -1 * s);
        ctx.quadraticCurveTo(11 * s, -2.6 * s, 0, .6 * s);
        ctx.fill();
        // вторая, короткая пластина у запястья
        ctx.beginPath();
        ctx.moveTo(0, 1.6 * s);
        ctx.quadraticCurveTo(6 * s, 5.4 * s, 10 * s, 1.6 * s);
        ctx.quadraticCurveTo(6 * s, 1.4 * s, 0, 0);
        ctx.fill();
        // накопленная сущность светится по кромке
        if (u.essenceStacks) {
          ctx.strokeStyle = kit.trim;
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = Math.min(.9, .25 + u.essenceStacks * .025);
          ctx.beginPath();
          ctx.moveTo(1 * s, -2.2 * s);
          ctx.quadraticCurveTo(10 * s, -6.4 * s, 16.4 * s, -1.2 * s);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
        break;

      case 'soulscythe':                                // коса из душ
        ctx.strokeStyle = '#2a1a3a';                    // древко
        ctx.lineWidth = 2.2 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7 * s, 3 * s); ctx.lineTo(16 * s, -5 * s);
        ctx.stroke();

        ctx.fillStyle = kit.trim;
        ctx.shadowColor = kit.trim;
        ctx.shadowBlur = 12 + Math.sin(t * 3) * 4;
        ctx.beginPath();                                // лезвие
        ctx.moveTo(16 * s, -5 * s);
        ctx.quadraticCurveTo(24 * s, -12 * s, 22 * s, -19 * s);
        ctx.quadraticCurveTo(18 * s, -12 * s, 14 * s, -7 * s);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // души на орбите: столько, сколько накоплено (до восьми в кадре)
        var sn = Math.min(8, u.souls || 0);
        if (sn) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (var si = 0; si < sn; si++) {
            var sa = t * 1.1 + si / sn * 6.2832;
            var sr = 13 * s;
            ctx.fillStyle = 'rgba(200,138,255,.85)';
            ctx.beginPath();
            ctx.arc(4 * s + Math.cos(sa) * sr, Math.sin(sa) * sr * .5 - 4 * s,
              1.5 * s, 0, 6.2832);
            ctx.fill();
          }
          ctx.restore();
        }
        break;

      case 'fists':                                     // каменный кулак
        ctx.fillStyle = kit.armor;
        ctx.beginPath();
        ctx.moveTo(0, -5 * s);
        ctx.lineTo(9 * s, -6 * s);
        ctx.lineTo(11 * s, 0);
        ctx.lineTo(9 * s, 6 * s);
        ctx.lineTo(0, 5 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.8);
        ctx.strokeStyle = kit.trim;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = .8;
        ctx.beginPath(); ctx.moveTo(3 * s, -3 * s); ctx.lineTo(7 * s, 2 * s); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
    }
    ctx.restore();
  }

  /* ============================================================
                             ВРАГИ
     ============================================================ */
  function enemy(ctx, u, bodyColor, c2, glow, time) {
    if (u.isBoss) { boss(ctx, u, bodyColor, c2, glow, time); return; }
    if (u.shape === 'e_dummy') { dummy(ctx, u, bodyColor, c2, glow); return; }
    if (u.shape === 'eidolon') { eidolonShape(ctx, u, bodyColor, c2, glow, time); return; }

    var m = M(), r = u.r, t = time || 0, i, a, rr;
    var wob = u.wob || 0;
    var walk = Math.sin((u.step || 0) * 2.2 + wob);

    ctx.save();

    /* --- конечности: у тварей они есть, но кривые --- */
    ctx.strokeStyle = c2;
    ctx.lineCap = 'round';
    ctx.lineWidth = r * .26;
    for (i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(-r * .2, i * r * .35);
      ctx.quadraticCurveTo(-r * .7, i * r * .9, -r * .55 + walk * r * .25 * i, i * r * 1.35);
      ctx.stroke();
    }

    /* --- рваная масса тела --- */
    ctx.fillStyle = c2;
    ctx.beginPath();
    var spikes = u.shape === 'e_swarm' ? 5 : 9;
    for (i = 0; i < spikes; i++) {
      a = i / spikes * 6.2832;
      rr = r * (i % 2 ? 1.28 : .78) * (1 + Math.sin(t * 3 + i + wob) * .04);
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();

    /* --- гранёное ядро --- */
    var g = ctx.createRadialGradient(0, 0, r * .1, 0, 0, r * .95);
    g.addColorStop(0, m.mixWhite(u.c1, .18));
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (i = 0; i < 6; i++) {
      a = i / 6 * 6.2832 + .4;
      if (i === 0) ctx.moveTo(Math.cos(a) * r * .72, Math.sin(a) * r * .72);
      else ctx.lineTo(Math.cos(a) * r * .72, Math.sin(a) * r * .72);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    /* --- глаза-щели --- */
    ctx.shadowColor = glow; ctx.shadowBlur = 12;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(r * .2, -r * .34); ctx.lineTo(r * .72, -r * .2); ctx.lineTo(r * .2, -r * .1);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * .2, r * .34); ctx.lineTo(r * .72, r * .2); ctx.lineTo(r * .2, r * .1);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    mobDetails(ctx, u, r, glow, t);
    ctx.restore();
  }

  function mobDetails(ctx, u, r, glow, t) {
    var i, a;
    ctx.fillStyle = glow;
    ctx.strokeStyle = glow;

    switch (u.shape) {
      case 'e_spitter':
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(r * .8, 0); ctx.lineTo(r * 1.9, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(r * 1.9, 0, r * .16, 0, 6.2832); ctx.fill();
        break;
      case 'e_brute':
        ctx.beginPath();
        ctx.moveTo(r * .6, -r * 1.1); ctx.lineTo(r * 1.1, -r * .3); ctx.lineTo(r * .5, -r * .5);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r * .6, r * 1.1); ctx.lineTo(r * 1.1, r * .3); ctx.lineTo(r * .5, r * .5);
        ctx.closePath(); ctx.fill();
        break;
      case 'e_caster':
      case 'e_hex':
        for (i = 0; i < 3; i++) {
          a = t * 2.4 + i * 2.094;
          ctx.globalAlpha = .8;
          ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.5, Math.sin(a) * r * .6, 3.2, 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      case 'e_bomb':
        ctx.globalAlpha = .35 + (.5 + Math.sin(t * 9 + (u.wob || 0)) * .5) * .5;
        ctx.beginPath(); ctx.arc(0, 0, r * .5, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case 'e_healer':
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-r * .35, -r * .9); ctx.lineTo(r * .35, -r * .9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -r * 1.25); ctx.lineTo(0, -r * .55); ctx.stroke();
        break;
      case 'e_shell':
        ctx.lineWidth = 3.5; ctx.globalAlpha = .8;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.12, -1.1, 1.1); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      case 'e_swarm':
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-r * .3, -r * .8); ctx.lineTo(r * .9, -r * .3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * .3, r * .8); ctx.lineTo(r * .9, r * .3); ctx.stroke();
        break;
      case 'e_stalker':
        ctx.lineWidth = 2.2;
        for (i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.moveTo(r * .5, i * r * .5); ctx.lineTo(r * 1.6, i * r * .25);
          ctx.stroke();
        }
        break;
      case 'e_skeleton':
        ctx.lineWidth = 2;
        ctx.globalAlpha = .8;
        for (i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(-r * .3, i * r * .3); ctx.lineTo(r * .5, i * r * .34);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      case 'e_mirror':
        ctx.globalAlpha = .5;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = 1;
        break;

      case 'e_sting':                                   // хвост с жалом
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-r * .4, 0);
        ctx.quadraticCurveTo(-r * 1.6, -r * .9, -r * .9, -r * 1.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * .9, -r * 1.7);
        ctx.lineTo(-r * .5, -r * 2.1);
        ctx.lineTo(-r * 1.2, -r * 2.05);
        ctx.closePath(); ctx.fill();
        break;

      case 'e_leech':                                   // присоска и жилы
        ctx.globalAlpha = .85;
        ctx.beginPath(); ctx.arc(r * .85, 0, r * .34, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = .45;
        ctx.lineWidth = 1.8;
        for (i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(-r * .5, i * r * .45);
          ctx.quadraticCurveTo(0, i * r * .2, r * .7, i * r * .16);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;

      case 'e_howl':                                    // раскрытая пасть и волны крика
        ctx.globalAlpha = .9;
        ctx.beginPath();
        ctx.moveTo(r * .5, -r * .5); ctx.lineTo(r * 1.15, 0); ctx.lineTo(r * .5, r * .5);
        ctx.closePath(); ctx.fill();
        ctx.lineWidth = 2;
        for (i = 1; i <= 3; i++) {
          ctx.globalAlpha = .35 - i * .07 + Math.sin(t * 4 + i) * .1;
          ctx.beginPath();
          ctx.arc(0, 0, r * (1.2 + i * .32), -.9, .9);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;

      case 'e_lunge':                                   // поджатые лапы для прыжка
        ctx.lineWidth = 2.6;
        for (i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.moveTo(-r * .2, i * r * .55);
          ctx.lineTo(-r * .95, i * r * 1.0);
          ctx.lineTo(-r * .35, i * r * 1.35);
          ctx.stroke();
        }
        ctx.globalAlpha = .8;
        ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
        break;

      case 'e_split':                                   // трещина по корпусу
        ctx.lineWidth = 2.8;
        ctx.globalAlpha = .9;
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.05);
        ctx.lineTo(r * .22, -r * .3);
        ctx.lineTo(-r * .22, r * .3);
        ctx.lineTo(0, r * 1.05);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;

      case 'e_sentinel':                                // тяжёлые пластины и шлем
        ctx.globalAlpha = .55;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.1, -1.5, 1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r * .82, -1.3, 1.3); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(r * .3, -r * 1.3); ctx.lineTo(r * .55, -r * .85);
        ctx.lineTo(r * .05, -r * .95);
        ctx.closePath(); ctx.fill();
        break;

      case 'e_warlock':                                 // книга и знак на груди
        ctx.globalAlpha = .9;
        ctx.beginPath();
        ctx.moveTo(r * .7, -r * .55); ctx.lineTo(r * 1.5, -r * .35);
        ctx.lineTo(r * 1.5, r * .35); ctx.lineTo(r * .7, r * .55);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = .5 + Math.sin(t * 3) * .2;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * .55, 0, 6.2832); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * .4, -r * .3); ctx.lineTo(r * .4, r * .3);
        ctx.moveTo(-r * .4, r * .3); ctx.lineTo(r * .4, -r * .3);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
    }
  }

  /** Эйдолон: парящий сгусток пустоты с осколками по орбите. */
  function eidolonShape(ctx, u, c1, c2, glow, t) {
    var r = u.r, i, a;

    // ядро
    var g = ctx.createRadialGradient(0, 0, r * .1, 0, 0, r);
    g.addColorStop(0, glow);
    g.addColorStop(.5, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.shadowColor = glow; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, r * .78, 0, 6.2832); ctx.fill();
    ctx.shadowBlur = 0;

    // осколки по орбите
    ctx.fillStyle = glow;
    ctx.globalAlpha = .85;
    for (i = 0; i < 3; i++) {
      a = t * 2.2 + i * 2.094 + (u.wob || 0);
      ctx.save();
      ctx.translate(Math.cos(a) * r * 1.15, Math.sin(a) * r * .55);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -r * .26); ctx.lineTo(r * .16, 0);
      ctx.lineTo(0, r * .26); ctx.lineTo(-r * .16, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // глаз-щель
    ctx.fillStyle = '#0a0812';
    ctx.beginPath();
    ctx.ellipse(r * .18, 0, r * .3, r * .12, 0, 0, 6.2832);
    ctx.fill();
  }

  function dummy(ctx, u, c1, c2, glow) {
    var r = u.r;
    // столб
    ctx.fillStyle = '#3a3028';
    ctx.fillRect(-r * .18, 0, r * .36, r * 1.5);
    // мишень
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath(); ctx.arc(0, -r * .2, r, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.6; ctx.stroke();
    var ring = ['#c02020', '#e8e0d0', '#c02020'];
    for (var i = 0; i < 3; i++) {
      ctx.fillStyle = ring[i];
      ctx.beginPath(); ctx.arc(0, -r * .2, r * (1 - (i + 1) * .25), 0, 6.2832); ctx.fill();
    }
  }

  /* ============================================================
                    БОССЫ — у каждого свой силуэт
     ============================================================ */
  function boss(ctx, u, c1, c2, glow, t) {
    var enraged = u.phase === 2;
    ctx.save();
    if (enraged) { ctx.shadowColor = glow; ctx.shadowBlur = 18; }

    switch (u.shape) {
      case 'e_boss_bone': bossBone(ctx, u, c1, c2, glow, t); break;
      case 'e_boss_maw': bossMaw(ctx, u, c1, c2, glow, t); break;
      case 'e_boss_void': bossVoid(ctx, u, c1, c2, glow, t); break;
      case 'e_boss_forge': bossForge(ctx, u, c1, c2, glow, t); break;
      case 'e_boss_chrono': bossChrono(ctx, u, c1, c2, glow, t); break;
      case 'e_boss_brood': bossBrood(ctx, u, c1, c2, glow, t); break;
      case 'e_boss_mirror': bossMirror(ctx, u, c1, c2, glow, t); break;
      case 'e_boss_storm': bossStorm(ctx, u, c1, c2, glow, t); break;
      case 'e_boss_plague': bossPlague(ctx, u, c1, c2, glow, t); break;
      case 'e_boss_wrath': bossWrath(ctx, u, c1, c2, glow, t); break;
      default: bossBone(ctx, u, c1, c2, glow, t);
    }
    ctx.restore();
  }

  /** Костяной Владыка: череп с рогами, рёбра, коса. */
  function bossBone(ctx, u, c1, c2, glow, t) {
    var r = u.r, breathe = Math.sin(t * 2) * .03 + 1;
    ctx.save();
    ctx.scale(breathe, 1 / breathe);

    // плащ-саван
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(-r * .9, -r * .2);
    ctx.quadraticCurveTo(-r * 1.5, r * .9, -r * .6, r * 1.5);
    ctx.lineTo(r * .7, r * 1.5);
    ctx.quadraticCurveTo(r * 1.4, r * .8, r * .9, -r * .2);
    ctx.closePath(); ctx.fill();

    // грудная клетка
    ctx.strokeStyle = c1; ctx.lineWidth = r * .13; ctx.lineCap = 'round';
    for (var i = 0; i < 4; i++) {
      var y = -r * .3 + i * r * .32;
      ctx.beginPath();
      ctx.moveTo(-r * .55, y);
      ctx.quadraticCurveTo(0, y + r * .22, r * .55, y);
      ctx.stroke();
    }
    // позвоночник
    ctx.lineWidth = r * .16;
    ctx.beginPath(); ctx.moveTo(0, -r * .55); ctx.lineTo(0, r * .9); ctx.stroke();

    // череп
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.ellipse(0, -r * .95, r * .62, r * .55, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#0a0a0e';
    ctx.beginPath(); ctx.ellipse(-r * .24, -r * 1.0, r * .16, r * .19, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * .24, -r * 1.0, r * .16, r * .19, 0, 0, 6.2832); ctx.fill();
    ctx.shadowColor = glow; ctx.shadowBlur = 14;
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(-r * .24, -r * 1.0, r * .08, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .24, -r * 1.0, r * .08, 0, 6.2832); ctx.fill();
    ctx.shadowBlur = 0;
    // челюсть
    ctx.fillStyle = c1;
    ctx.fillRect(-r * .3, -r * .72, r * .6, r * .18);
    ctx.strokeStyle = c2; ctx.lineWidth = 1.4;
    for (var j = -2; j <= 2; j++) {
      ctx.beginPath();
      ctx.moveTo(j * r * .12, -r * .72); ctx.lineTo(j * r * .12, -r * .54);
      ctx.stroke();
    }
    // рога
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.moveTo(-r * .5, -r * 1.3);
    ctx.quadraticCurveTo(-r * 1.25, -r * 1.9, -r * .85, -r * 2.25);
    ctx.quadraticCurveTo(-r * .8, -r * 1.6, -r * .28, -r * 1.35);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * .5, -r * 1.3);
    ctx.quadraticCurveTo(r * 1.25, -r * 1.9, r * .85, -r * 2.25);
    ctx.quadraticCurveTo(r * .8, -r * 1.6, r * .28, -r * 1.35);
    ctx.fill();

    // коса
    ctx.save();
    ctx.rotate(Math.sin(t * 1.4) * .06);
    ctx.fillStyle = '#4a4438';
    ctx.fillRect(r * .8, -r * 1.6, r * .13, r * 2.8);
    ctx.fillStyle = '#e8e4d4';
    ctx.beginPath();
    ctx.moveTo(r * .86, -r * 1.55);
    ctx.quadraticCurveTo(r * 2.2, -r * 1.9, r * 2.0, -r * .7);
    ctx.quadraticCurveTo(r * 1.5, -r * 1.35, r * .86, -r * 1.25);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  /** Пожиратель Бездны: сплошная пасть с зубами и щупальцами. */
  function bossMaw(ctx, u, c1, c2, glow, t) {
    var r = u.r, open = .5 + Math.sin(t * 1.8) * .5;
    var i, a;

    // щупальца
    ctx.strokeStyle = c2; ctx.lineWidth = r * .16; ctx.lineCap = 'round';
    for (i = 0; i < 6; i++) {
      a = i / 6 * 6.2832 + t * .3;
      var len = r * (1.5 + Math.sin(t * 3 + i) * .3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6);
      ctx.quadraticCurveTo(
        Math.cos(a + .5) * len, Math.sin(a + .5) * len,
        Math.cos(a + .2) * len * 1.25, Math.sin(a + .2) * len * 1.25
      );
      ctx.stroke();
    }

    // туша
    var g = ctx.createRadialGradient(0, 0, r * .2, 0, 0, r * 1.15);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * .98, 0, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.stroke();

    // пасть
    ctx.fillStyle = '#160208';
    ctx.beginPath();
    ctx.ellipse(r * .12, 0, r * .66, r * (.28 + open * .34), 0, 0, 6.2832);
    ctx.fill();
    ctx.shadowColor = glow; ctx.shadowBlur = 20;
    ctx.fillStyle = glow;
    ctx.globalAlpha = .35 + open * .3;
    ctx.beginPath();
    ctx.ellipse(r * .12, 0, r * .3, r * (.12 + open * .2), 0, 0, 6.2832);
    ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // зубы
    ctx.fillStyle = '#f0e8e0';
    for (i = -3; i <= 3; i++) {
      var tx = r * .12 + i * r * .18;
      var th = r * (.13 + open * .1);
      ctx.beginPath();
      ctx.moveTo(tx - r * .07, -r * (.24 + open * .3));
      ctx.lineTo(tx + r * .07, -r * (.24 + open * .3));
      ctx.lineTo(tx, -r * (.24 + open * .3) + th);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx - r * .07, r * (.24 + open * .3));
      ctx.lineTo(tx + r * .07, r * (.24 + open * .3));
      ctx.lineTo(tx, r * (.24 + open * .3) - th);
      ctx.closePath(); ctx.fill();
    }

    // глаза кольцом
    ctx.fillStyle = glow;
    for (i = 0; i < 5; i++) {
      a = -1.1 + i * .55;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * .82 - r * .3, Math.sin(a) * r * .6 - r * .5, r * .07, 0, 6.2832);
      ctx.fill();
    }
  }

  /** Архонт Пустоты: парящая мантия без ног и вращающиеся кольца. */
  function bossVoid(ctx, u, c1, c2, glow, t) {
    var r = u.r, i, a;

    // орбитальные кольца
    ctx.strokeStyle = glow;
    ctx.globalAlpha = .5;
    for (i = 0; i < 3; i++) {
      ctx.lineWidth = 2;
      ctx.save();
      ctx.rotate(t * (.4 + i * .25) * (i % 2 ? -1 : 1));
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (1.35 + i * .22), r * (.38 + i * .12), i * .6, 0, 6.2832);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // мантия
    var float = Math.sin(t * 1.6) * r * .07;
    ctx.save();
    ctx.translate(0, float);
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(-r * .78, -r * .5);
    ctx.quadraticCurveTo(-r * 1.15, r * .8, -r * .35, r * 1.45);
    ctx.quadraticCurveTo(0, r * 1.15, r * .35, r * 1.45);
    ctx.quadraticCurveTo(r * 1.15, r * .8, r * .78, -r * .5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = glow; ctx.lineWidth = 1.6; ctx.globalAlpha = .55; ctx.stroke(); ctx.globalAlpha = 1;

    // светящееся ядро вместо лица
    ctx.fillStyle = '#0a0c18';
    ctx.beginPath(); ctx.ellipse(0, -r * .68, r * .5, r * .56, 0, 0, 6.2832); ctx.fill();
    ctx.shadowColor = glow; ctx.shadowBlur = 24;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.0);
    ctx.lineTo(r * .2, -r * .68);
    ctx.lineTo(0, -r * .36);
    ctx.lineTo(-r * .2, -r * .68);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // корона осколков
    ctx.fillStyle = c1;
    for (i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * .22 - r * .06, -r * 1.05);
      ctx.lineTo(i * r * .22, -r * (1.35 + Math.abs(i) * -.08));
      ctx.lineTo(i * r * .22 + r * .06, -r * 1.05);
      ctx.closePath(); ctx.fill();
    }

    // руки-тени
    ctx.strokeStyle = c1; ctx.lineWidth = r * .13; ctx.lineCap = 'round';
    for (i = -1; i <= 1; i += 2) {
      var sway = Math.sin(t * 2 + i) * r * .12;
      ctx.beginPath();
      ctx.moveTo(i * r * .55, -r * .35);
      ctx.quadraticCurveTo(i * r * .95, r * .1 + sway, i * r * .78, r * .55);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Кузнец Пепла: наковальня-плечи, молот, светящиеся трещины. */
  function bossForge(ctx, u, c1, c2, glow, t) {
    var r = u.r, i;
    var heat = .6 + Math.sin(t * 3) * .4;

    // ноги-колонны
    ctx.fillStyle = c2;
    ctx.fillRect(-r * .62, r * .3, r * .42, r * 1.2);
    ctx.fillRect(r * .2, r * .3, r * .42, r * 1.2);

    // корпус
    var g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * .95, -r * .6);
    ctx.lineTo(r * .95, -r * .6);
    ctx.lineTo(r * .7, r * .55);
    ctx.lineTo(-r * .7, r * .55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2.2; ctx.stroke();

    // светящиеся трещины
    ctx.strokeStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 12 * heat;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = heat;
    ctx.beginPath();
    ctx.moveTo(-r * .6, -r * .4); ctx.lineTo(-r * .15, r * .05); ctx.lineTo(-r * .45, r * .5);
    ctx.moveTo(r * .55, -r * .35); ctx.lineTo(r * .2, r * .15);
    ctx.stroke();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // плечи-наковальни
    ctx.fillStyle = c2;
    for (i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(i * r * .8, -r * 1.0);
      ctx.lineTo(i * r * 1.45, -r * .85);
      ctx.lineTo(i * r * 1.3, -r * .35);
      ctx.lineTo(i * r * .78, -r * .5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.8; ctx.stroke();
    }

    // голова в маске кузнеца
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.ellipse(0, -r * .95, r * .42, r * .38, 0, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 14;
    ctx.fillRect(-r * .28, -r * 1.02, r * .56, r * .12);
    ctx.shadowBlur = 0;

    // молот
    ctx.save();
    ctx.rotate(Math.sin(t * 1.2) * .08);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(r * .9, -r * .2, r * 1.5, r * .16);
    ctx.fillStyle = c1;
    ctx.fillRect(r * 2.1, -r * .62, r * .55, r * .95);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.6;
    ctx.strokeRect(r * 2.1, -r * .62, r * .55, r * .95);
    ctx.globalAlpha = heat * .7;
    ctx.fillStyle = glow;
    ctx.fillRect(r * 2.16, -r * .5, r * .43, r * .18);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Хронарх: песочные часы в кольце шестерён. */
  function bossChrono(ctx, u, c1, c2, glow, t) {
    var r = u.r, i, a;

    // шестерёнчатые кольца
    for (i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate(t * (i ? -.5 : .8));
      ctx.strokeStyle = c1;
      ctx.lineWidth = r * .1;
      ctx.globalAlpha = .75;
      var rr = r * (1.25 + i * .35);
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = c1;
      for (a = 0; a < 12; a++) {
        var ga = a / 12 * 6.2832;
        ctx.save();
        ctx.translate(Math.cos(ga) * rr, Math.sin(ga) * rr);
        ctx.rotate(ga);
        ctx.fillRect(-r * .06, -r * .1, r * .12, r * .2);
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // мантия
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(-r * .7, -r * .55);
    ctx.quadraticCurveTo(-r * 1.05, r * .7, -r * .35, r * 1.25);
    ctx.lineTo(r * .35, r * 1.25);
    ctx.quadraticCurveTo(r * 1.05, r * .7, r * .7, -r * .55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();

    // песочные часы вместо груди
    var sand = (Math.sin(t * .8) * .5 + .5);
    ctx.shadowColor = glow; ctx.shadowBlur = 18;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(-r * .34, -r * .55); ctx.lineTo(r * .34, -r * .55);
    ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .55 + sand * .45;
    ctx.beginPath();
    ctx.moveTo(-r * .34, r * .55); ctx.lineTo(r * .34, r * .55);
    ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // капюшон с пустотой внутри
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(-r * .5, -r * .6);
    ctx.quadraticCurveTo(0, -r * 1.5, r * .5, -r * .6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#050a0c';
    ctx.beginPath(); ctx.ellipse(0, -r * .82, r * .3, r * .26, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(-r * .1, -r * .84, r * .06, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .1, -r * .84, r * .06, 0, 6.2832); ctx.fill();
  }

  /** Роевая Матка: раздутое брюхо с кладкой и паучьи лапы. */
  function bossBrood(ctx, u, c1, c2, glow, t) {
    var r = u.r, i, a;

    // лапы
    ctx.strokeStyle = c2; ctx.lineWidth = r * .13; ctx.lineCap = 'round';
    for (i = 0; i < 6; i++) {
      a = (i < 3 ? -1 : 1) * (.5 + (i % 3) * .45);
      var wig = Math.sin(t * 4 + i) * r * .12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * .5, Math.sin(a) * r * .4);
      ctx.quadraticCurveTo(
        Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.1 + wig,
        Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.7 + wig
      );
      ctx.stroke();
    }

    // брюхо
    var g = ctx.createRadialGradient(-r * .2, -r * .2, r * .1, 0, r * .2, r * 1.25);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(-r * .15, r * .15, r * 1.15, r * .95, 0, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.stroke();

    // кладка яиц
    ctx.fillStyle = glow;
    ctx.globalAlpha = .55 + Math.sin(t * 2) * .2;
    for (i = 0; i < 5; i++) {
      a = i / 5 * 6.2832 + t * .3;
      ctx.beginPath();
      ctx.ellipse(-r * .15 + Math.cos(a) * r * .55, r * .15 + Math.sin(a) * r * .45,
        r * .16, r * .2, a, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // головогрудь
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.ellipse(r * .8, -r * .35, r * .55, r * .45, -.3, 0, 6.2832);
    ctx.fill();
    // жвалы
    ctx.strokeStyle = c1; ctx.lineWidth = r * .1;
    for (i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(r * 1.15, -r * .35 + i * r * .18);
      ctx.lineTo(r * 1.6, -r * .35 + i * r * .38);
      ctx.stroke();
    }
    // глаза кучкой
    ctx.fillStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 10;
    for (i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(r * (.72 + (i % 2) * .2), -r * (.5 - Math.floor(i / 2) * .22), r * .07, 0, 6.2832);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  /** Зеркальный Страж: рыцарь, собранный из зеркальных осколков. */
  function bossMirror(ctx, u, c1, c2, glow, t) {
    var r = u.r, i, a;

    // парящие осколки вокруг
    ctx.fillStyle = c1;
    ctx.globalAlpha = .6;
    for (i = 0; i < 7; i++) {
      a = i / 7 * 6.2832 + t * .6;
      var d = r * (1.35 + Math.sin(t * 2 + i) * .12);
      ctx.save();
      ctx.translate(Math.cos(a) * d, Math.sin(a) * d * .7);
      ctx.rotate(a + t);
      ctx.beginPath();
      ctx.moveTo(0, -r * .22); ctx.lineTo(r * .13, 0);
      ctx.lineTo(0, r * .22); ctx.lineTo(-r * .13, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // корпус — гранёная броня
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(-r * .85, -r * .45);
    ctx.lineTo(-r * .45, -r * 1.0);
    ctx.lineTo(r * .45, -r * 1.0);
    ctx.lineTo(r * .85, -r * .45);
    ctx.lineTo(r * .6, r * 1.05);
    ctx.lineTo(-r * .6, r * 1.05);
    ctx.closePath(); ctx.fill();

    var g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(.4, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * .62, -r * .4);
    ctx.lineTo(0, -r * .85);
    ctx.lineTo(r * .62, -r * .4);
    ctx.lineTo(r * .4, r * .8);
    ctx.lineTo(-r * .4, r * .8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.6; ctx.stroke();

    // отражающая грань
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = .5 + Math.sin(t * 3) * .3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * .3, -r * .6); ctx.lineTo(r * .2, r * .5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // шлем-призма
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.6);
    ctx.lineTo(r * .42, -r * 1.05);
    ctx.lineTo(0, -r * .85);
    ctx.lineTo(-r * .42, -r * 1.05);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 14;
    ctx.fillRect(-r * .26, -r * 1.14, r * .52, r * .1);
    ctx.shadowBlur = 0;
  }

  /** Громовой Титан: между поднятыми руками бьёт дуга. */
  function bossStorm(ctx, u, c1, c2, glow, t) {
    var r = u.r, i;

    // ноги-опоры
    ctx.fillStyle = c2;
    ctx.fillRect(-r * .55, r * .4, r * .38, r * 1.05);
    ctx.fillRect(r * .17, r * .4, r * .38, r * 1.05);

    // торс
    var g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * .8, -r * .7);
    ctx.lineTo(r * .8, -r * .7);
    ctx.lineTo(r * .6, r * .55);
    ctx.lineTo(-r * .6, r * .55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();

    // поднятые руки
    ctx.strokeStyle = c1; ctx.lineWidth = r * .2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * .7, -r * .55); ctx.lineTo(-r * 1.25, -r * 1.35);
    ctx.moveTo(r * .7, -r * .55); ctx.lineTo(r * 1.25, -r * 1.35);
    ctx.stroke();

    // дуга между ладонями
    ctx.strokeStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 22;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-r * 1.25, -r * 1.35);
    for (i = 1; i < 6; i++) {
      var k = i / 6;
      ctx.lineTo(-r * 1.25 + r * 2.5 * k, -r * 1.35 - Math.sin(k * Math.PI) * r * .5 + (Math.random() - .5) * r * .18);
    }
    ctx.lineTo(r * 1.25, -r * 1.35);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // голова в маске грозы
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(-r * .38, -r * .75);
    ctx.lineTo(0, -r * 1.25);
    ctx.lineTo(r * .38, -r * .75);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 12;
    ctx.fillRect(-r * .22, -r * .92, r * .44, r * .1);
    ctx.shadowBlur = 0;

    // разряды по корпусу
    ctx.strokeStyle = glow;
    ctx.globalAlpha = .5 + Math.sin(t * 9) * .4;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * .4, -r * .4); ctx.lineTo(r * .05, 0); ctx.lineTo(-r * .25, r * .35);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Чумной Патриарх: раздутая фигура в балахоне с кадилом. */
  function bossPlague(ctx, u, c1, c2, glow, t) {
    var r = u.r, i;
    var swell = 1 + Math.sin(t * 1.4) * .04;

    // балахон
    ctx.save();
    ctx.scale(swell, 1 / swell);
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(-r * .55, -r * .75);
    ctx.quadraticCurveTo(-r * 1.25, r * .3, -r * .95, r * 1.25);
    ctx.lineTo(r * .95, r * 1.25);
    ctx.quadraticCurveTo(r * 1.25, r * .3, r * .55, -r * .75);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();

    // вздутия и язвы
    ctx.fillStyle = c1;
    ctx.globalAlpha = .5;
    for (i = 0; i < 5; i++) {
      var a = i / 5 * 6.2832;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * .5, r * .25 + Math.sin(a) * r * .45, r * .2, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // клювастая маска чумного доктора
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.ellipse(0, -r * .95, r * .42, r * .38, 0, 0, 6.2832);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * .2, -r * 1.0);
    ctx.quadraticCurveTo(r * 1.05, -r * .85, r * .25, -r * .68);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#0e1006';
    ctx.beginPath(); ctx.arc(-r * .12, -r * 1.02, r * .1, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .14, -r * 1.02, r * .1, 0, 6.2832); ctx.fill();
    ctx.restore();

    // кадило на цепи
    var sway = Math.sin(t * 2) * r * .5;
    ctx.strokeStyle = '#5a5a48'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * .75, -r * .45);
    ctx.lineTo(-r * .95 + sway, r * .35);
    ctx.stroke();
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.arc(-r * .95 + sway, r * .5, r * .2, 0, 6.2832); ctx.fill();
    ctx.shadowColor = glow; ctx.shadowBlur = 16;
    ctx.fillStyle = glow;
    ctx.globalAlpha = .5 + Math.sin(t * 3) * .3;
    ctx.beginPath(); ctx.arc(-r * .95 + sway, r * .5, r * .11, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  /** Владыка Ярости: громила в цепях с двумя топорами. */
  function bossWrath(ctx, u, c1, c2, glow, t) {
    var r = u.r, i;
    var rage = u.phase === 2 ? 1 : .4;

    // ноги
    ctx.fillStyle = c2;
    ctx.fillRect(-r * .6, r * .35, r * .42, r * 1.0);
    ctx.fillRect(r * .18, r * .35, r * .42, r * 1.0);

    // массивный торс
    var g = ctx.createRadialGradient(-r * .2, -r * .4, r * .1, 0, 0, r * 1.1);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * .95, -r * .55);
    ctx.quadraticCurveTo(0, -r * .95, r * .95, -r * .55);
    ctx.lineTo(r * .65, r * .5);
    ctx.lineTo(-r * .65, r * .5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2.2; ctx.stroke();

    // цепи поперёк груди
    ctx.strokeStyle = '#7a7068'; ctx.lineWidth = r * .09;
    ctx.beginPath();
    ctx.moveTo(-r * .7, -r * .3); ctx.quadraticCurveTo(0, r * .1, r * .7, -r * .35);
    ctx.stroke();
    ctx.fillStyle = '#8a8078';
    for (i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * r * .28, -r * .2 + Math.abs(i) * r * .04, r * .06, 0, 6.2832);
      ctx.fill();
    }

    // раскалённые швы
    ctx.strokeStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 14 * rage;
    ctx.globalAlpha = rage;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-r * .5, -r * .45); ctx.lineTo(-r * .15, r * .1); ctx.lineTo(-r * .4, r * .45);
    ctx.moveTo(r * .5, -r * .4); ctx.lineTo(r * .18, r * .15);
    ctx.stroke();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // безглазая голова с оскалом
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.ellipse(0, -r * .85, r * .4, r * .34, 0, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-r * .26, -r * .9); ctx.lineTo(r * .26, -r * .9);
    ctx.lineTo(0, -r * .74); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // два топора
    for (i = -1; i <= 1; i += 2) {
      ctx.save();
      ctx.translate(i * r * 1.1, -r * .2);
      ctx.rotate(i * (.4 + Math.sin(t * 2 + i) * .12));
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(-r * .06, -r * .1, r * .12, r * 1.1);
      ctx.fillStyle = '#e8e0d8';
      ctx.beginPath();
      ctx.moveTo(-r * .06, r * .55);
      ctx.quadraticCurveTo(-r * .6, r * .75, -r * .3, r * 1.1);
      ctx.quadraticCurveTo(-r * .06, r * .9, -r * .06, r * .55);
      ctx.fill();
      ctx.restore();
    }
  }

  return { hero: hero, enemy: enemy, KITS: KITS, kitOf: kitOf };
})());
