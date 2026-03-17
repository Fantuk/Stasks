import type { ApiSuccessResponse } from 'src/common/interfaces/api-response.interface';
import type { PaginatedResult } from 'src/common/dto/pagination.dto';

/**
 * Формирует успешный ответ API со списком и мета-информацией пагинации.
 * Убирает дублирование сборки { success, data, meta } во всех контроллерах.
 */
export function paginatedSuccess<T>(result: PaginatedResult<T>): ApiSuccessResponse<T[]> {
  return {
    success: true,
    data: result.data,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  };
}
