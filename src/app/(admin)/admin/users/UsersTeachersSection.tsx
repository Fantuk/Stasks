"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Settings } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import { TeacherEditForm } from "@/app/(admin)/admin/users/TeacherEditForm";
import {
  fetchTeachers,
  TEACHERS_QUERY_KEY,
  type TeacherListItem,
  type PaginationMeta,
} from "@/app/(admin)/admin/users/users-api";
import { getApiErrorMessage } from "@/lib/api-errors";

const LIMIT = 10;

function fullName(t: TeacherListItem): string {
  return t.user
    ? [t.user.surname, t.user.name, t.user.patronymic].filter(Boolean).join(" ")
    : `#${t.userId}`;
}

/**
 * Секция «Преподаватели»: список по GET /teacher, редактирование курируемой группы в модалке.
 */
export function UsersTeachersSection() {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState<TeacherListItem | null>(null);

  const { data, isPending, isError, error } = useQuery({
    queryKey: [TEACHERS_QUERY_KEY, page, query],
    queryFn: () => fetchTeachers({ page, limit: LIMIT, query: query || undefined }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const openEditModal = React.useCallback((teacher: TeacherListItem) => {
    setEditingTeacher(teacher);
    setModalOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setModalOpen(false);
    setEditingTeacher(null);
  }, []);

  const rows = data?.data ?? [];
  const meta: PaginationMeta | undefined = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const columns = React.useMemo<ColumnDef<TeacherListItem>[]>(
    () => [
      {
        id: "rowNumber",
        header: "№",
        cell: ({ row }) => (page - 1) * LIMIT + row.index + 1,
      },
      {
        id: "name",
        header: "ФИО",
        cell: ({ row }) => fullName(row.original),
      },
      {
        id: "mentoredGroup",
        header: "Курируемая группа",
        cell: ({ row }) => {
          const t = row.original;
          return t.mentoredGroup?.name ?? (t.mentoredGroupId ? `#${t.mentoredGroupId}` : "—");
        },
      },
      // Колонка «Предметы»: список предметов преподавателя из teacherSubjects
      {
        id: "subjects",
        header: "Предметы",
        cell: ({ row }) => {
          const subs = row.original.subjects;
          if (!subs?.length) return "—";
          return subs.map((s) => s.name).join(", ");
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row.original);
            }}
            aria-label="Редактировать преподавателя"
          >
            <Settings className="size-4" />
          </Button>
        ),
      },
    ],
    [page, openEditModal]
  );

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 flex-wrap items-center">
        <Input
          placeholder="Поиск по имени или email..."
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
          {getApiErrorMessage(error, "Не удалось загрузить список преподавателей")}
        </p>
      )}

      {isPending ? (
        <p className="text-muted-foreground text-sm">Загрузка...</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => String(row.userId)}
            emptyMessage="Нет преподавателей"
            rowClassName="group"
          />

          <EntityEditSidepage
            open={modalOpen}
            onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) setEditingTeacher(null);
            }}
            title="Редактировать преподавателя"
          >
            {editingTeacher ? (
              <TeacherEditForm
                teacher={editingTeacher}
                onSuccess={closeModal}
                onCancel={closeModal}
              />
            ) : null}
          </EntityEditSidepage>

          {meta && meta.total && meta.total > 0 && (
            <div className="flex items-center justify-between text-sm text-[#333333]/80">
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
