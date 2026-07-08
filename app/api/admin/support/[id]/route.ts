import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import Conversation from '@/models/Conversation';
import SupportMessage from '@/models/SupportMessage';
import '@/models/User';

export const dynamic = 'force-dynamic';

interface PopulatedCustomer {
  _id: unknown;
  firstName?: string;
  lastName?: string;
  email?: string;
}

function serializeMessage(m: { _id: unknown; senderRole: string; body: string; createdAt: Date }) {
  return { id: String(m._id), senderRole: m.senderRole, body: m.body, createdAt: m.createdAt };
}

async function findConversation(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Conversation.findById(id).populate<{ userId: PopulatedCustomer | null }>(
    'userId',
    'firstName lastName email'
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin({ module: 'support' });
    await connectDB();

    const conversation = await findConversation(params.id);
    if (!conversation) return notFound('Conversation not found');

    const messages = await SupportMessage.find({ conversationId: conversation._id })
      .sort('createdAt')
      .lean();

    if (conversation.unreadByAdmin > 0) {
      conversation.unreadByAdmin = 0;
      await conversation.save();
    }

    const u = conversation.userId;
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || 'Deleted user';

    return ok({
      conversation: { id: String(conversation._id), status: conversation.status },
      customer: { id: u ? String(u._id) : '', name, email: u?.email ?? '' },
      messages: messages.map(serializeMessage),
    });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/support/[id] GET]', err);
    return fail('Failed to load conversation', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin({ module: 'support' });
    await connectDB();

    const json = await req.json().catch(() => null);
    const body = typeof json?.body === 'string' ? json.body.trim() : '';
    if (!body) return fail('Message is required', 422);
    if (body.length > 2000) return fail('Message is too long (max 2000 characters)', 422);

    const conversation = await findConversation(params.id);
    if (!conversation) return notFound('Conversation not found');

    const message = await SupportMessage.create({
      conversationId: conversation._id,
      senderId: session.user.id,
      senderRole: 'staff',
      body,
    });

    conversation.status = 'open';
    conversation.lastMessageAt = new Date();
    conversation.lastMessageBody = body.slice(0, 120);
    conversation.unreadByUser += 1;
    await conversation.save();

    return ok({ message: serializeMessage(message) }, 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/support/[id] POST]', err);
    return fail('Failed to send reply', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin({ module: 'support' });
    await connectDB();

    const json = await req.json().catch(() => null);
    const status = json?.status;
    if (status !== 'open' && status !== 'closed') return fail('Invalid status', 422);

    const conversation = await findConversation(params.id);
    if (!conversation) return notFound('Conversation not found');

    conversation.status = status;
    await conversation.save();

    return ok({ conversation: { id: String(conversation._id), status: conversation.status } });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/support/[id] PATCH]', err);
    return fail('Failed to update conversation', 500);
  }
}
