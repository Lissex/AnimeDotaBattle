/* core/math — числа, векторы, цвета. Ни от чего не зависит. */
AA.module('core/math', (function () {
  'use strict';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

  /** Разница углов в диапазоне [0, PI]. */
  function angleDiff(a, b) {
    return Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  }

  /** Детерминированный генератор — карты выглядят одинаково при каждом запуске. */
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function seedFromString(str) {
    var s = 0;
    for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
    return s;
  }

  var _id = 0;
  function uid() { return ++_id; }

  /* ---- цвета ---- */
  function hex2rgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(h, a) {
    if (h.charAt(0) !== '#') return h;
    var c = hex2rgb(h);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function mixWhite(h, k) {
    if (h.charAt(0) !== '#') return h;
    var c = hex2rgb(h);
    return 'rgb(' +
      Math.round(c[0] + (255 - c[0]) * k) + ',' +
      Math.round(c[1] + (255 - c[1]) * k) + ',' +
      Math.round(c[2] + (255 - c[2]) * k) + ')';
  }

  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }

  return {
    rnd: rnd, clamp: clamp, lerp: lerp,
    dist: dist, d2: d2, angleTo: angleTo, angleDiff: angleDiff,
    seeded: seeded, seedFromString: seedFromString, uid: uid,
    hex2rgb: hex2rgb, rgba: rgba, mixWhite: mixWhite, fmt: fmt
  };
})());
