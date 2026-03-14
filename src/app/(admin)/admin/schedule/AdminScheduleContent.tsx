"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { BookOpen, ChevronRightIcon, Plus, Settings, Trash2, User, Users } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { BellsContent } from "@/app/(admin)/admin/schedule/BellsContent";
import { api } from "@/lib/api";
import { components } from "@/app/types/api";
import { fetchGroups } from "@/app/(admin)/admin/groups/groups-api";
import {
  fetchSubjects,
  type SubjectListItem,
} from "@/app/(admin)/admin/items/subjects-api";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import {
  SelectionSidePanel,
  type SelectionOption,
} from "@/app/components/SelectionSidePanel";
import {
  fetchTeachers,
  type TeacherListItem,
} from "@/app/(admin)/admin/users/users-api";
import {
  fetchBellTemplates,
  type BellTemplateSlot,
} from "@/app/(admin)/admin/schedule/bells-api";

/**
 * Контент страницы «Расписание»: вкладки «Предметы» и «Звонки».
 */
export function AdminScheduleContent() {
  const [activeTab, setActiveTab] = React.useState("subjects");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Расписание</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="subjects">Предметы</TabsTrigger>
          <TabsTrigger value="bells">Звонки</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="mt-4">
          {/* Логика расписания по предметам с ссылками на преподов и аудитории по макетам Figma */}
          <SubjectsScheduleContent />
        </TabsContent>

        <TabsContent value="bells" className="mt-4">
          <BellsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Типы данных для «Предметов»/расписания на основе реального API.
 * Здесь моделируем связи: предмет ↔ преподаватель ↔ аудитория.
 */
type RawScheduleDto = components["schemas"]["ScheduleResponseDto"];
type RawBellTemplateDto = components["schemas"]["BellTemplateSlotDto"];
type CreateScheduleDto = components["schemas"]["CreateScheduleDto"];
type ClassroomDto = components["schemas"]["ClassroomResponseDto"];

interface ScheduleItem extends Omit<
  RawScheduleDto,
  "id" | "classroomId" | "bellTemplate"
> {
  id: number;
  classroomId?: number | null;
  bellTemplate?: RawBellTemplateDto | null;
  /** Слот занятия: одинаковый у подгрупп одного занятия (приходит с API) */
  scheduleSlotId?: string | null;
}

interface SubjectsScheduleQueryResult {
  items: ScheduleItem[];
  meta?: components["schemas"]["ResponseMetaDto"];
}

interface ClassroomListItem extends Omit<ClassroomDto, "id"> {
  id?: number | null;
}

/**
 * Вспомогательный вызов API: список занятий для вкладки «Предметы» расписания.
 * Использует /api/schedule с фильтрами по группе, преподавателю и неделе и expand по Figma‑референсам.
 */
async function fetchSubjectsSchedule(params: {
  groupId?: number | null;
  teacherId?: number | null;
  dateFrom: string;
  dateTo: string;
}): Promise<SubjectsScheduleQueryResult> {
  const requestParams: Record<string, string | number> = {
    page: 1,
    // Бэкенд ограничивает limit <= 100 (ScheduleQueryDto).
    limit: 100,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  if (params.groupId != null) {
    requestParams.groupId = params.groupId;
  }

  if (params.teacherId != null) {
    requestParams.teacherId = params.teacherId;
  }

  // expand поддерживает несколько сущностей через запятую (subject, teacher, classroom).
  (requestParams as any).expand = "subject,teacher,classroom";

  const res = await api.get<{
    success: boolean;
    data: RawScheduleDto[];
    meta?: components["schemas"]["ResponseMetaDto"];
  }>("/api/schedule", {
    params: requestParams,
  });

  const body = res.data;
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error("Не удалось загрузить расписание по предметам");
  }

  const items: ScheduleItem[] = body.data.map((dto) => ({
    ...dto,
    id: (dto as unknown as { id: number }).id,
    classroomId:
      (dto as unknown as { classroomId?: number | null }).classroomId ?? null,
    bellTemplate:
      (dto as unknown as { bellTemplate?: RawBellTemplateDto | null })
        .bellTemplate ?? null,
    scheduleSlotId:
      (dto as unknown as { scheduleSlotId?: string | null }).scheduleSlotId ?? null,
  }));

  return { items, meta: body.meta };
}

/**
 * Вспомогательный вызов API: поиск аудиторий для выпадающего списка в модалке.
 * Использует GET /api/classroom/search (без фильтра по этажу).
 */
async function fetchClassroomsSearch(): Promise<ClassroomListItem[]> {
  const res = await api.get<{
    success: boolean;
    data: ClassroomDto[];
  }>("/api/classroom/search", {
    params: { page: 1, limit: 100 },
  });
  const body = res.data;
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error("Не удалось загрузить список аудиторий");
  }
  return body.data.map((dto) => ({
    ...dto,
    id: (dto as unknown as { id?: number | null }).id ?? null,
  }));
}

