import { notFound } from 'next/navigation';
import OrderConfirmation from '@/lib/email/templates/OrderConfirmation';
import OrderShipped from '@/lib/email/templates/OrderShipped';
import OrderDelivered from '@/lib/email/templates/OrderDelivered';
import Welcome from '@/lib/email/templates/Welcome';
import AdminNewOrder from '@/lib/email/templates/AdminNewOrder';

/**
 * Dev-only email template gallery. Renders each template with sample props.
 * Returns 404 in production.
 */
export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const previews = [
    {
      name: 'OrderConfirmation',
      el: OrderConfirmation({
        orderNumber: 'MB-LXYZ-0001',
        customerName: 'Nino',
        items: [
          { nameSnapshot: 'Clear Phone Case', quantity: 2, priceSnapshot: 19.99 },
          { nameSnapshot: 'USB-C Fast Charger', quantity: 1, priceSnapshot: 24.99 },
        ],
        total: 64.97,
      }),
    },
    {
      name: 'OrderShipped',
      el: OrderShipped({ orderNumber: 'MB-LXYZ-0001', trackingNumber: 'GE123456789' }),
    },
    { name: 'OrderDelivered', el: OrderDelivered({ orderNumber: 'MB-LXYZ-0001' }) },
    { name: 'Welcome', el: Welcome({ firstName: 'Nino' }) },
    {
      name: 'AdminNewOrder',
      el: AdminNewOrder({
        orderNumber: 'MB-LXYZ-0001',
        total: 64.97,
        customerEmail: 'customer@example.com',
      }),
    },
  ];

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Email template preview</h1>
      {previews.map((p) => (
        <section key={p.name} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, color: '#1E2D5A' }}>{p.name}</h2>
          <div style={{ border: '1px solid #e6ebf1', borderRadius: 8 }}>{p.el}</div>
        </section>
      ))}
    </div>
  );
}
