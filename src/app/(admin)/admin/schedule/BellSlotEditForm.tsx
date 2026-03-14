"use client";

import * as React from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type { BellTemplateSlot } from "@/app/(admin)/admin/schedule/bells-api";
import type { CreateBellTemplateBody } from "@/app/(admin)/admin/schedule/bells-api";
import {
  fetchGroups,
  type GroupListItem,
} from "@/app/(admin)/admin/groups/groups-api";

/** Преобразует ISO-время (1970-01-01T09:00:00.000Z) в "HH:mm" для input[type=time] */
function isoTimeToInput(iso: string | Date | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Преобразует "HH:mm" в ISO-время (UTC, 1970-01-01) для API */
function inputTimeToIso(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(1970, 0, 1, h ?? 0, m ?? 0, 0, 0));
  return d.toISOString();
}

const WEEKDAYS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
] as const;

export type BellSlotFormValues = CreateBellTemplateBody;

/** Scope по умолчанию при создании (подставляется с текущей страницы) */
export type DefaultScope = {
  scheduleType: "date" | "weekday";
  groupId?: number | null;
  specificDate?: string | null;
  weekdayStart?: number;
  weekdayEnd?: number;
};

type BellSlotEditFormProps = {
  /** Существующий слот для редактирования (null = создание) */
  initialSlot: BellTemplateSlot | null;
  /** Список групп для выбора (общий шаблон = пусто) */
  groups: GroupListItem[];
  /** Scope по умолчанию при создании (период/дата и группа с текущей страницы) */
  defaultScope?: DefaultScope | null;
  /** Предлагаемый номер урока при создании (например первый свободный) */
  suggestedLessonNumber?: number;
  /** Отправка формы */
  onSubmit: (values: BellSlotFormValues) => void;
  /** Отмена */
  onCancel: () => void;
  /** Идёт отправка */
  isSubmitting?: boolean;
};

/**
 * Форма создания/редактирования одного слота шаблона звонков.
 * Поля: тип расписания (дата / дни недели), scope (группа, дата или пн–вс), номер урока, начало/конец.
 */
export function BellSlotEditForm({
  initialSlot,
  groups,
  defaultScope,
  suggestedLessonNumber = 1,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: BellSlotEditFormProps) {
  const isEdit = initialSlot != null && initialSlot.id != null;

  // При создании подставляем defaultScope и suggestedLessonNumber
  const [scheduleType, setScheduleType] = React.useState<"date" | "weekday">(
    (initialSlot?.scheduleType as "date" | "weekday") ??
      defaultScope?.scheduleType ??
      "weekday",
  );
  const [groupId, setGroupId] = React.useState<string>(() => {
    if (initialSlot?.groupId != null) return String(initialSlot.groupId);
    if (defaultScope?.groupId != null) return String(defaultScope.groupId);
    return "";
  });
  const [specificDate, setSpecificDate] = React.useState(() => {
    if (initialSlot?.specificDate)
      return new Date(initialSlot.specificDate).toISOString().slice(0, 10);
    if (defaultScope?.specificDate)
      return new Date(defaultScope.specificDate).toISOString().slice(0, 10);
    return "";
  });
  const [weekdayStart, setWeekdayStart] = React.useState<number>(
    initialSlot?.weekdayStart ?? defaultScope?.weekdayStart ?? 1,
  );
  const [weekdayEnd, setWeekdayEnd] = React.useState<number>(
    initialSlot?.weekdayEnd ?? defaultScope?.weekdayEnd ?? 5,
  );
  const [lessonNumber, setLessonNumber] = React.useState(
    String(initialSlot?.lessonNumber ?? suggestedLessonNumber ?? 1),
  );
  const [startTime, setStartTime] = React.useState(
    isoTimeToInput(initialSlot?.startTime),
  );
  const [endTime, setEndTime] = React.useState(
    isoTimeToInput(initialSlot?.endTime),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lesson = parseInt(lessonNumber, 10);
    if (Number.isNaN(lesson) || lesson < 1) return;

    const body: CreateBellTemplateBody = {
      scheduleType,
      lessonNumber: lesson,
      startTime: inputTimeToIso(startTime),
      endTime: inputTimeToIso(endTime),
    };
    if (groupId) body.groupId = parseInt(groupId, 10);
    else body.groupId = null;

    if (scheduleType === "date") {
      body.specificDate = specificDate ? `${specificDate}T00:00:00.000Z` : null;
      body.weekdayStart = null;
      body.weekdayEnd = null;
    } else {
      body.weekdayStart = weekdayStart;
      body.weekdayEnd = weekdayEnd;
      body.specificDate = null;
    }

    onSubmit(body);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Тип расписания */}
      <div className="space-y-2">
        <Label htmlFor="scheduleType">Тип расписания</Label>
        <Select
          value={scheduleType}
          onValueChange={(v) => setScheduleType(v as "date" | "weekday")}
        >
          <SelectTrigger id="scheduleType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekday">По дням недели</SelectItem>
            <SelectItem value="date">Конкретная дата</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Группа (общий = пусто). z-[100] чтобы выпадающий список был поверх модалки. */}
      <div className="space-y-2">
        <Label htmlFor="groupId">Группа (пусто = общий шаблон)</Label>
        <Select
          value={groupId || "none"}
          onValueChange={(v) => setGroupId(v === "none" ? "" : v)}
        >
          <SelectTrigger id="groupId" className="w-full">
            <SelectValue placeholder="Общий шаблон" />
          </SelectTrigger>
          <SelectContent className="z-100">
            <SelectItem value="none">Общий шаблон</SelectItem>
            {groups
              .filter((g): g is GroupListItem & { id: number } => g.id != null)
              .map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Конкретная дата или дни недели */}
      {scheduleType === "date" ? (
        <div className="space-y-2">
          <Label htmlFor="specificDate">Дата</Label>
          <Input
            id="specificDate"
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            required={scheduleType === "date"}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>День начала</Label>
            <Select
              value={String(weekdayStart)}
              onValueChange={(v) => setWeekdayStart(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>День конца</Label>
            <Select
              value={String(weekdayEnd)}
              onValueChange={(v) => setWeekdayEnd(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Номер урока */}
      <div className="space-y-2">
        <Label htmlFor="lessonNumber">Номер урока</Label>
        <Input
          id="lessonNumber"
          type="number"
          min={1}
          value={lessonNumber}
          onChange={(e) => setLessonNumber(e.target.value)}
          required
        />
      </div>

      {/* Время начала / конца */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="startTime">Начало</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Конец</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Отмена
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Сохранение…" : isEdit ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  );
}
