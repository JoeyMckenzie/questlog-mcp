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

# Validate changelog has unreleased content
if ! grep -q '## \[Unreleased\]' CHANGELOG.md; then
  echo "Error: CHANGELOG.md is missing an '## [Unreleased]' section."
  exit 1
fi

# Check that there's actual content between [Unreleased] and the next version heading
UNRELEASED_CONTENT="$(sed -n '/^## \[Unreleased\]/,/^## \[/{ /^## \[/d; /^[[:space:]]*$/d; p; }' CHANGELOG.md)"
if [[ -z "$UNRELEASED_CONTENT" ]]; then
  echo "Error: No content under '## [Unreleased]' in CHANGELOG.md. Add release notes before releasing."
  exit 1
fi

# Read current version from package.json
CURRENT="$(bun -e "const p = require('./package.json'); console.log(p.version)")"
IFS='.' read -r MAJOR MINOR PATCH <<<"$CURRENT"

case "$BUMP" in
major)
  MAJOR=$((MAJOR + 1))
  MINOR=0
  PATCH=0
  ;;
minor)
  MINOR=$((MINOR + 1))
  PATCH=0
  ;;
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

# Update CHANGELOG.md: rename [Unreleased] to versioned entry
TODAY="$(date +%Y-%m-%d)"
sed -i '' "s/^## \[Unreleased\]/## [${NEXT}] - ${TODAY}/" CHANGELOG.md

# Insert fresh [Unreleased] section above the new versioned entry
sed -i '' "/^## \[${NEXT}\] - ${TODAY}/i\\
## [Unreleased]\\
" CHANGELOG.md

# Update comparison links: add new version link and update [Unreleased] link
sed -i '' "s|\[Unreleased\]: \(.*\)/compare/.*\.\.\.HEAD|[Unreleased]: \1/compare/${TAG}...HEAD|" CHANGELOG.md
sed -i '' "/^\[Unreleased\]:/a\\
[${NEXT}]: https://github.com/joeymckenzie/questlog-mcp/compare/v${CURRENT}...${TAG}
" CHANGELOG.md

git add package.json CHANGELOG.md
git commit -m "chore: bump version to ${TAG}"
git tag "${TAG}"
git push
git push --tags

echo "Released ${TAG}"
