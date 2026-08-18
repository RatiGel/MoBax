'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import {
  Lock,
  ShieldCheck,
  RotateCcw,
  Truck,
  Headset,
  Store,
  Zap,
  Clock,
  MapPin,
  Check,
  ExternalLink,
  Info,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { STORE_LOCATION } from '@/lib/store-location';
import {
  CITIES,
  getDeliveryFee,
  getDeliveryMethods,
  isInstantAvailable,
  type DeliveryMethod,
} from '@/lib/shipping';

const METHOD_ICONS: Record<DeliveryMethod, typeof Store> = {
  pickup: Store,
  instant: Zap,
  nextday: Clock,
  regional: MapPin,
};

// Shared section-card shell — thick title bar in its own row like the reference.
// Defined at module scope (NOT inside the page component): a component created
// on every render is a new type each time, so React remounts its whole subtree
// and any focused input loses focus after one keystroke.
function SectionCard({
  title,
  children,
  muted,
}: {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
      <header className="border-b border-border-light px-6 py-5 dark:border-border-dark sm:px-8">
        <h2
          className={`font-display font-semibold tracking-display text-xl ${
            muted ? 'text-graphite' : 'text-ink dark:text-white'
          }`}
        >
          {title}
        </h2>
      </header>
      <div className="px-6 py-6 sm:px-8">{children}</div>
    </section>
  );
}

