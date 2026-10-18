# Tasks: [NNN] [Feature Title]

Spec Reference: `docs/specs/NNN-[name]/spec.md`

Rules:
- One logical unit per commit (source + spec together).
- Run verify loop (`npx tsc --noEmit && npm run lint && npm test -- <spec>`) before checking off any task.
- Stop and report after completing each Batch. Do NOT continue to next batch without user confirmation.

---

### Batch 1: Schema & DTOs
- [ ] Task 1.1: Update Prisma schema in `prisma/models/<name>.prisma` & `npx prisma validate`.
- [ ] Task 1.2: User runs migration: `npx prisma migrate dev --name <migration_name>` & `npx prisma generate`.
- [ ] Task 1.3: Create request DTOs in `src/<module>/dto/` with class-validator and Swagger annotations.

---

### Batch 2: Service Layer & Unit Tests
- [ ] Task 2.1: Implement business logic in `src/<module>/services/<name>.service.ts` with tenant isolation.
- [ ] Task 2.2: Implement unit tests in `src/<module>/services/<name>.service.spec.ts` covering happy path & exceptions.
- [ ] Task 2.3: Verify loop passes (`tsc`, `oxlint`, `vitest`).

---

### Batch 3: Controller Layer & Module Wiring
- [ ] Task 3.1: Implement HTTP controller in `src/<module>/controllers/<name>.controller.ts` with guards.
- [ ] Task 3.2: Implement controller unit tests in `src/<module>/controllers/<name>.controller.spec.ts`.
- [ ] Task 3.3: Register controller & service in `src/<module>/<module>.module.ts` and `src/app.module.ts`.

---

### Batch 4: Verification & Documentation
- [ ] Task 4.1: Create E2E integration test in `test/<module>.e2e-spec.ts`.
- [ ] Task 4.2: Update `AGENTS.md` with new endpoint documentation.
- [ ] Task 4.3: Log completion in `docs/status.md`.
