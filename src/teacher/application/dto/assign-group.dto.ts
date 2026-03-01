import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

/** DTO назначения группы (куратору или студенту) */
export class AssignGroupDto {
  @ApiProperty({ example: 1, description: 'ID группы' })
  @IsNumber()
  @IsPositive({ message: 'Id группы должно быть положительным' })
  groupId: number;
}
