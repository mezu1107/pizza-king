-- =============================================================================
-- Pizza King — Full Subscription System Setup (CLEAN VERSION)
-- Run the ENTIRE file in the Supabase SQL editor. Safe to re-run (idempotent).
-- No superuser permissions required — admin secret is checked inside the
-- SECURITY DEFINER functions directly (matches frontend ADMIN_RPC_SECRET).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. CLEAN SLATE — drop old/broken tables so schema mismatches are gone.
--    CASCADE removes dependent objects (FKs, policies). Safe to re-run.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS package_order_status_history CASCADE;
DROP TABLE IF EXISTS package_orders CASCADE;
DROP TABLE IF EXISTS package_features CASCADE;
DROP TABLE IF EXISTS package_modules CASCADE;
DROP TABLE IF EXISTS subscription_packages CASCADE;
DROP TABLE IF EXISTS module_orders CASCADE;
DROP TABLE IF EXISTS module_prices CASCADE;

-- Drop old RPCs so CREATE OR REPLACE is clean
DROP FUNCTION IF EXISTS upsert_module_price(text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS update_order_status(text, uuid, text);
DROP FUNCTION IF EXISTS upsert_package(text, text, text, text, int, text, int, int, boolean, boolean);
DROP FUNCTION IF EXISTS update_package_order_status(text, uuid, text, text);

-- =============================================================================
-- PART A — Legacy per-module tables (kept for backwards compatibility;
-- new purchases flow through PART B package tables)
-- =============================================================================

-- 1. module_prices ----------------------------------------------------------
CREATE TABLE module_prices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key     text UNIQUE NOT NULL,
  module_name    text NOT NULL,
  description    text,
  one_time_price integer NOT NULL DEFAULT 0,
  monthly_price  integer NOT NULL DEFAULT 0,
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE module_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "module_prices_public_read" ON module_prices FOR SELECT USING (true);

-- 2. module_orders ----------------------------------------------------------
CREATE TABLE module_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_token         text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  module_key          text NOT NULL,
  module_name         text NOT NULL,
  plan_type           text NOT NULL CHECK (plan_type IN ('one-time', 'monthly')),
  amount              integer NOT NULL,
  buyer_name          text NOT NULL,
  buyer_email         text NOT NULL,
  buyer_phone         text NOT NULL,
  txn_id              text NOT NULL,
  screenshot_url      text,
  screenshot_data_url text,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at        timestamptz DEFAULT now(),
  approved_at         timestamptz,
  notes               text
);

ALTER TABLE module_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "module_orders_public_insert" ON module_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "module_orders_public_read"   ON module_orders FOR SELECT USING (true);

