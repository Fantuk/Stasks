"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import {
  createBuilding,
  updateBuilding,
  type BuildingListItem,
} from "@/app/(admin)/admin/buildings/buildings-api";
import { DialogFooter } from "@/app/components/ui/dialog";

const BUILDINGS_QUERY_KEY = "admin-buildings" as const;
const BUILDING_DETAIL_QUERY_KEY = "admin-building-detail" as const;

type BuildingEditFormProps = {
  /** Здание для редактирования; null — режим создания */
  building: BuildingListItem | null;
  /** Вызывается после успешного сохранения (закрыть модалку) */
  onSuccess: () => void;
  /** Вызывается при отмене */
  onCancel: () => void;
};

/**
 * Форма создания/редактирования здания: одно поле «Название».
 * Используется внутри EntityEditSidepage. Вызывает createBuilding или updateBuilding.
 */
export function BuildingEditForm({
  building,
  onSuccess,
  onCancel,
}: BuildingEditFormProps) {
  const queryClient = useQueryClient();
  const isEdit = building != null;
  const [name, setName] = React.useState(building?.name ?? "");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setName(building?.name ?? "");
  }, [building?.id, building?.name]);

  const createMutation = useMutation({
    mutationFn: createBuilding,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [BUILDINGS_QUERY_KEY] });
      // Явный refetch, чтобы список в UI обновился сразу после закрытия модалки
      await queryClient.refetchQueries({ queryKey: [BUILDINGS_QUERY_KEY] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name: n }: { id: number; name: string }) =>
      updateBuilding(id, { name: n }),
    onSuccess: async (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [BUILDINGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, id] });
      await queryClient.refetchQueries({ queryKey: [BUILDINGS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, id] });
      onSuccess();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Введите название здания");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 100) {
      setError("Название от 2 до 100 символов");
      return;
    }
    if (isEdit) {
      const rawId = building.id;
      if (rawId == null) {
        setError("Неверный id здания");
        return;
      }
      const id = Number(rawId);
      if (!Number.isFinite(id)) {
        setError("Неверный id здания");
        return;
      }
      updateMutation.mutate({ id, name: trimmed });
    } else {
      createMutation.mutate({ name: trimmed });
    }
  };

  const submitError = createMutation.error ?? updateMutation.error;
  const displayError =
    error ?? (submitError instanceof Error ? submitError.message : null);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="building-name" className="text-base text-[#333333]">
          Название
        </Label>
        <Input
          id="building-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название здания"
          disabled={isSubmitting}
          autoFocus
          className="h-8 text-base text-[#333333] placeholder:text-[#929292] bg-[#f6f6f6] border-[#cccccc]"
        />
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
        <Button type="submit" disabled={isSubmitting} className="h-8 text-base">
          {isSubmitting ? "Сохранение…" : "Подтвердить"}
        </Button>
      </DialogFooter>
    </form>
  );
}
