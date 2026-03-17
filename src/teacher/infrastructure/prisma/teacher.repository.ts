import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handlePrismaUniqueConflict } from 'src/common/utils/prisma-error.utils';
import { Teacher } from 'src/teacher/domain/entities/teacher.entity';
import {
  FindTeacherOptions,
  IFindTeachersByInstitutionParams,
  ITeacherRepository,
} from 'src/teacher/domain/teacher-repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class TeacherRepository implements ITeacherRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Маппинг сырой записи в домен. При include group — group для курируемой группы; при teacherSubjects — список предметов. */
  private mapToDomain(
    raw: Prisma.TeacherGetPayload<{
      include?: { user?: true; group?: true; teacherSubjects?: { include: { subject: true } } };
    }>,
    includeUser?: boolean,
  ): Teacher {
    type GroupPayload = { id: number; name: string; institutionId: number };
    type TeacherSubjectPayload = { subject: { id: number; name: string } };
    const groupPayload: GroupPayload | undefined =
      'group' in raw && raw.group != null ? (raw.group as GroupPayload) : undefined;
    const subjects =
      'teacherSubjects' in raw &&
      Array.isArray((raw as { teacherSubjects?: TeacherSubjectPayload[] }).teacherSubjects)
        ? (raw as { teacherSubjects: TeacherSubjectPayload[] }).teacherSubjects.map((ts) => ({
            id: ts.subject.id,
            name: ts.subject.name,
          }))
        : undefined;
    const teacher = Teacher.fromPersistence({
      id: raw.id,
      userId: raw.userId,
      mentoredGroupId: raw.mentoredGroupId,
      ...(groupPayload && { group: groupPayload }),
      ...(subjects?.length && { subjects }),
    });

    if (includeUser && 'user' in raw && raw.user) {
      teacher.setUserData(raw.user as Prisma.UserGetPayload<{}>);
    }

    return teacher;
  }

  async create(teacher: Teacher): Promise<Teacher> {
    try {
      const data = teacher.toPersistence();
      const saved = await this.prisma.teacher.create({ data });
      return this.mapToDomain(saved);
    } catch (error) {
      handlePrismaUniqueConflict(
        error,
        'Преподаватель с таким userId уже существует',
        'Произошла ошибка во время создания преподавателя',
      );
    }
  }

  async findById(id: number, options?: FindTeacherOptions): Promise<Teacher | null> {
    const include = options?.includeUser ? { user: true } : undefined;
    const raw = await this.prisma.teacher.findUnique({ where: { id }, include });
    return raw ? this.mapToDomain(raw, options?.includeUser) : null;
  }

  async findByUserId(userId: number, options?: FindTeacherOptions): Promise<Teacher | null> {
    const include = options?.includeUser ? { user: true } : undefined;
    const raw = await this.prisma.teacher.findUnique({ where: { userId }, include });
    return raw ? this.mapToDomain(raw, options?.includeUser) : null;
  }

  async findByMentoredGroupId(
    groupId: number,
    options?: FindTeacherOptions,
  ): Promise<Teacher | null> {
    const include = options?.includeUser ? { user: true } : undefined;
    const raw = await this.prisma.teacher.findUnique({
      where: { mentoredGroupId: groupId },
      include,
    });
    return raw ? this.mapToDomain(raw, options?.includeUser) : null;
  }

  async findByInstitutionId(
    institutionId: number,
    params?: IFindTeachersByInstitutionParams,
  ): Promise<{ teachers: Teacher[]; total: number }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const query = params?.query?.trim();
    const skip = (page - 1) * limit;

    const where = {
      user: {
        institutionId,
        ...(query && {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { surname: { contains: query, mode: 'insensitive' as const } },
            { email: { contains: query, mode: 'insensitive' as const } },
          ],
        }),
      },
    };

    const [total, raw] = await Promise.all([
      this.prisma.teacher.count({ where }),
      this.prisma.teacher.findMany({
        where,
        include: {
          user: true,
          group: true,
          teacherSubjects: { include: { subject: true } },
        },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
    ]);

    const teachers = raw.map((r) => this.mapToDomain(r, true));
    return { teachers, total };
  }

  async findBySubjectId(
    subjectId: number,
    options?: FindTeacherOptions,
    institutionId?: number,
  ): Promise<Teacher[]> {
    const include = options?.includeUser ? { user: true } : undefined;
    const raw = await this.prisma.teacher.findMany({
      where: {
        teacherSubjects: { some: { subjectId } },
        ...(institutionId !== undefined && {
          user: { institutionId },
        }),
      },
      include,
    });
    return raw.map((r) => this.mapToDomain(r, options?.includeUser));
  }

  async update(userId: number, teacher: Teacher): Promise<Teacher> {
    try {
      const data = teacher.toPersistence();
      const updated = await this.prisma.teacher.update({
        where: { userId },
        data,
      });
      return this.mapToDomain(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Преподаватель не найден');
        }
      }
      throw new InternalServerErrorException('Произошла ошибка во время обновления преподавателя');
    }
  }

  async remove(userId: number): Promise<void> {
    try {
      await this.prisma.teacher.delete({ where: { userId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Преподаватель не найден');
        }
      }
      throw new InternalServerErrorException('Произошла ошибка во время удаления преподавателя');
    }
  }
}