-- 3. RPC: upsert_module_price (admin only via hardcoded secret) -------------
CREATE OR REPLACE FUNCTION upsert_module_price(
  p_secret          text,
  p_module_key      text,
  p_module_name     text,
  p_description     text,
  p_one_time_price  integer,
  p_monthly_price   integer
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS DISTINCT FROM 'Ashu@1107' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO module_prices
    (module_key, module_name, description, one_time_price, monthly_price, updated_at)
  VALUES
    (p_module_key, p_module_name, p_description, p_one_time_price, p_monthly_price, now())
  ON CONFLICT (module_key) DO UPDATE
    SET module_name    = EXCLUDED.module_name,
        description    = EXCLUDED.description,
        one_time_price = EXCLUDED.one_time_price,
        monthly_price  = EXCLUDED.monthly_price,
        updated_at     = now();
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_module_price TO anon, authenticated;

-- 4. RPC: update_order_status (admin only) --------------------------------
CREATE OR REPLACE FUNCTION update_order_status(
  p_secret   text,
  p_order_id uuid,
  p_status   text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS DISTINCT FROM 'Ashu@1107' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE module_orders
  SET status      = p_status,
      approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE NULL END
  WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_order_status TO anon, authenticated;

-- 5. Seed: module_prices (20 locked modules) -------------------------------
INSERT INTO module_prices (module_key, module_name, description, one_time_price, monthly_price) VALUES
  ('/admin/deals',          'Deals Management',   'Create and manage flash deals and promotions', 2500, 999),
  ('/admin/categories',     'Categories',         'Organize menu with custom categories',         1500, 599),
  ('/admin/coupons',        'Coupons',            'Generate and manage discount coupons',         2000, 799),
  ('/admin/customers',      'Customers',          'Full customer management and analytics',       3000, 1199),
  ('/admin/riders',         'Riders Management',  'Manage delivery riders and assignments',      3500, 1399),
  ('/admin/delivery-zones', 'Delivery Zones',     'Configure delivery areas and pricing',         2000, 799),
  ('/admin/reviews',        'Reviews',            'Monitor and respond to customer reviews',      1500, 599),
  ('/admin/settings',       'Settings',           'Full app configuration and customization',     2500, 999),
  ('/rider/map',            'Live Map',           'Real-time GPS tracking map for riders',        2000, 799),
  ('/rider/earnings',       'Earnings',           'Detailed earnings and payout tracking',        1500, 599),
  ('/rider/wallet',         'Wallet',             'Rider wallet and withdrawal management',       1500, 599),
  ('/rider/history',        'History',            'Full delivery history and records',           1000, 399),
  ('/rider/schedule',       'Schedule',           'Shift scheduling and availability',           1500, 599),
  ('/rider/notifications',  'Notifications',       'Push notifications for riders',               1000, 399),
  ('/rider/chat',           'Chat Support',       'In-app chat with support team',               2000, 799),
  ('/rider/reviews',        'Reviews',            'Customer ratings and feedback',              1000, 399),
  ('/rider/performance',    'Performance',        'Detailed performance analytics',               1500, 599),
  ('/rider/documents',      'Documents',          'Document upload and verification',             1000, 399),
  ('/rider/help',           'Help Center',        'Access to help docs and support',              800, 299),
  ('/rider/settings',       'Settings',           'Rider app settings and preferences',            800, 299)
ON CONFLICT (module_key) DO NOTHING;

-- =============================================================================
-- PART B — Package / Plan subscription system (the 6 plans)
-- =============================================================================

-- 6. subscription_packages (the 6 plans: 3 admin + 3 rider) ----------------
CREATE TABLE subscription_packages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key        text UNIQUE NOT NULL,
  name            text NOT NULL,
  category        text NOT NULL CHECK (category IN ('admin','rider')),
  tier            int NOT NULL,
  description     text,
  monthly_price   int NOT NULL DEFAULT 0,
  one_time_price  int NOT NULL DEFAULT 0,
  is_popular      boolean DEFAULT false,
  is_enabled      boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_packages_public_read" ON subscription_packages FOR SELECT USING (true);

-- 7. package_modules (which module_keys each plan unlocks) ----------------
CREATE TABLE package_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id  uuid REFERENCES subscription_packages(id) ON DELETE CASCADE,
  module_key  text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (package_id, module_key)
);

ALTER TABLE package_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_modules_public_read" ON package_modules FOR SELECT USING (true);

-- 8. package_features (marketing bullets per plan) ------------------------
CREATE TABLE package_features (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id    uuid REFERENCES subscription_packages(id) ON DELETE CASCADE,
  feature_text  text NOT NULL,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE package_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_features_public_read" ON package_features FOR SELECT USING (true);

-- 9. package_orders (purchase requests + admin approval) ------------------
CREATE TABLE package_orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id           uuid REFERENCES subscription_packages(id),
  package_name         text NOT NULL,
  plan_key             text NOT NULL,
  category             text NOT NULL,
  billing_type         text NOT NULL CHECK (billing_type IN ('monthly','one_time')),
  amount               integer NOT NULL,
  buyer_name           text NOT NULL,
  buyer_email          text NOT NULL,
  buyer_phone          text NOT NULL,
  txn_id               text NOT NULL,
  screenshot_data_url  text,
  status               text NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','approved','rejected','active','expired','cancelled')),
  admin_remarks        text,
  subscription_start   date,
  subscription_end     date,
  order_token          text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE package_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_orders_public_insert" ON package_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "package_orders_public_read"   ON package_orders FOR SELECT USING (true);

-- 10. package_order_status_history (audit trail) -------------------------
CREATE TABLE package_order_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid REFERENCES package_orders(id) ON DELETE CASCADE,
  status      text NOT NULL,
  note        text,
  created_by  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE package_order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_order_status_history_public_read"   ON package_order_status_history FOR SELECT USING (true);
CREATE POLICY "package_order_status_history_public_insert" ON package_order_status_history FOR INSERT WITH CHECK (true);

-- 11. RPC: upsert_package (admin only) -----------------------------------
CREATE OR REPLACE FUNCTION upsert_package(
  p_secret         text,
  p_plan_key       text,
  p_name           text,
  p_category       text,
  p_tier           int,
  p_description    text,
  p_monthly_price  int,
  p_one_time_price int,
  p_is_popular     boolean,
  p_is_enabled     boolean
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_secret IS DISTINCT FROM 'Ashu@1107' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO subscription_packages
    (plan_key, name, category, tier, description, monthly_price, one_time_price,
     is_popular, is_enabled, updated_at)
  VALUES
    (p_plan_key, p_name, p_category, p_tier, p_description, p_monthly_price,
     p_one_time_price, p_is_popular, p_is_enabled, now())
  ON CONFLICT (plan_key) DO UPDATE
    SET name            = EXCLUDED.name,
        category        = EXCLUDED.category,
        tier            = EXCLUDED.tier,
        description     = EXCLUDED.description,
        monthly_price   = EXCLUDED.monthly_price,
        one_time_price  = EXCLUDED.one_time_price,
        is_popular      = EXCLUDED.is_popular,
        is_enabled      = EXCLUDED.is_enabled,
        updated_at      = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_package TO anon, authenticated;

-- 12. RPC: update_package_order_status (admin only) ----------------------
CREATE OR REPLACE FUNCTION update_package_order_status(
  p_secret         text,
  p_order_id       uuid,
  p_status         text,
  p_admin_remarks  text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS DISTINCT FROM 'Ashu@1107' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_status NOT IN ('approved','rejected','active','expired','cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE package_orders
  SET status             = p_status,
      admin_remarks      = p_admin_remarks,
      updated_at         = now(),
      subscription_start = CASE WHEN p_status = 'approved' THEN current_date ELSE subscription_start END,
      subscription_end   = CASE
        WHEN p_status = 'approved' AND billing_type = 'monthly'  THEN (current_date + interval '30 days')::date
        WHEN p_status = 'approved' AND billing_type = 'one_time'  THEN NULL
        ELSE subscription_end
      END
  WHERE id = p_order_id;

  INSERT INTO package_order_status_history (order_id, status, note, created_by)
  VALUES (p_order_id, p_status, p_admin_remarks, 'admin');
END;
$$;

GRANT EXECUTE ON FUNCTION update_package_order_status TO anon, authenticated;

-- 12b. RPC: set_package_modules (admin only) — replace a plan's module set
CREATE OR REPLACE FUNCTION set_package_modules(
  p_secret        text,
  p_plan_key      text,
  p_module_keys   text[]
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_secret IS DISTINCT FROM 'Ashu@1107' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT id INTO v_id FROM subscription_packages WHERE plan_key = p_plan_key;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Package not found';
  END IF;
  DELETE FROM package_modules WHERE package_id = v_id;
  IF array_length(p_module_keys, 1) > 0 THEN
    INSERT INTO package_modules (package_id, module_key)
    SELECT v_id, m FROM unnest(p_module_keys) AS m;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_package_modules TO anon, authenticated;

-- 12c. RPC: set_package_features (admin only) — replace a plan's feature bullets
CREATE OR REPLACE FUNCTION set_package_features(
  p_secret    text,
  p_plan_key  text,
  p_features  text[]
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_secret IS DISTINCT FROM 'Ashu@1107' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT id INTO v_id FROM subscription_packages WHERE plan_key = p_plan_key;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Package not found';
  END IF;
  DELETE FROM package_features WHERE package_id = v_id;
  IF array_length(p_features, 1) > 0 THEN
    INSERT INTO package_features (package_id, feature_text, sort_order)
    SELECT v_id, f, (row_number() OVER ()) - 1 FROM unnest(p_features) AS f;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_package_features TO anon, authenticated;

-- 12d. RPC: disable_package (admin only) — soft disable a plan
CREATE OR REPLACE FUNCTION disable_package(
  p_secret    text,
  p_plan_key  text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS DISTINCT FROM 'Ashu@1107' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE subscription_packages
    SET is_enabled = false, updated_at = now()
  WHERE plan_key = p_plan_key;
END;
$$;

GRANT EXECUTE ON FUNCTION disable_package TO anon, authenticated;

-- 12e. RPC: update_package_order (admin only) — full edit of any order field
CREATE OR REPLACE FUNCTION update_package_order(
  p_secret             text,
  p_order_id           uuid,
  p_status             text,
  p_billing_type       text,
  p_amount             int,
  p_buyer_name         text,
  p_buyer_email        text,
  p_buyer_phone        text,
  p_txn_id             text,
  p_subscription_start date,
  p_subscription_end   date,
  p_admin_remarks      text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_old_status text;
BEGIN
  IF p_secret IS DISTINCT FROM 'Ashu@1107' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT status INTO v_old_status FROM package_orders WHERE id = p_order_id;

  UPDATE package_orders
  SET status             = COALESCE(p_status, status),
      billing_type       = COALESCE(p_billing_type, billing_type),
      amount             = COALESCE(p_amount, amount),
      buyer_name         = COALESCE(p_buyer_name, buyer_name),
      buyer_email        = COALESCE(p_buyer_email, buyer_email),
      buyer_phone        = COALESCE(p_buyer_phone, buyer_phone),
      txn_id             = COALESCE(p_txn_id, txn_id),
      subscription_start = COALESCE(p_subscription_start, subscription_start),
      subscription_end   = COALESCE(p_subscription_end, subscription_end),
      admin_remarks      = COALESCE(p_admin_remarks, admin_remarks),
      updated_at         = now()
  WHERE id = p_order_id;

  IF p_status IS NOT NULL AND p_status IS DISTINCT FROM v_old_status THEN
    INSERT INTO package_order_status_history (order_id, status, note, created_by)
    VALUES (p_order_id, p_status, p_admin_remarks, 'admin');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_package_order TO anon, authenticated;

-- 12f. RPC: delete_package_order (admin only) — hard delete + history cascade
CREATE OR REPLACE FUNCTION delete_package_order(
  p_secret   text,
  p_order_id uuid
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS DISTINCT FROM 'Ashu@1107' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM package_order_status_history WHERE order_id = p_order_id;
  DELETE FROM package_orders WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_package_order TO anon, authenticated;

-- 13. Seed: 6 default packages -------------------------------------------
INSERT INTO subscription_packages
  (plan_key, name, category, tier, description, monthly_price, one_time_price, is_popular, is_enabled)
VALUES
  ('admin_starter',      'Admin Starter',      'admin', 1, 'Essential tools to launch deals, categories and coupons.',    1999, 5000,  false, true),
  ('admin_growth',       'Admin Growth',       'admin', 2, 'Grow faster with customers, reviews and delivery zones.',    3499, 9000,  true,  true),
  ('admin_enterprise',   'Admin Enterprise',   'admin', 3, 'Everything you need to run the full restaurant operation.', 4999, 13000, false, true),
  ('rider_essential',    'Rider Essential',    'rider', 1, 'Core delivery tools: live map, earnings and history.',         999, 2500,  false, true),
  ('rider_professional', 'Rider Professional', 'rider', 2, 'Pro rider suite with wallet, schedule and analytics.',       1799, 4500,  true,  true),
  ('rider_elite',        'Rider Elite',        'rider', 3, 'The complete rider experience with chat, docs and support.', 2499, 6500,  false, true)
ON CONFLICT (plan_key) DO NOTHING;

-- 14. Seed: package_modules (tier-inclusive; higher tiers include lower) --
INSERT INTO package_modules (package_id, module_key)
SELECT sp.id, v.module_key
FROM subscription_packages sp
JOIN (
  VALUES
    ('admin_starter',      '/admin/deals'),
    ('admin_starter',      '/admin/categories'),
    ('admin_starter',      '/admin/coupons'),
    ('admin_growth',       '/admin/deals'),
    ('admin_growth',       '/admin/categories'),
    ('admin_growth',       '/admin/coupons'),
    ('admin_growth',       '/admin/customers'),
    ('admin_growth',       '/admin/reviews'),
    ('admin_growth',       '/admin/delivery-zones'),
    ('admin_enterprise',   '/admin/deals'),
    ('admin_enterprise',   '/admin/categories'),
    ('admin_enterprise',   '/admin/coupons'),
    ('admin_enterprise',   '/admin/customers'),
    ('admin_enterprise',   '/admin/reviews'),
    ('admin_enterprise',   '/admin/delivery-zones'),
    ('admin_enterprise',   '/admin/riders'),
    ('admin_enterprise',   '/admin/settings'),
    ('rider_essential',    '/rider/map'),
    ('rider_essential',    '/rider/earnings'),
    ('rider_essential',    '/rider/history'),
    ('rider_professional', '/rider/map'),
    ('rider_professional', '/rider/earnings'),
    ('rider_professional', '/rider/history'),
    ('rider_professional', '/rider/wallet'),
    ('rider_professional', '/rider/schedule'),
    ('rider_professional', '/rider/notifications'),
    ('rider_professional', '/rider/performance'),
    ('rider_elite',        '/rider/map'),
    ('rider_elite',        '/rider/earnings'),
    ('rider_elite',        '/rider/history'),
    ('rider_elite',        '/rider/wallet'),
    ('rider_elite',        '/rider/schedule'),
    ('rider_elite',        '/rider/notifications'),
    ('rider_elite',        '/rider/performance'),
    ('rider_elite',        '/rider/chat'),
    ('rider_elite',        '/rider/reviews'),
    ('rider_elite',        '/rider/documents'),
    ('rider_elite',        '/rider/help'),
    ('rider_elite',        '/rider/settings')
) AS v(plan_key, module_key) ON v.plan_key = sp.plan_key
ON CONFLICT (package_id, module_key) DO NOTHING;

-- 15. Seed: package_features (marketing bullets) -------------------------
INSERT INTO package_features (package_id, feature_text, sort_order)
SELECT sp.id, v.feature_text, v.sort_order
FROM subscription_packages sp
JOIN (
  VALUES
    ('admin_starter',      'Create flash deals & promotions',   0),
    ('admin_starter',      'Custom menu categories',            1),
    ('admin_starter',      'Discount coupon management',        2),
    ('admin_growth',       'Everything in Starter',            0),
    ('admin_growth',       'Customer management & analytics',   1),
    ('admin_growth',       'Reviews & reputation',              2),
    ('admin_growth',       'Delivery zone configuration',        3),
    ('admin_enterprise',   'Everything in Growth',              0),
    ('admin_enterprise',   'Rider management & assignments',    1),
    ('admin_enterprise',   'Full app settings & branding',       2),
    ('rider_essential',    'Live GPS tracking map',              0),
    ('rider_essential',    'Detailed earnings',                  1),
    ('rider_essential',    'Complete delivery history',          2),
    ('rider_professional', 'Everything in Essential',           0),
    ('rider_professional', 'Digital rider wallet',               1),
    ('rider_professional', 'Shift scheduling',                   2),
    ('rider_professional', 'Push notifications',                 3),
    ('rider_professional', 'Performance analytics',              4),
    ('rider_elite',        'Everything in Professional',        0),
    ('rider_elite',        'In-app chat support',                1),
    ('rider_elite',        'Document upload & verification',     2),
    ('rider_elite',        'Help center',                        3),
    ('rider_elite',        'Rider settings',                    4)
) AS v(plan_key, feature_text, sort_order) ON v.plan_key = sp.plan_key
WHERE NOT EXISTS (
  SELECT 1 FROM package_features pf
  WHERE pf.package_id = sp.id AND pf.feature_text = v.feature_text
);

-- =============================================================================
-- PART C — Delivery Zones & Settings (Public Read for customer checkout)
-- =============================================================================

CREATE TABLE IF NOT EXISTS delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_name text NOT NULL DEFAULT 'Pizza King Mankiala',
  center_lat double precision NOT NULL DEFAULT 33.5651,
  center_lng double precision NOT NULL DEFAULT 73.1486,
  free_radius_km double precision NOT NULL DEFAULT 5,
  base_delivery_charges double precision NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_km double precision NOT NULL DEFAULT 1,
  delivery_charges double precision NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Ensure initial default row exists in delivery_settings if empty
INSERT INTO delivery_settings (center_name, center_lat, center_lng, free_radius_km, base_delivery_charges)
SELECT 'Pizza King Mankiala', 33.5651, 73.1486, 5, 0
WHERE NOT EXISTS (SELECT 1 FROM delivery_settings);

-- RLS policies: allow public/anon/authenticated to read delivery zones
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_settings_public_read" ON delivery_settings;
CREATE POLICY "delivery_settings_public_read" ON delivery_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "delivery_settings_authenticated_write" ON delivery_settings;
CREATE POLICY "delivery_settings_authenticated_write" ON delivery_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE delivery_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_areas_public_read" ON delivery_areas;
CREATE POLICY "delivery_areas_public_read" ON delivery_areas FOR SELECT USING (true);

DROP POLICY IF EXISTS "delivery_areas_authenticated_write" ON delivery_areas;
CREATE POLICY "delivery_areas_authenticated_write" ON delivery_areas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RPC for secure and guaranteed retrieval even if table RLS is modified
CREATE OR REPLACE FUNCTION get_public_delivery_config()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings json;
  v_areas json;
BEGIN
  SELECT row_to_json(s) INTO v_settings FROM delivery_settings s LIMIT 1;
  SELECT coalesce(json_agg(row_to_json(a)), '[]'::json) INTO v_areas FROM delivery_areas a WHERE a.active = true;
  RETURN json_build_object('settings', v_settings, 'areas', v_areas);
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_delivery_config() TO anon, authenticated;

-- =============================================================================
-- DONE. Safe to re-run anytime.
-- =============================================================================
