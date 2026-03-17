"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api-errors";
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
import {
  buildSlotBody,
  compareCards,
  createDraft,
  createDraftFromCard,
  createEmptyEditSlot,
  formatCardScope,
  getScopeKey,
  getSlotsByLesson,
  groupSlotsToCards,
  type BellTemplateCard,
  type BellTemplateDraft,
  type EditSlotValue,
  LESSON_NUMBERS,
  type TemplateScheduleType,
  type TemplateScope,
  toggleWeekdaySelection,
  getSelectedWeekdays,
} from "@/app/(admin)/admin/schedule/bells-utils";
import { invalidateAndRefetch } from "@/lib/queryClient";
import { formatTimeFigma, getWeekdayLabel, WEEKDAY_LIST } from "@/lib/schedule-utils";

const BELLS_QUERY_KEY = "admin-bells" as const;
const GROUPS_QUERY_KEY = "admin-groups" as const;
const NEW_CARD_KEY = "__new-bell-template__" as const;

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
        await invalidateAndRefetch(queryClient, [BELLS_QUERY_KEY]);
        if (editingCardKey === card.key) {
          resetEditor();
        }
      } catch (err) {
        window.alert(getApiErrorMessage(err, "Не удалось удалить шаблон звонков"));
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

      await invalidateAndRefetch(queryClient, [BELLS_QUERY_KEY]);
      resetEditor();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось сохранить шаблон звонков"));
    }
  }, [createMutation, deleteMutation, draftCard, editingCard, queryClient, resetEditor, updateMutation]);

  if (isError) {
    return (
      <div
        className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        style={{ backgroundColor: "#f8e8e9", borderColor: "#d2686a", color: "#671012" }}
      >
        {getApiErrorMessage(error, "Ошибка загрузки списка звонков")}
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
                    return WEEKDAY_LIST.map((item) => {
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
                              return WEEKDAY_LIST.map((item) => {
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
