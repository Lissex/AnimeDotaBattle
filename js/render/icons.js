/* ============================================================
   render/icons — процедурные иконки предметов и умений.

   Вместо эмодзи собственная библиотека глифов: два десятка
   базовых форм, каждая рисуется вектором в любом размере и
   красится в цвет умения или редкости предмета. Файлов на диске
   по-прежнему ноль.

   Глиф выбирается по id, поэтому новому предмету достаточно
   строки в GLYPH_OF — рисовать заново ничего не нужно.
   ============================================================ */
AA.module('render/icons', (function () {
  'use strict';

  function M() { return AA.Core.math; }

  /* ------------------------------------------------------------
     БАЗОВЫЕ ГЛИФЫ
     Рисуются в системе координат -1..1, масштаб задаёт вызов.
     ------------------------------------------------------------ */
  var GLYPHS = {

    sword: function (c) {
      c.beginPath();
      c.moveTo(0, -.85); c.lineTo(.16, -.5); c.lineTo(.16, .35);
      c.lineTo(-.16, .35); c.lineTo(-.16, -.5); c.closePath(); c.fill();
      c.fillRect(-.45, .35, .9, .13);            // гарда
      c.fillRect(-.1, .48, .2, .34);             // рукоять
    },

    axe: function (c) {
      c.fillRect(-.08, -.75, .16, 1.55);         // древко
      c.beginPath();
      c.moveTo(.05, -.6);
      c.quadraticCurveTo(.85, -.35, .6, .2);
      c.quadraticCurveTo(.3, -.15, .05, -.1);
      c.closePath(); c.fill();
    },

    hammer: function (c) {
      c.fillRect(-.08, -.3, .16, 1.1);
      c.beginPath();
      c.moveTo(-.62, -.75); c.lineTo(.62, -.75);
      c.lineTo(.48, -.18); c.lineTo(-.48, -.18);
      c.closePath(); c.fill();
    },

    dagger: function (c) {
      c.beginPath();
      c.moveTo(0, -.9); c.lineTo(.14, -.2); c.lineTo(0, .1);
      c.lineTo(-.14, -.2); c.closePath(); c.fill();
      c.fillRect(-.34, .1, .68, .11);
      c.fillRect(-.08, .21, .16, .5);
    },

    bow: function (c) {
      c.lineWidth = .16; c.lineCap = 'round';
      c.beginPath(); c.arc(.18, 0, .74, 2.1, 4.18); c.stroke();
      c.lineWidth = .06;
      c.beginPath(); c.moveTo(-.18, -.68); c.lineTo(-.18, .68); c.stroke();
      c.lineWidth = .09;
      c.beginPath(); c.moveTo(-.5, 0); c.lineTo(.6, 0); c.stroke();
    },

    arrow: function (c) {
      c.lineWidth = .12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-.6, .6); c.lineTo(.55, -.55); c.stroke();
      c.beginPath();
      c.moveTo(.8, -.8); c.lineTo(.3, -.66); c.lineTo(.66, -.3);
      c.closePath(); c.fill();
    },

    shield: function (c) {
      c.beginPath();
      c.moveTo(0, -.85);
      c.lineTo(.7, -.55); c.lineTo(.7, .18);
      c.quadraticCurveTo(.5, .7, 0, .88);
      c.quadraticCurveTo(-.5, .7, -.7, .18);
      c.lineTo(-.7, -.55);
      c.closePath(); c.fill();
    },

    helm: function (c) {
      c.beginPath();
      c.moveTo(-.62, .5); c.lineTo(-.62, -.2);
      c.quadraticCurveTo(0, -.95, .62, -.2);
      c.lineTo(.62, .5);
      c.closePath(); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.fillRect(-.42, -.12, .84, .2);
      c.globalCompositeOperation = 'source-over';
    },

    boot: function (c) {
      c.beginPath();
      c.moveTo(-.3, -.8); c.lineTo(.18, -.8); c.lineTo(.22, .25);
      c.lineTo(.8, .35); c.lineTo(.8, .78); c.lineTo(-.3, .78);
      c.closePath(); c.fill();
    },

    orb: function (c) {
      c.beginPath(); c.arc(0, 0, .62, 0, 6.2832); c.fill();
      c.globalAlpha *= .5;
      c.beginPath(); c.arc(-.2, -.22, .2, 0, 6.2832);
      c.fillStyle = '#ffffff'; c.fill();
      c.globalAlpha *= 2;
    },

    crystal: function (c) {
      c.beginPath();
      c.moveTo(0, -.88); c.lineTo(.5, -.15); c.lineTo(.28, .8);
      c.lineTo(-.28, .8); c.lineTo(-.5, -.15);
      c.closePath(); c.fill();
    },

    flame: function (c) {
      c.beginPath();
      c.moveTo(0, -.9);
      c.quadraticCurveTo(.62, -.15, .34, .45);
      c.quadraticCurveTo(.2, .82, 0, .85);
      c.quadraticCurveTo(-.2, .82, -.34, .45);
      c.quadraticCurveTo(-.62, -.15, 0, -.9);
      c.fill();
    },

    snowflake: function (c) {
      c.lineWidth = .13; c.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        var a = i * Math.PI / 3;
        c.beginPath();
        c.moveTo(-Math.cos(a) * .8, -Math.sin(a) * .8);
        c.lineTo(Math.cos(a) * .8, Math.sin(a) * .8);
        c.stroke();
      }
      c.lineWidth = .09;
      for (i = 0; i < 6; i++) {
        var b = i * Math.PI / 3;
        c.beginPath();
        c.moveTo(Math.cos(b) * .48, Math.sin(b) * .48);
        c.lineTo(Math.cos(b) * .48 + Math.cos(b + 1) * .26,
          Math.sin(b) * .48 + Math.sin(b + 1) * .26);
        c.stroke();
      }
    },

    bolt: function (c) {
      c.beginPath();
      c.moveTo(.24, -.9); c.lineTo(-.42, .06); c.lineTo(-.02, .06);
      c.lineTo(-.24, .9); c.lineTo(.44, -.1); c.lineTo(.04, -.1);
      c.closePath(); c.fill();
    },

    leaf: function (c) {
      c.beginPath();
      c.moveTo(0, .85);
      c.quadraticCurveTo(-.85, .1, 0, -.85);
      c.quadraticCurveTo(.85, .1, 0, .85);
      c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.lineWidth = .07;
      c.beginPath(); c.moveTo(0, .8); c.lineTo(0, -.7); c.stroke();
      c.globalCompositeOperation = 'source-over';
    },

    drop: function (c) {
      c.beginPath();
      c.moveTo(0, -.85);
      c.quadraticCurveTo(.62, .05, .4, .45);
      c.arc(0, .45, .4, 0, Math.PI);
      c.quadraticCurveTo(-.62, .05, 0, -.85);
      c.fill();
    },

    skull: function (c) {
      c.beginPath();
      c.arc(0, -.15, .58, Math.PI, 0);
      c.lineTo(.42, .38); c.lineTo(-.42, .38);
      c.closePath(); c.fill();
      c.fillRect(-.34, .42, .68, .24);
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(-.22, -.12, .16, 0, 6.2832); c.fill();
      c.beginPath(); c.arc(.22, -.12, .16, 0, 6.2832); c.fill();
      c.globalCompositeOperation = 'source-over';
    },

    heart: function (c) {
      c.beginPath();
      c.moveTo(0, .78);
      c.quadraticCurveTo(-.95, .05, -.42, -.55);
      c.quadraticCurveTo(-.08, -.85, 0, -.35);
      c.quadraticCurveTo(.08, -.85, .42, -.55);
      c.quadraticCurveTo(.95, .05, 0, .78);
      c.fill();
    },

    ring: function (c) {
      c.lineWidth = .22;
      c.beginPath(); c.arc(0, .1, .55, 0, 6.2832); c.stroke();
      c.beginPath();
      c.moveTo(0, -.9); c.lineTo(.24, -.5); c.lineTo(-.24, -.5);
      c.closePath(); c.fill();
    },

    book: function (c) {
      c.fillRect(-.7, -.62, 1.4, 1.24);
      c.globalCompositeOperation = 'destination-out';
      c.fillRect(-.06, -.62, .12, 1.24);
      c.fillRect(-.55, -.4, .38, .1);
      c.fillRect(.17, -.4, .38, .1);
      c.globalCompositeOperation = 'source-over';
    },

    potion: function (c) {
      c.fillRect(-.18, -.85, .36, .28);
      c.beginPath();
      c.moveTo(-.16, -.55); c.lineTo(-.5, .1);
      c.quadraticCurveTo(-.5, .82, 0, .82);
      c.quadraticCurveTo(.5, .82, .5, .1);
      c.lineTo(.16, -.55);
      c.closePath(); c.fill();
    },

    star: function (c) {
      c.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var r = i % 2 ? .34 : .85;
        if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.fill();
    },

    spiral: function (c) {
      c.lineWidth = .15; c.lineCap = 'round';
      c.beginPath();
      for (var i = 0; i <= 40; i++) {
        var t = i / 40, a = t * 7, r = t * .85;
        var x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    },

    eye: function (c) {
      c.beginPath();
      c.moveTo(-.85, 0);
      c.quadraticCurveTo(0, -.72, .85, 0);
      c.quadraticCurveTo(0, .72, -.85, 0);
      c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(0, 0, .26, 0, 6.2832); c.fill();
      c.globalCompositeOperation = 'source-over';
      c.beginPath(); c.arc(0, 0, .14, 0, 6.2832); c.fill();
    },

    hook: function (c) {
      c.lineWidth = .16; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-.75, -.6); c.lineTo(.1, -.6); c.stroke();
      c.beginPath(); c.arc(.1, -.05, .55, -1.5, 2.6); c.stroke();
    },

    fist: function (c) {
      c.beginPath();
      c.moveTo(-.6, -.4); c.lineTo(.42, -.55); c.lineTo(.68, 0);
      c.lineTo(.42, .55); c.lineTo(-.6, .4);
      c.closePath(); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.lineWidth = .07;
      for (var i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(-.1, i * .26 - .06); c.lineTo(.4, i * .3 - .06);
        c.stroke();
      }
      c.globalCompositeOperation = 'source-over';
    },

    swirl: function (c) {
      c.lineWidth = .17; c.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        var a = i * 2.094;
        c.beginPath();
        c.arc(0, 0, .62, a, a + 1.5);
        c.stroke();
      }
    },

    cloud: function (c) {
      c.beginPath();
      c.arc(-.34, .1, .36, 0, 6.2832);
      c.arc(.06, -.16, .46, 0, 6.2832);
      c.arc(.44, .12, .34, 0, 6.2832);
      c.fill();
      c.fillRect(-.34, .05, .8, .38);
    },

    mask: function (c) {
      c.beginPath();
      c.moveTo(-.66, -.5);
      c.quadraticCurveTo(0, -.85, .66, -.5);
      c.quadraticCurveTo(.5, .7, 0, .85);
      c.quadraticCurveTo(-.5, .7, -.66, -.5);
      c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.ellipse(-.26, -.14, .18, .12, .2, 0, 6.2832); c.fill();
      c.beginPath(); c.ellipse(.26, -.14, .18, .12, -.2, 0, 6.2832); c.fill();
      c.globalCompositeOperation = 'source-over';
    },

    thorn: function (c) {
      c.lineWidth = .12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-.7, .7); c.lineTo(.55, -.6); c.stroke();
      for (var i = 0; i < 3; i++) {
        var t = .2 + i * .28;
        var x = -.7 + t * 1.25, y = .7 - t * 1.3;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + (i % 2 ? .3 : -.14), y + (i % 2 ? .1 : -.3));
        c.stroke();
      }
    },

    rock: function (c) {
      c.beginPath();
      c.moveTo(-.75, .2); c.lineTo(-.4, -.6); c.lineTo(.3, -.75);
      c.lineTo(.78, -.1); c.lineTo(.5, .68); c.lineTo(-.42, .7);
      c.closePath(); c.fill();
    },

    wing: function (c) {
      c.beginPath();
      c.moveTo(-.8, .55);
      c.quadraticCurveTo(-.3, -.9, .8, -.55);
      c.quadraticCurveTo(.1, -.1, -.1, .7);
      c.closePath(); c.fill();
    },

    clock: function (c) {
      c.lineWidth = .16;
      c.beginPath(); c.arc(0, 0, .72, 0, 6.2832); c.stroke();
      c.lineWidth = .12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -.42); c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(.36, .18); c.stroke();
    }
  };

  /* ------------------------------------------------------------
     СООТВЕТСТВИЕ: что чем рисуется
     ------------------------------------------------------------ */
  var GLYPH_OF = {
    /* --- предметы --- */
    i_str: 'fist', i_agi: 'wing', i_int: 'ring',
    blade: 'sword', mail: 'shield', boots: 'boot',
    vitality: 'heart', crystal: 'crystal', quiver: 'arrow', shieldw: 'shield',
    fang: 'dagger', gauntlet: 'bolt', cloak: 'wing', staff: 'orb',
    hammer: 'hammer', plate: 'helm', chalice: 'potion', talons: 'thorn',
    lantern: 'eye', brooch: 'star',
    fury: 'sword', travel: 'boot', aegis: 'shield', crown: 'ring',
    maul: 'hammer', veil: 'cloud',
    heart: 'heart', scythe: 'axe', grimoire: 'book', bulwark: 'shield',
    shard: 'crystal',
    /* --- артефакты --- */
    a_reaper: 'axe', a_bastion: 'shield', a_omniscience: 'book',
    a_titanpulse: 'heart', a_tempest: 'boot', a_eclipse: 'cloud',
    a_bloodmoon: 'drop', a_falconer: 'eye', a_aghanim: 'crystal',

    /* --- умения: Мясник --- */
    hook: 'hook', rot: 'cloud', dismember: 'dagger', feast: 'skull',
    /* --- Егерь --- */
    volley: 'arrow', hawkeye: 'eye', pierceshot: 'bow', marks: 'star',
    /* --- Берсерк --- */
    leap: 'boot', cleave: 'axe', frenzy: 'flame', bloodrage: 'drop',
    /* --- Хладна --- */
    nova: 'snowflake', shackle: 'crystal', hail: 'cloud', chill: 'swirl',
    /* --- Кровавый Рыцарь --- */
    charge: 'shield', crimson: 'drop', bloodoath: 'dagger', bloodpact: 'heart',
    /* --- Клинок Тени --- */
    dash: 'bolt', eclipse: 'mask', bladefan: 'swirl', bloodlust: 'drop',
    /* --- Дриада --- */
    venom: 'drop', roots: 'thorn', thorntrap: 'leaf', grace: 'leaf',
    /* --- Аркан --- */
    elemFire: 'flame', elemIce: 'snowflake', elemStorm: 'bolt', arcana: 'orb',
    /* --- Пиромант --- */
    firewave: 'flame', ignite: 'flame', flameaura: 'swirl', innerheat: 'star',
    /* --- Голем --- */
    slam: 'fist', quake: 'rock', boulder: 'rock', stoneskin: 'shield',
    /* --- Демон Клинков --- */
    reflection: 'mask', splinter: 'spiral', metamorph: 'wing', sunder: 'clock',
    /* --- Зодчий Пустоты --- */
    curse: 'ring', sacrifice: 'skull', singularity: 'spiral', gravity: 'swirl',
    /* --- Хищник Глубин --- */
    darkpact: 'swirl', pounce: 'thorn', shadowdance: 'cloud', essence: 'drop',
    /* --- Жнец Душ --- */
    rend: 'bolt', soulfeast: 'heart', requiem: 'star', harvest: 'skull'
  };

  /* ------------------------------------------------------------
     ОТРИСОВКА
     ------------------------------------------------------------ */

  /** Внутренний фон плитки: диагональный градиент под цвет. */
  function tile(ctx, size, color, dark) {
    var m = M();
    var g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, m.mixWhite(color, .22));
    g.addColorStop(.55, color);
    g.addColorStop(1, dark || 'rgba(0,0,0,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // мягкий блик сверху
    var s = ctx.createLinearGradient(0, 0, 0, size * .55);
    s.addColorStop(0, 'rgba(255,255,255,.22)');
    s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, size, size * .55);
  }

  /**
   * Нарисовать иконку в готовый холст.
   * @param {HTMLCanvasElement} canvas
   * @param {string} id      id предмета или умения
   * @param {string} color   основной цвет
   * @param {string} [frame] цвет рамки (редкость)
   */
  function draw(canvas, id, color, frame) {
    var ctx = canvas.getContext('2d');
    var size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    tile(ctx, size, color);

    var glyph = GLYPHS[GLYPH_OF[id] || 'star'] || GLYPHS.star;
    var scale = size * .3;

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(scale, scale);

    // тень глифа, чтобы читался на любом фоне
    ctx.save();
    ctx.translate(.08, .1);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    glyph(ctx);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    glyph(ctx);
    ctx.restore();

    // рамка
    if (frame) {
      ctx.strokeStyle = frame;
      ctx.lineWidth = Math.max(2, size * .055);
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2,
        size - ctx.lineWidth, size - ctx.lineWidth);
    }
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(.5, .5, size - 1, size - 1);
  }

  /** Готовый <canvas> — удобно вставлять в разметку. */
  function element(size, id, color, frame) {
    var c = document.createElement('canvas');
    c.width = c.height = size * 2;
    c.style.width = c.style.height = '100%';
    c.className = 'icon-canvas';
    draw(c, id, color, frame);
    return c;
  }

  /** Есть ли для id свой глиф — иначе стоит показать запасной символ. */
  function has(id) { return !!GLYPH_OF[id]; }

  return { draw: draw, element: element, has: has, GLYPHS: GLYPHS, GLYPH_OF: GLYPH_OF };
})());
