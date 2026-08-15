// Shared helper to send a transactional email via Brevo's API.
// Brevo works without a verified custom domain — the sender address just needs
// to be verified once in the Brevo dashboard (Settings > Senders).
const FROM_EMAIL = "gauravadhikari9289@gmail.com";
const FROM_NAME = "Going Beyond";

export async function sendEmail(
  brevoKey: string,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      console.error("Brevo send failed:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Brevo send error:", err);
    return false;
  }
}
