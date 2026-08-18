'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { MessageCircle, X, Send, Loader2, Sparkles, Headset } from 'lucide-react';
import { SupportChat } from './SupportChat';

interface ChatProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  /** One line on why this product suits what the shopper described. */
  reason?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProduct[];
  /** Tappable answers to a clarifying question. */
  options?: string[];
}

/**
 * What the server has learned about the shopper. Opaque to the UI — we carry
 * it back on every request so the assistant accumulates context across turns
 * instead of re-reading the transcript cold each time.
 */
type ShopperProfile = Record<string, unknown>;

export function ChatAssistant() {
  const locale = useLocale();
  const isKa = locale === 'ka';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'ai' | 'support'>('ai');
  const ts = useTranslations('support');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  // Carried between turns so the assistant remembers the device, budget, and
  // wants it has already established rather than re-deriving them each time.
  const [profile, setProfile] = useState<ShopperProfile>({});
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = {
    greeting: isKa
      ? 'გამარჯობა! მე მობი ვარ. მოვძებნი იმას, რაც გჭირდებათ — რას ეძებთ?'
      : "Hi, I'm Mobi. Tell me what you need and I'll find it — what are you looking for?",
    placeholder: isKa ? 'დაწერეთ შეტყობინება…' : 'Type a message…',
    error: isKa ? 'რაღაც შეცდომა მოხდა. სცადეთ თავიდან.' : 'Something went wrong. Try again.',
    open: isKa ? 'ჩატის გახსნა' : 'Open chat',
    thinking: isKa ? 'ვფიქრობ…' : 'Thinking…',
    searching: isKa ? 'ვეძებ კატალოგში…' : 'Searching the catalog…',
    restart: isKa ? 'თავიდან დაწყება' : 'Start over',
  };

  /** Openers that model the kind of description the assistant works best from. */
  const starters = isKa
    ? ['ქეისი iPhone-ისთვის', 'უსადენო ყურსასმენები', 'სწრაფი დამტენი', 'საჩუქარი 50₾-მდე']
    : ['A case for my iPhone', 'Wireless earbuds', 'A fast charger', 'A gift under 50₾'];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
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
            profile,
            questionsAsked,
            messages: next.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();

        // Server owns both — it enforces the question cap, so trusting the
        // client's count would let a stale value reopen the budget.
        if (data.profile) setProfile(data.profile);
        if (typeof data.questionsAsked === 'number') setQuestionsAsked(data.questionsAsked);

        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: data.reply,
            products: data.products ?? [],
            options: data.options ?? [],
          },
        ]);
      } catch {
        setMessages((m) => [...m, { role: 'assistant', content: t.error }]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, messages, locale, profile, questionsAsked, t.error]
  );

  function reset() {
    setMessages([]);
    setProfile({});
    setQuestionsAsked(0);
    setInput('');
  }

  // Chips belong to the newest assistant turn only — answering a question two
  // turns back would apply the reply to stale context.
  const lastMessage = messages[messages.length - 1];
  const activeOptions =
    !loading && lastMessage?.role === 'assistant' ? lastMessage.options ?? [] : [];

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.open}
        className="fixed bottom-3 right-3 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-xl shadow-ink/20 transition-transform hover:scale-105 active:scale-95 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14 dark:bg-white dark:text-ink"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-[4.25rem] right-3 z-50 flex h-[560px] sm:bottom-24 sm:right-5 max-h-[calc(100vh-7rem)] w-[calc(100vw-1.5rem)] max-w-sm sm:w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-2xl shadow-ink/20 animate-slide-down">
          {/* Tabs */}
          <div className="flex border-b border-border-light dark:border-border-dark">
            {(
              [
                { key: 'ai', label: ts('tabAi'), icon: Sparkles },
                { key: 'support', label: ts('tabSupport'), icon: Headset },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                aria-selected={tab === key}
                role="tab"
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === key
                    ? 'border-cobalt text-ink dark:text-white'
                    : 'border-transparent text-graphite hover:text-ink dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'ai' ? (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-cloud-light dark:bg-cloud-dark px-4 py-3 text-sm text-ink dark:text-neutral-100">
                      {t.greeting}
                    </div>
                    {/* Openers double as instructions: they show the shape of a
                        useful description, so the first message arrives with
                        something to work from instead of "hi". */}
                    <div className="flex flex-wrap gap-2">
                      {starters.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="rounded-full border border-border-light px-3 py-1.5 text-xs text-ink transition-colors hover:border-cobalt hover:text-cobalt dark:border-border-dark dark:text-neutral-200 dark:hover:border-cobalt-dark"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
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
                                <span className="text-xs text-graphite">
                                  ★ {p.rating} · {p.reviewCount}
                                </span>
                              </div>
                              {/* Why this one, in the shopper's own terms. A card
                                  without it is a search result; with it, it's a
                                  recommendation. */}
                              {p.reason && (
                                <p className="mt-1 line-clamp-2 text-xs leading-snug text-graphite">
                                  {p.reason}
                                </p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div
                    role="status"
                    className="flex w-fit items-center gap-2 rounded-2xl bg-cloud-light px-4 py-3 text-sm text-graphite dark:bg-cloud-dark"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {/* Before anything is known the turn is likely a question,
                        so "Searching…" would be a lie about what's happening. */}
                    {questionsAsked === 0 && messages.length <= 1 ? t.thinking : t.searching}
                  </div>
                )}

                {/* Quick replies for the assistant's question. Tapping one is
                    the same as typing it, so the shopper can answer in one
                    thumb press instead of composing a sentence. */}
                {activeOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeOptions.map((o) => (
                      <button
                        key={o}
                        onClick={() => send(o)}
                        className="rounded-full bg-cobalt/10 px-3 py-1.5 text-xs font-medium text-amber-ink transition-colors hover:bg-cobalt/20 dark:bg-cobalt-dark/15 dark:hover:bg-cobalt-dark/25"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border-light dark:border-border-dark p-3">
                <div className="flex items-center gap-2 rounded-full border border-border-light dark:border-border-dark bg-paper dark:bg-ink px-2 py-1.5">
                  <input
                    ref={inputRef}
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
                    /* Arrow function, not `onClick={send}` — send()'s first
                       argument is the message text, and passing it a click
                       event would send "[object Object]". */
                    onClick={() => send()}
                    disabled={loading || !input.trim()}
                    aria-label="Send"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink dark:bg-white text-white dark:text-ink disabled:opacity-40 hover:bg-cobalt hover:text-ink dark:hover:bg-cobalt dark:hover:text-ink transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={reset}
                    className="mt-2 w-full text-center text-xs text-graphite transition-colors hover:text-ink dark:hover:text-white"
                  >
                    {t.restart}
                  </button>
                )}
              </div>
            </>
          ) : (
            <SupportChat active={open && tab === 'support'} />
          )}
        </div>
      )}
    </>
  );
}
