"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import { fetchGroups, type GroupListItem } from "@/app/(admin)/admin/groups/groups-api";
import {
  fetchSubjects,
  assignSubjectTeachers,
  unassignSubjectTeacher,
} from "@/app/(admin)/admin/items/subjects-api";
import {
  type TeacherListItem,
  assignTeacherMentoredGroup,
  removeTeacherMentoredGroup,
  TEACHERS_QUERY_KEY,
} from "@/app/(admin)/admin/users/users-api";
import { DialogFooter } from "@/app/components/ui/dialog";
import {
  SelectionSidePanel,
  type SelectionOption,
} from "@/app/components/SelectionSidePanel";

const GROUPS_QUERY_KEY = "groups-list-for-teacher" as const;
const SUBJECTS_LIST_QUERY_KEY = "subjects-list-for-teacher" as const;
/** Значение Select для «Без группы» */
const NO_GROUP_VALUE = "__none__";

type TeacherEditFormProps = {
  /** Преподаватель для редактирования */
  teacher: TeacherListItem;
  /** Вызывается после успешного сохранения (закрыть модалку) */
  onSuccess: () => void;
  /** Вызывается при отмене */
  onCancel: () => void;
};

/**
 * Форма редактирования преподавателя: курируемая группа и предметы.
 * Используется внутри EntityEditSidepage. Вызывает API teacher (mentored-group) и subject (teachers).
 */
