/**
 * Типы для ответа GET /api/users/me?include=profiles.
 * Соответствуют бэкенду: UserWithProfilesResponse.
 */

import type { Role } from "@/stores/auth.store";

/** Краткие данные группы (студент / куратор) */
export interface GroupSummary {
  id: number;
  institutionId: number;
  name: string;
}

/** Краткие данные предмета (преподаватель) */
export interface SubjectSummary {
  id: number;
  name: string;
}

/** Профиль студента (при include=profiles) */
export interface StudentProfile {
  id: number | null;
  userId: number;
  groupId: number | null;
  group?: GroupSummary;
}

/** Профиль преподавателя (при include=profiles) */
export interface TeacherProfile {
  id: number | null;
  userId: number;
  mentoredGroupId: number | null;
  mentoredGroup?: GroupSummary;
  subjects?: SubjectSummary[];
}

/** Права модератора (ключи из бэкенда) */
export interface ModeratorAccessRights {
  canDeleteUsers?: boolean;
  canRegisterUsers?: boolean;
  [key: string]: boolean | undefined;
}

/** Профиль модератора (при include=profiles) */
export interface ModeratorProfile {
  id: number | null;
  userId: number;
  accessRights: ModeratorAccessRights;
}

/** Базовые поля пользователя (как в AuthUser) */
export interface UserBase {
  id: number;
  institutionId: number;
  name: string;
  surname: string;
  patronymic?: string | null;
  email: string;
  roles: Role[];
  isActivated: boolean;
}

/** Ответ профиля: пользователь + опциональные ролевые данные */
export interface UserProfileResponse extends UserBase {
  student?: StudentProfile;
  teacher?: TeacherProfile;
  moderator?: ModeratorProfile;
}
