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
import { StudentService } from './student.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AssignGroupDto } from 'src/teacher/application/dto/assign-group.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ParseBoolPipe } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { IStudentResponse } from 'src/student/domain/entities/student.entity';
import { ApiSuccessResponse } from 'src/common/interfaces/api-responce.interface';

@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class StudentController {
  constructor(private readonly studentService: StudentService) { }

  @Get()
  async findByGroup(
    @Query('groupId', ParseIntPipe) groupId: number,
    @GetUser() user: IAccessToken,
    @Query('includeUser', new ParseBoolPipe({ optional: true })) includeUser?: boolean,
  ): Promise<ApiSuccessResponse<IStudentResponse[]>> {
    const students = await this.studentService.findByGroupId(groupId, user.institutionId, includeUser ?? false);
    if (students.length === 0) {
      throw new NotFoundException('Студенты не найдены по группе ' + groupId);
    }
    return {
      success: true,
      data: students.map((s) => s.toResponse(includeUser ?? false)),
      message: 'Студенты успешно найдены',
    };
  }

  @Get(':userId')
  async findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: IAccessToken,
    @Query('includeUser', new ParseBoolPipe({ optional: true })) includeUser?: boolean,
  ): Promise<ApiSuccessResponse<IStudentResponse>> {
    const student = await this.studentService.findByUserId(userId, user.institutionId, includeUser ?? false);
    if (!student) {
      throw new NotFoundException('Студент не найден по id ' + userId);
    }
    return {
      success: true,
      data: student.toResponse(includeUser ?? false),
      message: 'Студент успешно найден',
    };
  }

  @Patch(':userId/group')
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
  async removeFromGroup(@Param('userId', ParseIntPipe) userId: number, @GetUser() user: IAccessToken): Promise<ApiSuccessResponse<IStudentResponse>> {
    const student = await this.studentService.removeFromGroup(userId, user.institutionId);
    return {
      success: true,
      data: student.toResponse(),
      message: 'Студент успешно удален из группы',
    };
  }
}
