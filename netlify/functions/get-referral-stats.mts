import type { Context, Config } from "@netlify/functions";

function deriveCode(userId: string): string {
  return "GB-" + userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

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
    const myCode = deriveCode(user.id);

    // List users and count how many were referred by this code.
    // Fine for a small freelance business's user base (single page of results).
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    let referredCount = 0;
    if (listRes.ok) {
      const { users } = await listRes.json();
      referredCount = (users || []).filter(
        (u: any) => u.user_metadata?.referred_by === myCode
      ).length;
    }

    return new Response(JSON.stringify({ success: true, code: myCode, referredCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-referral-stats error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong." }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/referral-stats",
};
