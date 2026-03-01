import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

/** DTO создания пользователя (регистрация админом/модератором) */
export class CreateUserDto {
  @ApiProperty({ example: 'Иван', minLength: 2, maxLength: 30, description: 'Имя' })
  @IsNotEmpty({ message: 'Имя обязательно' })
  @IsString({ message: 'Имя должно быть строкой' })
  @Length(2, 30, { message: 'Имя должно быть от 2 до 30 символов' })
  name: string;

  @ApiProperty({ example: 'Иванов', minLength: 2, maxLength: 30, description: 'Фамилия' })
  @IsNotEmpty({ message: 'Фамилия обязательна' })
  @IsString({ message: 'Фамилия должна быть строкой' })
  @Length(2, 30, { message: 'Фамилия должна быть от 2 до 30 символов' })
  surname: string;

  @ApiPropertyOptional({ example: 'Иванович', minLength: 2, maxLength: 30, description: 'Отчество' })
  @IsOptional()
  @IsString({ message: 'Отчество должно быть строкой' })
  @Length(2, 30, { message: 'Отчество должно быть от 2 до 30 символов' })
  patronymic: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email (уникальный в рамках учреждения)' })
  @IsNotEmpty({ message: 'Email обязателен' })
  @IsString({ message: 'Email должен быть строкой' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 5, maxLength: 30, description: 'Пароль' })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @Length(5, 30, { message: 'Пароль должен быть от 5 до 30 символов' })
  password: string;

  @ApiProperty({ enum: Role, isArray: true, example: ['STUDENT'], description: 'Роли пользователя (одна или несколько)' })
  @IsNotEmpty({ message: 'Роль обязательна' })
  @IsEnum(Role, {
    each: true,
    message: 'Роль может быть только "STUDENT", "TEACHER" или "MODERATOR"',
  })
  @IsArray({ message: 'Роль должна быть массивом' })
  @ArrayNotEmpty({ message: 'Роль не может быть пустой' })
  roles: Role[];
}
