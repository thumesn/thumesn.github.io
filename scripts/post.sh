#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BLOG_SRC="$ROOT_DIR/blog-source"
POST_DIR="$BLOG_SRC/source/_posts"

usage() {
  cat <<'USAGE'
Usage:
  scripts/post.sh list
  scripts/post.sh new "文章标题" [专题目录]
  scripts/post.sh assets
  scripts/post.sh build
  scripts/post.sh server

Commands:
  list    List editable post source files under blog-source/source/_posts
  new     Create a new Hexo post source markdown. Example: scripts/post.sh new "文章标题" rl
  assets  Normalize local post images into blog-source/source/img/posts
  build   Generate static site into blog-source/public
  server  Run local preview server (http://localhost:4000)
USAGE
}

topic_category() {
  case "$1" in
    llm) echo "LLM" ;;
    rl) echo "强化学习" ;;
    skills) echo "Skills" ;;
    site) echo "站点" ;;
    *) echo "$1" ;;
  esac
}

slugify_title() {
  local title="$1"
  title="${title// /-}"
  title="${title//\//-}"
  title="${title//\\/-}"
  title="${title//:/-}"
  title="${title//：/-}"
  title="${title//？/}"
  title="${title//?/}"
  title="${title//！/}"
  title="${title//!/}"
  title="${title//,/}"
  title="${title//，/}"
  title="${title//./}"
  title="${title//。/}"
  echo "$title"
}

if [[ ! -d "$BLOG_SRC" ]]; then
  echo "Error: blog-source not found at $BLOG_SRC" >&2
  exit 1
fi

cmd="${1:-}"
case "$cmd" in
  list)
    find "$POST_DIR" -type f -name '*.md' | sort | while IFS= read -r file; do
      rel="${file#"$POST_DIR"/}"
      title="$(sed -n 's/^title:[[:space:]]*//p' "$file" | head -n 1)"
      if [[ -n "$title" ]]; then
        printf '%-56s %s\n' "$rel" "$title"
      else
        printf '%s\n' "$rel"
      fi
    done
    ;;
  new)
    shift || true
    title="${1:-}"
    topic="${2:-}"
    if [[ -z "$title" ]]; then
      echo "Error: title is required. Example: scripts/post.sh new \"Qwen2.5 阅读\" llm" >&2
      exit 1
    fi
    if [[ -z "$topic" ]]; then
      (cd "$BLOG_SRC" && npm run new -- "$title")
    else
      if [[ "$topic" = /* || "$topic" = *..* ]]; then
        echo "Error: topic must be a simple relative directory name, such as llm or rl." >&2
        exit 1
      fi
      topic_dir="$POST_DIR/$topic"
      mkdir -p "$topic_dir"
      slug="$(slugify_title "$title")"
      post_file="$topic_dir/$slug.md"
      if [[ -e "$post_file" ]]; then
        echo "Error: post already exists: $post_file" >&2
        exit 1
      fi
      category="$(topic_category "$topic")"
      {
        echo "---"
        echo "title: $title"
        echo "date: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "categories:"
        echo "  - 技术"
        echo "  - $category"
        echo "tags:"
        echo "  - $category"
        echo "---"
        echo
      } > "$post_file"
      echo "Created: $post_file"
    fi
    ;;
  assets)
    node "$ROOT_DIR/scripts/normalize-post-assets.js"
    ;;
  build)
    node "$ROOT_DIR/scripts/normalize-post-assets.js"
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
