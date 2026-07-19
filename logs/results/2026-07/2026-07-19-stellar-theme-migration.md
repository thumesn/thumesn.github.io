# Stellar Theme Migration

- Date: 2026-07-19
- Scope: migrate Hexo blog source and generated GitHub Pages output to `hexo-theme-stellar`.
- Theme version: `hexo-theme-stellar@1.33.1`.

## Changes

- Added a complete Hexo source project under `blog-source`.
- Switched site theme to Stellar via `blog-source/_config.yml`.
- Added Stellar-specific navigation, sidebar, footer, search, MathJax, and visual styling in `blog-source/_config.stellar.yml`.
- Restored the about page as source Markdown.
- Copied avatar, favicon, custom CSS, and local MathJax assets into `blog-source/source`.
- Regenerated static output and synced it to the repository root for GitHub Pages.

## Verification

- `scripts/post.sh build` completed successfully.
- Generated output reports `Stellar 1.33.1`.
- Local static preview runs at `http://localhost:4001/`.
- Checked HTTP 200 for `/`, `/about/`, `/css/main.css`, and `/css/stellar-custom.css`.

## Notes

- Port `4000` was already occupied, so preview uses port `4001`.
- `hexo server` watch mode hit `EMFILE`; `hexo server --static` works in this environment.
