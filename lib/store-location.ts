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
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d739.4505030139288!2d44.81725649222725!3d41.79288076341631!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40446d0060083acf%3A0x7925389d80f40bdd!2sMOBAX%20-%20phone%20accessories!5e1!3m2!1sen!2sge!4v1788636153410!5m2!1sen!2sge',
  // "Open in Maps" → the MOBAX listing itself, by Google's cid (the place's
  // numeric id, 0x7925389d80f40bdd from the embed URL above, in decimal).
  // Searching the address text resolves to a neighbouring building, which is
  // why this is not an address query. Coordinates below are the same pin, kept
  // as the fallback link for anything that cannot follow a cid redirect.
  mapsLink: 'https://maps.google.com/?cid=8729445701852072925',
  /** Same pin by lat/lng — matches `embedSrc` exactly. */
  mapsLinkCoords:
    'https://www.google.com/maps/search/?api=1&query=41.79288076341631%2C44.81725649222725',
} as const;
