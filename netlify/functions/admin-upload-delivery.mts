import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";
import { sendEmail } from "../lib/send-email.mts";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

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

  try {
    const formData = await req.formData();
    const orderId = (formData.get("orderId") as string || "").trim();
    const file = formData.get("file") as File | null;

    if (!orderId || !file || file.size === 0) {
      return new Response(JSON.stringify({ error: "Missing order or file" }), { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File is too large (50MB max)" }), { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${orderId}/${Date.now()}_${safeName}`;
    const bytes = await file.arrayBuffer();

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/deliverables/${path}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: bytes,
    });

    if (!uploadRes.ok) {
      console.error("Delivery upload failed:", await uploadRes.text());
      return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500 });
    }

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        delivery_file_path: path,
        delivery_file_uploaded_at: new Date().toISOString(),
      }),
    });

    if (!patchRes.ok) {
      return new Response(JSON.stringify({ error: "Uploaded but could not save the link" }), { status: 500 });
    }

    const [order] = await patchRes.json();

    // Best-effort email to the client — upload already succeeded either way
    if (BREVO_KEY && order?.email) {
      await sendEmail(
        BREVO_KEY,
        order.email,
        `Your files are ready — ${order.order_number}`,
        `<p>Hi ${order.client_name},</p><p>Your final files for order <strong>${order.order_number}</strong> are ready! Log in to <a href="https://goingbeyond.netlify.app/orders.html">My Orders</a> to download them.</p><p>— Going Beyond</p>`
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-upload-delivery error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/admin-upload-delivery",
};
