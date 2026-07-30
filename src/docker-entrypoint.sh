#!/bin/sh
set -eu

APP_DIR="/app"
log() { printf '[entrypoint] %s\n' "$*"; }

# Where to look for placeholders in a Next 'standalone' image
SEARCH_DIRS="
$APP_DIR/.next/standalone
$APP_DIR/.next/static
$APP_DIR/.next/server
$APP_DIR/.next
$APP_DIR
"

# Escape sed replacement safely
_escape() { printf '%s' "$1" | sed -e 's/[\/&|\\]/\\&/g'; }

_replace_all() {
  placeholder="$1"
  value="$2"
  [ -z "${value:-}" ] && { log "skip: $placeholder (env not set)"; return; }

  esc="$(_escape "$value")"
  changed=0
  for d in $SEARCH_DIRS; do
    [ -d "$d" ] || continue
    # only touch files that actually contain the placeholder
    # -R: recursive, -I: skip binary, -l: list filenames only
    files=$(grep -RIl -- "$placeholder" "$d" 2>/dev/null || true)
    [ -z "$files" ] && continue
    # shellcheck disable=SC2086
    sed -i "s|$placeholder|$esc|g" $files
    changed=1
  done

  if [ "$changed" -eq 1 ]; then
    log "replaced: $placeholder -> $value"
  else
    log "not found: $placeholder (ok)"
  fi
}

# Replace 'http://VAR_PLACEHOLDER' and 'https://VAR_PLACEHOLDER' first, then plain 'VAR_PLACEHOLDER'
_replace_var() {
  name="$1"; val="${2:-}"
  _replace_all "http://${name}_PLACEHOLDER" "$val"
  _replace_all "https://${name}_PLACEHOLDER" "$val"
  _replace_all "${name}_PLACEHOLDER" "$val"
}

# Perform replacements
_replace_var "NEXT_PUBLIC_API_URL" "${NEXT_PUBLIC_API_URL:-}"

# (Optional) if you purposely left a NEXTAUTH_URL placeholder somewhere:
# _replace_var "NEXTAUTH_URL"        "${NEXTAUTH_URL:-}"

log "starting app: $*"
exec "$@"
