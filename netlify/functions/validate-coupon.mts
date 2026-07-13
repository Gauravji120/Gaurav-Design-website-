import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  try {
    const body = await req.json();
    const code = (body.code || "").trim().toUpperCase();

    if (!code) {
      return new Response(JSON.stringify({ error: "Enter a coupon code." }), { status: 400 });
    }

    const query = new URLSearchParams({
      code: `eq.${code}`,
      select: "code,discount_percent,usage_limit,times_used,expiry_date,active",
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/coupons?${query.toString()}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Could not check this coupon. Try again." }), {
        status: 500,
      });
    }

    const rows = await res.json();
    const coupon = rows[0];

    if (!coupon || !coupon.active) {
      return new Response(JSON.stringify({ error: "Invalid or inactive coupon code." }), {
        status: 404,
      });
    }

    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return new Response(JSON.stringify({ error: "This coupon has expired." }), { status: 400 });
    }

    if (coupon.usage_limit != null && coupon.times_used >= coupon.usage_limit) {
      return new Response(
        JSON.stringify({ error: "This coupon has reached its usage limit." }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        code: coupon.code,
        discountPercent: coupon.discount_percent,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("validate-coupon error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
    });
  }
};

export const config: Config = {
  path: "/api/validate-coupon",
};
