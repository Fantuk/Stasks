import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO привязки/отвязки студентов к группе */
export class AssignStudentsDto {
  @ApiProperty({ example: [1, 2, 3], type: [Number], description: 'ID пользователей-студентов' })
  @IsArray()
  @ArrayNotEmpty({ message: 'Укажите хотя бы одного студента' })
  @IsInt({ each: true })
  @IsPositive({ each: true, message: 'Каждый userId должен быть положительным' })
  @Type(() => Number)
  studentUserIds: number[];
}