import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handleError, ok, requireUser } from '@/lib/api';
import { assertCan } from '@/lib/rbac';
import { createUserSchema } from '@/lib/validations';
import { writeAudit } from '@/server/services/audit.service';

// GET /api/users — list users (admin/manager).
export async function GET() {
  try {
    const user = await requireUser();
    assertCan(user.role, 'analytics.team');
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        department: { select: { name: true } },
      },
    });
    return ok(users);
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/users — create an account (Super Admin only).
export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();
    assertCan(actor.role, 'user.manage');
    const body = createUserSchema.parse(await req.json());

    const passwordHash = await bcrypt.hash(body.password, 10);
    const created = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash,
        role: body.role,
        phone: body.phone || null,
        jobTitle: body.jobTitle || null,
        departmentId: body.departmentId || null,
        managerId: body.managerId || null,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await writeAudit({ actorId: actor.id, action: 'user.create', entity: 'User', entityId: created.id });
    return ok(created, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return ok({ error: 'Email already in use' }, { status: 409 });
    }
    return handleError(e);
  }
}
