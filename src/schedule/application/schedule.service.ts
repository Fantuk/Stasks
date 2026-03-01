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
    classroomId: number;
    bellTemplateId: number;
    institutionId: number;
  }): Promise<number> {
    const {
      subjectId,
      groupId,
      teacherId,
      classroomId,
      bellTemplateId,
      institutionId,
    } = params;

    const [subject, group, teacher, classroom, templateResp] = await Promise.all([
      this.subjectService.findById(subjectId, institutionId),
      this.groupService.findById(groupId, institutionId),
      this.teacherService.findById(teacherId, institutionId),
      this.classroomService.findById(classroomId, institutionId),
      this.bellTemplateService.findById(bellTemplateId, institutionId),
    ]);

    if (!subject) throw new NotFoundException('Предмет не найден');
    if (!group) throw new NotFoundException('Группа не найдена');
    if (!teacher) throw new NotFoundException('Учитель не найден');
    if (!classroom) throw new NotFoundException('Аудитория не найдена');
    if (!templateResp) throw new NotFoundException('Шаблон звонков не найден');

    // Учитель ведёт предмет
    const teachersOfSubject = await this.teacherService.findBySubjectId(
      subjectId,
      institutionId,
    );
    if (!teachersOfSubject.some((t) => t.id === teacherId)) {
      throw new BadRequestException(
        'Указанный учитель не ведёт данный предмет',
      );
    }

    // Предмет назначен группе
    const groupsOfSubject = await this.groupService.findBySubjectId(
      subjectId,
      institutionId,
    );
    if (!groupsOfSubject.some((g) => g.id === groupId)) {
      throw new BadRequestException(
        'Данный предмет не назначен указанной группе',
      );
    }

    return institutionId;
  }

  /** Проверка применимости шаблона к дате и соответствие группе */
  private validateBellTemplateForSchedule(
    template: { scheduleType: string; specificDate: Date | null; weekdayStart: number | null; weekdayEnd: number | null; groupId: number | null },
    scheduleDate: Date,
    groupId: number,
  ): void {
    if (
      !isBellTemplateApplicableForDate(
        {
          scheduleType: template.scheduleType as any,
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
      throw new BadRequestException(
        'Шаблон звонков привязан к другой группе',
      );
    }
  }

  /** Проверка конфликтов по аудитории и учителю (исключая scheduleId при обновлении) */
  private async checkConflicts(params: {
    classroomId: number;
    teacherId: number;
    scheduleDate: Date;
    startTime: Date;
    endTime: Date;
    excludeScheduleId?: number;
  }): Promise<void> {
    const {
      classroomId,
      teacherId,
      scheduleDate,
      startTime,
      endTime,
      excludeScheduleId,
    } = params;

    const [classroomSlots, teacherSlots] = await Promise.all([
      this.scheduleRepository.findByClassroomAndDate(classroomId, scheduleDate),
      this.scheduleRepository.findByTeacherAndDate(teacherId, scheduleDate),
    ]);

    const hasOverlap = (list: ScheduleWithSlot[]) => {
      return list.some((item) => {
        if (excludeScheduleId != null && item.schedule.id === excludeScheduleId)
          return false;
        return timeSlotsOverlap(
          startTime,
          endTime,
          scheduleDate,
          item.startTime,
          item.endTime,
          item.schedule.scheduleDate,
        );
      });
    };

    if (hasOverlap(classroomSlots)) {
      throw new ConflictException(
        'В выбранное время аудитория уже занята другим занятием',
      );
    }
    if (hasOverlap(teacherSlots)) {
      throw new ConflictException(
        'В выбранное время учитель уже занят другим занятием',
      );
    }
  }

  async create(dto: CreateScheduleDto, institutionId: number) {
    const scheduleDate = new Date(dto.scheduleDate);
    let bellTemplateId = dto.bellTemplateId;
    if (bellTemplateId == null) {
      if (dto.lessonNumber == null) {
        throw new BadRequestException(
          'Укажите либо bellTemplateId, либо lessonNumber для авто-подбора шаблона',
        );
      }
      bellTemplateId = await this.resolveBellTemplateId(
        institutionId,
        dto.groupId,
        scheduleDate,
        dto.lessonNumber,
      );
    }

    await this.validateScheduleFk({
      subjectId: dto.subjectId,
      groupId: dto.groupId,
      teacherId: dto.teacherId,
      classroomId: dto.classroomId,
      bellTemplateId,
      institutionId,
    });

    const template = await this.bellTemplateService.findById(
      bellTemplateId,
      institutionId,
    );
    if (!template) throw new NotFoundException('Шаблон звонков не найден');
    const templateForDate = {
      scheduleType: template.scheduleType,
      specificDate: template.specificDate ? new Date(template.specificDate) : null,
      weekdayStart: template.weekdayStart ?? null,
      weekdayEnd: template.weekdayEnd ?? null,
      groupId: template.groupId ?? null,
    };
    this.validateBellTemplateForSchedule(
      templateForDate,
      scheduleDate,
      dto.groupId,
    );

    const startTime = new Date(template.startTime);
    const endTime = new Date(template.endTime);
    await this.checkConflicts({
      classroomId: dto.classroomId,
      teacherId: dto.teacherId,
      scheduleDate,
      startTime,
      endTime,
    });

    const schedule = Schedule.create({
      institutionId,
      subjectId: dto.subjectId,
      groupId: dto.groupId,
      teacherId: dto.teacherId,
      classroomId: dto.classroomId,
      bellTemplateId,
      scheduleDate,
    });
    const created = await this.scheduleRepository.create(schedule);
    return created.toResponse();
  }

  async findById(id: number, institutionId: number) {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) return null;
    ensureInstitutionAccess(
      schedule.institutionId,
      institutionId,
      'Нет доступа к занятию из другого учреждения',
    );
    return schedule.toResponse();
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
    },
  ): Promise<PaginatedResult<ReturnType<Schedule['toResponse']>>> {
    const params = {
      institutionId,
      groupId: query.groupId,
      teacherId: query.teacherId,
      classroomId: query.classroomId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page,
      limit: query.limit,
    };
    const { schedules, total } = await this.scheduleRepository.findMany(params);
    return paginate(
      schedules.map((s) => s.toResponse()),
      total,
      query.page,
      query.limit,
    );
  }

  async update(
    id: number,
    dto: UpdateScheduleDto,
    institutionId: number,
  ) {
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
    const scheduleDate = dto.scheduleDate
      ? new Date(dto.scheduleDate)
      : existing.scheduleDate;

    let bellTemplateId = dto.bellTemplateId;
    if (bellTemplateId == null && dto.lessonNumber != null) {
      bellTemplateId = await this.resolveBellTemplateId(
        institutionId,
        groupId,
        scheduleDate,
        dto.lessonNumber,
      );
    }
    if (bellTemplateId == null) bellTemplateId = existing.bellTemplateId;

    await this.validateScheduleFk({
      subjectId,
      groupId,
      teacherId,
      classroomId,
      bellTemplateId,
      institutionId,
    });

    const template = await this.bellTemplateService.findById(
      bellTemplateId,
      institutionId,
    );
    if (!template) throw new NotFoundException('Шаблон звонков не найден');
    this.validateBellTemplateForSchedule(
      {
        scheduleType: template.scheduleType,
        specificDate: template.specificDate ? new Date(template.specificDate) : null,
        weekdayStart: template.weekdayStart ?? null,
        weekdayEnd: template.weekdayEnd ?? null,
        groupId: template.groupId ?? null,
      },
      scheduleDate,
      groupId,
    );

    const startTime = new Date(template.startTime);
    const endTime = new Date(template.endTime);
    await this.checkConflicts({
      classroomId,
      teacherId,
      scheduleDate,
      startTime,
      endTime,
      excludeScheduleId: id,
    });

    const updated = await this.scheduleRepository.update(id, {
      subjectId,
      groupId,
      teacherId,
      classroomId,
      bellTemplateId,
      scheduleDate,
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
      throw new BadRequestException(
        'Нет дат для создания (укажите dates или dateFrom+dateTo)',
      );
    }

    let bellTemplateId = dto.bellTemplateId;
    if (bellTemplateId == null) {
      if (dto.lessonNumber == null) {
        throw new BadRequestException(
          'Укажите либо bellTemplateId, либо lessonNumber для авто-подбора шаблона',
        );
      }
      bellTemplateId = await this.resolveBellTemplateId(
        institutionId,
        dto.groupId,
        dates[0],
        dto.lessonNumber,
      );
    }

    await this.validateScheduleFk({
      subjectId: dto.subjectId,
      groupId: dto.groupId,
      teacherId: dto.teacherId,
      classroomId: dto.classroomId,
      bellTemplateId,
      institutionId,
    });

    const template = await this.bellTemplateService.findById(
      bellTemplateId,
      institutionId,
    );
    if (!template) throw new NotFoundException('Шаблон звонков не найден');
    const startTime = new Date(template.startTime);
    const endTime = new Date(template.endTime);
    const templateForDate = {
      scheduleType: template.scheduleType,
      specificDate: template.specificDate ? new Date(template.specificDate) : null,
      weekdayStart: template.weekdayStart ?? null,
      weekdayEnd: template.weekdayEnd ?? null,
      groupId: template.groupId ?? null,
    };

    const toCreate: Omit<Schedule, 'id' | 'toPersistence' | 'toResponse'>[] = [];
    for (const scheduleDate of dates) {
      this.validateBellTemplateForSchedule(
        templateForDate,
        scheduleDate,
        dto.groupId,
      );
      await this.checkConflicts({
        classroomId: dto.classroomId,
        teacherId: dto.teacherId,
        scheduleDate,
        startTime,
        endTime,
      });
      toCreate.push(
        Schedule.create({
          institutionId,
          subjectId: dto.subjectId,
          groupId: dto.groupId,
          teacherId: dto.teacherId,
          classroomId: dto.classroomId,
          bellTemplateId,
          scheduleDate,
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
