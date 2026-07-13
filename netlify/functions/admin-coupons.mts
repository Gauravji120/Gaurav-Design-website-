import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";

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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/coupons?select=*&order=created_at.desc`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Could not load coupons" }), { status: 500 });
    }
    const coupons = await res.json();
    return new Response(JSON.stringify({ success: true, coupons }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const code = (body.code || "").trim().toUpperCase();
      const discountPercent = Number(body.discount_percent);
      const usageLimit = body.usage_limit ? Number(body.usage_limit) : null;
      const expiryDate = body.expiry_date || null;

      if (!code || !discountPercent || discountPercent <= 0 || discountPercent > 100) {
        return new Response(
          JSON.stringify({ error: "Enter a valid code and a discount between 1-100%." }),
          { status: 400 }
        );
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/coupons`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          code,
          discount_percent: discountPercent,
          usage_limit: usageLimit,
          expiry_date: expiryDate,
          active: true,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        const message = errText.includes("duplicate") ? "This coupon code already exists." : "Could not create coupon.";
        return new Response(JSON.stringify({ error: message }), { status: 400 });
      }

      const [coupon] = await res.json();
      return new Response(JSON.stringify({ success: true, coupon }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("admin-coupons POST error:", err);
      return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
    }
  }

  if (req.method === "PATCH") {
    try {
      const body = await req.json();
      const { id, active } = body;
      if (!id || typeof active !== "boolean") {
        return new Response(JSON.stringify({ error: "Missing id or active flag" }), { status: 400 });
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/coupons?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active }),
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Could not update coupon" }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("admin-coupons PATCH error:", err);
      return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};

export const config: Config = {
  path: "/api/admin-coupons",
};
