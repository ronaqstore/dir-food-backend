# DIR FOOD BACKEND — AGENTS.md (Single Source of Truth)

> **MANDATORY FOR ALL AGENTS AND DEVELOPERS:**  
> This file defines the required architecture, code patterns, testing standards, and non-negotiable rules for the Dir Food backend.
> Follow the exact architecture and code patterns from the reference codebase: **`ronaq-store-backend`** (`/home/usman/Saas/ronaq-store/ronaq-store-backend`).
> Never deviate from these conventions.

---

## 1. Quick Facts

| Field | Value |
|---|---|
| **Project** | Dir Food Backend — Restaurant discovery and WhatsApp request platform for Timergara / Lower Dir, Pakistan |
| **Stack** | NestJS 12 + Prisma 7 (`@prisma/adapter-pg`) + PostgreSQL + Vitest + oxlint |
| **Reference Project** | `/home/usman/Saas/ronaq-store/ronaq-store-backend` |
| **Money Unit** | `BigInt` in **paisa** (Rs 1 = 100 paisa, Rs 1500 = `150000n`). Never use floats for money. |
| **IDs** | Application-generated UUID v7 on all rows. |
| **Multi-tenancy** | Isolated by `restaurantId` extracted from JWT claims (`@CurrentUser()`). Never trust client-supplied `restaurantId` for owner actions. |
| **Test Framework** | Vitest for unit tests (`npm test`) and e2e integration tests (`npm run test:e2e`). |

---

## 2. Mandatory Module Structure & Conventions (Ronaq Store Pattern)

Every feature module MUST strictly follow this directory structure. Do NOT place controllers or services directly in the module root folder.

```
src/<module-name>/
  controllers/
    <name>.controller.ts
    <name>.controller.spec.ts
  services/
    <name>.service.ts
    <name>.service.spec.ts
  dto/
    <name>.dto.ts
  <module-name>.module.ts
```

### Golden Rule: Strict Controller / Service Separation
1. **Controllers are HTTP boundary layers ONLY:**
   - Handle routing decorators (`@Get()`, `@Post()`, `@Patch()`, `@Delete()`).
   - Extract parameters (`@Body()`, `@Query()`, `@Param()`, `@CurrentUser()`, `@Ip()`).
   - Apply guards (`@UseGuards(RolesGuard)`, `@Roles(...)`, `@Public()`).
   - Set HTTP status codes and cookie headers when applicable.
   - **NEVER inject `PrismaService` directly into a controller.**
   - **NEVER execute database queries or business logic inside a controller.**
   - Controllers delegate 100% of data operations and business rules to their dedicated service.

2. **Services own 100% of Business Logic & Database Access:**
   - Inject `PrismaService`, `AuditService`, or other required services.
   - Perform all validation checks, database queries, and transactions (`prisma.$transaction`).
   - Throw semantic NestJS HTTP exceptions (`NotFoundException`, `ConflictException`, `UnprocessableEntityException`, `ForbiddenException`).
   - Record audit log entries where required.

---

## 3. Mandatory 100% Spec Coverage Rule

Every file created in the backend MUST have its corresponding spec file:
- **Every controller** `<name>.controller.ts` MUST have a `<name>.controller.spec.ts` in `controllers/`.
- **Every service** `<name>.service.ts` MUST have a `<name>.service.spec.ts` in `services/`.
- **Every helper / utility** `<name>.ts` MUST have a `<name>.spec.ts` alongside it.
- **Unit Tests:** Run via `npm test`. All controller and service specs must pass with lightweight mocks.
- **E2E Integration Tests:** Run via `npm run test:e2e` against the dedicated local PostgreSQL development database.

---

## 4. Multi-Tenancy & Access Control Rules

1. **Owner Isolation:**
   - For any restaurant owner endpoint (e.g. `/me/restaurant`, menus, categories, orders), lookups MUST use `user.restaurantId` obtained from `@CurrentUser()`.
   - Never accept `restaurantId` from the request body or query parameter for owner routes.
   - The global `ValidationPipe` uses `forbidNonWhitelisted: true`, rejecting unauthorized payload fields with HTTP 400.

2. **Admin Operations:**
   - Platform admin endpoints are placed under `/admin/*` and guarded by `@Roles(UserRole.PLATFORM_ADMIN)` and `RolesGuard`.
   - Restaurant owners must be forbidden (HTTP 403) from accessing admin routes.

---

## 5. Restaurant Lifecycle & Approval Rules

1. **Registration:**
   - Public self-registration (`POST /auth/register`) atomically creates the restaurant with status `PENDING` and the initial owner account (`RESTAURANT_OWNER`).
   - Self-registration **never** directly activates a restaurant and **never** starts the 30-day trial.
   - Passwords must be hashed with bcrypt (salt rounds: 12). Plaintext passwords and password hashes must never be returned in responses.

2. **Approval Prerequisites (`PENDING` -> `ACTIVE`):**
   Approval requires all 4 prerequisites to be satisfied:
   1. Valid WhatsApp contact number configured on restaurant.
   2. Configured opening hours.
   3. At least one category with an active menu item.
   4. At least one configured delivery area.
   - If any prerequisite is missing, throw HTTP 422 `APPROVAL_PREREQUISITES_NOT_MET` detailing the missing items.
   - Approval starts the 30-day trial (`trialStartedAt = now`, `subscriptionEndsAt = now + 30 days`).
   - Approval records `RESTAURANT_APPROVED` in the audit log.

3. **Status Transitions:**
   - `DEACTIVATED` is terminal through normal workflows. Any attempt to modify or reactivate throws HTTP 409 `ConflictException`.
   - `SUSPENDED` and `DEACTIVATED` require a non-empty `reason`.
   - Reactivating a suspended restaurant (`SUSPENDED` -> `ACTIVE`) must preserve existing subscription dates.

---

## 6. Response & Error Envelopes

- **Success Envelope:** All endpoints return `{ data: ... }` via the global `ResponseEnvelopeInterceptor`.
- **Error Envelope:** All errors return `{ error: { code, message, details? } }` via the global `HttpExceptionFilter`.
- Tests must assert against `res.body.data` or `res.body.error`.
