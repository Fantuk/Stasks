import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from 'src/user/application/dto/user-response.dto';
import { GroupResponseDto } from 'src/group/application/dto/group-response.dto';

/** Краткий DTO предмета в ответе преподавателя (id, name) */
export class TeacherSubjectSummaryDto {
    @ApiProperty({ example: 1, description: 'ID предмета' })
    id: number;

    @ApiProperty({ example: 'Математика', description: 'Название предмета' })
    name: string;
}

/** DTO преподавателя для документации ответов API */
export class TeacherResponseDto {
    @ApiPropertyOptional({ example: 1, description: 'ID записи преподавателя' })
    id: number | null;

    @ApiProperty({ example: 1, description: 'ID пользователя' })
    userId: number;

    @ApiPropertyOptional({ example: 1, nullable: true, description: 'ID группы-куратора' })
    mentoredGroupId: number | null;

    @ApiPropertyOptional({ type: () => GroupResponseDto, description: 'Курируемая группа (название для отображения в списке)' })
    mentoredGroup?: GroupResponseDto;

    @ApiPropertyOptional({ type: [TeacherSubjectSummaryDto], description: 'Предметы преподавателя' })
    subjects?: TeacherSubjectSummaryDto[];

    @ApiPropertyOptional({ type: () => UserResponseDto, description: 'Данные пользователя (при include=user)' })
    user?: UserResponseDto;
}
