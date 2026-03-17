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
  API_SUCCESS_RESPONSE_SCHEMA,
  API_ERROR_RESPONSE_SCHEMA,
  createSuccessResponseSchema,
} from 'src/common/interfaces/api-response.interface';
import { ResponseMetaDto } from 'src/common/interfaces/api-response.interface';
import { parseFloorIncludeOption } from 'src/common/utils/query.utils';
import { paginatedSuccess } from 'src/common/utils/response.utils';
import { FloorService } from 'src/floor/application/floor.service';
import { CreateFloorDto } from 'src/floor/application/dto/create-floor.dto';
import { FloorSearchQueryDto } from 'src/floor/application/dto/floor-search-query.dto';
import { GetFloorsQueryDto } from 'src/floor/application/dto/get-floors-query.dto';
import { UpdateFloorDto } from 'src/floor/application/dto/update-floor.dto';
import { FloorResponseDto } from 'src/floor/application/dto/floor-response.dto';

@ApiTags('Floors')
@ApiBearerAuth('JWT')
@ApiExtraModels(FloorResponseDto, ResponseMetaDto)
@Controller('floor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class FloorController {
  /** Специфичные пути (search и т.д.) должны быть объявлены выше Get(':id'). */
  constructor(private readonly floorService: FloorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать этаж' })
  @ApiResponse({
    status: 201,
    description: 'Этаж создан',
    schema: createSuccessResponseSchema(getSchemaPath(FloorResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async create(@Body() createFloorDto: CreateFloorDto, @GetUser() user: IAccessToken) {
    const data = await this.floorService.create(createFloorDto, user.institutionId);
    return {
      success: true,
      data,
      message: 'Этаж успешно создан',
    };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Поиск этажей с пагинацией',
    description: 'Поиск по строке. Список по зданию: GET /floor?buildingId=...',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(FloorResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async search(@Query() query: FloorSearchQueryDto, @GetUser() user: IAccessToken) {
    const result = await this.floorService.search({
      institutionId: user.institutionId,
      buildingId: query.buildingId,
      number: query.number,
      page: query.page,
      limit: query.limit,
    });
    return paginatedSuccess(result);
  }

  @Get()
  @ApiOperation({
    summary: 'Список этажей здания с пагинацией',
    description: 'Список по buildingId (обязателен). Для поиска используйте GET /floor/search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список и meta',
    schema: createSuccessResponseSchema(getSchemaPath(FloorResponseDto), {
      withMeta: true,
      isArray: true,
    }),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  async findAll(@Query() query: GetFloorsQueryDto, @GetUser() user: IAccessToken) {
    const result = await this.floorService.findByBuildingId(
      query.buildingId,
      user.institutionId,
      query.page,
      query.limit,
    );
    return paginatedSuccess(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Этаж по id' })
  @ApiResponse({
    status: 200,
    description: 'Данные этажа',
    schema: createSuccessResponseSchema(getSchemaPath(FloorResponseDto)),
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Этаж не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
    @Query('include') include?: string,
  ) {
    const options = parseFloorIncludeOption(include);
    const data = await this.floorService.findById(id, user.institutionId, options);
    if (!data) throw new NotFoundException('Этаж не найден');
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить этаж' })
  @ApiResponse({
    status: 200,
    description: 'Этаж обновлён',
    schema: createSuccessResponseSchema(getSchemaPath(FloorResponseDto)),
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Этаж не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFloorDto: UpdateFloorDto,
    @GetUser() user: IAccessToken,
  ) {
    const data = await this.floorService.update(id, updateFloorDto, user.institutionId);
    return {
      success: true,
      data,
      message: 'Этаж успешно обновлён',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить этаж' })
  @ApiResponse({ status: 200, description: 'Этаж удалён', schema: API_SUCCESS_RESPONSE_SCHEMA })
  @ApiResponse({ status: 403, description: 'Доступ запрещён', schema: API_ERROR_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Этаж не найден', schema: API_ERROR_RESPONSE_SCHEMA })
  async remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: IAccessToken) {
    await this.floorService.remove(id, user.institutionId);
    return { success: true, data: null, message: 'Этаж успешно удалён' };
  }
}
