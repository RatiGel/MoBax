import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression coverage for the paid-order notification race.
 *
 * The shipped bug: notifications hung off /api/payments/success and were gated
 * on that handler winning the PAID status update. Flitt's webhook normally
 * lands first, so the browser return found modifiedCount === 0 and sent
 * nothing — no confirmation email, no Telegram message. The guard now lives on
 * a dedicated `paidNotifiedAt` claim, so whichever request arrives first sends,
 * and later ones no-op.
 */

const ORDER = {
  _id: 'order-1',
  orderNumber: 'MB-TEST-0001',
  guestEmail: 'buyer@example.com',
  addressSnapshot: { firstName: 'Nino', lastName: 'Beridze', email: 'buyer@example.com' },
  items: [{ nameSnapshot: 'Case', quantity: 2, priceSnapshot: 25 }],
  subtotal: 50,
  shippingCost: 5,
  total: 55,
  deliveryMethod: 'pickup',
};

const sendEmail = vi.fn().mockResolvedValue(undefined);
const sendTelegram = vi.fn().mockResolvedValue(undefined);
const findOneAndUpdate = vi.fn();

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/email/send', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('@/lib/telegram', () => ({
  sendTelegramOrderNotification: (...a: unknown[]) => sendTelegram(...a),
}));
vi.mock('@/lib/email/templates/OrderConfirmation', () => ({
  default: (props: unknown) => ({ props }),
}));
vi.mock('@/models/Order', () => ({
  default: {
    findOneAndUpdate: (...a: unknown[]) => ({ lean: () => findOneAndUpdate(...a) }),
  },
}));

import { notifyOrderPaid } from '@/lib/order-notifications';

/** Simulate the atomic claim: the first caller wins, every later one gets null. */
function stubClaim() {
  let claimed = false;
  findOneAndUpdate.mockImplementation(async () => {
    if (claimed) return null;
    claimed = true;
    return ORDER;
  });
}

beforeEach(() => {
  sendEmail.mockClear();
  sendTelegram.mockClear();
  findOneAndUpdate.mockReset();
});

describe('notifyOrderPaid', () => {
  it('sends the confirmation email and the Telegram message on the first call', async () => {
    stubClaim();
    await notifyOrderPaid('order-1', 'https://mobax.ge');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendTelegram).toHaveBeenCalledTimes(1);

    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      to: 'buyer@example.com',
      subject: 'Order MB-TEST-0001 confirmed',
    });
    expect(sendTelegram.mock.calls[0][0]).toMatchObject({
      orderNumber: 'MB-TEST-0001',
      customerName: 'Nino Beridze',
      total: 55,
      itemCount: 2,
      adminUrl: 'https://mobax.ge/admin/orders/order-1',
    });
  });

  it('still notifies when the webhook already marked the order paid', async () => {
    // The exact shipped failure: the status flip happened in another request,
    // so the caller has no "I just paid it" signal of its own. It must still send.
    stubClaim();
    await notifyOrderPaid('order-1', 'https://mobax.ge');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendTelegram).toHaveBeenCalledTimes(1);
  });

  it('sends exactly once when the webhook and the browser return both fire', async () => {
    stubClaim();
    await Promise.all([
      notifyOrderPaid('order-1', 'https://mobax.ge'),
      notifyOrderPaid('order-1', 'https://mobax.ge'),
    ]);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendTelegram).toHaveBeenCalledTimes(1);
  });

  it('no-ops when the order was already notified', async () => {
    findOneAndUpdate.mockResolvedValue(null);
    await notifyOrderPaid('order-1', 'https://mobax.ge');

    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendTelegram).not.toHaveBeenCalled();
  });

  it('still sends the Telegram alert when the order has no customer email', async () => {
    findOneAndUpdate.mockResolvedValue({ ...ORDER, guestEmail: '', addressSnapshot: { firstName: 'Nino', lastName: 'Beridze' } });
    await notifyOrderPaid('order-1', 'https://mobax.ge');

    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendTelegram).toHaveBeenCalledTimes(1);
  });

  it('never throws when the database claim fails', async () => {
    findOneAndUpdate.mockRejectedValue(new Error('mongo down'));
    await expect(notifyOrderPaid('order-1', 'https://mobax.ge')).resolves.toBeUndefined();
  });
});
