import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';
import { ApiSuccessResponse } from 'src/common/interfaces/api-responce.interface';
import { UserResponse } from 'src/user/application/interfaces/interfaces';
import { SearchUsersDto } from 'src/user/application/dto/search-users.dto';
import { ModeratorPermissions } from 'src/common/decorators/moderator-permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<UserResponse>> {
    const adminInstitutionId = user.institutionId;
    const createdUser = await this.userService.create(createUserDto, adminInstitutionId);
    return {
      success: true,
      data: createdUser,
      message: 'Пользователь успешно создан',
    };
  }

  @Get('search')
  async findByEmail(
    @Query() searchDto: SearchUsersDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<UserResponse[]>> {
    const roles: Role[] | undefined = searchDto.roles ? [searchDto.roles] : undefined;

    const foundedUsers = await this.userService.search({
      institutionId: user.institutionId,
      query: searchDto.query,
      roles,
      page: searchDto.page,
      limit: searchDto.limit,
    })

    return {
      success: true,
      data: foundedUsers.data,
      meta: {
        page: foundedUsers.page,
        limit: foundedUsers.limit,
        total: foundedUsers.total,
        totalPages: foundedUsers.totalPages,
      },
    };
  }

  @Get()
  async findAll(
    @GetUser() user: IAccessToken,
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiSuccessResponse<UserResponse[]>> {
    const users = await this.userService.findByInstitutionId(
      user.institutionId,
      paginationDto.page,
      paginationDto.limit,
    );
    return {
      success: true,
      data: users.data,
      meta: {
        page: users.page,
        limit: users.limit,
        total: users.total,
        totalPages: users.totalPages,
      },
    };
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<UserResponse>> {
    const foundedUser = await this.userService.findById(id, user.institutionId);
    if (!foundedUser) {
      throw new NotFoundException('Пользователь не найден')
    }
    return {
      success: true,
      data: foundedUser,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: IAccessToken,
  ): Promise<ApiSuccessResponse<UserResponse>> {
    const updatedUser = await this.userService.update(id, updateUserDto, user.institutionId);

    return {
      success: true,
      data: updatedUser,
      message: "Пользователь успешно обновлен"
    }
  }

  @Delete(':id')
  @ModeratorPermissions('canDeleteUsers')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ApiSuccessResponse<null>> {
    await this.userService.remove(id);
    return { success: true, data: null, message: 'Пользователь успешно удален' };
  }
}
