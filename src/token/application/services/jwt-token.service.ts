import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IAccessToken, IJwtPayload } from '../interfaces/interfaces';

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateAccessToken(payload: IAccessToken): string {
    return this.jwtService.sign(payload);
  }

  verifyAccessToken(token: string): IJwtPayload {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Неверный токен');
    }
  }
}
