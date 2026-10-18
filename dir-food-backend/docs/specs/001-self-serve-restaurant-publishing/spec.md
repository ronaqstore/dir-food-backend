# Spec: 001 Self-Serve Restaurant Publishing (Owner Go-Live)

- **Status:** Done
- **Author:** AI + Usman
- **Date:** 2026-10-18
- **Target Module:** `src/restaurants/`

---

## 1. Context & Business Value
- **Who needs this:** Restaurant Owners (`RESTAURANT_OWNER`)
- **Problem solved:** Previously, restaurant owners who registered were stuck in `PENDING` status until a platform administrator manually approved them. Under Model 2 (Self-Serve SaaS), owners can verify readiness and publish their restaurant immediately once they configure their WhatsApp number, operating hours, active menu items, and delivery areas.
- **User Journey:** The restaurant owner registers, logs into the dashboard, sets up their menu, hours, and delivery areas. When ready, the dashboard calls `GET /me/restaurant/readiness` to check readiness. If ready, the owner clicks "Publish / Go Live" (`POST /me/restaurant/publish`), activating the restaurant immediately and initiating their 30-day trial without waiting for admin approval.

---

## 2. Access Control & Multi-Tenancy (CRITICAL)
- **Role(s) Allowed:** `RESTAURANT_OWNER`
- **Guards Applied:** `@UseGuards(RolesGuard, RestaurantAuthGuard)` + `@Roles(UserRole.RESTAURANT_OWNER)`
- **Tenant Extraction:** `user.restaurantId` from `@CurrentUser()` (NEVER from client request body)
- **Suspension Policy:** Normal `RestaurantAuthGuard` rules apply. If suspended or deactivated, publishing is strictly blocked with HTTP 403.
- **State Conflict:** If the restaurant is already `ACTIVE`, `POST /me/restaurant/publish` throws HTTP 409 (`ALREADY_ACTIVE`).

---

## 3. API Contract & Endpoints

| Method | Path | Auth / Role | Success (Envelope Data) | Error Codes |
|---|---|---|---|---|
| `GET` | `/me/restaurant/readiness` | `RESTAURANT_OWNER` | `{ isReadyToPublish: boolean, missingPrerequisites: string[] }` | 401, 403, 404 |
| `POST` | `/me/restaurant/publish` | `RESTAURANT_OWNER` | `{ id: string, name: string, slug: string, status: "ACTIVE", trialStartedAt: string, subscriptionEndsAt: string }` | 401, 403, 404, 409, 422 |

### Request DTOs
- `GET /me/restaurant/readiness`: None (no payload).
- `POST /me/restaurant/publish`: None (action endpoint, no payload body required).

### Response Data Shape
- **`GET /me/restaurant/readiness`**:
  ```json
  {
    "data": {
      "isReadyToPublish": true,
      "missingPrerequisites": []
    }
  }
  ```
  Or when incomplete:
  ```json
  {
    "data": {
      "isReadyToPublish": false,
      "missingPrerequisites": [
        "A valid WhatsApp contact number is required",
        "Configured opening hours are required",
        "At least one active menu item is required",
        "At least one active delivery area is required"
      ]
    }
  }
  ```

- **`POST /me/restaurant/publish`**:
  ```json
  {
    "data": {
      "id": "0194...",
      "name": "Khyber Shinwari",
      "slug": "khyber-shinwari",
      "status": "ACTIVE",
      "trialStartedAt": "2026-10-18T10:00:00.000Z",
      "subscriptionEndsAt": "2026-11-17T10:00:00.000Z"
    }
  }
  ```

- **Errors**:
  - `422 UnprocessableEntityException` if prerequisites are not met:
    ```json
    {
      "error": {
        "code": "PUBLISH_PREREQUISITES_NOT_MET",
        "message": "Cannot publish restaurant: prerequisites not satisfied",
        "details": [
          "Configured opening hours are required"
        ]
      }
    }
    ```
  - `409 ConflictException` if already active:
    ```json
    {
      "error": {
        "code": "ALREADY_ACTIVE",
        "message": "Restaurant is already active and published"
      }
    }
    ```

---

## 4. Database & Prisma Schema Changes
- **Files Modified:** None. Existing Prisma models and enums already have `RestaurantStatus.PENDING`, `RestaurantStatus.ACTIVE`, `trialStartedAt`, and `subscriptionEndsAt`.
- **Migration Required:** No.

---

## 5. Security & Privacy Rules
- **Tenant Scope:** The service strictly verifies that the restaurant queried matches `user.restaurantId`.
- **Public Visibility Filter:** Once published to `ACTIVE`, the restaurant automatically satisfies the `PublicRestaurantsService` filter (`status = ACTIVE` and `subscriptionEndsAt > now`).
- **Trial Safeguard:** The 30-day trial clock only begins when published (`trialStartedAt = now`, `subscriptionEndsAt = now + 30 days`), ensuring owners don't burn trial time during setup.

---

## 6. Audit Logging
- **Action String:** `RESTAURANT_SELF_PUBLISHED`
- **Entity Type:** `restaurant`
- **Actor:** `user.userId` (Owner)
- **Details:** `{ oldStatus: "PENDING", newStatus: "ACTIVE", trialStartedAt, subscriptionEndsAt }`

---

## 7. Out of Scope (Deliberately Excluded)
- Payment gateway for auto-renewals (offline platform admin extensions remain).
- Un-publishing / reverting from `ACTIVE` back to `PENDING` (owners use `manualStatus: CLOSED` or `TEMP_UNAVAILABLE` to pause orders).

---

## 8. Acceptance Criteria (Verifiable by Tests)
- [ ] `GET /me/restaurant/readiness` accurately checks all 4 prerequisites (WhatsApp, hours, items, delivery areas).
- [ ] `POST /me/restaurant/publish` fails with HTTP 422 (`PUBLISH_PREREQUISITES_NOT_MET`) if any prerequisite is missing.
- [ ] `POST /me/restaurant/publish` transitions `PENDING` -> `ACTIVE` and sets 30-day trial window.
- [ ] `POST /me/restaurant/publish` fails with HTTP 409 (`ALREADY_ACTIVE`) if restaurant is already active.
- [ ] Cross-tenant access is impossible because `restaurantId` is sourced strictly from JWT.
- [ ] Unit tests for `RestaurantsService` and `RestaurantMeController` cover all branches with 100% pass rate.
