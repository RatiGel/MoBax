'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Loader2, Archive, ArchiveRestore } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/admin-fetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConversationRow {
  id: string;
  status: 'open' | 'closed';
  lastMessageAt: string;
  lastMessageBody: string;
  unreadByAdmin: number;
  customer: { id: string; name: string; email: string };
}

interface ThreadMessage {
  id: string;
  senderRole: 'customer' | 'staff';
  body: string;
  createdAt: string;
}

interface ThreadData {
  conversation: { id: string; status: 'open' | 'closed' };
  customer: { id: string; name: string; email: string };
  messages: ThreadMessage[];
}

const POLL_MS = 5000;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function MessagesClient() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      const data = await apiFetch<{ conversations: ConversationRow[]; totalUnread: number }>(
        '/api/admin/support'
      );
      setConversations(data.conversations);
    } catch {
      /* silent on poll */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const data = await apiFetch<ThreadData>(`/api/admin/support/${id}`);
      setThread(data);
      // Opening resets unread server-side; mirror locally.
      setConversations((list) =>
        list.map((c) => (c.id === id ? { ...c, unreadByAdmin: 0 } : c))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load conversation');
    }
  }, []);

  // Poll list + open thread.
  useEffect(() => {
    loadList();
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadList();
      if (selectedId) loadThread(selectedId);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadList, loadThread, selectedId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread?.messages.length]);

  const open = (id: string) => {
    setSelectedId(id);
    setThread(null);
    loadThread(id);
  };

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    try {
      const data = await apiFetch<{ message: ThreadMessage }>(
        `/api/admin/support/${selectedId}`,
        { method: 'POST', body: JSON.stringify({ body }) }
      );
      setThread((t) =>
        t ? { ...t, messages: [...t.messages, data.message] } : t
      );
      setReply('');
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!thread || !selectedId) return;
    const next = thread.conversation.status === 'open' ? 'closed' : 'open';
    try {
      await apiFetch(`/api/admin/support/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setThread((t) => (t ? { ...t, conversation: { ...t.conversation, status: next } } : t));
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Messages" description="Customer support conversations" />

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Customer messages from the storefront chat will appear here."
        />
      ) : (
        <div className="flex flex-1 min-h-0 gap-4">
          {/* Conversation list */}
          <div className="w-80 shrink-0 overflow-y-auto rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => open(c.id)}
                className={cn(
                  'flex w-full flex-col gap-1 border-b border-border-light dark:border-border-dark px-4 py-3 text-left transition-colors',
                  selectedId === c.id
                    ? 'bg-primary/5 dark:bg-accent/10'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink dark:text-white">
                    {c.customer.name}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatTime(c.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-neutral-500">{c.lastMessageBody}</span>
                  {c.unreadByAdmin > 0 && (
                    <Badge className="shrink-0 h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]">
                      {c.unreadByAdmin}
                    </Badge>
                  )}
                </div>
                {c.status === 'closed' && (
                  <span className="text-[11px] uppercase tracking-wide text-neutral-400">Closed</span>
                )}
              </button>
            ))}
          </div>

          {/* Thread */}
          <div className="flex flex-1 min-w-0 flex-col rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            {!selectedId ? (
              <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
                Select a conversation
              </div>
            ) : !thread ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink dark:text-white">
                      {thread.customer.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{thread.customer.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleStatus}>
                    {thread.conversation.status === 'open' ? (
                      <><Archive className="mr-1.5 h-4 w-4" /> Close</>
                    ) : (
                      <><ArchiveRestore className="mr-1.5 h-4 w-4" /> Reopen</>
                    )}
                  </Button>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {thread.messages.map((m) => (
                    <div key={m.id} className={m.senderRole === 'staff' ? 'flex justify-end' : ''}>
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                          m.senderRole === 'staff'
                            ? 'rounded-br-md bg-primary text-white dark:bg-accent dark:text-primary'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-ink dark:text-neutral-100 w-fit'
                        )}
                      >
                        {m.body}
                        <p className={cn(
                          'mt-1 text-[10px]',
                          m.senderRole === 'staff' ? 'text-white/60 dark:text-primary/60' : 'text-neutral-400'
                        )}>
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border-light dark:border-border-dark p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      maxLength={2000}
                      placeholder="Reply to customer…"
                      className="flex-1 rounded-md border border-border-light dark:border-border-dark bg-transparent px-3 py-2 text-sm text-ink dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
                    />
                    <Button onClick={sendReply} disabled={sending || !reply.trim()} size="sm">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
