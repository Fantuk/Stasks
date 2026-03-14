"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { BookOpen, User, Users } from "lucide-react";
import { fetchGroups } from "@/app/(admin)/admin/groups/groups-api";
import { fetchTeachers } from "@/app/(admin)/admin/users/users-api";
import {
  fetchBellTemplates,
  type BellTemplateSlot,
} from "@/app/(admin)/admin/schedule/bells-api";
import {
  fetchScheduleView,
  type ScheduleViewItem,
} from "@/app/schedule/schedule-api";

const MIN_WEEK_OFFSET = -1;
const MAX_WEEK_OFFSET = 1;

/** Дни для табов: короткое имя и полное (по макету Figma) */
const WEEKDAY_TABS = [
  { value: 1, short: "Пн", full: "Понедельник" },
  { value: 2, short: "Вт", full: "Вторник" },
  { value: 3, short: "Ср", full: "Среда" },
  { value: 4, short: "Чт", full: "Четверг" },
  { value: 5, short: "Пт", full: "Пятница" },
  { value: 6, short: "Сб", full: "Суббота" },
  { value: 7, short: "Вс", full: "Воскресенье" },
] as const;

/** Формат даты: ДД.ММ.ГГ */
function formatDateLabel(date: Date): string {
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const yy = (date.getFullYear() % 100).toString().padStart(2, "0");
  return `${dd}.${mm}.${yy}`;
}

/** Диапазон недели (Пн 00:00 — Вс 23:59) по смещению от текущей */
function getWeekRangeIso(weekOffset: number): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay() || 7; // 1..7, 1 = Пн
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day - 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { from: monday.toISOString(), to: sunday.toISOString() };
}

