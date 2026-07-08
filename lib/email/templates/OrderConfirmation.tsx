import { Button, Heading, Hr, Link, Section, Text } from '@react-email/components';
import { Layout } from './Layout';
import { STORE_LOCATION } from '@/lib/store-location';
import * as s from './styles';

export type ConfirmationDeliveryMethod = 'pickup' | 'instant' | 'nextday' | 'regional';

export interface OrderConfirmationItem {
  nameSnapshot: string;
  quantity: number;
  priceSnapshot: number;
}

export interface OrderConfirmationProps {
  orderNumber: string;
  customerName: string;
  items: OrderConfirmationItem[];
  /** Products only — the amount charged to the card online. */
  subtotal: number;
  /** Courier-collected delivery fee, paid in cash on delivery. 0 = pickup/free. */
  shippingCost: number;
  /** subtotal + shippingCost — total order value across both channels. */
  total: number;
  /** Chosen delivery method — drives the delivery section (pickup shows store). */
  deliveryMethod?: ConfirmationDeliveryMethod;
  /** Absolute link to the buyer's order/tracking page, if known. */
  trackUrl?: string;
}

const GEL = '₾'; // ₾
const money = (n: number) => `${GEL}${n.toFixed(2)}`;

const METHOD_LABEL: Record<ConfirmationDeliveryMethod, string> = {
  pickup: 'Store pickup',
  instant: 'Instant delivery (same day)',
  nextday: 'Next-day delivery',
  regional: 'Regional delivery',
};
const METHOD_ETA: Record<ConfirmationDeliveryMethod, string> = {
  pickup: 'Collect from our store',
  instant: 'Delivered today',
  nextday: 'Delivered next day',
  regional: 'Estimated 2–5 business days',
};

export default function OrderConfirmation({
  orderNumber,
  customerName,
  items,
  subtotal,
  shippingCost,
  total,
  deliveryMethod,
  trackUrl,
}: OrderConfirmationProps) {
  const isPickup = deliveryMethod === 'pickup';

  return (
    <Layout preview={`Order ${orderNumber} confirmed`}>
      <Heading style={s.heading}>Thanks for your order, {customerName}!</Heading>
      <Text style={s.text}>
        Your payment went through and we&apos;re getting your order ready.
      </Text>

      {/* Confirmation number — the one thing the buyer needs to reference. */}
      <Section
        style={{
          backgroundColor: '#f4f4f7',
          borderRadius: 8,
          padding: '16px 20px',
          margin: '0 0 24px',
        }}
      >
        <Text style={{ ...s.muted, margin: 0 }}>Order confirmation number</Text>
        <Text style={{ color: s.NAVY, fontSize: 22, fontWeight: 700, margin: '4px 0 0' }}>
          <strong>{orderNumber}</strong>
        </Text>
      </Section>

      <Hr style={s.hr} />

      {/* Items */}
      <Heading as="h3" style={{ ...s.heading, fontSize: 16 }}>Your items</Heading>
      <Section>
        {items.map((item, i) => (
          <Text key={i} style={s.text}>
            {item.quantity} × {item.nameSnapshot} —{' '}
            <strong>{money(item.priceSnapshot * item.quantity)}</strong>
          </Text>
        ))}
      </Section>

      <Hr style={s.hr} />

      {/* Payment breakdown — two channels kept explicit. */}
      {shippingCost > 0 ? (
        <>
          <Text style={{ ...s.text, fontSize: 17 }}>
            Paid online now: <strong>{money(subtotal)}</strong>
          </Text>
          <Text style={s.text}>
            Pay to courier on delivery (cash): <strong>{money(shippingCost)}</strong>
          </Text>
          <Text style={s.muted}>Total order value {money(total)}.</Text>
        </>
      ) : (
        <Text style={{ ...s.text, fontSize: 17 }}>
          Total paid: <strong>{money(total)}</strong>
        </Text>
      )}

      <Hr style={s.hr} />

      {/* Delivery details */}
      <Heading as="h3" style={{ ...s.heading, fontSize: 16 }}>Delivery</Heading>
      {deliveryMethod ? (
        <Text style={s.text}>
          <strong>{METHOD_LABEL[deliveryMethod]}</strong> — {METHOD_ETA[deliveryMethod]}
        </Text>
      ) : (
        <Text style={s.text}>We&apos;ll be in touch with delivery details shortly.</Text>
      )}

      {/* Store pickup — where and when to collect. */}
      {isPickup && (
        <Section
          style={{
            border: '1px solid #e6ebf1',
            borderRadius: 8,
            padding: '16px 20px',
            margin: '0 0 16px',
          }}
        >
          <Text style={{ ...s.text, fontWeight: 700, margin: '0 0 4px' }}>Pick up from our store</Text>
          <Text style={{ ...s.text, margin: '0 0 4px' }}>{STORE_LOCATION.addressEn}</Text>
          <Text style={{ ...s.muted, margin: '0 0 12px' }}>{STORE_LOCATION.hoursEn}</Text>
          <Button href={STORE_LOCATION.mapsLink} style={s.button}>
            Open in Google Maps
          </Button>
        </Section>
      )}

      {trackUrl && (
        <Text style={s.text}>
          Track your order:{' '}
          <Link href={trackUrl} style={{ color: s.NAVY, fontWeight: 700 }}>
            view order status
          </Link>
        </Text>
      )}

      <Hr style={s.hr} />

      <Text style={s.muted}>
        Questions about your order? Just reply to this email and we&apos;ll help.
      </Text>
    </Layout>
  );
}
