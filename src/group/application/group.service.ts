import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException, forwardRef } from '@nestjs/common';
import { Group } from 'src/group/domain/entities/group.entity'
import type { IGroupRepository } from 'src/group/domain/group-repository.interface';
import { UpdateGroupDto } from 'src/group/application/dto/update-group.dto';
import { CreateGroupDto } from 'src/group/application/dto/create-group.dto';
import { StudentService } from 'src/student/application/student.service';
import { TeacherService } from 'src/teacher/application/teacher.service';
import { IFindOneOptions } from 'src/common/interfaces/find-options.interface';
import { shouldIncludeMembers } from 'src/common/utils/query.utils';
import { PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class GroupService {
    constructor(
        @Inject('GroupRepository') private readonly groupRepository: IGroupRepository,
        @Inject(forwardRef(() => TeacherService))
        private readonly teacherService: TeacherService,
        private readonly studentService: StudentService,
    ) { }

    private mapToResponse(group: Group) {
        return group.toResponse()
    }

    async create(dto: CreateGroupDto, institutionId: number) {
        const group = Group.create({ institutionId, name: dto.name })
        const created = await this.groupRepository.create(group)
        return this.mapToResponse(created)
    }

    async findById(
        id: number,
        institutionId?: number,
        options?: IFindOneOptions,
    ) {
        const group = await this.groupRepository.findById(id);
        if (!group) return null;

        if (institutionId !== undefined && group.institutionId !== institutionId) {
            throw new ForbiddenException('Нет доступа к группе из другого учреждения');
        }

        const base = this.mapToResponse(group);
        if (!shouldIncludeMembers(options)) return base;

        const [teacher, students] = await Promise.all([
            this.teacherService.findByMentoredGroupId(id, institutionId, true),
            this.studentService.findByGroupId(id, institutionId, { includeUser: true } as IFindOneOptions),
        ]);
        return {
            ...base,
            teacher: teacher?.toResponse(true) ?? null,
            students: students.map((s) => s.toResponse(true)),
        };
    }

    async findByInstitutionId(
        institutionId: number,
        page?: number,
        limit?: number
    ) {
        const { groups, total } = await this.groupRepository.findByInstitutionId(
            institutionId,
            page,
            limit
        )
        const currentPage = page ?? 1
        const pageLimit = limit ?? 10
        const totalPages = Math.ceil(total / pageLimit)
        return {
            data: groups.map(this.mapToResponse),
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages
        }
    }

    async findByName(name: string, institutionId: number) {
        const group = await this.groupRepository.findByName(name, institutionId);

        if (!group) {
            throw new NotFoundException('Группа не найдена')
        }

        if (institutionId !== undefined && group.institutionId !== institutionId) {
            throw new ForbiddenException(
                'Нет доступа к группе из другого учреждения',
            );
        }

        const [teacher, students] = await Promise.all([
            this.teacherService.findByMentoredGroupId(group.id!, institutionId, true),
            this.studentService.findByGroupId(group.id!, institutionId, { includeUser: true } as IFindOneOptions),
        ]);
        return {
            ...group,
            teacher: teacher?.toResponse(true) ?? null,
            students: students.map((s) => s.toResponse(true)),
        };
    }

    async findBySubjectId(
        subjectId: number,
        institutionId?: number,
    ): Promise<Group[]> {
        const groups = await this.groupRepository.findBySubjectId(subjectId, institutionId);
        return groups.filter((g) => g.institutionId === institutionId);
    }

    async search(params: {
        institutionId: number;
        query?: string;
        page?: number;
        limit?: number;
      }): Promise<PaginatedResult<ReturnType<Group['toResponse']>>> {
        const { groups, total } = await this.groupRepository.search(params);
        const page = params.page ?? 1;
        const limit = params.limit ?? 10;
        const totalPages = Math.ceil(total / limit);
        return {
          data: groups.map((g) => this.mapToResponse(g)),
          total,
          page,
          limit,
          totalPages,
        };
      }

    async update(id: number, updateDto: UpdateGroupDto, institutionId?: number) {
        const existing = await this.groupRepository.findById(id)

        if (!existing) {
            throw new NotFoundException("Группа не найдена")
        }

        if (institutionId !== undefined && existing.institutionId !== institutionId) {
            throw new ForbiddenException(
                'Нет доступа к группе из другого учреждения',
            );
        }

        const updated = await this.groupRepository.update(id, updateDto)
        return this.mapToResponse(updated)
    }

    async remove(id: number, institutionId?: number) {
        const group = await this.groupRepository.findById(id)

        if (!group) {
            throw new NotFoundException("Группа не найдена")
        }

        if (institutionId !== undefined && group.institutionId !== institutionId) {
            throw new ForbiddenException(
                'Нет доступа к удалению группы из другого учреждения',
            );
        }

        await this.groupRepository.remove(id)
    }

    async assignTeacher(
        groupId: number,
        teacherUserId: number,
        institutionId: number,
    ) {
        await this.findById(groupId, institutionId)
        const teacher = await this.teacherService.assignMentoredGroup(
            teacherUserId,
            groupId,
            institutionId
        )
        return teacher.toResponse()
    }

    async unassignTeacher(groupId: number, institutionId: number) {
        await this.findById(groupId, institutionId);
        const teacher = await this.teacherService.removeMentoredGroupByGroupId(
            groupId,
            institutionId,
        );
        return teacher ? teacher.toResponse() : null;
    }

    async assignStudents(
        groupId: number,
        studentUserIds: number[],
        institutionId: number,
    ) {
        await this.findById(groupId, institutionId);
        const results: { userId: number; success: boolean; error?: string }[] = [];
        for (const userId of studentUserIds) {
            try {
                await this.studentService.assignToGroup(userId, groupId, institutionId);
                results.push({ userId, success: true });
            } catch (e) {
                results.push({
                    userId,
                    success: false,
                    error: e instanceof Error ? e.message : 'Unknown error',
                });
            }
        }
        return results;
    }

    async unassignStudents(
        groupId: number,
        studentUserIds: number[],
        institutionId: number,
    ) {
        await this.findById(groupId, institutionId);
        const results: { userId: number; success: boolean; error?: string }[] = [];
        for (const userId of studentUserIds) {
            try {
                await this.studentService.removeFromGroup(userId, institutionId);
                results.push({ userId, success: true });
            } catch (e) {
                results.push({
                    userId,
                    success: false,
                    error: e instanceof Error ? e.message : 'Unknown error',
                });
            }
        }
        return results;
    }
}
