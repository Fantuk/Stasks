import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BellTemplate } from 'src/bell-template/domain/entities/bell-template.entity';
import type {
  IBellTemplateRepository,
  IBellTemplateFindParams,
  IBulkScopeFilter,
  IBulkScopeUpdate,
} from 'src/bell-template/domain/bell-template-repository.interface';

const bellTemplateSelect = {
  id: true,
  institutionId: true,
  groupId: true,
  scheduleType: true,
  specificDate: true,
  weekdayStart: true,
  weekdayEnd: true,
  lessonNumber: true,
  startTime: true,
  endTime: true,
} as const;

@Injectable()
export class BellTemplateRepository implements IBellTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(raw: {
    id: number;
    institutionId: number;
    groupId: number | null;
    scheduleType: string;
    specificDate: Date | null;
    weekdayStart: number | null;
    weekdayEnd: number | null;
    lessonNumber: number;
    startTime: Date;
    endTime: Date;
  }): BellTemplate {
    return BellTemplate.fromPersistence({
      id: raw.id,
      institutionId: raw.institutionId,
      groupId: raw.groupId,
      scheduleType: raw.scheduleType as any,
      specificDate: raw.specificDate,
      weekdayStart: raw.weekdayStart,
      weekdayEnd: raw.weekdayEnd,
      lessonNumber: raw.lessonNumber,
      startTime: raw.startTime,
      endTime: raw.endTime,
    });
  }

  async create(
    data: Omit<BellTemplate, 'id' | 'toPersistence' | 'toResponse'>,
  ): Promise<BellTemplate> {
    try {
      const template = BellTemplate.create({
        institutionId: data.institutionId,
        groupId: data.groupId,
        scheduleType: data.scheduleType,
        specificDate: data.specificDate,
        weekdayStart: data.weekdayStart,
        weekdayEnd: data.weekdayEnd,
        lessonNumber: data.lessonNumber,
        startTime: data.startTime,
        endTime: data.endTime,
      });
      // Используем connect для связей, чтобы Prisma проверил существование institution и group
      const createData: Prisma.BellTemplateCreateInput = {
        institution: { connect: { id: data.institutionId } },
        scheduleType: data.scheduleType,
        specificDate: data.specificDate,
        weekdayStart: data.weekdayStart,
        weekdayEnd: data.weekdayEnd,
        lessonNumber: data.lessonNumber,
        startTime: data.startTime,
        endTime: data.endTime,
      };
      if (data.groupId != null) {
        createData.group = { connect: { id: data.groupId } };
      }
      const saved = await this.prisma.bellTemplate.create({
        data: createData,
        select: bellTemplateSelect,
      });
      return this.mapToDomain(saved);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Шаблон с таким номером урока уже существует для данной группы/даты/дней недели',
          );
        }
        // Нарушение внешнего ключа (учреждение или группа не найдены)
        if (error.code === 'P2003') {
          throw new ConflictException(
            'Указанное учреждение или группа не найдены. Проверьте institutionId и groupId.',
          );
        }
      }
      // Логируем исходную ошибку для отладки (в проде можно убрать или писать в логгер)
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Ошибка при создании шаблона звонков: ${message}`,
      );
    }
  }

  async findById(id: number): Promise<BellTemplate | null> {
    const raw = await this.prisma.bellTemplate.findUnique({
      where: { id },
      select: bellTemplateSelect,
    });
    return raw ? this.mapToDomain(raw) : null;
  }

  /** Кандидаты для авто-подбора: по учреждению, номеру урока, группе или общие (сначала группы) */
  async findCandidatesForSchedule(
    institutionId: number,
    groupId: number,
    lessonNumber: number,
  ): Promise<BellTemplate[]> {
    const raw = await this.prisma.bellTemplate.findMany({
      where: {
        institutionId,
        lessonNumber,
        OR: [{ groupId }, { groupId: null }],
      },
      select: bellTemplateSelect,
      orderBy: { groupId: 'desc' }, // group-specific first (groupId not null), then institution-wide (null)
    });
    return raw.map((r) => this.mapToDomain(r));
  }

  async findByInstitutionId(
    params: IBellTemplateFindParams,
  ): Promise<{ templates: BellTemplate[]; total: number }> {
    const where: Prisma.BellTemplateWhereInput = {
      institutionId: params.institutionId,
    };

    // Фильтр по группе: если groupId === null, ищем общие шаблоны (groupId IS NULL)
    // если groupId === undefined, не фильтруем
    if (params.groupId !== undefined) {
      if (params.groupId === null) {
        where.groupId = null;
      } else {
        where.groupId = params.groupId;
      }
    }

    // Фильтр по типу расписания
    if (params.scheduleType) {
      where.scheduleType = params.scheduleType;
    }

    const total = await this.prisma.bellTemplate.count({ where });
    const skip =
      params.page && params.limit ? (params.page - 1) * params.limit : undefined;
    const take = params.limit;

    const raw = await this.prisma.bellTemplate.findMany({
      where,
      select: bellTemplateSelect,
      skip,
      take,
      orderBy: [
        { groupId: 'asc' },
        { scheduleType: 'asc' },
        { lessonNumber: 'asc' },
      ],
    });

    return {
      templates: raw.map(this.mapToDomain),
      total,
    };
  }

  async update(
    id: number,
    data: Partial<Omit<BellTemplate, 'id'>>,
  ): Promise<BellTemplate> {
    try {
      // Prisma UpdateInput для связей использует connect/disconnect, не скалярные поля
      const updateData: Prisma.BellTemplateUpdateInput = {};

      if (data.groupId !== undefined) {
        updateData.group = data.groupId !== null
          ? { connect: { id: data.groupId } }
          : { disconnect: true };
      }
      if (data.scheduleType !== undefined) updateData.scheduleType = data.scheduleType;
      if (data.specificDate !== undefined) updateData.specificDate = data.specificDate;
      if (data.weekdayStart !== undefined) updateData.weekdayStart = data.weekdayStart;
      if (data.weekdayEnd !== undefined) updateData.weekdayEnd = data.weekdayEnd;
      if (data.lessonNumber !== undefined) updateData.lessonNumber = data.lessonNumber;
      if (data.startTime !== undefined) updateData.startTime = data.startTime;
      if (data.endTime !== undefined) updateData.endTime = data.endTime;

      const updated = await this.prisma.bellTemplate.update({
        where: { id },
        data: updateData,
        select: bellTemplateSelect,
      });
      return this.mapToDomain(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Шаблон с таким номером урока уже существует для данной группы/даты/дней недели',
          );
        }
        if (error.code === 'P2025') {
          throw new InternalServerErrorException('Шаблон не найден');
        }
      }
      throw new InternalServerErrorException('Ошибка при обновлении шаблона звонков');
    }
  }

  /** Массово обновить scope у всех строк, попадающих под фильтр (одна транзакция) */
  async bulkUpdateScope(
    institutionId: number,
    filter: IBulkScopeFilter,
    update: IBulkScopeUpdate,
  ): Promise<{ count: number }> {
    const where: Prisma.BellTemplateWhereInput = {
      institutionId,
      scheduleType: filter.scheduleType,
    };

    if (filter.groupId !== undefined) {
      where.groupId = filter.groupId ?? null;
    }
    if (filter.scheduleType === 'date' && filter.specificDate != null) {
      where.specificDate = filter.specificDate;
    }
    if (filter.scheduleType === 'weekday') {
      if (filter.weekdayStart != null) where.weekdayStart = filter.weekdayStart;
      if (filter.weekdayEnd != null) where.weekdayEnd = filter.weekdayEnd;
    }

    const templates = await this.prisma.bellTemplate.findMany({
      where,
      select: { id: true },
    });

    if (templates.length === 0) {
      return { count: 0 };
    }

    const updateData: Prisma.BellTemplateUpdateInput = {};
    if (update.groupId !== undefined) {
      updateData.group = update.groupId !== null
        ? { connect: { id: update.groupId } }
        : { disconnect: true };
    }
    if (update.scheduleType !== undefined) {
      updateData.scheduleType = update.scheduleType;
    }
    if (update.specificDate !== undefined) {
      updateData.specificDate = update.specificDate;
    }
    if (update.weekdayStart !== undefined) {
      updateData.weekdayStart = update.weekdayStart;
    }
    if (update.weekdayEnd !== undefined) {
      updateData.weekdayEnd = update.weekdayEnd;
    }

    try {
      await this.prisma.$transaction(
        templates.map((t) =>
          this.prisma.bellTemplate.update({
            where: { id: t.id },
            data: updateData,
          }),
        ),
      );
      return { count: templates.length };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'После смены scope возник конфликт уникальности. Возможно, такие строки уже есть в целевом scope.',
          );
        }
        if (error.code === 'P2003') {
          throw new ConflictException('Указанная группа не найдена.');
        }
      }
      throw new InternalServerErrorException(
        'Ошибка при массовом обновлении scope шаблонов звонков',
      );
    }
  }

  /** Удалить все строки шаблона, попадающие под фильтр */
  async bulkDeleteByScope(
    institutionId: number,
    filter: IBulkScopeFilter,
  ): Promise<{ count: number }> {
    const where: Prisma.BellTemplateWhereInput = {
      institutionId,
      scheduleType: filter.scheduleType,
    };

    if (filter.groupId !== undefined) {
      where.groupId = filter.groupId ?? null;
    }
    if (filter.scheduleType === 'date' && filter.specificDate != null) {
      where.specificDate = filter.specificDate;
    }
    if (filter.scheduleType === 'weekday') {
      if (filter.weekdayStart != null) where.weekdayStart = filter.weekdayStart;
      if (filter.weekdayEnd != null) where.weekdayEnd = filter.weekdayEnd;
    }

    try {
      const result = await this.prisma.bellTemplate.deleteMany({ where });
      return { count: result.count };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ConflictException(
            'Невозможно удалить: часть шаблонов используется в расписании. Сначала удалите или измените занятия.',
          );
        }
      }
      throw new InternalServerErrorException(
        'Ошибка при массовом удалении шаблонов звонков',
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.bellTemplate.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ConflictException(
            'Невозможно удалить: шаблон используется в расписании',
          );
        }
        if (error.code === 'P2025') {
          throw new InternalServerErrorException('Шаблон не найден');
        }
      }
      throw new InternalServerErrorException('Ошибка при удалении шаблона звонков');
    }
  }
}
