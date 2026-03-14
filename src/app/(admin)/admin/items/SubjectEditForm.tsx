"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import {
  createSubject,
  updateSubject,
  fetchSubjectById,
  assignSubjectTeachers,
  unassignSubjectTeacher,
  assignSubjectGroups,
  unassignSubjectGroup,
  type SubjectWithTeachers,
  type SubjectWithTeachersAndGroups,
} from "@/app/(admin)/admin/items/subjects-api";
import { fetchTeachers } from "@/app/(admin)/admin/users/users-api";
import { fetchGroups } from "@/app/(admin)/admin/groups/groups-api";
import { DialogFooter } from "@/app/components/ui/dialog";
import {
  SelectionSidePanel,
  type SelectionOption,
} from "@/app/components/SelectionSidePanel";

const SUBJECTS_QUERY_KEY = "admin-subjects" as const;
const TEACHERS_LIST_QUERY_KEY = "teachers-list-for-subject" as const;
const GROUPS_LIST_QUERY_KEY = "groups-list-for-subject" as const;

function teacherDisplayName(t: { user?: { surname?: string; name?: string; patronymic?: unknown } }): string {
  const u = t.user;
  if (!u) return "—";
  const parts = [u.surname, u.name, typeof u.patronymic === "string" ? u.patronymic : null].filter(Boolean) as string[];
  return parts.join(" ") || "—";
}

type SubjectEditFormProps = {
  /** Предмет для редактирования; null — режим создания */
  subject: SubjectWithTeachers | null;
  /** Вызывается после успешного сохранения (закрыть модалку) */
  onSuccess: () => void;
  /** Вызывается при отмене */
  onCancel: () => void;
};

/**
 * Форма создания/редактирования предмета: название и привязка преподавателей (только при редактировании).
 * Используется внутри EntityEditSidepage. Вызывает createSubject, updateSubject, assignSubjectTeachers, unassignSubjectTeacher.
 */
