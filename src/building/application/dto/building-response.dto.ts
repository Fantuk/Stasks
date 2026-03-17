import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO здания для документации ответов API */
export class BuildingResponseDto {
  @ApiPropertyOptional({ example: 1, description: 'ID здания' })
  id: number | null;

  @ApiProperty({ example: 1, description: 'ID учреждения' })
  institutionId: number;

  @ApiProperty({ example: 'Корпус А', description: 'Название здания' })
  name: string;
}
