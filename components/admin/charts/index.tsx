'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Recharts needs concrete color strings (SVG stroke/fill), not Tailwind classes,
 * so we read the live brand CSS-var channels at runtime. This keeps charts in
 * sync with the admin Theme colors and the light/dark toggle. Falls back to the
 * static brand values during SSR / before mount.
 */
function useBrandColors() {
  const [colors, setColors] = useState({
    primary: '#1E2D5A',
    accent: '#2E5BFF',
    grid: '#E5E7EB',
  });
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const ch = (name: string, fallback: string) => {
        const v = cs.getPropertyValue(name).trim();
        return v ? `rgb(${v})` : fallback;
      };
      const dark = document.documentElement.classList.contains('dark');
      setColors({
        primary: ch('--primary', '#1E2D5A'),
        accent: ch('--cobalt', '#2E5BFF'),
        grid: dark ? '#262629' : '#E5E7EB',
      });
    };
    read();
    // Re-read when the theme class flips (light/dark toggle).
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return colors;
}

// Order-status colour map (donut)
export const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94A3B8',
  CONFIRMED: '#3B82F6',
  PROCESSING: '#6366F1',
  SHIPPED: '#0EA5E9',
  DELIVERED: '#16A34A',
  CANCELLED: '#DC2626',
  REFUNDED: '#F59E0B',
};

function ChartShell({
  title,
  loading,
  empty,
  children,
}: {
  title: string;
  loading?: boolean;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : empty ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-neutral-400">
            No data for this range
          </div>
        ) : (
          <div className="h-[260px] w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  backgroundColor: 'var(--surface, #fff)',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 12,
};

export function RevenueAreaChart({
  data,
  loading,
}: {
  data: { period: string; revenue: number; orders: number }[];
  loading?: boolean;
}) {
  const { accent, grid } = useBrandColors();
  return (
    <ChartShell title="Revenue over time" loading={loading} empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accent} stopOpacity={0.4} />
              <stop offset="95%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94A3B8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" width={48} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [`₾${Number(v).toFixed(2)}`, 'Revenue']}
          />
          <Area type="monotone" dataKey="revenue" stroke={accent} strokeWidth={2} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function OrdersDonutChart({
  data,
  loading,
}: {
  data: { status: string; count: number }[];
  loading?: boolean;
}) {
  const { primary } = useBrandColors();
  return (
    <ChartShell title="Orders by status" loading={loading} empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? primary} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function TopProductsBarChart({
  data,
  loading,
}: {
  data: { name: string; unitsSold: number }[];
  loading?: boolean;
}) {
  const { primary, grid } = useBrandColors();
  return (
    <ChartShell title="Top 10 selling products" loading={loading} empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94A3B8" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            stroke="#94A3B8"
            width={120}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Units sold']} />
          <Bar dataKey="unitsSold" fill={primary} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function CustomersLineChart({
  data,
  loading,
}: {
  data: { period: string; newCustomers: number; returningCustomers: number }[];
  loading?: boolean;
}) {
  const { primary, accent, grid } = useBrandColors();
  return (
    <ChartShell title="New vs returning customers" loading={loading} empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94A3B8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" width={36} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="newCustomers" name="New" stroke={accent} strokeWidth={2} dot={false} />
          <Line
            type="monotone"
            dataKey="returningCustomers"
            name="Returning"
            stroke={primary}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
