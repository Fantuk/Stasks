import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsString,
  Matches,
  IsIn,
} from 'class-validator';

/** Допустимые значения expand для расписания (через запятую) */
export const SCHEDULE_EXPAND_VALUES = ['subject', 'group', 'teacher', 'classroom'] as const;
export type ScheduleExpandOption = (typeof SCHEDULE_EXPAND_VALUES)[number];

/** DTO фильтров и пагинации для списка расписания */
export class ScheduleQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Фильтр по ID группы' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'groupId должен быть целым числом' })
  @Min(1, { message: 'groupId должен быть не меньше 1' })
  groupId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Фильтр по ID учителя' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'teacherId должен быть целым числом' })
  @Min(1, { message: 'teacherId должен быть не меньше 1' })
  teacherId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Фильтр по ID аудитории' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'classroomId должен быть целым числом' })
  @Min(1, { message: 'classroomId должен быть не меньше 1' })
  classroomId?: number;

  @ApiPropertyOptional({
    example: '2025-03-01T00:00:00.000Z',
    description: 'Начало периода (включительно)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Укажите дату в формате ISO' })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2025-03-31T23:59:59.999Z',
    description: 'Конец периода (включительно)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Укажите дату в формате ISO' })
  dateTo?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Номер страницы' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Страница должна быть целым числом' })
  @Min(1, { message: 'Страница должна быть не меньше 1' })
  page?: number;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Записей на странице',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Лимит должен быть целым числом' })
  @Min(1, { message: 'Лимит должен быть не меньше 1' })
  @Max(100, { message: 'Лимит не может быть больше 100' })
  limit?: number;

  /** Вложенные сущности в ответе: subject, group, teacher, classroom (через запятую) */
  @ApiPropertyOptional({
    description: 'Вложенные сущности в ответе',
    example: 'subject,group,teacher,classroom',
    enum: SCHEDULE_EXPAND_VALUES,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(subject|group|teacher|classroom)(,(subject|group|teacher|classroom))*$/, {
    message: 'expand может содержать только: subject, group, teacher, classroom (через запятую)',
  })
  expand?: string;

  @ApiPropertyOptional({
    description: 'Поле сортировки',
    enum: ['scheduleDate', 'id'],
    example: 'scheduleDate',
  })
  @IsOptional()
  @IsString({ message: 'Поле сортировки должно быть строкой' })
  sort?: string;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'asc',
    description: 'Направление сортировки',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order может быть только asc или desc' })
  order?: 'asc' | 'desc';
}
