import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { ApiErrorResponse, ValidationError } from "src/common/interfaces/api-response.interface";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<FastifyReply>();
        const request = ctx.getRequest<FastifyRequest>();

        const { status, message, errors } = this.extractErrorDetails(exception);

        this.logError(exception, request, status);

        const errorResponse: ApiErrorResponse = {
            success: false,
            data: null,
            message,
            ...(errors && errors.length > 0 && { errors }),
        }

        response.status(status).send(errorResponse);
    }

    private extractErrorDetails(exception: unknown): { status: number, message: string, errors?: ValidationError[] } {
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (status === HttpStatus.BAD_REQUEST &&
                typeof exceptionResponse === 'object' &&
                exceptionResponse !== null &&
                'message' in exceptionResponse) {
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
                    })
                    return {
                        status,
                        message: 'Ошибка валидации данных',
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
            };
        }

        this.logger.error("Неожиданная ошибка", exception);
        return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Внутренняя ошибка сервера',
        };
    }

    private logError(exception: unknown, request: FastifyRequest, status: number): void {
        const { method, url } = request;
        const message = exception instanceof HttpException ? exception.message : "Неожиданная ошибка";

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