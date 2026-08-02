/* content/skins — облики героев.

   Три ступени:
     default   — бесплатный, намеренно скромный: тусклые цвета, без эффектов
     rare      — покупается за души, яркая палитра и свечение оружия
     immortal  — открывается за просмотр рекламы, полный сет:
                 своя палитра, шлейф оружия, аура и частицы

   Скин меняет только палитру и эффекты, силуэт и умения те же. */
AA.module('content/skins', (function () {
  'use strict';

  /**
   * fx: тип эффекта имморталки
   *   trail  — светящийся шлейф за оружием
   *   embers — искры вокруг героя
   *   frost  — морозная дымка
   *   runes  — вращающиеся руны
   *   storm  — разряды по корпусу
   */
  var SKINS = {
    butcher: [
      { id: 'default', name: 'Мясник', tier: 0, cost: 0 },
      {
        id: 'slaughter', name: 'Багровая Скотобойня', tier: 1, cost: 1200,
        palette: { skin: '#d8b28c', cloth: '#8e1f1f', armor: '#c02b2b', trim: '#ffd76a' }
      },
      {
        id: 'abattoir', name: 'ИММОРТАЛ · Владыка Бойни', tier: 2, ad: true,
        palette: { skin: '#e0c0a0', cloth: '#2a0a12', armor: '#7a0f2a', trim: '#ff3a5e' },
        fx: 'trail', fxColor: '#ff3a5e', aura: 'rgba(255,58,94,.16)'
      }
    ],
    ranger: [
      { id: 'default', name: 'Егерь', tier: 0, cost: 0 },
      {
        id: 'greenwood', name: 'Страж Зелёных Троп', tier: 1, cost: 1200,
        palette: { skin: '#e8c49a', cloth: '#1f6b3c', armor: '#3ea85e', trim: '#ffe07a' }
      },
      {
        id: 'sunhunter', name: 'ИММОРТАЛ · Солнечная Охота', tier: 2, ad: true,
        palette: { skin: '#f0d0a8', cloth: '#7a4a08', armor: '#ffb02e', trim: '#fff0a0' },
        fx: 'embers', fxColor: '#ffc84a', aura: 'rgba(255,200,74,.16)'
      }
    ],
    berserk: [
      { id: 'default', name: 'Берсерк', tier: 0, cost: 0 },
      {
        id: 'warchief', name: 'Вождь Разлома', tier: 1, cost: 1400,
        palette: { skin: '#e0b088', cloth: '#a03a08', armor: '#e87020', trim: '#ffe08a' }
      },
      {
        id: 'bloodmoon', name: 'ИММОРТАЛ · Кровавая Луна', tier: 2, ad: true,
        palette: { skin: '#f0c0a0', cloth: '#3a0808', armor: '#c81a1a', trim: '#ff6a4a' },
        fx: 'trail', fxColor: '#ff4a2a', aura: 'rgba(255,74,42,.18)'
      }
    ],
    frost: [
      { id: 'default', name: 'Хладна', tier: 0, cost: 0 },
      {
        id: 'glacier', name: 'Дева Ледника', tier: 1, cost: 1400,
        palette: { skin: '#f0e8f8', cloth: '#0f4a8e', armor: '#2e8fe0', trim: '#c8f0ff' }
      },
      {
        id: 'aurora', name: 'ИММОРТАЛ · Полярное Сияние', tier: 2, ad: true,
        palette: { skin: '#f8f0ff', cloth: '#123a6b', armor: '#4ad8c8', trim: '#a8ffe8' },
        fx: 'frost', fxColor: '#a8ffe8', aura: 'rgba(168,255,232,.18)'
      }
    ],
    knight: [
      { id: 'default', name: 'Кровавый Рыцарь', tier: 0, cost: 0 },
      {
        id: 'crimson', name: 'Багряный Орден', tier: 1, cost: 1600,
        palette: { skin: '#e8c09a', cloth: '#7a0f14', armor: '#d84040', trim: '#ffd76a' }
      },
      {
        id: 'sanguine', name: 'ИММОРТАЛ · Сангвинарий', tier: 2, ad: true,
        palette: { skin: '#f0d0b0', cloth: '#2a0410', armor: '#8a0f2a', trim: '#ff5a7a' },
        fx: 'trail', fxColor: '#ff2a4a', aura: 'rgba(255,42,74,.18)'
      }
    ],
    shadow: [
      { id: 'default', name: 'Клинок Тени', tier: 0, cost: 0 },
      {
        id: 'nightfall', name: 'Сумеречный Клинок', tier: 1, cost: 1600,
        palette: { skin: '#d8bda0', cloth: '#241050', armor: '#8a4ae0', trim: '#d8b0ff' }
      },
      {
        id: 'voidblade', name: 'ИММОРТАЛ · Клинок Пустоты', tier: 2, ad: true,
        palette: { skin: '#e0d0f0', cloth: '#100820', armor: '#5a1adc', trim: '#c07aff' },
        fx: 'trail', fxColor: '#b07dff', aura: 'rgba(176,125,255,.18)'
      }
    ],
    dryad: [
      { id: 'default', name: 'Дриада', tier: 0, cost: 0 },
      {
        id: 'blossom', name: 'Цвет Рощи', tier: 1, cost: 1800,
        palette: { skin: '#f0d8b0', cloth: '#1f6b34', armor: '#66c878', trim: '#d8ff9a' }
      },
      {
        id: 'worldtree', name: 'ИММОРТАЛ · Дочь Мирового Древа', tier: 2, ad: true,
        palette: { skin: '#f8e8c8', cloth: '#0f4a24', armor: '#8ae05a', trim: '#e8ffb0' },
        fx: 'embers', fxColor: '#b0ff7a', aura: 'rgba(176,255,122,.16)'
      }
    ],
    arcanist: [
      { id: 'default', name: 'Аркан', tier: 0, cost: 0 },
      {
        id: 'magus', name: 'Магистр Стихий', tier: 1, cost: 2000,
        palette: { skin: '#e8c8a8', cloth: '#2e1f6b', armor: '#8a6ae0', trim: '#ffb04a' }
      },
      {
        id: 'primordial', name: 'ИММОРТАЛ · Первостихия', tier: 2, ad: true,
        palette: { skin: '#f0d8b8', cloth: '#0f0a2a', armor: '#c04aff', trim: '#ffd76a' },
        fx: 'runes', fxColor: '#c9a0ff', aura: 'rgba(201,160,255,.18)'
      }
    ],
    pyro: [
      { id: 'default', name: 'Пиромант', tier: 0, cost: 0 },
      {
        id: 'cinder', name: 'Пепельный Культ', tier: 1, cost: 2000,
        palette: { skin: '#f0c8a8', cloth: '#7a2408', armor: '#e05a18', trim: '#ffc84a' }
      },
      {
        id: 'infernal', name: 'ИММОРТАЛ · Инфернал', tier: 2, ad: true,
        palette: { skin: '#f8d8b0', cloth: '#2a0a04', armor: '#ff4a0a', trim: '#ffe07a' },
        fx: 'embers', fxColor: '#ff8a3a', aura: 'rgba(255,138,58,.2)'
      }
    ],
    demon: [
      { id: 'default', name: 'Демон Клинков', tier: 0, cost: 0 },
      {
        id: 'nether', name: 'Изнанка Разлома', tier: 1, cost: 2200,
        palette: { skin: '#c898e8', cloth: '#1a0a2a', armor: '#9a3ad8', trim: '#ff8ae8' }
      },
      {
        id: 'demonlord', name: 'ИММОРТАЛ · Владыка Отражений', tier: 2, ad: true,
        palette: { skin: '#e0c0f8', cloth: '#12061c', armor: '#c81aff', trim: '#ffb0ff' },
        fx: 'trail', fxColor: '#e05aff', aura: 'rgba(224,90,255,.2)'
      }
    ],
    golem: [
      { id: 'default', name: 'Голем', tier: 0, cost: 0 },
      {
        id: 'obsidian', name: 'Обсидиановый Страж', tier: 1, cost: 2200,
        palette: { skin: '#8a7458', cloth: '#241a10', armor: '#5a5a6a', trim: '#8ad8ff' }
      },
      {
        id: 'titanheart', name: 'ИММОРТАЛ · Сердце Титана', tier: 2, ad: true,
        palette: { skin: '#a08868', cloth: '#2a1a08', armor: '#c8a050', trim: '#ffd76a' },
        fx: 'storm', fxColor: '#ffd76a', aura: 'rgba(255,215,106,.18)'
      }
    ]
  };

  function listFor(heroId) { return SKINS[heroId] || SKINS.butcher; }

  function get(heroId, skinId) {
    var list = listFor(heroId);
    for (var i = 0; i < list.length; i++) if (list[i].id === skinId) return list[i];
    return list[0];
  }

  return {
    SKINS: SKINS,
    listFor: listFor,
    get: get,
    key: function (heroId, skinId) { return heroId + ':' + skinId; }
  };
})());
