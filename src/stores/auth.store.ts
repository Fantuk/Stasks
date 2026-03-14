/**
 * Глобальное состояние аутентификации.
 * - user: данные из GET /api/users/me (или null)
 * - accessToken: JWT для заголовка Authorization (храним в memory + sessionStorage при инициализации)
 * - authReady: флаг завершения первой проверки (токен/refresh/me)
 */

import { create } from "zustand";

const ACCESS_TOKEN_KEY = "accessToken";

export type Role = "ADMIN" | "STUDENT" | "TEACHER" | "MODERATOR";

export interface AuthUser {
  id: number;
  institutionId: number;
  name: string;
  surname: string;
  patronymic?: string | null;
  email: string;
  roles: Role[];
  isActivated: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  authReady: boolean;
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (token: string | null) => void;
  setAuthReady: (ready: boolean) => void;
  /** Установить токен и при необходимости сохранить в sessionStorage (при логине) */
  setTokenAndPersist: (token: string | null) => void;
  /** Выход: очистка состояния и sessionStorage (вызов POST /api/auth/logout делается снаружи) */
  clearAuth: () => void;
  /** Получить текущий accessToken (для API-клиента) */
  getAccessToken: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  authReady: false,

  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),
  setAuthReady: (ready) => set({ authReady: ready }),

  setTokenAndPersist: (token) => {
    if (typeof window !== "undefined") {
      if (token) {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    }
    set({ accessToken: token });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    set({ user: null, accessToken: null });
  },

  getAccessToken: () => get().accessToken,
}));

/** Есть ли у пользователя роль админа или модератора (доступ в админ-панель) */
export function hasAdminAccess(roles: Role[]): boolean {
  return roles.includes("ADMIN") || roles.includes("MODERATOR");
}
