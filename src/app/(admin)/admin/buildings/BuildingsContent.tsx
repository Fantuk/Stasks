"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { DialogFooter } from "@/app/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import { BuildingEditForm } from "@/app/(admin)/admin/buildings/BuildingEditForm";
import {
  fetchBuildings,
  fetchBuildingsSearch,
  fetchBuildingWithFloorsAndClassrooms,
  deleteBuilding,
  updateBuilding,
  createFloor,
  updateFloor,
  deleteFloor,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  type BuildingListItem,
  type BuildingWithFloors,
  type FloorWithClassrooms,
  type ClassroomListItem,
  type PaginationMeta,
} from "@/app/(admin)/admin/buildings/buildings-api";

const LIMIT = 10;
const BUILDINGS_QUERY_KEY = "admin-buildings" as const;
const BUILDING_DETAIL_QUERY_KEY = "admin-building-detail" as const;

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
  // Одна общая модалка для всего дерева (здание + этажи + аудитории)
  const [treeModalOpen, setTreeModalOpen] = React.useState(false);
  /** Локальная копия дерева для редактирования в модалке; синхронизируется с buildingDetail при открытии */
  const [treeBuildingName, setTreeBuildingName] = React.useState("");
  const [treeFloors, setTreeFloors] = React.useState<
    Array<{ id?: number | null; number: number; classrooms: Array<{ id?: number | null; name: string }> }>
  >([]);

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

  // Синхронизировать локальное дерево с buildingDetail при открытии модалки и при обновлении данных
  React.useEffect(() => {
    if (treeModalOpen && buildingDetail) {
      setTreeBuildingName(buildingDetail.name ?? building.name ?? "");
      const fl = (buildingDetail.floors ?? []).sort((a, b) => a.number - b.number);
      setTreeFloors(
        fl.map((f) => ({
          id: f.id,
          number: f.number,
          classrooms: (f.classrooms ?? []).map((c) => ({ id: c.id, name: c.name })),
        }))
      );
    }
  }, [treeModalOpen, buildingDetail, building.name]);

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
      await queryClient.invalidateQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
      await queryClient.refetchQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
      await queryClient.invalidateQueries({ queryKey: [BUILDINGS_QUERY_KEY] });
    },
  });

  const updateBuildingMutation = useMutation({
    mutationFn: ({ id, name: n }: { id: number; name: string }) => updateBuilding(id, { name: n }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
      await queryClient.refetchQueries({ queryKey: [BUILDINGS_QUERY_KEY] });
    },
  });

  const updateFloorMutation = useMutation({
    mutationFn: ({ id, number: num }: { id: number; number: number }) => updateFloor(id, { number: num }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
      await queryClient.refetchQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
    },
  });

  const deleteFloorMutation = useMutation({
    mutationFn: deleteFloor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
      await queryClient.refetchQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
      await queryClient.refetchQueries({ queryKey: [BUILDINGS_QUERY_KEY] });
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
      await queryClient.invalidateQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
      await queryClient.refetchQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
    },
  });

  const updateClassroomMutation = useMutation({
    mutationFn: ({ id, name: n }: { id: number; name: string }) => updateClassroom(id, { name: n }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
      await queryClient.refetchQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
    },
  });

  const deleteClassroomMutation = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
      await queryClient.refetchQueries({ queryKey: [BUILDING_DETAIL_QUERY_KEY, buildingId] });
    },
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: deleteBuilding,
    onSuccess: async () => {
      // Инвалидируем и принудительно перезапрашиваем список, чтобы удалённое здание исчезло из UI
      await queryClient.invalidateQueries({ queryKey: [BUILDINGS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [BUILDINGS_QUERY_KEY] });
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

  const handleSaveBuildingName = (e: React.FormEvent) => {
    e.preventDefault();
    const name = treeBuildingName.trim();
    if (!name || name.length < 2 || name.length > 100) return;
    updateBuildingMutation.mutate({ id: buildingId, name });
  };

  const handleSaveFloorNumber = (floorId: number, number: number) => {
    updateFloorMutation.mutate({ id: floorId, number });
  };

  const handleSaveClassroomName = (classroomId: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) return;
    updateClassroomMutation.mutate({ id: classroomId, name: trimmed });
  };

  // Добавление этажа/аудитории внутри модалки дерева
  const [addingFloorInModal, setAddingFloorInModal] = React.useState(false);
  const [floorNumberToAddInModal, setFloorNumberToAddInModal] = React.useState(0);
  const [addingClassroomForFloorId, setAddingClassroomForFloorId] = React.useState<number | null>(null);
  const [newClassroomNameInModal, setNewClassroomNameInModal] = React.useState("");

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
                {(createFloorMutation.error ?? updateFloorMutation.error) instanceof Error
                  ? (createFloorMutation.error ?? updateFloorMutation.error)?.message
                  : "Не удалось выполнить действие с этажом"}
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

            {/* Общая модалка: дерево здания (название, этажи, аудитории) */}
            <EntityEditSidepage
              open={treeModalOpen}
              onOpenChange={(open) => {
                setTreeModalOpen(open);
                if (!open) {
                  setAddingFloorInModal(false);
                  setAddingClassroomForFloorId(null);
                }
              }}
              title={`Редактировать: ${building.name}`}
              className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="overflow-y-auto flex-1 min-h-0 space-y-6 pr-1">
                {/* Блок: название здания */}
                <form onSubmit={handleSaveBuildingName} className="space-y-2">
                  <Label className="text-base text-[#333333]">Название здания</Label>
                  <div className="flex gap-2">
                    <Input
                      value={treeBuildingName}
                      onChange={(e) => setTreeBuildingName(e.target.value)}
                      placeholder="Название здания"
                      disabled={updateBuildingMutation.isPending}
                      className="h-8 flex-1 text-base text-[#333333] placeholder:text-[#929292] bg-[#f6f6f6] border-[#cccccc]"
                    />
                    <Button type="submit" size="sm" disabled={updateBuildingMutation.isPending || treeBuildingName.trim().length < 2}>
                      {updateBuildingMutation.isPending ? "…" : "Сохранить"}
                    </Button>
                  </div>
                  {updateBuildingMutation.isError && (
                    <p className="text-sm text-destructive" role="alert">
                      {updateBuildingMutation.error instanceof Error ? updateBuildingMutation.error.message : "Ошибка сохранения"}
                    </p>
                  )}
                </form>

                {/* Блок: этажи и аудитории */}
                <div className="space-y-4">
                  <Label className="text-base text-[#333333]">Этажи и аудитории</Label>
                  {treeFloors.map((floor, floorIdx) => {
                    const floorId = floor.id ?? 0;
                    return (
                      <div
                        key={floorId || `new-${floorIdx}`}
                        className="rounded-lg border border-[#cccccc] bg-[#efefef] p-3 space-y-3"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[#333333]">Этаж</span>
                          <div className="flex items-center gap-0 rounded border border-[#cccccc] bg-[#f6f6f6]">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-r-none"
                              onClick={() => setTreeFloors((prev) => prev.map((f) => (f.id === floorId ? { ...f, number: f.number - 1 } : f)))}
                              disabled={updateFloorMutation.isPending}
                            >
                              −
                            </Button>
                            <span className="min-w-8 text-center text-sm tabular-nums">{floor.number}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-l-none"
                              onClick={() => setTreeFloors((prev) => prev.map((f) => (f.id === floorId ? { ...f, number: f.number + 1 } : f)))}
                              disabled={updateFloorMutation.isPending}
                            >
                              +
                            </Button>
                          </div>
                          {floorId > 0 && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleSaveFloorNumber(floorId, floor.number)}
                                disabled={updateFloorMutation.isPending}
                              >
                                Сохранить
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (window.confirm(`Удалить этаж ${floor.number}?`)) deleteFloorMutation.mutate(floorId);
                                }}
                                disabled={deleteFloorMutation.isPending}
                              >
                                Удалить
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="pl-2 space-y-2">
                          <span className="text-xs text-muted-foreground">Аудитории:</span>
                          {floor.classrooms.map((room, roomIdx) => {
                            const roomId = room.id ?? 0;
                            return (
                              <div key={roomId || roomIdx} className="flex items-center gap-2">
                                <Input
                                  value={room.name}
                                  onChange={(e) =>
                                    setTreeFloors((prev) =>
                                      prev.map((f) =>
                                        f.id === floorId
                                          ? { ...f, classrooms: f.classrooms.map((r, i) => (i === roomIdx ? { ...r, name: e.target.value } : r)) }
                                          : f
                                      )
                                    )
                                  }
                                  className="h-7 text-sm flex-1 max-w-[180px]"
                                  maxLength={50}
                                />
                                {roomId > 0 && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2"
                                      onClick={() => handleSaveClassroomName(roomId, room.name)}
                                      disabled={updateClassroomMutation.isPending}
                                    >
                                      Сохр.
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-destructive"
                                      onClick={() => {
                                        if (window.confirm(`Удалить «${room.name}»?`)) deleteClassroomMutation.mutate(roomId);
                                      }}
                                      disabled={deleteClassroomMutation.isPending}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                          {addingClassroomForFloorId === floorId ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newClassroomNameInModal}
                                onChange={(e) => setNewClassroomNameInModal(e.target.value)}
                                placeholder="Название"
                                className="h-7 text-sm max-w-[180px]"
                                maxLength={50}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const name = newClassroomNameInModal.trim();
                                    if (name) {
                                      createClassroomMutation.mutate({ floorId, name });
                                      setNewClassroomNameInModal("");
                                      setAddingClassroomForFloorId(null);
                                    }
                                  }
                                  if (e.key === "Escape") setAddingClassroomForFloorId(null);
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const name = newClassroomNameInModal.trim();
                                  if (name) {
                                    createClassroomMutation.mutate({ floorId, name });
                                    setNewClassroomNameInModal("");
                                    setAddingClassroomForFloorId(null);
                                  }
                                }}
                                disabled={!newClassroomNameInModal.trim() || createClassroomMutation.isPending}
                              >
                                OK
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setAddingClassroomForFloorId(null)}>
                                Отмена
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-[#b5a3fa] text-[#836be1] hover:bg-[#f4f1fe]"
                              onClick={() => {
                                setAddingClassroomForFloorId(floorId);
                                setNewClassroomNameInModal("");
                              }}
                              disabled={createClassroomMutation.isPending}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Аудитория
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {addingFloorInModal ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#b5a3fa] bg-[#f4f1fe] p-2">
                      <span className="text-sm text-[#836be1]">Номер этажа:</span>
                      <div className="flex items-center gap-0 rounded border border-[#b5a3fa] bg-white">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFloorNumberToAddInModal((n) => n - 1)}>
                          −
                        </Button>
                        <span className="min-w-8 text-center text-sm tabular-nums">{floorNumberToAddInModal}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFloorNumberToAddInModal((n) => n + 1)}>
                          +
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#836be1]"
                        onClick={() => {
                          createFloorMutation.mutate({ buildingId, number: floorNumberToAddInModal });
                          setAddingFloorInModal(false);
                        }}
                        disabled={createFloorMutation.isPending}
                      >
                        Создать
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setAddingFloorInModal(false)}>
                        Отмена
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-[#b5a3fa] text-[#836be1] hover:bg-[#f4f1fe]"
                      onClick={() => {
                        setAddingFloorInModal(true);
                        const next = treeFloors.length === 0 ? 0 : Math.max(...treeFloors.map((f) => f.number)) + 1;
                        setFloorNumberToAddInModal(next);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Этаж
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter className="border-t pt-4 mt-4 shrink-0">
                <Button type="button" variant="outline" onClick={() => setTreeModalOpen(false)} className="h-8 text-base border-[#cccccc] text-[#333333]">
                  Закрыть
                </Button>
              </DialogFooter>
            </EntityEditSidepage>
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
          {error instanceof Error ? error.message : "Не удалось загрузить список зданий"}
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
