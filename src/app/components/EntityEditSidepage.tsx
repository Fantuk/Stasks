"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

type EntityEditSidepageProps = {
  /** Управление открытием панели */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Заголовок (тег в шапке), например «Студенты», «Группы» */
  title: string;
  /** Контент: форма с полями и футером (Отменить / Подтвердить) */
  children: React.ReactNode;
  /** Дополнительные классы для контента */
  className?: string;
};

/**
 * Правая боковая панель редактирования сущности (по макету Figma 1607-42777).
 * Открывается справа у края экрана; внутри — все поля сущности: обычные инпуты
 * и кликабельные поля, по клику на которые слева открывается панель выбора.
 */
export function EntityEditSidepage({
  open,
  onOpenChange,
  title,
  children,
  className,
}: EntityEditSidepageProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className={cn(
          "z-50 w-full max-w-[400px] sm:max-w-[400px] bg-[#f6f6f6] rounded-l-2xl border-0 shadow-xl",
          "flex flex-col gap-0 p-0",
          className
        )}
      >
        {/* Header: тег-заголовок + кнопка закрытия (как в Figma sidepage) */}
        <SheetHeader className="flex flex-row items-center justify-between gap-2 rounded-t-2xl bg-[#f6f6f6] px-4 py-4 pb-2">
          <SheetTitle className="rounded-lg bg-[#efefef] px-3 py-1.5 text-sm font-medium text-[#333333]">
            {title}
          </SheetTitle>
        </SheetHeader>
        {/* Контент: форма с полями и футером */}
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
