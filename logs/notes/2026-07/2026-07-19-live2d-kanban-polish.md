# Live2D kanban polish

- Task: configure a more polished blog kanban/Live2D mascot for the static GitHub Pages blog.
- Existing state: generated HTML pages already used `L2Dwidget.min.js` with inline `wanko.model.json` config on most 2026 pages; 2024 legacy pages lacked the script.
- Decision: keep the known-compatible local `wanko` model because `hibiki` did not render visibly with the current old widget runtime. Move all behavior into `js/live2d-config.js` and all visual polish into `css/live2d-polish.css`.
- Design choice: small, low-opacity right-bottom companion with a soft light base, hover lift/brighten, and hidden on mobile to avoid blocking reading.

## Update

- User asked for the whole page to be prettier and for the kanban girl to be more anime-heavy.
- Added `css/anime-theme.css` as the generated-site theme override instead of editing the incomplete Hexo source theme.
- Localized the Shizuku Live2D model assets under `live2dw/assets/shizuku/` to avoid CDN and relative-path fragility.
- The old Live2D runtime still did not visibly render Shizuku in Chrome screenshots, so `js/live2d-config.js` now mounts a local CSS anime mascot inside the widget container as the stable visible kanban layer.
- Added mobile width constraints and wrapping rules after screenshots showed apparent clipping. DevTools mobile emulation confirmed `innerWidth=390` and `scrollWidth=390`.
