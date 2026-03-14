"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  bulkDeleteBellScope,
  createBellTemplate,
  deleteBellTemplate,
  fetchBellTemplates,
  updateBellTemplate,
  type BellTemplateSlot,
  type CreateBellTemplateBody,
} from "@/app/(admin)/admin/schedule/bells-api";
import { fetchGroups } from "@/app/(admin)/admin/groups/groups-api";

const BELLS_QUERY_KEY = "admin-bells" as const;
const GROUPS_QUERY_KEY = "admin-groups" as const;
const NEW_CARD_KEY = "__new-bell-template__" as const;
const LESSON_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
];

type TemplateScheduleType = "date" | "weekday";

type EditSlotValue = {
  startTime: string;
  endTime: string;
  secondStartTime: string;
  secondEndTime: string;
};

type TemplateScope = {
  scheduleType: TemplateScheduleType;
  specificDate: string | null;
  weekdayStart: number | null;
  weekdayEnd: number | null;
  groupId: number | null;
};

type BellTemplateCard = TemplateScope & {
  key: string;
  slots: BellTemplateSlot[];
};

type BellTemplateDraft = TemplateScope & {
  slots: Record<number, EditSlotValue>;
};

/** Время из ISO в формат макета "HH : mm" */
function formatTimeFigma(iso: string | Date | null | undefined): string {
  if (!iso) return "-- : --";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours} : ${minutes}`;
}

/** ISO → "HH:mm" для input[type=time] */
function isoTimeToInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** "HH:mm" → ISO (UTC, 1970-01-01) для API */
function inputTimeToIso(hhmm: string): string {
  if (!hhmm) return "";
  const [hours, minutes] = hhmm.split(":").map(Number);
  const date = new Date(Date.UTC(1970, 0, 1, hours ?? 0, minutes ?? 0, 0, 0));
  return date.toISOString();
}

function createEmptyEditSlot(): EditSlotValue {
  return {
    startTime: "",
    endTime: "",
    secondStartTime: "",
    secondEndTime: "",
  };
}

function createEmptyDraftSlots(): Record<number, EditSlotValue> {
  return LESSON_NUMBERS.reduce<Record<number, EditSlotValue>>((acc, lessonNumber) => {
    acc[lessonNumber] = createEmptyEditSlot();
    return acc;
  }, {});
}

function normalizeSpecificDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function getWeekdayLabel(value: number | null | undefined): string {
  return WEEKDAY_LABELS.find((item) => item.value === value)?.label ?? "Не задано";
}

function getSelectedWeekdays(scope: Pick<TemplateScope, "weekdayStart" | "weekdayEnd">): number[] {
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
 * Оставляем старую механику выбора дней:
 * пользователь кликает по дням, а мы поддерживаем непрерывный диапазон.
 */
function toggleWeekdaySelection(selectedDays: number[], day: number): number[] {
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

function getScopeKey(scope: TemplateScope): string {
  const groupKey = scope.groupId == null ? "all" : String(scope.groupId);
  if (scope.scheduleType === "date") {
    return `date:${scope.specificDate ?? ""}:group:${groupKey}`;
  }
  return `weekday:${scope.weekdayStart ?? ""}:${scope.weekdayEnd ?? ""}:group:${groupKey}`;
}

function getScopeFromSlot(slot: BellTemplateSlot): TemplateScope {
  return {
    scheduleType: slot.scheduleType,
    specificDate: normalizeSpecificDate(slot.specificDate),
    weekdayStart: slot.weekdayStart ?? null,
    weekdayEnd: slot.weekdayEnd ?? null,
    groupId: slot.groupId ?? null,
  };
}

function createDraft(initial?: Partial<TemplateScope>): BellTemplateDraft {
  return {
    scheduleType: initial?.scheduleType ?? "weekday",
    specificDate: initial?.specificDate ?? new Date().toISOString().slice(0, 10),
    weekdayStart: initial?.weekdayStart ?? 1,
    weekdayEnd: initial?.weekdayEnd ?? 5,
    groupId: initial?.groupId ?? null,
    slots: createEmptyDraftSlots(),
  };
}

function createDraftFromCard(card: BellTemplateCard): BellTemplateDraft {
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

function getSlotsByLesson(slots: BellTemplateSlot[]): Map<number, BellTemplateSlot> {
  const map = new Map<number, BellTemplateSlot>();
  for (const slot of slots) {
    map.set(slot.lessonNumber, slot);
  }
  return map;
}

function compareCards(a: BellTemplateCard, b: BellTemplateCard): number {
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
 * На экране группируем их в "карточки шаблонов" по общему scope.
 */
function groupSlotsToCards(slots: BellTemplateSlot[]): BellTemplateCard[] {
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

function buildSlotBody(
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

function formatCardScope(card: TemplateScope): string {
  if (card.scheduleType === "date") {
    return card.specificDate ? `Дата: ${card.specificDate}` : "Дата не указана";
  }
  return `Дни: ${getWeekdayLabel(card.weekdayStart)} - ${getWeekdayLabel(card.weekdayEnd)}`;
}

export function BellsContent() {
  const queryClient = useQueryClient();
  const [scheduleTypeFilter, setScheduleTypeFilter] = React.useState<
    TemplateScheduleType | "all"
  >("all");
  const [groupIdFilter, setGroupIdFilter] = React.useState<number | "">("");
  const [editingCardKey, setEditingCardKey] = React.useState<string | null>(null);
  const [draftCard, setDraftCard] = React.useState<BellTemplateDraft | null>(null);

  const { data: groupsData } = useQuery({
    queryKey: [GROUPS_QUERY_KEY, "all"],
    queryFn: () => fetchGroups({ page: 1, limit: 500 }),
  });
  const groups = React.useMemo(() => groupsData?.data ?? [], [groupsData?.data]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: [BELLS_QUERY_KEY, scheduleTypeFilter, groupIdFilter],
    queryFn: () =>
      fetchBellTemplates({
        page: 1,
        limit: 500,
        ...(scheduleTypeFilter !== "all" ? { scheduleType: scheduleTypeFilter } : {}),
        ...(groupIdFilter !== "" ? { groupId: groupIdFilter } : {}),
      }),
  });

  const createMutation = useMutation({
    mutationFn: createBellTemplate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: CreateBellTemplateBody }) =>
      updateBellTemplate(id, body),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBellTemplate,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteBellScope,
  });

  const cards = React.useMemo(() => groupSlotsToCards(data?.data ?? []), [data?.data]);
  const editingCard = React.useMemo(
    () => cards.find((card) => card.key === editingCardKey) ?? null,
    [cards, editingCardKey]
  );

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkDeleteMutation.isPending;

  const getGroupName = React.useCallback(
    (groupId: number | null) => {
      if (groupId == null) return "Все группы";
      return groups.find((group) => group.id === groupId)?.name ?? `Группа #${groupId}`;
    },
    [groups]
  );

  const resetEditor = React.useCallback(() => {
    setEditingCardKey(null);
    setDraftCard(null);
  }, []);

  const handleCreateCard = React.useCallback(() => {
    setEditingCardKey(NEW_CARD_KEY);
    setDraftCard(
      createDraft({
        groupId: groupIdFilter === "" ? null : groupIdFilter,
        scheduleType: scheduleTypeFilter === "all" ? "weekday" : scheduleTypeFilter,
      })
    );
  }, [groupIdFilter, scheduleTypeFilter]);

  const handleEditCard = React.useCallback((card: BellTemplateCard) => {
    setEditingCardKey(card.key);
    setDraftCard(createDraftFromCard(card));
  }, []);

  const updateDraftScope = React.useCallback((next: Partial<TemplateScope>) => {
    setDraftCard((prev) => (prev ? { ...prev, ...next } : prev));
  }, []);

  const updateDraftSlot = React.useCallback(
    (lessonNumber: number, next: Partial<EditSlotValue>) => {
      setDraftCard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slots: {
            ...prev.slots,
            [lessonNumber]: {
              ...(prev.slots[lessonNumber] ?? createEmptyEditSlot()),
              ...next,
            },
          },
        };
      });
    },
    []
  );

  const handleDeleteCard = React.useCallback(
    async (card: BellTemplateCard) => {
      const scopeLabel = `${getGroupName(card.groupId)}, ${formatCardScope(card)}`;
      if (!window.confirm(`Удалить шаблон звонков "${scopeLabel}"?`)) {
        return;
      }

      try {
        await bulkDeleteMutation.mutateAsync({
          filter:
            card.scheduleType === "date"
              ? {
                  scheduleType: "date",
                  specificDate: `${card.specificDate}T00:00:00.000Z`,
                  groupId: card.groupId,
                }
              : {
                  scheduleType: "weekday",
                  weekdayStart: card.weekdayStart ?? undefined,
                  weekdayEnd: card.weekdayEnd ?? undefined,
                  groupId: card.groupId,
                },
        });
        await queryClient.invalidateQueries({ queryKey: [BELLS_QUERY_KEY] });
        if (editingCardKey === card.key) {
          resetEditor();
        }
      } catch (err) {
        const message =
          (isAxiosError(err) && err.response?.data?.message) ||
          (err instanceof Error ? err.message : "Не удалось удалить шаблон звонков");
        window.alert(message);
      }
    },
    [bulkDeleteMutation, editingCardKey, getGroupName, queryClient, resetEditor]
  );

  const handleSaveCard = React.useCallback(async () => {
    if (!draftCard) return;

    try {
      if (draftCard.scheduleType === "date" && !draftCard.specificDate) {
        throw new Error("Укажите дату для шаблона");
      }
      if (
        draftCard.scheduleType === "weekday" &&
        (draftCard.weekdayStart == null || draftCard.weekdayEnd == null)
      ) {
        throw new Error("Укажите диапазон дней недели");
      }
      if (
        draftCard.scheduleType === "weekday" &&
        (draftCard.weekdayStart ?? 0) > (draftCard.weekdayEnd ?? 0)
      ) {
        throw new Error("Начальный день недели не может быть позже конечного");
      }

      const existingSlotsByLesson = getSlotsByLesson(editingCard?.slots ?? []);
      let hasFilledLessons = false;

      for (const lessonNumber of LESSON_NUMBERS) {
        const row = draftCard.slots[lessonNumber] ?? createEmptyEditSlot();
        const hasPrimaryValue = Boolean(row.startTime || row.endTime);
        const hasPrimaryTimes = Boolean(row.startTime && row.endTime);
        const hasSecondaryValue = Boolean(row.secondStartTime || row.secondEndTime);
        const hasSecondaryTimes = Boolean(row.secondStartTime && row.secondEndTime);

        if (hasPrimaryValue && !hasPrimaryTimes) {
          throw new Error(`Урок ${lessonNumber}: заполните начало и конец первого сегмента`);
        }
        if (hasSecondaryValue && !hasSecondaryTimes) {
          throw new Error(`Урок ${lessonNumber}: заполните начало и конец второго сегмента`);
        }
        if (hasSecondaryTimes && !hasPrimaryTimes) {
          throw new Error(`Урок ${lessonNumber}: второй сегмент нельзя сохранить без первого`);
        }
        if (hasPrimaryTimes && row.startTime >= row.endTime) {
          throw new Error(`Урок ${lessonNumber}: конец первого сегмента должен быть позже начала`);
        }
        if (hasSecondaryTimes && row.secondStartTime >= row.secondEndTime) {
          throw new Error(`Урок ${lessonNumber}: конец второго сегмента должен быть позже начала`);
        }
        if (hasPrimaryTimes && hasSecondaryTimes && row.endTime > row.secondStartTime) {
          throw new Error(
            `Урок ${lessonNumber}: второй сегмент должен начинаться не раньше окончания первого`
          );
        }
        if (hasPrimaryTimes) {
          hasFilledLessons = true;
        }
      }

      if (!hasFilledLessons) {
        throw new Error("Добавьте хотя бы один урок в шаблон");
      }

      /**
       * На API каждая строка урока хранится отдельной записью.
       * Поэтому карточку сохраняем как пачку create/update/delete по урокам.
       */
      for (const lessonNumber of LESSON_NUMBERS) {
        const row = draftCard.slots[lessonNumber] ?? createEmptyEditSlot();
        const existingSlot = existingSlotsByLesson.get(lessonNumber);
        const hasPrimaryTimes = Boolean(row.startTime && row.endTime);

        if (hasPrimaryTimes) {
          const body = buildSlotBody(lessonNumber, row, draftCard);
          if (existingSlot?.id != null) {
            await updateMutation.mutateAsync({ id: existingSlot.id, body });
          } else {
            await createMutation.mutateAsync(body);
          }
        } else if (existingSlot?.id != null) {
          await deleteMutation.mutateAsync(existingSlot.id);
        }
      }

      await queryClient.invalidateQueries({ queryKey: [BELLS_QUERY_KEY] });
      resetEditor();
    } catch (err) {
      const message =
        (isAxiosError(err) && err.response?.data?.message) ||
        (err instanceof Error ? err.message : "Не удалось сохранить шаблон звонков");
      window.alert(message);
    }
  }, [createMutation, deleteMutation, draftCard, editingCard, queryClient, resetEditor, updateMutation]);

  if (isError) {
    return (
      <div
        className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        style={{ backgroundColor: "#f8e8e9", borderColor: "#d2686a", color: "#671012" }}
      >
        {error instanceof Error ? error.message : "Ошибка загрузки списка звонков"}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg p-4" style={{ backgroundColor: "#f6f6f6" }}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { value: "all" as const, label: "Все" },
            { value: "weekday" as const, label: "Неделя" },
            { value: "date" as const, label: "Дата" },
          ].map((item) => {
            const active = scheduleTypeFilter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setScheduleTypeFilter(item.value)}
                className="h-8 rounded-lg border px-3 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? "#f4f1fe" : "#ffffff",
                  borderColor: active ? "#b5a3fa" : "#d7d7d7",
                  color: active ? "#4f4188" : "#333333",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <select
          value={groupIdFilter === "" ? "" : String(groupIdFilter)}
          onChange={(event) => {
            const nextValue = event.target.value;
            setGroupIdFilter(nextValue === "" ? "" : Number(nextValue));
          }}
          className="h-8 rounded-lg border px-3 text-sm font-medium"
          style={{
            backgroundColor: "#e7f6f9",
            borderColor: "#5bc5d6",
            color: "#065d6b",
          }}
        >
          <option value="">Все группы</option>
          {groups
            .filter((group): group is typeof group & { id: number } => group.id != null)
            .map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm" style={{ color: "#929292" }}>
            Шаблонов: {cards.length}
          </span>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg gap-1.5 font-medium"
            style={{ backgroundColor: "#836be1", color: "#ffffff" }}
            onClick={handleCreateCard}
            disabled={draftCard != null}
          >
            <Plus className="size-4" />
            Добавить шаблон
          </Button>
        </div>
      </div>

      {editingCardKey === NEW_CARD_KEY && draftCard && (
        <div
          className="rounded-xl border p-4 shadow-sm"
          style={{ backgroundColor: "#ffffff", borderColor: "#d9d2fb" }}
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold" style={{ color: "#333333" }}>
                Новый шаблон звонков
              </h3>
              <p className="text-sm" style={{ color: "#929292" }}>
                Создайте отдельную карточку с собственным диапазоном дней, датой и уроками.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg"
                onClick={resetEditor}
                disabled={isMutating}
              >
                Отмена
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-lg"
                style={{ backgroundColor: "#836be1", color: "#ffffff" }}
                onClick={handleSaveCard}
                disabled={isMutating}
              >
                {isMutating ? "Сохранение…" : "Сохранить шаблон"}
              </Button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="flex flex-col gap-2 text-sm md:col-span-2">
              <span style={{ color: "#666666" }}>Тип</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "weekday" as const, label: "Неделя" },
                  { value: "date" as const, label: "Дата" },
                ].map((item) => {
                  const isActive = draftCard.scheduleType === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        updateDraftScope({
                          scheduleType: item.value,
                        })
                      }
                      className="h-10 rounded-lg border px-3 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? "#f4f1fe" : "#ffffff",
                        borderColor: isActive ? "#b5a3fa" : "#d7d7d7",
                        color: isActive ? "#4f4188" : "#333333",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span style={{ color: "#666666" }}>Группа</span>
              <select
                value={draftCard.groupId == null ? "" : String(draftCard.groupId)}
                onChange={(event) =>
                  updateDraftScope({
                    groupId: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
                className="h-10 rounded-lg border px-3"
                style={{ borderColor: "#d7d7d7", color: "#333333" }}
              >
                <option value="">Все группы</option>
                {groups
                  .filter((group): group is typeof group & { id: number } => group.id != null)
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
              </select>
            </label>

            {draftCard.scheduleType === "date" ? (
              <label className="flex flex-col gap-1 text-sm">
                <span style={{ color: "#666666" }}>Дата</span>
                <input
                  type="date"
                  value={draftCard.specificDate ?? ""}
                  onChange={(event) =>
                    updateDraftScope({
                      specificDate: event.target.value || null,
                    })
                  }
                  className="h-10 rounded-lg border px-3"
                  style={{ borderColor: "#d7d7d7", color: "#333333" }}
                />
              </label>
            ) : (
              <div className="flex flex-col gap-2 text-sm md:col-span-2">
                <span style={{ color: "#666666" }}>Дни недели</span>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const selectedDays = getSelectedWeekdays(draftCard);
                    return WEEKDAY_LABELS.map((item) => {
                      const checked = selectedDays.includes(item.value);
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            const nextDays = toggleWeekdaySelection(selectedDays, item.value);
                            updateDraftScope({
                              weekdayStart: nextDays.length ? Math.min(...nextDays) : null,
                              weekdayEnd: nextDays.length ? Math.max(...nextDays) : null,
                            });
                          }}
                          className="h-9 rounded-lg border px-3 text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: checked ? "#f4f1fe" : "#ffffff",
                            borderColor: checked ? "#b5a3fa" : "#d7d7d7",
                            color: checked ? "#4f4188" : "#333333",
                          }}
                        >
                          {item.label}
                        </button>
                      );
                    });
                  })()}
                </div>
                {getSelectedWeekdays(draftCard).length > 0 && (
                  <span style={{ color: "#929292" }}>
                    c {getWeekdayLabel(draftCard.weekdayStart)} по {getWeekdayLabel(draftCard.weekdayEnd)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="py-2 pr-3 text-left font-medium text-[#929292]">№</th>
                  <th className="py-2 pr-3 text-left font-medium text-[#929292]">Начало</th>
                  <th className="py-2 pr-3 text-left font-medium text-[#929292]">Конец</th>
                  <th className="py-2 pr-3 text-left font-medium text-[#929292]">Начало 2</th>
                  <th className="py-2 pr-3 text-left font-medium text-[#929292]">Конец 2</th>
                </tr>
              </thead>
              <tbody>
                {LESSON_NUMBERS.map((lessonNumber) => {
                  const row = draftCard.slots[lessonNumber] ?? createEmptyEditSlot();
                  return (
                    <tr key={lessonNumber}>
                      <td className="py-1.5 pr-3 font-medium text-[#929292]">{lessonNumber}</td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="time"
                          value={row.startTime}
                          onChange={(event) =>
                            updateDraftSlot(lessonNumber, { startTime: event.target.value })
                          }
                          className="h-9 w-full min-w-[120px] rounded-lg border px-2"
                          style={{ borderColor: "#b5a3fa" }}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="time"
                          value={row.endTime}
                          onChange={(event) =>
                            updateDraftSlot(lessonNumber, { endTime: event.target.value })
                          }
                          className="h-9 w-full min-w-[120px] rounded-lg border px-2"
                          style={{ borderColor: "#b5a3fa" }}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="time"
                          value={row.secondStartTime}
                          onChange={(event) =>
                            updateDraftSlot(lessonNumber, {
                              secondStartTime: event.target.value,
                            })
                          }
                          className="h-9 w-full min-w-[120px] rounded-lg border px-2"
                          style={{ borderColor: "#b5a3fa" }}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="time"
                          value={row.secondEndTime}
                          onChange={(event) =>
                            updateDraftSlot(lessonNumber, {
                              secondEndTime: event.target.value,
                            })
                          }
                          className="h-9 w-full min-w-[120px] rounded-lg border px-2"
                          style={{ borderColor: "#b5a3fa" }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-sm" style={{ color: "#929292" }}>
            Оставьте строку пустой, если этот урок не нужен в шаблоне.
          </p>
        </div>
      )}

      {isPending ? (
        <p className="py-4 text-sm" style={{ color: "#929292" }}>
          Загрузка…
        </p>
      ) : cards.length === 0 ? (
        <div
          className="rounded-xl border p-6 text-sm"
          style={{ backgroundColor: "#ffffff", borderColor: "#e1e1e1", color: "#666666" }}
        >
          Шаблоны не найдены. Создайте первую карточку шаблона звонков.
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => {
            const slotsByLesson = getSlotsByLesson(card.slots);
            const isEditing = editingCardKey === card.key && draftCard != null;
            const activeDraft = isEditing ? draftCard : null;

            return (
              <div
                key={card.key}
                className="rounded-xl border p-4 shadow-sm"
                style={{ backgroundColor: "#ffffff", borderColor: "#e1e1e1" }}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: card.scheduleType === "weekday" ? "#f4f1fe" : "#e7f6f9",
                          color: card.scheduleType === "weekday" ? "#4f4188" : "#065d6b",
                        }}
                      >
                        {card.scheduleType === "weekday" ? "Неделя" : "Дата"}
                      </span>
                      <span className="text-sm font-medium" style={{ color: "#333333" }}>
                        {getGroupName(card.groupId)}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      {formatCardScope(card)}
                    </p>
                  </div>

                  {!isEditing ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg gap-1.5"
                        style={{
                          backgroundColor: "#f4f1fe",
                          borderColor: "#b5a3fa",
                          color: "#4f4188",
                        }}
                        onClick={() => handleEditCard(card)}
                        disabled={draftCard != null}
                      >
                        <Pencil className="size-4" />
                        Редактировать
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg gap-1.5"
                        style={{
                          backgroundColor: "#f8e8e9",
                          borderColor: "#d2686a",
                          color: "#671012",
                        }}
                        onClick={() => handleDeleteCard(card)}
                        disabled={draftCard != null || isMutating}
                      >
                        <Trash2 className="size-4" />
                        Удалить
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg"
                        onClick={resetEditor}
                        disabled={isMutating}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-lg"
                        style={{ backgroundColor: "#836be1", color: "#ffffff" }}
                        onClick={handleSaveCard}
                        disabled={isMutating}
                      >
                        {isMutating ? "Сохранение…" : "Сохранить"}
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing && activeDraft ? (
                  <>
                    <div className="mb-4 grid gap-3 md:grid-cols-4">
                      <div className="flex flex-col gap-2 text-sm md:col-span-2">
                        <span style={{ color: "#666666" }}>Тип</span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "weekday" as const, label: "Неделя" },
                            { value: "date" as const, label: "Дата" },
                          ].map((item) => {
                            const isActive = activeDraft.scheduleType === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() =>
                                  updateDraftScope({
                                    scheduleType: item.value,
                                  })
                                }
                                className="h-10 rounded-lg border px-3 text-sm font-medium transition-colors"
                                style={{
                                  backgroundColor: isActive ? "#f4f1fe" : "#ffffff",
                                  borderColor: isActive ? "#b5a3fa" : "#d7d7d7",
                                  color: isActive ? "#4f4188" : "#333333",
                                }}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label className="flex flex-col gap-1 text-sm">
                        <span style={{ color: "#666666" }}>Группа</span>
                        <select
                          value={activeDraft.groupId == null ? "" : String(activeDraft.groupId)}
                          onChange={(event) =>
                            updateDraftScope({
                              groupId: event.target.value === "" ? null : Number(event.target.value),
                            })
                          }
                          className="h-10 rounded-lg border px-3"
                          style={{ borderColor: "#d7d7d7", color: "#333333" }}
                        >
                          <option value="">Все группы</option>
                          {groups
                            .filter((group): group is typeof group & { id: number } => group.id != null)
                            .map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                        </select>
                      </label>

                      {activeDraft.scheduleType === "date" ? (
                        <label className="flex flex-col gap-1 text-sm">
                          <span style={{ color: "#666666" }}>Дата</span>
                          <input
                            type="date"
                            value={activeDraft.specificDate ?? ""}
                            onChange={(event) =>
                              updateDraftScope({
                                specificDate: event.target.value || null,
                              })
                            }
                            className="h-10 rounded-lg border px-3"
                            style={{ borderColor: "#d7d7d7", color: "#333333" }}
                          />
                        </label>
                      ) : (
                        <div className="flex flex-col gap-2 text-sm md:col-span-2">
                          <span style={{ color: "#666666" }}>Дни недели</span>
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const selectedDays = getSelectedWeekdays(activeDraft);
                              return WEEKDAY_LABELS.map((item) => {
                                const checked = selectedDays.includes(item.value);
                                return (
                                  <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => {
                                      const nextDays = toggleWeekdaySelection(
                                        selectedDays,
                                        item.value
                                      );
                                      updateDraftScope({
                                        weekdayStart: nextDays.length
                                          ? Math.min(...nextDays)
                                          : null,
                                        weekdayEnd: nextDays.length
                                          ? Math.max(...nextDays)
                                          : null,
                                      });
                                    }}
                                    className="h-9 rounded-lg border px-3 text-sm font-medium transition-colors"
                                    style={{
                                      backgroundColor: checked ? "#f4f1fe" : "#ffffff",
                                      borderColor: checked ? "#b5a3fa" : "#d7d7d7",
                                      color: checked ? "#4f4188" : "#333333",
                                    }}
                                  >
                                    {item.label}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                          {getSelectedWeekdays(activeDraft).length > 0 && (
                            <span style={{ color: "#929292" }}>
                              c {getWeekdayLabel(activeDraft.weekdayStart)} по{" "}
                              {getWeekdayLabel(activeDraft.weekdayEnd)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-lg">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="py-2 pr-3 text-left font-medium text-[#929292]">№</th>
                            <th className="py-2 pr-3 text-left font-medium text-[#929292]">
                              Начало
                            </th>
                            <th className="py-2 pr-3 text-left font-medium text-[#929292]">
                              Конец
                            </th>
                            <th className="py-2 pr-3 text-left font-medium text-[#929292]">
                              Начало 2
                            </th>
                            <th className="py-2 pr-3 text-left font-medium text-[#929292]">
                              Конец 2
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {LESSON_NUMBERS.map((lessonNumber) => {
                            const row = activeDraft.slots[lessonNumber] ?? createEmptyEditSlot();
                            return (
                              <tr key={lessonNumber}>
                                <td className="py-1.5 pr-3 font-medium text-[#929292]">
                                  {lessonNumber}
                                </td>
                                <td className="py-1.5 pr-3">
                                  <input
                                    type="time"
                                    value={row.startTime}
                                    onChange={(event) =>
                                      updateDraftSlot(lessonNumber, {
                                        startTime: event.target.value,
                                      })
                                    }
                                    className="h-9 w-full min-w-[120px] rounded-lg border px-2"
                                    style={{ borderColor: "#b5a3fa" }}
                                  />
                                </td>
                                <td className="py-1.5 pr-3">
                                  <input
                                    type="time"
                                    value={row.endTime}
                                    onChange={(event) =>
                                      updateDraftSlot(lessonNumber, {
                                        endTime: event.target.value,
                                      })
                                    }
                                    className="h-9 w-full min-w-[120px] rounded-lg border px-2"
                                    style={{ borderColor: "#b5a3fa" }}
                                  />
                                </td>
                                <td className="py-1.5 pr-3">
                                  <input
                                    type="time"
                                    value={row.secondStartTime}
                                    onChange={(event) =>
                                      updateDraftSlot(lessonNumber, {
                                        secondStartTime: event.target.value,
                                      })
                                    }
                                    className="h-9 w-full min-w-[120px] rounded-lg border px-2"
                                    style={{ borderColor: "#b5a3fa" }}
                                  />
                                </td>
                                <td className="py-1.5 pr-3">
                                  <input
                                    type="time"
                                    value={row.secondEndTime}
                                    onChange={(event) =>
                                      updateDraftSlot(lessonNumber, {
                                        secondEndTime: event.target.value,
                                      })
                                    }
                                    className="h-9 w-full min-w-[120px] rounded-lg border px-2"
                                    style={{ borderColor: "#b5a3fa" }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <p className="mt-3 text-sm" style={{ color: "#929292" }}>
                      Чтобы удалить урок из этого шаблона, очистите оба поля первого сегмента.
                    </p>
                  </>
                ) : (
                  <div className="overflow-x-auto rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="py-2 pr-3 text-left font-medium text-[#929292]">№</th>
                          <th className="py-2 pr-3 text-left font-medium text-[#929292]">
                            Начало
                          </th>
                          <th className="py-2 pr-3 text-left font-medium text-[#929292]">
                            Конец
                          </th>
                          <th className="py-2 pr-3 text-left font-medium text-[#929292]">
                            Начало 2
                          </th>
                          <th className="py-2 pr-3 text-left font-medium text-[#929292]">
                            Конец 2
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {LESSON_NUMBERS.map((lessonNumber) => {
                          const slot = slotsByLesson.get(lessonNumber);
                          return (
                            <tr key={lessonNumber}>
                              <td className="py-1.5 pr-3 font-medium text-[#929292]">
                                {lessonNumber}
                              </td>
                              <td className="py-1.5 pr-3">
                                <span
                                  className="inline-block rounded-lg border px-3 py-1.5"
                                  style={{
                                    backgroundColor: "#f6f6f6",
                                    borderColor: "#cccccc",
                                    color: slot ? "#333333" : "#929292",
                                  }}
                                >
                                  {formatTimeFigma(slot?.startTime)}
                                </span>
                              </td>
                              <td className="py-1.5 pr-3">
                                <span
                                  className="inline-block rounded-lg border px-3 py-1.5"
                                  style={{
                                    backgroundColor: "#f6f6f6",
                                    borderColor: "#cccccc",
                                    color: slot ? "#333333" : "#929292",
                                  }}
                                >
                                  {formatTimeFigma(slot?.endTime)}
                                </span>
                              </td>
                              <td className="py-1.5 pr-3">
                                <span
                                  className="inline-block rounded-lg border px-3 py-1.5"
                                  style={{
                                    backgroundColor: "#f6f6f6",
                                    borderColor: "#cccccc",
                                    color: slot?.secondStartTime ? "#333333" : "#929292",
                                  }}
                                >
                                  {formatTimeFigma(slot?.secondStartTime)}
                                </span>
                              </td>
                              <td className="py-1.5 pr-3">
                                <span
                                  className="inline-block rounded-lg border px-3 py-1.5"
                                  style={{
                                    backgroundColor: "#f6f6f6",
                                    borderColor: "#cccccc",
                                    color: slot?.secondEndTime ? "#333333" : "#929292",
                                  }}
                                >
                                  {formatTimeFigma(slot?.secondEndTime)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
