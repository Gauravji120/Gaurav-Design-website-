import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";

export default async (req: Request, context: Context) => {
  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SESSION_SECRET = Netlify.env.get("ADMIN_SESSION_SECRET");

  if (!SUPABASE_URL || !SERVICE_KEY || !SESSION_SECRET) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const session = await verifySession(getBearerToken(req), SESSION_SECRET);
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authorized. Please log in again." }), { status: 401 });
  }

  if (req.method === "GET") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/call_requests?select=*&order=created_at.desc&limit=200`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const requests = await res.json();
    return new Response(JSON.stringify({ success: true, requests }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "PATCH") {
    const { id, status } = await req.json();
    if (!id || !status) {
      return new Response(JSON.stringify({ error: "Missing id or status" }), { status: 400 });
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/call_requests?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Could not update" }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};

export const config: Config = {
  path: "/api/admin-call-requests",
};
