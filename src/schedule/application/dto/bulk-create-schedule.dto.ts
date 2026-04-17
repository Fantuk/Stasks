import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleTemplateOrLessonConstraint } from './create-schedule.dto';
import { ScheduleClassType } from '@prisma/client';

/** Нужен либо непустой dates, либо оба dateFrom и dateTo */
@ValidatorConstraint({ name: 'bulkScheduleDates', async: false })
export class BulkScheduleDatesConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const obj = args.object as { dates?: string[]; dateFrom?: string; dateTo?: string };
    const hasDates = Array.isArray(obj.dates) && obj.dates.length > 0;
    const hasRange = obj.dateFrom != null && obj.dateTo != null;
    return hasDates || hasRange;
  }
  defaultMessage() {
    return 'Укажите либо непустой массив dates, либо оба dateFrom и dateTo';
  }
}

/** DTO массового создания занятий: общие поля как в CreateScheduleDto */
export class BulkCreateScheduleDto {
  @ApiProperty({ example: 1, description: 'ID предмета' })
  @IsNotEmpty({ message: 'ID предмета обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'ID предмета должен быть целым числом' })
  @Min(1, { message: 'ID предмета должен быть не меньше 1' })
  subjectId: number;

  @ApiProperty({ example: 1, description: 'ID группы' })
  @IsNotEmpty({ message: 'ID группы обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'ID группы должен быть целым числом' })
  @Min(1, { message: 'ID группы должен быть не меньше 1' })
  groupId: number;

  @ApiProperty({ example: 1, description: 'ID учителя' })
  @IsNotEmpty({ message: 'ID учителя обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'ID учителя должен быть целым числом' })
  @Min(1, { message: 'ID учителя должен быть не меньше 1' })
  teacherId: number;

  /** ID аудитории; не указывать или null — занятие проводится удалённо (дистанционно) */
  @ApiPropertyOptional({
    example: 1,
    description: 'ID аудитории. Не указывать или null — занятие удалённое',
  })
  @IsOptional()
  @ValidateIf((o) => o.classroomId != null)
  @Type(() => Number)
  @IsInt({ message: 'ID аудитории должен быть целым числом' })
  @Min(1, { message: 'ID аудитории должен быть не меньше 1' })
  classroomId?: number | null;

  @ApiPropertyOptional({
    enum: ScheduleClassType,
    example: ScheduleClassType.EXAM,
    description:
      'Тип занятия. Для ONLINE и DISTANCE аудитория не указывается (classroomId должен быть null).',
  })
  @IsOptional()
  @IsEnum(ScheduleClassType, { message: 'type может быть только ONLINE, TEST, EXAM или DISTANCE' })
  type?: ScheduleClassType;

  @ApiPropertyOptional({
    example: 1,
    description:
      'ID шаблона звонков. Если не указан — подбирается по lessonNumber для первой даты.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID шаблона звонков должен быть целым числом' })
  @Min(1, { message: 'ID шаблона звонков должен быть не меньше 1' })
  bellTemplateId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Номер урока для авто-подбора шаблона (если bellTemplateId не указан)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Номер урока должен быть целым числом' })
  @Min(1, { message: 'Номер урока должен быть не меньше 1' })
  lessonNumber?: number;

  /** Либо массив дат, либо диапазон dateFrom + dateTo (генерируются все дни включительно) */
  @ApiPropertyOptional({
    example: ['2025-03-03T00:00:00.000Z', '2025-03-05T00:00:00.000Z'],
    description: 'Массив дат занятий (ISO 8601). Не используется, если заданы dateFrom и dateTo.',
    type: [String],
  })
  @ValidateIf((o) => !o.dateFrom && !o.dateTo)
  @IsArray({ message: 'dates должен быть массивом дат' })
  @IsDateString({}, { each: true, message: 'Каждая дата должна быть в формате ISO' })
  dates?: string[];

  @ApiPropertyOptional({
    example: '2025-03-01T00:00:00.000Z',
    description: 'Начало диапазона (включительно). Используется вместе с dateTo.',
  })
  @ValidateIf((o) => o.dateTo != null)
  @IsDateString({}, { message: 'Укажите дату в формате ISO' })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2025-03-07T23:59:59.999Z',
    description: 'Конец диапазона (включительно). Используется вместе с dateFrom.',
  })
  @ValidateIf((o) => o.dateFrom != null)
  @IsDateString({}, { message: 'Укажите дату в формате ISO' })
  dateTo?: string;

  @Validate(BulkScheduleDatesConstraint)
  _datesOrRange?: unknown;

  /** Либо bellTemplateId, либо lessonNumber */
  @Validate(ScheduleTemplateOrLessonConstraint)
  _templateOrLesson?: unknown;
}
