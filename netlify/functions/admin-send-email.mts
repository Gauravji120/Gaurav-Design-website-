import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";

const FROM_EMAIL = "Gaurav Design <onboarding@resend.dev>";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SESSION_SECRET = Netlify.env.get("ADMIN_SESSION_SECRET");
  const RESEND_KEY = Netlify.env.get("RESEND_API_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY || !SESSION_SECRET) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }
  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ error: "Email is not configured" }), { status: 500 });
  }

  const session = await verifySession(getBearerToken(req), SESSION_SECRET);
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authorized. Please log in again." }), { status: 401 });
  }

  try {
    const body = await req.json();
    const orderId = body.orderId;
    const message = (body.message || "").trim();

    if (!orderId || !message) {
      return new Response(JSON.stringify({ error: "Missing order or message" }), { status: 400 });
    }

    const orderRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=order_number,client_name,email`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const [order] = orderRes.ok ? await orderRes.json() : [];
    if (!order?.email) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    }

    const html = `<p>Hi ${order.client_name},</p><p>${message.replace(/\n/g, "<br>")}</p><p>— Gaurav Design</p>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: order.email,
        subject: `Update on your order ${order.order_number}`,
        html,
      }),
    });

    const sent = emailRes.ok;

    await fetch(`${SUPABASE_URL}/rest/v1/email_log`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        email_type: "Custom Message",
        sent_to: order.email,
        status: sent ? "Success" : "Failed",
      }),
    }).catch(() => {});

    if (!sent) {
      return new Response(JSON.stringify({ error: "Could not send email" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-send-email error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/admin-send-email",
};
