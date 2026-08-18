import { getTranslations } from 'next-intl/server';
import { ChevronDown } from 'lucide-react';
import { getStoreFaq } from '@/lib/faq';

interface FaqSectionProps {
  locale: string;
}

// Async server component so it can read the admin-managed FAQ setting. When the
// setting is empty (never saved) it falls back to the five hardcoded
// faqQ1..5 / faqA1..5 i18n strings so the home page always shows an FAQ.
export async function FaqSection({ locale }: FaqSectionProps) {
  const items = await getStoreFaq();
  const t = await getTranslations('home');
  const isKa = locale === 'ka';

  const faqs =
    items.length > 0
      ? items.map((it) => ({
          q: isKa ? it.questionKa : it.questionEn,
          a: isKa ? it.answerKa : it.answerEn,
        }))
      : (['1', '2', '3', '4', '5'] as const).map((n) => ({
          q: t(`faqQ${n}` as never),
          a: t(`faqA${n}` as never),
        }));

  return (
    <section className="py-16 lg:py-20 bg-cloud-light/40 dark:bg-cloud-dark/40">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white mb-10 text-center tracking-display">
          {isKa ? 'ხშირად დასმული კითხვები' : 'Frequently Asked Questions'}
        </h2>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl px-6 py-5 open:border-cobalt/30 transition-colors">
              <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                <span className="text-base font-semibold text-ink dark:text-white">
                  {faq.q}
                </span>
                <ChevronDown className="h-5 w-5 flex-shrink-0 text-graphite transition-transform group-open:rotate-180 group-open:text-star" />
              </summary>
              <p className="mt-4 text-sm text-graphite leading-relaxed whitespace-pre-line">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
