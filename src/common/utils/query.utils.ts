import {
  IncludeOption,
  IFindOneOptions,
  IFindUserOptions,
  UserProfileIncludeOption,
  BuildingIncludeOption,
  IBuildingFindOptions,
  FloorIncludeOption,
  IFloorFindOptions,
  ClassroomIncludeOption,
  IClassroomFindOptions,
} from 'src/common/interfaces/find-options.interface';

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

const BUILDING_INCLUDE_OPTIONS: BuildingIncludeOption[] = ['floors', 'floors.classrooms'];

export function parseBuildingIncludeOption(include?: string): IBuildingFindOptions {
  if (!include?.trim()) return {};
  const parts = include.split(',').map((s) => s.trim().toLowerCase());
  const filtered = parts.filter((p): p is BuildingIncludeOption =>
    BUILDING_INCLUDE_OPTIONS.includes(p as BuildingIncludeOption),
  );
  return filtered.length > 0 ? { include: filtered } : {};
}

export function shouldIncludeFloors(options?: IBuildingFindOptions): boolean {
  return options?.include?.includes('floors') ?? options?.include?.includes('floors.classrooms') ?? false;
}

export function shouldIncludeFloorsClassrooms(options?: IBuildingFindOptions): boolean {
  return options?.include?.includes('floors.classrooms') ?? false;
}

const FLOOR_INCLUDE_OPTIONS: FloorIncludeOption[] = ['classrooms'];

export function parseFloorIncludeOption(include?: string): IFloorFindOptions {
  if (!include?.trim()) return {};
  const parts = include.split(',').map((s) => s.trim().toLowerCase());
  const filtered = parts.filter((p): p is FloorIncludeOption =>
    FLOOR_INCLUDE_OPTIONS.includes(p as FloorIncludeOption),
  );
  return filtered.length > 0 ? { include: filtered } : {};
}

export function shouldIncludeClassrooms(options?: IFloorFindOptions): boolean {
  return options?.include?.includes('classrooms') ?? false;
}

const CLASSROOM_INCLUDE_OPTIONS: ClassroomIncludeOption[] = ['floor'];

export function parseClassroomIncludeOption(include?: string): IClassroomFindOptions {
  if (!include?.trim()) return {};
  const parts = include.split(',').map((s) => s.trim().toLowerCase());
  const filtered = parts.filter((p): p is ClassroomIncludeOption =>
    CLASSROOM_INCLUDE_OPTIONS.includes(p as ClassroomIncludeOption),
  );
  return filtered.length > 0 ? { include: filtered } : {};
}

export function shouldIncludeFloor(options?: IClassroomFindOptions): boolean {
  return options?.include?.includes('floor') ?? false;
}