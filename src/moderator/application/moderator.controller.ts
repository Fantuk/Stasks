import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ModeratorService } from './moderator.service';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  IModeratorAccessRights,
  IModeratorResponse,
} from 'src/moderator/domain/entities/moderator.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { ApiSuccessResponse } from 'src/common/interfaces/api-response.interface';
import {
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { parseIncludeOption, shouldIncludeUser } from 'src/common/utils/query.utils';
import { paginatedSuccess } from 'src/common/utils/response.utils';
import { ModeratorResponseDto } from 'src/moderator/application/dto/moderator-response.dto';
import { UserResponseDto } from 'src/user/application/dto/user-response.dto';
import { GetModeratorsQueryDto } from './dto/get-moderators-query.dto';
import { ResponseMetaDto } from 'src/common/interfaces/api-response.interface';

@ApiTags('Moderators')
@ApiBearerAuth('JWT')
@ApiExtraModels(ModeratorResponseDto, UserResponseDto, ResponseMetaDto)
@Controller('moderator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModeratorController {
  constructor(private readonly moderatorService: ModeratorService) {}

  @Get()
  @ApiOperation({ summary: 'Список модераторов учреждения с пагинацией и поиском' })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(ModeratorResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @Roles(Role.ADMIN, Role.MODERATOR)
  async findAll(@GetUser() user: IAccessToken, @Query() query: GetModeratorsQueryDto) {
    const result = await this.moderatorService.findByInstitutionId(user.institutionId, {
      page: query.page,
      limit: query.limit,
      query: query.query,
    });
    return paginatedSuccess(result);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Модератор по id пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Данные модератора',
    schema: createSuccessResponseSchema(getSchemaPath(ModeratorResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({
    status: 404,
    description: 'Модератор не найден',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  @Roles(Role.ADMIN, Role.MODERATOR)
  async findById(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: IAccessToken,
    @Query('include') include?: string,
  ): Promise<ApiSuccessResponse<IModeratorResponse>> {
    const options = parseIncludeOption(include);
    const moderator = await this.moderatorService.findByUserId(userId, user.institutionId, options);

    if (!moderator) throw new NotFoundException('Модератор не найден');
    const includeUser = shouldIncludeUser(options);
    return {
      success: true,
      data: moderator.toResponse(includeUser),
    };
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Обновить права доступа модератора', description: 'Только ADMIN' })
  @ApiResponse({
    status: 200,
    description: 'Права обновлены',
    schema: createSuccessResponseSchema(getSchemaPath(ModeratorResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({
    status: 404,
    description: 'Модератор не найден',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  @Roles(Role.ADMIN)
  async updateAccessRights(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: Partial<IModeratorAccessRights>,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<IModeratorResponse>> {
    const moderator = await this.moderatorService.updateAccessRights(
      userId,
      dto,
      user.institutionId,
    );
    return {
      success: true,
      data: moderator.toResponse(),
      message: 'Права доступа модератора успешно обновлены',
    };
  }
}
