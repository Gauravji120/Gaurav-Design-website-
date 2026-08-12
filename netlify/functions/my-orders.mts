import type { Context, Config } from "@netlify/functions";

// Returns the logged-in client's own orders. The frontend sends the Supabase
// access token it got after login (Authorization: Bearer <token>) — we verify
// that token server-side against Supabase Auth, then look up orders using the
// service role key. The public site never queries the orders table directly;
// this keeps that same rule true for logged-in clients too.
export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Not logged in." }), { status: 401 });
  }

  try {
    // Verify the token and get the real user id — never trust a user_id sent from the browser.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Session expired. Please log in again." }), {
        status: 401,
      });
    }

    const user = await userRes.json();
    const userId = user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Session expired. Please log in again." }), {
        status: 401,
      });
    }

    const query = new URLSearchParams({
      user_id: `eq.${userId}`,
      select:
        "order_number,service,size,deadline,status,payment_status,quantity,total_price,created_at",
      order: "created_at.desc",
    });

    const ordersRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?${query.toString()}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });

    if (!ordersRes.ok) {
      console.error("my-orders lookup failed:", await ordersRes.text());
      return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
        status: 500,
      });
    }

    const orders = await ordersRes.json();
    return new Response(JSON.stringify({ success: true, orders }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("my-orders error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
    });
  }
};

export const config: Config = {
  path: "/api/my-orders",
};
