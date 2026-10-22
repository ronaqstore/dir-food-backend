# Dir Food Backend — Development Status & History

Log of completed feature batches and specs. Coding agents check this file before planning to avoid duplicating work.

---

## Foundation & Implemented Phases (Per AGENTS.md)
- **Phase 1:** Core setup, NestJS 12, Prisma 7, PostgreSQL, Vitest, oxlint.
- **Phase 2:** Multi-tenant Auth & RBAC (Owner login, Platform Admin login, single-use password links, lockout).
- **Phase 3:** Restaurant Lifecycle & Approval prerequisites (Pending, Active, Suspended, Deactivated).
- **Phase 4:** Restaurant Owner Dashboard & Catalog (menu categories, menu items, item variants, delivery areas, hours).
- **Phase 5:** Public Discovery & Catalog (`/public/areas`, `/public/restaurants`, `/public/restaurants/:slug/menu`, Karachi timezone).
- **Phase 6:** Order Intents & WhatsApp handoff lifecycle (`/public/order-intents`, reference codes `TM-XXXXXX`, rate limits).
- **Phase 7:** Platform Admin Management & Operations (`/admin/restaurants`, `/admin/areas`, `/admin/audit-logs`).

---

## Completed Feature Specs Log
| Spec | Title | Completion Date | Commits | Notes |
|---|---|---|---|---|
| (Baseline) | Initial Phase 1–7 baseline implementation | 2026-10-17 | Baseline | All core modules operational |
| 001 | Self-Serve Restaurant Publishing (Model 2) | 2026-10-18 | feat(restaurants) | `GET /me/restaurant/readiness` & `POST /me/restaurant/publish` |
| 002 | Menu Item Deals & Cross-Category Combos | 2026-10-22 | feat(menu-items) | `originalPrice`, `isDeal`, Combo Builder & Storefront Carousel |
