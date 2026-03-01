import { ApiProperty } from '@nestjs/swagger';

/** Ответ с accessToken (логин) */
export class AccessTokenResponseDto {
    @ApiProperty({ example: 'eyJhbGc...', description: 'JWT access token' })
    accessToken: string;
}
