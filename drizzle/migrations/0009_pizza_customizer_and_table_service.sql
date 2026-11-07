CREATE OR REPLACE FUNCTION public.pizza_option_catalog()
RETURNS TABLE(key text, label text, price numeric, sort integer)
LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $$
  VALUES
    ('crust:pan','Pan Crust',0::numeric,1),
    ('crust:thin','Thin & Crispy',50::numeric,2),
    ('crust:stuffed','Stuffed Crust',250::numeric,3),
    ('crust:crown','Crown Crust',300::numeric,4),
    ('top:cheese','Extra Cheese',150::numeric,10),
    ('top:chicken','Extra Chicken',180::numeric,11),
    ('top:mushroom','Mushrooms',100::numeric,12),
    ('top:jalapeno','Jalapenos',80::numeric,13),
    ('top:olives','Olives',80::numeric,14),
    ('top:onion','Onions',50::numeric,15),
    ('dip:garlic','Garlic Mayo Dip',60::numeric,20),
    ('dip:ranch','Ranch Dip',70::numeric,21),
    ('dip:mustard','Honey Mustard Dip',70::numeric,22)
$$;
GRANT EXECUTE ON FUNCTION public.pizza_option_catalog() TO anon, authenticated;

CREATE TABLE public.table_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES public.pos_tables(id) ON DELETE CASCADE,
  table_no integer NOT NULL,
  table_name text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('call_waiter','request_bill','water_napkins')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','attended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  attended_at timestamptz
);
GRANT SELECT, UPDATE, DELETE ON public.table_service_requests TO authenticated;
GRANT ALL ON public.table_service_requests TO service_role;
ALTER TABLE public.table_service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view service requests" ON public.table_service_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role));
CREATE POLICY "Staff can update service requests" ON public.table_service_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role));
CREATE POLICY "Admins can delete service requests" ON public.table_service_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_service_requests;

CREATE OR REPLACE FUNCTION public.request_table_service(_code text, _type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_table public.pos_tables%ROWTYPE;
BEGIN
  IF _type NOT IN ('call_waiter','request_bill','water_napkins') THEN RAISE EXCEPTION 'Invalid request'; END IF;
  SELECT * INTO v_table FROM public.pos_tables AS t WHERE t.code = _code AND t.active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'This table QR code is not valid'; END IF;
  IF EXISTS (SELECT 1 FROM public.table_service_requests AS r WHERE r.table_id = v_table.id
             AND r.request_type = _type AND r.status = 'pending' AND r.created_at > now() - interval '1 minute') THEN
    RAISE EXCEPTION 'Staff already notified, please wait a moment';
  END IF;
  INSERT INTO public.table_service_requests(table_id, table_no, table_name, request_type)
  VALUES (v_table.id, v_table.table_no, v_table.name, _type);
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_table_service(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.place_customer_order(p_items jsonb, p_customer_name text, p_customer_phone text, p_customer_address text, p_delivery_lat numeric, p_delivery_lng numeric, p_coupon_code text, p_points_redeemed integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_food_id text;
  v_order_food_id uuid;
  v_title text;
  v_price numeric;
  v_quantity integer;
  v_extra numeric;
  v_labels text;
  v_note text;
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
    v_order_food_id := NULL;
    SELECT f.id, f.title, f.price INTO v_order_food_id, v_title, v_price FROM public.foods AS f
      WHERE f.id::text = v_food_id AND f.active = true;
    IF v_price IS NULL THEN
      SELECT d.title, d.price INTO v_title, v_price FROM public.deals AS d
        WHERE d.id::text = v_food_id AND d.active = true;
    END IF;
    IF v_price IS NULL THEN RAISE EXCEPTION 'A menu item is no longer available'; END IF;
    IF v_item ? 'options' THEN
      IF jsonb_typeof(v_item->'options') <> 'array' OR jsonb_array_length(v_item->'options') > 15 THEN
        RAISE EXCEPTION 'Invalid customization';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements_text(v_item->'options') AS o(k)
                 WHERE NOT EXISTS (SELECT 1 FROM public.pizza_option_catalog() AS c WHERE c.key = o.k)) THEN
        RAISE EXCEPTION 'Invalid customization';
      END IF;
      SELECT coalesce(sum(c.price), 0), string_agg(c.label, ', ' ORDER BY c.sort)
        INTO v_extra, v_labels
        FROM public.pizza_option_catalog() AS c
        WHERE c.key IN (SELECT o.k FROM pg_catalog.jsonb_array_elements_text(v_item->'options') AS o(k));
      v_price := v_price + v_extra;
      IF v_labels IS NOT NULL THEN v_title := v_title || ' (' || v_labels || ')'; END IF;
    END IF;
    v_note := left(nullif(trim(coalesce(v_item->>'note', '')), ''), 200);
    IF v_note IS NOT NULL THEN v_title := v_title || ' - Note: ' || v_note; END IF;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id', v_food_id, 'food_id', v_order_food_id, 'title', v_title, 'price', v_price, 'quantity', v_quantity
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
  SELECT v_order_id, nullif(x->>'food_id', '')::uuid, x->>'title', (x->>'quantity')::integer, (x->>'price')::numeric
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
$function$;