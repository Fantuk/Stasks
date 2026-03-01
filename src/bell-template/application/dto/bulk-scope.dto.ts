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
  ValidateNested,
} from 'class-validator';
import { ScheduleType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

/** Фильтр scope для массового обновления: какие строки шаблона выбираем */
export class BulkScopeFilterDto {
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'ID группы (null = общие шаблоны учреждения)' })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : Number(value)))
  @IsInt()
  @ValidateIf((o) => o.groupId != null)
  @Min(1, { message: 'ID группы должен быть больше 0' })
  groupId?: number | null;

  @ApiProperty({ enum: ScheduleType, description: 'Тип расписания в текущем scope' })
  @IsNotEmpty({ message: 'Тип расписания в фильтре обязателен' })
  @IsEnum(ScheduleType, { message: 'Тип расписания может быть только "date" или "weekday"' })
  scheduleType: ScheduleType;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 7, description: 'Начальный день недели (обязательно при scheduleType = "weekday")' })
  @ValidateIf((o) => o.scheduleType === 'weekday')
  @IsNotEmpty({ message: 'weekdayStart обязателен для типа "weekday"' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  weekdayStart?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 7, description: 'Конечный день недели (обязательно при scheduleType = "weekday")' })
  @ValidateIf((o) => o.scheduleType === 'weekday')
  @IsNotEmpty({ message: 'weekdayEnd обязателен для типа "weekday"' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  weekdayEnd?: number;

  @ApiPropertyOptional({ example: '2025-09-01T00:00:00.000Z', description: 'Конкретная дата (обязательно при scheduleType = "date")' })
  @ValidateIf((o) => o.scheduleType === 'date')
  @IsNotEmpty({ message: 'specificDate обязателен для типа "date"' })
  @IsDateString()
  specificDate?: string;
}

/** Новый scope: на что меняем выбранные строки */
export class BulkScopeUpdateDto {
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Привязать к группе (null = общий шаблон)' })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : Number(value)))
  @IsInt()
  @ValidateIf((o) => o.groupId != null)
  @Min(1, { message: 'ID группы должен быть больше 0' })
  groupId?: number | null;

  @ApiPropertyOptional({ enum: ScheduleType, description: 'Новый тип расписания' })
  @IsOptional()
  @IsEnum(ScheduleType, { message: 'Тип расписания может быть только "date" или "weekday"' })
  scheduleType?: ScheduleType;

  @ApiPropertyOptional({ example: '2025-09-01T00:00:00.000Z', description: 'Конкретная дата (при scheduleType = "date")' })
  @ValidateIf((o) => o.scheduleType === 'date')
  @IsNotEmpty({ message: 'specificDate обязателен при смене на тип "date"' })
  @IsDateString()
  specificDate?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 7, description: 'Начальный день недели (при scheduleType = "weekday")' })
  @ValidateIf((o) => o.scheduleType === 'weekday')
  @IsNotEmpty({ message: 'weekdayStart обязателен при смене на тип "weekday"' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  weekdayStart?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 7, description: 'Конечный день недели (при scheduleType = "weekday")' })
  @ValidateIf((o) => o.scheduleType === 'weekday')
  @IsNotEmpty({ message: 'weekdayEnd обязателен при смене на тип "weekday"' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  weekdayEnd?: number;
}

/** Тело запроса PATCH /bell-template/bulk-scope */
export class BulkScopeBodyDto {
  @ApiProperty({ type: BulkScopeFilterDto, description: 'Фильтр: какие строки шаблона обновить' })
  @ValidateNested()
  @Type(() => BulkScopeFilterDto)
  filter: BulkScopeFilterDto;

  @ApiProperty({ type: BulkScopeUpdateDto, description: 'Новый scope для выбранных строк' })
  @ValidateNested()
  @Type(() => BulkScopeUpdateDto)
  update: BulkScopeUpdateDto;
}

/** Тело запроса DELETE /bell-template/bulk-scope — удалить все строки шаблона по scope */
export class BulkScopeDeleteBodyDto {
  @ApiProperty({ type: BulkScopeFilterDto, description: 'Фильтр: какие строки шаблона удалить' })
  @ValidateNested()
  @Type(() => BulkScopeFilterDto)
  filter: BulkScopeFilterDto;
}
