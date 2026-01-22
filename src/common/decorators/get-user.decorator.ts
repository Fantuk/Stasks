import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { IAccessToken } from 'src/token/application/interfaces/interfaces';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IAccessToken => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IAccessToken;

    if (!user) {
      throw new Error(
        'Пользователь не найден в запросе. Убедитесь, что эндпоинт защищен JwtAuthGuard',
      );
    }

    return user;
  },
);
