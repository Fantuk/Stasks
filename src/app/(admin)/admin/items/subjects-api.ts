/**
 * API для страницы «Предметы»: список, поиск, создание, удаление.
 * Типы из OpenAPI (components).
 */

import { api } from "@/lib/api";
import { components } from "@/app/types/api";

/** Элемент списка предметов (SubjectResponseDto). id в ответе API — number. */
export type SubjectListItem = Omit<
  components["schemas"]["SubjectResponseDto"],
  "id"
> & { id?: number | null };

/** Преподаватель в ответе предмета (GET ...?include=teachers). user — для отображения имени. */
export type SubjectTeacher = {
  id?: number | null;
  userId: number;
  user?: { name: string; surname: string; patronymic?: string | null };
};

/** Предмет с опциональным списком преподавателей (для таблицы). */
export type SubjectWithTeachers = SubjectListItem & {
  teachers?: SubjectTeacher[];
};

/** Группа в ответе предмета (GET ...?include=groups). id, name — для отображения и assign/unassign. */
export type SubjectGroupItem = {
  id: number;
  institutionId?: number;
  name: string;
};

/** Предмет с опциональным списком групп (для формы редактирования). */
export type SubjectWithGroups = SubjectListItem & {
  groups?: SubjectGroupItem[];
};

/** Предмет с преподавателями и группами (GET ...?include=teachers,groups). */
export type SubjectWithTeachersAndGroups = SubjectWithTeachers & SubjectWithGroups;

/** Мета пагинированного ответа */
export type PaginationMeta = components["schemas"]["ResponseMetaDto"];

/** Ответ списка предметов (GET /api/subject или GET /api/subject/search) */
export type SubjectsListResponse = {
  success: boolean;
  data: SubjectListItem[];
  meta?: PaginationMeta;
};

/** Ответ одного предмета (create/update/get) */
export type SubjectResponse = {
  success: boolean;
  data: SubjectListItem;
  message?: string | null;
};

/** Параметры списка (без поиска) */
export type SubjectsListParams = {
  page: number;
  limit: number;
  sort?: string;
  order?: "asc" | "desc";
};

/** Параметры поиска предметов */
export type SubjectsSearchParams = SubjectsListParams & { query?: string };

const defaultLimit = 10;

/**
 * Список предметов: GET /api/subject (пагинация, без поиска).
 */
export async function fetchSubjects(
  params: SubjectsListParams
): Promise<{ data: SubjectListItem[]; meta: PaginationMeta }> {
  const { page, limit = defaultLimit, sort, order } = params;
  const requestParams: Record<string, string | number> = { page, limit };
  if (sort) requestParams.sort = sort;
  if (order) requestParams.order = order;
  const res = await api.get<SubjectsListResponse>("/api/subject", {
    params: requestParams,
  });
  const body = res.data;
  if (!body.success || !body.data)
    throw new Error("Не удалось загрузить список предметов");
  return { data: body.data, meta: body.meta! };
}

/**
 * Поиск предметов: GET /api/subject/search (query, page, limit).
 */
export async function fetchSubjectsSearch(
  params: SubjectsSearchParams
): Promise<{ data: SubjectListItem[]; meta: PaginationMeta }> {
  const { page, limit = defaultLimit, query, sort, order } = params;
  const requestParams: Record<string, string | number> = { page, limit };
  if (query?.trim()) requestParams.query = query.trim();
  if (sort) requestParams.sort = sort;
  if (order) requestParams.order = order;
  const res = await api.get<SubjectsListResponse>("/api/subject/search", {
    params: requestParams,
  });
  const body = res.data;
  if (!body.success || !body.data)
    throw new Error("Не удалось выполнить поиск предметов");
  return { data: body.data, meta: body.meta! };
}

/**
 * Создать предмет: POST /api/subject.
 */
export async function createSubject(body: {
  name: string;
}): Promise<SubjectListItem> {
  const res = await api.post<SubjectResponse>("/api/subject", body);
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось создать предмет");
  return data.data;
}

/**
 * Удалить предмет: DELETE /api/subject/:id.
 */
