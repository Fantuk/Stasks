import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO создания этажа. Номер этажа может быть положительным (надземные) и отрицательным (подземные). */
export class CreateFloorDto {
  @ApiProperty({ example: 1, description: 'ID здания' })
  @IsNotEmpty({ message: 'ID здания обязательно' })
  @Type(() => Number)
  @IsInt({ message: 'ID здания должен быть целым числом' })
  buildingId: number;

  @ApiProperty({
    example: 1,
    description: 'Номер этажа (целое число, в т.ч. отрицательное для подземных)',
  })
  @IsNotEmpty({ message: 'Номер этажа обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'Номер этажа должен быть целым числом' })
  number: number;
}
