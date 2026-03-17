import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Поисковая строка (фильтр по имени/названию)',
    example: 'Иван',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Поисковый запрос не может быть пустым' })
  query?: string;
}
