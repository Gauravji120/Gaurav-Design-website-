import type { Context, Config } from "@netlify/functions";

// Public and read-only. Only returns non-sensitive fields (order number,
// service, quantity, total, payment status) — never name/phone/email/details.
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
    const url = new URL(req.url);
    const orderNumber = (url.searchParams.get("order") || "").trim().toUpperCase();

    if (!orderNumber) {
      return new Response(JSON.stringify({ error: "Order ID required" }), { status: 400 });
    }

    const query = new URLSearchParams({
      order_number: `eq.${orderNumber}`,
      select: "order_number,service,quantity,total_price,payment_status",
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${query.toString()}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Could not look up order" }), { status: 500 });
    }

    const rows = await res.json();
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, order: rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-order-total error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/order-total",
};
