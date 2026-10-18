# /refactor — Dir Food Backend Safe Refactoring

**Usage**: `/refactor` then describe what to remove, replace, rename, or restructure.

Every refactor goes through: **requirements → audit → approve → execute in green steps → verify**.

---

## Step 1: Gather Requirements — ask the user
1. **What to change?** (module, service method, DTO, Prisma field, dependency, folder structure)
2. **What replaces it?** (new name / new pattern / different library / nothing)
3. **Behaviour change allowed?** Default **no** — a refactor keeps all API responses and error codes identical.
4. **Constraints?** (keep route paths, keep response shape for the frontend, don't touch module X)

If the answer involves a **DB schema change** or **API contract change**, it is a feature, not a refactor →
suggest `/feature-dev` so it gets a spec.

---

## Step 2: Audit (touch nothing)
```
@refactoring-agent
AUDIT ONLY — touch nothing yet.
Change: <what>
Replacement: <what>
Find every usage in src/, test/, prisma/, AGENTS.md, CLAUDE.md, package.json, .env.example.
List affected specs and e2e tests. Flag any public API or DB impact.
Present the impact report.
```
Wait for the audit report.

---

## Step 3: Research — OPTIONAL (only if the replacement is unfamiliar)
```
@researcher
Topic: <replacement library/pattern> for NestJS 12 + Prisma 7 + Vitest (ESM)
```

---

## Step 4: Approve
Show the user: files affected, execution order, risk level.
**"Proceed with this plan? (Y/N)"** — wait for an explicit yes.

---

## Step 5: Execute
```
@refactoring-agent
Approved plan: <paste>
Execute step by step. After EACH step: npx tsc --noEmit && npm run lint && npm test — all green before continuing.
One logical unit per commit: refactor(<scope>): <what>.
Stop and report if any step cannot be made green in 3 attempts.
```

---

## Step 6: Verify
```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
grep -rn "<old name>" src/ test/ --include="*.ts"   # should be empty
```
If routes, guards, or Prisma queries were touched, ask the user to run `npm run test:e2e`.

---

## Step 7: Report
```
Refactor Complete ✅
Changed: <summary>
Files: <N>   Commits: <N>
Behaviour change: none (or: <described>)
tsc ✓ lint ✓ unit ✓ build ✓ (e2e: user-verified / not needed)
Docs updated: AGENTS.md (if structure/routes changed)
```
