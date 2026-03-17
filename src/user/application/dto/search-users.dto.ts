import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { SearchQueryDto } from 'src/common/dto/search-query.dto';

/** DTO поиска пользователей (GET /users/search): query, roles, include, page, limit */
export class SearchUsersDto extends SearchQueryDto {
  @ApiPropertyOptional({ enum: Role, description: 'Фильтр по одной роли', example: 'STUDENT' })
  @IsOptional()
  @IsEnum(Role, {
    message: 'Роль может быть только STUDENT, TEACHER, MODERATOR, ADMIN',
  })
  roles?: Role;

  @ApiPropertyOptional({ description: 'Включить связанные сущности', example: 'user' })
  @IsOptional()
  @IsString({ message: 'Параметр include должен быть строкой' })
  include?: string;
}
