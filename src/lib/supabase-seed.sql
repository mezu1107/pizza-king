-- =============================================================================
-- PIZZA KING - DATABASE SEEDING & INITIALIZATION SCRIPT
-- =============================================================================
-- This script sets up:
-- 1. Website Branding & Settings (Pizza King)
-- 2. Rider Settings (commission, rates, points)
-- 3. Realistic Pakistani Customer Testimonials
-- 4. POS Cashier User Role Setup
-- =============================================================================

-- Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. WEBSITE SETTINGS
-- =============================================================================
ALTER TABLE IF EXISTS public.website_settings 
  ADD COLUMN IF NOT EXISTS restaurant_name text DEFAULT 'Pizza King',
  ADD COLUMN IF NOT EXISTS address text DEFAULT 'Mankiala, Rawalpindi, Pakistan',
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT '+92 349 8190030',
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT 'info@pizzaking.pk',
  ADD COLUMN IF NOT EXISTS maintenance_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message text DEFAULT 'We apologise, we are working on this. We will fix it as soon as possible.',
  ADD COLUMN IF NOT EXISTS delivery_charges numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS free_delivery_above numeric DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS opening_hours_weekday text DEFAULT '12:00 PM - 02:00 AM',
  ADD COLUMN IF NOT EXISTS opening_hours_weekend text DEFAULT '12:00 PM - 03:00 AM',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update or insert website_settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.website_settings) THEN
    UPDATE public.website_settings
    SET
      restaurant_name = 'Pizza King',
      address = 'Mankiala, Rawalpindi, Pakistan',
      contact_phone = '+92 349 8190030',
      contact_email = 'info@pizzaking.pk',
      maintenance_mode = false,
      maintenance_message = 'We apologise, we are working on this. We will fix it as soon as possible.',
      updated_at = now();
  ELSE
    INSERT INTO public.website_settings (
      restaurant_name,
      address,
      contact_phone,
      contact_email,
      maintenance_mode,
      maintenance_message,
      delivery_charges,
      free_delivery_above
    ) VALUES (
      'Pizza King',
      'Mankiala, Rawalpindi, Pakistan',
      '+92 349 8190030',
      'info@pizzaking.pk',
      false,
      'We apologise, we are working on this. We will fix it as soon as possible.',
      100,
      2000
    );
  END IF;
END $$;


-- =============================================================================
-- 2. RIDER SETTINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_percent numeric DEFAULT 10.0,
  per_km_rate numeric DEFAULT 20.0,
  points_per_order numeric DEFAULT 10,
  min_payout numeric DEFAULT 500,
  payout_schedule text DEFAULT 'weekly',
  support_phone text DEFAULT '+92 349 8190030',
  support_whatsapp text DEFAULT '+92 349 8190030',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.rider_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rider_settings_public_read" ON public.rider_settings;
CREATE POLICY "rider_settings_public_read" ON public.rider_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "rider_settings_auth_all" ON public.rider_settings;
CREATE POLICY "rider_settings_auth_all" ON public.rider_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT ON public.rider_settings TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rider_settings) THEN
    UPDATE public.rider_settings
    SET
      commission_percent = 10.0,
      per_km_rate = 20.0,
      points_per_order = 10,
      updated_at = now();
  ELSE
    INSERT INTO public.rider_settings (
      commission_percent,
      per_km_rate,
      points_per_order,
      min_payout,
      payout_schedule,
      support_phone,
      support_whatsapp
    ) VALUES (
      10.0,
      20.0,
      10,
      500,
      'weekly',
      '+92 349 8190030',
      '+92 349 8190030'
    );
  END IF;
END $$;


-- =============================================================================
-- 3. TESTIMONIALS (Realistic Pakistani Reviews)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text DEFAULT 'Verified Customer',
  avatar text,
  rating integer DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  text text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonials_public_read" ON public.testimonials;
CREATE POLICY "testimonials_public_read" ON public.testimonials FOR SELECT USING (true);
DROP POLICY IF EXISTS "testimonials_auth_all" ON public.testimonials;
CREATE POLICY "testimonials_auth_all" ON public.testimonials FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT ON public.testimonials TO anon, authenticated;

