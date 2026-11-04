-- =============================================================================
-- Pizza King — Subscription Module Tables
-- Run this once in the Supabase SQL editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. module_prices
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_prices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key     text UNIQUE NOT NULL,
  module_name    text NOT NULL,
  description    text,
  one_time_price integer NOT NULL DEFAULT 0,
  monthly_price  integer NOT NULL DEFAULT 0,
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE module_prices ENABLE ROW LEVEL SECURITY;

-- Public SELECT: anyone can read prices (feature store page)
CREATE POLICY "module_prices_public_read"
  ON module_prices FOR SELECT
  USING (true);

-- No direct anon INSERT/UPDATE on module_prices.
-- Writes go through upsert_module_price() RPC below.

-- -----------------------------------------------------------------------------
-- 2. module_orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_orders (
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

-- Buyers can INSERT new orders (no account required)
CREATE POLICY "module_orders_public_insert"
  ON module_orders FOR INSERT
  WITH CHECK (true);

-- Anyone can SELECT orders (required for /track-my-order page)
CREATE POLICY "module_orders_public_read"
  ON module_orders FOR SELECT
  USING (true);

-- No direct anon UPDATE on module_orders.
-- Status changes go through update_order_status() RPC below,
-- preventing buyers from self-approving via the REST API.

-- -----------------------------------------------------------------------------
-- 3. RPC: upsert_module_price
-- Admin-only price write. The caller passes the admin password as p_secret;
-- the DB checks it against the stored setting. Runs as SECURITY DEFINER so it
-- can bypass RLS on module_prices.
--
-- Setup: run this once after creating the function:
--   ALTER DATABASE postgres SET "app.admin_rpc_secret" TO 'Ashu@1107';
-- (Or set it to any other value — just match VITE_ADMIN_RPC_SECRET on Vercel.)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_module_price(
  p_secret         text,
  p_module_key     text,
  p_module_name    text,
  p_description    text,
  p_one_time_price integer,
  p_monthly_price  integer
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS DISTINCT FROM current_setting('app.admin_rpc_secret', true) THEN
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

-- -----------------------------------------------------------------------------
-- 4. RPC: update_order_status
-- Admin-only approve/reject. Same secret check as above.
-- Prevents buyers from self-approving via the public REST API.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_order_status(
  p_secret   text,
  p_order_id uuid,
  p_status   text   -- 'approved' or 'rejected'
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS DISTINCT FROM current_setting('app.admin_rpc_secret', true) THEN
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

-- -----------------------------------------------------------------------------
-- 5. Seed data — module_prices (20 locked modules)
-- -----------------------------------------------------------------------------
INSERT INTO module_prices (module_key, module_name, description, one_time_price, monthly_price) VALUES
  ('/admin/deals',          'Deals Management',   'Create and manage flash deals and promotions',   2500, 999),
  ('/admin/categories',     'Categories',         'Organize menu with custom categories',           1500, 599),
  ('/admin/coupons',        'Coupons',            'Generate and manage discount coupons',           2000, 799),
  ('/admin/customers',      'Customers',          'Full customer management and analytics',         3000, 1199),
  ('/admin/riders',         'Riders Management',  'Manage delivery riders and assignments',         3500, 1399),
  ('/admin/delivery-zones', 'Delivery Zones',     'Configure delivery areas and pricing',           2000, 799),
  ('/admin/reviews',        'Reviews',            'Monitor and respond to customer reviews',        1500, 599),
  ('/admin/settings',       'Settings',           'Full app configuration and customization',       2500, 999),
  ('/rider/map',            'Live Map',           'Real-time GPS tracking map for riders',          2000, 799),
  ('/rider/earnings',       'Earnings',           'Detailed earnings and payout tracking',          1500, 599),
  ('/rider/wallet',         'Wallet',             'Rider wallet and withdrawal management',         1500, 599),
  ('/rider/history',        'History',            'Full delivery history and records',              1000, 399),
  ('/rider/schedule',       'Schedule',           'Shift scheduling and availability',              1500, 599),
  ('/rider/notifications',  'Notifications',      'Push notifications for riders',                  1000, 399),
  ('/rider/chat',           'Chat Support',       'In-app chat with support team',                  2000, 799),
  ('/rider/reviews',        'Reviews',            'Customer ratings and feedback',                  1000, 399),
  ('/rider/performance',    'Performance',        'Detailed performance analytics',                 1500, 599),
  ('/rider/documents',      'Documents',          'Document upload and verification',               1000, 399),
  ('/rider/help',           'Help Center',        'Access to help docs and support',                 800, 299),
  ('/rider/settings',       'Settings',           'Rider app settings and preferences',              800, 299)
ON CONFLICT (module_key) DO NOTHING;

-- =============================================================================
-- Pricing & Plans — Package subscription tables (FEAT-001)
-- Append-only: the existing module_prices / module_orders / RPCs above remain
-- intact so old orders keep working. New purchases flow through package_orders.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6. subscription_packages  (the 6 plans: 3 admin + 3 rider)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_packages (
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

-- Public SELECT: anyone can read published plans (Pricing & Plans store page)
CREATE POLICY "subscription_packages_public_read"
  ON subscription_packages FOR SELECT
  USING (true);

-- No direct anon INSERT/UPDATE — writes go through upsert_package() RPC below.

-- -----------------------------------------------------------------------------
-- 7. package_modules  (which module_keys each plan unlocks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id  uuid REFERENCES subscription_packages(id) ON DELETE CASCADE,
  module_key  text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (package_id, module_key)
);

ALTER TABLE package_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_modules_public_read"
  ON package_modules FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- 8. package_features  (the marketing bullet list per plan)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_features (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id    uuid REFERENCES subscription_packages(id) ON DELETE CASCADE,
  feature_text  text NOT NULL,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE package_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_features_public_read"
  ON package_features FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- 9. package_orders  (buyer purchase requests + admin approval state)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_orders (
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
  subscription_end     date,                                 -- NULL for one_time
  order_token          text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE package_orders ENABLE ROW LEVEL SECURITY;

-- Buyers can INSERT new purchase requests (no account required)
CREATE POLICY "package_orders_public_insert"
  ON package_orders FOR INSERT
  WITH CHECK (true);

-- Anyone can SELECT orders (required for the public /track-my-order page,
-- matched against the existing module_orders public-read approach)
CREATE POLICY "package_orders_public_read"
  ON package_orders FOR SELECT
  USING (true);

-- No direct anon UPDATE — status changes go through
-- update_package_order_status() RPC below, preventing buyers from
-- self-approving via the REST API.

-- -----------------------------------------------------------------------------
-- 10. package_order_status_history  (audit trail for every status change)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_order_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid REFERENCES package_orders(id) ON DELETE CASCADE,
  status      text NOT NULL,
  note        text,
  created_by  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE package_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_order_status_history_public_read"
  ON package_order_status_history FOR SELECT
  USING (true);

-- Public INSERT so the buyer can seed the initial "Order placed" history row
-- from the client (insertPackageOrder). Subsequent rows are written by the
-- SECURITY DEFINER update_package_order_status RPC, which bypasses RLS.
CREATE POLICY "package_order_status_history_public_insert"
  ON package_order_status_history FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 11. RPC: upsert_package
-- Admin-only plan write (create or update by plan_key). Same secret check as
-- upsert_module_price. SECURITY DEFINER so it can bypass RLS.
-- -----------------------------------------------------------------------------
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
  IF p_secret IS DISTINCT FROM current_setting('app.admin_rpc_secret', true) THEN
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

-- -----------------------------------------------------------------------------
-- 12. RPC: update_package_order_status
-- Admin-only approve / reject / activate / expire / cancel. Sets the
-- subscription window when a monthly plan is approved. Appends a row to
-- package_order_status_history. SECURITY DEFINER so it can bypass RLS.
-- -----------------------------------------------------------------------------
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
  IF p_secret IS DISTINCT FROM current_setting('app.admin_rpc_secret', true) THEN
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

-- -----------------------------------------------------------------------------
-- 13. Seed data — 6 default subscription packages
-- -----------------------------------------------------------------------------
INSERT INTO subscription_packages
  (plan_key, name, category, tier, description, monthly_price, one_time_price, is_popular, is_enabled)
VALUES
  ('admin_starter',      'Admin Starter',      'admin', 1, 'Essential tools to launch deals, categories and coupons.',     1999, 5000,  false, true),
  ('admin_growth',       'Admin Growth',       'admin', 2, 'Grow faster with customers, reviews and delivery zones.',    3499, 9000,  true,  true),
  ('admin_enterprise',   'Admin Enterprise',   'admin', 3, 'Everything you need to run the full restaurant operation.', 4999, 13000, false, true),
  ('rider_essential',    'Rider Essential',    'rider', 1, 'Core delivery tools: live map, earnings and history.',          999, 2500,  false, true),
  ('rider_professional', 'Rider Professional', 'rider', 2, 'Pro rider suite with wallet, schedule and analytics.',       1799, 4500,  true,  true),
  ('rider_elite',        'Rider Elite',        'rider', 3, 'The complete rider experience with chat, docs and support.', 2499, 6500,  false, true)
ON CONFLICT (plan_key) DO NOTHING;

-- Seed package_modules (expanded tier-inclusive lists; higher tiers include all
-- lower-tier modules of the same category). Idempotent via the unique constraint.
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

-- Seed package_features (marketing bullets; sort_order = list index).
-- Guarded so re-running the seed does not duplicate feature rows.
INSERT INTO package_features (package_id, feature_text, sort_order)
SELECT sp.id, v.feature_text, v.sort_order
FROM subscription_packages sp
JOIN (
  VALUES
    ('admin_starter',      'Create flash deals & promotions',  0),
    ('admin_starter',      'Custom menu categories',            1),
    ('admin_starter',      'Discount coupon management',       2),
    ('admin_growth',       'Everything in Starter',            0),
    ('admin_growth',       'Customer management & analytics', 1),
    ('admin_growth',       'Reviews & reputation',             2),
    ('admin_growth',       'Delivery zone configuration',      3),
    ('admin_enterprise',   'Everything in Growth',             0),
    ('admin_enterprise',   'Rider management & assignments',   1),
    ('admin_enterprise',   'Full app settings & branding',     2),
    ('rider_essential',    'Live GPS tracking map',            0),
    ('rider_essential',    'Detailed earnings',                 1),
    ('rider_essential',    'Complete delivery history',         2),
    ('rider_professional', 'Everything in Essential',          0),
    ('rider_professional', 'Digital rider wallet',             1),
    ('rider_professional', 'Shift scheduling',                 2),
    ('rider_professional', 'Push notifications',               3),
    ('rider_professional', 'Performance analytics',            4),
    ('rider_elite',        'Everything in Professional',       0),
    ('rider_elite',        'In-app chat support',              1),
    ('rider_elite',        'Document upload & verification',   2),
    ('rider_elite',        'Help center',                       3),
    ('rider_elite',        'Rider settings',                   4)
) AS v(plan_key, feature_text, sort_order) ON v.plan_key = sp.plan_key
WHERE NOT EXISTS (
  SELECT 1 FROM package_features pf
  WHERE pf.package_id = sp.id AND pf.feature_text = v.feature_text
);
