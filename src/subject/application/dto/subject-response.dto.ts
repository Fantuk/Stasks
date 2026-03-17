import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO предмета для документации ответов API */
export class SubjectResponseDto {
  @ApiPropertyOptional({ example: 1, description: 'ID предмета' })
  id: number | null;

  @ApiProperty({ example: 1, description: 'ID учреждения' })
  institutionId: number;

  @ApiProperty({ example: 'Математика', description: 'Название предмета' })
  name: string;
}