export function TeacherEditForm({
  teacher,
  onSuccess,
  onCancel,
}: TeacherEditFormProps) {
  const queryClient = useQueryClient();
  const userId = teacher.userId;
  const currentGroupId =
    teacher.mentoredGroupId != null ? String(teacher.mentoredGroupId) : NO_GROUP_VALUE;
  const [groupId, setGroupId] = React.useState<string>(currentGroupId);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmittingLocal, setIsSubmittingLocal] = React.useState(false);
  const currentSubjectIds = teacher.subjects?.map((s) => s.id) ?? [];
  const [selectedSubjectIds, setSelectedSubjectIds] = React.useState<number[]>(currentSubjectIds);

  React.useEffect(() => {
    setGroupId(
      teacher.mentoredGroupId != null ? String(teacher.mentoredGroupId) : NO_GROUP_VALUE
    );
    setSelectedSubjectIds(teacher.subjects?.map((s) => s.id) ?? []);
  }, [teacher.userId, teacher.mentoredGroupId, teacher.subjects]);

  const { data: groupsData, isPending: groupsLoading } = useQuery({
    queryKey: [GROUPS_QUERY_KEY, 1, 100],
    queryFn: () => fetchGroups({ page: 1, limit: 100 }),
  });
  const groups: GroupListItem[] = groupsData?.data ?? [];
  const groupOptions = groups.filter((g) => {
    const id = (g as { id?: number | null }).id;
    return id != null && Number.isFinite(Number(id));
  });

  // Бэкенд пагинация допускает limit не более 100; для большего числа предметов нужна пагинация
  const { data: subjectsData, isPending: subjectsLoading } = useQuery({
    queryKey: [SUBJECTS_LIST_QUERY_KEY, 1, 100],
    queryFn: () => fetchSubjects({ page: 1, limit: 100 }),
  });
  const subjectsList = subjectsData?.data ?? [];

  const groupChanged = groupId !== currentGroupId;
  const isSubmitting = isSubmittingLocal;
  const subjectsChanged =
    selectedSubjectIds.length !== currentSubjectIds.length ||
    selectedSubjectIds.some((id) => !currentSubjectIds.includes(id)) ||
    currentSubjectIds.some((id) => !selectedSubjectIds.includes(id));

  // Боковые панели: курируемая группа (radio) и предметы (checkbox)
  const [groupPanelOpen, setGroupPanelOpen] = React.useState(false);
  const [subjectsPanelOpen, setSubjectsPanelOpen] = React.useState(false);
  const groupSelectionOptions: SelectionOption[] = groupOptions.map((g) => {
    const id = (g as { id?: number }).id;
    return { id: String(id), label: g.name };
  });
  const subjectSelectionOptions: SelectionOption[] = subjectsList.map((s) => {
    const id = s.id ?? 0;
    return { id: String(id), label: s.name };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!groupChanged && !subjectsChanged) {
      onCancel();
      return;
    }
    setIsSubmittingLocal(true);
    try {
      if (groupChanged) {
        if (groupId === NO_GROUP_VALUE) {
          await removeTeacherMentoredGroup(userId);
        } else {
          await assignTeacherMentoredGroup(userId, Number(groupId));
        }
      }
      if (subjectsChanged) {
        const toRemove = currentSubjectIds.filter((id) => !selectedSubjectIds.includes(id));
        const toAdd = selectedSubjectIds.filter((id) => !currentSubjectIds.includes(id));
        for (const subjectId of toRemove) {
          await unassignSubjectTeacher(subjectId, userId);
        }
        for (const subjectId of toAdd) {
          await assignSubjectTeachers(subjectId, [userId]);
        }
      }
      queryClient.invalidateQueries({ queryKey: [TEACHERS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [TEACHERS_QUERY_KEY] });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setIsSubmittingLocal(false);
    }
  };

  const displayError = error;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="teacher-mentored-group" className="text-base text-[#333333]">
          Курируемая группа
        </Label>
        <button
          type="button"
          id="teacher-mentored-group"
          onClick={() => !isSubmitting && !groupsLoading && setGroupPanelOpen(true)}
          disabled={isSubmitting || groupsLoading}
          className="flex h-8 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-base text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
        >
          <span>
            {groupsLoading ? "Загрузка групп…" : groupId === NO_GROUP_VALUE ? "Без группы" : groupOptions.find((g) => String((g as { id?: number }).id) === groupId)?.name ?? "Выберите группу"}
          </span>
          <ChevronRightIcon className="size-4 text-[#929292]" />
        </button>
        <SelectionSidePanel
          open={groupPanelOpen}
          onOpenChange={setGroupPanelOpen}
          title="Курируемая группа"
          mode="radio"
          options={groupSelectionOptions}
          selectedId={groupId === NO_GROUP_VALUE ? "__none__" : groupId}
          onConfirm={(id) => setGroupId(id ?? NO_GROUP_VALUE)}
          searchPlaceholder="Поиск"
          emptyOptionLabel="Без группы"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid gap-2">
        <Label className="text-base text-[#333333]">Предметы</Label>
        {subjectsLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка списка…</p>
        ) : subjectsList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет предметов</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => !isSubmitting && setSubjectsPanelOpen(true)}
              disabled={isSubmitting}
              className="flex h-8 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-base text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
            >
              <span>
                {selectedSubjectIds.length === 0
                  ? "Выберите предметы"
                  : `Выбрано: ${selectedSubjectIds.length}`}
              </span>
              <ChevronRightIcon className="size-4 text-[#929292]" />
            </button>
            <SelectionSidePanel
              open={subjectsPanelOpen}
              onOpenChange={setSubjectsPanelOpen}
              title="Предметы"
              mode="checkbox"
              options={subjectSelectionOptions}
              selectedIds={selectedSubjectIds.map(String)}
              onConfirmMultiple={(ids) =>
                setSelectedSubjectIds(ids.map((id) => Number(id)).filter(Number.isFinite))
              }
              searchPlaceholder="Поиск"
              disabled={isSubmitting}
            />
          </>
        )}
      </div>

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
        <Button
          type="submit"
          disabled={isSubmitting || (!groupChanged && !subjectsChanged)}
          className="h-8 text-base"
        >
          {isSubmitting ? "Сохранение…" : "Подтвердить"}
        </Button>
      </DialogFooter>
    </form>
  );
}
