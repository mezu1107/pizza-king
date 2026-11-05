import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestBody = await req.json().catch(() => null);
    const rawMessages = requestBody?.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length < 1 || rawMessages.length > 20) {
      return new Response(JSON.stringify({ error: "Invalid conversation" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const messages = rawMessages.map((message: unknown) => {
      if (!message || typeof message !== "object") throw new Error("Invalid message");
      const { role, content } = message as { role?: unknown; content?: unknown };
      if ((role !== "user" && role !== "assistant") || typeof content !== "string"
          || !content.trim() || content.length > 2000) throw new Error("Invalid message");
      return { role, content: content.trim() };
    });
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch menu from DB for AI context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- AUTH: require a signed-in caller to prevent AI credit abuse ---
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await authClient.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);


    const { data: foods } = await supabase.from("foods").select("title, price, description, category_id, badge").eq("active", true);
    const { data: categories } = await supabase.from("categories").select("id, title").eq("active", true);
    const { data: deals } = await supabase.from("deals").select("title, price, description, discount_text").eq("active", true);

    const catMap = Object.fromEntries((categories || []).map((c: any) => [c.id, c.title]));
    const menuText = (foods || []).map((f: any) => `${f.title} - Rs.${f.price} (${catMap[f.category_id] || 'Other'})${f.badge ? ` [${f.badge}]` : ''}`).join('\n');
    const dealsText = (deals || []).map((d: any) => `${d.title} - Rs.${d.price} - ${d.description}`).join('\n');

    const systemPrompt = `You are the AI ordering assistant for Pizza King, a fast food restaurant in Mankiala, Rawalpindi (burgers, pizza, sandwiches, wraps, rolls, fried chicken, fries and drinks).
You help customers order food via natural language in English AND Urdu (Roman Urdu).
You are friendly, helpful, and always try to upsell (suggest drinks, sides, deals).

COMPLETE MENU:
${menuText}

DEALS & COMBOS:
${dealsText}

RULES:
1. When user mentions food items, identify them from the menu and list with prices
2. Always calculate the total
3. Suggest complementary items (cold drinks with burgers, fries with pizza, extra sauce, family deals)
4. If user says something like "mujhe 2 burger chahiye" understand it as ordering
5. Format orders clearly with item name, quantity, and price
6. If item not on menu, politely say it's not available and suggest alternatives
7. Be conversational and warm - use emojis sparingly
8. When order is confirmed, format it as:
   ORDER_CONFIRMED:
   - Item x Qty = Rs.Price
   Total: Rs.XXX
9. Always respond in the same language the user writes in
10. For Urdu queries, respond in Roman Urdu
11. Keep responses concise but helpful`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
