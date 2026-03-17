"use client";

/**
 * Модалка создания/редактирования занятия по макетам 1104-14981 и 1127-20190.
 * Секции: Преподаватели, Предметы, Аудитории + нижние кнопки «Отменить» / «Подтвердить».
 */

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ChevronRightIcon } from "lucide-react";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import {
  SelectionSidePanel,
  type SelectionOption,
} from "@/app/components/SelectionSidePanel";
import {
  fetchSubjectById,
  fetchSubjects,
  fetchSubjectsByGroupId,
  type SubjectListItem,
} from "@/app/(admin)/admin/items/subjects-api";
import {
  fetchTeachers,
  type TeacherListItem,
} from "@/app/(admin)/admin/users/users-api";
import {
  createScheduleLesson,
  updateScheduleLesson,
  fetchClassroomsSearch,
  type ScheduleItem,
  type ClassroomListItem,
} from "@/app/(admin)/admin/schedule/schedule-lesson-api";
import { formatDateLabel } from "@/lib/schedule-utils";

export type ScheduleLessonModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "addSubgroup";
  weekday: number;
  date: Date;
  groupId: number | null;
  groups: { id?: number | null; name: string }[];
  /** В режиме «по группе» при создании — группа уже выбрана в фильтре, выбор группы скрыт */
  presetGroupId?: number | null;
  /** В режиме «по преподавателю» при создании — уже выбранный преподаватель */
  presetTeacherId?: number | null;
  lesson: ScheduleItem | null;
  initialLessonNumber: number | null;
  addSubgroupSlot?: {
    scheduleSlotId: string;
    subjectId: number;
    groupId: number;
    scheduleDate: string;
    bellTemplateId: number;
  } | null;
  onSaved: () => void;
  onDeleteLesson?: (lessonId: number) => void;
};

const WEEKDAY_FULL_NAMES: Record<number, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье",
};

