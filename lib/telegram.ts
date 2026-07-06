/**
 * Telegram order notifications. Sends a short "paid order" summary to a chat
 * via the Bot API. Configured by two env vars — TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID — and a silent no-op if either is missing, so an
 * unconfigured deployment never breaks the order flow. Mirrors the
 * fire-and-forget, never-throw contract of lib/email/send.ts.
 */

interface OrderNotificationInput {
  orderNumber: string;
  customerName: string;
  total: number;
  itemCount: number;
  /** Absolute URL to the order in the admin panel. */
  adminUrl: string;
}

/** Escape the five characters Telegram's HTML parse_mode treats as markup. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Post a summary of a paid order to the configured Telegram chat. Resolves
 * silently whether or not the message was sent — failures are logged, never
 * thrown, so callers can fire-and-forget with `void`.
 */
export async function sendTelegramOrderNotification(
  input: OrderNotificationInput,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // Not configured — skip.

  const total = input.total.toFixed(2);
  const text =
    `🛒 <b>New paid order ${escapeHtml(input.orderNumber)}</b>\n\n` +
    `Customer: ${escapeHtml(input.customerName)}\n` +
    `Total: ${total} ₾\n` +
    `Items: ${input.itemCount}\n\n` +
    `<a href="${escapeHtml(input.adminUrl)}">View in admin</a>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`[telegram] sendMessage failed: ${res.status} ${detail}`);
    }
  } catch (err) {
    console.warn('[telegram] sendMessage error', err);
  }
}
