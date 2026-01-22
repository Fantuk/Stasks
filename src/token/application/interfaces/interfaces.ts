import { Role } from '@prisma/client';
import { RefreshToken } from 'src/token/domain/entities/token.entity';

export interface IAccessToken {
  userId: number | null;
  institutionId: number;
  name: string;
  surname: string;
  patronymic?: string | null;
  email: string;
  roles: Role[];
  isActivated?: boolean;
}

export interface IJwtPayload extends IAccessToken {}

export interface ITokens {
  accessToken: string;
  refreshToken: RefreshToken;
}
