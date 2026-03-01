import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Floor } from 'src/floor/domain/entities/floor.entity';
import type {
  IFloorRepository,
  FloorNestedClassroom,
  FloorWithClassrooms,
} from 'src/floor/domain/floor-repository.interface';

const floorSelect = {
  id: true,
  buildingId: true,
  number: true,
} as const;

@Injectable()
export class FloorRepository implements IFloorRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(raw: {
    id: number;
    buildingId: number;
    number: number;
  }): Floor {
    return Floor.fromPersistence({
      id: raw.id,
      buildingId: raw.buildingId,
      number: raw.number,
    });
  }

  async create(
    data: Omit<Floor, 'id' | 'toPersistence' | 'toResponse'>,
  ): Promise<Floor> {
    try {
      const floor = Floor.create({
        buildingId: data.buildingId,
        number: data.number,
      });
      const saved = await this.prisma.floor.create({
        data: floor.toPersistence(),
        select: floorSelect,
      });
      return this.mapToDomain(saved);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Этаж с таким номером в здании уже существует',
          );
        }
      }
      throw new InternalServerErrorException('Ошибка при создании этажа');
    }
  }

  async findById(id: number): Promise<Floor | null> {
    const raw = await this.prisma.floor.findUnique({
      where: { id },
      select: floorSelect,
    });
    return raw ? this.mapToDomain(raw) : null;
  }

  async getInstitutionIdByFloorId(floorId: number): Promise<number | null> {
    const raw = await this.prisma.floor.findUnique({
      where: { id: floorId },
      select: { building: { select: { institutionId: true } } },
    });
    return raw?.building?.institutionId ?? null;
  }

  async findByIdWithClassrooms(
    id: number,
  ): Promise<FloorWithClassrooms | null> {
    const raw = await this.prisma.floor.findUnique({
      where: { id },
      select: {
        ...floorSelect,
        classrooms: {
          select: { id: true, floorId: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!raw) return null;
    const floor = this.mapToDomain(raw);
    const classrooms: FloorNestedClassroom[] = raw.classrooms.map((c) => ({
      id: c.id,
      floorId: c.floorId,
      name: c.name,
    }));
    return { ...floor.toResponse(), classrooms };
  }

  async findByBuildingId(
    buildingId: number,
    page?: number,
    limit?: number,
  ): Promise<{ floors: Floor[]; total: number }> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;
    const total = await this.prisma.floor.count({
      where: { buildingId },
    });
    const raw = await this.prisma.floor.findMany({
      where: { buildingId },
      select: floorSelect,
      skip,
      take,
      orderBy: [{ number: 'asc' }, { id: 'asc' }],
    });
    return {
      floors: raw.map(this.mapToDomain),
      total,
    };
  }

  async search(params: {
    buildingId?: number;
    institutionId?: number;
    number?: number;
    page?: number;
    limit?: number;
  }): Promise<{ floors: Floor[]; total: number }> {
    const where: Prisma.FloorWhereInput = {};
    if (params.buildingId !== undefined) {
      where.buildingId = params.buildingId;
    }
    if (params.institutionId !== undefined) {
      where.building = { institutionId: params.institutionId };
    }
    if (params.number !== undefined) {
      where.number = params.number;
    }
    const total = await this.prisma.floor.count({ where });
    const skip =
      params.page && params.limit ? (params.page - 1) * params.limit : undefined;
    const take = params.limit;
    const raw = await this.prisma.floor.findMany({
      where,
      select: floorSelect,
      skip,
      take,
      orderBy: [{ number: 'asc' }, { id: 'asc' }],
    });
    return {
      floors: raw.map(this.mapToDomain),
      total,
    };
  }

  async update(
    id: number,
    data: Partial<Omit<Floor, 'id'>>,
  ): Promise<Floor> {
    try {
      const updateData: Prisma.FloorUpdateInput =
        data instanceof Floor ? data.toPersistence() : data;
      const updated = await this.prisma.floor.update({
        where: { id },
        data: updateData,
        select: floorSelect,
      });
      return this.mapToDomain(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Этаж с таким номером в здании уже существует',
          );
        }
      }
      throw new InternalServerErrorException('Ошибка при обновлении этажа');
    }
  }

  async remove(id: number): Promise<void> {
    await this.prisma.floor.delete({ where: { id } });
  }
}
