import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpdateUserDto } from './dto/update-user.dto';
import { hash, genSalt, compare } from 'bcrypt';
import { User } from 'src/user/domain/entities/user.entity';
import type { ISearchUsersParams, IUserRepository, IUserWithProfiles } from 'src/user/domain/user-repository.interface';
import { ModeratorService } from 'src/moderator/application/moderator.service';
import { TeacherService } from 'src/teacher/application/teacher.service';
import { StudentService } from 'src/student/application/student.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ICreateUserParams,
  IFullUser,
  UserWithProfilesResponse,
} from 'src/user/application/interfaces/interfaces';
import { Role } from '@prisma/client';
import { ICreateModeratorParams } from 'src/moderator/application/interfaces/interfaces';
import { ICreateStudentParams } from 'src/student/application/interfaces/interfaces';
import { ICreateTeacherParams } from 'src/teacher/application/interfaces/interfaces';
import { IFindUserOptions } from 'src/common/interfaces/find-options.interface';
import { paginate } from 'src/common/utils/pagination.utils';

@Injectable()
export class UserService {
  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    private readonly moderatorService: ModeratorService,
    private readonly teacherService: TeacherService,
    private readonly studentService: StudentService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  private mapToResponse(user: User) {
    return user.toResponse();
  }
  async create(user: ICreateUserParams, institutionId: number) {
    const { password: plainPassword, email } = user;

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Пользователь с такой почтой уже существует');
    }

    this.validateRoles(user.roles);

    const saltRounds = Number(this.configService.get('SALT'));
    const salt = await genSalt(saltRounds);
    const hashedPassword = await hash(plainPassword, salt);

    const userDomain = User.create({
      ...user,
      institutionId,
      password: hashedPassword,
      isActivated: false,
    });

