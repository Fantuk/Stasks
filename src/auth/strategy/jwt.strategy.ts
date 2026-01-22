import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from 'src/token/application/interfaces/interfaces';
import { UserService } from 'src/user/application/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is missing');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: IJwtPayload) {
    if (!payload.userId) {
      throw new UnauthorizedException();
    }
    const user = await this.userService.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return {
      userId: payload.userId,
      institutionId: payload.institutionId,
      name: payload.name,
      surname: payload.surname,
      patronymic: payload.patronymic,
      email: payload.email,
      roles: payload.roles,
      isActivated: payload.isActivated,
    };
  }
}
