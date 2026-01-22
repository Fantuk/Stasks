import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from 'src/user/domain/entities/user.entity';
import { ISearchUsersParams, IUserRepository } from 'src/user/domain/user-repository.interface';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) { }
  private readonly userSelect = {
    id: true,
    institutionId: true,
    name: true,
    surname: true,
    patronymic: true,
    email: true,
    password: true,
    roles: true,
    isActivated: true,
  } as const;

  private mapToDomain(raw: Prisma.UserGetPayload<{}>): User {
    return User.fromPersistence({
      id: raw.id,
      institutionId: raw.institutionId,
      name: raw.name,
      surname: raw.surname,
      patronymic: raw.patronymic,
      email: raw.email,
      password: raw.password,
      roles: raw.roles,
      isActivated: raw.isActivated,
    });
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    try {
      const user = User.create(data);

      const savedUser = await this.prisma.user.create({
        data: user.toPersistence(),
        select: this.userSelect,
      });

      return this.mapToDomain(savedUser);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Пользователь с таким id уже существует',
          );
        }
      }
      throw new InternalServerErrorException(
        'Произошла ошибка во время создания пользователя',
      );
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const rawUser = await this.prisma.user.findUnique({
      where: { email },
      select: this.userSelect,
    });

    return rawUser ? this.mapToDomain(rawUser) : null;
  }

  async findById(id: number): Promise<User | null> {
    const rawUser = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    return rawUser ? this.mapToDomain(rawUser) : null;
  }

  async findByInstitutionId(
    institutionId: number,
    page?: number,
    limit?: number,
  ): Promise<{ users: User[]; total: number }> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    const total = await this.prisma.user.count({
      where: { institutionId },
    });

    const rawUsers = await this.prisma.user.findMany({
      where: { institutionId },
      select: this.userSelect,
      skip,
      take,
      orderBy: { id: 'asc' },
    });

    return {
      users: rawUsers.map(this.mapToDomain),
      total,
    };
  }

  async findAll(): Promise<User[]> {
    const rawUsers = await this.prisma.user.findMany({
      select: this.userSelect,
    });

    return rawUsers.map(this.mapToDomain);
  }

  async search(params: ISearchUsersParams): Promise<{ users: User[]; total: number; }> {
    const { institutionId, query, roles, page, limit } = params

    const where: Prisma.UserWhereInput = {
      institutionId
    }

    if (query && query.trim() !== '') {
      const searchQuery = query.trim()
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { surname: { contains: searchQuery, mode: 'insensitive' } },
        { patronymic: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ]
    }

    if (roles && roles.length > 0 && !roles.includes(Role.ADMIN)) {
      where.roles = {
        hasSome: roles
      }
    } else throw new BadRequestException("Не правильная роль")

    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    const total = await this.prisma.user.count({
      where
    })

    const rawUsers = await this.prisma.user.findMany({
      where,
      select: this.userSelect,
      skip,
      take,
      orderBy: { id: 'asc' },
    })

    return {
      users: rawUsers.map(this.mapToDomain),
      total,
    }
  }

  async update(id: number, data: Partial<Omit<User, 'id'>>): Promise<User> {
    const updateData: Prisma.UserUpdateInput =
      data instanceof User
        ? data.toPersistence()
        : (data as Prisma.UserUpdateInput);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.userSelect,
    });

    return this.mapToDomain(updatedUser);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
