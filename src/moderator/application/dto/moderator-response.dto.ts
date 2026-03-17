import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from 'src/user/application/dto/user-response.dto';

/** Права доступа модератора (ключ — название права, значение — включено) */
export class ModeratorAccessRightsDto {
  @ApiPropertyOptional({ example: true, description: 'Может удалять пользователей' })
  canDeleteUsers?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Может регистрировать пользователей' })
  canRegisterUsers?: boolean;
}

/** DTO модератора для документации ответов API */
export class ModeratorResponseDto {
  @ApiPropertyOptional({ example: 1, description: 'ID записи модератора' })
  id: number | null;

  @ApiProperty({ example: 1, description: 'ID пользователя' })
  userId: number;

  @ApiProperty({
    example: { canDeleteUsers: true, canRegisterUsers: true },
    description: 'Права доступа',
  })
  accessRights: Record<string, boolean | undefined>;

  @ApiPropertyOptional({
    type: () => UserResponseDto,
    description: 'Данные пользователя (при include=user)',
  })
  user?: UserResponseDto;
}
