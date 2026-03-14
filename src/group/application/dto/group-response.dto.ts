import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Краткий DTO куратора группы (для списка групп) */
export class GroupMentorDto {
    @ApiProperty({ example: 1, description: 'ID записи преподавателя' })
    id: number;

    @ApiProperty({ example: 1, description: 'ID пользователя' })
    userId: number;

    @ApiProperty({ example: 'Иванов Иван Иванович', description: 'ФИО куратора' })
    displayName: string;
}

/** DTO группы для документации ответов API */
export class GroupResponseDto {
    @ApiPropertyOptional({ example: 1, description: 'ID группы' })
    id: number | null;

    @ApiProperty({ example: 1, description: 'ID учреждения' })
    institutionId: number;

    @ApiProperty({ example: 'ИС-41', description: 'Название группы' })
    name: string;

    /** Количество студентов в группе (только в списке/поиске) */
    @ApiPropertyOptional({ example: 12, description: 'Количество студентов в группе' })
    studentCount?: number;

    /** Куратор группы (только в списке/поиске) */
    @ApiPropertyOptional({ type: () => GroupMentorDto, description: 'Куратор группы' })
    mentor?: GroupMentorDto;
}
