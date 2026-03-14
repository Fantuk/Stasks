/**
 * API-функции и типы для списков пользователей по ролям (студенты, преподаватели, модераторы).
 * Используются с TanStack Query (useQuery).
 * Типы приведены к сгенерированным из OpenAPI (components).
 */

import { api } from "@/lib/api";
import { components } from "@/app/types/api";

// --- Алиасы из OpenAPI schemas ---

/** Мета пагинированного ответа (ResponseMetaDto) */
export type PaginationMeta = components["schemas"]["ResponseMetaDto"];

/** Краткий тип предмета в ответе преподавателя (бэкенд возвращает в списке) */
export type TeacherSubjectSummary = { id: number; name: string };

/** Элемент списка преподавателей (TeacherResponseDto + subjects из API) */
export type TeacherListItem = components["schemas"]["TeacherResponseDto"] & {
  subjects?: TeacherSubjectSummary[];
};

/** Элемент списка модераторов (ModeratorResponseDto) */
export type ModeratorListItem = components["schemas"]["ModeratorResponseDto"];

/**
 * Элемент из GET /api/users/search?roles=STUDENT&include=student.
 * В схеме OpenAPI — UserResponseDto[]; при include=student бэкенд добавляет вложенное student с group.
 */
export type UserSearchStudentItem = components["schemas"]["UserResponseDto"] & {
  student?: {
    userId: number;
    groupId: number | null;
    group?: components["schemas"]["GroupResponseDto"];
  };
};

/** Ответ списка студентов (users/search) */
export type StudentsResponse = {
  success: boolean;
  data: UserSearchStudentItem[];
  meta?: PaginationMeta;
};

/** Ответ списка преподавателей (GET /api/teacher) */
export type TeachersResponse = {
  success: boolean;
  data: TeacherListItem[];
  meta?: PaginationMeta;
};

/** Ответ списка модераторов (GET /api/moderator) */
export type ModeratorsResponse = {
  success: boolean;
  data: ModeratorListItem[];
  meta?: PaginationMeta;
};

export type StudentsQueryParams = {
  page: number;
  limit: number;
  query?: string;
};

export type ListQueryParams = {
  page: number;
  limit: number;
  query?: string;
};

const defaultLimit = 10;

/** Ключ TanStack Query для списка студентов (для инвалидации после обновления) */
export const STUDENTS_QUERY_KEY = "users-students" as const;

/**
 * Загрузка списка студентов: GET /api/users/search?roles=STUDENT
 */
export async function fetchStudents(
  params: StudentsQueryParams
): Promise<{ data: UserSearchStudentItem[]; meta: PaginationMeta }> {
  const { page, limit = defaultLimit, query } = params;
  const requestParams: Record<string, string | number> = {
    roles: "STUDENT",
    page,
    limit,
    include: "student",
  };
  if (query?.trim()) requestParams.query = query.trim();
  const res = await api.get<StudentsResponse>("/api/users/search", {
    params: requestParams,
  });
  const body = res.data;
  if (!body.success || !body.data) throw new Error("Не удалось загрузить список студентов");
  // Пагинированные эндпоинты всегда возвращают meta
  return { data: body.data, meta: body.meta! };
}

/**
 * Загрузка списка преподавателей: GET /api/teacher
 */
export async function fetchTeachers(
  params: ListQueryParams
): Promise<{ data: TeacherListItem[]; meta: PaginationMeta }> {
  const { page, limit = defaultLimit, query } = params;
  const requestParams: Record<string, string | number> = { page, limit };
  if (query?.trim()) requestParams.query = query.trim();
  const res = await api.get<TeachersResponse>("/api/teacher", { params: requestParams });
  const body = res.data;
  if (!body.success || !body.data) throw new Error("Не удалось загрузить список преподавателей");
  return { data: body.data, meta: body.meta! };
}

/**
 * Загрузка списка модераторов: GET /api/moderator
 */
