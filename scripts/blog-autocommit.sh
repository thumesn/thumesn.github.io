#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEBOUNCE_SECONDS=3
POLL_SECONDS=2
DO_PUSH=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/blog-autocommit.sh [--push] [--debounce SECONDS] [--poll SECONDS]

Watch blog source files and automatically commit after saves.

By default this commits locally only. Add --push if you also want every save
to publish to GitHub Pages.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)
      DO_PUSH=1
      shift
      ;;
    --debounce)
      DEBOUNCE_SECONDS="${2:-3}"
      shift 2
      ;;
    --poll)
      POLL_SECONDS="${2:-2}"
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

state_hash() {
  find "${watched_paths[@]}" -type f \
    ! -path '*/node_modules/*' \
    -printf '%T@ %s %p\n' 2>/dev/null \
    | sort \
    | sha256sum \
    | awk '{print $1}'
}

echo "Watching blog source files. Press Ctrl-C to stop."
if [[ "$DO_PUSH" -eq 1 ]]; then
  echo "Mode: auto commit and push."
else
  echo "Mode: auto commit locally. Run scripts/blog-publish.sh later to push."
fi

if command -v inotifywait >/dev/null 2>&1; then
  while true; do
    inotifywait -r -e close_write,create,delete,move "${watched_paths[@]}" >/dev/null 2>&1 || true
    sleep "$DEBOUNCE_SECONDS"
    publish_once
  done
else
  last_hash="$(state_hash)"
  while true; do
    sleep "$POLL_SECONDS"
    next_hash="$(state_hash)"
    if [[ "$next_hash" != "$last_hash" ]]; then
      sleep "$DEBOUNCE_SECONDS"
      last_hash="$(state_hash)"
      publish_once
    fi
  done
fi
