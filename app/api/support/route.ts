import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import { isSupportOnline } from '@/lib/support-hours';
import Conversation from '@/models/Conversation';
import SupportMessage from '@/models/SupportMessage';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

function serializeMessage(m: {
  _id: unknown;
  senderRole: string;
  body: string;
  createdAt: Date;
}) {
  return {
    id: String(m._id),
    senderRole: m.senderRole,
    body: m.body,
    createdAt: m.createdAt,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
    }

    await connectDB();
    const conversation = await Conversation.findOne({ userId: session.user.id });
    if (!conversation) {
      return NextResponse.json({ online: isSupportOnline(), conversation: null, messages: [] });
    }

    const messages = await SupportMessage.find({ conversationId: conversation._id })
      .sort('createdAt')
      .lean();

    // Opening the thread reads staff replies.
    if (conversation.unreadByUser > 0) {
      conversation.unreadByUser = 0;
      await conversation.save();
    }

    return NextResponse.json({
      online: isSupportOnline(),
      conversation: { id: String(conversation._id), status: conversation.status },
      messages: messages.map(serializeMessage),
    });
  } catch (err) {
    console.error('[support GET]', err);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const body = typeof json?.body === 'string' ? json.body.trim() : '';
    if (!body) {
      return NextResponse.json({ error: 'Message is required' }, { status: 422 });
    }
    if (body.length > 2000) {
      return NextResponse.json({ error: 'Message is too long (max 2000 characters)' }, { status: 422 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select('isBlocked').lean();
    if (!user || user.isBlocked) {
      return NextResponse.json({ error: 'Account is blocked' }, { status: 403 });
    }

    // One thread per customer: create on first message, reopen if closed.
    const conversation = await Conversation.findOneAndUpdate(
      { userId: session.user.id },
      {
        $set: {
          status: 'open',
          lastMessageAt: new Date(),
          lastMessageBody: body.slice(0, 120),
        },
        $inc: { unreadByAdmin: 1 },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const message = await SupportMessage.create({
      conversationId: conversation._id,
      senderId: session.user.id,
      senderRole: 'customer',
      body,
    });

    return NextResponse.json(
      { online: isSupportOnline(), message: serializeMessage(message) },
      { status: 201 }
    );
  } catch (err) {
    console.error('[support POST]', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
