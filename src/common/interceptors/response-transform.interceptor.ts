import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiSuccessResponse, ResponseMeta } from "src/common/interfaces/api-responce.interface";
import { PaginatedResult } from "src/common/dto/pagination.dto";

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse<T>> {
        return next.handle().pipe(
            map((data: T) => {
                if (this.isApiResponse(data)) {
                    return data as ApiSuccessResponse<T>;
                }

                if (this.isPaginatedResult(data)) {
                    return this.formatPaginatedResponse(data);
                }

                return {
                    success: true,
                    data: data ?? null,
                };
            }),
        ) as Observable<ApiSuccessResponse<T>>;
    }

    private isApiResponse(data: unknown): data is ApiSuccessResponse<unknown> {
        if (data === null || typeof data !== 'object') {
            return false;
        }

        const obj = data as Record<string, unknown>;
        return 'success' in obj && obj.success === true;
    }

    private isPaginatedResult(data: unknown): data is PaginatedResult<unknown> {
        if (data === null || typeof data !== 'object') {
            return false;
        }

        const obj = data as Record<string, unknown>;
        return (
            'data' in obj &&
            'total' in obj &&
            'page' in obj &&
            'limit' in obj &&
            'totalPages' in obj &&
            Array.isArray(obj.data)
        );
    }

    private formatPaginatedResponse(paginatedData: PaginatedResult<unknown>): ApiSuccessResponse<T[]> {
        const { data, total, page, limit, totalPages } = paginatedData;

        const meta: ResponseMeta = {
            page,
            limit,
            total,
            totalPages,
        };

        return {
            success: true,
            data: data as T[],
            meta,
        };
    }
}