import { z } from 'zod';

export const RoleEnum = z.enum(['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE']);
export const DifficultyEnum = z.enum(['TRIVIAL', 'EASY', 'MEDIUM', 'HARD', 'CRITICAL']);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createTaskSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().max(5000).optional(),
    assigneeId: z.string().cuid(),
    departmentId: z.string().cuid().optional(),
    difficulty: DifficultyEnum.default('MEDIUM'),
    weight: z.number().min(0.1).max(10).default(1),
    basePoints: z.number().int().min(0).max(10000).default(100),
    startDate: z.coerce.date(),
    deadline: z.coerce.date(),
  })
  .refine((d) => d.deadline > d.startDate, {
    message: 'Deadline must be after the start date',
    path: ['deadline'],
  });

export const updateTaskProgressSchema = z.object({
  progress: z.number().int().min(0).max(100),
});

export const approvalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(2000).optional(),
});

export const scoringConfigSchema = z.object({
  multTrivial: z.number().min(0),
  multEasy: z.number().min(0),
  multMedium: z.number().min(0),
  multHard: z.number().min(0),
  multCritical: z.number().min(0),
  earlyBonusPerDay: z.number().int().min(0),
  earlyBonusCap: z.number().int().min(0),
  latePenaltyPerDay: z.number().int().min(0),
  latePenaltyCap: z.number().int().min(0),
  compensationThresholdDays: z.number().int().min(0),
  compensationDaysPerLateDay: z.number().min(0),
});

export const conversionRateSchema = z.object({
  rupiahPerPoint: z.number().int().min(0),
  currency: z.string().default('IDR'),
  effectiveFrom: z.coerce.date().optional(),
});

export const compensationWorkdaySchema = z.object({
  compensationId: z.string().cuid(),
  workDate: z.coerce.date(),
  hours: z.number().min(0).max(24).default(8),
  note: z.string().max(1000).optional(),
  proofUrl: z.string().url().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ApprovalInput = z.infer<typeof approvalSchema>;
