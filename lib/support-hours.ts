export const SUPPORT_TIMEZONE = 'Asia/Tbilisi';
export const SUPPORT_OPEN_HOUR = 11;
export const SUPPORT_CLOSE_HOUR = 20; // exclusive

/**
 * True when store support staff are considered online:
 * Monday–Saturday, [11:00, 20:00) in Asia/Tbilisi. Always compute on the
 * server — never trust the client clock.
 */
export function isSupportOnline(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SUPPORT_TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);

  if (weekday === 'Sun' || Number.isNaN(hour)) return false;
  return hour >= SUPPORT_OPEN_HOUR && hour < SUPPORT_CLOSE_HOUR;
}
