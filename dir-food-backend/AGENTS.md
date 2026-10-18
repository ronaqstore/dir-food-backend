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

1. **Dedicated Auth Endpoints & Token Management:**
   - Platform Admin and Restaurant Owner auth flows are strictly separated:
     - `POST /auth/login`: Dedicated restaurant owner login (`OwnerLoginDto`).
     - `POST /auth/platform-admin/login`: Dedicated platform admin login (`PlatformAdminLoginDto`). Cross-login attempts return HTTP 403 Forbidden.
     - `POST /platform-admin/users/:userId/password-setup-link`: Admin single-use setup link issuance.
     - `POST /auth/setup-password`: One-time password setup consuming SHA-256 token hash.
     - `POST /auth/change-password`: Authenticated password change.
     - `GET /auth/me`: Current profile and restaurant association.
   - JWT tokens are signed and verified globally via `@nestjs/jwt` (`JwtService`) with explicit `AuthTokenType` (`RESTAURANT_OWNER` vs `PLATFORM_ADMIN`).

2. **Database-Backed Guards:**
   - **`PlatformAdminGuard`**: Verifies JWT type `PLATFORM_ADMIN`, re-checks database that user exists, role is `PLATFORM_ADMIN`, and status is not `DISABLED`.
   - **`RestaurantAuthGuard`**: Verifies JWT type `RESTAURANT_OWNER`, re-checks database for user and restaurant status on every request:
     - User status `DISABLED` is immediately revoked (HTTP 403).
     - Restaurant `PENDING`: Allowed through to configure dashboard, hours, and menu.
     - Restaurant `ACTIVE` with expired subscription: Allowed through for dashboard configuration (customer orders blocked at checkout).
     - Restaurant `SUSPENDED`: Read-only `GET` queries are permitted; all mutations (`POST`, `PATCH`, `DELETE`) return HTTP 403 Forbidden.
     - Restaurant `DEACTIVATED`: All requests return HTTP 403 Forbidden.
   - Brute-force protection: 5 consecutive failed logins trigger a 15-minute account lockout (`lockedUntil`). Password comparisons always invoke `timingEqualizer` dummy bcrypt hash to eliminate username enumeration timing attacks.

3. **Owner Isolation:**
   - For any restaurant owner endpoint (e.g. `/me/restaurant`, menus, categories, orders), lookups MUST use `user.restaurantId` obtained from `@CurrentUser()`.
   - Never accept `restaurantId` from the request body or query parameter for owner routes.
   - The global `ValidationPipe` uses `forbidNonWhitelisted: true`, rejecting unauthorized payload fields with HTTP 400.

---

## 5. Multi-File Prisma Schema Architecture (Ronaq Store Pattern)

Prisma 7 is configured for multi-file schema loading (`schema: 'prisma'` in `prisma.config.ts`):
- `prisma/schema.prisma`: Master client generator and database datasource.
- `prisma/enums.prisma`: Centralized system enums (`RestaurantStatus`, `ManualStatus`, `UserRole`, `UserStatus`, `OrderIntentStatus`, `DeliveryFeeStatus`).
- `prisma/models/tenant.prisma`: `Restaurant` and `User` models.
- `prisma/models/delivery.prisma`: `Area`, `RestaurantDeliveryArea`, and `RestaurantHours`.
- `prisma/models/menu.prisma`: `MenuCategory`, `MenuItem`, and `MenuItemVariant`.
- `prisma/models/orders.prisma`: `OrderIntent` and `OrderIntentItem`.
- `prisma/models/audit.prisma`: `AuditLog`.

---

## 6. Restaurant Lifecycle & Approval Rules

1. **Registration:**
   - Public self-registration (`POST /auth/register`) atomically creates the restaurant with status `PENDING` and the initial owner account (`RESTAURANT_OWNER`).
   - Self-registration **never** directly activates a restaurant and **never** starts the 30-day trial.
   - Passwords must be hashed with bcrypt (salt rounds: 12). Plaintext passwords and password hashes must never be returned in responses.

