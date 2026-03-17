import {
  Body,
  Controller,
  Delete,
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
import { TeacherService } from './teacher.service';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AssignGroupDto } from './dto/assign-group.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { ApiSuccessResponse } from 'src/common/interfaces/api-response.interface';
import {
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { ITeacherResponse } from 'src/teacher/domain/entities/teacher.entity';
import { parseIncludeOption } from 'src/common/utils/query.utils';
import { paginatedSuccess } from 'src/common/utils/response.utils';
import {
  TeacherResponseDto,
  TeacherSubjectSummaryDto,
} from 'src/teacher/application/dto/teacher-response.dto';
import { UserResponseDto } from 'src/user/application/dto/user-response.dto';
import { GetTeachersQueryDto } from './dto/get-teachers-query.dto';
import { ResponseMetaDto } from 'src/common/interfaces/api-response.interface';

@ApiTags('Teachers')
@ApiBearerAuth('JWT')
@ApiExtraModels(TeacherResponseDto, TeacherSubjectSummaryDto, UserResponseDto, ResponseMetaDto)
@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  @ApiOperation({ summary: 'Список преподавателей учреждения с пагинацией и поиском' })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(TeacherResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findAll(@GetUser() user: IAccessToken, @Query() query: GetTeachersQueryDto) {
    const result = await this.teacherService.findByInstitutionId(user.institutionId, {
      page: query.page,
      limit: query.limit,
      query: query.query,
    });
    return paginatedSuccess(result);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Преподаватель по id пользователя (userId)' })
  @ApiResponse({
    status: 200,
    description: 'Данные преподавателя',
    schema: createSuccessResponseSchema(getSchemaPath(TeacherResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({
    status: 404,
    description: 'Преподаватель не найден',
    schema: API_ERROR_RESPONSE_SCHEMA,
  })
  async findById(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: IAccessToken,
    @Query('include') include?: string,
  ): Promise<ApiSuccessResponse<ITeacherResponse>> {
    const options = parseIncludeOption(include);
    const teacher = await this.teacherService.findByUserId(userId, user.institutionId, options);
    if (!teacher) throw new NotFoundException('Преподаватель не найден');
    const includeUser = options?.include?.includes('user') ?? false;
    return {
      success: true,
      data: teacher.toResponse(includeUser),
    };
  }

  @Patch(':userId/mentored-group')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Назначить группу куратору (преподавателю)' })
  @ApiResponse({
    status: 200,
    description: 'Группа назначена',
    schema: createSuccessResponseSchema(getSchemaPath(TeacherResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async assignGroup(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AssignGroupDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<ITeacherResponse>> {
    const teacher = await this.teacherService.assignMentoredGroup(
      userId,
      dto.groupId,
      user.institutionId,
    );
    return {
      success: true,
      data: teacher.toResponse(),
      message: 'Преподаватель успешно добавлен в группу',
    };
  }

  @Delete(':userId/mentored-group')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Убрать группу у куратора' })
  @ApiResponse({
    status: 200,
    description: 'Группа отвязана',
    schema: createSuccessResponseSchema(getSchemaPath(TeacherResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async removeGroup(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<ITeacherResponse>> {
    const teacher = await this.teacherService.removeMentoredGroup(userId, user.institutionId);
    return {
      success: true,
      data: teacher.toResponse(),
      message: 'Преподаватель успешно удален из группы',
    };
  }
}
