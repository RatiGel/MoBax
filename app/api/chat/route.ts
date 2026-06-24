import { NextRequest, NextResponse } from 'next/server';
import {
  searchProducts,
  categories,
  type CategorySlug,
  type Product,
  type ProductSearchQuery,
} from '@/lib/mock-data';

// AI shopping assistant. The model never sees the full catalog; instead it
// extracts a structured search query from the conversation, we run that against
// the catalog locally, then the model writes a friendly reply about the matches.

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

const CATEGORY_SLUGS = categories.map((c) => c.slug);

async function callModel(messages: { role: string; content: string }[], temperature = 0.4) {
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

// Pull the first JSON object out of a model response (handles ```json fences / prose).
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

function toPublicProduct(p: Product, locale: string) {
  const isKa = locale === 'ka';
  return {
    id: p.id,
    slug: p.slug,
    name: isKa ? p.nameKa : p.nameEn,
    price: p.price,
    originalPrice: p.originalPrice,
    image: p.images[0],
    rating: p.rating,
    reviewCount: p.reviewCount,
    category: p.category,
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'AI assistant not configured.' }, { status: 503 });
  }

  let body: { messages?: ChatMessage[]; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );
  const locale = body.locale === 'ka' ? 'ka' : 'en';

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages.' }, { status: 400 });
  }

  const convo = messages.map((m) => `${m.role}: ${m.content}`).join('\n');

  try {
    // ── Step 1: extract a structured search query ──────────────────────
    const extractPrompt = [
      {
        role: 'system',
        content:
          `You extract a product-search query from a shopping conversation for a mobile-accessories store.\n` +
          `Reply with ONLY a JSON object, no prose. Shape:\n` +
          `{"keywords": string[], "category": string|null, "maxPrice": number|null, "minPrice": number|null}\n` +
          `- keywords: device models, colors, materials, types the user wants (e.g. "iphone 14", "pink", "leather", "case").\n` +
          `- category: one of [${CATEGORY_SLUGS.join(', ')}] or null if unsure.\n` +
          `Extract from the user's intent across the whole conversation.`,
      },
      { role: 'user', content: convo },
    ];

    const extractRaw = await callModel(extractPrompt, 0);
    const parsed = extractJson(extractRaw) ?? {};

    const query: ProductSearchQuery = {};
    if (Array.isArray(parsed.keywords)) {
      query.keywords = (parsed.keywords as unknown[]).filter((k): k is string => typeof k === 'string');
    }
    if (typeof parsed.category === 'string' && CATEGORY_SLUGS.includes(parsed.category as CategorySlug)) {
      query.category = parsed.category as CategorySlug;
    }
    if (typeof parsed.maxPrice === 'number') query.maxPrice = parsed.maxPrice;
    if (typeof parsed.minPrice === 'number') query.minPrice = parsed.minPrice;

    const matches = searchProducts(query, 6);

    // ── Step 2: write a friendly reply grounded in the matches ─────────
    const catalogForModel = matches.map((p) => ({
      name: locale === 'ka' ? p.nameKa : p.nameEn,
      price: p.price,
      category: p.category,
      brand: p.brand,
      specs: p.specs,
    }));

    const replyPrompt = [
      {
        role: 'system',
        content:
          `You are MoBax's friendly shopping assistant for a mobile-accessories store in Georgia.\n` +
          (locale === 'ka'
            ? `Reply in Georgian.`
            : `Reply in English.`) +
          ` Keep it short (2-4 sentences). Recommend from the MATCHES below only — never invent products.\n` +
          `If MATCHES is empty, say you couldn't find an exact match and ask a clarifying question.\n` +
          `Don't list prices in a table; the UI shows product cards separately. Just guide the user.\n` +
          `MATCHES: ${JSON.stringify(catalogForModel)}`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const reply = await callModel(replyPrompt, 0.5);

    return NextResponse.json({
      reply: reply.trim() || (locale === 'ka' ? 'ვერ მოვძებნე შესაბამისი პროდუქტი.' : "I couldn't find a match."),
      products: matches.map((p) => toPublicProduct(p, locale)),
    });
  } catch (err) {
    console.error('[api/chat]', err);
    return NextResponse.json({ error: 'Assistant temporarily unavailable.' }, { status: 502 });
  }
}
