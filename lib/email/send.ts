import type { ReactElement } from 'react';
import nodemailer, { type Transporter } from 'nodemailer';
import { render } from '@react-email/components';

/**
 * Lazily built Gmail SMTP transport. Created once, on first send, so a missing
 * credential never crashes imports. Gmail authenticates with an app password
 * (not the account password) — spaces in the 16-char code are stripped.
 */
let transporter: Transporter | null = null;

function getTransport(user: string, pass: string): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: pass.replace(/\s+/g, '') },
    });
  }
  return transporter;
}

interface SendEmailArgs {
  to: string | string[];
  subject: string;
  react: ReactElement;
}

/**
 * Fire-and-forget email send over Gmail SMTP. Sending must never throw into (and
 * break) the flow it is attached to: a missing GMAIL_USER/GMAIL_APP_PASSWORD or
 * a transport failure logs a warning and NO-OPS.
 */
export async function sendEmail({ to, subject, react }: SendEmailArgs): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  if (!user || !pass) {
    console.warn(`[email] GMAIL_USER/GMAIL_APP_PASSWORD not set — skipping "${subject}" to ${recipients}`);
    return;
  }

  // Gmail rewrites the envelope sender to the authenticated account, so From
  // should be that same address (falls back to it if EMAIL_FROM is unset).
  const from = process.env.EMAIL_FROM || `MoBax <${user}>`;

  try {
    // Render the react-email component to HTML + a plaintext fallback.
    const html = await render(react);
    const text = await render(react, { plainText: true });
    await getTransport(user, pass).sendMail({ from, to, subject, html, text });
  } catch (err) {
    console.error(`[email] failed to send "${subject}":`, err);
  }
}
