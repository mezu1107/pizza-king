CREATE OR REPLACE FUNCTION public.admin_has_paid_module(p_module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM auth.users AS u
      JOIN public.package_orders AS o ON lower(o.buyer_email) = lower(u.email)
      WHERE u.id = auth.uid()
        AND u.email_confirmed_at IS NOT NULL
        AND o.category = 'admin'
        AND o.status IN ('approved', 'active')
        AND (o.subscription_start IS NULL OR o.subscription_start <= current_date)
        AND (o.subscription_end IS NULL OR o.subscription_end >= current_date)
        AND (
          coalesce(o.custom_modules, ARRAY[]::text[]) @> ARRAY[p_module_key]
          OR EXISTS (
            SELECT 1
            FROM public.package_modules AS pm
            JOIN public.subscription_packages AS sp ON sp.id = pm.package_id
            WHERE sp.plan_key = o.plan_key AND pm.module_key = p_module_key
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.admin_has_paid_module(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_has_paid_module(text) TO authenticated;

DROP POLICY IF EXISTS "Admins can view all deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can update deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can delete deals" ON public.deals;
CREATE POLICY "Admins can view all deals" ON public.deals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_has_paid_module('/admin/deals'));
CREATE POLICY "Admins can insert deals" ON public.deals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_has_paid_module('/admin/deals'));
CREATE POLICY "Admins can update deals" ON public.deals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_has_paid_module('/admin/deals'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_has_paid_module('/admin/deals'));
CREATE POLICY "Admins can delete deals" ON public.deals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_has_paid_module('/admin/deals'));