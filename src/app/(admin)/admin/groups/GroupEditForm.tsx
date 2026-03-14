"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import {
  createGroup,
  updateGroup,
  fetchGroupById,
  assignGroupTeacher,
  unassignGroupTeacher,
  assignGroupStudents,
  unassignGroupStudents,
  type GroupListItem,
} from "@/app/(admin)/admin/groups/groups-api";
import { fetchTeachers } from "@/app/(admin)/admin/users/users-api";
import { fetchStudents } from "@/app/(admin)/admin/users/users-api";
import { DialogFooter } from "@/app/components/ui/dialog";
import {
  SelectionSidePanel,
  type SelectionOption,
} from "@/app/components/SelectionSidePanel";

const GROUPS_QUERY_KEY = "admin-groups" as const;
const TEACHERS_LIST_KEY = "groups-form-teachers" as const;
const STUDENTS_LIST_KEY = "groups-form-students" as const;

const NO_MENTOR_VALUE = "__none__";

function studentDisplayName(s: { surname?: string; name?: string; patronymic?: unknown }): string {
  const parts = [
    s.surname,
    s.name,
    typeof s.patronymic === "string" ? s.patronymic : null,
  ].filter(Boolean) as string[];
  return parts.join(" ") || "—";
}

type GroupEditFormProps = {
  /** Группа для редактирования; null — режим создания */
  group: GroupListItem | null;
  /** Вызывается после успешного сохранения (закрыть модалку) */
  onSuccess: () => void;
  /** Вызывается при отмене */
  onCancel: () => void;
};

/**
 * Форма создания/редактирования группы: название, куратор, студенты (при редактировании).
 * Используется внутри EntityEditSidepage.
 */
