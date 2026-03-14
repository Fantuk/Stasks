/**
 * Единый API-клиент для запросов к бэкенду.
 * - Base URL из NEXT_PUBLIC_API_URL
 * - credentials: 'include' для отправки refreshToken cookie
 * - Автоматическая подстановка Authorization: Bearer <accessToken>
 * - При 401: одна попытка обновления токенов (GET /api/token/refresh-tokens), повтор запроса; при неудаче — вызов onLogout
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const baseURL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    : "http://localhost:4000";

/** Геттер текущего accessToken (устанавливается из auth store) */
let tokenGetter: () => string | null = () => null;

/** Колбэк при неудачном refresh (очистка состояния и редирект на логин) */
let onUnauthorized: (() => void) | null = null;

/** Колбэк при успешном refresh — store обновляет accessToken */
let onTokenRefreshed: ((token: string) => void) | null = null;

export function setTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

export function setOnUnauthorized(callback: () => void): void {
  onUnauthorized = callback;
}

export function setOnTokenRefreshed(callback: (token: string) => void): void {
  onTokenRefreshed = callback;
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Подставляем Bearer токен в каждый запрос
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// При 401 пробуем обновить токены и повторить запрос; при неудаче — logout
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null, newToken: string | null) {
  failedQueue.forEach((prom) => {
    if (error || !newToken) {
      prom.reject(error);
    } else {
      prom.resolve(newToken);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Не делаем refresh для публичных эндпоинтов (логин, refresh сам)
    const isPublic =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/token/refresh-tokens");
    if (isPublic) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Ждём результат текущего refresh и повторяем запрос с новым токеном
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken: unknown) => {
            if (typeof newToken === "string") {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      try {
        const { data } = await axios.get<{
          success?: boolean;
          data?: { accessToken?: string };
        }>(`${baseURL}/api/token/refresh-tokens`, {
          withCredentials: true,
        });

        const newToken =
          data?.success && data?.data?.accessToken
            ? data.data.accessToken
            : null;

        if (newToken) {
          processQueue(null, newToken);
          onTokenRefreshed?.(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        // refresh неудачен
      }

      processQueue(error, null);
      onUnauthorized?.();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