2. **Approval & Self-Serve Publishing Prerequisites (`PENDING` -> `ACTIVE`):**
   Publishing (by owner via `POST /me/restaurant/publish`) or approval (by admin via `PATCH /admin/restaurants/:id/status`) requires all 4 prerequisites to be satisfied:
   1. Valid WhatsApp contact number configured on restaurant.
   2. Configured opening hours.
   3. At least one active menu item.
   4. At least one active delivery area.
   - Owners can check readiness beforehand via `GET /me/restaurant/readiness`.
   - If any prerequisite is missing on self-publishing, throws HTTP 422 `PUBLISH_PREREQUISITES_NOT_MET` (or `APPROVAL_PREREQUISITES_NOT_MET` for admin).
   - If already active, `POST /me/restaurant/publish` throws HTTP 409 `ALREADY_ACTIVE`.
   - Publishing/approval starts the 30-day trial (`trialStartedAt = now`, `subscriptionEndsAt = now + 30 days`).
   - Self-publishing records `RESTAURANT_SELF_PUBLISHED` in the audit log; admin approval records `RESTAURANT_APPROVED`.

3. **Status Transitions:**
   - `DEACTIVATED` is terminal through normal workflows. Any attempt to modify or reactivate throws HTTP 409 `ConflictException`.
   - `SUSPENDED` and `DEACTIVATED` require a non-empty `reason`.
   - Reactivating a suspended restaurant (`SUSPENDED` -> `ACTIVE`) must preserve existing subscription dates.

---

## 7. Response & Error Envelopes

- **Success Envelope:** All endpoints return `{ data: ... }` via the global `ResponseEnvelopeInterceptor`.
- **Error Envelope:** All errors return `{ error: { code, message, details? } }` via the global `HttpExceptionFilter`.
- Tests must assert against `res.body.data` or `res.body.error`.

---

## 8. Public Restaurant Discovery & Menu Catalog (Phase 5)

1. **Module & Endpoints:**
   - Managed under `PublicCatalogModule` (`src/public-catalog/`).
   - `GET /public/areas`: Returns active discovery areas (`id`, `name`, `slug`).
   - `GET /public/restaurants`: Paginated listing with `areaId`, `cuisine`, `q`, and `openNow` filters. Open restaurants rank ahead of closed restaurants globally.
   - `GET /public/restaurants/:slug`: Public restaurant profile including today's hours, active delivery areas, and delivery fees.
   - `GET /public/restaurants/:slug/menu`: Active menu catalog (categories, items, variants).

2. **Public Visibility & Expiry Rules:**
   - Any public restaurant request strictly requires `status = ACTIVE` and `subscriptionEndsAt > now`.
   - Inactive, pending, suspended, deactivated, expired, or non-existent restaurants uniformly return HTTP 404 with error code `RESTAURANT_NOT_AVAILABLE`.

3. **Privacy & Information Security:**
   - Internal UUIDs of restaurants, user accounts, audit trails, administrative notes (`adminNotes`), internal status reasons (`statusReason`), and subscription lifecycle dates (`trialStartedAt`, `subscriptionEndsAt`) are strictly omitted from public responses.
   - Single-query joins and explicit field projections prevent N+1 query performance degradation.

4. **Timezone & Dynamic Status:**
   - Evaluated strictly using `Asia/Karachi` timezone (UTC+5).
   - Accurately tracks same-day ranges, overnight ranges extending into the morning, multiple daily shifts, manual overrides (`CLOSED`, `TEMP_UNAVAILABLE`), and future scheduled openings (`nextOpenAt`).

5. **Catalog & BigInt Serialization:**
   - Inactive categories, items, and variants are excluded. Out-of-stock items (`isAvailable = false`) remain visible.
   - All monetary values (`basePrice`, variant `price`, `minOrderAmount`, `deliveryFee`) are stored as `BigInt` paisa and serialized to safe integer numbers via `ResponseEnvelopeInterceptor`.

---

## 9. Order Intents & WhatsApp Handoff Lifecycle (Phase 6)

