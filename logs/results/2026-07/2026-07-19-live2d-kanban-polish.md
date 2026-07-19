# Live2D kanban polish result

- Added `css/live2d-polish.css` and `js/live2d-config.js`.
- Updated all 64 HTML pages to load the shared Live2D CSS and JS.
- Replaced scattered inline `L2Dwidget.init(...)` snippets with a single config file.
- Verified local static assets with `curl -I`: CSS, JS, and `wanko.model.json` return 200.
- Verified screenshots with system Chrome headless:
  - Desktop: `/tmp/thumesn-live2d-final-desktop.png`
  - Mobile: `/tmp/thumesn-live2d-final-mobile.png`
- Existing unrelated change preserved: `blog-source/source/_posts/attention-module-pytorch.md`.

## Update

- Added a full-site anime visual override: pastel grid background, colorful hero stripe, glassy sidebar, frosted article cards, richer headings/tags, and safer mobile wrapping.
- Added local Shizuku assets under `live2dw/assets/shizuku/` and pointed `js/live2d-config.js` to the local model JSON.
- Added a visible CSS anime kanban mascot fallback because the old runtime created a canvas but did not visibly render Shizuku in validation screenshots.
- Verification:
  - `node --check js/live2d-config.js`
  - `curl -I http://127.0.0.1:4173/live2dw/assets/shizuku/shizuku.model.json`
  - `curl -I http://127.0.0.1:4173/live2dw/assets/shizuku/moc/shizuku.1024/texture_00.png`
  - Desktop screenshot: `/tmp/thumesn-final2-desktop.png`
  - Mobile emulation screenshot: `/tmp/thumesn-final-mobile.png`
  - Mobile width check: `innerWidth=390`, `scrollWidth=390`, `bodyScrollWidth=390`
