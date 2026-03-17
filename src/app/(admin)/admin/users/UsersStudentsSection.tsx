"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Settings } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import { StudentEditForm } from "@/app/(admin)/admin/users/StudentEditForm";
import {
  fetchStudents,
  STUDENTS_QUERY_KEY,
  type UserSearchStudentItem,
  type PaginationMeta,
} from "@/app/(admin)/admin/users/users-api";
import { getApiErrorMessage } from "@/lib/api-errors";

const LIMIT = 10;

function fullName(row: UserSearchStudentItem): string {
  return [row.surname, row.name, row.patronymic].filter(Boolean).join(" ") || "—";
}

/**
 * Секция «Студенты»: список по GET /users/search?roles=STUDENT через TanStack Query и DataTable.
 * При наведении на строку отображается шестерёнка; по клику открывается модалка редактирования.
 */
export function UsersStudentsSection() {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [editingStudent, setEditingStudent] =
    React.useState<UserSearchStudentItem | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const { data, isPending, isError, error } = useQuery({
    queryKey: [STUDENTS_QUERY_KEY, page, query],
    queryFn: () => fetchStudents({ page, limit: LIMIT, query: query || undefined }),
  });

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

  const openEditModal = React.useCallback((student: UserSearchStudentItem) => {
    setEditingStudent(student);
    setModalOpen(true);
  }, []);

  const closeEditModal = React.useCallback(() => {
    setModalOpen(false);
    setEditingStudent(null);
  }, []);

  const columns = React.useMemo<ColumnDef<UserSearchStudentItem>[]>(
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
        id: "group",
        header: "Группа",
        cell: ({ row }) => {
          const s = row.original.student;
          return s?.group?.name ?? (s?.groupId ? `#${s.groupId}` : "—");
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
            aria-label="Редактировать студента"
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
          {getApiErrorMessage(error, "Не удалось загрузить список студентов")}
        </p>
      )}

      {isPending ? (
        <p className="text-muted-foreground text-sm">Загрузка...</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => String((row as { id?: number }).id ?? row.email)}
            emptyMessage="Нет студентов"
            rowClassName="group"
          />

          <EntityEditSidepage
            open={modalOpen}
            onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) setEditingStudent(null);
            }}
            title="Редактировать студента"
          >
            {editingStudent ? (
              <StudentEditForm
                student={editingStudent}
                onSuccess={closeEditModal}
                onCancel={closeEditModal}
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
