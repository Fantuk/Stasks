"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

type EntityEditModalProps = {
  /** Управление открытием модалки */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Заголовок модального окна */
  title: string;
  /** Контент: форма и при необходимости кнопки (Отменить / Подтвердить) */
  children: React.ReactNode;
  /** Дополнительные классы для контейнера контента */
  className?: string;
};

/**
 * Переиспользуемое модальное окно редактирования сущности (по макету Figma).
 * Панель: 400px, фон #f6f6f6, скругление 16px, отступы 16px. Оверлей #202020 20%.
 */
export function EntityEditModal({
  open,
  onOpenChange,
  title,
  children,
  className,
}: EntityEditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[400px] w-[calc(100%-2rem)] bg-[#f6f6f6] rounded-2xl p-4 gap-4 border-0 shadow-lg",
          className
        )}
        showCloseButton={true}
      >
        <DialogHeader className="gap-0 pb-0">
          <DialogTitle className="text-base font-medium text-[#333333]">
            {title}
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
