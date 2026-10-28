# /new-module-scaffold — NestJS Module Scaffold

Quickly scaffolds a new feature module following the mandatory Dir Food structure
(AGENTS.md §2–3), modelled on `src/delivery-areas/`. Use for small, well-understood modules;
for anything with business rules, run `/feature-dev` first so a spec exists.

## Step 1: Ask
1. **Module name** (kebab-case, plural noun — e.g. `restaurant-reviews`).
2. **Caller**: `RESTAURANT_OWNER` (`/me/restaurant/...`), `PLATFORM_ADMIN` (`/admin/...`), or `PUBLIC` (`/public/...`).
3. **Prisma model** it works with (must already exist in `prisma/models/*.prisma`, or the spec must add it first).
4. **Endpoints** needed (e.g. list, get, create, update, delete).
5. Is there an approved spec in `docs/specs/`? (if yes, follow it exactly)

## Step 2: Read the reference
Read `src/delivery-areas/` fully: controller, controller spec, service, service spec, dto, module.

## Step 3: Create files in this order
Each step: create the file **and its spec**, then run the loop before moving on.

```
src/<name>/
  dto/
    create-<entity>.dto.ts           (class-validator + @ApiProperty; money = integer paisa; ids = @IsUUID('7'))
    update-<entity>.dto.ts
  services/
    <name>.service.ts                (PrismaService injected; tenant filter on every owner query)
    <name>.service.spec.ts           (mockPrisma with vi.fn(); $transaction mock runs callback)
  controllers/
    <name>.controller.ts             (guards + @Roles; @CurrentUser(); delegates only)
    <name>.controller.spec.ts        (mockService; asserts delegation with user.restaurantId)
  <name>.module.ts                   (imports PrismaModule [+ AuditModule]; controllers; providers; exports service)
```

Then register the module in `src/app.module.ts`.

### Controller header — owner example
```ts
@ApiTags('Restaurant Owner - <Title>')
@ApiBearerAuth('bearer')
@Controller('me/restaurant/<name>')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard, RestaurantAuthGuard)
export class <Name>Controller {
  constructor(private readonly <name>Service: <Name>Service) {}
}
```
Relative imports end in `.js`. Enums come from `../../generated/prisma/enums.js`.

## Step 4: Verify Loop
```bash
npx tsc --noEmit
npm run lint
npm test -- src/<name>/
```
All green, or fix and re-run (max 3 attempts per failure, then stop and report).

## Step 5: Commit (one logical unit each)
```bash
git add src/<name>/dto/
git commit -m "feat(<name>): add DTOs"
git add src/<name>/services/
git commit -m "feat(<name>): add service with specs"
git add src/<name>/controllers/
git commit -m "feat(<name>): add controller with specs"
git add src/<name>/<name>.module.ts src/app.module.ts
git commit -m "feat(<name>): register module"
```

## Step 6: Report
```
Module scaffolded ✅  src/<name>/
Endpoints: <list>
Specs: <n> passing
Next: add e2e test in test/<name>.e2e-spec.ts, document endpoints in AGENTS.md, update docs/status.md
```

