import type { ReactElement } from 'react';
import { Resend } from 'resend';

/**
 * Lazily instantiated Resend client. We avoid creating it at module load so a
 * missing API key never crashes imports; the client is only built once a key is
 * present.
 */
let client: Resend | null = null;

function getClient(apiKey: string): Resend {
  if (!client) client = new Resend(apiKey);
  return client;
}

interface SendEmailArgs {
  to: string | string[];
  subject: string;
  react: ReactElement;
}

/**
 * Fire-and-forget email send. Mirrors the safety of {@link logActivity}: a
 * missing RESEND_API_KEY or a send failure logs a warning and NO-OPS — sending
 * email must never throw into (and break) the flow it is attached to.
 */
export async function sendEmail({ to, subject, react }: SendEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping email "${subject}" to ${
        Array.isArray(to) ? to.join(', ') : to
      }`
    );
    return;
  }

  const from = process.env.EMAIL_FROM || 'MoBax <noreply@mobax.ge>';

  try {
    const { error } = await getClient(apiKey).emails.send({ from, to, subject, react });
    if (error) {
      console.error(`[email] Resend returned an error for "${subject}":`, error);
    }
  } catch (err) {
    console.error(`[email] failed to send "${subject}":`, err);
  }
}
