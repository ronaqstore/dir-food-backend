# Spec: [NNN] [Feature Title]

- **Status:** Draft / In Review / Approved / Done
- **Author:** AI + Usman
- **Date:** YYYY-MM-DD
- **Target Module:** `src/<module>/`

---

## 1. Context & Business Value
- **Who needs this:** (Customer / Restaurant Owner / Platform Admin)
- **Problem solved:** 
- **User Journey:** (1–2 sentences)

---

## 2. Access Control & Multi-Tenancy (CRITICAL)
- **Role(s) Allowed:** `PUBLIC` / `RESTAURANT_OWNER` / `PLATFORM_ADMIN`
- **Guards Applied:** (e.g. `RolesGuard`, `RestaurantAuthGuard`, `PlatformAdminGuard`, or `@Public()`)
- **Tenant Extraction:** `user.restaurantId` from `@CurrentUser()` (NEVER from client request body)
- **Suspension Policy:** Normal `RestaurantAuthGuard` rules apply (GET allowed on SUSPENDED, mutations blocked)

---

## 3. API Contract & Endpoints
| Method | Path | Auth / Role | Success (Envelope Data) | Error Codes |
|---|---|---|---|---|
| `POST` | `/me/restaurant/...` | `RESTAURANT_OWNER` | `{ id, ... }` | 400, 403, 404, 409 |

### Request DTOs
- `Create<Name>Dto`:
  - `field1`: string, `@IsNotEmpty()`, `@IsString()`
  - `price`: integer paisa, `@IsInt()`, `@Min(0)`
  - `areaId`: UUID v7, `@IsUUID('7')`

### Response Data Shape
- Success wrapped automatically by global interceptor: `{ data: ... }`
- Errors wrapped by exception filter: `{ error: { code, message, details? } }`

---

## 4. Database & Prisma Schema Changes
- **Files Modified:** `prisma/models/<entity>.prisma` (or `prisma/enums.prisma`)
- **Model Definition / Changes:**
  - Money stored as `BigInt` paisa.
  - IDs as `@default(uuid(7)) @db.Uuid`.
  - Composite indexes / tenant indexes.
- **Migration Required:** Yes / No

---

## 5. Security & Privacy Rules
- **Public Visibility Filter:** (If public: requires `status = ACTIVE` and `subscriptionEndsAt > now`).
- **Forbidden in Public Responses:** Internal UUIDs, `adminNotes`, `statusReason`, `trialStartedAt`, `subscriptionEndsAt`, password/token hashes.
- **Logs:** Customer phone numbers must NEVER be written to logs.

---

## 6. Audit Logging
- **Action String:** `ACTION_NAME` (e.g., `MENU_ITEM_CREATED`, `ORDER_INTENT_UPDATED`)
- **Entity Type:** e.g. `menu_item`, `restaurant`
- **Actor:** `adminUserId` or `ownerUserId`

---

## 7. Out of Scope (Deliberately Excluded)
- Feature X is NOT part of this spec and will be addressed in a future phase.

---

## 8. Acceptance Criteria (Verifiable by Tests)
- [ ] Happy path works as expected.
- [ ] Cross-tenant access blocked (Owner B cannot access Owner A's records).
- [ ] Validation rejects missing or malformed fields (HTTP 400).
- [ ] Appropriate business error code returned (HTTP 409 / 422).
- [ ] 100% spec coverage: every controller and service has unit tests.
