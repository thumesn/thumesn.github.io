#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BLOG_SRC="$ROOT_DIR/blog-source"
POST_DIR="$BLOG_SRC/source/_posts"

usage() {
  cat <<'USAGE'
Usage:
  scripts/post.sh list
  scripts/post.sh new "文章标题"
  scripts/post.sh build
  scripts/post.sh server

Commands:
  list    List editable post source files under blog-source/source/_posts
  new     Create a new Hexo post source markdown
  build   Generate static site into blog-source/public
  server  Run local preview server (http://localhost:4000)
USAGE
}

if [[ ! -d "$BLOG_SRC" ]]; then
  echo "Error: blog-source not found at $BLOG_SRC" >&2
  exit 1
fi

cmd="${1:-}"
case "$cmd" in
  list)
    ls -1 "$POST_DIR"
    ;;
  new)
    shift || true
    title="${1:-}"
    if [[ -z "$title" ]]; then
      echo "Error: title is required. Example: scripts/post.sh new \"Qwen2.5 阅读\"" >&2
      exit 1
    fi
    (cd "$BLOG_SRC" && npm run new -- "$title")
    ;;
  build)
    (cd "$BLOG_SRC" && npm run build)
    echo "Build complete: $BLOG_SRC/public"
    ;;
  server)
    (cd "$BLOG_SRC" && npm run server)
    ;;
  *)
    usage
    exit 1
    ;;
esac
