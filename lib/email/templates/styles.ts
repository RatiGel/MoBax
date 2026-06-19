import type { CSSProperties } from 'react';

/** Shared MoBax email styling tokens. Navy #1E2D5A + amber #F5A623. */
export const NAVY = '#1E2D5A';
export const AMBER = '#F5A623';

export const main: CSSProperties = {
  backgroundColor: '#f4f4f7',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '24px 0',
};

export const container: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  margin: '0 auto',
  maxWidth: 560,
  overflow: 'hidden',
};

export const header: CSSProperties = {
  backgroundColor: NAVY,
  padding: '24px 32px',
};

export const brand: CSSProperties = {
  color: '#ffffff',
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: '0.5px',
  margin: 0,
};

export const body: CSSProperties = {
  padding: '32px',
};

export const heading: CSSProperties = {
  color: NAVY,
  fontSize: 20,
  fontWeight: 700,
  margin: '0 0 16px',
};

export const text: CSSProperties = {
  color: '#3c4257',
  fontSize: 15,
  lineHeight: '24px',
  margin: '0 0 16px',
};

export const muted: CSSProperties = {
  color: '#8898aa',
  fontSize: 13,
  lineHeight: '20px',
  margin: '0 0 8px',
};

export const button: CSSProperties = {
  backgroundColor: AMBER,
  borderRadius: 6,
  color: NAVY,
  display: 'inline-block',
  fontSize: 15,
  fontWeight: 700,
  padding: '12px 24px',
  textDecoration: 'none',
};

export const hr: CSSProperties = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
};

export const footer: CSSProperties = {
  color: '#8898aa',
  fontSize: 12,
  lineHeight: '18px',
  padding: '0 32px 32px',
  textAlign: 'center' as const,
};
