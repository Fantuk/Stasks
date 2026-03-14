import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ValidationError {
    field: string;
    message: string;
}

export interface ResponseMeta {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
}

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
    meta?: ResponseMeta;
}

/** Коды ошибок для программной обработки на клиенте */
export type ApiErrorCode =
    | 'VALIDATION_ERROR'
    | 'BAD_REQUEST'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'INTERNAL_ERROR';

/** Детали конфликта (409) для фронта */
export interface ConflictDetails {
    type?: 'CLASSROOM_OCCUPIED' | 'TEACHER_OCCUPIED';
    scheduleId?: number;
    scheduleDate?: string;
    lessonNumber?: number;
}

export interface ApiErrorResponse {
    success: false;
    data: null;
    message: string;
    /** Машинный код ошибки для обработки на фронте */
    code?: ApiErrorCode | string;
    errors?: ValidationError[];
    /** Детали конфликта (при 409) */
    conflict?: ConflictDetails;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// --- Классы для документации Swagger (схемы ответов) ---

/** Элемент ошибки валидации в теле ответа */
export class ValidationErrorDto {
    @ApiProperty({ example: 'email' })
    field: string;
    @ApiProperty({ example: 'email must be an email' })
    message: string;
}

/** Мета для постраничных ответов */
export class ResponseMetaDto {
    @ApiPropertyOptional({ example: 1 })
    page?: number;
    @ApiPropertyOptional({ example: 10 })
    limit?: number;
    @ApiPropertyOptional({ example: 100 })
    total?: number;
    @ApiPropertyOptional({ example: 10 })
    totalPages?: number;
}

/**
 * Создаёт OpenAPI-схему успешного ответа с конкретным типом data.
 * @param dataSchemaRef — результат getSchemaPath(SomeDto), например '#/components/schemas/UserResponseDto'
 * @param options.withMeta — добавить поле meta (пагинация)
 * @param options.isArray — data как массив элементов
 */
export function createSuccessResponseSchema(
    dataSchemaRef: string,
    options?: { withMeta?: boolean; isArray?: boolean },
): Record<string, unknown> {
    const dataSchema = options?.isArray
        ? { type: 'array' as const, items: { $ref: dataSchemaRef } }
        : { $ref: dataSchemaRef };
    const schema: Record<string, unknown> = {
        type: 'object',
        required: ['success', 'data'],
        properties: {
            success: { type: 'boolean', example: true, description: 'Всегда true при успехе' },
            data: dataSchema,
            message: {
                type: 'string',
                nullable: true,
                description: 'Опциональное сообщение',
            },
        },
    };
    if (options?.withMeta) {
        (schema.properties as Record<string, unknown>).meta = {
            $ref: '#/components/schemas/ResponseMetaDto',
        };
    }
    return schema;
}

/**
 * Сырая OpenAPI-схема успешного ответа (универсальная, без конкретного типа data).
 * Используйте createSuccessResponseSchema для эндпоинтов с известным типом data.
 */
export const API_SUCCESS_RESPONSE_SCHEMA = {
    type: 'object',
    required: ['success', 'data'],
    properties: {
        success: { type: 'boolean', example: true, description: 'Всегда true при успехе' },
        data: {
            description: 'Тело ответа: объект сущности, массив или примитив в зависимости от эндпоинта. Нет единого типа.',
        },
        message: {
            type: 'string',
            nullable: true,
            description: 'Опциональное сообщение (не у всех ответов)',
            example: 'Операция выполнена',
        },
        meta: {
            type: 'object',
            description: 'Только в ответах со списками (пагинация): page, limit, total, totalPages',
            properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                total: { type: 'number', example: 100 },
                totalPages: { type: 'number', example: 10 },
            },
        },
    },
    example: {
        success: true,
        data: { id: 1, name: 'Пример' },
        message: 'Операция выполнена',
    },
};

/**
 * Сырая OpenAPI-схема ответа с ошибкой.
 * data всегда null (OpenAPI 3.0: nullable, без type: 'null').
 */
export const API_ERROR_RESPONSE_SCHEMA = {
    type: 'object',
    required: ['success', 'data', 'message'],
    properties: {
        success: { type: 'boolean', example: false, description: 'Всегда false при ошибке' },
        data: {
            type: 'object',
            nullable: true,
            description: 'Всегда null при ошибке',
            example: null,
        },
        message: { type: 'string', description: 'Текст ошибки', example: 'Ошибка валидации данных' },
        code: {
            type: 'string',
            description: 'Машинный код ошибки: VALIDATION_ERROR, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, INTERNAL_ERROR',
            example: 'VALIDATION_ERROR',
            enum: ['VALIDATION_ERROR', 'BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'INTERNAL_ERROR'],
        },
        errors: {
            type: 'array',
            description: 'Детали валидации (при 400)',
            items: {
                type: 'object',
                properties: {
                    field: { type: 'string', description: 'Поле с ошибкой', example: 'email' },
                    message: { type: 'string', description: 'Сообщение', example: 'email must be an email' },
                },
            },
        },
        conflict: {
            type: 'object',
            description: 'При 409: тип и данные конфликта (CLASSROOM_OCCUPIED / TEACHER_OCCUPIED, scheduleId, scheduleDate, lessonNumber)',
            properties: {
                type: { type: 'string', enum: ['CLASSROOM_OCCUPIED', 'TEACHER_OCCUPIED'] },
                scheduleId: { type: 'number' },
                scheduleDate: { type: 'string' },
                lessonNumber: { type: 'number' },
            },
        },
    },
    example: {
        success: false,
        data: null,
        message: 'Ошибка валидации данных',
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'email', message: 'email must be an email' }],
    },
};