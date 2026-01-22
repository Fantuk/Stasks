import {
  Controller,
  Post,
  Body,
  Res,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  REFRESH_TOKEN,
  RefreshTokenCookieInterceptor,
} from 'src/common/interceptors/refresh-token-cookie.interceptor';
import { Cookies } from 'src/common/decorators/cookies.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiSuccessResponse } from 'src/common/interfaces/api-responce.interface';
import { UserResponse } from 'src/user/application/interfaces/interfaces';
import { ModeratorPermissions } from 'src/common/decorators/moderator-permissions.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @Roles(Role.ADMIN)
  @ModeratorPermissions('canRegisterUsers')
  async register(@Body() registerDto: RegisterDto, @Req() req: FastifyRequest): Promise<ApiSuccessResponse<UserResponse>> {
    const adminInstitutionId = req.user.institutionId;

    const user = await this.authService.register(registerDto, adminInstitutionId);

    return {
      success: true,
      data: user,
      message: 'Пользователь успешно зарегистрирован',
    };
  }

  @Public()
  @Post('login')
  @UseInterceptors(RefreshTokenCookieInterceptor)
  async login(@Body() loginDto: LoginDto): Promise<ApiSuccessResponse<{ accessToken: string }>> {
    const tokens = await this.authService.login(loginDto);

    return {
      success: true,
      data: { accessToken: tokens.accessToken },
      message: 'Успешный вход',
    };
  }

  @Public()
  @Post('logout')
  async logout(
    @Cookies(REFRESH_TOKEN) refreshToken: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<ApiSuccessResponse<null>> {
    await this.authService.logout(refreshToken);

    reply.clearCookie(REFRESH_TOKEN);
    return {
      success: true,
      data: null,
      message: 'Успешный выход',
    };
  }
}
