import type { Context, Config } from "@netlify/functions";

const OWNER_EMAIL = "gauravadhikari9289@gmail.com";
const FROM_EMAIL = "Going Beyond <onboarding@resend.dev>";

function isValidPhone(phone: string): boolean {
  const cleaned = phone.trim().replace(/^\+91[\s-]?/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function logEmail(
  supabaseUrl: string,
  serviceKey: string,
  orderId: string,
  emailType: string,
  sentTo: string,
  status: "Success" | "Failed"
) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/email_log`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order_id: orderId, email_type: emailType, sent_to: sentTo, status }),
    });
  } catch {
    // Logging failure should never break the main order flow
  }
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SERVICE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_KEY = Netlify.env.get("RESEND_API_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  try {
    const formData = await req.formData();

    // Honeypot spam check
    if ((formData.get("bot-field") as string || "").trim() !== "") {
      return new Response(JSON.stringify({ error: "Rejected" }), { status: 400 });
    }

    const name = (formData.get("name") as string || "").trim();
    const email = (formData.get("email") as string || "").trim();
    const phone = (formData.get("phone") as string || "").trim();
    const service = (formData.get("service") as string || "").trim();
    const serviceKey = (formData.get("service_key") as string || "").trim();
    const size = (formData.get("size") as string || "").trim();
    const deadline = (formData.get("deadline") as string || "").trim();
    const details = (formData.get("details") as string || "").trim();
    const couponCodeInput = (formData.get("coupon_code") as string || "").trim().toUpperCase();
    const file = formData.get("reference") as File | null;

    let quantity = parseInt((formData.get("quantity") as string) || "1", 10);
    if (!Number.isInteger(quantity) || quantity < 1) quantity = 1;
    if (quantity > 100) quantity = 100;

    if (
      !name ||
      !isValidEmail(email) ||
      !isValidPhone(phone) ||
      !service ||
      !size ||
      !deadline ||
      !details
    ) {
      return new Response(JSON.stringify({ error: "Please check your details and try again." }), {
        status: 400,
      });
    }

    // Look up the CURRENT live price ourselves — never trust a price the browser sends.
    let unitPrice: number | null = null;
    if (serviceKey) {
      const svcRes = await fetch(
        `${SUPABASE_URL}/rest/v1/services?service_key=eq.${encodeURIComponent(serviceKey)}&active=eq.true&select=price`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      );
      if (svcRes.ok) {
        const [row] = await svcRes.json();
        unitPrice = row ? Number(row.price) : null;
      }
    }

    if (unitPrice == null || isNaN(unitPrice)) {
      return new Response(JSON.stringify({ error: "Please select a valid service." }), {
        status: 400,
      });
    }

    const subtotal = unitPrice * quantity;

    // 0. If a coupon code was provided, re-validate it here on the server.
    // We never trust a discount percentage sent from the browser — only what
    // this function itself looks up in the coupons table right now.
    let appliedCouponCode: string | null = null;
    let appliedDiscountPercent: number | null = null;

    if (couponCodeInput) {
      const couponQuery = new URLSearchParams({
        code: `eq.${couponCodeInput}`,
        select: "id,code,discount_percent,usage_limit,times_used,expiry_date,active",
      });
      const couponRes = await fetch(`${SUPABASE_URL}/rest/v1/coupons?${couponQuery.toString()}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const couponRows = couponRes.ok ? await couponRes.json() : [];
      const coupon = couponRows[0];

      const isExpired = coupon?.expiry_date && new Date(coupon.expiry_date) < new Date();
      const isOverLimit =
        coupon?.usage_limit != null && coupon.times_used >= coupon.usage_limit;

      if (coupon && coupon.active && !isExpired && !isOverLimit) {
        appliedCouponCode = coupon.code;
        appliedDiscountPercent = coupon.discount_percent;

        // Increment usage count now that we know it will be used on this order
        await fetch(`${SUPABASE_URL}/rest/v1/coupons?id=eq.${coupon.id}`, {
          method: "PATCH",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ times_used: coupon.times_used + 1 }),
        }).catch(() => {});
      }
      // If the coupon is invalid for any reason, we simply don't apply a discount —
      // the order still goes through without one, rather than failing entirely.
    }

    const totalPrice = appliedDiscountPercent
      ? Math.round(subtotal * (1 - appliedDiscountPercent / 100))
      : subtotal;

    // 1. Insert the order (service role bypasses RLS; order_number auto-generated by DB trigger)
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        client_name: name,
        email,
        phone,
        service,
        size,
        deadline,
        details,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        coupon_code: appliedCouponCode,
        discount_percent: appliedDiscountPercent,
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("Supabase insert failed:", errText);
      return new Response(JSON.stringify({ error: "Could not save your order. Please try again." }), {
        status: 500,
      });
    }

    const [order] = await insertRes.json();
    const orderId: string = order.id;
    const orderNumber: string = order.order_number;

    // 2. Upload reference file to private storage bucket, if provided
    if (file && file.size > 0) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${orderId}/${Date.now()}_${safeName}`;
      const bytes = await file.arrayBuffer();

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/reference-files/${path}`,
        {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": file.type || "application/octet-stream",
          },
          body: bytes,
        }
      );

      if (uploadRes.ok) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
          method: "PATCH",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference_file_url: path }),
        });
      } else {
        console.error("File upload failed:", await uploadRes.text());
      }
    }

    // 3. Send emails via Resend (best-effort — order is already saved either way)
    if (RESEND_KEY) {
      const clientHtml = `
        <p>Hi ${name},</p>
        <p>Thank you for your order! Here are the details:</p>
        <p><strong>Order ID:</strong> ${orderNumber}<br>
        <strong>Service:</strong> ${service}<br>
        <strong>Quantity:</strong> ${quantity}<br>
        <strong>Total:</strong> ₹${totalPrice}<br>
        <strong>Deadline:</strong> ${deadline}</p>
        <p>I'll review your order and confirm it shortly. You can track its status anytime using your Order ID on the Track Order page.</p>
        <p>— Going Beyond</p>
      `;
      const ownerHtml = `
        <p>New order received.</p>
        <p><strong>Order ID:</strong> ${orderNumber}<br>
        <strong>Client:</strong> ${name}<br>
        <strong>Email:</strong> ${email}<br>
        <strong>Phone:</strong> ${phone}<br>
        <strong>Service:</strong> ${service}<br>
        <strong>Quantity:</strong> ${quantity}<br>
        <strong>Total:</strong> ₹${totalPrice}<br>
        <strong>Size/platform:</strong> ${size}<br>
        <strong>Deadline:</strong> ${deadline}<br>
        <strong>Details:</strong> ${details}</p>
        <p>Log in to the Admin Dashboard to confirm this order.</p>
      `;

      const clientSent = await sendEmail(
        RESEND_KEY,
        email,
        `Your order ${orderNumber} has been received — Going Beyond`,
        clientHtml
      );
      await logEmail(SUPABASE_URL, SERVICE_KEY, orderId, "Order Received", email, clientSent ? "Success" : "Failed");

      const ownerSent = await sendEmail(
        RESEND_KEY,
        OWNER_EMAIL,
        `New order — ${name} — ${service}`,
        ownerHtml
      );
      await logEmail(SUPABASE_URL, SERVICE_KEY, orderId, "New Order Alert", OWNER_EMAIL, ownerSent ? "Success" : "Failed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderNumber,
        appliedCouponCode,
        appliedDiscountPercent,
        totalPrice,
      }),
      {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-order error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
    });
  }
};

export const config: Config = {
  path: "/api/submit-order",
};
