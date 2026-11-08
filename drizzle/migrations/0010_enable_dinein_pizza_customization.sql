CREATE OR REPLACE FUNCTION public.place_dine_in_order(_code text, _name text, _phone text, _notes text, _items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_table public.pos_tables%ROWTYPE;
  v_item jsonb;
  v_item_id text;
  v_title text;
  v_price numeric;
  v_extra numeric;
  v_labels text;
  v_note text;
  v_quantity integer;
  v_lines jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_id uuid;
BEGIN
  SELECT t.* INTO v_table
  FROM public.pos_tables AS t
  WHERE upper(t.code) = upper(_code) AND t.active = true
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid table'; END IF;
  IF nullif(trim(_name), '') IS NULL OR length(trim(_name)) > 80
     OR length(coalesce(_phone, '')) > 20 OR length(coalesce(_notes, '')) > 300
     OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) < 1 OR jsonb_array_length(_items) > 50 THEN
    RAISE EXCEPTION 'Invalid dine-in order details';
  END IF;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(_items) AS input(value) LOOP
    v_item_id := v_item->>'id';
    v_quantity := (v_item->>'quantity')::integer;
    IF v_item_id IS NULL OR v_quantity < 1 OR v_quantity > 50 THEN
      RAISE EXCEPTION 'Invalid menu item or quantity';
    END IF;

    v_price := NULL;
    SELECT f.title, f.price INTO v_title, v_price
    FROM public.foods AS f WHERE f.id::text = v_item_id AND f.active = true;
    IF v_price IS NULL THEN
      SELECT d.title, d.price INTO v_title, v_price
      FROM public.deals AS d WHERE d.id::text = v_item_id AND d.active = true;
    END IF;
    IF v_price IS NULL THEN RAISE EXCEPTION 'A menu item is no longer available'; END IF;

    v_extra := 0;
    v_labels := NULL;
    IF v_item ? 'options' THEN
      IF jsonb_typeof(v_item->'options') <> 'array' OR jsonb_array_length(v_item->'options') > 15 THEN
        RAISE EXCEPTION 'Invalid customization';
      END IF;
      IF EXISTS (
        SELECT 1 FROM pg_catalog.jsonb_array_elements_text(v_item->'options') AS selected(option_key)
        WHERE NOT EXISTS (SELECT 1 FROM public.pizza_option_catalog() AS catalog WHERE catalog.key = selected.option_key)
      ) THEN RAISE EXCEPTION 'Invalid customization'; END IF;
      SELECT coalesce(sum(catalog.price), 0), string_agg(catalog.label, ', ' ORDER BY catalog.sort)
      INTO v_extra, v_labels
      FROM public.pizza_option_catalog() AS catalog
      WHERE catalog.key IN (SELECT selected.option_key FROM pg_catalog.jsonb_array_elements_text(v_item->'options') AS selected(option_key));
      v_price := v_price + v_extra;
      IF v_labels IS NOT NULL THEN v_title := v_title || ' (' || v_labels || ')'; END IF;
    END IF;

    v_note := left(nullif(trim(coalesce(v_item->>'note', '')), ''), 200);
    IF v_note IS NOT NULL THEN v_title := v_title || ' - Note: ' || v_note; END IF;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id', v_item_id, 'title', v_title, 'price', v_price, 'quantity', v_quantity
    ));
    v_total := v_total + v_price * v_quantity;
  END LOOP;

  INSERT INTO public.dine_in_orders(table_id, table_no, table_name, customer_name, customer_phone, notes, items, total)
  VALUES (v_table.id, v_table.table_no, v_table.name, left(trim(_name), 80), left(coalesce(_phone, ''), 20), left(coalesce(_notes, ''), 300), v_lines, v_total)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_table_service(_code text, _type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_table public.pos_tables%ROWTYPE;
BEGIN
  IF _type NOT IN ('call_waiter', 'request_bill', 'water_napkins') THEN RAISE EXCEPTION 'Invalid request'; END IF;
  SELECT t.* INTO v_table FROM public.pos_tables AS t WHERE upper(t.code) = upper(_code) AND t.active = true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'This table QR code is not valid'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.table_service_requests AS r
    WHERE r.table_id = v_table.id AND r.request_type = _type AND r.status = 'pending'
      AND r.created_at > now() - interval '1 minute'
  ) THEN RAISE EXCEPTION 'Staff already notified, please wait a moment'; END IF;
  INSERT INTO public.table_service_requests(table_id, table_no, table_name, request_type)
  VALUES (v_table.id, v_table.table_no, v_table.name, _type);
END;
$function$;