import { ArrayNotEmpty, IsArray, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignStudentsDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Укажите хотя бы одного студента' })
  @IsInt({ each: true })
  @IsPositive({ each: true, message: 'Каждый userId должен быть положительным' })
  @Type(() => Number)
  studentUserIds: number[];
}