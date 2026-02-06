import { IncludeOption, IFindOneOptions, IFindUserOptions, UserProfileIncludeOption } from 'src/common/interfaces/find-options.interface';

const VALID_INCLUDE: IncludeOption[] =
  [
    'user', 'members', 'teachers', 'groups',
    'student', 'teacher', 'moderator', 'profiles',
  ];

export function parseIncludeOption(include?: string): IFindOneOptions {
  if (!include?.trim()) return {};
  const parts = include.split(',').map((s) => s.trim().toLowerCase());
  const filtered = parts.filter((p): p is IncludeOption =>
    VALID_INCLUDE.includes(p as IncludeOption),
  );
  return filtered.length > 0 ? { include: filtered } : {};
}

export function shouldIncludeUser(options?: IFindOneOptions): boolean {
  return options?.include?.includes('user') ?? false;
}

export function shouldIncludeMembers(options?: IFindOneOptions): boolean {
  return options?.include?.includes('members') ?? false;
}

export function shouldIncludeTeachers(options?: IFindOneOptions): boolean {
  return options?.include?.includes('teachers') ?? false;
}

export function shouldIncludeGroups(options?: IFindOneOptions): boolean {
  return options?.include?.includes('groups') ?? false;
}

const USER_PROFILE_OPTIONS: UserProfileIncludeOption[] = ['student', 'teacher', 'moderator'];

/**
 * Парсит query-параметр include для user-эндпоинтов.
 * "profiles" раскрывается в student, teacher, moderator.
 */
export function parseUserIncludeOption(include?: string): IFindUserOptions {
  if (!include?.trim()) return {};
  const parts = include.split(',').map((s) => s.trim().toLowerCase());
  const hasProfiles = parts.includes('profiles');
  const filtered = parts.filter(
    (p): p is UserProfileIncludeOption => USER_PROFILE_OPTIONS.includes(p as UserProfileIncludeOption),
  );
  const includeSet = new Set<UserProfileIncludeOption>(filtered);
  if (hasProfiles) {
    USER_PROFILE_OPTIONS.forEach((opt) => includeSet.add(opt));
  }
  return includeSet.size > 0 ? { include: Array.from(includeSet) } : {};
}

export function shouldIncludeStudent(options?: IFindUserOptions): boolean {
  return options?.include?.includes('student') ?? false;
}

export function shouldIncludeTeacher(options?: IFindUserOptions): boolean {
  return options?.include?.includes('teacher') ?? false;
}

export function shouldIncludeModerator(options?: IFindUserOptions): boolean {
  return options?.include?.includes('moderator') ?? false;
}