# Dir Food — AI Coding Rules & Architecture Pointer

> Single Source of Truth: **[`dir-food-backend/AGENTS.md`](./dir-food-backend/AGENTS.md)** and **[`AGENTS.md`](./AGENTS.md)**.
> Reference Architecture: **`ronaq-store-backend`** (`/home/usman/Saas/ronaq-store/ronaq-store-backend`).

## Critical Conventions (Must Never Be Ignored)
1. **Module Layout:** Every module has `controllers/`, `services/`, `dto/`, and `<module>.module.ts`.
2. **Controller Separation:** Controllers NEVER inject `PrismaService` or execute DB queries. They delegate 100% of business and database logic to services.
3. **Spec Coverage:** Every controller has `<name>.controller.spec.ts`. Every service has `<name>.service.spec.ts`. Every util has `<name>.spec.ts`.
4. **Tenant Isolation:** Owner queries must always be scoped by `restaurantId` from `@CurrentUser()`. Never accept `restaurantId` from the request body.
5. **Approval Workflow:** Approval requires 4 prerequisites (WhatsApp number, opening hours, active menu item, active delivery area) and starts the 30-day trial from server time.
6. **Currency:** `BigInt` paisa (Rs 1 = 100 paisa). Never use floats.
