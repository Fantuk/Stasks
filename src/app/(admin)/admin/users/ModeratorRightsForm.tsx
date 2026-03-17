"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type ModeratorListItem,
  updateModeratorAccessRights,
  MODERATORS_QUERY_KEY,
} from "@/app/(admin)/admin/users/users-api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { invalidateAndRefetch } from "@/lib/queryClient";
import { DialogFooter } from "@/app/components/ui/dialog";

/** Права из ответа API (в схеме OpenAPI могут быть типизированы иначе) */
type AccessRights = {
  canDeleteUsers?: boolean;
  canRegisterUsers?: boolean;
};

type ModeratorRightsFormProps = {
  /** Модератор для редактирования прав */
  moderator: ModeratorListItem;
  /** Вызывается после успешного сохранения (закрыть модалку) */
  onSuccess: () => void;
  /** Вызывается при отмене */
  onCancel: () => void;
};

/**
 * Форма редактирования прав модератора: чекбоксы canDeleteUsers, canRegisterUsers.
 * Используется внутри EntityEditSidepage. Вызывает PATCH /api/moderator/:userId.
 */
export function ModeratorRightsForm({
  moderator,
  onSuccess,
  onCancel,
}: ModeratorRightsFormProps) {
  const queryClient = useQueryClient();
  const userId = moderator.userId;
  const initialRights = (moderator.accessRights ?? {}) as AccessRights;
  const [canDeleteUsers, setCanDeleteUsers] = React.useState(
    initialRights.canDeleteUsers ?? false
  );
  const [canRegisterUsers, setCanRegisterUsers] = React.useState(
    initialRights.canRegisterUsers ?? false
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const r = (moderator.accessRights ?? {}) as AccessRights;
    setCanDeleteUsers(r.canDeleteUsers ?? false);
    setCanRegisterUsers(r.canRegisterUsers ?? false);
  }, [moderator.userId, moderator.accessRights]);

  const updateMutation = useMutation({
    mutationFn: (body: { canDeleteUsers: boolean; canRegisterUsers: boolean }) =>
      updateModeratorAccessRights(userId, body),
    onSuccess: async () => {
      await invalidateAndRefetch(queryClient, [MODERATORS_QUERY_KEY]);
      onSuccess();
    },
  });

  const isSubmitting = updateMutation.isPending;
  const changed =
    canDeleteUsers !== (initialRights.canDeleteUsers ?? false) ||
    canRegisterUsers !== (initialRights.canRegisterUsers ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updateMutation.mutate({ canDeleteUsers, canRegisterUsers });
  };

  const displayError =
    error ?? (updateMutation.error != null ? getApiErrorMessage(updateMutation.error) : null);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="mod-can-delete"
            checked={canDeleteUsers}
            onChange={(e) => setCanDeleteUsers(e.target.checked)}
            disabled={isSubmitting}
            className={cn(
              "h-4 w-4 rounded border-[#cccccc] bg-[#f6f6f6] text-[#836be1]",
              "focus:ring-2 focus:ring-[#836be1]/30"
            )}
          />
          <Label
            htmlFor="mod-can-delete"
            className="text-base text-[#333333] font-normal cursor-pointer"
          >
            Удаление пользователей
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="mod-can-register"
            checked={canRegisterUsers}
            onChange={(e) => setCanRegisterUsers(e.target.checked)}
            disabled={isSubmitting}
            className={cn(
              "h-4 w-4 rounded border-[#cccccc] bg-[#f6f6f6] text-[#836be1]",
              "focus:ring-2 focus:ring-[#836be1]/30"
            )}
          />
          <Label
            htmlFor="mod-can-register"
            className="text-base text-[#333333] font-normal cursor-pointer"
          >
            Регистрация пользователей
          </Label>
        </div>
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
          disabled={isSubmitting || !changed}
          className="h-8 text-base"
        >
          {isSubmitting ? "Сохранение…" : "Подтвердить"}
        </Button>
      </DialogFooter>
    </form>
  );
}
