import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ITokenRepository } from 'src/token/domain/token-repository.interface';
import { RefreshToken } from 'src/token/domain/entities/token.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class TokenRepository implements ITokenRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private mapToDomain(raw: Prisma.TokenGetPayload<{}>): RefreshToken {
    return RefreshToken.fromPersistence({
      id: raw.id,
      userId: raw.userId,
      token: raw.token,
      expires: raw.expires,
    });
  }

  async createToken(token: RefreshToken): Promise<RefreshToken> {
    try {
      const data = token.toPersistence();
      const savedToken = await this.prismaService.token.create({
        data,
      });

      return this.mapToDomain(savedToken);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Такой токен уже существует');
        }
      }
      throw new InternalServerErrorException(
        'Произошла ошибка во время создания токена',
      );
    }
  }

  async findToken(token: string): Promise<RefreshToken | null> {
    const rawToken = await this.prismaService.token.findUnique({
      where: { token },
    });
    return rawToken ? this.mapToDomain(rawToken) : null;
  }

  async deleteToken(token: string): Promise<void> {
    try {
      await this.prismaService.token.delete({
        where: { token },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return;
        }
      }
      throw error;
    }
  }
}
