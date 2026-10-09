#!/usr/bin/env bash
# Create a dated plan from the template.
#   ./scripts/new-plan.sh add-projects-resource
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <feature-name>   (kebab-case)" >&2
  exit 1
fi

feature="$1"
today="$(date +%F)"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
template="$root/docs/superpowers/plans/TEMPLATE.md"
target="$root/docs/superpowers/plans/$today-$feature.md"

[[ -f "$template" ]] || { echo "missing template: $template" >&2; exit 1; }
[[ -e "$target" ]] && { echo "already exists: $target" >&2; exit 1; }

sed -e "s/^| \*\*Created\*\* | YYYY-MM-DD |$/| **Created** | $today |/" \
    -e "s/^| \*\*Updated\*\* | YYYY-MM-DD |$/| **Updated** | $today |/" \
    -e "s|\`.superpowers/sdd/<this-plan-basename>/progress.md\`|\`.superpowers/sdd/$today-$feature/progress.md\`|" \
    "$template" > "$target"

echo "$target"
