import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

/** Query DTO для GET /teacher — список преподавателей учреждения с пагинацией и поиском */
export class GetTeachersQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Поиск по имени, фамилии или email', example: 'Иван' })
  @IsOptional()
  @IsString()
  query?: string;
}
