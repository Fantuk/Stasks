import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { SearchQueryDto } from 'src/common/dto/search-query.dto';

/** DTO поиска аудиторий: floorId, query, page, limit */
export class ClassroomSearchQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Фильтр по ID этажа' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'floorId должен быть целым числом' })
  @Min(1, { message: 'floorId должен быть положительным' })
  floorId?: number;
}
