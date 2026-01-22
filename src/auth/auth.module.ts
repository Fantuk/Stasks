import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/application/user.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtModuleAsyncOptions } from 'src/configs/jwt-module.config';
import { JwtStrategy } from './strategy/jwt.strategy';
import { TokenModule } from 'src/token/application/token.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    UserModule,
    JwtModule.registerAsync(jwtModuleAsyncOptions()),
    PassportModule,
    TokenModule,
  ],
})
export class AuthModule {}
