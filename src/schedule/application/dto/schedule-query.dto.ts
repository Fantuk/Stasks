import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

/** DTO фильтров и пагинации для списка расписания */
export class ScheduleQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Фильтр по ID группы' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  groupId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Фильтр по ID учителя' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacherId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Фильтр по ID аудитории' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classroomId?: number;

  @ApiPropertyOptional({
    example: '2025-03-01T00:00:00.000Z',
    description: 'Начало периода (включительно)',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2025-03-31T23:59:59.999Z',
    description: 'Конец периода (включительно)',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Номер страницы' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100, description: 'Записей на странице' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