export async function deleteSubject(id: number): Promise<void> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/subject/${id}`
  );
  if (!res.data.success)
    throw new Error(res.data.message ?? "Не удалось удалить предмет");
}

/**
 * Обновить предмет: PATCH /api/subject/:id.
 */
export async function updateSubject(
  id: number,
  body: { name?: string }
): Promise<SubjectListItem> {
  const res = await api.patch<SubjectResponse>(`/api/subject/${id}`, body);
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось обновить предмет");
  return data.data;
}

/** Ответ POST /api/subject/:id/teachers */
type SubjectAssignTeachersResponse = {
  success: boolean;
  data: SubjectListItem & { teachers?: SubjectTeacher[] };
  message?: string | null;
};

/**
 * Привязать преподавателей к предмету: POST /api/subject/:id/teachers.
 * teacherIds — массив userId преподавателей.
 */
export async function assignSubjectTeachers(
  subjectId: number,
  teacherIds: number[]
): Promise<SubjectWithTeachers> {
  if (teacherIds.length === 0) return fetchSubjectById(subjectId, "teachers");
  const res = await api.post<SubjectAssignTeachersResponse>(
    `/api/subject/${subjectId}/teachers`,
    { teacherIds }
  );
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось привязать преподавателей к предмету");
  return data.data as SubjectWithTeachers;
}

/**
 * Отвязать преподавателя от предмета: DELETE /api/subject/:id/teachers/:teacherId.
 * teacherId — userId преподавателя.
 */
export async function unassignSubjectTeacher(
  subjectId: number,
  teacherId: number
): Promise<void> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/subject/${subjectId}/teachers/${teacherId}`
  );
  if (!res.data.success)
    throw new Error(res.data.message ?? "Не удалось отвязать преподавателя от предмета");
}

/** Ответ POST /api/subject/:id/groups */
type SubjectAssignGroupsResponse = {
  success: boolean;
  data: SubjectListItem & { groups?: SubjectGroupItem[] };
  message?: string | null;
};

/**
 * Привязать группы к предмету: POST /api/subject/:id/groups.
 * groupIds — массив id групп.
 */
export async function assignSubjectGroups(
  subjectId: number,
  groupIds: number[]
): Promise<SubjectWithTeachersAndGroups> {
  if (groupIds.length === 0)
    return fetchSubjectById(subjectId, "teachers,groups");
  const res = await api.post<SubjectAssignGroupsResponse>(
    `/api/subject/${subjectId}/groups`,
    { groupIds }
  );
  const data = res.data;
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Не удалось привязать группы к предмету");
  return data.data as SubjectWithTeachersAndGroups;
}

/**
 * Отвязать группу от предмета: DELETE /api/subject/:id/groups/:groupId.
 */
export async function unassignSubjectGroup(
  subjectId: number,
  groupId: number
): Promise<void> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/subject/${subjectId}/groups/${groupId}`
  );
  if (!res.data.success)
    throw new Error(res.data.message ?? "Не удалось отвязать группу от предмета");
}

/** Ответ предмета по id с опциональным include (teachers, groups или teachers,groups). */
type SubjectByIdResponse = {
  success: boolean;
  data: SubjectListItem & {
    teachers?: SubjectTeacher[];
    groups?: SubjectGroupItem[];
  };
  message?: string | null;
};

/**
 * Предмет по id: GET /api/subject/:id. При include=teachers и/или include=groups в data приходят teachers и/или groups.
 */
export async function fetchSubjectById(
  id: number,
  include?: string
): Promise<SubjectWithTeachersAndGroups> {
  const params = include ? { include } : undefined;
  const res = await api.get<SubjectByIdResponse>(`/api/subject/${id}`, {
    params,
  });
  const body = res.data;
  if (!body.success || !body.data)
    throw new Error("Не удалось загрузить данные предмета");
  return body.data as SubjectWithTeachersAndGroups;
}

/**
 * Список предметов с подгрузкой преподавателей для каждой строки (для таблицы).
 */
export async function fetchSubjectsWithTeachers(
  params: SubjectsListParams
): Promise<{ data: SubjectWithTeachers[]; meta: PaginationMeta }> {
  const { data, meta } = await fetchSubjects(params);
  const withTeachers = await Promise.all(
    data.map(async (s) => {
      if (s.id == null) return s as SubjectWithTeachers;
      const full = await fetchSubjectById(s.id, "teachers");
      return { ...s, teachers: full.teachers ?? [] };
    })
  );
  return { data: withTeachers, meta };
}

/**
 * Поиск предметов с подгрузкой преподавателей для каждой строки (для таблицы).
 */
export async function fetchSubjectsSearchWithTeachers(
  params: SubjectsSearchParams
): Promise<{ data: SubjectWithTeachers[]; meta: PaginationMeta }> {
  const { data, meta } = await fetchSubjectsSearch(params);
  const withTeachers = await Promise.all(
    data.map(async (s) => {
      if (s.id == null) return s as SubjectWithTeachers;
      const full = await fetchSubjectById(s.id, "teachers");
      return { ...s, teachers: full.teachers ?? [] };
    })
  );
  return { data: withTeachers, meta };
}

/** Собрать отображаемое имя преподавателя из user (фамилия имя отчество). */
export function formatTeacherDisplayName(t: SubjectTeacher): string {
  const u = t.user;
  if (!u) return "—";
  const parts = [u.surname, u.name, u.patronymic].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}
