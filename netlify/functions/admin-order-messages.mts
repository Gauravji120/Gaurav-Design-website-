import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";
import { sendEmail } from "../lib/send-email.mts";
import { getNotificationPref, shouldSendEmail } from "../lib/notification-pref.mts";

export default async (req: Request, context: Context) => {
  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SESSION_SECRET = Netlify.env.get("ADMIN_SESSION_SECRET");
  const BREVO_KEY = Netlify.env.get("BREVO_API_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY || !SESSION_SECRET) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const session = await verifySession(getBearerToken(req), SESSION_SECRET);
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authorized. Please log in again." }), { status: 401 });
  }

  if (req.method === "GET") {
    const orderId = new URL(req.url).searchParams.get("orderId");
    if (!orderId) return new Response(JSON.stringify({ error: "Missing orderId" }), { status: 400 });

    const msgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/order_messages?order_id=eq.${orderId}&select=id,sender_type,message,attachment_path,attachment_name,created_at&order=created_at.asc`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const messages = await msgRes.json();

    await Promise.all(
      messages.map(async (m: any) => {
        if (m.attachment_path) {
          try {
            const signRes = await fetch(
              `${SUPABASE_URL}/storage/v1/object/sign/message-attachments/${m.attachment_path}`,
              {
                method: "POST",
                headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ expiresIn: 3600 }),
              }
            );
            if (signRes.ok) {
              const { signedURL } = await signRes.json();
              m.attachment_url = `${SUPABASE_URL}/storage/v1${signedURL}`;
            }
          } catch {}
        }
      })
    );

    return new Response(JSON.stringify({ success: true, messages }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    const formData = await req.formData();
    const orderId = (formData.get("orderId") as string || "").trim();
    const message = (formData.get("message") as string || "").trim();
    const file = formData.get("file") as File | null;

    if (!orderId || (!message && !file)) {
      return new Response(JSON.stringify({ error: "Message can't be empty." }), { status: 400 });
    }
    if (file && file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File is too large (10MB max)." }), { status: 400 });
    }

    const orderRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=id,order_number,client_name,email,user_id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const [order] = await orderRes.json();
    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });

    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    if (file && file.size > 0) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      attachmentPath = `${orderId}/${Date.now()}_${safeName}`;
      attachmentName = file.name;
      const bytes = await file.arrayBuffer();
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/message-attachments/${attachmentPath}`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: bytes,
      });
      if (!uploadRes.ok) {
        return new Response(JSON.stringify({ error: "Could not upload the file." }), { status: 500 });
      }
    }

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/order_messages`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
        sender_type: "admin",
        message: message || "(sent an attachment)",
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
      }),
    });

    if (!insertRes.ok) {
      return new Response(JSON.stringify({ error: "Could not send message." }), { status: 500 });
    }

    if (BREVO_KEY && order.email) {
      const pref = await getNotificationPref(SUPABASE_URL, SERVICE_KEY, order.user_id);
      if (shouldSendEmail(pref, true)) {
        await sendEmail(
          BREVO_KEY,
          order.email,
          `New message on your order ${order.order_number}`,
          `<p>Hi ${order.client_name},</p><p>You have a new message on order <strong>${order.order_number}</strong>:</p><p>"${message || '(sent an attachment)'}"</p><p>Reply from <a href="https://goingbeyond.netlify.app/orders.html">My Orders</a>.</p><p>— Going Beyond</p>`
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};

export const config: Config = {
  path: "/api/admin-order-messages",
};