1. **Module & Endpoints:**
   - Managed under `OrderIntentsModule` (`src/order-intents/`).
   - `POST /public/cart/validate`: Re-validates items, active variants, live prices, and operating hours. Does not persist to DB.
   - `POST /public/order-intents`: Creates an immutable snapshot order intent with client-generated idempotency UUID (`clientRequestId`).
   - `POST /public/order-intents/:ref/whatsapp-opened`: Tracks button clicks; sets `whatsappOpenedAt` while unexpired.
   - `GET /public/order-intents/:ref`: Re-shows handoff screen and rebuilds `whatsappUrl` dynamically from snapshot.
   - `GET /me/restaurant/order-intents`: Paginated owner stream of incoming requests (default 30 days) with `notConfirmed: true`.
   - `GET /me/restaurant/order-intents/:id`: Owner request detail.
   - `GET /me/restaurant/stats`: Owner dashboard activity metrics (`requestsCreated`, `whatsappOpened`, `whatsappOpenRate`, `topItems`).

2. **Price Guard & Safety:**
   - Client sends `expectedSubtotal`. If backend-calculated subtotal differs, throws `409 ConflictException` (`PRICE_CHANGED`) with updated line items. Nothing is saved.
   - Enforces `minOrderAmount` with `422 UnprocessableEntityException` (`BELOW_MINIMUM_ORDER`).
   - If closed, throws `409 ConflictException` (`RESTAURANT_CLOSED`).

3. **Message & WhatsApp URLs:**
   - Formatted in Urdu / English polite style using `wa.me/${phone}?text=...` with URL-encoded text.
   - Human-friendly reference codes (`TM-XXXXXX`) using unambiguous charset (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`).
   - Raw messages are never stored in the database; always dynamically reconstructed from snapshot columns.

4. **Rate Limiting & Expiry:**
   - Layered IP rate limit (5 per 10m) and salted phone hash rate limit (3 per 1h per restaurant) when phone provided.
   - Customer phone numbers are never written to system logs.
   - 24-hour expiration (`expiresAt = now + 24h`). Expired requests return `409` / `410` without scheduled cron deletion.

---

## 10. Platform Admin Management & Operations (Phase 7)

1. **Module & Endpoints:**
   - Managed under `PlatformAdminModule` (`src/platform-admin/`).
   - Protected by `@Roles(UserRole.PLATFORM_ADMIN)` and `RolesGuard` / `PlatformAdminGuard`.
   - **Restaurant Administration (`PlatformAdminController`):**
     - `GET /admin/restaurants`: Paginated restaurant listing with `status` filter and `q` search.
     - `POST /admin/restaurants`: Admin-assisted onboarding creates restaurant and owner account atomically, returning a single-use password setup link.
     - `GET /admin/restaurants/pending`: Lists pending restaurant onboarding applications.
     - `GET /admin/restaurants/:id`: Restaurant onboarding detail including verification checklist (`isReadyForApproval`, `missingPrerequisites`).
     - `PATCH /admin/restaurants/:id`: Support updates and internal `adminNotes`.
     - `PATCH /admin/restaurants/:id/status`: Approval (verifies 4 prerequisites, starts 30-day trial), suspension, or deactivation.
     - `POST /admin/restaurants/:id/subscription/extend`: Extends subscription end date following offline manual payment (`addDays` or explicit `subscriptionEndsAt`). Never alters status.
     - `POST /admin/restaurants/:id/subscription/shorten`: Corrective shortening with mandatory reason and `confirm: true`.
     - `PATCH /admin/restaurants/:id/slug`: Changes URL slug with uniqueness validation and reserved keywords protection.
     - `POST /admin/restaurants/:id/setup-link`: Re-issues single-use password setup link for owner account.
   - **Master Delivery Areas (`PlatformAdminAreasController`):**
     - `GET /admin/areas`: Lists all delivery areas with active restaurant counts.
     - `POST /admin/areas`: Creates master delivery area.
     - `PATCH /admin/areas/:id`: Renames, reorders (`sortOrder`), or toggles active status.
   - **Support, Activity & Audit (`PlatformAdminOperationsController`):**
     - `GET /admin/order-intents`: Support lookup of customer WhatsApp requests by short code reference or customer keywords.
     - `GET /admin/activity`: Aggregated platform 7-day or 30-day activity summary metrics.
     - `GET /admin/audit-logs`: Paginated audit log search with actor, action, and restaurant filtering.
