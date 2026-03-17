import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

/** Query DTO для GET /floor — список этажей здания (buildingId обязателен) */
export class GetFloorsQueryDto {
  @ApiProperty({ example: 1, description: 'ID здания' })
  @IsNotEmpty({ message: 'Параметр buildingId обязателен для списка этажей' })
  @Type(() => Number)
  @IsInt({ message: 'Параметр buildingId должен быть числом' })
  @Min(1, { message: 'buildingId должен быть положительным числом' })
  buildingId: number;

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
