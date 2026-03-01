import { ScheduleType } from '@prisma/client';

/** Минимальный набор полей шаблона для проверки применимости к дате */
export type BellTemplateDateCheck = {
  scheduleType: ScheduleType;
  specificDate: Date | null;
  weekdayStart: number | null;
  weekdayEnd: number | null;
};

/**
 * Возвращает день недели в формате 1 (пн) — 7 (вс) для переданной даты (UTC).
 */
export function getIsoWeekday(date: Date): number {
  return ((date.getUTCDay() + 6) % 7) + 1;
}

/**
 * Проверяет, подходит ли шаблон звонков для указанной даты занятия.
 * - scheduleType === 'date': specificDate должен совпадать с датой (тот же календарный день).
 * - scheduleType === 'weekday': день недели date должен быть в [weekdayStart, weekdayEnd].
 */
export function isBellTemplateApplicableForDate(
  template: BellTemplateDateCheck,
  date: Date,
): boolean {
  if (template.scheduleType === 'date') {
    if (!template.specificDate) return false;
    return isSameCalendarDay(template.specificDate, date);
  }
  // weekday
  if (
    template.weekdayStart == null ||
    template.weekdayEnd == null
  ) return false;
  const weekday = getIsoWeekday(date);
  return weekday >= template.weekdayStart && weekday <= template.weekdayEnd;
}

/** Сравнение двух дат по календарному дню (год, месяц, день) без учёта времени. */
function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
