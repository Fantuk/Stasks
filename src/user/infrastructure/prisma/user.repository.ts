import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handlePrismaUniqueConflict } from 'src/common/utils/prisma-error.utils';
import { User } from 'src/user/domain/entities/user.entity';
import { ISearchUsersParams, IUserRepository } from 'src/user/domain/user-repository.interface';
import { Prisma, Role } from '@prisma/client';
import { Student } from 'src/student/domain/entities/student.entity';
import { Teacher } from 'src/teacher/domain/entities/teacher.entity';
import { IModeratorAccessRights, Moderator } from 'src/moderator/domain/entities/moderator.entity';
import { IUserWithProfiles } from 'src/user/domain/user-repository.interface';
import { IFindUserOptions } from 'src/common/interfaces/find-options.interface';

/** Допустимые поля сортировки для списков пользователей */
const USER_SORT_FIELDS = ['id', 'name', 'email'] as const;

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}
  private readonly userSelect = {
    id: true,
    institutionId: true,
    name: true,
    surname: true,
    patronymic: true,
    email: true,
    password: true,
    roles: true,
    isActivated: true,
  } as const;

  private mapToDomain(raw: Prisma.UserGetPayload<{}>): User {
    return User.fromPersistence({
      id: raw.id,
      institutionId: raw.institutionId,
      name: raw.name,
      surname: raw.surname,
      patronymic: raw.patronymic,
      email: raw.email,
      password: raw.password,
      roles: raw.roles,
      isActivated: raw.isActivated,
    });
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    try {
      const user = User.create(data);

      const savedUser = await this.prisma.user.create({
        data: user.toPersistence(),
        select: this.userSelect,
      });

      return this.mapToDomain(savedUser);
    } catch (error) {
      handlePrismaUniqueConflict(
        error,
        'Пользователь с таким id уже существует',
        'Произошла ошибка во время создания пользователя',
      );
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const rawUser = await this.prisma.user.findUnique({
      where: { email },
      select: this.userSelect,
    });

    return rawUser ? this.mapToDomain(rawUser) : null;
  }

  async findById(id: number, options?: IFindUserOptions): Promise<IUserWithProfiles | null> {
    const include = buildUserInclude(options);
    const rawUser = await this.prisma.user.findUnique({
      where: { id },
      select: include
        ? {
            ...this.userSelect,
            student: include.student ? { include: { group: true } } : true,
            teacher: include.teacher
              ? { include: { group: true, teacherSubjects: { include: { subject: true } } } }
              : true,
            moderator: true,
          }
        : this.userSelect,
    });
    if (!rawUser) return null;

    const user = this.mapToDomain(rawUser as Prisma.UserGetPayload<{}>);
    const result: IUserWithProfiles = { user };

    if (include?.student && 'student' in rawUser && rawUser.student)
      result.student = mapRawToStudent(
        rawUser.student as Prisma.StudentGetPayload<{ include: { group: true } }>,
      );
    if (include?.teacher && 'teacher' in rawUser && rawUser.teacher)
      result.teacher = mapRawToTeacher(
        rawUser.teacher as Prisma.TeacherGetPayload<{
          include: { group: true; teacherSubjects: { include: { subject: true } } };
        }>,
      );
    if (include?.moderator && 'moderator' in rawUser && rawUser.moderator)
      result.moderator = mapRawToModerator(rawUser.moderator as Prisma.ModeratorGetPayload<{}>);

    return result;
  }

  async findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
    options?: IFindUserOptions,
    sort?: string,
    order: 'asc' | 'desc' = 'asc',
  ): Promise<{ users: IUserWithProfiles[]; total: number }> {
    const includeOptions = buildUserInclude(options);
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;
    const orderByField =
      sort && USER_SORT_FIELDS.includes(sort as (typeof USER_SORT_FIELDS)[number]) ? sort : 'id';
    const orderBy = { [orderByField]: order } as Prisma.UserOrderByWithRelationInput;

    const total = await this.prisma.user.count({
      where: { institutionId },
    });

    const rawUsers = await this.prisma.user.findMany({
      where: { institutionId },
      select: includeOptions
        ? {
            ...this.userSelect,
            student: includeOptions.student ? { include: { group: true } } : true,
            teacher: includeOptions.teacher
              ? { include: { group: true, teacherSubjects: { include: { subject: true } } } }
              : true,
            moderator: true,
          }
        : this.userSelect,
      skip,
      take,
      orderBy,
    });

    const users: IUserWithProfiles[] = rawUsers.map((raw) => {
      const u = this.mapToDomain(raw as Prisma.UserGetPayload<{}>);
      const item: IUserWithProfiles = { user: u };
      if (includeOptions?.student && 'student' in raw && raw.student)
        item.student = mapRawToStudent(
          raw.student as Prisma.StudentGetPayload<{ include: { group: true } }>,
        );
      if (includeOptions?.teacher && 'teacher' in raw && raw.teacher)
        item.teacher = mapRawToTeacher(
          raw.teacher as Prisma.TeacherGetPayload<{
            include: { group: true; teacherSubjects: { include: { subject: true } } };
          }>,
        );
      if (includeOptions?.moderator && 'moderator' in raw && raw.moderator)
        item.moderator = mapRawToModerator(raw.moderator as Prisma.ModeratorGetPayload<{}>);
      return item;
    });

    return { users, total };
  }

  async findAll(): Promise<User[]> {
    const rawUsers = await this.prisma.user.findMany({
      select: this.userSelect,
    });

    return rawUsers.map(this.mapToDomain);
  }

  async search(params: ISearchUsersParams): Promise<{ users: IUserWithProfiles[]; total: number }> {
    const { institutionId, query, roles, page, limit, include } = params;
    const includeOptions = buildUserInclude(include);

    const where: Prisma.UserWhereInput = {
      institutionId,
    };

    if (query && query.trim() !== '') {
      const searchQuery = query.trim();
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { surname: { contains: searchQuery, mode: 'insensitive' } },
        { patronymic: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    if (roles && roles.length > 0 && !roles.includes(Role.ADMIN)) {
      where.roles = {
        hasSome: roles,
      };
    } else throw new BadRequestException('Некорректная роль');

    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;
    const sortField =
      params.sort && USER_SORT_FIELDS.includes(params.sort as (typeof USER_SORT_FIELDS)[number])
        ? params.sort
        : 'id';
    const order = params.order ?? 'asc';
    const orderBy = { [sortField]: order } as Prisma.UserOrderByWithRelationInput;

    const total = await this.prisma.user.count({
      where,
    });

    const rawUsers = await this.prisma.user.findMany({
      where,
      select: includeOptions
        ? {
            ...this.userSelect,
            student: includeOptions.student ? { include: { group: true } } : true,
            teacher: includeOptions.teacher
              ? { include: { group: true, teacherSubjects: { include: { subject: true } } } }
              : true,
            moderator: true,
          }
        : this.userSelect,
      skip,
      take,
      orderBy,
    });

    const users: IUserWithProfiles[] = rawUsers.map((raw) => {
      const u = this.mapToDomain(raw as Prisma.UserGetPayload<{}>);
      const item: IUserWithProfiles = { user: u };
      if (includeOptions?.student && 'student' in raw && raw.student)
        item.student = mapRawToStudent(
          raw.student as Prisma.StudentGetPayload<{ include: { group: true } }>,
        );
      if (includeOptions?.teacher && 'teacher' in raw && raw.teacher)
        item.teacher = mapRawToTeacher(
          raw.teacher as Prisma.TeacherGetPayload<{
            include: { group: true; teacherSubjects: { include: { subject: true } } };
          }>,
        );
      if (includeOptions?.moderator && 'moderator' in raw && raw.moderator)
        item.moderator = mapRawToModerator(raw.moderator as Prisma.ModeratorGetPayload<{}>);
      return item;
    });

    return { users, total };
  }

  async update(id: number, data: Partial<Omit<User, 'id'>>): Promise<User> {
    const updateData: Prisma.UserUpdateInput =
      data instanceof User ? data.toPersistence() : (data as Prisma.UserUpdateInput);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.userSelect,
    });

    return this.mapToDomain(updatedUser);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}

