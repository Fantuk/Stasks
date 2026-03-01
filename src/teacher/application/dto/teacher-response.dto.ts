import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from 'src/user/application/dto/user-response.dto';

/** DTO преподавателя для документации ответов API */
export class TeacherResponseDto {
    @ApiPropertyOptional({ example: 1, description: 'ID записи преподавателя' })
    id: number | null;

    @ApiProperty({ example: 1, description: 'ID пользователя' })
    userId: number;

    @ApiPropertyOptional({ example: 1, nullable: true, description: 'ID группы-куратора' })
    mentoredGroupId: number | null;

    @ApiPropertyOptional({ type: () => UserResponseDto, description: 'Данные пользователя (при include=user)' })
    user?: UserResponseDto;
}
