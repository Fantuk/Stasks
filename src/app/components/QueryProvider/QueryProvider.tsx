"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react"

/**
 * Дефолты QueryClient для быстрого обновления UI после мутаций:
 * - staleTime: 0 — данные сразу считаются устаревшими, инвалидация сразу триггерит refetch
 * - retry: 2 — меньше повторных запросов при ошибках, чтобы не ждать минуты из-за retry
 * - refetchOnWindowFocus: true — при возврате на вкладку подтягиваем свежие данные
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        retry: 2,
        refetchOnWindowFocus: true,
      },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
