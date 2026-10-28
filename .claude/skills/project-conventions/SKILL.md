---
name: project-conventions
description: >
  Core Dir Food Backend conventions (module layout, controller/service split, tenant
  isolation, money, errors, envelopes, naming, commits). Use whenever writing, planning,
  or reviewing any TypeScript in dir-food-backend.
---

# Dir Food Backend — Project Conventions

> Canonical source: `AGENTS.md`. This is the high-frequency summary. If they ever disagree, AGENTS.md wins.

## Module layout (mandatory)
```
src/<module-name>/
  controllers/<name>.controller.ts + <name>.controller.spec.ts
  services/<name>.service.ts       + <name>.service.spec.ts
  dto/<name>.dto.ts
  utils/<name>.ts                  + <name>.spec.ts      (optional)
  <module-name>.module.ts
```
Shared code lives in `src/common/` (`decorators/`, `guards/`, `filters/`, `interceptors/`, `utils/`).
Reference module: `src/delivery-areas/`.

## Controller vs service
| Controller (HTTP boundary only) | Service (all logic) |
|---|---|
| `@Get/@Post/@Patch/@Put/@Delete`, `@HttpCode` | Inject `PrismaService`, `AuditService` |
| `@Body/@Query/@Param/@CurrentUser/@Ip` | Validation beyond DTOs, business rules |
| `@UseGuards`, `@Roles`, `@Public` | Prisma queries, `$transaction` |
| Swagger decorators | Throw Nest HTTP exceptions with codes |
| **Never** `PrismaService` / queries | Audit logging |

## Tenant isolation
```ts
// ✅ owner: tenant comes from the JWT
async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateXDto) {
  return this.xService.update(user.restaurantId!, id, dto);
}
// service: always scope by restaurantId
const item = await this.prisma.menuItem.findFirst({ where: { id, restaurantId } });
if (!item) throw new NotFoundException('Menu item not found');

// ❌ never
@Body() dto: { restaurantId: string }           // client-supplied tenant
this.prisma.menuItem.findUnique({ where: { id } }) // no tenant scope on owner data
```

## Money, IDs, time
- Money: `BigInt` **paisa** in Prisma (Rs 1 = 100 paisa; Rs 1500 = `150000n`). DTOs take integer paisa (`@IsInt() @Min(0)`), convert with `BigInt(dto.price)`. Never floats. JSON serialization handled by `ResponseEnvelopeInterceptor` (`serializeBigInts`).
- IDs: `@id @default(uuid(7)) @db.Uuid`; DTO validation `@IsUUID('7')`.
- Business time: `Asia/Karachi`.

## Responses & errors
- Success → return the plain value; the global interceptor wraps it as `{ data: ... }`.
- Errors → global `HttpExceptionFilter` emits `{ error: { code, message, details? } }`.
- When the client must branch on the error, pass an object with a `code`:
```ts
throw new ConflictException({ code: 'PRICE_CHANGED', message: 'Prices changed', details: { items } });
throw new UnprocessableEntityException({ code: 'BELOW_MINIMUM_ORDER', message: '...' });
throw new NotFoundException({ code: 'RESTAURANT_NOT_AVAILABLE', message: 'Restaurant not available' });
```
Status guide: 400 validation · 401 auth · 403 role/suspended · 404 missing/hidden · 409 state conflict · 410 expired · 422 business rule.

## ESM & imports
- `"type": "module"` + `nodenext`: **relative imports end in `.js`**.
- Prisma enums/types: `import { UserRole } from '../../generated/prisma/enums.js'`.
- `import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js'` for type-only imports.

## Privacy
Public endpoints use explicit `select`. Never expose: internal UUIDs (restaurants/users/audit), `adminNotes`,
`statusReason`, `trialStartedAt`, `subscriptionEndsAt`, password hashes, token hashes. Never log customer phone numbers.

## Audit
State-changing admin actions (and owner actions where AGENTS.md says so):
```ts
await this.auditService.log({
  actorUserId: adminUserId,
  restaurantId,                 // when applicable
  action: 'AREA_CREATED',       // SCREAMING_SNAKE, past tense
  entityType: 'area',
  entityId: area.id,
  details: { name: area.name },
});
```

## Naming
- Files: kebab-case (`restaurant-hours.service.ts`), classes PascalCase, DTOs `CreateXDto` / `UpdateXDto` / `QueryXDto`.
- Routes: `/public/...`, `/me/restaurant/...`, `/admin/...`, `/auth/...`.
- Error codes & audit actions: `SCREAMING_SNAKE_CASE`.

## Verify & commit
```bash
npx tsc --noEmit && npm run lint && npm test -- <specs>
git add <source> <its spec>          # one logical unit, never `git add .`
git commit -m "feat(<module>): <subject>"
```
