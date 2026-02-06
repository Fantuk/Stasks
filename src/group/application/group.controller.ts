import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GroupService } from 'src/group/application/group.service';
import { CreateGroupDto } from 'src/group/application/dto/create-group.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { ApiSuccessResponse } from 'src/common/interfaces/api-responce.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { parseIncludeOption } from 'src/common/utils/query.utils';
import { SearchQueryDto } from 'src/common/dto/search-query.dto';

@Controller('group')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class GroupController {
  constructor(private readonly groupService: GroupService) { }

  @Post()
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
  async unassignTeacher(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.groupService.unassignTeacher(id, user.institutionId);
    return { success: true, data, message: 'Куратор отвязан от группы' };
  }

  @Post(':id/students')
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
  async findByName(
    @Query('name') name: string,
    @GetUser() user: IAccessToken,
  ) {
    const formatedName = name.trim()

    if (!formatedName) throw new BadRequestException('Параметр name обязателен')

    const data = await this.groupService.findByName(formatedName, user.institutionId)
    return { success: true, data };
  }

  @Get(':id')
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

  @Get('search')
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

  @Patch(':id')
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
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.groupService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Группа успешно удалена' };
  }
}
