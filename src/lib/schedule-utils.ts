/**
 * Общие утилиты расписания: дни недели, форматирование даты/времени, диапазон недели.
 * Используются в админке (расписание, звонки) и в публичном расписании.
 */

/** День недели: value 1–7 (Пн–Вс), label — короткое имя, full — полное имя */
export const WEEKDAY_LIST: { value: number; label: string; full: string }[] = [
  { value: 1, label: "Пн", full: "Понедельник" },
  { value: 2, label: "Вт", full: "Вторник" },
  { value: 3, label: "Ср", full: "Среда" },
  { value: 4, label: "Чт", full: "Четверг" },
  { value: 5, label: "Пт", full: "Пятница" },
  { value: 6, label: "Сб", full: "Суббота" },
  { value: 7, label: "Вс", full: "Воскресенье" },
];

/** Формат даты как в макете: ДД.ММ.ГГ */
export function formatDateLabel(date: Date): string {
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const yy = (date.getFullYear() % 100).toString().padStart(2, "0");
  return `${dd}.${mm}.${yy}`;
}

/** Неделя: понедельник 00:00 — воскресенье 23:59 по смещению от текущей */
export function getWeekRangeIso(weekOffset: number): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay() || 7; // 1..7, где 1 — Пн
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day - 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { from: monday.toISOString(), to: sunday.toISOString() };
}

/** ISO/Date → "HH:mm" для таблиц; при отсутствии — "—" */
export function formatTimeShort(isoTime: string | Date | null | undefined): string {
  if (!isoTime) return "—";
  const date = typeof isoTime === "string" ? new Date(isoTime) : isoTime;
  const h = date.getUTCHours();
  const m = date.getUTCMinutes();
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Время из ISO в формат макета "HH : mm" (для звонков) */
export function formatTimeFigma(iso: string | Date | null | undefined): string {
  if (!iso) return "-- : --";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours} : ${minutes}`;
}

/** ISO → "HH:mm" для input[type=time] */
export function isoTimeToInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** "HH:mm" → ISO (UTC, 1970-01-01) для API */
export function inputTimeToIso(hhmm: string): string {
  if (!hhmm) return "";
  const [hours, minutes] = hhmm.split(":").map(Number);
  const date = new Date(Date.UTC(1970, 0, 1, hours ?? 0, minutes ?? 0, 0, 0));
  return date.toISOString();
}

/** Подпись дня недели по value (1–7); fallback "Не задано" */
export function getWeekdayLabel(value: number | null | undefined): string {
  return WEEKDAY_LIST.find((item) => item.value === value)?.label ?? "Не задано";
}
