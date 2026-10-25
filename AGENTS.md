# DIR FOOD — Project AGENTS.md (Single Source of Truth)

> **MANDATORY FOR ALL AGENTS AND DEVELOPERS:**  
> Read this file and [`dir-food-backend/AGENTS.md`](./dir-food-backend/AGENTS.md) before writing any code.
> All code must 100% adhere to the code patterns, module structure, and testing standards established in **`ronaq-store-backend`** (`/home/usman/Saas/ronaq-store/ronaq-store-backend`).

---

## 1. Project Overview

Dir Food is a restaurant-discovery and WhatsApp-request platform for Timergara and Lower Dir, Pakistan.
- **Backend:** `dir-food-backend/` (NestJS 12, Prisma 7 with PostgreSQL adapter, Vitest, oxlint).
- **Database:** Dedicated local development PostgreSQL cluster.
- **Documentation:** `docs/01_Requirements_and_Scope.md` through `docs/04_API_and_Architecture.md`.

---

## 2. Non-Negotiable Engineering Rules

1. **Follow the Ronaq Store Architecture 100%:**
   - Every module must have `controllers/`, `services/`, and `dto/` subdirectories.
   - **No Database Logic in Controllers:** Controllers handle HTTP routing, parameter extraction, and status codes only. Never inject `PrismaService` or run queries inside a controller. All database queries, transactions, and business logic live in `services/`.
2. **100% Spec File Requirement:**
   - Every controller MUST have a corresponding `<name>.controller.spec.ts` in `controllers/`.
   - Every service MUST have a corresponding `<name>.service.spec.ts` in `services/`.
   - Every helper/util MUST have a corresponding `<name>.spec.ts`.
   - All unit tests (`npm test`) and e2e integration tests (`npm run test:e2e`) must pass.
3. **Multi-Tenancy & Tenant Isolation:**
   - Always filter by `restaurantId` from the authenticated user token (`@CurrentUser()`).
   - Never trust client-supplied restaurant IDs in request bodies for owner operations.
4. **Restaurant Lifecycle:**
   - Registration creates `PENDING` restaurants and owner accounts atomically; automatically starts the 30-day trial from server time (`trialStartedAt = now`, `subscriptionEndsAt = now + 30 days`).
   - Restaurant remains `PENDING` (hidden from public catalog) until owner self-publishes.
   - Self-publishing (`POST /me/restaurant/publish`) validates 4 prerequisites: WhatsApp number, opening hours, active menu item, active delivery area; transitions status to `ACTIVE` without requiring platform admin approval.
   - `DEACTIVATED` is terminal in normal application workflows.
5. **Authentication, Guards & Token Management:**
   - Separate endpoints for Platform Admin (`POST /auth/platform-admin/login`) and Restaurant Owner (`POST /auth/login`).
   - Single-use setup token links via admin endpoint and one-time password setup.
   - JWT managed via `@nestjs/jwt` (`JwtService`) with typed token audiences (`AuthTokenType`).
   - Database-backed guards (`RestaurantAuthGuard`, `PlatformAdminGuard`) re-verify user/restaurant status per request.
   - `RestaurantAuthGuard`: allows `PENDING` & expired subscriptions for dashboard setup; allows read-only `GET` when `SUSPENDED` while blocking mutations (`POST`/`PATCH`/`DELETE`); blocks `DEACTIVATED`.
   - Brute-force protection: 5 failed attempts = 15m lockout; always equalizes timing via dummy bcrypt comparison.
6. **Multi-File Prisma Schema Architecture:**
   - Prisma 7 configured for multi-file loading (`schema: 'prisma'` in `prisma.config.ts`).
   - `prisma/enums.prisma` contains all enums.
   - `prisma/models/` contains domain models (`tenant.prisma`, `delivery.prisma`, `menu.prisma`, `orders.prisma`, `audit.prisma`).
7. **Money & WhatsApp Privacy:**
   - All currency values stored as `BigInt` in paisa (Rs 1 = 100 paisa).
   - Minimal snapshot data stored for WhatsApp handoff requests (do not store full raw messages).
   - Required `expectedSubtotal` with HTTP 409 `PRICE_CHANGED` if prices changed since fetch.
8. **Public Discovery & Menu Catalog:**
   - `PublicCatalogModule` manages `/public/areas` and `/public/restaurants` (list, detail, menu).
   - Visibility strictly enforces `status = ACTIVE` and `subscriptionEndsAt > now`. Ineligible restaurants return uniform 404 `RESTAURANT_NOT_AVAILABLE`.
   - Never expose internal IDs, user accounts, audit logs, admin notes, status reasons, or subscription dates.
   - Dynamic opening hours and nextOpenAt strictly evaluated using `Asia/Karachi` timezone (UTC+5), with global open-first ranking.

9. **Order Intents & WhatsApp Requests (Phase 6):**
   - Server price recalculated; throws 409 `PRICE_CHANGED` if client expectedSubtotal differs.
   - Reference codes (`TM-XXXXXX`) using unambiguous charset. Raw messages never stored.
   - Layered IP (5 per 10m) and salted phone hash (3 per 1h per restaurant) rate limiting.

10. **Platform Admin Operations & Areas (Phase 7):**
    - `PlatformAdminModule` under `/admin/` protected by `PLATFORM_ADMIN` role and guards.
    - Restaurant lifecycle: admin-assisted onboarding (`POST /admin/restaurants`), status changes, subscription extensions/shortenings, slug changes, setup links.
    - Master delivery areas CRUD under `/admin/areas`.
    - Support order-intent lookup, 7-day activity metrics, and audit log exploration.

11. **Deals & Cross-Category Combos:**
    - Menu items support `isDeal` flag and `originalPrice` (BigInt paisa).
    - Validation guarantees `originalPrice > basePrice` when specified.
    - Merchant dashboard provides an interactive Cross-Category Combo Builder with automatic retail sum aggregation and auto-generated combo descriptions.
    - Storefront catalog renders top scroll-snap featured deals carousel, discount badges, cut prices, and KFC/Foodpanda-style combo breakdown modals.

12. **Multi-District Hierarchy, Area Verification & Typo Aliasing:**
    - `City` model scopes all restaurants and master delivery areas (`cityId`).
    - Standard admin areas are verified (`isVerified = true`). Owner-created custom areas default to unverified (`isVerified = false`).
    - Customer storefront strictly serves `{ isActive: true, isVerified: true }`; unverified entries are completely hidden from public discovery.
    - `AreaAlias` table (`@@unique([cityId, normalized])`) stores canonical mappings for misspelled/alternative area names.
    - When an owner adds a custom area, the normalized string is checked against `AreaAlias` to automatically reuse canonical areas.
    - Platform admin governance:
      - `POST /admin/areas/:id/approve`: Cleans spelling/slug and publishes to storefront.
      - `POST /admin/areas/:id/merge`: Re-links restaurant coverage, creates permanent alias in `AreaAlias`, and deletes the duplicate area.
      - `DELETE /admin/areas/:id`: Removes unneeded areas.
    - Real-time frontend cache synchronization: changing restaurant district in profile immediately invalidates and refetches delivery areas via city-scoped TanStack Query keys (`['restaurant-delivery-areas', cityId]`).





