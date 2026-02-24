#!/bin/bash
# Claude Code PreToolUse hook: blocks git commit if lint/type checks fail
# Intercepts Bash calls containing "git commit" and runs checks first.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
CWD=$(echo "$INPUT" | jq -r '.cwd')

# Only intercept git commit commands
if [[ "$COMMAND" != *"git commit"* ]]; then
    exit 0
fi

ERRORS=""

# --- 1. Prettier check on all packages ---
cd "$CWD"
PRETTIER_OUT=$(npx prettier --check "packages/**/*.{ts,tsx}" 2>&1)
if [ $? -ne 0 ]; then
    ERRORS="${ERRORS}\n## Prettier: unformatted files detected\nRun \`npx prettier --write \"packages/**/*.{ts,tsx}\"\` to fix.\n"
fi

# --- 2. Determine which packages have staged changes ---
STAGED=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED" ]; then
    STAGED=$(git diff --name-only 2>/dev/null)
fi

HAS_SHARED=false
HAS_API=false
HAS_WEB=false
HAS_MOBILE=false

while IFS= read -r file; do
    case "$file" in
        packages/shared/*) HAS_SHARED=true ;;
        packages/api/*) HAS_API=true ;;
        packages/web/*) HAS_WEB=true ;;
        packages/mobile/*) HAS_MOBILE=true ;;
    esac
done <<< "$STAGED"

# --- 3. Rebuild shared if it changed ---
if [ "$HAS_SHARED" = true ]; then
    cd "$CWD/packages/shared"
    BUILD_OUT=$(npm run build 2>&1)
    if [ $? -ne 0 ]; then
        ERRORS="${ERRORS}\n## Shared build failed\n${BUILD_OUT}\n"
    fi
    cd "$CWD"
fi

# --- 4. TypeScript checks on changed packages ---
if [ "$HAS_API" = true ]; then
    cd "$CWD/packages/api"
    TSC_OUT=$(npx tsc --noEmit 2>&1)
    if [ $? -ne 0 ]; then
        ERRORS="${ERRORS}\n## TypeScript errors in packages/api\n${TSC_OUT}\n"
    fi
    cd "$CWD"
fi

if [ "$HAS_WEB" = true ]; then
    # ESLint (includes prettier plugin)
    cd "$CWD/packages/web"
    ESLINT_OUT=$(npx eslint src/ 2>&1)
    if [ $? -ne 0 ]; then
        ERRORS="${ERRORS}\n## ESLint errors in packages/web\n${ESLINT_OUT}\n"
    fi
    # TypeScript
    TSC_OUT=$(npx tsc --noEmit 2>&1)
    if [ $? -ne 0 ]; then
        ERRORS="${ERRORS}\n## TypeScript errors in packages/web\n${TSC_OUT}\n"
    fi
    cd "$CWD"
fi

if [ "$HAS_MOBILE" = true ]; then
    cd "$CWD/packages/mobile"
    TSC_OUT=$(npx tsc --noEmit 2>&1)
    if [ $? -ne 0 ]; then
        ERRORS="${ERRORS}\n## TypeScript errors in packages/mobile\n${TSC_OUT}\n"
    fi
    cd "$CWD"
fi

# --- 5. Block or allow ---
if [ -n "$ERRORS" ]; then
    REASON=$(echo -e "Pre-commit checks failed. Fix these issues before committing:${ERRORS}" | jq -Rs .)
    echo "{\"hookSpecificOutput\": {\"hookEventName\": \"PreToolUse\", \"permissionDecision\": \"deny\", \"permissionDecisionReason\": ${REASON}}}"
    exit 0
fi

# All checks passed — allow the commit
exit 0
