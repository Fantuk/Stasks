import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/** DTO для смены пароля (PATCH /users/me/password). */
export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123', description: 'Текущий пароль' })
  @IsNotEmpty({ message: 'Текущий пароль обязателен' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword456', minLength: 5, maxLength: 30, description: 'Новый пароль' })
  @IsNotEmpty({ message: 'Новый пароль обязателен' })
  @IsString()
  @Length(5, 30, { message: 'Пароль должен быть от 5 до 30 символов' })
  newPassword: string;
}
