import { IsArray, IsInt, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignGroupsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Укажите хотя бы одну группу' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  groupIds: number[];
}