function buildUserInclude(options?: IFindUserOptions) {
  if (!options?.include?.length) return undefined;
  const include: { student?: boolean; teacher?: boolean; moderator?: boolean } = {};
  if (options.include.includes('student')) include.student = true;
  if (options.include.includes('teacher')) include.teacher = true;
  if (options.include.includes('moderator')) include.moderator = true;
  return Object.keys(include).length > 0 ? include : undefined;
}

/** Маппинг сырой записи студента (с опциональной группой из Prisma include) в доменную сущность. Prisma отдаёт group как null при отсутствии связи. */
function mapRawToStudent(raw: {
  id: number;
  userId: number;
  groupId: number | null;
  group?: { id: number; name: string; institutionId: number } | null;
}): Student {
  return Student.fromPersistence(raw);
}

/** Полезная нагрузка группы из Prisma include (для типизации) */
type TeacherGroupPayload = { id: number; institutionId: number; name: string };

/** Маппинг сырой записи преподавателя (с опциональными group и teacherSubjects из Prisma include) в домен. */
function mapRawToTeacher(
  raw: Prisma.TeacherGetPayload<{
    include?: { group: true; teacherSubjects: { include: { subject: true } } };
  }>,
): Teacher {
  const rawGroup =
    'group' in raw && raw.group != null ? (raw as { group: TeacherGroupPayload }).group : null;
  const group = rawGroup
    ? { id: rawGroup.id, institutionId: rawGroup.institutionId, name: rawGroup.name }
    : undefined;
  const subjects =
    'teacherSubjects' in raw &&
    Array.isArray(
      (raw as { teacherSubjects?: { subject: { id: number; name: string } }[] }).teacherSubjects,
    )
      ? (
          raw as { teacherSubjects: { subject: { id: number; name: string } }[] }
        ).teacherSubjects.map((ts) => ({ id: ts.subject.id, name: ts.subject.name }))
      : undefined;
  return Teacher.fromPersistence({
    id: raw.id,
    userId: raw.userId,
    mentoredGroupId: raw.mentoredGroupId,
    ...(group && { group }),
    ...(subjects?.length && { subjects }),
  });
}

function mapRawToModerator(raw: { id: number; userId: number; accessRights: unknown }): Moderator {
  return Moderator.fromPersistence({
    id: raw.id,
    userId: raw.userId,
    accessRights: raw.accessRights as IModeratorAccessRights | null,
  });
}
