import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import {
  API_SUCCESS_RESPONSE_SCHEMA,
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { ResponseMetaDto } from 'src/common/interfaces/api-response.interface';
import { parseClassroomIncludeOption } from 'src/common/utils/query.utils';
import { ClassroomService } from 'src/classroom/application/classroom.service';
import { ClassroomSearchQueryDto } from 'src/classroom/application/dto/classroom-search-query.dto';
import { CreateClassroomDto } from 'src/classroom/application/dto/create-classroom.dto';
import { GetClassroomsQueryDto } from 'src/classroom/application/dto/get-classrooms-query.dto';
import { UpdateClassroomDto } from 'src/classroom/application/dto/update-classroom.dto';
import { ClassroomResponseDto } from 'src/classroom/application/dto/classroom-response.dto';

@ApiTags('Classrooms')
@ApiBearerAuth('JWT')
@ApiExtraModels(ClassroomResponseDto, ResponseMetaDto)
@Controller('classroom')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class ClassroomController {
  /** Специфичные пути (search и т.д.) должны быть объявлены выше Get(':id'). */
  constructor(private readonly classroomService: ClassroomService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать аудиторию' })
  @ApiResponse({
    status: 201,
    description: 'Аудитория создана',
    schema: createSuccessResponseSchema(getSchemaPath(ClassroomResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async create(
    @Body() createClassroomDto: CreateClassroomDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.classroomService.create(
      createClassroomDto,
      user.institutionId,
    );
    return {
      success: true,
      data,
      message: 'Аудитория успешно создана',
    };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Поиск аудиторий с пагинацией',
    description: 'Поиск по строке и фильтр по этажу. Список по этажу: GET /classroom?floorId=...',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(ClassroomResponseDto), { withMeta: true, isArray: true }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async search(
    @Query() query: ClassroomSearchQueryDto,
    @GetUser() user: IAccessToken,
  ) {
    const result = await this.classroomService.search({
      institutionId: user.institutionId,
      floorId: query.floorId,
      query: query.query,
      page: query.page,
      limit: query.limit,
    });
    return {
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Список аудиторий этажа с пагинацией',
    description: 'Список по floorId (обязателен). Для поиска по названию используйте GET /classroom/search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(ClassroomResponseDto), { withMeta: true, isArray: true }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findAll(
    @Query() query: GetClassroomsQueryDto,
    @GetUser() user: IAccessToken,
  ) {
    const result = await this.classroomService.findByFloorId(
      query.floorId,
      user.institutionId,
      query.page,
      query.limit,
    );
    return {
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Аудитория по id' })
  @ApiResponse({
    status: 200,
    description: 'Данные аудитории',
    schema: createSuccessResponseSchema(getSchemaPath(ClassroomResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Аудитория не найдена', schema: API_ERROR_RESPONSE_SCHEMA })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
    @Query('include') include?: string,
  ) {
    const options = parseClassroomIncludeOption(include);
    const data = await this.classroomService.findById(
      id,
      user.institutionId,
      options,
    );
    if (!data) throw new NotFoundException('Аудитория не найдена');
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить аудиторию' })
  @ApiResponse({
    status: 200,
    description: 'Аудитория обновлена',
    schema: createSuccessResponseSchema(getSchemaPath(ClassroomResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Аудитория не найдена', schema: API_ERROR_RESPONSE_SCHEMA })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClassroomDto: UpdateClassroomDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.classroomService.update(
      id,
      updateClassroomDto,
      user.institutionId,
    );
    return {
      success: true,
      data,
      message: 'Аудитория успешно обновлена',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить аудиторию' })
  @ApiResponse({ status: 200, description: 'Аудитория удалена', schema: API_SUCCESS_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Аудитория не найдена', schema: API_ERROR_RESPONSE_SCHEMA })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.classroomService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Аудитория успешно удалена' };
  }
}
