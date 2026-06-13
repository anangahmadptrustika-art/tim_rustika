import { PrismaClient, Difficulty } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Rustika PMS…');
  const password = await bcrypt.hash('Password123!', 10);

  // ---- Departments ---------------------------------------------------------
  const engineering = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: { name: 'Engineering', colorHex: '#6366f1' },
  });
  const sales = await prisma.department.upsert({
    where: { name: 'Sales' },
    update: {},
    create: { name: 'Sales', colorHex: '#10b981' },
  });

  // ---- Users ---------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rustika.co.id' },
    update: {},
    create: {
      email: 'admin@rustika.co.id',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: password,
      phone: '+6281200000001',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@rustika.co.id' },
    update: {},
    create: {
      email: 'manager@rustika.co.id',
      name: 'Maya Manager',
      role: 'MANAGER',
      passwordHash: password,
      phone: '+6281200000002',
      departmentId: engineering.id,
    },
  });

  const employees = [];
  for (const [i, name] of ['Adi Pratama', 'Budi Santoso', 'Citra Dewi', 'Dian Putri'].entries()) {
    const email = `employee${i + 1}@rustika.co.id`;
    const emp = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        role: 'EMPLOYEE',
        passwordHash: password,
        phone: `+62812000001${i}0`,
        departmentId: i % 2 === 0 ? engineering.id : sales.id,
        managerId: manager.id,
      },
    });
    employees.push(emp);
  }

  await prisma.department.update({ where: { id: engineering.id }, data: { headId: manager.id } });

  // ---- Scoring config (global default) ------------------------------------
  const existingConfig = await prisma.scoringConfig.findFirst({ where: { departmentId: null } });
  if (!existingConfig) {
    await prisma.scoringConfig.create({ data: { name: 'global-default' } });
  }

  // ---- Conversion rate -----------------------------------------------------
  const existingRate = await prisma.conversionRate.findFirst({ where: { isActive: true } });
  if (!existingRate) {
    await prisma.conversionRate.create({ data: { rupiahPerPoint: 1000, createdBy: admin.id } });
  }

  // ---- Badges --------------------------------------------------------------
  const badges = [
    { key: 'EARLY_BIRD', name: 'Early Bird', description: 'Complete 5 tasks before deadline', tier: 'SILVER' as const, criteria: { earlyCompletions: 5 } },
    { key: 'CENTURION', name: 'Centurion', description: 'Earn 1000 points in a month', tier: 'GOLD' as const, criteria: { monthlyPoints: 1000 } },
    { key: 'FLAWLESS', name: 'Flawless', description: 'Zero late tasks in a month', tier: 'PLATINUM' as const, criteria: { lateTasks: 0 } },
  ];
  for (const b of badges) {
    await prisma.badge.upsert({ where: { key: b.key }, update: {}, create: b });
  }

  // ---- Demo tasks ----------------------------------------------------------
  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    const today = new Date();
    const difficulties: Difficulty[] = ['EASY', 'MEDIUM', 'HARD', 'CRITICAL'];
    for (let i = 0; i < 8; i++) {
      const assignee = employees[i % employees.length];
      const start = new Date(today.getTime() - (i + 2) * 24 * 60 * 60 * 1000);
      const deadline = new Date(today.getTime() + (i % 3) * 24 * 60 * 60 * 1000);
      await prisma.task.create({
        data: {
          code: `TSK-${String(i + 1).padStart(5, '0')}`,
          title: `Demo task ${i + 1}`,
          description: 'Auto-generated seed task.',
          assigneeId: assignee.id,
          creatorId: manager.id,
          departmentId: assignee.departmentId,
          difficulty: difficulties[i % difficulties.length],
          weight: 1 + (i % 3) * 0.5,
          basePoints: 100,
          startDate: start,
          deadline,
          status: i % 4 === 0 ? 'SUBMITTED' : 'IN_PROGRESS',
          progress: i % 4 === 0 ? 100 : (i * 13) % 100,
        },
      });
    }
  }

  console.log('✅ Seed complete.');
  console.log('   Admin:    admin@rustika.co.id / Password123!');
  console.log('   Manager:  manager@rustika.co.id / Password123!');
  console.log('   Employee: employee1@rustika.co.id / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
