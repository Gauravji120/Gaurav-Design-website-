import type { Context, Config } from "@netlify/functions";

// This endpoint is intentionally public and read-only — it only ever returns
// non-sensitive display data (prices, offer text, UPI ID, QR image URL).
// Writing to site_settings still requires the admin session (Admin Dashboard).
export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?id=eq.1&select=price_poster,price_thumbnail,price_packaging,price_book,offer_text,offer_active,upi_id,upi_qr_url,instagram_url,instagram_qr_url,pinterest_url,whatsapp_number`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Could not load settings" }), { status: 500 });
    }

    const [settings] = await res.json();

    return new Response(JSON.stringify({ success: true, settings }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60", // short cache so admin changes show up quickly
      },
    });
  } catch (err) {
    console.error("get-site-settings error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/site-settings",
};
