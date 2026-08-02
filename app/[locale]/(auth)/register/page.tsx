'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import {
  AuthAlert,
  AuthDivider,
  AuthSubmit,
  GoogleButton,
} from '@/components/auth/AuthControls';

export default function RegisterPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '', general: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.firstName) errs.firstName = t('firstNameRequired');
    if (!form.lastName) errs.lastName = t('lastNameRequired');
    if (!form.email) errs.email = t('emailRequired');
    else if (!form.email.includes('@')) errs.email = t('invalidEmail');
    if (!form.password) errs.password = t('passwordRequired');
    else if (form.password.length < 8) errs.password = t('passwordMin');
    if (form.password !== form.confirmPassword) errs.confirmPassword = t('passwordMatch');
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.error || t('registrationFailed') });
        return;
      }

      // Auto sign-in after successful registration
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        router.push(`/${locale}/login`);
      } else {
        router.push(`/${locale}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('registerTitle')}
      subtitle={t('registerSubtitle')}
      footerText={t('hasAccount')}
      footerLinkLabel={t('login')}
      footerHref={`/${locale}/login`}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errors.general && <AuthAlert>{errors.general}</AuthAlert>}

        {/* Stacks below 480px: the Georgian labels ("სახელი"/"გვარი") plus a
            two-column split left the inputs too narrow to show a typed name. */}
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-3">
          <AuthField
            id="firstName"
            label={t('firstName')}
            autoComplete="given-name"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            error={errors.firstName}
          />
          <AuthField
            id="lastName"
            label={t('lastName')}
            autoComplete="family-name"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            error={errors.lastName}
          />
        </div>

        <AuthField
          id="email"
          label={t('email')}
          type="email"
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
        />

        <AuthField
          id="password"
          label={t('password')}
          revealable
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
        />

        <AuthField
          id="confirmPassword"
          label={t('confirmPassword')}
          revealable
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
        />

        <div className="pt-1">
          <AuthSubmit loading={loading} loadingLabel={t('creatingAccount')}>
            {t('registerButton')}
          </AuthSubmit>
        </div>
      </form>

      <div className="my-5">
        <AuthDivider label={t('or')} />
      </div>

      <GoogleButton
        label={t('continueWithGoogle')}
        onClick={() => signIn('google', { callbackUrl: `/${locale}` })}
      />
    </AuthShell>
  );
}
