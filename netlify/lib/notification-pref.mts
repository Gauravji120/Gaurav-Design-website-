// Fetch a client's saved notification preference ('all' | 'important' | 'none').
// Defaults to 'all' if not set or if the lookup fails — never silently block emails
// due to an error, only due to an explicit user choice.
export async function getNotificationPref(
  supabaseUrl: string,
  serviceKey: string,
  userId: string | null
): Promise<"all" | "important" | "none"> {
  if (!userId) return "all";
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return "all";
    const user = await res.json();
    const pref = user?.user_metadata?.notification_pref;
    return pref === "important" || pref === "none" ? pref : "all";
  } catch {
    return "all";
  }
}

// Should this particular email go out, given the client's preference?
// isHighPriority = Order Delivered status change, or a payment confirmation —
// these are the two kinds that still go out under "important only".
export function shouldSendEmail(
  pref: "all" | "important" | "none",
  isHighPriority: boolean
): boolean {
  if (pref === "none") return false;
  if (pref === "all") return true;
  return isHighPriority;
}
