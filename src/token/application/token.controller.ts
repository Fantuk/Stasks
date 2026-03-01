import {
  Controller,
  Get,
  Post,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { AuthTokensService } from './services/auth-tokens.service';
import { Public } from 'src/common/decorators/public.decorator';
import type { FastifyReply } from 'fastify';
import { Cookies } from 'src/common/decorators/cookies.decorator';
import {
  REFRESH_TOKEN,
  RefreshTokenCookieInterceptor,
} from 'src/common/interceptors/refresh-token-cookie.interceptor';
import { ApiSuccessResponse } from 'src/common/interfaces/api-response.interface';
import { API_SUCCESS_RESPONSE_SCHEMA, API_ERROR_RESPONSE_SCHEMA, createSuccessResponseSchema } from 'src/common/interfaces/api-response.interface';
import { ITokens } from 'src/token/application/interfaces/interfaces';
import { TokensResponseDto } from 'src/common/dto/tokens-response.dto';

@ApiTags('Tokens')
@ApiExtraModels(TokensResponseDto)
@Public()
@Controller('token')
export class TokenController {
  constructor(private readonly authTokenService: AuthTokensService) { }

  @Get('refresh-tokens')
  @ApiOperation({ summary: 'Обновить токены', description: 'Использует refreshToken из cookie' })
  @ApiResponse({
    status: 200,
    description: 'Новая пара токенов',
    schema: createSuccessResponseSchema(getSchemaPath(TokensResponseDto)),
  })
  @ApiResponse({ status: 401, description: 'Токен отсутствует или невалиден', schema: API_ERROR_RESPONSE_SCHEMA })
  @UseInterceptors(RefreshTokenCookieInterceptor)
  async refreshTokens(@Cookies(REFRESH_TOKEN) refreshToken: string): Promise<ApiSuccessResponse<ITokens>> {
    if (!refreshToken || refreshToken.trim() === '') {
      throw new UnauthorizedException('Токен обновления отсутствует или пуст');
    }
    const tokens = await this.authTokenService.refreshTokens(refreshToken);
    return {
      success: true,
      data: tokens,
      message: 'Токены успешно обновлены',
    };
  }

  @Post('remove')
  @ApiOperation({ summary: 'Удалить refresh-токен', description: 'Удаляет cookie и запись в БД' })
  @ApiResponse({ status: 200, description: 'Токен удалён', schema: API_SUCCESS_RESPONSE_SCHEMA })
  async removeToken(
    @Cookies(REFRESH_TOKEN) refreshToken: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<ApiSuccessResponse<null>> {
    if (refreshToken) {
      await this.authTokenService.removeRefreshToken(refreshToken);
    }

    reply.clearCookie(REFRESH_TOKEN);
    return {
      success: true,
      data: null,
      message: 'Токен обновления удален',
    };
  }
}
