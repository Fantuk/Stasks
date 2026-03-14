/**
 * API для страницы просмотра расписания: загрузка занятий по группе/преподавателю и датам.
 * Типы и запрос согласованы с бэкендом (ScheduleQueryDto, expand).
 */

import { api } from "@/lib/api";
import { components } from "@/app/types/api";

type RawScheduleDto = components["schemas"]["ScheduleResponseDto"];
type RawBellTemplateDto = components["schemas"]["BellTemplateSlotDto"];

/** Элемент расписания с нормализованными полями ответа API */
export interface ScheduleViewItem extends Omit<
  RawScheduleDto,
  "id" | "bellTemplateId" | "classroomId" | "bellTemplate"
> {
  id: number;
  /** Может быть null, если шаблон звонков не привязан */
  bellTemplateId?: number | null;
  classroomId?: number | null;
  bellTemplate?: RawBellTemplateDto | null;
  scheduleSlotId?: string | null;
}

export interface ScheduleViewResult {
  items: ScheduleViewItem[];
  meta?: components["schemas"]["ResponseMetaDto"];
}

/**
 * Список занятий для просмотра: GET /api/schedule с фильтрами и expand.
 * Доступен всем авторизованным пользователям.
 */
export async function fetchScheduleView(params: {
  groupId?: number | null;
  teacherId?: number | null;
  dateFrom: string;
  dateTo: string;
}): Promise<ScheduleViewResult> {
  const requestParams: Record<string, string | number> = {
    page: 1,
    limit: 100,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };
  if (params.groupId != null) requestParams.groupId = params.groupId;
  if (params.teacherId != null) requestParams.teacherId = params.teacherId;
  (requestParams as Record<string, string>).expand = "subject,teacher,classroom";

  const res = await api.get<{
    success: boolean;
    data: RawScheduleDto[];
    meta?: components["schemas"]["ResponseMetaDto"];
  }>("/api/schedule", { params: requestParams });

  const body = res.data;
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error("Не удалось загрузить расписание");
  }

  const items: ScheduleViewItem[] = body.data.map((dto) => {
    const raw = dto as unknown as {
      id: number;
      bellTemplateId?: number | null;
      classroomId?: number | null;
      bellTemplate?: RawBellTemplateDto | null;
      scheduleSlotId?: string | null;
    };
    return {
      ...dto,
      id: raw.id,
      bellTemplateId: raw.bellTemplateId ?? null,
      classroomId: raw.classroomId ?? null,
      bellTemplate: raw.bellTemplate ?? null,
      scheduleSlotId: raw.scheduleSlotId ?? null,
    };
  });

  return { items, meta: body.meta };
}
