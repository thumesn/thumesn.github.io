#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="origin"
BRANCH=""
MESSAGE=""
DO_PUSH=1
STAGE_ALL=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/blog-publish.sh [-m "commit message"] [--no-push] [--all]

Build, sync, commit, and push the Hexo blog.

Options:
  -m, --message TEXT  Commit message. Defaults to "update blog: <timestamp>".
  --no-push          Commit locally without pushing.
  --all              Stage every repository change. Default stages blog-related paths only.
  --remote NAME      Git remote to push to. Default: origin.
  --branch NAME      Git branch to push. Default: current branch.
  -h, --help         Show this help.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      MESSAGE="${2:-}"
      shift 2
      ;;
    --no-push)
      DO_PUSH=0
      shift
      ;;
    --all)
      STAGE_ALL=1
      shift
      ;;
    --remote)
      REMOTE="${2:-}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

if [[ -z "$BRANCH" ]]; then
  BRANCH="$(git branch --show-current)"
fi

if [[ -z "$BRANCH" ]]; then
  echo "Error: cannot determine current git branch." >&2
  exit 1
fi

if [[ -z "$MESSAGE" ]]; then
  MESSAGE="update blog: $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo "Building Hexo site..."
"$ROOT_DIR/scripts/post.sh" build

echo "Syncing generated site to repository root..."
cp -a "$ROOT_DIR/blog-source/public/." "$ROOT_DIR/"

echo "Staging changes..."
if [[ "$STAGE_ALL" -eq 1 ]]; then
  git add -A
else
  paths=(
    404.html
    .githooks
    about
    archives
    atom.xml
    blog-source/_config.yml
    blog-source/_config.stellar.yml
    blog-source/package.json
    blog-source/package-lock.json
    blog-source/source
    categories
    css/main.css
    css/stellar-custom.css
    docs
    img
    index.html
    js
    page
    scripts
    search.json
    tags
  )

  while IFS= read -r -d '' year_dir; do
    paths+=("$year_dir")
  done < <(find . -maxdepth 1 -type d -regextype posix-extended -regex './[0-9]{4}' -printf '%P\0')

  for path in "${paths[@]}"; do
    if [[ -e "$path" ]]; then
      git add -A -- "$path"
    fi
  done
fi

if git diff --cached --quiet; then
  echo "No staged blog changes to commit."
  exit 0
fi

echo "Committing: $MESSAGE"
BLOG_SKIP_PRECOMMIT_BUILD=1 git commit -m "$MESSAGE"

if [[ "$DO_PUSH" -eq 1 ]]; then
  echo "Pushing to $REMOTE $BRANCH..."
  git push "$REMOTE" "$BRANCH"
else
  echo "Committed locally. Push skipped because --no-push was set."
fi
