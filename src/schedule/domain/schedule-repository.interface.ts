import { Schedule } from './entities/schedule.entity';

/** Параметры фильтрации списка расписания */
export interface IScheduleFindParams {
  institutionId: number;
  groupId?: number;
  teacherId?: number;
  classroomId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ScheduleTimeRange {
  startTime: Date;
  endTime: Date;
}

/** Занятие вместе с одним или двумя временными сегментами шаблона */
export interface ScheduleWithSlot {
  schedule: Schedule;
  timeRanges: ScheduleTimeRange[];
}

/** Интерфейс репозитория расписания */
export interface IScheduleRepository {
  /** Создать занятие */
  create(data: Omit<Schedule, 'id' | 'toPersistence' | 'toResponse'>): Promise<Schedule>;

  /** Создать несколько занятий в одной транзакции (все или ничего) */
  createMany(data: Omit<Schedule, 'id' | 'toPersistence' | 'toResponse'>[]): Promise<Schedule[]>;

  /** Найти занятие по id */
  findById(id: number): Promise<Schedule | null>;

  /** Список занятий с фильтрами и пагинацией, с подгрузкой bellTemplate для сортировки по времени */
  findMany(params: IScheduleFindParams): Promise<{ schedules: Schedule[]; total: number }>;

  /** Обновить занятие */
  update(id: number, data: Partial<Omit<Schedule, 'id'>>): Promise<Schedule>;

  /** Удалить занятие */
  remove(id: number): Promise<void>;

  /** Занятия в аудитории на дату с временем слота (для проверки конфликтов) */
  findByClassroomAndDate(classroomId: number, date: Date): Promise<ScheduleWithSlot[]>;

  /** Занятия учителя на дату с временем слота (для проверки конфликтов) */
  findByTeacherAndDate(teacherId: number, date: Date): Promise<ScheduleWithSlot[]>;

  /** Все записи одного слота (одно занятие — подгруппы) по scheduleSlotId */
  findByScheduleSlotId(scheduleSlotId: string): Promise<Schedule[]>;
}
