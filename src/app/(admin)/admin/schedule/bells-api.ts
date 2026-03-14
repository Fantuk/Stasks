/**
 * API для раздела «Звонки»: шаблоны звонков (список, создание, обновление, удаление, bulk scope).
 * Типы согласованы с OpenAPI (BellTemplateResponseDto, CreateBellTemplateDto и т.д.).
 */

import { api } from "@/lib/api";
import { components } from "@/app/types/api";

/**
 * Один слот шаблона звонков (одна строка: номер урока + время начала/конца + scope).
 * Типы полей приведены к реальным (API в OpenAPI часть полей отдаёт как Record<string, never>).
 */
export type BellTemplateSlot = Omit<
  components["schemas"]["BellTemplateResponseDto"],
  "id" | "groupId" | "specificDate" | "weekdayStart" | "weekdayEnd"
> & {
  id: number | null;
  groupId?: number | null;
  specificDate?: string | Date | null;
  weekdayStart?: number | null;
  weekdayEnd?: number | null;
  secondStartTime?: string | Date | null;
  secondEndTime?: string | Date | null;
};

/** Мета пагинированного ответа */
export type PaginationMeta = components["schemas"]["ResponseMetaDto"];

/** Ответ списка шаблонов (GET /api/bell-template) */
export type BellTemplatesListResponse = {
  success: boolean;
  data: BellTemplateSlot[];
  meta?: PaginationMeta;
};

/** Ответ одного шаблона (create/update/get) */
export type BellTemplateResponse = {
  success: boolean;
  data: BellTemplateSlot;
  message?: string | null;
};

/** Параметры списка с фильтрами */
export type BellTemplatesListParams = {
  page?: number;
  limit?: number;
  groupId?: number;
  scheduleType?: "date" | "weekday";
};

/** Тело создания слота */
export type CreateBellTemplateBody = {
  groupId?: number | null;
  scheduleType: "date" | "weekday";
  specificDate?: string | null;
  weekdayStart?: number | null;
  weekdayEnd?: number | null;
  lessonNumber: number;
  startTime: string;
  endTime: string;
  secondStartTime?: string | null;
  secondEndTime?: string | null;
};

/** Тело обновления слота (все поля опциональны) */
export type UpdateBellTemplateBody = Partial<CreateBellTemplateBody>;

/** Фильтр scope для bulk-операций */
export type BulkScopeFilter = {
  groupId?: number | null;
  scheduleType: "date" | "weekday";
  weekdayStart?: number;
  weekdayEnd?: number;
  specificDate?: string;
};

/** Обновление scope для bulk PATCH */
export type BulkScopeUpdate = {
  groupId?: number | null;
  scheduleType?: "date" | "weekday";
  specificDate?: string;
  weekdayStart?: number;
  weekdayEnd?: number;
};

const defaultLimit = 100;

/**
 * Список шаблонов звонков: GET /api/bell-template (пагинация, фильтры groupId, scheduleType).
 */
export async function fetchBellTemplates(
  params: BellTemplatesListParams = {}
): Promise<{ data: BellTemplateSlot[]; meta: PaginationMeta }> {
  const { page = 1, limit = defaultLimit, groupId, scheduleType } = params;
  const requestParams: Record<string, string | number> = { page, limit };
  if (groupId != null) requestParams.groupId = groupId;
  if (scheduleType) requestParams.scheduleType = scheduleType;

  const res = await api.get<BellTemplatesListResponse>("/api/bell-template", {
    params: requestParams,
  });
  const body = res.data;
  if (!body.success || !Array.isArray(body.data))
    throw new Error("Не удалось загрузить список шаблонов звонков");
  return { data: body.data, meta: body.meta! };
}

/**
 * Создать слот шаблона звонков: POST /api/bell-template.
 */
export async function createBellTemplate(
  body: CreateBellTemplateBody
): Promise<BellTemplateSlot> {
  const res = await api.post<BellTemplateResponse>("/api/bell-template", body);
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось создать шаблон звонков");
  return data.data;
}

/**
 * Обновить слот: PATCH /api/bell-template/:id.
 */
export async function updateBellTemplate(
  id: number,
  body: UpdateBellTemplateBody
): Promise<BellTemplateSlot> {
  const res = await api.patch<BellTemplateResponse>(
    `/api/bell-template/${id}`,
    body
  );
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось обновить шаблон звонков");
  return data.data;
}

/**
 * Удалить слот: DELETE /api/bell-template/:id.
 */
export async function deleteBellTemplate(id: number): Promise<void> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/bell-template/${id}`
  );
  if (!res.data.success) throw new Error(res.data.message ?? "Не удалось удалить");
}

/**
 * Массово обновить scope: PATCH /api/bell-template/bulk-scope.
 */
export async function bulkUpdateBellScope(body: {
  filter: BulkScopeFilter;
  update: BulkScopeUpdate;
}): Promise<{ count: number }> {
  const res = await api.patch<{
    success: boolean;
    data: { count: number };
    message?: string;
  }>("/api/bell-template/bulk-scope", body);
  if (!res.data.success) throw new Error(res.data.message ?? "Ошибка обновления");
  return res.data.data;
}

/**
 * Удалить все слоты по scope: DELETE /api/bell-template/bulk-scope.
 */
export async function bulkDeleteBellScope(body: {
  filter: BulkScopeFilter;
}): Promise<{ count: number }> {
  const res = await api.delete<{
    success: boolean;
    data: { count: number };
    message?: string;
  }>("/api/bell-template/bulk-scope", { data: body });
  if (!res.data.success) throw new Error(res.data.message ?? "Ошибка удаления");
  return res.data.data;
}
