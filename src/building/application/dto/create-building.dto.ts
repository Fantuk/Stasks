import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/** DTO создания здания */
export class CreateBuildingDto {
  @ApiProperty({ example: 'Корпус А', minLength: 2, maxLength: 100, description: 'Название здания' })
  @IsNotEmpty({ message: 'Название здания обязательно' })
  @IsString({ message: 'Название должно быть строкой' })
  @Length(2, 100, { message: 'Название должно быть от 2 до 100 символов' })
  name: string;
}
