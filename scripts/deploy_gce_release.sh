#!/usr/bin/env bash
set -euo pipefail

APP_SERVICE="${APP_SERVICE:-ai-department}"
APP_USER="${APP_USER:-ai-department}"
CURRENT_LINK="${CURRENT_LINK:-/opt/ai-department}"
RELEASE_ROOT="${RELEASE_ROOT:-/opt/ai-department-releases}"
PACKAGE_PATH="${PACKAGE_PATH:-/tmp/ai-department-deploy.tar.gz}"
DEPLOY_ID="${DEPLOY_SHA:-manual-$(date -u +%Y%m%d%H%M%S)}"
RELEASE_DIR="${RELEASE_ROOT}/${DEPLOY_ID}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8765/}"

if [ ! -f "$PACKAGE_PATH" ]; then
  echo "Package not found: $PACKAGE_PATH" >&2
  exit 2
fi

sudo mkdir -p "$RELEASE_ROOT"
previous_target=""
if [ -e "$CURRENT_LINK" ]; then
  previous_target="$(readlink -f "$CURRENT_LINK" || true)"
fi

sudo rm -rf "$RELEASE_DIR"
sudo mkdir -p "$RELEASE_DIR"
sudo tar -xzf "$PACKAGE_PATH" -C "$RELEASE_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$RELEASE_DIR"

sudo systemctl stop "$APP_SERVICE" || true

if [ -e "$CURRENT_LINK" ] && [ ! -L "$CURRENT_LINK" ]; then
  migrated="${RELEASE_ROOT}/manual-before-github-actions-$(date -u +%Y%m%d%H%M%S)"
  sudo mv "$CURRENT_LINK" "$migrated"
  previous_target="$migrated"
fi

rollback() {
  echo "Deployment failed; rolling back." >&2
  sudo systemctl stop "$APP_SERVICE" || true
  if [ -n "$previous_target" ] && [ -d "$previous_target" ]; then
    sudo ln -sfn "$previous_target" "$CURRENT_LINK"
  fi
  sudo systemctl start "$APP_SERVICE" || true
}

sudo ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

if ! sudo systemctl start "$APP_SERVICE"; then
  rollback
  exit 3
fi

sleep 5

if ! sudo systemctl is-active --quiet "$APP_SERVICE"; then
  rollback
  exit 4
fi

if ! curl -fsS "$HEALTH_URL" >/dev/null; then
  rollback
  exit 5
fi

sudo rm -f "$PACKAGE_PATH"
sudo find "$RELEASE_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr \
  | awk 'NR > 5 {print $2}' \
  | while read -r old_release; do
      case "$old_release" in
        "$RELEASE_ROOT"/*) sudo rm -rf "$old_release" ;;
      esac
    done

echo "Deployment complete: $DEPLOY_ID"
