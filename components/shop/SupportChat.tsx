'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { Send, Loader2, LogIn } from 'lucide-react';

interface SupportMsg {
  id: string;
  senderRole: 'customer' | 'staff';
  body: string;
  createdAt: string;
}

const POLL_MS = 4000;

export function SupportChat({ active }: { active: boolean }) {
  const { status } = useSession();
  const t = useTranslations('support');
  const locale = useLocale();

  const [online, setOnline] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/support');
      if (!res.ok) return; // silent — retry next tick
      const data = await res.json();
      setOnline(data.online);
      setMessages(data.messages);
    } catch {
      /* silent — retry next tick */
    }
  }, []);

  // Poll while the Support tab is open and the page is visible.
  useEffect(() => {
    if (!active || status !== 'authenticated') return;
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [active, status, load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, active]);

  const send = useCallback(async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setFailed(false);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setOnline(data.online);
      setMessages((m) => [...m, data.message]);
      setInput('');
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  if (status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-graphite" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-ink dark:text-neutral-100">{t('loginPrompt')}</p>
        <Link
          href={`/${locale}/login`}
          className="flex items-center gap-2 rounded-full bg-ink dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-ink hover:bg-cobalt dark:hover:bg-cobalt dark:hover:text-white transition-colors"
        >
          <LogIn className="h-4 w-4" />
          {t('loginCta')}
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Status + offline banner */}
      <div className="border-b border-border-light dark:border-border-dark px-5 py-2 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-neutral-400'}`}
          aria-hidden
        />
        <span className="text-xs text-graphite">
          {online === null
            ? t('hours')
            : `${online ? t('online') : t('offline')} · ${t('hours')}`}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {online === false && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {t('offlineBanner')}
          </div>
        )}

        {messages.length === 0 && (
          <div className="rounded-2xl bg-cloud-light dark:bg-cloud-dark px-4 py-3 text-sm text-ink dark:text-neutral-100">
            {t('greeting')}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.senderRole === 'customer' ? 'flex justify-end' : ''}>
            <div
              className={
                m.senderRole === 'customer'
                  ? 'max-w-[80%] rounded-2xl rounded-br-md bg-ink dark:bg-white px-4 py-2.5 text-sm text-white dark:text-ink whitespace-pre-wrap'
                  : 'max-w-[80%] rounded-2xl bg-cloud-light dark:bg-cloud-dark px-4 py-2.5 text-sm text-ink dark:text-neutral-100 whitespace-pre-wrap w-fit'
              }
            >
              {m.body}
            </div>
          </div>
        ))}

        {failed && <p className="text-xs text-red-500">{t('error')}</p>}
      </div>

      {/* Input — always enabled; off-hours messages are answered next working day. */}
      <div className="border-t border-border-light dark:border-border-dark p-3">
        <div className="flex items-center gap-2 rounded-full border border-border-light dark:border-border-dark bg-paper dark:bg-ink px-2 py-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={2000}
            placeholder={t('placeholder')}
            className="flex-1 bg-transparent px-3 text-sm text-ink dark:text-white placeholder:text-graphite focus:outline-none"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            aria-label={t('send')}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink dark:bg-white text-white dark:text-ink disabled:opacity-40 hover:bg-cobalt dark:hover:bg-cobalt dark:hover:text-white transition-colors"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
