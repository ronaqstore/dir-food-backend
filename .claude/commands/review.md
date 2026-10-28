# /review — Dir Food Backend Code Review

## Step 1: Find Changes
The git root is the parent folder (`dir-food/`), so always scope to this backend with `-- .`:
```bash
git status --short -- .                          # uncommitted
git diff HEAD --name-only -- .                   # uncommitted file list
git diff <base-commit>..HEAD --name-only -- .    # a range (e.g. since last batch)
git log --oneline -10 -- .                       # context
```
Show the file list to the user and confirm scope:
**"Review these files? (Y/N) — or add/remove any?"**

## Step 2: Review
```
@code-reviewer
Files: <list>
Spec (if any): docs/specs/NNN-<name>/spec.md
Extra focus:
- Tenant isolation on every owner query (restaurantId from @CurrentUser only)
- Guard + @Roles on every new route (or intentional @Public)
- Public response privacy (explicit select, no internal fields)
- Spec file exists and covers new behaviour + error paths
- BigInt paisa for money; $transaction for multi-writes; AuditService where required
```

## Step 3: Handle Findings
For each 🔴 Critical / 🟠 High issue, ask the user: **"Fix this now? (Y/N)"**

If yes, for each fix:
1. Add or adjust a test that exposes the issue.
2. Apply the minimal fix.
3. Run the loop:
   ```bash
   npx tsc --noEmit && npm run lint && npm test -- <spec paths>
   ```
4. Commit the logical unit:
   ```bash
   git add <source> <spec>
   git commit -m "fix(<scope>): <issue>"
   ```

🟡 Medium items → list them for the user; fix only if they say so.

## Step 4: Final Check
```bash
npx tsc --noEmit && npm run lint && npm test
```

## Step 5: Report
```
Review Complete
Result: ✅ / ⚠️ / ❌
Critical: <n found> / <n fixed>
High:     <n found> / <n fixed>
Medium:   <n found> (deferred: <list>)
tsc ✓ lint ✓ unit ✓
```
