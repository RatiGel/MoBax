/**
 * Physical MOBAX store — single source for the pickup address, opening hours,
 * and the map query, so the checkout pickup card and the post-payment order
 * confirmation always show the same place and the dropped pin matches the link.
 */
export const STORE_LOCATION = {
  addressEn: '33 Ilia Vekua Street, Gldani, Tbilisi',
  addressKa: 'ილია ვეკუას ქუჩა 33, გლდანი, თბილისი',
  hoursEn: 'Open every day 11:00–20:00, except Sundays',
  hoursKa: 'ღიაა ყოველდღე 11:00–20:00, კვირის გარდა',
  // Pinned embed for the MOBAX place (from Google Maps "share → embed").
  embedSrc:
    'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d4818.313510523969!2d44.817771!3d41.792753!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40446d0060083acf%3A0x7925389d80f40bdd!2sMOBAX%20-%20phone%20accessories!5e1!3m2!1sen!2sge!4v1783374630976!5m2!1sen!2sge',
  // "Open in Maps" → same place by lat/lng so it matches the embedded pin.
  mapsLink: 'https://www.google.com/maps/search/?api=1&query=41.792753,44.817771',
} as const;
