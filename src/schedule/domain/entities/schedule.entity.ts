/** Поля расписания для персистенции (без методов) */
export type SchedulePersistence = {
  id: number | null;
  institutionId: number;
  subjectId: number;
  groupId: number;
  teacherId: number;
  classroomId: number;
  bellTemplateId: number;
  scheduleDate: Date;
};

/** Доменная сущность занятия в расписании */
export class Schedule {
  private constructor(
    public readonly id: number | null,
    public readonly institutionId: number,
    public readonly subjectId: number,
    public readonly groupId: number,
    public readonly teacherId: number,
    public readonly classroomId: number,
    public readonly bellTemplateId: number,
    public readonly scheduleDate: Date,
  ) {}

  static create(params: Omit<SchedulePersistence, 'id'>): Schedule {
    return new Schedule(
      null,
      params.institutionId,
      params.subjectId,
      params.groupId,
      params.teacherId,
      params.classroomId,
      params.bellTemplateId,
      params.scheduleDate,
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
      raw.bellTemplateId,
      raw.scheduleDate,
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
      bellTemplateId: this.bellTemplateId,
      scheduleDate: this.scheduleDate,
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
      bellTemplateId: this.bellTemplateId,
      scheduleDate: this.scheduleDate,
    };
  }
}
