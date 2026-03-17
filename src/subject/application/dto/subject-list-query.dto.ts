import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

/** Query DTO для GET /subject — список предметов с опциональной фильтрацией по группе */
export class SubjectListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID группы: только предметы, привязанные к этой группе',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'groupId должен быть целым числом' })
  @Min(1, { message: 'groupId должен быть больше 0' })
  groupId?: number;
}
