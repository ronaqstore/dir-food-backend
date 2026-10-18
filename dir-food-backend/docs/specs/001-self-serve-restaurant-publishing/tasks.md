# Tasks: 001 Self-Serve Restaurant Publishing (Owner Go-Live)

Spec Reference: `docs/specs/001-self-serve-restaurant-publishing/spec.md`

Rules:
- One logical unit per commit (source + spec together).
- Run verify loop (`npx tsc --noEmit && npm run lint && npm test -- <spec>`) before checking off any task.
- Stop and report after completing each Batch. Do NOT continue to next batch without user confirmation.

---

### Batch 1: Service Layer & Unit Tests
- [x] Task 1.1: Add `getPublishReadiness(restaurantId)` to `RestaurantsService` with prerequisite checks.
- [x] Task 1.2: Add `publishRestaurant(restaurantId, userId, ipAddress)` to `RestaurantsService` with status transition, 30-day trial initialization, and audit log.
- [x] Task 1.3: Update unit tests in `src/restaurants/services/restaurants.service.spec.ts` covering readiness checks, missing prerequisites (422), already active conflict (409), and successful publishing.
- [x] Task 1.4: Run verify loop (`npx tsc --noEmit && npm run lint && npm test -- src/restaurants/services/restaurants.service.spec.ts`).

---

### Batch 2: Controller Layer & Controller Unit Tests
- [x] Task 2.1: Add `@Get('readiness')` endpoint to `RestaurantMeController` with Swagger documentation.
- [x] Task 2.2: Add `@Post('publish')` endpoint to `RestaurantMeController` with Swagger documentation.
- [x] Task 2.3: Update controller unit tests in `src/restaurants/controllers/restaurant-me.controller.spec.ts`.
- [x] Task 2.4: Run verify loop (`npx tsc --noEmit && npm run lint && npm test -- src/restaurants/controllers/restaurant-me.controller.spec.ts`).

---

### Batch 3: Verification, E2E Integration & Documentation
- [x] Task 3.1: Add E2E tests for self-publishing workflow.
- [x] Task 3.2: Update `AGENTS.md` to document the self-serve publishing endpoints.
- [x] Task 3.3: Log completion in `docs/status.md`.
- [x] Task 3.4: Run full project test suite (`npx tsc --noEmit && npm run lint && npm test`).
