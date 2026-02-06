import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { JwtTokenService } from './jwt-token.service';
import { UserService } from 'src/user/application/user.service';
import { User } from 'src/user/domain/entities/user.entity';
import { ITokens } from 'src/token/application/interfaces/interfaces';
import type { IUserRepository } from 'src/user/domain/user-repository.interface';
import { UserResponse } from 'src/user/application/interfaces/interfaces';

@Injectable()
export class AuthTokensService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly userService: UserService,
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async generateTokens(user: UserResponse): Promise<ITokens> {
    const accessToken = this.generateAccessTokenForUser(user);

    if (!user.id) {
      throw new BadRequestException('Id отсутствует');
    }

    const refreshToken = await this.tokenService.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshTokenString: string): Promise<ITokens> {
    const oldToken =
      await this.tokenService.validateRefreshToken(refreshTokenString);

    const result = await this.userRepository.findById(oldToken.userId);

    if (!result) {
      await this.tokenService.removeToken(refreshTokenString);
      throw new NotFoundException('Пользователь не найден');
    }

    if (!result.user.id) {
      throw new BadRequestException('Id отсутствует');
    }

    const patronymic = result.user.patronymic ?? null;

    const newRefreshToken =
      await this.tokenService.rotateRefreshToken(refreshTokenString);

    const accessToken = this.generateAccessTokenForUser({
      ...result.user.toResponse(),
      patronymic,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async removeRefreshToken(refreshToken: string) {
    return this.tokenService.removeToken(refreshToken);
  }

  private generateAccessTokenForUser(user: UserResponse): string {
    return this.jwtTokenService.generateAccessToken({
      userId: user.id,
      institutionId: user.institutionId,
      name: user.name,
      surname: user.surname,
      patronymic: user.patronymic,
      email: user.email,
      roles: user.roles,
      isActivated: user.isActivated,
    });
  }
}
