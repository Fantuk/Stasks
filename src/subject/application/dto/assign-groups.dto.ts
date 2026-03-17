import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO привязки групп к предмету */
export class AssignGroupsDto {
  @ApiProperty({ example: [1, 2], type: [Number], description: 'ID групп' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Укажите хотя бы одну группу' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  groupIds: number[];
}
