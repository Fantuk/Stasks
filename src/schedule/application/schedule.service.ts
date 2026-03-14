import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ensureInstitutionAccess } from 'src/common/utils/institution-access.utils';
import { Schedule } from 'src/schedule/domain/entities/schedule.entity';
import type {
  IScheduleRepository,
  ScheduleTimeRange,
  ScheduleWithSlot,
} from 'src/schedule/domain/schedule-repository.interface';
import { isBellTemplateApplicableForDate } from 'src/schedule/domain/utils/bell-template-date.utils';
import { BellTemplateService } from 'src/bell-template/application/bell-template.service';
import type { IBellTemplateRepository } from 'src/bell-template/domain/bell-template-repository.interface';
import { GroupService } from 'src/group/application/group.service';
import { SubjectService } from 'src/subject/application/subject.service';
import { TeacherService } from 'src/teacher/application/teacher.service';
import { ClassroomService } from 'src/classroom/application/classroom.service';
import { paginate } from 'src/common/utils/pagination.utils';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
import type { PaginatedResult } from 'src/common/dto/pagination.dto';
import { SCHEDULE_EXPAND_VALUES, type ScheduleExpandOption } from './dto/schedule-query.dto';

/** Объединяет календарную дату с временем из другого Date (часы/минуты) в UTC */
function mergeDateAndTime(dateOnly: Date, timeSource: Date): Date {
  const r = new Date(dateOnly);
  r.setUTCHours(
    timeSource.getUTCHours(),
    timeSource.getUTCMinutes(),
    timeSource.getUTCSeconds(),
    timeSource.getUTCMilliseconds(),
  );
  return r;
}

/** Проверяет пересечение двух временных отрезков на одну и ту же дату */
function timeSlotsOverlap(
  startA: Date,
  endA: Date,
  dateA: Date,
  startB: Date,
  endB: Date,
  dateB: Date,
): boolean {
  const aStart = mergeDateAndTime(dateA, startA);
  const aEnd = mergeDateAndTime(dateA, endA);
  const bStart = mergeDateAndTime(dateB, startB);
  const bEnd = mergeDateAndTime(dateB, endB);
  return aStart < bEnd && aEnd > bStart;
}

function buildTimeRangesFromTemplate(template: {
  startTime: string | Date;
  endTime: string | Date;
  secondStartTime?: string | Date | null;
  secondEndTime?: string | Date | null;
}): ScheduleTimeRange[] {
  const ranges: ScheduleTimeRange[] = [
    {
      startTime: new Date(template.startTime),
      endTime: new Date(template.endTime),
    },
  ];

  if (template.secondStartTime && template.secondEndTime) {
    ranges.push({
      startTime: new Date(template.secondStartTime),
      endTime: new Date(template.secondEndTime),
    });
  }

  return ranges;
}

function rangesOverlap(
  targetRanges: ScheduleTimeRange[],
  targetDate: Date,
  existingRanges: ScheduleTimeRange[],
  existingDate: Date,
): boolean {
  return targetRanges.some((targetRange) =>
    existingRanges.some((existingRange) =>
      timeSlotsOverlap(
        targetRange.startTime,
        targetRange.endTime,
        targetDate,
        existingRange.startTime,
        existingRange.endTime,
        existingDate,
      ),
    ),
  );
}

