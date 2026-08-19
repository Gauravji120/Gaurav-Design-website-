import type { Context, Config } from "@netlify/functions";
import { getLoyaltyBalance } from "../lib/loyalty-points.mts";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
    const balance = await getLoyaltyBalance(SUPABASE_URL, SERVICE_KEY, user.id);

    return new Response(JSON.stringify({ success: true, balance }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-loyalty-points error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong." }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/loyalty-points",
};
