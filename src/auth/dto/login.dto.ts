import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email обязателен' })
  @IsString({ message: 'Email должен быть строкой' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'Пароль обязателен' })
  @IsString({ message: 'Пароль должен быть строкой' })
  password: string;
}
