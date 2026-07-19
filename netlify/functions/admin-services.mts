import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

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
      const res = await fetch(`${SUPABASE_URL}/rest/v1/services?select=*&order=display_order.asc`, { headers });
      const services = res.ok ? await res.json() : [];
      return new Response(JSON.stringify({ success: true, services }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const name = (body.name || "").trim();
      const price = Number(body.price);

      if (!name || !Number.isFinite(price) || price <= 0) {
        return new Response(JSON.stringify({ error: "Enter a valid name and price." }), { status: 400 });
      }

      let serviceKey = slugify(name);
      if (!serviceKey) {
        return new Response(JSON.stringify({ error: "Please use a valid name." }), { status: 400 });
      }

      // Ensure the key is unique — append a number if needed
      let attempt = serviceKey;
      let suffix = 1;
      while (true) {
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/services?service_key=eq.${attempt}&select=id`, { headers });
        const rows = checkRes.ok ? await checkRes.json() : [];
        if (!rows.length) break;
        suffix += 1;
        attempt = `${serviceKey}_${suffix}`;
      }
      serviceKey = attempt;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/services`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ service_key: serviceKey, name, price, display_order: Date.now() % 100000 }),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Could not add service." }), { status: 500 });
      }
      const [service] = await res.json();
      return new Response(JSON.stringify({ success: true, service }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const id = body.id;
      if (!id) {
        return new Response(JSON.stringify({ error: "Service id required." }), { status: 400 });
      }
      const updates: Record<string, unknown> = {};
      if (body.price != null) {
        const price = Number(body.price);
        if (!Number.isFinite(price) || price <= 0) {
          return new Response(JSON.stringify({ error: "Enter a valid price." }), { status: 400 });
        }
        updates.price = price;
      }
      if (typeof body.active === "boolean") updates.active = body.active;
      if (body.name) updates.name = String(body.name).trim();

      const res = await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Could not update service." }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "Service id required." }), { status: 400 });
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Could not remove service." }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  } catch (err) {
    console.error("admin-services error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/admin-services",
};
