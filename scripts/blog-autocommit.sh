#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHECK_SECONDS=600
DO_PUSH=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/blog-autocommit.sh [--push] [--interval SECONDS]

Check blog source files on a timer and commit when there are changes.

By default this commits locally only. Add --push if you also want every save
batch to publish to GitHub Pages.

Default interval: 600 seconds.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)
      DO_PUSH=1
      shift
      ;;
    --interval|--poll)
      CHECK_SECONDS="${2:-600}"
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

if ! [[ "$CHECK_SECONDS" =~ ^[0-9]+$ ]] || [[ "$CHECK_SECONDS" -lt 1 ]]; then
  echo "Error: interval must be a positive integer number of seconds." >&2
  exit 1
fi

watched_paths=(
  blog-source/source
  blog-source/_config.yml
  blog-source/_config.stellar.yml
)

publish_once() {
  local message
  message="autosave blog: $(date '+%Y-%m-%d %H:%M:%S')"

  if [[ "$DO_PUSH" -eq 1 ]]; then
    "$ROOT_DIR/scripts/blog-publish.sh" -m "$message"
  else
    "$ROOT_DIR/scripts/blog-publish.sh" --no-push -m "$message"
  fi
}

has_blog_changes() {
  [[ -n "$(git status --porcelain -- "${watched_paths[@]}")" ]]
}

echo "Checking blog source files every $CHECK_SECONDS seconds. Press Ctrl-C to stop."
if [[ "$DO_PUSH" -eq 1 ]]; then
  echo "Mode: auto commit and push changed batches."
else
  echo "Mode: auto commit changed batches locally. Run scripts/blog-publish.sh later to push."
fi

while true; do
  sleep "$CHECK_SECONDS"
  if has_blog_changes; then
    publish_once
  else
    echo "No blog source changes: $(date '+%Y-%m-%d %H:%M:%S')"
  fi
done
