/** Поля расписания для персистенции (без методов) */
export type SchedulePersistence = {
  id: number | null;
  institutionId: number;
  subjectId: number;
  groupId: number;
  teacherId: number;
  classroomId: number | null;
  type: 'ONLINE' | 'TEST' | 'EXAM' | 'DISTANCE' | null;
  bellTemplateId: number;
  scheduleDate: Date;
  /** Слот занятия: записи с одним scheduleSlotId — одно занятие (подгруппы); null = без подгрупп */
  scheduleSlotId: string | null;
};

/** Доменная сущность занятия в расписании */
export class Schedule {
  private constructor(
    public readonly id: number | null,
    public readonly institutionId: number,
    public readonly subjectId: number,
    public readonly groupId: number,
    public readonly teacherId: number,
    public readonly classroomId: number | null,
    public readonly type: 'ONLINE' | 'TEST' | 'EXAM' | 'DISTANCE' | null,
    public readonly bellTemplateId: number,
    public readonly scheduleDate: Date,
    public readonly scheduleSlotId: string | null,
  ) {}

  static create(params: Omit<SchedulePersistence, 'id'>): Schedule {
    return new Schedule(
      null,
      params.institutionId,
      params.subjectId,
      params.groupId,
      params.teacherId,
      params.classroomId ?? null,
      params.type ?? null,
      params.bellTemplateId,
      params.scheduleDate,
      params.scheduleSlotId ?? null,
    );
  }

  static fromPersistence(raw: SchedulePersistence & { id: number }): Schedule {
    return new Schedule(
      raw.id,
      raw.institutionId,
      raw.subjectId,
      raw.groupId,
      raw.teacherId,
      raw.classroomId,
      raw.type ?? null,
      raw.bellTemplateId,
      raw.scheduleDate,
      raw.scheduleSlotId ?? null,
    );
  }

  toPersistence(): Omit<SchedulePersistence, 'id'> & { id?: number } {
    return {
      ...(this.id != null && { id: this.id }),
      institutionId: this.institutionId,
      subjectId: this.subjectId,
      groupId: this.groupId,
      teacherId: this.teacherId,
      classroomId: this.classroomId,
      type: this.type,
      bellTemplateId: this.bellTemplateId,
      scheduleDate: this.scheduleDate,
      scheduleSlotId: this.scheduleSlotId,
    };
  }

  toResponse() {
    return {
      id: this.id,
      institutionId: this.institutionId,
      subjectId: this.subjectId,
      groupId: this.groupId,
      teacherId: this.teacherId,
      classroomId: this.classroomId,
      type: this.type,
      bellTemplateId: this.bellTemplateId,
      scheduleDate: this.scheduleDate,
      scheduleSlotId: this.scheduleSlotId,
    };
  }
}
