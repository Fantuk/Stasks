import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import { FastifyReply } from 'fastify';
import { Observable, map } from 'rxjs';

export const REFRESH_TOKEN = 'refreshToken';

@Injectable()
export class RefreshTokenCookieInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data?.refreshToken) {
          const response = context.switchToHttp().getResponse<FastifyReply>();
          const { token, expires } = data.refreshToken;

          const cookieExpires = dayjs(expires).toDate();

          response.setCookie(REFRESH_TOKEN, token, {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
            expires: cookieExpires,
          });

          const { refreshToken, ...rest } = data;

          return rest;
        }

        return data;
      }),
    );
  }
}
