'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Message = { id: string; senderRole: string; body: string; createdAt: string };

export function MessagesPanel() {
  const t = useTranslations('account');
  const [messages, setMessages] = useState<Message[]>([]);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch('/api/support');
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setOnline(!!data.online);
    setMessages(data.messages ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, data.message]);
      setDraft('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('messageError'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-border-light dark:border-border-dark">
      <div className="border-b border-border-light px-4 py-3 dark:border-border-dark">
        <h2 className="font-display text-lg font-semibold text-ink dark:text-white">{t('messagesHeading')}</h2>
        <p className={`text-xs ${online ? 'text-success' : 'text-graphite'}`}>
          {online ? t('messagesOnline') : t('messagesOffline')}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="text-sm text-graphite">{t('loading')}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-graphite">{t('messagesEmpty')}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === 'customer';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine
                      ? 'ink-fill'
                      : 'bg-raised-light text-ink dark:bg-raised-dark dark:text-white'
                  }`}
                >
                  <p className="mb-0.5 text-[11px] opacity-70">{mine ? t('you') : t('supportTeam')}</p>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border-light p-3 dark:border-border-dark">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('messagePlaceholder')}
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-xl border border-border-light bg-transparent px-3 py-2 text-sm outline-none focus:border-cobalt dark:border-border-dark"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as unknown as React.FormEvent); }
          }}
        />
        <Button type="submit" disabled={sending || !draft.trim()} className="rounded-full font-semibold">
          <Send className="mr-1 h-4 w-4" />
          {sending ? t('messageSending') : t('messageSend')}
        </Button>
      </form>
    </div>
  );
}
