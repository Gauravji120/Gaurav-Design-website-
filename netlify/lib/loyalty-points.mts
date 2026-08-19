// A client's real, trustworthy loyalty points balance — always computed
// server-side from their actual paid order history. Never trust a balance
// sent from the browser.
export async function getLoyaltyBalance(
  supabaseUrl: string,
  serviceKey: string,
  userId: string
): Promise<number> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/orders?user_id=eq.${userId}&select=payment_status,total_price,points_redeemed,points_discount_amount`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!res.ok) return 0;
    const orders = await res.json();

    let earned = 0;
    let redeemed = 0;
    for (const o of orders) {
      if (o.payment_status === "Paid") {
        earned += Math.floor(Number(o.total_price || 0) / 100);
      }
      redeemed += Number(o.points_redeemed || 0);
    }
    return Math.max(0, earned - redeemed);
  } catch {
    return 0;
  }
}
