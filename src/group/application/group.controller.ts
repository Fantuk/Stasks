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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GroupService } from 'src/group/application/group.service';
import { CreateGroupDto } from 'src/group/application/dto/create-group.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { ApiSuccessResponse } from 'src/common/interfaces/api-response.interface';
import {
  API_SUCCESS_RESPONSE_SCHEMA,
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { ResponseMetaDto } from 'src/common/interfaces/api-response.interface';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { GroupResponseDto, GroupMentorDto } from 'src/group/application/dto/group-response.dto';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { parseIncludeOption } from 'src/common/utils/query.utils';
import { paginatedSuccess } from 'src/common/utils/response.utils';
import { SearchQueryDto } from 'src/common/dto/search-query.dto';
import { SubjectService } from 'src/subject/application/subject.service';
import { SubjectResponseDto } from 'src/subject/application/dto/subject-response.dto';

/** DTO для списка групп: разрешаем limit до 500 (для выбора групп на странице звонков и т.д.) */
class GroupQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 500,
    description: 'Записей на странице',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Лимит должен быть числом' })
  @Min(1, { message: 'Лимит должен быть больше 0' })
  @Max(500, { message: 'Лимит не может быть больше 500' })
  limit?: number = 10;
}

@ApiTags('Groups')
@ApiBearerAuth('JWT')
@ApiExtraModels(GroupResponseDto, GroupMentorDto, ResponseMetaDto, SubjectResponseDto)
@Controller('group')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupController {
  /** Специфичные пути (search, by-name, bulk и т.д.) должны быть объявлены выше Get(':id'). */
  constructor(
    private readonly groupService: GroupService,
    private readonly subjectService: SubjectService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать группу' })
  @ApiResponse({
    status: 201,
    description: 'Группа создана',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<{ id: number | null; institutionId: number; name: string }>> {
    const data = await this.groupService.create(createGroupDto, user.institutionId);
    return {
      success: true,
      data,
      message: 'Группа успешно создана',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Список групп учреждения с пагинацией',
    description: 'Полный список групп. Для поиска по названию используйте GET /group/search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findAll(@GetUser() user: IAccessToken, @Query() queryDto: GroupQueryDto) {
    const result = await this.groupService.findByInstitutionId(
      user.institutionId,
      queryDto.page,
      queryDto.limit,
      queryDto.sort,
      queryDto.order,
    );
    return paginatedSuccess(result);
  }

  @Post(':id/teacher')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Назначить куратора группы' })
  @ApiResponse({
    status: 200,
    description: 'Куратор назначен',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async assignTeacher(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTeacherDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.groupService.assignTeacher(id, dto.teacherUserId, user.institutionId);
    return { success: true, data, message: 'Куратор группы обновлён' };
  }

  @Delete(':id/teacher')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Убрать куратора группы' })
  @ApiResponse({
    status: 200,
    description: 'Возвращается обновлённая группа (поле teacher будет null после отвязки)',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async unassignTeacher(@Param('id', ParseIntPipe) id: number, @GetUser() user: IAccessToken) {
    const data = await this.groupService.unassignTeacher(id, user.institutionId);
    return { success: true, data, message: 'Куратор отвязан от группы' };
  }

  @Post(':id/students')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Привязать студентов к группе' })
  @ApiResponse({
    status: 200,
    description: 'Студенты привязаны',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async assignStudents(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignStudentsDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.groupService.assignStudents(id, dto.studentUserIds, user.institutionId);
    return { success: true, data, message: 'Студенты привязаны к группе' };
  }

  @Delete(':id/students')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Отвязать студентов от группы' })
  @ApiResponse({
    status: 200,
    description: 'Студенты отвязаны',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async unassignStudents(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignStudentsDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.groupService.unassignStudents(
      id,
      dto.studentUserIds,
      user.institutionId,
    );
    return { success: true, data, message: 'Студенты отвязаны от группы' };
  }

  @Get('by-name')
  @ApiOperation({ summary: 'Найти группу по имени', description: 'Query: name (обязателен)' })
  @ApiResponse({
    status: 200,
    description: 'Группа найдена',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto)),
  })
  @ApiResponse({
    status: 400,
    description: 'Параметр name обязателен',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findByName(@Query('name') name: string, @GetUser() user: IAccessToken) {
    const formattedName = name.trim();

    if (!formattedName) throw new BadRequestException('Параметр name обязателен');

    const data = await this.groupService.findByName(formattedName, user.institutionId);
    return { success: true, data };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Поиск групп с пагинацией',
    description: 'Поиск по строке query. Для полного списка используйте GET /group.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async search(@Query() searchDto: SearchQueryDto, @GetUser() user: IAccessToken) {
    const result = await this.groupService.search({
      institutionId: user.institutionId,
      query: searchDto.query,
      page: searchDto.page,
      limit: searchDto.limit,
      sort: searchDto.sort,
      order: searchDto.order,
    });
    return paginatedSuccess(result);
  }

  @Get(':id/subjects')
  @ApiOperation({
    summary: 'Предметы, привязанные к группе',
    description:
      'Список предметов для расписания по группе. Id группы в пути. Эквивалентно GET /subject?groupId=:id.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список предметов и meta',
    schema: createSuccessResponseSchema(getSchemaPath(SubjectResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Группа не найдена', schema: API_ERROR_RESPONSE_SCHEMA })
  async findSubjectsByGroupId(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    const result = await this.subjectService.findByGroupId(id, user.institutionId);
    return paginatedSuccess(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Группа по id' })
  @ApiResponse({
    status: 200,
    description: 'Данные группы',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Группа не найдена', schema: API_ERROR_RESPONSE_SCHEMA })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
    @Query('include') include?: string,
  ) {
    const options = parseIncludeOption(include);
    const data = await this.groupService.findById(id, user.institutionId, options);
    if (!data) throw new NotFoundException('Группа не найдена');
    return { success: true, data };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Обновить группу' })
  @ApiResponse({
    status: 200,
    description: 'Группа обновлена',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Группа не найдена', schema: API_ERROR_RESPONSE_SCHEMA })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.groupService.update(id, updateGroupDto, user.institutionId);
    return {
      success: true,
      data,
      message: 'Группа успешно обновлена',
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Удалить группу' })
  @ApiResponse({ status: 200, description: 'Группа удалена', schema: API_SUCCESS_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Группа не найдена', schema: API_ERROR_RESPONSE_SCHEMA })
  async remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: IAccessToken) {
    await this.groupService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Группа успешно удалена' };
  }
}