export function GroupEditForm({
  group,
  onSuccess,
  onCancel,
}: GroupEditFormProps) {
  const queryClient = useQueryClient();
  const isEdit = group != null;
  const groupId = group?.id != null ? Number(group.id) : 0;

  const [name, setName] = React.useState(group?.name ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [mentorUserId, setMentorUserId] = React.useState<string>(
    group?.mentor?.userId != null ? String(group.mentor.userId) : NO_MENTOR_VALUE
  );
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<number[]>([]);
  const [isSubmittingLocal, setIsSubmittingLocal] = React.useState(false);

  const { data: groupDetail, isPending: groupDetailLoading } = useQuery({
    queryKey: ["group-detail", groupId],
    queryFn: () => fetchGroupById(groupId, "members"),
    enabled: isEdit && groupId > 0,
  });

  const currentMentorUserId = groupDetail?.teacher?.userId ?? group?.mentor?.userId ?? null;
  const currentStudentIds = groupDetail?.students?.map((s) => s.userId) ?? [];

  React.useEffect(() => {
    setName(group?.name ?? "");
    setMentorUserId(
      group?.mentor?.userId != null ? String(group.mentor.userId) : NO_MENTOR_VALUE
    );
  }, [group?.id, group?.name, group?.mentor?.userId]);

  React.useEffect(() => {
    if (groupDetail?.students) {
      setSelectedStudentIds(groupDetail.students.map((s) => s.userId));
    }
  }, [groupDetail?.students]);

  // Бэкенд PaginationDto допускает limit не более 100
  const { data: teachersData, isPending: teachersLoading } = useQuery({
    queryKey: [TEACHERS_LIST_KEY, 1, 100],
    queryFn: () => fetchTeachers({ page: 1, limit: 100 }),
    enabled: isEdit,
  });
  const { data: studentsData, isPending: studentsLoading } = useQuery({
    queryKey: [STUDENTS_LIST_KEY, 1, 100],
    queryFn: () => fetchStudents({ page: 1, limit: 100 }),
    enabled: isEdit,
  });

  const teachersList = teachersData?.data ?? [];
  const studentsList = studentsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [GROUPS_QUERY_KEY] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name: n }: { id: number; name: string }) =>
      updateGroup(id, { name: n }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [GROUPS_QUERY_KEY] });
    },
  });

  const isSubmitting =
    isSubmittingLocal || createMutation.isPending || updateMutation.isPending;

  const mentorChanged =
    (mentorUserId === NO_MENTOR_VALUE ? null : Number(mentorUserId)) !==
    currentMentorUserId;
  const studentsChanged =
    selectedStudentIds.length !== currentStudentIds.length ||
    selectedStudentIds.some((id) => !currentStudentIds.includes(id)) ||
    currentStudentIds.some((id) => !selectedStudentIds.includes(id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Введите название группы");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 50) {
      setError("Название от 2 до 50 символов");
      return;
    }

    if (!isEdit) {
      createMutation.mutate({ name: trimmed });
      return;
    }

    if (groupId <= 0 || !Number.isFinite(groupId)) {
      setError("Неверный id группы");
      return;
    }

    setIsSubmittingLocal(true);
    try {
      if (trimmed !== (group.name ?? "")) {
        await updateGroup(groupId, { name: trimmed });
      }
      if (mentorChanged) {
        if (mentorUserId === NO_MENTOR_VALUE) {
          await unassignGroupTeacher(groupId);
        } else {
          await assignGroupTeacher(groupId, Number(mentorUserId));
        }
      }
      if (studentsChanged) {
        const toRemove = currentStudentIds.filter(
          (id) => !selectedStudentIds.includes(id)
        );
        const toAdd = selectedStudentIds.filter(
          (id) => !currentStudentIds.includes(id)
        );
        if (toRemove.length > 0) {
          await unassignGroupStudents(groupId, toRemove);
        }
        if (toAdd.length > 0) {
          await assignGroupStudents(groupId, toAdd);
        }
      }
      queryClient.invalidateQueries({ queryKey: [GROUPS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [GROUPS_QUERY_KEY] });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setIsSubmittingLocal(false);
    }
  };

  // Боковые панели: куратор (radio) и студенты (checkbox)
  const [mentorPanelOpen, setMentorPanelOpen] = React.useState(false);
  const [studentsPanelOpen, setStudentsPanelOpen] = React.useState(false);
  const mentorSelectionOptions: SelectionOption[] = teachersList.map((t) => ({
    id: String(t.userId),
    label: [t.user?.surname, t.user?.name, t.user?.patronymic].filter(Boolean).join(" ") || `#${t.userId}`,
  }));
  const studentSelectionOptions: SelectionOption[] = studentsList
    .map((s) => {
      const uid = Number((s as { id?: unknown }).id) ?? s.student?.userId;
      return Number.isFinite(uid) ? { id: String(uid), label: studentDisplayName(s) } : null;
    })
    .filter((o): o is SelectionOption => o != null);

  const submitError =
    createMutation.error ?? updateMutation.error;
  const displayError =
    error ??
    (submitError instanceof Error ? submitError.message : null);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="group-name" className="text-base text-[#333333]">
          Название
        </Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название группы"
          disabled={isSubmitting}
          autoFocus
          className="h-8 text-base text-[#333333] placeholder:text-[#929292] bg-[#f6f6f6] border-[#cccccc]"
        />
      </div>

      {isEdit && (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="group-mentor" className="text-base text-[#333333]">
              Куратор
            </Label>
            <button
              type="button"
              id="group-mentor"
              onClick={() =>
                !isSubmitting &&
                !groupDetailLoading &&
                !teachersLoading &&
                setMentorPanelOpen(true)
              }
              disabled={isSubmitting || groupDetailLoading || teachersLoading}
              className="flex h-8 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-base text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
            >
              <span>
                {teachersLoading
                  ? "Загрузка…"
                  : groupDetailLoading
                    ? "Загрузка группы…"
                    : mentorUserId === NO_MENTOR_VALUE
                      ? "Без куратора"
                      : mentorSelectionOptions.find((o) => o.id === mentorUserId)?.label ?? "Выберите куратора"}
              </span>
              <ChevronRightIcon className="size-4 text-[#929292]" />
            </button>
            <SelectionSidePanel
              open={mentorPanelOpen}
              onOpenChange={setMentorPanelOpen}
              title="Куратор"
              mode="radio"
              options={mentorSelectionOptions}
              selectedId={mentorUserId === NO_MENTOR_VALUE ? "__none__" : mentorUserId}
              onConfirm={(id) => setMentorUserId(id ?? NO_MENTOR_VALUE)}
              searchPlaceholder="Поиск"
              emptyOptionLabel="Без куратора"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-base text-[#333333]">Студенты в группе</Label>
            {groupDetailLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка состава…</p>
            ) : studentsLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка списка студентов…</p>
            ) : studentsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет студентов</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    !isSubmitting && setStudentsPanelOpen(true)
                  }
                  disabled={isSubmitting}
                  className="flex h-8 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-base text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
                >
                  <span>
                    {selectedStudentIds.length === 0
                      ? "Выберите студентов"
                      : `Выбрано: ${selectedStudentIds.length}`}
                  </span>
                  <ChevronRightIcon className="size-4 text-[#929292]" />
                </button>
                <SelectionSidePanel
                  open={studentsPanelOpen}
                  onOpenChange={setStudentsPanelOpen}
                  title="Студенты в группе"
                  mode="checkbox"
                  options={studentSelectionOptions}
                  selectedIds={selectedStudentIds.map(String)}
                  onConfirmMultiple={(ids) =>
                    setSelectedStudentIds(
                      ids.map((id) => Number(id)).filter(Number.isFinite)
                    )
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
