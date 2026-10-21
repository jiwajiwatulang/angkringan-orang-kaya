export type DashboardRange = 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth';

export function localDateKey(value: Date | string) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dashboardPeriod(range: DashboardRange, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start); end.setDate(end.getDate() + 1);
  if (range === 'yesterday') { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
  if (range === '7days' || range === '30days') start.setDate(start.getDate() - (range === '7days' ? 6 : 29));
  if (range === 'thisMonth') start.setDate(1);
  const previousEnd = new Date(start);
  const previousStart = new Date(start);
  if (range === 'thisMonth') previousStart.setMonth(previousStart.getMonth() - 1);
  else previousStart.setDate(previousStart.getDate() - (range === '7days' ? 7 : range === '30days' ? 30 : 1));
  return { start, end, previousStart, previousEnd };
}

export function selectDashboardOrders(orders: any[], range: DashboardRange, now = new Date()) {
  const period = dashboardPeriod(range, now);
  const valid = orders.filter(o => o.status === 'paid' && !o.isRefunded);
  const between = (start: Date, end: Date) => valid.filter(o => {
    const date = new Date(o.createdAt || o.created_at).getTime();
    return date >= start.getTime() && date < end.getTime();
  });
  return { currentOrders: between(period.start, period.end), previousOrders: between(period.previousStart, period.previousEnd) };
}

export function buildSalesSeries(orders: any[], range: DashboardRange, now = new Date()) {
  const { start, end } = dashboardPeriod(range, now);
  const result = [];
  const hourly = range === 'today' || range === 'yesterday';
  for (const cursor = new Date(start); cursor < end;) {
    const bucketStart = new Date(cursor);
    if (hourly) cursor.setHours(cursor.getHours() + 2); else cursor.setDate(cursor.getDate() + 1);
    const matching = orders.filter(o => { const t = new Date(o.createdAt || o.created_at).getTime(); return t >= bucketStart.getTime() && t < cursor.getTime(); });
    const label = hourly ? `${String(bucketStart.getHours()).padStart(2, '0')}:00` : bucketStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    result.push({ label, sublabel: hourly ? `${label}–${String(cursor.getHours()).padStart(2, '0')}:00` : bucketStart.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }), omzet: matching.reduce((sum, o) => sum + (o.total || 0), 0), count: matching.length });
  }
  return result;
}

export * from './financialEngine';