export function ScheduleLessonModal({
  open,
  onOpenChange,
  mode,
  weekday,
  date,
  groupId,
  groups,
  presetGroupId = null,
  presetTeacherId = null,
  lesson,
  initialLessonNumber,
  addSubgroupSlot = null,
  onSaved,
  onDeleteLesson,
}: ScheduleLessonModalProps) {
  const isAddSubgroup = mode === "addSubgroup" && addSubgroupSlot != null;
  const isGroupReadOnly = mode === "create" && presetGroupId != null;
  const showGroupSelection = (mode === "create" || mode === "edit") && !isAddSubgroup && !isGroupReadOnly;
  const isTeacherReadOnly = mode === "create" && presetTeacherId != null;

  const [localGroupId, setLocalGroupId] = React.useState<number | null>(groupId);
  const [subjectId, setSubjectId] = React.useState<number | null>(
    lesson?.subjectId ?? addSubgroupSlot?.subjectId ?? null,
  );
  const [teacherId, setTeacherId] = React.useState<number | null>(
    lesson?.teacherId ?? (mode === "create" && presetTeacherId != null ? presetTeacherId : null),
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
  const [groupPanelOpen, setGroupPanelOpen] = React.useState(false);

  React.useEffect(() => {
    setLocalGroupId(addSubgroupSlot?.groupId ?? lesson?.groupId ?? groupId);
    setSubjectId(lesson?.subjectId ?? addSubgroupSlot?.subjectId ?? null);
    setTeacherId(
      lesson?.teacherId ??
        (mode === "create" && presetTeacherId != null ? presetTeacherId : null),
    );
    setClassroomId(
      (lesson as unknown as { classroomId?: number | null })?.classroomId ?? null,
    );
    setLessonNumber(
      lesson?.bellTemplate?.lessonNumber ?? initialLessonNumber ?? 1,
    );
    setFormError(null);
  }, [groupId, lesson, initialLessonNumber, addSubgroupSlot, presetTeacherId, mode, open]);

  const groupIdForSubjectsQuery =
    presetGroupId != null ? groupId : localGroupId;

  const { data: subjectsData, isPending: isSubjectsLoading } = useQuery({
    queryKey: ["subjects-list-for-schedule", groupIdForSubjectsQuery != null ? `group-${groupIdForSubjectsQuery}` : "all", 1, 100],
    queryFn: () =>
      groupIdForSubjectsQuery != null
        ? fetchSubjectsByGroupId(groupIdForSubjectsQuery)
        : fetchSubjects({ page: 1, limit: 100 }),
    enabled: open,
  });
  const subjectsFromApi: SubjectListItem[] = subjectsData?.data ?? [];

  const { data: teachersData } = useQuery({
    queryKey: ["teachers-list-for-schedule", 1, 100],
    queryFn: () => fetchTeachers({ page: 1, limit: 100 }),
    enabled: open,
  });
  const teachers: TeacherListItem[] = teachersData?.data ?? [];

  const { data: subjectWithTeachersData } = useQuery({
    queryKey: ["subject-teachers-for-schedule", subjectId ?? null],
    queryFn: () => fetchSubjectById(subjectId!, "teachers"),
    enabled: subjectId != null,
  });
  const subjectTeachers = subjectWithTeachersData?.teachers ?? [];

  const selectedTeacher = React.useMemo(
    () =>
      teachers.find((t) => {
        const rawId = (t as unknown as { id?: number | null }).id ?? t.userId;
        return Number(rawId) === teacherId;
      }),
    [teachers, teacherId],
  );

  const filteredSubjects = React.useMemo(() => {
    if (!teacherId || !selectedTeacher?.subjects?.length) return subjectsFromApi;
    const teacherSubjectIds = new Set(selectedTeacher.subjects.map((s) => s.id).filter((id): id is number => id != null));
    const intersection = subjectsFromApi.filter((s) => s.id != null && teacherSubjectIds.has(Number(s.id)));
    return intersection.length > 0 ? intersection : subjectsFromApi;
  }, [subjectsFromApi, teacherId, selectedTeacher?.subjects]);

  React.useEffect(() => {
    if (subjectId == null || open === false) return;
    const allowed = filteredSubjects.some((s) => (s.id ?? 0) === subjectId);
    if (!allowed) setSubjectId(null);
  }, [filteredSubjects, subjectId, open]);

  React.useEffect(() => {
    if (teacherId == null || open === false || isTeacherReadOnly) return;
    if (subjectId == null) return;
    const allowed = subjectTeachers.some((t) => (t.id ?? 0) === teacherId);
    if (!allowed) setTeacherId(null);
  }, [subjectTeachers, subjectId, teacherId, open, isTeacherReadOnly]);

  const { data: classroomsData } = useQuery({
    queryKey: ["classrooms-list-for-schedule", 1, 100],
    queryFn: fetchClassroomsSearch,
  });
  const classrooms: ClassroomListItem[] = classroomsData ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (!localGroupId || !subjectId || !teacherId) {
        throw new Error("Заполните группу, предмет и преподавателя");
      }
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const scheduleDateIso = `${y}-${m}-${d}`;
      const classroomIdOrNull = classroomId ?? null;

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
      setFormError(getApiErrorMessage(error, "Ошибка сохранения"));
    },
  });

  const dayLabel = WEEKDAY_FULL_NAMES[weekday] ?? "Воскресенье";
  const pairLabel = `${lessonNumber} пара`;

  const selectedGroupName =
    groups.find((g) => (g.id != null ? Number(g.id) === localGroupId : false))?.name ??
    (localGroupId != null ? `Группа #${localGroupId}` : "Не выбрана");

  const selectedSubjectName =
    filteredSubjects.find((s) => (s.id != null ? Number(s.id) === subjectId : false))?.name ??
    subjectsFromApi.find((s) => (s.id != null ? Number(s.id) === subjectId : false))?.name ??
    (subjectId != null ? `Предмет #${subjectId}` : "Выберите предмет");

  type TeacherOption = { id: number; label: string };
  const teacherOptionsAll: TeacherOption[] = React.useMemo(
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

  const teacherOptions: TeacherOption[] = React.useMemo(() => {
    if (subjectId == null || subjectTeachers.length === 0) return teacherOptionsAll;
    return subjectTeachers
      .filter((t) => t.id != null)
      .map((t) => {
        const id = Number(t.id);
        const label = t.user
          ? [t.user.surname, t.user.name, t.user.patronymic].filter(Boolean).join(" ")
          : `#${t.userId}`;
        return { id, label };
      });
  }, [subjectId, subjectTeachers, teacherOptionsAll]);

  const selectedTeacherName =
    teacherOptions.find((t) => t.id === teacherId)?.label ??
    teacherOptionsAll.find((t) => t.id === teacherId)?.label ??
    (teacherId != null ? `Преподаватель #${teacherId}` : "Выберите преподавателя");

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
  const subjectSelectionOptions: SelectionOption[] = filteredSubjects.map((s) => ({
    id: String(s.id ?? 0),
    label: s.name ?? "",
  }));
  const groupSelectionOptions: SelectionOption[] = groups.map((g) => ({
    id: String(g.id ?? 0),
    label: g.name ?? "",
  }));
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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[#efefef] px-3 py-1.5 text-sm font-medium text-[#333333]">
          {dayLabel}
        </span>
        <span className="rounded-md bg-[#efefef] px-3 py-1.5 text-sm font-medium text-[#333333]">
          {formatDateLabel(date)}
        </span>
        <span className="rounded-md bg-[#efefef] px-3 py-1.5 text-sm font-medium text-[#333333]">
          {pairLabel}
        </span>
      </div>

      <div className="space-y-4">
        <section className="space-y-2">
          <div className="rounded-lg border-2 border-[#69c8b1] bg-[#e9f7f3] px-3 py-2 text-sm font-medium text-[#115f4c]">
            Преподаватели
          </div>
          {isTeacherReadOnly ? (
            <div className="rounded-lg border border-[#cccccc] bg-[#f0f0f0] px-3 py-2 text-sm text-[#333333]">
              {selectedTeacherName}
            </div>
          ) : (
            <>
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
            </>
          )}
        </section>

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
          {!isAddSubgroup && !isSubjectsLoading && subjectSelectionOptions.length === 0 && (groupIdForSubjectsQuery != null || teacherId != null) && (
            <p className="text-xs text-[#666666]">
              {groupIdForSubjectsQuery == null
                ? "Сначала выберите группу — отобразятся предметы группы."
                : "Нет предметов, привязанных к этой группе. Привяжите предметы к группе в карточке предмета (раздел «Предметы»)."}
            </p>
          )}
          {!isAddSubgroup && teacherId != null && selectedTeacher && !selectedTeacher.subjects?.length && subjectSelectionOptions.length > 0 && (
            <p className="text-xs text-[#666666]">
              У выбранного преподавателя не назначены предметы — показаны предметы группы. Назначьте предметы преподавателю в карточке преподавателя.
            </p>
          )}
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

        <section className="space-y-2">
          {showGroupSelection ? (
            <>
              <div className="rounded-lg border-2 border-[#5bc5d6] bg-[#e7f6f9] px-3 py-2 text-sm font-medium text-[#065d6b]">
                Группа
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setGroupPanelOpen(true)}
                disabled={isSubmitting}
                className="flex h-9 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-sm text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
              >
                <span>{selectedGroupName}</span>
                <ChevronRightIcon className="size-4 text-[#929292]" />
              </button>
              <SelectionSidePanel
                open={groupPanelOpen}
                onOpenChange={setGroupPanelOpen}
                title="Выберите группу"
                mode="radio"
                options={groupSelectionOptions}
                selectedId={localGroupId != null ? String(localGroupId) : null}
                onConfirm={(id) => setLocalGroupId(id ? Number(id) : null)}
                searchPlaceholder="Поиск"
                disabled={isSubmitting}
              />
            </>
          ) : (
            <>
              <div className="rounded-lg border-2 border-[#5bc5d6] bg-[#e7f6f9] px-3 py-2 text-sm font-medium text-[#065d6b]">
                Группа
              </div>
              <div className="rounded-lg border border-[#cccccc] bg-[#f0f0f0] px-3 py-2 text-sm text-[#333333]">
                {selectedGroupName}
              </div>
            </>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#efefef] px-3 py-1.5 text-xs font-medium text-[#333333]">
              Пара: {lessonNumber}
            </span>
            <input
              type="number"
              min={1}
              max={6}
              value={lessonNumber}
              onChange={(e) => setLessonNumber(Number(e.target.value) || 1)}
              className="h-9 w-24 rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-sm outline-none focus:border-[#836be1] focus:ring-2 focus:ring-[#836be1]/30"
            />
          </div>
        </section>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

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
