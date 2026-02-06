import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { SearchQueryDto } from 'src/common/dto/search-query.dto';

export class SearchUsersDto extends SearchQueryDto {
  @IsOptional()
  @IsEnum(Role, {
    message: 'Роль может быть только STUDENT, TEACHER, MODERATOR, ADMIN',
  })
  roles?: Role;

  @IsOptional()
  @IsString()
  include?: string;
}