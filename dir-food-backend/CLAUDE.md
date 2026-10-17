# Dir Food Backend — AI Coding Rules

> Single Source of Truth: **[`AGENTS.md`](./AGENTS.md)**.
> Reference Architecture: **`ronaq-store-backend`** (`/home/usman/Saas/ronaq-store/ronaq-store-backend`).

## Non-Negotiable Rules
1. **Module Structure:** All feature modules must have `controllers/`, `services/`, `dto/`, and `<module>.module.ts`.
2. **Controller Separation:** NEVER inject `PrismaService` into controllers or write queries in controllers. All DB access and business logic belongs in `services/`.
3. **Spec Coverage:** Every controller MUST have `<name>.controller.spec.ts`. Every service MUST have `<name>.service.spec.ts`. Every util MUST have `<name>.spec.ts`.
4. **Tenant Isolation:** Filter by `user.restaurantId` from `@CurrentUser()`. Never accept client-supplied `restaurantId` in request bodies for owner actions.
5. **Approval Workflow:** Approval validates 4 prerequisites (WhatsApp number, opening hours, active menu item, active delivery area) and starts the 30-day trial from server time.
6. **Currency:** `BigInt` paisa (Rs 1 = 100 paisa). Never use floats.
7. **Auth & Token Flow:** Separate endpoints for Owner (`/auth/login`) and Platform Admin (`/auth/platform-admin/login`). JWT handled via `@nestjs/jwt`. Per-request DB verification in `RestaurantAuthGuard` (read-only on suspension, blocks deactivated, allows pending/expired setup) and `PlatformAdminGuard`.
8. **Prisma Schema:** Multi-file structure under `prisma/` (`enums.prisma`, `models/*.prisma`, `schema: 'prisma'`).


