import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ensureInstitutionAccess } from 'src/common/utils/institution-access.utils';
import { BellTemplate } from 'src/bell-template/domain/entities/bell-template.entity';
import type {
  IBellTemplateRepository,
  IBulkScopeFilter,
  IBulkScopeUpdate,
} from 'src/bell-template/domain/bell-template-repository.interface';
import { CreateBellTemplateDto } from './dto/create-bell-template.dto';
import { UpdateBellTemplateDto } from './dto/update-bell-template.dto';
import type { BulkScopeBodyDto, BulkScopeDeleteBodyDto } from './dto/bulk-scope.dto';
import { paginate } from 'src/common/utils/pagination.utils';
import { ScheduleType } from '@prisma/client';

@Injectable()
export class BellTemplateService {
  constructor(
    @Inject('BellTemplateRepository')
    private readonly bellTemplateRepository: IBellTemplateRepository,
  ) {}

  private mapToResponse(template: BellTemplate) {
    return template.toResponse();
  }

  private toDate(value: Date | string | null | undefined): Date | null {
    return value == null ? null : new Date(value);
  }

  private validateTimeSegments(params: {
    startTime: Date | string | null | undefined;
    endTime: Date | string | null | undefined;
    secondStartTime?: Date | string | null;
    secondEndTime?: Date | string | null;
  }): void {
    const startTime = this.toDate(params.startTime);
    const endTime = this.toDate(params.endTime);
    const secondStartTime = this.toDate(params.secondStartTime);
    const secondEndTime = this.toDate(params.secondEndTime);

    if (!startTime || !endTime) {
      throw new BadRequestException(
        'Не указаны обязательные поля: scheduleType, lessonNumber, startTime, endTime',
      );
    }

    if (startTime >= endTime) {
      throw new BadRequestException('Время окончания должно быть позже времени начала');
    }

    const hasSecondStart = secondStartTime != null;
    const hasSecondEnd = secondEndTime != null;
    if (hasSecondStart !== hasSecondEnd) {
      throw new BadRequestException(
        'Второй сегмент должен содержать и время начала, и время окончания',
      );
    }

    if (!hasSecondStart || !hasSecondEnd) {
      return;
    }

    if (secondStartTime >= secondEndTime) {
      throw new BadRequestException(
        'Время окончания второго сегмента должно быть позже времени начала',
      );
    }

    if (endTime > secondStartTime) {
      throw new BadRequestException('Второй сегмент должен начинаться не раньше окончания первого');
    }
  }

  /** Создать шаблон звонков */
  async create(dto: CreateBellTemplateDto, institutionId: number) {
    if (institutionId == null || typeof institutionId !== 'number') {
      throw new BadRequestException('Не указано учреждение (institutionId в токене)');
    }
    // Нормализация полей в зависимости от scheduleType
    const normalizedData = this.normalizeTemplateData(dto);

    const { scheduleType, lessonNumber, startTime, endTime } = normalizedData;
    if (scheduleType == null || lessonNumber == null || startTime == null || endTime == null) {
      throw new BadRequestException(
        'Не указаны обязательные поля: scheduleType, lessonNumber, startTime, endTime',
      );
    }
    this.validateTimeSegments({
      startTime: normalizedData.startTime,
      endTime: normalizedData.endTime,
      secondStartTime: normalizedData.secondStartTime,
      secondEndTime: normalizedData.secondEndTime,
    });

    const template = BellTemplate.create({
      institutionId,
      groupId: normalizedData.groupId ?? null,
      scheduleType,
      specificDate: normalizedData.specificDate ?? null,
      weekdayStart: normalizedData.weekdayStart ?? null,
      weekdayEnd: normalizedData.weekdayEnd ?? null,
      lessonNumber,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      secondStartTime: this.toDate(normalizedData.secondStartTime),
      secondEndTime: this.toDate(normalizedData.secondEndTime),
    });

    const created = await this.bellTemplateRepository.create(template);
    return this.mapToResponse(created);
  }

  /** Найти шаблон по id */
  async findById(id: number, institutionId?: number) {
    const template = await this.bellTemplateRepository.findById(id);
    if (!template) return null;

    ensureInstitutionAccess(
      template.institutionId,
      institutionId,
      'Нет доступа к шаблону из другого учреждения',
    );

    return this.mapToResponse(template);
  }

