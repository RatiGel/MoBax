import { NextRequest, NextResponse } from 'next/server';
import { type CategorySlug } from '@/lib/types';
import {
  findProducts,
  catalogVocabulary,
  toPublicProduct,
  type AssistantQuery,
} from '@/lib/assistant/catalog';
import {
  MAX_QUESTIONS,
  mergeProfile,
  profileIsActionable,
  profileToKeywords,
  recentTurns,
  type ShopperProfile,
} from '@/lib/assistant/conversation';

/**
 * AI shopping assistant.
 *
 * Two model calls per turn, same as before, but they do different jobs now:
 *
 *   1. UNDERSTAND — merge what the shopper just said into a running profile
 *      and decide whether we know enough to recommend, or should ask one
 *      more question.
 *   2. SPEAK — either voice that question, or write a recommendation grounded
 *      in products we retrieved locally.
 *
 * The model never sees the catalog. It produces a structured query; we run
 * retrieval ourselves and hand back only the winners. That's what stops it
 * inventing products we don't sell.
 *
 * The old version had no step 1: it searched on every single turn, including
 * the first, so "I need a case" returned six arbitrary cases instead of
 * asking which phone. The decision to ask is the whole point of this rewrite.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free';
// Free models are heavily rate-limited upstream; OpenRouter fails over through
// this list (max 2 here — array incl. primary is capped at 3 by OpenRouter).
const FALLBACK_MODELS = [
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProductPitch {
  slug: string;
  reason: string;
}

async function callModel(
  messages: { role: string; content: string }[],
  temperature = 0.4
) {
  let lastErr = '';
  // Up to 2 attempts; each tries the primary model with the rest as OpenRouter
  // server-side fallbacks. Backoff between attempts handles transient 429s.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'MoBax Shopping Assistant',
      },
      body: JSON.stringify({
        // OpenRouter caps the fallback `models` array at 3 entries total.
        model: MODEL,
        models: [MODEL, ...FALLBACK_MODELS].slice(0, 3),
        messages,
        temperature,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return (data.choices?.[0]?.message?.content as string) ?? '';
    }

    lastErr = `OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`;
    if (res.status === 429 || res.status >= 500) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    break;
  }
  throw new Error(lastErr);
}

/** Pull the first JSON object out of a model response (handles ```json fences / prose). */
function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Profile slots and questions: short by nature, so an 80-char cap is a guard. */
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : undefined;

/** Prose the shopper reads. Needs room for a sentence or two, not a slot value. */
const prose = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, 400) : undefined;

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined;

