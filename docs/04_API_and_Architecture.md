# Dir Food Ordering — API, NestJS Architecture and Next.js Structure (v1)

## 1. Response format (all endpoints)

Success: `{ "data": ..., "meta": { "page": 1, "limit": 20, "total": 57 } }` (`meta` only on lists).
Error: `{ "error": { "code": "RESTAURANT_CLOSED", "message": "Hotel Al-Noor is closed now.", "details": [...] } }`.
Money fields are integers in paisa. Base path `/api/v1`. Pagination: `page` (default 1), `limit` (default 20, max 50).

Common errors: `400` bad body (unknown property), `401` not logged in, `403` wrong role, `404` not found or not yours, `409` conflict (state, price changed), `422` validation, `429` rate limited, `500` server.

## 2. Public endpoints (no login)

| Method | URL | Purpose | Input | Response | DB | Errors |
|---|---|---|---|---|---|---|
| GET | `/public/areas` | Active areas for the filter | none | `[{id, name, slug}]` | read `areas` | — |
| GET | `/public/restaurants` | List active restaurants | `areaId`, `cuisine`, `q` (2–50), `openNow` bool, `page`, `limit` | `[{slug, name, cuisines, logoUrl, minOrderAmount, isOpenNow, availabilityText, nextOpenAt}]` | read `restaurants`, `restaurant_hours`, join `restaurant_delivery_areas` where active | `422` bad query |
| GET | `/public/restaurants/:slug` | Restaurant page data | slug | `{slug, name, description, cuisines, logoUrl, coverUrl, contactPhone, addressText, minOrderAmount, isOpenNow, manualStatus, unavailableNote, todayHours[], deliveryAreas:[{areaId, name, deliveryFee|null}]}` | read restaurant (status ACTIVE only), hours, delivery areas | `404 RESTAURANT_NOT_AVAILABLE` |
| GET | `/public/restaurants/:slug/menu` | Full menu | slug | `{categories:[{id, name, items:[{id, name, description, imageUrl, price|null, isAvailable, variants:[{id, name, price}]}]}]}` | read categories, items, variants where active | `404` |
| POST | `/public/cart/validate` | Re-check a cart, save nothing | `{restaurantSlug, items:[{menuItemId, variantId?, quantity}]}` | `{lines:[{menuItemId, variantId, name, unitPrice, quantity, lineTotal, available, priceChanged?}], subtotal, minOrderAmount, isOpenNow, problems:[...]}` | read items / variants / restaurant | `404`, `422` |
| POST | `/public/order-intents` | Validate and create the WhatsApp request | see below | see below | transaction: insert `order_intents` + items | `404`, `409 RESTAURANT_CLOSED`, `409 PRICE_CHANGED`, `422`, `429` |
| POST | `/public/order-intents/:ref/whatsapp-opened` | Record that the button was pressed | none | `{status}` | update status + `whatsapp_opened_at` (only from `WHATSAPP_HANDOFF_READY` or `WHATSAPP_OPENED`) | `404`, `409 INTENT_EXPIRED` |
| GET | `/public/order-intents/:ref` | Re-show the result screen ("Open WhatsApp again") | ref | `{reference, status, whatsappUrl, summary}` while not expired and PII not erased | read intent | `404`, `410 INTENT_EXPIRED` |

**Create order intent: request**
```json
{
  "clientRequestId": "6f0c1c4e-7d1e-4d2b-9a58-0c6a3f4b9b21",
  "restaurantSlug": "hotel-al-noor",
  "items": [
    { "menuItemId": "0192...a1", "variantId": "0192...b2", "quantity": 1 },
    { "menuItemId": "0192...c3", "quantity": 4 }
  ],
  "customer": { "name": "Ahmad Khan", "phone": "03001234567" },
  "delivery": {
    "areaId": "0192...d4",
    "landmark": "Near Girls Degree College gate",
    "directions": "Blue gate, 2nd house on the left",
    "mapPin": { "lat": 34.8265, "lng": 71.8412 }
  },
  "expectedSubtotal": 142000
}
```
**Validation:** `clientRequestId` uuid; 1–30 items; `quantity` integer 1–50; `variantId` required if the item has active variants and forbidden otherwise; `name` 2–60; `phone` Pakistani mobile; `landmark` 3–150; `directions` ≤ 300; `mapPin` both or neither, valid range; `expectedSubtotal` optional integer.

