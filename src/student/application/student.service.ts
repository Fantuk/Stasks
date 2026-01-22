import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { IStudentRepository } from 'src/student/domain/student-repository.interface';
import { ICreateStudentParams } from 'src/student/application/interfaces/interfaces';
import { Student } from 'src/student/domain/entities/student.entity';
import { UserService } from 'src/user/application/user.service';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);
  constructor(
    @Inject('StudentRepository')
    private readonly studentRepository: IStudentRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) { }

  async create(student: ICreateStudentParams): Promise<Student> {
    this.logger.log(`Создание студента ${student.userId}`);
    if (student.groupId) {
      await this.validateGroupExists(student.groupId);
    }

    const createdStudent = Student.create({
      userId: student.userId,
      groupId: student.groupId || null,
    });

    return this.studentRepository.create(createdStudent);
  }

  async findByUserId(
    userId: number,
    institutionId?: number,
    includeUser?: boolean,
  ): Promise<Student | null> {
    const student = await this.studentRepository.findByUserId(userId, {
      includeUser: includeUser ?? false,
    });
    if (!student) {
      return null;
    }

    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к студенту из другого учреждения',
        );
      }
    }
    return student;
  }

  async findByGroupId(
    groupId: number,
    institutionId?: number,
    includeUser?: boolean,
  ): Promise<Student[]> {
    const students = this.studentRepository.findByGroupId(groupId, {
      includeUser: includeUser ?? false,
    });

    if (institutionId !== undefined) {
      const filteredStudents: Student[] = [];
      for (const student of await students) {
        const user = await this.userService.findById(
          student.userId,
          institutionId,
        );
        if (user) {
          filteredStudents.push(student);
        }
      }
      return filteredStudents;
    }

    return students;
  }

  async assignToGroup(
    userId: number,
    groupId: number,
    institutionId?: number,
  ): Promise<Student> {
    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к студенту из другого учреждения',
        );
      }
    }

    const student = await this.findByUserId(userId);

    if (!student) {
      throw new NotFoundException('Студент не найден по id ' + userId);
    }

    if (student.groupId === groupId) {
      throw new BadRequestException('Студент уже находится в этой группе');
    }

    await this.validateGroupExists(groupId);

    student.assignToGroup(groupId);
    return this.studentRepository.update(userId, student);
  }

  async removeFromGroup(
    userId: number,
    institutionId?: number,
  ): Promise<Student> {
    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к студенту из другого учреждения',
        );
      }
    }

    const student = await this.findByUserId(userId);

    if (!student) {
      throw new NotFoundException('Студент не найден по id ' + userId);
    }

    if (!student.isInGroup()) {
      throw new BadRequestException('Студент не находится в группе');
    }

    student.removeFromGroup();
    return await this.studentRepository.update(userId, student);
  }

  async remove(userId: number): Promise<void> {
    await this.studentRepository.remove(userId);
  }

  private async validateGroupExists(groupId: number): Promise<void> {
    // TODO: когда добавишь Groups
    // const group = await this.groupRepository.findById(groupId);
    // if (!group) throw new BadRequestException('Group not found');

    // Пока просто проверяем, что ID положительный
    if (groupId <= 0) {
      throw new BadRequestException('Invalid group ID');
    }
  }
}
