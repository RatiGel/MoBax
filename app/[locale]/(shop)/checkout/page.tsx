'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export default function CheckoutPage() {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const { items, getTotal, clearCart } = useCartStore();
  const total = getTotal();

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', zipCode: '', country: 'Georgia',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (!form.firstName) errs.firstName = 'Required';
    if (!form.lastName) errs.lastName = 'Required';
    if (!form.email.includes('@')) errs.email = 'Valid email required';
    if (!form.phone) errs.phone = 'Required';
    if (!form.address) errs.address = 'Required';
    if (!form.city) errs.city = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
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
      // Gateway couldn't start — order exists but stays PENDING.
      if (data?.paymentError) {
        setPayError(data.paymentError);
        return;
      }
      // Redirect the buyer to Flitt hosted checkout.
      if (data?.payment?.redirectUrl) {
        clearCart();
        window.location.href = data.payment.redirectUrl as string;
        return;
      }
      // No redirect URL returned — unexpected for Flitt.
      setPayError('Payment could not be started. Please try again.');
    } catch {
      setPayError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-neutral-500 mb-4">No items in cart</p>
        <Button asChild>
          <Link href={`/${locale}/products`}>Shop Now</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{t('title')}</h1>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        <span className={`flex items-center gap-1 ${step >= 1 ? 'text-primary dark:text-accent font-medium' : 'text-neutral-400'}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-500'}`}>1</span>
          {t('stepAddress')}
        </span>
        <ChevronRight className="h-4 w-4 text-neutral-400" />
        <span className={`flex items-center gap-1 ${step >= 2 ? 'text-primary dark:text-accent font-medium' : 'text-neutral-400'}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-500'}`}>2</span>
          {t('stepPayment')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 1 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-border-dark dark:bg-surface-dark">
              <h2 className="font-semibold text-lg mb-6">{t('stepAddress')}</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { field: 'firstName', label: t('firstName') },
                  { field: 'lastName', label: t('lastName') },
                  { field: 'email', label: t('email'), colSpan: true },
                  { field: 'phone', label: t('phone') },
                  { field: 'address', label: t('address'), colSpan: true },
                  { field: 'city', label: t('city') },
                  { field: 'zipCode', label: t('zipCode') },
                ].map(({ field, label, colSpan }) => (
                  <div key={field} className={colSpan ? 'col-span-2' : ''}>
                    <Label className="mb-1 block">{label}</Label>
                    <Input
                      value={form[field as keyof typeof form]}
                      onChange={(e) => update(field, e.target.value)}
                      className={errors[field] ? 'border-error' : ''}
                    />
                    {errors[field] && <p className="text-xs text-error mt-1">{errors[field]}</p>}
                  </div>
                ))}
              </div>
              <Button
                className="mt-6 w-full"
                size="lg"
                onClick={() => validateStep1() && setStep(2)}
              >
                {t('nextStep')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-border-dark dark:bg-surface-dark">
              <h2 className="font-semibold text-lg mb-6">{t('stepPayment')}</h2>
              <div className="rounded-lg bg-accent/10 border border-accent/40 p-6 text-center space-y-3">
                <CreditCard className="h-12 w-12 mx-auto text-accent" />
                <p className="font-medium text-accent-dark dark:text-accent-light">{t('paymentPlaceholder')}</p>
                <p className="text-sm text-accent-dark dark:text-accent">{t('paymentNote')}</p>
              </div>
              {payError && (
                <p className="mt-4 rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
                  {payError}
                </p>
              )}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={submitting}
                >
                  {t('backStep')}
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  {submitting ? '…' : t('placeOrder')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-border-dark dark:bg-surface-dark h-fit sticky top-24">
          <h2 className="font-semibold text-lg mb-4">{t('orderSummary')}</h2>
          <div className="space-y-3 mb-4">
            {items.map((item) => {
              const name = locale === 'ka' ? item.product.nameKa : item.product.nameEn;
              return (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[150px]">
                    {name} × {item.quantity}
                  </span>
                  <span className="font-medium ml-2">{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-neutral-200 dark:border-border-dark pt-4 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-accent">{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
