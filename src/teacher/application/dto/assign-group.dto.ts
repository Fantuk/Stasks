import { IsNumber, IsPositive } from 'class-validator';

export class AssignGroupDto {
  @IsNumber()
  @IsPositive({ message: 'Id группы должно быть больше положительным' })
  groupId: number;
}
