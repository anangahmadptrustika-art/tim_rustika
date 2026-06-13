import { differenceInCalendarDays, isWeekend } from 'date-fns';

/**
 * Whole-day difference between two dates (calendar days, timezone-naive on UTC).
 * Positive when `later` is after `earlier`.
 */
export function calendarDaysBetween(earlier: Date, later: Date): number {
  return differenceInCalendarDays(later, earlier);
}

/**
 * Count business days between two dates, excluding weekends and the provided
 * holiday set. Inclusive of `from`, exclusive of `to`.
 */
export function businessDaysBetween(from: Date, to: Date, holidays: Date[] = []): number {
  const holidaySet = new Set(holidays.map((d) => d.toISOString().slice(0, 10)));
  let count = 0;
  const cursor = new Date(from);
  while (cursor < to) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!isWeekend(cursor) && !holidaySet.has(iso)) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Is the given date a valid compensation workday (weekend or holiday)? */
export function isCompensationEligibleDay(date: Date, holidays: Date[] = []): boolean {
  const iso = date.toISOString().slice(0, 10);
  const holidaySet = new Set(holidays.map((d) => d.toISOString().slice(0, 10)));
  return isWeekend(date) || holidaySet.has(iso);
}

export function periodOf(date: Date): { year: number; month: number } {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}
