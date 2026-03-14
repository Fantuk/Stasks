"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { SearchIcon } from "lucide-react";

/** Элемент списка для выбора (radio или checkbox) */
export type SelectionOption = {
  id: string;
  label: string;
};

export type SelectionSidePanelMode = "radio" | "checkbox";

type SelectionSidePanelProps = {
  /** Открыта ли панель */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Заголовок панели (например, «Группа», «Преподаватели») */
  title: string;
  /** Режим: один вариант (radio) или несколько (checkbox) */
  mode: SelectionSidePanelMode;
  /** Список вариантов */
  options: SelectionOption[];
  /** Выбранное значение (radio) или массив id (checkbox) */
  selectedId?: string | null;
  selectedIds?: string[];
  /** Callback при подтверждении (radio). Обязателен при mode="radio". */
  onConfirm?: (id: string | null) => void;
  /** Callback при подтверждении (checkbox). Обязателен при mode="checkbox". */
  onConfirmMultiple?: (ids: string[]) => void;
  /** Плейсхолдер поиска (если пусто — поиск не показывается) */
  searchPlaceholder?: string;
  /** Текст для пустого выбора (только для radio), например «Без группы» */
  emptyOptionLabel?: string;
  /** Отключено (например, во время отправки формы) */
  disabled?: boolean;
};

/**
 * Дополнительное модальное окно выбора сущности (поверх основной правой панели).
 * По клику на поле выбора открывается как компактная модалка, а не sidepage.
 * Режим radio — выбор одной сущности (например, группа для студента).
 * Режим checkbox — выбор нескольких (например, предметы для преподавателя).
 */
export function SelectionSidePanel({
  open,
  onOpenChange,
  title,
  mode,
  options,
  selectedId = null,
  selectedIds = [],
  onConfirm,
  onConfirmMultiple,
  searchPlaceholder,
  emptyOptionLabel,
  disabled = false,
}: SelectionSidePanelProps) {
  // Локальное состояние для выбора в панели (применяется по «Подтвердить»)
  const [localSingle, setLocalSingle] = React.useState<string | null>(selectedId ?? null);
  const [localMultiple, setLocalMultiple] = React.useState<string[]>(selectedIds);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Синхронизируем с пропсами при открытии панели
  React.useEffect(() => {
    if (open) {
      setLocalSingle(selectedId ?? null);
      setLocalMultiple(selectedIds);
      setSearchQuery("");
    }
  }, [open, selectedId, selectedIds]);

  // Фильтр по поиску (по label)
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const handleConfirm = () => {
    if (mode === "radio") {
      onConfirm?.(localSingle === "__none__" ? null : localSingle);
    } else {
      onConfirmMultiple?.(localMultiple);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        overlayClassName="z-[60]"
        className={cn(
          "z-60 max-h-[85vh] max-w-[400px] w-[calc(100%-2rem)] bg-[#f6f6f6] rounded-2xl border-0 p-0 gap-0 shadow-xl",
          "flex flex-col overflow-hidden"
        )}
      >
        {/* Header: тег-заголовок + кнопка закрытия */}
        <DialogHeader className="flex flex-row items-center justify-between gap-2 rounded-t-2xl bg-[#f6f6f6] px-4 py-4 pb-2">
          <DialogTitle className="rounded-lg bg-[#efefef] px-3 py-1.5 text-base font-medium text-[#333333]">
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Опциональный поиск */}
        {searchPlaceholder != null && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={disabled}
                className="h-8 rounded-lg border-[#cccccc] bg-[#f6f6f6] pl-3 pr-9 text-base text-[#333333] placeholder:text-[#929292]"
              />
              <SearchIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]" />
            </div>
          </div>
        )}

        {/* Контент: список radio или checkbox (скролл) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          <div className="space-y-0.5">
            {/* Для radio: опция «Пусто» (например, «Без группы») */}
            {mode === "radio" && emptyOptionLabel != null && (
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2 transition-colors",
                  localSingle === "__none__"
                    ? "border-[#b5a3fa] bg-[#f4f1fe]/50"
                    : "border-[#cccccc] bg-transparent hover:bg-[#efefef]"
                )}
              >
                <input
                  type="radio"
                  name="selection-side-panel"
                  checked={localSingle === "__none__"}
                  onChange={() => setLocalSingle("__none__")}
                  disabled={disabled}
                  className="size-5 rounded-full border-2 border-[#836be1] bg-[#f6f6f6] text-[#836be1] focus:ring-2 focus:ring-[#836be1]/30"
                />
                <span
                  className={cn(
                    "text-base font-medium",
                    localSingle === "__none__" ? "text-[#4f4188]" : "text-[#333333]"
                  )}
                >
                  {emptyOptionLabel}
                </span>
              </label>
            )}

            {mode === "radio" &&
              filteredOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2 transition-colors",
                    localSingle === opt.id
                      ? "border-[#b5a3fa] bg-[#f4f1fe]/50"
                      : "border-[#cccccc] bg-transparent hover:bg-[#efefef]"
                  )}
                >
                  <input
                  type="radio"
                  name="selection-side-panel"
                  checked={localSingle === opt.id}
                  onChange={() => setLocalSingle(opt.id)}
                  disabled={disabled}
                  className="size-5 rounded-full border-2 border-[#836be1] bg-[#f6f6f6] text-[#836be1] focus:ring-2 focus:ring-[#836be1]/30"
                />
                  <span
                    className={cn(
                      "text-base font-medium",
                      localSingle === opt.id ? "text-[#4f4188]" : "text-[#333333]"
                    )}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}

            {mode === "checkbox" &&
              filteredOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-[#cccccc] px-3 py-2 transition-colors hover:bg-[#efefef]",
                    localMultiple.includes(opt.id) && "border-[#b5a3fa] bg-[#f4f1fe]/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={localMultiple.includes(opt.id)}
                    onChange={() =>
                      setLocalMultiple((prev) =>
                        prev.includes(opt.id)
                          ? prev.filter((id) => id !== opt.id)
                          : [...prev, opt.id]
                      )
                    }
                    disabled={disabled}
                    className="size-5 rounded border-2 border-[#cccccc] bg-[#f6f6f6] text-[#836be1] focus:ring-2 focus:ring-[#836be1]/30"
                  />
                  <span
                    className={cn(
                      "text-base font-medium",
                      localMultiple.includes(opt.id) ? "text-[#4f4188]" : "text-[#333333]"
                    )}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
          </div>
        </div>

        {/* Footer: Отменить / Подтвердить */}
        <div className="flex flex-row items-center justify-end gap-2 border-t border-[#e1e1e1] bg-[#f6f6f6] px-4 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={disabled}
            className="h-8 border-[#b5a3fa] bg-[#f4f1fe] text-base text-[#4f4188] hover:bg-[#ede9fe]"
          >
            Отменить
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={disabled}
            className="h-8 bg-[#836be1] text-base text-[#f4f1fe] hover:bg-[#6d5ad0]"
          >
            Подтвердить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
