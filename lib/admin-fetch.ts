'use client';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/** Client-side fetch wrapper for admin API. Throws on non-2xx with the API error message. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  let body: ApiEnvelope<T>;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body.data as T;
}
