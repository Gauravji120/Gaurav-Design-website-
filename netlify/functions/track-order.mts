import type { Context, Config } from "@netlify/functions";

function isValidPhone(phone: string): boolean {
  const cleaned = phone.trim().replace(/^\+91[\s-]?/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

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
    const orderNumber = (body.orderNumber || "").trim().toUpperCase();
    const phone = (body.phone || "").trim();

    if (!orderNumber || !isValidPhone(phone)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid Order ID and phone number." }),
        { status: 400 }
      );
    }

    const cleanedPhone = phone.replace(/^\+91[\s-]?/, "");

    // Require BOTH order number AND matching phone — prevents strangers from
    // looking up an order just by guessing/knowing the Order ID alone.
    const query = new URLSearchParams({
      order_number: `eq.${orderNumber}`,
      phone: `eq.${cleanedPhone}`,
      select: "order_number,service,status,payment_status,created_at,deadline,coupon_code,discount_percent",
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${query.toString()}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });

    if (!res.ok) {
      console.error("Supabase lookup failed:", await res.text());
      return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
        status: 500,
      });
    }

    const rows = await res.json();
    if (!rows.length) {
      // Same generic message whether the order doesn't exist or the phone doesn't match —
      // avoids revealing which part was wrong.
      return new Response(
        JSON.stringify({ error: "No matching order found. Check your Order ID and phone number." }),
        { status: 404 }
      );
    }

    return new Response(JSON.stringify({ success: true, order: rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("track-order error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
    });
  }
};

export const config: Config = {
  path: "/api/track-order",
};