  /** Найти шаблоны по учреждению с фильтрацией и пагинацией */
  async findByInstitutionId(
    institutionId: number,
    filters?: {
      groupId?: number | null;
      scheduleType?: ScheduleType;
      page?: number;
      limit?: number;
    },
  ) {
    const { templates, total } = await this.bellTemplateRepository.findByInstitutionId({
      institutionId,
      groupId: filters?.groupId,
      scheduleType: filters?.scheduleType,
      page: filters?.page,
      limit: filters?.limit,
    });

    return paginate(
      templates.map((template) => this.mapToResponse(template)),
      total,
      filters?.page,
      filters?.limit,
    );
  }

  /** Обновить шаблон */
  async update(id: number, updateDto: UpdateBellTemplateDto, institutionId?: number) {
    const existing = await this.bellTemplateRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Шаблон звонков не найден');
    }

    ensureInstitutionAccess(
      existing.institutionId,
      institutionId,
      'Нет доступа к шаблону из другого учреждения',
    );

    // Нормализация данных обновления
    const normalizedData = this.normalizeTemplateData(updateDto, existing);

    // Подготовка данных для обновления (мутабельный объект для передачи в репозиторий)
    type UpdatePayload = Partial<{
      groupId: number | null;
      scheduleType: ScheduleType;
      specificDate: Date | null;
      weekdayStart: number | null;
      weekdayEnd: number | null;
      lessonNumber: number;
      startTime: Date;
      endTime: Date;
      secondStartTime: Date | null;
      secondEndTime: Date | null;
    }>;
    const updateData: UpdatePayload = {};
    this.validateTimeSegments({
      startTime: normalizedData.startTime ?? existing.startTime,
      endTime: normalizedData.endTime ?? existing.endTime,
      secondStartTime:
        normalizedData.secondStartTime !== undefined
          ? normalizedData.secondStartTime
          : existing.secondStartTime,
      secondEndTime:
        normalizedData.secondEndTime !== undefined
          ? normalizedData.secondEndTime
          : existing.secondEndTime,
    });

    if (normalizedData.groupId !== undefined) {
      updateData.groupId = normalizedData.groupId ?? null;
    }
    if (normalizedData.scheduleType !== undefined) {
      updateData.scheduleType = normalizedData.scheduleType;
    }
    if (normalizedData.specificDate !== undefined) {
      updateData.specificDate = normalizedData.specificDate ?? null;
    }
    if (normalizedData.weekdayStart !== undefined) {
      updateData.weekdayStart = normalizedData.weekdayStart ?? null;
    }
    if (normalizedData.weekdayEnd !== undefined) {
      updateData.weekdayEnd = normalizedData.weekdayEnd ?? null;
    }
    if (normalizedData.lessonNumber !== undefined) {
      updateData.lessonNumber = normalizedData.lessonNumber;
    }
    if (normalizedData.startTime !== undefined) {
      updateData.startTime = new Date(normalizedData.startTime);
    }
    if (normalizedData.endTime !== undefined) {
      updateData.endTime = new Date(normalizedData.endTime);
    }
    if (normalizedData.secondStartTime !== undefined) {
      updateData.secondStartTime = this.toDate(normalizedData.secondStartTime);
    }
    if (normalizedData.secondEndTime !== undefined) {
      updateData.secondEndTime = this.toDate(normalizedData.secondEndTime);
    }

