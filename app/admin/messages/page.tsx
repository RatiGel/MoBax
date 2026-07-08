import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import { canAccessModule } from '@/lib/rbac';
import { MessagesClient } from './MessagesClient';

export default async function AdminMessagesPage() {
  const session = await getAdminSession();
  if (!session || !canAccessModule(session.user.role, 'support')) redirect('/admin');
  return <MessagesClient />;
}
