import {
  Controller,
  Get,
  Post,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { AuthTokensService } from './services/auth-tokens.service';
import { Public } from 'src/common/decorators/public.decorator';
import type { FastifyReply } from 'fastify';
import { Cookies } from 'src/common/decorators/cookies.decorator';
import {
  REFRESH_TOKEN,
  RefreshTokenCookieInterceptor,
} from 'src/common/interceptors/refresh-token-cookie.interceptor';
import { ApiSuccessResponse } from 'src/common/interfaces/api-responce.interface';
import { ITokens } from 'src/token/application/interfaces/interfaces';

@Public()
@Controller('token')
export class TokenController {
  constructor(private readonly authTokenService: AuthTokensService) { }

  @Get('refresh-tokens')
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
