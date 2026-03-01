import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/**
 * DTO пользователя для документации Swagger (ответы API).
 * Соответствует типу UserResponse в коде.
 */
export class UserResponseDto {
    @ApiPropertyOptional({ example: 1, description: 'ID пользователя (null до сохранения)' })
    id: number | null;

    @ApiProperty({ example: 1, description: 'ID учреждения' })
    institutionId: number;

    @ApiProperty({ example: 'Иван', description: 'Имя' })
    name: string;

    @ApiProperty({ example: 'Иванов', description: 'Фамилия' })
    surname: string;

    @ApiPropertyOptional({ example: 'Иванович', nullable: true, description: 'Отчество' })
    patronymic: string | null;

    @ApiProperty({ example: 'user@example.com', description: 'Email' })
    email: string;

    @ApiProperty({
        enum: Role,
        isArray: true,
        example: ['STUDENT'],
        description: 'Роли пользователя',
    })
    roles: Role[];

    @ApiProperty({ example: true, description: 'Учётная запись активирована' })
    isActivated: boolean;
}
