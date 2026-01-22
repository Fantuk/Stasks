import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AssignGroupDto } from './dto/assign-group.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { ApiSuccessResponse } from 'src/common/interfaces/api-responce.interface';
import { ITeacherResponse } from 'src/teacher/domain/entities/teacher.entity';

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) { }

  @Get(':userId')
  async findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: IAccessToken,
    @Query('includeUser', new ParseBoolPipe({ optional: true })) includeUser?: boolean,
  ): Promise<ApiSuccessResponse<ITeacherResponse>> {
    const teacher = await this.teacherService.findByUserId(
      userId,
      user.institutionId,
      includeUser ?? false,
    );

    if (!teacher) {
      throw new NotFoundException('Преподаватель не найден по id ' + userId);
    }
    return {
      success: true,
      data: teacher.toResponse(includeUser ?? false),
    };
  }

  @Patch(':userId/mentored-group')
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
  async removeGroup(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<ITeacherResponse>> {
    const teacher = await this.teacherService.removeMentoredGroup(
      userId,
      user.institutionId,
    );
    return {
      success: true,
      data: teacher.toResponse(),
      message: 'Преподаватель успешно удален из группы',
    };
  }
}
