import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Страница должна быть числом' })
  @Min(1, { message: 'Страница должна быть больше 0' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Лимит должен быть числом' })
  @Min(1, { message: 'Лимит должен быть больше 0' })
  @Max(100, { message: 'Лимит не может быть больше 100' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Общее количество страниц должно быть числом' })
  @Min(1, { message: 'Общее количество страниц должно быть больше 0' })
  totalPages?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Общее количество элементов должно быть числом' })
  @Min(1, { message: 'Общее количество элементов должно быть больше 0' })
  total?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
