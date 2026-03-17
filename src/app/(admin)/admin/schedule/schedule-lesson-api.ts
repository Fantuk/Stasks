/**
 * API и типы для занятий расписания (модалка создания/редактирования и список).
 * Используется в AdminScheduleContent и ScheduleLessonModal.
 */

import { api } from "@/lib/api";
import { components } from "@/app/types/api";

type RawScheduleDto = components["schemas"]["ScheduleResponseDto"];
type RawBellTemplateDto = components["schemas"]["BellTemplateSlotDto"];
type CreateScheduleDto = components["schemas"]["CreateScheduleDto"];
type ClassroomDto = components["schemas"]["ClassroomResponseDto"];

export interface ScheduleItem extends Omit<
  RawScheduleDto,
  "id" | "classroomId" | "bellTemplate"
> {
  id: number;
  classroomId?: number | null;
  bellTemplate?: RawBellTemplateDto | null;
  /** Слот занятия: одинаковый у подгрупп одного занятия (приходит с API) */
  scheduleSlotId?: string | null;
}

export interface ClassroomListItem extends Omit<ClassroomDto, "id"> {
  id?: number | null;
}

/** Результат запроса списка занятий для вкладки «Предметы» */
export interface SubjectsScheduleQueryResult {
  items: ScheduleItem[];
  meta?: components["schemas"]["ResponseMetaDto"];
}

/**
 * Список занятий для вкладки «Предметы» расписания.
 * GET /api/schedule с фильтрами по группе, преподавателю и неделе, expand=subject,teacher,classroom.
 */
export async function fetchSubjectsSchedule(params: {
  groupId?: number | null;
  teacherId?: number | null;
  dateFrom: string;
  dateTo: string;
}): Promise<SubjectsScheduleQueryResult> {
  const requestParams: Record<string, string | number> = {
    page: 1,
    limit: 100,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };
  if (params.groupId != null) requestParams.groupId = params.groupId;
  if (params.teacherId != null) requestParams.teacherId = params.teacherId;
  (requestParams as Record<string, unknown>).expand = "subject,teacher,classroom";

  const res = await api.get<{
    success: boolean;
    data: RawScheduleDto[];
    meta?: components["schemas"]["ResponseMetaDto"];
  }>("/api/schedule", { params: requestParams });

  const body = res.data;
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error("Не удалось загрузить расписание по предметам");
  }

  const items: ScheduleItem[] = body.data.map((dto) => ({
    ...dto,
    id: (dto as unknown as { id: number }).id,
    classroomId: (dto as unknown as { classroomId?: number | null }).classroomId ?? null,
    bellTemplate: (dto as unknown as { bellTemplate?: RawBellTemplateDto | null }).bellTemplate ?? null,
    scheduleSlotId: (dto as unknown as { scheduleSlotId?: string | null }).scheduleSlotId ?? null,
  }));

  return { items, meta: body.meta };
}

/** Тело создания занятия (classroomId опционально: null = удалённое занятие) */
type CreateScheduleBody = Omit<CreateScheduleDto, "classroomId"> & {
  scheduleSlotId?: string;
  classroomId?: number | null;
};

/** Тело обновления (classroomId опционально, null = удалённое занятие) */
export type UpdateScheduleBody = Partial<Omit<CreateScheduleDto, "classroomId">> & {
  classroomId?: number | null;
};

/**
 * Поиск аудиторий для выпадающего списка в модалке.
 * GET /api/classroom/search (без фильтра по этажу).
 */
export async function fetchClassroomsSearch(): Promise<ClassroomListItem[]> {
  const res = await api.get<{
    success: boolean;
    data: ClassroomDto[];
  }>("/api/classroom/search", {
    params: { page: 1, limit: 100 },
  });
  const body = res.data;
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error("Не удалось загрузить список аудиторий");
  }
  return body.data.map((dto) => ({
    ...dto,
    id: (dto as unknown as { id?: number | null }).id ?? null,
  }));
}

/** Создать занятие: POST /api/schedule */
export async function createScheduleLesson(
  body: CreateScheduleBody,
): Promise<ScheduleItem> {
  const res = await api.post<{
    success: boolean;
    data: RawScheduleDto;
    message?: string | null;
  }>("/api/schedule", body);
  const data = res.data;
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Не удалось создать занятие");
  }
  const dto = data.data;
  return {
    ...dto,
    id: (dto as unknown as { id: number }).id,
    classroomId:
      (dto as unknown as { classroomId?: number | null }).classroomId ?? null,
    bellTemplate:
      (dto as unknown as { bellTemplate?: RawBellTemplateDto | null })
        .bellTemplate ?? null,
    scheduleSlotId:
      (dto as unknown as { scheduleSlotId?: string | null }).scheduleSlotId ?? null,
  };
}

/** Обновить занятие: PATCH /api/schedule/:id */
export async function updateScheduleLesson(
  id: number,
  body: UpdateScheduleBody,
): Promise<ScheduleItem> {
  const res = await api.patch<{
    success: boolean;
    data: RawScheduleDto;
    message?: string | null;
  }>(`/api/schedule/${id}`, body);
  const data = res.data;
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Не удалось обновить занятие");
  }
  const dto = data.data;
  return {
    ...dto,
    id: (dto as unknown as { id: number }).id,
    classroomId:
      (dto as unknown as { classroomId?: number | null }).classroomId ?? null,
    bellTemplate:
      (dto as unknown as { bellTemplate?: RawBellTemplateDto | null })
        .bellTemplate ?? null,
  };
}

/** Удалить занятие: DELETE /api/schedule/:id */
export async function deleteScheduleLesson(id: number): Promise<void> {
  const res = await api.delete<{
    success: boolean;
    message?: string | null;
  }>(`/api/schedule/${id}`);
  const data = res.data;
  if (!data.success) {
    throw new Error(data.message ?? "Не удалось удалить занятие");
  }
}
