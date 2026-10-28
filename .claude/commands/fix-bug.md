# /fix-bug — Dir Food Backend Bug Fix Workflow

## Step 1: Get Info — ask the user
1. The exact error message or wrong response (paste the full `{ error: { code, message } }` or stack trace).
2. Which endpoint / test / command? (e.g. `PATCH /me/restaurant/menu-items/:id`, `npm test -- src/auth/...`)
3. The request that triggers it (method, path, body, which role's token).
4. Expected vs actual behaviour.
5. Did it ever work? Recent changes: `git log --oneline -10 -- .`

## Step 2: Investigate
```
@debugger
Error: <paste>
Endpoint/test: <path>
Request: <method path body role>
Expected vs actual: <...>
Recent changes: <git log output>
```

## Step 3: Present Diagnosis
Show the root cause + proposed minimal fix + the regression test to add.
Ask: **"Does this fix look right? Proceed? (Y/N)"**
**Wait for an explicit yes.**

## Step 4: Write the Failing Test First
Add the regression test described by the debugger (unit spec, or e2e if the bug is in guards/wiring/HTTP shape).
Run it and **confirm it fails** for the right reason:
```bash
npm test -- <spec path>
```

## Step 5: Apply the Minimal Fix
Fix the root cause only. No unrelated cleanup, refactors, or "while we're here" changes.

## Step 6: Verify Loop
```bash
npm test -- <spec path>     # the new test now passes
npx tsc --noEmit
npm run lint
npm test                    # nothing else broke
```
If it touched guards, Prisma queries, or response shape, ask the user to also run:
`npm run test:e2e -- test/<related>.e2e-spec.ts`

## Step 7: Commit
```bash
git add <source file> <spec file>
git commit -m "fix(<scope>): <what was fixed>"
```
Scopes = module names (`auth`, `menu-items`, `order-intents`, `platform-admin`, `common`, ...).

## Step 8: Report
```
Bug Fixed ✅
Root cause: <one line>
Fix: <file> — <one line>
Regression test: <spec> — "<test name>"
tsc ✓ lint ✓ unit ✓ (e2e: run / not needed)
Commit: <hash> <message>
```