/** Тело создания занятия (classroomId опционально: null = удалённое занятие) */
type CreateScheduleBody = Omit<CreateScheduleDto, 'classroomId'> & {
  scheduleSlotId?: string;
  classroomId?: number | null;
};

/** Создать занятие: POST /api/schedule */
async function createScheduleLesson(
  body: CreateScheduleBody,
): Promise<ScheduleItem> {
  const res = await api.post<{
    success: boolean;
    data: RawScheduleDto;
    message?: string | null;
  }>("/api/schedule", body);
  const data = res.data;
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Не удалось создать занятие");
  }
  const dto = data.data;
  return {
    ...dto,
    id: (dto as unknown as { id: number }).id,
    classroomId:
      (dto as unknown as { classroomId?: number | null }).classroomId ?? null,
    bellTemplate:
      (dto as unknown as { bellTemplate?: RawBellTemplateDto | null })
        .bellTemplate ?? null,
    scheduleSlotId:
      (dto as unknown as { scheduleSlotId?: string | null }).scheduleSlotId ?? null,
  };
}

/** Тело обновления (classroomId опционально, null = удалённое занятие) */
type UpdateScheduleBody = Partial<Omit<CreateScheduleDto, 'classroomId'>> & {
  classroomId?: number | null;
};

/** Обновить занятие: PATCH /api/schedule/:id */
async function updateScheduleLesson(
  id: number,
  body: UpdateScheduleBody,
): Promise<ScheduleItem> {
  const res = await api.patch<{
    success: boolean;
    data: RawScheduleDto;
    message?: string | null;
  }>(`/api/schedule/${id}`, body);
  const data = res.data;
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Не удалось обновить занятие");
  }
  const dto = data.data;
  return {
    ...dto,
    id: (dto as unknown as { id: number }).id,
    classroomId:
      (dto as unknown as { classroomId?: number | null }).classroomId ?? null,
    bellTemplate:
      (dto as unknown as { bellTemplate?: RawBellTemplateDto | null })
        .bellTemplate ?? null,
  };
}

/** Удалить занятие: DELETE /api/schedule/:id */
async function deleteScheduleLesson(id: number): Promise<void> {
  const res = await api.delete<{
    success: boolean;
    message?: string | null;
  }>(`/api/schedule/${id}`);
  const data = res.data;
  if (!data.success) {
    throw new Error(data.message ?? "Не удалось удалить занятие");
  }
}

/** Формат даты как в макете: ДД.ММ.ГГ */
function formatFigmaDateLabel(date: Date): string {
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const yy = (date.getFullYear() % 100).toString().padStart(2, "0");
  return `${dd}.${mm}.${yy}`;
}

