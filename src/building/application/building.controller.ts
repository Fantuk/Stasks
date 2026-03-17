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
  ApiSuccessResponse,
  API_SUCCESS_RESPONSE_SCHEMA,
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { ResponseMetaDto } from 'src/common/interfaces/api-response.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { SearchQueryDto } from 'src/common/dto/search-query.dto';
import { parseBuildingIncludeOption } from 'src/common/utils/query.utils';
import { paginatedSuccess } from 'src/common/utils/response.utils';
import { BuildingService } from 'src/building/application/building.service';
import { CreateBuildingDto } from 'src/building/application/dto/create-building.dto';
import { UpdateBuildingDto } from 'src/building/application/dto/update-building.dto';
import { BuildingResponseDto } from 'src/building/application/dto/building-response.dto';

@ApiTags('Buildings')
@ApiBearerAuth('JWT')
@ApiExtraModels(BuildingResponseDto, ResponseMetaDto)
@Controller('building')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class BuildingController {
  /** Специфичные пути (search и т.д.) должны быть объявлены выше Get(':id'). */
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать здание' })
  @ApiResponse({
    status: 201,
    description: 'Здание создано',
    schema: createSuccessResponseSchema(getSchemaPath(BuildingResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async create(
    @Body() createBuildingDto: CreateBuildingDto,
    @GetUser() user: IAccessToken,
  ): Promise<
    ApiSuccessResponse<{
      id: number | null;
      institutionId: number;
      name: string;
    }>
  > {
    const data = await this.buildingService.create(createBuildingDto, user.institutionId);
    return {
      success: true,
      data,
      message: 'Здание успешно создано',
    };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Поиск зданий с пагинацией',
    description: 'Поиск по строке query. Для полного списка используйте GET /building.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(BuildingResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async search(@Query() searchDto: SearchQueryDto, @GetUser() user: IAccessToken) {
    const result = await this.buildingService.search({
      institutionId: user.institutionId,
      query: searchDto.query,
      page: searchDto.page,
      limit: searchDto.limit,
    });
    return paginatedSuccess(result);
  }

  @Get()
  @ApiOperation({
    summary: 'Список зданий учреждения с пагинацией',
    description: 'Полный список зданий. Для поиска по названию используйте GET /building/search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(BuildingResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findAll(@GetUser() user: IAccessToken, @Query() paginationDto: PaginationDto) {
    const result = await this.buildingService.findByInstitutionId(
      user.institutionId,
      paginationDto.page,
      paginationDto.limit,
    );
    return paginatedSuccess(result);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Здание по id',
    description:
      'Параметр include: floors — вложенные этажи; floors.classrooms — дерево здание → этажи → аудитории. См. docs/api-includes.md.',
  })
  @ApiResponse({
    status: 200,
    description: 'Данные здания',
    schema: createSuccessResponseSchema(getSchemaPath(BuildingResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Здание не найдено', schema: API_ERROR_RESPONSE_SCHEMA })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
    @Query('include') include?: string,
  ) {
    const options = parseBuildingIncludeOption(include);
    const data = await this.buildingService.findById(id, user.institutionId, options);
    if (!data) throw new NotFoundException('Здание не найдено');
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить здание' })
  @ApiResponse({
    status: 200,
    description: 'Здание обновлено',
    schema: createSuccessResponseSchema(getSchemaPath(BuildingResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Здание не найдено', schema: API_ERROR_RESPONSE_SCHEMA })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBuildingDto: UpdateBuildingDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.buildingService.update(id, updateBuildingDto, user.institutionId);
    return {
      success: true,
      data,
      message: 'Здание успешно обновлено',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить здание' })
  @ApiResponse({ status: 200, description: 'Здание удалено', schema: API_SUCCESS_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Здание не найдено', schema: API_ERROR_RESPONSE_SCHEMA })
  async remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: IAccessToken) {
    await this.buildingService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Здание успешно удалено' };
  }
}
