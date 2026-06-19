'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/admin-fetch';
import { toast } from 'sonner';

// Setting keys mirror SETTING_KEYS in models/Setting.ts.
const KEYS = {
  STORE_INFO: 'store_info',
  SHIPPING: 'shipping',
  TAX: 'tax',
  NOTIFICATIONS: 'notifications',
} as const;

// --- Per-slice shapes + sensible defaults (used when a key is absent) ---

interface StoreInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}
const STORE_INFO_DEFAULT: StoreInfo = { name: '', email: '', phone: '', address: '' };

interface Shipping {
  flatRate: number;
  freeShippingThreshold: number;
  tbilisiOnlyCod: boolean;
}
const SHIPPING_DEFAULT: Shipping = {
  flatRate: 0,
  freeShippingThreshold: 0,
  tbilisiOnlyCod: false,
};

interface Tax {
  ratePercent: number;
  includedInPrice: boolean;
}
const TAX_DEFAULT: Tax = { ratePercent: 0, includedInPrice: false };

interface Notifications {
  adminEmail: string;
  lowStockThreshold: number;
}
const NOTIFICATIONS_DEFAULT: Notifications = { adminEmail: '', lowStockThreshold: 5 };

type SettingsMap = Record<string, unknown>;

// Merge a stored value (unknown JSON blob) over the slice defaults.
function withDefaults<T extends object>(value: unknown, defaults: T): T {
  if (value && typeof value === 'object') {
    return { ...defaults, ...(value as Partial<T>) };
  }
  return { ...defaults };
}

export function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [storeInfo, setStoreInfo] = useState<StoreInfo>(STORE_INFO_DEFAULT);
  const [shipping, setShipping] = useState<Shipping>(SHIPPING_DEFAULT);
  const [tax, setTax] = useState<Tax>(TAX_DEFAULT);
  const [notifications, setNotifications] = useState<Notifications>(NOTIFICATIONS_DEFAULT);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ settings: SettingsMap }>('/api/admin/settings');
      const m = data.settings ?? {};
      setStoreInfo(withDefaults(m[KEYS.STORE_INFO], STORE_INFO_DEFAULT));
      setShipping(withDefaults(m[KEYS.SHIPPING], SHIPPING_DEFAULT));
      setTax(withDefaults(m[KEYS.TAX], TAX_DEFAULT));
      setNotifications(withDefaults(m[KEYS.NOTIFICATIONS], NOTIFICATIONS_DEFAULT));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Each tab saves only its own slice via a partial PATCH map.
  async function saveSlice(key: string, value: unknown, label: string) {
    setSaving(true);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: value }),
      });
      toast.success(`${label} saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Settings" description="Store configuration." />
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Store, shipping, tax, and notification configuration." />

      <Tabs defaultValue="store">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="store">Store info</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Store info */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Store info</CardTitle>
              <CardDescription>Contact details shown across the storefront.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Store name</Label>
                  <Input
                    value={storeInfo.name}
                    onChange={(e) => setStoreInfo((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={storeInfo.email}
                    onChange={(e) => setStoreInfo((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={storeInfo.phone}
                    onChange={(e) => setStoreInfo((s) => ({ ...s, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea
                  rows={2}
                  value={storeInfo.address}
                  onChange={(e) => setStoreInfo((s) => ({ ...s, address: e.target.value }))}
                />
              </div>
              <SaveBar
                saving={saving}
                onSave={() => saveSlice(KEYS.STORE_INFO, storeInfo, 'Store info')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping */}
        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
              <CardDescription>Delivery rates and cash-on-delivery rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Flat rate (₾)</Label>
                  <Input
                    type="number"
                    value={shipping.flatRate}
                    onChange={(e) =>
                      setShipping((s) => ({ ...s, flatRate: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Free shipping threshold (₾)</Label>
                  <Input
                    type="number"
                    value={shipping.freeShippingThreshold}
                    onChange={(e) =>
                      setShipping((s) => ({
                        ...s,
                        freeShippingThreshold: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cash on delivery — Tbilisi only</Label>
                  <p className="text-xs text-neutral-500">Restrict COD to Tbilisi addresses.</p>
                </div>
                <Switch
                  checked={shipping.tbilisiOnlyCod}
                  onCheckedChange={(v) => setShipping((s) => ({ ...s, tbilisiOnlyCod: v }))}
                />
              </div>
              <SaveBar
                saving={saving}
                onSave={() => saveSlice(KEYS.SHIPPING, shipping, 'Shipping')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle>Tax</CardTitle>
              <CardDescription>VAT rate and pricing behaviour.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5 sm:max-w-xs">
                <Label>Tax rate (%)</Label>
                <Input
                  type="number"
                  value={tax.ratePercent}
                  onChange={(e) => setTax((t) => ({ ...t, ratePercent: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Tax included in price</Label>
                  <p className="text-xs text-neutral-500">
                    Product prices already include tax.
                  </p>
                </div>
                <Switch
                  checked={tax.includedInPrice}
                  onCheckedChange={(v) => setTax((t) => ({ ...t, includedInPrice: v }))}
                />
              </div>
              <SaveBar saving={saving} onSave={() => saveSlice(KEYS.TAX, tax, 'Tax')} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Where alerts go and when to flag low stock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Admin email</Label>
                  <Input
                    type="email"
                    value={notifications.adminEmail}
                    onChange={(e) =>
                      setNotifications((n) => ({ ...n, adminEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Low stock threshold</Label>
                  <Input
                    type="number"
                    value={notifications.lowStockThreshold}
                    onChange={(e) =>
                      setNotifications((n) => ({
                        ...n,
                        lowStockThreshold: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <SaveBar
                saving={saving}
                onSave={() => saveSlice(KEYS.NOTIFICATIONS, notifications, 'Notifications')}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <Button className="gap-1" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save
      </Button>
    </div>
  );
}
