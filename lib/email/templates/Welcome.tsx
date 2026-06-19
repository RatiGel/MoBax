import { Button, Heading, Text } from '@react-email/components';
import { Layout } from './Layout';
import * as s from './styles';

export interface WelcomeProps {
  firstName: string;
}

export default function Welcome({ firstName }: WelcomeProps) {
  const shopUrl = process.env.NEXTAUTH_URL || 'https://mobax.ge';
  return (
    <Layout preview="Welcome to MoBax">
      <Heading style={s.heading}>Welcome to MoBax, {firstName}!</Heading>
      <Text style={s.text}>
        Thanks for creating an account. You&apos;re all set to explore our collection of
        mobile accessories — cases, chargers, screen protectors and more.
      </Text>
      <Button style={s.button} href={shopUrl}>
        Start shopping
      </Button>
      <Text style={{ ...s.muted, marginTop: 24 }}>
        Happy shopping,
        <br />
        The MoBax team
      </Text>
    </Layout>
  );
}
