import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO группы для документации ответов API */
export class GroupResponseDto {
    @ApiPropertyOptional({ example: 1, description: 'ID группы' })
    id: number | null;

    @ApiProperty({ example: 1, description: 'ID учреждения' })
    institutionId: number;

    @ApiProperty({ example: 'ИС-41', description: 'Название группы' })
    name: string;
}
