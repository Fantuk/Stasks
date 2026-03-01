import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ensureInstitutionAccess } from 'src/common/utils/institution-access.utils';
import { Building } from 'src/building/domain/entities/building.entity';
import type { IBuildingRepository } from 'src/building/domain/building-repository.interface';
import type { IBuildingFindOptions } from 'src/common/interfaces/find-options.interface';
import {
  shouldIncludeFloors,
  shouldIncludeFloorsClassrooms,
} from 'src/common/utils/query.utils';
import { paginate } from 'src/common/utils/pagination.utils';
import { CreateBuildingDto } from 'src/building/application/dto/create-building.dto';
import { UpdateBuildingDto } from 'src/building/application/dto/update-building.dto';
import { PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class BuildingService {
  constructor(
    @Inject('BuildingRepository')
    private readonly buildingRepository: IBuildingRepository,
  ) {}

  private mapToResponse(building: Building) {
    return building.toResponse();
  }

  async create(dto: CreateBuildingDto, institutionId: number) {
    const building = Building.create({ institutionId, name: dto.name });
    const created = await this.buildingRepository.create(building);
    return this.mapToResponse(created);
  }

  async findById(id: number, institutionId?: number, options?: IBuildingFindOptions) {
    const includeFloors = shouldIncludeFloors(options);
    const includeClassrooms = shouldIncludeFloorsClassrooms(options);

    if (includeFloors) {
      const data = await this.buildingRepository.findByIdWithFloors(id, includeClassrooms);
      if (!data) return null;
      ensureInstitutionAccess(
        data.institutionId,
        institutionId,
        'Нет доступа к зданию из другого учреждения',
      );
      return data;
    }

    const building = await this.buildingRepository.findById(id);
    if (!building) return null;
    ensureInstitutionAccess(
      building.institutionId,
      institutionId,
      'Нет доступа к зданию из другого учреждения',
    );
    return this.mapToResponse(building);
  }

  async findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
  ) {
    const { buildings, total } = await this.buildingRepository.findByInstitutionId(
      institutionId,
      page,
      limit,
    );
    return paginate(buildings.map(this.mapToResponse), total, page, limit);
  }

  async search(params: {
    institutionId: number;
    query?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<ReturnType<Building['toResponse']>>> {
    const { buildings, total } = await this.buildingRepository.search(params);
    return paginate(
      buildings.map((b) => this.mapToResponse(b)),
      total,
      params.page,
      params.limit,
    );
  }

  async update(id: number, updateDto: UpdateBuildingDto, institutionId?: number) {
    const existing = await this.buildingRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Здание не найдено');
    }
    ensureInstitutionAccess(
      existing.institutionId,
      institutionId,
      'Нет доступа к зданию из другого учреждения',
    );
    const updated = await this.buildingRepository.update(id, updateDto);
    return this.mapToResponse(updated);
  }

  async remove(id: number, institutionId?: number) {
    const building = await this.buildingRepository.findById(id);
    if (!building) {
      throw new NotFoundException('Здание не найдено');
    }
    ensureInstitutionAccess(
      building.institutionId,
      institutionId,
      'Нет доступа к удалению здания из другого учреждения',
    );
    await this.buildingRepository.remove(id);
  }
}
