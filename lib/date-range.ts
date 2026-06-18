/** Parse analytics date-range query params into {from,to}. Supports range presets + custom. */
export function parseDateRange(searchParams: URLSearchParams): { from: Date; to: Date } {
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  if (fromParam && toParam) {
    return { from: new Date(fromParam), to: endOfDay(new Date(toParam)) };
  }
  const range = searchParams.get('range') || '30d';
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const to = endOfDay(new Date());
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
