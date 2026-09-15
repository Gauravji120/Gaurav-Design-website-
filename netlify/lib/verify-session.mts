// Shared helper — future Admin Dashboard functions (orders list, pricing update, etc.)
// should import verifySession() and reject the request if it returns null.
// This keeps the session-checking logic in one place instead of duplicating it everywhere.

function base64urlToString(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  return atob(padded);
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
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface SessionPayload {
  u: string;
  exp: number;
}

/**
 * Verifies a session token issued by admin-login.mts.
 * Returns the decoded payload if valid and not expired, or null otherwise.
 */
export async function verifySession(
  token: string | null,
  secret: string
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expectedSig = await hmacSign(secret, payloadB64);
  if (expectedSig !== signature) return null;

  try {
    const payload: SessionPayload = JSON.parse(base64urlToString(payloadB64));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts the admin session token from a request — checks the Authorization
 * header first (kept for compatibility with any direct API callers), then
 * falls back to the HttpOnly gb_admin_session cookie set by admin-login.mts.
 * The cookie is the primary mechanism the Admin Dashboard now uses: it can't
 * be read or stolen by JavaScript (XSS), unlike the old approach of storing
 * the token in localStorage.
 */
export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (header && header.startsWith("Bearer ")) return header.slice(7).trim();

  const cookieHeader = req.headers.get("cookie") || req.headers.get("Cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("gb_admin_session="));
  if (match) return decodeURIComponent(match.slice("gb_admin_session=".length));

  return null;
}
