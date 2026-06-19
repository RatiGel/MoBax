import { Heading, Text } from '@react-email/components';
import { Layout } from './Layout';
import * as s from './styles';

export interface OrderDeliveredProps {
  orderNumber: string;
}

export default function OrderDelivered({ orderNumber }: OrderDeliveredProps) {
  return (
    <Layout preview={`Order ${orderNumber} delivered`}>
      <Heading style={s.heading}>Your order has been delivered</Heading>
      <Text style={s.text}>
        Order <strong>{orderNumber}</strong> has been marked as delivered. We hope you love
        your new accessories!
      </Text>
      <Text style={s.muted}>
        If anything isn&apos;t right, just reply to this email and we&apos;ll help out.
      </Text>
    </Layout>
  );
}
