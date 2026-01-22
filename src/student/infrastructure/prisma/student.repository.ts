import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Student } from 'src/student/domain/entities/student.entity';
import { FindStudentOptions, IStudentRepository } from 'src/student/domain/student-repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class StudentRepository implements IStudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(raw: Prisma.StudentGetPayload<{ include?: { user: true } }>, includeUser?: boolean): Student {
    const student = Student.fromPersistence({
      id: raw.id,
      userId: raw.userId,
      groupId: raw.groupId,
    });

    if (includeUser && 'user' in raw && raw.user) {
      student.setUserData(raw.user as Prisma.UserGetPayload<{}>);
    }

    return student;
  }

  async create(student: Student): Promise<Student> {
    try {
      const data = student.toPersistence();
      const savedStudent = await this.prisma.student.create({
        data,
      });
      return this.mapToDomain(savedStudent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Студент с таким id уже существует');
        }
      }
      throw new InternalServerErrorException(
        'Произошла ошибка во время создания студента',
      );
    }
  }

  async findByUserId(userId: number, options?: FindStudentOptions): Promise<Student | null> {
    const include = options?.includeUser ? { user: true } : undefined;
    const raw = await this.prisma.student.findUnique({ where: { userId }, include });
    return raw ? this.mapToDomain(raw, options?.includeUser) : null;
  }

  async findByGroupId(groupId: number, options?: FindStudentOptions): Promise<Student[]> {
    const include = options?.includeUser ? { user: true } : undefined;
    const raw = await this.prisma.student.findMany({ where: { groupId }, include });
    return raw.map((student) => this.mapToDomain(student, options?.includeUser));
  }

  async update(userId: number, student: Student): Promise<Student> {
    try {
      const data = student.toPersistence();
      const updatedStudent = await this.prisma.student.update({
        where: { userId },
        data,
      });
      return this.mapToDomain(updatedStudent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Студент не найден');
        }
      }
      throw new InternalServerErrorException('Ошибка при обновлении студента');
    }
  }

  async remove(userId: number): Promise<void> {
    await this.prisma.student.delete({ where: { userId } });
  }
}
