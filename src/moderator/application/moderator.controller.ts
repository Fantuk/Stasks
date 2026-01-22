import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ModeratorService } from './moderator.service';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { IModeratorAccessRights, IModeratorResponse } from 'src/moderator/domain/entities/moderator.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { ApiSuccessResponse } from 'src/common/interfaces/api-responce.interface';

@Controller('moderator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModeratorController {
  constructor(private readonly moderatorService: ModeratorService) { }

  @Get(':userId')
  @Roles(Role.ADMIN, Role.MODERATOR)
  async findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user: IAccessToken,
    @Query('includeUser', new ParseBoolPipe({ optional: true })) includeUser?: boolean,
  ): Promise<ApiSuccessResponse<IModeratorResponse>> {
    const moderator = await this.moderatorService.findByUserId(
      userId,
      user.institutionId,
      includeUser ?? false,
    );

    if (!moderator) {
      throw new NotFoundException('Модератор не найден по id ' + userId);
    }

    return {
      success: true,
      data: moderator.toResponse(includeUser ?? false),
      message: 'Модератор успешно найден',
    };
  }

  @Patch(':userId')
  @Roles(Role.ADMIN)
  async updateAccessRights(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: Partial<IModeratorAccessRights>,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<IModeratorResponse>> {
    const moderator = await this.moderatorService.updateAccessRights(
      userId,
      dto,
      user.institutionId,
    );
    return {
      success: true,
      data: moderator.toResponse(),
      message: 'Права доступа модератора успешно обновлены',
    };
  }
}
