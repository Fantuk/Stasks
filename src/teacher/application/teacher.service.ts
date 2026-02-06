import {
  BadRequestException,
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
import { GroupService } from 'src/group/application/group.service';
import { IFindOneOptions } from 'src/common/interfaces/find-options.interface';
import { shouldIncludeUser } from 'src/common/utils/query.utils';

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);
  constructor(
    @Inject('TeacherRepository')
    private readonly teacherRepository: ITeacherRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => GroupService))
    private readonly groupService: GroupService
  ) { }

  async create(teacher: ICreateTeacherParams): Promise<Teacher> {
    this.logger.log(`Создание преподавателя ${teacher.userId}`);
    if (teacher.mentoredGroupId) {
      await this.validateGroupAvailability(teacher.mentoredGroupId, teacher.institutionId);
    }

    const createdTeacher = Teacher.create({
      userId: teacher.userId,
      mentoredGroupId: teacher.mentoredGroupId ?? null,
    });

    return this.teacherRepository.create(createdTeacher);
  }

  async findById(
    id: number,
    institutionId?: number,
    includeUser = false,
  ): Promise<Teacher | null> {
    const teacher = await this.teacherRepository.findById(id, {
      includeUser,
    });
    if (!teacher) return null;
    if (institutionId !== undefined) {
      const user = await this.userService.findById(teacher.userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к преподавателю из другого учреждения',
        );
      }
    }
    return teacher;
  }

  async findByUserId(
    userId: number,
    institutionId?: number,
    options?: IFindOneOptions,
  ): Promise<Teacher | null> {
    const includeUser = shouldIncludeUser(options);
    const teacher = await this.teacherRepository.findByUserId(userId, {
      includeUser,
    });
    if (!teacher) return null;
    if (institutionId !== undefined) {
      const user = await this.userService.findById(userId, institutionId);
      if (!user) throw new ForbiddenException('Нет доступа к преподавателю из другого учреждения');
    }
    return teacher;
  }

  async findByMentoredGroupId(
    groupId: number,
    institutionId?: number,
    includeUser = false,
  ): Promise<Teacher | null> {
    const teacher = await this.teacherRepository.findByMentoredGroupId(groupId, {
      includeUser,
    });
    if (!teacher) return null;
    if (institutionId !== undefined) {
      const user = await this.userService.findById(teacher.userId, institutionId);
      if (!user) {
        throw new ForbiddenException(
          'Нет доступа к преподавателю из другого учреждения',
        );
      }
    }
    return teacher;
  }

  async findBySubjectId(
    subjectId: number,
    institutionId?: number,
    includeUser = false,
  ): Promise<Teacher[]> {
    const teachers = await this.teacherRepository.findBySubjectId(subjectId, {
      includeUser,
    }, institutionId);
    const filtered: Teacher[] = [];
    for (const t of teachers) {
      const user = await this.userService.findById(t.userId, institutionId);
      if (user) filtered.push(t);
    }
    return filtered;
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

    await this.validateGroupAvailability(groupId, institutionId);

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

  async removeMentoredGroupByGroupId(
    groupId: number,
    institutionId?: number,
  ): Promise<Teacher | null> {
    const teacher = await this.teacherRepository.findByMentoredGroupId(groupId);
    if (!teacher) return null;
    if (institutionId !== undefined) {
      const user = await this.userService.findById(teacher.userId, institutionId);
      if (!user) {
        throw new ForbiddenException('Нет доступа к преподавателю из другого учреждения');
      }
    }
    teacher.removeMentoredGroup();
    return this.teacherRepository.update(teacher.userId, teacher);
  }

  async remove(userId: number): Promise<void> {
    const teacher = await this.teacherRepository.findByUserId(userId);

    if (!teacher) {
      this.logger.warn('Преподаватель не найден по id ' + userId);
      return;
    }

    return this.teacherRepository.remove(userId);
  }

  private async validateGroupAvailability(groupId: number, institutionId?: number): Promise<void> {
    const group = await this.groupService.findById(groupId, institutionId);
    if (!group) {
      throw new BadRequestException('Группа не найдена');
    }
    if (institutionId !== undefined && group.institutionId !== institutionId) {
      throw new ForbiddenException('Группа не принадлежит вашему учреждению');
    }
    const existingTeacher = await this.teacherRepository.findByMentoredGroupId(groupId);
    if (existingTeacher) {
      throw new ConflictException(
        `Группа ${groupId} уже курируется преподавателем (userId: ${existingTeacher.userId})`,
      );
    }
  }
}
