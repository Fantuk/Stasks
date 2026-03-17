import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { handlePrismaUniqueConflict } from 'src/common/utils/prisma-error.utils';
import { Classroom } from 'src/classroom/domain/entities/classroom.entity';
import type {
  IClassroomRepository,
  ClassroomNestedBuilding,
  ClassroomNestedFloor,
  ClassroomWithFloor,
} from 'src/classroom/domain/classroom-repository.interface';

const classroomSelect = {
  id: true,
  floorId: true,
  name: true,
} as const;

@Injectable()
export class ClassroomRepository implements IClassroomRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(raw: { id: number; floorId: number; name: string }): Classroom {
    return Classroom.fromPersistence({
      id: raw.id,
      floorId: raw.floorId,
      name: raw.name,
    });
  }

  async create(data: Omit<Classroom, 'id' | 'toPersistence' | 'toResponse'>): Promise<Classroom> {
    try {
      const classroom = Classroom.create({
        floorId: data.floorId,
        name: data.name,
      });
      const saved = await this.prisma.classroom.create({
        data: classroom.toPersistence(),
        select: classroomSelect,
      });
      return this.mapToDomain(saved);
    } catch (error) {
      handlePrismaUniqueConflict(
        error,
        'Аудитория с таким именем на этаже уже существует',
        'Ошибка при создании аудитории',
      );
    }
  }

  async findById(id: number): Promise<Classroom | null> {
    const raw = await this.prisma.classroom.findUnique({
      where: { id },
      select: classroomSelect,
    });
    return raw ? this.mapToDomain(raw) : null;
  }

  async getInstitutionIdByClassroomId(classroomId: number): Promise<number | null> {
    const raw = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        floor: { select: { building: { select: { institutionId: true } } } },
      },
    });
    return raw?.floor?.building?.institutionId ?? null;
  }

  async findByIdWithFloor(id: number): Promise<ClassroomWithFloor | null> {
    const raw = await this.prisma.classroom.findUnique({
      where: { id },
      select: {
        ...classroomSelect,
        floor: {
          select: {
            id: true,
            buildingId: true,
            number: true,
            building: {
              select: { institutionId: true, id: true, name: true },
            },
          },
        },
      },
    });
    if (!raw) return null;
    const classroom = this.mapToDomain(raw);
    const building = raw.floor.building as {
      id: number;
      name: string;
      institutionId: number;
    } | null;
    const floor: ClassroomNestedFloor = {
      id: raw.floor.id,
      buildingId: raw.floor.buildingId,
      number: raw.floor.number,
      ...(building && {
        building: { id: building.id, name: building.name } as ClassroomNestedBuilding,
      }),
    };
    const institutionId = (raw.floor.building as { institutionId: number }).institutionId;
    return { ...classroom.toResponse(), floor, institutionId };
  }

  async findByFloorId(
    floorId: number,
    page?: number,
    limit?: number,
  ): Promise<{ classrooms: Classroom[]; total: number }> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;
    const total = await this.prisma.classroom.count({
      where: { floorId },
    });
    const raw = await this.prisma.classroom.findMany({
      where: { floorId },
      select: classroomSelect,
      skip,
      take,
      orderBy: { name: 'asc' },
    });
    return {
      classrooms: raw.map(this.mapToDomain),
      total,
    };
  }

  async search(params: {
    floorId?: number;
    institutionId?: number;
    query?: string;
    page?: number;
    limit?: number;
  }): Promise<{ classrooms: Classroom[]; total: number }> {
    const where: Prisma.ClassroomWhereInput = {};
    if (params.floorId !== undefined) {
      where.floorId = params.floorId;
    }
    if (params.institutionId !== undefined) {
      where.floor = { building: { institutionId: params.institutionId } };
    }
    if (params.query?.trim()) {
      where.name = {
        contains: params.query.trim(),
        mode: 'insensitive',
      };
    }
    const total = await this.prisma.classroom.count({ where });
    const skip = params.page && params.limit ? (params.page - 1) * params.limit : undefined;
    const take = params.limit;
    const raw = await this.prisma.classroom.findMany({
      where,
      select: classroomSelect,
      skip,
      take,
      orderBy: { name: 'asc' },
    });
    return {
      classrooms: raw.map(this.mapToDomain),
      total,
    };
  }

  async update(id: number, data: Partial<Omit<Classroom, 'id'>>): Promise<Classroom> {
    try {
      const updateData = data as Prisma.ClassroomUpdateInput;
      const updated = await this.prisma.classroom.update({
        where: { id },
        data: updateData,
        select: classroomSelect,
      });
      return this.mapToDomain(updated);
    } catch (error) {
      handlePrismaUniqueConflict(
        error,
        'Аудитория с таким именем на этаже уже существует',
        'Ошибка при обновлении аудитории',
      );
    }
  }

  async remove(id: number): Promise<void> {
    await this.prisma.classroom.delete({ where: { id } });
  }
}
