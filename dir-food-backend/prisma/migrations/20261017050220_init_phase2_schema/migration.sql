-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ManualStatus" AS ENUM ('AUTO', 'CLOSED', 'TEMP_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('RESTAURANT_OWNER', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrderIntentStatus" AS ENUM ('WHATSAPP_HANDOFF_READY', 'WHATSAPP_OPENED');

-- CreateEnum
CREATE TYPE "DeliveryFeeStatus" AS ENUM ('KNOWN', 'TO_BE_CONFIRMED');

-- CreateTable
CREATE TABLE "restaurants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cuisines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logo_url" TEXT,
    "cover_url" TEXT,
    "address_text" TEXT,
    "contact_phone" TEXT,
    "whatsapp_number" TEXT,
    "min_order_amount" BIGINT,
    "status" "RestaurantStatus" NOT NULL DEFAULT 'PENDING',
    "status_reason" TEXT,
    "status_changed_at" TIMESTAMPTZ(3),
    "trial_started_at" TIMESTAMPTZ(3),
    "subscription_ends_at" TIMESTAMPTZ(3),
    "manual_status" "ManualStatus" NOT NULL DEFAULT 'AUTO',
    "unavailable_note" TEXT,
    "admin_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT,
    "setup_token_hash" TEXT,
    "setup_expires_at" TIMESTAMPTZ(3),
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_delivery_areas" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "delivery_fee" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "restaurant_delivery_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_hours" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "open_time" TIME(0) NOT NULL,
    "close_time" TIME(0) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "base_price" BIGINT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_variants" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_item_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_intents" (
    "id" UUID NOT NULL,
    "public_ref" TEXT NOT NULL,
    "client_request_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "status" "OrderIntentStatus" NOT NULL DEFAULT 'WHATSAPP_HANDOFF_READY',
    "restaurant_name_snapshot" TEXT NOT NULL,
    "restaurant_whatsapp_snapshot" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "delivery_area_id" UUID NOT NULL,
    "delivery_area_name_snapshot" TEXT NOT NULL,
    "landmark" TEXT NOT NULL,
    "directions" TEXT,
    "map_lat" DECIMAL(9,6),
    "map_lng" DECIMAL(9,6),
    "subtotal" BIGINT NOT NULL,
    "delivery_fee" BIGINT,
    "delivery_fee_status" "DeliveryFeeStatus" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "whatsapp_opened_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_intent_items" (
    "id" UUID NOT NULL,
    "order_intent_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "variant_id" UUID,
    "item_name_snapshot" TEXT NOT NULL,
    "variant_name_snapshot" TEXT,
    "unit_price" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" BIGINT NOT NULL,
    "line_no" INTEGER NOT NULL,

    CONSTRAINT "order_intent_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "restaurant_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE INDEX "restaurants_status_subscription_ends_at_idx" ON "restaurants"("status", "subscription_ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_restaurant_id_idx" ON "users"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "areas_name_key" ON "areas"("name");

-- CreateIndex
CREATE UNIQUE INDEX "areas_slug_key" ON "areas"("slug");

-- CreateIndex
CREATE INDEX "restaurant_delivery_areas_area_id_is_active_idx" ON "restaurant_delivery_areas"("area_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_delivery_areas_restaurant_id_area_id_key" ON "restaurant_delivery_areas"("restaurant_id", "area_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_hours_restaurant_id_day_of_week_open_time_key" ON "restaurant_hours"("restaurant_id", "day_of_week", "open_time");

-- CreateIndex
CREATE INDEX "menu_categories_restaurant_id_sort_order_idx" ON "menu_categories"("restaurant_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_id_restaurant_id_key" ON "menu_categories"("id", "restaurant_id");

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_category_id_sort_order_idx" ON "menu_items"("restaurant_id", "category_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_id_restaurant_id_key" ON "menu_items"("id", "restaurant_id");

-- CreateIndex
CREATE INDEX "menu_item_variants_menu_item_id_idx" ON "menu_item_variants"("menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_variants_id_restaurant_id_menu_item_id_key" ON "menu_item_variants"("id", "restaurant_id", "menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_intents_public_ref_key" ON "order_intents"("public_ref");

-- CreateIndex
CREATE UNIQUE INDEX "order_intents_client_request_id_key" ON "order_intents"("client_request_id");

-- CreateIndex
CREATE INDEX "order_intents_restaurant_id_created_at_idx" ON "order_intents"("restaurant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "order_intents_restaurant_id_customer_phone_created_at_idx" ON "order_intents"("restaurant_id", "customer_phone", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_intents_id_restaurant_id_key" ON "order_intents"("id", "restaurant_id");

-- CreateIndex
CREATE INDEX "order_intent_items_menu_item_id_idx" ON "order_intent_items"("menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_intent_items_order_intent_id_line_no_key" ON "order_intent_items"("order_intent_id", "line_no");

-- CreateIndex
CREATE INDEX "audit_logs_restaurant_id_created_at_idx" ON "audit_logs"("restaurant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_delivery_areas" ADD CONSTRAINT "restaurant_delivery_areas_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_delivery_areas" ADD CONSTRAINT "restaurant_delivery_areas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_hours" ADD CONSTRAINT "restaurant_hours_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_restaurant_id_fkey" FOREIGN KEY ("category_id", "restaurant_id") REFERENCES "menu_categories"("id", "restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_menu_item_id_restaurant_id_fkey" FOREIGN KEY ("menu_item_id", "restaurant_id") REFERENCES "menu_items"("id", "restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_restaurant_id_delivery_area_id_fkey" FOREIGN KEY ("restaurant_id", "delivery_area_id") REFERENCES "restaurant_delivery_areas"("restaurant_id", "area_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intent_items" ADD CONSTRAINT "order_intent_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intent_items" ADD CONSTRAINT "order_intent_items_order_intent_id_restaurant_id_fkey" FOREIGN KEY ("order_intent_id", "restaurant_id") REFERENCES "order_intents"("id", "restaurant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intent_items" ADD CONSTRAINT "order_intent_items_menu_item_id_restaurant_id_fkey" FOREIGN KEY ("menu_item_id", "restaurant_id") REFERENCES "menu_items"("id", "restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_intent_items" ADD CONSTRAINT "order_intent_items_variant_id_restaurant_id_menu_item_id_fkey" FOREIGN KEY ("variant_id", "restaurant_id", "menu_item_id") REFERENCES "menu_item_variants"("id", "restaurant_id", "menu_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PROPOSED raw SQL appended to the Prisma-generated migration (review copy; NOT applied).
-- Table names match the @@map names in phase2_proposed_schema.prisma.

------------------------------------------------------------------
-- restaurants
------------------------------------------------------------------
ALTER TABLE restaurants
  ADD CONSTRAINT restaurants_name_len_chk        CHECK (char_length(name) BETWEEN 2 AND 80),
  ADD CONSTRAINT restaurants_slug_format_chk     CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 60),
  ADD CONSTRAINT restaurants_slug_reserved_chk   CHECK (slug NOT IN ('admin','api','dashboard','login','r','www')),
  ADD CONSTRAINT restaurants_description_len_chk CHECK (description IS NULL OR char_length(description) <= 500),
  ADD CONSTRAINT restaurants_cuisines_max_chk    CHECK (cardinality(cuisines) <= 5),
  ADD CONSTRAINT restaurants_logo_https_chk      CHECK (logo_url  IS NULL OR logo_url  LIKE 'https://%'),
  ADD CONSTRAINT restaurants_cover_https_chk     CHECK (cover_url IS NULL OR cover_url LIKE 'https://%'),
  ADD CONSTRAINT restaurants_contact_phone_chk   CHECK (contact_phone   IS NULL OR contact_phone   ~ '^[0-9]{10,15}$'),
  ADD CONSTRAINT restaurants_whatsapp_chk        CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^[0-9]{10,15}$'),
  ADD CONSTRAINT restaurants_min_order_chk       CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
  ADD CONSTRAINT restaurants_unavail_note_chk    CHECK (unavailable_note IS NULL OR char_length(unavailable_note) <= 140),
  -- Subscription: both dates are set together (at first approval) or both NULL.
  ADD CONSTRAINT restaurants_trial_pair_chk      CHECK ((trial_started_at IS NULL) = (subscription_ends_at IS NULL)),
  ADD CONSTRAINT restaurants_sub_after_trial_chk CHECK (subscription_ends_at IS NULL OR subscription_ends_at >= trial_started_at),
  -- ACTIVE rows must have a subscription end date and a WhatsApp number.
  -- (Validity "end > now" is time-dependent, so it is enforced at request time, never as a CHECK.)
  ADD CONSTRAINT restaurants_active_requires_sub_chk CHECK (status <> 'ACTIVE' OR subscription_ends_at IS NOT NULL),
  ADD CONSTRAINT restaurants_active_requires_wa_chk  CHECK (status <> 'ACTIVE' OR whatsapp_number IS NOT NULL);

CREATE INDEX restaurants_cuisines_gin_idx ON restaurants USING GIN (cuisines);
-- Prefix search (LIKE 'abc%') needs text_pattern_ops unless the collation is C. No pg_trgm in the MVP.
CREATE INDEX restaurants_name_lower_idx   ON restaurants (lower(name));
CREATE INDEX restaurants_name_prefix_idx  ON restaurants (lower(name) text_pattern_ops);

-- DEACTIVATED is terminal in the MVP (safety net behind the service rule).
CREATE FUNCTION restaurants_deactivated_terminal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'DEACTIVATED' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'DEACTIVATED restaurants cannot change status';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER restaurants_deactivated_terminal_trg
  BEFORE UPDATE OF status ON restaurants
  FOR EACH ROW EXECUTE FUNCTION restaurants_deactivated_terminal();

------------------------------------------------------------------
-- users
------------------------------------------------------------------
ALTER TABLE users
  ADD CONSTRAINT users_phone_chk CHECK (phone ~ '^[0-9]{10,15}$'),
  ADD CONSTRAINT users_role_restaurant_chk CHECK (
    (role = 'PLATFORM_ADMIN'   AND restaurant_id IS NULL) OR
    (role = 'RESTAURANT_OWNER' AND restaurant_id IS NOT NULL)),
  ADD CONSTRAINT users_failed_login_chk CHECK (failed_login_count >= 0);

-- One owner per restaurant (Phase A; no staff roles).
CREATE UNIQUE INDEX users_one_owner_per_restaurant_uq
  ON users (restaurant_id) WHERE role = 'RESTAURANT_OWNER';

------------------------------------------------------------------
-- areas (global, shared by all restaurants) and restaurant_delivery_areas
------------------------------------------------------------------
ALTER TABLE areas
  ADD CONSTRAINT areas_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
-- Global case-insensitive name uniqueness: "Timergara" and "timergara" are the same area.
CREATE UNIQUE INDEX areas_name_lower_uq ON areas (lower(name));

ALTER TABLE restaurant_delivery_areas
  ADD CONSTRAINT rda_fee_chk CHECK (delivery_fee IS NULL OR delivery_fee >= 0);

------------------------------------------------------------------
-- restaurant_hours
------------------------------------------------------------------
ALTER TABLE restaurant_hours
  ADD CONSTRAINT rh_day_chk   CHECK (day_of_week BETWEEN 0 AND 6),
  ADD CONSTRAINT rh_times_chk CHECK (open_time <> close_time);  -- close < open = after midnight
CREATE INDEX restaurant_hours_day_idx ON restaurant_hours (restaurant_id, day_of_week);

------------------------------------------------------------------
-- menu: uniqueness is PER RESTAURANT (or narrower), among ACTIVE rows only.
-- Two restaurants may both have a category called "Karahi".
-- Deactivated rows do not block re-using a name.
------------------------------------------------------------------
ALTER TABLE menu_categories
  ADD CONSTRAINT mc_name_len_chk CHECK (char_length(name) BETWEEN 1 AND 60);
CREATE UNIQUE INDEX menu_categories_name_uq
  ON menu_categories (restaurant_id, lower(name)) WHERE is_active;

ALTER TABLE menu_items
  ADD CONSTRAINT mi_name_len_chk    CHECK (char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT mi_desc_len_chk    CHECK (description IS NULL OR char_length(description) <= 300),
  ADD CONSTRAINT mi_image_https_chk CHECK (image_url IS NULL OR image_url LIKE 'https://%'),
  ADD CONSTRAINT mi_price_chk       CHECK (base_price IS NULL OR base_price >= 0);
-- Same dish name may exist in different categories of the same restaurant.
CREATE UNIQUE INDEX menu_items_name_uq
  ON menu_items (restaurant_id, category_id, lower(name)) WHERE is_active;
CREATE INDEX menu_items_active_idx ON menu_items (restaurant_id) WHERE is_active;

ALTER TABLE menu_item_variants
  ADD CONSTRAINT miv_name_len_chk CHECK (char_length(name) BETWEEN 1 AND 40),
  ADD CONSTRAINT miv_price_chk    CHECK (price >= 0);
-- Scope = one item. (restaurant_id is implied: the composite FK ties the item to the same restaurant.)
CREATE UNIQUE INDEX menu_item_variants_name_uq
  ON menu_item_variants (menu_item_id, lower(name)) WHERE is_active;

------------------------------------------------------------------
-- order_intents / order_intent_items
------------------------------------------------------------------
ALTER TABLE order_intents
  ADD CONSTRAINT oi_ref_format_chk     CHECK (public_ref ~ '^TM-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$'),
  -- customer_name and customer_phone are OPTIONAL: validated only when present.
  ADD CONSTRAINT oi_name_len_chk       CHECK (customer_name  IS NULL OR char_length(customer_name) BETWEEN 2 AND 60),
  ADD CONSTRAINT oi_phone_chk          CHECK (customer_phone IS NULL OR customer_phone ~ '^[0-9]{10,15}$'),
  ADD CONSTRAINT oi_wa_snapshot_chk    CHECK (restaurant_whatsapp_snapshot ~ '^[0-9]{10,15}$'),
  ADD CONSTRAINT oi_landmark_len_chk   CHECK (char_length(landmark) BETWEEN 3 AND 150),
  ADD CONSTRAINT oi_directions_len_chk CHECK (directions IS NULL OR char_length(directions) <= 300),
  ADD CONSTRAINT oi_map_pair_chk       CHECK ((map_lat IS NULL) = (map_lng IS NULL)),
  ADD CONSTRAINT oi_map_range_chk      CHECK (map_lat IS NULL OR (map_lat BETWEEN -90 AND 90 AND map_lng BETWEEN -180 AND 180)),
  ADD CONSTRAINT oi_subtotal_chk       CHECK (subtotal >= 0),
  ADD CONSTRAINT oi_fee_chk            CHECK (
    (delivery_fee_status = 'KNOWN'           AND delivery_fee IS NOT NULL AND delivery_fee >= 0) OR
    (delivery_fee_status = 'TO_BE_CONFIRMED' AND delivery_fee IS NULL)),
  ADD CONSTRAINT oi_currency_chk       CHECK (currency = 'PKR'),
  ADD CONSTRAINT oi_expiry_chk         CHECK (expires_at > created_at),
  -- "Button clicked" timestamp exists exactly when status says so. Not proof a message was sent.
  ADD CONSTRAINT oi_opened_chk         CHECK ((status = 'WHATSAPP_OPENED') = (whatsapp_opened_at IS NOT NULL));
CREATE INDEX order_intents_expires_idx ON order_intents (expires_at);

ALTER TABLE order_intent_items
  ADD CONSTRAINT oii_qty_chk   CHECK (quantity BETWEEN 1 AND 50),
  ADD CONSTRAINT oii_price_chk CHECK (unit_price >= 0),
  ADD CONSTRAINT oii_total_chk CHECK (line_total = unit_price * quantity),
  ADD CONSTRAINT oii_lineno_chk CHECK (line_no >= 1);
-- Not expressible in SQL: order_intents.subtotal = SUM(line_total). Enforced in the
-- create-intent service inside the same transaction.

------------------------------------------------------------------
-- audit_logs: append-only (blocks UPDATE, DELETE and TRUNCATE)
------------------------------------------------------------------
CREATE FUNCTION audit_logs_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (% not allowed)', TG_OP;
END;
$$;

CREATE TRIGGER audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();

CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_append_only();
