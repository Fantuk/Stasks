import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ITokenRepository } from 'src/token/domain/token-repository.interface';
import { RefreshToken } from 'src/token/domain/entities/token.entity';
import dayjs, { ManipulateType } from 'dayjs';

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    @Inject('TokenRepository')
    private readonly tokenRepository: ITokenRepository,
  ) {}

  async createRefreshToken(userId: number): Promise<RefreshToken> {
    const expiresValue = Number(
      this.configService.get('REFRESH_TOKEN_EXPIRES_VALUE'),
    );
    const expiresUnit = this.configService.get<ManipulateType>(
      'REFRESH_TOKEN_EXPIRES_UNIT',
    );

    if (!expiresValue || !expiresUnit) {
      throw new Error(
        'REFRESH_TOKEN_EXPIRES_VALUE or REFRESH_TOKEN_EXPIRES_UNIT is not defined',
      );
    }

    const expiresIn = this.calculateExpirationDate(expiresValue, expiresUnit);

    const token = RefreshToken.create(userId, expiresIn);
    return this.tokenRepository.createToken(token);
  }

  async validateRefreshToken(tokenString: string): Promise<RefreshToken> {
    const token = await this.tokenRepository.findToken(tokenString);

    if (!token) {
      throw new UnauthorizedException('Неверный токен');
    }

    if (token.isExpired()) {
      await this.tokenRepository.deleteToken(tokenString);
      throw new UnauthorizedException('Токен истек');
    }

    return token;
  }

  async rotateRefreshToken(oldTokenString: string): Promise<RefreshToken> {
    const oldToken = await this.tokenRepository.findToken(oldTokenString);
    if (!oldToken) {
      throw new UnauthorizedException('Неверный токен');
    }
    await this.tokenRepository.deleteToken(oldTokenString);
    return this.createRefreshToken(oldToken.userId);
  }

  async removeToken(token: string): Promise<void> {
    await this.tokenRepository.deleteToken(token);
  }

  private calculateExpirationDate(
    expiresValue: number,
    expiresUnit: ManipulateType,
  ): Date {
    return dayjs().add(expiresValue, expiresUnit).toDate();
  }
}
