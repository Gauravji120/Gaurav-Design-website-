import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";

const FROM_EMAIL = "Going Beyond <onboarding@resend.dev>";

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function logEmail(supabaseUrl: string, serviceKey: string, orderId: string, emailType: string, sentTo: string, status: "Success" | "Failed") {
  try {
    await fetch(`${supabaseUrl}/rest/v1/email_log`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, email_type: emailType, sent_to: sentTo, status }),
    });
  } catch {}
}

export default async (req: Request, context: Context) => {
  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SESSION_SECRET = Netlify.env.get("ADMIN_SESSION_SECRET");
  const RESEND_KEY = Netlify.env.get("RESEND_API_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY || !SESSION_SECRET) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const session = await verifySession(getBearerToken(req), SESSION_SECRET);
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authorized. Please log in again." }), { status: 401 });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const search = (url.searchParams.get("q") || "").trim();

    let query = `select=*&order=created_at.desc&limit=200`;
    if (search) {
      const escaped = search.replace(/[,()]/g, "");
      query += `&or=(order_number.ilike.*${escaped}*,client_name.ilike.*${escaped}*,phone.ilike.*${escaped}*)`;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${query}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Could not load orders" }), { status: 500 });
    }
    const orders = await res.json();

    // The reference-files bucket is private (by design — client uploads shouldn't be
    // publicly guessable). For each order that has a file, generate a short-lived
    // signed URL so the admin can actually open it. Valid for 1 hour.
    await Promise.all(
      orders.map(async (order: any) => {
        if (order.reference_file_url) {
          try {
            const signRes = await fetch(
              `${SUPABASE_URL}/storage/v1/object/sign/reference-files/${order.reference_file_url}`,
              {
                method: "POST",
                headers: {
                  apikey: SERVICE_KEY,
                  Authorization: `Bearer ${SERVICE_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ expiresIn: 3600 }),
              }
            );
            if (signRes.ok) {
              const { signedURL } = await signRes.json();
              order.reference_file_signed_url = `${SUPABASE_URL}/storage/v1${signedURL}`;
            }
          } catch {
            // If signing fails, the admin just won't see a link for this one order
          }
        }
      })
    );

    return new Response(JSON.stringify({ success: true, orders }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "PATCH") {
    try {
      const body = await req.json();
      const { id, status, payment_status } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing order id" }), { status: 400 });
      }

      const update: Record<string, string> = {};
      if (status) update.status = status;
      if (payment_status) update.payment_status = payment_status;
      if (Object.keys(update).length === 0) {
        return new Response(JSON.stringify({ error: "Nothing to update" }), { status: 400 });
      }

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(update),
      });

      if (!patchRes.ok) {
        return new Response(JSON.stringify({ error: "Could not update order" }), { status: 500 });
      }

      const [order] = await patchRes.json();

      // Send a status-change email to the client, if this update included a status change
      if (status && RESEND_KEY && order?.email) {
        const templates: Record<string, { subject: string; html: string }> = {
          "Order Confirmed": {
            subject: `Order ${order.order_number} confirmed — work starts soon`,
            html: `<p>Hi ${order.client_name},</p><p>Your order has been confirmed and is next in line for design work.</p><p><strong>Order ID:</strong> ${order.order_number}<br><strong>Status:</strong> Order Confirmed</p><p>I'll notify you as soon as the design work begins.</p><p>— Going Beyond</p>`,
          },
          "Design in Progress": {
            subject: `Your design for order ${order.order_number} is underway`,
            html: `<p>Hi ${order.client_name},</p><p>Good news — work on your order has started.</p><p><strong>Order ID:</strong> ${order.order_number}<br><strong>Status:</strong> Design in Progress</p><p>— Going Beyond</p>`,
          },
          "Review": {
            subject: `Order ${order.order_number} is ready for your review`,
            html: `<p>Hi ${order.client_name},</p><p>Your design is ready for review. I'll be in touch with the file shortly — if you have any change requests, let me know.</p><p><strong>Order ID:</strong> ${order.order_number}<br><strong>Status:</strong> Review</p><p>— Going Beyond</p>`,
          },
          "Order Delivered": {
            subject: `Order ${order.order_number} delivered — thank you!`,
            html: `<p>Hi ${order.client_name},</p><p>Your order is complete and has been delivered.</p><p><strong>Order ID:</strong> ${order.order_number}<br><strong>Status:</strong> Order Delivered</p><p>Thank you for choosing Going Beyond. If you're happy with the work, a review or referral means a lot!</p><p>— Going Beyond</p>`,
          },
        };
        const tpl = templates[status];
        if (tpl) {
          const sent = await sendEmail(RESEND_KEY, order.email, tpl.subject, tpl.html);
          await logEmail(SUPABASE_URL, SERVICE_KEY, order.id, `Status: ${status}`, order.email, sent ? "Success" : "Failed");
        }
      }

      // Send a payment-confirmed email if payment was just marked Paid
      if (payment_status === "Paid" && RESEND_KEY && order?.email) {
        const sent = await sendEmail(
          RESEND_KEY,
          order.email,
          `Payment received for order ${order.order_number}`,
          `<p>Hi ${order.client_name},</p><p>We've received your payment for order #${order.order_number}. Thank you!</p><p>— Going Beyond</p>`
        );
        await logEmail(SUPABASE_URL, SERVICE_KEY, order.id, "Payment Confirmed", order.email, sent ? "Success" : "Failed");
      }

      return new Response(JSON.stringify({ success: true, order }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("admin-orders PATCH error:", err);
      return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};

export const config: Config = {
  path: "/api/admin-orders",
};
