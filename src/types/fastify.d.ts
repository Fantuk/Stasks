import 'fastify';
import '@fastify/cookie';

declare module 'fastify' {
  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: {
        path?: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'lax' | 'strict' | 'none';
        expires?: Date;
      },
    ): void;

    clearCookie(
      name: string,
      options?: {
        path?: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'lax' | 'strict' | 'none';
      },
    ): void;
  }

  interface FastifyRequest {
    user: IAccessToken;
  }
}