    return this.prisma.$transaction(async () => {
      const createdUser = await this.userRepository.create(userDomain);
      const userId = createdUser.id!;

      if (user.roles.includes(Role.MODERATOR)) {
        await this.moderatorService.create({
          userId,
          accessRights: user.moderatorData?.accessRights,
        });
      }
      if (user.roles.includes(Role.TEACHER)) {
        await this.teacherService.create({
          userId,
          mentoredGroupId: user.teacherData?.mentoredGroupId,
        });
      }
      if (user.roles.includes(Role.STUDENT)) {
        await this.studentService.create({
          userId,
          groupId: user.studentData?.groupId,
        });
      }

      return this.mapToResponse(createdUser);
    });
  }

  async findByEmail(email: string, institutionId?: number) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return null;
    }

    if (institutionId !== undefined && user.institutionId !== institutionId) {
      return null;
    }

    return this.mapToResponse(user);
  }

  async findInternalByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  async findAll() {
    const users = await this.userRepository.findAll();
    return users.map(this.mapToResponse);
  }

  async findById(id: number, institutionId?: number, options?: IFindUserOptions) {
    const result = await this.userRepository.findById(id, options);
    if (!result) return null;
    if (institutionId !== undefined && result.user.institutionId !== institutionId) return null;
    return this.mapToResponseWithProfiles(result);
  }

  async findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
    sort?: string,
    order?: 'asc' | 'desc',
  ) {
    const { users, total } = await this.userRepository.findByInstitutionId(
      institutionId,
      page,
      limit,
      undefined,
      sort,
      order ?? 'asc',
    );
    const data = users.map((item) => this.mapToResponse(item.user));
    return paginate(data, total, page, limit);
  }

  async findByIdWithRoleData(
    userId: number,
    institutionId?: number,
  ): Promise<IFullUser> {
    const data = await this.findById(userId, institutionId);  // UserWithProfilesResponse | null

    if (!data) {
      throw new NotFoundException('Пользователь не найден');
    }

    const result: IFullUser = {
      user: {
        id: data.id,
        institutionId: data.institutionId,
        name: data.name,
        surname: data.surname,
        patronymic: data.patronymic,
        email: data.email,
        roles: data.roles,
        isActivated: data.isActivated,
      },
    };

    if (data.roles.includes(Role.MODERATOR)) {
      result.moderator = await this.moderatorService.findByUserId(userId);
    }
    if (data.roles.includes(Role.TEACHER)) {
      const teacher = await this.teacherService.findByUserId(userId);
      result.teacher = teacher
        ? { userId: teacher.userId, mentoredGroupId: teacher.toResponse().mentoredGroupId }
        : null;
    }
    if (data.roles.includes(Role.STUDENT)) {
      result.student = await this.studentService.findByUserId(userId);
    }

    return result;
  }

  async search(searchParams: ISearchUsersParams) {
    const { users, total } = await this.userRepository.search(searchParams);
    const data = users.map((item) => this.mapToResponseWithProfiles(item));
    return paginate(data, total, searchParams.page, searchParams.limit);
  }

  /**
   * Смена пароля текущим пользователем. Проверяет текущий пароль, хеширует новый и сохраняет.
   */
  async updatePassword(
    userId: number,
    institutionId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const result = await this.userRepository.findById(userId);
    if (!result) throw new NotFoundException('Пользователь не найден');
    if (result.user.institutionId !== institutionId) {
      throw new ForbiddenException('Нет доступа к пользователю из другого учреждения');
    }
    const isMatch = await compare(currentPassword, result.user.password);
    if (!isMatch) throw new BadRequestException('Неверный текущий пароль');
    const saltRounds = Number(this.configService.get('SALT'));
    const salt = await genSalt(saltRounds);
    const hashedPassword = await hash(newPassword, salt);
    await this.userRepository.update(userId, { password: hashedPassword });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    institutionId?: number,
  ) {
    const result = await this.userRepository.findById(id);
    if (!result) {
      throw new NotFoundException('Пользователь не найден');
    }
    const existingUser = result.user;

    if (
      institutionId !== undefined &&
      existingUser.institutionId !== institutionId
    ) {
      throw new ForbiddenException(
        'Нет доступа к обновлению пользователя из другого учреждения',
      );
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(
        updateUserDto.email,
      );
      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictException(
          'Пользователь с таким email уже существует',
        );
      }
    }

    const updatedUser = await this.userRepository.update(id, updateUserDto);
    return updatedUser.toResponse();
  }

  async remove(id: number, institutionId?: number) {
    const result = await this.userRepository.findById(id);
    if (!result) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (
      institutionId !== undefined &&
      result.user.institutionId !== institutionId
    ) {
      throw new ForbiddenException(
        'Нет доступа к пользователю из другого учреждения',
      );
    }
    await this.userRepository.remove(id);
  }

  /**
   * Не используются в текущем API. Оставлены для будущих эндпоинтов
   * (например, PATCH /users/:id/roles). При подключении к API добавить
   * проверку учреждения по аналогии с update/remove.
   */
  async addRoles(
    userId: number,
    role: Role,
    roleData?: {
      moderatorData?: ICreateModeratorParams;
      teacherData?: ICreateTeacherParams;
      studentData?: ICreateStudentParams;
    },
  ) {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.roles.includes(role)) {
      throw new BadRequestException('Пользователь уже имеет данную роль');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRoles = [...user.roles, role];
      const updatedUser = await this.userRepository.update(userId, {
        roles: updatedRoles,
      });

      if (role === Role.MODERATOR) {
        await tx.moderator.create({
          data: {
            userId: userId,
            accessRights: roleData?.moderatorData?.accessRights || {},
          },
        });
      } else if (role === Role.TEACHER) {
        await tx.teacher.create({
          data: {
            userId: userId,
            mentoredGroupId: roleData?.teacherData?.mentoredGroupId || null,
          },
        });
      } else if (role === Role.STUDENT) {
        await tx.student.create({
          data: {
            userId: userId,
            groupId: roleData?.studentData?.groupId || null,
          },
        });
      }

      return updatedUser.toResponse();
    });
  }

  /** См. комментарий над addRoles. */
  async removeRole(userId: number, role: Role): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!user.roles.includes(role)) {
      throw new BadRequestException(`Пользователь не имеет роли ${role}`);
    }

    if (user.roles.length === 1) {
      throw new BadRequestException('Нельзя удалить последнюю роль');
    }

    return this.prisma.$transaction(async (tx) => {
      if (role === Role.MODERATOR) {
        await tx.moderator.delete({ where: { userId } }).catch(() => { });
      } else if (role === Role.TEACHER) {
        await tx.teacher.delete({ where: { userId } }).catch(() => { });
      } else if (role === Role.STUDENT) {
        await tx.student.delete({ where: { userId } }).catch(() => { });
      }

      const updatedRoles = user.roles.filter((r) => r !== role);
      return this.userRepository.update(userId, {
        roles: updatedRoles,
      });
    });
  }

  private validateRoles(roles: Role[]): void {
    if (roles.length === 0) {
      throw new BadRequestException(
        'У пользователя должна быть хотя бы одна роль',
      );
    }

    for (const [conflictRole1, conflictRole2] of this.roleConflicts) {
      if (roles.includes(conflictRole1) && roles.includes(conflictRole2)) {
        throw new BadRequestException(
          `Пользователь не может иметь роли ${conflictRole1} и ${conflictRole2} одновременно`,
        );
      }
    }
  }

  private readonly roleConflicts: [Role, Role][] = [
    [Role.ADMIN, Role.MODERATOR],
    [Role.ADMIN, Role.STUDENT],
    [Role.MODERATOR, Role.STUDENT],
    [Role.TEACHER, Role.STUDENT],
  ];

  private mapToResponseWithProfiles(data: IUserWithProfiles): UserWithProfilesResponse {
    const user = data.user.toResponse();
    const result: UserWithProfilesResponse = { ...user };
    if (data.student) result.student = data.student.toResponse(false);
    if (data.teacher) result.teacher = data.teacher.toResponse(false);
    if (data.moderator) result.moderator = data.moderator.toResponse(false);
    return result;
  }
}
