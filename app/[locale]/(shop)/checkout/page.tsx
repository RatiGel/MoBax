'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import {
  ChevronRight,
  Lock,
  ShieldCheck,
  RotateCcw,
  Truck,
  Headset,
  ChevronDown,
  Pencil,
  Store,
  Zap,
  Clock,
  MapPin,
  Check,
  ExternalLink,
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
import {
  CITIES,
  getDeliveryFee,
  getDeliveryMethods,
  getRegionForCity,
  isInstantAvailable,
  type DeliveryMethod,
} from '@/lib/shipping';

// Physical store for pickup orders. Single source for the address text and the
// map query so the printed line and the dropped pin always match.
const STORE = {
  addressEn: '33 Ilia Vekua Street, Gldani, Tbilisi',
  addressKa: 'ილია ვეკუას ქუჩა 33, გლდანი, თბილისი',
  // Pinned embed for the MOBAX place (from Google Maps "share → embed").
  embedSrc:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2409.1477238011676!2d44.81639263202476!3d41.792993290977975!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40446d0060083acf%3A0x7925389d80f40bdd!2sMOBAX%20-%20phone%20accessories!5e1!3m2!1sen!2sge!4v1782650527210!5m2!1sen!2sge',
  // "Open in Maps" → same place by lat/lng so it matches the embedded pin.
  mapsLink: 'https://www.google.com/maps/search/?api=1&query=41.792993290977975,44.81639263202476',
};

const METHOD_ICONS: Record<DeliveryMethod, typeof Store> = {
  pickup: Store,
  instant: Zap,
  nextday: Clock,
  regional: MapPin,
};

