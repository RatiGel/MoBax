import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { AccountSidebar } from '@/components/account/AccountSidebar';

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${params.locale}/login?callbackUrl=/${params.locale}/account`);
  }
  const t = await getTranslations('account');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
        {t('title')}
      </h1>
      <div className="grid gap-8 sm:grid-cols-[200px_1fr]">
        <aside className="sm:sticky sm:top-24 sm:self-start">
          <AccountSidebar />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
