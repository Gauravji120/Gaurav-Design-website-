import type { Context, Config } from "@netlify/functions";
import { sendEmail } from "../lib/send-email.mts";

const ADMIN_EMAIL = "gauravadhikari9289@gmail.com";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const BREVO_KEY = Netlify.env.get("BREVO_API_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Please log in first." }), { status: 401 });
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Session expired. Please log in again." }), { status: 401 });
    }
    const user = await userRes.json();
    const meta = user.user_metadata || {};

    const body = await req.json();
    const preferredTime = (body.preferredTime || "").trim();
    const reason = (body.reason || "").trim();

    if (!reason) {
      return new Response(JSON.stringify({ error: "Please tell us what you'd like to discuss." }), { status: 400 });
    }

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/call_requests`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: user.id,
        client_name: meta.full_name || user.email,
        email: user.email,
        phone: meta.phone || null,
        preferred_time: preferredTime,
        reason,
      }),
    });

    if (!insertRes.ok) {
      return new Response(JSON.stringify({ error: "Could not submit your request. Please try again." }), {
        status: 500,
      });
    }

    if (BREVO_KEY) {
      await sendEmail(
        BREVO_KEY,
        ADMIN_EMAIL,
        `Call request from ${meta.full_name || user.email}`,
        `<p><strong>${meta.full_name || user.email}</strong> requested a call.</p><p><strong>Preferred time:</strong> ${preferredTime || "Not specified"}<br><strong>Reason:</strong> ${reason}</p><p><strong>Contact:</strong> ${user.email}${meta.phone ? " · " + meta.phone : ""}</p>`
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("book-call error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/book-call",
};
