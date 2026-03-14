import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';

/** Базовый DTO пагинации: page, limit (для списков). Опционально sort и order для сортировки. */
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Номер страницы', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Страница должна быть числом' })
  @Min(1, { message: 'Страница должна быть больше 0' })
  page?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100, description: 'Записей на странице', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Лимит должен быть числом' })
  @Min(1, { message: 'Лимит должен быть больше 0' })
  @Max(100, { message: 'Лимит не может быть больше 100' })
  limit?: number;

  @ApiPropertyOptional({ description: 'Поле сортировки (зависит от эндпоинта)', example: 'name' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc', description: 'Направление сортировки' })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order может быть только asc или desc' })
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