/** Неделя: понедельник 00:00 — воскресенье 23:59 */
function getWeekRangeIso(weekOffset: number): { from: string; to: string } {
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

/** ISO/Date → "8:30" как в макете */
function formatTimeShort(isoTime: string | Date | null | undefined): string {
  if (!isoTime) return "—";
  const date = typeof isoTime === "string" ? new Date(isoTime) : isoTime;
  const h = date.getUTCHours();
  const m = date.getUTCMinutes();
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Дни для табов по макету 1099-61873: Пн … Вс */
const WEEKDAY_TABS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
] as const;

/**
 * Контент вкладки «Предметы» — макет Figma 1099-61873 «день недели в расписании»:
 * верхняя строка (группа, неделя, дата), табы Пн–Вс, таблица Время | Предмет | Преподаватель | Корпус/Кабинет, кнопка добавления.
 */
function SubjectsScheduleContent() {
  // Ограничиваемся только предыдущей, текущей и следующей неделями
  const MIN_WEEK_OFFSET = -1;
  const MAX_WEEK_OFFSET = 1;

  const [selectedGroupId, setSelectedGroupId] = React.useState<number | "">("");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<
    number | ""
  >("");
  const [viewMode, setViewMode] = React.useState<"group" | "teacher">(
    "teacher",
  );
  // weekOffset: -1 — предыдущая неделя, 0 — текущая, 1 — следующая
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [selectedWeekday, setSelectedWeekday] = React.useState<number>(1); // 1=Пн … 7=Вс
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingLesson, setEditingLesson] = React.useState<ScheduleItem | null>(
    null,
  );
  const [initialLessonNumber, setInitialLessonNumber] = React.useState<
    number | null
  >(null);

  const queryClient = useQueryClient();

  const weekRange = React.useMemo(
    () => getWeekRangeIso(weekOffset),
    [weekOffset],
  );

  const {
    data: groupsData,
    isPending: isGroupsPending,
    isError: isGroupsError,
  } = useQuery({
    queryKey: ["admin-groups", "for-subjects-schedule"],
    queryFn: () => fetchGroups({ page: 1, limit: 500 }),
  });
  const groups = React.useMemo(
    () => groupsData?.data ?? [],
    [groupsData?.data],
  );

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
          ? [t.user.surname, t.user.name, t.user.patronymic]
              .filter(Boolean)
              .join(" ")
          : `#${t.userId}`;
        return { id, label };
      }),
    [teachers],
  );

  const hasFilters =
    viewMode === "teacher"
      ? selectedTeacherId !== ""
      : selectedGroupId !== "";

  const {
    data: scheduleData,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "admin-subjects-schedule",
      viewMode,
      selectedTeacherId === "" ? null : selectedTeacherId,
      selectedGroupId === "" ? null : selectedGroupId,
      weekRange.from,
      weekRange.to,
    ],
    enabled: hasFilters,
    queryFn: () => {
      const teacherIdParam =
        viewMode === "teacher" && selectedTeacherId !== ""
          ? Number(selectedTeacherId)
          : null;
      const groupIdParam =
        viewMode === "group" && selectedGroupId !== ""
          ? Number(selectedGroupId)
          : null;

      return fetchSubjectsSchedule({
        groupId: groupIdParam,
        teacherId: teacherIdParam,
        dateFrom: weekRange.from,
        dateTo: weekRange.to,
      });
    },
  });

  const items = scheduleData?.items ?? [];

  // Шаблоны звонков для вычисления времени начала/окончания по bellTemplateId.
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
      if (tpl.id != null) {
        map.set(Number(tpl.id), tpl);
      }
    }
    return map;
  }, [bellTemplates]);

  const getBellSlotForLesson = React.useCallback(
    (lesson: ScheduleItem): BellTemplateSlot | undefined => {
      const rawId = (lesson as unknown as { bellTemplateId?: number | null })
        .bellTemplateId;
      if (rawId == null) return undefined;
      return bellTemplatesById.get(Number(rawId));
    },
    [bellTemplatesById],
  );

  /**
   * Для отображения времени пары берём минимальное из startTime/secondStartTime
   * и максимальное из endTime/secondEndTime — полный диапазон урока.
   */
  const getBellDisplayRange = React.useCallback(
    (slot: BellTemplateSlot | undefined): { start: Date | null; end: Date | null } => {
      if (!slot) return { start: null, end: null };
      const starts: Date[] = [];
      const ends: Date[] = [];
      if (slot.startTime) {
        starts.push(new Date(slot.startTime as string | Date));
      }
      if (slot.secondStartTime) {
        starts.push(new Date(slot.secondStartTime as string | Date));
      }
      if (slot.endTime) {
        ends.push(new Date(slot.endTime as string | Date));
      }
      if (slot.secondEndTime) {
        ends.push(new Date(slot.secondEndTime as string | Date));
      }
      if (!starts.length || !ends.length) return { start: null, end: null };
      const start = new Date(Math.min(...starts.map((d) => d.getTime())));
      const end = new Date(Math.max(...ends.map((d) => d.getTime())));
      return { start, end };
    },
    [],
  );

  // День недели из scheduleDate: 0=Вс, 1=Пн, … 6=Сб. В табах 1=Пн … 7=Вс.
  const itemsForSelectedDay = React.useMemo(() => {
    return items.filter((item) => {
      const d = new Date(item.scheduleDate).getDay(); // 0..6
      return selectedWeekday === 7 ? d === 0 : d === selectedWeekday;
    });
  }, [items, selectedWeekday]);

  // Сортировка по номеру урока / времени начала
  const sortedRows = React.useMemo(() => {
    return [...itemsForSelectedDay].sort((a, b) => {
      const slotA = getBellSlotForLesson(a);
      const slotB = getBellSlotForLesson(b);
      const na = slotA?.lessonNumber ?? 0;
      const nb = slotB?.lessonNumber ?? 0;
      if (na !== nb) return na - nb;
      const { start: startA } = getBellDisplayRange(slotA);
      const { start: startB } = getBellDisplayRange(slotB);
      const ta =
        typeof startA === "string"
          ? startA
          : startA instanceof Date
            ? startA.toISOString()
            : "";
      const tb =
        typeof startB === "string"
          ? startB
          : startB instanceof Date
            ? startB.toISOString()
            : "";
      return ta.localeCompare(tb);
    });
  }, [itemsForSelectedDay, getBellSlotForLesson, getBellDisplayRange]);

  // Ключ слота: один и тот же у всех подгрупп одного занятия
  const getSlotKey = React.useCallback((item: ScheduleItem) => {
    if (item.scheduleSlotId) return item.scheduleSlotId;
    return `legacy-${item.subjectId}-${item.groupId}-${item.scheduleDate}-${item.bellTemplateId}`;
  }, []);

  // Группировка по слоту: одна строка таблицы на слот (несколько подгрупп — один блок)
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

  // Дата выбранного дня в текущей неделе для тега справа
  const selectedDayDate = React.useMemo(() => {
    const mon = new Date(weekRange.from);
    const dayIndex = selectedWeekday === 7 ? 6 : selectedWeekday - 1;
    const d = new Date(mon);
    d.setDate(mon.getDate() + dayIndex);
    return d;
  }, [weekRange.from, selectedWeekday]);

  const handleOpenCreate = React.useCallback(() => {
    const maxNumber =
      sortedRows.reduce(
        (max, item) =>
          Math.max(max, getBellSlotForLesson(item)?.lessonNumber ?? 0),
        0,
      ) || 0;
    setEditingLesson(null);
    setAddSubgroupSlot(null);
    setInitialLessonNumber(maxNumber + 1);
    setModalOpen(true);
  }, [sortedRows, getBellSlotForLesson]);

  const handleOpenEdit = React.useCallback(
    (lesson: ScheduleItem) => {
      setEditingLesson(lesson);
      setAddSubgroupSlot(null);
      setInitialLessonNumber(
        getBellSlotForLesson(lesson)?.lessonNumber ?? null,
      );
      setModalOpen(true);
    },
    [getBellSlotForLesson],
  );

  /** Открыть модалку для добавления подгруппы к занятию (тот же слот, другой преподаватель/аудитория) */
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
    await queryClient.invalidateQueries({
      queryKey: ["admin-subjects-schedule"],
    });
    await queryClient.refetchQueries({
      queryKey: ["admin-subjects-schedule"],
    });
    setModalOpen(false);
    setEditingLesson(null);
    setInitialLessonNumber(null);
    setAddSubgroupSlot(null);
  }, [queryClient]);

  const deleteLessonMutation = useMutation({
    mutationFn: (id: number) => deleteScheduleLesson(id),
    onSuccess: () => {
      void handleSaved();
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        alert(String(error.response.data.message));
      } else {
        alert(
          error instanceof Error ? error.message : "Не удалось удалить занятие",
        );
      }
    },
  });

  const handleDeleteFromModal = React.useCallback(
    (lessonId: number) => {
      if (
        !window.confirm("Удалить это занятие из расписания для этого дня?")
      ) {
        return;
      }
      setModalOpen(false);
      setEditingLesson(null);
      setInitialLessonNumber(null);
      deleteLessonMutation.mutate(lessonId);
    },
    [deleteLessonMutation],
  );

  return (
    <div className="space-y-4 rounded-lg border border-[#ccc0fb] bg-[#f6f6f6] p-4">
      {/* Верхняя строка: группа (циан), неделя (фиолет), иконка, дата — макет Frame 11373 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Переключатель режима просмотра: по группе / по преподавателю (иконки) */}
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

        {/* Чип выбора группы — цвет как ИСИП-9-22 (#e7f6f9, #5bc5d6, #065d6b) */}
        {viewMode === "group" && (
          <select
            className="h-8 rounded-lg border-2 border-[#5bc5d6] bg-[#e7f6f9] px-3 text-base font-medium text-[#065d6b] outline-none focus:ring-2 focus:ring-[#5bc5d6]/50"
            value={selectedGroupId === "" ? "" : String(selectedGroupId)}
            onChange={(e) =>
              setSelectedGroupId(
                e.target.value === "" ? "" : Number(e.target.value),
              )
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

        {/* Чип выбора преподавателя — отдельный фильтр \"расписание по преподавателю\" */}
        {viewMode === "teacher" && (
          <select
            className="h-8 rounded-lg border-2 border-[#69c8b1] bg-[#e9f7f3] px-3 text-base font-medium text-[#115f4c] outline-none focus:ring-2 focus:ring-[#69c8b1]/50"
            value={selectedTeacherId === "" ? "" : String(selectedTeacherId)}
            onChange={(e) =>
              setSelectedTeacherId(
                e.target.value === "" ? "" : Number(e.target.value),
              )
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

        {/* Неделя — #f2ebf7, #a778c6, #441e5e */}
        <span className="rounded-lg border-2 border-[#a778c6] bg-[#f2ebf7] px-3 py-1.5 text-base font-medium text-[#441e5e]">
          {formatFigmaDateLabel(new Date(weekRange.from))} –{" "}
          {formatFigmaDateLabel(new Date(weekRange.to))}
        </span>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#b5a3fa] bg-[#f4f1fe] text-[#836be1] hover:bg-[#ede9fe]"
          title="Неделя"
          aria-label="Неделя"
        >
          <BookOpen className="size-5" />
        </button>

        {/* Тег даты выбранного дня — #efefef, #333 */}
        <span className="rounded-lg bg-[#efefef] px-3 py-1.5 text-base font-medium text-[#333333]">
          {formatFigmaDateLabel(selectedDayDate)}
        </span>

        {/* Кнопки переключения недели (влево/вправо) по макету с иконками-книгами */}
        <button
          type="button"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#b5a3fa] bg-[#f4f1fe] text-[#836be1] hover:bg-[#ede9fe]"
          onClick={() =>
            setWeekOffset((prev) =>
              prev <= MIN_WEEK_OFFSET ? MIN_WEEK_OFFSET : prev - 1,
            )
          }
          title="Предыдущая неделя"
          aria-label="Предыдущая неделя"
          disabled={weekOffset <= MIN_WEEK_OFFSET}
        >
          <BookOpen className="size-4 rotate-180" />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#b5a3fa] bg-[#f4f1fe] text-[#836be1] hover:bg-[#ede9fe]"
          onClick={() =>
            setWeekOffset((prev) =>
              prev >= MAX_WEEK_OFFSET ? MAX_WEEK_OFFSET : prev + 1,
            )
          }
          title="Следующая неделя"
          aria-label="Следующая неделя"
          disabled={weekOffset >= MAX_WEEK_OFFSET}
        >
          <BookOpen className="size-4" />
        </button>
      </div>

      {/* Табы дней Пн–Вс — Frame 11277: активный #b5a3fa/#836be1, неактивный #cccccc/#7d7d7d */}
      <div className="flex flex-wrap gap-1">
        {WEEKDAY_TABS.map((tab) => {
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

      {/* Таблица: Время | Предмет | Преподаватель | Корпус/Кабинет — Frame 11483 */}
      <div className="overflow-x-auto">
        {!hasFilters ? (
          <p className="py-6 text-center text-[#929292]">
            Чтобы увидеть расписание, выберите группу или преподавателя.
          </p>
        ) : isPending ? (
          <p className="py-6 text-center text-[#929292]">
            Загружаем расписание…
          </p>
        ) : isError ? (
          <p className="py-6 text-center text-destructive">
            {isAxiosError(error) && error.response?.data?.message
              ? String(error.response.data.message)
              : "Не удалось загрузить расписание."}
          </p>
        ) : (
          <table className="w-full min-w-[600px] border-collapse text-base">
            <thead>
              <tr>
                <th className="pb-2 pr-4 text-left font-medium text-[#929292]">
                  Время
                </th>
                <th className="pb-2 pr-4 text-left font-medium text-[#929292]">
                  Предмет
                </th>
                <th className="pb-2 pr-4 text-left font-medium text-[#929292]">
                  Преподаватель
                </th>
                <th className="pb-2 pr-4 text-left font-medium text-[#929292]">
                  Корпус/Кабинет
                </th>
                <th className="w-10" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {groupedBySlot.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#929292]">
                    На выбранный день занятий нет.
                  </td>
                </tr>
              ) : (
                groupedBySlot.map(({ slotKey, rows }) => {
                  const first = rows[0];
                  const slot = getBellSlotForLesson(first);
                  const { start: startTime, end: endTime } = getBellDisplayRange(slot);
                  const subjectName =
                    first.subject?.name ?? `Предмет #${first.subjectId}`;

                  return (
                    <tr key={slotKey} className="border-t border-[#eee]">
                      <td className="py-2 pr-4 align-top">
                        <div className="text-sm font-medium text-[#8f76f7]">
                          {formatTimeShort(startTime)}
                        </div>
                        <div className="text-sm font-medium text-[#8f76f7]">
                          {formatTimeShort(endTime)}
                        </div>
                      </td>
                      <td className="py-2 pr-4 align-top">
                        <span className="inline-flex rounded-lg bg-[#ebecf8] px-2 py-1 text-[#1c2264]">
                          {subjectName}
                        </span>
                      </td>
                      <td className="py-2 pr-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          {rows.map((lesson) => {
                            const teacherName =
                              lesson.teacher?.name ?? `Преп. #${lesson.teacherId}`;
                            return (
                              <div
                                key={lesson.id}
                                className="flex flex-wrap items-center justify-between gap-2"
                              >
                                <span className="inline-flex rounded-lg bg-[#e9f7f3] px-2 py-1 text-[#115f4c]">
                                  {teacherName}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    className="flex h-7 w-7 items-center justify-center rounded bg-[#f6f6f6] text-muted-foreground hover:bg-muted"
                                    title="Редактировать подгруппу"
                                    aria-label="Редактировать подгруппу"
                                    onClick={() => handleOpenEdit(lesson)}
                                  >
                                    <Settings className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="flex h-7 w-7 items-center justify-center rounded bg-[#fef2f2] text-destructive hover:bg-[#fee2e2]"
                                    title="Удалить подгруппу"
                                    aria-label="Удалить подгруппу"
                                    disabled={deleteLessonMutation.isPending}
                                    onClick={() => {
                                      if (
                                        !window.confirm(
                                          "Удалить эту подгруппу из занятия?",
                                        )
                                      ) return;
                                      deleteLessonMutation.mutate(lesson.id);
                                    }}
                                  >
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
                            const classroomName =
                              lesson.classroom?.name ??
                              (lesson.classroomId != null
                                ? `#${lesson.classroomId}`
                                : "Дистанционно");
                            const buildingName = (lesson.classroom as { building?: { name: string } } | undefined)?.building?.name;
                            const hasBuilding = buildingName != null && buildingName !== "";
                            return (
                              <div
                                key={lesson.id}
                                className="flex flex-wrap items-center gap-1.5"
                              >
                                {hasBuilding && (
                                  <span className="inline-flex rounded-lg bg-[#fcf1ec] px-2 py-1 text-[#7b4123]">
                                    {buildingName}
                                  </span>
                                )}
                                <span className="inline-flex rounded-lg bg-[#fcf1ec] px-2 py-1 text-[#7b4123]">
                                  {classroomName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2 align-top">
                        {first.scheduleSlotId ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded border border-[#b5a3fa] bg-[#f4f1fe] px-2 py-1.5 text-sm font-medium text-[#4f4188] hover:bg-[#ede9fe]"
                            title="Добавить подгруппу к этому занятию"
                            onClick={() => handleOpenAddSubgroup(first)}
                          >
                            <Plus className="size-4" />
                            Подгруппа
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

      {/* Кнопка добавления — макет 1587:35331 (#f4f1fe, #b5a3fa) */}
      <div className="flex justify-start">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border-2 border-[#b5a3fa] bg-[#f4f1fe] px-4 py-2 text-base font-medium text-[#4f4188] hover:bg-[#ede9fe]"
          onClick={handleOpenCreate}
        >
          <Plus className="size-5" />
          Добавить занятие
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
        lesson={editingLesson}
        initialLessonNumber={initialLessonNumber}
        addSubgroupSlot={addSubgroupSlot}
        onSaved={handleSaved}
        onDeleteLesson={editingLesson ? handleDeleteFromModal : undefined}
      />
    </div>
  );
}

type ScheduleLessonModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "addSubgroup";
  /** Неделя/день и группа, для верхних тегов и body */
  weekday: number;
  date: Date;
  groupId: number | null;
  groups: { id?: number | null; name: string }[];
  /** Редактируемое занятие (для режима edit) */
  lesson: ScheduleItem | null;
  /** Начальный номер пары (если создаём) */
  initialLessonNumber: number | null;
  /** Слот для добавления подгруппы (режим addSubgroup): предмет/группа/дата фиксированы */
  addSubgroupSlot?: {
    scheduleSlotId: string;
    subjectId: number;
    groupId: number;
    scheduleDate: string;
    bellTemplateId: number;
  } | null;
  /** Вызывается после успешного create/update */
  onSaved: () => void;
  /** Удаление занятия в режиме редактирования */
  onDeleteLesson?: (lessonId: number) => void;
};

/**
 * Модалка создания/редактирования занятия по макетам 1104-14981 и 1127-20190.
 * Секции: Преподаватели, Предметы, Аудитории + нижние кнопки «Отменить» / «Подтвердить».
 */
function ScheduleLessonModal({
  open,
  onOpenChange,
  mode,
  weekday,
  date,
  groupId,
  groups,
  lesson,
  initialLessonNumber,
  addSubgroupSlot = null,
  onSaved,
  onDeleteLesson,
}: ScheduleLessonModalProps) {
  const isAddSubgroup = mode === "addSubgroup" && addSubgroupSlot != null;
  const [localGroupId, setLocalGroupId] = React.useState<number | null>(
    groupId,
  );
  const [subjectId, setSubjectId] = React.useState<number | null>(
    lesson?.subjectId ?? addSubgroupSlot?.subjectId ?? null,
  );
  const [teacherId, setTeacherId] = React.useState<number | null>(
    lesson?.teacherId ?? null,
  );
  const [classroomId, setClassroomId] = React.useState<number | null>(
    (lesson as unknown as { classroomId?: number | null })?.classroomId ?? null,
  );
  const [lessonNumber, setLessonNumber] = React.useState<number>(
    lesson?.bellTemplate?.lessonNumber ?? initialLessonNumber ?? 1,
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [teacherPanelOpen, setTeacherPanelOpen] = React.useState(false);
  const [subjectPanelOpen, setSubjectPanelOpen] = React.useState(false);
  const [classroomPanelOpen, setClassroomPanelOpen] = React.useState(false);

  React.useEffect(() => {
    setLocalGroupId(addSubgroupSlot?.groupId ?? groupId);
    setSubjectId(lesson?.subjectId ?? addSubgroupSlot?.subjectId ?? null);
    setTeacherId(lesson?.teacherId ?? null);
    setClassroomId(
      (lesson as unknown as { classroomId?: number | null })?.classroomId ?? null,
    );
    setLessonNumber(
      lesson?.bellTemplate?.lessonNumber ?? initialLessonNumber ?? 1,
    );
    setFormError(null);
  }, [groupId, lesson, initialLessonNumber, addSubgroupSlot, open]);

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects-list-for-schedule", 1, 100],
    queryFn: () => fetchSubjects({ page: 1, limit: 100 }),
  });
  const subjects: SubjectListItem[] = subjectsData?.data ?? [];

  const { data: teachersData } = useQuery({
    queryKey: ["teachers-list-for-schedule", 1, 100],
    queryFn: () => fetchTeachers({ page: 1, limit: 100 }),
  });
  const teachers: TeacherListItem[] = teachersData?.data ?? [];

  const { data: classroomsData } = useQuery({
    queryKey: ["classrooms-list-for-schedule", 1, 100],
    queryFn: fetchClassroomsSearch,
  });
  const classrooms: ClassroomListItem[] = classroomsData ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      // Аудитория опциональна: null = занятие проводится удалённо (дистанционно)
      if (!localGroupId || !subjectId || !teacherId) {
        throw new Error("Заполните группу, предмет и преподавателя");
      }
      const scheduleDateIso = date.toISOString();
      const classroomIdOrNull = classroomId ?? null;

      // Добавление подгруппы к существующему занятию: отправляем scheduleSlotId и данные слота
      if (isAddSubgroup && addSubgroupSlot) {
        return createScheduleLesson({
          scheduleSlotId: addSubgroupSlot.scheduleSlotId,
          subjectId: addSubgroupSlot.subjectId,
          groupId: addSubgroupSlot.groupId,
          scheduleDate: addSubgroupSlot.scheduleDate,
          teacherId,
          classroomId: classroomIdOrNull,
        });
      }

      if (mode === "create") {
        return createScheduleLesson({
          groupId: localGroupId,
          subjectId,
          teacherId,
          classroomId: classroomIdOrNull,
          lessonNumber,
          scheduleDate: scheduleDateIso,
        });
      }

      if (!lesson) {
        throw new Error("Нет занятия для редактирования");
      }

      return updateScheduleLesson(lesson.id, {
        groupId: localGroupId,
        subjectId,
        teacherId,
        classroomId: classroomIdOrNull,
        lessonNumber,
        scheduleDate: scheduleDateIso,
      });
    },
    onSuccess: () => {
      onSaved();
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        setFormError(String(error.response.data.message));
      } else {
        setFormError(
          error instanceof Error ? error.message : "Ошибка сохранения",
        );
      }
    },
  });

  const dayLabel = (() => {
    switch (weekday) {
      case 1:
        return "Понедельник";
      case 2:
        return "Вторник";
      case 3:
        return "Среда";
      case 4:
        return "Четверг";
      case 5:
        return "Пятница";
      case 6:
        return "Суббота";
      case 7:
      default:
        return "Воскресенье";
    }
  })();

  const pairLabel = `${lessonNumber} пара`;

  const selectedGroupName =
    groups.find((g) => (g.id != null ? Number(g.id) === localGroupId : false))
      ?.name ??
    (localGroupId != null ? `Группа #${localGroupId}` : "Не выбрана");

  const selectedSubjectName =
    subjects.find((s) => (s.id != null ? Number(s.id) === subjectId : false))
      ?.name ??
    (subjectId != null ? `Предмет #${subjectId}` : "Выберите предмет");

  type TeacherOption = { id: number; label: string };
  const teacherOptions: TeacherOption[] = React.useMemo(
    () =>
      teachers.map((t) => {
        const rawId = (t as unknown as { id?: number | null }).id ?? t.userId;
        const id = Number(rawId);
        const label = t.user
          ? [t.user.surname, t.user.name, t.user.patronymic]
              .filter(Boolean)
              .join(" ")
          : `#${t.userId}`;
        return { id, label };
      }),
    [teachers],
  );

  const selectedTeacherName =
    teacherOptions.find((t) => t.id === teacherId)?.label ??
    (teacherId != null
      ? `Преподаватель #${teacherId}`
      : "Выберите преподавателя");

  /** Специальный id для варианта «Дистанционно» (занятие без аудитории) */
  const REMOTE_CLASSROOM_ID = "remote";
  const selectedClassroomName =
    classroomId == null
      ? "Дистанционно"
      : classrooms.find((c) =>
          c.id != null ? Number(c.id) === classroomId : false,
        )?.name ?? (classroomId != null ? `Аудитория #${classroomId}` : "Выберите аудиторию");

  const teacherSelectionOptions: SelectionOption[] = teacherOptions.map((t) => ({
    id: String(t.id),
    label: t.label,
  }));
  const subjectSelectionOptions: SelectionOption[] = subjects.map((s) => ({
    id: String(s.id ?? 0),
    label: s.name ?? "",
  }));
  // Первый вариант — «Дистанционно»; остальные — реальные аудитории
  const classroomSelectionOptions: SelectionOption[] = [
    { id: REMOTE_CLASSROOM_ID, label: "Дистанционно" },
    ...classrooms.map((c) => ({
      id: String(c.id ?? 0),
      label: c.name ?? "",
    })),
  ];

  const isSubmitting = mutation.isPending;

  return (
    <EntityEditSidepage
      open={open}
      onOpenChange={onOpenChange}
      title={
        isAddSubgroup
          ? "Добавить подгруппу"
          : mode === "create"
            ? "Новое занятие"
            : "Редактирование занятия"
      }
      className="max-w-[480px]"
    >
      {/* Верхние теги как в модалке: день недели / дата / пара */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[#efefef] px-3 py-1.5 text-sm font-medium text-[#333333]">
          {dayLabel}
        </span>
        <span className="rounded-md bg-[#efefef] px-3 py-1.5 text-sm font-medium text-[#333333]">
          {formatFigmaDateLabel(date)}
        </span>
        <span className="rounded-md bg-[#efefef] px-3 py-1.5 text-sm font-medium text-[#333333]">
          {pairLabel}
        </span>
      </div>

      <div className="space-y-4">
        {/* Преподаватели: клик открывает боковую панель с radio */}
        <section className="space-y-2">
          <div className="rounded-lg border-2 border-[#69c8b1] bg-[#e9f7f3] px-3 py-2 text-sm font-medium text-[#115f4c]">
            Преподаватели
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && setTeacherPanelOpen(true)}
            disabled={isSubmitting}
            className="flex h-9 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-sm text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
          >
            <span>{selectedTeacherName}</span>
            <ChevronRightIcon className="size-4 text-[#929292]" />
          </button>
          <SelectionSidePanel
            open={teacherPanelOpen}
            onOpenChange={setTeacherPanelOpen}
            title="Преподаватели"
            mode="radio"
            options={teacherSelectionOptions}
            selectedId={teacherId != null ? String(teacherId) : null}
            onConfirm={(id) => setTeacherId(id ? Number(id) : null)}
            searchPlaceholder="Поиск"
            disabled={isSubmitting}
          />
        </section>

        {/* Предметы: в режиме подгруппы только отображение (фиксирован из слота) */}
        <section className="space-y-2">
          <div className="rounded-lg border-2 border-[#767dcd] bg-[#ebecf8] px-3 py-2 text-sm font-medium text-[#1c2264]">
            Предметы
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && !isAddSubgroup && setSubjectPanelOpen(true)}
            disabled={isSubmitting || isAddSubgroup}
            className="flex h-9 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-sm text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
          >
            <span>{selectedSubjectName}</span>
            <ChevronRightIcon className="size-4 text-[#929292]" />
          </button>
          <SelectionSidePanel
            open={subjectPanelOpen}
            onOpenChange={setSubjectPanelOpen}
            title="Предметы"
            mode="radio"
            options={subjectSelectionOptions}
            selectedId={subjectId != null ? String(subjectId) : null}
            onConfirm={(id) => setSubjectId(id ? Number(id) : null)}
            searchPlaceholder="Поиск"
            disabled={isSubmitting}
          />
        </section>

        {/* Аудитории: клик открывает боковую панель с radio */}
        <section className="space-y-2">
          <div className="rounded-lg border-2 border-[#eaa47f] bg-[#fcf1ec] px-3 py-2 text-sm font-medium text-[#7b4123]">
            Аудитории
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && setClassroomPanelOpen(true)}
            disabled={isSubmitting}
            className="flex h-9 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-sm text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
          >
            <span>{selectedClassroomName}</span>
            <ChevronRightIcon className="size-4 text-[#929292]" />
          </button>
          <SelectionSidePanel
            open={classroomPanelOpen}
            onOpenChange={setClassroomPanelOpen}
            title="Аудитории"
            mode="radio"
            options={classroomSelectionOptions}
            selectedId={classroomId != null ? String(classroomId) : REMOTE_CLASSROOM_ID}
            onConfirm={(id) =>
              setClassroomId(id === REMOTE_CLASSROOM_ID ? null : id ? Number(id) : null)
            }
            searchPlaceholder="Поиск"
            disabled={isSubmitting}
          />
        </section>

        {/* Группа и номер пары (для ясности связки) */}
        <section className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-[#efefef] px-3 py-1.5 text-xs font-medium text-[#333333]">
              Группа: {selectedGroupName}
            </span>
            <span className="rounded-md bg-[#efefef] px-3 py-1.5 text-xs font-medium text-[#333333]">
              Пара: {lessonNumber}
            </span>
          </div>
          <input
            type="number"
            min={1}
            max={12}
            value={lessonNumber}
            onChange={(e) => setLessonNumber(Number(e.target.value) || 1)}
            className="h-9 w-24 rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-sm outline-none focus:border-[#836be1] focus:ring-2 focus:ring-[#836be1]/30"
          />
        </section>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        {/* Нижние кнопки, как в modal footer: Удалить / Отменить / Подтвердить */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {mode === "edit" && lesson && onDeleteLesson ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border-2 border-destructive bg-[#fef2f2] px-4 py-2 text-sm font-medium text-destructive hover:bg-[#fee2e2]"
              onClick={() => onDeleteLesson(lesson.id)}
              disabled={isSubmitting}
            >
              Удалить занятие
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border-2 border-[#b5a3fa] bg-[#f4f1fe] px-4 py-2 text-sm font-medium text-[#4f4188] hover:bg-[#ede9fe]"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Отменить
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-[#836be1] px-4 py-2 text-sm font-medium text-[#f4f1fe] hover:bg-[#6d5ad0] disabled:opacity-60"
              onClick={() => mutation.mutate()}
              disabled={isSubmitting}
            >
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    </EntityEditSidepage>
  );
}
