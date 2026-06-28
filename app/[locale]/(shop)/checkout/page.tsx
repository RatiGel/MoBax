'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { getShippingCost, amountToFreeShipping } from '@/lib/shipping';

export default function CheckoutPage() {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const { data: session } = useSession();
  const { items, getTotal, clearCart } = useCartStore();

  const subtotal = getTotal();
  const shippingCost = getShippingCost(subtotal);
  const total = subtotal + shippingCost;
  const remainingForFree = amountToFreeShipping(subtotal);

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: session?.user?.email ?? '', phone: '',
    address: '', city: '', zipCode: '', country: 'Georgia',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t('errFirstName');
    if (!form.lastName.trim()) errs.lastName = t('errLastName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('errEmail');
    if (!form.phone.trim()) errs.phone = t('errPhone');
    if (!form.address.trim()) errs.address = t('errAddress');
    if (!form.city.trim()) errs.city = t('errCity');
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Focus the first invalid field for keyboard + screen-reader users.
      const first = ['firstName', 'lastName', 'email', 'phone', 'address', 'city'].find((f) => errs[f]);
      if (first) document.getElementById(`field-${first}`)?.focus();
      return false;
    }
    return true;
  }

  async function handlePlaceOrder() {
    if (submitting) return;
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
            zipCode: form.zipCode,
            country: form.country,
          },
          guestEmail: form.email,
          paymentMethod: 'FLITT',
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
        <p className="text-graphite mb-4">{locale === 'ka' ? 'კალათა ცარიელია' : 'No items in cart'}</p>
        <Button className="rounded-full font-semibold" asChild>
          <Link href={`/${locale}/products`}>{locale === 'ka' ? 'მაღაზია' : 'Shop now'}</Link>
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
    { field: 'city', label: t('city'), autoComplete: 'address-level2' },
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
          const name = locale === 'ka' ? item.product.nameKa : item.product.nameEn;
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
          <span className="text-graphite">{t('shipping')}</span>
          <span className={`tabular-nums ${shippingCost === 0 ? 'text-success font-medium' : 'text-ink dark:text-white'}`}>
            {shippingCost === 0 ? t('free') : formatPrice(shippingCost)}
          </span>
        </div>
      </div>
      <div className="border-t border-border-light dark:border-border-dark mt-3 pt-3 flex items-baseline justify-between">
        <span className="font-bold text-ink dark:text-white">{t('total')}</span>
        <div className="text-right">
          <span className="block font-bold text-lg text-ink dark:text-white tabular-nums">{formatPrice(total)}</span>
          <span className="text-[11px] text-graphite">{t('orderTotalNote')}</span>
        </div>
      </div>
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

      {/* Free-shipping progress — nudges AOV, removes surprise cost */}
      {remainingForFree > 0 ? (
        <div className="mb-6 rounded-xl border border-cobalt/20 bg-cobalt-soft dark:bg-cloud-dark px-4 py-3">
          <p className="text-sm text-ink dark:text-white">
            {t('freeShippingProgress', { amount: formatPrice(remainingForFree) })}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60 dark:bg-ink/40">
            <div
              className="h-full rounded-full bg-cobalt transition-all duration-300"
              style={{ width: `${Math.min(100, (subtotal / (subtotal + remainingForFree)) * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <p className="text-sm font-medium text-success">{t('freeShippingUnlocked')}</p>
        </div>
      )}

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
            <span className="font-bold text-ink dark:text-white tabular-nums">{formatPrice(total)}</span>
            <ChevronDown className={`h-4 w-4 text-graphite transition-transform ${summaryOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {summaryOpen && <div className="px-5 pb-5"><SummaryRows /></div>}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 1 ? (
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
              </div>
              <Button
                className="mt-6 w-full rounded-full font-semibold"
                size="lg"
                onClick={() => validateStep1() && setStep(2)}
              >
                {t('nextStep')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Ship-to recap — buyer confirms address without going back */}
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark">
                <div className="text-sm">
                  <p className="text-graphite mb-1">{t('shipTo')}</p>
                  <p className="font-medium text-ink dark:text-white">{form.firstName} {form.lastName}</p>
                  <p className="text-graphite">{form.address}, {form.city}</p>
                  <p className="text-graphite">{form.phone}</p>
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
            {t('nextStep')} · {formatPrice(total)}
          </Button>
        ) : (
          <Button className="w-full rounded-full font-semibold" size="lg" onClick={handlePlaceOrder} disabled={submitting}>
            <Lock className="mr-2 h-4 w-4" />
            {submitting ? t('redirecting') : `${t('payWithCard')} · ${formatPrice(total)}`}
          </Button>
        )}
      </div>
    </div>
  );
}
