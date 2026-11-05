CREATE OR REPLACE FUNCTION public.is_confirmed_auth_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = lower(p_email)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_public_website_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    jsonb_build_object(
      'restaurant_name', s.restaurant_name,
      'contact_email', s.contact_email,
      'contact_phone', s.contact_phone,
      'address', s.address,
      'opening_hours_weekday', s.opening_hours_weekday,
      'opening_hours_weekend', s.opening_hours_weekend,
      'facebook_url', s.facebook_url,
      'instagram_url', s.instagram_url,
      'twitter_url', s.twitter_url,
      'maintenance_mode', s.maintenance_mode,
      'maintenance_message', s.maintenance_message,
      'logo_url', s.logo_url
    ), '{}'::jsonb
  )
  FROM public.website_settings AS s
  ORDER BY s.updated_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_delivery_config()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT json_build_object(
    'settings', (
      SELECT json_build_object(
        'id', s.id,
        'center_name', s.center_name,
        'center_lat', s.center_lat,
        'center_lng', s.center_lng,
        'free_radius_km', s.free_radius_km,
        'base_delivery_charges', s.base_delivery_charges
      )
      FROM public.delivery_settings AS s
      ORDER BY s.updated_at DESC
      LIMIT 1
    ),
    'areas', coalesce((
      SELECT json_agg(json_build_object(
        'id', a.id,
        'name', a.name,
        'lat', a.lat,
        'lng', a.lng,
        'radius_km', a.radius_km,
        'delivery_charges', a.delivery_charges,
        'active', a.active
      ))
      FROM public.delivery_areas AS a
      WHERE a.active = true
    ), '[]'::json)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_public_module_prices()
RETURNS TABLE(module_key text, module_name text, description text, one_time_price integer, monthly_price integer, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.module_key, p.module_name, p.description, p.one_time_price, p.monthly_price, p.updated_at
  FROM public.module_prices AS p
  ORDER BY p.module_name;
$$;

CREATE OR REPLACE FUNCTION public.submit_package_order(
  p_package_id uuid,
  p_billing_type text,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text,
  p_txn_id text,
  p_screenshot_data_url text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_package public.subscription_packages%ROWTYPE;
  v_amount integer;
  v_token text;
  v_order_id uuid;
BEGIN
  IF p_billing_type NOT IN ('monthly', 'one_time')
     OR nullif(trim(p_buyer_name), '') IS NULL
     OR length(trim(p_buyer_name)) > 120
     OR nullif(trim(p_buyer_email), '') IS NULL
     OR length(trim(p_buyer_email)) > 254
     OR nullif(trim(p_buyer_phone), '') IS NULL
     OR length(trim(p_buyer_phone)) > 40
     OR nullif(trim(p_txn_id), '') IS NULL
     OR length(trim(p_txn_id)) > 120
     OR (p_screenshot_data_url IS NOT NULL AND (length(p_screenshot_data_url) > 7000000 OR p_screenshot_data_url NOT LIKE 'data:image/%')) THEN
    RAISE EXCEPTION 'Invalid purchase details';
  END IF;

  SELECT * INTO v_package
  FROM public.subscription_packages AS p
  WHERE p.id = p_package_id AND p.is_enabled = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'This plan is unavailable'; END IF;

  v_amount := CASE WHEN p_billing_type = 'monthly' THEN v_package.monthly_price ELSE v_package.one_time_price END;
  INSERT INTO public.package_orders (
    package_id, package_name, plan_key, category, billing_type, amount,
    buyer_name, buyer_email, buyer_phone, txn_id, screenshot_data_url, status
  ) VALUES (
    v_package.id, v_package.name, v_package.plan_key, v_package.category, p_billing_type, v_amount,
    trim(p_buyer_name), lower(trim(p_buyer_email)), trim(p_buyer_phone), trim(p_txn_id), p_screenshot_data_url, 'pending'
  ) RETURNING id, order_token INTO v_order_id, v_token;

  INSERT INTO public.package_order_status_history(order_id, status, note, created_by)
  VALUES (v_order_id, 'pending', 'Order placed', 'buyer');
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_package_order_by_token(p_order_token text)
RETURNS TABLE(
  id uuid, order_token text, package_id uuid, package_name text, plan_key text, category text,
  billing_type text, amount integer, buyer_name text, buyer_email text, buyer_phone text,
  txn_id text, screenshot_data_url text, status text, admin_remarks text,
  subscription_start date, subscription_end date, custom_modules text[], created_at timestamptz,
  updated_at timestamptz, package_order_status_history jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.id, o.order_token, o.package_id, o.package_name, o.plan_key, o.category,
         o.billing_type, o.amount, o.buyer_name, o.buyer_email, o.buyer_phone,
         o.txn_id, o.screenshot_data_url, o.status, o.admin_remarks,
         o.subscription_start, o.subscription_end, o.custom_modules, o.created_at, o.updated_at,
         coalesce((
           SELECT jsonb_agg(jsonb_build_object(
             'status', h.status, 'note', h.note, 'created_by', h.created_by, 'created_at', h.created_at
           ) ORDER BY h.created_at)
           FROM public.package_order_status_history AS h WHERE h.order_id = o.id
         ), '[]'::jsonb)
  FROM public.package_orders AS o
  WHERE length(p_order_token) BETWEEN 32 AND 80 AND o.order_token = p_order_token;
$$;

CREATE OR REPLACE FUNCTION public.submit_module_order(
  p_module_key text,
  p_plan_type text,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text,
  p_txn_id text,
  p_screenshot_data_url text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_price public.module_prices%ROWTYPE;
  v_amount integer;
  v_token text;
BEGIN
  IF p_plan_type NOT IN ('monthly', 'one-time')
     OR nullif(trim(p_buyer_name), '') IS NULL OR length(trim(p_buyer_name)) > 120
     OR nullif(trim(p_buyer_email), '') IS NULL OR length(trim(p_buyer_email)) > 254
     OR nullif(trim(p_buyer_phone), '') IS NULL OR length(trim(p_buyer_phone)) > 40
     OR nullif(trim(p_txn_id), '') IS NULL OR length(trim(p_txn_id)) > 120
     OR (p_screenshot_data_url IS NOT NULL AND (length(p_screenshot_data_url) > 7000000 OR p_screenshot_data_url NOT LIKE 'data:image/%')) THEN
    RAISE EXCEPTION 'Invalid purchase details';
  END IF;
  SELECT * INTO v_price FROM public.module_prices AS p WHERE p.module_key = p_module_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'This module is unavailable'; END IF;
  v_amount := CASE WHEN p_plan_type = 'monthly' THEN v_price.monthly_price ELSE v_price.one_time_price END;
  INSERT INTO public.module_orders (
    module_key, module_name, plan_type, amount, buyer_name, buyer_email, buyer_phone,
    txn_id, screenshot_data_url, status, submitted_at
  ) VALUES (
    v_price.module_key, v_price.module_name, p_plan_type, v_amount, trim(p_buyer_name),
    lower(trim(p_buyer_email)), trim(p_buyer_phone), trim(p_txn_id), p_screenshot_data_url, 'pending', now()
  ) RETURNING order_token INTO v_token;
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_module_order_by_token(p_order_token text)
RETURNS TABLE(
  id uuid, order_token text, module_key text, module_name text, plan_type text, amount integer,
  buyer_name text, buyer_email text, buyer_phone text, txn_id text, screenshot_data_url text,
  screenshot_url text, status text, submitted_at timestamptz, approved_at timestamptz, notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.id, o.order_token, o.module_key, o.module_name, o.plan_type, o.amount,
         o.buyer_name, o.buyer_email, o.buyer_phone, o.txn_id, o.screenshot_data_url,
         o.screenshot_url, o.status, o.submitted_at, o.approved_at, o.notes
  FROM public.module_orders AS o
  WHERE length(p_order_token) BETWEEN 32 AND 80 AND o.order_token = p_order_token;
$$;

CREATE OR REPLACE FUNCTION public.place_customer_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_delivery_lat numeric,
  p_delivery_lng numeric,
  p_coupon_code text,
  p_points_redeemed integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_food_id text;
  v_title text;
  v_price numeric;
  v_quantity integer;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_coupon_discount numeric := 0;
  v_delivery numeric := 0;
  v_total numeric := 0;
  v_balance integer := 0;
  v_points integer := coalesce(p_points_redeemed, 0);
  v_earned integer := 0;
  v_order_id uuid;
  v_settings public.delivery_settings%ROWTYPE;
  v_area public.delivery_areas%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_distance double precision;
  v_area_distance double precision;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Please sign in to place an order'; END IF;
  IF nullif(trim(p_customer_name), '') IS NULL OR length(trim(p_customer_name)) > 120
     OR nullif(trim(p_customer_phone), '') IS NULL OR length(trim(p_customer_phone)) > 40
     OR nullif(trim(p_customer_address), '') IS NULL OR length(trim(p_customer_address)) > 500
     OR p_delivery_lat IS NULL OR p_delivery_lng IS NULL
     OR p_delivery_lat NOT BETWEEN -90 AND 90 OR p_delivery_lng NOT BETWEEN -180 AND 180
     OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Please check your delivery and order details';
  END IF;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_items) AS x(value) LOOP
    v_food_id := v_item->>'id';
    IF v_food_id IS NULL THEN RAISE EXCEPTION 'Invalid menu item'; END IF;
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity < 1 OR v_quantity > 50 THEN RAISE EXCEPTION 'Invalid item quantity'; END IF;
    v_price := NULL;
    SELECT f.title, f.price INTO v_title, v_price FROM public.foods AS f
      WHERE f.id::text = v_food_id AND f.active = true;
    IF v_price IS NULL THEN
      SELECT d.title, d.price INTO v_title, v_price FROM public.deals AS d
        WHERE d.id::text = v_food_id AND d.active = true;
    END IF;
    IF v_price IS NULL THEN RAISE EXCEPTION 'A menu item is no longer available'; END IF;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id', v_food_id, 'title', v_title, 'price', v_price, 'quantity', v_quantity
    ));
    v_subtotal := v_subtotal + v_price * v_quantity;
  END LOOP;

  SELECT * INTO v_settings FROM public.delivery_settings AS s ORDER BY s.updated_at DESC LIMIT 1;
  IF FOUND THEN
    v_distance := 6371 * 2 * asin(sqrt(least(1.0,
      power(sin(radians(p_delivery_lat - v_settings.center_lat) / 2), 2) +
      cos(radians(v_settings.center_lat)) * cos(radians(p_delivery_lat)) *
      power(sin(radians(p_delivery_lng - v_settings.center_lng) / 2), 2)
    )));
    IF v_distance <= v_settings.free_radius_km THEN
      v_delivery := v_settings.base_delivery_charges;
    ELSE
      SELECT * INTO v_area FROM public.delivery_areas AS a WHERE a.active = true
        ORDER BY 6371 * 2 * asin(sqrt(least(1.0,
          power(sin(radians(p_delivery_lat - a.lat) / 2), 2) +
          cos(radians(a.lat)) * cos(radians(p_delivery_lat)) *
          power(sin(radians(p_delivery_lng - a.lng) / 2), 2)
        ))) LIMIT 1;
      IF FOUND THEN
        v_area_distance := 6371 * 2 * asin(sqrt(least(1.0,
          power(sin(radians(p_delivery_lat - v_area.lat) / 2), 2) +
          cos(radians(v_area.lat)) * cos(radians(p_delivery_lat)) *
          power(sin(radians(p_delivery_lng - v_area.lng) / 2), 2)
        )));
        IF v_area_distance > v_area.radius_km THEN RAISE EXCEPTION 'We do not deliver to this location'; END IF;
        v_delivery := v_area.delivery_charges;
      ELSE
        RAISE EXCEPTION 'We do not deliver to this location';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Delivery is temporarily unavailable';
  END IF;

  IF nullif(trim(coalesce(p_coupon_code, '')), '') IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons AS c
      WHERE upper(c.code) = upper(trim(p_coupon_code)) AND c.active = true FOR UPDATE;
    IF NOT FOUND OR (v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= now())
       OR (v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit)
       OR v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Coupon is invalid or no longer available';
    END IF;
    IF v_coupon.discount_type = 'percent' THEN
      v_coupon_discount := round(v_subtotal * v_coupon.discount_value / 100);
    ELSE
      v_coupon_discount := round(v_coupon.discount_value);
    END IF;
    IF v_coupon.max_discount IS NOT NULL THEN v_coupon_discount := least(v_coupon_discount, v_coupon.max_discount); END IF;
    v_coupon_discount := least(v_coupon_discount, v_subtotal);
    UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  SELECT coalesce(sum(t.points), 0)::integer INTO v_balance
  FROM public.loyalty_transactions AS t WHERE t.user_id = v_user_id;
  IF v_points < 0 OR v_points > v_balance OR v_points > greatest(0, floor(v_subtotal - v_coupon_discount)::integer)
     OR (v_points > 0 AND v_points < 50) THEN
    RAISE EXCEPTION 'The requested loyalty points are not available';
  END IF;
  v_discount := v_coupon_discount + v_points;
  v_total := greatest(0, v_subtotal - v_discount + v_delivery);
  v_earned := floor(v_total * 0.01)::integer;

  INSERT INTO public.orders (
    user_id, total, subtotal, status, customer_name, customer_phone, customer_email,
    customer_address, coupon_code, discount_amount, points_earned, points_redeemed,
    delivery_charges, source, payment_method, amount_paid, order_type, delivery_lat, delivery_lng
  ) VALUES (
    v_user_id, v_total, v_subtotal, 'pending', trim(p_customer_name), trim(p_customer_phone),
    (SELECT u.email FROM auth.users AS u WHERE u.id = v_user_id), trim(p_customer_address),
    CASE WHEN v_coupon.id IS NULL THEN NULL ELSE v_coupon.code END, v_discount, v_earned, v_points,
    v_delivery, 'web', 'cod', 0, 'delivery', p_delivery_lat, p_delivery_lng
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items(order_id, food_id, title, quantity, price)
  SELECT v_order_id, (x->>'id')::uuid, x->>'title', (x->>'quantity')::integer, (x->>'price')::numeric
  FROM pg_catalog.jsonb_array_elements(v_lines) AS q(x);

  IF v_coupon.id IS NOT NULL THEN
    INSERT INTO public.coupon_redemptions(coupon_id, user_id, order_id, discount_amount)
    VALUES (v_coupon.id, v_user_id, v_order_id, v_coupon_discount);
  END IF;
  IF v_points > 0 THEN
    INSERT INTO public.loyalty_transactions(user_id, points, reason, order_id)
    VALUES (v_user_id, -v_points, 'Order points redeemed', v_order_id);
  END IF;
  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_package(p_secret text, p_plan_key text, p_name text, p_category text, p_tier integer, p_description text, p_monthly_price integer, p_one_time_price integer, p_is_popular boolean, p_is_enabled boolean)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  INSERT INTO public.subscription_packages(plan_key, name, category, tier, description, monthly_price, one_time_price, is_popular, is_enabled, updated_at)
  VALUES (p_plan_key, p_name, p_category, p_tier, p_description, p_monthly_price, p_one_time_price, p_is_popular, p_is_enabled, now())
  ON CONFLICT (plan_key) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, tier=EXCLUDED.tier,
    description=EXCLUDED.description, monthly_price=EXCLUDED.monthly_price, one_time_price=EXCLUDED.one_time_price,
    is_popular=EXCLUDED.is_popular, is_enabled=EXCLUDED.is_enabled, updated_at=now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.disable_package(p_secret text, p_plan_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.subscription_packages SET is_enabled=false, updated_at=now() WHERE plan_key=p_plan_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_package_features(p_secret text, p_plan_key text, p_features text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT id INTO v_id FROM public.subscription_packages WHERE plan_key=p_plan_key;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;
  DELETE FROM public.package_features WHERE package_id=v_id;
  IF coalesce(array_length(p_features,1),0)>0 THEN
    INSERT INTO public.package_features(package_id,feature_text,sort_order)
    SELECT v_id, f, (row_number() OVER ())::integer-1 FROM unnest(p_features) AS f;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_package_modules(p_secret text, p_plan_key text, p_module_keys text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT id INTO v_id FROM public.subscription_packages WHERE plan_key=p_plan_key;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Package not found'; END IF;
  DELETE FROM public.package_modules WHERE package_id=v_id;
  IF coalesce(array_length(p_module_keys,1),0)>0 THEN
    INSERT INTO public.package_modules(package_id,module_key) SELECT v_id, m FROM unnest(p_module_keys) AS m;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_module_price(p_secret text, p_module_key text, p_module_name text, p_description text, p_one_time_price integer, p_monthly_price integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  INSERT INTO public.module_prices(module_key,module_name,description,one_time_price,monthly_price,updated_at)
  VALUES(p_module_key,p_module_name,p_description,p_one_time_price,p_monthly_price,now())
  ON CONFLICT(module_key) DO UPDATE SET module_name=EXCLUDED.module_name,description=EXCLUDED.description,
    one_time_price=EXCLUDED.one_time_price,monthly_price=EXCLUDED.monthly_price,updated_at=now();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_status(p_secret text, p_order_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.module_orders SET status=p_status, approved_at=CASE WHEN p_status='approved' THEN now() ELSE NULL END WHERE id=p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_package_order_status(p_secret text, p_order_id uuid, p_status text, p_admin_remarks text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('approved','rejected','active','expired','cancelled','blocked') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.package_orders SET status=p_status, admin_remarks=p_admin_remarks, updated_at=now(),
    subscription_start=CASE WHEN p_status IN ('approved','active') THEN current_date ELSE subscription_start END,
    subscription_end=CASE
      WHEN p_status IN ('approved','active') AND billing_type='monthly' THEN (current_date + interval '30 days')::date
      WHEN p_status IN ('approved','active') AND billing_type='one_time' THEN NULL
      ELSE subscription_end END
  WHERE id=p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package order not found'; END IF;
  INSERT INTO public.package_order_status_history(order_id,status,note,created_by)
  VALUES(p_order_id,p_status,p_admin_remarks,'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_package_order(
  p_secret text,p_order_id uuid,p_status text,p_billing_type text,p_amount integer,p_buyer_name text,
  p_buyer_email text,p_buyer_phone text,p_txn_id text,p_subscription_start date,p_subscription_end date,p_admin_remarks text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_old_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT status INTO v_old_status FROM public.package_orders WHERE id=p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package order not found'; END IF;
  UPDATE public.package_orders SET status=coalesce(p_status,status), billing_type=coalesce(p_billing_type,billing_type),
    amount=coalesce(p_amount,amount), buyer_name=coalesce(p_buyer_name,buyer_name),
    buyer_email=coalesce(lower(p_buyer_email),buyer_email), buyer_phone=coalesce(p_buyer_phone,buyer_phone),
    txn_id=coalesce(p_txn_id,txn_id), subscription_start=coalesce(p_subscription_start,subscription_start),
    subscription_end=coalesce(p_subscription_end,subscription_end), admin_remarks=coalesce(p_admin_remarks,admin_remarks), updated_at=now()
  WHERE id=p_order_id;
  IF p_status IS NOT NULL AND p_status IS DISTINCT FROM v_old_status THEN
    INSERT INTO public.package_order_status_history(order_id,status,note,created_by) VALUES(p_order_id,p_status,p_admin_remarks,'admin');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_package_order(
  p_secret text,p_order_id uuid,p_status text,p_billing_type text,p_amount integer,p_buyer_name text,
  p_buyer_email text,p_buyer_phone text,p_txn_id text,p_subscription_start date,p_subscription_end date,
  p_admin_remarks text,p_plan_key text DEFAULT NULL,p_package_name text DEFAULT NULL,p_custom_modules text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_old_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT status INTO v_old_status FROM public.package_orders WHERE id=p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package order not found'; END IF;
  UPDATE public.package_orders SET status=coalesce(p_status,status), billing_type=coalesce(p_billing_type,billing_type),
    amount=coalesce(p_amount,amount), buyer_name=coalesce(p_buyer_name,buyer_name),
    buyer_email=coalesce(lower(p_buyer_email),buyer_email), buyer_phone=coalesce(p_buyer_phone,buyer_phone),
    txn_id=coalesce(p_txn_id,txn_id), subscription_start=coalesce(p_subscription_start,subscription_start),
    subscription_end=coalesce(p_subscription_end,subscription_end), admin_remarks=coalesce(p_admin_remarks,admin_remarks),
    plan_key=coalesce(p_plan_key,plan_key), package_name=coalesce(p_package_name,package_name),
    custom_modules=coalesce(p_custom_modules,custom_modules), updated_at=now()
  WHERE id=p_order_id;
  IF p_status IS NOT NULL AND p_status IS DISTINCT FROM v_old_status THEN
    INSERT INTO public.package_order_status_history(order_id,status,note,created_by) VALUES(p_order_id,p_status,p_admin_remarks,'admin');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_confirmed_auth_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_website_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_delivery_config() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_module_prices() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_package_order(uuid,text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_package_order_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_module_order(text,text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_module_order_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_customer_order(jsonb,text,text,text,numeric,numeric,text,integer) TO authenticated;

DROP POLICY IF EXISTS "categories_auth_all" ON public.categories;
DROP POLICY IF EXISTS "categories_public_select" ON public.categories;
DROP POLICY IF EXISTS "foods_auth_all" ON public.foods;
DROP POLICY IF EXISTS "foods_public_select" ON public.foods;
DROP POLICY IF EXISTS "deals_auth_all" ON public.deals;
DROP POLICY IF EXISTS "deals_public_select" ON public.deals;
DROP POLICY IF EXISTS "coupons_auth_all" ON public.coupons;
DROP POLICY IF EXISTS "coupons_public_select" ON public.coupons;
DROP POLICY IF EXISTS "delivery_areas_auth_all" ON public.delivery_areas;
DROP POLICY IF EXISTS "delivery_areas_authenticated_write" ON public.delivery_areas;
DROP POLICY IF EXISTS "delivery_areas_public_read" ON public.delivery_areas;
DROP POLICY IF EXISTS "delivery_settings_auth_all" ON public.delivery_settings;
DROP POLICY IF EXISTS "delivery_settings_authenticated_write" ON public.delivery_settings;
DROP POLICY IF EXISTS "Anyone can view delivery settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "delivery_settings_public_read" ON public.delivery_settings;
DROP POLICY IF EXISTS "pos_tables_auth_all" ON public.pos_tables;
DROP POLICY IF EXISTS "Anyone can view tables" ON public.pos_tables;
DROP POLICY IF EXISTS "pos_tables_public_read" ON public.pos_tables;
DROP POLICY IF EXISTS "reviews_public_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;

DROP POLICY IF EXISTS "sub_packages_auth_all" ON public.subscription_packages;
DROP POLICY IF EXISTS "sub_packages_public_read" ON public.subscription_packages;
DROP POLICY IF EXISTS "subscription_packages_public_read" ON public.subscription_packages;
CREATE POLICY "Enabled subscription plans are public" ON public.subscription_packages FOR SELECT TO anon, authenticated USING (is_enabled = true);
CREATE POLICY "Admins manage subscription plans" ON public.subscription_packages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "package_modules_auth_all" ON public.package_modules;
DROP POLICY IF EXISTS "package_modules_public_read" ON public.package_modules;
CREATE POLICY "Modules of enabled packages are public" ON public.package_modules FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.subscription_packages AS p WHERE p.id = package_id AND p.is_enabled = true));
CREATE POLICY "Admins manage package modules" ON public.package_modules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "package_features_auth_all" ON public.package_features;
DROP POLICY IF EXISTS "package_features_public_read" ON public.package_features;
CREATE POLICY "Features of enabled packages are public" ON public.package_features FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.subscription_packages AS p WHERE p.id = package_id AND p.is_enabled = true));
CREATE POLICY "Admins manage package features" ON public.package_features FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "push_tokens_all" ON public.push_tokens;
ALTER POLICY "Users manage own push tokens (insert)" ON public.push_tokens WITH CHECK (
  auth.uid() = user_id AND (
    (scope = 'admin' AND public.has_role(auth.uid(), 'admin'::public.app_role)) OR
    (scope = 'rider' AND public.has_role(auth.uid(), 'rider'::public.app_role)) OR
    (scope = 'customer' AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) AND NOT public.has_role(auth.uid(), 'rider'::public.app_role))
  )
);
ALTER POLICY "Users manage own push tokens (update)" ON public.push_tokens
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      (scope = 'admin' AND public.has_role(auth.uid(), 'admin'::public.app_role)) OR
      (scope = 'rider' AND public.has_role(auth.uid(), 'rider'::public.app_role)) OR
      (scope = 'customer' AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) AND NOT public.has_role(auth.uid(), 'rider'::public.app_role))
    )
  );

DROP POLICY IF EXISTS "package_orders_auth_delete" ON public.package_orders;
DROP POLICY IF EXISTS "package_orders_auth_update" ON public.package_orders;
DROP POLICY IF EXISTS "package_orders_public_read" ON public.package_orders;
DROP POLICY IF EXISTS "package_orders_public_insert" ON public.package_orders;
CREATE POLICY "Admins view package orders" ON public.package_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Verified buyers view own package orders" ON public.package_orders FOR SELECT TO authenticated USING (public.is_confirmed_auth_email(buyer_email));

DROP POLICY IF EXISTS "package_order_status_history_insert" ON public.package_order_status_history;
DROP POLICY IF EXISTS "package_order_status_history_public_insert" ON public.package_order_status_history;
DROP POLICY IF EXISTS "package_order_status_history_public_read" ON public.package_order_status_history;
DROP POLICY IF EXISTS "package_order_status_history_read" ON public.package_order_status_history;
CREATE POLICY "Admins view package order history" ON public.package_order_status_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Verified buyers view own package order history" ON public.package_order_status_history FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.package_orders AS o WHERE o.id = order_id AND public.is_confirmed_auth_email(o.buyer_email))
);

DROP POLICY IF EXISTS "module_orders_public_read" ON public.module_orders;
DROP POLICY IF EXISTS "module_orders_public_insert" ON public.module_orders;
CREATE POLICY "Admins view module orders" ON public.module_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "module_prices_public_read" ON public.module_prices;
CREATE POLICY "Admins manage module prices" ON public.module_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "orders_customer_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
DROP POLICY IF EXISTS "Users can create own order items" ON public.order_items;

DROP POLICY IF EXISTS "dine_in_orders_auth_all" ON public.dine_in_orders;
DROP POLICY IF EXISTS "dine_in_orders_public_read" ON public.dine_in_orders;
DROP POLICY IF EXISTS "dine_in_orders_public_insert" ON public.dine_in_orders;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;

DROP POLICY IF EXISTS "rider_gps_all" ON public.rider_gps_points;
DROP POLICY IF EXISTS "rider_docs_all" ON public.rider_documents;

DROP POLICY IF EXISTS "Anyone can view settings" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_auth_all" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_public_read" ON public.website_settings;
CREATE POLICY "Admins view website settings" ON public.website_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Allow public read for deals images" ON storage.objects;

CREATE POLICY "Verified buyers view own module orders" ON public.module_orders FOR SELECT TO authenticated USING (public.is_confirmed_auth_email(buyer_email));