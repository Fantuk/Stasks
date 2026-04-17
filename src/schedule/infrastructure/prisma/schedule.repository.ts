import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Schedule } from 'src/schedule/domain/entities/schedule.entity';
import type {
  IScheduleRepository,
  IScheduleFindParams,
  ScheduleTimeRange,
  ScheduleWithSlot,
} from 'src/schedule/domain/schedule-repository.interface';

/** Начало календарного дня (UTC) для переданной даты */
function startOfDayUTC(d: Date): Date {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

/** Конец календарного дня (UTC) для переданной даты */
function endOfDayUTC(d: Date): Date {
  const r = new Date(d);
  r.setUTCHours(23, 59, 59, 999);
  return r;
}

const scheduleSelect = {
  id: true,
  institutionId: true,
  subjectId: true,
  groupId: true,
  teacherId: true,
  classroomId: true,
  type: true,
  bellTemplateId: true,
  scheduleDate: true,
  scheduleSlotId: true,
} as const;

@Injectable()
export class ScheduleRepository implements IScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapTimeRanges(raw: {
    bellTemplate: {
      startTime: Date;
      endTime: Date;
      secondStartTime: Date | null;
      secondEndTime: Date | null;
    };
  }): ScheduleTimeRange[] {
    const ranges: ScheduleTimeRange[] = [
      {
        startTime: raw.bellTemplate.startTime,
        endTime: raw.bellTemplate.endTime,
      },
    ];

    if (raw.bellTemplate.secondStartTime && raw.bellTemplate.secondEndTime) {
      ranges.push({
        startTime: raw.bellTemplate.secondStartTime,
        endTime: raw.bellTemplate.secondEndTime,
      });
    }

    return ranges;
  }

  private mapToDomain(raw: {
    id: number;
    institutionId: number;
    subjectId: number;
    groupId: number;
    teacherId: number;
    classroomId: number | null;
    type: 'ONLINE' | 'TEST' | 'EXAM' | 'DISTANCE' | null;
    bellTemplateId: number;
    scheduleDate: Date;
    scheduleSlotId: string | null;
  }): Schedule {
    return Schedule.fromPersistence({
      id: raw.id,
      institutionId: raw.institutionId,
      subjectId: raw.subjectId,
      groupId: raw.groupId,
      teacherId: raw.teacherId,
      classroomId: raw.classroomId,
      type: raw.type,
      bellTemplateId: raw.bellTemplateId,
      scheduleDate: raw.scheduleDate,
      scheduleSlotId: raw.scheduleSlotId,
    });
  }

  async create(data: Omit<Schedule, 'id' | 'toPersistence' | 'toResponse'>): Promise<Schedule> {
    const saved = await this.prisma.schedule.create({
      data: {
        institutionId: data.institutionId,
        subjectId: data.subjectId,
        groupId: data.groupId,
        teacherId: data.teacherId,
        classroomId: data.classroomId ?? undefined,
            type: data.type ?? undefined,
        bellTemplateId: data.bellTemplateId,
        scheduleDate: data.scheduleDate,
        scheduleSlotId: data.scheduleSlotId ?? undefined,
      },
      select: scheduleSelect,
    });
    return this.mapToDomain(saved);
  }

  async createMany(
    data: Omit<Schedule, 'id' | 'toPersistence' | 'toResponse'>[],
  ): Promise<Schedule[]> {
    if (data.length === 0) return [];
    const saved = await this.prisma.$transaction(
      data.map((item) =>
        this.prisma.schedule.create({
          data: {
            institutionId: item.institutionId,
            subjectId: item.subjectId,
            groupId: item.groupId,
            teacherId: item.teacherId,
            classroomId: item.classroomId ?? undefined,
            type: item.type ?? undefined,
            bellTemplateId: item.bellTemplateId,
            scheduleDate: item.scheduleDate,
            scheduleSlotId: item.scheduleSlotId ?? undefined,
          },
          select: scheduleSelect,
        }),
      ),
    );
    return saved.map((r) => this.mapToDomain(r));
  }

  async findById(id: number): Promise<Schedule | null> {
    const raw = await this.prisma.schedule.findUnique({
      where: { id },
      select: scheduleSelect,
    });
    return raw ? this.mapToDomain(raw) : null;
  }

  async findMany(params: IScheduleFindParams): Promise<{ schedules: Schedule[]; total: number }> {
    const where: Prisma.ScheduleWhereInput = {
      institutionId: params.institutionId,
    };
    if (params.groupId != null) where.groupId = params.groupId;
    if (params.teacherId != null) where.teacherId = params.teacherId;
    if (params.classroomId != null) where.classroomId = params.classroomId;

    if (params.dateFrom != null || params.dateTo != null) {
      where.scheduleDate = {};
      if (params.dateFrom != null) {
        where.scheduleDate.gte = startOfDayUTC(params.dateFrom);
      }
      if (params.dateTo != null) {
        where.scheduleDate.lte = endOfDayUTC(params.dateTo);
      }
    }

    const total = await this.prisma.schedule.count({ where });
    const skip =
      params.page != null && params.limit != null ? (params.page - 1) * params.limit : undefined;
    const take = params.limit;
    const order = params.order ?? 'asc';
    const sortField = params.sort === 'id' ? 'id' : 'scheduleDate';
    const orderBy =
      sortField === 'scheduleDate'
        ? ([
            { scheduleDate: order },
            { bellTemplate: { startTime: order } },
          ] as Prisma.ScheduleOrderByWithRelationInput[])
        : { id: order };

    const raw = await this.prisma.schedule.findMany({
      where,
      select: {
        ...scheduleSelect,
        bellTemplate: {
          select: {
            startTime: true,
            endTime: true,
            secondStartTime: true,
            secondEndTime: true,
          },
        },
      },
      skip,
      take,
      orderBy,
    });

    const schedules = raw.map((r) =>
      this.mapToDomain({
        id: r.id,
        institutionId: r.institutionId,
        subjectId: r.subjectId,
        groupId: r.groupId,
        teacherId: r.teacherId,
        classroomId: r.classroomId,
        type: r.type,
        bellTemplateId: r.bellTemplateId,
        scheduleDate: r.scheduleDate,
        scheduleSlotId: r.scheduleSlotId,
      }),
    );
    return { schedules, total };
  }

  async update(id: number, data: Partial<Omit<Schedule, 'id'>>): Promise<Schedule> {
    const updateData: Prisma.ScheduleUpdateInput = {};
    if (data.subjectId !== undefined) {
      updateData.subject = { connect: { id: data.subjectId } };
    }
    if (data.groupId !== undefined) {
      updateData.group = { connect: { id: data.groupId } };
    }
    if (data.teacherId !== undefined) {
      updateData.teacher = { connect: { id: data.teacherId } };
    }
    if (data.classroomId === null) {
      (updateData as { classroomId?: number | null }).classroomId = null;
    } else if (data.classroomId !== undefined) {
      updateData.classroom = { connect: { id: data.classroomId } };
    }
    if (data.type === null) {
      updateData.type = null;
    } else if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.bellTemplateId !== undefined) {
      updateData.bellTemplate = { connect: { id: data.bellTemplateId } };
    }
    if (data.scheduleDate !== undefined) updateData.scheduleDate = data.scheduleDate;
    // scheduleSlotId не меняем при update (логическое занятие не разбиваем)
    if (data.scheduleSlotId !== undefined) {
      (updateData as { scheduleSlotId?: string | null }).scheduleSlotId = data.scheduleSlotId;
    }

    const updated = await this.prisma.schedule.update({
      where: { id },
      data: updateData,
      select: scheduleSelect,
    });
    return this.mapToDomain(updated);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.schedule.delete({ where: { id } });
  }

  async findByClassroomAndDate(classroomId: number, date: Date): Promise<ScheduleWithSlot[]> {
    const start = startOfDayUTC(date);
    const end = endOfDayUTC(date);
    const raw = await this.prisma.schedule.findMany({
      where: {
        classroomId,
        scheduleDate: { gte: start, lte: end },
      },
      select: {
        ...scheduleSelect,
        bellTemplate: {
          select: {
            startTime: true,
            endTime: true,
            secondStartTime: true,
            secondEndTime: true,
          },
        },
      },
    });
    return raw.map((r) => ({
      schedule: this.mapToDomain({
        id: r.id,
        institutionId: r.institutionId,
        subjectId: r.subjectId,
        groupId: r.groupId,
        teacherId: r.teacherId,
        classroomId: r.classroomId,
        type: r.type,
        bellTemplateId: r.bellTemplateId,
        scheduleDate: r.scheduleDate,
        scheduleSlotId: r.scheduleSlotId,
      }),
      timeRanges: this.mapTimeRanges(r),
    }));
  }

  async findByTeacherAndDate(teacherId: number, date: Date): Promise<ScheduleWithSlot[]> {
    const start = startOfDayUTC(date);
    const end = endOfDayUTC(date);
    const raw = await this.prisma.schedule.findMany({
      where: {
        teacherId,
        scheduleDate: { gte: start, lte: end },
      },
      select: {
        ...scheduleSelect,
        bellTemplate: {
          select: {
            startTime: true,
            endTime: true,
            secondStartTime: true,
            secondEndTime: true,
          },
        },
      },
    });
    return raw.map((r) => ({
      schedule: this.mapToDomain({
        id: r.id,
        institutionId: r.institutionId,
        subjectId: r.subjectId,
        groupId: r.groupId,
        teacherId: r.teacherId,
        classroomId: r.classroomId,
        type: r.type,
        bellTemplateId: r.bellTemplateId,
        scheduleDate: r.scheduleDate,
        scheduleSlotId: r.scheduleSlotId,
      }),
      timeRanges: this.mapTimeRanges(r),
    }));
  }

  async findByScheduleSlotId(scheduleSlotId: string): Promise<Schedule[]> {
    const raw = await this.prisma.schedule.findMany({
      where: { scheduleSlotId },
      select: scheduleSelect,
      orderBy: { id: 'asc' },
    });
    return raw.map((r) =>
      this.mapToDomain({
        id: r.id,
        institutionId: r.institutionId,
        subjectId: r.subjectId,
        groupId: r.groupId,
        teacherId: r.teacherId,
        classroomId: r.classroomId,
        type: r.type,
        bellTemplateId: r.bellTemplateId,
        scheduleDate: r.scheduleDate,
        scheduleSlotId: r.scheduleSlotId,
      }),
    );
  }
}
