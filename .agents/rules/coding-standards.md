# Coding Standards & Architecture Rules

## 1. Reference Codebase Pattern (Ronaq Store)
Every feature module in the backend (`dir-food-backend/src/<module>/`) must mirror the structure of `/home/usman/Saas/ronaq-store/ronaq-store-backend`:

- `controllers/` contains `<name>.controller.ts` and its mandatory `<name>.controller.spec.ts`.
- `services/` contains `<name>.service.ts` and its mandatory `<name>.service.spec.ts`.
- `dto/` contains DTO definitions.
- `<module-name>.module.ts` registers controllers, providers, and exports.

## 2. Controllers Must NOT Contain Database or Business Logic
- Never inject `PrismaService` into a controller.
- Never write database queries, prisma calls, or business rules in a controller.
- Controllers are strictly HTTP entrypoints that validate inputs, handle auth context, and delegate directly to services.
- All database queries, transactions, validations, audit logging, and domain calculations belong exclusively in `services/`.

## 3. Mandatory 100% Spec Coverage
- For each controller `<name>.controller.ts`, there must be `<name>.controller.spec.ts`.
- For each service `<name>.service.ts`, there must be `<name>.service.spec.ts`.
- For each helper/util `<name>.ts`, there must be `<name>.spec.ts`.
- Always verify all unit tests pass with `npm test` and integration tests pass with `npm run test:e2e`.

## 4. Multi-Tenant Isolation
- In owner routes, tenant queries must always be scoped by `user.restaurantId` extracted from `@CurrentUser()`.
- Never trust `restaurantId` provided in client request bodies or parameters for owner actions.
- The global validation pipe must enforce `forbidNonWhitelisted: true`.

## 5. Domain & Lifecycle Rules
- Public registration creates `PENDING` restaurants and initial owner account atomically; does NOT start 30-day trial.
- Admin approval requires all 4 prerequisites (WhatsApp number, opening hours, active menu item, active delivery area), sets `ACTIVE`, and starts the 30-day trial from server time.
- `DEACTIVATED` status is terminal through normal application workflows.
- Currency is strictly `BigInt` paisa (Rs 1 = 100 paisa).
