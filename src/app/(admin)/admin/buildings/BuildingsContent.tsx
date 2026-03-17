"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { cn } from "@/lib/utils";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import { BuildingEditForm } from "@/app/(admin)/admin/buildings/BuildingEditForm";
import {
  fetchBuildings,
  fetchBuildingsSearch,
  fetchBuildingWithFloorsAndClassrooms,
  deleteBuilding,
  createFloor,
  updateFloor,
  deleteFloor,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  BUILDINGS_QUERY_KEY,
  BUILDING_DETAIL_QUERY_KEY,
  type BuildingListItem,
  type BuildingWithFloors,
  type FloorWithClassrooms,
  type ClassroomListItem,
  type PaginationMeta,
} from "@/app/(admin)/admin/buildings/buildings-api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { invalidateAndRefetch } from "@/lib/queryClient";
import { BuildingTreeModal } from "@/app/(admin)/admin/buildings/BuildingTreeModal";

const LIMIT = 10;

/** Стили по макету Figma: тег (здание/аудитория) */
const tagClasses =
  "inline-flex items-center rounded-lg bg-[#efefef] px-3 py-1.5 text-base font-medium text-[#333333]";

/** Кнопка «+» по макету */
const plusButtonClasses =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[#b5a3fa] bg-[#f4f1fe] text-[#836be1] hover:bg-[#ede9fe]";

/**
 * Карточка одного здания: тег названия, настройки (открывают модалку дерева), табы этажей, теги аудиторий.
 */
function BuildingCardWithFloorState({ building }: { building: BuildingListItem }) {
  const queryClient = useQueryClient();
  const buildingId = building.id != null ? Number(building.id) : 0;
  const [selectedFloorId, setSelectedFloorId] = React.useState<number | null>(null);
  const [newClassroomName, setNewClassroomName] = React.useState("");
  const [isAddingClassroom, setIsAddingClassroom] = React.useState(false);
  // Режим добавления этажа: показываем счётчик выбора номера этажа
  const [isAddingFloor, setIsAddingFloor] = React.useState(false);
  const [floorNumberToCreate, setFloorNumberToCreate] = React.useState(0);
  const [treeModalOpen, setTreeModalOpen] = React.useState(false);

  const { data: buildingDetail, isPending } = useQuery({
    queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId],
    queryFn: () => fetchBuildingWithFloorsAndClassrooms(buildingId),
    enabled: buildingId > 0,
  });

  const floors = React.useMemo(() => {
    const list = buildingDetail?.floors ?? [];
    return [...list].sort((a, b) => a.number - b.number);
  }, [buildingDetail?.floors]);

  // После загрузки выбрать первый этаж, если ещё не выбран
  React.useEffect(() => {
    if (floors.length > 0 && selectedFloorId === null) {
      const firstId = floors[0].id;
      if (firstId != null) setSelectedFloorId(firstId);
    }
  }, [floors, selectedFloorId]);

  const selectedFloor = floors.find((f) => f.id === selectedFloorId) ?? floors[0];
  const classrooms = selectedFloor?.classrooms ?? [];

  const createFloorMutation = useMutation({
    mutationFn: createFloor,
    onSuccess: async (createdFloor: FloorWithClassrooms) => {
      // id с сервера может прийти как number или string — нормализуем
      const floorId = createdFloor?.id != null ? Number(createdFloor.id) : null;
      const newFloor: FloorWithClassrooms = {
        id: floorId ?? undefined,
        buildingId: createdFloor.buildingId,
        number: createdFloor.number,
        classrooms: createdFloor.classrooms ?? [],
      };
      queryClient.setQueryData(
        [BUILDING_DETAIL_QUERY_KEY, buildingId],
        (old: BuildingWithFloors | undefined) => {
          if (!old) return old;
          const floors = [...(old.floors ?? []), newFloor].sort((a, b) => a.number - b.number);
          return { ...old, floors };
        }
      );
      setIsAddingFloor(false);
      if (floorId != null) setSelectedFloorId(floorId);
      // Ждём refetch, чтобы UI гарантированно показывал актуальные данные с сервера
      await invalidateAndRefetch(queryClient, [BUILDING_DETAIL_QUERY_KEY, buildingId]);
      await invalidateAndRefetch(queryClient, [BUILDINGS_QUERY_KEY]);
    },
  });

  const updateFloorMutation = useMutation({
    mutationFn: ({ id, number: num }: { id: number; number: number }) => updateFloor(id, { number: num }),
    onSuccess: async () => {
      await invalidateAndRefetch(queryClient, [BUILDING_DETAIL_QUERY_KEY, buildingId]);
    },
  });

  const deleteFloorMutation = useMutation({
    mutationFn: deleteFloor,
    onSuccess: async () => {
      await invalidateAndRefetch(queryClient, [BUILDING_DETAIL_QUERY_KEY, buildingId]);
      await invalidateAndRefetch(queryClient, [BUILDINGS_QUERY_KEY]);
      setSelectedFloorId(null);
    },
  });

  const createClassroomMutation = useMutation({
    mutationFn: createClassroom,
    onSuccess: async (createdClassroom: ClassroomListItem) => {
      const classroomId = createdClassroom?.id != null ? Number(createdClassroom.id) : null;
      const newClassroom: ClassroomListItem = {
        id: classroomId ?? undefined,
        floorId: createdClassroom.floorId,
        name: createdClassroom.name,
      };
      queryClient.setQueryData(
        [BUILDING_DETAIL_QUERY_KEY, buildingId],
        (old: BuildingWithFloors | undefined) => {
          if (!old?.floors) return old;
          const floors = old.floors.map((f) => {
            if (f.id === newClassroom.floorId) {
              const classrooms = [...(f.classrooms ?? []), newClassroom];
              return { ...f, classrooms };
            }
            return f;
          });
          return { ...old, floors };
        }
      );
      setNewClassroomName("");
      setIsAddingClassroom(false);
      await invalidateAndRefetch(queryClient, [BUILDING_DETAIL_QUERY_KEY, buildingId]);
    },
  });

  const updateClassroomMutation = useMutation({
    mutationFn: ({ id, name: n }: { id: number; name: string }) => updateClassroom(id, { name: n }),
    onSuccess: async () => {
      await invalidateAndRefetch(queryClient, [BUILDING_DETAIL_QUERY_KEY, buildingId]);
    },
  });

  const deleteClassroomMutation = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: async () => {
      await invalidateAndRefetch(queryClient, [BUILDING_DETAIL_QUERY_KEY, buildingId]);
    },
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: deleteBuilding,
    onSuccess: async () => {
      // Инвалидируем и принудительно перезапрашиваем список, чтобы удалённое здание исчезло из UI
      await invalidateAndRefetch(queryClient, [BUILDINGS_QUERY_KEY]);
    },
  });

  // Открыть форму добавления этажа: предлагаем следующий номер (поддержка отрицательных: подземные этажи)
  const handleOpenAddFloor = () => {
    const nextNumber =
      floors.length === 0 ? 0 : Math.max(...floors.map((f) => f.number)) + 1;
    setFloorNumberToCreate(nextNumber);
    setIsAddingFloor(true);
  };

  // Создать этаж с выбранным номером
  const handleConfirmAddFloor = () => {
    const id = Number(buildingId);
    if (!Number.isInteger(id) || id <= 0) return;
    createFloorMutation.mutate({ buildingId: id, number: floorNumberToCreate });
  };

  const handleDeleteFloor = (floor: FloorWithClassrooms) => {
    const id = floor.id;
    if (id == null) return;
    if (!window.confirm(`Удалить этаж ${floor.number}?`)) return;
    deleteFloorMutation.mutate(id);
  };

  // Открыть общую модалку дерева (с карточки — по кнопке «Настройки» или карандашу этажа/аудитории)
  const openTreeModal = () => setTreeModalOpen(true);

  const handleAddClassroom = () => {
    const name = newClassroomName.trim();
    if (!name || selectedFloorId == null) return;
    createClassroomMutation.mutate({ floorId: selectedFloorId, name });
  };

  const handleDeleteClassroom = (c: ClassroomListItem) => {
    const id = c.id;
    if (id == null) return;
    if (!window.confirm(`Удалить аудиторию «${c.name}»?`)) return;
    deleteClassroomMutation.mutate(id);
  };

  const handleDeleteBuilding = () => {
    if (!window.confirm(`Удалить здание «${building.name}»?`)) return;
    deleteBuildingMutation.mutate(buildingId);
  };

  if (buildingId <= 0) return null;

  return (
    <Card className="overflow-hidden rounded-lg border-0 bg-[#f6f6f6] shadow-none">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={tagClasses}>{building.name}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded bg-[#f6f6f6] text-muted-foreground hover:bg-muted"
              title="Редактировать дерево здания"
              onClick={openTreeModal}
              aria-label="Редактировать дерево здания"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Удалить здание"
              onClick={handleDeleteBuilding}
              disabled={deleteBuildingMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Загрузка этажей…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {floors.map((floor) => {
                const fid = floor.id ?? 0;
                const isActive = fid === selectedFloorId;
                return (
                  <button
                    key={fid}
                    type="button"
                    onClick={() => setSelectedFloorId(fid)}
                    className="h-8 rounded-lg border-2 px-3 text-base font-medium transition-colors"
                    style={{
                      borderColor: isActive ? "#b5a3fa" : "#cccccc",
                      color: isActive ? "#836be1" : "#7d7d7d",
                      backgroundColor: "#f6f6f6",
                    }}
                  >
                    Этаж {floor.number}
                  </button>
                );
              })}
              {isAddingFloor ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-[#b5a3fa] bg-[#f4f1fe] px-2 py-1">
                  <span className="text-sm font-medium text-[#836be1]">Номер этажа:</span>
                  <div className="flex items-center gap-0 rounded bg-white border border-[#b5a3fa]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-r-none text-[#836be1] hover:bg-[#ede9fe]"
                      onClick={() => setFloorNumberToCreate((n) => n - 1)}
                      disabled={createFloorMutation.isPending}
                    >
                      −
                    </Button>
                    <span className="min-w-8 text-center text-sm font-medium tabular-nums">
                      {floorNumberToCreate}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-l-none text-[#836be1] hover:bg-[#ede9fe]"
                      onClick={() => setFloorNumberToCreate((n) => n + 1)}
                      disabled={createFloorMutation.isPending}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#836be1] hover:bg-[#7358d4]"
                    onClick={handleConfirmAddFloor}
                    disabled={createFloorMutation.isPending}
                  >
                    {createFloorMutation.isPending ? "Создание…" : "Создать"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingFloor(false)}
                    disabled={createFloorMutation.isPending}
                  >
                    Отмена
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className={plusButtonClasses}
                  onClick={handleOpenAddFloor}
                  title="Добавить этаж"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {(createFloorMutation.isError || updateFloorMutation.isError) && (
              <p className="text-sm text-destructive" role="alert">
                {getApiErrorMessage(
                  createFloorMutation.error ?? updateFloorMutation.error,
                  "Не удалось выполнить действие с этажом",
                )}
              </p>
            )}
            {floors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет этажей. Добавьте этаж.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {classrooms.map((c) => (
                  <span key={c.id ?? c.name} className={tagClasses}>
                    {c.name}
                  </span>
                ))}
                {isAddingClassroom ? (
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="Название"
                      value={newClassroomName}
                      onChange={(e) => setNewClassroomName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddClassroom();
                        if (e.key === "Escape") setIsAddingClassroom(false);
                      }}
                      className="h-8 w-24 rounded-lg border-[#b5a3fa] bg-[#f4f1fe]"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddClassroom}
                      disabled={!newClassroomName.trim() || createClassroomMutation.isPending}
                    >
                      OK
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingClassroom(false);
                        setNewClassroomName("");
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={plusButtonClasses}
                    onClick={() => setIsAddingClassroom(true)}
                    disabled={selectedFloorId == null || createClassroomMutation.isPending}
                    title="Добавить аудиторию"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <BuildingTreeModal
              open={treeModalOpen}
              onOpenChange={setTreeModalOpen}
              buildingId={buildingId}
              buildingName={building.name ?? ""}
              buildingDetail={buildingDetail}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Контент страницы «Здания»: карточки по макету Figma (тег здания, табы этажей, теги аудиторий).
 */
export function BuildingsContent() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  const { data, isPending, isError, error } = useQuery({
    queryKey: [BUILDINGS_QUERY_KEY, page, query],
    queryFn: () =>
      query.trim()
        ? fetchBuildingsSearch({ page, limit: LIMIT, query: query.trim() })
        : fetchBuildings({ page, limit: LIMIT }),
  });

  const openCreateModal = React.useCallback(() => setCreateModalOpen(true), []);
  const closeCreateModal = React.useCallback(() => setCreateModalOpen(false), []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const rows = data?.data ?? [];
  const meta: PaginationMeta | undefined = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Поиск по названию..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary" size="sm">
          Найти
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openCreateModal}
          aria-label="Добавить здание"
        >
          <Plus className="h-4 w-4 mr-1" />
          Добавить здание
        </Button>
      </form>

      <EntityEditSidepage open={createModalOpen} onOpenChange={(open) => !open && setCreateModalOpen(false)} title="Добавить здание">
        <BuildingEditForm building={null} onSuccess={closeCreateModal} onCancel={closeCreateModal} />
      </EntityEditSidepage>

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          {getApiErrorMessage(error, "Не удалось загрузить список зданий")}
        </p>
      )}

      {isPending ? (
        <p className="text-muted-foreground text-sm">Загрузка...</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Нет зданий.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {rows.map((b) => (
              <BuildingCardWithFloorState key={b.id ?? b.name} building={b} />
            ))}
          </div>

          {meta && meta.total !== undefined && meta.total > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Всего: {meta.total}. Страница {meta.page} из {meta.totalPages}.
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
