import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateSettingsSchema, FaqItemsSchema, NavSettingsSchema, FooterSettingsSchema, TypographySchema } from '@/lib/validations';
import Setting, { SETTING_KEYS } from '@/models/Setting';
import { revalidateStorefront } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin({ module: 'settings' });
    await connectDB();

    const docs = await Setting.find({}).lean();
    const settings = docs.reduce<Record<string, unknown>>((acc, d) => {
      acc[d.key] = d.value;
      return acc;
    }, {});

    return ok({ settings });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/settings GET]', err);
    return fail('Failed to load settings', 500);
  }
}

async function applyUpdate(req: NextRequest) {
  const session = await requireAdmin({ module: 'settings' });
  await connectDB();

  const json = await req.json();
  const parsed = UpdateSettingsSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid settings data', 422);
  }

  // The settings map is loose, but a few keys have a strict shape — validate
  // those explicitly when present so a malformed payload can't corrupt the
  // storefront's FAQ, nav, footer, or typography.
  if (SETTING_KEYS.FAQ in parsed.data) {
    const faqParsed = FaqItemsSchema.safeParse(parsed.data[SETTING_KEYS.FAQ]);
    if (!faqParsed.success) {
      return fail(faqParsed.error.issues[0]?.message ?? 'Invalid FAQ data', 422);
    }
    parsed.data[SETTING_KEYS.FAQ] = faqParsed.data;
  }
  if (SETTING_KEYS.NAV in parsed.data) {
    const navParsed = NavSettingsSchema.safeParse(parsed.data[SETTING_KEYS.NAV]);
    if (!navParsed.success) {
      return fail(navParsed.error.issues[0]?.message ?? 'Invalid nav data', 422);
    }
    parsed.data[SETTING_KEYS.NAV] = navParsed.data;
  }
  if (SETTING_KEYS.FOOTER in parsed.data) {
    const footerParsed = FooterSettingsSchema.safeParse(parsed.data[SETTING_KEYS.FOOTER]);
    if (!footerParsed.success) {
      return fail(footerParsed.error.issues[0]?.message ?? 'Invalid footer data', 422);
    }
    parsed.data[SETTING_KEYS.FOOTER] = footerParsed.data;
  }
  if (SETTING_KEYS.TYPOGRAPHY in parsed.data) {
    const typographyParsed = TypographySchema.safeParse(parsed.data[SETTING_KEYS.TYPOGRAPHY]);
    if (!typographyParsed.success) {
      return fail(typographyParsed.error.issues[0]?.message ?? 'Invalid typography data', 422);
    }
    parsed.data[SETTING_KEYS.TYPOGRAPHY] = typographyParsed.data;
  }

  const entries = Object.entries(parsed.data);
  await Promise.all(
    entries.map(([key, value]) =>
      Setting.findOneAndUpdate(
        { key },
        { $set: { value } },
        { upsert: true, new: true }
      )
    )
  );

  await logActivity(session, 'settings.update', 'Setting', undefined, {
    keys: entries.map(([k]) => k),
  });

  // Nav, footer, and typography all render inside the locale layout — revalidate
  // it so a save appears on the storefront immediately instead of after the
  // 60s ISR window.
  const keys = entries.map(([k]) => k);
  const contentKeys: string[] = [SETTING_KEYS.NAV, SETTING_KEYS.FOOTER, SETTING_KEYS.FAQ];
  if (keys.some((k) => contentKeys.includes(k))) {
    revalidateStorefront('content');
  }
  if (keys.includes(SETTING_KEYS.TYPOGRAPHY)) {
    revalidateStorefront('theme');
  }

  // Return the full, fresh settings map so the client can resync.
  const docs = await Setting.find({}).lean();
  const settings = docs.reduce<Record<string, unknown>>((acc, d) => {
    acc[d.key] = d.value;
    return acc;
  }, {});

  return ok({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    return await applyUpdate(req);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/settings PATCH]', err);
    return fail('Failed to update settings', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    return await applyUpdate(req);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/settings PUT]', err);
    return fail('Failed to update settings', 500);
  }
}