**Response `201` (or `200` for a repeated `clientRequestId`)**
```json
{
  "data": {
    "reference": "TM-7K4P9Q",
    "status": "WHATSAPP_HANDOFF_READY",
    "restaurant": { "name": "Hotel Al-Noor" },
    "items": [
      { "name": "Chicken Karahi", "variant": "Full", "unitPrice": 110000, "quantity": 1, "lineTotal": 110000 },
      { "name": "Naan", "variant": null, "unitPrice": 3000, "quantity": 4, "lineTotal": 12000 }
    ],
    "subtotal": 122000,
    "delivery": { "status": "TO_BE_CONFIRMED", "fee": null, "areaName": "Timergara" },
    "message": "Assalam o Alaikum, Hotel Al-Noor! ...",
    "whatsappUrl": "https://wa.me/923001234567?text=Assalam%20o%20Alaikum...",
    "expiresAt": "2026-10-17T09:00:00Z",
    "notice": "Your message is not sent until you press Send in WhatsApp."
  }
}
```
**Backend steps:** rate limit → DTO → duplicate check → load restaurant (ACTIVE), open check, WhatsApp number check → area check → load items by `(id, restaurant_id)` with active + available → variant check → price recalculation → min order → generate reference → build message → transaction insert → return. The browser's prices are never read.

## 3. Authentication

| Method | URL | Access | Purpose | Body → Response | DB | Errors |
|---|---|---|---|---|---|---|
| POST | `/auth/login` | Public | Owner or admin login | `{phone, password}` → sets cookie; `{user:{name, role}, restaurant:{name, status}|null}` | read `users`, `restaurants`; update failed count | `401` generic, `423` locked |
| POST | `/auth/logout` | Any | Clear cookie | — | — | — |
| GET | `/auth/me` | Logged in | Current user | → `{user, restaurant}` | read | `401` |
| POST | `/auth/setup-password` | Public with token | First password via one-time link | `{token, password}` | read user by token hash; set `password_hash`; clear token | `400` invalid or expired token |

Admin login uses the same endpoint; the role in the token decides the area. The Next.js admin pages live under a separate path and check the role.

## 4. Restaurant dashboard (role `RESTAURANT_OWNER`; `restaurantId` from session)

All URLs start with `/me/restaurant`. No restaurant id in any URL. Not-yours ids always return `404`.

| Method | URL | Purpose | Request | Notes |
|---|---|---|---|---|
| GET | `/me/restaurant` | Own profile | — | Includes `status`, read only |
| PATCH | `/me/restaurant` | Update profile | `{name?, description?, cuisines?, addressText?, contactPhone?, whatsappNumber?, minOrderAmount?}` | Forbidden fields rejected. WhatsApp change is audit-logged |
| POST | `/me/restaurant/images/:kind` | Upload logo or cover (`kind` = `logo` or `cover`) | multipart `file` | Content-type check, resize check, strip EXIF, random name |
| PUT | `/me/restaurant/availability` | Open / closed switch | `{manualStatus: AUTO|CLOSED|TEMP_UNAVAILABLE, unavailableNote?}` | |
| GET | `/me/restaurant/hours` | Weekly hours | — | |
| PUT | `/me/restaurant/hours` | Replace the weekly hours | `{days:[{dayOfWeek, ranges:[{openTime, closeTime}]}]}` | Transaction; no overlapping ranges |
| GET | `/me/restaurant/delivery-areas` | All active areas with ticked / fee state | — | |
| PUT | `/me/restaurant/delivery-areas` | Set served areas and fees | `{areas:[{areaId, deliveryFee|null}]}` | Areas not in the list are deactivated; `deliveryFee` null = to be confirmed |
| GET | `/me/restaurant/categories` | List | — | |
| POST | `/me/restaurant/categories` | Create | `{name}` | |
| PATCH | `/me/restaurant/categories/:id` | Rename / deactivate | `{name?, isActive?}` | |
| PUT | `/me/restaurant/categories/order` | Reorder | `{ids:[...]}` | All ids must belong to the restaurant |
| GET | `/me/restaurant/items?categoryId=&page=` | List items | — | |
| POST | `/me/restaurant/items` | Create | `{categoryId, name, description?, basePrice?, variants?:[{name, price}]}` | Needs `basePrice` or at least one variant |
| PATCH | `/me/restaurant/items/:id` | Edit | partial fields, `isAvailable`, `isActive` | |
| POST | `/me/restaurant/items/:id/image` | Photo | multipart | Same image rules |
| PUT | `/me/restaurant/items/order` | Reorder inside a category | `{categoryId, ids:[...]}` | |
| PUT | `/me/restaurant/items/:id/variants` | Replace variants | `{variants:[{id?, name, price, isActive}]}` | Existing ids deactivated, not deleted |
| GET | `/me/restaurant/order-intents?page=&q=` | Recent WhatsApp requests (30 days) | `q` = reference | Each response carries `notConfirmed: true` flag and the UI shows the label |
| GET | `/me/restaurant/order-intents/:id` | Detail | — | |
| GET | `/me/restaurant/stats?range=7d|30d` | Counts | — | `{requestsCreated, whatsappOpened, topItems:[{name, requestedQuantity}]}` |

