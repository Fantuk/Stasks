import { ScheduleType } from '@prisma/client';

/** Поля шаблона звонков для персистенции (без методов) */
export type BellTemplatePersistence = {
  id: number | null;
  institutionId: number;
  groupId: number | null;
  scheduleType: ScheduleType;
  specificDate: Date | null;
  weekdayStart: number | null;
  weekdayEnd: number | null;
  lessonNumber: number;
  startTime: Date;
  endTime: Date;
};

/** Доменная сущность шаблона звонков (время начала/конца уроков) */
export class BellTemplate {
  private constructor(
    public readonly id: number | null,
    public readonly institutionId: number,
    public readonly groupId: number | null,
    public readonly scheduleType: ScheduleType,
    public readonly specificDate: Date | null,
    public readonly weekdayStart: number | null,
    public readonly weekdayEnd: number | null,
    public readonly lessonNumber: number,
    public readonly startTime: Date,
    public readonly endTime: Date,
  ) {}

  static create(params: Omit<BellTemplatePersistence, 'id'>): BellTemplate {
    return new BellTemplate(
      null,
      params.institutionId,
      params.groupId ?? null,
      params.scheduleType,
      params.specificDate ?? null,
      params.weekdayStart ?? null,
      params.weekdayEnd ?? null,
      params.lessonNumber,
      params.startTime,
      params.endTime,
    );
  }

  static fromPersistence(raw: BellTemplatePersistence & { id: number }): BellTemplate {
    return new BellTemplate(
      raw.id,
      raw.institutionId,
      raw.groupId ?? null,
      raw.scheduleType,
      raw.specificDate ?? null,
      raw.weekdayStart ?? null,
      raw.weekdayEnd ?? null,
      raw.lessonNumber,
      raw.startTime,
      raw.endTime,
    );
  }

  toPersistence(): Omit<BellTemplatePersistence, 'id'> & { id?: number } {
    return {
      ...(this.id != null && { id: this.id }),
      institutionId: this.institutionId,
      groupId: this.groupId,
      scheduleType: this.scheduleType,
      specificDate: this.specificDate,
      weekdayStart: this.weekdayStart,
      weekdayEnd: this.weekdayEnd,
      lessonNumber: this.lessonNumber,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  toResponse() {
    return {
      id: this.id,
      institutionId: this.institutionId,
      groupId: this.groupId,
      scheduleType: this.scheduleType,
      specificDate: this.specificDate,
      weekdayStart: this.weekdayStart,
      weekdayEnd: this.weekdayEnd,
      lessonNumber: this.lessonNumber,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }
}