export default function CheckoutPage() {
  const locale = useLocale();
  const isKa = locale === 'ka';
  const t = useTranslations('checkout');
  const { data: session } = useSession();
  const { items, getTotal, clearCart, removeItem } = useCartStore();

  const subtotal = getTotal();

  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: session?.user?.email ?? '', phone: '',
    address: '', city: '', regionName: '', idNumber: '', country: 'Georgia',
  });
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const instantOk = isInstantAvailable(new Date());
  const availableMethods = useMemo<DeliveryMethod[]>(
    () => (form.city ? getDeliveryMethods(form.city) : []),
    [form.city]
  );

  const methodUsable =
    deliveryMethod !== null &&
    availableMethods.includes(deliveryMethod) &&
    (deliveryMethod !== 'instant' || instantOk);
  const effectiveMethod: DeliveryMethod | null = methodUsable ? deliveryMethod : null;

  const shippingCost = effectiveMethod ? getDeliveryFee(effectiveMethod, form.city, subtotal) : 0;
  // Two money channels: gateway charges the product subtotal online now; any
  // shipping fee is collected in cash by the courier on delivery.
  const payNow = subtotal;
  const payCourier = shippingCost;
  const orderValue = subtotal + shippingCost;

  // Total pre-discount ("Total cost") vs discounted ("Order Total") from
  // originalPrice, so the summary can show a "Total discount" line like the ref.
  const totalCost = items.reduce(
    (sum, i) => sum + (i.product.originalPrice ?? i.product.price) * i.quantity,
    0
  );
  const totalDiscount = totalCost - subtotal;

  const methodLabel: Record<DeliveryMethod, string> = {
    pickup: t('methodPickup'),
    instant: t('methodInstant'),
    nextday: t('methodNextday'),
    regional: t('methodRegional'),
  };
  const methodEta: Record<DeliveryMethod, string> = {
    pickup: t('methodPickupEta'),
    instant: t('methodInstantEta'),
    nextday: t('methodNextdayEta'),
    regional: t('methodRegionalEta'),
  };

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function selectCity(value: string) {
    update('city', value);
    if (value !== 'other') setForm((prev) => ({ ...prev, regionName: '' }));
    setDeliveryMethod(null);
  }

  // Prefill from the signed-in user's saved profile address (one-time).
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account/profile');
        if (!res.ok) return;
        const data = await res.json();
        const a = data.address;
        if (!a || cancelled) return;
        const knownCity = CITIES.some((c) => c.value === a.city) ? a.city : '';
        setForm((prev) => ({
          ...prev,
          firstName: prev.firstName || a.firstName || '',
          lastName: prev.lastName || a.lastName || '',
          phone: prev.phone || a.phone || '',
          address: prev.address || a.address || '',
          city: prev.city || knownCity,
          regionName: prev.regionName || a.regionName || '',
          idNumber: prev.idNumber || a.idNumber || '',
          country: prev.country || a.country || 'Georgia',
        }));
      } catch {
        // Non-fatal: checkout works without prefill.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t('errFirstName');
    if (!form.lastName.trim()) errs.lastName = t('errLastName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('errEmail');
    if (!form.phone.trim()) errs.phone = t('errPhone');
    if (!form.address.trim()) errs.address = t('errAddress');
    if (!form.idNumber.trim()) errs.idNumber = t('errIdNumber');
    if (!form.city) errs.city = t('errCitySelect');
    if (!methodUsable) errs.deliveryMethod = t('errDeliveryMethod');
    if (form.city === 'other' && effectiveMethod === 'regional' && !form.regionName.trim()) {
      errs.regionName = t('errRegionName');
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = ['firstName', 'lastName', 'email', 'phone', 'address', 'idNumber', 'city'].find((f) => errs[f]);
      if (first) document.getElementById(`field-${first}`)?.focus();
      return false;
    }
    return true;
  }

  async function handlePlaceOrder() {
    if (submitting) return;
    if (!validate() || !effectiveMethod) return;
    setSubmitting(true);
    setPayError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          address: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            regionName: form.regionName,
            idNumber: form.idNumber,
            country: form.country,
          },
          guestEmail: form.email,
          paymentMethod: 'FLITT',
          deliveryMethod: effectiveMethod,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPayError(data?.error || 'Could not place order. Please try again.');
        return;
      }
      if (data?.paymentError) {
        setPayError(data.paymentError);
        return;
      }
      if (data?.payment?.redirectUrl) {
        clearCart();
        window.location.href = data.payment.redirectUrl as string;
        return;
      }
      setPayError('Payment could not be started. Please try again.');
    } catch {
      setPayError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-graphite mb-4">{isKa ? 'კალათა ცარიელია' : 'No items in cart'}</p>
        <Button className="rounded-full font-semibold" asChild>
          <Link href={`/${locale}/products`}>{isKa ? 'მაღაზია' : 'Shop now'}</Link>
        </Button>
      </div>
    );
  }

  const fields = [
    { field: 'firstName', label: t('firstName'), autoComplete: 'given-name' },
    { field: 'lastName', label: t('lastName'), autoComplete: 'family-name' },
    { field: 'phone', label: t('phone'), type: 'tel', inputMode: 'tel' as const, autoComplete: 'tel', placeholder: t('placeholderPhone') },
    { field: 'email', label: t('email'), type: 'email', inputMode: 'email' as const, autoComplete: 'email', placeholder: t('placeholderEmail') },
    { field: 'address', label: t('address'), colSpan: true, autoComplete: 'street-address' },
    { field: 'idNumber', label: t('idNumber'), inputMode: 'numeric' as const, autoComplete: 'off' },
  ];

  const trustItems = [
    { icon: ShieldCheck, label: t('trustSsl') },
    { icon: RotateCcw, label: t('trustReturns') },
    { icon: Truck, label: t('trustDelivery') },
    { icon: Headset, label: t('trustSupport') },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 pb-28 lg:pb-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEFT — form column */}
        <div className="space-y-6 lg:col-span-3">
          {/* Header banner card (kontakt: "Checkout order" in its own bar) */}
          <div className="rounded-2xl border border-border-light bg-surface-light px-6 py-6 dark:border-border-dark dark:bg-surface-dark sm:px-8">
            <h1 className="font-display font-semibold tracking-display text-2xl text-ink dark:text-white">
              {t('checkoutOrder')}
            </h1>
          </div>

          {/* Shipping Address */}
          <SectionCard title={t('stepAddress')}>
            {!session && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cloud-light px-4 py-3 dark:bg-cloud-dark">
                <p className="text-sm text-graphite">{t('loginPrompt')}</p>
                <Link
                  href={`/${locale}/login?callbackUrl=/${locale}/checkout`}
                  className="text-sm font-semibold text-amber-ink hover:underline"
                >
                  {t('signIn')}
                </Link>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ field, label, colSpan, type, inputMode, autoComplete, placeholder }) => (
                <div key={field} className={colSpan ? 'col-span-2' : ''}>
                  <Label htmlFor={`field-${field}`} className="mb-1.5 block text-graphite">
                    {label}
                  </Label>
                  <Input
                    id={`field-${field}`}
                    type={type ?? 'text'}
                    inputMode={inputMode}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => update(field, e.target.value)}
                    aria-invalid={!!errors[field]}
                    aria-describedby={errors[field] ? `err-${field}` : undefined}
                    className={`rounded-xl ${errors[field] ? 'border-error focus-visible:ring-error' : ''}`}
                  />
                  {errors[field] && (
                    <p id={`err-${field}`} role="alert" className="mt-1 text-xs text-error">
                      {errors[field]}
                    </p>
                  )}
                </div>
              ))}

              <div className="col-span-2">
                <Label htmlFor="field-city" className="mb-1.5 block text-graphite">
                  {t('cityLabel')}
                </Label>
                <Select value={form.city} onValueChange={selectCity}>
                  <SelectTrigger
                    id="field-city"
                    aria-invalid={!!errors.city}
                    className={`rounded-xl ${errors.city ? 'border-error focus:ring-error' : ''}`}
                  >
                    <SelectValue placeholder={t('selectCity')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {isKa ? c.labelKa : c.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && <p role="alert" className="mt-1 text-xs text-error">{errors.city}</p>}
              </div>

              {form.city === 'other' && (
                <div className="col-span-2">
                  <Label htmlFor="field-regionName" className="mb-1.5 block text-graphite">
                    {t('regionNameLabel')}
                  </Label>
                  <Input
                    id="field-regionName"
                    type="text"
                    placeholder={t('regionNamePlaceholder')}
                    value={form.regionName}
                    onChange={(e) => update('regionName', e.target.value)}
                    aria-invalid={!!errors.regionName}
                    aria-describedby={errors.regionName ? 'err-regionName' : undefined}
                    className={`rounded-xl ${errors.regionName ? 'border-error focus-visible:ring-error' : ''}`}
                  />
                  {errors.regionName && (
                    <p id="err-regionName" role="alert" className="mt-1 text-xs text-error">
                      {errors.regionName}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Delivery */}
          <SectionCard title={t('deliveryMethod')} muted={!form.city}>
            {!form.city ? (
              <p className="text-sm text-graphite">{t('chooseCityForDelivery')}</p>
            ) : (
              <>
                <div className="space-y-3" role="radiogroup" aria-label={t('deliveryMethod')}>
                  {availableMethods.map((m) => {
                    const Icon = METHOD_ICONS[m];
                    const fee = getDeliveryFee(m, form.city, subtotal);
                    const disabled = m === 'instant' && !instantOk;
                    const selected = effectiveMethod === m && !disabled;
                    return (
                      <div key={m}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={disabled}
                          onClick={() => {
                            setDeliveryMethod(m);
                            setErrors((p) => ({ ...p, deliveryMethod: '' }));
                          }}
                          className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition
                            ${selected
                              ? 'border-cobalt bg-cobalt-soft ring-1 ring-cobalt dark:bg-cloud-dark'
                              : 'border-border-light hover:border-cobalt/50 dark:border-border-dark'}
                            ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${selected ? 'signal-fill' : 'bg-raised-light text-graphite dark:bg-raised-dark'}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-ink dark:text-white">{methodLabel[m]}</span>
                            <span className="block text-xs text-graphite">{methodEta[m]}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className={`font-semibold tabular-nums ${fee === 0 ? 'text-success' : 'text-ink dark:text-white'}`}>
                              {fee === 0 ? t('free') : formatPrice(fee)}
                            </span>
                            {selected && <Check className="h-4 w-4 text-amber-ink" />}
                          </span>
                        </button>
                        {m === 'instant' && (
                          <p className={`mt-1.5 px-1 text-[11px] ${disabled ? 'text-error' : 'text-graphite'}`}>
                            {disabled ? t('methodInstantUnavailable') : t('methodInstantNote')}
                          </p>
                        )}

                        {m === 'pickup' && selected && (
                          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-border-light p-4 dark:border-border-dark">
                            <div className="flex items-start gap-3">
                              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-ink" />
                              <div>
                                <p className="font-medium text-ink dark:text-white">{t('storeAddressTitle')}</p>
                                <p className="text-sm text-graphite">{isKa ? STORE_LOCATION.addressKa : STORE_LOCATION.addressEn}</p>
                                <p className="mt-1 text-[11px] text-error">{isKa ? STORE_LOCATION.hoursKa : STORE_LOCATION.hoursEn}</p>
                              </div>
                            </div>
                            <a
                              href={STORE_LOCATION.mapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-ink hover:underline"
                            >
                              {t('openInMaps')}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {errors.deliveryMethod && (
                  <p role="alert" className="mt-2 text-xs text-error">{errors.deliveryMethod}</p>
                )}
              </>
            )}
          </SectionCard>

          {/* Trust strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl border border-border-light px-3 py-2.5 dark:border-border-dark">
                <Icon className="h-4 w-4 shrink-0 text-amber-ink" />
                <span className="text-[11px] leading-tight text-graphite">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — sticky Products summary */}
        <div className="lg:col-span-2">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
              {/* Products header w/ count */}
              <div className="flex items-center justify-between border-b border-border-light px-6 py-5 dark:border-border-dark">
                <h2 className="font-display font-semibold tracking-display text-xl text-ink dark:text-white">
                  {t('products')}
                </h2>
                <span className="text-lg font-semibold text-ink dark:text-white tabular-nums">{items.length}</span>
              </div>

              {/* Line items */}
              <div className="divide-y divide-border-light px-6 dark:divide-border-dark">
                {items.map((item) => {
                  const name = isKa ? item.product.nameKa : item.product.nameEn;
                  const hasDiscount =
                    item.product.originalPrice && item.product.originalPrice > item.product.price;
                  return (
                    <div key={item.product.id} className="flex items-center gap-3 py-4">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cloud-light dark:bg-cloud-dark">
                        <Image src={item.product.images[0]} alt={name} fill className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-medium text-ink dark:text-white">{name}</p>
                        <p className="text-xs text-graphite">
                          {t(item.quantity === 1 ? 'itemCount' : 'itemCountPlural', { count: item.quantity })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {hasDiscount && (
                          <span className="block text-xs text-graphite line-through tabular-nums">
                            {formatPrice(item.product.originalPrice! * item.quantity)}
                          </span>
                        )}
                        <span className="font-semibold text-amber-ink tabular-nums">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        aria-label={isKa ? 'წაშლა' : 'Remove'}
                        title={isKa ? 'წაშლა' : 'Remove'}
                        className="shrink-0 rounded-full p-1.5 text-graphite transition-colors hover:bg-error/10 hover:text-error"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t border-border-light bg-cloud-light/40 px-6 py-5 text-sm dark:border-border-dark dark:bg-cloud-dark/30">
                <div className="flex justify-between">
                  <span className="text-graphite">{t('totalCost')}:</span>
                  <span className="text-ink dark:text-white tabular-nums">{formatPrice(totalCost)}</span>
                </div>
                {effectiveMethod && (
                  <div className="flex justify-between">
                    <span className="text-graphite">
                      {t('deliveryCost')}
                      <span className="block text-[11px] text-graphite/80">{methodLabel[effectiveMethod]}</span>
                    </span>
                    <span className={`tabular-nums ${shippingCost === 0 ? 'font-medium text-success' : 'text-ink dark:text-white'}`}>
                      {shippingCost === 0 ? t('free') : formatPrice(shippingCost)}
                    </span>
                  </div>
                )}
                {totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-graphite">{t('totalDiscount')}:</span>
                    <span className="font-medium text-error tabular-nums">-{formatPrice(totalDiscount)}</span>
                  </div>
                )}
                <div className="mt-2 flex items-baseline justify-between border-t border-border-light pt-3 dark:border-border-dark">
                  <span className="font-bold text-ink dark:text-white">{t('orderTotal')}</span>
                  <span className="text-lg font-bold text-ink dark:text-white tabular-nums">{formatPrice(orderValue)}</span>
                </div>
              </div>

              {/* Two money channels — kept explicit (pay now vs courier cash) */}
              {shippingCost > 0 && (
                <div className="space-y-2 border-t border-border-light px-6 py-4 dark:border-border-dark">
                  <div className="flex items-baseline justify-between rounded-xl border border-cobalt/20 bg-cobalt-soft px-3 py-2.5 dark:bg-cloud-dark">
                    <span className="text-sm font-bold text-ink dark:text-white">{t('payNowLabel')}</span>
                    <span className="text-base font-bold text-amber-ink tabular-nums">{formatPrice(payNow)}</span>
                  </div>
                  <div className="flex items-baseline justify-between px-3">
                    <span className="text-xs text-graphite">{t('payCourierLabel')}</span>
                    <span className="text-sm font-semibold text-ink dark:text-white tabular-nums">{formatPrice(payCourier)}</span>
                  </div>
                </div>
              )}
            </div>

            {payError && (
              <p role="alert" className="rounded-xl border border-error/40 bg-error/10 p-3 text-sm text-error">
                {payError}
              </p>
            )}

            {/* Place order */}
            <div className="hidden lg:block">
              <Button
                className="w-full rounded-full font-semibold"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={submitting}
              >
                <Lock className="mr-2 h-4 w-4" />
                {submitting ? t('redirecting') : t('placeOrder')}
              </Button>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-graphite">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t('placeOrderConsent')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky pay bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-light bg-surface-light/95 px-4 py-3 backdrop-blur dark:border-border-dark dark:bg-surface-dark/95 lg:hidden">
        {/* The order-placing action carries the signal — it is the end of the
            checkout spine (design principle #3). */}
        <Button variant="accent" className="w-full font-semibold" size="lg" onClick={handlePlaceOrder} disabled={submitting}>
          <Lock className="mr-2 h-4 w-4" />
          {submitting ? t('redirecting') : `${t('placeOrder')} · ${formatPrice(payNow)}`}
        </Button>
      </div>
    </div>
  );
}
