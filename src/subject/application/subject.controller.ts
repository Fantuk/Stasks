import {
  BadRequestException,
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
  ApiSuccessResponse,
  API_SUCCESS_RESPONSE_SCHEMA,
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { ResponseMetaDto } from 'src/common/interfaces/api-response.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { SubjectResponseDto } from 'src/subject/application/dto/subject-response.dto';
import { SubjectService } from 'src/subject/application/subject.service';
import { CreateSubjectDto } from 'src/subject/application/dto/create-subject.dto';
import { UpdateSubjectDto } from 'src/subject/application/dto/update-subject.dto';
import { AssignTeachersDto } from 'src/subject/application/dto/assign-teachers.dto';
import { AssignGroupsDto } from 'src/subject/application/dto/assign-groups.dto';
import { parseIncludeOption } from 'src/common/utils/query.utils';
import { SearchQueryDto } from 'src/common/dto/search-query.dto';

@ApiTags('Subjects')
@ApiBearerAuth('JWT')
@ApiExtraModels(SubjectResponseDto, ResponseMetaDto)
@Controller('subject')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class SubjectController {
  /** Специфичные пути (search, by-name и т.д.) должны быть объявлены выше Get(':id'). */
  constructor(private readonly subjectService: SubjectService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать предмет' })
  @ApiResponse({
    status: 201,
    description: 'Предмет создан',
    schema: createSuccessResponseSchema(getSchemaPath(SubjectResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async create(
    @Body() dto: CreateSubjectDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<{ id: number | null; institutionId: number; name: string }>> {
    const data = await this.subjectService.create(dto, user.institutionId);
    return { success: true, data, message: 'Предмет создан' };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Поиск предметов с пагинацией',
    description: 'Поиск по строке query. Для полного списка используйте GET /subject.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(SubjectResponseDto), { withMeta: true, isArray: true }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async search(
    @Query() searchDto: SearchQueryDto,
    @GetUser() user: IAccessToken,
  ) {
    const result = await this.subjectService.search({
      institutionId: user.institutionId,
      query: searchDto.query,
      page: searchDto.page,
      limit: searchDto.limit,
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
    summary: 'Список предметов учреждения с пагинацией',
    description: 'Полный список предметов. Для поиска используйте GET /subject/search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(SubjectResponseDto), { withMeta: true, isArray: true }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findAll(
    @GetUser() user: IAccessToken,
    @Query() paginationDto: PaginationDto,
  ) {
    const result = await this.subjectService.findByInstitutionId(
      user.institutionId,
      paginationDto.page,
      paginationDto.limit,
    );
    return {
      success: true,
      data: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    };
  }

  @Get('by-name')
  @ApiOperation({ summary: 'Найти предмет по имени', description: 'Query: name (обязателен)' })
  @ApiResponse({
    status: 200,
    description: 'Предмет найден',
    schema: createSuccessResponseSchema(getSchemaPath(SubjectResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Параметр name обязателен', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findByName(
    @Query('name') name: string,
    @GetUser() user: IAccessToken,
  ) {
    const formatedName = name.trim()

    if (!formatedName) throw new BadRequestException('Параметр name обязателен')

    const data = await this.subjectService.findByName(formatedName, user.institutionId)
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Предмет по id' })
  @ApiResponse({
    status: 200,
    description: 'Данные предмета',
    schema: createSuccessResponseSchema(getSchemaPath(SubjectResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Предмет не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
    @Query('include') include?: string,
  ) {
    const options = parseIncludeOption(include);
    const data = await this.subjectService.findById(id, user.institutionId, options);
    if (!data) throw new NotFoundException('Предмет не найден');
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить предмет' })
  @ApiResponse({
    status: 200,
    description: 'Предмет обновлён',
    schema: createSuccessResponseSchema(getSchemaPath(SubjectResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Предмет не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubjectDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.subjectService.update(id, dto, user.institutionId);
    return { success: true, data, message: 'Предмет обновлён' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить предмет' })
  @ApiResponse({ status: 200, description: 'Предмет удалён', schema: API_SUCCESS_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Предмет не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.subjectService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Предмет удалён' };
  }

  @Post(':id/teachers')
  @ApiOperation({ summary: 'Привязать преподавателей к предмету' })
  @ApiResponse({
    status: 200,
    description: 'Преподаватели привязаны',
    schema: createSuccessResponseSchema(getSchemaPath(SubjectResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async assignTeachers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTeachersDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.subjectService.assignTeachers(
      id,
      dto.teacherIds,
      user.institutionId,
    );
    return { success: true, data, message: 'Преподаватели привязаны к предмету' };
  }

  @Delete(':id/teachers/:teacherId')
  @ApiOperation({ summary: 'Отвязать преподавателя от предмета' })
  @ApiResponse({ status: 200, description: 'Преподаватель отвязан', schema: API_SUCCESS_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async unassignTeacher(
    @Param('id', ParseIntPipe) id: number,
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.subjectService.unassignTeacher(id, teacherId, user.institutionId);
    return { success: true, data: null, message: 'Преподаватель отвязан от предмета' };
  }

  @Post(':id/groups')
  @ApiOperation({ summary: 'Привязать группы к предмету' })
  @ApiResponse({
    status: 200,
    description: 'Группы привязаны',
    schema: createSuccessResponseSchema(getSchemaPath(SubjectResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async assignGroups(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGroupsDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.subjectService.assignGroups(
      id,
      dto.groupIds,
      user.institutionId,
    );
    return { success: true, data, message: 'Группы привязаны к предмету' };
  }

  @Delete(':id/groups/:groupId')
  @ApiOperation({ summary: 'Отвязать группу от предмета' })
  @ApiResponse({ status: 200, description: 'Группа отвязана', schema: API_SUCCESS_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async unassignGroup(
    @Param('id', ParseIntPipe) id: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.subjectService.unassignGroup(id, groupId, user.institutionId);
    return { success: true, data: null, message: 'Группа отвязана от предмета' };
  }
}