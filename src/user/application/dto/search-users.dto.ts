import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Role } from '@prisma/client';

export class SearchUsersDto extends PaginationDto {
    @IsOptional()
    @IsString({ message: 'Поисковый запрос должен быть строкой' })
    query?: string;

    @IsOptional()
    @IsEnum(Role, {
        each: true,
        message: 'Роль может быть только "STUDENT", "TEACHER", "MODERATOR"',
    })
    roles?: Role;
}