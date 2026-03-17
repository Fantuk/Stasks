import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  ApiErrorResponse,
  ConflictDetails,
  ValidationError,
} from 'src/common/interfaces/api-response.interface';

/** Определяет код ошибки по умолчанию для HTTP-статуса */
function defaultCodeForStatus(status: number): string {
  if (status === HttpStatus.BAD_REQUEST) return 'BAD_REQUEST';
  if (status === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED';
  if (status === HttpStatus.FORBIDDEN) return 'FORBIDDEN';
  if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
  if (status === HttpStatus.CONFLICT) return 'CONFLICT';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'BAD_REQUEST';
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const { status, message, code, errors, conflict } = this.extractErrorDetails(exception);

    this.logError(exception, request, status);

    const errorResponse: ApiErrorResponse = {
      success: false,
      data: null,
      message,
      ...(code && { code }),
      ...(errors && errors.length > 0 && { errors }),
      ...(conflict && status === 409 && { conflict }),
    };

    response.status(status).send(errorResponse);
  }

  private extractErrorDetails(exception: unknown): {
    status: number;
    message: string;
    code?: string;
    errors?: ValidationError[];
    conflict?: ConflictDetails;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const res = exceptionResponse as Record<string, unknown> | undefined;
      const customCode = res && typeof res.code === 'string' ? res.code : undefined;
      const code = customCode ?? defaultCodeForStatus(status);
      const conflict =
        res && res.conflict && typeof res.conflict === 'object'
          ? (res.conflict as ConflictDetails)
          : undefined;

      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const message = exceptionResponse.message;

        if (Array.isArray(message)) {
          const validationErrors: ValidationError[] = message.map((msg) => {
            if (typeof msg === 'string') {
              const fieldMatch = msg.match(/^(\w+)\s/);
              return {
                field: fieldMatch ? fieldMatch[1] : 'unknown',
                message: msg,
              };
            }
            return {
              field: 'unknown',
              message: String(msg),
            };
          });
          return {
            status,
            message: 'Ошибка валидации данных',
            code: 'VALIDATION_ERROR',
            errors: validationErrors,
          };
        }
      }

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : typeof exceptionResponse === 'object' &&
              exceptionResponse !== null &&
              'message' in exceptionResponse
            ? String(exceptionResponse.message)
            : exception.message || 'Произошла ошибка';

      return {
        status,
        message,
        code,
        conflict,
      };
    }

    this.logger.error('Неожиданная ошибка', exception);
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Произошла ошибка. Попробуйте позже.',
      code: 'INTERNAL_ERROR',
    };
  }

  private logError(exception: unknown, request: FastifyRequest, status: number): void {
    const { method, url } = request;
    const message = exception instanceof HttpException ? exception.message : 'Неожиданная ошибка';

    if (status >= 500) {
      this.logger.error(
        `Ошибка ${status}: ${message} - ${method} ${url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= 400) {
      this.logger.warn(`Ошибка ${status}: ${message} - ${method} ${url}`);
    }
  }
}
