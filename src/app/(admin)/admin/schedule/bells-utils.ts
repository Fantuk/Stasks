/**
 * Утилиты и типы для раздела «Звонки»: карточки шаблонов, черновики, форматирование.
 * Чистая логика без React-хуков.
 */

import type { BellTemplateSlot, CreateBellTemplateBody } from "@/app/(admin)/admin/schedule/bells-api";
import { getWeekdayLabel, inputTimeToIso, isoTimeToInput } from "@/lib/schedule-utils";

export type TemplateScheduleType = "date" | "weekday";

export type EditSlotValue = {
  startTime: string;
  endTime: string;
  secondStartTime: string;
  secondEndTime: string;
};

export type TemplateScope = {
  scheduleType: TemplateScheduleType;
  specificDate: string | null;
  weekdayStart: number | null;
  weekdayEnd: number | null;
  groupId: number | null;
};

export type BellTemplateCard = TemplateScope & {
  key: string;
  slots: BellTemplateSlot[];
};

export type BellTemplateDraft = TemplateScope & {
  slots: Record<number, EditSlotValue>;
};

export const LESSON_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export function createEmptyEditSlot(): EditSlotValue {
  return {
    startTime: "",
    endTime: "",
    secondStartTime: "",
    secondEndTime: "",
  };
}

export function createEmptyDraftSlots(): Record<number, EditSlotValue> {
  return LESSON_NUMBERS.reduce<Record<number, EditSlotValue>>((acc, lessonNumber) => {
    acc[lessonNumber] = createEmptyEditSlot();
    return acc;
  }, {});
}

export function normalizeSpecificDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

export function getSelectedWeekdays(scope: Pick<TemplateScope, "weekdayStart" | "weekdayEnd">): number[] {
  if (scope.weekdayStart == null || scope.weekdayEnd == null) {
    return [];
  }
  if (scope.weekdayStart > scope.weekdayEnd) {
    return [];
  }
  return Array.from(
    { length: scope.weekdayEnd - scope.weekdayStart + 1 },
    (_, index) => scope.weekdayStart! + index
  );
}

/**
 * Пользователь кликает по дням — поддерживаем непрерывный диапазон.
 */
export function toggleWeekdaySelection(selectedDays: number[], day: number): number[] {
  const rangeStart = selectedDays.length ? Math.min(...selectedDays) : 1;
  const rangeEnd = selectedDays.length ? Math.max(...selectedDays) : 7;
  const isUnchecking = selectedDays.includes(day);

  if (isUnchecking) {
    if (day === rangeEnd) {
      if (rangeStart === rangeEnd) return [];
      return Array.from({ length: rangeEnd - rangeStart }, (_, index) => rangeStart + index);
    }
    if (day === rangeStart) {
      if (rangeStart === rangeEnd) return [];
      return Array.from({ length: rangeEnd - rangeStart }, (_, index) => rangeStart + index + 1);
    }
    return Array.from({ length: day - rangeStart }, (_, index) => rangeStart + index);
  }

  const next = [...selectedDays, day].sort((a, b) => a - b);
  const nextStart = Math.min(...next);
  const nextEnd = Math.max(...next);
  return Array.from({ length: nextEnd - nextStart + 1 }, (_, index) => nextStart + index);
}

export function getScopeKey(scope: TemplateScope): string {
  const groupKey = scope.groupId == null ? "all" : String(scope.groupId);
  if (scope.scheduleType === "date") {
    return `date:${scope.specificDate ?? ""}:group:${groupKey}`;
  }
  return `weekday:${scope.weekdayStart ?? ""}:${scope.weekdayEnd ?? ""}:group:${groupKey}`;
}

export function getScopeFromSlot(slot: BellTemplateSlot): TemplateScope {
  return {
    scheduleType: slot.scheduleType,
    specificDate: normalizeSpecificDate(slot.specificDate),
    weekdayStart: slot.weekdayStart ?? null,
    weekdayEnd: slot.weekdayEnd ?? null,
    groupId: slot.groupId ?? null,
  };
}