@Injectable()
export class ScheduleService {
  constructor(
    @Inject('ScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    @Inject('BellTemplateRepository')
    private readonly bellTemplateRepository: IBellTemplateRepository,
    private readonly bellTemplateService: BellTemplateService,
    private readonly groupService: GroupService,
    private readonly subjectService: SubjectService,
    private readonly teacherService: TeacherService,
    private readonly classroomService: ClassroomService,
  ) {}

  /**
   * Подбирает шаблон звонков по группе, дате и номеру урока.
   * Сначала ищет шаблон для группы, затем общий для учреждения.
   */
  private async resolveBellTemplateId(
    institutionId: number,
    groupId: number,
    scheduleDate: Date,
    lessonNumber: number,
  ): Promise<number> {
    const candidates = await this.bellTemplateRepository.findCandidatesForSchedule(
      institutionId,
      groupId,
      lessonNumber,
    );
    const applicable = candidates.find((t) =>
      isBellTemplateApplicableForDate(
        {
          scheduleType: t.scheduleType,
          specificDate: t.specificDate,
          weekdayStart: t.weekdayStart,
          weekdayEnd: t.weekdayEnd,
        },
        scheduleDate,
      ),
    );
    if (!applicable?.id) {
      throw new BadRequestException(
        `Не найден подходящий шаблон звонков для группы ${groupId}, даты ${scheduleDate.toISOString()} и урока ${lessonNumber}. Создайте шаблон или укажите bellTemplateId.`,
      );
    }
    return applicable.id;
  }

  /** Валидация FK и учреждения; возвращает institutionId */
  private async validateScheduleFk(params: {
    subjectId: number;
    groupId: number;
    teacherId: number;
    classroomId: number | null;
    bellTemplateId: number;
    institutionId: number;
  }): Promise<number> {
    const { subjectId, groupId, teacherId, classroomId, bellTemplateId, institutionId } = params;

    const [subject, group, teacher, classroom, templateResp] = await Promise.all([
      this.subjectService.findById(subjectId, institutionId),
      this.groupService.findById(groupId, institutionId),
      this.teacherService.findById(teacherId, institutionId),
      classroomId != null
        ? this.classroomService.findById(classroomId, institutionId)
        : Promise.resolve(null),
      this.bellTemplateService.findById(bellTemplateId, institutionId),
    ]);

    if (!subject) throw new NotFoundException('Предмет не найден');
    if (!group) throw new NotFoundException('Группа не найдена');
    if (!teacher) throw new NotFoundException('Учитель не найден');
    if (classroomId != null && !classroom) throw new NotFoundException('Аудитория не найдена');
    if (!templateResp) throw new NotFoundException('Шаблон звонков не найден');

    // Учитель ведёт предмет
    const teachersOfSubject = await this.teacherService.findBySubjectId(subjectId, institutionId);
    if (!teachersOfSubject.some((t) => t.id === teacherId)) {
      throw new BadRequestException('Указанный учитель не ведёт данный предмет');
    }

    // Предмет назначен группе
    const groupsOfSubject = await this.groupService.findBySubjectId(subjectId, institutionId);
    if (!groupsOfSubject.some((g) => g.id === groupId)) {
      throw new BadRequestException('Данный предмет не назначен указанной группе');
    }

    return institutionId;
  }

  /** Проверка применимости шаблона к дате и соответствие группе */
  private validateBellTemplateForSchedule(
    template: {
      scheduleType: 'date' | 'weekday';
      specificDate: Date | null;
      weekdayStart: number | null;
      weekdayEnd: number | null;
      groupId: number | null;
    },
    scheduleDate: Date,
    groupId: number,
  ): void {
    if (
      !isBellTemplateApplicableForDate(
        {
          scheduleType: template.scheduleType,
          specificDate: template.specificDate,
          weekdayStart: template.weekdayStart,
          weekdayEnd: template.weekdayEnd,
        },
        scheduleDate,
      )
    ) {
      throw new BadRequestException(
        'Шаблон звонков не применим к указанной дате (день недели или конкретная дата не совпадают)',
      );
    }
    if (template.groupId != null && template.groupId !== groupId) {
      throw new BadRequestException('Шаблон звонков привязан к другой группе');
    }
  }

  /** Проверка конфликтов по аудитории и учителю (исключая scheduleId при обновлении) */
  private async checkConflicts(params: {
    classroomId: number | null;
    teacherId: number;
    scheduleDate: Date;
    timeRanges: ScheduleTimeRange[];
    excludeScheduleId?: number;
  }): Promise<void> {
    const { classroomId, teacherId, scheduleDate, timeRanges, excludeScheduleId } = params;

    const [classroomSlots, teacherSlots] = await Promise.all([
      classroomId != null
        ? this.scheduleRepository.findByClassroomAndDate(classroomId, scheduleDate)
        : Promise.resolve([]),
      this.scheduleRepository.findByTeacherAndDate(teacherId, scheduleDate),
    ]);

    const findOverlapping = (list: ScheduleWithSlot[]): ScheduleWithSlot | undefined => {
      return list.find((item) => {
        if (excludeScheduleId != null && item.schedule.id === excludeScheduleId) return false;
        return rangesOverlap(timeRanges, scheduleDate, item.timeRanges, item.schedule.scheduleDate);
      });
    };

    const classroomConflict = findOverlapping(classroomSlots);
    if (classroomConflict) {
      throw new ConflictException({
        message: 'В выбранное время аудитория уже занята другим занятием',
        code: 'CONFLICT',
        conflict: {
          type: 'CLASSROOM_OCCUPIED',
          scheduleId: classroomConflict.schedule.id ?? undefined,
          scheduleDate: classroomConflict.schedule.scheduleDate?.toISOString?.(),
        },
      });
    }
    const teacherConflict = findOverlapping(teacherSlots);
    if (teacherConflict) {
      throw new ConflictException({
        message: 'В выбранное время учитель уже занят другим занятием',
        code: 'CONFLICT',
        conflict: {
          type: 'TEACHER_OCCUPIED',
          scheduleId: teacherConflict.schedule.id ?? undefined,
          scheduleDate: teacherConflict.schedule.scheduleDate?.toISOString?.(),
        },
      });
    }
  }

  /**
   * Валидирует FK, разрешает шаблон звонков (если нужен lessonNumber), проверяет
   * применимость шаблона к дате и конфликты. Возвращает контекст для create/update.
   */
  private async validateAndResolveScheduleContext(params: {
    subjectId: number;
    groupId: number;
    teacherId: number;
    classroomId: number | null;
    bellTemplateId?: number;
    lessonNumber?: number;
    scheduleDate: Date;
    institutionId: number;
    excludeScheduleId?: number;
  }): Promise<{
    subjectId: number;
    groupId: number;
    teacherId: number;
    classroomId: number | null;
    bellTemplateId: number;
    scheduleDate: Date;
    timeRanges: ScheduleTimeRange[];
  }> {
    const {
      subjectId,
      groupId,
      teacherId,
      classroomId,
      scheduleDate,
      institutionId,
      excludeScheduleId,
    } = params;
    let bellTemplateId = params.bellTemplateId;
    if (bellTemplateId == null && params.lessonNumber != null) {
      bellTemplateId = await this.resolveBellTemplateId(
        institutionId,
        groupId,
        scheduleDate,
        params.lessonNumber,
      );
    }
    if (bellTemplateId == null) {
      throw new BadRequestException(
        'Укажите либо bellTemplateId, либо lessonNumber для авто-подбора шаблона',
      );
    }

    await this.validateScheduleFk({
      subjectId,
      groupId,
      teacherId,
      classroomId,
      bellTemplateId,
      institutionId,
    });

    const template = await this.bellTemplateService.findById(bellTemplateId, institutionId);
    if (!template) throw new NotFoundException('Шаблон звонков не найден');
    const templateForDate = {
      scheduleType: template.scheduleType,
      specificDate: template.specificDate ? new Date(template.specificDate) : null,
      weekdayStart: template.weekdayStart ?? null,
      weekdayEnd: template.weekdayEnd ?? null,
      groupId: template.groupId ?? null,
    };
    this.validateBellTemplateForSchedule(templateForDate, scheduleDate, groupId);

    const timeRanges = buildTimeRangesFromTemplate(template);
    await this.checkConflicts({
      classroomId,
      teacherId,
      scheduleDate,
      timeRanges,
      excludeScheduleId,
    });

    return {
      subjectId,
      groupId,
      teacherId,
      classroomId,
      bellTemplateId,
      scheduleDate,
      timeRanges,
    };
  }

  async create(dto: CreateScheduleDto, institutionId: number) {
    const scheduleDate = new Date(dto.scheduleDate);
    let scheduleSlotId: string;
    let effectiveDate = scheduleDate;
    let effectiveBellTemplateId: number | undefined = dto.bellTemplateId ?? undefined;

    if (dto.scheduleSlotId) {
      // Добавление подгруппы к существующему занятию: проверяем слот и совпадение параметров
      const existingInSlot = await this.scheduleRepository.findByScheduleSlotId(dto.scheduleSlotId);
      if (existingInSlot.length === 0) {
        throw new BadRequestException(
          'Слот занятия не найден. Укажите существующий scheduleSlotId или не передавайте его для нового занятия.',
        );
      }
      const first = existingInSlot[0];
      ensureInstitutionAccess(
        first.institutionId,
        institutionId,
        'Нет доступа к слоту из другого учреждения',
      );
      // Совпадение предмета и группы; дату и bellTemplateId берём из слота
      if (dto.subjectId !== first.subjectId || dto.groupId !== first.groupId) {
        throw new BadRequestException(
          'При добавлении подгруппы subjectId и groupId должны совпадать с существующим занятием в слоте.',
        );
      }
      const firstDate = first.scheduleDate.getTime();
      const dtoDate = scheduleDate.getTime();
      if (Math.abs(firstDate - dtoDate) >= 24 * 60 * 60 * 1000) {
        throw new BadRequestException(
          'Дата занятия при добавлении подгруппы должна совпадать с датой существующего занятия в слоте.',
        );
      }
      const duplicate = existingInSlot.some(
        (s) => s.teacherId === dto.teacherId && s.classroomId === (dto.classroomId ?? null),
      );
      if (duplicate) {
        throw new BadRequestException(
          'В этом занятии уже есть подгруппа с таким преподавателем и аудиторией.',
        );
      }
      scheduleSlotId = dto.scheduleSlotId;
      effectiveDate = first.scheduleDate;
      effectiveBellTemplateId = first.bellTemplateId;
    } else {
      scheduleSlotId = randomUUID();
    }

    const ctx = await this.validateAndResolveScheduleContext({
      subjectId: dto.subjectId,
      groupId: dto.groupId,
      teacherId: dto.teacherId,
      classroomId: dto.classroomId ?? null,
      bellTemplateId: effectiveBellTemplateId,
      lessonNumber: effectiveBellTemplateId == null ? dto.lessonNumber ?? undefined : undefined,
      scheduleDate: effectiveDate,
      institutionId,
    });

    const schedule = Schedule.create({
      institutionId,
      subjectId: ctx.subjectId,
      groupId: ctx.groupId,
      teacherId: ctx.teacherId,
      classroomId: ctx.classroomId,
      bellTemplateId: ctx.bellTemplateId,
      scheduleDate: ctx.scheduleDate,
      scheduleSlotId,
    });
    const created = await this.scheduleRepository.create(schedule);
    return created.toResponse();
  }

  /** Парсит строку expand в массив допустимых значений */
  private parseExpand(expand?: string): ScheduleExpandOption[] {
    if (!expand?.trim()) return [];
    const parts = expand.split(',').map((s) => s.trim().toLowerCase());
    return parts.filter((p): p is ScheduleExpandOption =>
      SCHEDULE_EXPAND_VALUES.includes(p as ScheduleExpandOption),
    );
  }

  /** Подмешивает вложенные сущности (subject, group, teacher, classroom) в ответы расписания */
  private async attachExpandedData(
    scheduleResponses: ReturnType<Schedule['toResponse']>[],
    expandOptions: ScheduleExpandOption[],
    institutionId: number,
  ): Promise<(ReturnType<Schedule['toResponse']> & Record<string, unknown>)[]> {
    if (expandOptions.length === 0)
      return scheduleResponses as (ReturnType<Schedule['toResponse']> & Record<string, unknown>)[];

    const needSubject = expandOptions.includes('subject');
    const needGroup = expandOptions.includes('group');
    const needTeacher = expandOptions.includes('teacher');
    const needClassroom = expandOptions.includes('classroom');

    const subjectIds = needSubject ? [...new Set(scheduleResponses.map((s) => s.subjectId))] : [];
    const groupIds = needGroup ? [...new Set(scheduleResponses.map((s) => s.groupId))] : [];
    const teacherIds = needTeacher ? [...new Set(scheduleResponses.map((s) => s.teacherId))] : [];
    const classroomIds = needClassroom
      ? [
          ...new Set(
            scheduleResponses.map((s) => s.classroomId).filter((id): id is number => id != null),
          ),
        ]
      : [];

    const [subjectsMap, groupsMap, teachersMap, classroomsMap] = await Promise.all([
      needSubject
        ? Promise.all(subjectIds.map((id) => this.subjectService.findById(id, institutionId))).then(
            (list) =>
              new Map(list.filter(Boolean).map((s) => [s!.id!, { id: s!.id, name: s!.name }])),
          )
        : Promise.resolve(new Map()),
      needGroup
        ? Promise.all(groupIds.map((id) => this.groupService.findById(id, institutionId))).then(
            (list) =>
              new Map(
                list
                  .filter(Boolean)
                  .map((g) => [g!.id!, { id: g!.id, name: (g as { name: string }).name }]),
              ),
          )
        : Promise.resolve(new Map()),
      needTeacher
        ? Promise.all(
            teacherIds.map((id) => this.teacherService.findById(id, institutionId, true)),
          ).then(
            (list) =>
              new Map(
                list.filter(Boolean).map((t) => {
                  const r = t!.toResponse(true);
                  const name = r.user
                    ? [r.user.name, r.user.surname].filter(Boolean).join(' ')
                    : undefined;
                  return [t!.id!, { id: t!.id, userId: t!.userId, name }];
                }),
              ),
          )
        : Promise.resolve(new Map()),
      needClassroom
        ? Promise.all(
            classroomIds.map((id) =>
              this.classroomService.findById(id, institutionId, { include: ['floor'] }),
            ),
          ).then(
            (list) =>
              new Map(
                list
                  .filter(Boolean)
                  .map((c) => {
                    const data = c as {
                      id: number;
                      name: string;
                      floor?: { building?: { id: number; name: string } };
                    };
                    const building = data.floor?.building;
                    return [
                      data.id,
                      {
                        id: data.id,
                        name: data.name,
                        ...(building && { building: { id: building.id, name: building.name } }),
                      },
                    ];
                  }),
              ),
          )
        : Promise.resolve(new Map()),
    ]);

    return scheduleResponses.map((row) => {
      const out = { ...row } as ReturnType<Schedule['toResponse']> & Record<string, unknown>;
      if (needSubject && row.subjectId) out.subject = subjectsMap.get(row.subjectId);
      if (needGroup && row.groupId) out.group = groupsMap.get(row.groupId);
      if (needTeacher && row.teacherId) out.teacher = teachersMap.get(row.teacherId);
      if (needClassroom && row.classroomId) out.classroom = classroomsMap.get(row.classroomId);
      return out;
    });
  }

  async findById(id: number, institutionId: number, expand?: string) {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) return null;
    ensureInstitutionAccess(
      schedule.institutionId,
      institutionId,
      'Нет доступа к занятию из другого учреждения',
    );
    const base = schedule.toResponse();
    const options = this.parseExpand(expand);
    if (options.length === 0) return base;
    const [expanded] = await this.attachExpandedData([base], options, institutionId);
    return expanded;
  }

