/**
 * API для страницы «Здания»: список, поиск, создание, обновление, удаление.
 * Типы из OpenAPI (components).
 */

import { api } from "@/lib/api";

/** Ключи React Query для зданий (список и детали) */
export const BUILDINGS_QUERY_KEY = "admin-buildings" as const;
export const BUILDING_DETAIL_QUERY_KEY = "admin-building-detail" as const;
import { components } from "@/app/types/api";

/** Элемент списка зданий (BuildingResponseDto) */
export type BuildingListItem = components["schemas"]["BuildingResponseDto"] & {
  id?: number | null;
};

/** Мета пагинированного ответа */
export type PaginationMeta = components["schemas"]["ResponseMetaDto"];

/** Ответ списка зданий (GET /api/building или GET /api/building/search) */
export type BuildingsListResponse = {
  success: boolean;
  data: BuildingListItem[];
  meta?: PaginationMeta;
};

/** Ответ одного здания (create/update/get) */
export type BuildingResponse = {
  success: boolean;
  data: BuildingListItem;
  message?: string | null;
};

/** Параметры списка (без поиска) */
export type BuildingsListParams = {
  page: number;
  limit: number;
};

/** Параметры поиска зданий */
export type BuildingsSearchParams = BuildingsListParams & { query?: string };

const defaultLimit = 10;

/**
 * Список зданий: GET /api/building (пагинация, без поиска).
 */
export async function fetchBuildings(
  params: BuildingsListParams
): Promise<{ data: BuildingListItem[]; meta: PaginationMeta }> {
  const { page, limit = defaultLimit } = params;
  const res = await api.get<BuildingsListResponse>("/api/building", {
    params: { page, limit },
  });
  const body = res.data;
  if (!body.success || !body.data) throw new Error("Не удалось загрузить список зданий");
  return { data: body.data, meta: body.meta! };
}

/**
 * Поиск зданий: GET /api/building/search (query, page, limit).
 */
export async function fetchBuildingsSearch(
  params: BuildingsSearchParams
): Promise<{ data: BuildingListItem[]; meta: PaginationMeta }> {
  const { page, limit = defaultLimit, query } = params;
  const requestParams: Record<string, string | number> = { page, limit };
  if (query?.trim()) requestParams.query = query.trim();
  const res = await api.get<BuildingsListResponse>("/api/building/search", {
    params: requestParams,
  });
  const body = res.data;
  if (!body.success || !body.data) throw new Error("Не удалось выполнить поиск зданий");
  return { data: body.data, meta: body.meta! };
}

/**
 * Создать здание: POST /api/building.
 */
export async function createBuilding(body: { name: string }): Promise<BuildingListItem> {
  const res = await api.post<BuildingResponse>("/api/building", body);
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось создать здание");
  return data.data;
}

/**
 * Обновить здание: PATCH /api/building/:id.
 */
export async function updateBuilding(
  id: number,
  body: { name?: string }
): Promise<BuildingListItem> {
  const res = await api.patch<BuildingResponse>(`/api/building/${id}`, body);
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось обновить здание");
  return data.data;
}

/**
 * Удалить здание: DELETE /api/building/:id.
 */
export async function deleteBuilding(id: number): Promise<void> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/building/${id}`
  );
  if (!res.data.success) throw new Error(res.data.message ?? "Не удалось удалить здание");
}

// --- Этажи и аудитории (для карточек зданий) ---

/** Этаж с вложенными аудиториями */
export type FloorWithClassrooms = {
  id?: number | null;
  buildingId: number;
  number: number;
  classrooms?: ClassroomListItem[];
};

/** Аудитория в списке */
export type ClassroomListItem = {
  id?: number | null;
  floorId: number;
  name: string;
};

/** Здание с этажами и аудиториями (GET /api/building/:id?include=floors,floors.classrooms) */
export type BuildingWithFloors = BuildingListItem & {
  floors?: FloorWithClassrooms[];
};

/** Ответ здания с вложенными этажами и аудиториями */
export type BuildingWithFloorsResponse = {
  success: boolean;
  data: BuildingWithFloors;
  message?: string | null;
};

/**
 * Здание по id с этажами и аудиториями: GET /api/building/:id?include=floors,floors.classrooms.
 */
export async function fetchBuildingWithFloorsAndClassrooms(
  id: number
): Promise<BuildingWithFloors> {
  const res = await api.get<BuildingWithFloorsResponse>(`/api/building/${id}`, {
    params: { include: "floors,floors.classrooms" },
  });
  const body = res.data;
  if (!body.success || !body.data) throw new Error("Не удалось загрузить здание");
  return body.data;
}

/**
 * Создать этаж: POST /api/floor.
 */
export async function createFloor(
  body: { buildingId: number; number: number }
): Promise<FloorWithClassrooms> {
  const res = await api.post<{
    success: boolean;
    data: FloorWithClassrooms;
    message?: string | null;
  }>("/api/floor", body);
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось создать этаж");
  return data.data;
}

/**
 * Обновить этаж: PATCH /api/floor/:id (number — номер этажа).
 */
export async function updateFloor(
  id: number,
  body: { number?: number }
): Promise<FloorWithClassrooms> {
  const res = await api.patch<{
    success: boolean;
    data: FloorWithClassrooms;
    message?: string | null;
  }>(`/api/floor/${id}`, body);
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось обновить этаж");
  return data.data;
}

/**
 * Удалить этаж: DELETE /api/floor/:id.
 */
export async function deleteFloor(id: number): Promise<void> {
  const res = await api.delete<{ success: boolean; message?: string }>(`/api/floor/${id}`);
  if (!res.data.success) throw new Error(res.data.message ?? "Не удалось удалить этаж");
}

/**
 * Создать аудиторию: POST /api/classroom.
 */
export async function createClassroom(
  body: { floorId: number; name: string }
): Promise<ClassroomListItem> {
  const res = await api.post<{
    success: boolean;
    data: ClassroomListItem;
    message?: string | null;
  }>("/api/classroom", body);
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось создать аудиторию");
  return data.data;
}

/**
 * Обновить аудиторию: PATCH /api/classroom/:id (name — название).
 */
export async function updateClassroom(
  id: number,
  body: { name?: string }
): Promise<ClassroomListItem> {
  const res = await api.patch<{
    success: boolean;
    data: ClassroomListItem;
    message?: string | null;
  }>(`/api/classroom/${id}`, body);
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось обновить аудиторию");
  return data.data;
}

/**
 * Удалить аудиторию: DELETE /api/classroom/:id.
 */
export async function deleteClassroom(id: number): Promise<void> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/classroom/${id}`
  );
  if (!res.data.success) throw new Error(res.data.message ?? "Не удалось удалить аудиторию");
}
