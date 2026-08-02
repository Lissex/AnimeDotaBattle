# Эти файлы больше не используются — удалите их

После разбивки на слои монолиты заменены модулями. `index.html` их не подключает,
на игру они никак не влияют, но занимают место в архиве.

Удалить:

```
js/data.js
js/sdk.js
js/engine.js
js/ui.js
css/style.css
js/_OBSOLETE.md   (этот файл)
```

Куда что переехало:

| Было | Стало |
|---|---|
| `js/data.js` | `js/content/` — attributes, items, enemies, maps, heroes, skills/ |
| `js/sdk.js` | `js/platform/` — sdk, storage, i18n |
| `js/engine.js` | `js/game/` (14 систем) и `js/render/` (9 модулей) |
| `js/ui.js` | `js/ui/` (11 файлов, экран на файл) |
| `css/style.css` | `css/base.css`, `screens.css`, `battle.css`, `panels.css` |
