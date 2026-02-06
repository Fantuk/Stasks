import { IsArray, IsInt, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignTeachersDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Укажите хотя бы одного преподавателя' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  teacherIds: number[];
}