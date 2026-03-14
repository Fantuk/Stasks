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
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import {
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { ResponseMetaDto } from 'src/common/interfaces/api-response.interface';
import { ScheduleService } from 'src/schedule/application/schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';

@ApiTags('Schedule')
@ApiBearerAuth('JWT')
@ApiExtraModels(ScheduleResponseDto, ResponseMetaDto)
@Controller('schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать занятие в расписании' })
  @ApiResponse({
    status: 201,
    description: 'Занятие создано',
    schema: createSuccessResponseSchema(getSchemaPath(ScheduleResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Ресурс не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 409, description: 'Конфликт (аудитория или учитель заняты)', schema: API_ERROR_RESPONSE_SCHEMA })
  async create(
    @Body() dto: CreateScheduleDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.scheduleService.create(dto, user.institutionId);
    return {
      success: true,
      data,
      message: 'Занятие успешно создано',
    };
  }

  @Post('bulk')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Массовое создание занятий (все или ничего)' })
  @ApiResponse({
    status: 201,
    description: 'Занятия созданы',
    schema: createSuccessResponseSchema(getSchemaPath(ScheduleResponseDto), { isArray: true }),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Ресурс не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 409, description: 'Конфликт по одной из дат', schema: API_ERROR_RESPONSE_SCHEMA })
  async bulkCreate(
    @Body() dto: BulkCreateScheduleDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.scheduleService.bulkCreate(dto, user.institutionId);
    return {
      success: true,
      data,
      message: `Создано занятий: ${data.length}`,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Список занятий с фильтрами и пагинацией' })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(ScheduleResponseDto), { withMeta: true, isArray: true }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findMany(
    @Query() query: ScheduleQueryDto,
    @GetUser() user: IAccessToken,
  ) {
    const result = await this.scheduleService.findMany(user.institutionId, {
      groupId: query.groupId,
      teacherId: query.teacherId,
      classroomId: query.classroomId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      limit: query.limit,
      expand: query.expand,
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
  @ApiOperation({ summary: 'Занятие по id' })
  @ApiResponse({
    status: 200,
    description: 'Данные занятия',
    schema: createSuccessResponseSchema(getSchemaPath(ScheduleResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Занятие не найдено', schema: API_ERROR_RESPONSE_SCHEMA })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
    @Query('expand') expand?: string,
  ) {
    const data = await this.scheduleService.findById(id, user.institutionId, expand);
    if (!data) throw new NotFoundException('Занятие не найдено');
    return { success: true, data };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Обновить занятие' })
  @ApiResponse({
    status: 200,
    description: 'Занятие обновлено',
    schema: createSuccessResponseSchema(getSchemaPath(ScheduleResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Занятие не найдено', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 409, description: 'Конфликт (аудитория или учитель заняты)', schema: API_ERROR_RESPONSE_SCHEMA })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.scheduleService.update(id, dto, user.institutionId);
    return {
      success: true,
      data,
      message: 'Занятие успешно обновлено',
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Удалить занятие' })
  @ApiResponse({ status: 200, description: 'Занятие удалено' })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Занятие не найдено', schema: API_ERROR_RESPONSE_SCHEMA })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.scheduleService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Занятие удалено' };
  }
}
