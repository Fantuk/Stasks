import { Role } from '@prisma/client';
import { IsEmail, IsNotEmpty, IsString, Length, IsEnum, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Имя обязательно' })
  @IsString({ message: 'Имя должно быть строкой' })
  @Length(2, 30, { message: 'Имя должно быть от 2 до 30 символов' })
  name: string;

  @IsNotEmpty({ message: 'Фамилия обязательна' })
  @IsString({ message: 'Фамилия должна быть строкой' })
  @Length(2, 30, { message: 'Фамилия должна быть от 2 до 30 символов' })
  surname: string;

  @IsOptional()
  @IsString({ message: 'Отчество должно быть строкой' })
  @Length(2, 30, { message: 'Отчество должно быть от 2 до 30 символов' })
  patronymic: string;

  @IsNotEmpty({ message: 'Email обязателен' })
  @IsString({ message: 'Email должен быть строкой' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'Пароль обязателен' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @Length(5, 30, { message: 'Пароль должен быть от 5 до 30 символов' })
  password: string;

  @IsNotEmpty({ message: 'Роль обязательна' })
  @IsEnum(Role, {
    each: true,
    message: 'Роль может быть только "STUDENT", "TEACHER" или "MODERATOR"',
  })
  roles: Role[];
}