Example `PUT /me/restaurant/delivery-areas` body:
```json
{ "areas": [ { "areaId": "0192...d4", "deliveryFee": 10000 }, { "areaId": "0192...e5", "deliveryFee": null } ] }
```

## 5. Platform admin (role `PLATFORM_ADMIN`)

| Method | URL | Purpose | Request | DB / audit |
|---|---|---|---|---|
| GET | `/admin/restaurants?status=&q=&page=` | List all | | read |
| POST | `/admin/restaurants` | Create restaurant + owner | `{name, contactPhone, whatsappNumber, addressText?, cuisines?, owner:{name, phone}}` → `{restaurant, setupLink}` | transaction insert restaurant, owner, default hours; audit |
| GET | `/admin/restaurants/:id` | Detail, includes admin notes and completeness warnings | | read |
| PATCH | `/admin/restaurants/:id` | Edit record (support) | profile fields, `adminNotes` | audit with old/new |
| PATCH | `/admin/restaurants/:id/status` | Approve / suspend / deactivate | `{status, reason}` (reason required for SUSPENDED and DEACTIVATED) | update + audit |
| PATCH | `/admin/restaurants/:id/slug` | Change slug | `{slug}` | unique check; audit |
| POST | `/admin/restaurants/:id/setup-link` | New password link | | replace token; audit |
| GET | `/admin/areas` | All areas | | |
| POST | `/admin/areas` | Create | `{name}` | audit |
| PATCH | `/admin/areas/:id` | Rename / deactivate / reorder | | audit |
| GET | `/admin/order-intents?ref=` | Support lookup by reference | | read only |
| GET | `/admin/activity?range=7d` | Platform counts per restaurant | | read |
| GET | `/admin/audit-logs?restaurantId=&page=` | Audit trail | | read |

## 6. NestJS architecture

```
src/
  main.ts                    (helmet, cookie-parser, ValidationPipe, CORS)
  app.module.ts
  common/
    guards/   jwt-auth.guard.ts, roles.guard.ts
    decorators/ public.decorator.ts, roles.decorator.ts, current-user.decorator.ts
    filters/  http-exception.filter.ts  (standard error shape)
    interceptors/ response-envelope.interceptor.ts
    utils/    phone.ts (normalise), money.ts, reference-code.ts, whatsapp-message.ts, opening-hours.ts
  prisma/     prisma.module.ts, prisma.service.ts
  auth/       controller, service, strategy, setup-password
  restaurants/          (owner dashboard profile + availability + images)
  restaurant-hours/
  delivery-areas/       (owner part of restaurant_delivery_areas)
  areas/                (admin master list + public list)
  menu-categories/
  menu-items/           (includes variants)
  public-catalog/       (public restaurants, menu, cart validate)
  order-intents/        (public create + owner read + expiry/retention jobs)
  platform-admin/       (admin restaurants, status, slug, setup links, activity)
  audit/                (AuditService used by other modules)
  uploads/              (image validation + storage adapter)
```

