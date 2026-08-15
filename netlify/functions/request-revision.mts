import type { Context, Config } from "@netlify/functions";

const FROM_EMAIL = "Going Beyond <onboarding@resend.dev>";

// Client requests a revision on one of their own orders. We verify the
// Supabase access token server-side and confirm the order actually belongs
// to that user before touching anything — never trust the client's orderId
// claim alone.
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_KEY = Netlify.env.get("RESEND_API_KEY");
  const ADMIN_EMAIL = Netlify.env.get("ADMIN_NOTIFY_EMAIL") || "gauravadhikari9289@gmail.com";

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Please log in again." }), { status: 401 });
  }

  try {
    const body = await req.json();
    const orderId = (body.orderId || "").trim();
    const notes = (body.notes || "").trim();

    if (!orderId || !notes) {
      return new Response(JSON.stringify({ error: "Please describe what needs to change." }), {
        status: 400,
      });
    }
    if (notes.length > 1000) {
      return new Response(JSON.stringify({ error: "Please keep the request under 1000 characters." }), {
        status: 400,
      });
    }

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Session expired. Please log in again." }), { status: 401 });
    }
    const user = await userRes.json();

    // Confirm this order actually belongs to the requesting user
    const orderRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&user_id=eq.${user.id}&select=id,order_number,client_name,service`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const [order] = await orderRes.json();
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found." }), { status: 404 });
    }

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ revision_requested: true, revision_notes: notes }),
    });

    if (!patchRes.ok) {
      return new Response(JSON.stringify({ error: "Could not submit your request. Please try again." }), {
        status: 500,
      });
    }

    // Best-effort notification to the admin — order is already saved either way
    if (RESEND_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: ADMIN_EMAIL,
            subject: `Revision requested — ${order.order_number}`,
            html: `<p>${order.client_name} requested a revision on <strong>${order.order_number}</strong> (${order.service}).</p><p><strong>Details:</strong><br>${notes.replace(/\n/g, "<br>")}</p>`,
          }),
        });
      } catch {}
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("request-revision error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/request-revision",
};
