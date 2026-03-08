#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <major|minor|patch>"
  exit 1
}

[[ $# -ne 1 ]] && usage

BUMP="$1"

if [[ "$BUMP" != "major" && "$BUMP" != "minor" && "$BUMP" != "patch" ]]; then
  echo "Error: argument must be one of: major, minor, patch"
  usage
fi

# Ensure working tree is clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is dirty. Commit or stash changes before releasing."
  exit 1
fi

# Read current version from package.json
CURRENT="$(bun -e "const p = require('./package.json'); console.log(p.version)")"
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEXT="${MAJOR}.${MINOR}.${PATCH}"
TAG="v${NEXT}"

echo "Bumping ${CURRENT} → ${NEXT}"

# Update package.json version in place
bun -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
p.version = '${NEXT}';
fs.writeFileSync('package.json', JSON.stringify(p, null, 4) + '\n');
"

git add package.json
git commit -m "chore: bump version to ${TAG}"
git tag "${TAG}"
git push
git push --tags

echo "Released ${TAG}"