| Module | Responsibility | Notes |
|---|---|---|
| `PrismaModule` | One Prisma client | global |
| `AuthModule` | Login, cookie JWT, setup link, lockout | global `JwtAuthGuard`, `@Public()` opt-out |
| `RestaurantsModule` | Owner profile and availability | Controller `me/restaurant`; service always receives `restaurantId` |
| `RestaurantHoursModule` | Weekly hours + `isOpenNow()` helper | `isOpenNow` is shared with public catalog and order intents |
| `AreasModule` | Admin areas + public areas | |
| `DeliveryAreasModule` (inside restaurants folder is fine) | Owner serving areas and fees | |
| `MenuCategoriesModule`, `MenuItemsModule` | Owner menu CRUD | Variants live inside menu-items to avoid a tiny module |
| `PublicCatalogModule` | Public reads and cart validation | **Separate services and DTOs from dashboard**, explicit `select`, never reuse owner services |
| `OrderIntentsModule` | Create intent, build message, owner list | Uses `PublicCatalogModule` for pricing logic through a `PricingService` |
| `PlatformAdminModule` | Admin operations | Role `PLATFORM_ADMIN` on the controller class |
| `AuditModule` | `AuditService.log()` | |
| `UploadsModule` | File checks + storage | adapter pattern: S3-compatible |

No `MenuItemVariantsModule`, no separate `UsersModule`; those add files without adding clarity.

**Restaurant-level authorization (one pattern everywhere)**
1. `JwtAuthGuard` fills `req.user = {userId, role, restaurantId}`.
2. `@CurrentRestaurantId()` decorator returns `req.user.restaurantId` (throws `403` if null).
3. Every service method signature starts with `restaurantId`. Every Prisma query includes it.
4. `updateMany/deleteMany` with `{ id, restaurantId }` and check `count === 1`, otherwise `404`.
5. Cross-references (category for item, area for delivery area) are verified against `restaurantId` before writing.
6. E2E tests loop over all dashboard routes with a second restaurant's ids.

**Request flow:** Frontend → Controller → global guards (auth, role) → DTO validation (whitelist) → Service (business rules) → Prisma → PostgreSQL → response DTO → envelope interceptor → Frontend.

**WhatsApp handoff in code terms:** the frontend calls `POST /public/order-intents`; the **backend** builds `whatsappUrl` from the saved snapshot; the frontend only does `window.location.href = whatsappUrl` (or an `<a href>` for iOS Safari reliability). The page then shows the reference and a note that the message is not sent until the customer presses Send.

## 7. Next.js page structure (App Router)

```
app/
  (public)/
    page.tsx                         Homepage: area picker, search, featured open restaurants
    restaurants/page.tsx             Listing + filters (area, cuisine, open now, q) — server-rendered, paginated
    r/[slug]/page.tsx                Restaurant page + menu + sticky cart bar
    cart/page.tsx                    Cart review (validates against API)
    checkout/page.tsx                Guest delivery details + order review
    order/[ref]/page.tsx             After handoff: reference, "not sent until you press Send", open again, copy message
  dashboard/
    login/page.tsx                   (shared login; role redirects)
    page.tsx                         Overview: availability switch, last requests, 7-day stats
    requests/page.tsx                WhatsApp requests list (+ detail)
    menu/page.tsx                    Categories + items + variants + availability toggles
    settings/page.tsx                Profile, WhatsApp number, hours, images
    delivery/page.tsx                Delivery areas + fees
  admin/
    login/page.tsx
    page.tsx                         Activity summary
    restaurants/page.tsx             List, filters, status
    restaurants/new/page.tsx         Create restaurant + owner
    restaurants/[id]/page.tsx        Detail, approve / suspend, notes, setup link, slug
    areas/page.tsx
    audit/page.tsx
  setup-password/page.tsx            One-time password link
middleware.ts                        Redirects: /dashboard requires owner cookie, /admin requires admin role
```

**Fetched from backend:** areas, restaurant list and detail, menu, cart validation, order intent creation, all dashboard / admin data. Public pages use server components with short revalidation (30–60 s) for speed on slow mobile data.
**Kept on the frontend:** the guest cart (`localStorage`, one restaurant only, 24 h expiry), form drafts for name / phone / landmark (so the customer does not retype), and language choice.

**Customer journey screens:** Home → Restaurants → Restaurant + menu → Cart → Checkout → "Opening WhatsApp" result page.
**Restaurant management screens:** Login → Dashboard → Settings → Delivery → Menu → Requests.

## 8. Cart rules (frontend)

- Cart stores `restaurantSlug`; adding from another slug opens a "clear cart?" dialog.
- Every price shown in the cart comes from the last `POST /public/cart/validate`; stored prices are never trusted.
- Order button is disabled when: cart empty, restaurant closed, any item unavailable, or details invalid.
- One `clientRequestId` per checkout screen visit; regenerated only if the cart or details change after a successful create.
