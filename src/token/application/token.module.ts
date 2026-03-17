import { Module } from '@nestjs/common';
import { AuthTokensService } from './services/auth-tokens.service';
import { TokenService } from './services/token.service';
import { JwtTokenService } from './services/jwt-token.service';
import { TokenController } from './token.controller';
import { UserModule } from 'src/user/application/user.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { jwtModuleAsyncOptions } from 'src/configs/jwt-module.config';
import { TokenRepository } from '../infrastructure/prisma/token.repository';

@Module({
  controllers: [TokenController],
  providers: [
    TokenService,
    {
      provide: 'TokenRepository',
      useClass: TokenRepository,
    },
    JwtTokenService,
    AuthTokensService,
  ],
  exports: [TokenService, JwtTokenService, AuthTokensService],
  imports: [UserModule, ConfigModule, JwtModule.registerAsync(jwtModuleAsyncOptions())],
})
export class TokenModule {}