-- Clear any old mock reviews and seed 14 fresh high quality reviews
DELETE FROM public.testimonials WHERE is_approved = true;

INSERT INTO public.testimonials (name, role, rating, text, is_approved) VALUES
('Usman Tariq', 'Local Guide · Rawalpindi', 5, 'Pizza King ka Crown Crust pizza next level hai! Cheese pull zabardast aur dough bohot soft thi. Delivery Mankiala me 25 minutes me punch gayi, bilkul garam!', true),
('Ayesha Khan', 'Foodie & Regular Buyer', 5, 'Best pizza spot around GT Road & Mankiala. Smoky BBQ tikka pizza aur zinger burger dono hi outstanding hain. Kids loved the loaded fries too!', true),
('Bilal Ahmed', 'Verified Customer', 5, 'Ordered the Midnight Feast deal for our cricket match gathering. Quantity aur quality dono top class. The rider was extremely polite and food was steaming hot.', true),
('Zainab Noor', 'Doctor · Islamabad', 5, 'Clean packaging, hygiene is evident, and taste is consistent every single time. Definitely recommended if you are looking for authentic cheesy pizzas!', true),
('Hamza Malik', 'Software Engineer', 5, 'Online tracking and ordering experience is super smooth. Special appreciation for the creamy ranch pizza sauce and crispy wings!', true),
('Sana Mir', 'Home Maker', 4, 'Bohot maza aya khane ka! Bachon ko zinger burger bohat pasand aya. Delivery charges bhi reasonable hain aur taste bhi fresh tha.', true),
('Daniyal Rasheed', 'Student', 5, 'Student deals are very budget friendly! Pocket friendly rates me itna heavy pizza aur fries kahin nahi milte. 10/10 recommend!', true),
('Maryam Fatima', 'Teacher', 5, 'Tried their Malai Boti Pizza yesterday on family dinner. Melt in mouth topping and crust was baked to perfection. Will reorder soon!', true),
('Omair Shah', 'Verified Customer', 5, 'Rider brother was on time and location pin accurately matched. Fast delivery in Mankiala area is rare, but Pizza King nailed it!', true),
('Faizan Ali', 'Gym Enthusiast', 4, 'Grilled chicken wrap and peri peri wings were juicy, spicy, and well seasoned. Great portion sizes!', true),
('Hira Siddiqui', 'Banker', 5, 'Ordered lunch for our entire branch. Everything was labelled cleanly, sauces were generous, and the cheesy garlic bread was a hit.', true),
('Kamran Afzal', 'Business Owner', 5, 'Pizza King sets the benchmark for fast food in our area. High quality cheese and fresh chicken every time. Five stars well deserved!', true),
('Nimra Tariq', 'Food Blogger', 5, 'Crust is light, sauce is perfectly spiced, and toppings are generous. Authentic taste with young vibrant vibes. Highly recommended!', true),
('Saad Farooq', 'Customer', 5, 'Super fast order delivery! Hot pizza right out of the oven. Customer support on WhatsApp answered all questions instantly.', true);


-- =============================================================================
-- 4. POS CASHIER USER ROLE HELPER
-- =============================================================================
-- Note: Create the user `pos@pizzaking.com` (password: `pos1107`) in Supabase
-- Dashboard -> Authentication -> Users -> Add User (auto-confirm email).
-- Then run this block to grant admin/pos_staff role so POS terminal unlocks:

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Look for pos@pizzaking.com or pos@youngmalang.com
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email IN ('pos@pizzaking.com', 'pos@youngmalang.com', 'admin@pizzaking.com')
  ORDER BY created_at DESC 
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Ensure admin role is present
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Also add pos_staff role if table supports multiple
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'pos_staff')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure profile exists
    INSERT INTO public.profiles (user_id, full_name, phone)
    VALUES (v_user_id, 'Pizza King POS Cashier', '+92 349 8190030')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
