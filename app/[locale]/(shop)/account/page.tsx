'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Address = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  regionName: string;
  zipCode: string;
  country: string;
};

const EMPTY_ADDRESS: Address = {
  firstName: '', lastName: '', phone: '', address: '',
  city: '', regionName: '', zipCode: '', country: 'Georgia',
};

export default function ProfilePage() {
  const t = useTranslations('account');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [addr, setAddr] = useState<Address>(EMPTY_ADDRESS);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/account/profile');
        if (!res.ok) return;
        const data = await res.json();
        setEmail(data.email ?? '');
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
        setHasPassword(!!data.hasPassword);
        if (data.address) setAddr({ ...EMPTY_ADDRESS, ...data.address });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateAddr(field: keyof Address, value: string) {
    setAddr((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // Only send the address if the required parts are filled, else null (clear).
      const complete =
        addr.firstName && addr.lastName && addr.phone && addr.address && addr.city && addr.country;
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, address: complete ? addr : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('profileSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('profileError'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('passwordError'));
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <p className="text-sm text-graphite">{t('loading')}</p>;

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = 'text'
  ) => (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-graphite">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Name + email */}
      <form onSubmit={saveProfile} className="space-y-5">
        <h2 className="font-display text-xl font-semibold text-ink dark:text-white">{t('profileHeading')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('firstName', t('firstName'), firstName, setFirstName)}
          {field('lastName', t('lastName'), lastName, setLastName)}
        </div>
        <div>
          <Label className="mb-1.5 block text-graphite">{t('email')}</Label>
          <Input value={email} disabled className="rounded-xl opacity-70" />
          <p className="mt-1 text-xs text-graphite">{t('emailReadonly')}</p>
        </div>

        {/* Address */}
        <div className="space-y-4 border-t border-border-light pt-6 dark:border-border-dark">
          <div>
            <h3 className="font-medium text-ink dark:text-white">{t('addressHeading')}</h3>
            <p className="text-xs text-graphite">{t('addressHint')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('a-firstName', t('firstName'), addr.firstName, (v) => updateAddr('firstName', v))}
            {field('a-lastName', t('lastName'), addr.lastName, (v) => updateAddr('lastName', v))}
            {field('a-phone', t('phone'), addr.phone, (v) => updateAddr('phone', v), 'tel')}
            {field('a-city', t('city'), addr.city, (v) => updateAddr('city', v))}
          </div>
          {field('a-address', t('address'), addr.address, (v) => updateAddr('address', v))}
          <div className="grid gap-4 sm:grid-cols-3">
            {field('a-region', t('regionName'), addr.regionName, (v) => updateAddr('regionName', v))}
            {field('a-zip', t('zipCode'), addr.zipCode, (v) => updateAddr('zipCode', v))}
            {field('a-country', t('country'), addr.country, (v) => updateAddr('country', v))}
          </div>
        </div>

        <Button type="submit" disabled={savingProfile} className="rounded-full font-semibold">
          {savingProfile ? t('saving') : t('saveProfile')}
        </Button>
      </form>

      {/* Password */}
      <div className="border-t border-border-light pt-8 dark:border-border-dark">
        <h2 className="mb-4 font-display text-xl font-semibold text-ink dark:text-white">{t('passwordHeading')}</h2>
        {hasPassword ? (
          <form onSubmit={changePassword} className="max-w-sm space-y-4">
            {field('currentPassword', t('currentPassword'), currentPassword, setCurrentPassword, 'password')}
            {field('newPassword', t('newPassword'), newPassword, setNewPassword, 'password')}
            <Button type="submit" disabled={savingPassword} className="rounded-full font-semibold">
              {savingPassword ? t('saving') : t('changePassword')}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-graphite">{t('passwordGoogle')}</p>
        )}
      </div>
    </div>
  );
}
