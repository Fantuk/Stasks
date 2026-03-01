import type { PaginatedResult } from '../dto/pagination.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

/**
 * Формирует результат пагинации: нормализует page/limit и считает totalPages.
 * Убирает дублирование логики во всех сервисах с пагинацией.
 *
 * @param data - массив элементов страницы
 * @param total - общее количество записей
 * @param page - номер страницы (по умолчанию 1)
 * @param limit - размер страницы (по умолчанию 10)
 */
export function paginate<T>(
  data: T[],
  total: number,
  page?: number,
  limit?: number,
): PaginatedResult<T> {
  const currentPage = page ?? DEFAULT_PAGE;
  const pageLimit = limit ?? DEFAULT_LIMIT;
  const totalPages = Math.ceil(total / pageLimit);
  return {
    data,
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages,
  };
}
