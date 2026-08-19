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
    return new Response(JSON.stringify({ error: "Not logged in." }), { status: 401 });
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Session expired. Please log in again." }), { status: 401 });
    }
    const user = await userRes.json();

    // Delete the auth user. Their past orders stay on record (orders.user_id
    // references auth.users with ON DELETE SET NULL) for business/tax history,
    // but with no personal account attached to them anymore.
    const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });

    if (!delRes.ok) {
      return new Response(JSON.stringify({ error: "Could not delete account. Please try again or contact us." }), {
        status: 500,
      });
    }

    if (BREVO_KEY) {
      await sendEmail(
        BREVO_KEY,
        ADMIN_EMAIL,
        `Client account deleted — ${user.email}`,
        `<p>A client account was deleted via self-service.</p><p><strong>Email:</strong> ${user.email}<br><strong>Name:</strong> ${user.user_metadata?.full_name || "—"}</p>`
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/delete-account",
};
