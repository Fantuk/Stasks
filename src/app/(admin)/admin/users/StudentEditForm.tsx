"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import {
  fetchGroups,
  type GroupListItem,
} from "@/app/(admin)/admin/groups/groups-api";
import {
  type UserSearchStudentItem,
  updateUser,
  assignStudentToGroup,
  removeStudentFromGroup,
  STUDENTS_QUERY_KEY,
} from "@/app/(admin)/admin/users/users-api";
import { DialogFooter } from "@/app/components/ui/dialog";
import {
  SelectionSidePanel,
  type SelectionOption,
} from "@/app/components/SelectionSidePanel";

const GROUPS_QUERY_KEY = "groups-list-for-select" as const;
/** Значение Select для «Без группы» (Radix Select не допускает value="") */
const NO_GROUP_VALUE = "__none__";

type StudentEditFormProps = {
  /** Студент для редактирования */
  student: UserSearchStudentItem;
  /** Вызывается после успешного сохранения (закрыть модалку) */
  onSuccess: () => void;
  /** Вызывается при отмене */
  onCancel: () => void;
};

/**
 * Форма редактирования студента: ФИО и выбор группы.
 * При сохранении вызывает PATCH /api/users/:id и PATCH/DELETE /api/student/:userId/group.
 */
export function StudentEditForm({
  student,
  onSuccess,
  onCancel,
}: StudentEditFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState(
    typeof student.name === "string" ? student.name : ""
  );
  const [surname, setSurname] = React.useState(
    typeof student.surname === "string" ? student.surname : ""
  );
  const [patronymic, setPatronymic] = React.useState(
    typeof student.patronymic === "string" ? student.patronymic : ""
  );
  const [groupId, setGroupId] = React.useState<string>(
    student.student?.groupId != null ? String(student.student.groupId) : NO_GROUP_VALUE
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Загружаем список групп для Select (запрос при монтировании формы в модалке)
  const {
    data: groupsData,
    isPending: groupsLoading,
    isError: groupsError,
    error: groupsErrorDetail,
  } = useQuery({
    queryKey: [GROUPS_QUERY_KEY, 1, 100],
    queryFn: () => fetchGroups({ page: 1, limit: 100 }),
  });
  const groups: GroupListItem[] = groupsData?.data ?? [];
  // Элементы с валидным id (бэкенд возвращает id; тип из OpenAPI может быть неточным)
  const groupOptions = groups.filter((g) => {
    const id = (g as { id?: number | null }).id;
    return id != null && Number.isFinite(Number(id));
  });

  // Боковая панель выбора группы (по макету Figma: клик по полю → sidepage с radio)
  const [groupPanelOpen, setGroupPanelOpen] = React.useState(false);
  const groupSelectionOptions: SelectionOption[] = groupOptions.map((g) => {
    const id = (g as { id?: number }).id;
    return { id: String(id), label: g.name };
  });

  const initialGroupId =
    student.student?.groupId != null ? String(student.student.groupId) : NO_GROUP_VALUE;
  const initialName = typeof student.name === "string" ? student.name : "";
  const initialSurname = typeof student.surname === "string" ? student.surname : "";
  const initialPatronymic =
    typeof student.patronymic === "string" ? student.patronymic : "";
  const nameChanged =
    name !== initialName || surname !== initialSurname || patronymic !== initialPatronymic;
  const groupChanged = groupId !== initialGroupId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !surname.trim()) {
      setError("Имя и фамилия обязательны");
      return;
    }
    if (name.length < 2 || name.length > 30) {
      setError("Имя должно быть от 2 до 30 символов");
      return;
    }
    if (surname.length < 2 || surname.length > 30) {
      setError("Фамилия должна быть от 2 до 30 символов");
      return;
    }
    if (patronymic && (patronymic.length < 2 || patronymic.length > 30)) {
      setError("Отчество должно быть от 2 до 30 символов или пустым");
      return;
    }

    setIsSubmitting(true);
    try {
      // id пользователя приходит в student.id (список users/search) или student.student.userId; нормализуем до number
      const userId =
        Number((student as { id?: unknown }).id) || Number(student.student?.userId);
      if (!Number.isFinite(userId)) {
        throw new Error("Неверный id пользователя");
      }

      if (nameChanged) {
        await updateUser(userId, {
          name: name.trim(),
          surname: surname.trim(),
          patronymic: patronymic.trim() || undefined,
        });
      }

      if (groupChanged) {
        if (groupId === NO_GROUP_VALUE) {
          await removeStudentFromGroup(userId);
        } else {
          await assignStudentToGroup(userId, Number(groupId));
        }
      }

      await queryClient.invalidateQueries({ queryKey: [STUDENTS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [STUDENTS_QUERY_KEY] });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить изменения"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // По макету Figma: контент 368px при панели 400px (padding 16px), поля 32px высотой, текст 16px, кнопки «Отменить» / «Подтвердить»
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="student-surname" className="text-base text-[#333333]">
            Фамилия
          </Label>
          <Input
            id="student-surname"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="Фамилия"
            disabled={isSubmitting}
            autoFocus
            className="h-8 text-base text-[#333333] placeholder:text-[#929292] bg-[#f6f6f6] border-[#cccccc]"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="student-name" className="text-base text-[#333333]">
            Имя
          </Label>
          <Input
            id="student-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
            disabled={isSubmitting}
            className="h-8 text-base text-[#333333] placeholder:text-[#929292] bg-[#f6f6f6] border-[#cccccc]"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="student-patronymic" className="text-base text-[#333333]">
            Отчество
          </Label>
          <Input
            id="student-patronymic"
            value={patronymic}
            onChange={(e) => setPatronymic(e.target.value)}
            placeholder="Отчество (необязательно)"
            disabled={isSubmitting}
            className="h-8 text-base text-[#333333] placeholder:text-[#929292] bg-[#f6f6f6] border-[#cccccc]"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="student-group" className="text-base text-[#333333]">
            Группа
          </Label>
          <button
            type="button"
            id="student-group"
            onClick={() => !isSubmitting && !groupsLoading && setGroupPanelOpen(true)}
            disabled={isSubmitting || groupsLoading}
            className="flex h-8 w-full items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f6f6] px-3 text-left text-base text-[#333333] hover:bg-[#efefef] disabled:opacity-60"
          >
            <span>
              {groupsLoading
                ? "Загрузка групп…"
                : groupsError
                  ? "Не удалось загрузить группы"
                  : groupId === NO_GROUP_VALUE
                    ? "Без группы"
                    : groupOptions.find((g) => String((g as { id?: number }).id) === groupId)?.name ?? "Выберите группу"}
            </span>
            <ChevronRightIcon className="size-4 text-[#929292]" />
          </button>
          <SelectionSidePanel
            open={groupPanelOpen}
            onOpenChange={setGroupPanelOpen}
            title="Группа"
            mode="radio"
            options={groupSelectionOptions}
            selectedId={groupId === NO_GROUP_VALUE ? "__none__" : groupId}
            onConfirm={(id) => setGroupId(id ?? NO_GROUP_VALUE)}
            searchPlaceholder="Поиск"
            emptyOptionLabel="Без группы"
            disabled={isSubmitting}
          />
          {groupsError && (
            <p className="text-xs text-destructive">
              {groupsErrorDetail instanceof Error
                ? groupsErrorDetail.message
                : "Не удалось загрузить список групп"}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
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
          disabled={isSubmitting}
          className="h-8 text-base"
        >
          {isSubmitting ? "Сохранение…" : "Подтвердить"}
        </Button>
      </DialogFooter>
    </form>
  );
}
