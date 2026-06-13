import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from './auth';
import { ForbiddenError, UnauthorizedError } from './rbac';

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

/** Standard JSON success envelope. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

/** Convert thrown errors into consistent JSON error responses. */
export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', issues: error.flatten() },
      { status: 422 },
    );
  }
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error('[api] unhandled error', error);
  return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
}
