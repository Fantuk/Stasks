import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/** DTO создания предмета */
export class CreateSubjectDto {
  @ApiProperty({ example: 'Математика', minLength: 2, maxLength: 100, description: 'Название предмета' })
  @IsNotEmpty({ message: 'Название предмета обязательно' })
  @IsString()
  @Length(2, 100, { message: 'Название от 2 до 100 символов' })
  name: string;
}