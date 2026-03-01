import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO создания этажа */
export class CreateFloorDto {
  @ApiProperty({ example: 1, description: 'ID здания' })
  @IsNotEmpty({ message: 'ID здания обязательно' })
  @Type(() => Number)
  @IsInt({ message: 'ID здания должен быть целым числом' })
  buildingId: number;

  @ApiProperty({ example: 1, description: 'Номер этажа (0 и выше)' })
  @IsNotEmpty({ message: 'Номер этажа обязателен' })
  @Type(() => Number)
  @IsInt({ message: 'Номер этажа должен быть целым числом' })
  @Min(0, { message: 'Номер этажа не может быть отрицательным' })
  number: number;
}
