"use client";

/**
 * Контент вкладки «Предметы» расписания — макет Figma 1099-61873:
 * группа/преподаватель, неделя, табы Пн–Вс, таблица занятий, кнопка добавления.
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api-errors";
import { BookOpen, Plus, Settings, Trash2, User, Users } from "lucide-react";
import { fetchGroups } from "@/app/(admin)/admin/groups/groups-api";
import { fetchTeachers, type TeacherListItem } from "@/app/(admin)/admin/users/users-api";
import { fetchBellTemplates, type BellTemplateSlot } from "@/app/(admin)/admin/schedule/bells-api";
import { ScheduleLessonModal } from "@/app/(admin)/admin/schedule/ScheduleLessonModal";
import {
  deleteScheduleLesson,
  fetchSubjectsSchedule,
  type ScheduleItem,
} from "@/app/(admin)/admin/schedule/schedule-lesson-api";
import { invalidateAndRefetch } from "@/lib/queryClient";
import {
  formatDateLabel,
  formatTimeShort,
  getWeekRangeIso,
  WEEKDAY_LIST,
} from "@/lib/schedule-utils";

const MIN_WEEK_OFFSET = -1;
const MAX_WEEK_OFFSET = 1;

export function SubjectsScheduleContent() {
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | "">("");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<number | "">("");
  const [viewMode, setViewMode] = React.useState<"group" | "teacher">("teacher");
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [selectedWeekday, setSelectedWeekday] = React.useState<number>(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingLesson, setEditingLesson] = React.useState<ScheduleItem | null>(null);
  const [initialLessonNumber, setInitialLessonNumber] = React.useState<number | null>(null);

  const queryClient = useQueryClient();
  const weekRange = React.useMemo(() => getWeekRangeIso(weekOffset), [weekOffset]);

  const { data: groupsData } = useQuery({
    queryKey: ["admin-groups", "for-subjects-schedule"],
    queryFn: () => fetchGroups({ page: 1, limit: 500 }),
  });
  const groups = React.useMemo(() => groupsData?.data ?? [], [groupsData?.data]);

  const { data: teachersData } = useQuery({
    queryKey: ["teachers-list-for-subjects-schedule", 1, 100],
    queryFn: () => fetchTeachers({ page: 1, limit: 100 }),
  });
  const teachers: TeacherListItem[] = teachersData?.data ?? [];

  type TeacherOption = { id: number; label: string };
  const teacherOptions: TeacherOption[] = React.useMemo(
    () =>
      teachers.map((t) => {
        const rawId = (t as unknown as { id?: number | null }).id ?? t.userId;
        const id = Number(rawId);
        const label = t.user
          ? [t.user.surname, t.user.name, t.user.patronymic].filter(Boolean).join(" ")
          : `#${t.userId}`;
        return { id, label };
      }),
    [teachers],
  );

  const hasFilters =
    viewMode === "teacher" ? selectedTeacherId !== "" : selectedGroupId !== "";

  const { data: scheduleData, isPending, isError, error } = useQuery({
    queryKey: [
      "admin-subjects-schedule",
      viewMode,
      selectedTeacherId === "" ? null : selectedTeacherId,
      selectedGroupId === "" ? null : selectedGroupId,
      weekRange.from,
      weekRange.to,
    ],
    enabled: hasFilters,
    queryFn: () =>
      fetchSubjectsSchedule({
        groupId: viewMode === "group" && selectedGroupId !== "" ? Number(selectedGroupId) : null,
        teacherId: viewMode === "teacher" && selectedTeacherId !== "" ? Number(selectedTeacherId) : null,
        dateFrom: weekRange.from,
        dateTo: weekRange.to,
      }),
  });

  const items = scheduleData?.items ?? [];

  const { data: bellTemplatesData } = useQuery({
    queryKey: ["bell-templates-for-schedule"],
    queryFn: () =>
      fetchBellTemplates({
        page: 1,
        limit: 500,
        ...(selectedGroupId === "" ? {} : { groupId: Number(selectedGroupId) }),
      }),
  });
  const bellTemplates: BellTemplateSlot[] = bellTemplatesData?.data ?? [];

  const bellTemplatesById = React.useMemo(() => {
    const map = new Map<number, BellTemplateSlot>();
    for (const tpl of bellTemplates) {
      if (tpl.id != null) map.set(Number(tpl.id), tpl);
    }
    return map;
  }, [bellTemplates]);

  const getBellSlotForLesson = React.useCallback(
    (lesson: ScheduleItem): BellTemplateSlot | undefined => {
      const rawId = (lesson as unknown as { bellTemplateId?: number | null }).bellTemplateId;
      if (rawId == null) return undefined;
      return bellTemplatesById.get(Number(rawId));
    },
    [bellTemplatesById],
  );

  const getBellDisplayRange = React.useCallback(
    (slot: BellTemplateSlot | undefined): { start: Date | null; end: Date | null } => {
      if (!slot) return { start: null, end: null };
      const starts: Date[] = [];
      const ends: Date[] = [];
      if (slot.startTime) starts.push(new Date(slot.startTime as string | Date));
      if (slot.secondStartTime) starts.push(new Date(slot.secondStartTime as string | Date));
      if (slot.endTime) ends.push(new Date(slot.endTime as string | Date));
      if (slot.secondEndTime) ends.push(new Date(slot.secondEndTime as string | Date));
      if (!starts.length || !ends.length) return { start: null, end: null };
      return {
        start: new Date(Math.min(...starts.map((d) => d.getTime()))),
        end: new Date(Math.max(...ends.map((d) => d.getTime()))),
      };
    },
    [],
  );

  const itemsForSelectedDay = React.useMemo(() => {
    return items.filter((item) => {
      const d = new Date(item.scheduleDate).getDay();
      return selectedWeekday === 7 ? d === 0 : d === selectedWeekday;
    });
  }, [items, selectedWeekday]);

  const sortedRows = React.useMemo(() => {
    return [...itemsForSelectedDay].sort((a, b) => {
      const slotA = getBellSlotForLesson(a);
      const slotB = getBellSlotForLesson(b);
      const na = slotA?.lessonNumber ?? 0;
      const nb = slotB?.lessonNumber ?? 0;
      if (na !== nb) return na - nb;
      const { start: startA } = getBellDisplayRange(slotA);
      const { start: startB } = getBellDisplayRange(slotB);
      const ta = startA instanceof Date ? startA.toISOString() : "";
      const tb = startB instanceof Date ? startB.toISOString() : "";
      return ta.localeCompare(tb);
    });
  }, [itemsForSelectedDay, getBellSlotForLesson, getBellDisplayRange]);

  const getSlotKey = React.useCallback((item: ScheduleItem) => {
    if (item.scheduleSlotId) return item.scheduleSlotId;
    return `legacy-${item.subjectId}-${item.groupId}-${item.scheduleDate}-${item.bellTemplateId}`;
  }, []);

  const groupedBySlot = React.useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of sortedRows) {
      const key = getSlotKey(item);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([slotKey, rows]) => ({ slotKey, rows }));
  }, [sortedRows, getSlotKey]);

  const selectedDayDate = React.useMemo(() => {
    const mon = new Date(weekRange.from);
    const dayIndex = selectedWeekday === 7 ? 6 : selectedWeekday - 1;
    const d = new Date(mon);
    d.setDate(mon.getDate() + dayIndex);
    return d;
  }, [weekRange.from, selectedWeekday]);

  const handleOpenCreate = React.useCallback(() => {
    const maxNumber =
      sortedRows.reduce((max, item) => Math.max(max, getBellSlotForLesson(item)?.lessonNumber ?? 0), 0) || 0;
    setEditingLesson(null);
    setAddSubgroupSlot(null);
    setInitialLessonNumber(maxNumber + 1);
    setModalOpen(true);
  }, [sortedRows, getBellSlotForLesson]);

  const handleOpenEdit = React.useCallback((lesson: ScheduleItem) => {
    setEditingLesson(lesson);
    setAddSubgroupSlot(null);
    setInitialLessonNumber(getBellSlotForLesson(lesson)?.lessonNumber ?? null);
    setModalOpen(true);
  }, [getBellSlotForLesson]);

  const [addSubgroupSlot, setAddSubgroupSlot] = React.useState<{
    scheduleSlotId: string;
    subjectId: number;
    groupId: number;
    scheduleDate: string;
    bellTemplateId: number;
  } | null>(null);

  const handleOpenAddSubgroup = React.useCallback((lesson: ScheduleItem) => {
    if (!lesson.scheduleSlotId) return;
    setEditingLesson(null);
    setAddSubgroupSlot({
      scheduleSlotId: lesson.scheduleSlotId,
      subjectId: lesson.subjectId,
      groupId: lesson.groupId,
      scheduleDate: new Date(lesson.scheduleDate).toISOString(),
      bellTemplateId: lesson.bellTemplateId,
    });
    setInitialLessonNumber(getBellSlotForLesson(lesson)?.lessonNumber ?? null);
    setModalOpen(true);
  }, [getBellSlotForLesson]);

  const handleModalClose = React.useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setEditingLesson(null);
      setInitialLessonNumber(null);
      setAddSubgroupSlot(null);
    }
  }, []);

  const handleSaved = React.useCallback(async () => {
    await invalidateAndRefetch(queryClient, ["admin-subjects-schedule"]);
    setModalOpen(false);
    setEditingLesson(null);
    setInitialLessonNumber(null);
    setAddSubgroupSlot(null);
  }, [queryClient]);

  const deleteLessonMutation = useMutation({
    mutationFn: (id: number) => deleteScheduleLesson(id),
    onSuccess: () => void handleSaved(),
    onError: (err) => {
      window.alert(getApiErrorMessage(err, "Не удалось удалить занятие"));
    },
  });

  const handleDeleteFromModal = React.useCallback(
    (lessonId: number) => {
      if (!window.confirm("Удалить это занятие из расписания для этого дня?")) return;
      setModalOpen(false);
      setEditingLesson(null);
      setInitialLessonNumber(null);
      deleteLessonMutation.mutate(lessonId);
    },
    [deleteLessonMutation],
  );

  return (
    <div className="space-y-4 rounded-lg border border-[#ccc0fb] bg-[#f6f6f6] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-full border border-[#d0c4ff] bg-[#f4f1fe] p-0.5 text-xs font-medium text-[#4f4188]">
          <button
            type="button"
            className={
              viewMode === "group"
                ? "flex h-7 w-7 items-center justify-center rounded-full bg-[#836be1] text-[#f4f1fe]"
                : "flex h-7 w-7 items-center justify-center rounded-full text-[#4f4188] hover:bg-[#e4ddff]"
            }
            onClick={() => setViewMode("group")}
            title="Режим: по группе"
            aria-label="Режим: по группе"
          >
            <Users className="size-4" />
          </button>
          <button
            type="button"
            className={
              viewMode === "teacher"
                ? "flex h-7 w-7 items-center justify-center rounded-full bg-[#836be1] text-[#f4f1fe]"
                : "flex h-7 w-7 items-center justify-center rounded-full text-[#4f4188] hover:bg-[#e4ddff]"
            }
            onClick={() => setViewMode("teacher")}
            title="Режим: по преподавателю"
            aria-label="Режим: по преподавателю"
          >
            <User className="size-4" />
          </button>
        </div>

        {viewMode === "group" && (
          <select
            className="h-8 rounded-lg border-2 border-[#5bc5d6] bg-[#e7f6f9] px-3 text-base font-medium text-[#065d6b] outline-none focus:ring-2 focus:ring-[#5bc5d6]/50"
            value={selectedGroupId === "" ? "" : String(selectedGroupId)}
            onChange={(e) => setSelectedGroupId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Выберите группу</option>
            {groups.map((g) => (
              <option key={g.id ?? g.name} value={g.id ?? ""}>{g.name}</option>
            ))}
          </select>
        )}

        {viewMode === "teacher" && (
          <select
            className="h-8 rounded-lg border-2 border-[#69c8b1] bg-[#e9f7f3] px-3 text-base font-medium text-[#115f4c] outline-none focus:ring-2 focus:ring-[#69c8b1]/50"
            value={selectedTeacherId === "" ? "" : String(selectedTeacherId)}
            onChange={(e) => setSelectedTeacherId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Выберите преподавателя</option>
            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        )}

        <span className="rounded-lg border-2 border-[#a778c6] bg-[#f2ebf7] px-3 py-1.5 text-base font-medium text-[#441e5e]">
          {formatDateLabel(new Date(weekRange.from))} – {formatDateLabel(new Date(weekRange.to))}
        </span>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#b5a3fa] bg-[#f4f1fe] text-[#836be1] hover:bg-[#ede9fe]" title="Неделя" aria-label="Неделя">
          <BookOpen className="size-5" />
        </button>
        <span className="rounded-lg bg-[#efefef] px-3 py-1.5 text-base font-medium text-[#333333]">
          {formatDateLabel(selectedDayDate)}
        </span>
        <button
          type="button"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#b5a3fa] bg-[#f4f1fe] text-[#836be1] hover:bg-[#ede9fe]"
          onClick={() => setWeekOffset((p) => (p <= MIN_WEEK_OFFSET ? MIN_WEEK_OFFSET : p - 1))}
          title="Предыдущая неделя"
          aria-label="Предыдущая неделя"
          disabled={weekOffset <= MIN_WEEK_OFFSET}
        >
          <BookOpen className="size-4 rotate-180" />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#b5a3fa] bg-[#f4f1fe] text-[#836be1] hover:bg-[#ede9fe]"
          onClick={() => setWeekOffset((p) => (p >= MAX_WEEK_OFFSET ? MAX_WEEK_OFFSET : p + 1))}
          title="Следующая неделя"
          aria-label="Следующая неделя"
          disabled={weekOffset >= MAX_WEEK_OFFSET}
        >
          <BookOpen className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {WEEKDAY_LIST.map((tab) => {
          const isActive = selectedWeekday === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedWeekday(tab.value)}
              className={
                isActive
                  ? "rounded-lg border-2 border-[#b5a3fa] bg-[#f6f6f6] px-3 py-1.5 text-base font-medium text-[#836be1]"
                  : "rounded-lg border-2 border-[#cccccc] bg-[#f6f6f6] px-3 py-1.5 text-base font-medium text-[#7d7d7d] hover:border-[#b5a3fa] hover:text-[#836be1]"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        {!hasFilters ? (
          <p className="py-6 text-center text-[#929292]">Чтобы увидеть расписание, выберите группу или преподавателя.</p>
        ) : isPending ? (
          <p className="py-6 text-center text-[#929292]">Загружаем расписание…</p>
        ) : isError ? (
          <p className="py-6 text-center text-destructive">
            {getApiErrorMessage(error, "Не удалось загрузить расписание.")}
          </p>
        ) : (
          <table className="w-full min-w-[600px] border-collapse text-base">
            <thead>
              <tr>
                <th className="pb-2 pr-4 text-left font-medium text-[#929292]">Время</th>
                <th className="pb-2 pr-4 text-left font-medium text-[#929292]">Предмет</th>
                <th className="pb-2 pr-4 text-left font-medium text-[#929292]">Преподаватель</th>
                <th className="pb-2 pr-4 text-left font-medium text-[#929292]">Корпус/Кабинет</th>
                <th className="w-10" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {groupedBySlot.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#929292]">На выбранный день занятий нет.</td>
                </tr>
              ) : (
                groupedBySlot.map(({ slotKey, rows }) => {
                  const first = rows[0];
                  const slot = getBellSlotForLesson(first);
                  const { start: startTime, end: endTime } = getBellDisplayRange(slot);
                  const subjectName = first.subject?.name ?? `Предмет #${first.subjectId}`;
                  return (
                    <tr key={slotKey} className="border-t border-[#eee]">
                      <td className="py-2 pr-4 align-top">
                        <div className="text-sm font-medium text-[#8f76f7]">{formatTimeShort(startTime)}</div>
                        <div className="text-sm font-medium text-[#8f76f7]">{formatTimeShort(endTime)}</div>
                      </td>
                      <td className="py-2 pr-4 align-top">
                        <span className="inline-flex rounded-lg bg-[#ebecf8] px-2 py-1 text-[#1c2264]">{subjectName}</span>
                      </td>
                      <td className="py-2 pr-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          {rows.map((lesson) => {
                            const teacherName = lesson.teacher?.name ?? `Преп. #${lesson.teacherId}`;
                            return (
                              <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex rounded-lg bg-[#e9f7f3] px-2 py-1 text-[#115f4c]">{teacherName}</span>
                                <div className="flex items-center gap-1">
                                  <button type="button" className="flex h-7 w-7 items-center justify-center rounded bg-[#f6f6f6] text-muted-foreground hover:bg-muted" title="Редактировать подгруппу" aria-label="Редактировать подгруппу" onClick={() => handleOpenEdit(lesson)}>
                                    <Settings className="size-4" />
                                  </button>
                                  <button type="button" className="flex h-7 w-7 items-center justify-center rounded bg-[#fef2f2] text-destructive hover:bg-[#fee2e2]" title="Удалить подгруппу" aria-label="Удалить подгруппу" disabled={deleteLessonMutation.isPending} onClick={() => { if (!window.confirm("Удалить эту подгруппу из занятия?")) return; deleteLessonMutation.mutate(lesson.id); }}>
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2 pr-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          {rows.map((lesson) => {
                            const classroomName = lesson.classroom?.name ?? (lesson.classroomId != null ? `#${lesson.classroomId}` : "Дистанционно");
                            const buildingName = (lesson.classroom as { building?: { name: string } } | undefined)?.building?.name;
                            const hasBuilding = buildingName != null && buildingName !== "";
                            return (
                              <div key={lesson.id} className="flex flex-wrap items-center gap-1.5">
                                {hasBuilding && <span className="inline-flex rounded-lg bg-[#fcf1ec] px-2 py-1 text-[#7b4123]">{buildingName}</span>}
                                <span className="inline-flex rounded-lg bg-[#fcf1ec] px-2 py-1 text-[#7b4123]">{classroomName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2 align-top">
                        {first.scheduleSlotId ? (
                          <button type="button" className="inline-flex items-center gap-1 rounded border border-[#b5a3fa] bg-[#f4f1fe] px-2 py-1.5 text-sm font-medium text-[#4f4188] hover:bg-[#ede9fe]" title="Добавить подгруппу к этому занятию" onClick={() => handleOpenAddSubgroup(first)}>
                            <Plus className="size-4" /> Подгруппа
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-start">
        <button type="button" className="inline-flex items-center gap-2 rounded-md border-2 border-[#b5a3fa] bg-[#f4f1fe] px-4 py-2 text-base font-medium text-[#4f4188] hover:bg-[#ede9fe]" onClick={handleOpenCreate}>
          <Plus className="size-5" /> Добавить занятие
        </button>
      </div>

      <ScheduleLessonModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        mode={editingLesson ? "edit" : addSubgroupSlot ? "addSubgroup" : "create"}
        groups={groups}
        weekday={selectedWeekday}
        date={selectedDayDate}
        groupId={selectedGroupId === "" ? null : Number(selectedGroupId)}
        presetGroupId={viewMode === "group" && selectedGroupId !== "" && !editingLesson && !addSubgroupSlot ? Number(selectedGroupId) : null}
        presetTeacherId={viewMode === "teacher" && selectedTeacherId !== "" ? Number(selectedTeacherId) : null}
        lesson={editingLesson}
        initialLessonNumber={initialLessonNumber}
        addSubgroupSlot={addSubgroupSlot}
        onSaved={handleSaved}
        onDeleteLesson={editingLesson ? handleDeleteFromModal : undefined}
      />
    </div>
  );
}
