import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO этажа для документации ответов API */
export class FloorResponseDto {
  @ApiPropertyOptional({ example: 1, description: 'ID этажа' })
  id: number | null;

  @ApiProperty({ example: 1, description: 'ID здания' })
  buildingId: number;

  @ApiProperty({ example: 1, description: 'Номер этажа' })
  number: number;
}
