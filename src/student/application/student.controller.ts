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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AssignGroupDto } from 'src/teacher/application/dto/assign-group.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { IStudentResponse } from 'src/student/domain/entities/student.entity';
import { ApiSuccessResponse } from 'src/common/interfaces/api-response.interface';
import { API_ERROR_RESPONSE_SCHEMA, createSuccessResponseSchema } from 'src/common/interfaces/api-response.interface';
import { parseIncludeOption, shouldIncludeUser } from 'src/common/utils/query.utils';
import { StudentResponseDto } from 'src/student/application/dto/student-response.dto';
import { UserResponseDto } from 'src/user/application/dto/user-response.dto';
import { GetStudentsQueryDto } from './dto/get-students-query.dto';

@ApiTags('Students')
@ApiBearerAuth('JWT')
@ApiExtraModels(StudentResponseDto, UserResponseDto)
@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class StudentController {
  constructor(private readonly studentService: StudentService) { }

  @Get()
  @ApiOperation({ summary: 'Список студентов группы', description: 'Query: groupId (обязателен). При пустой группе возвращается 200 и data: []' })
  @ApiResponse({
    status: 200,
    description: 'Список студентов (пустой массив, если в группе нет студентов)',
    schema: createSuccessResponseSchema(getSchemaPath(StudentResponseDto), { isArray: true }),
  })
  @ApiResponse({ status: 400, description: 'groupId не указан или неверен', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Группа не найдена', schema: API_ERROR_RESPONSE_SCHEMA })
  async findByGroup(
    @Query() query: GetStudentsQueryDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<IStudentResponse[]>> {
    const options = parseIncludeOption(query.include);
    const includeUser = shouldIncludeUser(options) ?? false;
    const students = await this.studentService.findByGroupId(
      query.groupId,
      user.institutionId,
      options,
    );
    return {
      success: true,
      data: students.map((s) => s.toResponse(includeUser)),
    };
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Студент по id пользователя (userId)' })
  @ApiResponse({
    status: 200,
    description: 'Данные студента',
    schema: createSuccessResponseSchema(getSchemaPath(StudentResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Студент не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  async findById(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: IAccessToken,
    @Query('include') include?: string,
  ): Promise<ApiSuccessResponse<IStudentResponse>> {
    const options = parseIncludeOption(include);
    const student = await this.studentService.findByUserId(
      userId,
      user.institutionId,
      options,
    );
    if (!student) throw new NotFoundException('Студент не найден по id ' + userId);
    const includeUser = options?.include?.includes('user') ?? false;
    return {
      success: true,
      data: student.toResponse(includeUser),
    };
  }

  @Patch(':userId/group')
  @ApiOperation({ summary: 'Привязать студента к группе' })
  @ApiResponse({
    status: 200,
    description: 'Студент привязан к группе',
    schema: createSuccessResponseSchema(getSchemaPath(StudentResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async assignToGroup(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AssignGroupDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<IStudentResponse>> {
    const student = await this.studentService.assignToGroup(
      userId,
      dto.groupId,
      user.institutionId,
    );
    return {
      success: true,
      data: student.toResponse(),
      message: 'Студент успешно добавлен в группу',
    };
  }

  @Delete(':userId/group')
  @ApiOperation({ summary: 'Отвязать студента от группы' })
  @ApiResponse({
    status: 200,
    description: 'Студент отвязан от группы',
    schema: createSuccessResponseSchema(getSchemaPath(StudentResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async removeFromGroup(@Param('userId', ParseIntPipe) userId: number, @GetUser() user: IAccessToken): Promise<ApiSuccessResponse<IStudentResponse>> {
    const student = await this.studentService.removeFromGroup(userId, user.institutionId);
    return {
      success: true,
      data: student.toResponse(),
      message: 'Студент успешно удален из группы',
    };
  }
}
