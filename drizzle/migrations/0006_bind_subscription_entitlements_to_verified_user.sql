CREATE OR REPLACE FUNCTION public.get_my_subscription_entitlements()
RETURNS TABLE(
  id uuid,
  plan_key text,
  package_name text,
  category text,
  billing_type text,
  status text,
  subscription_start date,
  subscription_end date,
  custom_modules text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.id, o.plan_key, o.package_name, o.category, o.billing_type,
         o.status, o.subscription_start, o.subscription_end, o.custom_modules
  FROM auth.users AS u
  JOIN public.package_orders AS o ON lower(o.buyer_email) = lower(u.email)
  WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL
    AND o.status IN ('approved', 'active')
    AND (o.subscription_start IS NULL OR o.subscription_start <= current_date)
    AND (o.subscription_end IS NULL OR o.subscription_end >= current_date);
$$;

REVOKE ALL ON FUNCTION public.get_my_subscription_entitlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_subscription_entitlements() TO authenticated;