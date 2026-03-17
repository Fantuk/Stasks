import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ensureInstitutionAccess } from 'src/common/utils/institution-access.utils';
import { Floor } from 'src/floor/domain/entities/floor.entity';
import type { IFloorRepository } from 'src/floor/domain/floor-repository.interface';
import type { IFloorFindOptions } from 'src/common/interfaces/find-options.interface';
import { shouldIncludeClassrooms } from 'src/common/utils/query.utils';
import { paginate } from 'src/common/utils/pagination.utils';
import { CreateFloorDto } from 'src/floor/application/dto/create-floor.dto';
import { UpdateFloorDto } from 'src/floor/application/dto/update-floor.dto';
import { BuildingService } from 'src/building/application/building.service';
import { PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class FloorService {
  constructor(
    @Inject('FloorRepository')
    private readonly floorRepository: IFloorRepository,
    private readonly buildingService: BuildingService,
  ) {}

  private mapToResponse(floor: Floor) {
    return floor.toResponse();
  }

  private async ensureBuildingAccess(buildingId: number, institutionId: number): Promise<void> {
    const building = await this.buildingService.findById(buildingId, institutionId);
    if (!building) {
      throw new ForbiddenException('Нет доступа к зданию или здание не найдено');
    }
  }

  private getInstitutionIdByFloorId(floorId: number): Promise<number | null> {
    return this.floorRepository.getInstitutionIdByFloorId(floorId);
  }

  async create(dto: CreateFloorDto, institutionId: number) {
    await this.ensureBuildingAccess(dto.buildingId, institutionId);
    const floor = Floor.create({ buildingId: dto.buildingId, number: dto.number });
    const created = await this.floorRepository.create(floor);
    return this.mapToResponse(created);
  }

  async findById(id: number, institutionId?: number, options?: IFloorFindOptions) {
    const includeClassrooms = shouldIncludeClassrooms(options);

    if (includeClassrooms) {
      const data = await this.floorRepository.findByIdWithClassrooms(id);
      if (!data) return null;
      const floorInstitutionId = await this.getInstitutionIdByFloorId(id);
      ensureInstitutionAccess(
        floorInstitutionId,
        institutionId,
        'Нет доступа к этажу из другого учреждения',
      );
      return data;
    }

    const floor = await this.floorRepository.findById(id);
    if (!floor) return null;
    const floorInstitutionId = await this.getInstitutionIdByFloorId(id);
    ensureInstitutionAccess(
      floorInstitutionId,
      institutionId,
      'Нет доступа к этажу из другого учреждения',
    );
    return this.mapToResponse(floor);
  }

  async findByBuildingId(buildingId: number, institutionId: number, page?: number, limit?: number) {
    await this.ensureBuildingAccess(buildingId, institutionId);
    const { floors, total } = await this.floorRepository.findByBuildingId(buildingId, page, limit);
    return paginate(floors.map(this.mapToResponse), total, page, limit);
  }

  async search(params: {
    institutionId: number;
    buildingId?: number;
    number?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<ReturnType<Floor['toResponse']>>> {
    const { floors, total } = await this.floorRepository.search({
      institutionId: params.institutionId,
      buildingId: params.buildingId,
      number: params.number,
      page: params.page,
      limit: params.limit,
    });
    return paginate(
      floors.map((f) => this.mapToResponse(f)),
      total,
      params.page,
      params.limit,
    );
  }

  async update(id: number, updateDto: UpdateFloorDto, institutionId?: number) {
    const existing = await this.floorRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Этаж не найден');
    }
    if (institutionId !== undefined) {
      const floorInstitutionId = await this.getInstitutionIdByFloorId(id);
      ensureInstitutionAccess(
        floorInstitutionId,
        institutionId,
        'Нет доступа к этажу из другого учреждения',
      );
    }
    if (updateDto.buildingId !== undefined) {
      await this.ensureBuildingAccess(updateDto.buildingId, institutionId!);
    }
    const updated = await this.floorRepository.update(id, updateDto);
    return this.mapToResponse(updated);
  }

  async remove(id: number, institutionId?: number) {
    const floor = await this.floorRepository.findById(id);
    if (!floor) {
      throw new NotFoundException('Этаж не найден');
    }
    if (institutionId !== undefined) {
      const floorInstitutionId = await this.getInstitutionIdByFloorId(id);
      ensureInstitutionAccess(
        floorInstitutionId,
        institutionId,
        'Нет доступа к удалению этажа из другого учреждения',
      );
    }
    await this.floorRepository.remove(id);
  }
}
