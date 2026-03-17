/**
 * Хелперы для React Query: инвалидация и принудительный refetch после мутаций.
 */

import type { QueryClient } from "@tanstack/react-query";

/**
 * Инвалидирует запросы по ключу и принудительно перезапрашивает их.
 * Используется после мутаций, чтобы UI сразу показывал актуальные данные.
 */
export async function invalidateAndRefetch(
  queryClient: QueryClient,
  queryKey: unknown[]
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey });
  await queryClient.refetchQueries({ queryKey });
}
