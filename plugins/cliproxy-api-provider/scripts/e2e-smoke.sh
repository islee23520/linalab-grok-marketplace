#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/grok-cliproxy-smoke.XXXXXX")"
export HOME="$SANDBOX_ROOT/home"
export GROK_HOME="$HOME/.grok"
mkdir -p "$GROK_HOME"

cleanup() {
  rm -rf "$SANDBOX_ROOT"
}
trap cleanup EXIT

grok plugin validate "$ROOT"
grok plugin marketplace add "$ROOT"
grok plugin install cliproxy-api-provider --trust
grok plugin enable cliproxy-api-provider
grok plugin details cliproxy-api-provider

INSTALLED_CLI="$(find "$GROK_HOME/installed-plugins" -path '*/dist/cli.mjs' -print -quit)"
test -n "$INSTALLED_CLI"
node "$INSTALLED_CLI" --help | grep -q '^Usage: cliproxy-provider'

test -f "$GROK_HOME/installed-plugins/registry.json"
echo "isolated Grok marketplace/plugin smoke passed"
