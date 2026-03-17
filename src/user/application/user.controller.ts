import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import {
  ApiSuccessResponse,
  API_SUCCESS_RESPONSE_SCHEMA,
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { ResponseMetaDto } from 'src/common/interfaces/api-response.interface';
import { UserResponse } from 'src/user/application/interfaces/interfaces';
import { UserResponseDto } from 'src/user/application/dto/user-response.dto';
import { SearchUsersDto } from 'src/user/application/dto/search-users.dto';
import { GetMeDto } from 'src/user/application/dto/get-me.dto';
import { UpdateMeDto } from 'src/user/application/dto/update-me.dto';
import { ChangePasswordDto } from 'src/user/application/dto/change-password.dto';
import { ModeratorPermissions } from 'src/common/decorators/moderator-permissions.decorator';
import { parseUserIncludeOption } from 'src/common/utils/query.utils';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@ApiExtraModels(UserResponseDto, ResponseMetaDto)
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class UserController {
  /** Специфичные пути (search, me и т.д.) должны быть объявлены выше Get(':id'). */
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать пользователя' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь создан',
    schema: createSuccessResponseSchema(getSchemaPath(UserResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async create(
    @Body() createUserDto: CreateUserDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<UserResponse>> {
    const adminInstitutionId = user.institutionId;
    const createdUser = await this.userService.create(createUserDto, adminInstitutionId);
    return {
      success: true,
      data: createdUser,
      message: 'Пользователь успешно создан',
    };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Поиск пользователей по email/имени с пагинацией',
    description:
      'Поиск по строке query и фильтр по роли. Для полного списка без поиска используйте GET /users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей и meta (page, limit, total, totalPages)',
    schema: createSuccessResponseSchema(getSchemaPath(UserResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findByEmail(
    @Query() searchDto: SearchUsersDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<UserResponse[]>> {
    const roles: Role[] | undefined = searchDto.roles ? [searchDto.roles] : undefined;
    const includeOptions = parseUserIncludeOption(searchDto.include);

    const foundedUsers = await this.userService.search({
      institutionId: user.institutionId,
      query: searchDto.query,
      roles,
      page: searchDto.page,
      limit: searchDto.limit,
      sort: searchDto.sort,
      order: searchDto.order,
      include: includeOptions,
    });

    return {
      success: true,
      data: foundedUsers.data,
      meta: {
        page: foundedUsers.page,
        limit: foundedUsers.limit,
        total: foundedUsers.total,
        totalPages: foundedUsers.totalPages,
      },
    };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Текущий пользователь',
    description: 'Данные авторизованного пользователя',
  })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя',
    schema: createSuccessResponseSchema(getSchemaPath(UserResponseDto)),
  })
  @ApiResponse({ status: 401, description: 'Не авторизован', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  @Roles()
  async getMe(
    @GetUser() user: IAccessToken,
    @Query() query: GetMeDto,
  ): Promise<ApiSuccessResponse<UserResponse>> {
    const userId = user.userId;
    if (userId == null) throw new NotFoundException('Пользователь не найден');
    const includeOptions = parseUserIncludeOption(query.include);
    const me = await this.userService.findById(userId, user.institutionId, includeOptions);
    if (!me) throw new NotFoundException('Пользователь не найден');
    return { success: true, data: me };
  }

  @Patch('me/password')
  @ApiOperation({
    summary: 'Сменить пароль',
    description: 'Текущий пользователь меняет пароль по текущему и новому',
  })
  @ApiResponse({
    status: 200,
    description: 'Пароль успешно изменён',
    schema: API_SUCCESS_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации или неверный текущий пароль',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  @ApiResponse({ status: 401, description: 'Не авторизован', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  @Roles()
  async updateMyPassword(
    @GetUser() user: IAccessToken,
    @Body() dto: ChangePasswordDto,
  ): Promise<ApiSuccessResponse<null>> {
    const userId = user.userId;
    if (userId == null) throw new NotFoundException('Пользователь не найден');
    await this.userService.updatePassword(
      userId,
      user.institutionId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true, data: null, message: 'Пароль успешно изменён' };
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Обновить свои данные',
    description: 'Текущий пользователь может изменить ФИО и email',
  })
  @ApiResponse({
    status: 200,
    description: 'Данные обновлены',
    schema: createSuccessResponseSchema(getSchemaPath(UserResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Не авторизован', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  @Roles()
  async updateMe(
    @GetUser() user: IAccessToken,
    @Body() updateMeDto: UpdateMeDto,
  ): Promise<ApiSuccessResponse<UserResponse>> {
    const userId = user.userId;
    if (userId == null) throw new NotFoundException('Пользователь не найден');
    const updated = await this.userService.update(userId, updateMeDto, user.institutionId);
    return { success: true, data: updated, message: 'Данные успешно обновлены' };
  }

  @Get()
  @ApiOperation({
    summary: 'Список пользователей учреждения с пагинацией',
    description:
      'Полный список пользователей учреждения (без поиска по строке). Для поиска по email/имени используйте GET /users/search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(UserResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findAll(
    @GetUser() user: IAccessToken,
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiSuccessResponse<UserResponse[]>> {
    const users = await this.userService.findByInstitutionId(
      user.institutionId,
      paginationDto.page,
      paginationDto.limit,
      paginationDto.sort,
      paginationDto.order,
    );
    return {
      success: true,
      data: users.data,
      meta: {
        page: users.page,
        limit: users.limit,
        total: users.total,
        totalPages: users.totalPages,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Пользователь по id' })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя',
    schema: createSuccessResponseSchema(getSchemaPath(UserResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
    @Query('include') include?: string,
  ): Promise<ApiSuccessResponse<UserResponse>> {
    const includeOptions = parseUserIncludeOption(include);
    const foundedUser = await this.userService.findById(id, user.institutionId, includeOptions);
    if (!foundedUser) throw new NotFoundException('Пользователь не найден');
    return { success: true, data: foundedUser };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь обновлён',
    schema: createSuccessResponseSchema(getSchemaPath(UserResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<UserResponse>> {
    const updatedUser = await this.userService.update(id, updateUserDto, user.institutionId);

    return {
      success: true,
      data: updatedUser,
      message: 'Пользователь успешно обновлен',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить пользователя', description: 'Требуется право canDeleteUsers' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь удалён (data: null)',
    schema: API_SUCCESS_RESPONSE_SCHEMA,
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ModeratorPermissions('canDeleteUsers')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<null>> {
    await this.userService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Пользователь успешно удален' };
  }
}
