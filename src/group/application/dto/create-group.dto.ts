import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/** DTO создания группы */
export class CreateGroupDto {
  @ApiProperty({ example: 'ИС-41', minLength: 2, maxLength: 50, description: 'Название группы' })
  @IsNotEmpty({ message: 'Название группы обязательно' })
  @IsString({ message: 'Название должно быть строкой' })
  @Length(2, 50, { message: 'Название должно быть от 2 до 50 символов' })
  name: string;
}
