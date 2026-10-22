# Spec: 002 Menu Item Deals & Cross-Category Combos

- **Status:** Done
- **Author:** AI + Usman
- **Date:** 2026-10-22
- **Target Module:** `src/menu-items/`, `src/public-catalog/`

---

## 1. Context & Business Value
- **Who needs this:** Restaurant Owners (`RESTAURANT_OWNER`) & Storefront Customers (`PUBLIC`).
- **Problem solved:** Restaurants frequently sell special bundles and promotional packages (e.g. "Family Festival Deal: 2 Zinger Burgers + 1 Large Pizza + 2 Regular Drinks") at discounted bundle rates. Previously, the platform only supported standalone menu items with fixed `basePrice`. Owners had no structured way to define a deal, advertise strikethrough original prices, calculate savings, or display multi-dish combo items clearly to customers.
- **User Journey:**
  1. **Restaurant Owner**: Logs into merchant dashboard, opens "Add Menu Item", enables "Featured Deal", and selects multiple existing dishes across categories (e.g., 2 burgers from Burgers, 1 pizza from Pizzas). The system calculates the true combo retail value and populates the strikethrough `originalPrice` and parsed combo description.
  2. **Customer Storefront**: Discovers hot deals via a top horizontal deals carousel and menu badges, views detailed combo breakdowns (with food emojis and quantities), and adds them to cart with clear savings shown (`Save Rs. 250 (18% OFF)`).

---

## 2. Access Control & Multi-Tenancy (CRITICAL)
- **Role(s) Allowed:**
  - Owner endpoints: `RESTAURANT_OWNER`
  - Public storefront catalog: `PUBLIC`
- **Guards Applied:**
  - Owner: `@UseGuards(RolesGuard, RestaurantAuthGuard)` + `@Roles(UserRole.RESTAURANT_OWNER)`
  - Public: `@Public()`
- **Tenant Extraction:** `user.restaurantId` from `@CurrentUser()` (NEVER from client request body).
- **Suspension Policy:** Normal `RestaurantAuthGuard` rules apply (GET allowed on SUSPENDED, mutations blocked).

---

## 3. API Contract & Endpoints

| Method | Path | Auth / Role | Success (Envelope Data) | Error Codes |
|---|---|---|---|---|
| `POST` | `/me/restaurant/menu-items` | `RESTAURANT_OWNER` | `MenuItem` (with `originalPrice`, `isDeal`) | 400, 401, 403, 404, 409 |
| `PATCH` | `/me/restaurant/menu-items/:id` | `RESTAURANT_OWNER` | `MenuItem` (with `originalPrice`, `isDeal`) | 400, 401, 403, 404, 409 |
| `GET` | `/me/restaurant/menu-items` | `RESTAURANT_OWNER` | `MenuItem[]` | 401, 403 |
| `GET` | `/public/restaurants/:slug/menu` | `PUBLIC` | `PublicMenu` (categories with items exposing `originalPrice`, `isDeal`) | 404 (`RESTAURANT_NOT_AVAILABLE`) |

### Request DTOs
- `CreateMenuItemDto`:
  - `name`: string, `@IsNotEmpty()`, `@IsString()`
  - `description`: optional string, `@IsOptional()`, `@IsString()`
  - `basePrice`: integer paisa, `@IsInt()`, `@Min(0)`
  - `originalPrice`: optional integer paisa, `@IsOptional()`, `@IsInt()`, `@Min(0)`
  - `isDeal`: optional boolean, `@IsOptional()`, `@IsBoolean()`
  - `categoryId`: UUID v7, `@IsUUID('7')`
- `UpdateMenuItemDto`:
  - `originalPrice`: optional integer paisa, `@IsOptional()`, `@IsInt()`, `@Min(0)`
  - `isDeal`: optional boolean, `@IsOptional()`, `@IsBoolean()`

### Response Data Shape
- **`PublicMenuItem`**:
  ```json
  {
    "id": "uuid-v7",
    "name": "Super Family Combo",
    "description": "2x Zinger Burger + 1x Large Pizza + 2x Regular Coke",
    "basePrice": "199900",
    "originalPrice": "245000",
    "isDeal": true,
    "imageUrl": "https://...",
    "variants": []
  }
  ```

---

## 4. Database & Prisma Schema Changes
- **Files Modified:** `prisma/models/menu.prisma`
- **Fields Added to `MenuItem`**:
  - `originalPrice BigInt?`: Original regular retail price before discount (in paisa).
  - `isDeal Boolean @default(false)`: Flag indicating this item is a promotional combo/deal.
- **Migration:** `20261022085652_add_menu_item_deals`
- **Integrity Rule:** `originalPrice` when provided must be strictly greater than `basePrice` (validated at service layer).

---

## 5. Security & Privacy Rules
- **Public Visibility Filter:** Handled by `PublicCatalogModule` requiring `status = ACTIVE` and `subscriptionEndsAt > now`.
- **Forbidden in Public Responses:** Internal audit fields, tenant owner details, margin/cost information.
- **Paisa Currency Representation:** `BigInt` end-to-end; serialized safely via `ResponseEnvelopeInterceptor`.

---

## 6. Audit Logging
- Standard item operations logged:
  - `MENU_ITEM_CREATED`
  - `MENU_ITEM_UPDATED`
  - `MENU_ITEM_DELETED`
- Actor: `ownerUserId` with `restaurantId`.

---

## 7. Out of Scope (Deliberately Excluded)
- Automatic dynamic stock deduction across multiple component inventory items (will be part of advanced ERP inventory tracking in a future phase).
- Time-limited countdown flash sales (out of scope for MVP).

---

## 8. Acceptance Criteria (Verifiable by Tests)
- [x] Schema migration applied safely with no dropped indexes.
- [x] Validation prevents `originalPrice <= basePrice` (rejects with 400 `BadRequestException`).
- [x] Owners can create and update deals with `originalPrice` and `isDeal`.
- [x] Public catalog exposes `originalPrice` and `isDeal` for customer rendering.
- [x] Existing checkout & WhatsApp handoff remain 100% backward-compatible.
- [x] 100% spec coverage across menu-items and public-catalog services.
