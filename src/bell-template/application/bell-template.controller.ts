import {
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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExtraModels, getSchemaPath, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, ScheduleType } from '@prisma/client';
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
import { BellTemplateService } from './bell-template.service';
import { CreateBellTemplateDto } from './dto/create-bell-template.dto';
import { UpdateBellTemplateDto } from './dto/update-bell-template.dto';
import { BellTemplateResponseDto } from './dto/bell-template-response.dto';
import { BulkScopeBodyDto, BulkScopeDeleteBodyDto } from './dto/bulk-scope.dto';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO для query-параметров фильтрации списка шаблонов */
class BellTemplateQueryDto extends PaginationDto {
  @ApiPropertyOptional({ type: Number, description: 'ID группы (не передавать = все шаблоны)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID группы должен быть числом' })
  @Min(1, { message: 'ID группы должен быть больше 0' })
  groupId?: number;

  @ApiPropertyOptional({ enum: ScheduleType, description: 'Тип расписания: date или weekday' })
  @IsOptional()
  @IsEnum(ScheduleType, { message: 'Тип расписания может быть только "date" или "weekday"' })
  scheduleType?: ScheduleType;
}

@ApiTags('Bell Templates')
@ApiBearerAuth('JWT')
@ApiExtraModels(BellTemplateResponseDto, ResponseMetaDto)
@Controller('bell-template')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class BellTemplateController {
  constructor(private readonly bellTemplateService: BellTemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Создать шаблон звонков' })
  @ApiResponse({
    status: 201,
    description: 'Шаблон создан',
    schema: createSuccessResponseSchema(getSchemaPath(BellTemplateResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 409, description: 'Конфликт: шаблон с такими параметрами уже существует', schema: API_ERROR_RESPONSE_SCHEMA })
  async create(
    @Body() createBellTemplateDto: CreateBellTemplateDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<any>> {
    const data = await this.bellTemplateService.create(
      createBellTemplateDto,
      user.institutionId,
    );
    return {
      success: true,
      data,
      message: 'Шаблон звонков успешно создан',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Список шаблонов звонков учреждения с пагинацией и фильтрацией' })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(BellTemplateResponseDto), { withMeta: true, isArray: true }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findAll(
    @GetUser() user: IAccessToken,
    @Query() queryDto: BellTemplateQueryDto,
  ) {

    const result = await this.bellTemplateService.findByInstitutionId(
      user.institutionId,
      {
        groupId: queryDto.groupId,
        scheduleType: queryDto.scheduleType,
        page: queryDto.page,
        limit: queryDto.limit,
      },
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

  @Patch('bulk-scope')
  @ApiOperation({ summary: 'Массово изменить scope у строк шаблона (один запрос — одна транзакция)' })
  @ApiResponse({
    status: 200,
    description: 'Количество обновлённых строк',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'object', properties: { count: { type: 'number' } } },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 409, description: 'Конфликт уникальности после смены scope', schema: API_ERROR_RESPONSE_SCHEMA })
  async bulkUpdateScope(
    @Body() body: BulkScopeBodyDto,
    @GetUser() user: IAccessToken,
  ) {
    const result = await this.bellTemplateService.bulkUpdateScope(body, user.institutionId);
    return {
      success: true,
      data: { count: result.count },
      message: `Обновлено строк шаблона: ${result.count}`,
    };
  }

  @Delete('bulk-scope')
  @ApiOperation({ summary: 'Удалить весь шаблон по scope (все строки с данным scope)' })
  @ApiResponse({
    status: 200,
    description: 'Количество удалённых строк',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'object', properties: { count: { type: 'number' } } },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 409, description: 'Часть шаблонов используется в расписании', schema: API_ERROR_RESPONSE_SCHEMA })
  async bulkDeleteByScope(
    @Body() body: BulkScopeDeleteBodyDto,
    @GetUser() user: IAccessToken,
  ) {
    const result = await this.bellTemplateService.bulkDeleteByScope(body, user.institutionId);
    return {
      success: true,
      data: { count: result.count },
      message: `Удалено строк шаблона: ${result.count}`,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Шаблон звонков по id' })
  @ApiResponse({
    status: 200,
    description: 'Данные шаблона',
    schema: createSuccessResponseSchema(getSchemaPath(BellTemplateResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Шаблон не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.bellTemplateService.findById(id, user.institutionId);
    if (!data) throw new NotFoundException('Шаблон звонков не найден');
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить шаблон звонков' })
  @ApiResponse({
    status: 200,
    description: 'Шаблон обновлён',
    schema: createSuccessResponseSchema(getSchemaPath(BellTemplateResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Шаблон не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 409, description: 'Конфликт: шаблон с такими параметрами уже существует', schema: API_ERROR_RESPONSE_SCHEMA })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBellTemplateDto: UpdateBellTemplateDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.bellTemplateService.update(
      id,
      updateBellTemplateDto,
      user.institutionId,
    );
    return {
      success: true,
      data,
      message: 'Шаблон звонков успешно обновлён',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить шаблон звонков' })
  @ApiResponse({ status: 200, description: 'Шаблон удалён', schema: API_SUCCESS_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Шаблон не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 409, description: 'Конфликт: шаблон используется в расписании', schema: API_ERROR_RESPONSE_SCHEMA })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ) {
    await this.bellTemplateService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Шаблон звонков успешно удалён' };
  }
}
