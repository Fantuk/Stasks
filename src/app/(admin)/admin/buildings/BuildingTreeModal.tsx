"use client";

/**
 * Модалка редактирования дерева здания: название, этажи, аудитории.
 * Используется из BuildingCardWithFloorState по кнопке «Настройки».
 */

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { DialogFooter } from "@/app/components/ui/dialog";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import { Plus, Trash2 } from "lucide-react";
import {
  BUILDING_DETAIL_QUERY_KEY,
  BUILDINGS_QUERY_KEY,
  createClassroom,
  createFloor,
  deleteClassroom,
  deleteFloor,
  updateBuilding,
  updateClassroom,
  updateFloor,
  type BuildingWithFloors,
  type ClassroomListItem,
  type FloorWithClassrooms,
} from "@/app/(admin)/admin/buildings/buildings-api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { invalidateAndRefetch } from "@/lib/queryClient";

type TreeFloor = {
  id?: number | null;
  number: number;
  classrooms: Array<{ id?: number | null; name: string }>;
};

export type BuildingTreeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: number;
  buildingName: string;
  buildingDetail: BuildingWithFloors | undefined;
};

export function BuildingTreeModal({
  open,
  onOpenChange,
  buildingId,
  buildingName,
  buildingDetail,
}: BuildingTreeModalProps) {
  const queryClient = useQueryClient();
  const [treeBuildingName, setTreeBuildingName] = React.useState("");
  const [treeFloors, setTreeFloors] = React.useState<TreeFloor[]>([]);
  const [addingFloorInModal, setAddingFloorInModal] = React.useState(false);
  const [floorNumberToAddInModal, setFloorNumberToAddInModal] = React.useState(0);
  const [addingClassroomForFloorId, setAddingClassroomForFloorId] = React.useState<number | null>(null);
  const [newClassroomNameInModal, setNewClassroomNameInModal] = React.useState("");

  React.useEffect(() => {
    if (open && buildingDetail) {
      setTreeBuildingName(buildingDetail.name ?? buildingName ?? "");
      const fl = (buildingDetail.floors ?? []).sort((a, b) => a.number - b.number);
      setTreeFloors(
        fl.map((f) => ({
          id: f.id,
          number: f.number,
          classrooms: (f.classrooms ?? []).map((c) => ({ id: c.id, name: c.name })),
        }))
      );
    }
  }, [open, buildingDetail, buildingName]);

  const updateBuildingMutation = useMutation({
    mutationFn: ({ id, name: n }: { id: number; name: string }) => updateBuilding(id, { name: n }),
    onSuccess: async () => {
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
    },
  });

  const createFloorMutation = useMutation({
    mutationFn: createFloor,
    onSuccess: async (createdFloor: FloorWithClassrooms) => {
      const floorId = createdFloor?.id != null ? Number(createdFloor.id) : null;
      queryClient.setQueryData(
        [BUILDING_DETAIL_QUERY_KEY, buildingId],
        (old: BuildingWithFloors | undefined) => {
          if (!old) return old;
          const newFloor: FloorWithClassrooms = {
            id: floorId ?? undefined,
            buildingId: createdFloor.buildingId,
            number: createdFloor.number,
            classrooms: createdFloor.classrooms ?? [],
          };
          const floors = [...(old.floors ?? []), newFloor].sort((a, b) => a.number - b.number);
          return { ...old, floors };
        }
      );
      setAddingFloorInModal(false);
      await invalidateAndRefetch(queryClient, [BUILDING_DETAIL_QUERY_KEY, buildingId]);
      await invalidateAndRefetch(queryClient, [BUILDINGS_QUERY_KEY]);
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
              return { ...f, classrooms: [...(f.classrooms ?? []), newClassroom] };
            }
            return f;
          });
          return { ...old, floors };
        }
      );
      setNewClassroomNameInModal("");
      setAddingClassroomForFloorId(null);
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

  return (
    <EntityEditSidepage
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setAddingFloorInModal(false);
          setAddingClassroomForFloorId(null);
        }
      }}
      title={`Редактировать: ${buildingName}`}
      className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
    >
      <div className="overflow-y-auto flex-1 min-h-0 space-y-6 pr-1">
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
              {getApiErrorMessage(updateBuildingMutation.error, "Ошибка сохранения")}
            </p>
          )}
        </form>

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
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-base border-[#cccccc] text-[#333333]">
          Закрыть
        </Button>
      </DialogFooter>
    </EntityEditSidepage>
  );
}
