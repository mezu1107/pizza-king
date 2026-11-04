import { supabase } from "@/integrations/supabase/client";

export const POINTS_PER_RUPEE = 0.01; // 1 point per Rs. 100 spent
export const POINT_VALUE_RUPEES = 1; // 1 point = Rs. 1 when redeemed
export const MIN_REDEEM_POINTS = 50;

export const calcEarn = (amount: number): number =>
  Math.floor(amount * POINTS_PER_RUPEE);

export const getBalance = async (userId: string): Promise<number> => {
  const { data } = await supabase
    .from("loyalty_transactions" as any)
    .select("points")
    .eq("user_id", userId);
  if (!data) return 0;
  return (data as any[]).reduce(
    (s, t) => s + (Number(t.points) || 0),
    0
  );
};