const strArray = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return out.length ? out.map((s) => s.trim().slice(0, 40)).slice(0, 6) : undefined;
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'AI assistant not configured.' }, { status: 503 });
  }

  let body: {
    messages?: ChatMessage[];
    locale?: string;
    profile?: ShopperProfile;
    questionsAsked?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const messages = recentTurns(
    (body.messages ?? []).filter(
      (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
    )
  );
  const locale = body.locale === 'ka' ? 'ka' : 'en';
  const carried: ShopperProfile = body.profile ?? {};
  const questionsAsked = Number.isInteger(body.questionsAsked)
    ? Math.max(0, body.questionsAsked as number)
    : 0;

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages.' }, { status: 400 });
  }

  const vocab = await catalogVocabulary();
  const convo = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  const langRule =
    locale === 'ka'
      ? 'Write all shopper-facing text in Georgian.'
      : 'Write all shopper-facing text in English.';

  try {
    // ── Step 1: understand — update the profile, decide ask vs recommend ──
    const budgetLeft = MAX_QUESTIONS - questionsAsked;
    const understandPrompt = [
      {
        role: 'system',
        content:
          `You are the planning stage of a shopping assistant for MoBax, a mobile-accessories store in Georgia.\n` +
          `Read the conversation and the profile we've built so far, then reply with ONLY a JSON object.\n\n` +
          `Shape:\n` +
          `{"profile": {"device": string|null, "category": string|null, "brand": string|null,\n` +
          `  "minPrice": number|null, "maxPrice": number|null, "priorities": string[], "color": string|null},\n` +
          ` "action": "ask" | "recommend",\n` +
          ` "question": string|null,\n` +
          ` "options": string[]}\n\n` +
          `PROFILE RULES\n` +
          `- Merge everything the shopper has revealed, not only their last message.\n` +
          `- device: the phone/laptop the accessory is for, e.g. "iPhone 14 Pro", "Galaxy S23".\n` +
          `- category: EXACTLY one of these slugs, or null:\n  ${vocab.categories.map((c) => c.slug).join(', ')}\n` +
          `- brand: one of [${vocab.brands.join(', ')}] or null. Only if they named one.\n` +
          `- Prices are in Georgian lari. Catalog runs ${vocab.priceRange.min}-${vocab.priceRange.max} GEL.\n` +
          `  "cheap" is a priority, not a price — leave maxPrice null unless they gave a number.\n` +
          `- priorities: short concrete wants ("wireless", "waterproof", "fast charging").\n` +
          `- Use null for anything not yet known. Never guess a device they didn't state.\n\n` +
          `ACTION RULES\n` +
          `- "ask" ONLY if a missing fact would genuinely change which product suits them.\n` +
          `  The most valuable missing fact is almost always the device model.\n` +
          `- You have ${budgetLeft} clarifying question(s) left. If that is 0, you MUST answer "recommend".\n` +
          `- If they ask for something specific enough to search, recommend immediately.\n` +
          `- question: ONE short question. Never stack two questions together.\n` +
          `- options: 2-4 tappable short answers for that question ("iPhone", "Samsung", "Under 50 GEL").\n` +
          `  Leave [] when the answer is open-ended.\n` +
          `- ${langRule}`,
      },
      {
        role: 'user',
        content: `PROFILE SO FAR: ${JSON.stringify(carried)}\n\nCONVERSATION:\n${convo}`,
      },
    ];

    const understandRaw = await callModel(understandPrompt, 0);
    const plan = extractJson(understandRaw) ?? {};
    const rawProfile = (plan.profile ?? {}) as Record<string, unknown>;

    const categorySlugs = vocab.categories.map((c) => c.slug);
    const nextCategory = str(rawProfile.category);
    const profile = mergeProfile(carried, {
      device: str(rawProfile.device),
      category:
        nextCategory && categorySlugs.includes(nextCategory as CategorySlug)
          ? (nextCategory as CategorySlug)
          : undefined,
      brand: str(rawProfile.brand),
      color: str(rawProfile.color),
      minPrice: num(rawProfile.minPrice),
      maxPrice: num(rawProfile.maxPrice),
      priorities: strArray(rawProfile.priorities),
    });

    // The model proposes; the server decides. Enforcing the cap here rather
    // than trusting the prompt means a model that ignores the instruction
    // still can't trap the shopper in an endless question loop.
    const wantsToAsk = plan.action === 'ask';
    const question = prose(plan.question);
    const mayAsk = questionsAsked < MAX_QUESTIONS;
    const shouldAsk = wantsToAsk && !!question && mayAsk && !profileIsActionable(profile);

    if (shouldAsk) {
      return NextResponse.json({
        action: 'ask',
        reply: question,
        options: strArray(plan.options) ?? [],
        products: [],
        profile,
        questionsAsked: questionsAsked + 1,
      });
    }

    // ── Step 2: retrieve locally, then let the model pitch the winners ────
    const query: AssistantQuery = {
      keywords: profileToKeywords(profile),
      category: profile.category,
      brand: profile.brand,
      minPrice: profile.minPrice,
      maxPrice: profile.maxPrice,
      device: profile.device,
      inStockOnly: true,
    };

    const matches = await findProducts(query, 4);

    if (matches.length === 0) {
      return NextResponse.json({
        action: 'recommend',
        reply:
          locale === 'ka'
            ? 'ვერაფერი ვიპოვე ამ აღწერით. სცადეთ სხვა ფასი ან სხვა კატეგორია.'
            : "I couldn't find anything matching that. Try a different budget or category.",
        options: [],
        products: [],
        profile,
        questionsAsked,
      });
    }

    const shortlist = matches.map(({ product, matched, deviceMismatch }) => ({
      slug: product.slug,
      name: locale === 'ka' ? product.nameKa : product.nameEn,
      price: product.price,
      brand: product.brand,
      category: product.category,
      specs: product.specs,
      matchedOn: matched,
      fitsTheirDevice: !deviceMismatch,
    }));

    // Only apologise when we have NOTHING that fits. Earlier this triggered on
    // any flagged item, so a perfect top match still got introduced with
    // "I couldn't find a match" while sitting right there in the list —
    // the filler results are extras, not the answer.
    const noneFit = matches.every((m) => m.deviceMismatch);

    const pitchPrompt = [
      {
        role: 'system',
        content:
          `You are Mobi, MoBax's shopping assistant. You have already found these products for the shopper.\n` +
          `Reply with ONLY a JSON object:\n` +
          `{"reply": string, "pitches": [{"slug": string, "reason": string}]}\n\n` +
          `- reply: 1-2 warm sentences introducing the picks and tying them to what they asked for.\n` +
          `  Don't list product names or prices in it — the UI shows cards below your text.\n` +
          `- pitches: one entry per product you're showing, in the order given.\n` +
          `  reason: max 9 words on why THIS product fits THIS shopper. Concrete, not salesy.\n` +
          `  Good: "MagSafe, and slim enough for a pocket." Bad: "A great premium choice!"\n` +
          `- Only use the slugs listed. Never invent a product.\n` +
          `- Every product carries "fitsTheirDevice". Where it is false the item does NOT fit\n` +
          `  the device they named — say so plainly in that product's reason (e.g. "made for\n` +
          `  the S24, not your iPhone") and acknowledge it in the reply. Never present a\n` +
          `  mismatched item as if it fits.\n` +
          (noneFit
            ? `- NOTHING below fits their device. Lead the reply by saying you don't have an\n` +
              `  exact match for it, then offer these as the closest alternatives.\n`
            : `- The first product fits their device. Introduce it as the recommendation;\n` +
              `  any later item marked fitsTheirDevice:false is just a nearby option — mention\n` +
              `  it as an alternative, and never imply the whole list is a miss.\n`) +
          // Spelled out per-field: "shopper-facing text" alone left the model
          // treating `reason` as metadata, so Georgian sessions came back with
          // a Georgian reply and English reason lines under every card.
          `- ${langRule} That covers BOTH "reply" AND every "reason" — the reason\n` +
          `  lines are printed under the product cards, so they must be in the same\n` +
          `  language as the reply. Keep product names and specs as they are.\n\n` +
          `SHOPPER PROFILE: ${JSON.stringify(profile)}\n` +
          `PRODUCTS: ${JSON.stringify(shortlist)}`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const pitchRaw = await callModel(pitchPrompt, 0.5);
    const pitched = extractJson(pitchRaw) ?? {};

    const reasons = new Map<string, string>();
    if (Array.isArray(pitched.pitches)) {
      for (const raw of pitched.pitches as unknown[]) {
        const p = raw as Partial<ProductPitch>;
        if (typeof p?.slug === 'string' && typeof p?.reason === 'string') {
          reasons.set(p.slug, p.reason.trim().slice(0, 90));
        }
      }
    }

    const fallbackReply =
      locale === 'ka' ? 'აი, რაც შეგეფერებათ:' : "Here's what I'd suggest:";

    return NextResponse.json({
      action: 'recommend',
      reply: prose(pitched.reply) ?? fallbackReply,
      options: [],
      products: matches.map(({ product }) => ({
        ...toPublicProduct(product, locale),
        reason: reasons.get(product.slug) ?? '',
      })),
      profile,
      questionsAsked,
    });
  } catch (err) {
    console.error('[api/chat]', err);
    return NextResponse.json({ error: 'Assistant temporarily unavailable.' }, { status: 502 });
  }
}
