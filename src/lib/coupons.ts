import { supabase } from "@/integrations/supabase/client";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "flat";
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
}

export interface AppliedCoupon {
  coupon: Coupon;
  discount: number;
}

export const validateCoupon = async (
  code: string,
  subtotal: number
): Promise<{ ok: true; data: AppliedCoupon } | { ok: false; error: string }> => {
  if (!code.trim()) return { ok: false, error: "Enter a coupon code" };
  const { data, error } = await supabase
    .from("coupons" as any)
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Invalid coupon code" };
  const c = data as unknown as Coupon;

  if (c.expires_at && new Date(c.expires_at) < new Date())
    return { ok: false, error: "This coupon has expired" };
  if (c.usage_limit !== null && c.used_count >= c.usage_limit)
    return { ok: false, error: "This coupon has reached its usage limit" };
  if (subtotal < c.min_order_amount)
    return {
      ok: false,
      error: `Minimum order Rs. ${c.min_order_amount.toLocaleString()} required`,
    };

  let discount =
    c.discount_type === "percent"
      ? (subtotal * c.discount_value) / 100
      : c.discount_value;
  if (c.max_discount !== null && discount > c.max_discount)
    discount = c.max_discount;
  discount = Math.min(discount, subtotal);
  discount = Math.round(discount);

  return { ok: true, data: { coupon: c, discount } };
};
