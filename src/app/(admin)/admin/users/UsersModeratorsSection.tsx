"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Settings } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { EntityEditSidepage } from "@/app/components/EntityEditSidepage";
import { ModeratorRightsForm } from "@/app/(admin)/admin/users/ModeratorRightsForm";
import {
  fetchModerators,
  MODERATORS_QUERY_KEY,
  type ModeratorListItem,
  type PaginationMeta,
} from "@/app/(admin)/admin/users/users-api";
import { getApiErrorMessage } from "@/lib/api-errors";

const LIMIT = 10;

/** Права доступа модератора для отображения в таблице */
type AccessRights = {
  canDeleteUsers?: boolean;
  canRegisterUsers?: boolean;
};

/** Человекочитаемое представление прав модератора для колонки таблицы */
function formatAccessRights(moderator: ModeratorListItem): string {
  const rights = (moderator.accessRights ?? {}) as AccessRights;
  const labels: string[] = [];

  if (rights.canDeleteUsers) {
    labels.push("Удаление пользователей");
  }
  if (rights.canRegisterUsers) {
    labels.push("Регистрация пользователей");
  }

  if (labels.length === 0) {
    return "—";
  }

  return labels.join(", ");
}

function fullName(m: ModeratorListItem): string {
  return m.user
    ? [m.user.surname, m.user.name, m.user.patronymic].filter(Boolean).join(" ")
    : `#${m.userId}`;
}

/**
 * Секция «Модераторы»: список по GET /moderator, редактирование прав в модалке.
 */
export function UsersModeratorsSection() {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingModerator, setEditingModerator] =
    React.useState<ModeratorListItem | null>(null);

  const { data, isPending, isError, error } = useQuery({
    queryKey: [MODERATORS_QUERY_KEY, page, query],
    queryFn: () => fetchModerators({ page, limit: LIMIT, query: query || undefined }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const openEditModal = React.useCallback((moderator: ModeratorListItem) => {
    setEditingModerator(moderator);
    setModalOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setModalOpen(false);
    setEditingModerator(null);
  }, []);

  const rows = data?.data ?? [];
  const meta: PaginationMeta | undefined = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const columns = React.useMemo<ColumnDef<ModeratorListItem>[]>(
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
        id: "rights",
        header: "Права",
        cell: ({ row }) => formatAccessRights(row.original),
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
            aria-label="Права модератора"
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
          {getApiErrorMessage(error, "Не удалось загрузить список модераторов")}
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
            emptyMessage="Нет модераторов"
            rowClassName="group"
          />

          <EntityEditSidepage
            open={modalOpen}
            onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) setEditingModerator(null);
            }}
            title="Права модератора"
          >
            {editingModerator ? (
              <ModeratorRightsForm
                moderator={editingModerator}
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
