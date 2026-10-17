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
   - Registration creates `PENDING` restaurants and owner accounts atomically; does NOT start 30-day trial; does NOT activate restaurant.
   - Approval strictly validates 4 prerequisites: WhatsApp number, opening hours, active menu item, active delivery area.
   - Approval starts the 30-day trial from server time.
   - `DEACTIVATED` is terminal in normal application workflows.
5. **Money & WhatsApp Privacy:**
   - All currency values stored as `BigInt` in paisa (Rs 1 = 100 paisa).
   - Minimal snapshot data stored for WhatsApp handoff requests (do not store full raw messages).
   - Required `expectedSubtotal` with HTTP 409 `PRICE_CHANGED` if prices changed since fetch.
