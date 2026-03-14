"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  setTokenGetter,
  setOnUnauthorized,
  setOnTokenRefreshed,
} from "@/lib/api";
import {
  useAuthStore,
  type AuthUser,
} from "@/stores/auth.store";

const ACCESS_TOKEN_KEY = "accessToken";

/** Инициализация auth при загрузке: восстановление токена из sessionStorage, запрос /api/users/me */
async function initAuth(): Promise<void> {
  const { setUser, setTokenAndPersist, setAuthReady } = useAuthStore.getState();

  if (typeof window === "undefined") return;

  const stored = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (stored) {
    setTokenAndPersist(stored);
  }

  try {
    const res = await api.get<{
      success?: boolean;
      data?: AuthUser;
    }>("/api/users/me");
    if (res.data?.success && res.data?.data) {
      setUser(res.data.data as AuthUser);
    }
  } catch {
    // 401 обработан интерцептором (refresh или onUnauthorized)
  } finally {
    setAuthReady(true);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    setTokenGetter(() => useAuthStore.getState().getAccessToken());
    setOnUnauthorized(() => {
      useAuthStore.getState().clearAuth();
      router.push("/login");
    });
    setOnTokenRefreshed((token) =>
      useAuthStore.getState().setTokenAndPersist(token)
    );
    initAuth();
  }, [router]);

  return <>{children}</>;
}
