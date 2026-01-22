import { RefreshToken } from './entities/token.entity';

export interface ITokenRepository {
  createToken(token: RefreshToken): Promise<RefreshToken>;
  findToken(token: string): Promise<RefreshToken | null>;
  deleteToken(token: string): Promise<void>;
}
