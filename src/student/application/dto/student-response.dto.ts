import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from 'src/user/application/dto/user-response.dto';

/** DTO студента для документации ответов API */
export class StudentResponseDto {
    @ApiPropertyOptional({ example: 1, description: 'ID записи студента' })
    id: number | null;

    @ApiProperty({ example: 1, description: 'ID пользователя' })
    userId: number;

    @ApiPropertyOptional({ example: 1, nullable: true, description: 'ID группы' })
    groupId: number | null;

    @ApiPropertyOptional({ type: () => UserResponseDto, description: 'Данные пользователя (при include=user)' })
    user?: UserResponseDto;
}
