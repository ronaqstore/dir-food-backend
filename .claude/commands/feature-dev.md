# /feature-dev — Dir Food Backend Feature Development (SDD pipeline)

Builds a backend feature through: **intake → API design → spec → implement (loop) → review → verify**.
Nothing is coded before the spec is approved.

## Step 1: Intake — ask the user
1. **Feature name** (short, kebab-case — e.g. `menu-item-bulk-availability`).
2. **What problem does it solve, and for whom?** (1–2 sentences: customer / restaurant owner / platform admin)
3. **Which module(s)?** (`auth`, `restaurants`, `menu-items`, `menu-categories`, `delivery-areas`, `restaurant-hours`, `public-catalog`, `order-intents`, `platform-admin`, `uploads`, `audit`, or new)
4. **Who calls it?** `PUBLIC` / `RESTAURANT_OWNER` / `PLATFORM_ADMIN`
5. **Database change?** new table / new field / none / not sure
6. **Must it be audited?** (state changes by admins/owners usually yes)
7. **Anything explicitly out of scope?**

If the feature uses a new library or an unfamiliar NestJS/Prisma capability, go to Step 2. Otherwise skip to Step 3.

## Step 2: Research — CONDITIONAL
```
@researcher
Topic: <e.g. "Rate limiting per restaurant with NestJS 12 without Redis">
Context: <feature summary from Step 1>
```

## Step 3: API Design
```
@api-designer
Feature: <name>
Problem & caller: <Step 1 answers 2 + 4>
Modules: <Step 1 answer 3>
DB change: <Step 1 answer 5>
Audit: <Step 1 answer 6>
Out of scope: <Step 1 answer 7>
Read AGENTS.md, docs/status.md and the related prisma/models files first.
```
Show the design to the user. Resolve every **Open Question** with the user.
**Do not continue until the user approves the design.**

## Step 4: Spec (SDD blueprint)
```
@planner
Approved API design:
<paste the approved design>
Create docs/specs/NNN-<feature-name>/spec.md and tasks.md from docs/specs/_template/.
```
Present the spec summary + task batches to the user.

Then ask the user: **"In 2 sentences, what will this feature do and which rule (tenant isolation / approval / money / privacy) does it touch?"**
If they can't explain it back, the spec is too dense — simplify and ask again.

**Wait for explicit approval. Do NOT implement without it.**

## Step 5: Implement — one batch at a time (loop engineering)
```
@implementer
Approved spec: docs/specs/NNN-<feature-name>/spec.md
Tasks: docs/specs/NNN-<feature-name>/tasks.md
Execute Batch <N> only. Run the verify loop (tsc → lint → tests) for every task. Stop after the batch.
```
If the implementer reports it is stuck (3 failed attempts) → run `/fix-bug` with its report.

## Step 6: Review — after each batch
```
@code-reviewer
Spec: docs/specs/NNN-<feature-name>/spec.md
Files: <git diff --name-only for this batch, scoped to dir-food-backend>
```
- 🔴 Critical / 🟠 High findings → send back to `@implementer` to fix, then re-review.
- 🟡 Medium → ask the user whether to fix now or later.

## Step 7: User Verification — the USER does this
Tell the user exactly what to check, for example:
> "Batch complete. Please run `npm run test:e2e -- test/<name>.e2e-spec.ts`, or start `npm run start:dev`
> and try `<METHOD> <path>` in Swagger at `http://localhost:<port>/api/docs`. Confirm when done."

**Do not start the next batch until the user confirms.** Then loop back to Step 5.

## Step 8: Close Out (after the last batch)
1. Make sure `AGENTS.md` describes the new endpoints/rules (planner added this as the final task).
2. Append to `docs/status.md`: date, spec number, endpoints added, commits, test results.
3. Mark the spec status `Done` at the top of `spec.md`.

## Step 9: Final Report
```
Feature Complete ✅  <name>  (spec NNN)
Endpoints: <list>
DB changes: <migration name or none>
Commits: <N>   Files: <N>
tsc ✓  lint ✓  unit ✓  e2e ✓ (user-verified)
Docs updated: AGENTS.md, docs/status.md
```

## Pipeline Quick Reference
```
Step 1  Intake (7 questions)
Step 2  @researcher        ← only if new library / unfamiliar pattern
Step 3  @api-designer      ← always   → USER APPROVES design
Step 4  @planner           ← always   → USER APPROVES spec   (SDD gate)
Step 5  @implementer       ← per batch, verify loop inside   (loop engineering)
Step 6  @code-reviewer     ← per batch
Step 7  USER verifies      ← per batch, then next batch
Step 8  Update AGENTS.md + docs/status.md
Step 9  Final report
```
