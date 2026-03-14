/**
 * API для страницы «Группы»: список, поиск, создание, обновление, удаление.
 * Типы из OpenAPI (components).
 */

import { api } from "@/lib/api";
import { components } from "@/app/types/api";

/** Куратор группы в списке (GroupMentorDto) */
export type GroupMentor = {
  id: number;
  userId: number;
  displayName: string;
};

/** Элемент списка групп (GroupResponseDto). id в ответе API — number. studentCount, mentor — в списке/поиске. */
export type GroupListItem = Omit<
  components["schemas"]["GroupResponseDto"],
  "id"
> & { id?: number | null; studentCount?: number; mentor?: GroupMentor };

/** Мета пагинированного ответа */
export type PaginationMeta = components["schemas"]["ResponseMetaDto"];

/** Ответ списка групп (GET /api/group или GET /api/group/search) */
export type GroupsListResponse = {
  success: boolean;
  data: GroupListItem[];
  meta?: PaginationMeta;
};

/** Ответ одной группы (create/update/get) */
export type GroupResponse = {
  success: boolean;
  data: GroupListItem;
  message?: string | null;
};

/** Параметры списка (без поиска) */
export type GroupsListParams = {
  page: number;
  limit: number;
  sort?: string;
  order?: "asc" | "desc";
};

/** Параметры поиска групп */
export type GroupsSearchParams = GroupsListParams & { query?: string };

const defaultLimit = 10;

/**
 * Список групп: GET /api/group (пагинация, без поиска).
 */
export async function fetchGroups(
  params: GroupsListParams
): Promise<{ data: GroupListItem[]; meta: PaginationMeta }> {
  const { page, limit = defaultLimit, sort, order } = params;
  const requestParams: Record<string, string | number> = { page, limit };
  if (sort) requestParams.sort = sort;
  if (order) requestParams.order = order;
  const res = await api.get<GroupsListResponse>("/api/group", {
    params: requestParams,
  });
  const body = res.data;
  if (!body.success || !body.data) throw new Error("Не удалось загрузить список групп");
  return { data: body.data, meta: body.meta! };
}

/**
 * Поиск групп: GET /api/group/search (query, page, limit).
 */
export async function fetchGroupsSearch(
  params: GroupsSearchParams
): Promise<{ data: GroupListItem[]; meta: PaginationMeta }> {
  const { page, limit = defaultLimit, query, sort, order } = params;
  const requestParams: Record<string, string | number> = { page, limit };
  if (query?.trim()) requestParams.query = query.trim();
  if (sort) requestParams.sort = sort;
  if (order) requestParams.order = order;
  const res = await api.get<GroupsListResponse>("/api/group/search", {
    params: requestParams,
  });
  const body = res.data;
  if (!body.success || !body.data) throw new Error("Не удалось выполнить поиск групп");
  return { data: body.data, meta: body.meta! };
}

/**
 * Создать группу: POST /api/group.
 */
export async function createGroup(body: { name: string }): Promise<GroupListItem> {
  const res = await api.post<GroupResponse>("/api/group", body);
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось создать группу");
  return data.data;
}

/**
 * Обновить группу: PATCH /api/group/:id.
 */
export async function updateGroup(
  id: number,
  body: { name?: string }
): Promise<GroupListItem> {
  const res = await api.patch<GroupResponse>(`/api/group/${id}`, body);
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось обновить группу");
  return data.data;
}

/**
 * Удалить группу: DELETE /api/group/:id.
 */
export async function deleteGroup(id: number): Promise<void> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/group/${id}`
  );
  if (!res.data.success) throw new Error(res.data.message ?? "Не удалось удалить группу");
}

/** Студент в ответе группы (GET ...?include=members) */
export type GroupStudentItem = {
  userId: number;
  user?: { name?: string; surname?: string; patronymic?: unknown };
};

/** Группа с куратором и студентами (GET /api/group/:id?include=members) */
export type GroupWithMembers = GroupListItem & {
  teacher?: GroupMentor | null;
  students?: GroupStudentItem[];
};

type GroupByIdResponse = {
  success: boolean;
  data: GroupWithMembers;
  message?: string | null;
};

/**
 * Группа по id: GET /api/group/:id. При include=members в data приходят teacher и students.
 */
export async function fetchGroupById(
  id: number,
  include?: string
): Promise<GroupWithMembers> {
  const params = include ? { include } : undefined;
  const res = await api.get<GroupByIdResponse>(`/api/group/${id}`, { params });
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось загрузить группу");
  return data.data as GroupWithMembers;
}

/**
 * Назначить куратора группы: POST /api/group/:id/teacher.
 */
export async function assignGroupTeacher(
  groupId: number,
  teacherUserId: number
): Promise<GroupListItem> {
  const res = await api.post<GroupResponse>(`/api/group/${groupId}/teacher`, {
    teacherUserId,
  });
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось назначить куратора");
  return data.data;
}

/**
 * Убрать куратора группы: DELETE /api/group/:id/teacher.
 */
export async function unassignGroupTeacher(
  groupId: number
): Promise<GroupListItem> {
  const res = await api.delete<GroupResponse>(`/api/group/${groupId}/teacher`);
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось убрать куратора");
  return data.data;
}

/**
 * Привязать студентов к группе: POST /api/group/:id/students.
 */
export async function assignGroupStudents(
  groupId: number,
  studentUserIds: number[]
): Promise<GroupListItem> {
  if (studentUserIds.length === 0)
    return api.get<GroupResponse>(`/api/group/${groupId}`).then((r) => r.data.data!);
  const res = await api.post<GroupResponse>(`/api/group/${groupId}/students`, {
    studentUserIds,
  });
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось привязать студентов");
  return data.data;
}

/**
 * Отвязать студентов от группы: DELETE /api/group/:id/students.
 */
export async function unassignGroupStudents(
  groupId: number,
  studentUserIds: number[]
): Promise<GroupListItem> {
  if (studentUserIds.length === 0)
    return api.get<GroupResponse>(`/api/group/${groupId}`).then((r) => r.data.data!);
  const res = await api.delete<GroupResponse>(`/api/group/${groupId}/students`, {
    data: { studentUserIds },
  });
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось отвязать студентов");
  return data.data;
}
