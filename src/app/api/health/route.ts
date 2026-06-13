import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Liveness + DB readiness probe for Docker / Kubernetes.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'up', ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 });
  }
}
