import { Injectable, Inject, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Subject } from 'src/subject/domain/entities/subject.entity';
import type { ISubjectRepository } from 'src/subject/domain/subject-repository.interface';
import { CreateSubjectDto } from 'src/subject/application/dto/create-subject.dto';
import { UpdateSubjectDto } from 'src/subject/application/dto/update-subject.dto';
import { GroupService } from 'src/group/application/group.service';
import { TeacherService } from 'src/teacher/application/teacher.service';
import { IFindOneOptions } from 'src/common/interfaces/find-options.interface';
import { shouldIncludeGroups, shouldIncludeTeachers } from 'src/common/utils/query.utils';
import { PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class SubjectService {
  constructor(
    @Inject('SubjectRepository') private readonly subjectRepository: ISubjectRepository,
    private readonly groupService: GroupService,
    private readonly teacherService: TeacherService,
  ) { }

  private mapToResponse(subject: Subject) {
    return subject.toResponse();
  }

  async create(dto: CreateSubjectDto, institutionId: number) {
    const subject = Subject.create({ institutionId, name: dto.name });
    const created = await this.subjectRepository.create(subject);
    return this.mapToResponse(created);
  }

  async search(params: {
    institutionId: number;
    query?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<ReturnType<Subject['toResponse']>>> {
    const { subjects, total } = await this.subjectRepository.search(params);
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const totalPages = Math.ceil(total / limit);
    return {
      data: subjects.map((s) => this.mapToResponse(s)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findByName(name: string, institutionId: number) {
    const subject = await this.subjectRepository.findByName(name, institutionId);
    if (!subject) throw new NotFoundException('Предмет не найден');
    if (institutionId !== undefined && subject.institutionId !== institutionId) {
      throw new ForbiddenException('Нет доступа к предмету из другого учреждения');
    }
    return this.mapToResponse(subject);
  }

  async findById(id: number, institutionId?: number, options?: IFindOneOptions) {
    const subject = await this.subjectRepository.findById(id);

    if (!subject) return null;
    if (institutionId !== undefined && subject.institutionId !== institutionId) {
      throw new ForbiddenException('Нет доступа к предмету из другого учреждения');
    }

    const base = this.mapToResponse(subject);
    if (!shouldIncludeTeachers(options) && !shouldIncludeGroups(options)) return base;
    const [teachers, groups] = await Promise.all([
      shouldIncludeTeachers(options)
        ? this.teacherService.findBySubjectId(id, institutionId, true)
        : Promise.resolve([]),
      shouldIncludeGroups(options)
        ? this.groupService.findBySubjectId(id, institutionId)
    : Promise.resolve([]),
    ]);
    return {
      ...base,
      ...(shouldIncludeTeachers(options) && {
        teachers: teachers.map((t) => t.toResponse(true)),
      }),
      ...(shouldIncludeGroups(options) && {
        groups: groups.map((g) => g.toResponse()),
      }),
    };
  }

  async findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
  ) {
    const { subjects, total } = await this.subjectRepository.findByInstitutionId(
      institutionId,
      page,
      limit,
    );
    const currentPage = page ?? 1;
    const pageLimit = limit ?? 10;
    const totalPages = Math.ceil(total / pageLimit);
    return {
      data: subjects.map(this.mapToResponse),
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages,
    };
  }

  async update(id: number, dto: UpdateSubjectDto, institutionId?: number) {
    const existing = await this.subjectRepository.findById(id);
    if (!existing) throw new NotFoundException('Предмет не найден');
    if (institutionId !== undefined && existing.institutionId !== institutionId) {
      throw new ForbiddenException('Нет доступа к предмету из другого учреждения');
    }
    const updated = await this.subjectRepository.update(id, dto);
    return this.mapToResponse(updated);
  }

  async remove(id: number, institutionId?: number) {
    const subject = await this.subjectRepository.findById(id);
    if (!subject) throw new NotFoundException('Предмет не найден');
    if (institutionId !== undefined && subject.institutionId !== institutionId) {
      throw new ForbiddenException('Нет доступа к удалению предмета из другого учреждения');
    }
    await this.subjectRepository.remove(id);
  }

  async assignTeachers(
    subjectId: number,
    teacherIds: number[],
    institutionId: number,
  ) {
    await this.findById(subjectId, institutionId);
    for (const teacherId of teacherIds) {
      await this.teacherService.findById(teacherId, institutionId);
    }

    const existing = await this.subjectRepository.findExistingTeachersBySubject(subjectId, teacherIds);
    if (existing.length > 0) {
      const names = existing.map((t) => `«${t.name}»`).join(', ');
      throw new ConflictException(
        `Преподаватели ${names} уже привязаны к этому предмету`,
      );
    }

    await this.subjectRepository.assignTeachers(subjectId, teacherIds);
    return this.findById(subjectId, institutionId);
  }

  async unassignTeacher(subjectId: number, teacherId: number, institutionId: number) {
    await this.findById(subjectId, institutionId);
    await this.teacherService.findById(teacherId, institutionId);
    await this.subjectRepository.unassignTeacher(subjectId, teacherId);
  }

  async assignGroups(subjectId: number, groupIds: number[], institutionId: number) {
    await this.findById(subjectId, institutionId);
    for (const groupId of groupIds) {
      await this.groupService.findById(groupId, institutionId);
    }

    const existing = await this.subjectRepository.findExistingGroupsBySubject(subjectId, groupIds);
    if (existing.length > 0) {
      const names = existing.map((g) => `«${g.name}»`).join(', ');
      throw new ConflictException(
        `Группы ${names} уже привязаны к этому предмету`,
      );
    }

    await this.subjectRepository.assignGroups(subjectId, groupIds);
    return this.findById(subjectId, institutionId);
  }

  async unassignGroup(subjectId: number, groupId: number, institutionId: number) {
    await this.findById(subjectId, institutionId);
    await this.groupService.findById(groupId, institutionId);
    await this.subjectRepository.unassignGroup(subjectId, groupId);
  }
}