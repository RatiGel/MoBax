import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from '@/components/SessionProvider';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/admin/Sidebar';
import { Header } from '@/components/admin/Header';
import { getAdminSession } from '@/lib/admin-auth';
import '../globals.css';

export const metadata: Metadata = {
  title: 'MoBax Admin',
  description: 'MoBax store administration',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  // Middleware already guards, but enforce again at the layer that renders data.
  if (!session) redirect('/en/login?callbackUrl=/admin');

  const { role, name, email } = session.user;

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex h-screen overflow-hidden">
          <Sidebar role={role} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header role={role} name={name ?? 'Admin'} email={email ?? ''} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
          </div>
        </div>
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
}
