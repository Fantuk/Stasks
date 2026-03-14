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

type TimeOrderValidationObject = {
  startTime?: string | null;
};

type SecondSegmentValidationObject = {
  secondStartTime?: string | null;
  secondEndTime?: string | null;
  endTime?: string | null;
};

type WeekdayRangeValidationObject = {
  scheduleType?: ScheduleType;
  weekdayStart?: number | null;
};

/** Валидатор: время начала должно быть раньше времени конца */
@ValidatorConstraint({ name: 'isTimeBefore', async: false })
export class IsTimeBeforeConstraint implements ValidatorConstraintInterface {
  validate(endTime: string, args: ValidationArguments) {
    const { startTime } = args.object as TimeOrderValidationObject;
    if (!startTime || !endTime) return true; // другие валидаторы проверят наличие
    return new Date(startTime) < new Date(endTime);
  }

  defaultMessage() {
    return 'Время окончания должно быть позже времени начала';
  }
}

/** Валидатор: второй сегмент должен быть заполнен целиком или отсутствовать целиком */
@ValidatorConstraint({ name: 'isSecondSegmentPairValid', async: false })
export class IsSecondSegmentPairValidConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const obj = args.object as SecondSegmentValidationObject;
    const hasSecondStart = obj.secondStartTime != null;
    const hasSecondEnd = obj.secondEndTime != null;
    return hasSecondStart === hasSecondEnd;
  }

  defaultMessage() {
    return 'Второй сегмент должен содержать и время начала, и время окончания';
  }
}

/** Валидатор: время окончания второго сегмента должно быть позже начала */
@ValidatorConstraint({ name: 'isSecondSegmentOrderValid', async: false })
export class IsSecondSegmentOrderValidConstraint implements ValidatorConstraintInterface {
  validate(secondEndTime: string | null | undefined, args: ValidationArguments) {
    const obj = args.object as SecondSegmentValidationObject;
    if (!obj.secondStartTime || !secondEndTime) return true;
    return new Date(obj.secondStartTime) < new Date(secondEndTime);
  }

  defaultMessage() {
    return 'Время окончания второго сегмента должно быть позже времени начала';
  }
}

/** Валидатор: второй сегмент не должен начинаться раньше завершения первого */
@ValidatorConstraint({ name: 'isSecondSegmentAfterFirst', async: false })
export class IsSecondSegmentAfterFirstConstraint implements ValidatorConstraintInterface {
  validate(secondStartTime: string | null | undefined, args: ValidationArguments) {
    const obj = args.object as SecondSegmentValidationObject;
    if (!secondStartTime || !obj.endTime) return true;
    return new Date(obj.endTime) <= new Date(secondStartTime);
  }

  defaultMessage() {
    return 'Второй сегмент должен начинаться не раньше окончания первого';
  }
}

/** Валидатор: начальный день недели должен быть <= конечного */
@ValidatorConstraint({ name: 'isWeekdayRangeValid', async: false })
export class IsWeekdayRangeValidConstraint implements ValidatorConstraintInterface {
  validate(weekdayEnd: number | null, args: ValidationArguments) {
    const obj = args.object as WeekdayRangeValidationObject;
    if (obj.scheduleType !== 'weekday') return true; // валидация только для weekday
    const weekdayStart = obj.weekdayStart;
    if (weekdayStart == null || weekdayEnd == null) return true; // другие валидаторы проверят наличие
    return weekdayStart <= weekdayEnd;
  }

  defaultMessage() {
    return 'Начальный день недели должен быть меньше или равен конечному';
  }
}

/** DTO создания шаблона звонков */
export class CreateBellTemplateDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID группы (null = общий шаблон учреждения)',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID группы должен быть числом' })
  @Min(1, { message: 'ID группы должен быть больше 0' })
  groupId?: number | null;

  @ApiProperty({
    enum: ScheduleType,
    example: 'weekday',
    description: 'Тип расписания: date (конкретная дата) или weekday (дни недели)',
  })
  @IsNotEmpty({ message: 'Тип расписания обязателен' })
  @IsEnum(ScheduleType, { message: 'Тип расписания может быть только "date" или "weekday"' })
  scheduleType: ScheduleType;

  // Для scheduleType = 'date': обязателен specificDate, weekdayStart/weekdayEnd должны быть пустыми
  @ApiPropertyOptional({
    example: '2025-09-01T00:00:00Z',
    description: 'Конкретная дата (обязательно, если scheduleType = "date")',
    nullable: true,
  })
  @ValidateIf((o: CreateBellTemplateDto) => o.scheduleType === 'date')
  @IsNotEmpty({ message: 'Конкретная дата обязательна для типа "date"' })
  @IsDateString({}, { message: 'Дата должна быть в формате ISO 8601' })
  specificDate?: Date | null;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    maximum: 7,
    description: 'Начальный день недели (1=пн, 7=вс, обязательно, если scheduleType = "weekday")',
    nullable: true,
  })
  @ValidateIf((o: CreateBellTemplateDto) => o.scheduleType === 'weekday')
  @IsNotEmpty({ message: 'Начальный день недели обязателен для типа "weekday"' })
  @Type(() => Number)
  @IsInt({ message: 'Начальный день недели должен быть числом' })
  @Min(1, { message: 'День недели должен быть от 1 до 7' })
  @Max(7, { message: 'День недели должен быть от 1 до 7' })
  weekdayStart?: number | null;

  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 7,
    description: 'Конечный день недели (1=пн, 7=вс, обязательно, если scheduleType = "weekday")',
    nullable: true,
  })
  @ValidateIf((o: CreateBellTemplateDto) => o.scheduleType === 'weekday')
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

  @ApiPropertyOptional({
    example: '1970-01-01T09:50:00Z',
    description: 'Необязательное время начала второго сегмента урока',
    nullable: true,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Время начала второго сегмента должно быть в формате ISO 8601' })
  @Validate(IsSecondSegmentAfterFirstConstraint)
  secondStartTime?: Date | null;

  @ApiPropertyOptional({
    example: '1970-01-01T10:35:00Z',
    description: 'Необязательное время окончания второго сегмента урока',
    nullable: true,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Время окончания второго сегмента должно быть в формате ISO 8601' })
  @Validate(IsSecondSegmentPairValidConstraint)
  @Validate(IsSecondSegmentOrderValidConstraint)
  secondEndTime?: Date | null;
}
