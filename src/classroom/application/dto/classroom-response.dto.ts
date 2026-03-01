import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO аудитории для документации ответов API */
export class ClassroomResponseDto {
    @ApiPropertyOptional({ example: 1, description: 'ID аудитории' })
    id: number | null;

    @ApiProperty({ example: 1, description: 'ID этажа' })
    floorId: number;

    @ApiProperty({ example: '101', description: 'Название аудитории' })
    name: string;
}
