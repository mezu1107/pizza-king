import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden - admins only" }, 403);

    const body = await req.json();
    const action: string = body.action || "create";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (action === "list") {
      const { data: roles, error } = await admin
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("role", "admin");
      if (error) return json({ error: error.message }, 400);

      const staff = [];
      for (const r of roles || []) {
        const { data: u } = await admin.auth.admin.getUserById(r.user_id);
        if (u?.user) {
          staff.push({
            user_id: r.user_id,
            email: u.user.email,
            full_name: (u.user.user_metadata as Record<string, unknown> | null)?.full_name ?? null,
            last_sign_in_at: u.user.last_sign_in_at ?? null,
            created_at: r.created_at,
          });
        }
      }
      return json({ staff });
    }

    const { email, password, full_name } = body as {
      email?: string;
      password?: string;
      full_name?: string;
    };
    if (!email || !password) return json({ error: "email and password are required" }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

    if (action === "reset_password") {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!existing) return json({ error: "User not found" }, 404);
      const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true, user_id: existing.id, updated: true });
    }

    // create (idempotent: if the account exists, sync password + role)
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;
    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || existing.user_metadata?.full_name || "POS Staff" },
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "POS Staff" },
      });
      if (createErr || !created.user) return json({ error: createErr?.message || "Create failed" }, 400);
      userId = created.user.id;
    }

    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) return json({ error: `Role assign failed: ${roleErr.message}` }, 400);

    await admin
      .from("profiles")
      .upsert({ user_id: userId, full_name: full_name || "POS Staff" }, { onConflict: "user_id" });

    return json({ success: true, user_id: userId, existed: !!existing });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