export function createDraft(initial?: Partial<TemplateScope>): BellTemplateDraft {
  return {
    scheduleType: initial?.scheduleType ?? "weekday",
    specificDate: initial?.specificDate ?? new Date().toISOString().slice(0, 10),
    weekdayStart: initial?.weekdayStart ?? 1,
    weekdayEnd: initial?.weekdayEnd ?? 5,
    groupId: initial?.groupId ?? null,
    slots: createEmptyDraftSlots(),
  };
}

export function createDraftFromCard(card: BellTemplateCard): BellTemplateDraft {
  const draft = createDraft(card);
  for (const slot of card.slots) {
    draft.slots[slot.lessonNumber] = {
      startTime: isoTimeToInput(slot.startTime),
      endTime: isoTimeToInput(slot.endTime),
      secondStartTime: isoTimeToInput(slot.secondStartTime),
      secondEndTime: isoTimeToInput(slot.secondEndTime),
    };
  }
  return draft;
}

export function getSlotsByLesson(slots: BellTemplateSlot[]): Map<number, BellTemplateSlot> {
  const map = new Map<number, BellTemplateSlot>();
  for (const slot of slots) {
    map.set(slot.lessonNumber, slot);
  }
  return map;
}

export function compareCards(a: BellTemplateCard, b: BellTemplateCard): number {
  if (a.scheduleType !== b.scheduleType) {
    return a.scheduleType === "weekday" ? -1 : 1;
  }
  if (a.scheduleType === "weekday" && b.scheduleType === "weekday") {
    if ((a.weekdayStart ?? 0) !== (b.weekdayStart ?? 0)) {
      return (a.weekdayStart ?? 0) - (b.weekdayStart ?? 0);
    }
    if ((a.weekdayEnd ?? 0) !== (b.weekdayEnd ?? 0)) {
      return (a.weekdayEnd ?? 0) - (b.weekdayEnd ?? 0);
    }
  }
  if (a.scheduleType === "date" && b.scheduleType === "date") {
    return (a.specificDate ?? "").localeCompare(b.specificDate ?? "");
  }
  if ((a.groupId ?? -1) !== (b.groupId ?? -1)) {
    return (a.groupId ?? -1) - (b.groupId ?? -1);
  }
  return a.key.localeCompare(b.key);
}

/**
 * API возвращает отдельные строки по урокам.
 * Группируем их в «карточки шаблонов» по общему scope.
 */
export function groupSlotsToCards(slots: BellTemplateSlot[]): BellTemplateCard[] {
  const cardsMap = new Map<string, BellTemplateCard>();

  for (const slot of slots) {
    const scope = getScopeFromSlot(slot);
    const key = getScopeKey(scope);
    const existing = cardsMap.get(key);

    if (existing) {
      existing.slots.push(slot);
      continue;
    }

    cardsMap.set(key, {
      ...scope,
      key,
      slots: [slot],
    });
  }

  return Array.from(cardsMap.values())
    .map((card) => ({
      ...card,
      slots: [...card.slots].sort((a, b) => a.lessonNumber - b.lessonNumber),
    }))
    .sort(compareCards);
}

export function buildSlotBody(
  lessonNumber: number,
  row: EditSlotValue,
  draft: BellTemplateDraft
): CreateBellTemplateBody {
  const body: CreateBellTemplateBody = {
    scheduleType: draft.scheduleType,
    lessonNumber,
    startTime: inputTimeToIso(row.startTime),
    endTime: inputTimeToIso(row.endTime),
    secondStartTime: row.secondStartTime ? inputTimeToIso(row.secondStartTime) : null,
    secondEndTime: row.secondEndTime ? inputTimeToIso(row.secondEndTime) : null,
    groupId: draft.groupId,
  };

  if (draft.scheduleType === "date") {
    body.specificDate = `${draft.specificDate}T00:00:00.000Z`;
    body.weekdayStart = null;
    body.weekdayEnd = null;
  } else {
    body.specificDate = null;
    body.weekdayStart = draft.weekdayStart;
    body.weekdayEnd = draft.weekdayEnd;
  }

  return body;
}

export function formatCardScope(card: TemplateScope): string {
  if (card.scheduleType === "date") {
    return card.specificDate ? `Дата: ${card.specificDate}` : "Дата не указана";
  }
  return `Дни: ${getWeekdayLabel(card.weekdayStart)} - ${getWeekdayLabel(card.weekdayEnd)}`;
}
