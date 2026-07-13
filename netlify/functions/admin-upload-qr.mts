import type { Context, Config } from "@netlify/functions";
import { verifySession, getBearerToken } from "../lib/verify-session.mts";

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

  const session = await verifySession(getBearerToken(req), SESSION_SECRET);
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authorized. Please log in again." }), { status: 401 });
  }

  try {
    const formData = await req.formData();
    const target = (formData.get("target") as string || "").trim(); // "upi" or "instagram"
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0 || !["upi", "instagram"].includes(target)) {
      return new Response(JSON.stringify({ error: "Missing file or invalid target" }), { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${target}-qr-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/qr-codes/${path}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": file.type || "image/jpeg",
        "x-upsert": "true",
      },
      body: bytes,
    });

    if (!uploadRes.ok) {
      console.error("QR upload failed:", await uploadRes.text());
      return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500 });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/qr-codes/${path}`;
    const columnName = target === "upi" ? "upi_qr_url" : "instagram_qr_url";

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?id=eq.1`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ [columnName]: publicUrl }),
    });

    if (!patchRes.ok) {
      return new Response(JSON.stringify({ error: "Uploaded but could not save the link" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-upload-qr error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/admin-upload-qr",
};
