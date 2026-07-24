# Admin-Editable Home FAQ — Design

Date: 2026-07-08

## Goal

Let admins add, edit, and delete the Frequently Asked Questions shown on the
storefront home page. Today those 5 items are hardcoded as `faqQ1..5` /
`faqA1..5` i18n strings in `messages/en.json` and `messages/ka.json`.

## Storage

Reuse the existing `Setting` key-value model. One doc:

- key: `faq` (add to `SETTING_KEYS` as `FAQ`)
- value: ordered array of items

```ts
interface FaqItem {
  id: string;         // stable key for React + delete targeting
  questionEn: string;
  questionKa: string;
  answerEn: string;
  answerKa: string;
}
```

Order = array order.

## Validation

Add `FaqItemSchema` + `FaqItemsSchema` (array) to `lib/validations.ts`.
The settings PATCH route already accepts an arbitrary `record`. Add a targeted
check: if the payload contains `faqItems`/`faq`, validate it with
`FaqItemsSchema` before upsert. Keep it defensive but non-breaking for other
settings.

## Storefront read

New `lib/faq.ts`, mirroring `lib/theme.ts`:

- `getStoreFaq(): Promise<FaqItem[]>` — `connectDB`, `Setting.findOne({key:'faq'})`,
  return `value` if a non-empty array, else `[]`. Never throws (DB hiccup → `[]`).

Home `app/[locale]/(shop)/page.tsx` (already an async server component):

- `const faq = await getStoreFaq();`
- If `faq.length` → render those items (question/answer by `locale`).
- Else → fall back to the current hardcoded `faqQ1..5` i18n loop (no data loss
  before the setting is first saved).

## Admin UI

Add a "FAQ" card inside `app/admin/content/ContentClient.tsx`.

- Loads current `faq` setting via `apiFetch('/api/admin/settings')` on mount.
- Renders one editable row per item: EN question, KA question, EN answer
  (Textarea), KA answer (Textarea).
- "Add question" → append a blank row with a fresh `id`.
- Trash icon per row → remove it.
- Up / down buttons per row → reorder (no drag — YAGNI).
- "Save FAQ" → `apiFetch('/api/admin/settings', {method:'PATCH', body:{faq:[...]}})`,
  then `toast` success. Reuses existing envelope + activity logging.

`id` generated client-side (crypto.randomUUID / fallback) — server keeps as-is.

## Seed

Seed `faq` from the current 5 EN/KA message strings so the admin opens to
populated, editable content on first run. A tiny idempotent step: only write if
the `faq` setting is missing. Placed in the existing seed path if present;
otherwise a one-off script under `scripts/`.

## Out of scope (YAGNI)

Drag reorder, rich text, per-item visibility toggle, a separate public FAQ page,
moving other home copy to the DB.

## Files touched

- `models/Setting.ts` — add `FAQ` to `SETTING_KEYS`.
- `lib/validations.ts` — `FaqItemSchema`, `FaqItemsSchema`.
- `lib/faq.ts` — new, `getStoreFaq()`.
- `app/api/admin/settings/route.ts` — validate `faq` on write.
- `app/admin/content/ContentClient.tsx` — FAQ editor card.
- `app/[locale]/(shop)/page.tsx` — read setting, fallback to i18n.
- seed (existing seed script or new `scripts/seed-faq.ts`).

## Note

Working dir is not a git repo — design doc is written but not committed.
