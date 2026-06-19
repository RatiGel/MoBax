import { Heading, Hr, Section, Text } from '@react-email/components';
import { Layout } from './Layout';
import * as s from './styles';

export interface OrderConfirmationItem {
  nameSnapshot: string;
  quantity: number;
  priceSnapshot: number;
}

export interface OrderConfirmationProps {
  orderNumber: string;
  customerName: string;
  items: OrderConfirmationItem[];
  total: number;
}

export default function OrderConfirmation({
  orderNumber,
  customerName,
  items,
  total,
}: OrderConfirmationProps) {
  return (
    <Layout preview={`Order ${orderNumber} confirmed`}>
      <Heading style={s.heading}>Thanks for your order, {customerName}!</Heading>
      <Text style={s.text}>
        We&apos;ve received your order and are getting it ready. Your order number is{' '}
        <strong>{orderNumber}</strong>.
      </Text>

      <Hr style={s.hr} />

      <Section>
        {items.map((item, i) => (
          <Text key={i} style={s.text}>
            {item.quantity} × {item.nameSnapshot} —{' '}
            <strong>${(item.priceSnapshot * item.quantity).toFixed(2)}</strong>
          </Text>
        ))}
      </Section>

      <Hr style={s.hr} />

      <Text style={{ ...s.text, fontSize: 17 }}>
        Total: <strong>${total.toFixed(2)}</strong>
      </Text>

      <Text style={s.muted}>
        We&apos;ll send another email once your order ships.
      </Text>
    </Layout>
  );
}
