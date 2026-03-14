"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Settings } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import { SubjectEditForm } from "@/app/(admin)/admin/items/SubjectEditForm";
import {
  fetchSubjectsWithTeachers,
  fetchSubjectsSearchWithTeachers,
  deleteSubject,
  formatTeacherDisplayName,
  type SubjectWithTeachers,
  type PaginationMeta,
} from "@/app/(admin)/admin/items/subjects-api";

const LIMIT = 10;
const SUBJECTS_QUERY_KEY = "admin-subjects" as const;

/**
 * Контент страницы «Предметы»: список с поиском, пагинация, создание/редактирование в модалке, удаление.
 */
export function SubjectsContent() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  /** null — режим создания, иначе — редактирование выбранного предмета */
  const [editingSubject, setEditingSubject] =
    React.useState<SubjectWithTeachers | null>(null);

  // Список с преподавателями: при наличии query — поиск, иначе полный список
  const { data, isPending, isError, error } = useQuery({
    queryKey: [SUBJECTS_QUERY_KEY, page, query],
    queryFn: () =>
      query.trim()
        ? fetchSubjectsSearchWithTeachers({
            page,
            limit: LIMIT,
            query: query.trim(),
          })
        : fetchSubjectsWithTeachers({ page, limit: LIMIT }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
      await queryClient.refetchQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const openCreateModal = React.useCallback(() => {
    setEditingSubject(null);
    setModalOpen(true);
  }, []);

  const openEditModal = React.useCallback((subject: SubjectWithTeachers) => {
    setEditingSubject(subject);
    setModalOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setModalOpen(false);
    setEditingSubject(null);
  }, []);

  const handleDelete = React.useCallback(
    (row: SubjectWithTeachers) => {
      const id = row.id;
      if (id == null) return;
      if (!window.confirm(`Удалить предмет «${row.name}»?`)) return;
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const rows = data?.data ?? [];
  const meta: PaginationMeta | undefined = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const columns = React.useMemo<ColumnDef<SubjectWithTeachers>[]>(
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
        id: "teachers",
        header: "Преподаватели",
        cell: ({ row }) => {
          const teachers = row.original.teachers;
          if (!teachers?.length) return "—";
          return teachers.map(formatTeacherDisplayName).join(", ");
        },
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
              aria-label="Редактировать предмет"
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
          {error instanceof Error
            ? error.message
            : "Не удалось загрузить список предметов"}
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
            emptyMessage="Нет предметов"
            rowClassName="group"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreateModal}
            className="mt-2"
            aria-label="Добавить предмет"
          >
            <Plus className="h-4 w-4 mr-1" />
            Добавить предмет
          </Button>

          <EntityEditSidepage
            open={modalOpen}
            onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) setEditingSubject(null);
            }}
            title={editingSubject ? "Редактировать предмет" : "Добавить предмет"}
          >
            <SubjectEditForm
              subject={editingSubject}
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
