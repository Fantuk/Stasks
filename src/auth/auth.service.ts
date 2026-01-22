import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UserService } from 'src/user/application/user.service';
import { LoginDto } from './dto/login.dto';
import { compareSync } from 'bcrypt';
import { AuthTokensService } from 'src/token/application/services/auth-tokens.service';
import { ITokens } from 'src/token/application/interfaces/interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly authTokenService: AuthTokensService,
  ) {}

  async register(registerDto: RegisterDto, adminInstitutionId: number) {
    try {
      return this.userService.create(registerDto, adminInstitutionId);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Ошибка при регистрации пользователя',
      );
    }
  }

  async login(loginDto: LoginDto): Promise<ITokens> {
    const { email, password } = loginDto;

    const user = await this.userService.findInternalByEmail(email);

    const dummyHash = '$2b$10$dummyhashfordummycomparisonpurposes';
    const hashToCompare = user?.password || dummyHash;

    const isPasswordValid = await this.validatePassword(
      password,
      hashToCompare,
    );

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    return this.authTokenService.generateTokens(user);
  }

  async logout(refreshToken: string) {
    if (
      !refreshToken ||
      typeof refreshToken !== 'string' ||
      refreshToken.trim() === ''
    ) {
      return;
    }
    return this.authTokenService.removeRefreshToken(refreshToken);
  }

  private validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): boolean {
    return compareSync(plainPassword, hashedPassword);
  }
}
