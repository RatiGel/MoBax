import { NextResponse } from 'next/server';

/** Consistent admin API envelope: { success, data, error }. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data, error: null }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

export function unauthorized(error = 'Unauthorized') {
  return fail(error, 401);
}

export function forbidden(error = 'Forbidden') {
  return fail(error, 403);
}

export function notFound(error = 'Not found') {
  return fail(error, 404);
}

export function serverError(error = 'Internal server error') {
  return fail(error, 500);
}