  async findMany(
    institutionId: number,
    query: {
      groupId?: number;
      teacherId?: number;
      classroomId?: number;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
      expand?: string;
      sort?: string;
      order?: 'asc' | 'desc';
    },
  ): Promise<PaginatedResult<ReturnType<Schedule['toResponse']> & Record<string, unknown>>> {
    const params = {
      institutionId,
      groupId: query.groupId,
      teacherId: query.teacherId,
      classroomId: query.classroomId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };
    const { schedules, total } = await this.scheduleRepository.findMany(params);
    const baseRows = schedules.map((s) => s.toResponse());
    const expandOptions = this.parseExpand(query.expand);
    const data =
      expandOptions.length > 0
        ? await this.attachExpandedData(baseRows, expandOptions, institutionId)
        : baseRows;
    return paginate(data, total, query.page, query.limit);
  }

  async update(id: number, dto: UpdateScheduleDto, institutionId: number) {
    const existing = await this.scheduleRepository.findById(id);
    if (!existing) throw new NotFoundException('Занятие не найдено');
    ensureInstitutionAccess(
      existing.institutionId,
      institutionId,
      'Нет доступа к занятию из другого учреждения',
    );

    const subjectId = dto.subjectId ?? existing.subjectId;
    const groupId = dto.groupId ?? existing.groupId;
    const teacherId = dto.teacherId ?? existing.teacherId;
    const classroomId = dto.classroomId ?? existing.classroomId;
    const scheduleDate = dto.scheduleDate ? new Date(dto.scheduleDate) : existing.scheduleDate;
    const bellTemplateId = dto.bellTemplateId ?? existing.bellTemplateId ?? undefined;

    const ctx = await this.validateAndResolveScheduleContext({
      subjectId,
      groupId,
      teacherId,
      classroomId,
      bellTemplateId: bellTemplateId ?? undefined,
      lessonNumber: dto.lessonNumber ?? undefined,
      scheduleDate,
      institutionId,
      excludeScheduleId: id,
    });

    const updated = await this.scheduleRepository.update(id, {
      subjectId: ctx.subjectId,
      groupId: ctx.groupId,
      teacherId: ctx.teacherId,
      classroomId: ctx.classroomId,
      bellTemplateId: ctx.bellTemplateId,
      scheduleDate: ctx.scheduleDate,
    });
    return updated.toResponse();
  }