export function SubjectEditForm({
  subject,
  onSuccess,
  onCancel,
}: SubjectEditFormProps) {
  const queryClient = useQueryClient();
  const isEdit = subject != null;
  const subjectId = subject?.id != null ? Number(subject.id) : 0;
  const [name, setName] = React.useState(subject?.name ?? "");
  const [error, setError] = React.useState<string | null>(null);
  /** Выбранные userId преподавателей (только в режиме редактирования) */
  const [selectedTeacherIds, setSelectedTeacherIds] = React.useState<number[]>(() =>
    subject?.teachers?.map((t) => t.userId) ?? []
  );
  /** Выбранные id групп, привязанных к предмету (только в режиме редактирования) */
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<number[]>(() =>
    (subject as SubjectWithTeachersAndGroups | null)?.groups?.map((g) => g.id) ?? []
  );

  // Загрузка предмета с группами и преподавателями для актуальных current* и инициализации выбора
  const { data: subjectDetail, isPending: subjectDetailLoading } = useQuery({
    queryKey: ["subject-detail", subjectId],
    queryFn: () => fetchSubjectById(subjectId, "teachers,groups"),
    enabled: isEdit && subjectId > 0,
  });

  React.useEffect(() => {
    setName(subject?.name ?? "");
    setSelectedTeacherIds(subject?.teachers?.map((t) => t.userId) ?? []);
    setSelectedGroupIds((subject as SubjectWithTeachersAndGroups | null)?.groups?.map((g) => g.id) ?? []);
  }, [subject?.id, subject?.name, subject?.teachers, (subject as SubjectWithTeachersAndGroups | null)?.groups]);

  // Синхронизация выбора с загруженным предметом (teachers, groups)
  React.useEffect(() => {
    if (subjectDetail) {
      setSelectedTeacherIds(subjectDetail.teachers?.map((t) => t.userId) ?? []);
      setSelectedGroupIds(subjectDetail.groups?.map((g) => g.id) ?? []);
    }
  }, [subjectDetail]);

  // Бэкенд PaginationDto допускает limit не более 100
  const { data: teachersData, isPending: teachersLoading } = useQuery({
    queryKey: [TEACHERS_LIST_QUERY_KEY, 1, 100],
    queryFn: () => fetchTeachers({ page: 1, limit: 100 }),
    enabled: isEdit,
  });
  const { data: groupsData, isPending: groupsLoading } = useQuery({
    queryKey: [GROUPS_LIST_QUERY_KEY, 1, 100],
    queryFn: () => fetchGroups({ page: 1, limit: 100 }),
    enabled: isEdit,
  });
  const teachersList = teachersData?.data ?? [];
  const groupsList = groupsData?.data ?? [];
  const currentTeacherIds = subjectDetail?.teachers?.map((t) => t.userId) ?? subject?.teachers?.map((t) => t.userId) ?? [];
  const currentGroupIds = subjectDetail?.groups?.map((g) => g.id) ?? [];

  const createMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name: n }: { id: number; name: string }) =>
      updateSubject(id, { name: n }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Введите название предмета");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 50) {
      setError("Название от 2 до 50 символов");
      return;
    }
    if (isEdit) {
      const id = subject.id;
      if (id == null) {
        setError("Неверный id предмета");
        return;
      }
      const subjectId = Number(id);
      if (Number.isNaN(subjectId)) {
        setError("Неверный id предмета");
        return;
      }
      try {
        if (name.trim() !== (subject.name ?? "")) {
          await updateSubject(subjectId, { name: trimmed });
        }
        const teacherToAdd = selectedTeacherIds.filter((uid) => !currentTeacherIds.includes(uid));
        const teacherToRemove = currentTeacherIds.filter((uid) => !selectedTeacherIds.includes(uid));
        for (const teacherId of teacherToRemove) {
          await unassignSubjectTeacher(subjectId, teacherId);
        }
        if (teacherToAdd.length > 0) {
          await assignSubjectTeachers(subjectId, teacherToAdd);
        }
        // Привязка/отвязка групп к предмету
        const groupToAdd = selectedGroupIds.filter((id) => !currentGroupIds.includes(id));
        const groupToRemove = currentGroupIds.filter((id) => !selectedGroupIds.includes(id));
        for (const groupId of groupToRemove) {
          await unassignSubjectGroup(subjectId, groupId);
        }
        if (groupToAdd.length > 0) {
          await assignSubjectGroups(subjectId, groupToAdd);
        }
        queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
        await queryClient.refetchQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить");
      }
      return;
    }
    createMutation.mutate({ name: trimmed });
  };

  const submitError = createMutation.error ?? updateMutation.error;
  const displayError =
    error ?? (submitError instanceof Error ? submitError.message : null);

  // Боковые панели выбора: преподаватели и группы (checkbox)
  const [teachersPanelOpen, setTeachersPanelOpen] = React.useState(false);
  const [groupsPanelOpen, setGroupsPanelOpen] = React.useState(false);
  const teacherSelectionOptions: SelectionOption[] = teachersList.map((t) => ({
    id: String(t.userId),
    label: teacherDisplayName(t),
  }));
  const groupSelectionOptions: SelectionOption[] = groupsList
    .filter((g) => g.id != null)
    .map((g) => ({
      id: String(g.id),
      label: g.name ?? "",
    }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="subject-name" className="text-base text-[#333333]">
          Название
        </Label>
        <Input
          id="subject-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название предмета"
          disabled={isSubmitting}
          autoFocus
          className="h-8 text-base text-[#333333] placeholder:text-[#929292] bg-[#f6f6f6] border-[#cccccc]"
        />
      </div>

      {isEdit && (
        <>
        <div className="grid gap-2">
          <Label className="text-base text-[#333333]">Преподаватели</Label>
          {teachersLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка списка…</p>
          ) : teachersList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет преподавателей</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => !isSubmitting && setTeachersPanelOpen(true)}
                disabled={isSubmitting}
                className="flex h-8 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-base text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
              >
                <span>
                  {selectedTeacherIds.length === 0
                    ? "Выберите преподавателей"
                    : `Выбрано: ${selectedTeacherIds.length}`}
                </span>
                <ChevronRightIcon className="size-4 text-[#929292]" />
              </button>
              <SelectionSidePanel
                open={teachersPanelOpen}
                onOpenChange={setTeachersPanelOpen}
                title="Преподаватели"
                mode="checkbox"
                options={teacherSelectionOptions}
                selectedIds={selectedTeacherIds.map(String)}
                onConfirmMultiple={(ids) =>
                  setSelectedTeacherIds(ids.map((id) => Number(id)).filter(Number.isFinite))
                }
                searchPlaceholder="Поиск"
                disabled={isSubmitting}
              />
            </>
          )}
        </div>

        <div className="grid gap-2">
          <Label className="text-base text-[#333333]">Группы</Label>
          {subjectDetailLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка привязок…</p>
          ) : groupsLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка списка групп…</p>
          ) : groupsList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет групп</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => !isSubmitting && setGroupsPanelOpen(true)}
                disabled={isSubmitting}
                className="flex h-8 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-base text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
              >
                <span>
                  {selectedGroupIds.length === 0
                    ? "Выберите группы"
                    : `Выбрано: ${selectedGroupIds.length}`}
                </span>
                <ChevronRightIcon className="size-4 text-[#929292]" />
              </button>
              <SelectionSidePanel
                open={groupsPanelOpen}
                onOpenChange={setGroupsPanelOpen}
                title="Группы"
                mode="checkbox"
                options={groupSelectionOptions}
                selectedIds={selectedGroupIds.map(String)}
                onConfirmMultiple={(ids) =>
                  setSelectedGroupIds(ids.map((id) => Number(id)).filter(Number.isFinite))
                }
                searchPlaceholder="Поиск"
                disabled={isSubmitting}
              />
            </>
          )}
        </div>
        </>
      )}

      {displayError && (
        <p className="text-sm text-destructive" role="alert">
          {displayError}
        </p>
      )}

      <DialogFooter className="flex-row gap-2 pt-0 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-8 text-base border-[#cccccc] text-[#333333]"
        >
          Отменить
        </Button>
        <Button type="submit" disabled={isSubmitting} className="h-8 text-base">
          {isSubmitting ? "Сохранение…" : "Подтвердить"}
        </Button>
      </DialogFooter>
    </form>
  );
}
