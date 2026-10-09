#!/usr/bin/env bash
# Create a dated design spec from the template.
#   ./scripts/new-spec.sh projects-resource
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <topic>   (kebab-case)" >&2
  exit 1
fi

topic="$1"
today="$(date +%F)"
# "projects-resource" -> "Projects Resource"
title="$(echo "$topic" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
template="$root/docs/superpowers/specs/TEMPLATE.md"
target="$root/docs/superpowers/specs/$today-$topic-design.md"

[[ -f "$template" ]] || { echo "missing template: $template" >&2; exit 1; }
[[ -e "$target" ]] && { echo "already exists: $target" >&2; exit 1; }

sed -e "s/^| \*\*Created\*\* | YYYY-MM-DD |$/| **Created** | $today |/" \
    -e "s/^| \*\*Updated\*\* | YYYY-MM-DD |$/| **Updated** | $today |/" \
    -e "s/^# <Topic> Design$/# $title Design/" \
    "$template" > "$target"

echo "$target"
