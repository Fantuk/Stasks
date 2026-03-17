import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { handlePrismaUniqueConflict } from 'src/common/utils/prisma-error.utils';
import { Building } from 'src/building/domain/entities/building.entity';
import type {
  IBuildingRepository,
  BuildingNestedFloor,
  BuildingWithFloors,
} from 'src/building/domain/building-repository.interface';

const buildingSelect = {
  id: true,
  institutionId: true,
  name: true,
} as const;

@Injectable()
export class BuildingRepository implements IBuildingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(raw: { id: number; institutionId: number; name: string }): Building {
    return Building.fromPersistence({
      id: raw.id,
      institutionId: raw.institutionId,
      name: raw.name,
    });
  }

  private mapFloors(
    raw: Array<{
      id: number;
      buildingId: number;
      number: number;
      classrooms?: Array<{ id: number; floorId: number; name: string }>;
    }>,
  ): BuildingNestedFloor[] {
    return raw.map((f) => ({
      id: f.id,
      buildingId: f.buildingId,
      number: f.number,
      ...(f.classrooms && { classrooms: f.classrooms }),
    }));
  }

  async create(data: Omit<Building, 'id' | 'toPersistence' | 'toResponse'>): Promise<Building> {
    try {
      const building = Building.create({
        institutionId: data.institutionId,
        name: data.name,
      });
      const saved = await this.prisma.building.create({
        data: building.toPersistence(),
        select: buildingSelect,
      });
      return this.mapToDomain(saved);
    } catch (error) {
      handlePrismaUniqueConflict(
        error,
        'Здание с таким именем уже существует',
        'Ошибка при создании здания',
      );
    }
  }

  async findById(id: number): Promise<Building | null> {
    const raw = await this.prisma.building.findUnique({
      where: { id },
      select: buildingSelect,
    });
    return raw ? this.mapToDomain(raw) : null;
  }

  async findByIdWithFloors(
    id: number,
    includeClassrooms = false,
  ): Promise<BuildingWithFloors | null> {
    const raw = await this.prisma.building.findUnique({
      where: { id },
      select: {
        ...buildingSelect,
        floors: {
          orderBy: { number: 'asc' },
          select: includeClassrooms
            ? {
                id: true,
                buildingId: true,
                number: true,
                classrooms: {
                  select: { id: true, floorId: true, name: true },
                  orderBy: { name: 'asc' },
                },
              }
            : { id: true, buildingId: true, number: true },
        },
      },
    });
    if (!raw) return null;
    const building = this.mapToDomain(raw);
    const floors = this.mapFloors(
      raw.floors as Array<{
        id: number;
        buildingId: number;
        number: number;
        classrooms?: Array<{ id: number; floorId: number; name: string }>;
      }>,
    );
    return { ...building.toResponse(), floors };
  }

  async findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
  ): Promise<{ buildings: Building[]; total: number }> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;
    const total = await this.prisma.building.count({
      where: { institutionId },
    });
    const raw = await this.prisma.building.findMany({
      where: { institutionId },
      select: buildingSelect,
      skip,
      take,
      orderBy: { id: 'asc' },
    });
    return {
      buildings: raw.map(this.mapToDomain),
      total,
    };
  }

  async search(params: {
    institutionId: number;
    query?: string;
    page?: number;
    limit?: number;
  }): Promise<{ buildings: Building[]; total: number }> {
    const where: Prisma.BuildingWhereInput = {
      institutionId: params.institutionId,
    };
    if (params.query?.trim()) {
      where.name = { contains: params.query.trim(), mode: 'insensitive' };
    }
    const total = await this.prisma.building.count({ where });
    const skip = params.page && params.limit ? (params.page - 1) * params.limit : undefined;
    const take = params.limit;
    const raw = await this.prisma.building.findMany({
      where,
      select: buildingSelect,
      skip,
      take,
      orderBy: { id: 'asc' },
    });
    return {
      buildings: raw.map(this.mapToDomain),
      total,
    };
  }

  async update(id: number, data: Partial<Omit<Building, 'id'>>): Promise<Building> {
    try {
      const updateData = data as Prisma.BuildingUpdateInput;
      const updated = await this.prisma.building.update({
        where: { id },
        data: updateData,
        select: buildingSelect,
      });
      return this.mapToDomain(updated);
    } catch (error) {
      handlePrismaUniqueConflict(
        error,
        'Здание с таким именем уже существует',
        'Ошибка при обновлении здания',
      );
    }
  }

  async remove(id: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Аудитории удаляем — у расписаний classroomId станет null (Schedule.classroom onDelete: SetNull)
      await tx.classroom.deleteMany({
        where: { floor: { buildingId: id } },
      });
      await tx.floor.deleteMany({
        where: { buildingId: id },
      });
      await tx.building.delete({ where: { id } });
    });
  }
}
