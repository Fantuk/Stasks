import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO привязки преподавателей к предмету */
export class AssignTeachersDto {
  @ApiProperty({ example: [1, 2], type: [Number], description: 'ID преподавателей (teacher userId)' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Укажите хотя бы одного преподавателя' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  teacherIds: number[];
}