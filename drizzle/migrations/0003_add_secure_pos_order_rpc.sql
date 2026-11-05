CREATE OR REPLACE FUNCTION public.place_pos_order(
  p_items jsonb,
  p_order_type text,
  p_payment_method text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_table_no text,
  p_discount_amount numeric,
  p_delivery_charges numeric,
  p_amount_paid numeric,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item jsonb;
  v_food_id uuid;
  v_title text;
  v_price numeric;
  v_quantity integer;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_discount numeric := coalesce(p_discount_amount, 0);
  v_delivery numeric := coalesce(p_delivery_charges, 0);
  v_total numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF p_order_type NOT IN ('takeaway', 'dine_in', 'delivery')
     OR p_payment_method NOT IN ('cash', 'card', 'online')
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50
     OR v_discount < 0 OR v_delivery < 0 OR coalesce(p_amount_paid, 0) < 0
     OR v_discount > 1000000 OR v_delivery > 100000 OR coalesce(p_amount_paid, 0) > 10000000
     OR length(coalesce(p_customer_name, '')) > 120
     OR length(coalesce(p_customer_phone, '')) > 40
     OR length(coalesce(p_customer_address, '')) > 500
     OR length(coalesce(p_table_no, '')) > 40
     OR length(coalesce(p_notes, '')) > 500 THEN
    RAISE EXCEPTION 'Invalid point-of-sale order details';
  END IF;
  IF p_order_type = 'delivery' AND nullif(trim(coalesce(p_customer_address, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;
  IF p_order_type <> 'delivery' AND v_delivery <> 0 THEN
    RAISE EXCEPTION 'Delivery charges only apply to delivery orders';
  END IF;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_items) AS x(value) LOOP
    BEGIN
      v_food_id := (v_item->>'id')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid menu item';
    END;
    IF v_quantity < 1 OR v_quantity > 50 THEN RAISE EXCEPTION 'Invalid item quantity'; END IF;
    SELECT f.title, f.price INTO v_title, v_price
      FROM public.foods AS f WHERE f.id = v_food_id AND f.active = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A menu item is unavailable'; END IF;
    IF EXISTS (SELECT 1 FROM public.foods AS f WHERE f.id = v_food_id AND f.stock IS NOT NULL AND f.stock < v_quantity) THEN
      RAISE EXCEPTION 'Not enough stock for %', v_title;
    END IF;
    UPDATE public.foods AS f SET stock = f.stock - v_quantity
      WHERE f.id = v_food_id AND f.stock IS NOT NULL;
    v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'id', v_food_id, 'title', v_title, 'price', v_price, 'quantity', v_quantity
    ));
    v_subtotal := v_subtotal + v_price * v_quantity;
  END LOOP;

  IF v_discount > v_subtotal THEN RAISE EXCEPTION 'Discount cannot exceed the subtotal'; END IF;
  v_total := greatest(0, v_subtotal - v_discount + v_delivery);
  INSERT INTO public.orders (
    user_id, total, subtotal, status, customer_name, customer_phone, customer_address,
    discount_amount, points_earned, points_redeemed, delivery_charges, source,
    payment_method, amount_paid, order_type, table_no, notes
  ) VALUES (
    auth.uid(), v_total, v_subtotal, CASE WHEN p_order_type = 'delivery' THEN 'pending' ELSE 'delivered' END,
    coalesce(nullif(trim(p_customer_name), ''), 'Walk-in Customer'),
    nullif(trim(p_customer_phone), ''), nullif(trim(p_customer_address), ''),
    v_discount, 0, 0, v_delivery, 'pos', p_payment_method,
    coalesce(nullif(p_amount_paid, 0), v_total), p_order_type, nullif(trim(p_table_no), ''),
    nullif(trim(p_notes), '')
  ) RETURNING * INTO v_order;

  INSERT INTO public.order_items(order_id, food_id, title, quantity, price)
  SELECT v_order.id, (x->>'id')::uuid, x->>'title', (x->>'quantity')::integer, (x->>'price')::numeric
  FROM pg_catalog.jsonb_array_elements(v_items) AS q(x);

  RETURN pg_catalog.jsonb_build_object('order', pg_catalog.to_jsonb(v_order), 'items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.place_pos_order(jsonb,text,text,text,text,text,text,numeric,numeric,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_pos_order(jsonb,text,text,text,text,text,text,numeric,numeric,numeric,text) TO authenticated;