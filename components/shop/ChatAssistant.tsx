'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';

interface ChatProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProduct[];
}

export function ChatAssistant() {
  const locale = useLocale();
  const isKa = locale === 'ka';
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const t = {
    title: isKa ? 'MoBax დამხმარე' : 'MoBax Assistant',
    subtitle: isKa ? 'AI შოპინგ-კონსულტანტი' : 'AI shopping helper',
    greeting: isKa
      ? 'გამარჯობა! რას ეძებთ? მაგ: "მაქვს iPhone 14, მინდა ვარდისფერი ქეისი".'
      : 'Hi! What are you looking for? e.g. "I have an iPhone 14 and want a pink case."',
    placeholder: isKa ? 'დაწერეთ შეტყობინება…' : 'Type a message…',
    error: isKa ? 'რაღაც შეცდომა მოხდა. სცადეთ თავიდან.' : 'Something went wrong. Try again.',
    open: isKa ? 'ჩატის გახსნა' : 'Open chat',
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply, products: data.products ?? [] },
      ]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: t.error }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, locale, t.error]);

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.open}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-ink dark:bg-white text-white dark:text-ink shadow-xl shadow-ink/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[560px] max-h-[calc(100vh-7rem)] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-2xl shadow-ink/20 animate-slide-down">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border-light dark:border-border-dark px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cobalt/10 text-cobalt dark:text-cobalt-dark">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink dark:text-white">{t.title}</p>
              <p className="text-xs text-graphite">{t.subtitle}</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-cloud-light dark:bg-cloud-dark px-4 py-3 text-sm text-ink dark:text-neutral-100">
                {t.greeting}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'space-y-3'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[80%] rounded-2xl rounded-br-md bg-ink dark:bg-white px-4 py-2.5 text-sm text-white dark:text-ink'
                      : 'rounded-2xl bg-cloud-light dark:bg-cloud-dark px-4 py-3 text-sm text-ink dark:text-neutral-100 whitespace-pre-wrap'
                  }
                >
                  {m.content}
                </div>

                {/* Product cards */}
                {m.role === 'assistant' && m.products && m.products.length > 0 && (
                  <div className="space-y-2">
                    {m.products.map((p) => (
                      <Link
                        key={p.id}
                        href={`/${locale}/products/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-2xl border border-border-light dark:border-border-dark p-2.5 hover:border-cobalt dark:hover:border-cobalt-dark transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-14 w-14 flex-shrink-0 rounded-xl object-cover bg-cloud-light dark:bg-cloud-dark"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink dark:text-white">{p.name}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink dark:text-white">
                              ₾{p.price.toFixed(2)}
                            </span>
                            {p.originalPrice && (
                              <span className="text-xs text-graphite line-through">
                                ₾{p.originalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-graphite">
                            ★ {p.rating} · {p.reviewCount}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 rounded-2xl bg-cloud-light dark:bg-cloud-dark px-4 py-3 text-sm text-graphite w-fit">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isKa ? 'ვეძებ…' : 'Searching…'}
              </div>
            )}
          </div>

          {/* Input */}
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
                placeholder={t.placeholder}
                className="flex-1 bg-transparent px-3 text-sm text-ink dark:text-white placeholder:text-graphite focus:outline-none"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink dark:bg-white text-white dark:text-ink disabled:opacity-40 hover:bg-cobalt dark:hover:bg-cobalt dark:hover:text-white transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
