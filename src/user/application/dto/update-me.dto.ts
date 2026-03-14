import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

/** DTO для обновления текущим пользователем своих данных (PATCH /users/me). Только ФИО и email. */
export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Иван', minLength: 2, maxLength: 30, description: 'Имя' })
  @IsOptional()
  @IsString()
  @Length(2, 30)
  name?: string;

  @ApiPropertyOptional({ example: 'Иванов', minLength: 2, maxLength: 30, description: 'Фамилия' })
  @IsOptional()
  @IsString()
  @Length(2, 30)
  surname?: string;

  @ApiPropertyOptional({ example: 'Иванович', minLength: 2, maxLength: 30, description: 'Отчество' })
  @IsOptional()
  @IsString()
  @Length(2, 30)
  patronymic?: string | null;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Email (уникальный в учреждении)' })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;
}