/** Время из ISO в "ЧЧ:ММ" */
function formatTimeShort(isoTime: string | Date | null | undefined): string {
  if (!isoTime) return "—";
  const date = typeof isoTime === "string" ? new Date(isoTime) : isoTime;
  const h = date.getUTCHours();
  const m = date.getUTCMinutes();
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Расписание по дням: ключ 1–7 (Пн–Вс), значение — слоты с занятиями */
function useScheduleByWeekday(
  items: ScheduleViewItem[],
  getBellSlotForLesson: (l: ScheduleViewItem) => BellTemplateSlot | undefined,
  getBellDisplayRange: (s: BellTemplateSlot | undefined) => { start: Date | null; end: Date | null },
  getSlotKey: (l: ScheduleViewItem) => string,
) {
  return React.useMemo(() => {
    const byDay: Record<number, { slotKey: string; rows: ScheduleViewItem[] }[]> = {
      1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [],
    };
    for (let day = 1; day <= 7; day++) {
      const dayItems = items.filter((item) => {
        const d = new Date(item.scheduleDate).getDay();
        return day === 7 ? d === 0 : d === day;
      });
      const sorted = [...dayItems].sort((a, b) => {
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
      const map = new Map<string, ScheduleViewItem[]>();
      for (const item of sorted) {
        const key = getSlotKey(item);
        const list = map.get(key) ?? [];
        list.push(item);
        map.set(key, list);
      }
      byDay[day] = Array.from(map.entries()).map(([slotKey, rows]) => ({ slotKey, rows }));
    }
    return byDay;
  }, [items, getBellSlotForLesson, getBellDisplayRange, getSlotKey]);
}

/**
 * Страница просмотра расписания (read-only): шапка с выбором недели, группы/преподавателя;
 * тело — колонки по дням, в каждой день и карточки занятий.
 */
export function ScheduleViewContent() {
  const [viewMode, setViewMode] = React.useState<"group" | "teacher">("group");
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | "">("");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<number | "">("");
  const [weekOffset, setWeekOffset] = React.useState(0);

  const weekRange = React.useMemo(() => getWeekRangeIso(weekOffset), [weekOffset]);

  const { data: groupsData } = useQuery({
    queryKey: ["schedule-view-groups"],
    queryFn: () => fetchGroups({ page: 1, limit: 500 }),
  });
  const groups = groupsData?.data ?? [];

  const { data: teachersData } = useQuery({
    queryKey: ["schedule-view-teachers", 1, 100],
    queryFn: () => fetchTeachers({ page: 1, limit: 100 }),
  });
  const teachers = teachersData?.data ?? [];

  const teacherOptions = React.useMemo(() => {
    return (teachers as { id?: number; userId?: number; user?: { surname?: string; name?: string; patronymic?: string } }[]).map((t) => {
      const id = Number((t as { id?: number }).id ?? t.userId);
      const label = t.user
        ? [t.user.surname, t.user.name, t.user.patronymic].filter(Boolean).join(" ")
        : `#${t.userId}`;
      return { id, label };
    });
  }, [teachers]);

  const hasFilters =
    viewMode === "teacher" ? selectedTeacherId !== "" : selectedGroupId !== "";

  const {
    data: scheduleData,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "schedule-view",
      viewMode,
      viewMode === "teacher" ? selectedTeacherId : null,
      viewMode === "group" ? selectedGroupId : null,
      weekRange.from,
      weekRange.to,
    ],
    enabled: hasFilters,
    queryFn: () =>
      fetchScheduleView({
        groupId: viewMode === "group" && selectedGroupId !== "" ? Number(selectedGroupId) : null,
        teacherId: viewMode === "teacher" && selectedTeacherId !== "" ? Number(selectedTeacherId) : null,
        dateFrom: weekRange.from,
        dateTo: weekRange.to,
      }),
  });

  const items = scheduleData?.items ?? [];

  // Загружаем все шаблоны звонков (без фильтра по группе), чтобы по bellTemplateId из занятий находить номер пары и время
  const { data: bellTemplatesData } = useQuery({
    queryKey: ["schedule-view-bells-all"],
    queryFn: () => fetchBellTemplates({ page: 1, limit: 500 }),
    enabled: hasFilters,
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
    (lesson: ScheduleViewItem): BellTemplateSlot | undefined => {
      const rawId = (lesson as unknown as { bellTemplateId?: number | string | null }).bellTemplateId;
      if (rawId == null || rawId === "") return undefined;
      const id = typeof rawId === "number" ? rawId : Number(rawId);
      if (Number.isNaN(id)) return undefined;
      return bellTemplatesById.get(id);
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

  const getSlotKey = React.useCallback((item: ScheduleViewItem) => {
    if (item.scheduleSlotId) return item.scheduleSlotId;
    return `legacy-${item.subjectId}-${item.groupId}-${item.scheduleDate}-${item.bellTemplateId}`;
  }, []);

  const scheduleByWeekday = useScheduleByWeekday(
    items,
    getBellSlotForLesson,
    getBellDisplayRange,
    getSlotKey,
  );

  /** Дата для дня недели в текущей выбранной неделе (1=Пн … 7=Вс) */
  const getDateForWeekday = React.useCallback(
    (weekday: number) => {
      const mon = new Date(weekRange.from);
      const dayIndex = weekday === 7 ? 6 : weekday - 1;
      const d = new Date(mon);
      d.setDate(mon.getDate() + dayIndex);
      return d;
    },
    [weekRange.from],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Расписание</h1>

      {/* Header по макету Figma: фон #f6f6f6, скругление 8px */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#f6f6f6] p-4">
        {/* Переключатель: по группе / по преподавателю (Figma: buttons #e7f6f9, stroke #5bc5d6) */}
        <div className="inline-flex items-center rounded-lg border-2 border-[#5bc5d6] bg-[#e7f6f9] p-0.5">
          <button
            type="button"
            className={
              viewMode === "group"
                ? "flex h-8 w-8 items-center justify-center rounded-md bg-[#5bc5d6] text-white"
                : "flex h-8 w-8 items-center justify-center rounded-md text-[#065d6b] hover:bg-[#5bc5d6]/20"
            }
            onClick={() => setViewMode("group")}
            title="По группе"
            aria-label="По группе"
          >
            <Users className="size-5" />
          </button>
          <button
            type="button"
            className={
              viewMode === "teacher"
                ? "flex h-8 w-8 items-center justify-center rounded-md bg-[#5bc5d6] text-white"
                : "flex h-8 w-8 items-center justify-center rounded-md text-[#065d6b] hover:bg-[#5bc5d6]/20"
            }
            onClick={() => setViewMode("teacher")}
            title="По преподавателю"
            aria-label="По преподавателю"
          >
            <User className="size-5" />
          </button>
        </div>

        {viewMode === "group" && (
          <select
            className="h-8 rounded-lg border-2 border-[#5bc5d6] bg-[#e7f6f9] px-3 text-base font-medium text-[#065d6b] outline-none focus:ring-2 focus:ring-[#5bc5d6]/50"
            value={selectedGroupId === "" ? "" : String(selectedGroupId)}
            onChange={(e) =>
              setSelectedGroupId(e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="">Выберите группу</option>
            {groups.map((g) => (
              <option key={g.id ?? g.name} value={g.id ?? ""}>
                {g.name}
              </option>
            ))}
          </select>
        )}

        {viewMode === "teacher" && (
          <select
            className="h-8 rounded-lg border-2 border-[#69c8b1] bg-[#e9f7f3] px-3 text-base font-medium text-[#115f4c] outline-none focus:ring-2 focus:ring-[#69c8b1]/50"
            value={selectedTeacherId === "" ? "" : String(selectedTeacherId)}
            onChange={(e) =>
              setSelectedTeacherId(e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="">Выберите преподавателя</option>
            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}

        {/* Неделя: Figma #f2ebf7, stroke #a778c6, text #441e5e */}
        <span className="rounded-lg border-2 border-[#a778c6] bg-[#f2ebf7] px-3 py-1.5 text-base font-medium text-[#441e5e]">
          {formatDateLabel(new Date(weekRange.from))} – {formatDateLabel(new Date(weekRange.to))}
        </span>

        {/* Кнопки переключения недели: левая #f2ebf7 #a778c6, правая #f6f6f6 #929292 */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#a778c6] bg-[#f2ebf7] text-[#441e5e] hover:opacity-90 disabled:opacity-50"
          onClick={() => setWeekOffset((p) => (p <= MIN_WEEK_OFFSET ? MIN_WEEK_OFFSET : p - 1))}
          title="Предыдущая неделя"
          aria-label="Предыдущая неделя"
          disabled={weekOffset <= MIN_WEEK_OFFSET}
        >
          <BookOpen className="size-4 rotate-180" />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#929292] bg-[#f6f6f6] text-[#929292] hover:opacity-90 disabled:opacity-50"
          onClick={() => setWeekOffset((p) => (p >= MAX_WEEK_OFFSET ? MAX_WEEK_OFFSET : p + 1))}
          title="Следующая неделя"
          aria-label="Следующая неделя"
          disabled={weekOffset >= MAX_WEEK_OFFSET}
        >
          <BookOpen className="size-4" />
        </button>
      </div>

      {/* Блоки по дням по макету Figma: день = строка тегов + строки Schedule cell */}
      <div className="flex flex-col gap-6">
        {!hasFilters ? (
          <p className="py-12 text-center text-[#929292]">
            Чтобы увидеть расписание, выберите группу или преподавателя.
          </p>
        ) : isPending ? (
          <p className="py-12 text-center text-[#929292]">Загружаем расписание…</p>
        ) : isError ? (
          <p className="py-12 text-center text-destructive">
            {isAxiosError(error) && error.response?.data?.message
              ? String(error.response.data.message)
              : "Не удалось загрузить расписание."}
          </p>
        ) : (
          WEEKDAY_TABS.map(({ value: weekday, full }) => {
            const daySlots = scheduleByWeekday[weekday] ?? [];
            const dayDate = getDateForWeekday(weekday);
            return (
              <div
                key={weekday}
                className="rounded-lg bg-[#f6f6f6] p-4"
              >
                {/* Строка тегов: название дня и дата (Figma Frame 10330) */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[#efefef] px-3 py-1.5 text-base font-medium text-[#333333]">
                    {full}
                  </span>
                  <span className="rounded-lg bg-[#efefef] px-3 py-1.5 text-base font-medium text-[#333333]">
                    {formatDateLabel(dayDate)}
                  </span>
                </div>
                {/* Строки Schedule cell (Figma Frame 10328): номер + время слева, модули справа */}
                <div className="flex flex-col">
                  {daySlots.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#929292]">Нет занятий</p>
                  ) : (
                    daySlots.map(({ slotKey, rows }) => {
                      const first = rows[0];
                      const slot = getBellSlotForLesson(first);
                      const lessonNumber = slot?.lessonNumber ?? "—";
                      const { start: startTime, end: endTime } = getBellDisplayRange(slot);
                      const subjectName = first.subject?.name ?? `Предмет #${first.subjectId}`;
                      return (
                        <div
                          key={slotKey}
                          className="flex min-h-[92px] flex-row gap-4 border-b border-[#e1e1e1] py-3 last:border-b-0"
                        >
                          {/* Слева: номер пары и время (Figma Frame 11739) */}
                          <div className="flex w-[74px] shrink-0 flex-col gap-1">
                            <span className="text-base font-medium text-[#6654af]">
                              {lessonNumber}
                            </span>
                            <span className="text-base font-medium text-[#9076f7]">
                              {formatTimeShort(startTime)}
                            </span>
                            <span className="text-base font-medium text-[#9076f7]">
                              {formatTimeShort(endTime)}
                            </span>
                          </div>
                          {/* Справа: модули подгрупп — предмет, преподаватель+группа, аудитория (Figma Schedule cell module/student) */}
                          <div className="flex min-w-0 flex-1 flex-wrap gap-4">
                            {rows.map((lesson) => {
                              const teacherName =
                                lesson.teacher?.name ?? `Преп. #${lesson.teacherId}`;
                              const groupName = groups.find(
                                (g) => (g.id ?? null) === (lesson as { groupId?: number }).groupId,
                              )?.name ?? "Группа";
                              const classroomName =
                                lesson.classroom?.name ??
                                (lesson.classroomId != null
                                  ? `#${lesson.classroomId}`
                                  : "Дистанционно");
                              const buildingName = (
                                lesson.classroom as { building?: { name: string } } | undefined
                              )?.building?.name;
                              const audienceText =
                                buildingName != null && buildingName !== ""
                                  ? `${buildingName}, ${classroomName}`
                                  : classroomName;
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex min-w-[180px] flex-col gap-1.5"
                                >
                                  <span className="inline-flex w-fit rounded-lg bg-[#ebecf8] px-2 py-1 text-base font-medium text-[#1c2264]">
                                    {subjectName}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="rounded bg-[#e9f7f3] px-2 py-0.5 text-xs font-medium text-[#115f4c]">
                                      {teacherName}
                                    </span>
                                    <span className="rounded bg-[#e7f6f9] px-2 py-0.5 text-xs font-medium text-[#065d6b]">
                                      {groupName}
                                    </span>
                                  </div>
                                  <span className="inline-flex w-fit rounded-lg bg-[#fcf1ec] px-2 py-1 text-base font-medium text-[#7b4123]">
                                    {audienceText}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
