import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

/** DTO поиска этажей: buildingId, number, query, page, limit */
export class FloorSearchQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: 1, description: 'Фильтр по ID здания' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'buildingId должен быть целым числом' })
  @Min(1, { message: 'buildingId должен быть положительным' })
  buildingId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Номер этажа' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Номер этажа должен быть целым числом' })
  @Min(0, { message: 'Номер этажа не может быть отрицательным' })
  number?: number;
}
