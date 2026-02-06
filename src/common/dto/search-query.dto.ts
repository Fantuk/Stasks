import { PaginationDto } from './pagination.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Поисковый запрос не может быть пустым' })
  query?: string;
}