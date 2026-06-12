'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Eye, EyeOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const locale = useLocale();
  const t = useTranslations('auth');

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = t('emailRequired');
    else if (!form.email.includes('@')) errs.email = 'Invalid email';
    if (!form.password) errs.password = t('passwordRequired');
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      // No real API yet
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('login')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="block mb-1">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={errors.email ? 'border-error' : ''}
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="password">{t('password')}</Label>
              <button type="button" className="text-xs text-accent hover:underline">{t('forgotPassword')}</button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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

          <Button type="submit" className="w-full" size="lg">{t('loginButton')}</Button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/register`} className="text-accent hover:underline font-medium">
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
