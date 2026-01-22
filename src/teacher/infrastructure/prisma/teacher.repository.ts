import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Teacher } from 'src/teacher/domain/entities/teacher.entity';
import { FindTeacherOptions, ITeacherRepository } from 'src/teacher/domain/teacher-repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class TeacherRepository implements ITeacherRepository {
  constructor(private readonly prisma: PrismaService) { }

  private mapToDomain(raw: Prisma.TeacherGetPayload<{ include?: { user: true } }>, includeUser?: boolean): Teacher {
    const teacher = Teacher.fromPersistence({
      id: raw.id,
      userId: raw.userId,
      mentoredGroupId: raw.mentoredGroupId,
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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Преподаватель с таким userId уже существует',
          );
        }
      }
      throw new InternalServerErrorException(
        'Произошла ошибка во время создания преподавателя',
      );
    }
  }

  async findByUserId(userId: number, options?: FindTeacherOptions): Promise<Teacher | null> {
    const include = options?.includeUser ? { user: true } : undefined;
    const raw = await this.prisma.teacher.findUnique({ where: { userId }, include });
    return raw ? this.mapToDomain(raw, options?.includeUser) : null;
  }

  async findByMentoredGroupId(groupId: number, options?: FindTeacherOptions): Promise<Teacher | null> {
    const include = options?.includeUser ? { user: true } : undefined;
    const raw = await this.prisma.teacher.findUnique({
      where: { mentoredGroupId: groupId },
      include,
    });
    return raw ? this.mapToDomain(raw, options?.includeUser) : null;
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
          throw new NotFoundException(
            `Преподаватель с userId ${userId} не найден`,
          );
        }
      }
      throw new InternalServerErrorException(
        'Произошла ошибка во время обновления преподавателя',
      );
    }
  }

  async remove(userId: number): Promise<void> {
    try {
      await this.prisma.teacher.delete({ where: { userId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `Преподаватель с userId ${userId} не найден`,
          );
        }
      }
      throw new InternalServerErrorException(
        'Произошла ошибка во время удаления преподавателя',
      );
    }
  }
}
