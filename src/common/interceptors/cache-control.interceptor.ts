import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyReply } from 'fastify';

/** GET-пути справочников, для которых разрешено кэширование (без персональных данных) */
const CACHEABLE_PATH_PREFIXES = [
  '/api/building',
  '/api/floor',
  '/api/classroom',
  '/api/subject',
  '/api/group',
];

const CACHE_MAX_AGE_SECONDS = 60;

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<{ method: string; url: string }>();
    const response = ctx.getResponse<FastifyReply>();

    if (request.method !== 'GET') {
      return next.handle();
    }

    const path = request.url?.split('?')[0] ?? '';
    const isCacheable = CACHEABLE_PATH_PREFIXES.some((prefix) =>
      path.startsWith(prefix),
    );

    if (isCacheable) {
      response.header(
        'Cache-Control',
        `private, max-age=${CACHE_MAX_AGE_SECONDS}`,
      );
    }

    return next.handle();
  }
}
