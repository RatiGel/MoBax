import { Heading, Text } from '@react-email/components';
import { Layout } from './Layout';
import * as s from './styles';

export interface OrderShippedProps {
  orderNumber: string;
  trackingNumber?: string;
}

export default function OrderShipped({ orderNumber, trackingNumber }: OrderShippedProps) {
  return (
    <Layout preview={`Order ${orderNumber} has shipped`}>
      <Heading style={s.heading}>Your order is on its way!</Heading>
      <Text style={s.text}>
        Good news — order <strong>{orderNumber}</strong> has shipped and is heading your
        way.
      </Text>
      {trackingNumber ? (
        <Text style={s.text}>
          Tracking number: <strong>{trackingNumber}</strong>
        </Text>
      ) : (
        <Text style={s.muted}>
          A tracking number will follow shortly if available.
        </Text>
      )}
      <Text style={s.muted}>Thank you for shopping with MoBax.</Text>
    </Layout>
  );
}
