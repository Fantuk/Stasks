/**
 * Типы и утилиты для обработки ошибок API.
 * Формат ответа с ошибкой совместим с бэкендом: { success: false, message, code?, errors?, conflict? }.
 */

import { AxiosError } from "axios";

/** Ответ API с ошибкой (совпадает с бэкендом) */
export interface ApiErrorResponse {
  success: false;
  data: null;
  message: string;
  code?: string;
  errors?: Array<{ field?: string; message?: string }>;
  conflict?: {
    type?: string;
    scheduleId?: number;
    scheduleDate?: string;
    lessonNumber?: number;
  };
}

/** Дефолтное сообщение при неизвестной ошибке */
const DEFAULT_MESSAGE = "Не удалось выполнить операцию";

/**
 * Извлекает из ответа API текст сообщения об ошибке для показа пользователю.
 * Учитывает AxiosError (response.data.message), ошибки валидации (errors[].message)
 * и обычный Error (например, выброшенный из api-функций с data.message).
 */
export function getApiErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_MESSAGE
): string {
  // Ответ от бэкенда в response.data (AxiosError)
  const data = getApiErrorData(error);
  if (data) {
    const msg = data.message?.trim();
    if (msg) {
      const errList = data.errors;
      if (errList && Array.isArray(errList) && errList.length > 0) {
        const first = errList
          .map((e) => (e && typeof e === "object" && e.message ? String(e.message).trim() : ""))
          .filter(Boolean);
        if (first.length > 0) {
          return [msg, first[0]].join(". ");
        }
      }
      return msg;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message.trim();
  }

  return fallback;
}

/**
 * Возвращает структурированные данные ошибки API (message, code, errors, conflict)
 * для мест, где нужны отдельно сообщение и массив ошибок по полям (формы, конфликт расписания).
 */
export function getApiErrorDetails(error: unknown): {
  message: string;
  code?: string;
  errors?: Array<{ field?: string; message?: string }>;
  conflict?: ApiErrorResponse["conflict"];
} {
  const data = getApiErrorData(error);
  const message = getApiErrorMessage(error, DEFAULT_MESSAGE);
  return {
    message,
    code: data?.code,
    errors: data?.errors,
    conflict: data?.conflict,
  };
}

/** Достаёт data из AxiosError.response или возвращает null */
function getApiErrorData(error: unknown): ApiErrorResponse | null {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as AxiosError<ApiErrorResponse>).response;
    const data = res?.data;
    if (data && typeof data === "object" && data.success === false && typeof data.message === "string") {
      return data as ApiErrorResponse;
    }
  }
  return null;
}
