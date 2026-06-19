import { Heading, Hr, Text } from '@react-email/components';
import { Layout } from './Layout';
import * as s from './styles';

export interface AdminNewOrderProps {
  orderNumber: string;
  total: number;
  customerEmail: string;
}

export default function AdminNewOrder({
  orderNumber,
  total,
  customerEmail,
}: AdminNewOrderProps) {
  return (
    <Layout preview={`New order ${orderNumber}`}>
      <Heading style={s.heading}>New order received</Heading>
      <Text style={s.text}>A new order has just come in.</Text>

      <Hr style={s.hr} />

      <Text style={s.text}>
        Order: <strong>{orderNumber}</strong>
      </Text>
      <Text style={s.text}>
        Customer: <strong>{customerEmail}</strong>
      </Text>
      <Text style={s.text}>
        Total: <strong>${total.toFixed(2)}</strong>
      </Text>

      <Text style={s.muted}>Open the admin dashboard to process this order.</Text>
    </Layout>
  );
}
