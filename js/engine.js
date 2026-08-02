/* =========================================================
   Арена Древних — движок, карты, рендер
   ========================================================= */
(function (root) {
  'use strict';

  var D = root.DATA;
  var cv, ctx, dpr = 1, W = 0, H = 0;
  var PAD = 46, TOP = 54;

  var ground = null, groundCtx = null;   // запечённый фон карты

  var world = {
    units: [], proj: [], parts: [], floats: [], rings: [], tele: [], bolts: [], slashes: [],
    auras: [], corpses: [], sparks: [], zones: [], walls: [], cones: [], pillars: [],
    props: [], decals: [], embers: [], timers: [],
    map: null, mapId: null,
    wave: 1, kills: 0, gold: 0, running: false, paused: false, over: false, training: false,
    hero: null, auto: false, shakeT: 0, shakeMag: 0, time: 0, flashT: 0, flashC: '#fff',
    hitstop: 0, dmgWindow: [], dps: 0
  };

  var input = { up: 0, down: 0, left: 0, right: 0, stick: { x: 0, y: 0, on: false } };
  var cb = {}, shakeOn = true;

  /* ================= утилиты ================= */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function uid() { return (uid._i = (uid._i || 0) + 1); }
  function toast(m) { if (root.UI) root.UI.toast(m); }
  function hex2rgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(h, a) { var c = hex2rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mixWhite(h, k) {
    var c = hex2rgb(h);
    return 'rgb(' + Math.round(c[0] + (255 - c[0]) * k) + ',' + Math.round(c[1] + (255 - c[1]) * k) + ',' + Math.round(c[2] + (255 - c[2]) * k) + ')';
  }

  /* ================= звук ================= */
  var SFX = (function () {
    var actx = null, on = true, muted = false;
    function ac() {
      if (!actx) { try { actx = new (root.AudioContext || root.webkitAudioContext)(); } catch (e) { } }
      if (actx && actx.state === 'suspended') actx.resume();
      return actx;
    }
    function tone(f1, f2, dur, type, vol) {
      if (!on || muted) return;
      var a = ac(); if (!a) return;
      var o = a.createOscillator(), g = a.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f1, a.currentTime);
      if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), a.currentTime + dur);
      g.gain.setValueAtTime(vol || .05, a.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur + .02);
    }
    return {
      set: function (v) { on = v; }, mute: function (v) { muted = v; },
      hit: function () { tone(210, 95, .06, 'square', .032); },
      crit: function () { tone(560, 150, .14, 'sawtooth', .07); },
      cast: function () { tone(390, 800, .15, 'triangle', .05); },
      orb: function () { tone(900, 1250, .07, 'sine', .04); },
      die: function () { tone(180, 50, .26, 'sawtooth', .055); },
      boom: function () { tone(120, 38, .5, 'sawtooth', .085); },
      buy: function () { tone(700, 1120, .12, 'triangle', .055); },
      sell: function () { tone(620, 360, .12, 'triangle', .055); },
      lvl: function () { tone(520, 1020, .3, 'triangle', .07); },
      heal: function () { tone(620, 920, .18, 'sine', .045); },
      lose: function () { tone(300, 55, .75, 'sawtooth', .09); },
      wave: function () { tone(420, 900, .22, 'square', .05); }
    };
  })();

  /* ================= холст ================= */
  function resize() {
    if (!cv) return;
    var r = cv.getBoundingClientRect();
    dpr = Math.min(root.devicePixelRatio || 1, 2);
    W = Math.max(320, Math.round(r.width));
    H = Math.max(240, Math.round(r.height));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (world.mapId) buildMap(world.mapId, false);
    for (var i = 0; i < world.units.length; i++) confine(world.units[i]);
  }

  function confine(u) {
    u.x = clamp(u.x, PAD + u.r, W - PAD - u.r);
    u.y = clamp(u.y, PAD + TOP + u.r, H - PAD - u.r);
  }

  /* ================================================
                     КАРТЫ И ЛАНДШАФТ
     ================================================ */
  // solid — блокирует движение, hazard — урон/эффект, flat — рисуется в фон
  var PROP = {
    rock: { solid: true, flat: false, rMin: 16, rMax: 30, h: .9 },
    pillar: { solid: true, flat: false, rMin: 15, rMax: 22, h: 2.1 },
    tree: { solid: true, flat: false, rMin: 14, rMax: 20, h: 2.6 },
    crystal: { solid: true, flat: false, rMin: 13, rMax: 22, h: 1.7, light: true },
    stump: { solid: true, flat: false, rMin: 15, rMax: 21, h: .6 },
    ruin: { solid: true, flat: false, rMin: 20, rMax: 32, h: 1.2 },
    brazier: { solid: true, flat: false, rMin: 11, rMax: 14, h: 1.4, light: true },
    bones: { solid: false, flat: true, rMin: 10, rMax: 18 },
    grass: { solid: false, flat: true, rMin: 12, rMax: 22 },
    puddle: { solid: false, flat: true, rMin: 16, rMax: 30 },
    ice: { solid: false, flat: true, rMin: 24, rMax: 44, slow: .72 },
    lava: { solid: false, flat: true, rMin: 22, rMax: 40, hazard: 22, light: true }
  };

  function seededRnd(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildMap(id, keepLayout) {
    var m = D.MAPS[id] || D.MAPS.butcher;
    world.map = m;
    world.mapId = id;

    if (!keepLayout || !world.props.length) {
      world.props.length = 0; world.decals.length = 0;
      var seed = 0;
      for (var i = 0; i < id.length; i++) seed = seed * 31 + id.charCodeAt(i);
      var R = seededRnd(seed + 7);
      var cx = W / 2, cy = (H + TOP) / 2;

      m.props.forEach(function (entry) {
        var type = entry[0], count = entry[1], meta = PROP[type];
        if (!meta) return;
        for (var k = 0; k < count; k++) {
          var px, py, tries = 0, ok = false, pr = meta.rMin + R() * (meta.rMax - meta.rMin);
          // масштабируем количество под площадь экрана
          if (k > 2 && R() > (W * H) / 900000 + .45) continue;
          while (tries++ < 40) {
            px = PAD + 30 + R() * (W - PAD * 2 - 60);
            py = PAD + TOP + 30 + R() * (H - PAD * 2 - TOP - 60);
            // не заваливаем центр (точка спавна героя)
            if (d2(px, py, cx, cy) < 150 * 150) continue;
            ok = true;
            for (var q = 0; q < world.props.length; q++) {
              var o = world.props[q];
              if (d2(px, py, o.x, o.y) < (pr + o.r + 26) * (pr + o.r + 26)) { ok = false; break; }
            }
            if (ok) break;
          }
          if (!ok) continue;
          var p = {
            type: type, x: px, y: py, r: pr, meta: meta,
            rot: R() * 6.2832, seed: R(), sway: R() * 6.2832
          };
          if (meta.flat) world.decals.push(p); else world.props.push(p);
        }
      });
    }
    renderGround();
  }

  function renderGround() {
    if (!W || !H) return;
    if (!ground) { ground = document.createElement('canvas'); groundCtx = ground.getContext('2d'); }
    ground.width = Math.round(W * dpr); ground.height = Math.round(H * dpr);
    var g = groundCtx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var m = world.map || D.MAPS.butcher;

    // базовый градиент
    var grd = g.createRadialGradient(W / 2, (H + TOP) / 2, 40, W / 2, (H + TOP) / 2, Math.max(W, H) * .82);
    grd.addColorStop(0, m.floor);
    grd.addColorStop(.6, m.floor2);
    grd.addColorStop(1, '#04060a');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);

    // процедурная «текстура» пола
    var R = seededRnd(1337);
    g.globalAlpha = .06;
    for (var i = 0; i < 1400; i++) {
      var x = R() * W, y = R() * H, s = R() * 2.6 + .4;
      g.fillStyle = R() > .5 ? '#ffffff' : '#000000';
      g.fillRect(x, y, s, s);
    }
    g.globalAlpha = .05;
    for (var j = 0; j < 90; j++) {
      var cx2 = R() * W, cy2 = R() * H, rr = 30 + R() * 90;
      g.fillStyle = R() > .5 ? m.accent : '#000000';
      g.beginPath(); g.ellipse(cx2, cy2, rr, rr * (.4 + R() * .5), R() * 3, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 1;

    // руническая печать
    var ccx = W / 2, ccy = (H + TOP) / 2, rr2 = Math.min(W, H - TOP) * .34;
    g.save();
    g.globalAlpha = .16; g.strokeStyle = m.accent; g.lineWidth = 2;
    g.beginPath(); g.arc(ccx, ccy, rr2, 0, 6.2832); g.stroke();
    g.beginPath(); g.arc(ccx, ccy, rr2 * .7, 0, 6.2832); g.stroke();
    g.translate(ccx, ccy);
    g.beginPath();
    for (var k = 0; k < 6; k++) {
      var a = k / 6 * 6.2832;
      var px = Math.cos(a) * rr2 * .86, py = Math.sin(a) * rr2 * .86;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.stroke();
    g.restore();

    // плоские декали (кости, трава, лужи, лёд, лава)
    var prevCtx = ctx; ctx = g;
    for (var d = 0; d < world.decals.length; d++) drawDecal(world.decals[d], 0);
    ctx = prevCtx;

    // граница арены
    g.strokeStyle = rgba(m.accent, .34); g.lineWidth = 2;
    g.strokeRect(PAD * .55, PAD * .55 + TOP * .55, W - PAD * 1.1, H - PAD * 1.1 - TOP * .55);
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 10;
    g.strokeRect(PAD * .55 - 6, PAD * .55 + TOP * .55 - 6, W - PAD * 1.1 + 12, H - PAD * 1.1 - TOP * .55 + 12);
  }

  /* ================= характеристики ================= */
  function blankStats() {
    return {
      str: 0, agi: 0, int: 0,
      hp: 1, mp: 0, atk: 0, armor: 0, ms: 200, as: 1, asMul: 1, range: 60,
      hpReg: 0, mpReg: 0, sp: 0, mr: .25, crit: 0, critMult: 1.7, lifesteal: 0, cdr: 0
    };
  }
  var FLAT = ['atk', 'armor', 'ms', 'range', 'hpReg', 'mpReg', 'sp', 'crit', 'lifesteal', 'cdr', 'hp', 'mp'];

  function recalc(u) {
    var A = D.ATTR, s = blankStats(), i, k;
    var add = { asPct: 0, mr: 0, critMult: 0, str: 0, agi: 0, int: 0 };
    for (i = 0; i < FLAT.length; i++) add[FLAT[i]] = 0;

    for (i = 0; i < u.items.length; i++) {
      var it = u.items[i].s;
      for (k in it) {
        if (k === 'critMult') add.critMult = Math.max(add.critMult, it[k]);
        else if (add[k] !== undefined) add[k] += it[k];
      }
    }

    if (u.attr) {
      var lv = u.level - 1, gn = u.gain || {};
      var str = u.attr.str + (gn.str || 0) * lv + (u.bonusAttr.str || 0) + add.str;
      var agi = u.attr.agi + (gn.agi || 0) * lv + (u.bonusAttr.agi || 0) + add.agi;
      var int_ = u.attr.int + (gn.int || 0) * lv + (u.bonusAttr.int || 0) + add.int;
      var prim = u.primary === 'str' ? str : u.primary === 'agi' ? agi : int_;
      s.str = str; s.agi = agi; s.int = int_;
      s.hp = A.BASE_HP + str * A.HP_PER_STR + add.hp;
      s.mp = A.BASE_MP + int_ * A.MP_PER_INT + add.mp;
      s.hpReg = A.BASE_HPREG + str * A.HPREG_PER_STR + add.hpReg;
      s.mpReg = A.BASE_MPREG + int_ * A.MPREG_PER_INT + add.mpReg;
      s.armor = u.base.armor + agi * A.ARMOR_PER_AGI + add.armor;
      s.sp = int_ * A.SP_PER_INT + add.sp;
      s.atk = u.base.atk + prim * A.DMG_PER_PRIMARY + add.atk;
      s.as = u.base.as * (1 + agi * A.AS_PER_AGI);
      s.ms = u.base.ms + add.ms;
      s.range = u.base.range + add.range;
      s.mr = u.base.mr + add.mr;
    } else {
      var b = u.base;
      s.hp = b.hp + add.hp; s.mp = b.mp || 100;
      s.atk = b.atk + add.atk; s.armor = b.armor + add.armor;
      s.ms = b.ms + add.ms; s.as = b.as; s.range = b.range + add.range;
      s.hpReg = b.hpReg || 0; s.mpReg = b.mpReg || 0; s.sp = b.sp || 0; s.mr = b.mr;
    }

    s.as *= (1 + add.asPct / 100);
    s.crit += add.crit; s.critMult = Math.max(s.critMult, add.critMult);
    s.lifesteal += add.lifesteal; s.cdr += add.cdr;

    if (u.skills) {
      for (i = 0; i < u.skills.length; i++) {
        var sk = u.skills[i], l = (u.skillLv[sk.id] || 0) - 1;
        if (l >= 0 && sk.apply) sk.apply(u, l, s);
      }
    }

    for (i = 0; i < u.buffs.length; i++) {
      var bf = u.buffs[i];
      if (bf.atk) s.atk += bf.atk;
      if (bf.atkMul) s.atk *= bf.atkMul;
      if (bf.armor) s.armor += bf.armor;
      if (bf.armorMul) s.armor *= bf.armorMul;
      if (bf.range) s.range += bf.range;
      if (bf.ms) s.ms += bf.ms;
      if (bf.msMul) s.ms *= bf.msMul;
      if (bf.spMul) s.sp *= bf.spMul;
      if (bf.asMul) s.asMul *= bf.asMul;
      if (bf.mr) s.mr += bf.mr;
      if (bf.lifesteal) s.lifesteal += bf.lifesteal;
    }

    s.as *= s.asMul;
    s.mr = clamp(s.mr, -.5, .8);
    s.cdr = Math.min(60, s.cdr);
    s.crit = Math.min(85, s.crit);
    s.lifesteal = Math.min(75, s.lifesteal);
    s.ms = Math.max(60, s.ms);
    s.as = Math.max(.12, s.as);
    s.hp = Math.max(1, s.hp);

    var oldHp = u.maxHp || s.hp, oldMp = u.maxMp || s.mp;
    u.stats = s; u.maxHp = s.hp; u.maxMp = s.mp;
    if (u.hp === undefined) { u.hp = s.hp; u.mp = s.mp; }
    else {
      u.hp = clamp(u.hp + (s.hp - oldHp), u.dead ? 0 : .01, s.hp);
      u.mp = clamp(u.mp + (s.mp - oldMp), 0, s.mp);
    }
    return s;
  }

  /* ================= создание ================= */
  function makeHero(def, level, skillLv, items) {
    var u = {
      id: uid(), team: 0, kind: 'hero', name: def.name, defId: def.id,
      shape: def.shape, anim: def.anim || 'heavy', c1: def.c1, c2: def.c2, r: 22,
      attr: def.attr, gain: def.gain, primary: def.primary, base: def.base,
      invoker: !!def.invoker, reagents: [], invokeCds: {}, lastInvoke: null,
      bonusAttr: { str: 0, agi: 0, int: 0 },
      level: level || 1, skillLv: skillLv || {}, items: items || [],
      skills: def.skills.map(function (id) { return D.SKILLS[id]; }),
      x: W * .5, y: H * .5, vx: 0, vy: 0, face: 0,
      atkCd: 0, cds: {}, buffs: [], toggles: {},
      flash: 0, spin: 0, swing: 0, step: 0, dead: false, xp: 0, pts: 0, trail: []
    };
    recalc(u); u.hp = u.maxHp; u.mp = u.maxMp;
    return u;
  }

  function makeEnemy(def, isBoss) {
    var mul = D.enemyScale(world.wave);
    var u = {
      id: uid(), team: 1, kind: isBoss ? 'boss' : 'mob', name: def.name, defId: def.id,
      shape: def.shape, c1: def.c1, c2: def.c2, glow: def.glow || '#ff5a4a', r: def.r || 18,
      attr: null, base: {
        hp: (isBoss ? def.hpMul * 230 : def.hp) * mul,
        mp: 100,
        atk: (isBoss ? def.atkMul * 26 : def.atk) * mul,
        armor: def.armor + Math.floor(world.wave * .35),
        ms: def.ms, as: def.as, range: def.range, hpReg: 0, mpReg: 0, sp: 0, mr: .25
      },
      items: [], skillLv: {}, skills: null, level: 1,
      x: 0, y: 0, vx: 0, vy: 0, face: 0,
      magic: !!def.magic, role: def.role || null, def: def,
      atkCd: rnd(0, 1), cds: {}, buffs: [], toggles: {},
      flash: 0, spin: 0, swing: 0, step: rnd(0, 6), dead: false, wob: rnd(0, 6.28),
      isBoss: !!isBoss, abilityCd: isBoss ? 4.5 : 0, ability: def.ability || null,
      gold: Math.round((isBoss ? 300 : 44) * (1 + world.wave * .16))
    };
    recalc(u); u.hp = u.maxHp;
    return u;
  }

  function makeDummy() {
    var def = D.DUMMY;
    var u = makeEnemy(def, false);
    u.role = 'dummy'; u.gold = 0; u.isDummy = true;
    u.base.hp = def.hp; u.base.atk = 0; u.base.armor = 0; u.base.ms = 0;
    recalc(u); u.hp = u.maxHp;
    return u;
  }

  /* ================= урон ================= */
  function physMult(a) { var x = .06 * a; return 1 - x / (1 + Math.abs(x)); }

  function damage(src, tgt, amount, type, isAuto) {
    if (!tgt || tgt.dead) return 0;
    var s = src ? src.stats : blankStats();
    var dmg = amount, tiny = amount < 3;

    if (type === 'magic') {
      dmg *= (1 + (s.sp || 0) / 100);
      dmg *= (1 - clamp(tgt.stats.mr, -.5, .8));
    } else dmg *= physMult(tgt.stats.armor);

    var crit = false;
    if (isAuto && s.crit > 0 && Math.random() * 100 < s.crit) { dmg *= s.critMult; crit = true; }
    if (isAuto && src) {
      var amb = getBuff(src, 'invis');
      if (amb && amb.ambush) { dmg *= amb.ambush; crit = true; removeBuff(src, 'invis'); }
    }

    dmg = tiny ? Math.max(.01, dmg) : Math.max(1, dmg);

    var sh = getBuff(tgt, 'shield');
    if (sh && sh.shield > 0) {
      var ab = Math.min(sh.shield, dmg);
      sh.shield -= ab; dmg -= ab;
      if (!tiny) floatText(tgt.x, tgt.y - tgt.r, '-' + Math.round(ab), '#b07dff', 13);
      if (sh.shield <= 0) removeBuff(tgt, 'shield');
      if (dmg <= 0) return ab;
    }

    tgt.hp -= dmg;
    tgt.flash = tiny ? Math.max(tgt.flash, .18) : 1;
    if (src === world.hero) { world.dmgWindow.push([world.time, dmg]); }

    if (!tiny) {
      floatText(tgt.x + rnd(-9, 9), tgt.y - tgt.r - 4, Math.round(dmg),
        crit ? '#ffd24a' : (type === 'magic' ? '#8ad0ff' : '#ffffff'), crit ? 22 : 14);
      sparks(tgt.x, tgt.y, crit ? '#ffd24a' : '#ffffff', crit ? 10 : 4);
      if (crit) { SFX.crit(); hitstop(.045); if (tgt === world.hero) flash('#ff4d5e', .18); }
      else if (isAuto) SFX.hit();
    }

    if (src && s.lifesteal > 0 && isAuto) {
      var hl = dmg * s.lifesteal / 100;
      src.hp = Math.min(src.maxHp, src.hp + hl);
      if (!tiny) floatText(src.x, src.y - src.r - 14, '+' + Math.round(hl), '#3ddb7f', 12);
    }

    if (tgt.hp <= 0) kill(src, tgt);
    return dmg;
  }

  function heal(u, amount) { floatText(u.x, u.y - u.r - 10, '+' + Math.round(amount), '#3ddb7f', 15); SFX.heal(); }

  function kill(src, tgt) {
    if (tgt.dead) return;
    tgt.dead = true;
    world.corpses.push({ x: tgt.x, y: tgt.y, r: tgt.r, c: tgt.c2, glow: tgt.glow || tgt.c1, t: 0, life: 1.3 });
    burst(tgt.x, tgt.y, tgt.glow || tgt.c1, tgt.isBoss ? 52 : 16);
    SFX.die();

    if (tgt.role === 'bomber' && tgt.def) {
      var bd = tgt.def.boomDmg * D.enemyScale(world.wave), br = tgt.def.boomR;
      ring(tgt.x, tgt.y, br, '#ffe04a'); burst(tgt.x, tgt.y, '#ffe04a', 34);
      SFX.boom(); shake(12); flash('#ffe04a', .22); hitstop(.05);
      for (var i = 0; i < world.units.length; i++) {
        var e = world.units[i];
        if (e.dead || e.team === tgt.team) continue;
        if (dist(e, tgt) <= br + e.r) damage(tgt, e, bd, 'magic');
      }
    }

    if (tgt.isDummy) {
      // на полигоне манекен возвращается
      timer(1.2, function () {
        if (!world.training || !world.running) return;
        var nd = makeDummy();
        nd.x = tgt.x; nd.y = tgt.y; confine(nd);
        world.units.push(nd);
        ring(nd.x, nd.y, 50, '#3ddb7f');
      });
      return;
    }

    if (tgt.team === 1) {
      world.kills++;
      world.gold += tgt.gold || 0;
      if (tgt.gold) floatText(tgt.x, tgt.y - 28, '+' + tgt.gold, '#ffc043', 15);
      var h = world.hero;
      if (h && !h.dead && h.skillLv && h.skillLv.feast) {
        var l = h.skillLv.feast - 1;
        h.bonusAttr.str += D.SKILLS.feast.stackStr[l];
        recalc(h);
        h.hp = Math.min(h.maxHp, h.hp + D.SKILLS.feast.stackStr[l] * D.ATTR.HP_PER_STR);
      }
      if (tgt.isBoss) { shake(20); flash('#fff', .3); hitstop(.12); }
    } else if (tgt === world.hero) {
      shake(22); SFX.lose(); flash('#ff4d5e', .45); hitstop(.18);
      world.over = true;
      if (cb.onDeath) cb.onDeath();
    }
  }

  /* ================= баффы ================= */
  function getBuff(u, id) {
    for (var i = 0; i < u.buffs.length; i++) if (u.buffs[i].id === id) return u.buffs[i];
    return null;
  }
  function removeBuff(u, id) {
    for (var i = u.buffs.length - 1; i >= 0; i--) if (u.buffs[i].id === id) u.buffs.splice(i, 1);
    recalc(u);
  }
  function addBuff(u, def) {
    if (!u || u.dead) return;
    var ex = getBuff(u, def.id);
    if (ex) { for (var k in def) ex[k] = def[k]; ex.t = def.dur; if (!def.quiet) recalc(u); }
    else { def.t = def.dur; u.buffs.push(def); recalc(u); }
  }

  /* ================= эффекты ================= */
  function floatText(x, y, txt, color, size) {
    world.floats.push({ x: x, y: y, txt: '' + txt, c: color, s: size || 14, t: 0, life: .95, vy: -50, vx: rnd(-10, 10) });
  }
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = rnd(0, 6.2832), sp = rnd(70, 340);
      world.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: color, r: rnd(1.5, 4.4), t: 0, life: rnd(.25, .75) });
    }
  }
  function sparks(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = rnd(0, 6.2832), sp = rnd(140, 360);
      world.sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: color, t: 0, life: rnd(.12, .3) });
    }
  }
  function sparkle(x, y, c) { sparks(x, y, c, 8); burst(x, y, c, 6); }
  function spinBurst(u, r, c) {
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * 6.2832;
      world.sparks.push({ x: u.x + Math.cos(a) * r * .7, y: u.y + Math.sin(a) * r * .7, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, c: c, t: 0, life: .2 });
    }
  }
  function ring(x, y, r, color) { world.rings.push({ x: x, y: y, r: 12, max: r, c: color, t: 0, life: .48 }); }
  function aura(u, r, color) { world.auras.push({ x: u.x, y: u.y, r: r, c: color }); }
  function slash(a, b, color) { world.slashes.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, c: color, t: 0, life: .2 }); }
  function shake(m) { if (!shakeOn) return; world.shakeMag = Math.max(world.shakeMag, m); world.shakeT = .3; }
  function flash(c, t) { world.flashC = c; world.flashT = Math.max(world.flashT, t); }
  function hitstop(t) { world.hitstop = Math.max(world.hitstop, t); }
  function telegraph(x, y, r, color, delay, done) { world.tele.push({ x: x, y: y, r: r, c: color, t: 0, life: delay, done: done }); }
  function pillar(x, y, c) { world.pillars.push({ x: x, y: y, c: c, t: 0, life: .5 }); }
  function timer(t, fn) { world.timers.push({ t: t, fn: fn }); }
  function zone(o) {
    world.zones.push({
      x: o.x, y: o.y, r: o.r, t: 0, life: o.dur, src: o.src, c: o.color,
      style: o.style || 'circle', onTick: o.onTick
    });
  }
  function wall(u, angle, len, dur, color, fn) {
    var a = angle + Math.PI / 2;
    world.walls.push({
      x: u.x + Math.cos(angle) * 120, y: u.y + Math.sin(angle) * 120,
      a: a, len: len, t: 0, life: dur, c: color, fn: fn, src: u
    });
  }
  function cone(u, angle, range, half, color, fn) {
    world.cones.push({ x: u.x, y: u.y, a: angle, range: range, half: half, c: color, t: 0, life: .3 });
    for (var i = 0; i < world.units.length; i++) {
      var e = world.units[i];
      if (e.dead || e.team === u.team) continue;
      var dd = dist(u, e);
      if (dd > range) continue;
      var ea = Math.atan2(e.y - u.y, e.x - u.x);
      var diff = Math.abs(((ea - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff <= half) fn(e);
    }
  }
  function knockback(e, from, d) {
    var a = Math.atan2(e.y - from.y, e.x - from.x);
    e.x += Math.cos(a) * d; e.y += Math.sin(a) * d;
    confine(e);
  }
  function recoil(u, d) { u.x -= Math.cos(u.face) * d; u.y -= Math.sin(u.face) * d; confine(u); }
  function leapTo(u, x, y, dur, onLand) {
    u.leap = { fx: u.x, fy: u.y, tx: x, ty: y, t: 0, dur: dur, onLand: onLand };
  }
  function delay(t, fn) { timer(t, fn); }

  function projectile(o) {
    var from = o.from, a = o.angle;
    if (a === undefined && o.to) a = Math.atan2(o.to.y - from.y, o.to.x - from.x);
    world.proj.push({
      x: from.x, y: from.y, a: a, sp: o.speed || 800, r: o.r || 6, c: o.color || '#fff',
      src: from, team: from.team, onHit: o.onHit, target: o.to || null,
      homing: !!o.homing, trail: !!o.trail, big: !!o.big, spin: !!o.spin, rot: 0, pts: [],
      range: o.range || 1300, travelled: 0, pierce: o.pierce || 0, hitIds: {}
    });
  }

  function chainLightning(src, first, dmg, jumps, falloff, color) {
    var cur = first, seen = {}, d = dmg, px = src.x, py = src.y;
    for (var i = 0; i < jumps && cur; i++) {
      seen[cur.id] = 1;
      world.bolts.push({ x1: px, y1: py, x2: cur.x, y2: cur.y, c: color, t: 0, life: .32 });
      px = cur.x; py = cur.y;
      damage(src, cur, d, 'magic');
      d *= falloff;
      var next = null, best = 1e9;
      for (var j = 0; j < world.units.length; j++) {
        var e = world.units[j];
        if (e.dead || e.team === src.team || seen[e.id]) continue;
        var dd = dist(cur, e);
        if (dd < 330 && dd < best) { best = dd; next = e; }
      }
      cur = next;
    }
    SFX.cast();
  }

  /* ================= цели ================= */
  function visible(e) { return !e.dead && !getBuff(e, 'invis'); }

  function nearestEnemy(u, range) {
    var best = null, bd = range === undefined ? 1e9 : range;
    for (var i = 0; i < world.units.length; i++) {
      var e = world.units[i];
      if (e.team === u.team || !visible(e)) continue;
      var d = dist(u, e);
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }
  function pickTarget(u, range) {
    var best = null, score = -1e9;
    for (var i = 0; i < world.units.length; i++) {
      var e = world.units[i];
      if (e.team === u.team || !visible(e)) continue;
      var d = dist(u, e);
      if (d > (range || 1e9)) continue;
      var sc = -d;
      if (e.role === 'healer') sc += 420;
      if (e.role === 'hexer') sc += 260;
      if (e.role === 'bomber') sc += 200;
      if (e.isBoss) sc += 180;
      if (sc > score) { score = sc; best = e; }
    }
    return best;
  }
  function lowestHpEnemy(u, range) {
    var best = null, bhp = 1e12;
    for (var i = 0; i < world.units.length; i++) {
      var e = world.units[i];
      if (e.team === u.team || !visible(e)) continue;
      if (dist(u, e) > (range || 1e9)) continue;
      if (e.hp < bhp) { bhp = e.hp; best = e; }
    }
    return best;
  }
  function bestCluster(u, radius, range) {
    var best = null, bn = 0;
    for (var i = 0; i < world.units.length; i++) {
      var e = world.units[i];
      if (e.team === u.team || !visible(e)) continue;
      if (dist(u, e) > (range || 1e9)) continue;
      var n = 0;
      for (var j = 0; j < world.units.length; j++) {
        var o = world.units[j];
        if (o.team === u.team || !visible(o)) continue;
        if (dist(e, o) <= radius) n++;
      }
      if (n > bn) { bn = n; best = e; }
    }
    return best ? { x: best.x, y: best.y, n: bn } : null;
  }
  function forEachEnemy(u, radius, fn) {
    var n = 0;
    for (var i = 0; i < world.units.length; i++) {
      var e = world.units[i];
      if (e.dead || e.team === u.team) continue;
      if (d2(e.x, e.y, u.x, u.y) <= radius * radius) { fn(e); n++; }
    }
    return n;
  }
  function aoeAt(src, x, y, r, amount, type) {
    for (var i = 0; i < world.units.length; i++) {
      var e = world.units[i];
      if (e.dead || e.team === src.team) continue;
      if (d2(e.x, e.y, x, y) <= (r + e.r) * (r + e.r)) damage(src, e, amount, type);
    }
  }
  function aoeDamage(src, x, y, r, amount, type) { aoeAt(src, x, y, r, amount, type); }
  function aoeApply(src, x, y, r, fn) {
    var n = 0;
    for (var i = 0; i < world.units.length; i++) {
      var e = world.units[i];
      if (e.dead || e.team === src.team) continue;
      if (d2(e.x, e.y, x, y) <= (r + e.r) * (r + e.r)) { fn(e); n++; }
    }
    return n;
  }
  function pull(target, toward, gap) {
    var a = Math.atan2(target.y - toward.y, target.x - toward.x);
    target.x = toward.x + Math.cos(a) * gap;
    target.y = toward.y + Math.sin(a) * gap;
    confine(target);
    addBuff(target, { id: 'freeze', dur: .5, stun: true, color: '#d9a05b' });
  }
  function blinkBehind(u, t, gap) {
    var a = Math.atan2(t.y - u.y, t.x - u.x);
    burst(u.x, u.y, '#b07dff', 12);
    u.x = t.x + Math.cos(a) * gap; u.y = t.y + Math.sin(a) * gap;
    u.face = a + Math.PI; confine(u);
    burst(u.x, u.y, '#b07dff', 10);
  }
  function dashTo(u, t, gap, color) {
    var a = Math.atan2(t.y - u.y, t.x - u.x);
    for (var i = 0; i < 9; i++) {
      var k = i / 9;
      burst(u.x + (t.x - u.x) * k, u.y + (t.y - u.y) * k, color || '#fff', 2);
    }
    u.x = t.x - Math.cos(a) * gap; u.y = t.y - Math.sin(a) * gap;
    u.face = a; confine(u);
  }
  function execute(src, t) { t.hp = 0; kill(src, t); }

  /* ================= умения ================= */
  function skillCd(u, sk, lvl) { return sk.cd[lvl] * (1 - u.stats.cdr / 100); }

  function castSkill(u, idx) {
    if (!u || u.dead || world.paused) return false;
    var sk = u.skills[idx]; if (!sk) return false;
    var lv = (u.skillLv[sk.id] || 0) - 1;
    if (lv < 0) { toast('Умение не изучено'); return false; }
    if (sk.type === 'passive') return false;
    if (getBuff(u, 'freeze')) return false;

    if (sk.type === 'reagent') { sk.cast(u, lv); SFX.orb(); return true; }

    if ((u.cds[sk.id] || 0) > 0) return false;
    var cost = sk.mana[lv] || 0;
    if (u.mp < cost) { toast('Мало маны'); return false; }
    if (sk.cast(u, lv) === false) { if (u === world.hero && !world.auto) toast('Нет цели'); return false; }
    u.mp -= cost;
    u.cds[sk.id] = skillCd(u, sk, lv);
    u.castFx = .3;
    SFX.cast();
    return true;
  }

  /* ---- Аркан: реагенты и связки ---- */
  function addReagent(u, e) {
    u.reagents.push(e);
    if (u.reagents.length > 3) u.reagents.shift();
    u.lastInvoke = u.reagents.length === 3 ? D.INVOKE[D.comboKey(u.reagents)] : null;
    var col = e === 'F' ? '#ff5a2f' : e === 'I' ? '#7fd4ff' : '#c9a0ff';
    burst(u.x, u.y, col, 8);
  }

  function elemLevel(u, e) {
    var id = e === 'F' ? 'elemFire' : e === 'I' ? 'elemIce' : 'elemStorm';
    return u.skillLv[id] || 0;
  }

  function invokePower(u) {
    if (u.reagents.length < 3) return 0;
    var p = 0;
    for (var i = 0; i < 3; i++) p += elemLevel(u, u.reagents[i]);
    return p;
  }

  function castInvoke(u) {
    if (!u || u.dead || world.paused) return false;
    if (getBuff(u, 'freeze')) return false;
    if (u.reagents.length < 3) { toast('Нужно 3 реагента'); return false; }
    var key = D.comboKey(u.reagents);
    var sp = D.INVOKE[key];
    if (!sp) return false;
    if ((u.invokeCds[key] || 0) > 0) return false;
    if (u.mp < sp.mana) { toast('Мало маны'); return false; }
    var pw = invokePower(u);
    if (sp.cast(u, pw) === false) { if (!world.auto) toast('Нет цели'); return false; }
    u.mp -= sp.mana;
    u.invokeCds[key] = sp.cd * (1 - u.stats.cdr / 100);
    u.castFx = .35;
    SFX.cast();
    return true;
  }

  /* ================= автобой ================= */
  function threatCount(u, r) {
    var n = 0;
    for (var i = 0; i < world.units.length; i++) {
      var e = world.units[i];
      if (e.dead || e.team === u.team) continue;
      if (dist(u, e) <= r) n++;
    }
    return n;
  }

  // предпочтения автобоя для Аркана: связка под ситуацию
  function autoInvoke(u, near, danger, target) {
    var want;
    if (danger) want = ['I', 'I', 'S'];                 // морозный шаг
    else if (near >= 3) want = ['I', 'I', 'I'];         // ледяная тюрьма
    else if (near === 2) want = ['S', 'S', 'S'];        // гнев небес
    else if (target && target.isBoss) want = ['F', 'F', 'F'];
    else want = ['F', 'F', 'S'];
    // добираем реагенты, доступные по уровню
    var ok = want.filter(function (e) { return elemLevel(u, e) > 0; });
    if (ok.length < 3) {
      var have = ['F', 'I', 'S'].filter(function (e) { return elemLevel(u, e) > 0; });
      if (!have.length) return;
      while (ok.length < 3) ok.push(have[ok.length % have.length]);
    }
    var key = D.comboKey(ok);
    if ((u.invokeCds[key] || 0) > 0) return;
    var sp = D.INVOKE[key];
    if (!sp || u.mp < sp.mana + 20) return;
    if (D.comboKey(u.reagents) !== key || u.reagents.length < 3) {
      u.reagents = ok.slice();
      u.lastInvoke = sp;
      return;                                            // на следующем кадре кастуем
    }
    castInvoke(u);
  }

  function autoPilot(u, dt) {
    var t = pickTarget(u);
    if (!t) { u.vx *= .8; u.vy *= .8; return; }
    var d = dist(u, t), rng = u.stats.range, melee = rng < 160;
    var near = threatCount(u, 215), danger = (u.hp / u.maxHp) < .35 || near >= 4;

    if (u.invoker) {
      autoInvoke(u, near, danger, t);
    } else {
      for (var i = 0; i < u.skills.length; i++) {
        var sk = u.skills[i], lv = (u.skillLv[sk.id] || 0) - 1;
        if (lv < 0 || sk.type === 'passive') continue;
        if (sk.type === 'toggle') {
          var wantOn = near >= 1 && u.mp > u.maxMp * .25;
          if (!!u.toggles[sk.id] !== wantOn) castSkill(u, i);
          continue;
        }
        if ((u.cds[sk.id] || 0) > 0 || u.mp < sk.mana[lv]) continue;
        var ok = false;
        switch (sk.ai) {
          case 'aoe': ok = near >= 2 || (t.isBoss && d < (sk.radius || 220)); break;
          case 'escape': ok = danger; break;
          case 'gap': ok = melee ? d > 150 : (danger && d < 200); break;
          case 'finish': ok = !!lowestHpEnemy(u, sk.range || 300); break;
          case 'buff': ok = near >= 1; break;
          default: ok = d < (sk.range || 560);
        }
        if (ok) castSkill(u, i);
      }
    }

    var a = Math.atan2(t.y - u.y, t.x - u.x);
    var want = melee ? rng * .75 : rng * .8;
    if (!melee && danger) want = rng * .98;

    var mvx = 0, mvy = 0;
    if (d > want + 20) { mvx = Math.cos(a); mvy = Math.sin(a); }
    else if (d < want - 45) { mvx = -Math.cos(a); mvy = -Math.sin(a); }

    // уклонение от телеграфов и зон
    var q, dd, ea;
    for (q = 0; q < world.tele.length; q++) {
      var te = world.tele[q];
      dd = Math.sqrt(d2(u.x, u.y, te.x, te.y));
      if (dd < te.r + u.r + 24) { ea = Math.atan2(u.y - te.y, u.x - te.x); mvx += Math.cos(ea) * 2.4; mvy += Math.sin(ea) * 2.4; }
    }
    // не липнуть к подрывникам
    for (q = 0; q < world.units.length; q++) {
      var e2 = world.units[q];
      if (e2.dead || e2.team === u.team || e2.role !== 'bomber') continue;
      dd = dist(u, e2);
      if (dd < 195) { ea = Math.atan2(u.y - e2.y, u.x - e2.x); mvx += Math.cos(ea) * 1.5; mvy += Math.sin(ea) * 1.5; }
    }
    // обход препятствий
    for (q = 0; q < world.props.length; q++) {
      var p = world.props[q];
      if (!p.meta.solid) continue;
      dd = Math.sqrt(d2(u.x, u.y, p.x, p.y));
      if (dd < p.r + u.r + 34) { ea = Math.atan2(u.y - p.y, u.x - p.x); mvx += Math.cos(ea) * 1.1; mvy += Math.sin(ea) * 1.1; }
    }
    // не жаться к краю
    if (u.x < PAD + 95) mvx += .9;
    if (u.x > W - PAD - 95) mvx -= .9;
    if (u.y < PAD + TOP + 95) mvy += .9;
    if (u.y > H - PAD - 95) mvy -= .9;

    var len = Math.sqrt(mvx * mvx + mvy * mvy);
    if (len > .05) { u.vx = mvx / len; u.vy = mvy / len; }
    else { u.vx *= .8; u.vy *= .8; }
    u.face = a;
  }

  /* ================= ИИ врагов ================= */
  function heroVisibleTo(u) {
    var h = world.hero;
    if (!h || h.dead) return null;
    if (getBuff(h, 'invis') && dist(u, h) > 110) return null;   // невидимость реально работает
    return h;
  }

  function enemyAI(u, dt) {
    if (u.role === 'dummy') { u.vx = u.vy = 0; return; }
    var target = heroVisibleTo(u);
    if (u.tauntT > 0) { u.tauntT -= dt; if (u.tauntBy && !u.tauntBy.dead) target = u.tauntBy; }
    if (!target) {
      // потеряли героя из виду — бродим
      u.wander = (u.wander || 0) - dt;
      if (u.wander <= 0) { u.wander = rnd(.6, 1.4); u.wa = rnd(0, 6.2832); }
      u.vx = Math.cos(u.wa || 0) * .4; u.vy = Math.sin(u.wa || 0) * .4;
      return;
    }

    if (u.role === 'healer') {
      var d0 = dist(u, target);
      u.face = Math.atan2(target.y - u.y, target.x - u.x);
      if (d0 < 300) { u.vx = -Math.cos(u.face); u.vy = -Math.sin(u.face); }
      else { u.vx *= .85; u.vy *= .85; }
      u.healT = (u.healT || 0) - dt;
      if (u.healT <= 0) {
        u.healT = 1;
        var hp = u.def.healPs * D.enemyScale(world.wave), healed = 0;
        for (var i = 0; i < world.units.length; i++) {
          var e = world.units[i];
          if (e.dead || e.team !== u.team || e === u) continue;
          if (dist(u, e) <= u.def.healR && e.hp < e.maxHp) {
            e.hp = Math.min(e.maxHp, e.hp + hp);
            floatText(e.x, e.y - e.r - 8, '+' + Math.round(hp), '#5affb0', 12);
            healed++;
          }
        }
        if (healed) aura(u, u.def.healR, 'rgba(90,255,176,.06)');
      }
      return;
    }

    var d = dist(u, target), a = Math.atan2(target.y - u.y, target.x - u.x);
    u.face = a;
    var want = u.role === 'bomber' ? 0 : u.stats.range * .82;
    if (d > want) { u.vx = Math.cos(a); u.vy = Math.sin(a); }
    else { u.vx *= .82; u.vy *= .82; }
    if (u.role === 'bomber' && d < u.r + target.r + 14) kill(null, u);
  }

  function bossAbility(u, dt) {
    u.abilityCd -= dt;
    if (u.abilityCd > 0) return;
    var h = heroVisibleTo(u);
    if (!h) return;
    var mul = D.enemyScale(world.wave);
    u.abilityCd = 7.5;

    if (u.ability === 'slam') {
      telegraph(u.x, u.y, 270, '#ff4d5e', .75, function () {
        if (u.dead) return;
        aoeAt(u, u.x, u.y, 270, 90 * mul, 'phys');
        ring(u.x, u.y, 270, '#ff4d5e'); shake(13); SFX.boom();
      });
    } else if (u.ability === 'grab') {
      if (dist(u, h) < 720) {
        projectile({
          from: u, to: h, speed: 900, r: 12, color: '#ff4a9a', trail: true, homing: true,
          onHit: function (t2) { damage(u, t2, 70 * mul, 'phys'); pull(t2, u, 72); shake(10); }
        });
      }
    } else if (u.ability === 'meteor') {
      var x = h.x, y = h.y;
      telegraph(x, y, 155, '#8ab0ff', .9, function () {
        if (u.dead) return;
        aoeAt(u, x, y, 155, 130 * mul, 'magic');
        pillar(x, y, '#8ab0ff'); burst(x, y, '#8ab0ff', 30); shake(12);
      });
    } else if (u.ability === 'ring') {
      var cx = u.x, cy = u.y;
      for (var i = 0; i < 3; i++) {
        (function (k) {
          timer(k * .42, function () {
            if (u.dead || !world.running) return;
            var rr = 130 + k * 115;
            ring(cx, cy, rr, '#ffa04a');
            aoeApply(u, cx, cy, rr + 26, function (e) {
              if (Math.sqrt(d2(cx, cy, e.x, e.y)) > rr - 44) damage(u, e, 75 * mul, 'magic');
            });
          });
        })(i);
      }
      shake(9);
    }
  }

  /* ================= столкновения ================= */
  function separate() {
    var us = world.units, i, j;
    for (i = 0; i < us.length; i++) {
      var a = us[i]; if (a.dead) continue;
      for (j = i + 1; j < us.length; j++) {
        var b = us[j]; if (b.dead) continue;
        var dx = b.x - a.x, dy = b.y - a.y, dd = Math.sqrt(dx * dx + dy * dy) || .01;
        var min = a.r + b.r;
        if (dd < min) {
          var push = (min - dd) * .5, nx = dx / dd, ny = dy / dd;
          var aw = (a.isBoss || a.role === 'dummy') ? .15 : 1, bw = (b.isBoss || b.role === 'dummy') ? .15 : 1;
          a.x -= nx * push * aw; a.y -= ny * push * aw;
          b.x += nx * push * bw; b.y += ny * push * bw;
        }
      }
    }
    // препятствия
    for (i = 0; i < us.length; i++) {
      var u = us[i]; if (u.dead) continue;
      for (j = 0; j < world.props.length; j++) {
        var p = world.props[j];
        if (!p.meta.solid) continue;
        var ddx = u.x - p.x, ddy = u.y - p.y, dl = Math.sqrt(ddx * ddx + ddy * ddy) || .01;
        var mn = u.r + p.r * .72;
        if (dl < mn) { u.x = p.x + ddx / dl * mn; u.y = p.y + ddy / dl * mn; }
      }
    }
  }

  function terrainEffect(u, dt) {
    for (var i = 0; i < world.decals.length; i++) {
      var p = world.decals[i], meta = p.meta;
      if (!meta.hazard && !meta.slow) continue;
      if (d2(u.x, u.y, p.x, p.y) > (p.r + u.r * .4) * (p.r + u.r * .4)) continue;
      if (meta.hazard) {
        damage(null, u, meta.hazard * dt * D.enemyScale(world.wave) * .5, 'magic');
        if (Math.random() < dt * 10) world.embers.push({ x: u.x + rnd(-10, 10), y: u.y, vy: rnd(-40, -14), c: '#ff7a2f', t: 0, life: .7, r: 2 });
      }
      if (meta.slow) addBuff(u, { id: 'icy', dur: .3, msMul: meta.slow, quiet: true });
    }
  }

  /* ================= авто-атака ================= */
  function autoAttack(u, dt) {
    u.atkCd -= dt;
    if (u.atkCd > 0 || getBuff(u, 'freeze') || u.leap) return;
    if (u.role === 'bomber' || u.role === 'healer' || u.role === 'dummy') return;

    var t;
    if (u.team === 1) {
      t = heroVisibleTo(u);
      if (u.tauntT > 0 && u.tauntBy && !u.tauntBy.dead) t = u.tauntBy;
      if (!t || dist(u, t) > u.stats.range + u.r + t.r) return;
    } else {
      t = nearestEnemy(u, u.stats.range + u.r);
      if (!t) return;
    }

    u.atkCd = 1 / Math.max(.15, u.stats.as);
    u.face = Math.atan2(t.y - u.y, t.x - u.x);
    u.swing = .22;

    var cleaveB = getBuff(u, 'cleave');
    var zapB = getBuff(u, 'alacrity');

    var onHit = function (target) {
      var dealt = damage(u, target, u.stats.atk, u.magic ? 'magic' : 'phys', true);
      if (u.role === 'hexer') addBuff(target, { id: 'hex', dur: 2, msMul: .6, color: '#ff4ad0' });
      if (cleaveB) {
        var extra = dealt * cleaveB.cleavePct / 100;
        for (var i = 0; i < world.units.length; i++) {
          var e = world.units[i];
          if (e.dead || e.team === u.team || e === target) continue;
          if (d2(e.x, e.y, target.x, target.y) <= cleaveB.cleaveR * cleaveB.cleaveR) damage(u, e, extra, 'phys');
        }
        ring(target.x, target.y, cleaveB.cleaveR, '#ffb03a');
      }
      if (zapB && zapB.zap) {
        world.bolts.push({ x1: u.x, y1: u.y, x2: target.x, y2: target.y, c: '#ffd24a', t: 0, life: .18 });
        damage(u, target, zapB.zap, 'magic');
      }
      if (u.skills) {
        for (var s = 0; s < u.skills.length; s++) {
          var sk = u.skills[s], lv = (u.skillLv[sk.id] || 0) - 1;
          if (lv >= 0 && sk.onAttack) sk.onAttack(u, lv, target);
        }
      }
    };

    if (u.stats.range > 150) {
      projectile({
        from: u, to: t, speed: 820, r: u.magic ? 7 : 5, color: u.magic ? (u.glow || '#c08aff') : (u.team === 1 ? (u.glow || u.c1) : u.c1),
        trail: true, homing: true, onHit: onHit
      });
    } else { slash(u, t, u.team === 1 ? (u.glow || u.c1) : u.c1); onHit(t); }
  }

  /* ================= волны ================= */
  function spawnAt(u) {
    var side = Math.floor(Math.random() * 4), tries = 0;
    do {
      if (side === 0) { u.x = rnd(PAD, W - PAD); u.y = PAD + TOP + 10; }
      else if (side === 1) { u.x = rnd(PAD, W - PAD); u.y = H - PAD; }
      else if (side === 2) { u.x = PAD; u.y = rnd(PAD + TOP, H - PAD); }
      else { u.x = W - PAD; u.y = rnd(PAD + TOP, H - PAD); }
      side = (side + 1) % 4;
    } while (blockedByProp(u) && tries++ < 8);
    confine(u);
    ring(u.x, u.y, 46, '#ff4d5e');
  }
  function blockedByProp(u) {
    for (var i = 0; i < world.props.length; i++) {
      var p = world.props[i];
      if (p.meta.solid && d2(u.x, u.y, p.x, p.y) < (p.r + u.r) * (p.r + u.r)) return true;
    }
    return false;
  }

  function spawnWave() {
    var w = world.wave, boss = (w % 5 === 0);
    if (boss) {
      var bd = D.BOSSES[(Math.floor(w / 5) - 1) % D.BOSSES.length];
      var count = 1 + Math.floor(w / 15);
      for (var i = 0; i < count; i++) { var b = makeEnemy(bd, true); spawnAt(b); world.units.push(b); }
      var extra = Math.min(5, 2 + Math.floor(w / 6));
      for (var k = 0; k < extra; k++) { var m = makeEnemy(D.rollEnemy(w), false); spawnAt(m); world.units.push(m); }
      flash('#ff4d5e', .3); shake(11);
    } else {
      var budget = D.enemyCount(w), guard = 0;
      while (budget > 0 && guard++ < 20) {
        var def = D.rollEnemy(w), pack = def.pack || 1;
        for (var p = 0; p < pack; p++) {
          var e = makeEnemy(def, false);
          spawnAt(e);
          if (p > 0) { e.x += rnd(-44, 44); e.y += rnd(-44, 44); confine(e); }
          world.units.push(e);
        }
        budget -= (pack > 1 ? 2 : 1);
      }
    }
    SFX.wave();
  }

  function aliveEnemies() {
    var n = 0;
    for (var i = 0; i < world.units.length; i++) if (!world.units[i].dead && world.units[i].team === 1) n++;
    return n;
  }

  /* ================= цикл ================= */
  var lastT = 0, raf = 0;
  function step(now) {
    raf = requestAnimationFrame(step);
    if (!lastT) lastT = now;
    var real = Math.min(.05, (now - lastT) / 1000);
    lastT = now;
    if (!world.running) return;
    if (world.hitstop > 0) { world.hitstop -= real; render(real); return; }
    if (!world.paused && !world.over) update(real);
    render(real);
  }

  function update(dt) {
    world.time += dt;
    world.auras.length = 0;
    var h = world.hero, i;

    // таймеры
    for (i = world.timers.length - 1; i >= 0; i--) {
      var tm = world.timers[i]; tm.t -= dt;
      if (tm.t <= 0) { world.timers.splice(i, 1); tm.fn(); }
    }

    /* --- ввод --- */
    if (h && !h.dead) {
      if (world.auto) autoPilot(h, dt);
      else {
        var mx = 0, my = 0;
        if (input.stick.on) { mx = input.stick.x; my = input.stick.y; }
        else {
          mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
          my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
        }
        var len = Math.sqrt(mx * mx + my * my);
        if (len > 1) { mx /= len; my /= len; }
        h.vx = mx; h.vy = my;
        if (len > .05) h.face = Math.atan2(my, mx);
      }
      // герои с динамической пассивкой пересчитываются каждый кадр
      if (h.skillLv.bloodrage) recalc(h);
    }

    /* --- юниты --- */
    for (i = 0; i < world.units.length; i++) {
      var u = world.units[i];
      if (u.dead) continue;

      for (var b = u.buffs.length - 1; b >= 0; b--) {
        var bf = u.buffs[b];
        bf.t -= dt;
        if (bf.onTick) bf.onTick(u, dt);
        if (bf.dps) damage(bf.src || null, u, bf.dps * dt, bf.dmgType || 'magic');
        if (bf.regenPct) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * bf.regenPct / 100 * dt);
        if (bf.spin) u.spin += dt * 15;
        if (bf.t <= 0) { u.buffs.splice(b, 1); recalc(u); }
      }
      if (u.dead) continue;

      var stunned = !!getBuff(u, 'freeze');
      var rooted = stunned || !!getBuff(u, 'root');

      if (u.team === 1) {
        enemyAI(u, dt);
        if (u.isBoss && !stunned) bossAbility(u, dt);
      }
      if (u.dead) continue;

      // прыжок
      if (u.leap) {
        u.leap.t += dt;
        var k = Math.min(1, u.leap.t / u.leap.dur);
        u.x = u.leap.fx + (u.leap.tx - u.leap.fx) * k;
        u.y = u.leap.fy + (u.leap.ty - u.leap.fy) * k;
        u.airZ = Math.sin(k * Math.PI) * 60;
        if (k >= 1) { var f = u.leap.onLand; u.leap = null; u.airZ = 0; if (f) f(); }
      } else if (!rooted) {
        u.x += u.vx * u.stats.ms * dt;
        u.y += u.vy * u.stats.ms * dt;
        confine(u);
        var spd = Math.abs(u.vx) + Math.abs(u.vy);
        if (spd > .3) {
          u.step += dt * u.stats.ms * .022;
          if (Math.random() < dt * 5) world.parts.push({ x: u.x + rnd(-6, 6), y: u.y + u.r * .65, vx: rnd(-16, 16), vy: rnd(-8, 4), c: 'rgba(150,160,200,.45)', r: 1.7, t: 0, life: .45 });
        }
      }

      terrainEffect(u, dt);

      u.hp = Math.min(u.maxHp, u.hp + u.stats.hpReg * dt);
      u.mp = Math.min(u.maxMp, u.mp + u.stats.mpReg * dt);

      for (var c in u.cds) if (u.cds[c] > 0) u.cds[c] = Math.max(0, u.cds[c] - dt);
      if (u.invokeCds) for (var ic in u.invokeCds) if (u.invokeCds[ic] > 0) u.invokeCds[ic] = Math.max(0, u.invokeCds[ic] - dt);

      if (u.skills) {
        for (var s = 0; s < u.skills.length; s++) {
          var sk = u.skills[s], lv = (u.skillLv[sk.id] || 0) - 1;
          if (lv >= 0 && sk.tick) sk.tick(u, lv, dt);
        }
      }

      if (!stunned) autoAttack(u, dt);
      if (u.flash > 0) u.flash = Math.max(0, u.flash - dt * 5);
      if (u.swing > 0) u.swing = Math.max(0, u.swing - dt * 4.2);
      if (u.castFx > 0) u.castFx = Math.max(0, u.castFx - dt * 3);
      if (u.hp <= 0) kill(null, u);
    }

    separate();

    /* --- зоны --- */
    for (var z = world.zones.length - 1; z >= 0; z--) {
      var zn = world.zones[z]; zn.t += dt;
      if (zn.onTick) zn.onTick(zn, dt);
      if (zn.t >= zn.life) world.zones.splice(z, 1);
    }
    /* --- стены --- */
    for (var wl = world.walls.length - 1; wl >= 0; wl--) {
      var wa = world.walls[wl]; wa.t += dt;
      var hx = Math.cos(wa.a), hy = Math.sin(wa.a);
      for (var wu = 0; wu < world.units.length; wu++) {
        var eu = world.units[wu];
        if (eu.dead || eu.team === wa.src.team) continue;
        // расстояние до отрезка
        var rx = eu.x - wa.x, ry = eu.y - wa.y;
        var proj = rx * hx + ry * hy;
        proj = clamp(proj, -wa.len / 2, wa.len / 2);
        var px2 = wa.x + hx * proj, py2 = wa.y + hy * proj;
        if (d2(eu.x, eu.y, px2, py2) < (22 + eu.r) * (22 + eu.r)) wa.fn(eu, dt);
      }
      if (wa.t >= wa.life) world.walls.splice(wl, 1);
    }

    /* --- снаряды --- */
    for (var p2 = world.proj.length - 1; p2 >= 0; p2--) {
      var pr = world.proj[p2];
      if (pr.homing && pr.target && !pr.target.dead) {
        // самонаведение теряет невидимую цель
        if (!getBuff(pr.target, 'invis')) pr.a = Math.atan2(pr.target.y - pr.y, pr.target.x - pr.x);
        else pr.target = null;
      }
      var mv = pr.sp * dt;
      if (pr.trail) { pr.pts.push(pr.x, pr.y); if (pr.pts.length > 18) pr.pts.splice(0, 2); }
      if (pr.spin) pr.rot += dt * 9;
      pr.x += Math.cos(pr.a) * mv; pr.y += Math.sin(pr.a) * mv;
      pr.travelled += mv;
      var gone = pr.travelled > pr.range || pr.x < -60 || pr.x > W + 60 || pr.y < -60 || pr.y > H + 60;
      var hit = false;
      for (var t2 = 0; t2 < world.units.length; t2++) {
        var tu = world.units[t2];
        if (tu.dead || tu.team === pr.team || pr.hitIds[tu.id]) continue;
        if (tu.team === 0 && getBuff(tu, 'invis')) continue;      // по невидимке не попадают
        if (d2(tu.x, tu.y, pr.x, pr.y) <= (tu.r + pr.r) * (tu.r + pr.r)) {
          pr.hitIds[tu.id] = 1;
          if (pr.onHit) pr.onHit(tu);
          sparks(pr.x, pr.y, pr.c, 6);
          if (pr.pierce > 0) pr.pierce--; else hit = true;
          break;
        }
      }
      if (hit || gone) world.proj.splice(p2, 1);
    }

    /* --- телеграфы --- */
    for (var tg = world.tele.length - 1; tg >= 0; tg--) {
      var te2 = world.tele[tg]; te2.t += dt;
      if (te2.t >= te2.life) { if (te2.done) te2.done(); world.tele.splice(tg, 1); }
    }

    /* --- эффекты --- */
    var arr, o;
    for (var q2 = world.parts.length - 1; q2 >= 0; q2--) {
      o = world.parts[q2]; o.t += dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= .93; o.vy *= .93;
      if (o.t >= o.life) world.parts.splice(q2, 1);
    }
    for (var sp3 = world.sparks.length - 1; sp3 >= 0; sp3--) {
      o = world.sparks[sp3]; o.t += dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= .85; o.vy *= .85;
      if (o.t >= o.life) world.sparks.splice(sp3, 1);
    }
    for (var em = world.embers.length - 1; em >= 0; em--) {
      o = world.embers[em]; o.t += dt; o.y += o.vy * dt; o.x += Math.sin(world.time * 2 + o.y * .05) * 8 * dt;
      if (o.t >= o.life) world.embers.splice(em, 1);
    }
    for (var f2 = world.floats.length - 1; f2 >= 0; f2--) {
      o = world.floats[f2]; o.t += dt; o.y += o.vy * dt; o.x += o.vx * dt; o.vy *= .92;
      if (o.t >= o.life) world.floats.splice(f2, 1);
    }
    arr = ['rings', 'bolts', 'slashes', 'corpses', 'pillars', 'cones'];
    for (var ai = 0; ai < arr.length; ai++) {
      var list = world[arr[ai]];
      for (var li = list.length - 1; li >= 0; li--) {
        list[li].t += dt;
        if (list[li].t >= list[li].life) list.splice(li, 1);
      }
    }

    // фоновые угольки карты
    if (world.map && Math.random() < dt * 14) {
      world.embers.push({ x: rnd(0, W), y: H, vy: rnd(-30, -10), c: world.map.accent, t: 0, life: rnd(2, 4.5), r: rnd(.8, 2) });
    }

    for (var d3 = world.units.length - 1; d3 >= 0; d3--) {
      if (world.units[d3].dead && world.units[d3] !== world.hero) world.units.splice(d3, 1);
    }

    if (world.shakeT > 0) { world.shakeT -= dt; if (world.shakeT <= 0) world.shakeMag = 0; }
    if (world.flashT > 0) world.flashT = Math.max(0, world.flashT - dt * 2.2);

    // счётчик урона в секунду (для полигона)
    while (world.dmgWindow.length && world.time - world.dmgWindow[0][0] > 5) world.dmgWindow.shift();
    var sum = 0;
    for (var dw = 0; dw < world.dmgWindow.length; dw++) sum += world.dmgWindow[dw][1];
    world.dps = sum / 5;

    if (!world.over && !world.training && aliveEnemies() === 0) {
      world.running = false;
      if (cb.onWaveClear) cb.onWaveClear(world.wave);
    }
    if (cb.onUpdate) cb.onUpdate();
  }

  /* ================================================
                        РЕНДЕР
     ================================================ */
  function render(dt) {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var ox = 0, oy = 0;
    if (world.shakeT > 0) {
      var k = world.shakeMag * (world.shakeT / .3);
      ox = rnd(-k, k); oy = rnd(-k, k);
    }
    ctx.save(); ctx.translate(ox, oy);

    // 1. запечённый фон
    if (ground) ctx.drawImage(ground, 0, 0, W, H);

    // 2. анимированные декали (лава, лёд)
    drawAnimatedDecals();

    // 3. зоны и стены под ногами
    drawZones();

    // 4. ауры
    for (var a = 0; a < world.auras.length; a++) {
      var au = world.auras[a];
      var gr = ctx.createRadialGradient(au.x, au.y, au.r * .15, au.x, au.y, au.r);
      gr.addColorStop(0, au.c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(au.x, au.y, au.r, 0, 6.2832); ctx.fill();
    }

    // 5. трупы
    for (var co = 0; co < world.corpses.length; co++) {
      var cp = world.corpses[co], kk = cp.t / cp.life;
      ctx.save(); ctx.globalAlpha = (1 - kk) * .55;
      ctx.translate(cp.x, cp.y + kk * 7); ctx.scale(1, .5);
      var cg = ctx.createRadialGradient(0, 0, 2, 0, 0, cp.r * (1 + kk * .5));
      cg.addColorStop(0, cp.glow); cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(0, 0, cp.r * (1 + kk * .5), 0, 6.2832); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // 6. телеграфы
    for (var t = 0; t < world.tele.length; t++) {
      var te = world.tele[t], pp = te.t / te.life;
      ctx.save();
      ctx.globalAlpha = .6 + Math.sin(world.time * 24) * .14;
      ctx.strokeStyle = te.c; ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]); ctx.lineDashOffset = -world.time * 46;
      ctx.beginPath(); ctx.arc(te.x, te.y, te.r, 0, 6.2832); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = .1 + pp * .3; ctx.fillStyle = te.c;
      ctx.beginPath(); ctx.arc(te.x, te.y, te.r * pp, 0, 6.2832); ctx.fill();
      ctx.restore();
    }

    // 7. кольца
    for (var r = 0; r < world.rings.length; r++) {
      var ri = world.rings[r], k2 = ri.t / ri.life;
      var rad = ri.r + (ri.max - ri.r) * (1 - Math.pow(1 - k2, 2.2));
      ctx.strokeStyle = ri.c; ctx.globalAlpha = (1 - k2) * .95;
      ctx.lineWidth = 6 * (1 - k2) + 1;
      ctx.shadowColor = ri.c; ctx.shadowBlur = 16 * (1 - k2);
      ctx.beginPath(); ctx.arc(ri.x, ri.y, rad, 0, 6.2832); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // 8. конусы
    for (var cn = 0; cn < world.cones.length; cn++) {
      var co2 = world.cones[cn], ck = co2.t / co2.life;
      ctx.save(); ctx.globalAlpha = (1 - ck) * .5;
      var cg2 = ctx.createRadialGradient(co2.x, co2.y, 10, co2.x, co2.y, co2.range);
      cg2.addColorStop(0, co2.c); cg2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg2;
      ctx.beginPath(); ctx.moveTo(co2.x, co2.y);
      ctx.arc(co2.x, co2.y, co2.range * (.4 + ck * .6), co2.a - co2.half, co2.a + co2.half);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // 9. динамический свет
    drawLights();

    // 10. препятствия + юниты с сортировкой по глубине
    var drawList = [];
    for (var pi = 0; pi < world.props.length; pi++) drawList.push({ y: world.props[pi].y, p: world.props[pi] });
    for (var ui = 0; ui < world.units.length; ui++) if (!world.units[ui].dead) drawList.push({ y: world.units[ui].y, u: world.units[ui] });
    drawList.sort(function (A, B) { return A.y - B.y; });
    for (var di = 0; di < drawList.length; di++) {
      if (drawList[di].u) drawUnit(drawList[di].u);
      else drawProp(drawList[di].p);
    }

    // 11. молнии
    for (var bo2 = 0; bo2 < world.bolts.length; bo2++) {
      var bo = world.bolts[bo2];
      ctx.globalAlpha = 1 - bo.t / bo.life;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowColor = bo.c; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(bo.x1, bo.y1);
      for (var s2 = 1; s2 < 7; s2++) {
        var tt = s2 / 7;
        ctx.lineTo(bo.x1 + (bo.x2 - bo.x1) * tt + rnd(-11, 11), bo.y1 + (bo.y2 - bo.y1) * tt + rnd(-11, 11));
      }
      ctx.lineTo(bo.x2, bo.y2);
      ctx.strokeStyle = bo.c; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // 12. колонны света
    for (var pl = 0; pl < world.pillars.length; pl++) {
      var pc = world.pillars[pl], pk = pc.t / pc.life;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - pk) * .9;
      var pw2 = 60 * (1 - pk * .5);
      var lg = ctx.createLinearGradient(pc.x, pc.y - 400, pc.x, pc.y + 20);
      lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, pc.c);
      ctx.fillStyle = lg;
      ctx.fillRect(pc.x - pw2 / 2, pc.y - 400, pw2, 420);
      ctx.restore();
    }

    // 13. удары
    for (var sl = 0; sl < world.slashes.length; sl++) {
      var s3 = world.slashes[sl], k3 = s3.t / s3.life;
      ctx.globalAlpha = 1 - k3;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * (1 - k3) + 1;
      ctx.shadowColor = s3.c; ctx.shadowBlur = 14;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s3.x1, s3.y1); ctx.lineTo(s3.x2, s3.y2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // 14. снаряды
    for (var p3 = 0; p3 < world.proj.length; p3++) {
      var pr2 = world.proj[p3];
      if (pr2.trail && pr2.pts.length > 3) {
        ctx.lineCap = 'round'; ctx.strokeStyle = pr2.c;
        for (var zz = 0; zz < pr2.pts.length - 2; zz += 2) {
          ctx.globalAlpha = (zz / pr2.pts.length) * .55;
          ctx.lineWidth = pr2.r * (zz / pr2.pts.length) * 1.7;
          ctx.beginPath(); ctx.moveTo(pr2.pts[zz], pr2.pts[zz + 1]); ctx.lineTo(pr2.pts[zz + 2], pr2.pts[zz + 3]); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.save();
      ctx.translate(pr2.x, pr2.y);
      if (pr2.spin) ctx.rotate(pr2.rot);
      ctx.shadowColor = pr2.c; ctx.shadowBlur = pr2.big ? 34 : 14;
      ctx.fillStyle = pr2.c;
      ctx.beginPath(); ctx.arc(0, 0, pr2.r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(0, 0, pr2.r * .45, 0, 6.2832); ctx.fill();
      ctx.restore(); ctx.shadowBlur = 0;
    }

    // 15. частицы
    for (var q3 = 0; q3 < world.parts.length; q3++) {
      var pa = world.parts[q3];
      ctx.globalAlpha = 1 - pa.t / pa.life;
      ctx.fillStyle = pa.c;
      ctx.fillRect(pa.x - pa.r, pa.y - pa.r, pa.r * 2, pa.r * 2);
    }
    ctx.globalAlpha = 1;

    // 16. искры
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (var sp4 = 0; sp4 < world.sparks.length; sp4++) {
      var sk3 = world.sparks[sp4];
      ctx.globalAlpha = 1 - sk3.t / sk3.life;
      ctx.strokeStyle = sk3.c; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(sk3.x, sk3.y);
      ctx.lineTo(sk3.x - sk3.vx * .022, sk3.y - sk3.vy * .022); ctx.stroke();
    }
    // угольки
    for (var eb = 0; eb < world.embers.length; eb++) {
      var em2 = world.embers[eb];
      ctx.globalAlpha = (1 - em2.t / em2.life) * .55;
      ctx.fillStyle = em2.c;
      ctx.beginPath(); ctx.arc(em2.x, em2.y, em2.r || 1.5, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // 17. числа урона
    ctx.textAlign = 'center';
    for (var f3 = 0; f3 < world.floats.length; f3++) {
      var fl = world.floats[f3], k4 = fl.t / fl.life;
      var sc = k4 < .16 ? 1 + (1 - k4 / .16) * .55 : 1;
      ctx.globalAlpha = 1 - k4 * k4;
      ctx.font = '900 ' + (fl.s * sc).toFixed(1) + 'px "Trebuchet MS",sans-serif';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
      ctx.strokeText(fl.txt, fl.x, fl.y);
      ctx.fillStyle = fl.c; ctx.fillText(fl.txt, fl.x, fl.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // 18. пост-обработка
    var m = world.map;
    if (m) {
      ctx.fillStyle = m.tint; ctx.fillRect(0, 0, W, H);
      var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .32, W / 2, H / 2, Math.max(W, H) * .8);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    if (world.flashT > 0) {
      ctx.globalAlpha = Math.min(.5, world.flashT * .65);
      ctx.fillStyle = world.flashC; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    // низкое здоровье — красная кайма
    var hh = world.hero;
    if (hh && !hh.dead && hh.hp / hh.maxHp < .3) {
      var pulse = .18 + Math.sin(world.time * 6) * .08;
      var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .7);
      vg.addColorStop(0, 'rgba(255,0,30,0)'); vg.addColorStop(1, 'rgba(255,0,30,' + pulse + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------------- свет ---------------- */
  function drawLights() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var i, l;
    // герой
    var h = world.hero;
    if (h && !h.dead) addLight(h.x, h.y, 190, rgba(h.c1, .16));
    // светящиеся объекты карты
    for (i = 0; i < world.props.length; i++) {
      l = world.props[i];
      if (l.meta.light) addLight(l.x, l.y, 130 + Math.sin(world.time * 5 + l.sway) * 14, 'rgba(255,150,60,.16)');
    }
    for (i = 0; i < world.decals.length; i++) {
      l = world.decals[i];
      if (l.meta.light) addLight(l.x, l.y, l.r * 2.6, 'rgba(255,110,30,.16)');
    }
    // снаряды и зоны
    for (i = 0; i < world.proj.length; i++) addLight(world.proj[i].x, world.proj[i].y, world.proj[i].big ? 120 : 60, rgba(world.proj[i].c, .18));
    for (i = 0; i < world.zones.length; i++) addLight(world.zones[i].x, world.zones[i].y, world.zones[i].r * 1.2, rgba(world.zones[i].c, .1));
    for (i = 0; i < world.units.length; i++) {
      var u = world.units[i];
      if (u.dead || u.team !== 1) continue;
      addLight(u.x, u.y, u.isBoss ? 150 : 55, rgba(u.glow || '#ff5a4a', u.isBoss ? .14 : .08));
    }
    ctx.restore();
  }
  function addLight(x, y, r, color) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  /* ---------------- зоны ---------------- */
  function drawZones() {
    for (var i = 0; i < world.zones.length; i++) {
      var z = world.zones[i], k = z.t / z.life;
      var fade = k > .85 ? (1 - k) / .15 : 1;
      ctx.save(); ctx.globalAlpha = .32 * fade;
      var g = ctx.createRadialGradient(z.x, z.y, z.r * .1, z.x, z.y, z.r);
      g.addColorStop(0, z.c); g.addColorStop(.7, rgba(z.c, .3)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = .7 * fade;
      ctx.strokeStyle = z.c; ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]); ctx.lineDashOffset = world.time * 24;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.2832); ctx.stroke();
      ctx.setLineDash([]);
      if (z.style === 'thorn') {
        ctx.globalAlpha = .8 * fade; ctx.strokeStyle = z.c; ctx.lineWidth = 2;
        for (var s = 0; s < 12; s++) {
          var a = s / 12 * 6.2832 + z.t;
          ctx.beginPath();
          ctx.moveTo(z.x + Math.cos(a) * z.r * .35, z.y + Math.sin(a) * z.r * .35);
          ctx.lineTo(z.x + Math.cos(a) * z.r * .9, z.y + Math.sin(a) * z.r * .9);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // стены
    for (var w2 = 0; w2 < world.walls.length; w2++) {
      var wa = world.walls[w2], wk = wa.t / wa.life;
      ctx.save();
      ctx.globalAlpha = (wk > .85 ? (1 - wk) / .15 : 1) * .85;
      ctx.translate(wa.x, wa.y); ctx.rotate(wa.a);
      var wg = ctx.createLinearGradient(0, -20, 0, 20);
      wg.addColorStop(0, 'rgba(0,0,0,0)'); wg.addColorStop(.5, wa.c); wg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wg;
      ctx.fillRect(-wa.len / 2, -20, wa.len, 40);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.globalAlpha *= .6;
      for (var sp = -wa.len / 2; sp < wa.len / 2; sp += 26) {
        ctx.beginPath(); ctx.moveTo(sp, -18); ctx.lineTo(sp + 8, 18); ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ---------------- декали ---------------- */
  function drawDecal(p, anim) {
    var t = anim ? world.time : 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    switch (p.type) {
      case 'bones':
        ctx.strokeStyle = 'rgba(220,215,200,.32)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-p.r * .6, 0); ctx.lineTo(p.r * .6, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(-p.r * .6, -3, 3.5, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-p.r * .3, p.r * .4); ctx.lineTo(p.r * .4, p.r * .1); ctx.stroke();
        break;
      case 'grass':
        ctx.strokeStyle = 'rgba(110,190,120,.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (var i = 0; i < 7; i++) {
          var gx = (i - 3) * p.r * .22;
          ctx.beginPath(); ctx.moveTo(gx, p.r * .3);
          ctx.quadraticCurveTo(gx + 4, -p.r * .2, gx + 8, -p.r * .55); ctx.stroke();
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
        for (var j = 0; j < 7; j++) {
          var a = j / 7 * 6.2832, rr = p.r * (.7 + ((j * 37) % 10) / 30);
          if (j === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * .62);
          else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .62);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(200,240,255,.3)'; ctx.lineWidth = 1.5; ctx.stroke();
        break;
      case 'lava':
        var pulse = anim ? .5 + Math.sin(t * 2.2 + p.sway) * .18 : .55;
        var lg = ctx.createRadialGradient(0, 0, 2, 0, 0, p.r);
        lg.addColorStop(0, 'rgba(255,220,120,' + pulse + ')');
        lg.addColorStop(.5, 'rgba(255,110,20,' + (pulse * .8) + ')');
        lg.addColorStop(1, 'rgba(90,20,0,.15)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .62, 0, 0, 6.2832); ctx.fill();
        break;
    }
    ctx.restore();
  }
  function drawAnimatedDecals() {
    for (var i = 0; i < world.decals.length; i++) {
      var p = world.decals[i];
      if (p.type === 'lava') drawDecal(p, true);
    }
  }

  /* ---------------- препятствия ---------------- */
  function drawProp(p) {
    var m = world.map;
    ctx.save();
    // тень
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + p.r * .35, p.r * .95, p.r * .34, 0, 0, 6.2832); ctx.fill();
    ctx.translate(p.x, p.y);
    var sway = Math.sin(world.time * 1.1 + p.sway) * .022;

    switch (p.type) {
      case 'rock':
        ctx.rotate(p.rot);
        polyRock(p.r, '#6a6258', '#2a2620');
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
        var glow = .5 + Math.sin(world.time * 2 + p.sway) * .2;
        ctx.shadowColor = m.accent; ctx.shadowBlur = 22 * glow;
        var cgd = ctx.createLinearGradient(0, -p.r * 2.2, 0, p.r * .3);
        cgd.addColorStop(0, mixWhite(m.accent, .5)); cgd.addColorStop(1, m.accent);
        ctx.fillStyle = cgd;
        ctx.beginPath();
        ctx.moveTo(0, -p.r * 2.3); ctx.lineTo(p.r * .7, -p.r * .5);
        ctx.lineTo(p.r * .35, p.r * .3); ctx.lineTo(-p.r * .35, p.r * .3);
        ctx.lineTo(-p.r * .7, -p.r * .5); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.moveTo(0, -p.r * 2.3); ctx.lineTo(p.r * .22, -p.r * .5); ctx.lineTo(-p.r * .1, -p.r * .5); ctx.closePath(); ctx.fill();
        break;
      case 'stump':
        ctx.fillStyle = '#3a2c1e';
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .55, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#5a4630';
        ctx.beginPath(); ctx.ellipse(0, -p.r * .3, p.r * .9, p.r * .48, 0, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = '#3a2c1e'; ctx.lineWidth = 1.5;
        for (var s = 1; s <= 3; s++) {
          ctx.beginPath(); ctx.ellipse(0, -p.r * .3, p.r * .9 * (s / 4), p.r * .48 * (s / 4), 0, 0, 6.2832); ctx.stroke();
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
      case 'brazier':
        ctx.fillStyle = '#33302c';
        ctx.fillRect(-p.r * .28, -p.r * 1.5, p.r * .56, p.r * 1.6);
        ctx.fillStyle = '#4a4640';
        ctx.beginPath(); ctx.ellipse(0, -p.r * 1.5, p.r * .8, p.r * .34, 0, 0, 6.2832); ctx.fill();
        var fl = .8 + Math.sin(world.time * 9 + p.sway) * .2;
        ctx.shadowColor = '#ff9a3a'; ctx.shadowBlur = 26;
        var fg = ctx.createRadialGradient(0, -p.r * 1.9, 2, 0, -p.r * 1.8, p.r * 1.1 * fl);
        fg.addColorStop(0, '#fff3c0'); fg.addColorStop(.45, '#ff9a3a'); fg.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.ellipse(0, -p.r * 1.85, p.r * .8 * fl, p.r * 1.15 * fl, 0, 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;
        if (Math.random() < .12) world.embers.push({ x: p.x + rnd(-6, 6), y: p.y - p.r * 2, vy: rnd(-42, -18), c: '#ff9a3a', t: 0, life: 1.1, r: 1.6 });
        break;
    }
    ctx.restore();
  }

  function polyRock(r, c1, c2) {
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

  /* ================================================
                  АНИМАЦИИ ГЕРОЕВ
     ================================================ */
  var ANIM = {
    heavy: { bobA: 3.2, bobF: .9, swing: 'chop', hover: 0, lean: .16 },
    draw: { bobA: 1.6, bobF: 1.5, swing: 'shoot', hover: 0, lean: .06 },
    frenzy: { bobA: 2.6, bobF: 2.4, swing: 'double', hover: 0, lean: .22 },
    float: { bobA: 4.5, bobF: .7, swing: 'cast', hover: 8, lean: 0 },
    charge: { bobA: 2.2, bobF: 1.3, swing: 'thrust', hover: 0, lean: .18 },
    swift: { bobA: 1.4, bobF: 2.6, swing: 'twin', hover: 0, lean: .12 },
    nimble: { bobA: 2.0, bobF: 1.8, swing: 'shoot', hover: 2, lean: .08 },
    orbit: { bobA: 3.6, bobF: .8, swing: 'cast', hover: 10, lean: 0 },
    flame: { bobA: 3.0, bobF: 1.1, swing: 'cast', hover: 6, lean: 0 },
    stone: { bobA: 1.2, bobF: .6, swing: 'smash', hover: 0, lean: .1 }
  };

  function swingOffset(style, k) {
    // k: 1 -> только что ударил, 0 -> покой
    switch (style) {
      case 'chop': return { rot: -k * .9, fwd: k * 6 };
      case 'smash': return { rot: -k * 1.15, fwd: k * 4 };
      case 'thrust': return { rot: k * .1, fwd: k * 16 };
      case 'shoot': return { rot: 0, fwd: -k * 9 };
      case 'twin': return { rot: Math.sin(k * Math.PI * 2) * .8, fwd: k * 8 };
      case 'double': return { rot: Math.sin(k * Math.PI * 3) * .95, fwd: k * 7 };
      case 'cast': return { rot: 0, fwd: k * 3 };
      default: return { rot: -k * .7, fwd: k * 5 };
    }
  }

  /* ---------------- юниты ---------------- */
  function drawUnit(u) {
    var isHero = u.team === 0;
    var invis = getBuff(u, 'invis');
    var A = ANIM[u.anim] || ANIM.heavy;
    var z = (u.airZ || 0);
    var bob = isHero ? Math.sin(u.step * A.bobF) * A.bobA + Math.sin(world.time * 1.6) * (A.hover ? A.hover * .35 : 0) - (A.hover || 0)
      : Math.sin(u.step * 1.4 + u.wob) * 2.2;
    var y = u.y + bob - z;

    // тень (мягкая, зависит от высоты)
    var shSc = 1 - Math.min(.55, z / 120);
    ctx.save();
    ctx.globalAlpha = .42 * shSc;
    var sg = ctx.createRadialGradient(u.x, u.y + u.r * .72, 1, u.x, u.y + u.r * .72, u.r * 1.15);
    sg.addColorStop(0, 'rgba(0,0,0,.85)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(u.x, u.y + u.r * .72, u.r * 1.15 * shSc, u.r * .42 * shSc, 0, 0, 6.2832); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = invis ? (isHero ? .3 : .25) : 1;

    // аура босса
    if (u.isBoss) {
      var pr = 1 + Math.sin(world.time * 3) * .07;
      var bg = ctx.createRadialGradient(u.x, y, u.r * .5, u.x, y, u.r * 2.5 * pr);
      bg.addColorStop(0, rgba(u.glow, .3)); bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(u.x, y, u.r * 2.5 * pr, 0, 6.2832); ctx.fill();
    }
    // свечение баффа
    var glowB = null;
    for (var gi = 0; gi < u.buffs.length; gi++) if (u.buffs[gi].glow) glowB = u.buffs[gi];
    if (glowB) {
      var gg = ctx.createRadialGradient(u.x, y, u.r * .4, u.x, y, u.r * 2);
      gg.addColorStop(0, rgba(glowB.glow, .3)); gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(u.x, y, u.r * 2, 0, 6.2832); ctx.fill();
    }

    ctx.translate(u.x, y);

    if (isHero) {
      var sw = swingOffset(A.swing, u.swing / .22);
      var lean = (u.vx || u.vy) ? A.lean * Math.sin(u.step * A.bobF * 2) : 0;
      var rot = u.face + (u.spin || 0) + sw.rot + lean;
      ctx.rotate(rot);
      ctx.translate(sw.fwd, 0);
      drawHero(u, u.flash > 0 ? mixWhite(u.c1, u.flash) : u.c1, u.c2);
      ctx.translate(-sw.fwd, 0);
      ctx.rotate(-rot);
      drawHeroIdleFx(u);
    } else {
      ctx.rotate(u.face + (u.spin || 0));
      drawEnemy(u, u.flash > 0 ? mixWhite(u.c1, u.flash) : u.c1, u.c2, u.glow);
    }
    ctx.restore();

    // индикаторы
    if (u === world.hero) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,199,67,.5)'; ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]); ctx.lineDashOffset = -world.time * 26;
      ctx.beginPath(); ctx.arc(u.x, u.y, u.r + 9, 0, 6.2832); ctx.stroke();
      ctx.restore();
    }
    if (getBuff(u, 'freeze')) glowRing(u, y, '#7fd4ff', 4);
    else if (getBuff(u, 'root')) glowRing(u, y, '#3f8f5a', 4);
    var sh = getBuff(u, 'shield');
    if (sh && sh.shield > 0) glowRing(u, y, '#b07dff', 10);
    if (getBuff(u, 'venom')) emit(u, '#7ac043');
    if (getBuff(u, 'ignite')) emit(u, '#ffb03a');

    // полоска здоровья
    if (u !== world.hero) {
      var bw = Math.max(32, u.r * 2.5), bh = u.isBoss ? 7 : 4;
      var bx = u.x - bw / 2, by = y - u.r - 15;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
      var pct = clamp(u.hp / u.maxHp, 0, 1);
      var hg = ctx.createLinearGradient(bx, by, bx, by + bh);
      hg.addColorStop(0, u.isBoss ? '#ff9a9a' : '#e88a6a'); hg.addColorStop(1, u.isBoss ? '#b01020' : '#8a2018');
      ctx.fillStyle = hg; ctx.fillRect(bx, by, bw * pct, bh);
      if (u.isBoss || u.isDummy) {
        ctx.textAlign = 'center'; ctx.font = '900 11px "Trebuchet MS",sans-serif';
        ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,.85)';
        ctx.strokeText(u.name.toUpperCase(), u.x, by - 6);
        ctx.fillStyle = u.isBoss ? '#ffd24a' : '#8b97bd'; ctx.fillText(u.name.toUpperCase(), u.x, by - 6);
      }
    }
  }

  function emit(u, c) {
    if (Math.random() < .35) world.parts.push({ x: u.x + rnd(-u.r, u.r), y: u.y, vx: rnd(-10, 10), vy: rnd(-46, -16), c: c, r: 1.9, t: 0, life: .55 });
  }
  function glowRing(u, y, color, off) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = .9;
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(u.x, y, u.r + off, 0, 6.2832); ctx.stroke();
    ctx.restore();
  }

  /* ---------------- силуэт героя ---------------- */
  function drawHero(u, c1, c2) {
    var r = u.r;
    // плащ/подложка
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.ellipse(-r * .25, 0, r * 1.05, r * .95, 0, 0, 6.2832); ctx.fill();
    // корпус с объёмом
    var g = ctx.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.15);
    g.addColorStop(0, mixWhite(typeof c1 === 'string' && c1[0] === '#' ? c1 : u.c1, .28));
    g.addColorStop(.62, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, 6.2832); ctx.stroke();
    // блик
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath(); ctx.ellipse(-r * .3, -r * .38, r * .38, r * .22, -.6, 0, 6.2832); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.94)';
    ctx.strokeStyle = 'rgba(255,255,255,.94)';
    switch (u.shape) {
      case 'brute':
        ctx.fillRect(r - 2, -3.5, r * .9, 7);
        ctx.beginPath(); ctx.arc(r * 1.78, 0, r * .3, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(200,200,210,.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-r * .5, 0); ctx.lineTo(r - 2, 0); ctx.stroke();
        break;
      case 'archer':
        ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.arc(r * .52, 0, r, -1.18, 1.18); ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(r * .54, -r * .9); ctx.lineTo(r * .54, r * .9); ctx.stroke();
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(r * .2, 0); ctx.lineTo(r * 1.5, 0); ctx.stroke();
        break;
      case 'berserk':
        ctx.beginPath();
        ctx.moveTo(r - 2, -3); ctx.lineTo(r * 1.45, -r * .85);
        ctx.lineTo(r * 1.95, -r * .1); ctx.lineTo(r * 1.45, r * .7); ctx.lineTo(r - 2, 3);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-r * .6, -r * .2); ctx.lineTo(-r * 1.5, -r * .55); ctx.lineTo(-r * 1.3, r * .1);
        ctx.closePath(); ctx.fill();
        break;
      case 'witch':
        ctx.fillRect(r - 4, -2.4, r * .85, 4.8);
        for (var i = 0; i < 3; i++) {
          var a = -.6 + i * .6;
          ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.55, Math.sin(a) * r * 1.55, r * .18, 0, 6.2832); ctx.fill();
        }
        break;
      case 'knight':
        ctx.beginPath();
        ctx.moveTo(r - 2, -3.2); ctx.lineTo(r * 2.05, -1.6); ctx.lineTo(r * 2.05, 1.6); ctx.lineTo(r - 2, 3.2);
        ctx.closePath(); ctx.fill();
        ctx.fillRect(r * .82, -r * .55, 4, r * 1.1);
        ctx.beginPath();
        ctx.moveTo(-r * .7, -r * .7); ctx.lineTo(-r * 1.4, -r * .35);
        ctx.lineTo(-r * 1.4, r * .35); ctx.lineTo(-r * .7, r * .7);
        ctx.closePath(); ctx.fill();
        break;
      case 'rogue':
        ctx.beginPath();
        ctx.moveTo(r - 3, -r * .52); ctx.lineTo(r * 1.85, -r * .22); ctx.lineTo(r - 3, -r * .04);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r - 3, r * .52); ctx.lineTo(r * 1.85, r * .22); ctx.lineTo(r - 3, r * .04);
        ctx.closePath(); ctx.fill();
        break;
      case 'dryad':
        ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.arc(r * .5, 0, r * .98, -1.15, 1.15); ctx.stroke();
        for (var d = 0; d < 3; d++) {
          ctx.beginPath();
          ctx.ellipse(-r * .55 - d * 4, (d - 1) * r * .52, r * .32, r * .15, (d - 1) * .6, 0, 6.2832);
          ctx.fill();
        }
        break;
      case 'mage':
        ctx.fillRect(r - 4, -2.6, r * .95, 5.2);
        ctx.beginPath();
        ctx.moveTo(r * 1.95, 0); ctx.lineTo(r * 1.5, -r * .5);
        ctx.lineTo(r * 1.05, 0); ctx.lineTo(r * 1.5, r * .5);
        ctx.closePath(); ctx.fill();
        break;
      case 'pyro':
        ctx.fillRect(r - 4, -2.6, r * .82, 5.2);
        ctx.beginPath();
        ctx.moveTo(r * 1.8, 0);
        ctx.quadraticCurveTo(r * 1.45, -r * .6, r * 1.12, 0);
        ctx.quadraticCurveTo(r * 1.45, r * .6, r * 1.8, 0);
        ctx.fill();
        break;
      case 'golem':
        ctx.fillRect(r * .5, -r * .95, r * .55, r * .6);
        ctx.fillRect(r * .5, r * .35, r * .55, r * .6);
        ctx.beginPath(); ctx.arc(r * 1.4, 0, r * .38, 0, 6.2832); ctx.fill();
        break;
    }
    // «глаза»
    ctx.fillStyle = 'rgba(10,10,16,.72)';
    ctx.beginPath(); ctx.arc(r * .32, -r * .3, r * .15, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .32, r * .3, r * .15, 0, 6.2832); ctx.fill();
  }

  // индивидуальные эффекты покоя — у каждого героя свои
  function drawHeroIdleFx(u) {
    var t = world.time, r = u.r, i, a;
    switch (u.anim) {
      case 'orbit':
        // три реагента вращаются вокруг Аркана
        var cols = { F: '#ff5a2f', I: '#7fd4ff', S: '#c9a0ff' };
        var reg = u.reagents || [];
        for (i = 0; i < 3; i++) {
          a = t * 1.8 + i * 2.094;
          var rr = r * 1.75, px = Math.cos(a) * rr, py = Math.sin(a) * rr * .45;
          var col = reg[i] ? cols[reg[i]] : 'rgba(150,140,200,.35)';
          ctx.shadowColor = col; ctx.shadowBlur = reg[i] ? 14 : 0;
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(px, py, reg[i] ? 5.5 : 3, 0, 6.2832); ctx.fill();
          ctx.shadowBlur = 0;
        }
        break;
      case 'flame':
        ctx.globalCompositeOperation = 'lighter';
        for (i = 0; i < 3; i++) {
          a = t * 3 + i * 2.1;
          var fr = r * (.9 + Math.sin(a) * .25);
          ctx.fillStyle = 'rgba(255,120,40,.28)';
          ctx.beginPath(); ctx.arc(Math.cos(a) * r * .9, Math.sin(a * 1.3) * r * .5 - r * .2, fr * .38, 0, 6.2832); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        if (Math.random() < .3) world.embers.push({ x: u.x + rnd(-r, r), y: u.y, vy: rnd(-52, -22), c: '#ff8a3a', t: 0, life: .8, r: 1.7 });
        break;
      case 'stone':
        for (i = 0; i < 3; i++) {
          a = t * .9 + i * 2.094;
          ctx.fillStyle = '#6a5a44';
          ctx.save();
          ctx.translate(Math.cos(a) * r * 1.6, Math.sin(a) * r * .5 - r * .5);
          ctx.rotate(a * 2);
          ctx.fillRect(-4, -4, 8, 8);
          ctx.restore();
        }
        break;
      case 'float':
        ctx.strokeStyle = 'rgba(127,212,255,.28)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, r * .8, r * 1.2, r * .35, 0, 0, 6.2832); ctx.stroke();
        if (Math.random() < .18) world.parts.push({ x: u.x + rnd(-r, r), y: u.y + r * .5, vx: rnd(-6, 6), vy: rnd(-26, -8), c: 'rgba(160,230,255,.6)', r: 1.6, t: 0, life: .8 });
        break;
      case 'frenzy':
        if (u.hp / u.maxHp < .5 && Math.random() < .25) {
          world.parts.push({ x: u.x + rnd(-r, r), y: u.y + rnd(-r, r), vx: rnd(-20, 20), vy: rnd(-40, -10), c: '#ff4d5e', r: 2, t: 0, life: .5 });
        }
        break;
      case 'swift':
        // шлейф теней
        if (Math.abs(u.vx) + Math.abs(u.vy) > .5 && Math.random() < .4) {
          world.corpses.push({ x: u.x, y: u.y, r: r * .8, c: u.c2, glow: u.c1, t: 0, life: .3 });
        }
        break;
      case 'nimble':
        if (Math.random() < .12) world.parts.push({ x: u.x + rnd(-r, r), y: u.y, vx: rnd(-8, 8), vy: rnd(-20, -6), c: 'rgba(140,220,120,.6)', r: 1.8, t: 0, life: .9 });
        break;
      case 'charge':
        ctx.strokeStyle = 'rgba(255,60,60,.25)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.35 + Math.sin(t * 4) * 2, 0, 6.2832); ctx.stroke();
        break;
      case 'heavy':
        if (Math.random() < .06) world.parts.push({ x: u.x + rnd(-r, r), y: u.y + r * .6, vx: rnd(-5, 5), vy: rnd(-8, -2), c: 'rgba(120,60,50,.5)', r: 2.2, t: 0, life: .7 });
        break;
      case 'draw':
        ctx.strokeStyle = 'rgba(255,200,80,.2)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.5, u.face - .5, u.face + .5); ctx.stroke();
        break;
    }
    // вспышка при касте
    if (u.castFx > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = u.castFx;
      var cg = ctx.createRadialGradient(0, 0, r * .3, 0, 0, r * 2.4);
      cg.addColorStop(0, 'rgba(255,255,255,.5)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
  }

  /* ---------------- силуэт врага (угловатый, чужой) ---------------- */
  function drawEnemy(u, c1, c2, glow) {
    var r = u.r, t = world.time, i, a, rr;
    ctx.save();

    // тёмная угловатая масса
    ctx.fillStyle = c2;
    ctx.beginPath();
    var spikes = u.shape === 'e_swarm' ? 5 : 9;
    for (i = 0; i < spikes; i++) {
      a = i / spikes * 6.2832;
      rr = r * (i % 2 ? 1.28 : .78) * (1 + Math.sin(t * 3 + i + u.wob) * .04);
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();

    // внутреннее ядро
    var g = ctx.createRadialGradient(0, 0, r * .1, 0, 0, r * .95);
    g.addColorStop(0, mixWhite(u.c1, .18)); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (i = 0; i < 6; i++) {
      a = i / 6 * 6.2832 + .4;
      rr = r * .72;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.6; ctx.stroke();

    // светящиеся глаза-щели
    ctx.shadowColor = glow; ctx.shadowBlur = 12;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(r * .2, -r * .34); ctx.lineTo(r * .72, -r * .2); ctx.lineTo(r * .2, -r * .1);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * .2, r * .34); ctx.lineTo(r * .72, r * .2); ctx.lineTo(r * .2, r * .1);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // приметы вида
    ctx.fillStyle = glow; ctx.strokeStyle = glow;
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
        var pulse = .5 + Math.sin(t * 9 + u.wob) * .5;
        ctx.globalAlpha = .35 + pulse * .5;
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
          ctx.moveTo(r * .5, i * r * .5); ctx.lineTo(r * 1.6, i * r * .25); ctx.stroke();
        }
        break;
      case 'e_dummy':
        ctx.lineWidth = 2.5; ctx.globalAlpha = .55;
        for (i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (i / 3.4), 0, 6.2832); ctx.stroke(); }
        ctx.globalAlpha = 1;
        break;
      case 'e_boss_bone':
      case 'e_boss_maw':
      case 'e_boss_void':
      case 'e_boss_forge':
        // корона шипов
        ctx.lineWidth = 3;
        for (i = 0; i < 8; i++) {
          a = i / 8 * 6.2832 + t * .4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05);
          ctx.lineTo(Math.cos(a) * r * 1.55, Math.sin(a) * r * 1.55);
          ctx.stroke();
        }
        ctx.globalAlpha = .5;
        ctx.beginPath(); ctx.arc(0, 0, r * .45, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
        break;
    }
    ctx.restore();
  }

  /* ================= портрет ================= */
  function portrait(canvasEl, def) {
    var c = canvasEl.getContext('2d'), s = canvasEl.width;
    c.clearRect(0, 0, s, s);
    var g = c.createRadialGradient(s * .5, s * .34, s * .04, s * .5, s * .5, s * .78);
    g.addColorStop(0, def.c1); g.addColorStop(.5, def.c2); g.addColorStop(1, '#070a12');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
    var prev = ctx; ctx = c;
    c.save(); c.translate(s / 2, s / 2); c.rotate(-.45);
    var fake = { r: s * .29, shape: def.shape, c1: def.c1, c2: def.c2, glow: def.glow, wob: 0 };
    if (def.enemy) drawEnemy(fake, def.c1, def.c2, def.glow || '#ff5a4a');
    else drawHero(fake, def.c1, def.c2);
    c.restore();
    ctx = prev;
  }

  /* ================= API ================= */
  root.GameAPI = {
    nearestEnemy: nearestEnemy, pickTarget: pickTarget, lowestHpEnemy: lowestHpEnemy,
    bestCluster: bestCluster, forEachEnemy: forEachEnemy,
    damage: damage, heal: heal, aoeDamage: aoeDamage, aoeAt: aoeAt, aoeApply: aoeApply,
    projectile: projectile, pull: pull, blinkBehind: blinkBehind, dashTo: dashTo, leapTo: leapTo,
    knockback: knockback, recoil: recoil, buff: addBuff, execute: execute,
    chainLightning: chainLightning, telegraph: telegraph, zone: zone, wall: wall, cone: cone,
    burst: burst, ring: ring, aura: aura, slash: slash, shake: shake, flash: flash,
    hitstop: hitstop, sparkle: sparkle, spinBurst: spinBurst, pillar: pillar, delay: delay,
    addReagent: addReagent, toast: toast
  };

  root.ENGINE = {
    world: world, input: input, SFX: SFX, ANIM: ANIM,
    setup: function (canvas, callbacks) {
      cv = canvas; cb = callbacks || {};
      resize();
      root.addEventListener('resize', resize);
      root.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
      if (!raf) raf = requestAnimationFrame(step);
    },
    resize: resize, recalc: recalc, makeHero: makeHero, castSkill: castSkill,
    castInvoke: castInvoke, invokePower: invokePower, elemLevel: elemLevel,
    skillCd: skillCd, spawnWave: spawnWave, portrait: portrait, getBuff: getBuff,
    setShake: function (v) { shakeOn = v; },

    startRun: function (hero, training) {
      ['units', 'proj', 'parts', 'floats', 'rings', 'tele', 'bolts', 'slashes', 'corpses',
        'sparks', 'zones', 'walls', 'cones', 'pillars', 'embers', 'timers'].forEach(function (k) { world[k].length = 0; });
      world.dmgWindow.length = 0; world.dps = 0;
      world.training = !!training;
      world.wave = 1; world.kills = 0; world.gold = training ? 999999 : 700;
      world.over = false; world.hitstop = 0;
      buildMap(training ? 'training' : hero.defId);
      world.hero = hero;
      hero.x = W / 2; hero.y = (H + TOP) / 2; hero.dead = false;
      hero.reagents = []; hero.invokeCds = {};
      world.units.push(hero);
      world.running = true; world.paused = false;
      if (training) {
        for (var i = 0; i < 3; i++) {
          var d = makeDummy();
          d.x = W / 2 + (i - 1) * 130; d.y = (H + TOP) / 2 - 150;
          confine(d); world.units.push(d);
        }
      } else spawnWave();
    },
    spawnTrainingEnemy: function (kind) {
      if (!world.training) return;
      var def = kind === 'boss' ? D.BOSSES[Math.floor(Math.random() * D.BOSSES.length)] : D.rollEnemy(20);
      var e = makeEnemy(def, kind === 'boss');
      spawnAt(e); world.units.push(e);
    },
    clearTrainingEnemies: function () {
      for (var i = world.units.length - 1; i >= 0; i--) {
        var u = world.units[i];
        if (u.team === 1 && !u.isDummy) world.units.splice(i, 1);
      }
    },
    nextWave: function () {
      world.wave++;
      world.running = true; world.paused = false;
      var h = world.hero;
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .35);
      h.mp = h.maxMp;
      spawnWave();
    },
    revive: function () {
      var h = world.hero;
      h.dead = false; h.buffs.length = 0; recalc(h);
      h.hp = h.maxHp; h.mp = h.maxMp;
      h.x = W / 2; h.y = (H + TOP) / 2;
      world.over = false; world.running = true; world.paused = false;
      for (var i = 0; i < world.units.length; i++) {
        var e = world.units[i];
        if (e.team === 1 && !e.dead) pull(e, h, 340);
      }
      ring(h.x, h.y, 290, '#ffd24a'); flash('#ffd24a', .32);
    },
    pause: function (v) { world.paused = v; },
    stop: function () { world.running = false; },
    W: function () { return W; }, H: function () { return H; }
  };

})(window);
