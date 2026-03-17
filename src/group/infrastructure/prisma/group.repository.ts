import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Group } from 'src/group/domain/entities/group.entity';
import {
  IGroupRepository,
  ISearchGroupsParams,
  GroupWithStudentCount,
  MentorSummary,
} from 'src/group/domain/group-repository.interface';
import { Prisma } from '@prisma/client';
import { handlePrismaUniqueConflict } from 'src/common/utils/prisma-error.utils';

@Injectable()
export class GroupRepository implements IGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly groupSelect = {
    id: true,
    institutionId: true,
    name: true,
  } as const;

  /** Select для списка: базовые поля + количество студентов + куратор (teacher + user) */
  private readonly groupListSelect = {
    ...this.groupSelect,
    _count: { select: { students: true } as const },
    teacher: {
      select: {
        id: true,
        userId: true,
        user: { select: { name: true, surname: true, patronymic: true } },
      },
    },
  } as const;

  /** Собирает отображаемое имя куратора из полей пользователя (Фамилия Имя Отчество) */
  private mentorSummary(raw: {
    id: number;
    userId: number;
    user: { name: string; surname: string; patronymic: string | null };
  }): MentorSummary {
    const u = raw.user;
    const parts = [u.surname, u.name, u.patronymic].filter(Boolean);
    return {
      id: raw.id,
      userId: raw.userId,
      displayName: parts.length ? parts.join(' ') : '—',
    };
  }

  private mapToDomain(raw: Prisma.GroupGetPayload<{}>): Group {
    return Group.fromPersistence({
      id: raw.id,
      institutionId: raw.institutionId,
      name: raw.name,
    });
  }

  async create(data: Omit<Group, 'id'>): Promise<Group> {
    try {
      const group = Group.create(data);
      const saved = await this.prisma.group.create({
        data: group.toPersistence(),
        select: this.groupSelect,
      });
      return this.mapToDomain(saved);
    } catch (error) {
      handlePrismaUniqueConflict(
        error,
        'Группа с таким именем уже существует',
        'Ошибка при создании группы',
      );
    }
  }

  async findById(id: number): Promise<Group | null> {
    const raw = await this.prisma.group.findUnique({
      where: { id },
      select: this.groupSelect,
    });
    return raw ? this.mapToDomain(raw) : null;
  }

  async findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
    sort?: string,
    order?: 'asc' | 'desc',
  ): Promise<{ groups: GroupWithStudentCount[]; total: number }> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    const total = await this.prisma.group.count({
      where: { institutionId },
    });

    const sortField = sort === 'name' || sort === 'id' ? sort : 'id';
    const orderDir = order ?? 'asc';
    const orderBy = { [sortField]: orderDir };

    const raw = await this.prisma.group.findMany({
      where: { institutionId },
      select: this.groupListSelect,
      skip,
      take,
      orderBy,
    });

    return {
      groups: raw.map((r) => ({
        group: this.mapToDomain({ id: r.id, institutionId: r.institutionId, name: r.name }),
        studentCount: r._count.students,
        mentor: r.teacher ? this.mentorSummary(r.teacher) : undefined,
      })),
      total,
    };
  }

  async findByName(name: string, institutionId: number): Promise<Group | null> {
    const raw = await this.prisma.group.findFirst({
      where: { name, institutionId },
      select: this.groupSelect,
    });
    return raw ? this.mapToDomain(raw) : null;
  }

  async findBySubjectId(subjectId: number, institutionId?: number): Promise<Group[]> {
    const raw = await this.prisma.group.findMany({
      where: {
        subjectGroups: { some: { subjectId } },
        ...(institutionId !== undefined && {
          institutionId,
        }),
      },
      select: this.groupSelect,
    });
    return raw.map(this.mapToDomain);
  }

  async search(
    params: ISearchGroupsParams,
  ): Promise<{ groups: GroupWithStudentCount[]; total: number }> {
    const where: Prisma.GroupWhereInput = { institutionId: params.institutionId };
    if (params.query?.trim()) {
      where.name = { contains: params.query.trim(), mode: 'insensitive' };
    }

    const total = await this.prisma.group.count({ where });
    const skip = params.page && params.limit ? (params.page - 1) * params.limit : undefined;
    const take = params.limit;
    const sortField = params.sort === 'name' || params.sort === 'id' ? params.sort : 'id';
    const orderDir = params.order ?? 'asc';
    const orderBy = { [sortField]: orderDir };

    const raw = await this.prisma.group.findMany({
      where,
      select: this.groupListSelect,
      skip,
      take,
      orderBy,
    });

    return {
      groups: raw.map((r) => ({
        group: this.mapToDomain({ id: r.id, institutionId: r.institutionId, name: r.name }),
        studentCount: r._count.students,
        mentor: r.teacher ? this.mentorSummary(r.teacher) : undefined,
      })),
      total,
    };
  }

  async update(id: number, data: Partial<Omit<Group, 'id'>>): Promise<Group> {
    try {
      const updateData: Prisma.GroupUpdateInput =
        data instanceof Group ? data.toPersistence() : data;

      const updated = await this.prisma.group.update({
        where: { id },
        data: updateData,
        select: this.groupSelect,
      });
      return this.mapToDomain(updated);
    } catch (error) {
      handlePrismaUniqueConflict(
        error,
        'Группа с таким именем уже существует',
        'Ошибка при обновлении группы',
      );
    }
  }

  async remove(id: number): Promise<void> {
    await this.prisma.group.delete({ where: { id } });
  }
}
