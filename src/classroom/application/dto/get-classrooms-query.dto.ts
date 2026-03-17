import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

/**
 * Query DTO для GET /classroom — список аудиторий по этажу с пагинацией.
 * floorId обязателен; page и limit опциональны.
 */
export class GetClassroomsQueryDto {
  @ApiProperty({ example: 1, description: 'ID этажа' })
  @IsNotEmpty({ message: 'Параметр floorId обязателен для списка аудиторий' })
  @Type(() => Number)
  @IsInt({ message: 'Параметр floorId должен быть числом' })
  @Min(1, { message: 'floorId должен быть положительным числом' })
  floorId: number;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Номер страницы', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Страница должна быть числом' })
  @Min(1, { message: 'Страница должна быть больше 0' })
  page?: number;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Записей на странице',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Лимит должен быть числом' })
  @Min(1, { message: 'Лимит должен быть больше 0' })
  @Max(100, { message: 'Лимит не может быть больше 100' })
  limit?: number;
}
