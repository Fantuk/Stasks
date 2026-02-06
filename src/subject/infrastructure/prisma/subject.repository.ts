import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Subject } from 'src/subject/domain/entities/subject.entity';
import { ISearchSubjectsParams, ISubjectRepository } from 'src/subject/domain/subject-repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubjectRepository implements ISubjectRepository {
  constructor(private readonly prisma: PrismaService) { }

  private readonly subjectSelect = {
    id: true,
    institutionId: true,
    name: true,
  } as const;

  private mapToDomain(raw: { id: number; institutionId: number; name: string }): Subject {
    return Subject.fromPersistence(raw);
  }

  async create(data: Omit<Subject, 'id'>): Promise<Subject> {
    try {
      const subject = Subject.create(data as { institutionId: number; name: string });
      const saved = await this.prisma.subject.create({
        data: subject.toPersistence(),
        select: this.subjectSelect,
      });
      return this.mapToDomain(saved);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Предмет с таким именем уже существует');
      }
      throw new InternalServerErrorException('Ошибка при создании предмета');
    }
  }

  async findById(id: number): Promise<Subject | null> {
    const raw = await this.prisma.subject.findUnique({
      where: { id },
      select: this.subjectSelect,
    });
    return raw ? this.mapToDomain(raw) : null;
  }

  async findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
  ): Promise<{ subjects: Subject[]; total: number }> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const total = await this.prisma.subject.count({ where: { institutionId } });
    const raw = await this.prisma.subject.findMany({
      where: { institutionId },
      select: this.subjectSelect,
      skip,
      take: limit,
      orderBy: { id: 'asc' },
    });
    return { subjects: raw.map(this.mapToDomain), total };
  }

  async findByName(name: string, institutionId: number): Promise<Subject | null> {
    const raw = await this.prisma.subject.findFirst({
      where: { name, institutionId },
      select: this.subjectSelect,
    });
    return raw ? this.mapToDomain(raw) : null;
  }

  async update(id: number, data: Partial<Omit<Subject, 'id'>>): Promise<Subject> {
    try {
      const updated = await this.prisma.subject.update({
        where: { id },
        data: data as Prisma.SubjectUpdateInput,
        select: this.subjectSelect,
      });
      return this.mapToDomain(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Предмет с таким именем уже существует');
      }
      throw new InternalServerErrorException('Ошибка при обновлении предмета');
    }
  }

  async remove(id: number): Promise<void> {
    await this.prisma.subject.delete({ where: { id } });
  }

  async assignTeachers(subjectId: number, teacherIds: number[]): Promise<void> {
    await this.prisma.teacherSubject.createMany({
      data: teacherIds.map((teacherId) => ({ subjectId, teacherId })),
      skipDuplicates: true,
    });
  }

  async unassignTeacher(subjectId: number, teacherId: number): Promise<void> {
    await this.prisma.teacherSubject.deleteMany({
      where: { subjectId, teacherId },
    });
  }

  async assignGroups(subjectId: number, groupIds: number[]): Promise<void> {
    await this.prisma.subjectGroup.createMany({
      data: groupIds.map((groupId) => ({ subjectId, groupId })),
      skipDuplicates: true,
    });
  }

  async unassignGroup(subjectId: number, groupId: number): Promise<void> {
    await this.prisma.subjectGroup.deleteMany({
      where: { subjectId, groupId },
    });
  }

  async search(params: ISearchSubjectsParams): Promise<{ subjects: Subject[]; total: number; }> {
    const where: Prisma.SubjectWhereInput = { institutionId: params.institutionId };
    if (params.query?.trim()) {
      where.name = { contains: params.query.trim(), mode: 'insensitive' };
    }

    const total = await this.prisma.subject.count({ where });
    const skip = params.page && params.limit ? (params.page - 1) * params.limit : undefined;
    const take = params.limit;

    const raw = await this.prisma.subject.findMany({
      where,
      select: this.subjectSelect,
      skip,
      take,
      orderBy: { id: 'asc' },
    });

    return {
      subjects: raw.map(this.mapToDomain),
      total,
    };
  }

  async findExistingGroupsBySubject(
    subjectId: number,
    groupIds: number[],
  ): Promise<{ name: string }[]> {
    if (groupIds.length === 0) return [];
    const rows = await this.prisma.subjectGroup.findMany({
      where: { subjectId, groupId: { in: groupIds } },
      select: { group: { select: { name: true } } },
    });
    return rows.map((r) => ({ name: r.group.name }));
  }

  async findExistingTeachersBySubject(
    subjectId: number,
    teacherIds: number[],
  ): Promise<{ name: string }[]> {
    if (teacherIds.length === 0) return [];
    const rows = await this.prisma.teacherSubject.findMany({
      where: { subjectId, teacherId: { in: teacherIds } },
      select: {
        teacher: {
          select: {
            id: true,
            user: { select: { name: true, surname: true, patronymic: true } },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.teacher.id,
      name: [r.teacher.user.surname, r.teacher.user.name, r.teacher.user.patronymic]
        .filter(Boolean)
        .join(' '),
    }));
  }
}