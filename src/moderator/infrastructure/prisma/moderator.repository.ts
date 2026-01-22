import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  IModeratorAccessRights,
  Moderator,
} from 'src/moderator/domain/entities/moderator.entity';
import { FindModeratorOptions, IModeratorRepository } from 'src/moderator/domain/moderator-repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class ModeratorRepository implements IModeratorRepository {
  constructor(private readonly prisma: PrismaService) { }

  private mapToDomain(raw: Prisma.ModeratorGetPayload<{ include?: { user: true } }>, includeUser?: boolean): Moderator {
    const moderator = Moderator.fromPersistence({
      id: raw.id,
      userId: raw.userId,
      accessRights: raw.accessRights as IModeratorAccessRights | null,
    });

    if (includeUser && 'user' in raw && raw.user) {
      moderator.setUserData(raw.user as Prisma.UserGetPayload<{}>);
    }

    return moderator;
  }

  async create(moderator: Moderator): Promise<Moderator> {
    try {
      const data = moderator.toPersistence();
      const savedModerator = await this.prisma.moderator.create({
        data,
      });
      return this.mapToDomain(savedModerator);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Пользователь с таким id уже существует');
        }
      }
      throw new InternalServerErrorException(
        'Произошла ошибка во время создания модератора',
      );
    }
  }

  async findByUserId(userId: number, options?: FindModeratorOptions): Promise<Moderator | null> {
    const include = options?.includeUser ? { user: true } : undefined;
    const rawModerator = await this.prisma.moderator.findUnique({
      where: { userId },
      include,
    });

    if (!rawModerator) {
      return null;
    }

    return this.mapToDomain(rawModerator, options?.includeUser);
  }

  async update(userId: number, moderator: Moderator): Promise<Moderator> {
    try {
      const data = moderator.toPersistence();
      const updatedModerator = await this.prisma.moderator.update({
        where: { userId },
        data,
      });
      return this.mapToDomain(updatedModerator);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Модератор с userId ${userId} не найден`);
        }
      }
      throw new InternalServerErrorException(
        'Произошла ошибка во время обновления модератора',
      );
    }
  }

  async remove(userId: number): Promise<void> {
    try {
      await this.prisma.moderator.delete({ where: { userId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Модератор с userId ${userId} не найден`);
        }
      }
      throw new InternalServerErrorException(
        'Произошла ошибка во время удаления модератора',
      );
    }
  }
}
