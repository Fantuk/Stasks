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

export interface ApiErrorResponse {
    success: false;
    data: null;
    message: string;
    errors?: ValidationError[];
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;