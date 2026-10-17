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

## 6. Authentication, Guards & Token Management
- Separate login endpoints: `POST /auth/login` (Restaurant Owner) and `POST /auth/platform-admin/login` (Platform Admin). Cross-login attempts return HTTP 403.
- Single-use password setup link issued via `POST /platform-admin/users/:userId/password-setup-link` and consumed via `POST /auth/setup-password`.
- JWT tokens signed and verified via `@nestjs/jwt` (`JwtService`) with explicit `AuthTokenType` audience.
- Database-backed request authorization:
  - `PlatformAdminGuard`: verifies JWT and checks DB user exists, is admin, and not disabled.
  - `RestaurantAuthGuard`: verifies JWT and checks DB user and restaurant status.
    - `PENDING`: allowed through for initial setup.
    - Expired subscription: allowed through for dashboard menu/hours setup (customer checkout blocked at order time).
    - `SUSPENDED`: read-only `GET` allowed; mutations (`POST`, `PATCH`, `DELETE`) return HTTP 403.
    - `DEACTIVATED`: all access returns HTTP 403.
    - User `DISABLED`: immediately revoked.
- Brute-force protection: 5 failed attempts lock account for 15 minutes (`lockedUntil`). Password verification always runs `timingEqualizer` dummy bcrypt hash to eliminate enumeration timing attacks.

## 7. Multi-File Prisma Schema Architecture
- Prisma 7 multi-file schema: `prisma.config.ts` points `schema: 'prisma'`.
- `prisma/enums.prisma` contains all enums.
- `prisma/models/` contains domain models (`tenant.prisma`, `delivery.prisma`, `menu.prisma`, `orders.prisma`, `audit.prisma`).
- `prisma/schema.prisma` contains the root generator and datasource.

