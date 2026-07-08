import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import Conversation from '@/models/Conversation';
import '@/models/User'; // register User schema for populate

export const dynamic = 'force-dynamic';

interface PopulatedCustomer {
  _id: unknown;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export async function GET() {
  try {
    await requireAdmin({ module: 'support' });
    await connectDB();

    const conversations = await Conversation.find({})
      .sort('-lastMessageAt')
      .populate<{ userId: PopulatedCustomer | null }>('userId', 'firstName lastName email')
      .lean();

    let totalUnread = 0;
    const items = conversations.map((c) => {
      totalUnread += c.unreadByAdmin;
      const u = c.userId;
      const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || 'Deleted user';
      return {
        id: String(c._id),
        status: c.status,
        lastMessageAt: c.lastMessageAt,
        lastMessageBody: c.lastMessageBody,
        unreadByAdmin: c.unreadByAdmin,
        customer: { id: u ? String(u._id) : '', name, email: u?.email ?? '' },
      };
    });

    return ok({ conversations: items, totalUnread });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/support GET]', err);
    return fail('Failed to load conversations', 500);
  }
}
