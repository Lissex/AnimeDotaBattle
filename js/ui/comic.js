/* ui/comic — глава истории после убитого босса.
   Панели рисуются процедурно: своя палитра под настроение,
   силуэт героя и рваная рамка. Никаких внешних картинок. */
AA.module('ui/comic', (function () {
  'use strict';

  var MOODS = {
    dark: ['#1a1626', '#08060e', '#6a5a8a'],
    blood: ['#3a0e14', '#120406', '#d84040'],
    frost: ['#12304a', '#050e1a', '#8ad8ff'],
    fire: ['#3a1606', '#140602', '#ff8a3a'],
    void: ['#1c1440', '#080618', '#c9a0ff'],
    forest: ['#12321e', '#05120a', '#8fd66a'],
    storm: ['#141c3a', '#060a18', '#a0d8ff'],
    gold: ['#3a2c0c', '#140e04', '#ffd76a']
  };

  var pending = null;

  function D() { return AA.UI.dom; }

  /** Фон панели: градиент, лучи и силуэт героя. */
  function paint(canvas, mood, heroDef) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var pal = MOODS[mood] || MOODS.dark;

    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, pal[0]);
    g.addColorStop(1, pal[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // косые лучи — комиксовая динамика
    ctx.save();
    ctx.globalAlpha = .12;
    ctx.strokeStyle = pal[2];
    ctx.lineWidth = w * .04;
    for (var i = -2; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w * .18, 0);
      ctx.lineTo(i * w * .18 - w * .3, h);
      ctx.stroke();
    }
    ctx.restore();

    // силуэт героя
    if (heroDef) {
      ctx.save();
      ctx.globalAlpha = .9;
      ctx.translate(w * .5, h * .78);
      var mock = {
        r: h * .3, shape: heroDef.shape, anim: heroDef.anim,
        c1: pal[2], c2: pal[1], face: -.3,
        vx: 0, vy: 0, step: 0, swing: 0, flash: 0
      };
      AA.Render.shapes.hero(ctx, mock, 0);
      ctx.restore();
    }

    // виньетка
    var v = ctx.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, h);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.65)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  function render(chapter, heroDef) {
    var d = D();
    d.$('comic-title').textContent = chapter.title;
    var box = d.$('comic-panels');
    box.innerHTML = '';

    chapter.panels.forEach(function (panel, i) {
      var card = d.el('div', 'comic-panel');
      var cv = document.createElement('canvas');
      cv.width = 420; cv.height = 240;
      cv.className = 'comic-art';
      paint(cv, panel.mood, i === chapter.panels.length - 1 ? heroDef : null);
      card.appendChild(cv);
      card.appendChild(d.el('div', 'comic-text', panel.text));
      card.style.animationDelay = (i * .18) + 's';
      box.appendChild(card);
    });
  }

  /** Показать главу за убитого босса. Возвращает true, если что-то показали. */
  function show(bossIndex) {
    var d = D(), save = d.save();
    var w = AA.Game.world.state;
    var hero = w.hero;
    if (!hero || !hero.defId) return false;

    var chapter = AA.Content.story.chapter(hero.defId, bossIndex);
    if (!chapter) return false;

    var seen = save.story[hero.defId] || 0;
    if (bossIndex > seen) {
      save.story[hero.defId] = bossIndex;
      AA.Platform.storage.commit(true);
    }

    render(chapter, AA.Content.heroes.get(hero.defId));
    AA.UI.screens.open('comic');
    return true;
  }

  /** Отложенный показ: сначала лавка, потом глава — иначе перебивают друг друга. */
  function queue(bossIndex) { pending = bossIndex; }
  function flush() {
    if (pending === null) return false;
    var idx = pending;
    pending = null;
    return show(idx);
  }

  function bind() {
    D().$('btn-comic-close').onclick = function () { AA.UI.screens.close('comic'); };
  }

  return { show: show, queue: queue, flush: flush, bind: bind, paint: paint };
})());
