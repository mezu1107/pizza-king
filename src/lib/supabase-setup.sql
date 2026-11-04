-- =============================================================================
-- Pizza King — Subscription Module Tables
-- Run this once in the Supabase SQL editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. module_prices
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_prices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key   text UNIQUE NOT NULL,
  module_name  text NOT NULL,
  description  text,
  one_time_price  integer NOT NULL DEFAULT 0,
  monthly_price   integer NOT NULL DEFAULT 0,
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE module_prices ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read prices (public store page)
CREATE POLICY "module_prices_public_read"
  ON module_prices FOR SELECT
  USING (true);

-- Allow anon/authenticated to upsert (admin page uses custom session auth, not Supabase auth)
CREATE POLICY "module_prices_public_write"
  ON module_prices FOR ALL
  USING (true)
  WITH CHECK (true);

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

-- Anyone can submit an order (buyers have no Supabase account)
CREATE POLICY "module_orders_public_insert"
  ON module_orders FOR INSERT
  WITH CHECK (true);

-- Anyone can read orders filtered by order_token or buyer_email (track page)
CREATE POLICY "module_orders_public_read"
  ON module_orders FOR SELECT
  USING (true);

-- Allow anon to update status (admin panel uses custom session auth, not Supabase auth)
CREATE POLICY "module_orders_public_update"
  ON module_orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. Seed data — module_prices (20 locked modules)
-- -----------------------------------------------------------------------------
INSERT INTO module_prices (module_key, module_name, description, one_time_price, monthly_price) VALUES
  ('/admin/deals',          'Deals Management',   'Create and manage flash deals and promotions',     2500, 999),
  ('/admin/categories',     'Categories',         'Organize menu with custom categories',             1500, 599),
  ('/admin/coupons',        'Coupons',            'Generate and manage discount coupons',             2000, 799),
  ('/admin/customers',      'Customers',          'Full customer management and analytics',           3000, 1199),
  ('/admin/riders',         'Riders Management',  'Manage delivery riders and assignments',           3500, 1399),
  ('/admin/delivery-zones', 'Delivery Zones',     'Configure delivery areas and pricing',             2000, 799),
  ('/admin/reviews',        'Reviews',            'Monitor and respond to customer reviews',          1500, 599),
  ('/admin/settings',       'Settings',           'Full app configuration and customization',         2500, 999),
  ('/rider/map',            'Live Map',           'Real-time GPS tracking map for riders',            2000, 799),
  ('/rider/earnings',       'Earnings',           'Detailed earnings and payout tracking',            1500, 599),
  ('/rider/wallet',         'Wallet',             'Rider wallet and withdrawal management',           1500, 599),
  ('/rider/history',        'History',            'Full delivery history and records',                1000, 399),
  ('/rider/schedule',       'Schedule',           'Shift scheduling and availability',                1500, 599),
  ('/rider/notifications',  'Notifications',      'Push notifications for riders',                    1000, 399),
  ('/rider/chat',           'Chat Support',       'In-app chat with support team',                   2000, 799),
  ('/rider/reviews',        'Reviews',            'Customer ratings and feedback',                    1000, 399),
  ('/rider/performance',    'Performance',        'Detailed performance analytics',                   1500, 599),
  ('/rider/documents',      'Documents',          'Document upload and verification',                 1000, 399),
  ('/rider/help',           'Help Center',        'Access to help docs and support',                   800, 299),
  ('/rider/settings',       'Settings',           'Rider app settings and preferences',                800, 299)
ON CONFLICT (module_key) DO NOTHING;