export async function fetchModerators(
  params: ListQueryParams
): Promise<{ data: ModeratorListItem[]; meta: PaginationMeta }> {
  const { page, limit = defaultLimit, query } = params;
  const requestParams: Record<string, string | number> = { page, limit };
  if (query?.trim()) requestParams.query = query.trim();
  const res = await api.get<ModeratorsResponse>("/api/moderator", { params: requestParams });
  const body = res.data;
  if (!body.success || !body.data) throw new Error("Не удалось загрузить список модераторов");
  return { data: body.data, meta: body.meta! };
}

// --- Обновление пользователя и привязка студента к группе ---

/** Тело запроса PATCH /api/users/:id (частичное обновление) */
export type UpdateUserBody = components["schemas"]["UpdateUserDto"];

/** Ответ PATCH /api/users/:id */
type UserUpdateResponse = {
  success: boolean;
  data: components["schemas"]["UserResponseDto"];
  message?: string;
};

/**
 * Обновить пользователя: PATCH /api/users/:id
 */
export async function updateUser(
  id: number,
  body: UpdateUserBody
): Promise<components["schemas"]["UserResponseDto"]> {
  const res = await api.patch<UserUpdateResponse>(`/api/users/${id}`, body);
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось обновить пользователя");
  return data.data;
}

/** Ответ PATCH /api/student/:userId/group */
type AssignGroupResponse = {
  success: boolean;
  data: components["schemas"]["StudentResponseDto"];
  message?: string;
};

/**
 * Привязать студента к группе: PATCH /api/student/:userId/group
 */
export async function assignStudentToGroup(
  userId: number,
  groupId: number
): Promise<components["schemas"]["StudentResponseDto"]> {
  const res = await api.patch<AssignGroupResponse>(`/api/student/${userId}/group`, { groupId });
  const data = res.data;
  if (!data.success || !data.data) throw new Error(data.message ?? "Не удалось привязать студента к группе");
  return data.data;
}

/**
 * Отвязать студента от группы: DELETE /api/student/:userId/group
 */
export async function removeStudentFromGroup(userId: number): Promise<void> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/student/${userId}/group`
  );
  if (!res.data.success) throw new Error(res.data.message ?? "Не удалось отвязать студента от группы");
}

// --- Курируемая группа преподавателя ---

/** Ключ TanStack Query для списка преподавателей */
export const TEACHERS_QUERY_KEY = "users-teachers" as const;

type TeacherMentoredGroupResponse = {
  success: boolean;
  data: TeacherListItem;
  message?: string;
};

/**
 * Назначить курируемую группу преподавателю: PATCH /api/teacher/:userId/mentored-group
 */
export async function assignTeacherMentoredGroup(
  userId: number,
  groupId: number
): Promise<TeacherListItem> {
  const res = await api.patch<TeacherMentoredGroupResponse>(
    `/api/teacher/${userId}/mentored-group`,
    { groupId }
  );
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось назначить группу преподавателю");
  return data.data;
}

/**
 * Убрать курируемую группу у преподавателя: DELETE /api/teacher/:userId/mentored-group
 */
export async function removeTeacherMentoredGroup(
  userId: number
): Promise<TeacherListItem> {
  const res = await api.delete<TeacherMentoredGroupResponse>(
    `/api/teacher/${userId}/mentored-group`
  );
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось убрать группу у преподавателя");
  return data.data;
}

// --- Права модератора ---

/** Ключ TanStack Query для списка модераторов */
export const MODERATORS_QUERY_KEY = "users-moderators" as const;

/** Права доступа модератора (PATCH /api/moderator/:userId) */
export type ModeratorAccessRightsBody = {
  canDeleteUsers?: boolean;
  canRegisterUsers?: boolean;
};

type ModeratorUpdateResponse = {
  success: boolean;
  data: ModeratorListItem;
  message?: string;
};

/**
 * Обновить права доступа модератора: PATCH /api/moderator/:userId
 */
export async function updateModeratorAccessRights(
  userId: number,
  body: ModeratorAccessRightsBody
): Promise<ModeratorListItem> {
  const res = await api.patch<ModeratorUpdateResponse>(
    `/api/moderator/${userId}`,
    body
  );
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось обновить права модератора");
  return data.data;
}
