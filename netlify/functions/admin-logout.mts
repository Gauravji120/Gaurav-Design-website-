import type { Context, Config } from "@netlify/functions";

// Clears the HttpOnly admin session cookie. A plain localStorage.removeItem()
// can't do this anymore since the cookie isn't JS-readable at all — logout
// has to go through the server so it can send back an expired Set-Cookie
// header, which is the only thing that can remove an HttpOnly cookie.
export default async (req: Request, context: Context) => {
  const expiredCookie = [
    "gb_admin_session=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": expiredCookie },
  });
};

export const config: Config = {
  path: "/api/admin-logout",
};
