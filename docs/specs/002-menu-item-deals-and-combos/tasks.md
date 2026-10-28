# Tasks: 002 Menu Item Deals & Cross-Category Combos

Spec Reference: `docs/specs/002-menu-item-deals-and-combos/spec.md`

Rules:
- One logical unit per commit (source + spec together).
- Run verify loop (`npx tsc --noEmit && npm run lint && npm test -- <spec>`) before checking off any task.
- Stop and report after completing each Batch. Do NOT continue to next batch without user confirmation.

---

### Batch 1: Schema, Migration & DTOs
- [x] Task 1.1: Update `prisma/models/menu.prisma` with `originalPrice BigInt?` and `isDeal Boolean @default(false)`.
- [x] Task 1.2: Apply migration `20261022085652_add_menu_item_deals` preserving custom GIN indexes and run `npx prisma generate`.
- [x] Task 1.3: Update `CreateMenuItemDto` and `UpdateMenuItemDto` with `@IsOptional() @IsInt() @Min(0) originalPrice` and `@IsOptional() @IsBoolean() isDeal`.

---

### Batch 2: Service Layer & Unit Tests
- [x] Task 2.1: Implement price comparison validation (`originalPrice` must be greater than `basePrice`) in `MenuItemsService`.
- [x] Task 2.2: Implement comprehensive unit tests in `menu-items.service.spec.ts` covering deal validation, happy paths, and error rejections.
- [x] Task 2.3: Update `PublicRestaurantsService` to expose `originalPrice` and `isDeal` in `PublicMenuItem` projection and update its specs.

---

### Batch 3: Admin Dashboard Combo Builder
- [x] Task 3.1: Update TypeScript types in `dir-food-admin/src/features/menu/types.ts` and `src/lib/api/types.ts`.
- [x] Task 3.2: Implement Cross-Category Combo Builder in `dir-food-admin/src/features/menu/components/menu-item-dialog.tsx`:
  - Category-grouped dish selector (`<optgroup>`).
  - Quantity steppers `[-] [Qty] [+]` with live line item calculations.
  - Custom perk button (`+ Add Custom Perk`) for free bonus items.
  - Automatic retail value sum calculation and 1-click **"Use as Original Price"** button.
  - Real-time description builder synchronizing selected combo contents.
- [x] Task 3.3: Update `dir-food-admin/src/features/menu/components/menu-list.tsx` with Deal badges, strikethrough original prices, and discount percentages.
- [x] Task 3.4: Add multi-lingual translations in `en.json`, `ur.json`, and `ps.json`.

---

### Batch 4: Customer Storefront (Web App)
- [x] Task 4.1: Implement `parseDealDescription` utility in `dir-food-web/src/features/restaurant/utils/deal-parser.ts` with unit test suite in `deal-parser.test.ts`.
- [x] Task 4.2: Build KFC/Foodpanda-style `FeaturedDealsCarousel` component for top-level menu discovery.
- [x] Task 4.3: Enhance `MenuItemCard` with deal pill, cut price, and "View Deal Contents" action button.
- [x] Task 4.4: Build interactive `DealDetailModal` with structured combo checklist, food emojis, serving details, and sticky bottom CTA.
- [x] Task 4.5: Fix z-index layering conflict (`StickyCartBar` at `z-40`, dialogs at `z-[70]`) ensuring zero UI overlapping.

---

### Batch 5: Verification & Code Review
- [x] Task 5.1: Run full verification loop (`tsc --noEmit`, `oxlint`, `vitest`) across backend, admin, and web projects.
- [x] Task 5.2: Complete `@code-reviewer` evaluation covering tenant isolation, purity, money representation, and privacy.
- [x] Task 5.3: Update `AGENTS.md` and `docs/status.md`.
