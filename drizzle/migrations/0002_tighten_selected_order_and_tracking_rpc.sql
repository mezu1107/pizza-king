ALTER TABLE public.dine_in_orders ADD COLUMN IF NOT EXISTS tracking_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');
CREATE UNIQUE INDEX IF NOT EXISTS dine_in_orders_tracking_token_uidx ON public.dine_in_orders(tracking_token);

CREATE OR REPLACE FUNCTION public.get_package_order_by_token(p_order_token text)
RETURNS TABLE(
  id uuid, order_token text, package_id uuid, package_name text, plan_key text, category text,
  billing_type text, amount integer, buyer_name text, buyer_email text, buyer_phone text,
  txn_id text, screenshot_data_url text, status text, admin_remarks text,
  subscription_start date, subscription_end date, custom_modules text[], created_at timestamptz,
  updated_at timestamptz, package_order_status_history jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT o.id, o.order_token, o.package_id, o.package_name, o.plan_key, o.category,
         o.billing_type, o.amount, NULL::text, NULL::text, NULL::text,
         NULL::text, NULL::text, o.status, NULL::text,
         o.subscription_start, o.subscription_end, NULL::text[], o.created_at, o.updated_at,
         coalesce((
           SELECT jsonb_agg(jsonb_build_object(
             'status', h.status, 'note', NULL, 'created_by', NULL, 'created_at', h.created_at
           ) ORDER BY h.created_at)
           FROM public.package_order_status_history AS h WHERE h.order_id = o.id
         ), '[]'::jsonb)
  FROM public.package_orders AS o
  WHERE length(p_order_token) BETWEEN 32 AND 80 AND o.order_token = p_order_token;
$$;

CREATE OR REPLACE FUNCTION public.get_module_order_by_token(p_order_token text)
RETURNS TABLE(
  id uuid, order_token text, module_key text, module_name text, plan_type text, amount integer,
  buyer_name text, buyer_email text, buyer_phone text, txn_id text, screenshot_data_url text,
  screenshot_url text, status text, submitted_at timestamptz, approved_at timestamptz, notes text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT o.id, o.order_token, o.module_key, o.module_name, o.plan_type, o.amount,
         NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
         NULL::text, o.status, o.submitted_at, o.approved_at, NULL::text
  FROM public.module_orders AS o
  WHERE length(p_order_token) BETWEEN 32 AND 80 AND o.order_token = p_order_token;
$$;

CREATE OR REPLACE FUNCTION public.grant_package_order(
  p_plan_key text, p_package_name text, p_category text, p_billing_type text, p_amount integer,
  p_buyer_name text, p_buyer_email text, p_buyer_phone text, p_status text, p_custom_modules text[],
  p_subscription_start date, p_subscription_end date, p_admin_remarks text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_plan_key IS NULL OR length(trim(p_plan_key)) NOT BETWEEN 1 AND 100
     OR p_package_name IS NULL OR length(trim(p_package_name)) NOT BETWEEN 1 AND 160
     OR p_category NOT IN ('admin','rider') OR p_billing_type NOT IN ('monthly','one_time')
     OR p_amount < 0 OR nullif(trim(p_buyer_name),'') IS NULL OR length(trim(p_buyer_name)) > 120
     OR nullif(trim(p_buyer_email),'') IS NULL OR length(trim(p_buyer_email)) > 254
     OR length(coalesce(p_buyer_phone,'')) > 40
     OR p_status NOT IN ('pending','approved','active','rejected','expired','cancelled','blocked') THEN
    RAISE EXCEPTION 'Invalid subscription grant details';
  END IF;
  INSERT INTO public.package_orders (
    plan_key, package_name, category, billing_type, amount, buyer_name, buyer_email, buyer_phone,
    txn_id, status, custom_modules, subscription_start, subscription_end, admin_remarks
  ) VALUES (
    trim(p_plan_key), trim(p_package_name), p_category, p_billing_type, p_amount, trim(p_buyer_name),
    lower(trim(p_buyer_email)), trim(coalesce(p_buyer_phone,'')), 'GRANT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    p_status, p_custom_modules, p_subscription_start, p_subscription_end, p_admin_remarks
  ) RETURNING id INTO v_id;
  INSERT INTO public.package_order_status_history(order_id,status,note,created_by)
  VALUES (v_id,p_status,coalesce(p_admin_remarks,'Granted directly by admin'),'admin');
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.place_dine_in_order_with_token(_code text, _name text, _phone text, _notes text, _items jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid; v_token text;
BEGIN
  v_id := public.place_dine_in_order(_code, _name, _phone, _notes, _items);
  SELECT d.tracking_token INTO v_token FROM public.dine_in_orders AS d WHERE d.id = v_id;
  RETURN jsonb_build_object('id',v_id,'tracking_token',v_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.place_staff_dine_in_order(_table_id uuid, _name text, _phone text, _notes text, _items jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_table public.pos_tables%ROWTYPE; v_id uuid; v_token text; v_item jsonb; v_lines jsonb := '[]'::jsonb; v_total numeric := 0; v_price numeric; v_title text; v_quantity integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO v_table FROM public.pos_tables AS t WHERE t.id = _table_id AND t.active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Table is unavailable'; END IF;
  IF nullif(trim(_name),'') IS NULL OR length(trim(_name)) > 120 OR length(coalesce(_phone,'')) > 40 OR length(coalesce(_notes,'')) > 300
     OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) < 1 OR jsonb_array_length(_items) > 50 THEN
    RAISE EXCEPTION 'Invalid dine-in order details';
  END IF;
  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(_items) AS x(value) LOOP
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity < 1 OR v_quantity > 50 THEN RAISE EXCEPTION 'Invalid item quantity'; END IF;
    v_price := NULL;
    SELECT f.title, f.price INTO v_title, v_price FROM public.foods AS f WHERE f.id::text = v_item->>'id' AND f.active = true;
    IF v_price IS NULL THEN SELECT d.title, d.price INTO v_title, v_price FROM public.deals AS d WHERE d.id::text = v_item->>'id' AND d.active = true; END IF;
    IF v_price IS NULL THEN RAISE EXCEPTION 'A menu item is unavailable'; END IF;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('id',v_item->>'id','title',v_title,'price',v_price,'quantity',v_quantity));
    v_total := v_total + v_price * v_quantity;
  END LOOP;
  INSERT INTO public.dine_in_orders(table_id,table_no,table_name,customer_name,customer_phone,notes,items,total,placed_by,status)
  VALUES(v_table.id,v_table.table_no,v_table.name,trim(_name),nullif(trim(_phone),''),nullif(trim(_notes),''),v_lines,v_total,'staff','accepted')
  RETURNING id,tracking_token INTO v_id,v_token;
  RETURN jsonb_build_object('id',v_id,'tracking_token',v_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dine_in_order_by_token(_tracking_token text)
RETURNS TABLE(id uuid, table_no integer, table_name text, customer_name text, items jsonb, total numeric, status text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT d.id,d.table_no,d.table_name,d.customer_name,d.items,d.total,d.status,d.created_at,d.updated_at
  FROM public.dine_in_orders AS d
  WHERE length(_tracking_token)=32 AND d.tracking_token=_tracking_token;
$$;

REVOKE EXECUTE ON FUNCTION public.get_dine_in_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_dine_in_order_with_token(text,text,text,text,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_staff_dine_in_order(uuid,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dine_in_order_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_package_order(text,text,text,text,integer,text,text,text,text,text[],date,date,text) TO authenticated;

ALTER FUNCTION public.disable_package(text,text) SET search_path = '';
ALTER FUNCTION public.upsert_package(text,text,text,text,integer,text,integer,integer,boolean,boolean) SET search_path = '';
ALTER FUNCTION public.update_order_status(text,uuid,text) SET search_path = '';
ALTER FUNCTION public.upsert_module_price(text,text,text,text,integer,integer) SET search_path = '';
ALTER FUNCTION public.update_package_order(text,uuid,text,text,integer,text,text,text,text,date,date,text) SET search_path = '';
ALTER FUNCTION public.update_package_order(text,uuid,text,text,integer,text,text,text,text,date,date,text,text,text,text[]) SET search_path = '';
ALTER FUNCTION public.update_package_order_status(text,uuid,text,text) SET search_path = '';
ALTER FUNCTION public.set_package_features(text,text,text[]) SET search_path = '';
ALTER FUNCTION public.set_package_modules(text,text,text[]) SET search_path = '';
