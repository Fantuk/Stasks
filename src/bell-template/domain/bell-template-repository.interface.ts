import { ScheduleType } from '@prisma/client';
import { BellTemplate } from './entities/bell-template.entity';

/** Параметры поиска шаблонов звонков */
export interface IBellTemplateFindParams {
  institutionId: number;
  groupId?: number | null; // null = общие шаблоны учреждения
  scheduleType?: ScheduleType;
  page?: number;
  limit?: number;
}

/** Фильтр scope для массового обновления (критерии отбора строк) */
export interface IBulkScopeFilter {
  groupId?: number | null;
  scheduleType: ScheduleType;
  specificDate?: Date | null;
  weekdayStart?: number | null;
  weekdayEnd?: number | null;
}

/** Новый scope для массового обновления (только поля scope) */
export interface IBulkScopeUpdate {
  groupId?: number | null;
  scheduleType?: ScheduleType;
  specificDate?: Date | null;
  weekdayStart?: number | null;
  weekdayEnd?: number | null;
}

/** Интерфейс репозитория для работы с шаблонами звонков */
export interface IBellTemplateRepository {
  /** Создать шаблон звонков */
  create(data: Omit<BellTemplate, 'id' | 'toPersistence' | 'toResponse'>): Promise<BellTemplate>;

  /** Найти шаблон по id */
  findById(id: number): Promise<BellTemplate | null>;

  /**
   * Кандидаты шаблонов для авто-подбора по группе и номеру урока.
   * Учреждение + lessonNumber + (groupId или общий). Сначала шаблоны группы, потом общие.
   * Применимость к дате проверяется вызывающей стороной.
   */
  findCandidatesForSchedule(
    institutionId: number,
    groupId: number,
    lessonNumber: number,
  ): Promise<BellTemplate[]>;

  /** Найти шаблоны по параметрам (с фильтрацией и пагинацией) */
  findByInstitutionId(params: IBellTemplateFindParams): Promise<{ templates: BellTemplate[]; total: number }>;

  /** Обновить шаблон */
  update(id: number, data: Partial<Omit<BellTemplate, 'id'>>): Promise<BellTemplate>;

  /** Массово обновить scope у всех строк, попадающих под фильтр (одна транзакция) */
  bulkUpdateScope(
    institutionId: number,
    filter: IBulkScopeFilter,
    update: IBulkScopeUpdate,
  ): Promise<{ count: number }>;

  /** Удалить все строки шаблона, попадающие под фильтр (одна транзакция) */
  bulkDeleteByScope(institutionId: number, filter: IBulkScopeFilter): Promise<{ count: number }>;

  /** Удалить шаблон */
  remove(id: number): Promise<void>;
}
