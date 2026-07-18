import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";

const ALLOWED_PLATFORMS = [
  "instagram", "youtube", "facebook", "twitter", "linkedin",
  "pinterest", "snapchat", "telegram", "tiktok", "threads",
];

export default async (req: Request, context: Context) => {
  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SESSION_SECRET = Netlify.env.get("ADMIN_SESSION_SECRET");

  if (!SUPABASE_URL || !SERVICE_KEY || !SESSION_SECRET) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const session = await verifySession(getBearerToken(req), SESSION_SECRET);
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authorized. Please log in again." }), {
      status: 401,
    });
  }

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

  try {
    if (req.method === "GET") {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/social_links?select=*&order=display_order.asc`, { headers });
      const links = res.ok ? await res.json() : [];
      return new Response(JSON.stringify({ success: true, links }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const platform = (body.platform || "").trim().toLowerCase();
      const url = (body.url || "").trim();

      if (!ALLOWED_PLATFORMS.includes(platform)) {
        return new Response(JSON.stringify({ error: "Unknown platform." }), { status: 400 });
      }
      if (!/^https?:\/\/.+/.test(url)) {
        return new Response(JSON.stringify({ error: "Enter a valid URL (starting with http:// or https://)." }), {
          status: 400,
        });
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/social_links`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ platform, url, display_order: Date.now() % 100000 }),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Could not add link." }), { status: 500 });
      }
      const [link] = await res.json();
      return new Response(JSON.stringify({ success: true, link }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "Link id required." }), { status: 400 });
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/social_links?id=eq.${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Could not remove link." }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  } catch (err) {
    console.error("admin-social-links error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/admin-social-links",
};