  async remove(id: number, institutionId: number): Promise<void> {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) throw new NotFoundException('Занятие не найдено');
    ensureInstitutionAccess(
      schedule.institutionId,
      institutionId,
      'Нет доступа к занятию из другого учреждения',
    );
    await this.scheduleRepository.remove(id);
  }

  /** Массовое создание: все или ничего (транзакция). */
  async bulkCreate(dto: BulkCreateScheduleDto, institutionId: number) {
    const dates = this.resolveBulkDates(dto);
    if (dates.length === 0) {
      throw new BadRequestException('Нет дат для создания (укажите dates или dateFrom+dateTo)');
    }

    // Валидация и разрешение шаблона по первой дате (включая проверку конфликтов для неё)
    const ctx = await this.validateAndResolveScheduleContext({
      subjectId: dto.subjectId,
      groupId: dto.groupId,
      teacherId: dto.teacherId,
      classroomId: dto.classroomId ?? null,
      bellTemplateId: dto.bellTemplateId ?? undefined,
      lessonNumber: dto.lessonNumber ?? undefined,
      scheduleDate: dates[0],
      institutionId,
    });

    const template = await this.bellTemplateService.findById(ctx.bellTemplateId, institutionId);
    if (!template) throw new NotFoundException('Шаблон звонков не найден');
    const templateForDate = {
      scheduleType: template.scheduleType,
      specificDate: template.specificDate ? new Date(template.specificDate) : null,
      weekdayStart: template.weekdayStart ?? null,
      weekdayEnd: template.weekdayEnd ?? null,
      groupId: template.groupId ?? null,
    };

    const toCreate: Omit<Schedule, 'id' | 'toPersistence' | 'toResponse'>[] = [];
    for (const scheduleDate of dates) {
      this.validateBellTemplateForSchedule(templateForDate, scheduleDate, dto.groupId);
      await this.checkConflicts({
        classroomId: ctx.classroomId,
        teacherId: ctx.teacherId,
        scheduleDate,
        timeRanges: ctx.timeRanges,
      });
      toCreate.push(
        Schedule.create({
          institutionId,
          subjectId: ctx.subjectId,
          groupId: ctx.groupId,
          teacherId: ctx.teacherId,
          classroomId: ctx.classroomId,
          bellTemplateId: ctx.bellTemplateId,
          scheduleDate,
          scheduleSlotId: randomUUID(),
        }),
      );
    }
    const saved = await this.scheduleRepository.createMany(toCreate);
    return saved.map((s) => s.toResponse());
  }

  /** Разрешает массив дат из dto: либо dates, либо все дни от dateFrom до dateTo включительно */
  private resolveBulkDates(dto: BulkCreateScheduleDto): Date[] {
    if (Array.isArray(dto.dates) && dto.dates.length > 0) {
      return dto.dates.map((s) => new Date(s));
    }
    if (dto.dateFrom != null && dto.dateTo != null) {
      const from = new Date(dto.dateFrom);
      const to = new Date(dto.dateTo);
      const out: Date[] = [];
      const cur = new Date(from);
      cur.setUTCHours(0, 0, 0, 0);
      to.setUTCHours(23, 59, 59, 999);
      while (cur <= to) {
        out.push(new Date(cur));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return out;
    }
    return [];
  }
}
