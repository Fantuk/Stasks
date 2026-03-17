import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

/** DTO для обновления текущим пользователем своих данных (PATCH /users/me). Только ФИО и email. */
export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Иван', minLength: 2, maxLength: 30, description: 'Имя' })
  @IsOptional()
  @IsString({ message: 'Имя должно быть строкой' })
  @Length(2, 30, { message: 'Имя должно быть от 2 до 30 символов' })
  name?: string;

  @ApiPropertyOptional({ example: 'Иванов', minLength: 2, maxLength: 30, description: 'Фамилия' })
  @IsOptional()
  @IsString({ message: 'Фамилия должна быть строкой' })
  @Length(2, 30, { message: 'Фамилия должна быть от 2 до 30 символов' })
  surname?: string;

  @ApiPropertyOptional({
    example: 'Иванович',
    minLength: 2,
    maxLength: 30,
    description: 'Отчество',
  })
  @IsOptional()
  @IsString({ message: 'Отчество должно быть строкой' })
  @Length(2, 30, { message: 'Отчество должно быть от 2 до 30 символов' })
  patronymic?: string | null;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email (уникальный в учреждении)',
  })
  @IsOptional()
  @IsString({ message: 'Email должен быть строкой' })
  @IsEmail({ message: 'Введите корректный email' })
  email?: string;
}
