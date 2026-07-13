import type { Context, Config } from "@netlify/functions";

const MAX_FAILED_ATTEMPTS = 6;
const WINDOW_MINUTES = 15;
const SESSION_HOURS = 6;

function base64url(bytes: ArrayBuffer | string): string {
  const bin = typeof bytes === "string" ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64url(sig);
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SESSION_SECRET = Netlify.env.get("ADMIN_SESSION_SECRET");

  if (!SUPABASE_URL || !SERVICE_KEY || !SESSION_SECRET) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const GENERIC_ERROR = "Incorrect username or password.";

  try {
    const body = await req.json();
    const username = (body.username || "").trim();
    const password = (body.password || "").toString();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: GENERIC_ERROR }), { status: 400 });
    }

    // 1. Check recent failed attempts for this username (brute-force protection)
    const since = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();
    const attemptsQuery = new URLSearchParams({
      username: `eq.${username}`,
      success: "eq.false",
      created_at: `gte.${since}`,
      select: "id",
    });
    const attemptsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_login_attempts?${attemptsQuery.toString()}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const attempts = attemptsRes.ok ? await attemptsRes.json() : [];
    if (attempts.length >= MAX_FAILED_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again in a few minutes." }),
        { status: 429 }
      );
    }

    // 2. Verify credentials — password comparison happens entirely inside Postgres
    const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_admin_login`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_username: username, p_password: password }),
    });
    const isValid = verifyRes.ok ? await verifyRes.json() : false;

    // 3. Log this attempt (success or failure) for rate limiting and audit
    await fetch(`${SUPABASE_URL}/rest/v1/admin_login_attempts`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, success: !!isValid }),
    }).catch(() => {});

    if (!isValid) {
      return new Response(JSON.stringify({ error: GENERIC_ERROR }), { status: 401 });
    }

    // 4. Update last_login timestamp
    await fetch(`${SUPABASE_URL}/rest/v1/admin_users?username=eq.${encodeURIComponent(username)}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ last_login: new Date().toISOString() }),
    }).catch(() => {});

    // 5. Issue a signed session token (stateless — no session table needed).
    // The token is just data + a signature; it cannot be forged without ADMIN_SESSION_SECRET,
    // which only this backend function ever sees.
    const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
    const payload = base64url(JSON.stringify({ u: username, exp }));
    const signature = await hmacSign(SESSION_SECRET, payload);
    const token = `${payload}.${signature}`;

    return new Response(JSON.stringify({ success: true, token, expiresAt: exp }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-login error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
    });
  }
};

export const config: Config = {
  path: "/api/admin-login",
};
