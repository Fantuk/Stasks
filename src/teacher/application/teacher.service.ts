import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ITeacherRepository } from 'src/teacher/domain/teacher-repository.interface';
import { Teacher } from 'src/teacher/domain/entities/teacher.entity';
import { ICreateTeacherParams } from './interfaces/interfaces';
import { UserService } from 'src/user/application/user.service';

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);
  constructor(
    @Inject('TeacherRepository')
    private readonly teacherRepository: ITeacherRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) { }

  async create(teacher: ICreateTeacherParams): Promise<Teacher> {
    this.logger.log(`Создание преподавателя ${teacher.userId}`);
    if (teacher.mentoredGroupId) {
      await this.validateGroupAvailability(teacher.mentoredGroupId);
    }

    const createdTeacher = Teacher.create({
      userId: teacher.userId,
      mentoredGroupId: teacher.mentoredGroupId ?? null,
    });

    return this.teacherRepository.create(createdTeacher);
  }

  async findByUserId(
    userId: number,
    institutionId?: number,
    includeUser?: boolean,
  ): Promise<Teacher | null> {
    const teacher = this.teacherRepository.findByUserId(userId, {
      includeUser: includeUser ?? false,
    });

    if (!teacher) {
      return null;
    }

    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к преподавателю из другого учреждения',
        );
      }
    }
    return teacher;
  }

  async assignMentoredGroup(
    userId: number,
    groupId: number,
    institutionId?: number,
  ): Promise<Teacher> {
    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к преподавателю из другого учреждения',
        );
      }
    }

    const teacher = await this.teacherRepository.findByUserId(userId);

    if (!teacher) {
      throw new NotFoundException('Преподаватель не найден по id' + userId);
    }

    await this.validateGroupAvailability(groupId);

    teacher.assignMentoredGroup(groupId);
    return this.teacherRepository.update(userId, teacher);
  }

  async removeMentoredGroup(
    userId: number,
    institutionId?: number,
  ): Promise<Teacher> {
    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к преподавателю из другого учреждения',
        );
      }
    }

    const teacher = await this.teacherRepository.findByUserId(userId);

    if (!teacher) {
      throw new NotFoundException('Преподаватель не найден по id' + userId);
    }

    teacher.removeMentoredGroup();
    return this.teacherRepository.update(userId, teacher);
  }

  async remove(userId: number): Promise<void> {
    const teacher = await this.teacherRepository.findByUserId(userId);

    if (!teacher) {
      this.logger.warn('Преподаватель не найден по id ' + userId);
      return;
    }

    return this.teacherRepository.remove(userId);
  }

  private async validateGroupAvailability(groupId: number): Promise<void> {
    // TODO: когда добавишь Groups, проверяй что группа существует
    // const group = await this.groupRepository.findById(groupId);
    // if (!group) throw new BadRequestException('Group not found');

    // Проверяем, что группа еще не занята другим учителем
    const existingTeacher =
      await this.teacherRepository.findByMentoredGroupId(groupId);

    if (existingTeacher) {
      throw new ConflictException(
        `Группа ${groupId} уже занята учителем ${existingTeacher.userId}`,
      );
    }
  }
}
