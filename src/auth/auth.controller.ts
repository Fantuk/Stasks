import {
  Controller,
  Post,
  Body,
  Res,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
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
import {
  ApiSuccessResponse,
  API_SUCCESS_RESPONSE_SCHEMA,
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { UserResponse } from 'src/user/application/interfaces/interfaces';
import { UserResponseDto } from 'src/user/application/dto/user-response.dto';
import { AccessTokenResponseDto } from 'src/common/dto/access-token-response.dto';
import { ModeratorPermissions } from 'src/common/decorators/moderator-permissions.decorator';

@ApiTags('Auth')
@ApiExtraModels(UserResponseDto, AccessTokenResponseDto)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Регистрация пользователя', description: 'Только ADMIN или модератор с правом canRegisterUsers' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь зарегистрирован',
    schema: createSuccessResponseSchema(getSchemaPath(UserResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
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
  @ApiOperation({ summary: 'Вход', description: 'Возвращает accessToken; refreshToken передаётся в cookie' })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход',
    schema: createSuccessResponseSchema(getSchemaPath(AccessTokenResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Неверные данные', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Неверный email или пароль', schema: API_ERROR_RESPONSE_SCHEMA })
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
  @ApiOperation({ summary: 'Выход', description: 'Инвалидирует refreshToken из cookie' })
  @ApiResponse({ status: 200, description: 'Успешный выход', schema: API_SUCCESS_RESPONSE_SCHEMA })
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
