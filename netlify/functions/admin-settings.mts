import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";

const ALLOWED_FIELDS = [
  "price_poster",
  "price_thumbnail",
  "price_packaging",
  "price_book",
  "offer_text",
  "offer_active",
  "upi_id",
  "instagram_url",
  "pinterest_url",
  "whatsapp_number",
];

export default async (req: Request, context: Context) => {
  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SESSION_SECRET = Netlify.env.get("ADMIN_SESSION_SECRET");

  if (!SUPABASE_URL || !SERVICE_KEY || !SESSION_SECRET) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const session = await verifySession(getBearerToken(req), SESSION_SECRET);
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authorized. Please log in again." }), { status: 401 });
  }

  if (req.method === "GET") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?id=eq.1&select=*`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Could not load settings" }), { status: 500 });
    }
    const [settings] = await res.json();
    return new Response(JSON.stringify({ success: true, settings }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "PATCH") {
    try {
      const body = await req.json();
      const update: Record<string, unknown> = {};
      for (const key of ALLOWED_FIELDS) {
        if (key in body) update[key] = body[key];
      }
      if (Object.keys(update).length === 0) {
        return new Response(JSON.stringify({ error: "Nothing to update" }), { status: 400 });
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?id=eq.1`, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(update),
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Could not save settings" }), { status: 500 });
      }

      const [settings] = await res.json();
      return new Response(JSON.stringify({ success: true, settings }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("admin-settings PATCH error:", err);
      return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};

export const config: Config = {
  path: "/api/admin-settings",
};
