"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore, hasAdminAccess } from "@/stores/auth.store";
import { api } from "@/lib/api";

export function HomeContent() {
  const router = useRouter();
  const authReady = useAuthStore((s) => s.authReady);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout");
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  if (!authReady) {
    return <p className="text-muted-foreground">Загрузка...</p>;
  }

  if (!user) {
    return (
      <div>
        <Link href="/login" className="text-primary hover:underline">
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p>
        Вы вошли как {user.name} {user.surname} ({user.email}).
      </p>
      {hasAdminAccess(user.roles) && (
        <Link href="/admin" className="text-primary hover:underline">
          Панель администратора
        </Link>
      )}
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm text-muted-foreground hover:text-foreground underline w-fit"
      >
        Выйти
      </button>
    </div>
  );
}
