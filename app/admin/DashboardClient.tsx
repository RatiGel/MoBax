'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import {
  DateRangeFilter,
  rangeToQuery,
  type DateRangeValue,
} from '@/components/admin/DateRangeFilter';
import {
  RevenueAreaChart,
  OrdersDonutChart,
  TopProductsBarChart,
  CustomersLineChart,
} from '@/components/admin/charts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/admin-fetch';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

type Summary = { todayRevenue: number; todayOrders: number; totalProducts: number; lowStockCount: number };
type RevenuePoint = { period: string; revenue: number; orders: number };
type OrdersData = {
  byStatus: { status: string; count: number }[];
  newVsReturning: { period: string; newCustomers: number; returningCustomers: number }[];
};
type ProductsData = {
  topProducts: { productId: string; name: string; unitsSold: number; revenue: number }[];
  lowStock: { id: string; name: string; sku: string; stock: number }[];
};

export function DashboardClient() {
  const [range, setRange] = useState<DateRangeValue>({ preset: '30d' });
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [orders, setOrders] = useState<OrdersData | null>(null);
  const [products, setProducts] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);

  const q = rangeToQuery(range);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r, o, p] = await Promise.all([
        apiFetch<Summary>('/api/admin/analytics/summary'),
        apiFetch<RevenuePoint[]>(`/api/admin/analytics/revenue?${q}&granularity=${granularity}`),
        apiFetch<OrdersData>(`/api/admin/analytics/orders?${q}`),
        apiFetch<ProductsData>(`/api/admin/analytics/products?${q}`),
      ]);
      setSummary(s);
      setRevenue(r);
      setOrders(o);
      setProducts(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [q, granularity]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Dashboard" description="Store performance overview">
        <DateRangeFilter value={range} onChange={setRange} />
      </PageHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Today's revenue"
          value={summary ? formatPrice(summary.todayRevenue) : '—'}
          icon={DollarSign}
          loading={loading}
          accent
        />
        <StatCard
          label="Today's orders"
          value={summary?.todayOrders ?? '—'}
          icon={ShoppingCart}
          loading={loading}
        />
        <StatCard
          label="Total products"
          value={summary?.totalProducts ?? '—'}
          icon={Package}
          loading={loading}
        />
        <StatCard
          label="Low stock"
          value={summary?.lowStockCount ?? '—'}
          icon={AlertTriangle}
          hint="≤ 10 units"
          loading={loading}
        />
      </div>

      {/* Revenue + granularity toggle */}
      <div className="mb-6">
        <div className="flex justify-end mb-2">
          <Tabs value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <RevenueAreaChart data={revenue} loading={loading} />
      </div>

      {/* Donut + Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <OrdersDonutChart data={orders?.byStatus ?? []} loading={loading} />
        <CustomersLineChart data={orders?.newVsReturning ?? []} loading={loading} />
      </div>

      {/* Top products bar */}
      <div className="mb-6">
        <TopProductsBarChart data={products?.topProducts ?? []} loading={loading} />
      </div>

      {/* Low stock table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Low stock products</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !products?.lowStock.length ? (
            <p className="py-8 text-center text-sm text-neutral-400">All products well stocked 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.lowStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-neutral-500">{p.sku}</TableCell>
                    <TableCell>
                      <Badge variant={p.stock === 0 ? 'destructive' : 'secondary'}>
                        {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="link" size="sm">
                        <Link href={`/admin/products/${p.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
