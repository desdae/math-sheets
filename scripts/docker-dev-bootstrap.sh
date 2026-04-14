#!/bin/sh
set -eu

workspace="${1:?workspace name required}"
shift

lockfile="/app/package-lock.json"
node_modules_dir="/app/node_modules"
cache_dir="$node_modules_dir/.cache"
hash_file="$cache_dir/mathsheets-${workspace}-package-lock.sha256"

if [ ! -f "$lockfile" ]; then
  echo "[bootstrap] Missing lockfile at $lockfile" >&2
  exit 1
fi

mkdir -p "$cache_dir"

current_hash="$(sha256sum "$lockfile" | awk '{print $1}')"
stored_hash=""

if [ -f "$hash_file" ]; then
  stored_hash="$(cat "$hash_file")"
fi

needs_install="false"

if [ ! -d "$node_modules_dir" ]; then
  needs_install="true"
elif [ ! -f "$hash_file" ]; then
  needs_install="true"
elif [ "$current_hash" != "$stored_hash" ]; then
  needs_install="true"
fi

if [ "$needs_install" = "true" ]; then
  echo "[bootstrap] package-lock.json changed for $workspace, installing dependencies..."
  npm install --workspace "$workspace"
  printf '%s' "$current_hash" > "$hash_file"
else
  echo "[bootstrap] package-lock.json unchanged for $workspace, skipping install."
fi

exec "$@"
