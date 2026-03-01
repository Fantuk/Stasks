import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsDateString,
  Min,
  Max,
  ValidateIf,
  IsOptional,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ScheduleType } from '@prisma/client';
import { Type } from 'class-transformer';

/** Валидатор: время начала должно быть раньше времени конца */
@ValidatorConstraint({ name: 'isTimeBefore', async: false })
export class IsTimeBeforeConstraint implements ValidatorConstraintInterface {
  validate(endTime: string, args: ValidationArguments) {
    const startTime = (args.object as any).startTime;
    if (!startTime || !endTime) return true; // другие валидаторы проверят наличие
    return new Date(startTime) < new Date(endTime);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Время окончания должно быть позже времени начала';
  }
}

/** Валидатор: начальный день недели должен быть <= конечного */
@ValidatorConstraint({ name: 'isWeekdayRangeValid', async: false })
export class IsWeekdayRangeValidConstraint implements ValidatorConstraintInterface {
  validate(weekdayEnd: number | null, args: ValidationArguments) {
    const obj = args.object as any;
    if (obj.scheduleType !== 'weekday') return true; // валидация только для weekday
    const weekdayStart = obj.weekdayStart;
    if (weekdayStart == null || weekdayEnd == null) return true; // другие валидаторы проверят наличие
    return weekdayStart <= weekdayEnd;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Начальный день недели должен быть меньше или равен конечному';
  }
}

/** Валидатор: проверка взаимного исключения полей по типу расписания */
@ValidatorConstraint({ name: 'isScheduleTypeFieldsValid', async: false })
export class IsScheduleTypeFieldsValidConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const obj = args.object as any;
    if (obj.scheduleType === 'date') {
      // Для date: specificDate обязателен, weekdayStart/weekdayEnd должны быть null
      return obj.weekdayStart == null && obj.weekdayEnd == null;
    } else if (obj.scheduleType === 'weekday') {
      // Для weekday: weekdayStart/weekdayEnd обязательны, specificDate должен быть null
      return obj.specificDate == null;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const obj = args.object as any;
    if (obj.scheduleType === 'date') {
      return 'Для типа "date" не должны быть указаны weekdayStart и weekdayEnd';
    } else if (obj.scheduleType === 'weekday') {
      return 'Для типа "weekday" не должна быть указана specificDate';
    }
    return 'Неверная комбинация полей для типа расписания';
  }
}

/** DTO создания шаблона звонков */
export class CreateBellTemplateDto {
  @ApiPropertyOptional({ example: 1, description: 'ID группы (null = общий шаблон учреждения)', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID группы должен быть числом' })
  @Min(1, { message: 'ID группы должен быть больше 0' })
  groupId?: number | null;

  @ApiProperty({ enum: ScheduleType, example: 'weekday', description: 'Тип расписания: date (конкретная дата) или weekday (дни недели)' })
  @IsNotEmpty({ message: 'Тип расписания обязателен' })
  @IsEnum(ScheduleType, { message: 'Тип расписания может быть только "date" или "weekday"' })
  scheduleType: ScheduleType;

  // Для scheduleType = 'date': обязателен specificDate, weekdayStart/weekdayEnd должны быть пустыми
  @ApiPropertyOptional({ example: '2025-09-01T00:00:00Z', description: 'Конкретная дата (обязательно, если scheduleType = "date")', nullable: true })
  @ValidateIf((o) => o.scheduleType === 'date')
  @IsNotEmpty({ message: 'Конкретная дата обязательна для типа "date"' })
  @IsDateString({}, { message: 'Дата должна быть в формате ISO 8601' })
  specificDate?: Date | null;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 7, description: 'Начальный день недели (1=пн, 7=вс, обязательно, если scheduleType = "weekday")', nullable: true })
  @ValidateIf((o) => o.scheduleType === 'weekday')
  @IsNotEmpty({ message: 'Начальный день недели обязателен для типа "weekday"' })
  @Type(() => Number)
  @IsInt({ message: 'Начальный день недели должен быть числом' })
  @Min(1, { message: 'День недели должен быть от 1 до 7' })
  @Max(7, { message: 'День недели должен быть от 1 до 7' })
  weekdayStart?: number | null;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 7, description: 'Конечный день недели (1=пн, 7=вс, обязательно, если scheduleType = "weekday")', nullable: true })
  @ValidateIf((o) => o.scheduleType === 'weekday')
  @IsNotEmpty({ message: 'Конечный день недели обязателен для типа "weekday"' })
  @Type(() => Number)
  @IsInt({ message: 'Конечный день недели должен быть числом' })
  @Min(1, { message: 'День недели должен быть от 1 до 7' })
  @Max(7, { message: 'День недели должен быть от 1 до 7' })
  @Validate(IsWeekdayRangeValidConstraint)
  weekdayEnd?: number | null;

  @ApiProperty({ example: 1, minimum: 1, description: 'Номер урока' })
  @IsNotEmpty({ message: 'Номер урока обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'Номер урока должен быть числом' })
  @Min(1, { message: 'Номер урока должен быть больше 0' })
  lessonNumber: number;

  @ApiProperty({ example: '1970-01-01T09:00:00Z', description: 'Время начала урока (ISO 8601)' })
  @IsNotEmpty({ message: 'Время начала обязательно' })
  @IsDateString({}, { message: 'Время начала должно быть в формате ISO 8601' })
  startTime: Date;

  @ApiProperty({ example: '1970-01-01T10:30:00Z', description: 'Время окончания урока (ISO 8601)' })
  @IsNotEmpty({ message: 'Время окончания обязательно' })
  @IsDateString({}, { message: 'Время окончания должно быть в формате ISO 8601' })
  @Validate(IsTimeBeforeConstraint)
  endTime: Date;
}
