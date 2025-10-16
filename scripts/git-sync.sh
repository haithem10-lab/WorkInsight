#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[error] This script must be run inside a Git repository." >&2
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"

if [[ "${1-}" == "" ]]; then
  read -rp "Commit message: " commit_msg
else
  commit_msg="$1"
fi

if [[ -z "${commit_msg// }" ]]; then
  echo "[error] Commit message cannot be empty." >&2
  exit 1
fi

echo "[info] Staging changes..."
git add -A

if git diff --cached --quiet; then
  echo "[info] No changes to commit. Skipping commit and push."
  exit 0
fi

echo "[info] Committing with message: $commit_msg"
git commit -m "$commit_msg"

echo "[info] Pushing branch '$current_branch' to 'origin'..."
git push origin "$current_branch"

echo "[success] Repository synchronized with GitHub."
