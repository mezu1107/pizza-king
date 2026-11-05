CREATE OR REPLACE FUNCTION public.delete_package_order(p_secret text, p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  DELETE FROM public.package_orders WHERE id = p_order_id;
END;
$$;