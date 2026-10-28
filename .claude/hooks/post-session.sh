#!/bin/bash
# Runs when Claude finishes responding (Stop event) — Dir Food session summary.
# Kept lightweight on purpose: Stop fires after every reply, so no tests here.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo ""
echo "----------------------------------------"
echo "Session checkpoint: $TIMESTAMP"
echo "----------------------------------------"

# Git root is the parent folder (dir-food/), so scope everything to this backend.
echo ""
echo "Recent backend commits (last 3h):"
git log --oneline --since="3 hours ago" -- . 2>/dev/null || echo "  None"

UNCOMMITTED=$(git status --short -- . 2>/dev/null | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt "0" ]; then
  echo ""
  echo "$UNCOMMITTED uncommitted file(s) in dir-food-backend:"
  git status --short -- . 2>/dev/null
  echo ""
  echo "  Before committing: npm run lint && npx tsc --noEmit && npm test"
fi

echo "----------------------------------------"

exit 0
