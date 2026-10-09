#!/usr/bin/env bash
# Vercel "Ignored Build Step".
#   exit 0 -> skip the build
#   exit 1 -> run the build
#
# Layer 2 of branch filtering. vercel.json `git.deploymentEnabled` already stops
# feature branches from creating deployments at all; this script is the safety
# net (e.g. if someone deploys a feature branch via the CLI or edits the
# dashboard) and also skips builds on main/develop when nothing deployable changed.

set -euo pipefail

BRANCH="${VERCEL_GIT_COMMIT_REF:-}"
ALLOWED_BRANCHES="${ALLOWED_BRANCHES:-main develop}"

echo "▶ Branch: ${BRANCH:-<unknown>} | Allowed: ${ALLOWED_BRANCHES}"

# Local `vercel` CLI deploys have no git metadata — always build.
if [[ -z "$BRANCH" ]]; then
  echo "✅ No git ref (CLI deploy) — building."
  exit 1
fi

if [[ " $ALLOWED_BRANCHES " != *" $BRANCH "* ]]; then
  echo "🛑 '$BRANCH' is not a deploy branch — skipping."
  exit 0
fi

# Skip if only non-deployable files changed since the last successful deploy.
PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [[ -z "$PREV" ]] || ! git cat-file -e "$PREV^{commit}" 2>/dev/null; then
  echo "✅ No previous deploy SHA reachable — building."
  exit 1
fi

if git diff --quiet "$PREV" HEAD -- . \
  ':(exclude)*.md' \
  ':(exclude).github' \
  ':(exclude).vscode' \
  ':(exclude)docs' \
  ':(exclude)LICENSE'; then
  echo "🛑 Only docs/meta files changed since $PREV — skipping."
  exit 0
fi

echo "✅ Deployable changes detected — building."
exit 1
