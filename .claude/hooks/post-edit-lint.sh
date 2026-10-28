#!/bin/bash
# Runs AFTER every Edit / Write — Dir Food fast feedback loop.
#
# Lints the single TypeScript file that was just edited with oxlint.
# If lint fails, exit 2 sends the errors back to Claude so it fixes them
# immediately, instead of discovering them at commit time.

INPUT="$(cat)"

if command -v jq >/dev/null 2>&1; then
  FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
else
  FILE_PATH="$(printf '%s' "$INPUT" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)"
fi

# Only lint TypeScript files inside src/ or test/, never generated code.
case "$FILE_PATH" in
  */src/generated/*) exit 0 ;;
  */src/*.ts|*/test/*.ts) ;;
  *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

OUTPUT="$(npx --no-install oxlint --type-aware "$FILE_PATH" 2>&1)"
STATUS=$?

if [ $STATUS -ne 0 ]; then
  {
    echo "oxlint found problems in $FILE_PATH — fix them before continuing:"
    echo "$OUTPUT" | tail -n 40
  } >&2
  exit 2
fi

exit 0

