import { Body, Container, Head, Html, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';
import * as s from './styles';

interface LayoutProps {
  preview?: string;
  children: ReactNode;
}

/** Branded wrapper shared by all MoBax emails. */
export function Layout({ children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.header}>
            <Text style={s.brand}>MoBax</Text>
          </Section>
          <Section style={s.body}>{children}</Section>
        </Container>
        <Text style={s.footer}>
          MoBax — Mobile accessories for Georgia
          <br />
          You received this email because of activity on your MoBax account.
        </Text>
      </Body>
    </Html>
  );
}