export default function CheckoutPage() {
  const locale = useLocale();
  const isKa = locale === 'ka';
  const t = useTranslations('checkout');
  const { data: session } = useSession();
  const { items, getTotal, clearCart } = useCartStore();

  const subtotal = getTotal();

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: session?.user?.email ?? '', phone: '',
    address: '', city: '', regionName: '', zipCode: '', country: 'Georgia',
  });
  // No default — the buyer must actively choose a delivery method.
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Region + available methods derive from the selected city. Instant is only
  // bookable inside its time window; computed once per render so the card state
  // and the fee stay in sync. (No live ticking — fine for a checkout session.)
  const region = form.city ? getRegionForCity(form.city) : null;
  const instantOk = isInstantAvailable(new Date());
  const availableMethods = useMemo<DeliveryMethod[]>(
    () => (region ? getDeliveryMethods(region) : ['pickup']),
    [region]
  );

  // A method is usable only once chosen, offered for the region, and (for
  // instant) inside its time window. No fallback — nothing is selected by default.
  const methodUsable =
    deliveryMethod !== null &&
    availableMethods.includes(deliveryMethod) &&
    (deliveryMethod !== 'instant' || instantOk);
  const effectiveMethod: DeliveryMethod | null = methodUsable ? deliveryMethod : null;

  const shippingCost = effectiveMethod ? getDeliveryFee(effectiveMethod, form.city) : 0;
  // Two distinct money channels: the gateway charges only the product subtotal
  // online; any shipping fee is collected in cash by the courier on delivery.
  // Never sum them into one "total" — the buyer pays them at different times.
  const payNow = subtotal;
  const payCourier = shippingCost;
  const orderValue = subtotal + shippingCost;

  // City as shown in the recap: dropdown label, plus the typed town/village for
  // "other". Falls back to the raw value if the city isn't in the list.
  const cityMeta = CITIES.find((c) => c.value === form.city);
  const cityLabel = cityMeta ? (isKa ? cityMeta.labelKa : cityMeta.labelEn) : form.city;
  const cityDisplay =
    form.city === 'other' && form.regionName.trim()
      ? `${form.regionName.trim()} (${cityLabel})`
      : cityLabel;

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
    // Clear the town/village name when leaving "other" so a stale value can't
    // ride along on a city that doesn't need it.
    if (value !== 'other') setForm((prev) => ({ ...prev, regionName: '' }));
    // Clear any prior choice so a stale region-specific method can't carry over
    // and the buyer re-picks for the new region.
    setDeliveryMethod(null);
  }

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t('errFirstName');
    if (!form.lastName.trim()) errs.lastName = t('errLastName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('errEmail');
    if (!form.phone.trim()) errs.phone = t('errPhone');
    if (!form.address.trim()) errs.address = t('errAddress');
    if (!form.city) errs.city = t('errCitySelect');
    if (!methodUsable) errs.deliveryMethod = t('errDeliveryMethod');
    // "Other region" + regional delivery needs an explicit town/village name.
    if (form.city === 'other' && effectiveMethod === 'regional' && !form.regionName.trim()) {
      errs.regionName = t('errRegionName');
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = ['firstName', 'lastName', 'email', 'phone', 'address', 'city'].find((f) => errs[f]);
      if (first) document.getElementById(`field-${first}`)?.focus();
      return false;
    }
    return true;
  }

  async function handlePlaceOrder() {
    if (submitting) return;
    // Guard: step 1 validation guarantees a method, but never POST without one.
    if (!effectiveMethod) { setStep(1); return; }
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
            zipCode: form.zipCode,
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
    { field: 'email', label: t('email'), colSpan: true, type: 'email', inputMode: 'email' as const, autoComplete: 'email', placeholder: t('placeholderEmail') },
    { field: 'phone', label: t('phone'), colSpan: true, type: 'tel', inputMode: 'tel' as const, autoComplete: 'tel', placeholder: t('placeholderPhone') },
    { field: 'address', label: t('address'), colSpan: true, autoComplete: 'street-address' },
    { field: 'zipCode', label: t('zipCodeOptional'), inputMode: 'numeric' as const, autoComplete: 'postal-code' },
  ];

  const trustItems = [
    { icon: ShieldCheck, label: t('trustSsl') },
    { icon: RotateCcw, label: t('trustReturns') },
    { icon: Truck, label: t('trustDelivery') },
    { icon: Headset, label: t('trustSupport') },
  ];

  // Order summary — reused in the desktop sidebar and the mobile collapsible.
  const SummaryRows = () => (
    <>
      <div className="space-y-3 mb-4">
        {items.map((item) => {
          const name = isKa ? item.product.nameKa : item.product.nameEn;
          return (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-graphite truncate max-w-[180px]">{name} × {item.quantity}</span>
              <span className="font-medium text-ink dark:text-white ml-2 tabular-nums">
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="space-y-2 border-t border-border-light dark:border-border-dark pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-graphite">{t('subtotal')}</span>
          <span className="text-ink dark:text-white tabular-nums">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-graphite">
            {t('shipping')}
            {effectiveMethod && (
              <span className="block text-[11px] text-graphite/80">{methodLabel[effectiveMethod]}</span>
            )}
          </span>
          {effectiveMethod ? (
            <span className={`tabular-nums ${shippingCost === 0 ? 'text-success font-medium' : 'text-ink dark:text-white'}`}>
              {shippingCost === 0 ? t('free') : formatPrice(shippingCost)}
            </span>
          ) : (
            <span className="text-graphite tabular-nums">—</span>
          )}
        </div>
      </div>

      {shippingCost > 0 ? (
        // Shipping is courier-collected cash — keep it visually separate from the
        // amount charged online now so the buyer sees exactly what each channel costs.
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-cobalt/20 bg-cobalt-soft dark:bg-cloud-dark p-3">
            <div className="flex items-baseline justify-between">
              <span className="font-bold text-ink dark:text-white">{t('payNowLabel')}</span>
              <span className="font-bold text-lg text-cobalt dark:text-cobalt-dark tabular-nums">{formatPrice(payNow)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-graphite">{t('payNowHint')}</p>
          </div>
          <div className="rounded-xl border border-border-light dark:border-border-dark p-3">
            <div className="flex items-baseline justify-between">
              <span className="font-medium text-ink dark:text-white">{t('payCourierLabel')}</span>
              <span className="font-semibold text-ink dark:text-white tabular-nums">{formatPrice(payCourier)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-graphite">{t('courierNote')}</p>
          </div>
          <p className="text-[11px] text-graphite text-right">
            {t('orderValueNote', { amount: formatPrice(orderValue) })}
          </p>
        </div>
      ) : (
        <div className="border-t border-border-light dark:border-border-dark mt-3 pt-3 flex items-baseline justify-between">
          <span className="font-bold text-ink dark:text-white">{t('total')}</span>
          <div className="text-right">
            <span className="block font-bold text-lg text-ink dark:text-white tabular-nums">{formatPrice(orderValue)}</span>
            <span className="text-[11px] text-graphite">{t('orderTotalNote')}</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 pb-28 lg:pb-10">
      <h1 className="font-display font-semibold tracking-display text-3xl text-ink dark:text-white mb-6">{t('title')}</h1>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <span className={`flex items-center gap-1.5 ${step >= 1 ? 'text-ink dark:text-white font-medium' : 'text-graphite'}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step >= 1 ? 'bg-cobalt text-white' : 'bg-cloud-light dark:bg-cloud-dark text-graphite'}`}>1</span>
          {t('stepAddress')}
        </span>
        <ChevronRight className="h-4 w-4 text-graphite/50" />
        <span className={`flex items-center gap-1.5 ${step >= 2 ? 'text-ink dark:text-white font-medium' : 'text-graphite'}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step >= 2 ? 'bg-cobalt text-white' : 'bg-cloud-light dark:bg-cloud-dark text-graphite'}`}>2</span>
          {t('stepPayment')}
        </span>
      </div>

      {/* Mobile collapsible summary */}
      <div className="lg:hidden mb-6 rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
        <button
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <span className="text-sm font-medium text-ink dark:text-white">
            {summaryOpen ? t('hideSummary') : t('showSummary')}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-bold text-ink dark:text-white tabular-nums">{formatPrice(payNow)}</span>
            <ChevronDown className={`h-4 w-4 text-graphite transition-transform ${summaryOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {summaryOpen && <div className="px-5 pb-5"><SummaryRows /></div>}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border-light bg-surface-light p-6 sm:p-8 dark:border-border-dark dark:bg-surface-dark">
                {/* Login nudge — faster returning checkout, non-blocking */}
                {!session && (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cloud-light dark:bg-cloud-dark px-4 py-3">
                    <p className="text-sm text-graphite">{t('loginPrompt')}</p>
                    <Link
                      href={`/${locale}/login?callbackUrl=/${locale}/checkout`}
                      className="text-sm font-semibold text-cobalt dark:text-cobalt-dark hover:underline"
                    >
                      {t('signIn')}
                    </Link>
                  </div>
                )}

                <h2 className="font-display font-semibold text-lg text-ink dark:text-white mb-6">{t('stepAddress')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {fields.map(({ field, label, colSpan, type, inputMode, autoComplete, placeholder }) => (
                    <div key={field} className={colSpan ? 'col-span-2' : ''}>
                      <Label htmlFor={`field-${field}`} className="mb-1.5 block text-graphite">{label}</Label>
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
                        <p id={`err-${field}`} role="alert" className="text-xs text-error mt-1">{errors[field]}</p>
                      )}
                    </div>
                  ))}

                  {/* City — a dropdown so the region (and thus delivery options) is unambiguous */}
                  <div className="col-span-2">
                    <Label htmlFor="field-city" className="mb-1.5 block text-graphite">{t('cityLabel')}</Label>
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
                    {errors.city && (
                      <p role="alert" className="text-xs text-error mt-1">{errors.city}</p>
                    )}
                  </div>

                  {/* Town/village name — required for "Other region" so the courier
                      has an actual destination (the dropdown can't list every village). */}
                  {form.city === 'other' && (
                    <div className="col-span-2">
                      <Label htmlFor="field-regionName" className="mb-1.5 block text-graphite">{t('regionNameLabel')}</Label>
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
                        <p id="err-regionName" role="alert" className="text-xs text-error mt-1">{errors.regionName}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery method — appears once a city is picked; options depend on region */}
              {form.city && (
                <div className="rounded-2xl border border-border-light bg-surface-light p-6 sm:p-8 dark:border-border-dark dark:bg-surface-dark">
                  <h2 className="font-display font-semibold text-lg text-ink dark:text-white mb-4">{t('deliveryMethod')}</h2>
                  <div className="space-y-3" role="radiogroup" aria-label={t('deliveryMethod')}>
                    {availableMethods.map((m) => {
                      const Icon = METHOD_ICONS[m];
                      const fee = getDeliveryFee(m, form.city);
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
                                ? 'border-cobalt ring-1 ring-cobalt bg-cobalt-soft dark:bg-cloud-dark'
                                : 'border-border-light dark:border-border-dark hover:border-cobalt/50'}
                              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-cobalt text-white' : 'bg-cloud-light dark:bg-cloud-dark text-graphite'}`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block font-medium text-ink dark:text-white">{methodLabel[m]}</span>
                              <span className="block text-xs text-graphite">{methodEta[m]}</span>
                            </span>
                            <span className="flex items-center gap-2 shrink-0">
                              <span className={`font-semibold tabular-nums ${fee === 0 ? 'text-success' : 'text-ink dark:text-white'}`}>
                                {fee === 0 ? t('free') : formatPrice(fee)}
                              </span>
                              {selected && <Check className="h-4 w-4 text-cobalt" />}
                            </span>
                          </button>
                          {m === 'instant' && (
                            <p className={`mt-1.5 px-1 text-[11px] ${disabled ? 'text-error' : 'text-graphite'}`}>
                              {disabled ? t('methodInstantUnavailable') : t('methodInstantNote')}
                            </p>
                          )}

                          {/* Store address + map — only under Pickup, once selected */}
                          {m === 'pickup' && selected && (
                            <div className="mt-3 rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                              <div className="flex items-start justify-between gap-3 p-4">
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-5 w-5 text-cobalt dark:text-cobalt-dark shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-ink dark:text-white">{t('storeAddressTitle')}</p>
                                    <p className="text-sm text-graphite">{isKa ? STORE.addressKa : STORE.addressEn}</p>
                                    <p className="mt-1 text-[11px] text-error">{t('methodPickupHours')}</p>
                                  </div>
                                </div>
                                <a
                                  href={STORE.mapsLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-sm font-semibold text-cobalt dark:text-cobalt-dark hover:underline shrink-0"
                                >
                                  {t('openInMaps')}
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                              <iframe
                                title={t('storeAddressTitle')}
                                src={STORE.embedSrc}
                                loading="lazy"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                                className="h-56 w-full border-0"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {errors.deliveryMethod && (
                    <p role="alert" className="text-xs text-error mt-2">{errors.deliveryMethod}</p>
                  )}
                </div>
              )}

              <Button
                className="w-full rounded-full font-semibold"
                size="lg"
                onClick={() => validateStep1() && setStep(2)}
              >
                {t('nextStep')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Ship-to recap — buyer confirms address + delivery without going back */}
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark">
                <div className="text-sm">
                  <p className="text-graphite mb-1">{t('shipTo')}</p>
                  <p className="font-medium text-ink dark:text-white">{form.firstName} {form.lastName}</p>
                  <p className="text-graphite">{form.address}, {cityDisplay}</p>
                  <p className="text-graphite">{form.phone}</p>
                  {effectiveMethod && (
                    <p className="mt-1 text-graphite">
                      {methodLabel[effectiveMethod]} · {methodEta[effectiveMethod]}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm font-semibold text-cobalt dark:text-cobalt-dark hover:underline shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('editAddress')}
                </button>
              </div>

              <div className="rounded-2xl border border-border-light bg-surface-light p-6 sm:p-8 dark:border-border-dark dark:bg-surface-dark">
                <h2 className="font-display font-semibold text-lg text-ink dark:text-white mb-4">{t('securePayment')}</h2>
                <div className="flex items-start gap-3 rounded-xl bg-cloud-light dark:bg-cloud-dark p-4">
                  <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <p className="text-sm text-graphite">{t('securePaymentNote')}</p>
                </div>

                {shippingCost > 0 && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-cobalt/20 bg-cobalt-soft dark:bg-cloud-dark p-4">
                    <Truck className="h-5 w-5 text-cobalt dark:text-cobalt-dark shrink-0 mt-0.5" />
                    <p className="text-sm text-graphite">
                      {t('courierNote')} · {t('onlineChargeNote', { amount: formatPrice(subtotal) })}
                    </p>
                  </div>
                )}

                {payError && (
                  <p role="alert" className="mt-4 rounded-xl border border-error/40 bg-error/10 p-3 text-sm text-error">
                    {payError}
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-full font-semibold"
                    disabled={submitting}
                  >
                    {t('backStep')}
                  </Button>
                  <Button
                    className="flex-[2] rounded-full font-semibold"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    {submitting ? t('redirecting') : t('payWithCard')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Trust strip — reassurance at the decision moment */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl border border-border-light dark:border-border-dark px-3 py-2.5">
                <Icon className="h-4 w-4 text-cobalt dark:text-cobalt-dark shrink-0" />
                <span className="text-[11px] leading-tight text-graphite">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop sticky summary */}
        <div className="hidden lg:block rounded-2xl border border-border-light bg-surface-light p-6 dark:border-border-dark dark:bg-surface-dark h-fit sticky top-24">
          <h2 className="font-display font-semibold text-lg text-ink dark:text-white mb-4">{t('orderSummary')}</h2>
          <SummaryRows />
        </div>
      </div>

      {/* Mobile sticky pay bar — primary action always reachable */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border-light bg-surface-light/95 backdrop-blur px-4 py-3 dark:border-border-dark dark:bg-surface-dark/95">
        {step === 1 ? (
          <Button className="w-full rounded-full font-semibold" size="lg" onClick={() => validateStep1() && setStep(2)}>
            {t('nextStep')} · {formatPrice(payNow)}
          </Button>
        ) : (
          <Button className="w-full rounded-full font-semibold" size="lg" onClick={handlePlaceOrder} disabled={submitting}>
            <Lock className="mr-2 h-4 w-4" />
            {submitting ? t('redirecting') : `${t('payWithCard')} · ${formatPrice(payNow)}`}
          </Button>
        )}
      </div>
    </div>
  );
}