    const updated = await this.bellTemplateRepository.update(id, updateData);
    return this.mapToResponse(updated);
  }

  /** Удалить шаблон */
  async remove(id: number, institutionId?: number) {
    const template = await this.bellTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundException('Шаблон звонков не найден');
    }

    ensureInstitutionAccess(
      template.institutionId,
      institutionId,
      'Нет доступа к удалению шаблона из другого учреждения',
    );

    await this.bellTemplateRepository.remove(id);
  }

  /**
   * Массово обновить scope у всех строк шаблона, попадающих под фильтр.
   * Один запрос — одна транзакция, меняются только поля scope (groupId, scheduleType, specificDate, weekdayStart, weekdayEnd).
   */
  async bulkUpdateScope(dto: BulkScopeBodyDto, institutionId: number): Promise<{ count: number }> {
    const { filter: filterDto, update: updateDto } = dto;

    const filter: IBulkScopeFilter = {
      scheduleType: filterDto.scheduleType,
    };
    if (filterDto.groupId !== undefined) filter.groupId = filterDto.groupId ?? null;
    if (filterDto.scheduleType === 'date' && filterDto.specificDate) {
      filter.specificDate = new Date(filterDto.specificDate);
    }
    if (filterDto.scheduleType === 'weekday') {
      if (filterDto.weekdayStart != null) filter.weekdayStart = filterDto.weekdayStart;
      if (filterDto.weekdayEnd != null) filter.weekdayEnd = filterDto.weekdayEnd;
    }

    const update: IBulkScopeUpdate = {};
    if (updateDto.groupId !== undefined) update.groupId = updateDto.groupId ?? null;
    if (updateDto.scheduleType !== undefined) update.scheduleType = updateDto.scheduleType;
    if (updateDto.specificDate !== undefined)
      update.specificDate = new Date(updateDto.specificDate);
    if (updateDto.weekdayStart !== undefined) update.weekdayStart = updateDto.weekdayStart;
    if (updateDto.weekdayEnd !== undefined) update.weekdayEnd = updateDto.weekdayEnd;

    const hasAnyUpdate = Object.keys(update).length > 0;
    if (!hasAnyUpdate) {
      throw new BadRequestException(
        'В блоке "update" должен быть указан хотя бы один параметр scope.',
      );
    }

    // Нормализация: при смене типа расписания очищаем противоположные поля
    if (update.scheduleType === 'date') {
      update.weekdayStart = null;
      update.weekdayEnd = null;
    } else if (update.scheduleType === 'weekday') {
      update.specificDate = null;
    }

    return this.bellTemplateRepository.bulkUpdateScope(institutionId, filter, update);
  }

  /**
   * Удалить весь шаблон по scope — все строки (все номера уроков), попадающие под фильтр.
   * Один запрос, одна операция. Если любая из строк используется в расписании — 409.
   */
  async bulkDeleteByScope(
    dto: BulkScopeDeleteBodyDto,
    institutionId: number,
  ): Promise<{ count: number }> {
    const filterDto = dto.filter;

    const filter: IBulkScopeFilter = {
      scheduleType: filterDto.scheduleType,
    };
    if (filterDto.groupId !== undefined) filter.groupId = filterDto.groupId ?? null;
    if (filterDto.scheduleType === 'date' && filterDto.specificDate) {
      filter.specificDate = new Date(filterDto.specificDate);
    }
    if (filterDto.scheduleType === 'weekday') {
      if (filterDto.weekdayStart != null) filter.weekdayStart = filterDto.weekdayStart;
      if (filterDto.weekdayEnd != null) filter.weekdayEnd = filterDto.weekdayEnd;
    }

    return this.bellTemplateRepository.bulkDeleteByScope(institutionId, filter);
  }

  /** Нормализация данных шаблона: очистка полей в зависимости от scheduleType */
  private normalizeTemplateData(
    dto: CreateBellTemplateDto | UpdateBellTemplateDto,
    existing?: BellTemplate,
  ): {
    groupId?: number | null;
    scheduleType?: ScheduleType;
    specificDate?: Date | null;
    weekdayStart?: number | null;
    weekdayEnd?: number | null;
    lessonNumber?: number;
    startTime?: Date;
    endTime?: Date;
    secondStartTime?: Date | null;
    secondEndTime?: Date | null;
  } {
    const scheduleType = dto.scheduleType ?? existing?.scheduleType;

    if (!scheduleType) {
      // Если scheduleType не указан в DTO и нет существующего, возвращаем как есть
      return dto;
    }

    const result = { ...dto };

    if (scheduleType === 'date') {
      // Для date: очищаем weekdayStart и weekdayEnd
      result.weekdayStart = null;
      result.weekdayEnd = null;
      // specificDate должен быть указан (валидация в DTO)
    } else if (scheduleType === 'weekday') {
      // Для weekday: очищаем specificDate
      result.specificDate = null;
      // weekdayStart и weekdayEnd должны быть указаны (валидация в DTO)
    }

    return result;
  }
}
