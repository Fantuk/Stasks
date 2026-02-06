import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { ApiSuccessResponse } from 'src/common/interfaces/api-responce.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { SubjectService } from 'src/subject/application/subject.service';
import { CreateSubjectDto } from 'src/subject/application/dto/create-subject.dto';
import { UpdateSubjectDto } from 'src/subject/application/dto/update-subject.dto';
import { AssignTeachersDto } from 'src/subject/application/dto/assign-teachers.dto';
import { AssignGroupsDto } from 'src/subject/application/dto/assign-groups.dto';
import { parseIncludeOption } from 'src/common/utils/query.utils';
import { SearchQueryDto } from 'src/common/dto/search-query.dto';

@Controller('subject')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) { }

  @Post()
  async create(
    @Body() dto: CreateSubjectDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<{ id: number | null; institutionId: number; name: string }>> {
    const data = await this.subjectService.create(dto, user.institutionId);
    return { success: true, data, message: 'Предмет создан' };
  }

  @Get('search')
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubjectDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.subjectService.update(id, dto, user.institutionId);
    return { success: true, data, message: 'Предмет обновлён' };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.subjectService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Предмет удалён' };
  }

  @Post(':id/teachers')
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
  async unassignTeacher(
    @Param('id', ParseIntPipe) id: number,
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.subjectService.unassignTeacher(id, teacherId, user.institutionId);
    return { success: true, data: null, message: 'Преподаватель отвязан от предмета' };
  }

  @Post(':id/groups')
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
  async unassignGroup(
    @Param('id', ParseIntPipe) id: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.subjectService.unassignGroup(id, groupId, user.institutionId);
    return { success: true, data: null, message: 'Группа отвязана от предмета' };
  }
}