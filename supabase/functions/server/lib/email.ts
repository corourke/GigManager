// Minimal Resend integration (issue #47) — a raw fetch call rather than an
// SDK dependency, matching this codebase's existing pattern for third-party
// APIs (see routes/places.ts's Google Places call). Best-effort: callers
// should never let an email failure fail the request that triggered it.
const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'GigManager <onboarding@resend.dev>';

export interface SendEmailResult {
  sent: boolean;
  error?: string;
}

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured — skipping email send');
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  // onboarding@resend.dev works without domain verification but (per
  // Resend's own sandbox restrictions) can only deliver to the account
  // owner's verified address until a real sending domain is verified —
  // set RESEND_FROM_EMAIL once one is, no code change needed.
  const from = Deno.env.get('RESEND_FROM_EMAIL') || DEFAULT_FROM;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      console.error('Resend API error:', data);
      return { sent: false, error: data?.message || `Resend API error: ${response.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('Error sending email via Resend:', err);
    return { sent: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
