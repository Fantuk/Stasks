import { ApiProperty } from '@nestjs/swagger';

/** Пара токенов (refresh — также в cookie) */
export class TokensResponseDto {
  @ApiProperty({ example: 'eyJhbGc...', description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token (дублируется в httpOnly cookie)',
    example: { token: 'uuid', expires: '2025-03-01T12:00:00.000Z' },
  })
  refreshToken: { token: string; expires: string };
}
