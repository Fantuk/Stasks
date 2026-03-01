import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Length } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO создания аудитории */
export class CreateClassroomDto {
  @ApiProperty({ example: 1, description: 'ID этажа' })
  @IsNotEmpty({ message: 'ID этажа обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'ID этажа должен быть целым числом' })
  floorId: number;

  @ApiProperty({ example: '101', minLength: 1, maxLength: 50, description: 'Название аудитории' })
  @IsNotEmpty({ message: 'Название аудитории обязательно' })
  @IsString({ message: 'Название должно быть строкой' })
  @Length(1, 50, { message: 'Название должно быть от 1 до 50 символов' })
  name: string;
}
