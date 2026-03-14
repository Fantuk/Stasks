"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Settings } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import { GroupEditForm } from "@/app/(admin)/admin/groups/GroupEditForm";
import {
  fetchGroups,
  fetchGroupsSearch,
  deleteGroup,
  type GroupListItem,
  type PaginationMeta,
} from "@/app/(admin)/admin/groups/groups-api";

const LIMIT = 10;
const GROUPS_QUERY_KEY = "admin-groups" as const;

/**
 * Контент страницы «Группы»: список с поиском, пагинация, создание/редактирование в модалке, удаление.
 */
export function GroupsContent() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  /** null — режим создания, иначе — редактирование выбранной группы */
  const [editingGroup, setEditingGroup] = React.useState<GroupListItem | null>(null);

  // Список: при наличии query — поиск, иначе полный список
  const { data, isPending, isError, error } = useQuery({
    queryKey: [GROUPS_QUERY_KEY, page, query],
    queryFn: () =>
      query.trim()
        ? fetchGroupsSearch({ page, limit: LIMIT, query: query.trim() })
        : fetchGroups({ page, limit: LIMIT }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [GROUPS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [GROUPS_QUERY_KEY] });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const openCreateModal = React.useCallback(() => {
    setEditingGroup(null);
    setModalOpen(true);
  }, []);

  const openEditModal = React.useCallback((group: GroupListItem) => {
    setEditingGroup(group);
    setModalOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setModalOpen(false);
    setEditingGroup(null);
  }, []);

  const handleDelete = React.useCallback(
    (row: GroupListItem) => {
      const id = row.id;
      if (id == null) return;
      if (!window.confirm(`Удалить группу «${row.name}»?`)) return;
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const rows = data?.data ?? [];
  const meta: PaginationMeta | undefined = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const columns = React.useMemo<ColumnDef<GroupListItem>[]>(
    () => [
      {
        id: "rowNumber",
        header: "№",
        cell: ({ row }) => (page - 1) * LIMIT + row.index + 1,
      },
      {
        id: "name",
        header: "Название",
        cell: ({ row }) => row.original.name,
      },
      {
        id: "studentCount",
        header: "Студентов",
        cell: ({ row }) => row.original.studentCount ?? "—",
      },
      {
        id: "mentor",
        header: "Куратор",
        cell: ({ row }) => row.original.mentor?.displayName ?? "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(row.original);
              }}
              aria-label="Редактировать группу"
            >
              <Settings className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDelete(row.original)}
              disabled={deleteMutation.isPending}
            >
              Удалить
            </Button>
          </div>
        ),
      },
    ],
    [page, handleDelete, openEditModal, deleteMutation.isPending]
  );

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <form onSubmit={handleSearch} className="flex gap-2 flex-wrap items-center">
        <Input
          placeholder="Поиск по названию..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary" size="sm">
          Найти
        </Button>
      </form>

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "Не удалось загрузить список групп"}
        </p>
      )}

      {isPending ? (
        <p className="text-muted-foreground text-sm">Загрузка...</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => String(row.id ?? row.name)}
            emptyMessage="Нет групп"
            rowClassName="group"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreateModal}
            className="mt-2"
            aria-label="Добавить группу"
          >
            <Plus className="h-4 w-4 mr-1" />
            Добавить группу
          </Button>

          <EntityEditSidepage
            open={modalOpen}
            onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) setEditingGroup(null);
            }}
            title={editingGroup ? "Редактировать группу" : "Добавить группу"}
          >
            <GroupEditForm
              group={editingGroup}
              onSuccess={closeModal}
              onCancel={closeModal}
            />
          </EntityEditSidepage>

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
