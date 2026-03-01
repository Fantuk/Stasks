import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
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
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { GroupResponseDto } from 'src/group/application/dto/group-response.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { parseIncludeOption } from 'src/common/utils/query.utils';
import { SearchQueryDto } from 'src/common/dto/search-query.dto';

@ApiTags('Groups')
@ApiBearerAuth('JWT')
@ApiExtraModels(GroupResponseDto, ResponseMetaDto)
@Controller('group')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class GroupController {
  constructor(private readonly groupService: GroupService) { }

  @Post()
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
  @ApiOperation({ summary: 'Список групп учреждения с пагинацией' })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto), { withMeta: true, isArray: true }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findAll(
    @GetUser() user: IAccessToken,
    @Query() paginationDto: PaginationDto,
  ) {
    const result = await this.groupService.findByInstitutionId(
      user.institutionId,
      paginationDto.page,
      paginationDto.limit,
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

  @Post(':id/teacher')
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
    const data = await this.groupService.assignTeacher(
      id,
      dto.teacherUserId,
      user.institutionId,
    );
    return { success: true, data, message: 'Куратор группы обновлён' };
  }

  @Delete(':id/teacher')
  @ApiOperation({ summary: 'Убрать куратора группы' })
  @ApiResponse({
    status: 200,
    description: 'Куратор отвязан',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async unassignTeacher(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.groupService.unassignTeacher(id, user.institutionId);
    return { success: true, data, message: 'Куратор отвязан от группы' };
  }

  @Post(':id/students')
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
    const data = await this.groupService.assignStudents(
      id,
      dto.studentUserIds,
      user.institutionId,
    );
    return { success: true, data, message: 'Студенты привязаны к группе' };
  }

  @Delete(':id/students')
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
  @ApiResponse({ status: 400, description: 'Параметр name обязателен', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findByName(
    @Query('name') name: string,
    @GetUser() user: IAccessToken,
  ) {
    const formattedName = name.trim()

    if (!formattedName) throw new BadRequestException('Параметр name обязателен')

    const data = await this.groupService.findByName(formattedName, user.institutionId)
    return { success: true, data };
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск групп с пагинацией' })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(GroupResponseDto), { withMeta: true, isArray: true }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async search(
    @Query() searchDto: SearchQueryDto,
    @GetUser() user: IAccessToken,
  ) {
    const result = await this.groupService.search({
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
    const data = await this.groupService.update(
      id,
      updateGroupDto,
      user.institutionId,
    );
    return {
      success: true,
      data,
      message: 'Группа успешно обновлена',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить группу' })
  @ApiResponse({ status: 200, description: 'Группа удалена', schema: API_SUCCESS_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Группа не найдена', schema: API_ERROR_RESPONSE_SCHEMA })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.groupService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Группа успешно удалена' };
  }
}
