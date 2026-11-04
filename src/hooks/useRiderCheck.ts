import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useRiderCheck() {
  const { user, loading: authLoading } = useAuth();
  const [isRider, setIsRider] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsRider(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "rider")
        .maybeSingle();

      setIsRider(!!data);
      setLoading(false);
    };
    check();
  }, [user, authLoading]);

  return { isRider, loading, user };
}
