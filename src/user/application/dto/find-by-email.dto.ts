import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class FindByEmailDto {
  @IsNotEmpty({ message: 'Email обязателен для поиска' })
  @IsString({ message: 'Email должен быть строкой' })
  @IsEmail({}, { message: 'Email должен быть валидным email адресом' })
  email: string;
}
