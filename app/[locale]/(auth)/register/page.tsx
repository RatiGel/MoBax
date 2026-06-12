'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Eye, EyeOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const locale = useLocale();
  const t = useTranslations('auth');

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.firstName) errs.firstName = 'Required';
    if (!form.lastName) errs.lastName = 'Required';
    if (!form.email.includes('@')) errs.email = t('emailRequired');
    if (!form.password) errs.password = t('passwordRequired');
    else if (form.password.length < 8) errs.password = t('passwordMin');
    if (form.password !== form.confirmPassword) errs.confirmPassword = t('passwordMatch');
    setErrors(errs);
    if (Object.keys(errs).length === 0) setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Created!</h2>
          <Button asChild>
            <Link href={`/${locale}/login`}>{t('login')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 dark:bg-primary">
              <Smartphone className="h-6 w-6 text-primary dark:text-accent" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('register')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { field: 'firstName', label: t('firstName') },
              { field: 'lastName', label: t('lastName') },
            ].map(({ field, label }) => (
              <div key={field}>
                <Label className="block mb-1">{label}</Label>
                <Input
                  value={form[field as keyof typeof form]}
                  onChange={(e) => update(field, e.target.value)}
                  className={errors[field] ? 'border-error' : ''}
                />
                {errors[field] && <p className="text-xs text-error mt-1">{errors[field]}</p>}
              </div>
            ))}
          </div>

          <div>
            <Label className="block mb-1">{t('email')}</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={errors.email ? 'border-error' : ''}
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label className="block mb-1">{t('password')}</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className={errors.password ? 'border-error pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-error mt-1">{errors.password}</p>}
          </div>

          <div>
            <Label className="block mb-1">{t('confirmPassword')}</Label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              className={errors.confirmPassword ? 'border-error' : ''}
            />
            {errors.confirmPassword && <p className="text-xs text-error mt-1">{errors.confirmPassword}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg">{t('registerButton')}</Button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t('hasAccount')}{' '}
          <Link href={`/${locale}/login`} className="text-accent hover:underline font-medium">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
