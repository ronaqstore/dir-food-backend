#!/bin/bash
# Runs BEFORE every Bash / Edit / Write tool use — Dir Food safety gate.
#
# Claude Code passes the tool call as JSON on stdin, e.g.
#   {"tool_name":"Bash","tool_input":{"command":"npm test"}}
#   {"tool_name":"Edit","tool_input":{"file_path":"/abs/path/file.ts", ...}}
#
# Exit codes:
#   0  -> allow (optionally with JSON on stdout asking the user to confirm)
#   2  -> BLOCK; stderr is shown to Claude so it can choose another approach

INPUT="$(cat)"

json_get() {
  # $1 = jq path. Falls back to python3 if jq is not installed.
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$INPUT" | jq -r "$1 // empty" 2>/dev/null
  else
    printf '%s' "$INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for k in '$1'.lstrip('.').split('.'):
    d = d.get(k, {}) if isinstance(d, dict) else {}
print(d if isinstance(d, str) else '')
" 2>/dev/null
  fi
}

TOOL_NAME="$(json_get '.tool_name')"
COMMAND="$(json_get '.tool_input.command')"
FILE_PATH="$(json_get '.tool_input.file_path')"

block() {
  echo "BLOCKED by .claude/hooks/pre-tool-use.sh: $1" >&2
  exit 2
}

ask_user() {
  # Allow the tool but force a human confirmation prompt.
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"%s"}}\n' "$1"
  exit 0
}

# ---------------------------------------------------------------------------
# Bash commands
# ---------------------------------------------------------------------------
if [ "$TOOL_NAME" = "Bash" ] && [ -n "$COMMAND" ]; then

  # 1. Filesystem / git destruction
  DANGEROUS=(
    "rm -rf /"
    "rm -rf ~"
    "rm -rf /home"
    "rm -rf ."
    "rm -rf src"
    "rm -rf prisma"
    "chmod 777 /"
    "dd if=/dev/zero"
    "mkfs"
    "git push --force"
    "git push -f"
    "git reset --hard"
    "git clean -fd"
  )
  for pattern in "${DANGEROUS[@]}"; do
    if printf '%s' "$COMMAND" | grep -qF -- "$pattern"; then
      block "dangerous command pattern '$pattern'"
    fi
  done

  # 2. Destructive database / Prisma operations
  if printf '%s' "$COMMAND" | grep -qiE "(DROP (DATABASE|SCHEMA|TABLE)|TRUNCATE [a-zA-Z_\"]+|DELETE FROM [^;]+ WHERE 1 ?= ?1)"; then
    block "destructive SQL statement"
  fi
  if printf '%s' "$COMMAND" | grep -qE "prisma (migrate reset|db push .*--force-reset|db push .*--accept-data-loss)"; then
    block "destructive Prisma command (wipes the dev database). Ask the user to run it manually if really needed."
  fi

  # 3. Commands that change the schema history -> human must confirm
  if printf '%s' "$COMMAND" | grep -qE "prisma (migrate dev|migrate deploy|db push|db seed)"; then
    ask_user "This Prisma command changes the database or migration history. Confirm the approved spec allows it."
  fi

  # 4. Never print secrets
  if printf '%s' "$COMMAND" | grep -qE "(cat|less|more|head|tail|echo).*\.env(\.production|\.development)?([^.a-z]|$)"; then
    ask_user "This command would print an .env file that contains secrets."
  fi
fi

# ---------------------------------------------------------------------------
# File edits
# ---------------------------------------------------------------------------
if [ -n "$FILE_PATH" ] && { [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "MultiEdit" ]; }; then

  # Generated Prisma client must never be hand-edited
  case "$FILE_PATH" in
    */src/generated/*)
      block "src/generated/ is produced by 'npx prisma generate'. Edit prisma/*.prisma instead."
      ;;
  esac

  # Applied migrations are immutable history -> ask
  if printf '%s' "$FILE_PATH" | grep -qE "/prisma/migrations/[^/]+/migration\.sql$"; then
    ask_user "Editing an existing migration file. Applied migrations must never be changed — create a new migration instead."
  fi

  # Secrets / environment files -> ask
  case "$FILE_PATH" in
    */.env|*/.env.development|*/.env.production|*/.env.local)
      ask_user "Editing an environment file that may contain secrets."
      ;;
  esac
fi

exit 0
