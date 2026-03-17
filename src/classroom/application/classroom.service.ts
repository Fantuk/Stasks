import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ensureInstitutionAccess } from 'src/common/utils/institution-access.utils';
import { Classroom } from 'src/classroom/domain/entities/classroom.entity';
import type { IClassroomRepository } from 'src/classroom/domain/classroom-repository.interface';
import type { IClassroomFindOptions } from 'src/common/interfaces/find-options.interface';
import { shouldIncludeFloor } from 'src/common/utils/query.utils';
import { paginate } from 'src/common/utils/pagination.utils';
import { CreateClassroomDto } from 'src/classroom/application/dto/create-classroom.dto';
import { UpdateClassroomDto } from 'src/classroom/application/dto/update-classroom.dto';
import { FloorService } from 'src/floor/application/floor.service';
import { PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class ClassroomService {
  constructor(
    @Inject('ClassroomRepository')
    private readonly classroomRepository: IClassroomRepository,
    private readonly floorService: FloorService,
  ) {}

  private mapToResponse(classroom: Classroom) {
    return classroom.toResponse();
  }

  private async ensureFloorAccess(floorId: number, institutionId: number): Promise<void> {
    await this.floorService.findById(floorId, institutionId);
  }

  private getInstitutionIdByClassroomId(classroomId: number): Promise<number | null> {
    return this.classroomRepository.getInstitutionIdByClassroomId(classroomId);
  }

  async create(dto: CreateClassroomDto, institutionId: number) {
    await this.ensureFloorAccess(dto.floorId, institutionId);
    const classroom = Classroom.create({
      floorId: dto.floorId,
      name: dto.name,
    });
    const created = await this.classroomRepository.create(classroom);
    return this.mapToResponse(created);
  }

  async findById(id: number, institutionId?: number, options?: IClassroomFindOptions) {
    const includeFloor = shouldIncludeFloor(options);

    if (includeFloor) {
      const data = await this.classroomRepository.findByIdWithFloor(id);
      if (!data) return null;
      ensureInstitutionAccess(
        data.institutionId,
        institutionId,
        'Нет доступа к аудитории из другого учреждения',
      );
      return data;
    }

    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) return null;
    const classInstitutionId = await this.getInstitutionIdByClassroomId(id);
    ensureInstitutionAccess(
      classInstitutionId,
      institutionId,
      'Нет доступа к аудитории из другого учреждения',
    );
    return this.mapToResponse(classroom);
  }

  async findByFloorId(floorId: number, institutionId: number, page?: number, limit?: number) {
    await this.ensureFloorAccess(floorId, institutionId);
    const { classrooms, total } = await this.classroomRepository.findByFloorId(
      floorId,
      page,
      limit,
    );
    return paginate(classrooms.map(this.mapToResponse), total, page, limit);
  }

  async search(params: {
    institutionId: number;
    floorId?: number;
    query?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<ReturnType<Classroom['toResponse']>>> {
    const { classrooms, total } = await this.classroomRepository.search({
      institutionId: params.institutionId,
      floorId: params.floorId,
      query: params.query,
      page: params.page,
      limit: params.limit,
    });
    return paginate(
      classrooms.map((c) => this.mapToResponse(c)),
      total,
      params.page,
      params.limit,
    );
  }

  async update(id: number, updateDto: UpdateClassroomDto, institutionId?: number) {
    const existing = await this.classroomRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Аудитория не найдена');
    }
    if (institutionId !== undefined) {
      const classInstitutionId = await this.getInstitutionIdByClassroomId(id);
      ensureInstitutionAccess(
        classInstitutionId,
        institutionId,
        'Нет доступа к аудитории из другого учреждения',
      );
    }
    if (updateDto.floorId !== undefined) {
      await this.ensureFloorAccess(updateDto.floorId, institutionId!);
    }
    const updated = await this.classroomRepository.update(id, updateDto);
    return this.mapToResponse(updated);
  }

  async remove(id: number, institutionId?: number) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) {
      throw new NotFoundException('Аудитория не найдена');
    }
    if (institutionId !== undefined) {
      const classInstitutionId = await this.getInstitutionIdByClassroomId(id);
      ensureInstitutionAccess(
        classInstitutionId,
        institutionId,
        'Нет доступа к удалению аудитории из другого учреждения',
      );
    }
    await this.classroomRepository.remove(id);
  }
}
