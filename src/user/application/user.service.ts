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
import { hash, genSalt } from 'bcrypt';
import { User } from 'src/user/domain/entities/user.entity';
import type { ISearchUsersParams, IUserRepository } from 'src/user/domain/user-repository.interface';
import { ModeratorService } from 'src/moderator/application/moderator.service';
import { TeacherService } from 'src/teacher/application/teacher.service';
import { StudentService } from 'src/student/application/student.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ICreateUserParams,
  IFullUser,
} from 'src/user/application/interfaces/interfaces';
import { Role } from '@prisma/client';
import { ICreateModeratorParams } from 'src/moderator/application/interfaces/interfaces';
import { ICreateStudentParams } from 'src/student/application/interfaces/interfaces';
import { ICreateTeacherParams } from 'src/teacher/application/interfaces/interfaces';

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

      try {
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
      } catch (error) {
        throw error;
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

  async findById(id: number, institutionId?: number) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      return null;
    }

    if (institutionId !== undefined && user.institutionId !== institutionId) {
      return null;
    }

    return this.mapToResponse(user);
  }

  async findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
  ) {
    const { users, total } = await this.userRepository.findByInstitutionId(
      institutionId,
      page,
      limit,
    );

    const currentPage = page || 1;
    const pageLimit = limit || 10;
    const totalPages = Math.ceil(total / pageLimit);

    return {
      data: users.map(this.mapToResponse),
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages,
    };
  }

  async findByIdWithRoleData(
    userId: number,
    institutionId?: number,
  ): Promise<IFullUser> {
    const user = await this.findById(userId, institutionId);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const result: IFullUser = { user };

    if (user.roles.includes(Role.MODERATOR)) {
      result.moderator = await this.moderatorService.findByUserId(userId);
    }

    if (user.roles.includes(Role.TEACHER)) {
      const teacher = await this.teacherService.findByUserId(userId);
      result.teacher = teacher
        ? {
          userId: teacher.userId,
          mentoredGroupId: teacher.toResponse().mentoredGroupId,
        }
        : null;
    }

    if (user.roles.includes(Role.STUDENT)) {
      result.student = await this.studentService.findByUserId(userId);
    }

    return result;
  }

  async search(searchParams: ISearchUsersParams) {
    const { users, total } = await this.userRepository.search(searchParams)

    const currentPage = searchParams.page || 1
    const pageLimit = searchParams.limit || 10
    const totalPages = Math.ceil(total / pageLimit)

    return {
      data: users.map(this.mapToResponse),
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages,
    };
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    institutionId?: number,
  ) {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Пользователь не найден');
    }

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

  async remove(id: number) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    await this.userRepository.remove(id);
  }

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

  async removeRole(userId: number, role: Role): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!user.roles.includes(role)) {
      throw new BadRequestException(`Пользователь не имеет роли ${role}`);
    }

    // Нельзя удалить последнюю роль
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

      // Обновляем роли пользователя
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
    [Role.MODERATOR, Role.TEACHER],
    [Role.MODERATOR, Role.STUDENT],
    [Role.TEACHER, Role.STUDENT],
  ];
}
