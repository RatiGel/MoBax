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

export default function LoginPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '', general: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = t('emailRequired');
    else if (!form.email.includes('@')) errs.email = t('invalidEmail');
    if (!form.password) errs.password = t('passwordRequired');
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setErrors({ general: t('invalidCredentials') });
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
      title={t('loginTitle')}
      subtitle={t('loginSubtitle')}
      footerText={t('noAccount')}
      footerLinkLabel={t('register')}
      footerHref={`/${locale}/register`}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errors.general && <AuthAlert>{errors.general}</AuthAlert>}

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
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
          action={
            <button
              type="button"
              className="text-xs font-medium text-cobalt underline-offset-4 hover:underline dark:text-cobalt-dark"
            >
              {t('forgotPassword')}
            </button>
          }
        />

        <div className="pt-1">
          <AuthSubmit loading={loading} loadingLabel={t('signingIn')}>
            {t('loginButton')}
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
